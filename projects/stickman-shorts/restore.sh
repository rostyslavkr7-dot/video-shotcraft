#!/bin/sh
# Rebuilds the working folders under /home/user/shorts from this repo (the scripts use hard-coded paths there).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
S=/home/user/shorts
mkdir -p $S
cp -r "$HERE/analysis/." $S/
cp -r "$HERE/01_dancing_plague" $S/dancing_plague
cp -r "$HERE/02_poslednij_rolik" $S/new_topic
cp -r "$HERE/03_claude_tips" $S/claude_tips
mkdir -p $S/claude_tips/ep2 && cp -r "$HERE/04_claude_projects/." $S/claude_tips/ep2/
cp -r "$HERE/channel" $S/claude_tips/channel
# English episodes 1-2 (same clips as RU, English voice)
for e in 1 2; do
  d=$S/claude_tips/en/ep$e; mkdir -p $d/assets
  cp "$HERE/03_claude_tips/compose_fx.py" "$HERE/03_claude_tips/mix.py" "$HERE/03_claude_tips/frames50.py" "$HERE/03_claude_tips/final50.sh" $d/
  cp "$HERE/en/ep${e}_timeline.json" $d/timeline.json
  sed -i 's/language=rus/language=eng/' $d/final50.sh
  cp "$HERE/en/ep${e}_voice.mp3" $d/assets/voice.mp3; cp "$HERE/en/ep${e}_words.json" $d/assets/voice.words.json
  cp "$HERE/03_claude_tips/assets/Rubik.ttf" $d/assets/
  cp "$HERE/03_claude_tips/music/music_a.mp3" $d/assets/music.mp3
  [ $e = 1 ] && ln -sfn $S/claude_tips/clips_v2 $d/clips_v2 || ln -sfn $S/claude_tips/ep2/clips_v2 $d/clips_v2
done
cp "$HERE/en/"ep*_voice.txt $S/claude_tips/en/
# English Dancing Plague / The Last Video
for p in dancing:dancing_plague:01_dancing_plague/ai/clips lastvideo:last_video:02_poslednij_rolik/clips; do
  n=${p%%:*}; r=${p#*:}; src=${r%%:*}; clips=${r#*:}; d=$S/en_more/$n; mkdir -p $d/assets
  cp "$HERE/03_claude_tips/compose_fx.py" "$HERE/03_claude_tips/frames50.py" $d/
  cp "$HERE/en/$src/mix.py" "$HERE/en/$src/final50.sh" "$HERE/en/$src/timeline.json" $d/
  cp "$HERE/en/$src/voice.mp3" "$HERE/en/$src/music.mp3" $d/assets/
  cp "$HERE/en/$src/"*_words.json $d/assets/voice.words.json; cp "$HERE/en/$src/"*_voice.txt $S/en_more/
  cp "$HERE/03_claude_tips/assets/Rubik.ttf" $d/assets/
  ln -sfn "$HERE/$clips" $d/clips_v2
done
pip install -q faster-whisper opencv-python-headless soundfile pillow numpy
command -v ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)
echo "restored to $S"
