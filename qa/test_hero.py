#!/usr/bin/env python3
"""Official hero (86) checks, updated for Home hero autoplay on load."""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:19760"
OUT = Path("/workspace/contrast-1114/qa/shots/hero-official")
OUT.mkdir(parents=True, exist_ok=True)
RES = Path("/workspace/contrast-1114/qa/hero-results.json")

PHONE = "teaser-v10.1-phone-5svc-even-3x4.mp4"
WIDE = "teaser-v10-5svc-even-16x9.mp4"
PHONE_POSTER = "teaser-v10-phone-5svc-even-3x4-poster.jpg"
WIDE_POSTER = "teaser-v10-5svc-even-16x9-poster.jpg"

INIT = """try{sessionStorage.setItem('mwPagelockOk','1');sessionStorage.setItem('smartUpkeep.videoDismissed','1');localStorage.setItem('smartUpkeep.videoDismissed','1');}catch(e){}
window.__heroWrites = [];
(function(){
  var proto = HTMLMediaElement.prototype;
  var ct = Object.getOwnPropertyDescriptor(proto, 'currentTime');
  var pr = Object.getOwnPropertyDescriptor(proto, 'playbackRate');
  var dpr = Object.getOwnPropertyDescriptor(proto, 'defaultPlaybackRate');
  function hook(desc, name){
    if (!desc || !desc.set) return;
    Object.defineProperty(proto, name, {
      get: desc.get,
      set: function(v){
        if (this && this.classList && this.classList.contains('hm-teaser')) {
          window.__heroWrites.push({name:name, value:v, t: this.currentTime});
        }
        return desc.set.call(this, v);
      },
      configurable: true
    });
  }
  hook(ct, 'currentTime'); hook(pr, 'playbackRate'); hook(dpr, 'defaultPlaybackRate');
})();
document.addEventListener('playing', function(e){
  var v = e.target;
  if (v && v.classList && v.classList.contains('hm-teaser') && window.__heroStart == null) {
    window.__heroStart = v.currentTime;
  }
}, true);
"""

PHONE_VIEWS = [(360, 640), (390, 844), (430, 932)]
WIDE_VIEWS = [(1280, 800), (844, 390)]

checks = []
errors_all = []

def check(name, ok, info=""):
    checks.append({"name": name, "ok": bool(ok), "info": info})
    print(("PASS " if ok else "FAIL ") + name + (("  " + str(info)) if info else ""), flush=True)

def src_of(page):
    return page.evaluate("""() => {
      const v = document.querySelector('video.hm-teaser');
      const img = document.querySelector('.hm-hero .hm-thumb img, .hm-thumb img');
      if (v) return {kind:'video', src: v.currentSrc || v.getAttribute('src') || '', poster: v.getAttribute('poster')||'',
        dataSrc: v.getAttribute('data-src')||'', hold: v.hasAttribute('data-hold'),
        currentTime: v.currentTime, playbackRate: v.playbackRate, loop: !!v.loop, muted: !!v.muted,
        autoplay: v.hasAttribute('autoplay'), playsinline: v.hasAttribute('playsinline'), paused: v.paused,
        readyState: v.readyState, preload: v.getAttribute('preload')||v.preload||''};
      if (img) return {kind:'img', src: img.currentSrc || img.getAttribute('src') || ''};
      return {kind:'none'};
    }""")

def release_hold(page):
    """First interaction without moving the real cursor (avoids leaking into the next context)."""
    page.evaluate("""() => {
      window.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, pointerType:'touch', clientX:24, clientY:140}));
    }""")
    page.wait_for_function("""() => {
      const v = document.querySelector('video.hm-teaser');
      return v && v.getAttribute('src') && v.readyState >= 2;
    }""", timeout=20000)
    page.wait_for_timeout(200)

def boot(page, wait_video=True, release_phone=None):
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(400)
    page.wait_for_function("() => document.body && document.body.classList.contains('on-home')")
    if wait_video:
        page.wait_for_selector("video.hm-teaser", timeout=15000)
        w = (page.viewport_size or {}).get("width", 1280)
        if release_phone is None:
            release_phone = w <= 480
        if release_phone:
            release_hold(page)
        elif w <= 480:
            # Autoplay on load (Machan 9:23 PM ICT): src is set, wait until ready.
            page.wait_for_function("""() => {
              const v = document.querySelector('video.hm-teaser');
              return v && v.getAttribute('src') && v.readyState >= 2;
            }""", timeout=20000)
            page.wait_for_timeout(250)
        else:
            page.wait_for_function("""() => {
              const v = document.querySelector('video.hm-teaser');
              return v && v.readyState >= 2;
            }""", timeout=20000)
            page.wait_for_timeout(250)

def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])

        # Phone and wide source + playback properties
        for w, h in PHONE_VIEWS + WIDE_VIEWS:
            expect_phone = (w, h) in PHONE_VIEWS
            want = PHONE if expect_phone else WIDE
            want_poster = PHONE_POSTER if expect_phone else WIDE_POSTER
            cons = []
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=2 if w <= 430 else 1,
            )
            ctx.add_init_script(INIT)
            page = ctx.new_page()
            page.on("pageerror", lambda e: cons.append("pageerror: " + str(e)))
            page.on("console", lambda m: cons.append("console:" + m.type + ": " + m.text) if m.type in ("error", "assert") else None)
            mp4_reqs = []
            page.on("request", lambda req, want=want, acc=mp4_reqs: acc.append(req.url) if want in req.url else None)
            if expect_phone:
                boot(page, wait_video=True, release_phone=False)
                info = src_of(page)
                y = page.evaluate("() => window.scrollY || document.documentElement.scrollTop || 0")
                check(f"{w}x{h}: home boots at the top", y == 0, f"scrollY={y}")
                check(f"{w}x{h}: video present", info.get("kind") == "video", info)
                src = info.get("src") or ""
                check(f"{w}x{h}: autoplays on load (src set, not held)", want in src and not info.get("hold") and not info.get("dataSrc"), info)
                check(f"{w}x{h}: matching poster attribute", want_poster in (info.get("poster") or ""), info.get("poster"))
                check(f"{w}x{h}: phone mp4 requested on load", bool(mp4_reqs), mp4_reqs)
                check(f"{w}x{h}: phone file loads on boot", want in src, src)
                start = page.evaluate("() => window.__heroStart")
                writes = page.evaluate("() => window.__heroWrites || []")
                check(f"{w}x{h}: currentTime starts near 0", isinstance(start, (int, float)) and 0 <= start < 0.35, f"start={start} later={info.get('currentTime')}")
                check(f"{w}x{h}: playbackRate is 1", info.get("playbackRate") == 1, info.get("playbackRate"))
                check(f"{w}x{h}: no seek or rate writes", writes == [], writes)
                check(f"{w}x{h}: loop is true", info.get("loop") is True, info)
                check(f"{w}x{h}: muted + playsinline + autoplay", info.get("muted") and info.get("playsinline") and info.get("autoplay"), info)
                check(f"{w}x{h}: playing or ready (not waiting for touch)", (info.get("paused") is False) or (info.get("readyState") or 0) >= 2, info)
            else:
                boot(page)
                info = src_of(page)
                y = page.evaluate("() => window.scrollY || document.documentElement.scrollTop || 0")
                check(f"{w}x{h}: home boots at the top", y == 0, f"scrollY={y}")
                check(f"{w}x{h}: video present", info.get("kind") == "video", info)
                src = info.get("src") or ""
                check(f"{w}x{h}: wide file loads", want in src, src)
                check(f"{w}x{h}: matching poster attribute", want_poster in (info.get("poster") or ""), info.get("poster"))
                start = page.evaluate("() => window.__heroStart")
                ct = info.get("currentTime")
                check(f"{w}x{h}: currentTime starts near 0", isinstance(start, (int, float)) and 0 <= start < 0.35, f"start={start} later={ct}")
                check(f"{w}x{h}: playbackRate is 1", info.get("playbackRate") == 1, info.get("playbackRate"))
                check(f"{w}x{h}: loop is true", info.get("loop") is True, info)
                check(f"{w}x{h}: muted + playsinline + autoplay", info.get("muted") and info.get("playsinline") and info.get("autoplay"), info)
            serious = [c for c in cons if "favicon" not in c.lower() and "Failed to load resource" not in c]
            check(f"{w}x{h}: no console errors", not serious, serious)
            if (w, h) in ((390, 844), (1280, 800)):
                # Wait just long enough for a real frame, still in scene 1.
                page.wait_for_timeout(400)
                hero = page.locator(".hm-hero .hm-thumb, .hm-thumb").first
                hero.screenshot(path=str(OUT / f"hero-frame-{w}x{h}.png"))
                page.screenshot(path=str(OUT / f"home-{w}x{h}.png"))
                print(f"wrote shots for {w}x{h}", flush=True)
            ctx.close()

        # Reduced motion: poster only, no video
        for w, h, poster in ((390, 844, PHONE_POSTER), (1280, 800, WIDE_POSTER)):
            cons = []
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                reduced_motion="reduce",
            )
            ctx.add_init_script(INIT)
            page = ctx.new_page()
            page.on("pageerror", lambda e: cons.append("pageerror: " + str(e)))
            page.on("console", lambda m: cons.append("console:" + m.type + ": " + m.text) if m.type in ("error", "assert") else None)
            page.goto(BASE + "/", wait_until="domcontentloaded")
            page.wait_for_function("() => document.body && document.body.classList.contains('on-home')")
            page.wait_for_timeout(500)
            info = src_of(page)
            vid_count = page.evaluate("() => document.querySelectorAll('video.hm-teaser').length")
            check(f"reduced {w}x{h}: poster image only (no video)", info.get("kind") == "img" and vid_count == 0, info)
            check(f"reduced {w}x{h}: poster file is the matching still", poster in (info.get("src") or ""), info.get("src"))
            serious = [c for c in cons if "favicon" not in c.lower()]
            check(f"reduced {w}x{h}: no console errors", not serious, serious)
            page.screenshot(path=str(OUT / f"reduced-{w}x{h}.png"))
            ctx.close()

        # Resize / orientation: one swap, no double load
        cons = []
        loads = []
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        page.on("pageerror", lambda e: cons.append("pageerror: " + str(e)))
        def on_req(req):
            u = req.url
            if PHONE in u or WIDE in u:
                loads.append(("req", u, time.time()))
        def on_res(res):
            u = res.url
            if PHONE in u or WIDE in u:
                loads.append(("res", u, time.time()))
        page.on("request", on_req)
        page.on("response", on_res)
        boot(page, release_phone=False)
        first = src_of(page)
        phone_reqs = [x for x in loads if PHONE in x[1]]
        check("boot 390: phone autoplays, mp4 requested", (not first.get("hold")) and PHONE in (first.get("src") or "") and len(phone_reqs)>=1, {"info": first, "reqs": phone_reqs})
        # Cross the 480px breakpoint once
        before = len([x for x in loads if WIDE in x[1] and x[0] == "req"])
        page.set_viewport_size({"width": 1280, "height": 800})
        page.wait_for_timeout(800)
        mid = src_of(page)
        wide_reqs = [x for x in loads if WIDE in x[1] and x[0] == "req"]
        check("resize 390->1280: wide file loads", WIDE in (mid.get("src") or ""), mid)
        check("resize 390->1280: wide requested once", len(wide_reqs) - before == 1, {"before": before, "after": len(wide_reqs), "loads": [x[1].split("/")[-1] for x in loads]})
        # A no-op resize (still wide) must not reload
        after_one = len(wide_reqs)
        page.set_viewport_size({"width": 1400, "height": 800})
        page.wait_for_timeout(500)
        wide_reqs2 = [x for x in loads if WIDE in x[1] and x[0] == "req"]
        still = src_of(page)
        check("same-side resize: no second wide load", len(wide_reqs2) == after_one, {"count": len(wide_reqs2), "src": still.get("src")})
        # Back to phone, one load
        phone_before = len([x for x in loads if PHONE in x[1] and x[0] == "req"])
        page.set_viewport_size({"width": 360, "height": 640})
        page.wait_for_timeout(800)
        back = src_of(page)
        phone_after = [x for x in loads if PHONE in x[1] and x[0] == "req"]
        check("resize 1280->360: phone file loads", PHONE in (back.get("src") or ""), back)
        check("resize 1280->360: phone requested once more (no double load)", len(phone_after) - phone_before == 1, {"before": phone_before, "after": len(phone_after)})
        # Landscape phone 844x390 from portrait should also pick wide once
        wide_before = len([x for x in loads if WIDE in x[1] and x[0] == "req"])
        page.set_viewport_size({"width": 844, "height": 390})
        page.wait_for_timeout(800)
        land = src_of(page)
        wide_after = [x for x in loads if WIDE in x[1] and x[0] == "req"]
        check("orientation 360x640->844x390: wide file loads", WIDE in (land.get("src") or ""), land)
        check("orientation swap: wide requested once", len(wide_after) - wide_before == 1, {"before": wide_before, "after": len(wide_after)})
        ctx.close()

        # Full-loop: five even scenes, native loop at 1x from 0, no seek or rate change.
        # 0.4s dissolves are centered at 2.45, 5.10, 7.75, 10.40 and 13.05; sample mid-scene.
        SCENE_MIDS = [1.15, 3.78, 6.33, 8.98, 11.63]

        def frame_vec(pg):
            return pg.evaluate("""() => {
              const v = document.querySelector('video.hm-teaser');
              if (!v || v.readyState < 2) return null;
              const c = document.createElement('canvas');
              c.width = 48; c.height = 48;
              const ctx = c.getContext('2d');
              ctx.drawImage(v, 0, 0, 48, 48);
              const d = ctx.getImageData(0, 0, 48, 48).data;
              const bins = [];
              const step = 12;
              for (let y = 0; y < 48; y += step) {
                for (let x = 0; x < 48; x += step) {
                  let r = 0, g = 0, b = 0, n = 0;
                  for (let yy = y; yy < y + step; yy++) for (let xx = x; xx < x + step; xx++) {
                    const i = (yy * 48 + xx) * 4; r += d[i]; g += d[i+1]; b += d[i+2]; n++;
                  }
                  bins.push([Math.round(r/n), Math.round(g/n), Math.round(b/n)]);
                }
              }
              return {t: v.currentTime, rate: v.playbackRate, loop: !!v.loop, dur: v.duration, paused: v.paused, bins};
            }""")

        def dist(a, b):
            if not a or not b: return 1e9
            s = 0.0
            for p1, q1 in zip(a["bins"], b["bins"]):
                s += (p1[0]-q1[0])**2 + (p1[1]-q1[1])**2 + (p1[2]-q1[2])**2
            return (s / len(a["bins"])) ** 0.5

        LOOP_INIT = INIT + """
          document.addEventListener('timeupdate', function(e){
            var v = e.target;
            if (!v || !v.classList || !v.classList.contains('hm-teaser')) return;
            if (window.__heroMaxT == null) window.__heroMaxT = 0;
            if (v.currentTime + 0.75 < window.__heroMaxT) window.__heroLooped = true;
            if (v.currentTime > window.__heroMaxT) window.__heroMaxT = v.currentTime;
            window.__heroRate = v.playbackRate;
          }, true);
        """

        for w, h, label in ((390, 844, "phone"), (1280, 800, "wide")):
            cons = []
            loop_ctx = browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=2 if w <= 430 else 1,
            )
            loop_ctx.add_init_script(LOOP_INIT)
            page = loop_ctx.new_page()
            page.on("pageerror", lambda e: cons.append("pageerror: " + str(e)))
            boot(page)
            meta = page.evaluate("""() => {
              const v = document.querySelector('video.hm-teaser');
              return {dur: v && v.duration, rate: v && v.playbackRate, loop: !!(v && v.loop), t: v && v.currentTime};
            }""")
            check(f"loop {label} {w}x{h}: duration ~13.267s", isinstance(meta.get("dur"), (int, float)) and abs(meta["dur"] - 13.266667) < 0.08, meta)
            check(f"loop {label} {w}x{h}: starts at 1x with native loop", meta.get("rate") == 1 and meta.get("loop") is True, meta)
            frames = []
            for mid in SCENE_MIDS:
                page.wait_for_function(
                    """(mid) => { const v = document.querySelector('video.hm-teaser'); return v && v.currentTime >= mid; }""",
                    arg=mid,
                    timeout=20000,
                )
                fr = frame_vec(page)
                frames.append(fr)
                print(f"  sampled {label} mid={mid} t={(fr or {}).get('t')} rate={(fr or {}).get('rate')}", flush=True)
            times_ok = all(fr and abs(fr["t"] - mid) < 0.7 for fr, mid in zip(frames, SCENE_MIDS))
            rates_ok = all(fr and fr["rate"] == 1 for fr in frames)
            dists = []
            for i in range(5):
                for j in range(i + 1, 5):
                    d = dist(frames[i], frames[j])
                    dists.append((i + 1, j + 1, round(d, 2)))
            pair = [d for _, _, d in dists]
            gutter = [d for a, b, d in dists if 5 in (a, b)]
            # Wide furnace vs water heater can be close (~9.5) on the 16:9 crop;
            # still require every pair to differ and the gutter scene to stand apart.
            distinct = bool(pair) and min(pair) >= 8 and min(gutter) >= 40
            check(f"loop {label} {w}x{h}: sampled all 5 scene midpoints without seeking", times_ok and all(frames), [None if not fr else round(fr["t"], 3) for fr in frames])
            check(f"loop {label} {w}x{h}: playbackRate 1 through all scenes", rates_ok, [None if not fr else fr["rate"] for fr in frames])
            check(f"loop {label} {w}x{h}: all 5 scenes look distinct", distinct, dists)
            page.wait_for_function("() => window.__heroLooped === true", timeout=20000)
            page.wait_for_function(
                """(mid) => { const v = document.querySelector('video.hm-teaser'); return v && window.__heroLooped && v.currentTime >= mid && v.currentTime < mid + 0.9; }""",
                arg=SCENE_MIDS[0],
                timeout=20000,
            )
            fr_loop = frame_vec(page)
            loop_d = dist(frames[0], fr_loop)
            wrap = page.evaluate("""() => ({looped: window.__heroLooped, maxT: window.__heroMaxT, t: document.querySelector('video.hm-teaser').currentTime, rate: document.querySelector('video.hm-teaser').playbackRate})""")
            check(f"loop {label} {w}x{h}: native loop wrapped (currentTime dropped)", bool(wrap.get("looped")) and (wrap.get("maxT") or 0) >= 12.5, wrap)
            check(f"loop {label} {w}x{h}: after loop, scene 1 matches first pass", loop_d < 10, f"dist={loop_d:.2f} t={(fr_loop or {}).get('t')}")
            check(f"loop {label} {w}x{h}: playbackRate still 1 after loop", fr_loop and fr_loop["rate"] == 1, fr_loop)
            serious = [c for c in cons if "favicon" not in c.lower() and "Failed to load resource" not in c]
            check(f"loop {label} {w}x{h}: no console errors", not serious, serious)
            loop_ctx.close()

        browser.close()

    passed = sum(1 for c in checks if c["ok"])
    failed = [c for c in checks if not c["ok"]]
    out = {"passed": passed, "failed": len(failed), "total": len(checks), "checks": checks}
    RES.write_text(json.dumps(out, indent=2))
    print(f"\nhero tests: {passed}/{len(checks)} passed, {len(failed)} failed", flush=True)
    if failed:
        for c in failed:
            print("  FAIL", c["name"], c["info"], flush=True)
    return 0 if not failed else 1

if __name__ == "__main__":
    raise SystemExit(run())
