/* Sets --bbm-under to the visible sticky/fixed bottom bar height so
   bbm-reveal.css can tuck Built by Machan behind it. */
(function(){
  var SEL=".hm-tabs.hm-dock,.ob-bar,nav.mbar,#bar.bar,nav.tabs";
  var placing=false;

  function placeHome(){
    var ft=document.querySelector("footer.foot");
    var onHome=document.body.classList.contains("on-home");
    var sec=document.getElementById("hs-faq")||document.querySelector(".hm .hs-sec:last-of-type");
    var app=document.getElementById("app");
    var bar=document.querySelector(".hm-tabs.hm-dock");
    var hdr=document.querySelector(".topbar, header.topbar, body.on-home .topbar");
    if(!ft) return;
    /* Restore the footer after #app if a previous pass had moved it. */
    if(ft.dataset.bbmMoved==="1" && app){
      var host=app.parentNode;
      if(app.nextSibling) host.insertBefore(ft, app.nextSibling);
      else host.appendChild(ft);
      delete ft.dataset.bbmMoved;
    }
    document.querySelectorAll(".bbm-last").forEach(function(el){ el.classList.remove("bbm-last"); });
    if(!onHome || !sec){
      ft.style.removeProperty("transform");
      return;
    }
    var headerH=hdr?Math.round(hdr.getBoundingClientRect().height):56;
    var barH=bar?Math.round(bar.getBoundingClientRect().height):0;
    var parked=Math.max(0, sec.offsetTop-headerH);
    var pulled=Math.max(0, (window.scrollY||document.documentElement.scrollTop)-parked);
    var show=Math.min(pulled, barH);
    ft.style.setProperty("transform","translateY("+(-show)+"px)");
  }

  /* Member subpages with nav.mbar: credit is position:fixed behind the
     bar. Translate it up by the amount pulled past (maxScroll - barH). */
  function placeMbar(){
    if(document.body.classList.contains("on-home") || document.body.classList.contains("on-ob")) return;
    var bar=document.querySelector("nav.mbar");
    if(!bar) return;
    var ft=document.querySelector("body > footer.ft, footer.ft:not(.bbm-sheet-ft)");
    if(!ft || ft.classList.contains("bbm-sheet-ft")) return;
    var r=bar.getBoundingClientRect();
    if(r.height<8 || window.getComputedStyle(bar).display==="none") return;
    var barH=Math.round(window.innerHeight-r.top);
    if(barH<8) barH=Math.round(r.height);
    var max=Math.max(0, document.documentElement.scrollHeight-window.innerHeight);
    var y=window.scrollY||document.documentElement.scrollTop||0;
    var show=0;
    if(max>=barH) show=Math.max(0, Math.min(barH, y-(max-barH)));
    ft.style.setProperty("transform","translateY("+(-show)+"px)");
  }

  function billingOpen(){
    var sheet=document.getElementById("sheet");
    if(!sheet || !sheet.classList.contains("on")) return false;
    var title=document.getElementById("shT");
    var t=((title && title.textContent) || "").replace(/\s+/g," ").trim();
    if(/^billing$/i.test(t)) return true;
    if((location.hash||"").replace(/^#/,"") === "billing") return true;
    return false;
  }

  function makeCreditFooter(){
    var ft=document.createElement("footer");
    ft.className="ft bbm-sheet-ft";
    var src=document.querySelector("body > footer.ft, #s-app footer.ft, footer.ft:not(.bbm-sheet-ft), footer.foot");
    if(src){
      ft.innerHTML=src.innerHTML;
      return ft;
    }
    ft.innerHTML='<p class="machan-ft"><span class="uk-built-a"><span class="mw-machan" style="display:inline-flex;align-items:center;gap:6px">Built by Machan</span></span></p>';
    return ft;
  }

  /* Billing sheet already ends with a Built by Machan footer, and
     dockSheetHeight sizes the sheet to that content, so the line is
     always in view. Cap the sheet just above the credit so it is
     clipped at rest and appears when the user pulls .sh-body. */
  function placeBilling(){
    var sheet=document.getElementById("sheet");
    var body=document.getElementById("shB")||document.querySelector("#sheet .sh-body");
    if(!sheet||!body) return;
    if(!billingOpen()){
      body.querySelectorAll(":scope > .bbm-sheet-sp, :scope > footer.bbm-sheet-ft").forEach(function(n){ n.remove(); });
      if(sheet.dataset.bbmMax){
        sheet.style.removeProperty("max-height");
        delete sheet.dataset.bbmMax;
      }
      return;
    }
    body.querySelectorAll(":scope > .bbm-sheet-sp").forEach(function(n){ n.remove(); });
    /* Drop a duplicate we may have injected earlier; use the in-content footer. */
    var all=body.querySelectorAll("footer");
    if(all.length>1){
      all.forEach(function(n){ if(n.classList.contains("bbm-sheet-ft") && n.parentNode===body) n.remove(); });
    }
    var ft=body.querySelector("footer");
    if(!ft){
      ft=makeCreditFooter();
      body.appendChild(ft);
    }
    ft.classList.add("bbm-sheet-ft");
    if((body.scrollTop||0)>1) return; /* don't fight a pull */
    var bodyR=body.getBoundingClientRect();
    var ftNow=ft.getBoundingClientRect();
    var peekNow=Math.max(0, Math.min(ftNow.bottom, bodyR.bottom)-Math.max(ftNow.top, bodyR.top));
    var maxNow=Math.max(0, body.scrollHeight-body.clientHeight);
    var fh=Math.max(36, Math.round(ftNow.height)||36);
    if(peekNow<1 && maxNow>=fh-1) return;
    /* Measure the natural (uncapped) sheet, then cap by the full credit height. */
    sheet.style.removeProperty("max-height");
    void sheet.offsetHeight;
    var sheetR=sheet.getBoundingClientRect();
    var ftR=ft.getBoundingClientRect();
    fh=Math.max(36, Math.round(ftR.height)||36);
    var cap=Math.max(120, Math.round(sheetR.height-fh-2));
    sheet.style.maxHeight=cap+"px";
    sheet.dataset.bbmMax=String(cap);
  }

  function apply(){
    if(placing) return;
    placing=true;
    try{
      var h=0, nodes=document.querySelectorAll(SEL), i, el, r;
      for(i=0;i<nodes.length;i++){
        el=nodes[i];
        r=el.getBoundingClientRect();
        if(r.height<8) continue;
        if(r.bottom<window.innerHeight-8) continue;
        if(window.getComputedStyle(el).display==="none") continue;
        h=Math.max(h, Math.round(window.innerHeight-r.top));
      }
      var hidden=document.querySelectorAll(".ob-bar .ob-built, p.ob-built");
      for(i=0;i<hidden.length;i++){ hidden[i].style.setProperty("display","none","important"); }
      document.documentElement.style.setProperty("--bbm-under", h+"px");
      document.documentElement.classList.toggle("bbm-has-bar", h>0);
      placeHome();
      placeMbar();
      placeBilling();
    }finally{
      placing=false;
    }
  }
  var tmr;
  function kick(){ clearTimeout(tmr); tmr=setTimeout(apply, 40); }
  function ready(){
    apply();
    window.addEventListener("resize", kick);
    window.addEventListener("orientationchange", kick);
    window.addEventListener("scroll", kick, {passive:true});
    window.addEventListener("hashchange", kick);
    if(window.visualViewport) window.visualViewport.addEventListener("resize", kick);
    try{
      new MutationObserver(kick).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
    }catch(e){}
    setTimeout(apply, 60);
    setTimeout(apply, 300);
    setTimeout(apply, 1200);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
