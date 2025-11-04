#!/usr/bin/env bash
# move-p-files.sh  (macOS Bash 3 OK)
# ./it-builder 内の "index.html?p=XXXX.html" を自動で正規位置に移動する。
# ルール:
#  - news/news000XXXX/ があれば → そこへ
#  - case/case000XXXX/ があれば → そこへ
#  - 例外: ./it-builder/case000XXXX/ 直下があれば → そこへ
#  - 見つからなければ ./it-builder/_orphans/ へ退避
# 既存の index.html がある場合は上書きしない（代替名で保存）

set -euo pipefail

cd "$(dirname "$0")/it-builder"

LOG="../move-p-files.log"
: > "$LOG"

mkdir -p _orphans

move_one () {
  local f="$1" id="$2"
  local nid="news$(printf '%07d' "$id")"
  local cid="case$(printf '%07d' "$id")"

  local dest_dir=""
  if [ -d "news/$nid" ]; then
    dest_dir="news/$nid"
  elif [ -d "case/$cid" ]; then
    dest_dir="case/$cid"
  elif [ -d "case000$id" ]; then
    dest_dir="case000$id"
  fi

  if [ -n "$dest_dir" ]; then
    # 既に index.html があるか？
    if [ -f "$dest_dir/index.html" ]; then
      # 上書きせず代替名で保管
      local alt="$dest_dir/index-from-root-p${id}.html"
      echo "🟡 Keep-as-alt: $f -> $alt" | tee -a "$LOG"
      mv -- "$f" "$alt"
    else
      # 正規名で移動
      echo "✅ Move: $f -> $dest_dir/index.html" | tee -a "$LOG"
      mv -- "$f" "$dest_dir/index.html"
    fi
  else
    # 行き先不明 → _orphans へ
    local orphan="_orphans/p-${id}.html"
    echo "⚪ Orphan: $f -> $orphan" | tee -a "$LOG"
    mv -- "$f" "$orphan"
  fi
}

# ルート直下の "index.html?p=XXXX.html" を対象
for f in ./index.html\?p=*.html; do
  [ -f "$f" ] || continue
  # 末尾の数値を抽出
  id="${f##*?p=}"
  id="${id%.html}"
  # 数値だけに限定
  if ! printf '%s' "$id" | grep -Eq '^[0-9]+$'; then
    echo "⛔ Skip (not numeric id): $f" | tee -a "$LOG"
    continue
  fi
  move_one "$f" "$id"
done

echo "---- DONE ----" | tee -a "$LOG"
