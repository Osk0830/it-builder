#!/usr/bin/env bash
# rename-query.sh  (macOS Bash 3.x OK)
# “?xxx=yyy” を含むファイル名をクエリ削除した名前へリネームします。
# 例:
#   index.html?p=1171.html           -> index.html
#   index.html?post_type=news.html   -> index.html
#   classic-themes.min.css?ver=1.css -> classic-themes.min.css
#   xmlrpc.php?rsd                   -> xmlrpc.php
# 実行前にバックアップ推奨: cp -r it-builder it-builder.bak

set -euo pipefail

# スクリプトの置き場所から it-builder へ
cd "$(dirname "$0")"
cd it-builder

LOGFILE="../rename-log.txt"
: > "$LOGFILE"

# ? を含むファイルだけを安全に列挙（NULL 区切り）
find . -type f -name '*\?*' -print0 | while IFS= read -r -d '' f; do
  # 相対パスのまま扱う
  dir="$(dirname "$f")"
  name="$(basename "$f")"

  # 「?」以降を丸ごと削除したクリーン名を作成
  clean="${name%%\?*}"
  new="$dir/$clean"

  # すでに同名がある場合はスキップ（要手動確認）
  if [[ -e "$new" && "$new" != "$f" ]]; then
    echo "⚠️  Skip (already exists): $f -> $new" | tee -a "$LOGFILE"
    continue
  fi

  echo "🔄 Rename: $f -> $new" | tee -a "$LOGFILE"
  mv -- "$f" "$new"
done

echo "✅ リネーム完了。ログ: $LOGFILE"
