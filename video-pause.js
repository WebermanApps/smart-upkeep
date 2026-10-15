/* Tap-to-pause + pause/play and speaker (unmute) buttons, for the main video (#explainer, #v). Max 20:34 ICT Oct 15: moved off the picture into a slim top strip, play/pause top-left, speaker beside it, arrow still points at the speaker; X stays top-right.
   Max Oct 15 19:04: saffron "Sound" arrow points at the speaker; hides on unmute or after ~6s. */
(function () {
  var PAUSE = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#171717"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#171717"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#171717"/></svg>';
  var SPK_ON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="#171717"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="#171717"/><path d="M16 9l5 6M21 9l-5 6" stroke="#C1502E" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var css = document.createElement("style");
  css.textContent = ".vp-wrap{position:relative;display:block;line-height:0;padding-top:46px}.vp-wrap>video{cursor:pointer}.vp-bar{position:absolute;left:4px;top:3px;z-index:5;display:flex;align-items:center;gap:8px;line-height:1}.vp-btn{position:relative;z-index:5;width:40px;height:40px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);box-shadow:0 1px 4px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}.vp-btn:focus-visible{outline:3px solid #C1502E;outline-offset:2px}.vp-arrow{display:flex;align-items:center;gap:4px;color:#D4A017;font:700 15px Hind,sans-serif;letter-spacing:.04em;text-shadow:none;pointer-events:none;animation:vpb 1s ease-in-out infinite}.vp-arrow[hidden]{display:none}.vp-arrow svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}@keyframes vpb{0%,100%{transform:translateX(0)}50%{transform:translateX(-6px)}}@media(prefers-reduced-motion:reduce){.vp-arrow{animation:none}}";
  document.head.appendChild(css);
  function setup(v) {
    if (!v || v.__vp) return; v.__vp = 1;
    v.setAttribute("playsinline", ""); v.playsInline = true; v.setAttribute("webkit-playsinline", "");
    var w = document.createElement("div"); w.className = "vp-wrap";
    v.parentNode.insertBefore(w, v); w.appendChild(v);
    var bar = document.createElement("div"); bar.className = "vp-bar"; w.appendChild(bar);
    var b = document.createElement("button"); b.type = "button"; b.className = "vp-btn"; bar.appendChild(b);
    var s = document.createElement("button"); s.type = "button"; s.className = "vp-btn vp-snd"; bar.appendChild(s);
    var ar = document.createElement("span"); ar.className = "vp-arrow"; ar.setAttribute("aria-hidden", "true");
    ar.innerHTML = '<svg viewBox="0 0 28 16" width="28" height="16"><path d="M27 8H4M10 2L3 8l7 6" fill="none" stroke="#D4A017" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Sound</span>';
    ar.hidden = true; bar.appendChild(ar);
    var arT = null;
    function hideArrow() { ar.hidden = true; if (arT) { clearTimeout(arT); arT = null; } }
    function showArrow() { if (!v.muted) return; ar.hidden = false; if (arT) clearTimeout(arT); arT = setTimeout(hideArrow, 6000); }
    function syncS() { s.innerHTML = v.muted ? SPK_OFF : SPK_ON; s.setAttribute("aria-label", v.muted ? "Unmute video" : "Mute video"); if (!v.muted) hideArrow(); }
    v.addEventListener("volumechange", syncS);
    v.addEventListener("playing", function () { if (v.muted && !v.__vpArrowShown) { v.__vpArrowShown = 1; showArrow(); } });
    v.addEventListener("emptied", function () { v.__vpArrowShown = 0; });
    s.addEventListener("click", function (e) { e.stopPropagation(); v.muted = !v.muted; if (!v.muted && v.volume === 0) v.volume = 1; if (!v.muted && v.paused) { var r = v.play(); if (r && r.catch) r.catch(function () {}); } syncS(); });
    function sync() { var p = v.paused || v.ended; b.innerHTML = p ? PLAY : PAUSE; b.setAttribute("aria-label", p ? "Play video" : "Pause video"); }
    function toggle() { if (v.paused || v.ended) { var r = v.play(); if (r && r.catch) r.catch(function () {}); } else v.pause(); }
    ["play", "pause", "ended", "playing", "loadedmetadata"].forEach(function (e) { v.addEventListener(e, sync); });
    b.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    var down = null, handledAt = 0;
    function tapToggle(was) { setTimeout(function () { if (v.paused === was) toggle(); }, 60); }
    v.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY, t: Date.now(), was: v.paused, type: e.pointerType }; });
    /* touch: native controls on mobile swallow the click, so toggle on a short tap */
    v.addEventListener("pointerup", function (e) {
      if (!down || down.type === "mouse") return;
      var d = down; down = null;
      if (Math.abs(e.clientX - d.x) > 12 || Math.abs(e.clientY - d.y) > 12 || Date.now() - d.t > 600) return;
      handledAt = Date.now(); tapToggle(d.was);
    });
    v.addEventListener("click", function (e) {
      e.stopPropagation();
      if (Date.now() - handledAt < 700) return;
      var was = down ? down.was : v.paused; down = null;
      /* native controls may already toggle on click; only toggle if state didn't change */
      tapToggle(was);
    });
    sync(); syncS();
  }
  function init() { setup(document.getElementById("explainer")); setup(document.getElementById("v")); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
