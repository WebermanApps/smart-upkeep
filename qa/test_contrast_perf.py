#!/usr/bin/env python3
"""Contrast ratios, phone-poster network, LCP/load, paging rAF p95, autoplay shots."""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

AFTER = "http://127.0.0.1:19760"
BEFORE = "http://127.0.0.1:19751"
SHOTS_C = Path("/workspace/contrast-1114/qa/shots/contrast")
SHOTS_H = Path("/workspace/contrast-1114/qa/shots/hero-autoplay")
RES = Path("/workspace/contrast-1114/qa/contrast-perf-results.json")
SHOTS_C.mkdir(parents=True, exist_ok=True)
SHOTS_H.mkdir(parents=True, exist_ok=True)

IOS_UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) "
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 "
          "Mobile/15E148 Safari/604.1")
WIDE_POSTER = "teaser-v10-5svc-even-16x9-poster.jpg"
PHONE_POSTER = "teaser-v10-phone-5svc-even-3x4-poster.jpg"
PHONE_MP4 = "teaser-v10.1-phone-5svc-even-3x4.mp4"
WIDE_MP4 = "teaser-v10-5svc-even-16x9.mp4"
INIT = """try{sessionStorage.setItem('mwPagelockOk','1');
sessionStorage.setItem('smartUpkeep.videoDismissed','1');
localStorage.setItem('smartUpkeep.videoDismissed','1');}catch(e){}
window.__lcp=null;window.__reqs=[];
try{
  new PerformanceObserver(list=>{
    for (const e of list.getEntries()){
      if (e.entryType==='largest-contentful-paint') window.__lcp={t:e.startTime,url:e.url||'',size:e.size,tag:e.element&&e.element.tagName};
    }
  }).observe({type:'largest-contentful-paint',buffered:true});
}catch(e){}
"""

CONTRAST_JS = r"""() => {
  function lin(c){c=c/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
  function lum(rgb){
    const m=rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if(!m) return null;
    return 0.2126*lin(+m[1])+0.7152*lin(+m[2])+0.0722*lin(+m[3]);
  }
  function contrast(fg,bg){
    const L1=lum(fg),L2=lum(bg); if(L1==null||L2==null) return null;
    const hi=Math.max(L1,L2),lo=Math.min(L1,L2);
    return Math.round(((hi+0.05)/(lo+0.05))*100)/100;
  }
  function bgOf(el){
    let n=el;
    while(n && n!==document.documentElement){
      const s=getComputedStyle(n);
      const bg=s.backgroundColor;
      if(bg && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(bg) && bg!=='transparent') return {bg, tag:n.tagName, cls:n.className.toString().slice(0,80)};
      n=n.parentElement;
    }
    return {bg:getComputedStyle(document.body).backgroundColor, tag:'BODY', cls:''};
  }
  const out=[];
  const sels=[
    ['addon-label','html body.on-home .alc-card .sa-q .sa-n small'],
    ['welcome-offer','.hm-plan.sel .pc-offer, .pc-offer'],
    ['su-muted-any','']
  ];
  document.querySelectorAll('*').forEach(el=>{
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='LINK') return;
    const cs=getComputedStyle(el);
    const color=cs.color;
    if(!color) return;
    const txt=(el.innerText||'').trim().slice(0,60);
    const isLabel=el.matches && el.matches('html body.on-home .alc-card .sa-q .sa-n small');
    const isOffer=el.matches && el.matches('.pc-offer');
    const muted=getComputedStyle(document.documentElement).getPropertyValue('--su-muted').trim();
    const usesToken=muted && color && (function(){
      const m=color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if(!m) return false;
      const hex=muted.replace('#','');
      if(hex.length!==6) return false;
      const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
      return +m[1]===r && +m[2]===g && +m[3]===b;
    })();
    if(!(isLabel||isOffer||usesToken)) return;
    const b=bgOf(el);
    const ratio=contrast(color,b.bg);
    const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2) return;
    out.push({
      kind: isLabel?'addon-label':isOffer?'welcome-offer':'su-muted',
      text:txt, color, bg:b.bg, bgFrom:b.tag+'.'+b.cls, ratio,
      fontSize:cs.fontSize, visible:r.top<innerHeight && r.bottom>0
    });
  });
  return out;
}"""

checks=[]
def check(name, ok, info=""):
    checks.append({"name":name,"ok":bool(ok),"info":info})
    print(("PASS " if ok else "FAIL ")+name+(("  "+str(info)[:300]) if info else ""), flush=True)

def new_ctx(browser, w, h, base_ua=True, reduced=False, throttle=False, page_hook=None):
    kw=dict(
        viewport={"width":w,"height":h},
        device_scale_factor=3,
        user_agent=IOS_UA,
        is_mobile=w<=480,
        has_touch=w<=480,
    )
    if reduced:
        kw["reduced_motion"]="reduce"
    ctx=browser.new_context(**kw)
    ctx.add_init_script(INIT)
    page=ctx.new_page()
    if throttle:
        cdp=page.context.new_cdp_session(page)
        cdp.send("Network.enable")
        cdp.send("Emulation.setCPUThrottlingRate", {"rate":4})
    return ctx, page

def collect_net(page):
    hits=[]
    def on_req(req):
        u=req.url
        if any(s in u for s in (WIDE_POSTER, PHONE_POSTER, PHONE_MP4, WIDE_MP4)):
            hits.append({"t":time.time(),"url":u,"res":u.split("/")[-1].split("?")[0],
                         "type":req.resource_type,"start":True})
    page.on("request", on_req)
    return hits

def open_home(page, origin, wait_video=True):
    t0=time.time()
    page.goto(origin+"/", wait_until="load")
    page.wait_for_function("() => document.body && document.body.classList.contains('on-home')", timeout=20000)
    if wait_video:
        try:
            page.wait_for_selector("video.hm-teaser, .hm-hero .hm-thumb img", timeout=15000)
        except Exception:
            pass
        page.wait_for_timeout(600)
    load_ms=round((time.time()-t0)*1000,1)
    nav=page.evaluate("""() => {
      const n=performance.getEntriesByType('navigation')[0];
      const lcp=window.__lcp;
      return {
        load: n? n.loadEventEnd : null,
        dcl: n? n.domContentLoadedEventEnd : null,
        start: n? n.startTime : 0,
        lcp: lcp
      };
    }""")
    return load_ms, nav

def measure_raf(page):
    return page.evaluate("""async () => {
      const deltas=[];
      let last=performance.now(), running=true;
      const tick=t=>{ deltas.push(t-last); last=t; if(running) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const ids=['hs-top','hs-plans','hs-alc','hs-faq'];
      for (const id of ids){
        const el=document.getElementById(id);
        if(el) el.scrollIntoView();
        await new Promise(r=>setTimeout(r,450));
      }
      window.scrollTo(0,0);
      await new Promise(r=>setTimeout(r,300));
      running=false;
      await new Promise(r=>requestAnimationFrame(r));
      const xs=deltas.filter(d=>d>0 && d<1000).sort((a,b)=>a-b);
      const pct=p=>xs.length? Math.round(xs[Math.min(xs.length-1, Math.floor(xs.length*p/100))]*10)/10 : null;
      const playing=(()=>{const v=document.querySelector('video.hm-teaser'); return v? !v.paused : false;})();
      return {n:xs.length, p50:pct(50), p95:pct(95), p99:pct(99), over33:xs.filter(d=>d>33).length, playing};
    }""")

def main():
    results={"views":[], "lcp":{}, "raf":{}, "contrast":{}, "autoplay":{}}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required","--headless=new"])

        # Network + shots at 360, 390, 430, 1280 (after)
        for w,h in ((360,640),(390,660),(430,746),(1280,800)):
            ctx,page=new_ctx(browser,w,h)
            hits=collect_net(page)
            t0=time.time()
            open_home(page, AFTER)
            # give preload/video a moment
            page.wait_for_timeout(800)
            elapsed=[(round((x["t"]-t0)*1000,1), x["res"], x["type"]) for x in hits]
            posters_w=[x for x in hits if WIDE_POSTER in x["url"]]
            posters_p=[x for x in hits if PHONE_POSTER in x["url"]]
            phone=w<=480
            if phone:
                check(f"{w}x{h}: phones do not fetch 16x9 poster", len(posters_w)==0, elapsed)
                check(f"{w}x{h}: phones fetch 3x4 poster", len(posters_p)>=1, elapsed)
                if posters_p:
                    first_p=round((posters_p[0]["t"]-t0)*1000,1)
                    check(f"{w}x{h}: phone poster fetched early (<1500ms)", first_p<1500, f"{first_p}ms {elapsed}")
            else:
                check(f"{w}x{h}: desktop fetches 16x9 poster", len(posters_w)>=1, elapsed)
                check(f"{w}x{h}: desktop does not fetch 3x4 poster", len(posters_p)==0, elapsed)
            # contrast + screenshots of labels / offer / hero
            # scroll plans into view for welcome offer, tailor for labels
            try:
                page.evaluate("() => document.getElementById('hs-plans') && document.getElementById('hs-plans').scrollIntoView()")
                page.wait_for_timeout(200)
                page.evaluate("""() => {
                  const c=document.querySelector('.hm-plan.sel')||document.querySelector('.hm-plan[data-tier="gold"], .hm-plan.plus, .hm-plan');
                  if(c && !c.classList.contains('sel')) c.click();
                }""")
                page.wait_for_timeout(400)
                page.screenshot(path=str(SHOTS_C/f"after-plans-{w}.png"), full_page=False)
            except Exception as e:
                check(f"{w}x{h}: plans shot", False, str(e))
            try:
                page.evaluate("() => document.getElementById('hs-alc') && document.getElementById('hs-alc').scrollIntoView()")
                page.wait_for_timeout(400)
                page.screenshot(path=str(SHOTS_C/f"after-addons-{w}.png"), full_page=False)
            except Exception as e:
                check(f"{w}x{h}: addons shot", False, str(e))
            rows=page.evaluate(CONTRAST_JS)
            low=[r for r in rows if r["ratio"] is not None and r["ratio"]<4.5]
            check(f"{w}x{h}: all measured muted/offer text >=4.5", not low, low)
            results["views"].append({"w":w,"h":h,"net":elapsed,"contrast":rows})
            # hero autoplay shot at top
            page.evaluate("() => window.scrollTo(0,0)")
            page.wait_for_timeout(500)
            info=page.evaluate("""() => {
              const v=document.querySelector('video.hm-teaser');
              const img=document.querySelector('.hm-hero .hm-thumb img');
              if(v) return {kind:'video', src:v.currentSrc||v.getAttribute('src')||'', hold:v.hasAttribute('data-hold'),
                paused:v.paused, muted:v.muted, loop:v.loop, autoplay:v.hasAttribute('autoplay'),
                playsinline:v.hasAttribute('playsinline'), preload:v.getAttribute('preload')||v.preload};
              if(img) return {kind:'img', src:img.currentSrc||img.src};
              return {kind:'none'};
            }""")
            if phone or w>=1280:
                check(f"{w}x{h}: hero is a video and autoplaying", info.get("kind")=="video" and info.get("autoplay") and not info.get("hold") and info.get("paused") is False, info)
                check(f"{w}x{h}: muted + playsinline + loop + preload auto", info.get("muted") and info.get("playsinline") and info.get("loop") and info.get("preload")=="auto", info)
            page.locator(".hm-hero .hm-thumb, .hm-thumb").first.screenshot(path=str(SHOTS_H/f"autoplay-{w}.png"))
            page.screenshot(path=str(SHOTS_H/f"home-{w}.png"))
            ctx.close()

        # Before shots + LCP/load at 390 DPR3 4x throttle, both trees
        lcp_out={}
        for label, origin in (("before", BEFORE), ("after", AFTER)):
            ctx,page=new_ctx(browser,390,844, throttle=True)
            hits=collect_net(page)
            load_ms, nav=open_home(page, origin)
            page.wait_for_timeout(1200)
            lcp=(nav or {}).get("lcp") or {}
            lcp_out[label]={"wall_load_ms":load_ms, "nav_load": (nav or {}).get("load"), "dcl":(nav or {}).get("dcl"), "lcp":lcp, "net":[x["res"] for x in hits]}
            # contrast + shots at plans and addons
            page.evaluate("() => document.getElementById('hs-plans') && document.getElementById('hs-plans').scrollIntoView()")
            page.wait_for_timeout(200)
            page.evaluate("""() => {
              const c=document.querySelector('.hm-plan.sel')||document.querySelector('.hm-plan[data-tier="gold"], .hm-plan.plus, .hm-plan');
              if(c && !c.classList.contains('sel')) c.click();
            }""")
            page.wait_for_timeout(400)
            page.screenshot(path=str(SHOTS_C/f"{label}-plans-390.png"))
            page.evaluate("() => document.getElementById('hs-alc') && document.getElementById('hs-alc').scrollIntoView()")
            page.wait_for_timeout(400)
            page.screenshot(path=str(SHOTS_C/f"{label}-addons-390.png"))
            rows=page.evaluate(CONTRAST_JS)
            lcp_out[label]["contrast"]=rows
            ctx.close()
        results["lcp"]=lcp_out
        b=lcp_out["before"]; a=lcp_out["after"]
        print("LCP/load 390 DPR3 4x throttle:", json.dumps(lcp_out, indent=2)[:2000], flush=True)
        check("LCP measured before and after", bool(b.get("lcp")) and bool(a.get("lcp")), {"before":b.get("lcp"),"after":a.get("lcp")})

        # rAF p95 during phone paging with video playing (after), plus before for comparison
        raf_out={}
        for label, origin in (("before", BEFORE), ("after", AFTER)):
            ctx,page=new_ctx(browser,390,844)
            open_home(page, origin)
            # wait until video playing on after; before may be held
            page.wait_for_timeout(1000)
            playing=page.evaluate("() => { const v=document.querySelector('video.hm-teaser'); return v? !v.paused : false; }")
            if label=="after" and not playing:
                # try play
                page.evaluate("() => { const v=document.querySelector('video.hm-teaser'); if(v) v.play().catch(()=>{}); }")
                page.wait_for_timeout(400)
                playing=page.evaluate("() => { const v=document.querySelector('video.hm-teaser'); return v? !v.paused : false; }")
            raf=measure_raf(page)
            raf["playing_at_start"]=playing
            raf_out[label]=raf
            check(f"paging rAF p95 {label} recorded", raf.get("p95") is not None, raf)
            if label=="after":
                check("paging rAF ran with video playing", raf.get("playing") or playing, raf)
            ctx.close()
        results["raf"]=raf_out
        print("rAF", raf_out, flush=True)

        # Reduced motion: poster only, no autoplay
        for w,h in ((390,844),(1280,800)):
            ctx,page=new_ctx(browser,w,h, reduced=True)
            hits=collect_net(page)
            open_home(page, AFTER, wait_video=False)
            page.wait_for_timeout(500)
            info=page.evaluate("""() => {
              const v=document.querySelectorAll('video.hm-teaser').length;
              const img=document.querySelector('.hm-hero .hm-thumb img');
              return {videos:v, img: img? (img.currentSrc||img.src): null};
            }""")
            check(f"reduced {w}: poster only, no video", info.get("videos")==0 and bool(info.get("img")), info)
            page.locator(".hm-hero .hm-thumb, .hm-thumb").first.screenshot(path=str(SHOTS_H/f"reduced-{w}.png"))
            ctx.close()

        # Fallback: reject play() in a browser that also blocks attribute autoplay
        # (Low Power Mode equivalent). The main browser allows autoplay so the
        # happy path can be measured; this one must not.
        browser.close()
        browser=pw.chromium.launch(args=["--autoplay-policy=document-user-activation-required","--headless=new"])
        ctx=browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=3, user_agent=IOS_UA, is_mobile=True, has_touch=True)
        ctx.add_init_script(INIT)
        ctx.add_init_script("""
          const orig=HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play=function(){
            if(this.classList && this.classList.contains('hm-teaser') && !window.__allowHeroPlay){
              return Promise.reject(new DOMException('blocked','NotAllowedError'));
            }
            return orig.apply(this, arguments);
          };
        """)
        page=ctx.new_page()
        page.goto(AFTER+"/", wait_until="load")
        page.wait_for_function("() => document.body && document.body.classList.contains('on-home')")
        page.wait_for_selector("video.hm-teaser", timeout=15000)
        page.wait_for_timeout(400)
        blocked=page.evaluate("""() => {
          const v=document.querySelector('video.hm-teaser');
          return {hold:v && v.hasAttribute('data-hold'), paused:v.paused, src:v.currentSrc||v.getAttribute('src')||'',
                  poster:v.getAttribute('poster')||''};
        }""")
        check("blocked autoplay: poster kept (paused, data-hold)", blocked.get("paused") is True and blocked.get("hold") and PHONE_POSTER in (blocked.get("poster") or ""), blocked)
        page.evaluate("() => { window.__allowHeroPlay=true; window.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',clientX:24,clientY:140})); }")
        page.wait_for_function("""() => {
          const v=document.querySelector('video.hm-teaser');
          return v && !v.paused;
        }""", timeout=15000)
        afterb=page.evaluate("""() => {
          const v=document.querySelector('video.hm-teaser');
          return {hold:v.hasAttribute('data-hold'), paused:v.paused, src:v.currentSrc||v.getAttribute('src')||''};
        }""")
        check("blocked autoplay: first touch starts playback", afterb.get("paused") is False and not afterb.get("hold"), afterb)
        page.locator(".hm-hero .hm-thumb").first.screenshot(path=str(SHOTS_H/"fallback-after-touch-390.png"))
        ctx.close()

        browser.close()

    passed=sum(1 for c in checks if c["ok"])
    failed=[c for c in checks if not c["ok"]]
    out={"passed":passed,"failed":len(failed),"total":len(checks),"checks":checks,"lcp":results["lcp"],"raf":results["raf"],"views":results["views"]}
    RES.write_text(json.dumps(out, indent=2))
    print(f"\ncontrast/perf tests: {passed}/{len(checks)} passed, {len(failed)} failed", flush=True)
    for c in failed:
        print("  FAIL", c["name"], c["info"], flush=True)
    return 0 if not failed else 1

if __name__=="__main__":
    raise SystemExit(main())
