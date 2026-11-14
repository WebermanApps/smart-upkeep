/* Sets --bbm-under to the visible sticky/fixed bottom bar height so
   bbm-reveal.css can tuck Built by Machan behind it. */
(function(){
  var SEL=".hm-tabs.hm-dock,.ob-bar,nav.mbar,#bar.bar,nav.tabs";

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

  function apply(){
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
  }
  var tmr;
  function kick(){ clearTimeout(tmr); tmr=setTimeout(apply, 40); }
  function ready(){
    apply();
    window.addEventListener("resize", kick);
    window.addEventListener("orientationchange", kick);
    window.addEventListener("scroll", kick, {passive:true});
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
