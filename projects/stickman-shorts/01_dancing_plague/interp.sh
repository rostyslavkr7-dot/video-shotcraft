#!/bin/sh
cd /home/user/shorts/dancing_plague
for s in s07_council s09_stage s10_strong s11_night s12_ban s13_road s14_chapel s15_autumn s16_end; do echo $s; done | xargs -P 4 -I{} sh -c '[ -s ai/clips60/{}.mp4 ] || { ffmpeg -v error -y -i ai/clips/{}.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:v libx264 -crf 14 -preset fast ai/clips60/{}.tmp.mp4 && mv ai/clips60/{}.tmp.mp4 ai/clips60/{}.mp4 && echo "{} ok"; }'
echo ALLDONE
