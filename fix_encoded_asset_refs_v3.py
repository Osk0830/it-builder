#!/usr/bin/env python3
import os, sys, re, datetime, urllib.parse
from typing import Optional, Set, Tuple, List

BASE = sys.argv[1] if len(sys.argv) > 1 else "it-builder"
APPLY = "--apply" in sys.argv
LOGDIR = os.path.join(BASE, "_cleanup_logs")
os.makedirs(LOGDIR, exist_ok=True)
STAMP = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
REPORT = os.path.join(LOGDIR, f"encoded_ref_fixes-{STAMP}.log")
MISSING = os.path.join(LOGDIR, f"encoded_ref_missing_after_fix-{STAMP}.tsv")

FORCE_PREFIXES = [
    "/it-builder/wp-content/themes/itbuilder-theme/resource/",
]

ATTR_RX = re.compile(
    r"""(?:
    (?:href|src)\s*=\s*
    (?P<q1>["'])
    (?P<u1>[^"'<>]*?(?:%3[Ff]|\?)[^"'<>]*?)
    (?P=q1)
  |
    url\(\s*
    (?P<q2>["'])?
    (?P<u2>[^)"']*?(?:%3[Ff]|\?)[^)"']*?)
    (?P=q2)?
    \s*\)
)""",
    re.X | re.I,
)

SCRIPT_TAG_RX = re.compile(r"<\s*script\b[^>]*>.*?</\s*script\s*>", re.I | re.S)
LINK_TAG_RX = re.compile(r"<\s*link\b[^>]*?>", re.I)
IMG_TAG_RX = re.compile(r"<\s*img\b[^>]*?>", re.I)


def should_force(core_url: str) -> bool:
    return any(core_url.startswith(pfx) for pfx in FORCE_PREFIXES)


def decode_url(u: str) -> str:
    try:
        return urllib.parse.unquote(u)
    except Exception:
        return u


def path_for_core(core_url: str) -> Optional[str]:
    if core_url.startswith(("http://", "https://")):
        return None
    if core_url.startswith("/"):
        p = f"{BASE}/{core_url.lstrip('/')}"
    else:
        p = f"{BASE}/{core_url}"
    dbl = f"{BASE}/{BASE}/"
    if p.startswith(dbl):
        p = p.replace(dbl, f"{BASE}/", 1)
    return p


def remove_whole_tag(line: str) -> str:
    # 1行に script/link/img のいずれかが単独である想定が多いので、タグごと削除
    if (
        SCRIPT_TAG_RX.search(line)
        or LINK_TAG_RX.search(line)
        or IMG_TAG_RX.search(line)
    ):
        return "\n" if line.endswith("\n") else ""
    # 混在などで単純に消せない場合は、最小限で安全にコメント化
    return "<!-- [auto-removed-unused] " + line.rstrip() + " -->\n"


def replace_line(
    line: str,
    file_path: str,
    line_no: int,
    missing_set: Set[Tuple[str, str]],
    changes: List[str],
) -> str:

    def _one(m):
        url_raw = m.group("u1") or m.group("u2")
        if not url_raw:
            return m.group(0)

        dec = decode_url(url_raw)
        core = dec.split("?", 1)[0]
        fs_path = path_for_core(core)
        force = should_force(core)

        # 使う（強制 or 実体あり）→ ? を剥がして置換
        if force or (fs_path and os.path.exists(fs_path)):
            if force and fs_path and not os.path.exists(fs_path):
                missing_set.add((core, fs_path))
            changes.append(f"replace\t{file_path}:{line_no}\t{url_raw}\t{core}")
            return m.group(0).replace(url_raw, core)

        # 使わない（実体なし）→ この場ではマーカーを返し、後続で行ごと処理
        return f"__AUTO_RM_TOKEN__{url_raw}__"

    new_line = ATTR_RX.sub(_one, line)
    if "__AUTO_RM_TOKEN__" in new_line:
        # 該当行はタグごと削除 or コメント化（安全第一で壊れない形に）
        changes.append(f"remove_line\t{file_path}:{line_no}\t{line.strip()[:120]}")
        return remove_whole_tag(line)
    return new_line


def process_file(
    path: str, missing_set: Set[Tuple[str, str]], changes: List[str]
) -> bool:
    try:
        text = open(path, "r", encoding="utf-8", errors="ignore").read()
    except Exception:
        return False
    changed = False
    out_lines = []
    for i, ln in enumerate(text.splitlines(keepends=True), 1):
        new_ln = replace_line(ln, path, i, missing_set, changes)
        out_lines.append(new_ln)
        if new_ln != ln:
            changed = True
    if changed and APPLY:
        open(path, "w", encoding="utf-8").write("".join(out_lines))
    return changed


def iter_files(base: str):
    for root, _, files in os.walk(base):
        for fn in files:
            if not fn.lower().endswith((".html", ".css", ".js")):
                continue
            p = os.path.join(root, fn)
            if "/_cleanup_logs/" in p.replace("\\", "/"):
                continue
            yield p


def main():
    total_files = 0
    changes: List[str] = []
    missing_set: Set[Tuple[str, str]] = set()

    for fp in iter_files(BASE):
        if process_file(fp, missing_set, changes):
            total_files += 1

    with open(REPORT, "w", encoding="utf-8") as w:
        for row in changes:
            w.write(row + "\n")

    if missing_set:
        with open(MISSING, "w", encoding="utf-8") as w:
            w.write("core_url\tfs_path\n")
            for core, fs in sorted(missing_set):
                w.write(f"{core}\t{fs}\n")

    mode = "APPLY" if APPLY else "DRY-RUN"
    print(f"[{mode}] touched_files={total_files}, change_logs -> {REPORT}")
    if missing_set:
        print(f"[note] missing after force-rewrite -> {MISSING}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: fix_encoded_asset_refs_v3.py <BASE> [--apply]")
        sys.exit(1)
    main()
