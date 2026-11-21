#!/usr/bin/env python3
"""Assemble rendered shot frames into the final short: transitions, word-by-word captions, audio mix.
usage: python3 compose.py [--preview] [--from S --to S]
"""
import json, os, sys, subprocess, glob, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(f'{ROOT}/timeline.json'))
FPS, H0 = TL['fps'], TL['handle']
FRAMES = os.environ.get('FRAMES', 'frames')
OUTNAME = os.environ.get('OUTNAME', 'video_only')
W, H = 1080, 1920
args = sys.argv[1:]
PREVIEW = '--preview' in args
t_from = float(args[args.index('--from') + 1]) if '--from' in args else 0.0
t_to = float(args[args.index('--to') + 1]) if '--to' in args else TL['end']
shots = TL['shots']

# ---------- frames ----------
cache = {}
def shot_frame(i, T):
    s = shots[i]
    j = int(round((T - (s['start'] - H0)) * FPS))
    files = cache.get(i)
    if files is None:
        files = cache[i] = sorted(glob.glob(f"{ROOT}/{FRAMES}/{s['id']}/*.jpg"))
    j = max(0, min(len(files) - 1, j))
    img = cv2.imread(files[j])
    if img.shape[1] != W: img = cv2.resize(img, (W, H), interpolation=cv2.INTER_CUBIC)
    if os.environ.get('PUSHIN'):
        k = (T - (s['start'] - H0)) / (s['end'] - s['start'] + 2 * H0)
        k = min(max(k, 0), 1); e = k * k * (3 - 2 * k)
        z = 1.0 + 0.09 * e
        M = cv2.getRotationMatrix2D((W / 2, H * 0.45), 0, z)
        img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    return img.astype(np.float32)

def hblur(img, k):
    k = int(k) | 1
    if k < 3: return img
    ker = np.zeros((1, k), np.float32); ker[0, :] = 1.0 / k
    return cv2.filter2D(img, -1, ker)

def shift(img, dx):
    M = np.float32([[1, 0, dx], [0, 1, 0]])
    return cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)

def frame_at(T):
    i = next((k for k, s in enumerate(shots) if s['start'] <= T < s['end']), len(shots) - 1)
    # transition with previous / next shot
    for a in (i - 1, i):
        if a < 0 or a + 1 >= len(shots): continue
        B, kind = shots[a]['end'], shots[a]['out']
        if kind == 'dissolve' and abs(T - B) <= 0.2:
            p = (T - (B - 0.2)) / 0.4; p = p * p * (3 - 2 * p)
            return shot_frame(a, T) * (1 - p) + shot_frame(a + 1, T) * p
        if kind == 'whip' and abs(T - B) <= 0.15:
            p = (T - (B - 0.15)) / 0.3; e = p * p * (3 - 2 * p)
            A = shift(shot_frame(a, T), -e * W); Bf = shift(shot_frame(a + 1, T), (1 - e) * W)
            mask = np.zeros((H, W, 1), np.float32); edge = int((1 - e) * W); mask[:, edge:] = 1
            out = A * (1 - mask) + Bf * mask
            return hblur(out, 6 + 200 * math.sin(math.pi * p))
        if kind == 'flash' and abs(T - B) <= 0.2:
            img = shot_frame(a if T < B else a + 1, T)
            f = 1 - abs(T - B) / 0.2
            return img * (1 - f) + 255 * f
    return shot_frame(i, T)

# ---------- captions ----------
words = json.load(open(f'{ROOT}/assets/voice.words.json'))
FIX = {'Трофеа': 'Троффеа', 'еще': 'ещё', 'днем': 'днём', 'Святого': 'святого'}
for w in words:
    t = w['w'].replace('—', '').strip()
    core = t.strip('.,?!;:«»')
    if core in FIX: t = t.replace(core, FIX[core])
    w['txt'] = t.rstrip(',;:')
font = ImageFont.truetype(f'{ROOT}/assets/Rubik.ttf', 96)
try: font.set_variation_by_name('ExtraBold')
except Exception: pass

def caption(img, T):
    cur = None
    for k, w in enumerate(words):
        nxt = words[k + 1]['s'] if k + 1 < len(words) else w['e'] + 0.6
        if w['s'] - 0.03 <= T < min(nxt, w['e'] + 0.6):
            cur = w; break
    if not cur: return img
    age = T - cur['s']
    sc = 1.0 + 0.18 * max(0.0, 1 - age / 0.12)
    txt = cur['txt']
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)[:, :, ::-1])
    layer = Image.new('RGBA', (W, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    bb = d.textbbox((0, 0), txt, font=font, stroke_width=11)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((W - tw) / 2 - bb[0], (400 - th) / 2 - bb[1] + 6), txt, font=font, fill=(0, 0, 0, 120), stroke_width=11, stroke_fill=(0, 0, 0, 120))
    d.text(((W - tw) / 2 - bb[0], (400 - th) / 2 - bb[1]), txt, font=font, fill=(255, 255, 255, 255), stroke_width=11, stroke_fill=(15, 12, 10, 255))
    if sc != 1.0:
        nw, nh = int(W * sc), int(400 * sc)
        layer = layer.resize((nw, nh), Image.LANCZOS).crop(((nw - W) // 2, (nh - 400) // 2, (nw - W) // 2 + W, (nh - 400) // 2 + 400))
    pil.paste(layer, (0, int(H * 0.60) - 200), layer)
    return np.asarray(pil)[:, :, ::-1]

# ---------- render video ----------
out = f"{ROOT}/out/{'preview' if PREVIEW else OUTNAME}.mp4"
os.makedirs(f'{ROOT}/out', exist_ok=True)
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'medium' if not PREVIEW else 'veryfast', '-crf', '16' if not PREVIEW else '23', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
n0, n1 = int(round(t_from * FPS)), int(round(t_to * FPS))
for n in range(n0, n1):
    T = n / FPS
    img = frame_at(T)
    img = caption(img, T)
    ff.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
    if n % 150 == 0: print(f'{T:.1f}s', flush=True)
ff.stdin.close(); ff.wait()
print('wrote', out)
