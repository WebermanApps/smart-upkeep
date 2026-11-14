#!/usr/bin/env python3
import functools, http.server, sys
from pathlib import Path
from urllib.parse import urlparse

SITE = Path("/workspace/contrast-1114")
FONTS = Path("/workspace/plans-swipe-1113/fonts")
BASELINE = SITE / "qa" / "baseline"
PORT = 19750
MODE = "after"
for a in sys.argv[1:]:
    if a == "--baseline":
        MODE = "baseline"
    elif a.isdigit():
        PORT = int(a)

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def translate_path(self, path):
        raw = urlparse(path).path
        if raw.startswith("/__qa_fonts/"):
            name = raw.split("/__qa_fonts/", 1)[1]
            return str(FONTS / name)
        if MODE == "baseline":
            name = raw.rsplit("/", 1)[-1]
            if name in ("index.html", "styles.css", "app.js") or raw in ("/", "/index.html"):
                src = BASELINE / ("index.html" if raw in ("/", "/index.html") else name)
                if src.exists():
                    return str(src)
        return super().translate_path(path)

if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", PORT), functools.partial(H, directory=str(SITE))
    )
    print(f"serving {SITE} ({MODE}) on http://127.0.0.1:{PORT}", flush=True)
    srv.serve_forever()
