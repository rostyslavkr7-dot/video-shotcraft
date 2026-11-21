#!/usr/bin/env bash
# Usage: ./download.sh [cookies.txt]
# Downloads the 20 selected shorts with the original English audio track.
cd "$(dirname "$0")"
COOK=(); [ -n "$1" ] && COOK=(--cookies "$1")
yt-dlp "${COOK[@]}" -a urls.txt \
  -f "bv*+ba[format_note*=original]/bv*+ba[language^=en]/bv*+ba/b" \
  --merge-output-format mp4 --sleep-interval 3 --max-sleep-interval 8 \
  -o "%(upload_date)s - %(title)s [%(id)s].%(ext)s"
