/* Onboarding house build (Machan Nov 13 7:44 PM; Home Build Motion & Map Deck picks 11:25 PM).
   One band above the step title on every onboarding step. Step 1 uses a taller (~2x) line-art map of Michigan
   (Lower Peninsula and Upper Peninsula), with Wayne, Oakland and Macomb highlighted and pin dots. Other steps keep the 120px house band.
   Step 2 on: one inline SVG house that updates live from the saved onboarding answers: Floors Stack On for stories, Pop In for each system or extra,
   Reveal on the last step. Transform and opacity only, 200-300ms, each change plays once (no loops). prefers-reduced-motion: Quick Fade (opacity only, ~150ms).
   With the phone keyboard open (visualViewport), the band shrinks to a mini strip so the field stays in view.
   Nothing here reads or writes prices, and nothing is sent anywhere. State comes from app.js (window.suHouseState), so it persists with the onboarding state. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MAP = '<svg class="hb-map-svg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of Michigan, highlighting Wayne, Oakland and Macomb counties"><g fill="#FBF8F2" stroke="#D3CABD" stroke-width=".9" stroke-linejoin="round"><path d="M246.0 210.8L215.8 212.0L215.8 209.9L170.9 209.9L175.4 205.8L181.3 194.4L183.4 188.4L184.6 179.8L184.1 170.4L177.5 152.2L179.6 145.3L178.1 137.0L183.2 128.5L184.3 121.5L183.6 117.7L187.3 116.1L187.8 110.9L193.5 109.6L197.9 103.9L197.5 115.3L199.8 115.8L202.8 110.1L202.9 100.4L204.7 98.0L210.8 96.5L208.9 89.7L212.9 84.0L217.9 83.7L223.5 87.3L229.0 87.8L231.7 92.3L235.9 92.7L242.8 96.8L245.3 96.6L249.0 103.4L246.0 107.0L248.9 111.6L250.0 117.0L248.7 128.7L244.2 131.6L243.1 137.7L237.7 139.7L234.8 147.0L235.9 149.7L241.2 152.3L245.4 148.4L250.3 140.3L257.9 137.2L261.7 139.6L264.0 144.1L266.7 163.7L269.2 171.6L266.9 183.0L263.2 184.8L263.1 180.6L260.6 181.8L257.8 191.3L253.3 194.9L252.0 202.2L246.3 208.2L246.0 210.8ZM200.2 84.9L200.6 88.7L197.6 89.4L198.9 84.0L200.2 84.9ZM153.8 104.9L150.4 101.6L152.5 97.2L147.2 96.5L149.3 92.2L149.5 86.6L144.9 82.8L142.3 78.9L132.8 75.8L129.9 76.8L120.4 72.1L97.4 65.8L95.0 60.4L90.8 58.5L99.5 55.2L103.4 51.5L113.2 49.9L119.5 45.2L122.4 45.1L124.9 41.8L131.8 37.1L135.4 33.2L140.6 30.6L145.6 32.8L134.8 45.8L134.9 51.6L139.2 47.1L146.9 47.8L152.8 50.9L158.2 59.6L161.1 61.1L166.8 59.7L168.1 61.6L173.7 62.7L185.7 55.4L200.2 55.1L205.8 52.7L210.1 52.5L210.9 61.3L215.3 62.5L219.7 61.1L221.6 63.2L224.5 60.6L231.0 59.7L231.1 70.8L234.0 75.4L238.4 76.6L238.9 73.5L243.2 73.5L245.5 76.8L243.5 79.2L231.3 77.1L225.5 78.5L219.1 74.7L217.3 78.2L218.1 81.1L215.3 80.4L211.2 76.1L204.0 73.5L200.3 73.4L196.8 77.5L190.9 78.5L184.6 77.7L182.0 79.4L181.4 82.8L174.4 85.8L174.8 81.6L171.8 80.8L170.5 85.1L165.4 85.3L163.1 87.2L159.7 94.6L153.3 104.1L153.8 104.9ZM126.7 14.2L121.1 18.2L118.2 18.7L118.4 15.4L132.5 8.0L129.8 13.2L126.7 14.2Z"/></g><g fill="rgba(193,80,46,.14)" stroke="#C1502E" stroke-width="1.4" stroke-linejoin="round"><path data-county="Macomb" d="M253.8 174.4L261.9 174.1L262.1 180.1L262.7 180.7L261.5 181.7L260.4 181.9L260.1 183.0L261.2 183.7L260.9 183.7L261.0 184.6L259.8 184.5L259.0 185.8L258.7 187.4L259.0 188.2L254.2 188.3L253.8 174.4Z"/><path data-county="Wayne" d="M243.8 188.7L259.0 188.2L258.7 189.6L257.7 191.1L254.4 192.7L253.3 194.9L253.1 196.9L253.4 198.4L253.2 199.5L251.8 199.9L251.8 201.1L251.0 200.8L249.5 199.4L244.1 199.7L243.8 188.7Z"/><path data-county="Oakland" d="M240.7 174.9L253.8 174.4L254.2 188.3L253.7 188.3L241.3 188.8L240.7 174.9Z"/></g><g font-family="Khand,sans-serif" font-weight="600" font-size="8" fill="#2A241C" text-anchor="middle"><g class="hb-pin"><path d="M257.6 179.3L255.2 175.3A2.8 2.8 0 1 1 260.0 175.3Z" fill="#C1502E"/><circle cx="257.6" cy="173.7" r="1.1" fill="#FFFCF7"/></g><g class="hb-pin"><path d="M249.8 192.3L247.4 188.3A2.8 2.8 0 1 1 252.2 188.3Z" fill="#C1502E"/><circle cx="249.8" cy="186.7" r="1.1" fill="#FFFCF7"/></g><g class="hb-pin"><path d="M247.5 180.4L245.1 176.4A2.8 2.8 0 1 1 249.9 176.4Z" fill="#C1502E"/><circle cx="247.5" cy="174.8" r="1.1" fill="#FFFCF7"/></g></g></svg>';
  var INK = "#2A241C", LINE = "#C9BFB1", WALL = "#FDFAF4", ROOF = "#C1502E", ROOF_DK = "#A8431F", GLASS = "#D9E4E8", METAL = "#C9D0D3", APPL = "#D9D4CC", PLANT = "#5E9160";
  var FH = 20, GY = 94, X0 = 118, X1 = 242;
  function win(x, y) { return '<rect x="' + x + '" y="' + y + '" width="12" height="9" rx="1" fill="' + GLASS + '" stroke="' + LINE + '" stroke-width=".8"/><path d="M' + (x + 6) + ' ' + y + 'v9M' + x + ' ' + (y + 4.5) + 'h12" stroke="' + LINE + '" stroke-width=".6"/>'; }
  function floor(n) {
    var top = GY - FH * n, s = '<rect x="' + X0 + '" y="' + top + '" width="' + (X1 - X0) + '" height="' + FH + '" fill="' + WALL + '" stroke="' + LINE + '" stroke-width="1"/>';
    if (n === 1) return s + '<rect x="' + X0 + '" y="' + (GY - 3) + '" width="' + (X1 - X0) + '" height="3" fill="#E9E0D2"/><rect x="196" y="79" width="10" height="15" rx="1.2" fill="#5A5248"/><rect x="203.2" y="86" width="1.3" height="1.3" fill="#E8E0D2"/>' + win(222, 78);
    return s + win(130, top + 5) + win(160, top + 5) + win(192, top + 5) + win(222, top + 5);
  }
  function badge(x, y) { return '<g class="hb-it hb-badge" data-k="__K__" style="display:none"><circle cx="' + x + '" cy="' + y + '" r="4.6" fill="' + ROOF + '"/><text x="' + x + '" y="' + (y + 2.3) + '" font-family="Hind,sans-serif" font-weight="600" font-size="6.4" fill="#fff" text-anchor="middle"></text></g>'; }
  function it(k, inner) { return '<g class="hb-it" data-k="' + k + '" style="display:none">' + inner + '</g>'; }
  function furnace(x) { return '<rect x="' + x + '" y="79" width="12" height="15" rx="1" fill="#D7D0C6" stroke="' + INK + '" stroke-width=".7"/><rect x="' + (x + 2) + '" y="81" width="8" height="4.5" fill="#EEE8DE"/><rect x="' + (x + 3) + '" y="88" width="6" height="1.6" fill="' + LINE + '"/>'; }
  function tank(x) { return '<rect x="' + x + '" y="78" width="9" height="16" rx="3" fill="' + APPL + '" stroke="' + INK + '" stroke-width=".7"/><rect x="' + (x + 2) + '" y="81" width="5" height="2.6" fill="' + LINE + '"/>'; }
  function tankless(x) { return '<rect x="' + x + '" y="80" width="9" height="11" rx="1" fill="' + APPL + '" stroke="' + INK + '" stroke-width=".7"/><path d="M' + (x + 2.5) + ' 83h4M' + (x + 2.5) + ' 85.5h4M' + (x + 2.5) + ' 88h4" stroke="' + INK + '" stroke-width=".6"/>'; }
  function ac(x) { return '<rect x="' + x + '" y="82" width="16" height="12" rx="1" fill="' + METAL + '" stroke="' + INK + '" stroke-width=".7"/><circle cx="' + (x + 8) + '" cy="88" r="3.6" fill="none" stroke="' + INK + '" stroke-width=".8"/><circle cx="' + (x + 8) + '" cy="88" r="1.2" fill="' + INK + '"/>'; }
  function spark(x, y, r) { return '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r * .3) + ' ' + (y - r * .3) + 'L' + (x + r) + ' ' + y + 'L' + (x + r * .3) + ' ' + (y + r * .3) + 'L' + x + ' ' + (y + r) + 'L' + (x - r * .3) + ' ' + (y + r * .3) + 'L' + (x - r) + ' ' + y + 'L' + (x - r * .3) + ' ' + (y - r * .3) + 'Z" fill="#E0A458"/>'; }
  function houseSvg() {
    var roofY = GY - FH; /* roof drawn for 1 story; lifted by translateY for 2 and 3 */
    var roof = '<g class="hb-roof">' +
      it("chimney", '<rect x="205" y="55" width="9" height="13" fill="#B9A89A" stroke="' + INK + '" stroke-width=".6"/><rect x="204" y="54" width="11" height="3" fill="#9C8B7D"/>') +
      '<path d="M' + (X0 - 7) + ' ' + (roofY + 1) + 'L180 ' + (roofY - 19) + 'L' + (X1 + 7) + ' ' + (roofY + 1) + 'Z" fill="' + ROOF + '"/>' +
      '<path d="M' + (X0 - 8) + ' ' + (roofY + 1.5) + 'L180 ' + (roofY - 20.5) + 'L' + (X1 + 8) + ' ' + (roofY + 1.5) + '" fill="none" stroke="' + ROOF_DK + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
      it("gutters", '<path d="M' + (X0 - 8) + ' ' + (roofY + 2.6) + 'h' + (X1 - X0 + 16) + '" stroke="#7E776C" stroke-width="1.8" stroke-linecap="round"/><path d="M' + (X0 - 7) + ' ' + (roofY + 2.6) + 'v5M' + (X1 + 7) + ' ' + (roofY + 2.6) + 'v5" stroke="#7E776C" stroke-width="1.3" stroke-linecap="round"/>') +
      it("lights", '<path d="M' + (X0 - 4) + ' ' + (roofY + 4) + 'Q150 ' + (roofY + 8) + ' 180 ' + (roofY + 4) + 'T' + (X1 + 4) + ' ' + (roofY + 4) + '" fill="none" stroke="' + INK + '" stroke-width=".5" opacity=".6"/>' +
        [124, 138, 152, 166, 180, 194, 208, 222, 236].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (roofY + 5.6 + (i % 2) * 1.2) + '" r="1.5" fill="' + ["#C1502E", "#E0A458", "#05668D"][i % 3] + '"/>'; }).join("")) +
      '</g>';
    return '<svg class="hb-house-svg" viewBox="0 0 360 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect x="-400" y="-200" width="1160" height="' + (200 + GY) + '" fill="#F8F2E9"/><rect x="-400" y="' + GY + '" width="1160" height="80" fill="#EFE6D8"/><ellipse cx="180" cy="' + (GY + 2) + '" rx="100" ry="4.5" fill="#E6DAC7"/>' +
      it("irrigation", '<g fill="none" stroke="#7A9AA3" stroke-width=".8" stroke-linecap="round"><path d="M10 92q4-9 10-9M14 92q3-6 8-6M28 92q3-8 9-8"/></g><rect x="9" y="92" width="2.4" height="3" fill="#7E776C"/><rect x="27" y="92" width="2.4" height="3" fill="#7E776C"/>') +
      it("testkit", '<rect x="38" y="84" width="8" height="10" rx="1" fill="#E8E2D8" stroke="' + INK + '" stroke-width=".6"/><rect x="39.6" y="86" width="4.8" height="3" fill="#B8C4C0"/>') +
      it("sumpbackup", '<rect x="50" y="84" width="8" height="10" rx="1" fill="#B8C4C0" stroke="' + INK + '" stroke-width=".6"/><rect x="51.6" y="86" width="4.8" height="2.6" fill="#EFE8DC"/><path d="M53 82.6h2" stroke="' + INK + '" stroke-width="1"/>') +
      it("sump", '<ellipse cx="69" cy="93.5" rx="8" ry="2.6" fill="#C5BEB3" stroke="' + INK + '" stroke-width=".6"/><rect x="66" y="85" width="6" height="8" rx="1" fill="#B7B1A6" stroke="' + INK + '" stroke-width=".6"/>') +
      it("flatroof", '<rect x="82" y="78" width="36" height="16" fill="' + WALL + '" stroke="' + LINE + '" stroke-width="1"/><rect x="80" y="75.5" width="40" height="3" rx=".6" fill="#9A8F84"/>' + win(94, 81)) +
      '<g class="hb-fl" data-f="3" style="display:none">' + floor(3) + '</g><g class="hb-fl" data-f="2" style="display:none">' + floor(2) + '</g><g class="hb-fl" data-f="1">' + floor(1) + '</g>' +
      roof +
      it("bathfan", '<rect x="236" y="77" width="4.5" height="4.5" fill="#EEE8DE" stroke="' + INK + '" stroke-width=".5"/><path d="M237 78.5h2.5M237 80h2.5" stroke="' + INK + '" stroke-width=".4"/>') +
      it("windows", spark(236.5, 85, 2.6) + spark(219, 77, 1.8)) +
      it("doorbell", '<rect x="207.6" y="84" width="2" height="3.2" rx=".5" fill="' + INK + '"/><circle cx="208.6" cy="85" r=".5" fill="#E0A458"/>') +
      it("thermostat", '<circle cx="214.5" cy="84" r="2.4" fill="#FFFCF7" stroke="' + INK + '" stroke-width=".6"/><circle cx="214.5" cy="84" r=".8" fill="' + ROOF + '"/>') +
      it("leak", '<path d="M215 88.2c1.3 1.7 2 2.7 2 3.6a2 2 0 0 1-4 0c0-.9.7-1.9 2-3.6z" fill="#05668D"/>') +
      it("bibs", '<rect x="242.5" y="85" width="4.5" height="4.5" rx=".8" fill="#B9B3A8" stroke="' + INK + '" stroke-width=".5"/>') +
      it("f1", furnace(121)) + it("f2", furnace(135)) + badge(146, 79).replace("__K__", "fn") +
      it("w1t", tank(150)) + it("w1k", tankless(150)) + it("w2t", tank(161)) + it("w2k", tankless(161)) + badge(169, 79).replace("__K__", "wn") +
      it("softener", '<rect x="173" y="80" width="8" height="14" rx="3.5" fill="#D5D0C8" stroke="' + INK + '" stroke-width=".7"/><circle cx="177" cy="84.5" r="1.2" fill="' + LINE + '"/>') +
      it("humidifier", '<rect x="184" y="80" width="9" height="10" rx="1" fill="#D3CEC6" stroke="' + INK + '" stroke-width=".6"/><path d="M187 82.5c1.8 1.6 1.8 3.4 0 5" fill="none" stroke="#7A9AA3" stroke-width=".8" stroke-linecap="round"/>') +
      '<g fill="' + PLANT + '"><ellipse cx="115" cy="93" rx="4" ry="2.6"/><ellipse cx="248.5" cy="93.4" rx="3.4" ry="2.2"/></g>' +
      it("a1", ac(252)) + it("a2", ac(270)) + badge(285, 82).replace("__K__", "an") +
      it("generator", '<rect x="290" y="82" width="18" height="12" rx="1" fill="#C5C8C2" stroke="' + INK + '" stroke-width=".7"/><rect x="292" y="85" width="6" height="6" fill="#A8ABA6"/><circle cx="304" cy="88" r="2" fill="' + INK + '" opacity=".35"/>') +
      it("mower", '<rect x="313" y="86" width="13" height="5" rx="1.4" fill="#9FB39A" stroke="' + INK + '" stroke-width=".6"/><path d="M324 86l3.6-6.4" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round"/><circle cx="315.6" cy="92.4" r="1.6" fill="' + INK + '"/><circle cx="323.4" cy="92.4" r="1.6" fill="' + INK + '"/>') +
      it("snowblower", '<rect x="332" y="84" width="12" height="8" rx="1.4" fill="#D9C27A" stroke="' + INK + '" stroke-width=".6"/><path d="M332 86.5h-2.6v5h2.6M342 84l3-5" fill="none" stroke="' + INK + '" stroke-width=".8" stroke-linecap="round"/><circle cx="338" cy="93" r="1.6" fill="' + INK + '"/>') +
      it("generic", '<path d="M351 94V80" stroke="#7E776C" stroke-width="1"/><path d="M351 80h7l-1.8 2.6L358 85h-7z" fill="' + ROOF + '"/>') +
      '</svg>';
  }
  /* Label rules: one shared selection (extras and add-ons) maps to one item on the house. */
  var LABEL_MAP = [[/flat roof/, "flatroof"], [/gutter/, "gutters"], [/chimney/, "chimney"], [/generator/, "generator"], [/irrigation|sprinkler/, "irrigation"],
    [/sump pump battery|battery backup/, "sumpbackup"], [/sump/, "sump"], [/humidifier/, "humidifier"], [/softener/, "softener"], [/window/, "windows"],
    [/christmas|lights/, "lights"], [/leak/, "leak"], [/bath fan/, "bathfan"], [/thermostat/, "thermostat"], [/mower/, "mower"], [/snowblower/, "snowblower"],
    [/hose bib/, "bibs"], [/doorbell/, "doorbell"], [/radon|lead|water test/, "testkit"]];
  function itemsOf(st) {
    var on = {}, n;
    n = Math.max(0, +st.furnaces || 0); if (n > 0) on.f1 = 1; if (n > 1) on.f2 = 1; if (n > 2) on.fn = n;
    n = Math.max(0, +st.acs || 0); if (n > 0) on.a1 = 1; if (n > 1) on.a2 = 1; if (n > 2) on.an = n;
    var wt = st.wh || []; if (wt.length > 0) on[wt[0] === "tankless" ? "w1k" : "w1t"] = 1; if (wt.length > 1) on[wt[1] === "tankless" ? "w2k" : "w2t"] = 1; if (wt.length > 2) on.wn = wt.length;
    (st.labels || []).forEach(function (l) {
      var s = String(l || "").toLowerCase(), k = "generic";
      for (var i = 0; i < LABEL_MAP.length; i++) if (LABEL_MAP[i][0].test(s)) { k = LABEL_MAP[i][1]; break; }
      on[k] = 1;
    });
    return on;
  }
  function cap(st) {
    var n = Math.max(1, Math.min(3, +st.stories || 1));
    var size = String(st.sizeLabel || "").replace(/\bto\b/g, "To").replace(/\bover\b/i, "Over").replace(/\bunder\b/i, "Under");
    return (n === 1 ? "1 Story" : n + " Stories") + (size ? " \u00b7 " + size : "");
  }
  var band = null, last = null, lastScreen = null;
  function el(sel) { return band.querySelector(sel); }
  function build() {
    band = document.createElement("div");
    band.className = "ob-hb";
    band.innerHTML = '<div class="ob-hb-art"><div class="ob-hb-map">' + MAP + '</div><div class="ob-hb-house">' + houseSvg() + '</div></div><p class="ob-hb-cap" aria-live="polite"></p>';
  }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function anim(node, frames, ms, easing, after, hold) {
    if (node._hbA) { try { node._hbA.cancel(); } catch (e) {} node._hbA = null; }
    if (!node.animate) { if (after) after(); return; }
    var a = node.animate(frames, { duration: ms, easing: easing || "cubic-bezier(.2,.8,.2,1)", fill: hold ? "forwards" : "none" }), done = false;
    node._hbA = a;
    function end() { if (done) return; done = true; if (node._hbA === a) node._hbA = null; if (after) after(); if (hold) { try { a.cancel(); } catch (e) {} } }
    a.onfinish = end;
    a.oncancel = function () { done = true; };
    /* fallback so a hidden layer is always cleared, even if the finish event never arrives */
    if (after) setTimeout(function () { if (!done && node._hbA === a) end(); }, ms + 120);
    return a;
  }
  var EASE_POP = "cubic-bezier(.3,1.4,.5,1)";
  function show(node, on, animate, rm) {
    var vis = node.style.display !== "none";
    if (on === vis && !node._hbHiding) return false;
    if (!on && node._hbHiding) return false;
    if (on) {
      node._hbHiding = false; node.style.display = "";
      if (animate) {
        if (rm) anim(node, [{ opacity: 0 }, { opacity: 1 }], 150, "linear");
        else anim(node, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.22)", offset: .62 }, { opacity: 1, transform: "scale(1)" }], 280, EASE_POP);
      } else if (node._hbA) { node._hbA.cancel(); node._hbA = null; }
    } else {
      if (!animate) { node.style.display = "none"; node._hbHiding = false; return true; }
      node._hbHiding = true;
      anim(node, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.4)" }], rm ? 150 : 200, rm ? "linear" : "ease-in",
        function () { if (node._hbHiding) { node.style.display = "none"; node._hbHiding = false; } }, true);
    }
    return true;
  }
  function roofY(n) { return -FH * (n - 1); }
  function applyStories(from, to, animate, rm) {
    var roof = el(".hb-roof");
    [2, 3].forEach(function (f) {
      var fl = el('.hb-fl[data-f="' + f + '"]'), on = f <= to, was = f <= from;
      if (on === was && !fl._hbHiding) { fl.style.display = on ? "" : "none"; return; }
      if (on) {
        fl._hbHiding = false; fl.style.display = "";
        if (animate) anim(fl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(-26px)" }, { opacity: 1, transform: "translateY(-8px)", offset: .55 }, { opacity: 1, transform: "translateY(0)" }], rm ? 150 : 280, rm ? "linear" : "cubic-bezier(.33,0,.2,1)");
      } else if (!animate) { fl.style.display = "none"; }
      else {
        fl._hbHiding = true;
        anim(fl, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-26px)" }], rm ? 150 : 260, rm ? "linear" : "cubic-bezier(.5,0,.75,0)",
          function () { if (fl._hbHiding) { fl.style.display = "none"; fl._hbHiding = false; } }, true);
      }
    });
    roof.style.transform = "translateY(" + roofY(to) + "px)";
    if (animate && from !== to) {
      if (rm) anim(roof, [{ opacity: 0 }, { opacity: 1 }], 150, "linear");
      else if (to > from) anim(roof, [{ transform: "translateY(" + (roofY(to) - 26) + "px)" }, { transform: "translateY(" + (roofY(to) - 8) + "px)", offset: .55 }, { transform: "translateY(" + roofY(to) + "px)" }], 280, "cubic-bezier(.33,0,.2,1)");
      else anim(roof, [{ transform: "translateY(" + roofY(from) + "px)" }, { transform: "translateY(" + (roofY(from) - 6) + "px)", offset: .3 }, { transform: "translateY(" + roofY(to) + "px)" }], 280, "cubic-bezier(.4,0,.2,1)");
    }
  }
  function sync(st) {
    var slot = document.querySelector(".ob .ob-hb-slot");
    if (!st || !slot) { if (band && band.parentNode) band.parentNode.removeChild(band); last = null; lastScreen = st ? st.screen : null; document.documentElement.classList.remove("ob-hb-on", "ob-hb-mini", "ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"); document.documentElement.removeAttribute("data-hb-fit"); return; }
    if (!band) build();
    var fresh = !last;
    if (band.parentNode !== slot) slot.appendChild(band);
    document.documentElement.classList.add("ob-hb-on");
    var rm = reduced(), animate = !fresh;
    var mode = st.screen === "address" ? "map" : "house";
    var prevMode = last ? last.mode : null;
    band.setAttribute("data-mode", mode);
    var mapEl = el(".ob-hb-map"), houseEl = el(".ob-hb-house");
    mapEl.setAttribute("aria-hidden", mode === "map" ? "false" : "true");
    if (animate && prevMode && prevMode !== mode) {
      var inEl = mode === "map" ? mapEl : houseEl, outEl = mode === "map" ? houseEl : mapEl;
      anim(inEl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], rm ? 150 : 280, rm ? "linear" : "cubic-bezier(.2,.8,.2,1)");
      anim(outEl, [{ opacity: 1 }, { opacity: 0 }], rm ? 150 : 240, "linear");
    }
    var stories = Math.max(1, Math.min(3, +st.stories || 1)), items = itemsOf(st);
    /* items and stories only animate while the house is on screen; switching from the map shows the current house as is */
    var live = animate && prevMode === "house" && mode === "house";
    applyStories(last ? last.stories : stories, stories, live, rm);
    band.querySelectorAll(".hb-it").forEach(function (g) {
      var k = g.getAttribute("data-k"), on = !!items[k], changed;
      if (g.classList.contains("hb-badge")) { var t = g.querySelector("text"), v = on ? String(items[k]) : ""; changed = t.textContent !== v && on && g.style.display !== "none"; if (on) t.textContent = v; show(g, on, live, rm); if (changed && live) anim(g, rm ? [{ opacity: .3 }, { opacity: 1 }] : [{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: .5 }, { transform: "scale(1)" }], rm ? 150 : 240, rm ? "linear" : EASE_POP); return; }
      show(g, on, live, rm);
    });
    el(".ob-hb-cap").textContent = mode === "map" ? "Wayne, Oakland And Macomb" : cap(st);
    /* Finish Reveal (deck pick B): the finished house fades and eases in once, when the last step of the sequence opens (st.last from app.js obSeq()). */
    var fin = st.last || "accept";
    if (mode === "house" && st.screen === fin && lastScreen !== fin) {
      anim(houseEl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(10px) scale(.97)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], rm ? 150 : 300, rm ? "linear" : "cubic-bezier(.2,.8,.2,1)");
    }
    last = { mode: mode, stories: stories };
    lastScreen = st.screen;
    kb();
    fit();
  }
  /* One screen with the band, in Machan's cut order: tighter question and answer sizing, then the step icon, then Did You Know.
     The house band is never shrunk. Measured with the full band (240px map on step 1, 120px house on later steps; the keyboard mini strip is ignored) and 8px of air above the Back/Next bar.
     Runs from sync() (before app.js binds the step) and again after bind, on font load and on resize. Reads layout only, no state. */
  /* Tried in order; the first that fits wins. The icon goes before Did You Know, but comes back if Did You Know has to drop anyway and there's room. */
  /* ob-hb-afx (hide the collapsed after-Founding line) is the very last resort. ob-hb-t2 is a last, deeper tightening for the few carts that still don't fit with every other cut (big homes on Plan, the heaviest Review). */
  var LV = ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"], TRY = [[], ["ob-hb-t"], ["ob-hb-t", "ob-hb-noart"], ["ob-hb-t", "ob-hb-nodyk"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk"],
    ["ob-hb-t", "ob-hb-nodyk", "ob-hb-t2"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"]];
  function setLv(on) { LV.forEach(function (c) { document.documentElement.classList.toggle(c, on.indexOf(c) >= 0); }); }
  var LEAF = /^(BUTTON|INPUT|SELECT|TEXTAREA|P|H1|H2|H3|LABEL|LI|IMG|svg)$/;
  function vis(c) { return !!c && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c); }
  function painted(cs) {
    if (vis(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== "none") || (cs.boxShadow && cs.boxShadow !== "none")) return true;
    return ["Top", "Right", "Bottom", "Left"].some(function (k) { return parseFloat(cs["border" + k + "Width"]) > 0 && cs["border" + k + "Style"] !== "none" && vis(cs["border" + k + "Color"]); });
  }
  function contentBottom(sec, bar) {
    var max = 0, clips = [];
    var all = sec.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.ownerSVGElement || (bar && bar.contains(e)) || (band && band.contains(e)) || e.classList.contains("ob-hb-slot")) continue;
      var cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      var r = e.getBoundingClientRect();
      if (r.height < 1 || r.width < 1) continue;
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll" || cs.overflowY === "hidden") && e.scrollHeight > e.clientHeight + 1) clips.push([e, r.bottom]);
      if (e.children.length && !LEAF.test(e.tagName) && !painted(cs)) continue; /* painted cards and boxes count by their own edge */
      var b = r.bottom;
      for (var j = 0; j < clips.length; j++) if (clips[j][0].contains(e)) b = Math.min(b, clips[j][1]);
      if (b > max) max = b;
    }
    return max;
  }
  function fitsNow(sec) {
    var bar = sec.querySelector(".ob-bar"), ih = window.innerHeight, se = document.scrollingElement || document.documentElement;
    var ok = true; if (window.suHouseRefit) { try { ok = window.suHouseRefit() !== false; } catch (x) {} }
    if (!ok || se.scrollHeight - ih > 0) return false;
    var bt = bar ? Math.min(ih, bar.getBoundingClientRect().top) : ih;
    return bt - contentBottom(sec, bar) >= 8;
  }
  function fit() {
    var html = document.documentElement, sec = document.querySelector("section.ob");
    if (!sec || !band || !band.parentNode || !html.classList.contains("ob-hb-on")) { LV.forEach(function (c) { html.classList.remove(c); }); return 0; }
    document.body.classList.add("on-ob", "on-qf"); /* app.js bind() sets these for every onboarding step; set them a beat early so the pre-bind check matches */
    var mini = html.classList.contains("ob-hb-mini"), n;
    if (mini) html.classList.remove("ob-hb-mini");
    for (n = 0; n < TRY.length; n++) {
      setLv(TRY[n]);
      if (fitsNow(sec)) break;
    }
    if (n >= TRY.length) n = TRY.length - 1;
    if (mini) html.classList.add("ob-hb-mini");
    html.setAttribute("data-hb-fit", TRY[n].join("+") || "none");
    return n;
  }
  var fitT = 0;
  function fitLater() { clearTimeout(fitT); fitT = setTimeout(function () { if (document.documentElement.classList.contains("ob-hb-mini")) return; fit(); }, 150); }
  /* Keyboard: same visualViewport reading as the Back/Next bar lift in app.js (hidden strip under the keyboard >= 80px). */
  var vv = window.visualViewport, queued = false;
  function kb() {
    queued = false;
    var on = false;
    if (vv && band && band.parentNode) on = Math.round(window.innerHeight - (vv.height + vv.offsetTop)) >= 80;
    document.documentElement.classList.toggle("ob-hb-mini", on);
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(kb); } }
  if (vv) { vv.addEventListener("resize", queue); vv.addEventListener("scroll", queue); }
  window.addEventListener("resize", queue);
  window.addEventListener("resize", fitLater);
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); }); } catch (x) {}
  window.suHouse = { sync: sync, itemsOf: itemsOf, fit: fit };
  if (window.suHouseState) sync(window.suHouseState());
})();
