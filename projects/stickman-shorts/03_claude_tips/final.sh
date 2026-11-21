#!/bin/sh
# render video with fx + captions, then mux with mix.wav -> out/<NAME>_60fps.mp4
cd "$(dirname "$0")"; NAME=${1:-episode}
FPS=60 PUSHIN=1 FRAMES=frames60 OUTNAME=video_fx60 python3 compose_fx.py || { echo FAIL; exit 1; }
ffmpeg -v error -y -i out/video_fx60.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 20M -bufsize 40M -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k -metadata:s:a:0 language=rus -shortest -movflags +faststart out/${NAME}_60fps.mp4
echo FINALDONE
