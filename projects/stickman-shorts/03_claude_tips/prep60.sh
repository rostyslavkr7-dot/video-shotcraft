#!/bin/sh
# clips/*.mov -> clips60/*.mp4 (60 fps motion-interpolated, no audio)
cd "$(dirname "$0")"
ls clips/*.mov | xargs -P 4 -I{} sh -c 'b=$(basename {} .mov); [ -s clips60/$b.mp4 ] || { ffmpeg -v error -y -i {} -an -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:v libx264 -crf 14 -preset fast clips60/$b.tmp.mp4 && mv clips60/$b.tmp.mp4 clips60/$b.mp4; echo $b; }'
echo INTERP_DONE
