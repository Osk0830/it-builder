# make_encoded_ref_report.py
#!/usr/bin/env python3
import os, sys, re, urllib.parse, datetime

BASE = sys.argv[1] if len(sys.argv) > 1 else "it-builder"
LOGDIR = os.path.join(BASE, "_cleanup_logs")
os.makedirs(LOGDIR, exist_ok=True)
STAMP = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

PAIRS_TSV      = os.path.join(LOGDIR, f"encoded_ref_hits-{STAMP}.tsv")        # url_encoded \t file:line
SUMMARY_TSV    = os.path.join(LOGDIR, f"encoded_ref_summary-{STAMP}.tsv")     # count \t url_encoded
CANDIDATES_TSV = os.path.join(LOGDIR, f"encoded_ref_candidates-{STAMP}.tsv")  # url_encoded \t url_decoded \t fs_path_guess \t fs_exists

# %3F (= '?') を含む href/src/url() を抽出する正規表現
RX_ATTR = re.compile(r'(?:href|src)\s*=\s*([\'"])([^\'"]*%3[fF][^\'"]*)\1')
RX_URL  = re.compile(r'url\(\s*(?P<q>[\'"])?(?P<u>[^)\'"]*%3[fF][^)\']*)(?P=q)?\s*\)')

def iter_files():
    for root, _, files in os.walk(BASE):
        for fn in files:
            if not (fn.endswith(".html") or fn.endswith(".css") or fn.endswith(".js")):
                continue
            yield os.path.join(root, fn)

def normalize_fs_path(base, core):
    # http(s) はFS対象外
    if core.startswith("http://") or core.startswith("https://"):
        return "-", "-"
    # ルート相対は BASE と結合
    if core.startswith("/"):
        fs = os.path.join(base, core.lstrip("/"))
        # it-builder/it-builder 二重を抑止
        double = f"{base}/{base}/"
        if fs.startswith(double):
            fs = fs[len(base)+1:]
    else:
        fs = os.path.join(base, core)
    return fs, ("Y" if os.path.exists(fs) else "N")

pairs = []        # [(url_encoded, "file:line")]
url_counts = {}   # url_encoded -> count

for path in iter_files():
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for i, line in enumerate(f, 1):
                for m in RX_ATTR.finditer(line):
                    u = m.group(2).strip()
                    pairs.append((u, f"{path}:{i}"))
                    url_counts[u] = url_counts.get(u, 0) + 1
                for m in RX_URL.finditer(line):
                    u = m.group("u").strip()
                    pairs.append((u, f"{path}:{i}"))
                    url_counts[u] = url_counts.get(u, 0) + 1
    except Exception:
        # 変なエンコード等はスキップ
        pass

# ヒット行（重複除去）
seen = set()
with open(PAIRS_TSV, "w", encoding="utf-8") as w:
    for u, loc in sorted(pairs):
        k = (u, loc)
        if k in seen: 
            continue
        seen.add(k)
        w.write(f"{u}\t{loc}\n")

# サマリ（件数降順）
with open(SUMMARY_TSV, "w", encoding="utf-8") as w:
    for u, c in sorted(url_counts.items(), key=lambda x: (-x[1], x[0])):
        w.write(f"{c}\t{u}\n")

# 候補（? をデコード→ ?以降を落として FS 推定）
with open(CANDIDATES_TSV, "w", encoding="utf-8") as w:
    w.write("url_encoded\turl_decoded\tfs_path_guess\tfs_exists\n")
    for u in sorted(url_counts.keys()):
        dec = u.replace("%3F", "?").replace("%3f", "?")
        core = dec.split("?", 1)[0]
        fs, exists = normalize_fs_path(BASE, core)
        w.write(f"{u}\t{dec}\t{fs}\t{exists}\n")

print(f"[done] pairs     : {PAIRS_TSV}")
print(f"[done] summary   : {SUMMARY_TSV}")
print(f"[done] candidates: {CANDIDATES_TSV}")
