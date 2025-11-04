#!/usr/bin/env bash
set -euo pipefail

ROOT="it-builder"
OUT="orphans_refs.csv"

echo 'file,line,attr,html_snippet' > "$OUT"

# href/src/action に /_orphans/ を含むタグ
grep -RIn --include='*.html' -E '(href|src|action)\s*=\s*"\/_orphans\/' "$ROOT" \
| while IFS=: read -r FILE LINE REST; do
  SNIP=$(sed -n "${LINE}p" "$FILE" | sed -E 's/"/""/g' | cut -c1-400)
  ATTR=$(echo "$REST" | sed -E 's/.*(href|src|action).*/\1/')
  echo "\"$FILE\",\"$LINE\",\"$ATTR\",\"$SNIP\"" >> "$OUT"
done

# canonical も別枠で拾う
grep -RIn --include='*.html' -E '<link[^>]+rel="canonical"[^>]+href="\/_orphans\/"' "$ROOT" \
| while IFS=: read -r FILE LINE REST; do
  SNIP=$(sed -n "${LINE}p" "$FILE" | sed -E 's/"/""/g' | cut -c1-400)
  echo "\"$FILE\",\"$LINE\",\"canonical\",\"$SNIP\"" >> "$OUT"
done

echo "[ok] Wrote $OUT"
