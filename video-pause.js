/* Tap-to-pause + visible pause/play button for main V4 video (#explainer, #v). */
(function () {
  var PAUSE = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#171717"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#171717"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#171717"/></svg>';
  var css = document.createElement("style");
  css.textContent = ".vp-wrap{position:relative;display:block;line-height:0}.vp-wrap>video{cursor:pointer}.vp-btn{position:absolute;top:10px;left:10px;z-index:5;width:52px;height:52px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}.vp-btn:focus-visible{outline:3px solid #C1502E;outline-offset:2px}";
  document.head.appendChild(css);
  function setup(v) {
    if (!v || v.__vp) return; v.__vp = 1;
    v.setAttribute("playsinline", ""); v.playsInline = true; v.setAttribute("webkit-playsinline", "");
    var w = document.createElement("div"); w.className = "vp-wrap";
    v.parentNode.insertBefore(w, v); w.appendChild(v);
    var b = document.createElement("button"); b.type = "button"; b.className = "vp-btn"; w.appendChild(b);
    function sync() { var p = v.paused || v.ended; b.innerHTML = p ? PLAY : PAUSE; b.setAttribute("aria-label", p ? "Play video" : "Pause video"); }
    function toggle() { if (v.paused || v.ended) { var r = v.play(); if (r && r.catch) r.catch(function () {}); } else v.pause(); }
    ["play", "pause", "ended", "playing", "loadedmetadata"].forEach(function (e) { v.addEventListener(e, sync); });
    b.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    var before = null;
    v.addEventListener("pointerdown", function () { before = v.paused; });
    v.addEventListener("click", function (e) {
      e.stopPropagation();
      var was = before === null ? v.paused : before; before = null;
      /* native controls may already toggle on click; only toggle if state didn't change */
      setTimeout(function () { if (v.paused === was) toggle(); }, 0);
    });
    sync();
  }
  function init() { setup(document.getElementById("explainer")); setup(document.getElementById("v")); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
