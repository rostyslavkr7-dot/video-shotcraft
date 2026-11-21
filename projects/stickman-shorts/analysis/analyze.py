#!/usr/bin/env python3
"""Per-frame (30 fps) analysis of every video in this folder.

For each video, every frame at 30 fps is measured:
  light     - mean luma, P5/P95 shadows/highlights, share of crushed blacks / clipped whites
  contrast  - luma std-dev, P95-P5 range
  color     - mean saturation, warm/cool balance (R-B)
  shadows   - share of pixels in the low-luma band (<0.2)
  motion    - dense optical flow between consecutive frames -> camera move class
              (static / pan / tilt / zoom-in / zoom-out / shake) + magnitude
  cuts      - hard cut (histogram jump in one frame) vs. soft transition (fade/dissolve/flash over several frames)
  effects   - flashes (sudden luma spikes), blur (Laplacian variance drop), shake
Outputs per video: <name>.frames.csv (one row per frame), <name>.shots.json,
contact sheet <name>.shots.jpg (first/middle/last frame of every shot),
and summary.csv across all videos.
"""
import sys, json, csv, glob, os, subprocess
import numpy as np
import cv2

FPS = 30
W = 360  # analysis width (height scaled); flow is computed at this size


def frames(path):
    h_cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height", "-of", "csv=p=0", path]
    w0, h0 = map(int, subprocess.check_output(h_cmd).decode().strip().split(",")[:2])
    H = int(round(h0 * W / w0 / 2) * 2)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS},scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)


def camera_move(prev_g, g):
    """Global camera motion from tracked corners + RANSAC similarity fit.
    Returns tx, ty (px/frame), zoom (scale-1 per frame), rot (deg/frame), inlier count."""
    pts = cv2.goodFeaturesToTrack(prev_g, 400, 0.01, 6)
    if pts is None or len(pts) < 8:
        return 0.0, 0.0, 0.0, 0.0, 0
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev_g, g, pts, None, winSize=(21, 21), maxLevel=3)
    ok = st.ravel() == 1
    if ok.sum() < 8:
        return 0.0, 0.0, 0.0, 0.0, 0
    M, inl = cv2.estimateAffinePartial2D(pts[ok], nxt[ok], method=cv2.RANSAC, ransacReprojThreshold=1.5)
    if M is None:
        return 0.0, 0.0, 0.0, 0.0, 0
    scale = float(np.hypot(M[0, 0], M[1, 0]))
    rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    h, w = g.shape
    # translation measured at the frame centre (removes the zoom-induced offset)
    c = np.array([w / 2, h / 2])
    moved = M[:, :2] @ c + M[:, 2]
    tx, ty = moved - c
    return float(tx), float(ty), scale - 1, rot, int(inl.sum())


def classify(tx, ty, zoom, rot):
    t = np.hypot(tx, ty)
    z = abs(zoom) * 180  # zoom expressed as px displacement at the frame edge
    if max(t, z, abs(rot) * 3) < 0.25:
        return "static"
    if z >= t and z >= abs(rot) * 3:
        return "zoom-in" if zoom > 0 else "zoom-out"
    if abs(rot) * 3 > t:
        return "roll"
    return "pan" if abs(tx) >= abs(ty) else "tilt"


def analyze(path):
    base = os.path.splitext(path)[0]
    rows, prev_g, prev_hist, thumbs, hists, smalls = [], None, None, [], [], []
    for i, f in enumerate(frames(path)):
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        l = g.astype(np.float32) / 255
        hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [32, 32], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        p5, p95 = np.percentile(l, [5, 95])
        row = dict(frame=i, t=round(i / FPS, 3),
                   luma=l.mean(), p5=p5, p95=p95, contrast=l.std(), range=p95 - p5,
                   crushed=(l < 0.02).mean(), clipped=(l > 0.98).mean(),
                   shadows=(l < 0.2).mean(), sat=hsv[..., 1].mean() / 255,
                   warm=(f[..., 2].astype(float) - f[..., 0]).mean() / 255,
                   sharp=cv2.Laplacian(g, cv2.CV_64F).var(),
                   hist_diff=0.0, tx=0.0, ty=0.0, zoom=0.0, rot=0.0, motion=0.0, tracked=0, move="static")
        if prev_g is not None:
            row["hist_diff"] = 1 - cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
            tx, ty, zm, rot, n = camera_move(prev_g, g)
            row.update(tx=tx, ty=ty, zoom=zm, rot=rot, tracked=n,
                       motion=float(np.hypot(tx, ty) + abs(zm) * 180), move=classify(tx, ty, zm, rot))
        rows.append(row)
        thumbs.append(cv2.resize(f, (120, int(120 * f.shape[0] / f.shape[1]))))
        hists.append(hist)
        smalls.append(cv2.resize(g, (24, 42), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)
        prev_g, prev_hist = g, hist
    if not rows:
        return None

    lum = np.array([r["luma"] for r in rows])
    hd = np.array([r["hist_diff"] for r in rows])
    # Cut signal = histogram change + structural change of a 24x42 thumbnail (luma-normalised,
    # so brightness flashes don't register). A cut is a frame whose signal stands far above its
    # neighbourhood; a frame whose surroundings (i-3 vs i+3) still match is a flash/glitch, not a cut.
    def sdiff(i, j):
        x, y = smalls[i], smalls[j]
        x = (x - x.mean()) / (x.std() + 1e-3)
        y = (y - y.mean()) / (y.std() + 1e-3)
        return float(np.abs(x - y).mean())
    sd = np.array([0.0] + [sdiff(i - 1, i) for i in range(1, len(rows))])
    sig = hd + sd / 2
    base_lvl = np.median(sig) + 1e-3
    cuts = []
    for i in range(1, len(rows)):
        local = np.median(sig[max(1, i - 8):i + 9])
        if sig[i] < 0.35 or sig[i] < 4 * local or sig[i] < 4 * base_lvl:
            continue
        if 3 <= i < len(rows) - 3 and sdiff(i - 3, i + 3) < 0.35 and \
                cv2.compareHist(hists[i - 3], hists[i + 3], cv2.HISTCMP_CORREL) > 0.8:
            continue  # same picture before and after -> flash, not a cut
        if cuts and i - cuts[-1]["frame"] <= 5:
            continue
        win = sig[max(1, i - 6):i + 7]
        kind = "hard" if (win > 0.35 * sig[i]).sum() <= 2 else "soft/dissolve"
        cuts.append(dict(frame=i, t=round(i / FPS, 2), kind=kind, strength=round(float(sig[i]), 3)))
    flashes = [round(i / FPS, 2) for i in range(2, len(lum) - 2)
               if lum[i] - np.median(lum[i - 2:i + 3]) > 0.12]
    # fades: luma ramps >=0.15 over 6-30 frames while the picture structure stays the same
    fades, i = [], 1
    while i < len(lum) - 6:
        j = i
        d = np.sign(lum[i + 1] - lum[i])
        while j + 1 < len(lum) and np.sign(lum[j + 1] - lum[j]) == d and abs(lum[j + 1] - lum[j]) > 0.004:
            j += 1
        if 6 <= j - i <= 30 and abs(lum[j] - lum[i]) > 0.15:
            fades.append(dict(start=round(i / FPS, 2), end=round(j / FPS, 2),
                              kind="fade-in" if d > 0 else "fade-out"))
            i = j
        i += 1
    mags = np.array([r["motion"] for r in rows])
    jitter = np.abs(np.diff([r["tx"] for r in rows])) + np.abs(np.diff([r["ty"] for r in rows]))
    shake = [round((i + 1) / FPS, 2) for i, j in enumerate(jitter) if j > 2.5 and mags[i + 1] > 0.5]

    for c in cuts:
        rows[c["frame"]].update(tx=0.0, ty=0.0, zoom=0.0, rot=0.0, motion=0.0, move="cut")
    bounds = [0] + [c["frame"] for c in cuts] + [len(rows)]
    shots = []
    for a, b in zip(bounds, bounds[1:]):
        seg = rows[a:b]
        moves = {}
        for r in seg[1:]:
            moves[r["move"]] = moves.get(r["move"], 0) + 1
        shots.append(dict(start=round(a / FPS, 2), end=round(b / FPS, 2), frames=b - a,
                          luma=round(float(np.mean([r["luma"] for r in seg])), 3),
                          contrast=round(float(np.mean([r["contrast"] for r in seg])), 3),
                          sat=round(float(np.mean([r["sat"] for r in seg])), 3),
                          camera=max(moves, key=moves.get) if moves else "static",
                          camera_breakdown=moves,
                          avg_motion_px=round(float(np.mean([r["motion"] for r in seg])), 2)))

    with open(base + ".frames.csv", "w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)
    with open(base + ".shots.json", "w") as fh:
        json.dump(dict(cuts=cuts, fades=fades, flashes=flashes, shake=shake, shots=shots), fh, indent=1)

    # contact sheet: first/mid/last frame of each shot
    tiles = []
    for a, b in zip(bounds, bounds[1:]):
        tiles.append(np.hstack([thumbs[a], thumbs[(a + b) // 2], thumbs[b - 1]]))
    cols = 4
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    grid = np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)])
    cv2.imwrite(base + ".shots.jpg", grid, [cv2.IMWRITE_JPEG_QUALITY, 85])

    return dict(video=os.path.basename(path), frames=len(rows), seconds=round(len(rows) / FPS, 1),
                shots=len(shots), avg_shot_s=round(len(rows) / FPS / len(shots), 2),
                hard_cuts=sum(c["kind"] == "hard" for c in cuts),
                soft_transitions=sum(c["kind"] != "hard" for c in cuts),
                fades=len(fades), flashes=len(flashes), shake_frames=len(shake),
                luma=round(float(lum.mean()), 3),
                contrast=round(float(np.mean([r["contrast"] for r in rows])), 3),
                shadows=round(float(np.mean([r["shadows"] for r in rows])), 3),
                clipped=round(float(np.mean([r["clipped"] for r in rows])), 4),
                sat=round(float(np.mean([r["sat"] for r in rows])), 3),
                static_pct=round(100 * sum(r["move"] == "static" for r in rows) / len(rows), 1),
                zoom_pct=round(100 * sum(r["move"].startswith("zoom") for r in rows) / len(rows), 1),
                roll_pct=round(100 * sum(r["move"] == "roll" for r in rows) / len(rows), 1),
                pan_tilt_pct=round(100 * sum(r["move"] in ("pan", "tilt") for r in rows) / len(rows), 1))


if __name__ == "__main__":
    vids = sys.argv[1:] or sorted(glob.glob("*.mp4"))
    out = [s for v in vids if (s := analyze(v))]
    if out:
        with open("summary.csv", "w", newline="") as fh:
            wr = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
            wr.writeheader()
            wr.writerows(out)
        for s in out:
            print(s)
