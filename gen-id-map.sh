#!/usr/bin/env bash
# gen-id-map.sh
# ./it-builder 内の news/case ディレクトリから ID→正規パスのTSVを生成する
set -euo pipefail
cd "$(dirname "$0")/it-builder"

OUT="../auto_map.tsv"
: > "$OUT"

# news000XXXX
find news -type d -name 'news[0-9][0-9][0-9][0-9][0-9][0-9][0-9]' -print |
while read -r d; do
  b="$(basename "$d")"              # news0002436
  id="${b#news}"                    # 0002436
  id="$((10#$id))"                  # 2436
  printf "%s\t/%s/\n" "$id" "$d" >> "$OUT"
done

# case000XXXX
find case -type d -name 'case[0-9][0-9][0-9][0-9][0-9][0-9][0-9]' -print |
while read -r d; do
  b="$(basename "$d")"
  id="${b#case}"
  id="$((10#$id))"
  printf "%s\t/%s/\n" "$id" "$d" >> "$OUT"
done

# 例外: ルート直下の case000XXXX（あれば）
find . -maxdepth 1 -type d -name 'case000[0-9][0-9][0-9][0-9]' -print |
while read -r d; do
  b="$(basename "$d")"
  id="${b#case000}"
  id="$((10#$id))"
  printf "%s\t/%s/\n" "$id" "$d" >> "$OUT"
done

sort -n -u "$OUT" -o "$OUT"
echo "Wrote $OUT"
