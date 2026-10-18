#!/usr/bin/env bash
# scripts/encode-hls.sh — turn a video into the adaptive (HLS) ladder that
# components/ui/HlsVideo.tsx plays.
#
#   scripts/encode-hls.sh <input.mp4> <out-dir> [poster-seconds]
#   e.g. scripts/encode-hls.sh ~/autopilot-v9.mp4 public/video/autopilot-v9 63.5
#
# Renditions: the source's own resolution as a stream copy (bit-identical,
# no quality loss), plus 720p and 480p re-encodes. The re-encodes put their
# keyframes exactly on the source's keyframes, so all three playlists cut
# segments at the same instants and the player can switch rungs mid-play
# without a glitch. Use a NEW out-dir name per video version: next.config.ts
# caches /video/* as immutable.
set -euo pipefail

in=$(realpath "$1") out=$2 poster_at=${3:-0}
mkdir -p "$out"

# Source keyframe times, nudged 4 ms early so "first frame at or after t"
# lands on the same frame (avoids float rounding one frame late).
kf=$(ffprobe -v error -select_streams v -skip_frame nokey -show_entries frame=pts_time -of csv=p=0 "$in" \
  | grep -oE '[0-9]+\.[0-9]+' | awk '{t=$1-0.004; if(t<0)t=0; printf "%s%.4f", (NR>1?",":""), t}')

(
  cd "$out"
  ffmpeg -v warning -stats -i "$in" \
    -filter_complex "[0:v]split=2[a][b];[a]scale=-2:720:flags=lanczos[v720];[b]scale=-2:480:flags=lanczos[v480]" \
    -map 0:v -map "[v720]" -map "[v480]" -map 0:a -map 0:a -map 0:a \
    -c:v:0 copy \
    -c:v:1 libx264 -preset slow -profile:v:1 high -crf:v:1 19 -maxrate:v:1 3200k -bufsize:v:1 6400k -force_key_frames:v:1 "$kf" \
    -c:v:2 libx264 -preset slow -profile:v:2 high -crf:v:2 21 -maxrate:v:2 1400k -bufsize:v:2 2800k -force_key_frames:v:2 "$kf" \
    -pix_fmt yuv420p -x264-params keyint=600:min-keyint=600:scenecut=0 \
    -c:a:0 copy -c:a:1 copy -c:a:2 aac -b:a:2 128k \
    -f hls -hls_time 2 -hls_playlist_type vod -hls_segment_type fmp4 -hls_flags independent_segments \
    -master_pl_name master.m3u8 -var_stream_map "v:0,a:0,name:1080 v:1,a:1,name:720 v:2,a:2,name:480" \
    -hls_segment_filename "%v/seg_%03d.m4s" -hls_fmp4_init_filename init.mp4 "%v/index.m3u8"
)

ffmpeg -v error -ss "$poster_at" -i "$in" -frames:v 1 -c:v libwebp -quality 88 "$out/poster.webp" -y
echo "done: $out"
