#!/usr/bin/env bash
set -euo pipefail

PAIRS_TSV="${1:?usage: open_encoded_hits_vscode.sh <pairs.tsv> [MAX]}"
MAX="${2:-50}"

# URLごとにグルーピングし、出現上位から MAX 件だけ拾う
# 1列目:URL 2列目:file:line
awk -F'\t' 'NF>=2{print $1"\t"$2}' "$PAIRS_TSV" \
| awk -F'\t' '{cnt[$1]++} END{for (k in cnt) print cnt[k]"\t"k}' \
| sort -nr \
| head -n "$MAX" \
| while IFS=$'\t' read -r count url; do
    echo ">>> [$count hits] $url"
    # URLに紐づく最初の1件だけ開く（必要なら全件に変更可）
    awk -F'\t' -v u="$url" '$1==u{print $2; exit}' "$PAIRS_TSV" \
    | while IFS=: read -r f l; do
        echo "open: $f:$l"
        code -g "$f:$l"
      done
  done
