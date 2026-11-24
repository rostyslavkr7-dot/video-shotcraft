#!/usr/bin/env python3
"""Instagram Reels covers 1080x1920. Text sits inside the centre 1080x1350 band (y 285-1635) that the
profile grid shows, and below the top ~250 px of Reels UI. usage: python3 make_covers.py"""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.dirname(os.path.dirname(HERE))
FONT = f'{P}/03_claude_tips/assets/Rubik.ttf'
W, H = 1080, 1920
COVERS = [  # name, source, seconds into clip (None = still), lines [(text, colour)], optional text centre y
 ('dancing_plague', '01_dancing_plague/ai/clips/s03_start.mp4', 2.0, [('THE TOWN THAT', 'w'), ("COULDN'T STOP", 'w'), ('DANCING', 'y'), ('1518', 'r')]),
 ('last_video', '02_poslednij_rolik/clips/L03.mp4', 2.0, [('HE LET AI', 'w'), ('MAKE HIS', 'w'), ('VIDEOS', 'y')], 1330),
 ('ai_roommates_ep1', '03_claude_tips/clips_v2/C05.mp4', 2.0, [('USAGE LIMIT', 'r'), ('REACHED', 'r'), ('at 2 a.m. 💀', 'w')], 1330),
 ('ai_roommates_ep2', '04_claude_projects/clips_v2/E06.mp4', 1.5, [('IT REMEMBERS', 'w'), ('EVERYTHING', 'y')]),
 ('ai_roommates_ep3', '05_subscriptions/frames/F03.png', None, [('$7,200', 'r'), ('vs', 'w'), ('$10,400', 'g')]),
]
COL = {'w': (255, 255, 255), 'y': (255, 214, 64), 'r': (255, 88, 88), 'g': (110, 230, 140)}

def font(size):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_name('ExtraBold')
    except Exception: pass
    return f

def frame(src, t):
    path = f'{P}/{src}'
    if t is None: return Image.open(path).convert('RGB').resize((W, H), Image.LANCZOS)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', path, '-frames:v', '1',
                          '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return Image.frombytes('RGB', (W, H), raw)

os.makedirs(f'{HERE}/covers', exist_ok=True)
thumbs = []
for name, src, t, lines, *ty in COVERS:
    TY = ty[0] if ty else 600
    img = frame(src, t)
    # darken the text band so it reads over any frame
    shade = np.zeros((H, W), np.float32); ys = np.arange(H)[:, None]
    shade[:] = np.clip(1 - np.abs(ys - TY) / 520, 0, 1) * 0.55
    img = Image.fromarray((np.asarray(img) * (1 - shade[..., None])).astype(np.uint8))
    d = ImageDraw.Draw(img)
    size = 150
    while size > 60 and max(d.textbbox((0, 0), s.replace('💀', ''), font=font(size), stroke_width=14)[2] for s, _ in lines) > W - 120:
        size -= 6
    f = font(size); lh = int(size * 1.08)
    y = TY - lh * len(lines) // 2
    for s, c in lines:
        s = s.replace(' 💀', '')  # Rubik has no emoji glyphs
        d.text((W / 2, y + 8), s, font=f, fill=(0, 0, 0), anchor='mt', stroke_width=14, stroke_fill=(0, 0, 0))
        d.text((W / 2, y), s, font=f, fill=COL[c], anchor='mt', stroke_width=14, stroke_fill=(12, 10, 10))
        y += lh
    img.save(f'{HERE}/covers/{name}.jpg', quality=92)
    g = img.crop((0, 285, W, 1635)).resize((270, 338))   # how the 4:5 profile grid shows it
    thumbs.append(g)
grid = Image.new('RGB', (270 * len(thumbs) + 8 * (len(thumbs) - 1), 338), (255, 255, 255))
for i, g in enumerate(thumbs): grid.paste(g, (i * 278, 0))
grid.save(f'{HERE}/covers/_grid_preview.jpg', quality=90)
print('ok', len(thumbs))
