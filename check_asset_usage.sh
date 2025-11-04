#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-it-builder}"

log_dir="$BASE/_cleanup_logs"
mkdir -p "$log_dir"

ts=$(date +%Y%m%d-%H%M%S)
refs_txt="$log_dir/asset_refs-$ts.txt"
norm_refs_txt="$log_dir/asset_refs_normalized-$ts.txt"
candidates_txt="$log_dir/asset_candidates-$ts.txt"
unused_txt="$log_dir/asset_unused-$ts.lst"
used_txt="$log_dir/asset_used-$ts.lst"

# --- 収集: href/src と CSS url() を抜く（クエリを除去して正規化） ---
# HTML/JS の href/src
grep -RIn --include='*.{html,htm,js}' -E '(href|src)\s*=\s*"[^"]+"' "$BASE" \
  | sed -E 's/.*(href|src)\s*=\s*"([^"]+)".*/\2/' \
  > "$refs_txt" || true

# CSS の url()
grep -RIn --include='*.css*' -E 'url\(\s*["'\''"]?[^)"'\'' ]+' "$BASE" \
  | sed -E 's/.*url\(\s*["'\''"]?([^)"'\'' ]+).*/\1/' \
  >> "$refs_txt" || true

# 正規化:
# - 先頭の ./ を除去
# - / の重複を正規化
# - クエリ ?... と #... を除去
# - data:, mailto:, tel:, http(s) は除外
awk '
function norm(p) {
  gsub(/^\.\/+/, "", p);
  sub(/\?.*$/, "", p);
  sub(/#.*/, "", p);
  gsub(/\/+/, "/", p);
  return p;
}
{
  p=$0
  if (p ~ /^(data:|mailto:|tel:|https?:\/\/)/) next;
  print norm(p)
}' "$refs_txt" \
  | sed -E 's/^"\s*//; s/\s*"$//' \
  | sort -u > "$norm_refs_txt"

# --- 削除候補: ここに「要否を見極めたいファイル群」を列挙 ---
# 例：質問に挙がっている候補をまず入れておく。必要に応じて追記OK。
cat > "$candidates_txt" <<'LIST'
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
LIST

# クエリ付き実体ファイルが存在する場合の吸収（?以降落とす）
# ファイルの実在チェックもしつつ、「参照されているか?」を判定
> "$unused_txt"
> "$used_txt"

while IFS= read -r cand; do
  [ -z "$cand" ] && continue
  norm=$(echo "$cand" | sed -E 's/\?.*$//')
  # 参照と突合（先頭/相対両方あり得るので2通りで確認）
  # 1) そのまま  2) 先頭の it-builder を /it-builder にした形
  as_is="$norm"
  as_root="/$norm"
  if grep -Fxq "$as_is" "$norm_refs_txt" || grep -Fxq "$as_root" "$norm_refs_txt"; then
    echo "$cand" >> "$used_txt"
  else
    echo "$cand" >> "$unused_txt"
  fi
done < "$candidates_txt"

echo "[result] refs    : $norm_refs_txt"
echo "[result] used    : $used_txt"
echo "[result] UNUSED! : $unused_txt"
