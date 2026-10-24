# Cache-buster for the re-site pages (2026-10-24). Cloudflare serves CSS/JS with max-age=14400 (4 h), so after an
# edit a browser keeps the OLD stylesheet while it gets the NEW HTML — the page breaks (boss saw it twice).
# This rewrites every local <link href="/x.css"> and <script src="/x.js"> in the listed pages to "/x.css?v=<md5>".
# Run after any CSS/JS change:   py docs/re_site/bump_assets.py
import io, os, re, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGES = ["index.html", "ea/index.html", "re/index.html", "re/popquiz.html", "popquiz.html"]
rx = re.compile(r'((?:href|src)=")(/[A-Za-z0-9_\-/]+\.(?:css|js))(\?v=[0-9a-f]+)?(")')
def ver(path):
    p = os.path.join(ROOT, path.lstrip("/"))
    return hashlib.md5(open(p, "rb").read()).hexdigest()[:10] if os.path.exists(p) else None
for page in PAGES:
    fp = os.path.join(ROOT, page)
    if not os.path.exists(fp): continue
    s = io.open(fp, encoding="utf-8", newline="").read()
    def sub(m):
        v = ver(m.group(2))
        return m.group(0) if not v else m.group(1) + m.group(2) + "?v=" + v + m.group(4)
    t = rx.sub(sub, s)
    if t != s:
        io.open(fp, "w", encoding="utf-8", newline="").write(t)
        print("updated", page, sorted(set(m.group(2) for m in rx.finditer(t))))
