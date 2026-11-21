#!/usr/bin/env python3
"""clips60/<id>.mp4 -> frames60/<id>/%05d.jpg retimed to fill shot + handles.
Long clips are sped up at most 1/0.75x so the action fits; short ones are slowed down."""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
t = json.load(open(f'{ROOT}/timeline.json')); H = t['handle']
only = sys.argv[1:]
for s in t['shots']:
    if only and s['id'] not in only: continue
    src = f"{ROOT}/clips60/{s['id']}.mp4"; out = f"{ROOT}/frames60/{s['id']}"
    need = s['end'] - s['start'] + 2 * H
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]))
    k = max(0.75, need / (dur - 0.05))
    subprocess.run(['rm', '-rf', out]); os.makedirs(out)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'setpts={k:.4f}*PTS,fps=60', '-q:v', '2', '-start_number', '0', f'{out}/%05d.jpg'], check=True)
    print(s['id'], 'k=%.2f' % k, len(os.listdir(out)), 'frames', flush=True)
