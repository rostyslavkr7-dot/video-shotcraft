#!/usr/bin/env python3
"""Kling turned the bell in F08's notification bubble into fake text. In every frame: find the white
bubble, paint its inside white again, and draw the clean bell from frame 0 scaled to the bubble.
usage: patch_bubble.py in.mp4 out.mp4"""
import sys, subprocess, json
import numpy as np, cv2

src, dst = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
Y0, Y1, X0 = int(H * 0.22), int(H * 0.62), int(W * 0.35)   # search window: upper-right of the head

def bubble(img):
    roi = img[Y0:Y1, X0:]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    white = ((hsv[..., 2] > 200) & (hsv[..., 1] < 40)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(white, 8)
    if n < 2: return None
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    comp = (lab == k).astype(np.uint8)
    cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    body = np.zeros_like(comp); cv2.drawContours(body, cnts, -1, 1, -1)
    body = cv2.erode(body, np.ones((9, 9), np.uint8))       # keep the black outline untouched
    x, y, w, h = cv2.boundingRect(cnts[0])
    return body, (x, y, w, h)

ok, f0 = cap.read()
b0, (x, y, w, h) = bubble(f0)
roi0 = f0[Y0:Y1, X0:]
ink0 = ((roi0.max(axis=2) < 120) & (b0 > 0))                # the bell drawing inside the bubble
ys, xs = np.nonzero(ink0)
bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
bell = roi0[by0:by1, bx0:bx1].copy()
alpha = np.clip((140 - bell.max(axis=2).astype(np.float32)) / 80, 0, 1) * (b0[by0:by1, bx0:bx1] > 0)
rel = ((bx0 + bx1) / 2 - x) / w, ((by0 + by1) / 2 - y) / h, (bx1 - bx0) / w   # bell centre and size vs bubble
print(json.dumps({'bubble0': [int(x), int(y), int(w), int(h)], 'bell_rel': [round(v, 3) for v in rel]}))

ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps),
                       '-i', '-', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
n = 0
while True:
    ok, img = cap.read()
    if not ok: break
    r = bubble(img)
    if r is not None:
        body, (x, y, w, h) = r
        roi = img[Y0:Y1, X0:]
        m = body > 0
        fill = np.median(roi[m & (roi.min(axis=2) > 200)], axis=0) if (m & (roi.min(axis=2) > 200)).any() else np.array([245, 245, 245])
        roi[m] = fill.astype(np.uint8)
        bw = max(8, int(rel[2] * w)); bh = max(8, int(bell.shape[0] * bw / bell.shape[1]))
        cx, cy = int(x + rel[0] * w), int(y + rel[1] * h)
        bimg = cv2.resize(bell, (bw, bh), interpolation=cv2.INTER_AREA).astype(np.float32)
        ba = cv2.resize(alpha, (bw, bh), interpolation=cv2.INTER_AREA)[..., None]
        x1, y1 = cx - bw // 2, cy - bh // 2
        if x1 >= 0 and y1 >= 0 and x1 + bw <= roi.shape[1] and y1 + bh <= roi.shape[0]:
            patch = roi[y1:y1 + bh, x1:x1 + bw].astype(np.float32)
            roi[y1:y1 + bh, x1:x1 + bw] = (patch * (1 - ba) + bimg * ba).astype(np.uint8)
    ff.stdin.write(img.tobytes()); n += 1
ff.stdin.close(); ff.wait()
print('patched', n, 'frames')
