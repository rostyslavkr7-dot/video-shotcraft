#!/bin/sh
# 50 fps render from frames50/ (native LTX rate, no extra push-in), then mux with out/mix.wav
cd "$(dirname "$0")"; NAME=${1:-episode}
FPS=50 FRAMES=frames50 OUTNAME=video_fx50 python3 compose_fx.py || { echo FAIL; exit 1; }
ffmpeg -v error -y -i out/video_fx50.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 16M -bufsize 32M -pix_fmt yuv420p -r 50 -c:a aac -b:a 192k -metadata:s:a:0 language=eng -shortest -movflags +faststart out/${NAME}_50fps.mp4
echo FINALDONE
