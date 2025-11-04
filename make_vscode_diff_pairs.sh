# make_vscode_diff_pairs.sh
#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-it-builder}"
OUT_DIR="$BASE/_cleanup_logs"
OUT_TSV="$OUT_DIR/vscode_diff_pairs.tsv"

mkdir -p "$OUT_DIR"

# index-from-root-p*.html の相方 index.html を推定して TSV へ
grep -RIl --include='index-from-root-p*.html' ./"$BASE" \
| while read -r ALT; do
  CANON="${ALT%/*}/index.html"
  if [[ -f "$CANON" ]]; then
    printf '%s\t%s\n' "$CANON" "$ALT"
  fi
done > "$OUT_TSV"

echo "[done] pairs -> $OUT_TSV"
