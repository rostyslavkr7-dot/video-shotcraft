#!/usr/bin/env python3
"""clips_v2/<id>.mp4 -> frames50/<id>/%05d.jpg covering the shot + handles at 50 fps.
A clip longer than the shot is trimmed from the start (no speed-up); a shorter one is slowed
down first and then motion-interpolated, so slow-downs never produce duplicate frames."""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
FPS = 50
t = json.load(open(f'{ROOT}/timeline.json')); H = t['handle']
only = sys.argv[1:]

def probe(src, entry):
    return subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', entry,
                                    '-of', 'csv=p=0', src], text=True).strip().split('\n')[0]

for s in t['shots']:
    if only and s['id'] not in only: continue
    src = f"{ROOT}/clips_v2/{s['id']}.mp4"; out = f"{ROOT}/frames50/{s['id']}"
    need = s['end'] - s['start'] + 2 * H
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]))
    dur = min(dur, s.get('clip_max', dur))  # use only the clean head of a clip that degrades later
    num, den = probe(src, 'stream=r_frame_rate').split('/'); fps_in = float(num) / float(den)
    k = max(1.0, need / (dur - 0.05))
    vf = f'trim=duration={need / k + 0.1:.3f},setpts={k:.4f}*(PTS-STARTPTS)'
    if k > 1.001 or abs(fps_in - FPS) > 0.5:
        vf += f',minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
    vf += f',fps={FPS},scale=1080:1920:flags=lanczos'
    subprocess.run(['rm', '-rf', out]); os.makedirs(out)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-an', '-vf', vf, '-q:v', '2', '-start_number', '0',
                    f'{out}/%05d.jpg'], check=True)
    n = len(os.listdir(out))
    print(s['id'], f'src {fps_in:.0f}fps {dur:.1f}s', 'k=%.2f' % k, n, 'frames', 'OK' if n >= need * FPS - 2 else 'SHORT', flush=True)
