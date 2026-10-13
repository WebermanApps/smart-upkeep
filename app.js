/* Smart Upkeep sign-up funnel. Static prototype, no backend.
   Progress lives in localStorage. Photos and card data never leave the browser
   (photos are in-memory previews only; card fields are disabled and never read). */
(function () {
  "use strict";
  var P = window.SMART_UPKEEP_PRICING;
  var KEY = "smartUpkeep.v1", VKEY = "smartUpkeep.videoDismissed";
  var app = document.getElementById("app");
  function I(n, c) { return window.SUIcon ? window.SUIcon(n, c) : ""; }
  var photoMem = {}; // cardId -> [objectURL], browser memory only

  var Q = [
    { id: "zip", type: "zip", title: "What's Your Address or ZIP Code?", help: "We serve metro Detroit: Wayne, Oakland, Macomb and nearby." },
    { id: "sqft", type: "single", title: "About How Big Is Your Home?", help: "Finished square footage, a rough range is fine.",
      opts: [["1500", "Under 2,000 sq ft"], ["2500", "2,000 to 3,000 sq ft"], ["3500", "3,000 to 4,000 sq ft"], ["4500", "4,000 to 5,000 sq ft"], ["5500", "5,000 to 6,000 sq ft"], ["6500", "Over 6,000 sq ft"]] },
    { id: "furnaces", type: "single", title: "How Many Furnaces Do You Have?", help: "Most homes over 3,500 sq ft have two.", opts: [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4 or More"]] },
    { id: "acs", type: "single", title: "How Many AC Units?", help: "Count the outdoor condensers.", opts: [["0", "None"], ["1", "1"], ["2", "2"], ["3", "3 or More"]] },
    { id: "waterHeaters", type: "wh", title: "How Many Water Heaters?", help: "And what kind. Tankless units mount on the wall.", opts: [["1", "1"], ["2", "2"], ["3", "3 or More"]] },
    { id: "stories", type: "single", title: "How Many Stories Is Your Home?", help: "This sets gutter cleaning and ladder work.", opts: [["1", "1 Story (Ranch)"], ["2", "2 Stories"], ["3", "3 Stories"]] },
    { id: "extras", type: "multi", title: "Do You Have Any of These?", help: "Pick all that apply.",
      opts: Object.keys(P.extras).map(function (k) { return [k, P.extras[k].label]; }) }
  ];

  var S = load();
  function fresh() { return { screen: "home", answers: {}, tier: "silver", plan: "annual", addons: [], lastMinute: [], alacarte: [], alacarteBooking: null, photos: {}, visit: null, photosComplete: false, signup: null, referralCodeIn: "", path: [] }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.screen) { var o = Object.assign(fresh(), s); if (!Array.isArray(o.addons)) o.addons = []; if (!Array.isArray(o.lastMinute)) o.lastMinute = []; if (!Array.isArray(o.alacarte)) o.alacarte = []; return o; } } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function round(n) { return Math.round(n / P.roundTo) * P.roundTo; }
  function monthlyOf(annual) { return Math.round(Number(annual) / 12); }
  /* Lead with monthly equivalent; asterisk explains how it is billed. */
  function billLine(kind, annualTotal) {
    if (kind === "quarterly") return "*Billed quarterly (" + money(annualTotal / 4) + " every 3 months)";
    if (kind === "annualDiscount") return "*Billed annually (" + money(annualTotal) + "/yr, 10% off)";
    if (kind === "biennial") return "*Prepaid for 2 years (" + money(annualTotal) + "), then 6 extra months free at the end of your term (draft)";
    return "*Billed annually (" + money(annualTotal) + "/yr)";
  }
  function priceBlock(annualTotal, kind) {
    if (kind === "biennial") {
      return '<div class="price">' + money(Math.round(Number(annualTotal) / 24)) + '<small>/Month</small></div>' +
        '<p class="price-bill">' + billLine("biennial", annualTotal) + '</p>' +
        '<p class="price-save">6 Extra Months Free at the End of Your Term · stacks with referrals (draft)</p>';
    }
    return '<div class="price">' + money(monthlyOf(annualTotal)) + '<small>/Month</small></div>' +
      '<p class="price-bill">' + billLine(kind, annualTotal) + '</p>';
  }
  function listedMembership(tier) {
    return price()[tier || S.tier];
  }
  function welcomeBanner() {
    return '<details class="acc warn-drop"><summary class="mw-hover">1 Warning · Draft Offer Terms</summary><div class="acc-body">' +
      '<p class="eyebrow" style="margin:0">Welcome Offer</p>' +
      '<h3 style="margin:.2rem 0 .55rem">Stackable Savings</h3>' +
      '<ul class="feat offer-list">' +
      '<li><strong>Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term</strong> — prepay 24 months at the normal monthly price; 6 extra months are added free after your 24 paid months. Available on every tier. Listed price still honors the $99/Month floor.</li>' +
      '<li><strong>Refer a Neighbor, You Both Get a Month Free</strong> — no cap on referrals. Credited once your neighbor\'s first payment clears.</li>' +
      '</ul>' +
      '<p class="small muted" style="margin:0">Offers stack. Free months are added at the end of your term and apply once you complete it. Cancel early and they are forfeited. Free months carry no refund value. Final terms pending legal review.</p></div></details>';
  }
  function offerTermsShort() {
    return '<details class="acc warn-drop offer-terms"><summary class="mw-hover">1 Warning · Draft Offer Terms</summary><div class="acc-body">' +
      '<p style="margin:0"><strong>Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term:</strong> pay 24 months at the normal membership price (minimum $99/Month); 6 extra months are added free at the end of your term, for 30 months of coverage. <strong>Refer a Neighbor:</strong> you and your neighbor each get one free month per successful referral, with no cap. Free months are credited only after the referred neighbor\'s first payment has cleared. Offers stack. Free months are added at the end of your term and apply once you complete it. Cancel early and they are forfeited; free months have no refund value.</p></div></details>';
  }
  function makeReferralCode(name) {
    var base = String(name || "HOME").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "HOME";
    var n = 1000 + Math.floor(Math.random() * 9000);
    return "SU-" + base + "-" + n;
  }

  /* ---------- Pricing ---------- */
  function num(id, def) { var v = S.answers[id]; return (v === undefined || v === "unsure") ? def : Number(v); }
  function isUnsure(id) { var v = S.answers[id]; return v === undefined || v === "unsure"; }
  function selectedAddons() {
    var ids = Array.isArray(S.addons) ? S.addons : [];
    return (P.addons || []).filter(function (a) { return ids.indexOf(a.id) > -1; });
  }
  function addonsAnnual() {
    return selectedAddons().reduce(function (sum, a) { return sum + (a.annual || 0); }, 0);
  }
  function selectedLastMinute() {
    var ids = Array.isArray(S.lastMinute) ? S.lastMinute : [];
    return (P.lastMinute || []).filter(function (a) { return ids.indexOf(a.id) > -1; });
  }
  function lastMinuteTotal() {
    return selectedLastMinute().reduce(function (sum, a) { return sum + (a.price || 0); }, 0);
  }
  function findService(id) {
    var a = (P.addons || []).find(function (x) { return x.id === id; });
    if (a) return a;
    return (P.lastMinute || []).find(function (x) { return x.id === id; }) || null;
  }
  function serviceOncePrice(a) { return a.price != null ? a.price : (a.annual || 0); }
  function addonPriceLabel(a) {
    var mo = money(monthlyOf(a.annual));
    var range = a.note ? a.note : (a.low === a.high ? money(a.low) : money(a.low) + "–" + money(a.high));
    var unit = a.unit === "yr" ? "/yr" : a.unit === "season" ? "/season" : a.unit === "hr" ? "/hr" : " per service";
    if (a.note) return mo + "/Month · " + range + " <span>(draft)</span>";
    return mo + "/Month · " + range + unit + " <span>(draft)</span>";
  }
  function lastMinutePriceLabel(a) {
    return money(a.price) + " one-time <span>(draft) · with next visit</span>";
  }
  function renderAddonList(items, selectedIds, dataAttr, priceFn, compact) {
    return '<div class="addon-list">' + items.map(function (ad) {
      var on = selectedIds.indexOf(ad.id) > -1;
      return '<button type="button" class="addon mw-hover' + (on ? " sel" : "") + '" data-' + dataAttr + '="' + ad.id + '" aria-pressed="' + on + '">' +
        '<span class="chk" aria-hidden="true">' + (on ? "&#10003;" : "") + '</span>' +
        (compact ? I(XT_ICO[ad.id] || "wrench", "sm") : '') + '<span class="addon-body"><strong>' + esc(ad.label) + '</strong>' +
        (compact ? '' : '<p class="addon-desc">' + esc(ad.desc) + '</p>') +
        '<p class="addon-price">' + priceFn(ad) + '</p></span></button>';
    }).join("") + '</div>';
  }
  function applyFloor(raw) {
    var minA = P.minAnnual || 1188;
    var r = round(raw);
    return { raw: r, amt: Math.max(r, minA), floored: r < minA };
  }
  function buildLines() {
    var a = S.answers, d = P.unsureDefaults;
    var sqft = num("sqft", d.sqft), f = num("furnaces", d.furnaces), ac = num("acs", d.acs), wh = num("waterHeaters", d.waterHeaters);
    var whType = (a.whType && a.whType !== "unsure") ? a.whType : d.whType;
    var stories = num("stories", d.stories), extras = Array.isArray(a.extras) ? a.extras : [];
    var tankless = whType === "tankless" ? wh : whType === "both" ? Math.max(1, Math.floor(wh / 2)) : 0;
    var tank = wh - tankless;
    var silverV = (P.silverVisit || P.seasonalVisit).base + (P.silverVisit || P.seasonalVisit).perSqft * sqft;
    var seasonal = P.seasonalVisit.base + P.seasonalVisit.perSqft * sqft;
    var checkIn = P.checkInVisit.base + P.checkInVisit.perSqft * sqft;
    var gutters = P.gutters2Cleanings[Math.min(3, stories)] || 540;
    var uSqft = isUnsure("sqft"), uF = isUnsure("furnaces"), uAc = isUnsure("acs");
    var uWh = isUnsure("waterHeaters") || isUnsure("whType") || a.whType === "unsure";
    var uSt = isUnsure("stories"), uEx = isUnsure("extras");
    function hvacLines() {
      var L = [];
      if (f > 0) L.push({ label: f + " Furnace" + (f > 1 ? "s" : "") + " × " + money(P.perUnit.furnace), amt: f * P.perUnit.furnace, est: uF });
      if (ac > 0) L.push({ label: ac + " AC Unit" + (ac > 1 ? "s" : "") + " × " + money(P.perUnit.ac), amt: ac * P.perUnit.ac, est: uAc });
      if (tank > 0) L.push({ label: tank + " Tank Water Heater" + (tank > 1 ? "s" : "") + " × " + money(P.perUnit.tankWaterHeater), amt: tank * P.perUnit.tankWaterHeater, est: uWh });
      if (tankless > 0) L.push({ label: tankless + " Tankless Water Heater" + (tankless > 1 ? "s" : "") + " × " + money(P.perUnit.tanklessWaterHeater), amt: tankless * P.perUnit.tanklessWaterHeater, est: uWh });
      L.push({ label: "Dryer vent cleaning", amt: P.dryerVent, est: false });
      return L;
    }
    var linesSilver = [];
    linesSilver.push({ label: "2 seasonal visits × " + money(silverV) + " each", amt: 2 * silverV, est: uSqft });
    linesSilver = linesSilver.concat(hvacLines());
    linesSilver.push({ label: "Furnace filter changes during visits", amt: 0, est: false, note: "Included" });
    linesSilver.push({ label: "Smoke and CO detector checks", amt: 0, est: false, note: "Included" });
    linesSilver.push({ label: "Whole-Home Mold and Moisture Scan (moisture meter and thermal camera, saved to your Home Record)", amt: 0, est: false, note: "Included" });
    var silverRaw = linesSilver.reduce(function (s, L) { return s + L.amt; }, 0);
    var linesGold = [];
    linesGold.push({ label: "4 seasonal visits × " + money(seasonal) + " each", amt: 4 * seasonal, est: uSqft });
    linesGold = linesGold.concat(hvacLines());
    linesGold.push({ label: "Gutter cleaning, spring and fall (" + stories + "-story home)", amt: gutters, est: uSt });
    extras.forEach(function (k) {
      var e = P.extras[k]; if (!e || !(e.gold > 0)) return;
      linesGold.push({ label: e.label, amt: e.gold, est: uEx });
    });
    linesGold.push({ label: "Whole-Home Mold and Moisture Scan (moisture meter and thermal camera, saved to your Home Record)", amt: 0, est: false, note: "Included" });
    var goldRaw = linesGold.reduce(function (s, L) { return s + L.amt; }, 0);
    var linesPlat = linesGold.slice();
    linesPlat.push({ label: "8 monthly check-ins × " + money(checkIn) + " each", amt: 8 * checkIn, est: uSqft });
    linesPlat.push({ label: "Yearly roof and flashing inspection", amt: P.platinumRoofInspection, est: false });
    extras.forEach(function (k) {
      var e = P.extras[k]; if (!e || !(e.platinumOnly > 0)) return;
      linesPlat.push({ label: e.label, amt: e.platinumOnly, est: uEx });
    });
    var platRaw = linesPlat.reduce(function (s, L) { return s + L.amt; }, 0);
    var sF = applyFloor(silverRaw), gF = applyFloor(goldRaw), pF = applyFloor(platRaw);
    return {
      sqft: sqft, seasonal: seasonal, checkIn: checkIn, silverV: silverV,
      silverRaw: sF.raw, goldRaw: gF.raw, platinumRaw: pF.raw,
      silver: sF.amt, gold: gF.amt, platinum: pF.amt,
      silverFloored: sF.floored, goldFloored: gF.floored, platinumFloored: pF.floored,
      silverLines: linesSilver, goldLines: linesGold, platinumLines: linesPlat
    };
  }
  function price(answers) {
    var b = buildLines();
    return { silver: b.silver, gold: b.gold, platinum: b.platinum, sqft: b.sqft,
      silverFloored: b.silverFloored, goldFloored: b.goldFloored, platinumFloored: b.platinumFloored };
  }
  function tierLines(b, tier) {
    if (tier === "silver") return b.silverLines;
    if (tier === "platinum") return b.platinumLines;
    return b.goldLines;
  }
  function tierAmt(b, tier) {
    if (tier === "silver") return b.silver;
    if (tier === "platinum") return b.platinum;
    return b.gold;
  }
  function tierFloored(b, tier) {
    if (tier === "silver") return b.silverFloored;
    if (tier === "platinum") return b.platinumFloored;
    return b.goldFloored;
  }
  function tierRaw(b, tier) {
    if (tier === "silver") return b.silverRaw;
    if (tier === "platinum") return b.platinumRaw;
    return b.goldRaw;
  }
  function breakdown(tier) {
    var b = buildLines(), mem = tierAmt(b, tier);
    var lines = tierLines(b, tier).filter(function (L) { return L.amt > 0 || L.note; }).map(function (L) {
      return { label: L.label + (L.note ? " (" + L.note + ")" : ""), amt: L.amt, est: L.est, kind: "item" };
    });
    var floorLine = null;
    if (tierFloored(b, tier)) {
      floorLine = { label: "Membership minimum ($99/Month)", amt: mem - tierRaw(b, tier), kind: "floor" };
    }
    var add = selectedAddons();
    add.forEach(function (x) {
      lines.push({ label: "Add-on: " + x.label, amt: x.annual, est: false, kind: "addon" });
    });
    var lm = selectedLastMinute();
    lm.forEach(function (x) {
      lines.push({ label: "Last-minute: " + x.label, amt: x.price, est: false, kind: "lastMinute" });
    });
    var addSum = addonsAnnual();
    var lmSum = lastMinuteTotal();
    var membership = mem;
    var discLine = null, year;
    var offerLine = null, termMonths = 12, prepaid = null;
    if (S.plan === "biennial") {
      var two = mem * 2;
      var freeVal = Math.round(mem / 2); // 6 months at listed annual/12 * 6
      offerLine = { label: "Welcome offer: Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term (draft)", amt: -freeVal, kind: "offer" };
      membership = two;
      year = two + addSum * 2;
      prepaid = year;
      termMonths = 30;
    } else if (tier === "platinum" && S.plan === "annual") {
      var disc = Math.max(round(mem * (1 - P.platinumAnnualDiscount)), P.minAnnual || 1188);
      discLine = { label: "Annual pay-in-full discount (10%, draft)", amt: -(mem - disc), kind: "discount" };
      membership = disc;
      year = disc + addSum;
    } else {
      year = mem + addSum;
    }
    return { tier: tier, lines: lines, floorLine: floorLine, discLine: discLine, offerLine: offerLine, membership: membership, addons: addSum, lastMinute: lmSum, year: year, monthly: termMonths === 30 ? Math.round(year / 24) : monthlyOf(year), termMonths: termMonths, prepaid: prepaid, floored: tierFloored(b, tier) };
  }
  window.SmartUpkeepPrice = price; // exposed for testing

  /* ---------- Navigation ---------- */
  function go(screen) { if (S.screen !== screen) { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); } S.screen = screen; save(); render(); window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function back() { var p = S.path.pop(); S.screen = p || "home"; save(); render(); window.scrollTo(0, 0); }
  function backBtn() { return '<span class="nav-pills"><button class="back back-pill mw-hover" data-act="back" type="button"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#C1502E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button><button class="home-pill mw-hover" data-act="home" type="button" aria-label="Home"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.6V20h12V9.6" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5.2h4V20" fill="none" stroke="#C1502E" stroke-width="2.2" stroke-linejoin="round"/></svg></button></span>'; }

  function render() {
    /* Intro screen retired: old links and saved state land on the first question. */
    if (S.screen === "overview") S.screen = "q0";
    S.path = S.path.filter(function (x) { return x !== "overview"; });
    var s = S.screen, html;
    app.classList.toggle("wide", s === "quote" || s === "photos");
    if (s === "home") html = home();
    else if (s === "overview") html = overview();
    else if (/^q\d$/.test(s)) html = question(Number(s.slice(1)));
    else if (s === "choice") html = choice();
    else if (s === "photos") html = photos();
    else if (s === "visit") html = visitForm();
    else if (s === "quote") html = quote();
    else if (s === "alacarte") html = alacarte();
    else if (s === "alacarteConfirm") html = alacarteConfirm();
    else if (s === "signup") html = signup();
    else if (s === "confirm") html = confirm();
    else { S.screen = "home"; html = home(); }
    app.innerHTML = html;
    app.setAttribute("data-screen", s);
    bind();
    document.body.classList.toggle("on-home", s === "home");
    if (s === "home") bindHome();
  }

  /* ---------- Guided step rail (Style Swipe: guided, visual, system-like) ---------- */
  function stepRail(active) {
    var steps = [
      { n: 1, label: "Questions", ico: I("pen","xs") },
      { n: 2, label: "Photos", ico: I("camera","xs") },
      { n: 3, label: "Quote", ico: I("clipboard","xs") },
      { n: 4, label: "Sign Up", ico: I("doc","xs") }
    ];
    return '<nav class="step-rail" aria-label="Your Progress">' + steps.map(function (s) {
      var state = s.n < active ? " done" : (s.n === active ? " on" : "");
      return '<div class="step-dot' + state + '" aria-current="' + (s.n === active ? "step" : "false") + '">' +
        '<span class="step-ico" aria-hidden="true">' + s.ico + '</span>' +
        '<span class="step-lab">' + s.label + '</span></div>';
    }).join('<span class="step-join" aria-hidden="true"></span>') + '</nav>';
  }

  /* ---------- Screens ---------- */
  var LARA_LOOKUP = "https://aca-prod.accela.com/MILARA/GeneralProperty/PropertyLookUp.aspx?searchtype=Contractor";
  function sampleVisitCard() {
    var tasks = [
      { task: "Furnace Tune-Up", by: "Licensed Partner (Sample)", kind: "Mechanical Contractor · Active", verify: true },
      { task: "Furnace Filter Change", by: "Smart Upkeep Tech (Sample)", kind: "Member Tech", verify: false },
      { task: "Smoke and CO Checks", by: "Smart Upkeep Tech (Sample)", kind: "Member Tech", verify: false },
      { task: "Water Heater Flush", by: "Licensed Partner (Sample)", kind: "Plumbing Contractor · Active", verify: true }
    ];
    return '<div class="card visit-preview" id="sampleVisit">' +
      '<p class="eyebrow">Sample · Your Visit</p>' +
      '<h3>Fall Visit Preview</h3>' +
      '<p class="muted small">Each task lists who did the work. Licensed partner tasks link to Michigan LARA so you can tap to verify. Sample labels only — not a real contractor.</p>' +
      '<ul class="visit-tasks">' + tasks.map(function (t) {
        return '<li><div><strong>' + t.task + '</strong><span class="muted small">Done by: ' + t.by + '</span><span class="task-kind">' + t.kind + '</span></div>' +
          (t.verify
            ? '<a class="btn btn-outline verify-btn mw-hover" href="' + LARA_LOOKUP + '" target="_blank" rel="noopener">Tap to Verify License</a>'
            : '<span class="done-badge">In-House</span>') +
          '</li>';
      }).join("") + '</ul></div>';
  }
  var CERTS_REQ = [
    ["epa608", "EPA Section 608", "Federal certification to safely handle and recover refrigerant in AC and heat pumps."],
    ["rrp", "EPA Lead-Safe RRP", "Trained in lead-safe work practices for homes built before 1978."],
    ["osha10", "OSHA 10", "Completed 10 hours of job-site safety training."],
    ["cpr", "CPR and First Aid", "Current CPR and first aid certification."],
    ["bg", "Annual Background Check", "Passed a third-party background check, renewed every year."]
  ];
  var CERTS_BONUS = [
    ["nate", "NATE (HVAC)", "Passed national HVAC technician exams from North American Technician Excellence."],
    ["csia", "CSIA Dryer Exhaust Technician", "Certified by the Chimney Safety Institute of America to inspect and clean dryer vents."],
    ["nachi", "InterNACHI", "Trained to inspection standards from the International Association of Certified Home Inspectors."],
    ["mfr", "Manufacturer Trained", "Factory-trained on specific equipment brands, like Carrier furnaces or Navien tankless heaters."],
    ["iicrc", "IICRC", "Certified in cleaning and restoration, like water damage, by the IICRC."]
  ];
  function badge(c, kind) {
    return '<button type="button" class="cert-badge cert-' + kind + ' mw-hover" data-cert="' + c[0] + '" data-explain="' + esc(c[2]) + '" aria-expanded="false">' +
      '<span class="cert-ico" aria-hidden="true">' + (kind === "bonus" ? "&#9733;" : "&#10003;") + '</span>' + c[1] + '</button>';
  }
  /* Deck 4: big centered portrait, round seal badges with colored outlines, big lagoon Verify with the result under the card, the van to look for. No stats, no note from the tech. */
  function seal(c, kind) {
    return '<button type="button" class="seal seal-' + kind + ' mw-hover" data-cert="' + c[0] + '" data-explain="' + esc(c[2]) + '" aria-expanded="false">' +
      '<span class="seal-ring" aria-hidden="true">' + I(kind === "bonus" ? "star" : "shield", "xs") + '</span><span class="seal-lab">' + c[1] + '</span></button>';
  }
  function sampleTechCard() {
    var held = ["nate", "csia", "mfr"];
    return '<div class="tech-wrap" id="sampleTech"><div class="card tech-card">' +
      '<p class="eyebrow">Sample Tech Profile</p>' +
      '<div class="tech-portrait" aria-hidden="true">' + I("user", "tech-portrait-ico") + '</div>' +
      '<h3 class="tech-name">Jordan Sample</h3><p class="muted small tech-role">Smart Upkeep Tech · Fictional Example</p>' +
      '<p class="tech-rule"><strong>Not Always the Same Tech, but Always Licensed.</strong></p>' +
      '<div class="seal-row">' + CERTS_REQ.map(function (c) { return seal(c, "req"); }).join("") +
        CERTS_BONUS.filter(function (c) { return held.indexOf(c[0]) > -1; }).map(function (c) { return seal(c, "bonus"); }).join("") + '</div>' +
      '<p class="cert-explain small" role="status" aria-live="polite">Tap Any Seal to See What It Means.</p>' +
      '<button type="button" class="btn verify-big mw-hover" data-verify="1">' + I("shield", "xs") + 'Verify License</button>' +
      '<div class="tech-van">' + I("van", "sm") + '<div><strong>Look for This Van</strong><span class="muted small">White van, black Smart Upkeep logo, terracotta stripe.</span></div></div>' +
      '</div>' +
      '<div class="verify-result" role="status" aria-live="polite" hidden>' + I("shield", "xs") + '<div><strong>Michigan License: Active (Sample)</strong><span class="muted small">Trade work is done under an active Michigan LARA license. <a class="link mw-hover" href="' + LARA_LOOKUP + '" target="_blank" rel="noopener">Check on LARA</a></span></div></div>' +
      '</div>';
  }
  function vettingSection() {
    return '<div class="card vetting" id="howWeVet">' +
      '<h3>How We Vet Every Partner</h3>' +
      '<p class="muted small">Before a licensed partner works in your home, we check the basics and keep them current. Yearly background re-checks are shown to members.</p>' +
      '<ul class="vet-list">' +
      '<li><span class="vet-ico accent-1" aria-hidden="true">&#10003;</span><div><strong>State License Checked</strong><span class="muted small">Active status on Michigan LARA for the trade on the job.</span></div></li>' +
      '<li><span class="vet-ico accent-3" aria-hidden="true">&#10003;</span><div><strong>Workers\' Comp Certificate or Filed Exemption</strong><span class="muted small">Current certificate, or a filed WC-337 exclusion, on file.</span></div></li>' +
      '<li><span class="vet-ico accent-0" aria-hidden="true">&#10003;</span><div><strong>General Liability and Auto Insurance</strong><span class="muted small">Certificates on file for work and travel to your home.</span></div></li>' +
      '<li><span class="vet-ico accent-2" aria-hidden="true">&#10003;</span><div><strong>Yearly Background Re-Check</strong><span class="muted small">Shown to members. We re-check on a yearly cycle through a third party.</span></div></li>' +
      '</ul>' +
      '<p class="small cert-line"><strong>Required Certifications:</strong> EPA Section 608, EPA Lead-Safe RRP, OSHA 10, CPR and First Aid, and an Annual Background Check. Mechanical, plumbing, electrical and builder work requires an active Michigan license.</p>' +
      '<p class="small muted" style="margin:0">You can also <a class="link mw-hover" href="' + LARA_LOOKUP + '" target="_blank" rel="noopener">Tap to Verify License</a> on Michigan LARA for partner tasks on your visit report.</p></div>';
  }
  function trustBlock() {
    return '<h3 class="grp">Trust and Licensing</h3>' + sampleVisitCard() + sampleTechCard() + vettingSection();
  }
  function miCancelNotice() {
    return '<div class="mi-cancel notice" role="note">' +
      '<p><strong>Michigan Home Solicitation Sales Notice (MCL 445.113).</strong> You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached notice of cancellation form for an explanation of this right.</p>' +
      '<details class="warn-drop mi-draft"><summary class="mw-hover">1 Warning · Draft Wording</summary><div class="warn-body small muted">This bold notice appears next to your signature when the sale is made at your home. Final wording pending legal review.</div></details></div>';
  }

  /* ---------- Home: phone-first shopping-app layout ---------- */
  var ADDON_ICO = { windows: "window", carpet: "brush", pool: "pool", snow: "snow", pressure: "spray", deck: "brush", chimney: "chimney", ducts: "duct", lights: "lights", radon: "radon", handyman: "wrench", pest: "bug", guttersExtra: "gutter", backflow: "waterheater" };
  function priceRange(a) { return a.low === a.high ? money(a.low) : money(a.low) + "–" + money(a.high); }
  function hmAcc(id, icon, title, body) {
    return '<details class="acc hm-acc" id="acc-' + id + '"><summary class="mw-hover">' + I(icon, "sm") + '<span>' + title + '</span></summary><div class="acc-body">' + body + '</div></details>';
  }
  function ul(items) { return '<ul class="hm-list">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join("") + '</ul>'; }
  /* Deck 4 plan card: white, terracotta top bar, big per-tier From price, check list of what's included, the year shown as visits. */
  var selK = null, HM_SVC = [];
  var TIER_NOTE = { silver: "Included in Every Plan", gold: "Plus and Up", platinum: "Complete" };
  /* Small tech-at-work illustration: shared tech figure + the service's equipment icon. */
  function techArt(ic) {
    var body = window.SUIconBody ? window.SUIconBody(ic) : "";
    return '<svg class="su-ico hm-illo" viewBox="0 0 120 60" aria-hidden="true" focusable="false"><path d="M4 56h112"/>' +
      '<circle cx="30" cy="14" r="6"/><path class="f-t" d="M23 11c1-5 13-5 14 0z"/><path d="M37 11h4"/>' +
      '<path class="f-l" d="M22 24c2-3 14-3 16 0l2 18H20z"/><path d="M24 42l-1 14M36 42l1 14"/>' +
      '<path d="M38 27l12 6"/><path class="f-j" d="M50 33l6-3m-6 3l5 4"/>' +
      '<g transform="translate(62 6) scale(1.05)">' + body + '</g></svg>';
  }
  function FICO(f) { var m = [[/furnace/i,"furnace"],[/\bAC\b/,"ac"],[/water heater/i,"waterheater"],[/dryer/i,"dryer"],[/gutter/i,"gutter"],[/smoke|CO\b/,"detector"],[/moisture/i,"meter"],[/recall/i,"bell"],[/report/i,"clipboard"],[/proof|record/i,"doc"],[/selling/i,"gift"],[/roof|vent clearing|weatherproof/i,"house"],[/generator|garage|fridge|filter/i,"wrench"],[/visits?|check/i,"clock"],[/everything/i,"star"],[/extras|irrigation/i,"spray"]]; for (var i = 0; i < m.length; i++) if (m[i][0].test(f)) return m[i][1]; return "shield"; }
  /* Plan detail (Details section): icon checklist; anything after ":" is a collapsed drop-down. Content comes from P.tiers[k].features. */
  function planDetail(k) {
    var t = P.tiers[k];
    return '<ul class="pd-list">' + t.features.map(function (f) { var i = f.indexOf(":"), h = i > 0 ? f.slice(0, i) : f, rest = i > 0 ? f.slice(i + 1).trim() : "";
      return '<li>' + I(FICO(f), "xs") + (rest ? '<details class="pd-more"><summary>' + h + '</summary><p class="small muted">' + rest + '</p></details>' : '<span>' + h + '</span>') + '</li>'; }).join("") + '</ul>' +
      '<p class="small muted">Visits Per Year: ' + t.visits + '</p>' +
      '<div class="pd-cta"><button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button><button class="link mw-hover pd-back" type="button" data-hm-back="1">Back to Plans</button></div>';
  }
  function planCard(k, ord) {
    var t = P.tiers[k], inc = t.keyPointsOnCard && t.keyPoints ? t.keyPoints : t.features.slice(0, 3).map(function (f) { return f.split(":")[0].split(" (")[0]; });
    return '<div class="hm-card card hm-plan pc mw-hover' + (t.recommended ? " rec" : "") + (k === selK ? " sel" : "") + '" data-tier="' + k + '" tabindex="0" role="button" aria-pressed="' + (k === selK ? "true" : "false") + '" style="--po:' + (ord || 0) + '">' +
      '<div class="pc-top"><strong class="pc-name">' + t.label + '</strong>' + (t.recommended ? '<span class="hm-badge">Most Popular</span>' : '<span class="hm-badge pc-ph" aria-hidden="true">&nbsp;</span>') + '</div>' +
      '<span class="pc-tag muted small">' + t.tagline + '</span>' +
      '<div class="pc-price"><span class="pc-from">From</span><span class="pc-big">' + money(t.fromMonthly || P.minMonthly || 99) + '</span><span class="pc-per">/Mo</span></div>' +
      '<div class="pc-year">Visits Per Year: ' + t.visits + '</div>' +
      '<ul class="pc-inc">' + inc.map(function (f) { return f === "And More" ? '<li class="pc-more"><button class="link mw-hover pc-more-link" type="button" data-hm-see="' + k + '">And More</button></li>' : (/Plus:$/.test(f) ? '<li class="pc-lead">' + f + '</li>' : '<li>' + f + '</li>'); }).join("") + '</ul>' +
      '<button class="btn btn-primary mw-hover pc-see" type="button" data-hm-see="' + k + '">See What\'s Included</button></div>';
  }
  /* Hero: muted looping teaser (poster only when reduced motion is preferred). */
  function heroMedia() {
    var T = P.teaser || {}, poster = T.poster || "assets/poster-16x9.jpg";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!T.src || reduce) return '<img src="' + esc(poster) + '" alt="" loading="eager" width="640" height="360">';
    return '<video class="hm-teaser" src="' + esc(T.src) + '" poster="' + esc(poster) + '" muted autoplay loop playsinline disablepictureinpicture preload="auto" width="640" height="360" aria-hidden="true" tabindex="-1"></video>';
  }
  function home() {
    var svc = [
      ["furnace", "Furnace", "furnace", "Fall tune-up on every furnace, with filter changes during visits.", "silver"],
      ["ac", "AC", "ac", "Spring tune-up on every AC unit so it is ready before the heat.", "silver"],
      ["waterheater", "Water Heater", "waterheater", "Yearly flush, or descale for tankless, to cut sediment and extend its life.", "silver"],
      ["dryer", "Dryer Vent", "dryer", "Dryer vent cleaned to lower fire risk and speed up drying.", "silver"],
      ["detector", "Smoke/CO", "detector", "Smoke and CO detectors checked so alarms work when it counts.", "silver"],
      ["meter", "Mold and Moisture", "meter", "Scanning your entire home every visit to protect against mold and water damage.", "silver"],
      ["gutter", "Gutters", "gutter", "Gutters and downspouts cleaned every spring and fall.", "gold"],
      ["chimney", "Roof", "chimney", "Yearly roof and flashing inspection to catch leaks early.", "platinum"]];
    HM_SVC = svc;
    var tiers = tierKeys();
    selK = tiers.filter(function (k) { return P.tiers[k].recommended; })[0] || tiers[0];
        var phoneOrder = tiers.slice(); /* Max: Essentials, Plus, Complete on every screen size */
    var trust = [["shield", "Certified Techs", "State license checked, insured, background checked yearly."], ["refund", "Honest Refund", "Cancel anytime, no fee. Refund = prepaid minus work done."], ["clipboard", "Report Every Visit", "Written report with photos saved to your Home Record."], ["house", "Metro Detroit", "Wayne, Oakland and Macomb counties."]];
    var popular = ["windows", "chimney", "ducts", "pressure", "radon", "pest", "snow", "lights"];
    var addons = popular.map(function (id) { return P.addons.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
    function card(ic, t, sub, extra, cls) { return '<div class="hm-card card mw-hover ' + (cls || "") + '">' + I(ic) + '<strong>' + t + '</strong>' + (sub ? '<span class="muted small">' + sub + '</span>' : '') + (extra || "") + '</div>'; }
    function row(id, title, cards, link, pre) {
      return '<section class="hm-row" id="row-' + id + '"><div class="hm-row-h"><h2>' + title + '</h2>' + (link || "") + '</div>' + (pre || "") + '<div class="hm-scroll">' + cards + '</div></section>';
    }
    return '<div class="hm">' +
      '<section class="hm-hero">' +
        '<button class="hm-thumb mw-hover" data-act="watch" type="button" aria-label="Watch Video">' + heroMedia() + '<span class="hm-expand" aria-hidden="true">' + I("play", "xs") + '</span><span class="hm-dur">1:15</span></button>' +
        '<div class="hm-hero-txt"><h1>Your Home, Taken Care Of.</h1>' +
        '<p class="start-at">Membership Starting at $99/Month</p>' +
        '<button class="btn btn-primary btn-big mw-hover hm-cta-inline" data-act="start" type="button">Get Started</button></div>' +
      '</section>' +
      '<div class="hm-search" role="search">' + I("search", "xs") + '<input type="search" placeholder="Search Services, À La Carte, FAQ" aria-label="Search services, à la carte and FAQ" autocomplete="off"><ul class="hm-results" hidden></ul></div>' +
      row("plans", "Plans", tiers.map(function (k) { return planCard(k, phoneOrder.indexOf(k)); }).join(""), '<button class="link mw-hover" type="button" data-act="start">Free Quote in Minutes</button>',
        '<details class="hm-offer-tag"><summary class="mw-hover">' + I("tag", "xs") + '<span>Welcome Offer: 6 Extra Months Free</span></summary><div class="hm-offer-body small"><p>Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term</p><p>Refer a Neighbor: 1 Month Free Each</p><p>Free months are added at the end of your term and apply once you complete it.</p><p class="muted">Offers Stack. Draft Terms.</p></div></details>').replace('</div></section>', '</div><div class="pc-dots" aria-hidden="true">' + phoneOrder.map(function (k) { return '<span class="pc-dot" data-dot="' + k + '"></span>'; }).join("") + '</div></section>') +
      '<section class="hm-row" id="row-services"><div class="hm-row-h"><h2>What We Take Care Of</h2><button class="link mw-hover" type="button" data-hm-open="plans">See All</button></div>' +
        '<div class="hm-tiles">' + svc.map(function (s, i) { return '<button type="button" class="hm-tile mw-hover t' + (i % 4) + '" data-svc="' + i + '" aria-haspopup="dialog"><span class="hm-tile-ic">' + I(s[0], "xs") + '</span><span>' + s[1] + '</span></button>'; }).join("") + '</div></section>' +
      '<div class="hm-pop" role="dialog" aria-modal="true" aria-labelledby="hmPopT" data-ptr-ignore hidden><div class="hm-pop-bg" data-pop-close></div><div class="hm-pop-card">' +
        '<button type="button" class="hm-pop-x mw-hover" data-pop-close aria-label="Close">&times;</button>' +
        '<div class="hm-pop-art"></div><p class="hm-pop-tag"></p><h3 id="hmPopT"></h3><p class="hm-pop-txt"></p>' +
        '<button type="button" class="btn btn-primary mw-hover hm-pop-go">Free Quote in Minutes</button></div></div>' +
      '<section class="hm-row" id="row-trust"><div class="hm-row-h"><h2 class="hm-trust-h">Why Trust Us</h2><button class="link mw-hover" type="button" data-hm-open="faq">How We Vet</button></div>' +
        '<div class="hm-chips">' + trust.map(function (s, i) { return '<button type="button" class="hm-chip mw-hover t' + (i % 4) + '" aria-expanded="false" data-chip="' + esc(s[2]) + '">' + I(s[0], "xs") + '<span>' + s[1] + '</span></button>'; }).join("") + '</div>' +
        '<p class="hm-chip-detail small" aria-live="polite" hidden></p></section>' +
      '<section class="hm-accs"><h2>Details</h2>' +
      hmAcc("plans", "house", "What's Included", '' +
        tiers.map(function (k) { var t = P.tiers[k]; return '<details class="pd-plan" id="acc-plan-' + k + '"' + (k === selK ? " open" : "") + '><summary class="mw-hover">' + I(k === "silver" ? "house" : k === "gold" ? "star" : "shield", "xs") + '<span>' + t.label + ' · ' + t.tagline + '</span></summary>' + planDetail(k) + '</details>'; }).join("")) +
      hmAcc("addons", "wrench", "Shop À La Carte", '<ul class="hm-prices">' + P.addons.map(function (a) { return '<li>' + I(ADDON_ICO[a.id] || "wrench", "xs") + '<span>' + a.label + '</span><b>' + priceRange(a) + '</b></li>'; }).join("") + '</ul><button class="btn btn-outline mw-hover" data-act="alacarte" type="button">Shop À La Carte</button>') +
      hmAcc("refund", "refund", "Refund Promise", ul(["Cancel Anytime, No Fee", "Refund = Prepaid Minus Work Done", "Free Months: Added at End of Term, Apply Once You Complete It", "Stay Offer: 6+ Months, 1 Month Free. 1+ Year, 2 Months Free.", "Michigan 3-Day Cancel Right"])) +
      hmAcc("faq", "faq", "FAQ", '<h4>How Often Should I Change My Furnace Filter?</h4><p>Every 1 to 3 months. Every plan includes Furnace Filters.</p><h4>Service Area?</h4><p>Metro Detroit: Wayne, Oakland, Macomb.</p><h4>How Do You Vet Techs?</h4><p>State License Checked, Insured, Yearly Background Check.</p><h4>Can I Cancel?</h4><p>Anytime, no fee. See Refund Promise.</p><h4>Photos Required?</h4><p>No. They lock your price.</p><a class="btn btn-outline mw-hover" href="faq/">See All FAQs</a>') +
      '</section>' +
      '<div class="hm-sticky"><button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button></div>' +
      '<nav class="hm-tabs" aria-label="App Sections">' +
        [["home", "house", "Home"], ["plans", "star", "Plans"], ["addons", "wrench", "À La Carte"], ["myhome", "clipboard", "My Home"], ["account", "user", "Account"]].map(function (t, i) { return '<button type="button" class="mw-hover' + (i === 0 ? " on" : "") + '" data-hm-tab="' + t[0] + '">' + I(t[1], "xs") + '<span>' + t[2] + '</span></button>'; }).join("") +
      '</nav><div class="hm-toast" role="status" aria-live="polite" hidden></div>' +
      '</div>';
  }
  /* Phones (<=600px): center the recommended plan and keep the dots in sync with the swipe row. */
  function bindPlanSwipe(root) {
    var sc = root.querySelector("#row-plans .hm-scroll"); if (!sc) return;
    var dots = [].slice.call(root.querySelectorAll("#row-plans .pc-dot"));
    var mq = window.matchMedia("(max-width:600px)");
    function cards() { return [].slice.call(sc.querySelectorAll(".hm-plan")); }
    function center(el) { return el.offsetLeft - sc.offsetLeft - parseFloat(getComputedStyle(sc).paddingLeft); }
    function sync() {
      if (!mq.matches) return;
      var best = null, d = 1e9;
      cards().forEach(function (c) { var x = Math.abs(center(c) - sc.scrollLeft); if (x < d) { d = x; best = c; } });
      dots.forEach(function (o) { o.classList.toggle("on", !!best && o.getAttribute("data-dot") === best.getAttribute("data-tier")); });
    }
    function start() {
      if (!mq.matches) return;
      sc.scrollLeft = 0;
      sync();
    }
    var raf = 0;
    sc.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); }); }, { passive: true });
    if (mq.addEventListener) mq.addEventListener("change", start);
    requestAnimationFrame(start);
  }
  /* One tap selects a plan card (one at a time); on phones the card also scrolls to center. */
  function bindPlanSelect(root) {
    var sc = root.querySelector("#row-plans .hm-scroll"); if (!sc) return;
    var cards = [].slice.call(sc.querySelectorAll(".hm-plan"));
    var smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    function pick(c) {
      cards.forEach(function (x) { var on = x === c; x.classList.toggle("sel", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      if (window.matchMedia("(max-width:600px)").matches) sc.scrollTo({ left: c.offsetLeft - sc.offsetLeft - parseFloat(getComputedStyle(sc).paddingLeft), behavior: smooth });
    }
    cards.forEach(function (c) {
      c.addEventListener("click", function (e) { if (e.target.closest(".pc-see")) return; pick(c); });
      c.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); pick(c); } });
    });
    root.querySelectorAll("[data-hm-see]").forEach(function (b) { b.addEventListener("click", function () {
      var d = document.getElementById("acc-plan-" + b.getAttribute("data-hm-see")), g = document.getElementById("acc-plans"); if (!d || !g) return;
      [].forEach.call(g.querySelectorAll(".pd-plan"), function (x) { x.open = x === d; });
      if (!g.open) g.querySelector("summary").click();
      setTimeout(function () { d.scrollIntoView({ behavior: smooth, block: "start" }); }, 340);
    }); });
    root.querySelectorAll("[data-hm-back]").forEach(function (b) { b.addEventListener("click", function () { root.querySelector("#row-plans").scrollIntoView({ behavior: smooth, block: "start" }); }); });
  }
  function bindHome() {
    var root = app.querySelector(".hm"); if (!root) return;
    bindPlanSwipe(root);
    bindPlanSelect(root);
    var accs = [].slice.call(root.querySelectorAll(".hm-acc"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function setOpen(d, open) {
      var b = d.querySelector(".acc-body");
      if (reduce) { d.open = open; return; }
      if (open) { d.open = true; var h = b.scrollHeight; b.style.height = "0px"; requestAnimationFrame(function () { b.style.height = h + "px"; }); }
      else { b.style.height = b.scrollHeight + "px"; requestAnimationFrame(function () { b.style.height = "0px"; }); }
      b.addEventListener("transitionend", function te() { b.removeEventListener("transitionend", te); b.style.height = ""; if (!open) d.open = false; });
    }
    function openAcc(d, scroll) {
      accs.forEach(function (o) { if (o !== d && o.open) setOpen(o, false); });
      if (!d.open) setOpen(d, true);
      if (scroll) setTimeout(function () { d.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }, 60);
    }
    accs.forEach(function (d) { d.querySelector("summary").addEventListener("click", function (e) { e.preventDefault(); if (d.open) setOpen(d, false); else openAcc(d, false); }); });
    root.querySelectorAll("[data-hm-open]").forEach(function (b) { b.addEventListener("click", function () { var d = document.getElementById("acc-" + b.getAttribute("data-hm-open")); if (d) openAcc(d, true); }); });
    var toast = root.querySelector(".hm-toast"), tt;
    root.querySelectorAll("[data-hm-tab]").forEach(function (b) { b.addEventListener("click", function () {
      var t = b.getAttribute("data-hm-tab");
      if (t === "myhome" || t === "account") { toast.textContent = (t === "myhome" ? "My Home" : "Account") + " Is Coming Soon"; toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 2200); return; }
      root.querySelectorAll("[data-hm-tab]").forEach(function (o) { o.classList.toggle("on", o === b); });
      if (t === "home") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      else document.getElementById("row-" + t).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }); });
    var stick = root.querySelector(".hm-sticky"), inl = root.querySelector(".hm-cta-inline");
    if (window.IntersectionObserver && stick && inl) { stick.classList.add("off"); new IntersectionObserver(function (e) { stick.classList.toggle("off", e[0].isIntersecting); }).observe(inl); }
    /* service tiles: tap opens a small card (never automatic) */
    var pop = root.querySelector(".hm-pop"), popTier = null, popFrom = null;
    function popClose() { if (!pop || pop.hidden) return; pop.hidden = true; document.documentElement.classList.remove("hm-pop-open"); if (popFrom) popFrom.focus(); }
    function popOpen(t) {
      var d = HM_SVC[+t.getAttribute("data-svc")]; if (!d || !pop) return;
      popFrom = t; popTier = d[4];
      pop.querySelector(".hm-pop-art").innerHTML = techArt(d[2]);
      pop.querySelector(".hm-pop-tag").textContent = TIER_NOTE[d[4]];
      pop.querySelector("h3").textContent = d[1];
      pop.querySelector(".hm-pop-txt").textContent = d[3];
      pop.hidden = false; document.documentElement.classList.add("hm-pop-open");
      pop.querySelector(".hm-pop-x").focus();
    }
    root.querySelectorAll(".hm-tile").forEach(function (t) { t.addEventListener("click", function () { popOpen(t); }); });
    if (pop) {
      pop.querySelectorAll("[data-pop-close]").forEach(function (c) { c.addEventListener("click", popClose); });
      pop.querySelector(".hm-pop-go").addEventListener("click", function () {
        pop.hidden = true; document.documentElement.classList.remove("hm-pop-open");
        if (popTier && P.tiers[popTier]) S.tier = popTier;
        go("q0");
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") popClose(); });
    }
    /* trust chips: tap for a one-line detail */
    var chipD = root.querySelector(".hm-chip-detail");
    root.querySelectorAll(".hm-chip").forEach(function (c) { c.addEventListener("click", function () {
      var on = c.getAttribute("aria-expanded") !== "true";
      root.querySelectorAll(".hm-chip").forEach(function (o) { o.setAttribute("aria-expanded", "false"); });
      c.setAttribute("aria-expanded", on ? "true" : "false");
      chipD.hidden = !on; chipD.textContent = on ? c.getAttribute("data-chip") : "";
    }); });
    /* search */
    var idx = [];
    accs.forEach(function (d) { var title = d.querySelector("summary span").textContent; idx.push({ t: title, k: (title + " " + d.querySelector(".acc-body").textContent).toLowerCase(), acc: d }); });
    P.addons.forEach(function (a) { idx.push({ t: a.label + " · " + priceRange(a), k: (a.label + " " + a.desc).toLowerCase(), acc: document.getElementById("acc-addons") }); });
    var inp = root.querySelector(".hm-search input"), res = root.querySelector(".hm-results");
    inp.addEventListener("input", function () {
      var q = inp.value.trim().toLowerCase();
      if (q.length < 2) { res.hidden = true; res.innerHTML = ""; return; }
      var hits = idx.filter(function (x) { return x.k.indexOf(q) > -1; }).slice(0, 8);
      res.innerHTML = hits.length ? hits.map(function (h, i) { return '<li><button type="button" class="mw-hover" data-i="' + idx.indexOf(h) + '">' + esc(h.t) + '</button></li>'; }).join("") : '<li class="muted small" style="padding:.6rem .8rem">No Matches</li>';
      res.hidden = false;
      res.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { res.hidden = true; inp.value = ""; openAcc(idx[+b.getAttribute("data-i")].acc, true); }); });
    });
  }
  function acc(t, body) { return '<details class="acc"><summary class="mw-hover">' + t + '</summary><div class="acc-body">' + body + '</div></details>'; }

  function overview() {
    var steps = [
      [I("pen"), "7 Quick Questions", ""],
      [I("camera"), "Photos (Optional)", ""],
      [I("clipboard"), "Pick a Plan", ""],
      [I("doc"), "Sign Up", ""]
    ];
    return backBtn() + stepRail(1) + '<h1>Four Quick Steps</h1>' +
      '<ol class="steps guide-steps">' + steps.map(function (s, i) {
        return '<li class="card mw-hover"><span class="num accent-' + (i % 4) + '" aria-hidden="true">' + s[0] + '</span><div><h3 style="margin:0">' + s[1] + '</h3></div></li>';
      }).join("") + '</ol>' +
      '<button class="btn btn-primary btn-big mw-hover" data-act="q0" type="button">Start</button>';
  }

  /* ---------- Quote flow (one question per screen) ---------- */
  var QART = { zip: "house", sqft: "house", furnaces: "furnace", acs: "ac", waterHeaters: "waterheater", stories: "gutter", extras: "star" };
  var QSHORT = { zip: "Your ZIP or Address", sqft: "Home Size", furnaces: "Furnaces", acs: "AC Units", waterHeaters: "Water Heaters", stories: "Stories", extras: "Extras" };
  var QTITLE = { zip: "Where's Your Home?", sqft: "How Big Is Your Home?", furnaces: "How Many Furnaces?", acs: "How Many AC Units?", waterHeaters: "How Many Water Heaters?", stories: "How Many Stories?", extras: "Any of These?" };
  var QHELP = { zip: "ZIP or street address. Metro Detroit.", sqft: "A rough range is fine.", furnaces: "Most homes over 3,500 sq ft have two.", acs: "Count the outdoor units.", waterHeaters: "Then pick the type.", stories: "Sets gutter and ladder work.", extras: "Pick all that apply." };
  var XICO = { irrigation: "spray", sump: "meter", fireplace: "chimney", generator: "wrench", pool: "pool", humidifier: "radon" };
  var SQICO = ["house", "house", "house", "house", "house", "house"];
  var PCOL = { silver: 1, gold: 2, platinum: 3 };
  function qTile(attr, val, label, ico, tint, sel, extra) {
    return '<button type="button" class="qt mw-hover t' + tint + (sel ? " sel" : "") + (extra || "") + '" data-' + attr + '="' + val + '" aria-pressed="' + !!sel + '">' +
      '<span class="qt-ic">' + ico + '</span><span class="qt-lab">' + label + '</span>' + (sel ? '<i class="qt-ok" aria-hidden="true"></i>' : '') + '</button>';
  }
  function countIco(icoName, n) { return n === "0" ? I(icoName, "sm") + '<b class="qt-x" aria-hidden="true"></b>' : '<b class="qt-n">' + esc(n) + '</b>'; }
  function planChip() {
    var t = P.tiers[S.tier] || P.tiers[tierKeys()[0]];
    return '<div class="qf-plan"><button type="button" class="qf-chip mw-hover tc' + (PCOL[S.tier] || 1) + '" data-plan-chip="1" aria-expanded="false" aria-controls="qfPlans">' + '<span class="qf-dot" aria-hidden="true"></span>' + esc(t.label) + ' Plan<span class="qf-chg">Change</span></button>' +
      '<div class="qf-plans" id="qfPlans" hidden>' + tierKeys().map(function (k) { return '<button type="button" class="qf-pick mw-hover tc' + (PCOL[k] || 1) + (S.tier === k ? " sel" : "") + '" data-plan-pick="' + k + '"><span class="qf-dot" aria-hidden="true"></span>' + esc(P.tiers[k].label) + '</button>'; }).join("") + '</div></div>';
  }
  function qHead(n, total) {
    var pct = Math.round(n / total * 100);
    return '<div class="qf-top">' + backBtn() + planChip() + '</div>' +
      '<div class="qf-prog"><span class="qf-step">Step ' + n + ' of ' + total + '</span><div class="qf-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Quote Progress"><div style="width:' + pct + '%"></div></div></div>';
  }
  function qArt(name, tint) { return '<div class="qf-art t' + tint + '" aria-hidden="true">' + I(name) + '</div>'; }
  function question(i) {
    var q = Q[i], a = S.answers[q.id], body = "", tint = i % 4, foot = "";
    if (q.type === "zip") {
      body = '<div class="qf-field"><label class="sr" for="zip">Address or ZIP</label>' + I("search", "sm") +
        '<input id="zip" type="text" inputmode="text" enterkeyhint="next" autocomplete="street-address" placeholder="48322 or 123 Main St, Novi" value="' + esc(a && a !== "unsure" ? a : "") + '"></div>' +
        '<div class="err" id="zipErr" role="alert"></div>' +
        '<div class="qf-chips" aria-label="Good to Know"><span class="hm-chip t0">' + I("tag", "xs") + 'Free</span><span class="hm-chip t1">' + I("shield", "xs") + 'No Card Needed</span><span class="hm-chip t2">' + I("clock", "xs") + 'About 2 Minutes</span></div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>Next</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure? Skip for Now</button>';
    } else if (q.type === "multi") {
      var arr = Array.isArray(a) ? a : [];
      body = '<div class="qt-grid two" data-ptr-ignore>' + q.opts.map(function (o, k) { return qTile("multi", o[0], o[1].replace("Whole-House ", ""), I(XICO[o[0]] || "wrench", "sm"), k % 4, arr.indexOf(o[0]) > -1, " chkt"); }).join("") +
        qTile("multi", "none", "None of These", I("shield", "sm"), 3, a === "none", " chkt") + '</div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>See My Price</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>';
    } else if (q.type === "wh") {
      var t = S.answers.whType;
      body = '<div class="qt-grid three" data-ptr-ignore>' + q.opts.map(function (o, k) { return qTile("single", o[0], o[1], countIco("waterheater", o[0]), k % 4, String(a) === o[0]); }).join("") + '</div>' +
        '<p class="qf-sub">Tank or Tankless?</p><div class="qt-grid three" data-ptr-ignore>' + [["tank", "Tank", "waterheater"], ["tankless", "Tankless", "tankless"], ["both", "One of Each", "grid"]].map(function (o, k) { return qTile("wh", o[0], o[1], I(o[2], "sm"), (k + 1) % 4, t === o[0]); }).join("") + '</div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>Next</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>';
    } else {
      var cnt = q.id === "furnaces" || q.id === "acs";
      var cls = q.opts.length > 4 ? "two" : (q.opts.length === 3 ? "three" : "two");
      body = '<div class="qt-grid ' + cls + '" data-ptr-ignore>' + q.opts.map(function (o, k) {
        var ico = cnt ? countIco(QART[q.id], o[0]) : q.id === "stories" ? '<b class="qt-n">' + o[0] + '</b>' : I("house", "sm");
        var lab = cnt ? (o[0] === "0" ? "None" : o[1] === o[0] ? (o[0] === "1" ? "One" : o[0] === "2" ? "Two" : o[0] === "3" ? "Three" : o[1]) : o[1]) : o[1].replace(" sq ft", "").replace(" (Ranch)", "");
        var sub = q.id === "sqft" ? '<small>sq ft</small>' : q.id === "stories" && o[0] === "1" ? '<small>Ranch</small>' : "";
        return qTile("single", o[0], lab + sub, ico, k % 4, String(a) === o[0], q.id === "sqft" ? " sz" + k : "");
      }).join("") + '</div>';
      foot = '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>';
    }
    return '<section class="qf qf-' + q.id + '">' + qHead(i + 1, Q.length) +
      '<div class="qf-hero">' + qArt(QART[q.id], tint) + '<div><h1 class="qf-h">' + QTITLE[q.id] + '</h1><p class="qf-help">' + QHELP[q.id] + '</p></div></div>' +
      '<div class="qf-body">' + body + '</div><div class="qf-foot">' + foot + '</div></section>';
  }
  function unsureBtn(sel) { return '<button type="button" class="opt unsure mw-hover' + (sel ? " sel" : "") + '" data-unsure="1">Unsure</button>'; }
  function isAnswered(q) {
    var a = S.answers[q.id];
    if (q.type === "zip") return a === "unsure" || (typeof a === "string" && a.trim().length >= 5);
    if (q.type === "multi") return a === "unsure" || a === "none" || (Array.isArray(a) && a.length > 0);
    if (q.type === "wh") return a !== undefined && !!S.answers.whType;
    return a !== undefined;
  }
  function zipOf(s) { var m = String(s || "").match(/\b(4[89]\d{3})\b/) || String(s || "").match(/\b(\d{5})\b/); return m ? m[1] : null; }
  function inArea(zip) { return /^48[0-3]\d\d$/.test(zip); }

  function choice() {
    return '<section class="qf qf-done">' + '<div class="qf-top">' + backBtn() + planChip() + '</div>' +
      '<div class="qf-prog"><span class="qf-step">All 7 Done</span><div class="qf-bar full" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Quote Progress"><div style="width:100%"></div></div></div>' +
      '<div class="qf-done-art" aria-hidden="true"><span class="t3">' + I("clipboard") + '</span><span class="t0">' + I("furnace") + '</span><span class="t1">' + I("ac") + '</span></div>' +
      '<h1 class="qf-h center">Your Price Is Ready</h1><p class="qf-help center">Built from your answers.</p>' +
      '<div class="qf-foot"><button class="btn btn-primary btn-big mw-hover" data-act="toQuote" type="button">See My Price</button>' +
      '<button class="btn btn-outline btn-big mw-hover" data-act="photos" type="button">' + I("camera", "xs") + ' Add Photos to Lock It In</button><p class="qf-help center small">Photos are optional.</p></div></section>';
  }

  function photoCards() {
    var a = S.answers, d = P.unsureDefaults, cards = [];
    var f = num("furnaces", d.furnaces), ac = num("acs", d.acs), wh = num("waterHeaters", d.waterHeaters);
    for (var i = 1; i <= f; i++) cards.push(["furnace" + i, "Furnace " + (f > 1 ? i + " " : "") + "Label", "The sticker inside the furnace door with model and serial."]);
    for (i = 1; i <= ac; i++) cards.push(["ac" + i, "AC Unit " + (ac > 1 ? i + " " : "") + "Label", "The data plate on the outdoor condenser."]);
    for (i = 1; i <= wh; i++) cards.push(["wh" + i, "Water Heater " + (wh > 1 ? i + " " : "") + "Label", "The rating label on the side of the tank or unit."]);
    cards.push(["panel", "Electrical Panel", "Open the panel door; include the label inside it."]);
    (Array.isArray(a.extras) ? a.extras : []).forEach(function (k) { if (P.extras[k]) cards.push(["x-" + k, P.extras[k].label, "A photo of the unit and any label you can find."]); });
    return cards;
  }
  function photos() {
    var cards = photoCards();
    return backBtn() + stepRail(2) + '<p class="eyebrow">Step 2 &middot; Optional</p><h1>Take Some Photos</h1>' +
      '<p class="muted">One Label Photo Each Locks Your Price.</p>' +
      '<div class="photos" style="margin-top:1rem">' + cards.map(function (c) {
        var urls = photoMem[c[0]] || [], n = urls.length || (S.photos[c[0]] || 0);
        return '<div class="card pcard mw-hover"><h3>' + esc(c[1]) + (n ? '<span class="done-badge">' + n + ' Added</span>' : "") + '</h3><p class="muted small" style="margin:0 0 .6rem">' + esc(c[2]) + '</p>' +
          '<label class="btn btn-outline mw-hover" style="width:100%">' + I("camera","xs") + ' Take or Choose Photo<input type="file" accept="image/*" capture="environment" multiple data-photo="' + c[0] + '"></label>' +
          '<div class="prev">' + urls.map(function (u) { return '<img alt="Preview" src="' + u + '">'; }).join("") + (n && !urls.length ? '<span class="small muted">Previews clear on reload.</span>' : "") + '</div></div>';
      }).join("") + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="photosDone" type="button">Continue to My Price</button></div>' +
      '<div class="btn-row"><button class="btn btn-outline btn-big mw-hover" data-act="visit" type="button">Free Tech Visit Instead</button></div>';
  }

  function visitForm() {
    var v = S.visit || {}, w = v.windows || [];
    var min = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    return backBtn() + stepRail(2) + '<p class="eyebrow">Free Tech Visit</p><h1>Schedule a Free Tech Visit</h1><p>A tech comes by, logs your equipment and confirms your final price. About 30 minutes, no charge.</p>' +
      '<form id="visitF" novalidate><label class="fl" for="vDate">Preferred Date</label><input id="vDate" type="date" min="' + min + '" value="' + esc(v.date) + '">' +
      '<p class="fl">Preferred Time Windows</p><div class="opts two">' + ["Morning (8 to 11)", "Midday (11 to 2)", "Afternoon (2 to 5)", "Evening (5 to 7)"].map(function (t) { var s = w.indexOf(t) > -1; return '<button type="button" class="opt mw-hover' + (s ? " sel" : "") + '" data-win="' + t + '"><span class="chk">' + (s ? "&#10003;" : "") + '</span>' + t + '</button>'; }).join("") + '</div>' +
      '<label class="fl" for="vName">Name</label><input id="vName" type="text" autocomplete="name" value="' + esc(v.name) + '">' +
      '<label class="fl" for="vPhone">Phone</label><input id="vPhone" type="tel" autocomplete="tel" value="' + esc(v.phone) + '">' +
      '<label class="fl" for="vEmail">Email</label><input id="vEmail" type="email" autocomplete="email" value="' + esc(v.email) + '">' +
      '<div class="err" id="vErr"></div><div class="btn-row"><button class="btn btn-primary btn-big mw-hover" type="submit">Request My Free Visit</button></div></form>';
  }

  var XT = { open: false, pick: null };
  var XT_ICO = { windows: "window", carpet: "brush", pool: "pool", snow: "snow", pressure: "spray", deck: "brush", chimney: "chimney", ducts: "duct", lights: "lights", radon: "radon", handyman: "wrench", pest: "bug", guttersExtra: "gutter", backflow: "meter", lmInteriorWindows: "window", lmScreens: "window", lmBulbs: "lights" };
  function extrasEntry() {
    var add = P.addons || [], lm = P.lastMinute || [];
    var nSel = (S.addons || []).length;
    function tiles(items, attr, sel) {
      return '<div class="xt-grid">' + items.map(function (ad) {
        var on = sel.indexOf(ad.id) > -1, cur = XT.pick === attr + ":" + ad.id;
        return '<button type="button" class="xt-tile mw-hover' + (on ? " sel" : "") + (cur ? " cur" : "") + '" data-xt="' + attr + ':' + ad.id + '" aria-expanded="' + cur + '">' +
          I(XT_ICO[ad.id] || "wrench", "sm") + '<span>' + esc(ad.label) + '</span>' + (on ? '<i class="xt-on" aria-label="Added">&#10003;</i>' : '') + '</button>';
      }).join("") + '</div>';
    }
    function detail(items, attr, sel, fn) {
      if (!XT.pick || XT.pick.indexOf(attr + ":") !== 0) return "";
      var id = XT.pick.slice(attr.length + 1), it = items.filter(function (a) { return a.id === id; });
      return it.length ? '<div class="xt-detail">' + renderAddonList(it, sel, attr, fn) + '</div>' : "";
    }
    return '<button type="button" class="xt-entry mw-hover" data-xt-open="1">' + I("grid", "sm") +
      '<span><strong>Shop À La Carte</strong><small>' + add.length + ' Optional Services &middot; ' + (nSel ? nSel + ' Selected' : 'Tap to Browse') + '</small></span><b aria-hidden="true">&rsaquo;</b></button>' +
      '<div class="xt-sheet"' + (XT.open ? "" : " hidden") + ' role="dialog" aria-modal="true" aria-label="Shop À La Carte"><div class="xt-inner">' +
      '<div class="xt-top"><h3>Shop À La Carte</h3><button type="button" class="modal-x mw-hover" data-xt-close="1" aria-label="Close">&times;</button></div>' +
      '<p class="lead-sm">Optional seasonal or specialty services for any membership. Draft market ranges; monthly figure is the yearly midpoint ÷ 12. Tap a tile for details and price.</p>' +
      tiles(add, "addon", S.addons || []) + detail(add, "addon", S.addons || [], addonPriceLabel) +
      '<button type="button" class="btn btn-primary mw-hover xt-done" data-xt-close="1">Done</button></div></div>';
  }
  function pickFinalOffer() {
    var F = P.finalOffer || {}; if (!F.enabled) return null;
    var have = (S.addons || []).concat(S.alacarte || []);
    var pool = (F.candidates || []).map(function (id) { return (P.addons || []).filter(function (a) { return a.id === id; })[0]; })
      .filter(function (a) { return a && have.indexOf(a.id) < 0; });
    if (!pool.length) return null;
    if (F.strategy === "random") return pool[Math.floor(Math.random() * pool.length)];
    var key = F.storageKey || "smartUpkeep.finalOfferIdx", i = 0;
    try { i = parseInt(localStorage.getItem(key) || "0", 10) || 0; localStorage.setItem(key, String(i + 1)); } catch (e) {}
    return pool[i % pool.length];
  }
  function showFinalOffer(ad, done) {
    var w = document.createElement("div");
    w.className = "fo-wrap"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "One Last Extra");
    w.innerHTML = '<div class="fo-card"><p class="eyebrow">Before You Submit</p><div class="fo-head">' + I(XT_ICO[ad.id] || "wrench") +
      '<div><h3>Add ' + esc(ad.label) + '?</h3><p class="fo-desc">' + esc(ad.desc) + '</p><p class="addon-price">' + addonPriceLabel(ad) + '</p></div></div>' +
      '<div class="fo-btns"><button type="button" class="btn btn-outline mw-hover" data-fo="no">No Thanks</button><button type="button" class="btn btn-primary mw-hover" data-fo="add">Add</button></div></div>';
    document.body.appendChild(w);
    logAddon("offer_shown", ad.id, "final-offer");
    w.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fo]"); if (!b) return;
      if (b.getAttribute("data-fo") === "add") { S.addons = S.addons || []; if (S.addons.indexOf(ad.id) < 0) S.addons.push(ad.id); save(); logAddon("offer_accepted", ad.id, "final-offer"); }
      else logAddon("offer_declined", ad.id, "final-offer");
      w.remove(); done();
    });
    var f = w.querySelector('[data-fo="add"]'); if (f) f.focus();
  }
  function tierKeys() { return (P.tierOrder || Object.keys(P.tiers)).filter(function (k) { return P.tiers[k]; }); }
  function quote() {
    var p = price(), a = S.answers;
    var final = S.photosComplete && S.visit && S.visit.completed;
    var status = S.visit ? '<p class="small"><strong>Free tech visit requested</strong> for ' + esc(S.visit.date) + ' (' + esc((S.visit.windows || []).join(", ")) + '). We will confirm by text.</p>' : S.photosComplete ? '<p class="small"><strong>Photos added.</strong> We will review them and confirm your final price.</p>' : "";
    var unsure = Object.keys(a).filter(function (k) { return a[k] === "unsure"; }).length;
    var addSum = addonsAnnual();
    var tiersHtml = '<div class="tiers n' + tierKeys().length + '">' + tierKeys().map(function (k) {
      var t = P.tiers[k], amt = p[k], sel = S.tier === k;
      var floorNote = p[k + "Floored"] ? '<p class="floor-note">Priced at our $99/Month membership minimum</p>' : "";
      return '<div class="card tier mw-hover' + (sel ? " sel" : "") + '" data-tier="' + k + '" role="button" tabindex="0" aria-pressed="' + sel + '">' + (t.recommended ? '<span class="ribbon">Most Popular</span>' : "") +
        '<p class="eyebrow" style="margin-top:.4rem">' + t.visits + ' Visits a Year</p><h2>' + t.label + '</h2>' + priceBlock(amt, "annual") + floorNote +
        '<button type="button" class="detail-link" data-detail="' + k + '">Price Details</button>' +
        '<details class="tier-feats"><summary>What\'s Included</summary><ul>' + t.features.map(function (f) { return "<li>" + (/^Selling\?/.test(f) ? I("gift", "xs") + " " + f : /Recall Monitoring/.test(f) ? "<strong>" + f + "</strong>" : f) + "</li>"; }).join("") + '</ul></details>' +
        '<button class="btn ' + (sel ? "btn-primary" : "btn-outline") + ' mw-hover" data-pick="' + k + '" type="button">' + (sel ? "Selected: " : "Choose ") + t.label + '</button></div>';
    }).join("") + '</div>';
    var lmSum = lastMinuteTotal();
    var addonsHtml = extrasEntry();
    var runYear = p[S.tier] + addSum;
    var runHtml = '<div class="running card"><h3>Your Total · ' + P.tiers[S.tier].label + '</h3>' +
      priceBlock(runYear, "annual") +
      (addSum ? '<p class="small muted" style="margin:0">Incl. ' + money(addSum) + '/yr À La Carte</p>' : '') +
      (lmSum ? '<p class="lm-due"><strong>Last-minute for next visit:</strong> ' + money(lmSum) + ' one-time (draft)</p>' : '') +
      (S.tier === "platinum" ? '<p class="small muted" style="margin:.35rem 0 0">Pay Yearly: Save 10%</p>' : "") +
      '</div>';
    var alacarteCta = '<p class="small" style="text-align:center">Not Ready? <button class="link mw-hover" data-act="alacarte" type="button">Shop À La Carte</button></p>';
    var strip = '<div class="price-strip n' + tierKeys().length + '" role="group" aria-label="Estimated Monthly Prices">' + tierKeys().map(function (k) {
      var t = P.tiers[k], sel = S.tier === k, pts = (t.keyPoints || t.features.slice(0, 3)).filter(function (x) { return x !== "And More"; });
      return '<button type="button" class="ps-row mw-hover' + (sel ? " sel" : "") + (t.recommended ? " rec" : "") + '" data-tier="' + k + '" aria-pressed="' + sel + '">' +
        '<span class="ps-head"><span class="ps-name">' + t.label + '</span>' + (t.recommended ? '<span class="ps-pop">Most Popular</span>' : '') +
        '<span class="ps-amt"><span class="ps-num" data-amt="' + monthlyOf(p[k]) + '">' + money(monthlyOf(p[k])) + '</span><small>/Mo</small></span></span>' +
        '<span class="ps-pts">' + pts.map(function (x) { return '<span>' + x + '</span>'; }).join("") + '</span></button>';
    }).join("") + '</div>';
    return '<section class="pr-top"><div class="qf-top">' + backBtn() + '<span class="pr-tag hm-chip t3">' + I("shield", "xs") + 'Free Estimate</span></div>' +
      '<div class="pr-head">' + qArt("clipboard", 3) + '<div><h1 class="qf-h">Your Price</h1><p class="qf-help">Tap a plan. ' + esc(P.tiers[S.tier].label) + ' is selected.</p></div></div>' +
      strip +
      '<button class="btn btn-primary btn-big mw-hover pr-cta" data-act="signup" type="button">Sign Up for ' + P.tiers[S.tier].label + '</button>' +
      '<button class="btn btn-outline btn-big mw-hover pr-alt" data-act="alacarte" type="button">' + I("grid", "xs") + ' Shop À La Carte</button></section>' +
      '<p class="small muted pr-offer">Welcome Offer: Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term. Refer a Neighbor: 1 Month Free Each. Free months are added at the end of your term and apply once you complete it.</p>' +
      '<h2 class="pr-more">Plan Details</h2>' +
      tiersHtml + status +
      (final ? "" : '<details class="acc est-note"><summary class="mw-hover">Estimate. Final After Photos or Visit.</summary><div class="acc-body small">If photos or the site visit show something different, we adjust before your first billed visit.' + (unsure ? ' Unsure answers use a typical metro Detroit home.' : '') + ' Draft prices.</div></details>') +
      addonsHtml + runHtml +
      '<button class="btn btn-primary btn-big mw-hover" data-act="signup" type="button">Sign Up for ' + P.tiers[S.tier].label + '</button>' +
      (!S.photosComplete && !S.visit ? '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="photos" type="button">' + I("camera", "xs") + ' Add Photos</button><button class="btn btn-outline mw-hover" data-act="visit" type="button">' + I("van", "xs") + ' Free Tech Visit</button></div>' : "") + alacarteCta;
  }

  var lastScreen = null;
  function revealPrices() {
    var fresh = lastScreen !== "quote"; lastScreen = "quote";
    var rows = app.querySelector(".price-strip");
    if (!rows || !fresh) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rows.classList.add("reveal");
    app.querySelectorAll(".ps-num[data-amt]").forEach(function (el, ix) {
      var to = Number(el.getAttribute("data-amt")), t0 = null, dur = 750, delay = 120 * ix;
      el.textContent = money(0);
      function step(ts) { if (t0 === null) t0 = ts + delay; var k = Math.max(0, Math.min(1, (ts - t0) / dur)); var e = 1 - Math.pow(1 - k, 3); el.textContent = money(to * e); if (k < 1) requestAnimationFrame(step); else el.textContent = money(to); }
      requestAnimationFrame(step);
    });
  }
  function totals() {
    var amt = price()[S.tier], add = addonsAnnual(), lm = lastMinuteTotal();
    var addonIds = (S.addons || []).slice(), lmIds = (S.lastMinute || []).slice();
    var refIn = (S.referralCodeIn || (S.signup && S.signup.referralCodeIn) || "").trim();
    if (S.plan === "biennial") {
      var mem2 = amt * 2, add2 = add * 2, prepaid = mem2 + add2;
      var save6 = Math.round(amt / 2);
      return { plan: "biennial", label: "Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term (Draft)", today: prepaid, year: prepaid, membership: mem2, membershipAnnual: amt, addons: add2, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "biennial", termMonths: 30, save: save6, freeMonths: 6, referralCodeIn: refIn,
        note: money(Math.round(mem2 / 24)) + "/Month, prepaid " + money(prepaid) + " for 2 years. 6 extra months free at the end of your term (draft)." };
    }
    if (S.tier === "silver" || S.tier === "gold") {
      return { plan: "annual", label: "Paid in Full Annually, Up Front", today: amt + add, year: amt + add, membership: amt, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "annual", termMonths: 12, referralCodeIn: refIn,
        note: (S.tier === "silver" ? "Essentials" : "Plus") + " is paid in full for the year, up front." };
    }
    if (S.plan === "quarterly") return { plan: "quarterly", label: "4 Quarterly Payments", today: (amt + add) / 4, year: amt + add, membership: amt, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "quarterly", termMonths: 12, referralCodeIn: refIn, note: "4 payments of " + money((amt + add) / 4) + "." };
    var disc = Math.max(round(amt * (1 - P.platinumAnnualDiscount)), P.minAnnual || 1188);
    return { plan: "annual", label: "Paid Annually, Up Front (10% Off, Draft)", today: disc + add, year: disc + add, membership: disc, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "annualDiscount", termMonths: 12, save: amt - disc, referralCodeIn: refIn, note: "You save " + money(amt - disc) + " on membership (draft discount). Add-ons are full price." };
  }

  function cancelExample(tier) {
    var bd = breakdown(tier || S.tier || "gold");
    var prepaid = bd.year;
    var done = [];
    var spent = 0;
    bd.lines.forEach(function (L) {
      if (L.kind === "addon" || L.kind === "lastMinute" || L.amt <= 0) return;
      if (done.length >= 2) return;
      done.push(L);
      spent += L.amt;
    });
    if (!done.length) {
      spent = Math.min(400, prepaid);
      done = [{ label: "1 seasonal visit (example)", amt: spent }];
    }
    var refund = Math.max(0, prepaid - spent);
    return {
      prepaid: prepaid, spent: spent, refund: refund, done: done,
      html: '<p class="small"><strong>Worked example (draft):</strong> You prepaid <strong>' + money(prepaid) + '</strong> for ' + (P.tiers[tier || S.tier].label) + '. Before canceling we completed: ' +
        done.map(function (L) { return esc(L.label) + " (" + money(L.amt) + ")"; }).join(" and ") +
        '. Services completed total <strong>' + money(spent) + '</strong>. Your refund is <strong>' + money(refund) + '</strong> (prepaid minus completed). No cancellation fee.</p>'
    };
  }
  function cancelPolicyCard(tier) {
    var ex = cancelExample(tier);
    return '<details class="card cancel-policy acc" id="cancelPolicy"><summary class="mw-hover">' + I("refund", "xs") + ' Cancel Anytime, No Fee. Fair Refunds.</summary><div class="acc-body">' +
      '<span class="draft">DRAFT, pending legal review</span>' +
      '<p>You may cancel at any time. <strong>There is no cancellation fee.</strong> Your refund equals the prepaid amount minus the itemized price of services already completed — the same lines shown in Detailed Pricing. Unused visits and unfinished line items are refunded. This is not a time-based proration.</p>' +
      '<p class="retention">' + I("gift", "xs") + '<span><strong>Stay Offer:</strong> Thinking of canceling or renewing? Members of 6+ months get 1 month free to stay. Members of 1+ year get 2 months free. Optional, never required to cancel.</span></p>' +
      '<p><strong>Welcome offers (draft):</strong> Free months from the 2-year prepay or from referrals carry <strong>no refund value</strong>. Only prepaid dollars (what you paid) are refundable after deducting completed services. Referral free months are credited only after the referred neighbor\'s first payment has cleared.</p>' +
      ex.html +
      '<p class="small muted" style="margin:0">Final terms pending legal review.</p></div></details>';
  }
  function agreementHtml() {
    var ex = cancelExample(S.tier);
    return '<span class="draft">DRAFT, pending legal review</span><h4>Smart Upkeep Membership Agreement</h4><p>This placeholder agreement is between you (the Member) and Smart Upkeep. It is not final and is shown for prototype purposes only.</p><h4>1. Services</h4><p>Smart Upkeep will perform the maintenance visits and services listed for your selected membership tier at the service address, on a schedule we set with you.</p><h4>2. Term and Renewal</h4><p>The membership runs for 12 months from your first visit, or 30 months if you choose Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term (24 paid months, then 6 free months added at the end), plus any referral free months credited after a referred neighbor\'s first payment clears. Renewal terms are to be determined.</p><h4>3. Pricing and Adjustments</h4><p>Your price is based on the information and photos you provide. If photos or answers do not match what we find on site, pricing will be adjusted and you may accept the new price or cancel before your first billed visit.</p><h4>4. Payment</h4><p>Essentials and Plus memberships are paid in full annually, up front, or as a 2-year prepay welcome offer. Complete memberships may be paid in 4 quarterly payments, annually up front at a discount, or as a 2-year prepay welcome offer. No membership is priced below $99/Month. Referral free months are credited only after the referred neighbor\'s first payment has cleared.</p><h4>5. Access</h4><p>You agree to provide reasonable access to the home and equipment at scheduled times.</p><h4>6. Recall Monitoring</h4><p>We will monitor logged equipment for published manufacturer recalls and notify you. We do not guarantee that every recall will be identified.</p><h4>7. Cancellation and Refunds</h4><p>You may cancel at any time. There is no cancellation fee. If you cancel after prepaying, your refund equals the prepaid amount minus the itemized price of services already completed (using the same line items shown in Detailed Pricing). Unused visits and unfinished line items are refunded. Refunds are not based on calendar time remaining in the term. Free months from welcome offers (2-year prepay or referrals) carry no refund value. Stay Offer: if you ask to cancel or come up for renewal after 6 or more months of membership, we offer 1 month free to stay; after 1 year or more, 2 months free. Accepting is optional and never required to cancel; stay-offer months carry no refund value.</p><h4>8. Michigan Home Solicitation Cancel Right</h4><p><strong>DRAFT, pending legal review.</strong> YOU, THE BUYER, MAY CANCEL THIS TRANSACTION AT ANY TIME PRIOR TO MIDNIGHT OF THE THIRD BUSINESS DAY AFTER THE DATE OF THIS TRANSACTION. SEE THE ATTACHED NOTICE OF CANCELLATION FORM FOR AN EXPLANATION OF THIS RIGHT. (MCL 445.113)</p>' + ex.html;
  }
  var WAIVER = '<span class="draft">DRAFT, pending legal review</span><h4>Liability Waiver</h4><p>This placeholder waiver is for prototype purposes only and is not final.</p><p>Maintenance visits are preventive and do not guarantee that equipment will not fail. Smart Upkeep is not responsible for pre-existing conditions, normal wear, or failures of equipment that is past its service life. Our licensed and insured technicians will take reasonable care. Liability limits, exclusions and insurance details are to be determined by legal review.</p>';

  function sigBlock(id) {
    return '<div class="sig" data-sig="' + id + '"><div class="sig-tabs"><button type="button" class="btn btn-primary mw-hover" data-sigmode="draw">Draw</button><button type="button" class="btn btn-outline mw-hover" data-sigmode="type">Type</button></div>' +
      '<canvas class="sigpad" aria-label="Draw your signature"></canvas><input type="text" class="typed-sig hide" placeholder="Type your full name" aria-label="Typed signature">' +
      '<button type="button" class="link mw-hover" data-sigclear="1">Clear</button></div>';
  }

  function selectedAlacarte() {
    var ids = Array.isArray(S.alacarte) ? S.alacarte : [];
    return ids.map(findService).filter(Boolean);
  }
  function alacarteTotal() {
    return selectedAlacarte().reduce(function (s, a) { return s + serviceOncePrice(a); }, 0);
  }
  function oncePriceLabel(a) {
    if (a.price != null) return money(a.price);
    return money(a.annual) + (a.unit === "season" ? "/Season" : "");
  }
  function alacarte() {
    var bk = S.alacarteBooking || {};
    var list = selectedAlacarte();
    var total = alacarteTotal();
    var picks = '<div class="addons"><h3>Services</h3>' +
      renderAddonList(P.addons || [], S.alacarte || [], "alacarte", oncePriceLabel, true) + '</div>' +
      '<div class="addons last-minute"><h3>Shop À La Carte: Quick Jobs</h3>' +
      
      renderAddonList(P.lastMinute || [], S.alacarte || [], "alacarte", oncePriceLabel, true) + '</div>';
    return backBtn() + '<h1>Shop À La Carte</h1>' +
      
      picks +
      '<div class="running card"><h3>One-Time Total (Draft)</h3>' +
      (list.length ? '<div class="price">' + money(total) + '<small> one-time</small></div><ul class="feat">' + list.map(function (x) { return '<li>' + esc(x.label) + ' · ' + money(serviceOncePrice(x)) + '</li>'; }).join("") + '</ul>' : '<p class="muted" style="margin:0">Pick a Service</p>') +
      '</div>' +
      '<form id="acF" novalidate class="stack">' +
      '<div class="card"><h3>Booking Request</h3>' +
      '<label class="fl" for="acName">Full Name</label><input id="acName" type="text" autocomplete="name" value="' + esc(bk.name || "") + '">' +
      '<div class="grid2"><div><label class="fl" for="acPhone">Phone</label><input id="acPhone" type="tel" autocomplete="tel" value="' + esc(bk.phone || "") + '"></div>' +
      '<div><label class="fl" for="acEmail">Email</label><input id="acEmail" type="email" autocomplete="email" value="' + esc(bk.email || "") + '"></div></div>' +
      '<label class="fl" for="acDates">Preferred Dates</label><textarea id="acDates" rows="3" placeholder="e.g. Week of Oct 20, or any Tuesday morning">' + esc(bk.dates || "") + '</textarea>' +
      '<label class="fl" for="acNotes">Notes (Optional)</label><textarea id="acNotes" rows="2" placeholder="Gate code, pets, access notes…">' + esc(bk.notes || "") + '</textarea></div>' +
      '<div class="err" id="acErr" role="alert"></div>' +
      '<button class="btn btn-primary btn-big mw-hover" type="submit">Submit Booking Request</button></form>' +
      '<p class="small" style="margin-top:1rem;text-align:center"><button type="button" class="link mw-hover" data-act="toQuote">See Memberships</button></p>';
  }
  function alacarteConfirm() {
    var bk = S.alacarteBooking || {}, list = (bk.services || []).map(findService).filter(Boolean);
    var total = list.reduce(function (s, a) { return s + serviceOncePrice(a); }, 0);
    return '<div class="check-big" aria-hidden="true">&#10003;</div><p class="eyebrow">Request Received</p><h1>Thanks' + (bk.name ? ", " + esc(bk.name.split(" ")[0]) : "") + '. We Got Your Booking Request.</h1>' +
      '<div class="card"><h3>Summary</h3><div class="summary">' +
      '<div><span>Type</span><span>A La Carte (No Membership)</span></div>' +
      list.map(function (x) { return '<div><span>' + esc(x.label) + '</span><span>' + money(serviceOncePrice(x)) + '</span></div>'; }).join("") +
      '<div><span>One-Time Total (Draft)</span><span>' + money(total) + '</span></div>' +
      '<div><span>Preferred Dates</span><span>' + esc(bk.dates) + '</span></div>' +
      '<div><span>Contact</span><span>' + esc(bk.phone) + ' · ' + esc(bk.email) + '</span></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Next Steps</h3><ol class="feat"><li>We will confirm availability by phone or email within one business day.</li><li>No card is charged in this prototype.</li><li>Want ongoing care instead? Memberships start at $99/Month.</li></ol></div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="toQuote" type="button">See Memberships</button><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }

  function signup() {
    var p = price(), su = S.signup || {}, t = totals();
    var addr = su.address || (S.answers.zip && S.answers.zip !== "unsure" ? S.answers.zip : "");
    var add = addonsAnnual();
    var platDisc = Math.max(round(p.platinum * (1 - P.platinumAnnualDiscount)), P.minAnnual || 1188);
    var listed = p[S.tier];
    var twoPrepaid = listed * 2 + add * 2;
    var planOpts = [];
    if (S.tier === "platinum") {
      planOpts.push(["quarterly", "4 Quarterly Payments", p.platinum + add, "quarterly"]);
      planOpts.push(["annual", "Pay Annually, Up Front, Save 10% (Draft)", platDisc + add, "annualDiscount"]);
    } else {
      planOpts.push(["annual", P.tiers[S.tier].label + ": Paid in Full Annually, Up Front", listed + add, "annual"]);
    }
    planOpts.push(["biennial", "Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term (Draft)", twoPrepaid, "biennial"]);
    var planHtml = '<div class="opts">' + planOpts.map(function (o) {
      var s = S.plan === o[0];
      var extra = "";
      return '<button type="button" class="opt mw-hover' + (s ? " sel" : "") + '" data-plan="' + o[0] + '"><span class="chk">' + (s ? "&#10003;" : "") + '</span><span><strong>' + o[1] + '</strong>' + priceBlock(o[2], o[3]) + extra + '</span></button>';
    }).join("") + '</div>' + offerTermsShort();
    var addonSummary = selectedAddons().length
      ? selectedAddons().map(function (x) { return '<div><span>Add-on: ' + esc(x.label) + '</span><span>' + money(x.annual) + '/yr</span></div>'; }).join("")
      : '<div><span>Add-ons</span><span>None selected</span></div>';
    var lmSummary = selectedLastMinute().length
      ? selectedLastMinute().map(function (x) { return '<div><span>Last-minute: ' + esc(x.label) + '</span><span>' + money(x.price) + '</span></div>'; }).join("") +
        '<div><span>Last-Minute Due with Next Visit</span><span>' + money(lastMinuteTotal()) + '</span></div>'
      : '';
    return backBtn() + stepRail(4) + '<h1>Sign Up for ' + P.tiers[S.tier].label + '</h1>' +
      '<form id="suF" novalidate class="stack">' +
      '<div class="card"><h3>Your Details</h3><label class="fl" for="sAddr">Service Address</label><input id="sAddr" type="text" autocomplete="street-address" value="' + esc(addr) + '">' +
      '<div class="grid2"><div><label class="fl" for="sName">Full Name</label><input id="sName" type="text" autocomplete="name" value="' + esc(su.name || (S.visit && S.visit.name) || "") + '"></div>' +
      '<div><label class="fl" for="sPhone">Phone</label><input id="sPhone" type="tel" autocomplete="tel" value="' + esc(su.phone || (S.visit && S.visit.phone) || "") + '"></div></div>' +
      '<label class="fl" for="sEmail">Email</label><input id="sEmail" type="email" autocomplete="email" value="' + esc(su.email || (S.visit && S.visit.email) || "") + '">' +
      '<label class="fl" for="sRef">Referral Code (Optional)</label><input id="sRef" type="text" autocomplete="off" autocapitalize="characters" placeholder="e.g. SU-HOME-1234" value="' + esc(S.referralCodeIn || su.referralCodeIn || "") + '">' +
      
      '<label class="checkrow yard-sign"><input type="checkbox" id="sYardSign"' + (su.yardSignOk ? " checked" : "") + '><span>Yard Sign OK? Free Detector Battery Swap</span></label></div>' +
      cancelPolicyCard(S.tier) +
      '<div class="card"><h3>Membership Agreement</h3><details class="acc"><summary class="mw-hover">Read Agreement</summary><div class="legal acc-body" tabindex="0">' + agreementHtml() + '</div></details>' +
      miCancelNotice() + '<label class="checkrow"><input type="checkbox" id="agree"><span>I agree to the Membership Agreement.</span></label><p class="fl">Signature</p>' + sigBlock("agreeSig") + '</div>' +
      '<div class="card"><h3>Liability Waiver</h3><details class="acc"><summary class="mw-hover">Read Waiver</summary><div class="legal acc-body" tabindex="0">' + WAIVER + '</div></details>' +
      '<label class="checkrow"><input type="checkbox" id="waive"><span>I have read and accept the Liability Waiver.</span></label><p class="fl">Signature</p>' + sigBlock("waiverSig") + '</div>' +
      '<div class="card"><h3>Payment Plan</h3>' + planHtml +
      '<div class="summary-price" style="margin-top:1rem">' + priceBlock(t.year, t.billKind) + '</div>' +
      '<div class="summary"><div><span>Plan</span><span>' + P.tiers[S.tier].label + ' (' + P.tiers[S.tier].visits + ' visits a year)</span></div><div><span>Payment</span><span>' + t.label + '</span></div>' +
      (t.plan === "biennial" ? '<div><span>Term</span><span>24 Paid Months + 6 Free Months at the End</span></div>' : "") +
      (t.save ? '<div><span>' + (t.plan === "biennial" ? "Value of 6 Free Months at the End (Draft)" : "Annual Discount (Draft)") + '</span><span>' + (t.plan === "biennial" ? "" : "&minus;") + money(t.save) + '</span></div>' : "") +
      ((S.referralCodeIn || "").trim() ? '<div><span>Referral Code Applied</span><span>' + esc((S.referralCodeIn || "").trim()) + ' · free month after your payment clears</span></div>' : "") +
      addonSummary + lmSummary +
      '<div><span>Due at Sign Up (Estimated)</span><span>' + money(t.today) + '</span></div></div></div>' +
      '<div class="card paybox"><h3>Payment</h3><div class="demo">Demo: No Card Charged</div>' +
      '<fieldset disabled style="border:0;padding:0;margin:0"><label class="fl">Card Number</label><input type="text" placeholder="•••• •••• •••• ••••" autocomplete="off"><div class="grid2"><div><label class="fl">Expiry</label><input type="text" placeholder="MM / YY" autocomplete="off"></div><div><label class="fl">CVC</label><input type="text" placeholder="•••" autocomplete="off"></div></div></fieldset></div>' +
      '<div class="err" id="suErr" role="alert"></div><button class="btn btn-primary btn-big mw-hover" type="submit">Complete Sign Up (Demo)</button></form>';
  }

  function confirm() {
    var su = S.signup || {}, t = su.totals || totals();
    var next = S.visit ? "We Confirm Your Tech Visit" : S.photosComplete ? "We Review Your Photos" : "We Confirm Your Final Price";
    return backBtn() + '<div class="check-big" aria-hidden="true">&#10003;</div><h1>Welcome to Smart Upkeep' + (su.name ? ", " + esc(su.name.split(" ")[0]) : "") + '.</h1>' +
      '<div class="card"><h3>Summary</h3>' +
      '<div class="summary-price">' + priceBlock(t.year, t.billKind || (t.plan === "quarterly" ? "quarterly" : (S.tier === "platinum" && t.plan === "annual" ? "annualDiscount" : "annual"))) + '</div>' +
      '<div class="summary"><div><span>Membership</span><span>' + P.tiers[S.tier].label + '</span></div><div><span>Service Address</span><span>' + esc(su.address) + '</span></div><div><span>Payment</span><span>' + esc(t.label) + '</span></div>' +
      (function () {
        var ids = t.addonIds || S.addons || [];
        var list = (P.addons || []).filter(function (a) { return ids.indexOf(a.id) > -1; });
        var lmIds = t.lastMinuteIds || S.lastMinute || [];
        var lm = (P.lastMinute || []).filter(function (a) { return lmIds.indexOf(a.id) > -1; });
        var html = list.length ? list.map(function (x) { return '<div><span>Add-on: ' + esc(x.label) + '</span><span>' + money(x.annual) + '/yr</span></div>'; }).join("") : '<div><span>Add-ons</span><span>None</span></div>';
        if (lm.length) html += lm.map(function (x) { return '<div><span>Last-minute: ' + esc(x.label) + '</span><span>' + money(x.price) + '</span></div>'; }).join("");
        return html;
      })() +
      '<div><span>Due at Sign Up (Demo, Not Charged)</span><span>' + money(t.today) + '</span></div><div><span>Signed</span><span>Agreement and Waiver</span></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Next</h3><ol class="feat"><li>' + next + '</li><li>We Book Visit One</li></ol></div>' +
      (function () {
        var code = (su.myReferralCode || makeReferralCode(su.name));
        if (!su.myReferralCode) { su.myReferralCode = code; S.signup = su; try { save(); } catch (e) {} }
        var shareText = "Join Smart Upkeep with my code " + code + " — we both get a free month after your first payment clears. " + (location.origin + location.pathname);
        return '<div class="card referral-card" style="margin-top:1rem">' +
          '<h3>Refer a Neighbor</h3>' +
          '<p class="muted">You Both Get a Month Free</p>' +
          '<p class="ref-code" id="myRefCode">' + esc(code) + '</p>' +
          '<div class="btn-row">' +
          '<button type="button" class="btn btn-primary mw-hover" data-copy-ref="1">Copy Code</button>' +
          '<button type="button" class="btn btn-outline mw-hover" data-share-ref="1">Share Invite</button>' +
          '</div>' +
          '<p class="small muted" style="margin:.6rem 0 0" id="refCopyMsg"></p>' +
          '<p class="hide" id="refShareText">' + esc(shareText) + '</p></div>';
      })() +
      '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }

  /* Add-on event log: placeholder until real analytics. Local only, capped at 500 events. */
  var EVKEY = "smartUpkeep.addonEvents";
  function logAddon(type, ids, ctx) {
    ids = [].concat(ids || []).filter(Boolean); if (!ids.length) return;
    var ev = { t: new Date().toISOString(), type: type, ids: ids, ctx: ctx || "" };
    try { var a = JSON.parse(localStorage.getItem(EVKEY) || "[]"); a.push(ev); if (a.length > 500) a = a.slice(-500); localStorage.setItem(EVKEY, JSON.stringify(a)); } catch (e) {}
    try { console.info("[addon-event]", ev); } catch (e) {}
  }
  function bindReferralShare() {
    var txt = document.getElementById("refShareText"), msg = document.getElementById("refCopyMsg"), codeEl = document.getElementById("myRefCode");
    function say(m) { if (msg) { msg.textContent = m; setTimeout(function () { msg.textContent = ""; }, 2500); } }
    function copy(v, m) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { say(m); }, function () { say(v); });
      else say(v);
    }
    var c = app.querySelector("[data-copy-ref]"), sh = app.querySelector("[data-share-ref]");
    if (c && codeEl) c.addEventListener("click", function () { copy(codeEl.textContent, "Code Copied"); });
    if (sh && txt) sh.addEventListener("click", function () {
      var v = txt.textContent;
      if (navigator.share) { navigator.share({ title: "Smart Upkeep", text: v }).catch(function (e) { if (e && e.name !== "AbortError") copy(v, "Invite Copied"); }); return; }
      copy(v, "Invite Copied");
    });
  }
  /* ---------- Events ---------- */
  function bind() {
    app.querySelectorAll("[data-cert]").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = b.closest(".tech-card"), out = card && card.querySelector(".cert-explain");
        card.querySelectorAll("[data-cert]").forEach(function (o) { o.classList.remove("on"); o.setAttribute("aria-expanded", "false"); });
        b.classList.add("on"); b.setAttribute("aria-expanded", "true");
        if (out) out.textContent = b.textContent.replace(/^\W+/, "") + ": " + b.getAttribute("data-explain");
      });
    });
    app.querySelectorAll("[data-verify]").forEach(function (b) {
      b.addEventListener("click", function () {
        var w = b.closest(".tech-wrap"), r = w && w.querySelector(".verify-result");
        if (r) { r.hidden = false; b.classList.add("done"); b.lastChild.textContent = "License Verified"; }
      });
    });
    app.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { act(b.getAttribute("data-act")); }); });
    var s = S.screen;
    if (/^q\d$/.test(s)) bindQ(Number(s.slice(1)));
    var pc = app.querySelector("[data-plan-chip]"), pl = app.querySelector("#qfPlans");
    if (pc && pl) {
      pc.addEventListener("click", function () { var o = pl.hidden; pl.hidden = !o; pc.setAttribute("aria-expanded", String(o)); });
      app.querySelectorAll("[data-plan-pick]").forEach(function (b) { b.addEventListener("click", function () { S.tier = b.getAttribute("data-plan-pick"); save(); render(); }); });
    }
    document.body.classList.toggle("on-qf", /^q\d$/.test(s) || s === "choice");
    var tb = document.querySelector(".topbar"); if (tb) document.documentElement.style.setProperty("--tb", tb.offsetHeight + "px");
    if (s === "quote") revealPrices(); else lastScreen = s;
    if (s === "quote" || s === "alacarte") {
      var seen = []; app.querySelectorAll("[data-addon],[data-lastminute],[data-alacarte]").forEach(function (b) { seen.push(b.getAttribute("data-addon") || b.getAttribute("data-lastminute") || b.getAttribute("data-alacarte")); });
      if (!bind._viewed) bind._viewed = {};
      if (!bind._viewed[s]) { bind._viewed[s] = 1; logAddon("view", seen, s); }
    }
    if (s === "quote") {
      var xs = app.querySelector(".xt-sheet");
      function xtSet(o) { XT.open = o; if (xs) xs.hidden = !o; document.body.classList.toggle("xt-lock", o); }
      app.querySelectorAll("[data-xt-open]").forEach(function (b) { b.addEventListener("click", function () { xtSet(true); logAddon("view", (P.addons || []).map(function (a) { return a.id; }), "extras-sheet"); }); });
      app.querySelectorAll("[data-xt-close]").forEach(function (b) { b.addEventListener("click", function () { XT.pick = null; xtSet(false); render(); }); });
      if (xs) xs.addEventListener("click", function (e) { if (e.target === xs) { XT.pick = null; xtSet(false); render(); } });
      app.querySelectorAll("[data-xt]").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-xt"); XT.pick = XT.pick === v ? null : v; render(); var d = app.querySelector(".xt-detail"); if (d) d.scrollIntoView({ block: "nearest" }); }); });
      document.body.classList.toggle("xt-lock", XT.open);
      app.querySelectorAll("[data-tier]").forEach(function (c) {
        function pick(e) {
          if (e && e.target.closest("[data-act], [data-detail], [data-addon], [data-lastminute]")) return;
          S.tier = c.getAttribute("data-tier"); save(); render();
        }
        c.addEventListener("click", pick);
        c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
      app.querySelectorAll("[data-addon]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = b.getAttribute("data-addon");
          S.addons = Array.isArray(S.addons) ? S.addons.slice() : [];
          var ix = S.addons.indexOf(id);
          if (ix > -1) S.addons.splice(ix, 1); else S.addons.push(id); logAddon(ix > -1 ? "untap" : "tap", id, "data-addon");
          save();
          var y = window.scrollY; render(); window.scrollTo(0, y);
        });
      });
      app.querySelectorAll("[data-lastminute]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = b.getAttribute("data-lastminute");
          S.lastMinute = Array.isArray(S.lastMinute) ? S.lastMinute.slice() : [];
          var ix = S.lastMinute.indexOf(id);
          if (ix > -1) S.lastMinute.splice(ix, 1); else S.lastMinute.push(id); logAddon(ix > -1 ? "untap" : "tap", id, "data-lastminute");
          save();
          var y = window.scrollY; render(); window.scrollTo(0, y);
        });
      });
      app.querySelectorAll("[data-detail]").forEach(function (b) {
        b.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); openPriceDetail(b.getAttribute("data-detail")); });
      });
    }
    if (s === "alacarte") bindAlacarte();
    if (s === "photos") app.querySelectorAll("[data-photo]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var id = inp.getAttribute("data-photo"); photoMem[id] = photoMem[id] || [];
        Array.prototype.forEach.call(inp.files || [], function (f) { if (/^image\//.test(f.type)) photoMem[id].push(URL.createObjectURL(f)); });
        S.photos[id] = photoMem[id].length; save(); render();
      });
    });
    if (s === "visit") bindVisit();
    if (s === "signup") bindSignup();
    if (s === "confirm") bindReferralShare();
  }
  function act(a) {
    if (a === "back") return back();
    if (a === "home") return go("home");
    if (a === "start") { var sc = app.querySelector("#row-plans .hm-plan.sel"); if (sc && P.tiers[sc.getAttribute("data-tier")]) S.tier = sc.getAttribute("data-tier"); return go("q0"); }
    if (a === "watch") return openVideo(true);
    if (a === "q0") return go("q0");
    if (a === "photos") return go("photos");
    if (a === "visit") return go("visit");
    if (a === "toQuote") return go("quote");
    if (a === "signup") { if ((S.tier === "silver" || S.tier === "gold") && S.plan === "quarterly") S.plan = "annual"; return go("signup"); }
    if (a === "alacarte") return go("alacarte");
    if (a === "photosDone") { var c = photoCards(); S.photosComplete = c.every(function (x) { return (S.photos[x[0]] || 0) > 0; }); return go("quote"); }
    if (a === "restart") { S = fresh(); photoMem = {}; save(); render(); window.scrollTo(0, 0); }
  }
  function bindQ(i) {
    var q = Q[i], nextB = app.querySelector('[data-act="next"]') || document.createElement("button");
    function refresh() { nextB.disabled = !isAnswered(q); save(); }
    nextB.removeAttribute("data-act");
    nextB.addEventListener("click", function () {
      if (q.type === "zip" && S.answers.zip !== "unsure") {
        var z = zipOf(S.answers.zip), err = document.getElementById("zipErr");
        if (!z) { err.textContent = "Please include a 5-digit ZIP code, or tap Unsure."; return; }
        if (!inArea(z) && !S._zipOk) { S._zipOk = true; err.textContent = "ZIP " + z + " looks outside metro Detroit. You can still get an estimate; tap Next again to continue."; return; }
      }
      go(i + 1 < Q.length ? "q" + (i + 1) : "choice");
    });
    var zip = document.getElementById("zip");
    if (zip) zip.addEventListener("input", function () { S.answers.zip = zip.value; S._zipOk = false; document.getElementById("zipErr").textContent = ""; app.querySelector("[data-unsure]").classList.remove("sel"); refresh(); });
    function nextQ() { go(i + 1 < Q.length ? "q" + (i + 1) : "choice"); }
    /* Tap to auto-advance: brief selected flash, then the next step. */
    function flashGo(b) { b.classList.add("sel", "pop"); app.classList.add("qf-busy"); setTimeout(function () { app.classList.remove("qf-busy"); nextQ(); }, 220); }
    function whReady() { var c = S.answers.waterHeaters, t = S.answers.whType; return c !== undefined && c !== "unsure" && t && t !== "unsure"; }
    app.querySelectorAll("[data-single]").forEach(function (b) { b.addEventListener("click", function () { if (app.classList.contains("qf-busy")) return; S.answers[q.id] = b.getAttribute("data-single"); save(); if (q.type !== "wh" || whReady()) flashGo(b); else render(); }); });
    app.querySelectorAll("[data-wh]").forEach(function (b) { b.addEventListener("click", function () { if (app.classList.contains("qf-busy")) return; S.answers.whType = b.getAttribute("data-wh"); if (S.answers.waterHeaters === "unsure") delete S.answers.waterHeaters; save(); if (whReady()) flashGo(b); else render(); }); });
    if (zip) zip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (!nextB.disabled) nextB.click(); } });
    app.querySelectorAll("[data-multi]").forEach(function (b) { b.addEventListener("click", function () {
      var k = b.getAttribute("data-multi"), cur = Array.isArray(S.answers[q.id]) ? S.answers[q.id] : [];
      if (k === "none") S.answers[q.id] = "none"; else { var ix = cur.indexOf(k); if (ix > -1) cur.splice(ix, 1); else cur.push(k); S.answers[q.id] = cur.length ? cur : undefined; }
      save(); render(); }); });
    var u = app.querySelector("[data-unsure]");
    if (u) u.addEventListener("click", function () {
      S.answers[q.id] = "unsure"; if (q.type === "wh" && !S.answers.whType) S.answers.whType = "unsure";
      if (zip) zip.value = "";
      save(); if (q.type === "multi") render(); else go(i + 1 < Q.length ? "q" + (i + 1) : "choice");
    });
  }
  function bindAlacarte() {
    app.querySelectorAll("[data-alacarte]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-alacarte");
        S.alacarte = Array.isArray(S.alacarte) ? S.alacarte.slice() : [];
        var ix = S.alacarte.indexOf(id);
        if (ix > -1) S.alacarte.splice(ix, 1); else S.alacarte.push(id); logAddon(ix > -1 ? "untap" : "tap", id, "data-alacarte");
        save();
        var y = window.scrollY; render(); window.scrollTo(0, y);
      });
    });
    function keep() {
      S.alacarteBooking = Object.assign({}, S.alacarteBooking, {
        name: val("acName"), phone: val("acPhone"), email: val("acEmail"), dates: val("acDates"), notes: val("acNotes")
      });
    }
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    ["acName","acPhone","acEmail","acDates","acNotes"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener("input", keep);
    });
    document.getElementById("acF").addEventListener("submit", function (e) {
      e.preventDefault(); keep();
      var b = S.alacarteBooking || {}, err = "";
      if (!(S.alacarte && S.alacarte.length)) err = "Pick at least one service.";
      else if (!b.name) err = "Enter your full name.";
      else if (!/\d{3}.*\d{3}.*\d{4}/.test(b.phone || "")) err = "Enter a valid phone number.";
      else if (!/^\S+@\S+\.\S+$/.test(b.email || "")) err = "Enter a valid email.";
      else if (!(b.dates && b.dates.length > 2)) err = "Share your preferred dates.";
      if (err) { document.getElementById("acErr").textContent = err; return; }
      b.services = (S.alacarte || []).slice();
      b.submittedAt = new Date().toISOString();
      logAddon("purchase", S.alacarte || [], "alacarte"); S.alacarteBooking = b; save(); go("alacarteConfirm");
    });
  }
  function bindVisit() {
    var v = S.visit ? Object.assign({}, S.visit) : { windows: [] };
    app.querySelectorAll("[data-win]").forEach(function (b) { b.addEventListener("click", function () {
      var t = b.getAttribute("data-win"), ix = v.windows.indexOf(t); if (ix > -1) v.windows.splice(ix, 1); else v.windows.push(t);
      b.classList.toggle("sel", ix < 0); b.querySelector(".chk").innerHTML = ix < 0 ? "&#10003;" : ""; }); });
    document.getElementById("visitF").addEventListener("submit", function (e) {
      e.preventDefault();
      v.date = val("vDate"); v.name = val("vName"); v.phone = val("vPhone"); v.email = val("vEmail");
      var err = !v.date ? "Pick a preferred date." : !v.windows.length ? "Pick at least one time window." : !v.name ? "Enter your name." : !/\d{3}.*\d{3}.*\d{4}/.test(v.phone) ? "Enter a valid phone number." : !/^\S+@\S+\.\S+$/.test(v.email) ? "Enter a valid email." : "";
      if (err) { document.getElementById("vErr").textContent = err; return; }
      v.requestedAt = new Date().toISOString(); v.completed = false; S.visit = v; go("quote");
    });
  }
  function fmtDate(d) { var t = new Date(d + "T12:00:00"); return isNaN(t) ? d : t.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function setupSig(root) {
    var c = root.querySelector("canvas"), typed = root.querySelector("input"), ctx, drawing = false, has = false, mode = "draw";
    function size() { var r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; c.width = r.width * dpr; c.height = r.height * dpr; ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0a0a0a"; has = false; }
    size();
    function pt(e) { var r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    c.addEventListener("pointerdown", function (e) { drawing = true; c.setPointerCapture(e.pointerId); var p = pt(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + .1, p[1] + .1); ctx.stroke(); has = true; });
    c.addEventListener("pointermove", function (e) { if (!drawing) return; var p = pt(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { c.addEventListener(ev, function () { drawing = false; }); });
    root.querySelectorAll("[data-sigmode]").forEach(function (b) { b.addEventListener("click", function () {
      mode = b.getAttribute("data-sigmode");
      root.querySelectorAll("[data-sigmode]").forEach(function (x) { x.className = "btn mw-hover " + (x === b ? "btn-primary" : "btn-outline"); });
      c.classList.toggle("hide", mode !== "draw"); typed.classList.toggle("hide", mode !== "type"); if (mode === "draw") size(); else typed.focus(); }); });
    root.querySelector("[data-sigclear]").addEventListener("click", function () { if (mode === "draw") size(); else typed.value = ""; });
    return { valid: function () { return mode === "draw" ? has : typed.value.trim().length >= 2; }, value: function () { return mode === "draw" ? "drawn" : "typed: " + typed.value.trim(); } };
  }
  function bindSignup() {
    var sigs = {}; app.querySelectorAll("[data-sig]").forEach(function (r) { sigs[r.getAttribute("data-sig")] = setupSig(r); });
    app.querySelectorAll("[data-plan]").forEach(function (b) { b.addEventListener("click", function () { keepFields(); S.plan = b.getAttribute("data-plan"); save(); var y = window.scrollY; render(); window.scrollTo(0, y); }); });
    function keepFields() {
      var ref = val("sRef");
      S.referralCodeIn = ref;
      S.signup = Object.assign({}, S.signup, { address: val("sAddr"), name: val("sName"), phone: val("sPhone"), email: val("sEmail"), referralCodeIn: ref, yardSignOk: !!(document.getElementById("sYardSign") || {}).checked });
    }
    ["sAddr", "sName", "sPhone", "sEmail", "sRef", "sYardSign"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { keepFields(); save(); }); });
    document.getElementById("suF").addEventListener("submit", function (e) {
      e.preventDefault(); keepFields();
      var s = S.signup, err = s.address.length < 5 ? "Enter your service address." : !s.name ? "Enter your full name." : !/^\S+@\S+\.\S+$/.test(s.email) ? "Enter a valid email." : !/\d{3}.*\d{3}.*\d{4}/.test(s.phone) ? "Enter a valid phone number." :
        !document.getElementById("agree").checked ? "Please check I agree on the Membership Agreement." : !sigs.agreeSig.valid() ? "Please sign the Membership Agreement." :
        !document.getElementById("waive").checked ? "Please accept the Liability Waiver." : !sigs.waiverSig.valid() ? "Please sign the Liability Waiver." : "";
      var box = document.getElementById("suErr"); box.textContent = err;
      if (err) { box.scrollIntoView({ block: "center" }); return; }
      var form = this;
      if (!form._offered) { form._offered = true; var off = pickFinalOffer(); if (off) { showFinalOffer(off, function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); }); return; } }
      s.agreementSignature = sigs.agreeSig.value(); s.waiverSignature = sigs.waiverSig.value(); s.signedAt = new Date().toISOString(); s.tier = S.tier; s.totals = totals(); s.referralCodeIn = S.referralCodeIn || s.referralCodeIn || ""; logAddon("purchase", (S.addons || []).concat(S.lastMinute || []), "signup:" + S.tier);
      if (!s.myReferralCode) s.myReferralCode = makeReferralCode(s.name);
      go("confirm");
    });
  }

  /* ---------- Detailed pricing modal ---------- */
  function ensurePriceModal() {
    var m = document.getElementById("priceModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "priceModal";
    m.className = "modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-label", "Detailed pricing");
    m.hidden = true;
    m.innerHTML = '<div class="modal-inner"><button type="button" class="modal-x mw-hover" data-price-close="1" aria-label="Close">&times;</button><div id="priceModalBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.getAttribute("data-price-close")) closePriceDetail();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !m.hidden) closePriceDetail();
    });
    return m;
  }
  function openPriceDetail(tier) {
    var bd = breakdown(tier), t = P.tiers[tier];
    var memLines = bd.lines.filter(function (L) { return L.kind !== "lastMinute"; });
    var lmLines = bd.lines.filter(function (L) { return L.kind === "lastMinute"; });
    var rows = memLines.map(function (L) {
      var right = L.amt === 0 ? "Included" : money(L.amt);
      return '<li><span>' + esc(L.label) + (L.est ? ' <span class="est">Estimated</span>' : "") + '</span><span>' + right + '</span></li>';
    }).join("");
    if (bd.floorLine) {
      rows += '<li class="sub"><span>' + esc(bd.floorLine.label) + '</span><span>+' + money(bd.floorLine.amt) + '</span></li>';
    }
    if (bd.discLine) {
      rows += '<li class="sub"><span>' + esc(bd.discLine.label) + '</span><span>&minus;' + money(Math.abs(bd.discLine.amt)) + '</span></li>';
    }
    if (bd.offerLine) {
      rows += '<li class="sub"><span>' + esc(bd.offerLine.label) + '</span><span>6 Extra Months at the End</span></li>';
      rows += '<li class="sub"><span>Prepaid for 24 months at listed price (floor honored)</span><span>' + money(bd.membership) + '</span></li>';
    }
    rows += '<li class="total"><span>' + (bd.termMonths === 30 ? "Prepaid total (30-month term)" : "Annual membership total") + '</span><span>' + money(bd.year) + '</span></li>';
    rows += '<li class="total"><span>' + "Monthly price" + '</span><span>' + money(bd.monthly) + '/Month</span></li>';
    if (bd.termMonths === 30) {
      rows += '<li class="sub"><span>Referral free months (if any)</span><span>Credited after neighbor\'s first payment clears · $0 refund value</span></li>';
    }
    if (lmLines.length) {
      rows += lmLines.map(function (L) {
        return '<li class="sub"><span>' + esc(L.label) + ' <span class="est">Next Visit</span></span><span>' + money(L.amt) + '</span></li>';
      }).join("");
      rows += '<li class="total"><span>Last-minute due with next visit</span><span>' + money(bd.lastMinute) + '</span></li>';
    }
    var bill = billLine(S.plan === "biennial" ? "biennial" : (tier === "platinum" && S.plan === "annual" ? "annualDiscount" : (tier === "platinum" && S.plan === "quarterly" ? "quarterly" : "annual")), bd.year);
    var extrasNote = [];
    if (bd.addons) extrasNote.push("selected add-ons");
    if (bd.lastMinute) extrasNote.push("last-minute extras");
    var body = '<p class="eyebrow">Detailed Pricing · Draft</p><h2>' + t.label + '</h2>' +
      '<p class="small muted">Here is exactly what goes into your ' + t.label + ' estimate, based on your answers' + (extrasNote.length ? " and " + extrasNote.join(" and ") : "") + '.</p>' +
      '<ul class="bd-list">' + rows + '</ul>' +
      '<p class="price-bill">' + bill + '</p>' +
      (bd.lastMinute ? '<p class="small muted">Last-minute extras are one-time with your next visit and are not part of the monthly membership figure.</p>' : "") +
      '<p class="small muted bd-foot">Lines marked Estimated came from an Unsure answer; we used a typical metro Detroit home for those. Prices are draft.</p>' +
      '<p class="cancel-link-wrap"><button type="button" class="detail-link" data-open-cancel="1">*Cancellation and Refund Policy</button></p>' +
      '<div id="cancelInModal" class="cancel-inline hide">' + cancelPolicyCard(tier) + '</div>' +
      '<button type="button" class="btn btn-primary btn-big mw-hover" data-price-close="1">Close</button>';
    var m = ensurePriceModal();
    document.getElementById("priceModalBody").innerHTML = body;
    var openCancel = document.querySelector("#priceModalBody [data-open-cancel]");
    if (openCancel) openCancel.addEventListener("click", function () {
      var box = document.getElementById("cancelInModal");
      if (box) { box.classList.toggle("hide"); var d = box.querySelector("details"); if (d) d.open = true; }
    });
    m.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closePriceDetail() {
    var m = document.getElementById("priceModal");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- Video modal ---------- */
  var modal = document.getElementById("videoModal"), vid = document.getElementById("explainer"), unmute = document.getElementById("unmuteBtn");
  function vSrc() { return window.matchMedia("(max-width: 600px), (orientation: portrait) and (max-width: 900px)").matches ? "video/explainer-9x16.mp4" : "video/explainer-16x9.mp4"; }
  function openVideo(userAsked) {
    var src = vSrc();
    if (vid.getAttribute("src") !== src) { vid.setAttribute("src", src); vid.setAttribute("poster", src.indexOf("9x16") > -1 ? "assets/poster-9x16.jpg" : "assets/poster-16x9.jpg"); }
    vid.muted = !userAsked; unmute.textContent = vid.muted ? "Unmute" : "Mute";
    modal.querySelector(".modal-inner").classList.toggle("portrait", src.indexOf("9x16") > -1);
    var badge = document.getElementById("videoStartAt");
    if (!badge) {
      badge = document.createElement("p");
      badge.id = "videoStartAt";
      badge.className = "start-at video-start-at";
      badge.textContent = "Membership Starting at $99/Month";
      var actions = modal.querySelector(".modal-actions");
      if (actions) actions.parentNode.insertBefore(badge, actions);
    }
    modal.hidden = false; document.body.style.overflow = "hidden";
    try { vid.currentTime = 0; } catch (e) {}
    var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { vid.muted = true; unmute.textContent = "Unmute"; vid.play().catch(function () {}); });
    document.getElementById("skipBtn").focus({ preventScroll: true });
  }
  function closeVideo() { vid.pause(); modal.hidden = true; document.body.style.overflow = ""; try { sessionStorage.setItem(VKEY, "1"); } catch (e) {} }
  document.getElementById("videoClose").addEventListener("click", closeVideo);
  document.getElementById("skipBtn").addEventListener("click", closeVideo);
  unmute.addEventListener("click", function () { vid.muted = !vid.muted; unmute.textContent = vid.muted ? "Unmute" : "Mute"; if (vid.paused) vid.play().catch(function () {}); });
  vid.addEventListener("ended", closeVideo);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeVideo(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeVideo(); });

  /* ---------- Share ---------- */
  document.getElementById("shareBtn").addEventListener("click", function () {
    var url = location.origin + location.pathname, p = price(), msg = document.getElementById("shareMsg");
    var text = "Smart Upkeep: home maintenance membership for metro Detroit.";
    if (S.screen === "quote" || S.screen === "signup" || S.screen === "confirm") text += " Memberships start at $99/Month. My estimate: Essentials " + money(monthlyOf(p.silver)) + "/Month, Plus " + money(monthlyOf(p.gold)) + "/Month, Complete " + money(monthlyOf(p.platinum)) + "/Month.";
    function copy() {
      var done = function () { msg.textContent = "Link Copied"; setTimeout(function () { msg.textContent = ""; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + " " + url).then(done, fallbackCopy); else fallbackCopy();
      function fallbackCopy() { var t = document.createElement("textarea"); t.value = text + " " + url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) { msg.textContent = url; } t.remove(); }
    }
    if (navigator.share) { navigator.share({ title: "Smart Upkeep", text: text, url: url }).catch(function (e) { if (e && e.name !== "AbortError") copy(); }); return; }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { location.href = "sms:?&body=" + encodeURIComponent(text + " " + url); setTimeout(copy, 600); return; }
    copy();
  });
  if (location.hash === "#home") { history.replaceState(null, "", location.pathname); S.screen = "home"; save(); }
  if (location.hash === "#start") { history.replaceState(null, "", location.pathname); if (S.screen !== "q0") go("q0"); }
  document.getElementById("logoHome").addEventListener("click", function (e) { e.preventDefault(); if (S.screen !== "home") go("home"); });

  function bootApp() {
    render();
    var dismissed = false; try { dismissed = sessionStorage.getItem(VKEY) === "1"; } catch (e) {}
    if (!dismissed && S.screen === "home") openVideo(false);
  }
  if (typeof window.SmartUpkeepAwaitGate === "function") window.SmartUpkeepAwaitGate(bootApp);
  else bootApp();
})();
