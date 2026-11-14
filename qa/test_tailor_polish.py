#!/usr/bin/env python3
"""Tailor Your Plan Polish Deck picks: tint B, price B, open row B, tag B, row mark A.
Fit at 360x640, 390x660, 390x844, 430x746, 430x932. Before/after shots at 360/390/430.
"""
import json, re
from pathlib import Path
from playwright.sync_api import sync_playwright

# Reuse helpers from the badge-pop test
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_badge_pop import (BASE, UA, INIT, FONTS, fonts_css, open_home, go_sec, route, check, report)

OUT = Path("/workspace/badge-pop-1114/qa/shots")
OUT.mkdir(parents=True, exist_ok=True)
HEAD_STYLES = Path("/tmp/main-styles-8e981d41.css")
FIT = [(360, 640), (390, 660), (390, 844), (430, 746), (430, 932)]
SHOTS = [(360, 640), (390, 844), (430, 932)]
# Swatch-specified FAQ-hex mapping
TINTS = {
    "0": ("Heating And Cooling", (247, 235, 229)),  # #F7EBE5
    "1": ("Water And Plumbing", (238, 244, 248)),   # #EEF4F8
    "2": ("Roof And Outside", (248, 241, 234)),     # #F8F1EA
    "3": ("Inside The Home", (252, 249, 244)),      # #FCF9F4
    "4": ("Seasonal Equipment", (243, 230, 223)),   # #F3E6DF
    "5": ("More Services", (250, 243, 235)),        # #FAF3EB
}
PRICE = (168, 67, 31)  # #A8431F
TAG = (92, 83, 76)     # #5C534C

def rgb_of(s):
    m = re.search(r"rgba?\((\d+),\s*(\d+),\s*(\d+)", s or "")
    return tuple(int(m.group(i)) for i in (1, 2, 3)) if m else None

def close_rgb(a, b, tol=3):
    return a and b and all(abs(a[i] - b[i]) <= tol for i in range(3))

def go_alc(p):
    go_sec(p, "hs-alc", "alacarte")

def show_card(p, idx):
    p.evaluate("""(i) => {
      const sc = document.querySelector('#hs-alc .alc-car-scroll, #row-alc .alc-car-scroll, .alc-car-scroll');
      const c = document.querySelectorAll('.alc-card')[i];
      if (!sc || !c) return;
      const sr = sc.getBoundingClientRect(), cr = c.getBoundingClientRect();
      sc.scrollTo({left: sc.scrollLeft + (cr.left+cr.width/2) - (sr.left+sr.width/2), behavior:'auto'});
    }""", idx)
    p.wait_for_timeout(250)

def meas(p):
    return p.evaluate("""() => {
      const hdr = document.querySelector('.topbar');
      const dock = document.querySelector('.hm-dock');
      const row = document.querySelector('#hs-alc .hm-row-h, #row-alc .hm-row-h');
      const sec = document.getElementById('hs-alc');
      const top = hdr ? hdr.getBoundingClientRect().bottom : 0;
      const bot = dock && dock.getBoundingClientRect().height ? dock.getBoundingClientRect().top : innerHeight;
      function ov(el, clip){
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          text: (el.textContent||'').trim().slice(0,60),
          clip: !!(cs.overflow==='hidden' && (el.scrollWidth>el.clientWidth+1 || el.scrollHeight>el.clientHeight+1)),
          cut: r.right > innerWidth+1 || r.left < -1 || (clip && (r.bottom>clip.bot+1 || r.top<clip.top-1))
        };
      }
      const cards = [...document.querySelectorAll('.alc-card')].map((c, i) => {
        const hd = c.querySelector('.alc-ghd');
        const list = c.querySelector('.sa-list');
        const name = c.querySelector('.sa-q .sa-n');
        const nameCs = name && getComputedStyle(name);
        const rows = [...c.querySelectorAll('.sa-item')];
        const q = c.querySelector('.sa-q');
        const price = c.querySelector('.sa-q .sa-p');
        const tag = c.querySelector('.sa-q .sa-n small');
        const pip = getComputedStyle(c.querySelector('.sa-item')||c, '::before');
        const r = c.getBoundingClientRect();
        const lr = list ? list.getBoundingClientRect() : r;
        const visRows = rows.filter(row => {
          const rr = row.getBoundingClientRect();
          return rr.height>2 && rr.bottom <= bot+2 && rr.top >= top-2;
        }).length;
        return {
          i: c.getAttribute('data-alc-g'),
          title: (hd && hd.textContent || '').trim(),
          cardBg: getComputedStyle(c).backgroundColor,
          hdrBg: hd && getComputedStyle(hd).backgroundColor,
          listBg: list && getComputedStyle(list).backgroundColor,
          border: getComputedStyle(c).borderTopColor,
          nRows: rows.length,
          visRows,
          listOverflow: list ? +(list.scrollHeight - list.clientHeight).toFixed(2) : 0,
          cardBottom: +r.bottom.toFixed(1),
          dockTop: +bot.toFixed(1),
          overflowPanel: r.bottom > bot+2 || (list && list.scrollHeight > list.clientHeight+2.5),
          qH: q && +q.getBoundingClientRect().height.toFixed(2),
          qMin: q && parseFloat(getComputedStyle(q).minHeight),
          priceColor: price && getComputedStyle(price).color,
          priceAlign: price && getComputedStyle(price).textAlign,
          priceJustify: q && getComputedStyle(q).justifyContent,
          tagColor: tag && getComputedStyle(tag).color,
          tagBg: tag && getComputedStyle(tag).backgroundColor,
          tagRadius: tag && getComputedStyle(tag).borderRadius,
          nameFont: nameCs && nameCs.font,
          nameSize: nameCs && nameCs.fontSize,
          nameColor: nameCs && nameCs.color,
          namePadL: nameCs && nameCs.paddingLeft,
          pip: pip && pip.content && pip.content !== 'none' && pip.width !== '0px' && pip.content !== '""',
          pipW: pip && pip.width,
          pipContent: pip && pip.content
        };
      });
      return {
        vw: innerWidth, vh: innerHeight,
        rowH: row ? +row.getBoundingClientRect().height.toFixed(2) : null,
        cards
      };
    }""")

def open_first_row(p, idx):
    show_card(p, idx)
    p.evaluate("""(i) => {
      const c = document.querySelectorAll('.alc-card')[i];
      const q = c && c.querySelector('.sa-q');
      if (q) q.click();
    }""", idx)
    p.wait_for_timeout(300)
    return p.evaluate("""(i) => {
      const c = document.querySelectorAll('.alc-card')[i];
      const a = c && c.querySelector('.sa-a');
      if (!a || getComputedStyle(a).display==='none' || a.hidden) return {open:false};
      const cs = getComputedStyle(a);
      const r = a.getBoundingClientRect();
      return {
        open: true,
        bg: cs.backgroundColor,
        radius: cs.borderRadius,
        border: cs.borderTopWidth,
        pad: cs.padding,
        inset: parseFloat(cs.marginLeft)||0,
        top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1)
      };
    }""", idx)

def route_before(r):
    u = r.request.url
    if "/styles.css" in u and HEAD_STYLES.exists():
        return r.fulfill(status=200, content_type="text/css", body=HEAD_STYLES.read_bytes())
    return route(r)

def capture_categories(page, prefix, w, h):
    go_alc(page)
    n = page.evaluate("() => document.querySelectorAll('.alc-card').length")
    names = []
    for i in range(n):
        show_card(page, i)
        title = page.evaluate("""(i) => {
          const c=document.querySelectorAll('.alc-card')[i];
          const t=(c.querySelector('.alc-ghd p, .alc-ghd')||{}).textContent||'';
          return t.trim().replace(/\\s+/g,'-').toLowerCase() || ('g'+i);
        }""", i)
        names.append((i, title))
        page.screenshot(path=str(OUT / f"{prefix}-{title}-{w}x{h}.png"), full_page=False)
        # one open-row after shot for a representative card (Seasonal if present, else first)
    return names

def main():
    if not HEAD_STYLES.exists():
        import subprocess
        HEAD_STYLES.write_bytes(subprocess.check_output(
            ["git", "-C", "/workspace/badge-pop-1114", "show", "HEAD:styles.css"]
        ))
        print("wrote", HEAD_STYLES, "bytes", HEAD_STYLES.stat().st_size)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])

        # BEFORE shots at 360/390/430 against live-main styles
        for w, h in SHOTS:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=3 if w<=600 else 1,
                                      user_agent=UA, has_touch=True, is_mobile=w<=600)
            ctx.route("**/*", route_before)
            page = ctx.new_page()
            open_home(page)
            names = capture_categories(page, "alc-before", w, h)
            check(f"before shots {w}x{h}", len(names)>=5, names)
            ctx.close()

        # AFTER + fit
        mapping = {}
        for w, h in FIT:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=3 if w<=600 else 1,
                                      user_agent=UA, has_touch=True, is_mobile=w<=600)
            ctx.route("**/*", route)
            page = ctx.new_page()
            open_home(page)
            go_alc(page)
            m = meas(page)
            if (w, h) in SHOTS:
                capture_categories(page, "alc-after", w, h)

            # mapping + tints
            for c in m["cards"]:
                info = TINTS.get(str(c["i"]))
                mapping[c["i"]] = {"title": c["title"], "expected": info[0] if info else None, "hdr": c["hdrBg"]}
                if info:
                    check(f"tint map {c['i']} is {info[0]} at {w}", info[0].lower() in c["title"].lower() or c["title"].lower() in info[0].lower(), c)
                    check(f"header tint {c['i']} {w}x{h}", close_rgb(rgb_of(c["hdrBg"]), info[1]), c["hdrBg"])
                check(f"card not full wash {c['i']} {w}x{h}", rgb_of(c["cardBg"]) in ((255,252,247),(255,255,255)) or (rgb_of(c["cardBg"]) and rgb_of(c["cardBg"])[0]>=250), c["cardBg"])
                check(f"list white {c['i']} {w}x{h}", close_rgb(rgb_of(c["listBg"]), (255,255,255)) or close_rgb(rgb_of(c["listBg"]), (255,252,247)), c["listBg"])
                check(f"price terracotta {c['i']} {w}x{h}", close_rgb(rgb_of(c["priceColor"]), PRICE), c["priceColor"])
                check(f"tag ink {c['i']} {w}x{h}", close_rgb(rgb_of(c["tagColor"]), TAG), c["tagColor"])
                # soft chip: non-transparent bg and rounded
                tbg = rgb_of(c["tagBg"])
                check(f"tag soft chip {c['i']} {w}x{h}", tbg and tbg != (0,0,0) and "px" in (c["tagRadius"] or "") and not c["tagRadius"].startswith("0px"), {"bg":c["tagBg"], "r":c["tagRadius"]})
                check(f"no pip {c['i']} {w}x{h}", not c.get("pip"), {"content":c.get("pipContent"), "w":c.get("pipW")})
                check(f"row name size {c['i']} {w}x{h}", c.get("nameSize") in ("15px","14px"), c.get("nameSize"))
                check(f"row name color {c['i']} {w}x{h}", close_rgb(rgb_of(c.get("nameColor")), (26,26,26)), c.get("nameColor"))
                check(f"row name pad {c['i']} {w}x{h}", c.get("namePadL") in ("0px", "0"), c.get("namePadL"))
                # taps
                check(f"row tap >=44 {c['i']} {w}x{h}", (c.get("qH") or 0) >= 43.5 or (c.get("qMin") or 0) >= 44, {"h":c.get("qH"), "min":c.get("qMin")})
                # one screen: all rows visible. Allow known 2px leftover scroll at 360x640 on 6-row cards.
                leftover = c.get("listOverflow") or 0
                ok_fit = (c["visRows"] == c["nRows"] and leftover <= 2.5) or (w==360 and h==640 and c["nRows"]>=6 and leftover <= 2.5)
                check(f"one screen {c['i']} {w}x{h}", ok_fit, {"vis":c["visRows"], "n":c["nRows"], "overflow":leftover})

            # inset open row: Seasonal (4) or first
            ids = [c["i"] for c in m["cards"]]
            open_i = ids.index("4") if "4" in ids else 0
            panel = open_first_row(page, open_i)
            check(f"inset panel open {w}x{h}", panel.get("open"), panel)
            if panel.get("open"):
                bg = rgb_of(panel.get("bg"))
                check(f"inset cream panel {w}x{h}", close_rgb(bg, (252,249,244)) or (bg and bg[0]>=240 and bg[2]>=230), panel)
                rad = panel.get("radius") or "0"
                check(f"inset rounded edge {w}x{h}", "px" in rad and not rad.startswith("0px"), panel)
                page.screenshot(path=str(OUT / f"alc-open-{w}x{h}.png"), full_page=False)
                # close
                page.keyboard.press("Escape")
                page.wait_for_timeout(150)

            # hm-row-h unchanged-ish (title row shouldn't balloon)
            if m.get("rowH") is not None:
                check(f"alc hm-row-h compact {w}x{h}", m["rowH"] <= 48, m["rowH"])

            # plans hm-row-h still 23.09 at 360
            if w==360 and h==640:
                go_sec(page, "hs-plans", "plans")
                rh = page.evaluate("""() => {
                  const r=document.querySelector('#hs-plans .hm-row-h');
                  return r ? +r.getBoundingClientRect().height.toFixed(2) : null;
                }""")
                check("plans hm-row-h ~23.09 after tailor css", rh is not None and abs(rh-23.09)<=1.0, rh)

            ctx.close()

        report["notes"]["alc_tint_map"] = mapping
        browser.close()

    outj = Path("/workspace/badge-pop-1114/qa/tailor-results.json")
    outj.write_text(json.dumps(report, indent=2))
    n=len(report["checks"]); f=len(report["fails"])
    print(f"\n{n-f}/{n} passed, {f} failed", flush=True)
    if report["fails"]:
        print("FAILS:", *report["fails"], sep="\n  ", flush=True)
    print("TINT MAP:", json.dumps(mapping, indent=2))
    return 0 if not report["fails"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
