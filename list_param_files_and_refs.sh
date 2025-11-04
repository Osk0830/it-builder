#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-it-builder}"

ts() { date +"%Y%m%d-%H%M%S"; }
TS="$(ts)"
LOG_DIR="${BASE}/_cleanup_logs"
mkdir -p "${LOG_DIR}"

# 出力ファイル
FILES_LST="${LOG_DIR}/param_files-${TS}.lst"
REFS_Q_LOG="${LOG_DIR}/refs_with_literal_qmark-${TS}.log"
REFS_ENC_LOG="${LOG_DIR}/refs_with_percent3F-${TS}.log"
REFS_TSV="${LOG_DIR}/param_ref_hits-${TS}.tsv"

echo "[info] base=${BASE}"
echo "[info] out ->"
echo "       - files : ${FILES_LST}"
echo "       - refs(literal '?') : ${REFS_Q_LOG}"
echo "       - refs(%3F/%3f)     : ${REFS_ENC_LOG}"
echo "       - refs(tsv merged)  : ${REFS_TSV}"

# 1) ファイル名に「?」を含む実ファイル一覧
#    （例: it-builder/2016/index.html?post_type=news.html 等）
#    -print0 と xargs -0 で安全に扱う
echo "[step] scanning files with '?' in file name ..."
find "${BASE}" -type f -name '*\?*' -print > "${FILES_LST}" || true
CNT_FILES="$(wc -l < "${FILES_LST}" | tr -d ' ')"
echo "[done] files-with-? = ${CNT_FILES}"

# 2) 参照側の検出（HTML/CSS/JS 内）
#    a) 文字通りの '?' を含むリンク/URL
#    b) エンコードされた '%3F'（大文字小文字）
#    参照は grep -RIn で収集。改行や埋め込みも考慮して幅広く拾う。
echo "[step] scanning references in source (.html/.css/.js) ..."

# a) リテラル '?' を含む URL 参照（href/src/action/url(...) など広めに）
#    ※ .min.js のような大容量は拾いたくない場合は --exclude='*.min.*' などを追加してOK
grep -RIn \
  --include='*.html' --include='*.css' --include='*.js' \
  -E '((href|src|action)\s*=\s*["'\''][^"'\''\)]*\?[^"'\''\)]*|url\(\s*["'\'']?[^)"'\'' ]*\?[^)"'\'' ]*)' \
  "${BASE}" > "${REFS_Q_LOG}" || true

# b) %3F（? のURLエンコード）を含む参照
grep -RIn \
  --include='*.html' --include='*.css' --include='*.js' \
  -E '%3[fF]' \
  "${BASE}" > "${REFS_ENC_LOG}" || true

# 3) 参照ログを TSV 化（path \t line \t kind \t snippet）
#    kind: literal_q | enc_q
echo "[step] merging to TSV ..."
{
  awk -F: '{
    file=$1; line=$2;
    $1=""; $2="";
    sub(/^:/,"");        # 先頭コロン除去
    kind="literal_q";
    print file "\t" line "\t" kind "\t" $0
  }' "${REFS_Q_LOG}" 2>/dev/null

  awk -F: '{
    file=$1; line=$2;
    $1=""; $2="";
    sub(/^:/,"");
    kind="enc_q";
    print file "\t" line "\t" kind "\t" $0
  }' "${REFS_ENC_LOG}" 2>/dev/null
} > "${REFS_TSV}"

echo "[done] TSV lines = $(wc -l < "${REFS_TSV}" | tr -d ' ')"
echo "[files] ${FILES_LST}"
echo "[files] ${REFS_Q_LOG}"
echo "[files] ${REFS_ENC_LOG}"
echo "[files] ${REFS_TSV}"
