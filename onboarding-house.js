/* Onboarding house build (Machan Nov 13 7:44 PM; Home Build Motion & Map Deck picks 11:25 PM).
   One band above the step title on every onboarding step, same position and size on every step.
   Step 1: line-art map of the three counties we cover (Wayne, Oakland, Macomb; US Census cb_2023_us_county_500k outlines, simplified), pin dots, still.
   Step 2 on: one inline SVG house that updates live from the saved onboarding answers: Floors Stack On for stories, Pop In for each system or extra,
   Reveal on the last step. Transform and opacity only, 200-300ms, each change plays once (no loops). prefers-reduced-motion: Quick Fade (opacity only, ~150ms).
   With the phone keyboard open (visualViewport), the band shrinks to a mini strip so the field stays in view.
   Nothing here reads or writes prices, and nothing is sent anywhere. State comes from app.js (window.suHouseState), so it persists with the onboarding state. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MAP = '<svg class="hb-map-svg" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of Wayne, Oakland and Macomb counties, Michigan"><g fill="#FBF8F2" stroke="#D3CABD" stroke-width=".8" stroke-linejoin="round"><path d="M196.8 -23.1L238.1 -24.8L239.5 -17.2L244.5 -7.6L245.1 -5.9L244.6 -4.9L245.6 -3.0L244.3 -0.2L242.1 2.7L240.9 7.1L240.9 11.2L239.8 16.1L241.0 21.4L237.4 32.4L237.5 35.5L236.8 38.2L231.7 43.7L231.3 45.0L229.5 45.6L227.9 44.6L226.4 44.9L223.4 48.6L223.3 47.1L226.0 44.4L224.8 43.3L223.0 44.8L222.8 44.3L222.1 44.4L223.7 42.1L224.8 41.8L225.2 40.6L223.5 40.0L221.5 41.3L220.5 40.0L221.5 39.0L222.7 39.0L223.6 38.3L222.5 36.7L224.5 37.0L224.2 35.5L224.4 35.2L224.8 35.7L225.5 34.0L226.7 35.2L227.4 35.0L228.0 32.3L227.0 31.2L225.5 31.5L223.3 29.7L221.1 30.0L219.7 28.4L220.0 28.1L219.2 27.7L218.3 6.0L197.9 6.4L196.8 -23.1Z"/><path d="M131.8 98.4L161.3 97.8L161.3 97.2L171.8 97.1L172.8 97.6L174.1 99.9L175.0 99.4L175.2 100.5L176.9 101.1L177.2 102.3L178.1 102.2L181.3 105.6L180.6 107.1L180.1 105.9L179.1 106.1L179.3 108.7L178.4 109.1L178.0 108.2L176.9 108.4L176.7 108.8L177.8 109.0L175.6 110.7L174.9 113.1L175.3 114.0L174.5 114.6L174.4 115.6L173.9 114.6L172.7 114.1L171.2 114.2L169.2 116.4L167.8 121.5L166.6 122.0L165.5 121.7L164.4 122.6L162.2 127.3L159.7 129.0L159.3 131.6L160.7 137.0L159.8 136.6L159.7 135.1L157.8 135.2L157.2 134.7L156.4 135.3L156.4 136.0L157.4 136.1L156.9 136.3L157.3 137.2L158.6 137.2L158.4 138.1L132.7 139.1L131.8 98.4Z"/><path d="M118.5 -30.6L158.0 -30.9L158.6 8.4L140.5 8.9L138.8 9.0L139.1 19.0L119.3 19.2L118.5 -30.6Z"/><path d="M158.0 -32.0L167.1 -32.3L166.9 -42.2L186.4 -42.7L186.6 -37.8L196.5 -37.9L197.9 6.4L197.3 6.4L158.6 7.9L158.0 -32.0Z"/><path d="M99.6 19.7L139.1 19.0L140.8 56.4L140.9 58.9L117.5 59.7L101.1 59.6L101.0 46.1L99.6 19.7Z"/><path d="M101.6 88.6L101.9 59.6L117.5 59.7L150.3 58.4L150.9 72.3L151.4 98.1L112.2 98.9L112.2 99.4L101.8 99.7L101.6 88.6Z"/></g><g fill="rgba(193,80,46,.07)" stroke="#C1502E" stroke-width="1.6" stroke-linejoin="round"><path data-county="Macomb" d="M187.9 7.0L218.3 6.0L219.2 27.7L220.0 28.1L219.7 28.4L221.2 29.9L219.4 30.4L218.6 31.5L217.1 31.8L216.6 33.3L214.8 33.8L213.9 33.5L212.8 34.2L211.5 36.8L211.5 38.0L213.9 39.2L214.0 40.2L215.6 40.6L214.3 40.6L214.7 43.7L213.5 43.0L210.4 43.4L209.5 44.1L207.3 48.1L206.4 51.0L206.2 53.7L206.8 54.3L207.4 56.6L189.5 57.1L187.9 7.0Z"/><path data-county="Wayne" d="M150.3 58.4L207.4 56.6L206.1 61.5L206.4 61.8L205.0 64.1L203.3 65.3L202.5 67.1L199.5 67.5L199.6 68.1L200.3 68.2L199.9 69.2L194.3 70.5L190.0 72.8L188.2 75.2L185.9 80.7L185.3 88.0L186.5 93.6L185.5 97.6L183.3 98.1L182.4 97.7L182.1 97.9L182.2 99.3L181.3 98.3L180.5 99.0L180.9 102.4L180.2 103.3L177.2 102.3L176.9 101.1L175.2 100.5L175.0 99.4L174.1 99.9L172.8 97.6L171.8 97.1L161.3 97.2L161.3 97.8L151.4 98.1L150.3 58.4Z"/><path data-county="Oakland" d="M138.8 9.0L187.9 7.0L189.5 57.1L187.3 57.1L140.9 58.9L138.8 9.0Z"/></g><g font-family="Khand,sans-serif" font-weight="600" font-size="9.5" fill="#2A241C" text-anchor="middle"><g class="hb-pin"><path d="M201.2 32.4L198.3 27.6A3.4 3.4 0 1 1 204.1 27.6Z" fill="#C1502E"/><circle cx="201.2" cy="25.7" r="1.3" fill="#FFFCF7"/><text x="201.2" y="41.9" stroke="#FFFCF7" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">Macomb</text></g><g class="hb-pin"><path d="M176.8 77.3L173.9 72.5A3.4 3.4 0 1 1 179.7 72.5Z" fill="#C1502E"/><circle cx="176.8" cy="70.6" r="1.3" fill="#FFFCF7"/><text x="176.8" y="86.8" stroke="#FFFCF7" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">Wayne</text></g><g class="hb-pin"><path d="M164.2 33.4L161.3 28.6A3.4 3.4 0 1 1 167.1 28.6Z" fill="#C1502E"/><circle cx="164.2" cy="26.7" r="1.3" fill="#FFFCF7"/><text x="164.2" y="42.9" stroke="#FFFCF7" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">Oakland</text></g></g></svg>';
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
    if (!st || !slot) { if (band && band.parentNode) band.parentNode.removeChild(band); last = null; lastScreen = st ? st.screen : null; document.documentElement.classList.remove("ob-hb-on", "ob-hb-mini", "ob-hb-t", "ob-hb-noart", "ob-hb-nodyk"); document.documentElement.removeAttribute("data-hb-fit"); return; }
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
     The house band is never shrunk. Measured with the full 120px band (the keyboard mini strip is ignored) and 8px of air above the Back/Next bar.
     Runs from sync() (before app.js binds the step) and again after bind, on font load and on resize. Reads layout only, no state. */
  /* Tried in order; the first that fits wins. The icon goes before Did You Know, but comes back if Did You Know has to drop anyway and there's room. */
  var LV = ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk"], TRY = [[], ["ob-hb-t"], ["ob-hb-t", "ob-hb-noart"], ["ob-hb-t", "ob-hb-nodyk"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk"]];
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
