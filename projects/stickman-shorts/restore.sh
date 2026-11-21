#!/bin/sh
# Відновлює робочу папку /home/user/shorts з цього репозиторію (скрипти мають жорсткі шляхи туди).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p /home/user/shorts
cp -r "$HERE/analysis/." /home/user/shorts/
cp -r "$HERE/01_dancing_plague" /home/user/shorts/dancing_plague
cp -r "$HERE/02_poslednij_rolik" /home/user/shorts/new_topic
cp -r "$HERE/03_claude_tips" /home/user/shorts/claude_tips
pip install -q faster-whisper opencv-python-headless soundfile pillow numpy edge-tts gdown
command -v ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)
echo "restored to /home/user/shorts"
