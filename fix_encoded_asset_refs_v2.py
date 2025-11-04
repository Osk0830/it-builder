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

# “使う前提”で強制的に ? を剥がす対象プレフィクス
FORCE_PREFIXES = [
    "/it-builder/wp-content/themes/itbuilder-theme/resource/",
]

TAG_RX = re.compile(r"<\s*(link|script|img)\b", re.I)


def should_force(core_url: str) -> bool:
    return any(core_url.startswith(pfx) for pfx in FORCE_PREFIXES)


def path_for_core(core_url: str) -> Optional[str]:
    # http(s)は対象外
    if core_url.startswith("http://") or core_url.startswith("https://"):
        return None
    # 先頭 / は BASE で解決
    if core_url.startswith("/"):
        p = "%s/%s" % (BASE, core_url.lstrip("/"))
    else:
        p = "%s/%s" % (BASE, core_url)
    # "it-builder/it-builder" 二重を防ぐ
    dbl = "%s/%s/" % (BASE, BASE)
    if p.startswith(dbl):
        p = p.replace(dbl, "%s/" % BASE, 1)
    return p


def decode_url(u: str) -> str:
    try:
        return urllib.parse.unquote(u)
    except Exception:
        return u


# %3F / ？ の両方にマッチ（href/src/url(...)）
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
        core = dec.split("?", 1)[0]  # ? 以降を削除
        fs_path = path_for_core(core)
        force = should_force(core)

        if force:
            if fs_path and not os.path.exists(fs_path):
                missing_set.add((core, fs_path))
            changes.append(
                "force_replace\t%s:%d\t%s\t%s" % (file_path, line_no, url_raw, core)
            )
            return m.group(0).replace(url_raw, core)

        if fs_path and os.path.exists(fs_path):
            changes.append(
                "replace\t%s:%d\t%s\t%s" % (file_path, line_no, url_raw, core)
            )
            return m.group(0).replace(url_raw, core)

        full = m.group(0)
        if (TAG_RX.search(line) is not None) and (
            "<!--" not in line and "-->" not in line
        ):
            return "<!-- [auto-removed-unused] %s -->" % line.rstrip()
        else:
            changes.append("strip_url\t%s:%d\t%s\t" % (file_path, line_no, url_raw))
            return full.replace(url_raw, "")

    return ATTR_RX.sub(_one, line)


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
            if not (fn.endswith(".html") or fn.endswith(".css") or fn.endswith(".js")):
                continue
            p = os.path.join(root, fn)
            if "/_cleanup_logs/" in p.replace("\\", "/"):
                continue
            yield p


def main():
    total_files = 0
    changes = []  # type: List[str]
    missing_set = set()  # type: Set[Tuple[str,str]]

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
                w.write("%s\t%s\n" % (core, fs))

    mode = "APPLY" if APPLY else "DRY-RUN"
    print("[%s] touched_files=%d, change_logs -> %s" % (mode, total_files, REPORT))
    if missing_set:
        print("[note] missing after force-rewrite -> %s" % MISSING)


if __name__ == "__main__":
    main()
