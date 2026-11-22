#!/usr/bin/env python3
"""Assemble rendered shot frames into the final short: transitions, word-by-word captions, audio mix.
usage: python3 compose.py [--preview] [--from S --to S]
"""
import json, os, sys, subprocess, glob, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(f'{ROOT}/timeline.json'))
FPS, H0 = int(os.environ.get('FPS', TL['fps'])), TL['handle']
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


# ---------- effects ----------
RNG = np.random.default_rng(7)
_words = json.load(open(f'{ROOT}/assets/voice.words.json'))
FX = TL.get('fx', {})
PUNCH_KEYS = FX.get('punch', [])
PUNCH = [w['s'] for w in _words if w['w'] in PUNCH_KEYS]
SHAKE = [tuple(x) for x in FX.get('shake', [])]
DUST = set(FX.get('dust', []))
GLINT = set(FX.get('glint', []))
def shot_of(T): return next((s for s in shots if s['start'] <= T < s['end']), shots[-1])

def punch_zoom(img, T):
    z = 1.0
    for t0 in PUNCH:
        d = T - t0
        if 0 <= d < 0.5:
            z = max(z, 1.0 + 0.10 * (min(1, d / 0.07)) * (1 - max(0, d - 0.07) / 0.43) ** 2)
    if z <= 1.0005: return img
    M = cv2.getRotationMatrix2D((W / 2, H * 0.47), 0, z)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def shake(img, T):
    dx = dy = 0.0
    for t0, dur, amp in SHAKE:
        d = T - t0
        if 0 <= d < dur:
            a = amp * (1 - d / dur) ** 2
            dx += a * math.sin(d * 95) ; dy += a * math.cos(d * 77)
    if abs(dx) + abs(dy) < 0.3: return img
    M = np.float32([[1.03, 0, dx - W * 0.015], [0, 1.03, dy - H * 0.015]])
    return cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)

def chroma(img, amt):
    if amt < 0.5: return img
    o = img.copy(); k = int(amt)
    o[:, :, 2] = np.roll(img[:, :, 2], k, axis=1); o[:, :, 0] = np.roll(img[:, :, 0], -k, axis=1)
    return o

def bloom(img, strength=0.22):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    br = np.clip(small - 170, 0, None) * 1.6
    br = cv2.GaussianBlur(br, (0, 0), 12)
    return img + cv2.resize(br, (W, H), interpolation=cv2.INTER_LINEAR) * strength

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def light_leak(img, T):
    # warm leak sweeping across on each dissolve and at the very start
    out = img
    for s in shots[:-1]:
        if s['out'] in ('dissolve', 'flash'):
            d = (T - (s['end'] - 0.35)) / 0.9
            if 0 <= d <= 1:
                cx = W * (-0.2 + 1.4 * d); cy = H * (0.25 + 0.3 * math.sin(d * 3))
                r = np.exp(-(((XX - cx) / (W * 0.55)) ** 2 + ((YY - cy) / (H * 0.45)) ** 2))
                a = math.sin(math.pi * d) * 0.55
                col = np.array([60, 150, 255], np.float32)  # BGR warm orange
                out = out + r[..., None] * col * a
    return out

def red_pulse(img, T):
  for t0, dur in FX.get('red', []):
    d = T - t0
    if 0 <= d < dur:
        a = math.sin(min(1, d / dur) * math.pi) * 0.5
        v = 1 - np.exp(-((((XX - W / 2) / (W * 0.62)) ** 2 + ((YY - H / 2) / (H * 0.55)) ** 2)))
        img = img * (1 - v[..., None] * a * 0.6) + v[..., None] * np.array([20, 20, 200], np.float32) * a * 0.6
  return img

class Particles:
    def __init__(self, n, kind, seed):
        r = np.random.default_rng(seed); self.k = kind
        self.p = r.random((n, 2)) * [W, H]; self.v = (r.random((n, 2)) - 0.5); self.sz = r.random(n); self.ph = r.random(n) * 6.28
    def draw(self, img, t):
        ov = np.zeros_like(img)
        for i in range(len(self.p)):
            x, y = self.p[i]; sz = self.sz[i]; ph = self.ph[i]
            if self.k == 'dust':
                x = (x + 18 * t + 25 * math.sin(t * 0.7 + ph)) % W; y = (y - 22 * t * (0.4 + sz) + 15 * math.cos(t * 0.5 + ph)) % H
                a = 0.35 + 0.35 * math.sin(t * 2 + ph)
                cv2.circle(ov, (int(x), int(y)), int(2 + sz * 4), (200 * a, 235 * a, 255 * a), -1, cv2.LINE_AA)
            elif self.k == 'ember':
                x = (x + 30 * math.sin(t * 1.3 + ph)) % W; y = (y - (120 + 160 * sz) * t) % H
                a = 0.5 + 0.5 * math.sin(t * 9 + ph)
                cv2.circle(ov, (int(x), int(y)), int(2 + sz * 3), (60 * a, 170 * a, 255 * a), -1, cv2.LINE_AA)
            elif self.k == 'rain':
                x = (x - 120 * t) % W; y = (y + (1400 + 400 * sz) * t) % H
                cv2.line(ov, (int(x), int(y)), (int(x - 6), int(y + 34)), (150, 150, 150), 1, cv2.LINE_AA)
            elif self.k == 'glint':
                a = max(0, math.sin(t * 2.2 + ph)) ** 6
                cv2.circle(ov, (int(x), int(y)), int(3 + sz * 4), (200 * a, 240 * a, 255 * a), -1, cv2.LINE_AA)
        ov = cv2.GaussianBlur(ov, (0, 0), 1.6)
        return img + ov
PART = {'dust': Particles(70, 'dust', 1), 'ember': Particles(110, 'ember', 2), 'rain': Particles(160, 'rain', 3), 'glint': Particles(40, 'glint', 4)}
def particles(img, T):
    sid = shot_of(T)['id']
    if sid in DUST: img = PART['dust'].draw(img, T)
    if sid in GLINT: img = PART['glint'].draw(img, T)
    return img

def whip_chroma(T):
    a = 0
    for s in shots:
        if s['out'] == 'whip' and abs(T - s['end']) <= 0.18:
            a = max(a, 14 * (1 - abs(T - s['end']) / 0.18))
    return a

GR = [RNG.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]
def grade(img, T, n):
    img = bloom(img)
    v = 1 - 0.32 * np.clip((((XX - W / 2) / (W * 0.75)) ** 2 + ((YY - H / 2) / (H * 0.7)) ** 2) - 0.25, 0, 1)
    img = img * v[..., None]
    g = cv2.resize(GR[n % 6], (W, H), interpolation=cv2.INTER_NEAREST)
    return img + g[..., None] * 3.0

def apply_fx(img, T, n):
    img = particles(img, T)
    img = light_leak(img, T)
    img = red_pulse(img, T)
    img = chroma(img, whip_chroma(T))
    img = punch_zoom(img, T)
    img = shake(img, T)
    return grade(img, T, n)

# ---------- captions ----------
words = json.load(open(f'{ROOT}/assets/voice.words.json'))
FIX = FX.get('fix', {})
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
    img = apply_fx(np.clip(img, 0, 255), T, n)
    img = caption(img, T)
    ff.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
    if n % (5 * FPS) == 0: print(f'{T:.1f}s', flush=True)
ff.stdin.close(); ff.wait()
print('wrote', out)
