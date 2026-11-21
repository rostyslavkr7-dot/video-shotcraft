#!/bin/sh
cd /home/user/shorts/dancing_plague
FPS=60 PUSHIN=1 FRAMES=frames_ai60 OUTNAME=video_fx60 python3 compose_fx.py > logs/final60.log 2>&1 || { echo FAIL >> logs/final60.log; exit 1; }
python3 mix.py >> logs/final60.log 2>&1
ffmpeg -v error -y -i out/video_fx60.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 20M -bufsize 40M -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -metadata:s:a:0 language=rus -shortest -movflags +faststart out/dancing_plague_1518_v3_60fps.mp4 >> logs/final60.log 2>&1
echo FINALDONE >> logs/final60.log
