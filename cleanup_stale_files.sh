#!/usr/bin/env bash
set -euo pipefail

# ----------------------------------------
# 設定 / 引数
# ----------------------------------------
BASE="${1:-}"
APPLY=false

# 引数パース
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE="$2"; shift 2;;
    --apply)
      APPLY=true; shift;;
    *)
      # 初回位置引数に BASE を許容
      if [[ -z "${BASE}" ]]; then BASE="$1"; shift; else shift; fi;;
  esac
done

if [[ -z "${BASE}" ]]; then
  echo "[usage] $0 --base it-builder [--apply]"
  exit 1
fi

if [[ ! -d "${BASE}" ]]; then
  echo "[error] BASE not found: ${BASE}"
  exit 1
fi

TS="$(date +"%Y%m%d-%H%M%S")"
OUTDIR="${BASE}/_cleanup_logs"
mkdir -p "${OUTDIR}"

LOG_SUMMARY="${OUTDIR}/summary-${TS}.log"
LOG_DIFF="${OUTDIR}/index_from_root_diffs-${TS}.log"
LIST_DELETE="${OUTDIR}/delete-candidates-${TS}.lst"
LIST_KEEP="${OUTDIR}/keep-list-${TS}.lst"

: > "${LOG_SUMMARY}"
: > "${LOG_DIFF}"
: > "${LIST_DELETE}"
: > "${LIST_KEEP}"

echo "[info] BASE = ${BASE}" | tee -a "${LOG_SUMMARY}"

# Git 管理下か判定
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  IN_GIT=true
  echo "[info] git repo detected" | tee -a "${LOG_SUMMARY}"
else
  IN_GIT=false
  echo "[info] git repo not detected" | tee -a "${LOG_SUMMARY}"
fi

# ----------------------------------------
# 1) index-from-root-p*.html の精査
#  - 同ディレクトリの index.html と diff -q
#  - 一致 → 削除候補 / 不一致 → KEEP + 差分ログ
# ----------------------------------------
echo "[step] scanning index-from-root-p*.html ..." | tee -a "${LOG_SUMMARY}"

mapfile -t ALT_LIST < <(find "${BASE}" -type f -name 'index-from-root-p*.html' | sort)

CNT_ALT_TOTAL=${#ALT_LIST[@]}
CNT_ALT_SAME=0
CNT_ALT_DIFF=0

for ALT in "${ALT_LIST[@]}"; do
  DIR="$(dirname "${ALT}")"
  MAIN="${DIR}/index.html"

  if [[ ! -f "${MAIN}" ]]; then
    echo "[warn] pair not found, KEEP: ${ALT}" | tee -a "${LOG_SUMMARY}"
    echo "${ALT}" >> "${LIST_KEEP}"
    continue
  fi

  if diff -q "${MAIN}" "${ALT}" >/dev/null 2>&1; then
    # 同一
    echo "[identical] delete candidate: ${ALT}" | tee -a "${LOG_SUMMARY}"
    echo "${ALT}" >> "${LIST_DELETE}"
    ((CNT_ALT_SAME++)) || true
  else
    # 差分あり → keep & 差分ログ
    echo "[differs] KEEP: ${ALT}" | tee -a "${LOG_SUMMARY}"
    {
      echo "===== DIFF: ${ALT} vs ${MAIN} ====="
      diff -u "${MAIN}" "${ALT}" || true
      echo
    } >> "${LOG_DIFF}"
    echo "${ALT}" >> "${LIST_KEEP}"
    ((CNT_ALT_DIFF++)) || true
  fi
done

echo "[result] index-from-root checked: total=${CNT_ALT_TOTAL}, identical=${CNT_ALT_SAME}, differs=${CNT_ALT_DIFF}" | tee -a "${LOG_SUMMARY}"
echo "[info] detailed diffs -> ${LOG_DIFF}" | tee -a "${LOG_SUMMARY}"

# ----------------------------------------
# 2) バックアップ/派生ファイルの収集
#    *.bak, *.bak1, *.bak2, *.debug.bak など
# ----------------------------------------
echo "[step] scanning backup-like files ..." | tee -a "${LOG_SUMMARY}"

mapfile -t BAK_LIST < <(find "${BASE}" -type f \( \
   -name '*.bak'    -o \
   -name '*.bak1'   -o \
   -name '*.bak2'   -o \
   -name '*.debug.bak' \
\) | sort)

CNT_BAK=${#BAK_LIST[@]}
if [[ ${CNT_BAK} -gt 0 ]]; then
  printf "%s\n" "${BAK_LIST[@]}" >> "${LIST_DELETE}"
fi
echo "[result] backup-like files found: ${CNT_BAK}" | tee -a "${LOG_SUMMARY}"

# ----------------------------------------
# 3) _orphans は参照が残っているため **削除しない**
#    （別途 grep 一覧済み。手作業で誘導先確定後に削除）
# ----------------------------------------
if [[ -d "${BASE}/_orphans" ]]; then
  echo "[note] ${BASE}/_orphans/ exists -> NOT deleting (refs remain)" | tee -a "${LOG_SUMMARY}"
fi

# ----------------------------------------
# サマリー＆確認
# ----------------------------------------
CNT_DEL=$(wc -l < "${LIST_DELETE}" | tr -d ' ')
CNT_KEEP=$(wc -l < "${LIST_KEEP}"   | tr -d ' ')
echo "[summary] delete-candidates=${CNT_DEL}, keeps=${CNT_KEEP}" | tee -a "${LOG_SUMMARY}"
echo "[files] delete list: ${LIST_DELETE}" | tee -a "${LOG_SUMMARY}"
echo "[files] keep list   : ${LIST_KEEP}"  | tee -a "${LOG_SUMMARY}"

# ----------------------------------------
# 実際に削除
# ----------------------------------------
if [[ "${APPLY}" == "true" ]]; then
  echo "[apply] deleting ${CNT_DEL} files ..." | tee -a "${LOG_SUMMARY}"

  if [[ "${CNT_DEL}" -gt 0 ]]; then
    while IFS= read -r P; do
      [[ -z "${P}" ]] && continue
      if [[ "${IN_GIT}" == "true" ]] && git ls-files --error-unmatch "${P}" >/dev/null 2>&1; then
        git rm -f "${P}" || true
      else
        rm -f "${P}" || true
      fi
    done < "${LIST_DELETE}"
  fi

  echo "[apply] done." | tee -a "${LOG_SUMMARY}"
else
  echo "[dry-run] no file deleted. Use --apply to actually remove." | tee -a "${LOG_SUMMARY}"
fi
