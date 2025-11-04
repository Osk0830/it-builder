#!/usr/bin/env bash
# log-alt-index-diffs.sh
# it-builder配下の "index-from-root-p*.html" と同ディレクトリの "index.html" を比較し、
# 1) 差分ログ (alt_index_diff.log)
# 2) サマリTSV (alt_index_summary.tsv)
# 3) 削除スクリプト (alt_index_delete.sh) … 完全一致の退避ファイルを削除
# を生成する。macOSのBash 3で動作。

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR/it-builder"

DIFF_LOG="../alt_index_diff.log"
SUMMARY_TSV="../alt_index_summary.tsv"
DELETE_SH="../alt_index_delete.sh"

# 初期化
: > "$DIFF_LOG"
: > "$SUMMARY_TSV"
: > "$DELETE_SH"

# TSVヘッダ
echo -e "STATUS\tDIR\tALT_FILE\tNOTE" >> "$SUMMARY_TSV"

# 退避ファイルを走査
# -print0 + read -d '' でスペース/日本語パス安全に扱う
find . -type f -name 'index-from-root-p*.html' -print0 | while IFS= read -r -d '' ALT; do
  DIR="$(dirname "$ALT")"
  IDX="$DIR/index.html"
  ALT_BASENAME="$(basename "$ALT")"

  if [ ! -f "$IDX" ]; then
    echo -e "MISSING_INDEX\t$DIR\t$ALT_BASENAME\tindex.html not found" >> "$SUMMARY_TSV"
    {
      echo "===== MISSING index.html ====="
      echo "ALT: $ALT"
      echo
    } >> "$DIFF_LOG"
    continue
  fi

  # 完全一致かどうか（cmpは終了コードのみで高速）
  if cmp -s "$IDX" "$ALT"; then
    echo -e "IDENTICAL\t$DIR\t$ALT_BASENAME\tOK to delete ALT" >> "$SUMMARY_TSV"
    # 削除スクリプトに追記（安全のため別ファイルにする）
    printf "rm '%s'\n" "$ALT" >> "$DELETE_SH"
  else
    echo -e "DIFF\t$DIR\t$ALT_BASENAME\tsee alt_index_diff.log" >> "$SUMMARY_TSV"
    {
      echo "===== DIFF: $ALT  vs  $IDX ====="
      # 差分はユニファイド形式で全文
      diff -u "$IDX" "$ALT" || true
      echo
    } >> "$DIFF_LOG"
  fi
done

# 削除スクリプトのヘッダ付与＆実行権
sed -i '' '1s|^|#!/usr/bin/env bash\nset -euo pipefail\n|\n' "$DELETE_SH" 2>/dev/null || {
  # sed -i の互換対応（念のため）: macOSは上記でOK
  :
}
chmod +x "$DELETE_SH"

# 終了メッセージ
cat <<EOF

[done] 差分ログを作成しました。

  - 差分詳細:   $DIFF_LOG
  - サマリTSV:  $SUMMARY_TSV
  - 削除案:     $DELETE_SH   # IDENTICAL の退避ファイルだけ削除

使い方の例:
  # 退避ファイルのうち完全一致のものだけ削除（確認してから）
  $DELETE_SH

  # サマリの件数ざっくり確認
  awk -F'\t' 'NR>1{c[\$1]++} END{for(k in c) printf("%s\t%d\n",k,c[k])}' "$SUMMARY_TSV"

EOF
