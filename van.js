/* Shared header van (Oct 17 2026): ONE source for the white logo van used on the home page and the member app.
   SUVan.mount(bar, base) puts the road + van into a header (or fills existing empty spans); SUVan.play(bar, logo, right) parks it in the gap left of
   the logo and runs the cross: in from the right, pause while the tech waves, off to the left. Static wheels; reduced motion skips (CSS hides it too). */
(function () {
  var CSS = '.hdr-van{position:absolute;left:0;bottom:3px;pointer-events:none;z-index:0;transform:translateX(calc(100vw + 10px))}\n.hdr-van svg{display:block;transform:scaleX(-1);transform-origin:50% 90%}\n.hdr-van image{transform-box:fill-box;transform-origin:center;transform:scaleX(-1)}\n.hdr-van .vw{animation:none!important;transform:none!important}\n.hdr-van .tech{opacity:0}\n.hdr-van .arm{transform-origin:48.6px 10.8px;transform-box:view-box}\n.hdr-road{position:absolute;left:0;right:0;bottom:0;height:2px;pointer-events:none;opacity:0;z-index:0;background:repeating-linear-gradient(90deg,#C1502E 0 10px,transparent 10px 18px);clip-path:inset(0 0 0 100%)}\n.hdr-van.vcross{animation:vanCross2 4.3s linear forwards}\n@keyframes vanCross2{0%{transform:translateX(calc(100vw + 10px));animation-timing-function:cubic-bezier(.15,.7,.3,1)}18.6%{transform:translateX(var(--park,20px));animation-timing-function:linear}76.7%{transform:translateX(var(--park,20px));animation-timing-function:cubic-bezier(.55,0,.85,.4)}100%{transform:translateX(-120px)}}\n.hdr-van.vcross svg{animation:vanCrossBody2 4.3s linear forwards}\n@keyframes vanCrossBody2{0%,15%{transform:scaleX(-1)}19%{transform:scaleX(-1) scale(1.05,.93)}24%{transform:scaleX(-1) scale(.99,1.02)}28%,77%{transform:scaleX(-1)}81%{transform:scaleX(-1) rotate(-4deg)}88%,100%{transform:scaleX(-1)}}\n.hdr-van.vcross .tech{animation:techCross2 4.3s linear forwards}\n@keyframes techCross2{0%,54%{opacity:0}58%,100%{opacity:1}}\n.hdr-van.vcross .arm{animation:techWave .3s ease-in-out 2.5s infinite alternate}\n@keyframes techWave{from{transform:rotate(-28deg)}to{transform:rotate(22deg)}}\n.hdr-road.vcross{animation:roadCross2 4.3s ease-out forwards}\n@keyframes roadCross2{0%{opacity:.9;clip-path:inset(0 0 0 100%)}18.6%{opacity:.9;clip-path:inset(0 0 0 0)}77%{opacity:.8;clip-path:inset(0 0 0 0)}100%{opacity:0;clip-path:inset(0 0 0 0)}}\n@media (prefers-reduced-motion:reduce){.hdr-van,.hdr-road{display:none!important}}';
  function svg(B) { return '<svg viewBox="0 0 64 36" overflow="visible" width="84" height="47" fill="none" stroke="#3a2a20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse class="vshadow" cx="31" cy="32" rx="28" ry="1.7" fill="rgba(40,30,20,.16)" stroke="none"/><g class="vbody"><path class="vb" d="M4 26.5V9.6c0-1.4 1-2.3 2.4-2.3h31.8l.2 19.4z" fill="#ffffff"/><path d="M38.3 11.5h9.6c1.3 0 2.2.5 2.9 1.5l5.6 7.4c.6.8.8 1.6.8 2.6v3.6H38.4z" fill="#ffffff"/><path d="M41 14.2h7.4l3.9 5.4H41z" fill="#05668D" stroke-width="1.4"/><path d="M4.9 23.6h51.8" stroke="#C1502E" stroke-width="2.2" stroke-linecap="butt"/><image href="'+B+'assets/A-roof-chevron-transparent.svg?v=c7" x="5.2" y="8.6" width="32" height="12.8" preserveAspectRatio="xMidYMid meet"/><path d="M56.4 21.6h1.6" stroke-width="1.4"/><g class="tech"><path d="M44.2 11.4c.2-1.6 1.6-2.7 3.4-2.6" stroke-width="1.3"/><circle cx="46.6" cy="7.6" r="2.5" fill="#fff" stroke-width="1.3"/><path d="M44 6.4c.4-1.9 4.6-2.2 5.2.1l1.6.3" stroke="#C1502E" stroke-width="1.5" fill="#C1502E"/><circle cx="47.4" cy="7.7" r=".35" fill="#0a0a0a" stroke="none"/><g class="arm"><path d="M48.6 10.8l3.6-4.4" stroke-width="1.3"/><circle cx="52.6" cy="5.8" r="1" fill="#fff" stroke-width="1.1"/></g></g></g><g class="vw"><circle cx="15" cy="27.4" r="4.1" fill="#3a2a20"/><circle cx="15" cy="27.4" r="1.5" fill="#ffffff" stroke="none"/></g><g class="vw"><circle cx="47" cy="27.4" r="4.1" fill="#3a2a20"/><circle cx="47" cy="27.4" r="1.5" fill="#ffffff" stroke="none"/></g></svg>'; }
  function css() { if (document.getElementById("suvan-css")) return; var s = document.createElement("style"); s.id = "suvan-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(bar, base) {
    css(); var B = base || "";
    var rd = bar.querySelector(".hdr-road"); if (!rd) { rd = document.createElement("span"); rd.className = "hdr-road"; rd.setAttribute("aria-hidden", "true"); bar.insertBefore(rd, bar.firstChild); }
    var v = bar.querySelector(".hdr-van"); if (!v) { v = document.createElement("span"); v.className = "hdr-van"; v.setAttribute("aria-hidden", "true"); bar.insertBefore(v, rd.nextSibling); }
    if (!v.querySelector("svg")) v.innerHTML = svg(B);
    return { van: v, road: rd };
  }
  function place(bar, logo, right, v) {
    if (!bar || !logo || !v) return false;
    var r = bar.getBoundingClientRect(), br = logo.getBoundingClientRect();
    var g0 = 12, g1 = br.left - r.left - 10, room = g1 - g0; if (room < 44) return false;
    var s = v.querySelector("svg"), w = Math.min(84, room);
    s.setAttribute("width", Math.round(w)); s.setAttribute("height", Math.round(w * 36 / 64));
    v.style.setProperty("--park", Math.round(g0 + (room - w) / 2) + "px");
    return true;
  }
  function play(bar, logo, right) {
    var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; if (rm) return false;
    var v = bar.querySelector(".hdr-van"), rd = bar.querySelector(".hdr-road");
    if (!place(bar, logo, right, v)) return false;
    v.classList.remove("vcross"); if (rd) rd.classList.remove("vcross"); void v.offsetWidth;
    v.classList.add("vcross"); if (rd) rd.classList.add("vcross");
    return true;
  }
  window.SUVan = { mount: mount, play: play, place: place };
})();
