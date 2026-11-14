#!/usr/bin/env python3
"""Home phone paging E2E + section-fit + sheet lock + shots / frame strip."""
import json, math, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

BASE = "http://127.0.0.1:19760"
OUT = Path("/workspace/contrast-1114/qa/paging-e2e")
FONTS = Path("/workspace/plans-swipe-1113/fonts")
FIT_VIEWS = [(360, 640), (390, 844), (430, 932)]
IDS = ["hs-top", "hs-plans", "hs-alc", "hs-faq"]
INIT = """try{sessionStorage.setItem('mwPagelockOk','1');localStorage.setItem('smartUpkeep.videoDismissed','1');sessionStorage.setItem('smartUpkeep.videoDismissed','1');}catch(e){}"""

def fonts_css():
    out = []
    for fam, w, fn in [
        ("Hind", 400, "Hind-Regular.ttf"), ("Hind", 500, "Hind-Medium.ttf"),
        ("Hind", 600, "Hind-SemiBold.ttf"), ("Hind", 700, "Hind-Bold.ttf"),
        ("Khand", 400, "Khand-Regular.ttf"), ("Khand", 500, "Khand-Medium.ttf"),
        ("Khand", 600, "Khand-SemiBold.ttf"), ("Khand", 700, "Khand-Bold.ttf"),
    ]:
        out.append(
            f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;"
            f"font-display:block;src:url({BASE}/__qa_fonts/{fn}) format('truetype')}}"
        )
    return "\n".join(out)

def route(r):
    u = r.request.url
    if "/__qa_fonts/" in u:
        fn = u.split("/__qa_fonts/", 1)[-1].split("?")[0]
        p = FONTS / fn
        if p.exists():
            return r.fulfill(status=200, content_type="font/ttf", body=p.read_bytes())
    if u.startswith(BASE) or u.startswith("data:") or u.startswith("blob:"):
        return r.continue_()
    if u.startswith("https://fonts.googleapis.com/"):
        return r.fulfill(status=200, content_type="text/css", body=fonts_css())
    r.abort()

def open_home(ctx, w, h, reduced=False, video_dir=None):
    kw = dict(viewport={"width": w, "height": h}, device_scale_factor=2 if w <= 600 else 1,
              has_touch=w <= 600, is_mobile=w <= 600)
    if video_dir:
        kw["record_video_dir"] = str(video_dir)
        kw["record_video_size"] = {"width": w, "height": h}
    if reduced:
        # set via emulate after
        pass
    c = ctx  # unused, we create from browser
    return kw

def new_page(browser, w, h, reduced=False, video_dir=None):
    kw = dict(viewport={"width": w, "height": h}, device_scale_factor=2 if w <= 600 else 1,
              has_touch=True, is_mobile=w <= 600)
    if video_dir:
        kw["record_video_dir"] = str(video_dir)
        kw["record_video_size"] = {"width": w, "height": h}
    ctx = browser.new_context(**kw)
    ctx.route("**/*", route)
    ctx.add_init_script(INIT)
    p = ctx.new_page()
    if reduced:
        p.emulate_media(reduced_motion="reduce")
    p.goto(BASE + "/", wait_until="domcontentloaded")
    p.wait_for_timeout(1100)
    p.evaluate("() => document.fonts && document.fonts.ready")
    p.wait_for_timeout(200)
    return ctx, p

def settle(p, ms=1200):
    try:
        p.wait_for_function("() => !document.documentElement.classList.contains('su-glide')", timeout=ms)
    except Exception:
        pass
    p.wait_for_timeout(220)

def align(p):
    return p.evaluate("""() => {
      const api = window.suHomePage;
      if (!api) return {ok:false, err:'no suHomePage'};
      const ids = ['hs-top','hs-plans','hs-alc','hs-faq'];
      const i = api.index();
      const park = i >= ids.length ? api.footerY() : api.parkY(document.getElementById(ids[Math.min(i, ids.length-1)]));
      const y = window.scrollY || 0;
      const hdr = document.querySelector('.topbar');
      const dock = document.querySelector('.hm-dock');
      const sec = document.getElementById(ids[Math.min(i, ids.length-1)]);
      const topGap = sec && hdr ? +(sec.getBoundingClientRect().top - hdr.getBoundingClientRect().bottom).toFixed(2) : null;
      return {
        ok: true, i, y, park, off: Math.abs(y - park),
        mode: api.mode(), cls: document.documentElement.classList.contains('su-home-page'),
        topGap, footer: i >= ids.length,
        hdrH: hdr ? +hdr.getBoundingClientRect().height.toFixed(2) : 0,
        dockTop: dock ? +dock.getBoundingClientRect().top.toFixed(2) : 0
      };
    }""")

def fit_measure(p):
    return p.evaluate("""() => {
      const hdr = document.querySelector('.topbar');
      const dock = document.querySelector('.hm-dock');
      const top = hdr ? hdr.getBoundingClientRect().bottom : 0;
      const bot = dock ? dock.getBoundingClientRect().top : innerHeight;
      const space = +(bot - top).toFixed(2);
      return ['hs-top','hs-plans','hs-alc','hs-faq'].map(id => {
        const el = document.getElementById(id);
        if (!el) return {id, missing:true};
        const r = el.getBoundingClientRect();
        const h = +el.getBoundingClientRect().height.toFixed(2);
        const content = +el.scrollHeight.toFixed(2);
        return {
          id, height: h, content, space,
          overflow: +(h - space).toFixed(2),
          contentOverflow: +(content - space).toFixed(2),
          topGap: +(r.top - top).toFixed(2)
        };
      });
    }""")

def swipe(page, x, y0, y1, steps=10, step_ms=20):
    cdp = page.context.new_cdp_session(page)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y0, "id": 1}]})
    for i in range(1, steps + 1):
        y = y0 + (y1 - y0) * i / steps
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y, "id": 1}]})
        page.wait_for_timeout(step_ms)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})

def wheel_burst(page, dy=80, n=18):
    page.mouse.move(page.viewport_size["width"] / 2, 180)
    for _ in range(n):
        page.mouse.wheel(0, dy)

def trackpad_inertia(page):
    """A burst plus decaying trailing deltas, like a trackpad flick."""
    page.mouse.move(page.viewport_size["width"] / 2, 180)
    for d in [90, 80, 70, 60, 50, 40, 30, 22, 16, 12, 8, 6, 4, 3, 2, 1, 1, 0.5]:
        page.mouse.wheel(0, d)
        page.wait_for_timeout(16)

def go_tab(p, tab):
    p.locator(f'[data-hm-tab="{tab}"]').click()
    settle(p)

def go_arrow(p, sec_id):
    p.evaluate("id => { const b=document.querySelector('[data-hs-go=\"'+id+'\"]'); b && b.click(); }", sec_id)
    settle(p)

def check(report, name, ok, info=""):
    rec = {"name": name, "ok": bool(ok), "info": info}
    report["checks"].append(rec)
    print(("PASS " if ok else "FAIL ") + name, info, flush=True)
    if not ok:
        report["fails"].append(f"{name}: {info}")

def must_align(report, name, a, tol=1.5):
    ok = a.get("ok") and a.get("off", 99) <= tol
    check(report, name, ok, json.dumps({k: a.get(k) for k in ("i", "y", "park", "off", "footer", "topGap")}))
    return ok

def section_shot(p, name):
    p.screenshot(path=str(OUT / f"{name}.png"))

def compose_strip(frames, dest):
    if not frames:
        return
    imgs = [Image.open(f).convert("RGB") for f in frames]
    # scale to a common height
    h = 320
    scaled = []
    for im in imgs:
        w = max(1, int(im.width * h / im.height))
        scaled.append(im.resize((w, h), Image.Resampling.LANCZOS))
    gap = 4
    W = sum(im.width for im in scaled) + gap * (len(scaled) - 1)
    strip = Image.new("RGB", (W, h + 28), (26, 26, 26))
    draw = ImageDraw.Draw(strip)
    x = 0
    for i, im in enumerate(scaled):
        strip.paste(im, (x, 0))
        draw.text((x + 6, h + 6), f"{i}", fill=(255, 255, 255))
        x += im.width + gap
    strip.save(dest)
    for im in imgs:
        im.close()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "frames").mkdir(exist_ok=True)
    report = {"checks": [], "fails": [], "fit": {}, "notes": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")

        # ---- Section fit at the three required sizes ----
        for w, h in FIT_VIEWS:
            key = f"{w}x{h}"
            ctx, p = new_page(browser, w, h)
            # land on each section and measure both parked alignment and height vs space
            rows = []
            for i, tab in enumerate(["home", "plans", "alacarte", "faq"]):
                go_tab(p, tab)
                a = align(p)
                meas = fit_measure(p)
                row = meas[i] if i < len(meas) else {"id": IDS[i]}
                row["alignOff"] = a.get("off")
                row["topGap"] = a.get("topGap")
                rows.append(row)
                section_shot(p, f"fit-{key}-{IDS[i]}")
                must_align(report, f"fit-align {key} {IDS[i]}", a)
                tall = row.get("overflow", 0) > 1.5
                if tall:
                    report["notes"].append(f"{key} {IDS[i]} is taller than the header-to-bar space by {row['overflow']}px (height {row['height']} vs space {row['space']}). Parked at the section top; no half-stop.")
                check(report, f"fit-not-clipped-report {key} {IDS[i]}", True,
                      f"h={row.get('height')} space={row.get('space')} overflow={row.get('overflow')}")
            report["fit"][key] = rows
            # paging class on
            on = p.evaluate("() => document.documentElement.classList.contains('su-home-page') && window.suHomePage.mode()")
            check(report, f"page-mode on {key}", on, str(on))
            ctx.close()

        # ---- Main paging matrix at 390x844 ----
        ctx, p = new_page(browser, 390, 844)
        mid_x, y0, y1_short, y1_long = 195, 420, 420 - 56, 420 - 260

        # start at home
        go_tab(p, "home")
        must_align(report, "start home", align(p))
        section_shot(p, "390-home")

        # short flick down (finger up) -> plans
        swipe(p, mid_x, y0, y1_short, steps=5, step_ms=16)
        settle(p)
        a = align(p)
        check(report, "short flick lands plans", a.get("i") == 1, json.dumps(a))
        must_align(report, "short flick align", a)
        section_shot(p, "390-after-short-flick")

        # long flick -> tailor
        swipe(p, mid_x, 480, 480 - 280, steps=14, step_ms=22)
        settle(p)
        a = align(p)
        check(report, "long flick lands tailor", a.get("i") == 2, json.dumps(a))
        must_align(report, "long flick align", a)
        section_shot(p, "390-after-long-flick")

        # wheel burst must be one section only (faq)
        i_before = a.get("i")
        wheel_burst(p, dy=80, n=20)
        settle(p)
        a = align(p)
        check(report, "wheel burst is one section", a.get("i") == i_before + 1, f"before={i_before} after={a.get('i')}")
        must_align(report, "wheel burst align", a)
        section_shot(p, "390-after-wheel-burst")

        # from faq, trackpad inertia should go to footer only (one stop), or stay? down from faq is footer
        trackpad_inertia(p)
        settle(p)
        a = align(p)
        check(report, "trackpad inertia one stop (footer)", a.get("i") == 4 and a.get("footer"), json.dumps(a))
        must_align(report, "trackpad inertia align", a)
        section_shot(p, "390-footer-reveal")
        shown = p.evaluate("""() => {
          const ft = document.querySelector('footer.foot, footer.ft');
          if (!ft) return {ok:false};
          const tr = getComputedStyle(ft).transform;
          return {transform: tr, y: window.scrollY, footerY: window.suHomePage.footerY()};
        }""")
        check(report, "footer transforms after pull", shown.get("transform") not in ("none", "", None), json.dumps(shown))

        # up from footer -> faq
        swipe(p, mid_x, 200, 200 + 80, steps=6, step_ms=16)
        settle(p)
        a = align(p)
        check(report, "swipe up from footer lands faq", a.get("i") == 3 and not a.get("footer"), json.dumps(a))
        must_align(report, "swipe up from footer align", a)

        # button / bar taps
        go_tab(p, "home")
        must_align(report, "bar tap home", align(p))
        go_tab(p, "plans")
        must_align(report, "bar tap plans", align(p))
        go_arrow(p, "hs-alc")
        a = align(p)
        check(report, "arrow to tailor", a.get("i") == 2, json.dumps(a))
        must_align(report, "arrow align", a)
        go_tab(p, "faq")
        must_align(report, "bar tap faq", align(p))
        section_shot(p, "390-bar-faq")

        # keyboard
        go_tab(p, "home")
        p.keyboard.press("ArrowDown")
        settle(p)
        a = align(p)
        check(report, "ArrowDown to plans", a.get("i") == 1, json.dumps(a))
        must_align(report, "ArrowDown align", a)
        p.keyboard.press("PageDown")
        settle(p)
        a = align(p)
        check(report, "PageDown to tailor", a.get("i") == 2, json.dumps(a))
        must_align(report, "PageDown align", a)
        p.keyboard.press("ArrowUp")
        settle(p)
        a = align(p)
        check(report, "ArrowUp back to plans", a.get("i") == 1, json.dumps(a))
        must_align(report, "ArrowUp align", a)
        p.evaluate("() => { location.hash = 'hs-faq'; }")
        p.wait_for_timeout(200)
        settle(p)
        a = align(p)
        check(report, "hash #hs-faq lands faq", a.get("i") == 3, json.dumps(a))
        must_align(report, "hash align", a)

        # horizontal carousel must not page
        go_tab(p, "plans")
        i0 = align(p).get("i")
        # swipe sideways on the plans row
        box = p.evaluate("""() => {
          const sc = document.querySelector('#row-plans .hm-scroll');
          const r = sc.getBoundingClientRect();
          return {x: r.left + r.width*0.7, y: r.top + r.height/2, left: sc.scrollLeft};
        }""")
        cdp = p.context.new_cdp_session(p)
        x0, y, x1 = box["x"], box["y"], box["x"] - 180  # r2: 160px is short of the center-to-center midpoint; 180px is a realistic flick
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y, "id": 1}]})
        for i in range(1, 12):
            x = x0 + (x1 - x0) * i / 12
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y, "id": 1}]})
            p.wait_for_timeout(16)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        settle(p)
        a = align(p)
        left1 = p.evaluate("() => document.querySelector('#row-plans .hm-scroll').scrollLeft")
        check(report, "horizontal plans swipe does not page", a.get("i") == i0, json.dumps(a))
        must_align(report, "after horizontal swipe still aligned", a)
        check(report, "horizontal plans swipe moved the row", left1 > 8, f"scrollLeft {left1}")

        # resize must not leave mid-section
        go_tab(p, "plans")
        p.set_viewport_size({"width": 430, "height": 932})
        p.wait_for_timeout(400)
        a = align(p)
        check(report, "resize 430x932 stays on a section", a.get("i") in (0, 1, 2, 3, 4), json.dumps(a))
        must_align(report, "resize align", a)
        p.set_viewport_size({"width": 390, "height": 844})
        p.wait_for_timeout(400)
        must_align(report, "resize back 390 align", align(p))

        # ---- Sheet lock (#126) ----
        go_tab(p, "faq")
        y_faq = p.evaluate("() => window.scrollY")
        opened = p.evaluate("""() => {
          const q = document.querySelector('#hs-faq .faq-item-q');
          if (q) q.click();
          return true;
        }""")
        p.wait_for_timeout(350)
        open_ok = p.evaluate("() => !!(document.documentElement.classList.contains('faq-sheet-open') && document.querySelector('.faq-sheet-wrap') && !document.querySelector('.faq-sheet-wrap').hidden)")
        check(report, "faq sheet opens", open_ok, "")
        y_open = p.evaluate("() => window.scrollY")
        check(report, "sheet open keeps scrollY", abs(y_open - y_faq) <= 1, f"{y_faq} -> {y_open}")
        # wheel on scrim
        p.mouse.move(40, 80)
        p.mouse.wheel(0, 400)
        p.wait_for_timeout(250)
        y_wheel = p.evaluate("() => window.scrollY")
        check(report, "sheet lock holds against wheel", abs(y_wheel - y_open) <= 1, f"{y_open} -> {y_wheel}")
        # touch on scrim
        p.evaluate("""() => {
          const bg = document.querySelector('.faq-sheet-bg');
          if (!bg) return;
          const r = bg.getBoundingClientRect();
          const x = r.left + 40, y0 = r.top + 80, y1 = y0 + 180;
          const mk = yy => { try { return new Touch({identifier:1, target:bg, clientX:x, clientY:yy, pageX:x, pageY:yy, screenX:x, screenY:yy, radiusX:2, radiusY:2, rotationAngle:0, force:1}); } catch(e){ return null; } };
          const ev = (type, touch) => {
            let e;
            try { e = new TouchEvent(type, {bubbles:true, cancelable:true, composed:true, touches:touch?[touch]:[], changedTouches:touch?[touch]:[], targetTouches:touch?[touch]:[]}); }
            catch (err) { e = new Event(type, {bubbles:true, cancelable:true}); }
            bg.dispatchEvent(e);
          };
          ev('touchstart', mk(y0)); ev('touchmove', mk(y1)); ev('touchend', null);
        }""")
        p.wait_for_timeout(250)
        y_touch = p.evaluate("() => window.scrollY")
        check(report, "sheet lock holds against touch", abs(y_touch - y_open) <= 1, f"{y_open} -> {y_touch}")
        # sheet body still scrolls
        body_scroll = p.evaluate("""() => {
          const b = document.querySelector('.faq-sheet-body');
          if (!b) return {ok:false};
          const before = b.scrollTop;
          b.scrollTop = Math.min(b.scrollHeight, before + 80);
          return {ok:true, before, after:b.scrollTop, can:b.scrollHeight > b.clientHeight + 1};
        }""")
        check(report, "sheet body can scroll itself", body_scroll.get("ok") and (not body_scroll.get("can") or body_scroll.get("after") > body_scroll.get("before")), json.dumps(body_scroll))
        # close restores scrollY
        p.keyboard.press("Escape")
        p.wait_for_timeout(300)
        y_close = p.evaluate("() => window.scrollY")
        closed = p.evaluate("() => !document.documentElement.classList.contains('faq-sheet-open')")
        check(report, "sheet close restores scrollY", closed and abs(y_close - y_faq) <= 1, f"closed={closed} {y_faq} -> {y_close}")
        must_align(report, "after sheet close still on faq", align(p))
        section_shot(p, "390-sheet-lock")

        # ---- F1: a long swipe must move exactly one section (no free-scroll) ----
        p.evaluate("() => window.suHomePage.to(1, true)")
        settle(p)
        cdp = p.context.new_cdp_session(p)
        # nearly full-screen flick from Plans; must land on Add-Ons, not mid/next
        swipe(p, 195, 844 * 0.9, 844 * 0.1, steps=6, step_ms=8)
        settle(p, 4000)
        a = align(p)
        check(report, "F1 long flick from plans lands tailor only", a.get("i") == 2 and a.get("off", 99) <= 1.5, json.dumps(a))
        must_align(report, "F1 long flick align", a)
        # swipe up (finger up) at the Built by Machan stop must stay there
        p.evaluate("() => window.suHomePage.to(4, true)")
        settle(p)
        y_foot = p.evaluate("() => window.scrollY")
        swipe(p, 195, 844 * 0.7, 844 * 0.2, steps=10, step_ms=12)
        settle(p, 4000)
        a = align(p)
        y_after = p.evaluate("() => window.scrollY")
        check(report, "F1 swipe at footer does not free-scroll", a.get("i") == 4 and a.get("footer") and abs(y_after - y_foot) <= 2,
              f"y {y_foot} -> {y_after} {json.dumps(a)}")
        # three full-screen swipes from the top each land on exactly Plans
        lands = []
        for k in range(3):
            p.evaluate("() => window.suHomePage.to(0, true)")
            settle(p)
            swipe(p, 195, 844 * 0.95, 844 * 0.05, steps=16, step_ms=10)
            settle(p, 4000)
            a = align(p)
            lands.append({"k": k, "i": a.get("i"), "y": a.get("y"), "off": a.get("off")})
        check(report, "F1 three fullscreen swipes each land plans",
              all(x["i"] == 1 and x["off"] <= 1.5 for x in lands), json.dumps(lands))

        # ---- F3: Tab into Add-Ons parks the section top under the header ----
        p.evaluate("() => window.suHomePage.to(1, true)")
        settle(p)
        p.evaluate("""() => {
          const f = [...document.querySelectorAll('#hs-plans a[href],#hs-plans button,#hs-plans summary')]
            .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
          f[f.length - 1].focus({preventScroll: true});
        }""")
        p.keyboard.press("Tab")
        p.wait_for_timeout(200)
        settle(p, 2000)
        a = align(p)
        gap = a.get("topGap")
        top_ok = a.get("i") == 2 and gap is not None and abs(gap) <= 1.5
        check(report, "F3 tab into Add-Ons parks under header", top_ok, json.dumps(a))
        must_align(report, "F3 tab align", a)

        # ---- F4: with the header menu open, wheel or swipe must not move Home ----
        p.evaluate("() => window.suHomePage.to(1, true)")
        settle(p)
        y_menu0 = p.evaluate("() => window.scrollY")
        p.click("#hdrMenuBtn")
        p.wait_for_timeout(250)
        menu_open = p.evaluate("() => { const m = document.getElementById('hdrMenu'); return !!(m && !m.hidden); }")
        check(report, "F4 header menu opens", menu_open, "")
        mb = p.evaluate("() => { const r = document.getElementById('hdrMenu').getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + 30}; }")
        p.mouse.move(mb["x"], mb["y"])
        p.mouse.wheel(0, 120)
        settle(p)
        y_menu1 = p.evaluate("() => window.scrollY")
        a = align(p)
        check(report, "F4 wheel over open menu does not page", a.get("i") == 1 and abs(y_menu1 - y_menu0) <= 1,
              f"y {y_menu0} -> {y_menu1} {json.dumps(a)}")
        swipe(p, 195, 600, 300, steps=8, step_ms=16)
        settle(p)
        y_menu2 = p.evaluate("() => window.scrollY")
        a = align(p)
        check(report, "F4 swipe with menu open does not page", a.get("i") == 1 and abs(y_menu2 - y_menu0) <= 1,
              f"y {y_menu0} -> {y_menu2} {json.dumps(a)}")
        p.click("#hdrMenuBtn")
        p.wait_for_timeout(250)
        menu_closed = p.evaluate("() => { const m = document.getElementById('hdrMenu'); return !m || !!m.hidden; }")
        check(report, "F4 header menu closes", menu_closed, "")
        p.mouse.move(195, 400)
        p.mouse.wheel(0, 120)
        settle(p)
        a = align(p)
        check(report, "F4 wheel after menu close pages to Add-Ons", a.get("i") == 2, json.dumps(a))
        must_align(report, "F4 after close align", a)
        ctx.close()

        # ---- Reduced motion + F2: instant jump, then paging again within ~0.5s ----
        ctx, p = new_page(browser, 390, 844, reduced=True)
        go_tab(p, "home")
        t0 = time.time()
        p.keyboard.press("ArrowDown")
        # should be instant; wait a short beat only
        p.wait_for_timeout(80)
        dt = (time.time() - t0) * 1000
        a = align(p)
        check(report, "reduced motion lands plans quickly", a.get("i") == 1 and dt < 400, f"ms={dt:.0f} {json.dumps(a)}")
        must_align(report, "reduced motion align", a)
        section_shot(p, "390-reduced-plans")
        # F2: after the instant jump, the next move must work within ~0.5s (not the 20s lock)
        p.wait_for_timeout(500)
        t1 = time.time()
        p.keyboard.press("ArrowDown")
        p.wait_for_timeout(80)
        dt2 = (time.time() - t1) * 1000
        a = align(p)
        check(report, "F2 reduced motion pages again within 0.5s", a.get("i") == 2 and dt2 < 600,
              f"ms={dt2:.0f} {json.dumps(a)}")
        must_align(report, "F2 second jump align", a)
        # Reset to home, then Swatch's sequence with 1.2s gaps: [1,2,3,2,3]
        p.evaluate("() => window.suHomePage.to(0, true)")
        p.wait_for_timeout(500)
        seq = []
        p.mouse.move(195, 400)
        for _ in range(3):
            p.mouse.wheel(0, 100)
            p.wait_for_timeout(1200)
            seq.append(align(p).get("i"))
        p.keyboard.press("ArrowUp")
        p.wait_for_timeout(600)
        seq.append(align(p).get("i"))
        swipe(p, 195, 600, 300, steps=8, step_ms=16)
        p.wait_for_timeout(800)
        seq.append(align(p).get("i"))
        check(report, "F2 reduced sequence wheel/wheel/wheel/up/swipe", seq == [1, 2, 3, 2, 3], json.dumps(seq))
        ctx.close()

        # ---- Desktop keeps free scroll, no page class ----
        ctx = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1, has_touch=False, is_mobile=False)
        ctx.route("**/*", route)
        ctx.add_init_script(INIT)
        p = ctx.new_page()
        p.goto(BASE + "/", wait_until="domcontentloaded")
        p.wait_for_timeout(1100)
        mode = p.evaluate("() => ({mode: !!(window.suHomePage && window.suHomePage.mode()), cls: document.documentElement.classList.contains('su-home-page')})")
        check(report, "desktop is not in page mode", not mode["mode"] and not mode["cls"], json.dumps(mode))
        y0 = p.evaluate("() => window.scrollY")
        p.mouse.move(640, 400)
        for _ in range(8):
            p.mouse.wheel(0, 400)
            p.wait_for_timeout(40)
        p.wait_for_timeout(200)
        y1 = p.evaluate("() => window.scrollY")
        check(report, "desktop wheel free-scrolls", y1 > y0 + 40, f"{y0} -> {y1}")
        ctx.close()

        # ---- Frame strip + short video: four-section page-through ----
        vdir = OUT / "video"
        vdir.mkdir(exist_ok=True)
        ctx, p = new_page(browser, 390, 844, video_dir=vdir)
        go_tab(p, "home")
        frames = []
        def grab(tag):
            fp = OUT / "frames" / f"{tag}.png"
            p.screenshot(path=str(fp))
            frames.append(fp)
        grab("00-home")
        for n, label in enumerate(["plans", "tailor", "faq"], start=1):
            swipe(p, 195, 480, 200, steps=8, step_ms=16)
            # sample during the 740ms glide
            for s in range(8):
                p.wait_for_timeout(90)
                grab(f"{n}{s}-{label}")
            settle(p)
            grab(f"{n}f-{label}-land")
            must_align(report, f"strip land {label}", align(p))
        compose_strip(frames, OUT / "frame-strip.png")
        section_shot(p, "390-end-faq")
        # close to flush video
        video_path = p.video.path() if p.video else None
        ctx.close()
        if video_path:
            dest = OUT / "paging-390x844.webm"
            try:
                Path(video_path).replace(dest)
                report["video"] = str(dest)
            except Exception as e:
                report["video"] = f"{video_path} ({e})"
        browser.close()

    report["pass"] = len(report["fails"]) == 0
    report["n_pass"] = sum(1 for c in report["checks"] if c["ok"])
    report["n_fail"] = sum(1 for c in report["checks"] if not c["ok"])
    (OUT / "page_e2e.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({"pass": report["pass"], "n_pass": report["n_pass"], "n_fail": report["n_fail"], "fails": report["fails"], "notes": report["notes"]}, indent=2), flush=True)
    return 0 if report["pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
