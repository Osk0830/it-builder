# mark_orphan_links.sh
# /_orphans/ を指す a/form を一時無効化。href="#" aria-disabled などを付与し、HTMLコメントでTODO残す。
set -euo pipefail
BASE="${1:-it-builder}"
find "$BASE" -type f -name '*.html' -print0 | while IFS= read -r -d '' f; do
  cp -n "$f" "$f.bak" 2>/dev/null || true
  perl -0777 -i -pe '
    # <a href="/_orphans/">... を一時無効化
    s{
      (<a\b[^>]*\bhref\s*=\s*")[^"]*?_orphans/("?[^>]*>)
    }{$1\#"$2 aria-disabled="true" class="is-disabled" data-orphan="true"<!-- TODO: map-from-/orphans/ -->}igx;

    # <form action="/_orphans/">... を一時無効化
    s{
      (<form\b[^>]*\baction\s*=\s*")[^"]*?_orphans/("?[^>]*>)
    }{$1\#"$2 data-orphan="true" data-todo="map-form-action"}igx;
  ' "$f"
done
echo "[done] marked orphan links/forms as disabled with TODOs."
