/* Smart Upkeep member visit report PDF: Download + Share wiring.
   Small loader only. jsPDF, the fonts and the PDF builder are vendored under /assets/member/pdf/
   and fetched the first time Download or Share is tapped (no CDN, nothing loads before a tap). */
(function(){
  "use strict";
  if(window.SUReportPdf) return;
  var me=(document.currentScript&&document.currentScript.src)||(function(){ var s=document.querySelector('script[src*="report-pdf.js"]'); return s&&s.src; })()||location.href;
  var BASE=new URL("../assets/member/pdf/",me).href;
  var VER="rp4";
  var loading=null, cache={}, busy=false;

  function data(){ try{ return (window.SU_REPORT_DATA&&window.SU_REPORT_DATA())||{}; }catch(e){ return {}; } }
  function say(msg){ try{ var t=data().toast; if(typeof t==="function") t(msg); }catch(e){} }
  function loadScript(src){
    return new Promise(function(res,rej){
      var s=document.createElement("script"); s.src=src; s.async=true;
      s.onload=function(){res()}; s.onerror=function(){rej(new Error("load "+src))};
      document.head.appendChild(s);
    });
  }
  function ensure(){
    if(loading) return loading;
    loading=Promise.resolve()
      .then(function(){ return (window.jspdf&&window.jspdf.jsPDF)?null:loadScript(BASE+"jspdf.umd.min.js?v="+VER); })
      .then(function(){ return window.SUReportPdfBuild?null:loadScript(BASE+"report-pdf-build.js?v="+VER); })
      .then(function(){ return window.SUReportPdfBuild.init(BASE,VER); })
      .catch(function(e){ loading=null; throw e; });
    return loading;
  }
  function visits(){ return data().VISITS||[]; }
  function byIds(ids){
    var all=visits(), want={}; ids.forEach(function(id){ want[String(id)]=1; });
    return all.filter(function(v){ return want[String(v.id)]; })
      .sort(function(a,b){ return String(b.date||"").localeCompare(String(a.date||"")); });
  }
  function make(list){
    var key=list.map(function(v){return v.id}).join(",");
    if(cache[key]) return Promise.resolve(cache[key]);
    return ensure().then(function(){ return window.SUReportPdfBuild.build(list); })
      .then(function(out){ cache[key]=out; return out; });
  }
  function save(out){
    var url=URL.createObjectURL(out.blob), a=document.createElement("a");
    a.href=url; a.download=out.name; a.rel="noopener"; a.style.display="none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} }, 4000);
  }
  function link(id){ return location.href.split("#")[0]+"#report-"+id; }
  function copy(text){
    try{ if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function(){return true},function(){return false}); }catch(e){}
    return Promise.resolve(false);
  }
  function fileOf(out){ try{ return new File([out.blob], out.name, {type:"application/pdf"}); }catch(e){ return null; } }
  function canShareFile(f){ try{ return !!(f&&navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})); }catch(e){ return false; } }
  function run(btn, job){
    if(busy) return; busy=true;
    if(btn){ btn.setAttribute("aria-busy","true"); btn.disabled=true; }
    var slow=setTimeout(function(){ say("Preparing PDF…"); }, 350);
    return job().catch(function(e){ try{console.warn("report pdf",e)}catch(x){} say("Could Not Make The PDF. Please Try Again."); })
      .then(function(){ clearTimeout(slow); busy=false; if(btn){ btn.removeAttribute("aria-busy"); btn.disabled=false; } });
  }

  function download(ids, btn){
    var list=byIds(ids);
    if(!list.length){ say("Pick A Report First"); return; }
    return run(btn, function(){ return make(list).then(function(out){ save(out); say(list.length>1?"Reports PDF Downloaded":"PDF Downloaded"); }); });
  }
  function shareReady(out, id){
    var f=fileOf(out);
    if(canShareFile(f)){
      return navigator.share({files:[f], title:out.title, text:out.title}).then(function(){}, function(err){
        if(err&&err.name==="AbortError") return;
        /* The tap's permission can lapse while the PDF is built; the PDF is cached now, so a second tap shares at once. */
        if(err&&err.name==="NotAllowedError"){ say("PDF Ready. Tap Share Again To Send It."); return; }
        return fallback(out, id);
      });
    }
    return fallback(out, id);
  }
  function fallback(out, id){
    save(out);
    return copy(link(id)).then(function(ok){ say(ok?"PDF Downloaded · Report Link Copied":"PDF Downloaded"); });
  }
  function share(id, btn){
    var list=byIds([id]);
    if(!list.length) return;
    var key=String(list[0].id);
    if(cache[key]){ return run(btn, function(){ return shareReady(cache[key], id); }); }
    return run(btn, function(){ return make(list).then(function(out){ return shareReady(out, id); }); });
  }

  window.SUReportPdf={download:download, share:share, _ensure:ensure, _make:function(ids){return make(byIds(ids))}};

  /* Capture-phase wiring so the page's own click router never sees these taps. */
  window.addEventListener("click", function(e){
    var t=e.target&&e.target.closest?e.target:null; if(!t) return;
    var b=t.closest("[data-pdf-report],[data-share-report],[data-rl-dlsel],[data-rl-dlall]");
    if(!b||b.disabled) return;
    var id;
    if((id=b.getAttribute("data-pdf-report"))){ e.preventDefault(); e.stopImmediatePropagation(); download([id], b); return; }
    if((id=b.getAttribute("data-share-report"))){ e.preventDefault(); e.stopImmediatePropagation(); share(id, b); return; }
    if(b.hasAttribute("data-rl-dlall")){ e.preventDefault(); e.stopImmediatePropagation(); download(visits().map(function(v){return v.id}), b); return; }
    if(b.hasAttribute("data-rl-dlsel")){
      e.preventDefault(); e.stopImmediatePropagation();
      var sel=data().VIS_SEL||null;
      var ids=sel?Object.keys(sel).filter(function(k){return sel[k]}):[];
      download(ids, b); return;
    }
  }, true);
})();
