/* Smart Upkeep hand-drawn line illustrations. Inline SVG, 48x48, stroke=currentColor.
   Accent fills: .f-t terracotta, .f-l lagoon, .f-s saffron, .f-j jungle (used sparingly). */
(function () {
  var D = {
    furnace: '<path d="M12 6.5h24.5l-.4 35H11.6z"/><path d="M15 12h18M15 15.5h18"/><path d="M16 22h16v14H16z"/><g class="anim-flame"><path class="f-t" d="M24 34c-3.2 0-4.6-2.2-4-4.6.5-2 2.4-2.9 2.5-5.4 2 1.4 2.4 3 2.1 4.4 1-.5 1.6-1.4 1.8-2.4 1.6 1.8 2.3 3.6 1.8 5.1-.5 1.7-2 2.9-4.2 2.9z"/></g><path d="M14 41.5v2.5M34 41.5v2.5"/>',
    ac: '<path d="M7 11.5h34.3v27H7.2z"/><circle cx="21" cy="25" r="9.5"/><g class="anim-spin" style="transform-origin:21px 25px"><path class="f-l" d="M21 25c-1-4 0-6.5 2.4-7.2 1.2 2.4-.2 5-2.4 7.2zM21 25c4 -1 6.5 0 7.2 2.4-2.4 1.2-5-.2-7.2-2.4zM21 25c1 4 0 6.5-2.4 7.2-1.2-2.4.2-5 2.4-7.2zM21 25c-4 1-6.5 0-7.2-2.4 2.4-1.2 5 .2 7.2 2.4z"/></g><path d="M34 17v16M37.5 17v16"/><path d="M10 38.5v3M38 38.5v3"/>',
    waterheater: '<path d="M14.5 10c0-3 19-3 19 0v28c0 3-19 3-19 0z"/><path d="M14.5 10c0 2.6 19 2.6 19 0"/><path d="M20 4.5v3.3M28 4.5v3.3"/><path d="M19 24h10v6H19z"/><path d="M24 40.5v2"/><path class="f-l anim-drip" d="M24 44c-1.2 0-1.8-.8-1.6-1.7.3-1 1.6-2.3 1.6-2.3s1.3 1.3 1.6 2.3c.2.9-.4 1.7-1.6 1.7z"/>',
    tankless: '<path d="M14 7h20.2l-.2 26H14.1z"/><path d="M18 12h12v6H18z"/><circle class="f-s" cx="24" cy="25.5" r="2.4"/><path d="M18 33v5M24 33v5M30 33v5"/><path class="f-l anim-drip" d="M24 45c-1 0-1.6-.7-1.4-1.5.3-.9 1.4-2 1.4-2s1.1 1.1 1.4 2c.2.8-.4 1.5-1.4 1.5z"/>',
    dryer: '<path d="M6 30.5h15c3 0 5-2 5-5V15"/><path d="M6 24.5h12.5c1.6 0 2.5-1 2.5-2.6V15"/><path d="M19.5 12.5h9l-.2 3.5h-8.6z"/><g class="anim-puff"><circle cx="34" cy="11" r="3.2"/><circle cx="39.5" cy="8" r="2.4"/><circle cx="40" cy="15" r="2"/></g><path d="M7 37.5h34"/>',
    gutter: '<path d="M5 22 24 8l19 14"/><path d="M4 22.5h40l-1.6 4.4H5.6z"/><path class="f-l" d="M37 27v13.5h3.5V27z"/><path d="M10 27v13h22V27"/><path d="M33 42.5c2.5-1 5-1 9 0"/>',
    detector: '<circle cx="24" cy="24" r="14.5"/><circle cx="24" cy="24" r="8"/><circle class="f-t anim-blink" cx="24" cy="24" r="2"/><path d="M12 10.5c-2.5 2.2-4.2 5-4.8 8M36 10.5c2.5 2.2 4.2 5 4.8 8"/>',
    window: '<path d="M10 7h28.2v34H10z"/><path d="M24.1 7v34M10 23.8h28.2"/><path class="f-l" d="M14 11.5l5-0M14 15l3 0" /><path d="M7 41.3h34"/>',
    meter: '<path d="M14 12.5c0-2 1.3-3.2 3.3-3.2h13.4c2 0 3.3 1.2 3.3 3.2v27c0 2-1.3 3.2-3.3 3.2H17.3c-2 0-3.3-1.2-3.3-3.2z"/><path d="M18 14h12v9H18z"/><path class="f-j" d="M20 20.5l2.5-3 2 2 3.5-3.8"/><circle cx="24" cy="31.5" r="3"/><path d="M20 4.5v4.8M28 4.5v4.8"/>',
    house: '<path d="M6 22.5 24 7.5l18.2 15"/><path d="M10.5 19.5v21h27v-21"/><path class="f-s" d="M20.5 40.5V29h7v11.5"/><path d="M31 12v-4h4v7.4"/>',
    van: '<path d="M4.5 31.5V14.5h24v17"/><path d="M28.5 18.5h8l6.5 7v6h-38.5"/><path d="M31 21h5l3.4 4H31z"/><circle class="f-s" cx="13" cy="33" r="3.6"/><circle class="f-s" cx="35" cy="33" r="3.6"/><path d="M8.5 20.5h12"/>',
    shield: '<path d="M24 5.5c5 3.2 10 4.2 15 4.2 0 14-4.5 24.6-15 32.5C13.5 34.3 9 23.7 9 9.7c5 0 10-1 15-4.2z"/><path class="f-j" d="M17.5 23.5l4.5 4.5 8.5-9" fill="none"/>',
    clipboard: '<path d="M11.5 9.5h25v32.8h-25z"/><path d="M18 6.5h12v6H18z"/><path d="M16.5 20h15M16.5 26h15M16.5 32h9"/><path class="f-j" d="M29.5 34.5l2 2 4-4.3" fill="none"/>',
    camera: '<path d="M6 15.5h9l3-5h12l3 5h9v23H6z"/><circle cx="24" cy="26.5" r="7"/><circle class="f-l" cx="24" cy="26.5" r="3"/><path d="M36.5 20h2"/>',
    pen: '<path d="M10 38l2-8L32 10l6 6-20 20z"/><path d="M28.5 13.5l6 6"/><path d="M8 43.5c6-1.5 10 1 16-.5s9-2 16 0"/><path class="f-t" d="M10 38l2-8 6 6z"/>',
    bell: '<path d="M12 33.5c2.2-2.6 2.6-5.2 2.6-10 0-6 4-10.2 9.4-10.2s9.4 4.2 9.4 10.2c0 4.8.4 7.4 2.6 10z"/><path d="M24 9.3v4"/><path class="f-s" d="M20.5 37c.6 2 1.8 3 3.5 3s2.9-1 3.5-3z"/><g class="anim-ring"><path d="M8 17c.6-3 2-5.4 4-7.2M40 17c-.6-3-2-5.4-4-7.2"/></g>',
    clock: '<circle cx="24" cy="25" r="16"/><path d="M24 15.5v9.8l6.3 4"/><path d="M19.5 5.5h9M24 5.5v3.4"/><circle class="f-t" cx="24" cy="25.2" r="1.6"/>',
    doc: '<path d="M12 5.5h17l8 8v29H12z"/><path d="M29 5.5v8h8"/><path d="M17 21h15M17 26.5h15M17 32h10"/><circle class="f-s" cx="31.5" cy="37.5" r="3"/>',
    refund: '<path d="M38 18.5A15.5 15.5 0 1 0 39.5 27"/><path d="M39.5 9.5v9h-9"/><path class="f-j" d="M26.8 19.5c-.8-1.3-2-1.8-3.4-1.8-2 0-3.2 1-3.2 2.4 0 3.4 7 1.8 7 5.6 0 1.5-1.4 2.6-3.6 2.6-1.6 0-3-.7-3.8-2M23.5 15.5v2.2M23.5 28.3v2.2" fill="none"/>',
    faq: '<path d="M7 9.5h34v23H21l-8 7v-7H7z"/><path d="M19.5 16.5c.4-2.4 2.2-3.6 4.5-3.6 2.6 0 4.5 1.5 4.5 3.7 0 3.4-4.5 3.2-4.5 6.4"/><circle class="f-t" cx="24" cy="27.3" r="1.5"/>',
    wrench: '<path d="M30 6.5a8.5 8.5 0 0 0-8.8 11.3L7.5 31.5a3.6 3.6 0 0 0 5 5.1l13.8-13.8A8.5 8.5 0 0 0 37.6 14L32 18.6 28.8 18l-.6-3.3z"/><circle class="f-s" cx="10" cy="34" r="1.3"/>',
    chimney: '<path d="M6 30 24 16l18 14"/><path d="M28.5 19.5V8.5h7v16"/><path d="M27 8.5h10"/><g class="anim-puff"><circle cx="33" cy="4" r="2"/></g><path d="M10 27v14h28V27"/>',
    snow: '<path d="M24 5v38M7.5 14.5l33 19M7.5 33.5l33-19"/><path d="M19.5 7.5 24 11l4.5-3.5M19.5 40.5 24 37l4.5 3.5"/><circle class="f-l" cx="24" cy="24" r="2.5"/>',
    pool: '<path d="M14 36V10c0-2.4 1.6-4 4-4M26 32V10c0-2.4 1.6-4 4-4"/><path d="M14 16h12M14 24h12"/><path class="f-l" d="M5 37c3.5-2.6 6.5-2.6 9.5 0s6.5 2.6 9.5 0 6.5-2.6 9.5 0 6.5 2.6 9.5 0" fill="none"/><path d="M5 43c3.5-2.6 6.5-2.6 9.5 0s6.5 2.6 9.5 0 6.5-2.6 9.5 0 6.5 2.6 9.5 0"/>',
    brush: '<path d="M27 5.5l7 7-12 12-7-7z"/><path class="f-t" d="M15 17.5l7 7c-3 4.5-6 10-13 17-1-7 1.5-17 6-24z"/>',
    lights: '<path d="M4 10c9 7 31 7 40 0"/><path class="f-t" d="M11 15.5c-1.6 2.5-1.6 5 0 6.5 1.6-1.5 1.6-4 0-6.5z"/><path class="f-s" d="M24 17.5c-1.6 2.5-1.6 5 0 6.5 1.6-1.5 1.6-4 0-6.5z"/><path class="f-j" d="M37 15.5c-1.6 2.5-1.6 5 0 6.5 1.6-1.5 1.6-4 0-6.5z"/>',
    bug: '<ellipse cx="24" cy="27" rx="8" ry="11"/><path d="M24 16v22M18 12.5l2.5 3.5M30 12.5 27.5 16M16 24l-7-3M16 31l-7 3M32 24l7-3M32 31l7 3"/><circle class="f-t" cx="24" cy="13.5" r="3.3"/>',
    spray: '<path d="M10 20.5h14v6H10z"/><path d="M24 22.5h6"/><path d="M14 26.5l-3 15h8l1.5-15"/><g class="anim-puff"><path d="M34 18l7-4M34 23.5h8M34 29l7 4"/></g>',
    radon: '<path d="M24 6c-8 9-12 15-12 21a12 12 0 0 0 24 0c0-6-4-12-12-21z"/><path class="f-s" d="M19 29h10M24 24v10" fill="none"/>',
    duct: '<path d="M5 15.5h27c4 0 6.5 2.5 6.5 6.5v20"/><path d="M5 24.5h22c1.6 0 2.5 1 2.5 2.5v15"/><path d="M12 15.5v9M20 15.5v9"/><g class="anim-puff"><path d="M33 5v5M38 7v4"/></g>',
    star: '<path d="M24 6.5l5.3 11 12 1.5-8.8 8.3 2.3 12-10.8-5.9-10.8 5.9 2.3-12-8.8-8.3 12-1.5z"/><circle class="f-s" cx="24" cy="24" r="3"/>',
    search: '<circle cx="21" cy="21" r="12"/><path d="M30 30l10 10"/>',
    grid: '<path d="M8 8h13v13H8zM27 8h13v13H27zM8 27h13v13H8zM27 27h13v13H27z"/>',
    gift: '<path d="M9.5 21.2c9.6-.5 19.4-.4 29.2.2l-.3 6.3c-9.8.3-19.4.2-28.8-.2z"/><path d="M11.6 27.9c-.2 4.8.1 9.5.6 14 7.9.4 15.8.4 23.6-.1.4-4.5.6-9.1.3-13.8"/><path class="f-t" d="M21.6 21.5c.2 6.8 0 13.6-.3 20.3h5.2c-.3-6.7-.4-13.5-.2-20.2z"/><path d="M24 21c-3.8-1.2-8.6-3.6-8.2-7.4.5-3.5 5.3-2.8 8.2 7.1 2.7-9.6 8-10.4 8.4-6.9.4 3.6-4.2 6-8.4 7.2z"/>',
    tag: '<path d="M7 7.5h17l17 17-16.5 16.5-17.5-17z"/><circle class="f-t" cx="16" cy="16.5" r="3"/>',
    user: '<circle cx="24" cy="16.5" r="8"/><path d="M8 42c1.2-8.5 7.5-13 16-13s14.8 4.5 16 13"/>',
    play: '<circle cx="24" cy="24" r="17.5"/><path class="f-t" d="M20 15.5l12 8.5-12 8.5z"/>'
  };
  window.SUIcon = function (name, cls) {
    var b = D[name] || D.wrench;
    return '<svg class="su-ico ' + (cls || "") + ' ico-' + name + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + b + '</svg>';
  };
  window.SUIconNames = Object.keys(D);
})();
