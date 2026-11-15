#!/usr/bin/env bash
# Mohaç 1526 belgeselini baştan üretir. Gereken: python3 (numpy, scipy, pillow, skia-python), ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/src"
python3 build_europe.py
python3 build_battlefield.py
python3 audio_prep.py      # audio/s1..s6.mp3 -> zaman çizelgesi + altyazı
python3 music.py           # müzik + efekt + anlatım miksi
python3 render.py --jobs "${JOBS:-4}"
ffmpeg -y -loglevel error -i ../build/video_silent.mp4 -i ../build/final_audio.wav \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../build/mohac_1526_full.mp4
ffmpeg -y -loglevel error -i ../build/mohac_1526_full.mp4 -c:v libx264 -crf 23 -preset slow -c:a copy \
  -movflags +faststart ../mohac_1526.mp4
echo "Hazır: mohac_1526/mohac_1526.mp4"
