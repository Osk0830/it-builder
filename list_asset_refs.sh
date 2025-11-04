#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-it-builder}"
OUTDIR="$BASE/_cleanup_logs"
TSV="$OUTDIR/asset_ref_hits-$(date +%Y%m%d-%H%M%S).tsv"
LOG="$OUTDIR/asset_ref_summary-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$OUTDIR"

# 対象（必要に応じて追加・削除OK）
read -r -d '' ASSETS <<'EOF'
it-builder/xmlrpc.php
it-builder/wp-includes/css/dist/block-library/style.min.css
it-builder/wp-includes/css/classic-themes.min.css
it-builder/wp-content/plugins/lw-wae-contents-editor/js/library.js
it-builder/wp-content/plugins/lw-wae-contents-editor/js/wae-section.js
it-builder/wp-content/plugins/lw-wae-contents-editor/aos/aos.css
it-builder/wp-content/plugins/lw-wae-contents-editor/aos/slick.css
it-builder/wp-content/plugins/lw-wae-contents-editor/aos/aos.js
it-builder/wp-content/themes/itbuilder-theme/resource/css/print.css
it-builder/wp-content/themes/itbuilder-theme/resource/css/top.css
it-builder/wp-content/themes/itbuilder-theme/resource/css/common.css
EOF

echo -e "asset\tref_count\tfirst_5_refs" > "$TSV"
: > "$LOG"

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  # /it-builder から後ろを正規表現化し、?ver= 等のクエリ付与も許容
  rel="${path#it-builder/}"
  # href/src/url() での参照、クエリ文字列付きもヒットさせる
  PATTERN="(href|src|url\\()\\s*[\"']?\\/?it-builder/${rel//\//\\/}(\\?[^\"')\\s>]*)?"
  mapfile -t hits < <(grep -RInE --include='*.html' --include='*.css' --include='*.js' "$PATTERN" "$BASE" || true)

  count="${#hits[@]}"
  if (( count > 0 )); then
    {
      echo "[HIT] $path  -> $count refs"
      printf '  %s\n' "${hits[@]:0:5}"
    } | tee -a "$LOG" >/dev/null
    printf "%s\t%d\t%s\n" "$path" "$count" "$(printf '%s | ' "${hits[@]:0:5}")" >> "$TSV"
  else
    echo "[NONE] $path" | tee -a "$LOG" >/dev/null
    printf "%s\t0\t-\n" "$path" >> "$TSV"
  fi
done <<< "$ASSETS"

echo
echo "[done] wrote:"
echo "  summary: $LOG"
echo "  table  : $TSV"
