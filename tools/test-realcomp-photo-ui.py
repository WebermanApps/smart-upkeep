#!/usr/bin/env python3
"""Playwright checks + 390 shots for the Deerfield Realcomp photo removal.

Shots go to <repo>/shots/ (default) or $SHOTS_DIR. Exit 0 only if:
  - Alina's tech job card and console member banner use the SVG stand-in
  - no data:image/jpeg of the removed listing is visible
  - "Realcomp" is not visible on those Alina views
"""
from __future__ import annotations

import http.server
import os
import socketserver
import sys
import threading
import importlib.util
import shutil
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) > 1:
    ROOT = Path(sys.argv[1]).resolve()
OUT = Path(os.environ.get("SHOTS_DIR", ROOT / "shots"))
OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("SHOTS_PORT", "0"))
BASE = None  # set after bind

INIT = r"""
(function(){
  try{
    sessionStorage.setItem('mwPagelockOk','1');
    sessionStorage.setItem('su.memberIn','1');
    sessionStorage.setItem('smartUpkeep.videoDismissed','1');
  }catch(e){}
})();
"""

FAILURES = []


def fail(msg: str) -> None:
    FAILURES.append(msg)
    print("FAIL:", msg)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


def load_pagelock():
    for path in (
        Path("/workspace/security/pagelock/lock_pages.py"),
        ROOT.parents[0] / "security/pagelock/lock_pages.py",
    ):
        if path.exists():
            spec = importlib.util.spec_from_file_location("mw_lock_pages", path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    return None


def decrypt_for_serve(src: Path) -> Path:
    """Copy the repo and decrypt gated HTML so Playwright can load the app."""
    tmp = Path(tempfile.mkdtemp(prefix="su-realcomp-ui-"))
    # Copy needed tree (skip .git and shots)
    ignore = shutil.ignore_patterns(".git", "shots", "__pycache__", "node_modules")
    shutil.copytree(src, tmp, dirs_exist_ok=True, ignore=ignore)
    lock = load_pagelock()
    if not lock:
        return tmp
    try:
        extra = lock.load_config(src)
        main = lock.main_key_enabled(src)
    except Exception:
        extra, main = None, True
    cands = []
    if main:
        try:
            cands.append(lock.password())
        except Exception:
            pass
    if extra:
        try:
            cands.extend(v for v, _ in lock.extra_passwords(extra))
        except Exception:
            pass
    caches = {c: {} for c in cands}
    for f in tmp.rglob("*.html"):
        text = f.read_text(errors="replace")
        if not lock.is_gate(text):
            continue
        out = None
        for cand in cands:
            try:
                out = lock.decrypt(text, cand, caches[cand])
            except Exception:
                out = None
            if out is not None:
                break
        if out is None:
            raise SystemExit(f"decrypt failed for {f.relative_to(tmp)}")
        f.write_text(out)
    return tmp


SERVE_ROOT = None


def start_server():
    global SERVE_ROOT
    SERVE_ROOT = decrypt_for_serve(ROOT)
    os.chdir(SERVE_ROOT)

    class Reuse(socketserver.TCPServer):
        allow_reuse_address = True

    httpd = Reuse(("127.0.0.1", PORT), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    host, port = httpd.server_address
    global BASE
    BASE = f"http://{host}:{port}"
    print("serving", BASE)
    return httpd


def wait_fonts(page):
    page.wait_for_timeout(200)
    try:
        page.evaluate("() => document.fonts && document.fonts.ready")
        page.wait_for_function("() => !document.fonts || document.fonts.status === 'loaded'", timeout=5000)
    except Exception:
        page.wait_for_timeout(400)


def assert_no_realcomp_visible(page, label: str, root: str = "body") -> None:
    # Scope to the Alina view. Other sample homes (e.g. Belinda) may still
    # carry a listing JPEG elsewhere on the same page.
    text = page.inner_text(root)
    if "Realcomp" in text or "61025956" in text:
        fail(f"{label}: visible text still mentions Realcomp / MLS 61025956")
    srcs = page.evaluate(
        """(sel) => {
          const root = document.querySelector(sel) || document.body;
          return [...root.querySelectorAll('img')].map(img => img.currentSrc || img.src || '');
        }""",
        root,
    )
    for s in srcs:
        if s.startswith("data:image/jpeg"):
            fail(f"{label}: visible <img> still uses a JPEG data-URI ({s[:48]}...)")


def assert_svg_standin(selector: str, page, label: str) -> None:
    info = page.evaluate(
        """(sel) => {
          const el = document.querySelector(sel);
          if (!el) return {ok:false, reason:'missing '+sel};
          const img = el.tagName === 'IMG' ? el : el.querySelector('img');
          if (!img) return {ok:false, reason:'no img in '+sel, html: el.outerHTML.slice(0,240)};
          const src = img.currentSrc || img.src || '';
          const r = img.getBoundingClientRect();
          return {ok:true, src: src.slice(0,80), isSvg: src.startsWith('data:image/svg+xml'), w: Math.round(r.width), h: Math.round(r.height)};
        }""",
        selector,
    )
    print(f"  {label} banner:", info)
    if not info or not info.get("ok"):
        fail(f"{label}: {info}")
        return
    if not info.get("isSvg"):
        fail(f"{label}: expected SVG stand-in, got {info.get('src')!r}")
    if info.get("w", 0) < 40 or info.get("h", 0) < 20:
        fail(f"{label}: stand-in box too small {info.get('w')}x{info.get('h')}")


def main() -> int:
    httpd = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--font-render-hinting=none"])
            ctx = browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=2,
            )
            ctx.add_init_script(INIT)

            # --- /member/?client=1 (Alina). Hero is house-hero.jpg; photo was only in JSON. ---
            page = ctx.new_page()
            page.goto(f"{BASE}/member/?client=1", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector(".house, .hello, h1", timeout=15000)
            wait_fonts(page)
            # Confirm client hydration
            who = page.evaluate(
                """() => ({
                  h1: (document.querySelector('h1')||{}).innerText||'',
                  addr: (document.querySelector('.addr')||{}).innerText||'',
                  jpegInDom: [...document.querySelectorAll('img,[style]')].some(el => ((el.src||'')+(el.getAttribute('style')||'')).includes('data:image/jpeg'))
                })"""
            )
            print("member/?client=1", who)
            if "Alina" not in who.get("h1", "") and "Alina" not in page.inner_text("body"):
                fail("member/?client=1 did not show Alina")
            if "Deerfield" not in who.get("addr", "") and "Deerfield" not in page.inner_text("body"):
                fail("member/?client=1 did not show the Deerfield address")
            if who.get("jpegInDom"):
                fail("member/?client=1 still has a JPEG data-URI in the live DOM")
            assert_no_realcomp_visible(page, "member/?client=1")
            page.screenshot(path=str(OUT / "member-alina-390.png"), full_page=False)
            page.close()

            # --- /tech/?dash=1&day=2027-02-15 : Alina is stop 1; open her stop preview ---
            page = ctx.new_page()
            page.goto(f"{BASE}/tech/?dash=1&day=2027-02-15", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_function(
                """() => !!document.querySelector('#s-app') && !!document.querySelector('[data-stopsheet="s0"]')""",
                timeout=15000,
            )
            # Dash mode already enters the app. stopPreview lives inside an IIFE, so
            # dispatch a click on Alina's stop card (s0) rather than calling it.
            opened = page.evaluate(
                """() => {
                  const el = document.querySelector('[data-stopsheet="s0"]');
                  if (!el) return false;
                  el.click();
                  return true;
                }"""
            )
            print("tech stop click", opened)
            page.wait_for_selector(".hp img, .job .hp, article.job .hp", timeout=10000)
            wait_fonts(page)
            job = page.evaluate(
                """() => {
                  const hp = document.querySelector('.hp');
                  const img = hp && hp.querySelector('img');
                  const wrap = hp && (hp.closest('.job, .sh-b, article, .sheet') || hp.parentElement);
                  return {
                    text: wrap ? (wrap.innerText||'').slice(0,400) : (document.body.innerText||'').slice(0,400),
                    hasHp: !!hp,
                    hasPh: !!(hp && hp.classList.contains('hasph')),
                    src: img ? (img.currentSrc||img.src||'').slice(0,80) : null,
                    isSvg: !!(img && (img.currentSrc||img.src||'').startsWith('data:image/svg+xml')),
                    box: hp ? {w: Math.round(hp.getBoundingClientRect().width), h: Math.round(hp.getBoundingClientRect().height)} : null
                  };
                }"""
            )
            print("tech job", job)
            if "Deerfield" not in (job.get("text") or "") and "Alina" not in (job.get("text") or "") and "Deerfield" not in page.inner_text("body"):
                fail("tech dash did not show Alina / Deerfield")
            if not job.get("isSvg"):
                fail(f"tech job card stand-in is not the SVG tile: {job}")
            assert_no_realcomp_visible(page, "tech/?dash=1&day=2027-02-15")
            page.screenshot(path=str(OUT / "tech-alina-390.png"), full_page=False)
            card = page.locator(".hp, article.job, #job").first
            if card.count():
                try:
                    card.screenshot(path=str(OUT / "tech-alina-jobcard-390.png"))
                except Exception:
                    pass
            page.close()

            # --- /console/ : load test data, open Alina profile drawer ---
            page = ctx.new_page()
            page.goto(f"{BASE}/console/", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector("#testToggle, body", timeout=15000)
            # Load test data via the public loader (async gzip)
            # loadTest lives in an IIFE; the toggle is inside a closed <details>.
            loaded = page.evaluate(
                """() => {
                  const menu = document.getElementById('tmenu');
                  if (menu) menu.open = true;
                  const btn = document.getElementById('testToggle');
                  if (!btn) return 'no-toggle';
                  btn.click();
                  return 'clicked';
                }"""
            )
            print("console load click", loaded)
            page.wait_for_function(
                "() => !!(window.SUEvents && SUEvents.test && SUEvents.test.on && SUEvents.test.on())",
                timeout=15000,
            )
            page.wait_for_timeout(400)
            # Open Alina's member row (may be off-screen in the members table).
            opened = page.evaluate(
                """() => {
                  const row = document.querySelector('[data-tm="T004"]');
                  if (row) { row.scrollIntoView(); row.click(); return 'clicked-row'; }
                  return 'missing-row';
                }"""
            )
            print("console open Alina", opened)
            if opened != "clicked-row":
                fail("console: could not open Alina's member drawer")
            page.wait_for_selector("#drawerIn .hban, #drawer .hban, .hban img", timeout=10000)
            wait_fonts(page)
            assert_svg_standin("#drawerIn .hban, #drawer .hban", page, "console Alina drawer")
            assert_no_realcomp_visible(page, "console Alina drawer", "#drawerIn, #drawer .in, #drawer")
            drawer = page.locator("#drawerIn, #drawer .in, .hban").first
            page.screenshot(path=str(OUT / "console-alina-390.png"), full_page=False)
            if drawer.count():
                try:
                    drawer.screenshot(path=str(OUT / "console-alina-drawer-390.png"))
                except Exception:
                    pass
            page.close()
            browser.close()
    finally:
        httpd.shutdown()
        if SERVE_ROOT and SERVE_ROOT != ROOT:
            shutil.rmtree(SERVE_ROOT, ignore_errors=True)

    print("shots written to", OUT)
    if FAILURES:
        print(f"{len(FAILURES)} failure(s)")
        return 1
    print("PASS: Playwright Alina views show the SVG stand-in and no Realcomp JPEG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
