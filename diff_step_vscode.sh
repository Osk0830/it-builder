#!/usr/bin/env bash
set -euo pipefail

PAIRS_TSVC="${1:-it-builder/_cleanup_logs/vscode_diff_pairs.tsv}"

if [[ ! -f "$PAIRS_TSVC" ]]; then
  echo "pairs tsv not found: $PAIRS_TSVC" >&2
  exit 1
fi

i=0
while IFS=$'\t' read -r LEFT RIGHT || [[ -n "${LEFT:-}" ]]; do
  [[ -z "${LEFT:-}" || -z "${RIGHT:-}" ]] && continue
  i=$((i+1))
  echo "[diff $i] $LEFT  <->  $RIGHT"
  if command -v code >/dev/null 2>&1; then
    code --wait --diff "$LEFT" "$RIGHT"
  else
    open -a "Visual Studio Code" --args --wait --diff "$LEFT" "$RIGHT"
  fi
done < "$PAIRS_TSVC"

echo "[done] reviewed $i diffs"
