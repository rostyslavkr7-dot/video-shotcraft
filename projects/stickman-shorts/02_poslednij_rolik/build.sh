#!/bin/sh
cd /home/user/shorts/new_topic
ls clips/*.mp4 | xargs -P 4 -I{} sh -c 'b=$(basename {}); [ -s clips60/$b ] || { ffmpeg -v error -y -i {} -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:v libx264 -crf 14 -preset fast clips60/$b.tmp.mp4 && mv clips60/$b.tmp.mp4 clips60/$b; }'
echo INTERP_DONE
python3 - <<'P'
import json,subprocess,os
t=json.load(open('timeline.json')); H=t['handle']
for s in t['shots']:
    src=f"clips60/{s['id']}.mp4"; out=f"frames60/{s['id']}"
    need=s['end']-s['start']+2*H
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]))
    k=max(1.0,need/(dur-0.05)); os.makedirs(out,exist_ok=True)
    subprocess.run(['ffmpeg','-v','error','-y','-i',src,'-vf',f"setpts={k:.4f}*PTS,fps=60",'-q:v','2','-start_number','0',f"{out}/%05d.jpg"],check=True)
    print(s['id'],round(k,2),flush=True)
P
python3 mix.py
FPS=60 PUSHIN=1 FRAMES=frames60 OUTNAME=video_fx60 python3 compose_fx.py || { echo FAIL; exit 1; }
ffmpeg -v error -y -i out/video_fx60.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 20M -bufsize 40M -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -metadata:s:a:0 language=rus -shortest -movflags +faststart out/poslednij_rolik_60fps.mp4
echo FINALDONE
