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
    { id: "sqft", type: "single", title: "About How Big Is Your Home?", help: "Finished square footage, a rough range is fine.",
      opts: [["1500", "Under 2,000 sq ft"], ["2500", "2,000 to 3,000 sq ft"], ["3500", "3,000 to 4,000 sq ft"], ["4500", "4,000 to 5,000 sq ft"], ["5500", "5,000 to 6,000 sq ft"], ["6500", "Over 6,000 sq ft"]] },
    { id: "furnaces", type: "single", title: "How Many Furnaces Do You Have?", help: "Most homes over 3,500 sq ft have two.", opts: [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4 or More"]] },
    { id: "acs", type: "single", title: "How Many AC Units?", help: "Count the outdoor condensers.", opts: [["0", "None"], ["1", "1"], ["2", "2"], ["3", "3 or More"]] },
    { id: "waterHeaters", type: "wh", title: "How Many Water Heaters?", help: "And what kind. Tankless units mount on the wall.", opts: [["1", "1"], ["2", "2"], ["3", "3 or More"]] },
    /* Funnel Deck (Max, Oct 14): no "When was your home built?" question. We look up home age from the address later. Water softener moved into Extras. */
    { id: "stories", type: "single", title: "How Many Stories Is Your Home?", help: "This sets gutter cleaning and ladder work.", opts: [["1", "1 Story (Ranch)"], ["2", "2 Stories"], ["3", "3 Stories"]] },
    { id: "extras", type: "multi", title: "Do You Have Any of These?", help: "Pick all that apply.",
      opts: Object.keys(P.extras).map(function (k) { return [k, P.extras[k].label]; }) },
    { id: "zip", type: "zip", title: "What's Your Address or ZIP Code?", help: "We serve metro Detroit: Wayne, Oakland, Macomb and nearby." },
  ];
  /* Info Gather Deck (Oct 14): three chapters shown above a segmented bar, one segment per question. */
  var CHAPTERS = [["Your Home", ["sqft"]], ["Your Systems", ["furnaces", "acs", "waterHeaters"]], ["Finishing Up", ["stories", "extras", "zip"]]];
  function chapterOf(id) { for (var c = 0; c < CHAPTERS.length; c++) if (CHAPTERS[c][1].indexOf(id) > -1) return c; return CHAPTERS.length - 1; }
  /* Snap-a-photo side path on each system question. */
  var QPHOTO = { furnaces: "furnace1", acs: "ac1", waterHeaters: "wh1", softener: "softener" };
  /* Did You Know card: one service teaser per question screen. */
  var DYK = {
    sqft: "Every plan includes a Whole-Home Mold and Moisture Scan with a thermal camera.",
    furnaces: "We change your furnace filters during every visit, at no extra charge.",
    acs: "A spring AC tune-up can catch a weak capacitor before the first heat wave.",
    waterHeaters: "A yearly flush cuts sediment and can help extend a tank's life.",
    softener: "On Plus and up, we top off your softener salt during visits.",
    stories: "Plus includes gutter and downspout cleaning every spring and fall.",
    extras: "On Plus and up, we top off your softener salt during visits.", /* Max 19:35 Oct 15: softener DYK shows on the Extras screen (softener is a tile there, no own screen) */
    zip: "Every visit ends with a written report saved to your Home Record."
  };

  var S = load();
  function fresh() { return { screen: "home", answers: {}, tier: "gold", plan: "annual", addons: [], lastMinute: [], alacarte: [], alacarteBooking: null, photos: {}, visit: null, photosComplete: false, signup: null, referralCodeIn: "", path: [] }; }
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
    if (kind === "biennial") return "*Prepaid for 2 years (" + money(annualTotal) + "), then 6 extra months free at the end of your term, once you complete it (draft)";
    return "*Billed annually (" + money(annualTotal) + "/yr)";
  }
  function priceBlock(annualTotal, kind) {
    if (kind === "biennial") {
      return '<div class="price">' + money(Math.round(Number(annualTotal) / 24)) + '<small>/Month</small></div>' +
        '<p class="price-bill">' + billLine("biennial", annualTotal) + '</p>' +
        '<p class="price-save">6 Extra Months Free at the End of Your Term, Once You Complete It · stacks with referrals (draft)</p>';
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
      '<li><strong>Refer a Neighbor, You Both Get a Month Free</strong> — no cap on referrals. Credited once your neighbor\'s first payment clears, added at the end of your term and applied once you complete it.</li>' +
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
  /* Oct 15 (Max 19:11-19:19 ICT): add-ons show ONLY the added monthly price. No add-on has its own monthly figure in pricing-config.js, so monthly = annual / 12, rounded (monthlyOf). */
  function addMo(a) { return "+" + money(monthlyOf(a.annual)) + "/month"; }
  function addonPriceLabel(a) { return addMo(a) + " <span>(draft)</span>"; }
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
    if (a.softener === "yes" || extras.indexOf("softener") > -1) linesGold.push({ label: "Water softener salt top-off and service check", amt: 0, est: false, note: "Included" });
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
      offerLine = { label: "+6 Free Months Added At The End Of Your Term (Once You Complete It)", amt: 0, kind: "offer" };
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
  function go(screen) { if (screen !== "home" && screen !== "confirm") S.resume = screen; else if (screen === "confirm") S.resume = null; if (S.screen !== screen) { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); } S.screen = screen; save(); render(); window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function back() { var p = S.path.pop(); S.screen = p || "home"; if (S.screen !== "home") S.resume = S.screen; save(); render(); window.scrollTo(0, 0); }
  function backBtn() { return '<span class="nav-pills"><button class="back back-pill mw-hover" data-act="back" type="button"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#C1502E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button><button class="home-pill mw-hover" data-act="home" type="button" aria-label="Home"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.6V20h12V9.6" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5.2h4V20" fill="none" stroke="#C1502E" stroke-width="2.2" stroke-linejoin="round"/></svg></button></span>'; }

  function render() {
    /* Intro screen retired: old links and saved state land on the first question. */
    if (S.screen === "overview") S.screen = "q0";
    S.path = S.path.filter(function (x) { return x !== "overview"; });
    var s = S.screen, html;
    app.classList.toggle("wide", s === "quote" || s === "photos" || s === "extras");
    if (s === "home") html = home();
    else if (s === "overview") html = overview();
    else if (/^q\d$/.test(s)) html = question(Number(s.slice(1)));
    else if (s === "choice") html = choice();
    else if (s === "photos") html = photos();
    else if (s === "visit") html = visitForm();
    else if (s === "quote") html = quote();
    else if (s === "alacarte") html = alacarte();
    else if (s === "alacarteConfirm") html = alacarteConfirm();
    else if (s === "extras") html = extrasStep();
    else if (s === "signup") html = signup();
    else if (s === "pay") html = payStep();
    else if (s === "confirm") html = confirm();
    else if (s === "cancel") html = cancelPage();
    else { S.screen = "home"; html = home(); }
    app.innerHTML = html;
    app.setAttribute("data-screen", s);
    bind();
    document.body.classList.toggle("on-home", s === "home");
    if (s === "home") bindHome();
    if (s === "cancel") bindCancel();
    var wf = app.querySelector("[data-wait]"); if (wf) wf.addEventListener("submit", function (e) { e.preventDefault(); var z = wf.querySelector("input").value.trim(), em = wf.querySelector("input[type=email]").value.trim(), m = app.querySelector(".hm-wait-msg"); if (!/^\d{5}$/.test(z) || !/.+@.+\..+/.test(em)) { m.textContent = "Enter a 5-digit ZIP and your email."; return; } try { localStorage.setItem("smartUpkeep.waitlist", JSON.stringify({ zip: z, email: em, at: new Date().toISOString() })); } catch (x) {} try { window.SUEvents && SUEvents.emit("waitlist.joined", "site", { payload: { zip: z, from: S.screen } }); } catch (x) {} m.textContent = "Thanks. You are on the list (demo: saved on this device only)."; wf.reset(); });
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
  /* Legal (Max 20:10 ICT Oct 17): the 3-day Home Solicitation notice is for OFFLINE sign-ups only (home/door, event, outbound phone).
     It is NOT shown on the online form. Offline wording lives in forms/in-person/ (printable) and the ops phone script. */
  function miCancelNotice() {
    return '<div class="mi-cancel notice" role="note">' +
      '<p><strong>Michigan Home Solicitation Sales Notice (MCL 445.113).</strong> You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached notice of cancellation form for an explanation of this right.</p>' +
      '<details class="warn-drop mi-draft"><summary class="mw-hover">1 Warning · Draft Wording</summary><div class="warn-body small muted">This bold notice appears next to your signature when the sale is made at your home. Final wording pending legal review.</div></details></div>';
  }

  /* ROSCA (Legal, Max 20:10 ICT Oct 17): clear auto-renewal terms before billing info, express consent box, simple online cancel. Draft wording. */
  function renewTerms() {
    /* Legal follow-up (Max 20:38 ICT Oct 17). Start = first visit (membership starts at the first visit); before one is booked we show the
       earliest bookable day (2 days out, same as the first-visit picker). Renewal = start + term (12 months, or 24 paid + 6 free = 30). */
    var t = totals(), bi = t.plan === "biennial", yrs = bi ? "24 paid months (plus 6 free months at the end)" : "12 months";
    var st = S.firstVisit ? new Date(S.firstVisit + "T12:00:00") : new Date(Date.now() + 2 * 864e5), rn = new Date(st.getTime());
    rn.setMonth(rn.getMonth() + (bi ? 30 : 12));
    function dd(d) { return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
    return '<div class="renew-terms notice" role="note"><span class="draft">Draft, pending Michigan attorney review</span><p><strong>Auto-Renewal Terms</strong></p><ul class="feat small">' +
      '<li>Your plan: <strong>' + esc(P.tiers[S.tier].label) + '</strong>, current price <strong>' + money(t.membershipAnnual) + '/year</strong> (about ' + money(monthlyOf(t.membershipAnnual)) + '/month). Today you pay <strong>' + money(t.today) + '</strong> for ' + yrs + '.</li>' +
      '<li>Your membership starts at your first visit' + (S.firstVisit ? ' (' + dd(st) + ')' : ' (earliest: ' + dd(st) + ')') + ' and <strong>renews automatically on ' + dd(rn) + '</strong>' + (S.firstVisit ? '' : ' if it starts that day') + ', for another 12 months at the plan price at that time, charged to the card you add at the payment step. Free months from referrals move this date later.</li>' +
      '<li>You can cancel anytime before renewal at <a href="/#cancel" class="link mw-hover">smartupkeep.ai/#cancel</a>; we\u2019ll email you at least 30 days before any price change or renewal charge.</li>' +
      '<li><strong>Cancel anytime, no fee, online in one step.</strong> Refund = prepaid minus completed services.</li></ul></div>';
  }
  function cancelPage() {
    return backBtn() + '<div class="card"><h1>Cancel Membership</h1><p>No fee, no phone call needed. Your refund is what you prepaid minus the itemized price of services already done.</p>' +
      '<form id="cxF" novalidate><label class="fl" for="cxEmail">Email On Your Membership</label><input id="cxEmail" type="email" autocomplete="email"><p class="small fe" id="e-cxEmail" aria-live="polite"></p>' +
      '<button class="btn btn-primary btn-big mw-hover" type="submit">Cancel My Membership</button></form><p class="small muted" id="cxDone" aria-live="polite"></p>' +
      '<p class="small muted">Prototype: nothing is sent and no account is changed.</p></div>';
  }
  function bindCancel() {
    var f = document.getElementById("cxF"); if (!f) return;
    f.addEventListener("submit", function (e) { e.preventDefault(); var v = document.getElementById("cxEmail").value.trim(), er = document.getElementById("e-cxEmail");
      if (!/^\S+@\S+\.\S+$/.test(v)) { er.textContent = "Enter email."; return; } er.textContent = ""; f.hidden = true;
      document.getElementById("cxDone").textContent = "Cancellation received. You will get a confirmation email with your refund amount. (Prototype: nothing was sent.)"; });
  }

  /* ---------- Home: phone-first shopping-app layout ---------- */
  var ADDON_ICO = { windows: "window", carpet: "brush", pool: "pool", snow: "snow", pressure: "spray", deck: "brush", chimney: "chimney", ducts: "duct", lights: "lights", radon: "radon", handyman: "wrench", pest: "bug", guttersExtra: "gutter", backflow: "waterheater" };
  /* Limits per a-la-carte item: only what pricing-config.js desc/unit already says. Missing = not in repo (reported as a gap). */
  var AC_LIMITS = { windows: "Outside glass only.", carpet: "One whole-home clean a year.", pool: "One spring opening and one fall closing.", snow: "One winter season.", chimney: "Wood-burning chimneys.", lights: "One fall install and one take-down after the holidays.", radon: "One test for your home.", handyman: "8 hours a year.", pest: "Four quarterly visits a year, through a partner.", guttersExtra: "One extra cleaning.", backflow: "One test a year, where required." };
  function priceRange(a) { return a.low === a.high ? money(a.low) : money(a.low) + "–" + money(a.high); }
  function hmAcc(id, icon, title, body) {
    return '<details class="acc hm-acc" id="acc-' + id + '"><summary class="mw-hover">' + I(icon, "sm") + '<span>' + title + '</span></summary><div class="acc-body">' + body + '</div></details>';
  }
  function ul(items) { return '<ul class="hm-list">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join("") + '</ul>'; }
  /* Deck 4 plan card: white, terracotta top bar, big per-tier From price, check list of what's included, the year shown as visits. */
  var selK = null, HM_SVC = [];
  var TIER_NOTE = { silver: "Every Plan", gold: "Plus and Up", platinum: "Complete Plan" };
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
      '<button type="button" class="pc-offer" data-offer="1" aria-haspopup="dialog">' + I("tag", "xs") + '<span>Welcome Offer</span></button>' +
      '<div class="pc-price"><span class="pc-from">From</span><span class="pc-big">' + money(t.fromMonthly || P.minMonthly || 99) + '</span><span class="pc-per">/Mo</span></div>' +
      '<div class="pc-year">Visits Per Year: ' + t.visits + '</div>' +
      '<ul class="pc-inc">' + inc.map(function (f) { return f === "And More" ? '<li class="pc-more"><button class="link mw-hover pc-more-link" type="button" data-hm-see="' + k + '">And More</button></li>' : (/Plus:$/.test(f) ? '<li class="pc-lead">' + f + '</li>' : '<li>' + f + '</li>'); }).join("") + '</ul>' +
      '<button class="btn btn-primary mw-hover pc-see" type="button" data-hm-see="' + k + '">See What\'s Included</button></div>';
  }
  /* Oct 15 (Max 19:03): phones and narrow/portrait screens get 9:16 media, big screens 16:9. Chosen in JS at load (Safari ignores <source media>). */
  function suPortrait() { return !!(window.matchMedia && window.matchMedia("(max-width: 768px), (orientation: portrait)").matches); }
  /* Hero: muted looping teaser (poster only when reduced motion is preferred). */
  function heroMedia() {
    var T = P.teaser || {}, port = !!(window.matchMedia && matchMedia("(max-width: 480px)").matches) /* Oct 17: phone square hero crops the 9:16 teaser */, /* Max 20:34 ICT Oct 15: home thumbnail/teaser always horizontal 16:9; the opened video still picks 9:16 or 16:9 (vSrc) */ poster = (port ? T.posterV : T.poster) || "assets/poster-16x9.jpg", tsrc = port ? T.srcV : T.src, wh = port ? 'width="360" height="640"' : 'width="640" height="360"';
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (port) { /* Oct 17 08:00: phone hero loops word-free in-home work scenes (V7 9:16 24.5-25.9 fridge filter, 26.6-28.4 furnace filter, 29.0-30.9 moisture scan) */ tsrc = "video/teaser-v7-phone-5svc-1x1.mp4?v=f2"; poster = "assets/teaser-v7-phone-1x1-poster.jpg?v=p1"; wh = 'width="720" height="720"'; }
    if (!tsrc || reduce) return '<img src="' + esc(poster) + '" alt="" loading="eager" ' + wh + '>';
    var hold = port && !window.__suFirst; /* Oct 17: phone holds the van-at-house poster until first interaction */
    return '<video class="hm-teaser" src="' + esc(tsrc) + '" poster="' + esc(poster) + '" muted ' + (hold ? 'data-hold="1" preload="metadata"' : 'autoplay') + ' playsinline disablepictureinpicture ' + (hold ? '' : 'preload="auto" ') + wh + ' aria-hidden="true" tabindex="-1" style="filter:saturate(1.15) contrast(1.06) sepia(.06)"></video>';
  }
  /* Phone hero trust chips (Oct 17 2026). Each backed by existing site copy (FAQ / Refund Promise / plan features). */
  var HERO_CHIPS = [["shield", "Certified Techs"], ["refund", "Cancel Anytime"], ["clipboard", "Home Reports"], ["user", "Background-Checked Yearly"], ["meter", "Moisture Scan Every Visit"], ["doc", "Licensed & Insured"]]; /* Max-approved list, Oct 17 */
  /* Trust Tags Theme deck 09 (Max note "Random order"): same 6 badges, shuffled once per page load; hero chips and Why Trust Us row share the order. */
  (function () { for (var i = HERO_CHIPS.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = HERO_CHIPS[i]; HERO_CHIPS[i] = HERO_CHIPS[j]; HERO_CHIPS[j] = t; } })();
  /* Hero trust chips marquee (Max, Oct 17): the 6 chips (per-load random order) are rendered twice and the track slides left by exactly one set, forever, at a calm steady speed. No stop, no rewind, no seam.
     Max 21:08 ICT Oct 17: also movable by hand. Touch swipe, mouse drag, trackpad/shift-wheel sideways scroll, and small arrows on desktop.
     Auto-scroll pauses while you interact and resumes 3 s after. Position wraps modulo one set width, so there is never a jump.
     Vertical page scroll stays native (touch-action: pan-y); the row is data-ptr-ignore so pull-to-refresh never fires from it.
     Reduced motion: static wrapped row (CSS), no JS motion. If this script fails, the CSS animation still runs. */
  (function heroChips() {
    var SPEED = 28; /* px per second */
    function setup() {
      var el = document.querySelector(".hm-hchips"), tr = el && el.querySelector(".hm-hc-track"); if (!tr || tr.__mq) return;
      var set = tr.querySelector(".hm-hc-set"), w = set ? set.getBoundingClientRect().width : 0; if (!w) return; tr.__mq = 1;
      if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      tr.style.animation = "none";
      var x = 0, last = 0, paused = false, hover = false, drag = null, vel = 0, glide = null, t = 0;
      function wrap() { w = set.getBoundingClientRect().width || w; x = ((x % w) + w) % w; x = x ? x - w : 0; } /* x in (-w, 0] */
      function paint() { wrap(); tr.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)"; }
      function hold() { paused = true; clearTimeout(t); }
      function resume(ms) { clearTimeout(t); t = setTimeout(function () { if (!drag && !hover) paused = false; }, ms == null ? 3000 : ms); }
      function frame(now) {
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
        if (glide) { var k = Math.min(1, (now - glide.t0) / glide.d), e = 1 - Math.pow(1 - k, 3); x = glide.x0 + glide.dx * e; if (k >= 1) glide = null; }
        else if (!drag && Math.abs(vel) > 5) { x += vel * dt; vel *= Math.pow(0.04, dt); } /* light fling */
        else if (!paused && !drag) x -= SPEED * dt;
        paint(); requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      el.style.touchAction = "pan-y"; el.setAttribute("data-ptr-ignore", "");
      el.addEventListener("pointerdown", function (e) { if (e.button && e.button !== 0) return; hold(); glide = null; vel = 0; drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sx: x, lx: e.clientX, lt: e.timeStamp, on: false }; });
      el.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.on) { if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 10 && e.pointerType === "touch") drag = null, resume(); return; } drag.on = true; el.classList.add("dragging"); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
        var dt = Math.max(1, e.timeStamp - drag.lt); vel = (e.clientX - drag.lx) / dt * 1000; drag.lx = e.clientX; drag.lt = e.timeStamp;
        x = drag.sx + dx; paint();
      });
      function up(e) { if (!drag || (e && e.pointerId !== drag.id)) return; if (!drag.on) vel = 0; drag = null; el.classList.remove("dragging"); vel = Math.max(-1500, Math.min(1500, vel)); resume(); }
      el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
      el.addEventListener("click", function (e) { if (Math.abs(vel) > 30) { e.preventDefault(); e.stopPropagation(); } }, true);
      el.addEventListener("dragstart", function (e) { e.preventDefault(); });
      el.addEventListener("wheel", function (e) { var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0); if (!d) return; e.preventDefault(); hold(); glide = null; vel = 0; x -= d; paint(); resume(); }, { passive: false });
      el.addEventListener("mouseenter", function () { hover = true; hold(); }); el.addEventListener("mouseleave", function () { hover = false; resume(); });
      var wr = el.parentNode;
      wr.querySelectorAll("[data-hc]").forEach(function (b) { b.addEventListener("click", function () { hold(); vel = 0; var step = Math.max(120, Math.min(260, el.clientWidth * 0.45)); glide = { x0: x, dx: (b.getAttribute("data-hc") === "l" ? 1 : -1) * step, t0: performance.now(), d: 380 }; resume(); }); });
      addEventListener("resize", function () { w = set.getBoundingClientRect().width || w; }, { passive: true });
    }
    new MutationObserver(setup).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", setup);
  })();
  /* Hero C: start teaser at 0.6s (skip white fade-in) and loop from there */
  (function heroSeek() {
    var S = 0.6;
    function go(v) { try { v.currentTime = S; } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    document.addEventListener("loadedmetadata", function (e) { var v = e.target; if (v && v.classList && v.classList.contains("hm-teaser") && !v.getAttribute("data-hold")) go(v); }, true);
    /* first interaction (scroll, touch, mouse/cursor move, key): release held teaser + start the header van */
    function first(e) {
      if (window.__suFirst) return;
      var m = document.getElementById("videoModal"); if (m && !m.hidden) return;
      if (document.body.classList.contains("gate-locked") || (e && e.target && e.target.tagName === "INPUT" && e.target.type === "password")) return; /* password gate typing doesn't count */
      if (e && e.type === "scroll" && e.target !== document && e.target !== window) return; /* inner scrollers (chip carousel) don't count */ /* closing the video pop-up doesn't count */
      if (e && e.target && e.target.closest && e.target.closest("#videoModal")) return; window.__suFirst = true;
      ["scroll", "wheel", "touchstart", "pointerdown", "pointermove", "mousemove", "keydown"].forEach(function (t) { window.removeEventListener(t, first, true); });
      document.querySelectorAll(".hm-teaser[data-hold]").forEach(function (v) { v.removeAttribute("data-hold"); v.preload = "auto"; if (v.readyState >= 1) go(v); else v.load(); });
      try { window.dispatchEvent(new Event("su:first")); } catch (e) {}
    }
    ["scroll", "wheel", "touchstart", "pointerdown", "pointermove", "mousemove", "keydown"].forEach(function (t) { window.addEventListener(t, first, { capture: true, passive: true }); });
    document.addEventListener("ended", function (e) { var v = e.target; if (v && v.classList && v.classList.contains("hm-teaser")) go(v); }, true);
  })();
  /* ---------- What We Take Care Of: Direction A (swipeable category carousel), What's Included row, Featured Service ---------- */
  function wwIco(n, cls) { return '<svg class="su-ico ' + (cls || "") + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + (window.SUIconBody ? window.SUIconBody(n) : "") + '</svg>'; }
  /* [title, [icon, icon], [[service index in HM_SVC, label]...], tint] */
  var WW_CATS = [
    ["Heating & Cooling", ["furnace", "ac"], [[0, "Furnace"], [1, "AC"], [0, "Furnace Filters"]], "t"],
    ["Water", ["waterheater", "meter"], [[2, "Water Heater"], [5, "Mold and Moisture Scan"], [6, "Gutters"]], "l"],
    ["Air & Safety", ["detector", "dryer"], [[4, "Smoke/CO"], [3, "Dryer Vent"], [5, "Moisture Readings"]], "s"],
    ["Outside", ["gutter", "chimney"], [[6, "Gutters"], [7, "Roof"], [7, "Flashing"]], "t"]];
  var WW_WI = [
    ["clock", "Visits", "Seasonal visits on a set schedule", [["2 Seasonal Visits a Year", "Essentials"], ["4 Visits a Year, One Per Quarter", "Plus"], ["12 Visits a Year, Monthly Check-Ins", "Complete"]]],
    ["furnace", "Heating & Cooling", "Tune-ups before every season", [["Fall Furnace Tune-Up", "Essentials"], ["Spring AC Tune-Up", "Essentials"], ["Furnace Filters Changed During Visits", "Essentials"], ["Standby Generator Service (If You Have One)", "Complete"]]],
    ["waterheater", "Water", "Less sediment, longer life", [["Water Heater Flush or Tankless Descale", "Essentials"], ["Water Softener Salt Top-Off", "Plus"], ["Fridge Water Filter Changes", "Plus"]]],
    ["detector", "Air & Safety", "Alarms that work when it counts", [["Dryer Vent Cleaning", "Essentials"], ["Smoke and CO Detector Checks", "Essentials"], ["GFCI and Shut-Off Valve Checks", "Plus"]]],
    ["meter", "Mold and Moisture Scan", "Every visit, whole home", [["Moisture Meter and Thermal Camera Check", "Essentials"], ["Damp Spots Flagged With Photos", "Essentials"], ["Readings Saved to Your Home Record", "Essentials"]]],
    ["gutter", "Outside", "Gutters, roof and winter prep", [["Gutter and Downspout Cleaning", "Plus"], ["Garage Door Lube and Weatherproofing", "Plus"], ["Roof and Flashing Inspection", "Complete"], ["Ice Dam Clearing After Storms", "Complete"], ["Pre and Post Storm Checks", "Complete"]]],
    ["clipboard", "Records", "Proof for warranties and resale", [["Written Report After Every Visit", "Essentials"], ["Maintenance Proof Pack", "Essentials"], ["Recall Monitoring", "Essentials"], ["Warranty Check", "Essentials"], ["Home Record Transfers When You Sell", "Essentials"]]]];
  function fsBg(c, fill, inner) { return '<svg class="' + c + '" viewBox="0 0 120 80" fill="none" stroke="#1f1b17" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="116" height="76" rx="8" fill="' + fill + '" stroke="none"/>' + inner + '</svg>'; }
  var FS_ART = {
    lawn: function (c) { return fsBg(c, "#F4F8EF", '<path d="M14 66h92" stroke="#cfd8c4"/><path d="M22 62l12-28 34 4 16 20-18 8H32z" fill="rgba(11,110,79,.14)" stroke="#0B6E4F" stroke-dasharray="4 3"/><rect x="40" y="45" width="24" height="10" rx="2" fill="#fff" stroke="#05668D"/><path d="M44 50h16" stroke="#05668D" stroke-width="1.4"/><g transform="translate(96 16) rotate(-20)"><rect x="-5" y="-4" width="10" height="8" rx="1.5" fill="#D4A017"/><path d="M-15 -3h9v6h-9zM6 -3h9v6H6z" fill="#05668D"/><path d="M-10 -3v6M10 -3v6M0 4v4"/></g><path d="M92 26L60 40M96 27l-8 31" stroke="#C1502E" stroke-dasharray="2 3"/><circle cx="22" cy="62" r="2.2" fill="#C1502E" stroke="none"/><circle cx="84" cy="58" r="2.2" fill="#C1502E" stroke="none"/>'); },
    warranty: function (c) { return fsBg(c, "#FAF3EB", '<rect x="18" y="14" width="40" height="52" rx="4" fill="#fff"/><path d="M26 26h24M26 34h24M26 42h16"/><path d="M38 52l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/><rect x="70" y="30" width="30" height="34" rx="3" fill="#fff"/><path d="M70 38h30" stroke="#C1502E"/><path d="M78 26v8M92 26v8"/><circle cx="85" cy="51" r="6" stroke="#05668D"/><path d="M85 48v3l2 2" stroke="#05668D"/>'); },
    mold: function (c) { return fsBg(c, "#EEF5F8", '<path d="M20 64V30l26-16 26 16v34z" fill="#fff"/><path d="M34 64V46h14v18"/><path d="M60 40c-3 5-3 8 0 9s3-4 0-9z" fill="#05668D" stroke="#05668D"/><rect x="74" y="28" width="22" height="34" rx="4" fill="#fff"/><rect x="78" y="32" width="14" height="10" rx="1.5" fill="#D4A017"/><path d="M80 50h10M80 55h6"/><path d="M85 28v-8" stroke="#C1502E"/>'); },
    wh: function (c) { return fsBg(c, "#FAF3EB", '<rect x="40" y="12" width="32" height="54" rx="12" fill="#fff"/><path d="M48 30h16M48 38h16"/><circle cx="56" cy="52" r="4" fill="#C1502E"/><path d="M72 58h14v8" stroke="#05668D"/><path d="M86 68c-2 3-2 5 0 6s2-3 0-6z" fill="#05668D" stroke="#05668D"/>'); },
    storm: function (c) { return fsBg(c, "#F3F1EC", '<path d="M24 34a12 12 0 0 1 22-6 10 10 0 1 1 6 18H28a8 8 0 0 1-4-12z" fill="#fff"/><path d="M44 48l-5 9h7l-5 9" stroke="#D4A017" stroke-width="2.2"/><path d="M70 64V42l14-10 14 10v22z" fill="#fff"/><path d="M80 64v-10h8v10"/><path d="M98 26l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/>'); }
  };
  /* Featured Service ad slot. FEATURED[0] shows; others can rotate in later. Non-lawn entries start the Get Started flow. */
  var FEATURED = [
    { id: "lawn", art: "lawn", title: "Learn About Our Custom Grass Cutting", hook: "Measured From Above. No Visit Needed.", popTitle: "Custom Grass Cutting", popText: "We measure your lawn from above and give you a custom mowing price, no visit needed.", cta: "Get My Lawn Quote", href: "lawn/" },
    { id: "warranty", art: "warranty", title: "Warranty Check", hook: "Coverage Tracked for You.", popTitle: "Warranty Check", popText: "We track the warranty on your equipment and flag coverage before it expires.", cta: "Free Quote in Minutes" },
    { id: "mold", art: "mold", title: "Mold and Moisture Scan", hook: "Whole Home, Every Visit.", popTitle: "Mold and Moisture Scan", popText: "Protects against mold and water leaks. Damp spots flagged early. Not a lab mold test.", cta: "Free Quote in Minutes" },
    { id: "wh", art: "wh", title: "Water Heater Flush", hook: "Less Sediment, Longer Tank Life.", popTitle: "Water Heater Flush", popText: "A yearly flush, or descale for tankless, to cut sediment and extend its life.", cta: "Free Quote in Minutes" },
    { id: "storm", art: "storm", title: "Pre and Post Storm Checks", hook: "Ready Before, Checked After.", popTitle: "Pre and Post Storm Checks", popText: "We check your home before a storm hits and again after it passes, so problems get caught fast.", cta: "Free Quote in Minutes" }];
  function wwCarousel() {
    return '<div class="ww"><div class="ca-row" data-ptr-ignore>' + WW_CATS.map(function (c) {
      return '<article class="ca-card ca-' + c[3] + '"><div class="ca-art" aria-hidden="true">' + wwIco(c[1][0]) + wwIco(c[1][1], "ca-b") + '</div><div class="ca-body"><h3>' + c[0] + '</h3><ul>' +
        c[2].map(function (s) { return '<li><button type="button" class="ca-svc" data-svc="' + s[0] + '" aria-haspopup="dialog">' + s[1] + '<i aria-hidden="true">&rsaquo;</i></button></li>'; }).join("") + '</ul></div></article>';
    }).join("") + '</div><div class="ca-dots" aria-hidden="true">' + WW_CATS.map(function (c, i) { return '<b' + (i ? "" : ' class="on"') + '></b>'; }).join("") + '</div></div>';
  }
  function wiRow() {
    return '<div class="wi-row va" data-ptr-ignore>' + WW_WI.map(function (g, i) { return '<button type="button" class="mw-hover" data-wi="' + i + '" aria-haspopup="dialog"><span class="wt-i">' + wwIco(g[0]) + '</span><strong>' + g[1] + '</strong><small>' + g[3].length + ' Included &rsaquo;</small></button>'; }).join("") + '</div>' +
      '<p class="small muted wi-note">Every plan: Furnace/AC Tune-Ups, Water Heater Flush, Dryer Vent, Smoke/CO and the Mold and Moisture Scan. Plus and Complete add more each visit.</p>';
  }
  function wiPop() {
    return '<div class="wi-pop va" role="dialog" aria-modal="true" aria-labelledby="wiT" data-ptr-ignore hidden><div class="wi-bg" data-wi-close></div><div class="wi-card"><button type="button" class="hm-pop-x wi-x mw-hover" data-wi-close aria-label="Close">&times;</button><div class="wi-head"></div><ul class="wi-list"></ul><button type="button" class="btn btn-primary mw-hover wi-go" data-act="start">Free Quote in Minutes</button></div></div>';
  }
  function featuredAd() {
    var f = FEATURED[0], art = FS_ART[f.art];
    var cta = f.href ? '<a class="btn btn-primary mw-hover" href="' + f.href + '">' + f.cta + '</a>' : '<button type="button" class="btn btn-primary mw-hover" data-act="start">' + f.cta + '</button>';
    return '<button type="button" class="fs-ad mw-hover" aria-haspopup="dialog" data-featured="' + f.id + '">' + art("fs-art") + '<span class="fs-tx"><span class="fs-tag">Featured Service</span><b>' + f.title + '</b><small>' + f.hook + '</small></span><span class="fs-go" aria-hidden="true">&rsaquo;</span></button>' +
      '<div class="wi-pop fs-pop" role="dialog" aria-modal="true" aria-label="' + esc(f.popTitle) + '" data-ptr-ignore hidden><div class="wi-bg" data-wi-close></div><div class="wi-card"><button type="button" class="hm-pop-x wi-x mw-hover" data-wi-close aria-label="Close">&times;</button>' + art("fs-lg") + '<h3>' + f.popTitle + '</h3><p>' + f.popText + '</p>' + cta + '</div></div>';
  }
  function bindWW(root) {
    var row = root.querySelector(".ca-row"), dots = root.querySelectorAll(".ca-dots b");
    if (row && dots.length) row.addEventListener("scroll", function () { var cards = row.querySelectorAll(".ca-card"), w = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1, i = Math.round(row.scrollLeft / w); if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) i = dots.length - 1; [].forEach.call(dots, function (d, k) { d.classList.toggle("on", k === i); }); }, { passive: true });
    var wp = root.querySelector(".wi-pop.va"), fp = root.querySelector(".fs-pop"), last = null;
    function open(p, from) { last = from; p.hidden = false; document.documentElement.classList.add("hm-pop-open"); var x = p.querySelector(".wi-x"); if (x) x.focus(); }
    function close() { [wp, fp].forEach(function (p) { if (p && !p.hidden) { p.hidden = true; document.documentElement.classList.remove("hm-pop-open"); if (last) last.focus(); } }); }
    root.querySelectorAll("[data-wi]").forEach(function (t) { t.addEventListener("click", function () {
      var g = WW_WI[+t.getAttribute("data-wi")];
      wp.querySelector(".wi-head").innerHTML = '<span class="wi-hic">' + wwIco(g[0]) + '</span><div><h3 id="wiT">' + g[1] + '</h3><p>' + g[2] + '</p></div>';
      wp.querySelector(".wi-list").innerHTML = g[3].map(function (x) { return '<li><span>' + x[0] + '</span><em class="pl-' + x[1] + '">' + x[1] + '</em></li>'; }).join("");
      open(wp, t);
    }); });
    var fa = root.querySelector(".fs-ad"); if (fa && fp) fa.addEventListener("click", function () { open(fp, fa); });
    root.querySelectorAll("[data-wi-close]").forEach(function (c) { c.addEventListener("click", close); });
    root.querySelectorAll(".wi-pop [data-act]").forEach(function (b) { b.addEventListener("click", function () { document.documentElement.classList.remove("hm-pop-open"); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  /* Oct 15 (Max OK 19:11 ICT): plan carousel inside Details > What's Included. Cards use keyPoints, the sheet uses features, both from pricing-config.js. */
  function incCarousel() {
    var ks = tierKeys();
    return '<div class="ic" data-ptr-ignore><h3 class="ic-h">Compare Plans</h3><div class="ic-wrap"><button type="button" class="ic-arr ic-prev mw-hover" aria-label="Previous Plan">&lsaquo;</button><div class="ic-row">' +
      ks.map(function (k) { var t = P.tiers[k];
        return '<button type="button" class="ic-card mw-hover' + (t.recommended ? ' rec' : '') + '" data-ic="' + k + '" aria-haspopup="dialog"><strong>' + t.label + '</strong><span class="muted small">' + t.tagline + '</span><ul>' +
          (t.keyPoints || []).filter(function (f) { return f !== "And More"; }).map(function (f) { return /^Everything in/.test(f) ? '<li class="ic-lead">' + f + '</li>' : '<li>' + f + '</li>'; }).join("") +
          '</ul><span class="ic-see">See Full List &rsaquo;</span></button>'; }).join("") +
      '</div><button type="button" class="ic-arr ic-next mw-hover" aria-label="Next Plan">&rsaquo;</button></div><div class="ic-dots" aria-hidden="true">' + ks.map(function () { return '<b></b>'; }).join("") + '</div></div>';
  }
  function icSheet() {
    return '<div class="ic-pop" role="dialog" aria-modal="true" aria-labelledby="icT" data-ptr-ignore hidden><div class="ic-bg" data-ic-close></div><div class="ic-sheet"><span class="ic-grab" aria-hidden="true"></span><button type="button" class="hm-pop-x ic-x mw-hover" data-ic-close aria-label="Close">&times;</button><h3 id="icT"></h3><p class="ic-lead2"></p><ul class="ic-list"></ul><button type="button" class="btn btn-primary mw-hover ic-go" data-act="start">Get Started</button></div></div>';
  }
  function bindInc(root) {
    var row = root.querySelector(".ic-row"), pop = root.querySelector(".ic-pop"); if (!row || !pop) return;
    var cards = [].slice.call(row.querySelectorAll(".ic-card")), dots = [].slice.call(root.querySelectorAll(".ic-dots b")), sheet = pop.querySelector(".ic-sheet"), last = null;
    function idx() { var w = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1, i = Math.round(row.scrollLeft / w); if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) i = cards.length - 1; return i; }
    function sync() { var i = idx(); dots.forEach(function (d, k) { d.classList.toggle("on", k === i); }); }
    row.addEventListener("scroll", sync, { passive: true }); sync();
    function go(d) { var i = Math.max(0, Math.min(cards.length - 1, idx() + d)); row.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: "smooth" }); }
    root.querySelector(".ic-prev").addEventListener("click", function () { go(-1); });
    root.querySelector(".ic-next").addEventListener("click", function () { go(1); });
    function open(k, from) { var t = P.tiers[k], f = t.features.slice(), lead = "";
      if (/^Everything in/.test(f[0])) lead = f.shift();
      show(t.label + " · What's Included", lead, f.map(function (x) { var i = x.indexOf(":"); return '<li>' + I(FICO(x), "xs") + '<span>' + (i > 0 ? '<b>' + x.slice(0, i) + '</b>: ' + x.slice(i + 1).trim() : x) + '</span></li>'; }).join(""), "Get Started", from); }
    /* A la carte pop-up: only facts from P.addons (desc, unit, low, high, note). Parts with no fact are left out. */
    function openAddon(id, from) { var a = P.addons.filter(function (x) { return x.id === id; })[0]; if (!a) return;
      var parts = [["What's Included", a.desc]];
      parts.push(["Limits", AC_LIMITS[a.id] || "Not set yet. We confirm limits when you book."]);
      parts.push(["How the Price Is Set", addMo(a) + " added to your membership. It is the yearly price divided by 12, rounded, and the yearly price is set at the midpoint of metro Detroit market pricing research." + (a.id === "pool" ? " Opening and closing are priced the same, $550 each." : "") + " Draft price."]);
      show(a.label, addMo(a), parts.map(function (p) { return '<li class="ac-part"><span><b>' + p[0] + '</b><br>' + p[1] + '</span></li>'; }).join(""), "Shop À La Carte", from); }
    function show(title, lead, html, cta, from) {
      pop.querySelector("#icT").textContent = title;
      var lp = pop.querySelector(".ic-lead2"); lp.textContent = lead; lp.hidden = !lead;
      pop.querySelector(".ic-list").innerHTML = html;
      var g = pop.querySelector(".ic-go"); g.textContent = cta; g.setAttribute("data-act", cta === "Get Started" ? "start" : "alacarte");
      last = from; sheet.style.transform = ""; pop.hidden = false; document.documentElement.classList.add("hm-pop-open"); pop.querySelector(".ic-x").focus(); }
    function close() { if (pop.hidden) return; pop.hidden = true; document.documentElement.classList.remove("hm-pop-open"); if (last) last.focus(); }
    cards.forEach(function (c) { c.addEventListener("click", function () { open(c.getAttribute("data-ic"), c); }); });
    root.querySelectorAll("[data-ac]").forEach(function (b) { b.addEventListener("click", function () { openAddon(b.getAttribute("data-ac"), b); }); });
    pop.querySelectorAll("[data-ic-close]").forEach(function (c) { c.addEventListener("click", close); });
    pop.querySelector(".ic-go").addEventListener("click", function () { document.documentElement.classList.remove("hm-pop-open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    var y0 = null, dy = 0;
    sheet.addEventListener("touchstart", function (e) { y0 = (sheet.scrollTop <= 0) ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    sheet.addEventListener("touchmove", function (e) { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) sheet.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    sheet.addEventListener("touchend", function () { if (y0 !== null && dy > 90) close(); sheet.style.transform = ""; y0 = null; });
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
    var trust = [["shield", "Certified Techs", "State license checked, insured, background checked yearly."], ["refund", "Cancel Anytime", "No fee. Refund = prepaid minus work done."], ["clipboard", "Home Reports", "Written report with photos saved to your Home Record."], ["user", "Background-Checked Yearly", "Third-party background check, renewed every year."], ["meter", "Moisture Scan Every Visit", "Whole-home moisture meter and thermal camera check every visit."], ["doc", "Licensed & Insured", "Licensed partners for work that needs a Michigan license, and insured techs."]];
    trust = HERO_CHIPS.map(function (c) { return trust.filter(function (t) { return t[1] === c[1]; })[0]; }).filter(Boolean);
    var popular = ["windows", "chimney", "ducts", "pressure", "radon", "pest", "snow", "lights"];
    var addons = popular.map(function (id) { return P.addons.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
    function card(ic, t, sub, extra, cls) { return '<div class="hm-card card mw-hover ' + (cls || "") + '">' + I(ic) + '<strong>' + t + '</strong>' + (sub ? '<span class="muted small">' + sub + '</span>' : '') + (extra || "") + '</div>'; }
    function row(id, title, cards, link, pre) {
      return '<section class="hm-row" id="row-' + id + '"><div class="hm-row-h"><h2>' + title + '</h2>' + (link || "") + '</div>' + (pre || "") + '<div class="hm-scroll">' + cards + '</div></section>';
    }
    return '<div class="hm">' +
      '<section class="hm-hero">' +
        '<button class="hm-thumb mw-hover' + '' + '" data-act="watch" type="button" aria-label="Watch Video">' + heroMedia() + '<span class="hm-expand" aria-hidden="true">' + I("play", "xs") + '</span><span class="hm-dur">0:50</span></button>' +
        '<div class="hm-hero-txt"><h1>Your Home,<br class="hm-br"> Taken Care Of.</h1>' +
        '<p class="hm-lead"><span class="hm-lead-l">Catch small problems before they&rsquo;re big ones.</span><span class="hm-lead-s">Catch small problems early.</span></p><p class="start-at">Membership Starting at $99/Month</p>' +
        '<button class="btn btn-primary btn-big mw-hover hm-cta-inline" data-act="start" type="button"><span class="hm-cta-l">Get Started</span><span class="hm-cta-s">Free Quote In Minutes</span></button>' +
        '<div class="hm-hcw"><button type="button" class="hm-hc-arr l" data-hc="l" aria-label="Move badges left">&lsaquo;</button><div class="hm-hchips" aria-label="Why Trust Us" data-ptr-ignore><div class="hm-hc-track">' + [0, 1].map(function (k) { return '<div class="hm-hc-set"' + (k ? ' aria-hidden="true"' : '') + '>' + HERO_CHIPS.map(function (c, i) { return '<span class="hm-hchip t' + (i % 4) + '"><span>' + c[1] + '</span></span>'; }).join("") + '</div>'; }).join("") + '</div></div><button type="button" class="hm-hc-arr r" data-hc="r" aria-label="Move badges right">&rsaquo;</button></div>' + (hasResume() ? resumeCard() : '') + '</div>' +
      '</section>' +
      '<button type="button" class="hm-plans-cue mw-hover" data-plans-cue aria-label="Scroll to Plans"><span>Plans</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg></button>' +
      /* Services search removed from the home/sales page (Max, Oct 14). It belongs in the future member 'My Home' area. */
      row("plans", "Plans", tiers.map(function (k) { return planCard(k, phoneOrder.indexOf(k)); }).join(""), '<button class="link mw-hover" type="button" data-act="start">Free Quote in Minutes</button>',
        '').replace('</div></section>', '</div><div class="pc-dots" aria-hidden="true">' + phoneOrder.map(function (k) { return '<span class="pc-dot" data-dot="' + k + '"></span>'; }).join("") + '</div></section>') +
      /* Waitlist card removed from home (Max, Oct 17): it shows only at the end of the quote flow for out-of-area ZIPs. */
      '<div class="hm-offer-pop" role="dialog" aria-modal="true" aria-label="Welcome Offer" hidden><div class="hm-offer-bg" data-offer-close></div><div class="hm-offer-card"><button type="button" class="hm-pop-x mw-hover" data-offer-close aria-label="Close">&times;</button><h3>Welcome Offer</h3><div class="hm-offer-body small"><p>Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term</p><p>Refer a Neighbor: 1 Month Free Each, Added at the End of Your Term Once You Complete It</p><p>Free months are added at the end of your term and apply once you complete it.</p><p class="muted">Offers Stack. Draft Terms.</p></div></div></div>' +
      '<section class="hm-row" id="row-services"><div class="hm-row-h"><h2>What We Take Care Of</h2><button class="link mw-hover" type="button" data-hm-open="plans">See All</button></div>' +
        wwCarousel() + '</section>' +
      '<div class="hm-pop" role="dialog" aria-modal="true" aria-labelledby="hmPopT" data-ptr-ignore hidden><div class="hm-pop-bg" data-pop-close></div><div class="hm-pop-card">' +
        '<button type="button" class="hm-pop-x mw-hover" data-pop-close aria-label="Close">&times;</button>' +
        '<div class="hm-pop-art"></div><p class="hm-pop-tag"></p><h3 id="hmPopT"></h3><p class="hm-pop-txt"></p>' +
        '<button type="button" class="btn btn-primary mw-hover hm-pop-go">Free Quote in Minutes</button></div></div>' +
      '<section class="hm-row" id="row-trust"><div class="hm-row-h"><h2 class="hm-trust-h">Why Trust Us</h2><button class="link mw-hover" type="button" data-hm-open="faq">How We Vet</button></div>' +
        '<div class="hm-chips">' + trust.map(function (s, i) { return '<span class="hm-chip t' + (i % 4) + '"><span>' + s[1] + '</span></span>'; }).join("") + '</div>' +
        '</section>' +
      '<section class="hm-accs"><h2>Details</h2>' +
      hmAcc("plans", "house", "What's Included", wiRow() + incCarousel()) +
      hmAcc("addons", "wrench", "Shop À La Carte", '<ul class="hm-prices">' + P.addons.map(function (a) { return '<li><button type="button" class="ac-item mw-hover" data-ac="' + a.id + '" aria-haspopup="dialog">' + I(ADDON_ICO[a.id] || "wrench", "xs") + '<span>' + a.label + '</span><b>' + addMo(a) + '</b></button></li>'; }).join("") + '</ul><button class="btn btn-outline mw-hover" data-act="alacarte" type="button">Shop À La Carte</button>') +
      hmAcc("refund", "refund", "Refund Promise", ul(["Cancel Anytime, No Fee", "Refund = Prepaid Minus Work Done", "Free Months: Added at End of Term, Apply Once You Complete It", "Stay Offer: 6+ Months, 1 Month Free. 1+ Year, 2 Months Free.", '<a href="/#cancel" class="link mw-hover">Cancel Online Anytime In One Step</a>']) + '<p class="small muted" style="margin:.4rem 0 0">Signed up in person at your home or an event, or on a sales call from us? You get a 3-day right to cancel.</p>') +
      hmAcc("faq", "faq", "FAQ", '<h4>How Often Should I Change My Furnace Filter?</h4><p>Every 1 to 3 months. Every plan includes Furnace Filters.</p><h4>Service Area?</h4><p>Metro Detroit: Wayne, Oakland, Macomb.</p><h4>How Do You Vet Techs?</h4><p>State License Checked, Insured, Yearly Background Check.</p><h4>Can I Cancel?</h4><p>Anytime, no fee. See Refund Promise.</p><h4>Photos Required?</h4><p>No. They lock your price.</p><a class="btn btn-outline mw-hover" href="faq/">See All FAQs</a>') +
      '</section>' + featuredAd() + /* lower Share pill removed (Max, Oct 17): the header share arrow is the only Share */ wiPop() + icSheet() + acPop() +
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
    /* Max 20:36 ICT Oct 15: cards ~82% wide, snap to center, Plus centered on load with Essentials/Complete peeking; positioned before first paint (no jump). */
    function mid(el) { var cr = el.getBoundingClientRect(), sr = sc.getBoundingClientRect(); return (cr.left + cr.width / 2) - (sr.left + sr.width / 2); }
    function sync() {
      if (!mq.matches) return;
      var best = null, d = 1e9;
      cards().forEach(function (c) { var x = Math.abs(mid(c)); if (x < d) { d = x; best = c; } });
      dots.forEach(function (o) { o.classList.toggle("on", !!best && o.getAttribute("data-dot") === best.getAttribute("data-tier")); });
    }
    function start() {
      if (!mq.matches) return;
      var c = sc.querySelector(".hm-plan.rec") || sc.querySelector(".hm-plan.sel");
      var sb = sc.style.scrollBehavior; sc.style.scrollBehavior = "auto";
      if (c) sc.scrollLeft += mid(c); else sc.scrollLeft = 0;
      sc.style.scrollBehavior = sb;
      sync();
    }
    var raf = 0;
    sc.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); }); }, { passive: true });
    if (mq.addEventListener) mq.addEventListener("change", start);
    start(); requestAnimationFrame(start);
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
      var g = document.getElementById("acc-plans"); if (!g) return;
      if (!g.open) g.querySelector("summary").click();
      setTimeout(function () { g.scrollIntoView({ behavior: smooth, block: "start" }); }, 340);
    }); });
    root.querySelectorAll("[data-hm-back]").forEach(function (b) { b.addEventListener("click", function () { root.querySelector("#row-plans").scrollIntoView({ behavior: smooth, block: "start" }); }); });
  }
  function bindOffer(root) {
    var pop = root.querySelector(".hm-offer-pop"); if (!pop) return;
    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-offer]")) { e.preventDefault(); e.stopPropagation(); pop.hidden = false; var x = pop.querySelector(".hm-pop-x"); if (x) x.focus(); return; }
      if (e.target.closest("[data-offer-close]")) { pop.hidden = true; }
    }, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") pop.hidden = true; });
  }
  /* Shop À La Carte pop-up from the bottom bar (Max, Oct 17): every à la carte service from P.addons and P.lastMinute with its existing draft price, short description and an Add button. Bottom sheet on phones, centered modal on desktop. */
  function acPop() {
    var sel = S.alacarte || [];
    return '<div class="xt-sheet ac-pop" id="acPop" hidden role="dialog" aria-modal="true" aria-labelledby="acPopT"><div class="xt-inner">' +
      '<div class="xt-top"><h3 id="acPopT">Shop À La Carte</h3><button type="button" class="modal-x mw-hover" data-acpop-close="1" aria-label="Close">&times;</button></div>' +
      '<p class="lead-sm">One-time services, no membership needed. Tap Add on anything you want, then Book. <span class="draft">Draft prices</span></p>' +
      '<h4 class="acp-h">Services</h4>' + renderAddonList(P.addons || [], sel, "acpop", function (x) { return oncePriceLabel(x) + (x.note ? ' <span class="muted">· ' + esc(x.note) + '</span>' : '') + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
      '<h4 class="acp-h">Quick Jobs on a Visit</h4>' + renderAddonList(P.lastMinute || [], sel, "acpop", function (x) { return oncePriceLabel(x) + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
      '<div class="acp-foot"><button type="button" class="btn btn-primary btn-big mw-hover" data-acpop-book="1">' + (sel.length ? "Book " + sel.length + " Selected" : "Book À La Carte") + '</button></div></div></div>';
  }
  function bindAcPop(root) {
    var pop = root.querySelector("#acPop"); if (!pop) return; var from = null;
    function close() { if (pop.hidden) return; pop.hidden = true; document.body.classList.remove("xt-lock"); if (from) from.focus(); }
    function foot() { var n = (S.alacarte || []).length; pop.querySelector("[data-acpop-book]").textContent = n ? "Book " + n + " Selected" : "Book À La Carte"; }
    acPop.open = function (btn) { from = btn || null; pop.hidden = false; document.body.classList.add("xt-lock"); pop.querySelector(".xt-inner").scrollTop = 0; pop.querySelector(".modal-x").focus({ preventScroll: true });
      try { window.SUEvents && SUEvents.emit("alacarte_open", "site", { payload: { from: "bottom bar" } }); } catch (x) {} };
    pop.addEventListener("click", function (e) {
      if (e.target === pop || e.target.closest("[data-acpop-close]")) return close();
      if (e.target.closest("[data-acpop-book]")) { close(); return go("alacarte"); }
      var b = e.target.closest("[data-acpop]"); if (!b) return;
      var id = b.getAttribute("data-acpop"); S.alacarte = Array.isArray(S.alacarte) ? S.alacarte : [];
      var i = S.alacarte.indexOf(id), on = i < 0; if (on) S.alacarte.push(id); else S.alacarte.splice(i, 1); save();
      b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); b.querySelector(".chk").innerHTML = on ? "&#10003;" : ""; var ad = b.querySelector(".acp-add"); if (ad) ad.textContent = on ? "Added" : "Add"; foot();
      if (on) logAddon("tap", [id], "alacarte-popup");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function bindHome() {
    var root = app.querySelector(".hm"); if (!root) return;
    bindPlanSwipe(root); bindOffer(root); bindInc(root);
    bindPlanSelect(root); bindAcPop(root);
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
      if (t === "addons" && acPop.open) { acPop.open(b); return; }
      if (t === "myhome" || t === "account") { toast.textContent = (t === "myhome" ? "My Home" : "Account") + " Is Coming Soon"; toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 2200); return; }
      root.querySelectorAll("[data-hm-tab]").forEach(function (o) { o.classList.toggle("on", o === b); });
      if (t === "home") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      else document.getElementById("row-" + t).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }); });
    var cue = root.querySelector("[data-plans-cue]"); if (cue) cue.addEventListener("click", function () { var t = document.getElementById("row-plans"); if (!t) return; var top = t.getBoundingClientRect().top + window.scrollY - ((document.querySelector(".topbar") || {}).offsetHeight || 0) - 8; window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" }); });
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
    root.querySelectorAll("#row-services [data-svc]").forEach(function (t) { t.addEventListener("click", function () { popOpen(t); }); });
    bindWW(root);
    if (pop) {
      pop.querySelectorAll("[data-pop-close]").forEach(function (c) { c.addEventListener("click", popClose); });
      pop.querySelector(".hm-pop-go").addEventListener("click", function () {
        pop.hidden = true; document.documentElement.classList.remove("hm-pop-open");
        if (popTier && P.tiers[popTier]) S.tier = popTier;
        go("q0");
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") popClose(); });
    }
    /* trust chips: nothing happens on tap (Trust Tags deck 07, Max Oct 17) */
    /* search */
    var idx = [];
    accs.forEach(function (d) { var title = d.querySelector("summary span").textContent; idx.push({ t: title, k: (title + " " + d.querySelector(".acc-body").textContent).toLowerCase(), acc: d }); });
    P.addons.forEach(function (a) { idx.push({ t: a.label + " · " + addMo(a), k: (a.label + " " + a.desc).toLowerCase(), acc: document.getElementById("acc-addons") }); });
    var inp = root.querySelector(".hm-search input"), res = root.querySelector(".hm-results");
    if (!inp || !res) return; /* search lives in future My Home area */
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

  /* Coming back later: Resume Card (Info Gather Deck). */
  /* Max 20:33 ICT Oct 15: resume card only for a real in-progress step; X clears saved progress; Start Over clears and goes to step 1. */
  function hasResume() { return !!S.resume && /^(q\d+|choice|photos|visit|quote|signup|pay)$/.test(S.resume); }
  function startOverBtn() { return '<button type="button" class="qf-startover mw-hover" data-act="startOver">Start Over</button>'; }
  function resumeCard() {
    var done = Q.filter(function (q) { return S.answers[q.id] !== undefined; }).length;
    return '<div class="hm-resume-card"><span class="qf-art t3" aria-hidden="true">' + I("clock") + '</span><div><b>Pick Up Where You Left Off</b><small>' + done + ' of ' + Q.length + ' questions answered</small></div>' +
      '<button type="button" class="hm-resume-x mw-hover" data-act="dismissResume" aria-label="Dismiss and clear saved progress">&times;</button>' +
      '<span class="hm-resume-btns"><button class="btn btn-primary mw-hover" data-act="resume" type="button">Resume</button><button class="btn btn-outline mw-hover" data-act="startOver" type="button">Start Over</button></span></div>';
  }
  function overview() {
    var steps = [
      [I("pen"), "8 Quick Questions", ""],
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
  var QART = { zip: "house", sqft: "house", furnaces: "furnace", acs: "ac", waterHeaters: "waterheater", softener: "meter", stories: "gutter", extras: "star" };
  var QSHORT = { zip: "Your ZIP or Address", sqft: "Home Size", furnaces: "Furnaces", acs: "AC Units", waterHeaters: "Water Heaters", softener: "Water Softener", stories: "Stories", extras: "Extras" };
  var QTITLE = { zip: "Where's Your Home?", sqft: "How Big Is Your Home?", furnaces: "How Many Furnaces?", acs: "How Many AC Units?", waterHeaters: "How Many Water Heaters?", softener: "Do You Have a Water Softener?", stories: "How Many Stories?", extras: "Any of These?" };
  var QHELP = { zip: "ZIP or street address. Metro Detroit.", sqft: "A rough range is fine.", furnaces: "Most homes over 3,500 sq ft have two.", acs: "Count the outdoor units.", waterHeaters: "Then pick the type.", softener: "Usually a tall tank and a salt bin near the water heater.", stories: "Sets gutter and ladder work.", extras: "Pick all that apply." };
  var XICO = { irrigation: "spray", sump: "meter", fireplace: "chimney", generator: "wrench", pool: "pool", humidifier: "radon" };
  var SQICO = ["house", "house", "house", "house", "house", "house"];
  var PCOL = { silver: 1, gold: 2, platinum: 3 };
  function qTile(attr, val, label, ico, tint, sel, extra) {
    return '<button type="button" class="qt mw-hover t' + tint + (sel ? " sel" : "") + (extra || "") + '" data-' + attr + '="' + val + '" aria-pressed="' + !!sel + '">' +
      '<span class="qt-ic">' + ico + '</span><span class="qt-lab">' + label + '</span>' + (sel ? '<i class="qt-ok" aria-hidden="true"></i>' : '') + '</button>';
  }
  /* Drawn illustrations on answer tiles (Info Gather Deck): the equipment drawing, stacked for 2+, crossed for none. */
  function drawnCount(icoName, n) { if (n === "0") return I(icoName, "sm") + '<b class="qt-x" aria-hidden="true"></b>'; var k = Math.min(3, Number(n) || 1), h = ""; for (var j = 0; j < k; j++) h += I(icoName, "sm"); return '<span class="qt-stack n' + k + '">' + h + '</span>'; }
  function countIco(icoName, n) { return n === "0" ? I(icoName, "sm") + '<b class="qt-x" aria-hidden="true"></b>' : '<b class="qt-n">' + esc(n) + '</b>'; }
  function planChip() {
    var t = P.tiers[S.tier] || P.tiers[tierKeys()[0]];
    return '<div class="qf-plan"><button type="button" class="qf-chip mw-hover tc' + (PCOL[S.tier] || 1) + '" data-plan-chip="1" aria-expanded="false" aria-controls="qfPlans">' + '<span class="qf-dot" aria-hidden="true"></span>' + esc(t.label) + ' Plan<span class="qf-chg">Change</span></button>' +
      '<div class="qf-plans" id="qfPlans" hidden>' + tierKeys().map(function (k) { return '<button type="button" class="qf-pick mw-hover tc' + (PCOL[k] || 1) + (S.tier === k ? " sel" : "") + '" data-plan-pick="' + k + '"><span class="qf-dot" aria-hidden="true"></span>' + esc(P.tiers[k].label) + '</button>'; }).join("") + '</div></div>';
  }
  function qHead(i) {
    var q = Q[i], c = chapterOf(q.id);
    return '<div class="qf-top">' + planChip() + '</div>' +
      '<div class="qf-prog"><span class="qf-step">Chapter ' + (c + 1) + ' of ' + CHAPTERS.length + ' &middot; ' + CHAPTERS[c][0] + '</span>' +
      '<div class="qf-segs" role="progressbar" aria-valuenow="' + (i + 1) + '" aria-valuemin="1" aria-valuemax="' + Q.length + '" aria-label="Question ' + (i + 1) + ' of ' + Q.length + '">' +
      Q.map(function (x, k) { return '<span class="' + (k < i ? "done" : k === i ? "cur" : "") + (k > 0 && chapterOf(x.id) !== chapterOf(Q[k - 1].id) ? " gap" : "") + '"></span>'; }).join("") + '</div></div>';
  }
  function tagLine() { return '<p class="qf-tagline">' + I("shield", "xs") + 'Free Offer in Minutes &middot; Tailored to Your Home &middot; Warranties Checked</p>'; }
  function navBar() { return '<div class="qf-navbar">' + backBtn() + '</div>'; }
  function qArt(name, tint) { return '<div class="qf-art big t' + tint + '" aria-hidden="true">' + I(name) + '</div>'; }
  function question(i) {
    var q = Q[i], a = S.answers[q.id], body = "", tint = i % 4, foot = "";
    if (q.type === "zip") {
      body = '<div class="qf-field"><label class="sr" for="zip">Address or ZIP</label>' + I("search", "sm") +
        '<input id="zip" type="text" inputmode="text" enterkeyhint="next" autocomplete="street-address" placeholder="48322 or 123 Main St, Novi" value="' + esc(a && a !== "unsure" ? a : "") + '"></div>' +
        '<div class="err" id="zipErr" role="alert"></div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>See My Price</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure? Skip for Now</button>';
    } else if (q.type === "multi") {
      var arr = Array.isArray(a) ? a : [];
      body = '<div class="qt-grid two" data-ptr-ignore>' + q.opts.map(function (o, k) { return qTile("multi", o[0], o[1].replace("Whole-House ", ""), I(XICO[o[0]] || "wrench", "sm"), k % 4, arr.indexOf(o[0]) > -1, " chkt"); }).join("") +
        qTile("multi", "none", "None of These", I("shield", "sm"), 3, a === "none", " chkt") + '</div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>Next</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>';
    } else if (q.type === "wh") {
      var t = S.answers.whType;
      body = '<div class="qt-grid two cmp" data-ptr-ignore>' + q.opts.map(function (o, k) { return qTile("single", o[0], o[1] === "1" ? "One" : o[1] === "2" ? "Two" : o[1], drawnCount("waterheater", o[0]), k % 4, String(a) === o[0], " chkt"); }).join("") + '</div>' +
        '<p class="qf-sub">Tank or Tankless?</p><div class="qt-grid two cmp" data-ptr-ignore>' + [["tank", "Tank", "waterheater"], ["tankless", "Tankless", "tankless"], ["both", "One of Each", "grid"]].map(function (o, k) { return qTile("wh", o[0], o[1], I(o[2], "sm"), (k + 1) % 4, t === o[0], " chkt"); }).join("") + '</div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>Next</button>' +
        '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>';
    } else {
      var cnt = q.id === "furnaces" || q.id === "acs";
      var cls = "two";
      body = '<div class="qt-grid ' + cls + '" data-ptr-ignore>' + q.opts.map(function (o, k) {
        var ico = cnt ? drawnCount(QART[q.id], o[0]) : q.id === "stories" ? drawnCount("house", o[0]) : q.id === "softener" ? I(o[0] === "yes" ? "meter" : o[0] === "no" ? "shield" : "faq", "sm") : I("house", "sm");
        var lab = cnt ? (o[0] === "0" ? "None" : o[1] === o[0] ? (o[0] === "1" ? "One" : o[0] === "2" ? "Two" : o[0] === "3" ? "Three" : o[1]) : o[1]) : o[1].replace(" sq ft", "").replace(" (Ranch)", "");
        var sub = q.id === "sqft" ? '<small>sq ft</small>' : q.id === "stories" && o[0] === "1" ? '<small>Ranch</small>' : "";
        return qTile("single", o[0], lab + sub, ico, k % 4, String(a) === o[0], q.id === "sqft" ? " sz" + k : "");
      }).join("") + '</div>';
      foot = '<button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (isAnswered(q) ? "" : " disabled") + '>Next</button>' + (q.id === "softener" ? "" : '<button type="button" class="qf-unsure mw-hover' + (a === "unsure" ? " sel" : "") + '" data-unsure="1">Unsure</button>');
    }
    var ph = QPHOTO[q.id], phN = ph ? (S.photos[ph] || 0) : 0;
    var side = ph ? '<label class="qf-snap mw-hover">' + I("camera", "xs") + '<span><b>' + (phN ? phN + " Photo" + (phN > 1 ? "s" : "") + " Added" : "Snap a Photo (Optional)") + '</b><small>Snapping a photo will help improve your maintenance service.</small></span>' +
      '<input type="file" accept="image/*" capture="environment" data-photo="' + ph + '" hidden></label>' : "";
    var dyk = DYK[q.id] ? '<div class="qf-dyk">' + I("star", "xs") + '<p><b>Did You Know?</b> ' + DYK[q.id] + '</p></div>' : "";
    return '<section class="qf qf-' + q.id + '">' + qHead(i) +
      '<div class="qf-hero stack">' + qArt(QART[q.id], tint) + '<h1 class="qf-h">' + QTITLE[q.id] + '</h1><p class="qf-help">' + QHELP[q.id] + '</p></div>' +
      '<div class="qf-body">' + body + side + '</div>' + dyk + '<div class="qf-foot">' + foot + tagLine() + navBar() + startOverBtn() + '</div></section>';
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

  function answerText(q) {
    var a = S.answers[q.id];
    if (a === undefined) return "Not Answered"; if (a === "unsure") return "Unsure"; if (a === "none") return "None";
    if (q.id === "zip") return esc(a);
    if (q.id === "extras") return (Array.isArray(a) ? a : []).map(function (k) { return esc((P.extras[k] || {}).label || k); }).join(", ");
    var o = (q.opts || []).filter(function (x) { return x[0] === String(a); })[0], t = o ? o[1] : String(a);
    if (q.id === "waterHeaters") { var w = S.answers.whType; t += w === "tank" ? ", Tank" : w === "tankless" ? ", Tankless" : w === "both" ? ", One of Each" : ""; }
    if (q.id === "acs" && a === "0") t = "None";
    return esc(t);
  }
  function answerSummary() {
    return '<ul class="qf-sum">' + Q.map(function (q, i) { return '<li><span class="qf-sum-ic">' + I(QART[q.id], "xs") + '</span><span class="qf-sum-k">' + QSHORT[q.id] + '</span><b>' + answerText(q) + '</b><button type="button" class="link mw-hover" data-edit="' + i + '">Edit</button></li>'; }).join("") + '</ul>';
  }
  function choice() {
    return '<section class="qf qf-done">' + '<div class="qf-top">' + planChip() + '</div>' +
      '<div class="qf-prog"><span class="qf-step">All ' + Q.length + ' Done</span><div class="qf-segs all" aria-hidden="true">' + Q.map(function () { return '<span class="done"></span>'; }).join("") + '</div></div>' +
      '<h1 class="qf-h center">Your Price Is Ready</h1><p class="qf-help center">Built from your answers.</p>' + answerSummary() +
      '<div class="qf-foot"><button class="btn btn-primary btn-big mw-hover" data-act="toQuote" type="button">See My Price</button>' +
      '<button class="btn btn-outline btn-big mw-hover" data-act="photos" type="button">' + I("camera", "xs") + ' Add Photos to Lock It In</button><p class="qf-help center small">Photos are optional.</p>' + tagLine() + navBar() + startOverBtn() + '</div></section>';
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

  /* Menus & Headlines deck 10 (Max, Oct 17): add-ons are their own step after picking a plan. One "My Add-Ons" list; lawn is one item (priced after we measure, no number shown). */
  function extrasStep() {
    var addSum = addonsAnnual(), p = price(), runYear = p[S.tier] + addSum;
    return backBtn() + stepRail(4) + '<p class="eyebrow">Optional Step</p><h1>My Add-Ons</h1><p>Add any extras to your ' + esc(P.tiers[S.tier].label) + ' plan, or skip. Draft prices; monthly figure is the yearly midpoint ÷ 12.</p>' +
      renderAddonList(P.addons || [], S.addons || [], "addon", addonPriceLabel) +
      '<a class="addon mw-hover addon-lawn" href="lawn/"><span class="chk" aria-hidden="true">&rsaquo;</span><span class="addon-body"><strong>Custom Grass Cutting</strong><p class="addon-desc">Measured from above. No visit needed. No member discount on mowing.</p><p class="addon-price">Price after we measure your lawn <span>(draft)</span></p></span></a>' +
      '<div class="running card"><h3>Your Total · ' + P.tiers[S.tier].label + '</h3>' + priceBlock(runYear, "annual") + (addSum ? '<p class="small muted" style="margin:0">Incl. Add-Ons +' + money(monthlyOf(addSum)) + '/month</p>' : '') + '</div>' +
      '<button class="btn btn-primary btn-big mw-hover" data-act="signup" type="button">Continue to Sign Up</button>' +
      '<p class="small" style="text-align:center"><button class="link mw-hover" data-act="signup" type="button">Skip, No Add-Ons</button></p>';
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
      (addSum ? '<p class="small muted" style="margin:0">Incl. Add-Ons +' + money(monthlyOf(addSum)) + '/month</p>' : '') +
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
      '<button class="btn btn-primary btn-big mw-hover pr-cta" data-act="extras" type="button">Sign Up for ' + P.tiers[S.tier].label + '</button>' +
      '<button class="btn btn-outline btn-big mw-hover pr-alt" data-act="alacarte" type="button">' + I("grid", "xs") + ' Shop À La Carte</button></section>' +
      '<p class="small muted pr-offer">Welcome Offer: Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term. Refer a Neighbor: 1 Month Free Each, Once You Complete Your Term. Free months are added at the end of your term and apply once you complete it.</p>' +
      '<h2 class="pr-more">Plan Details</h2>' +
      tiersHtml + status +
      (final ? "" : '<details class="acc est-note"><summary class="mw-hover">Estimate. Final After Photos or Visit.</summary><div class="acc-body small">If photos or the site visit show something different, we adjust before your first billed visit.' + (unsure ? ' Unsure answers use a typical metro Detroit home.' : '') + ' Draft prices.</div></details>') +
      runHtml +
      '<button class="btn btn-primary btn-big mw-hover" data-act="extras" type="button">Sign Up for ' + P.tiers[S.tier].label + '</button>' +
      (!S.photosComplete && !S.visit ? '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="photos" type="button">' + I("camera", "xs") + ' Add Photos</button><button class="btn btn-outline mw-hover" data-act="visit" type="button">' + I("van", "xs") + ' Free Tech Visit</button></div>' : "") + alacarteCta + waitlistEnd();
  }
  /* Out-of-area waitlist (Max, Oct 17): only after the price, only when the ZIP they entered is outside the service area (inArea). In-area and Unsure visitors never see it. */
  function waitlistEnd() {
    var z = S.answers && S.answers.zip && S.answers.zip !== "unsure" ? zipOf(S.answers.zip) : "";
    if (!z || inArea(z)) return "";
    return '<section class="hm-wait qt-wait" id="row-waitlist"><div class="card hm-wait-card"><h3>Outside Our Area?</h3><p class="small muted">ZIP ' + esc(z) + ' is outside the area we serve today: Metro Detroit (Wayne, Oakland, Macomb). Join the waitlist and we will tell you when we reach your ZIP.</p><form class="hm-wait-f" data-wait><input type="text" inputmode="numeric" maxlength="5" placeholder="ZIP" aria-label="ZIP code" value="' + esc(z) + '"><input type="email" placeholder="Email" aria-label="Email"><button class="btn btn-outline mw-hover" type="submit">Join the Waitlist</button></form><p class="small hm-wait-msg" aria-live="polite"></p></div></section>';
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
      return { plan: "biennial", label: "Pay 2 Years Get 30 Months", today: prepaid, year: prepaid, membership: mem2, membershipAnnual: amt, addons: add2, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "biennial", termMonths: 30, save: save6, freeMonths: 6, referralCodeIn: refIn,
        note: money(Math.round(mem2 / 24)) + "/Month, prepaid " + money(prepaid) + " for 2 years. 6 extra months free at the end of your term, once you complete it (draft)." };
    }
    if (S.tier === "silver" || S.tier === "gold") {
      return { plan: "annual", label: "Pay Yearly", today: amt + add, year: amt + add, membership: amt, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "annual", termMonths: 12, referralCodeIn: refIn,
        note: (S.tier === "silver" ? "Essentials" : "Plus") + " is paid in full for the year, up front." };
    }
    /* Order Form Details Deck 13 (Max 19:33 ICT Oct 15): prepay only, no quarterly or monthly card option. */
    if (false) return { plan: "quarterly", label: "4 Quarterly Payments", today: (amt + add) / 4, year: amt + add, membership: amt, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "quarterly", termMonths: 12, referralCodeIn: refIn, note: "4 payments of " + money((amt + add) / 4) + "." };
    var disc = Math.max(round(amt * (1 - P.platinumAnnualDiscount)), P.minAnnual || 1188);
    return { plan: "annual", label: "Pay Yearly, Save 10%", today: disc + add, year: disc + add, membership: disc, membershipAnnual: amt, addons: add, addonIds: addonIds, lastMinute: lm, lastMinuteIds: lmIds, billKind: "annualDiscount", termMonths: 12, save: amt - disc, referralCodeIn: refIn, note: "You save " + money(amt - disc) + " on membership (draft discount). Add-ons are full price." };
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
    return '<details class="cancel-policy cp-link" id="cancelPolicy"><summary class="mw-hover">Cancel Policy: Cancel Anytime, No Fee. Fair Refunds.</summary><div class="acc-body">' +
      '<span class="draft">DRAFT, pending legal review</span>' +
      '<p>You may cancel at any time. <strong>There is no cancellation fee.</strong> Your refund equals the prepaid amount minus the itemized price of services already completed — the same lines shown in Detailed Pricing. Unused visits and unfinished line items are refunded. This is not a time-based proration.</p>' +
      '<p class="retention">' + I("gift", "xs") + '<span><strong>Stay Offer:</strong> Thinking of canceling or renewing? Members of 6+ months get 1 month free to stay. Members of 1+ year get 2 months free. Optional, never required to cancel.</span></p>' +
      '<p><strong>Welcome offers (draft):</strong> Free months from the 2-year prepay or from referrals carry <strong>no refund value</strong>. Only prepaid dollars (what you paid) are refundable after deducting completed services. Referral free months are credited only after the referred neighbor\'s first payment has cleared.</p>' +
      ex.html +
      '<p><a href="#cancel" class="link mw-hover">Cancel Membership online</a> in one step.</p>' +
      '<p class="small muted" style="margin:0">Final terms pending legal review.</p></div></details>';
  }
  function agreementHtml() {
    var ex = cancelExample(S.tier);
    return '<span class="draft">DRAFT, pending legal review</span><h4>Smart Upkeep Membership Agreement</h4><p>This placeholder agreement is between you (the Member) and Smart Upkeep. It is not final and is shown for prototype purposes only.</p><h4>1. Services</h4><p>Smart Upkeep will perform the maintenance visits and services listed for your selected membership tier at the service address, on a schedule we set with you.</p><h4>2. Term and Renewal</h4><p>The membership runs for 12 months from your first visit, or 30 months if you choose Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term (24 paid months, then 6 free months added at the end), plus any referral free months credited after a referred neighbor\'s first payment clears. Unless you cancel, the membership renews automatically at the end of the term for another 12 months at the plan price at that time, charged to your payment method on file. We email the renewal date and price at least 30 days before any renewal charge. You can cancel online at any time with no fee (Cancel Membership).</p><h4>3. Pricing and Adjustments</h4><p>Your price is based on the information and photos you provide. If photos or answers do not match what we find on site, pricing will be adjusted and you may accept the new price or cancel before your first billed visit.</p><h4>4. Payment</h4><p>Essentials and Plus memberships are paid in full annually, up front, or as a 2-year prepay welcome offer. Complete memberships are paid annually up front at a discount, or as a 2-year prepay welcome offer. No membership is priced below $99/Month. Referral free months are credited only after the referred neighbor\'s first payment has cleared.</p><h4>5. Access</h4><p>You agree to provide reasonable access to the home and equipment at scheduled times.</p><h4>6. Recall Monitoring</h4><p>We will monitor logged equipment for published manufacturer recalls and notify you. We do not guarantee that every recall will be identified.</p><h4>7. Cancellation and Refunds</h4><p>You may cancel at any time. There is no cancellation fee. If you cancel after prepaying, your refund equals the prepaid amount minus the itemized price of services already completed (using the same line items shown in Detailed Pricing). Unused visits and unfinished line items are refunded. Refunds are not based on calendar time remaining in the term. Free months from welcome offers (2-year prepay or referrals) carry no refund value. Stay Offer: if you ask to cancel or come up for renewal after 6 or more months of membership, we offer 1 month free to stay; after 1 year or more, 2 months free. Accepting is optional and never required to cancel; stay-offer months carry no refund value.</p><h4>8. Michigan Home Solicitation Cancel Right</h4><p><strong>DRAFT, pending legal review.</strong> YOU, THE BUYER, MAY CANCEL THIS TRANSACTION AT ANY TIME PRIOR TO MIDNIGHT OF THE THIRD BUSINESS DAY AFTER THE DATE OF THIS TRANSACTION. SEE THE ATTACHED NOTICE OF CANCELLATION FORM FOR AN EXPLANATION OF THIS RIGHT. (MCL 445.113)</p>' + ex.html;
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
    /* Order Form Details Deck (Max 19:33 ICT Oct 15): Save 10% option first, named "Pay Yearly" (04, 09); prepay only, no quarterly/monthly card (13);
       big price stays per month (02); 2-year option named "Pay 2 Years Get 30 Months" (20). */
    if (S.tier === "platinum") planOpts.push(["annual", "Pay Yearly", platDisc + add, "annualDiscount", "Save 10%"]);
    else planOpts.push(["annual", "Pay Yearly", listed + add, "annual"]);
    planOpts.push(["biennial", "Pay 2 Years Get 30 Months", twoPrepaid, "biennial"]);
    var planHtml = '<div class="opts">' + planOpts.map(function (o) {
      var s = S.plan === o[0];
      var extra = o[4] ? ' <span class="pay-save">' + o[4] + '</span>' : "";
      return '<button type="button" class="opt mw-hover' + (s ? " sel" : "") + '" data-plan="' + o[0] + '"><span class="chk">' + (s ? "&#10003;" : "") + '</span><span><strong>' + o[1] + extra + '</strong>' + priceBlock(o[2], o[3]) + '</span></button>';
    }).join("") + '</div>' + offerTermsShort();
    var addonSummary = selectedAddons().length
      ? selectedAddons().map(function (x) { return '<div><span>Add-on: ' + esc(x.label) + '</span><span>' + addMo(x) + '</span></div>'; }).join("")
      : '<div><span>Add-ons</span><span>None selected</span></div>';
    var lmSummary = selectedLastMinute().length
      ? selectedLastMinute().map(function (x) { return '<div><span>Add-on: ' + esc(x.label) + ' <span class="tag-1x">One-Time</span></span><span>' + money(x.price) + ', with next visit</span></div>'; }).join("")
      : '';
    /* Order Form Deck (Max, 19:28 ICT Oct 15): summary at top (08) with each extra on its own line (13), running total only here (15), yard sign near the total (14);
       short recap of home details (17) with an edit link back to the questions (02); full name first (03), name and phone stacked (16); referral behind "Have a Code?" (11);
       agreement and waiver in open scroll boxes (04), signed once for both (06); errors under each field (07); plain form, no badges (12); one long page (10); 4-step rail kept (18);
       button words only (05) "Join <Plan>" (19) with the cancel-anytime line next to it (09). Michigan notice placement left as is (card 20 skipped). */
    var recap = Q.map(function (q) { return QSHORT[q.id] + ': ' + answerText(q); }).join(' · ');
    var hasRef = !!(S.referralCodeIn || su.referralCodeIn);
    function fe(id) { return '<p class="ferr" id="e-' + id + '" aria-live="polite"></p>'; }
    return backBtn() + stepRail(4) + '<h1>Sign Up for ' + P.tiers[S.tier].label + '</h1>' +
      '<form id="suF" novalidate class="stack">' +
      '<div class="card su-sum-top"><h3>Your Plan</h3>' +
      '<div class="summary-price">' + priceBlock(t.year, t.billKind) + '</div>' +
      '<p class="small su-start">Membership Starts At Your First Visit</p>' +
      '<div class="summary"><div><span>Plan</span><span>' + P.tiers[S.tier].label + ' (' + P.tiers[S.tier].visits + ' visits a year)</span></div><div><span>Payment</span><span>' + t.label + '</span></div>' +
      (t.plan === "biennial" ? '<div><span>Term</span><span>24 Paid Months + 6 Free Months at the End (Once You Complete It)</span></div>' : "") +
      (t.plan === "biennial" ? '<div><span>+6 Free Months Added At The End Of Your Term (Once You Complete It)</span><span>' + money(6 * monthlyOf(t.membershipAnnual)) + ' Value</span></div>' : t.save ? '<div><span>Annual Discount (Draft)</span><span>&minus;' + money(t.save) + '</span></div>' : "") +
      ((S.referralCodeIn || "").trim() ? '<div><span>Referral Code Applied</span><span>' + esc((S.referralCodeIn || "").trim()) + ' · +1 Free Month</span></div>' : "") +
      addonSummary + lmSummary +
      '<div class="su-due2"><div><span>Due Today</span><b>' + money(t.today) + '</b></div><div><span>Per Month</span><b>' + money(t.today / (t.plan === "biennial" ? 24 : 12)) + '</b><small>over ' + (t.plan === "biennial" ? "24 paid months" : "12 months") + '</small></div></div></div>' +
      '<label class="checkrow yard-sign"><input type="checkbox" id="sYardSign"' + (su.yardSignOk ? " checked" : "") + '><span>Yard Sign OK? Free Detector Battery Swap</span></label>' +
      '<div class="su-recap small"><strong>Your Home:</strong> ' + recap + ' <button type="button" class="link mw-hover" data-edit="0">Edit Home Details</button></div></div>' +
      '<div class="card"><h3>Your Details</h3>' +
      '<label class="fl sr-only" for="sName">Full Name</label>' + fe("sName") + '<input id="sName" placeholder="Full name" type="text" autocomplete="name" value="' + esc(su.name || (S.visit && S.visit.name) || "") + '">' +
      '<label class="fl sr-only" for="sPhone">Phone</label>' + fe("sPhone") + '<input id="sPhone" placeholder="Phone" type="tel" autocomplete="tel" value="' + esc(su.phone || (S.visit && S.visit.phone) || "") + '">' +
      '<label class="fl sr-only" for="sEmail">Email</label>' + fe("sEmail") + '<input id="sEmail" placeholder="Email" type="email" autocomplete="email" value="' + esc(su.email || (S.visit && S.visit.email) || "") + '">' +
      '<label class="fl sr-only" for="sAddr">Service Address</label>' + fe("sAddr") + '<input id="sAddr" placeholder="Service address" type="text" autocomplete="street-address" value="' + esc(addr) + '">' +
      '<p class="su-havecode"><button type="button" class="link mw-hover" id="haveCode" aria-expanded="' + hasRef + '"' + (hasRef ? ' hidden' : '') + '>Have a Code?</button></p>' +
      '<div id="refWrap"' + (hasRef ? '' : ' hidden') + '><label class="fl" for="sRef">Referral Code</label><input id="sRef" type="text" autocomplete="off" autocapitalize="characters" placeholder="e.g. SU-HOME-1234" value="' + esc(S.referralCodeIn || su.referralCodeIn || "") + '"><p class="small ref-check" id="refCheck" aria-live="polite"></p></div></div>' +
      extrasRow() +
      cancelPolicyCard(S.tier) +
      '<div class="card"><h3>Membership Agreement and Liability Waiver</h3>' +
      '<div class="legal open-box" tabindex="0" aria-label="Membership Agreement">' + agreementHtml() + '</div><div class="rd-bar" aria-hidden="true"><i></i></div>' +
      '<div class="legal open-box" tabindex="0" aria-label="Liability Waiver" style="margin-top:.7rem">' + WAIVER + '</div><div class="rd-bar" aria-hidden="true"><i></i></div>' +
      renewTerms() + '<label class="checkrow"><input type="checkbox" id="agree"><span>I agree to the Membership Agreement and accept the Liability Waiver.</span></label>' + fe("agree") +
      '<label class="checkrow"><input type="checkbox" id="chargeOk"><span>I agree Smart Upkeep may charge me <strong>' + money(t.today) + '</strong> at the secure payment step, and that my membership <strong>renews automatically</strong> as described above until I cancel.</span></label>' + fe("chargeOk") +
      '<p class="fl">Signature (Signs Both)</p>' + sigBlock("agreeSig") + fe("agreeSig") + '</div>' +
      '<div class="card"><h3>Payment Plan</h3>' + planHtml + '</div>' +
      '<p class="small muted su-paynext">' + I("shield", "xs") + ' Next: Secure Payment</p>' +
      '<button class="btn btn-primary btn-big mw-hover" type="submit">Join ' + P.tiers[S.tier].label + '</button><p class="su-cancel-line small"><a href="#cancel" class="link mw-hover">Cancel Anytime, No Fee</a></p></form>';
  }

  /* Order Form Details Deck 17 (Max 19:33 ICT Oct 15): payment is its own secure step after the form. DEMO ONLY: card fields are disabled,
     never read and nothing is charged. Demo labels hidden for testers (06). */
  /* Order Form Details Deck 05, 10, 12, 14, 15, 16 (Max 19:33 ICT Oct 15): short command errors; 2-year free months shown as dollar value (6 x plan monthly, annual / 12); "Membership Starts At Your First Visit" note; offer terms stay fold-out; no phone example; referral line "+1 Free Month". */
  function payStep() {
    var t = (S.signup && S.signup.totals) || totals();
    return backBtn() + stepRail(4) + '<h1>Secure Payment</h1>' +
      '<div class="card su-sum-top"><h3>' + P.tiers[S.tier].label + ' · ' + esc(t.label) + '</h3>' +
      '<div class="summary-price">' + priceBlock(t.year, t.billKind) + '</div>' +
      '<div class="summary"><div class="su-due"><span>Due At Sign Up</span><span>' + money(t.today) + '</span></div></div></div>' +
      '<form id="payF" class="card paybox" novalidate><h3>' + I("shield", "xs") + ' Card Details</h3>' +
      '<fieldset disabled style="border:0;padding:0;margin:0"><label class="fl">Card Number</label><input type="text" placeholder="•••• •••• •••• ••••" autocomplete="off"><div class="grid2"><div><label class="fl">Expiry</label><input type="text" placeholder="MM / YY" autocomplete="off"></div><div><label class="fl">CVC</label><input type="text" placeholder="•••" autocomplete="off"></div></div></fieldset>' +
      '<button class="btn btn-primary btn-big mw-hover" type="submit" style="margin-top:.8rem">Pay Securely</button><p class="su-cancel-line small"><a href="#cancel" class="link mw-hover">Cancel Anytime, No Fee</a></p></form>';
  }
  function bindPay() {
    var f = document.getElementById("payF"); if (!f) return;
    f.addEventListener("submit", function (e) { e.preventDefault(); /* demo: no card data read or sent */ S.signup = Object.assign({}, S.signup, { paidDemoAt: new Date().toISOString() }); try { window.SUEvents && SUEvents.emit("signup.completed", "site", { member: (S.signup.name || "New member") + " (demo)", payload: { plan: P.tiers[S.tier].label, payment: S.plan, addons: (S.addons || []).length, yardSign: !!S.signup.yardSignOk } }); } catch (x) {} go("confirm"); });
  }
  /* Order Form Details Deck 01, 03, 07 + Max's note on 11 (19:33 ICT Oct 15): no last-extra pop-up; a small "Add Extras" row on the form.
     Shows the add-ons members are likeliest to add first (P.likelyAddons), each with Skip / Add To My Plan. Monthly = annual / 12. */
  var XR = { skipped: [], all: false };
  function extrasRow() {
    var have = (S.addons || []);
    var ids = XR.all ? (P.addons || []).map(function (a) { return a.id; }) : (P.likelyAddons || []);
    var list = ids.map(function (id) { return (P.addons || []).filter(function (a) { return a.id === id; })[0]; }).filter(function (a) { return a && XR.skipped.indexOf(a.id) < 0; });
    return '<div class="card xr"><h3>Add Extras</h3><div class="xr-list">' + (list.length ? list.map(function (a) {
      var on = have.indexOf(a.id) > -1;
      return '<div class="xr-item' + (on ? ' sel' : '') + '">' + I(XT_ICO[a.id] || "wrench", "sm") + '<span class="xr-t"><strong>' + esc(a.label) + '</strong><small>' + addMo(a) + '</small></span>' +
        (on ? '<span class="xr-added">&#10003; Added</span><button type="button" class="link mw-hover" data-xr-remove="' + a.id + '">Remove</button>'
            : '<span class="xr-btns"><button type="button" class="btn btn-outline mw-hover" data-xr-skip="' + a.id + '">Skip</button><button type="button" class="btn btn-primary mw-hover" data-xr-add="' + a.id + '">Add To My Plan</button></span>') + '</div>';
    }).join("") : '<p class="small muted" style="margin:0">No more extras to show.</p>') + '</div>' +
      (XR.all ? '' : '<button type="button" class="link mw-hover" data-xr-all="1">See All Extras</button>') + '</div>';
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
        var html = list.length ? list.map(function (x) { return '<div><span>Add-on: ' + esc(x.label) + '</span><span>' + addMo(x) + '</span></div>'; }).join("") : '<div><span>Add-ons</span><span>None</span></div>';
        if (lm.length) html += lm.map(function (x) { return '<div><span>Last-minute: ' + esc(x.label) + '</span><span>' + money(x.price) + '</span></div>'; }).join("");
        return html;
      })() +
      '<div><span>Due At Sign Up</span><span>' + money(t.today) + '</span></div><div><span>Signed</span><span>Agreement and Waiver</span></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Next</h3><ol class="feat"><li>' + next + '</li><li>We Book Visit One</li></ol></div>' +
      (function () {
        var code = (su.myReferralCode || makeReferralCode(su.name));
        if (!su.myReferralCode) { su.myReferralCode = code; S.signup = su; try { save(); } catch (e) {} }
        var shareText = "Join Smart Upkeep with my code " + code + " — we both get a free month after your first payment clears, added at the end of our terms once completed. " + (location.origin + location.pathname);
        return '<div class="card referral-card" style="margin-top:1rem">' +
          '<h3>Refer a Neighbor</h3>' +
          '<p class="muted">You Both Get a Month Free, Added at the End of Your Term Once You Complete It</p>' +
          '<p class="ref-code" id="myRefCode">' + esc(code) + '</p>' +
          '<div class="btn-row">' +
          '<button type="button" class="btn btn-primary mw-hover" data-copy-ref="1">Copy Code</button>' +
          '<button type="button" class="btn btn-outline mw-hover" data-share-ref="1">Share Invite</button>' +
          '</div>' +
          '<p class="small muted" style="margin:.6rem 0 0" id="refCopyMsg"></p>' +
          '<p class="hide" id="refShareText">' + esc(shareText) + '</p></div>';
      })() +
      myHomeCard(su) + firstVisitCard() +
      '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }
  /* Plans & Pricing Deck note (Oct 14): a picture of the member's house after sign-up. Placeholder drawing for now; real street or satellite photo from the address is a follow-up. */
  function myHomeCard(su) {
    return '<div class="card my-home-card" style="margin-top:1rem"><h3>Your Home</h3>' +
      '<div class="mh-pic" role="img" aria-label="Your home picture (placeholder)"><svg viewBox="0 0 320 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="160" fill="#EEF2E8"/><rect y="118" width="320" height="42" fill="#CFE0BF"/><path d="M0 132h320" stroke="#B8B2A7" stroke-width="10"/><path d="M110 118V74l50-36 50 36v44z" fill="#fff" stroke="#1f1b17" stroke-width="2"/><path d="M100 80l60-46 60 46" fill="none" stroke="#D4A017" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="148" y="90" width="24" height="28" fill="#D4A017"/><rect x="122" y="84" width="18" height="16" fill="#CFE6EE" stroke="#1f1b17"/><rect x="180" y="84" width="18" height="16" fill="#CFE6EE" stroke="#1f1b17"/></svg></div>' +
      '<p style="margin:.6rem 0 0"><strong>' + esc(su.address || "Your Address") + '</strong></p><p class="small muted" style="margin:.2rem 0 0">A photo of your home from street view appears here soon.</p></div>';
  }
  /* Funnel Deck (Oct 14): after sign-up, book the first visit on a calendar right away. Saved on this device until booking goes live. */
  function firstVisitCard() {
    var fv = S.firstVisit || "", min = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    return '<div class="card first-visit" style="margin-top:1rem"><h3>Book Your First Visit</h3>' +
      '<label class="fl" for="fvDate">Pick a Day</label><input id="fvDate" type="date" min="' + min + '" value="' + esc(fv) + '" style="width:100%;min-height:48px;font-size:16px">' +
      '<button class="btn btn-primary btn-big mw-hover" type="button" data-fv="1" style="margin-top:.6rem">' + (fv ? "Change Day" : "Book This Day") + '</button>' +
      '<p class="small muted" id="fvMsg" style="margin:.5rem 0 0">' + (fv ? "Requested: " + esc(fv) + ". We confirm by text." : "We confirm the time by text.") + '</p></div>';
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-fv]"); if (!b) return;
    var d = document.getElementById("fvDate"), m = document.getElementById("fvMsg"); if (!d || !d.value) { if (m) m.textContent = "Pick a day first."; return; }
    S.firstVisit = d.value; save(); if (m) m.textContent = "Requested: " + d.value + ". We confirm by text."; b.textContent = "Change Day";
  });

  /* Add-on event log: placeholder until real analytics. Local only, capped at 500 events. */
  var EVKEY = "smartUpkeep.addonEvents";
  function logAddon(type, ids, ctx) {
    try { if (window.SUEvents && /tap|accepted/.test(type)) SUEvents.emit("addon.clicked", "site", { payload: { action: type, addon: ids, where: ctx } }); } catch (x) {}
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
    app.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { go("q" + b.getAttribute("data-edit")); }); });
    if (/^q\d$/.test(s)) bindQ(Number(s.slice(1)));
    var pc = app.querySelector("[data-plan-chip]"), pl = app.querySelector("#qfPlans");
    if (pc && pl) {
      pc.addEventListener("click", function () { var o = pl.hidden; pl.hidden = !o; pc.setAttribute("aria-expanded", String(o)); });
      app.querySelectorAll("[data-plan-pick]").forEach(function (b) { b.addEventListener("click", function () { S.tier = b.getAttribute("data-plan-pick"); save(); render(); }); });
    }
    document.body.classList.toggle("on-qf", /^q\d$/.test(s) || s === "choice");
    var tb = document.querySelector(".topbar"); if (tb) document.documentElement.style.setProperty("--tb", tb.offsetHeight + "px");
    if (s === "quote" && lastScreen !== "quote") { try { window.SUEvents && SUEvents.emit("quote.generated", "site", { payload: { tier: P.tiers[S.tier].label } }); } catch (x) {} }
    if (s === "quote") revealPrices(); else lastScreen = s;
    if (s === "quote" || s === "alacarte") {
      var seen = []; app.querySelectorAll("[data-addon],[data-lastminute],[data-alacarte]").forEach(function (b) { seen.push(b.getAttribute("data-addon") || b.getAttribute("data-lastminute") || b.getAttribute("data-alacarte")); });
      if (!bind._viewed) bind._viewed = {};
      if (!bind._viewed[s]) { bind._viewed[s] = 1; logAddon("view", seen, s); }
    }
    if (s === "quote" || s === "extras") {
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
    if (s === "photos" || /^q\d$/.test(s)) app.querySelectorAll("[data-photo]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var id = inp.getAttribute("data-photo"); photoMem[id] = photoMem[id] || [];
        Array.prototype.forEach.call(inp.files || [], function (f) { if (/^image\//.test(f.type)) photoMem[id].push(URL.createObjectURL(f)); });
        S.photos[id] = photoMem[id].length; save(); render();
      });
    });
    if (s === "visit") bindVisit();
    if (s === "signup") bindSignup();
    if (s === "pay") bindPay();
    if (s === "confirm") bindReferralShare();
  }
  function act(a) {
    if (a === "back") return back();
    if (a === "home") return go("home");
    if (a === "dismissResume") { S = fresh(); photoMem = {}; save(); render(); return; }
    if (a === "startOver") { S = fresh(); photoMem = {}; save(); return go("q0"); }
    if (a === "resume") { var r = S.resume; return go(r && r !== "home" ? r : "q0"); }
    if (a === "start") { try { window.SUEvents && SUEvents.emit("scan.started", "site", {}); } catch (x) {} }
    if (a === "start") { var sc = app.querySelector("#row-plans .hm-plan.sel"); if (sc && P.tiers[sc.getAttribute("data-tier")]) S.tier = sc.getAttribute("data-tier"); return go("q0"); }
    if (a === "watch") return openVideo(true);
    if (a === "q0") return go("q0");
    if (a === "photos") return go("photos");
    if (a === "visit") return go("visit");
    if (a === "toQuote") return go("quote");
    if (a === "extras") return go("extras");
    if (a === "signup") { if (S.plan !== "biennial") S.plan = "annual"; return go("signup"); }
    if (a === "alacarte") return go("alacarte");
    if (a === "photosDone") { var c = photoCards(); S.photosComplete = c.every(function (x) { return (S.photos[x[0]] || 0) > 0; }); return go("quote"); }
    if (a === "restart") { S = fresh(); S.resume = null; photoMem = {}; save(); render(); window.scrollTo(0, 0); }
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
    /* Pick, Then Next (Info Gather Deck): a tap selects; the Next button advances. */
    function whReady() { var c = S.answers.waterHeaters, t = S.answers.whType; return c !== undefined && c !== "unsure" && t && t !== "unsure"; }
    app.querySelectorAll("[data-single]").forEach(function (b) { b.addEventListener("click", function () { if (app.classList.contains("qf-busy")) return; S.answers[q.id] = b.getAttribute("data-single"); save(); render(); }); });
    app.querySelectorAll("[data-wh]").forEach(function (b) { b.addEventListener("click", function () { if (app.classList.contains("qf-busy")) return; S.answers.whType = b.getAttribute("data-wh"); if (S.answers.waterHeaters === "unsure") delete S.answers.waterHeaters; save(); render(); }); });
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
      else if (!b.name) err = "Enter full name.";
      else if (!/\d{3}.*\d{3}.*\d{4}/.test(b.phone || "")) err = "Enter phone number.";
      else if (!/^\S+@\S+\.\S+$/.test(b.email || "")) err = "Enter email.";
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
      var err = !v.date ? "Pick a preferred date." : !v.windows.length ? "Pick at least one time window." : !v.name ? "Enter your name." : !/\d{3}.*\d{3}.*\d{4}/.test(v.phone) ? "Enter phone number." : !/^\S+@\S+\.\S+$/.test(v.email) ? "Enter email." : "";
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
    /* Sign-Up Form deck 04 (Max 17:10 ICT Oct 17): thin bar shows how far you have read each agreement box */
    app.querySelectorAll(".legal.open-box").forEach(function (b) { var bar = b.nextElementSibling; if (!bar || !bar.classList.contains("rd-bar")) return; var f = bar.firstChild; function up() { var m = b.scrollHeight - b.clientHeight; f.style.width = (m > 0 ? Math.min(100, Math.round(b.scrollTop / m * 100)) : 100) + "%"; } b.addEventListener("scroll", up, { passive: true }); up(); });
    var hc = document.getElementById("haveCode"); if (hc) hc.addEventListener("click", function () { hc.hidden = true; hc.setAttribute("aria-expanded", "true"); var w = document.getElementById("refWrap"); w.hidden = false; document.getElementById("sRef").focus(); });
    /* Sign Up Policies deck 03: check the referral code right away (format only; the real check happens on our side). */
    (function () { var r = document.getElementById("sRef"), o = document.getElementById("refCheck"); if (!r || !o) return; function chk() { var v = r.value.trim().toUpperCase(); if (!v) { o.textContent = ""; r.removeAttribute("aria-invalid"); return; } var ok = /^SU-[A-Z]{1,4}-\d{4}$/.test(v); o.textContent = ok ? "\u2713 Code looks right. +1 free month once your first payment clears." : "Codes look like SU-HOME-1234."; o.className = "small ref-check " + (ok ? "ok" : "bad"); r.setAttribute("aria-invalid", ok ? "false" : "true"); } r.addEventListener("input", chk); chk(); })();
    ["sAddr", "sName", "sPhone", "sEmail", "sRef", "sYardSign"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { keepFields(); save(); }); });
    document.getElementById("suF").addEventListener("submit", function (e) {
      e.preventDefault(); keepFields();
      var s = S.signup, errs = [
        ["sName", !s.name ? "Enter full name." : ""],
        ["sPhone", !/\d{3}.*\d{3}.*\d{4}/.test(s.phone) ? "Enter phone number." : ""],
        ["sEmail", !/^\S+@\S+\.\S+$/.test(s.email) ? "Enter email." : ""],
        ["sAddr", s.address.length < 5 ? "Enter service address." : ""],
        ["agree", !document.getElementById("agree").checked ? "Check the box to agree." : ""],
        ["chargeOk", !document.getElementById("chargeOk").checked ? "Check the box to OK the charge and auto-renewal." : ""],
        ["agreeSig", !sigs.agreeSig.valid() ? "Sign once to sign both." : ""]];
      var first = null;
      errs.forEach(function (x) { var el = document.getElementById("e-" + x[0]); if (el) el.textContent = x[1]; var f = document.getElementById(x[0]); if (f && f.setAttribute) f.setAttribute("aria-invalid", x[1] ? "true" : "false"); if (x[1] && !first) first = el; });
      if (first) { first.scrollIntoView({ block: "center" }); return; }
      var form = this;
      s.agreementSignature = sigs.agreeSig.value(); s.waiverSignature = s.agreementSignature; s.signedAt = new Date().toISOString(); s.tier = S.tier; s.totals = totals(); s.referralCodeIn = S.referralCodeIn || s.referralCodeIn || ""; logAddon("purchase", (S.addons || []).concat(S.lastMinute || []), "signup:" + S.tier);
      if (!s.myReferralCode) s.myReferralCode = makeReferralCode(s.name);
      go("pay");
    });
    app.querySelectorAll("[data-xr-add],[data-xr-skip],[data-xr-remove],[data-xr-all]").forEach(function (b) { b.addEventListener("click", function () {
      keepFields(); save();
      var add = b.getAttribute("data-xr-add"), skip = b.getAttribute("data-xr-skip"), rm = b.getAttribute("data-xr-remove");
      S.addons = Array.isArray(S.addons) ? S.addons.slice() : [];
      if (add) { if (S.addons.indexOf(add) < 0) S.addons.push(add); logAddon("offer_accepted", add, "extras-row"); }
      else if (skip) { XR.skipped.push(skip); logAddon("offer_declined", skip, "extras-row"); }
      else if (rm) S.addons = S.addons.filter(function (x) { return x !== rm; });
      else XR.all = true;
      save(); var y = window.scrollY; render(); window.scrollTo(0, y);
    }); });
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
      rows += '<li class="sub"><span>' + esc(bd.offerLine.label) + '</span><span>No Charge</span></li>';
      rows += '<li class="sub"><span>Prepaid for 24 months at listed price (floor honored)</span><span>' + money(bd.membership) + '</span></li>';
    }
    rows += '<li class="total"><span>' + (bd.termMonths === 30 ? "Prepaid total (30-month term)" : "Annual membership total") + '</span><span>' + money(bd.year) + '</span></li>';
    rows += '<li class="total"><span>' + "Monthly price" + '</span><span>' + money(bd.monthly) + '/Month</span></li>';
    if (bd.termMonths === 30) {
      rows += '<li class="sub"><span>Referral free months (if any)</span><span>Credited after neighbor\'s first payment clears · added at the end of your term, once you complete it · $0 refund value</span></li>';
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
  /* V7 official (= V6.2, Max 10:49 ICT Oct 16, 50.5s). Rollback to V6: v7 -> v6 (and ?v=v7a -> ?v=v6a) here and in the poster line below (V6 and V5 files kept). */
  function vSrc() { return suPortrait() ? "video/explainer-v7-9x16.mp4?v=v7a" : "video/explainer-v7-16x9.mp4?v=v7a"; } /* Max Oct 15 19:03: 9:16 on phones/narrow/portrait, 16:9 on big screens; player shaped by .portrait */ /* V5 official (Max OK Oct 15). Rollback to V4: video/explainer-v4-9x16.mp4 / explainer-v4-16x9.mp4 */
  /* Browsers block unmuted autoplay, so the video starts muted (speaker button + Sound arrow in video-pause.js). */
  function syncTfs() {} /* Max Oct 15 19:04: big Tap for Sound removed; speaker button + saffron arrow live in video-pause.js */
  vid.addEventListener("volumechange", function () { syncTfs(); unmute.textContent = vid.muted ? "Unmute" : "Mute"; });
  function openVideo(userAsked) {
    var src = vSrc();
    if (vid.getAttribute("src") !== src) { vid.setAttribute("src", src); vid.setAttribute("poster", src.indexOf("9x16") > -1 ? "assets/poster-v7-9x16.jpg?v=v7a" : "assets/poster-v7-16x9.jpg?v=v7a"); }
    vid.muted = !userAsked; unmute.textContent = vid.muted ? "Unmute" : "Mute"; syncTfs();
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
    var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { vid.muted = true; unmute.textContent = "Unmute"; syncTfs(); vid.play().catch(function () {}); });
    document.getElementById("skipBtn").focus({ preventScroll: true });
  }
  function closeVideo() { vid.pause(); modal.hidden = true; document.body.style.overflow = ""; try { sessionStorage.setItem(VKEY, "1"); } catch (e) {} }
  document.getElementById("videoClose").addEventListener("click", closeVideo);
  document.getElementById("skipBtn").addEventListener("click", closeVideo);
  unmute.addEventListener("click", function () { vid.muted = !vid.muted; unmute.textContent = vid.muted ? "Unmute" : "Mute"; syncTfs(); if (vid.paused) vid.play().catch(function () {}); });
  vid.addEventListener("ended", function () { closeVideo(); var pl = document.getElementById("row-plans"); if (pl) setTimeout(function () { pl.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150); }); /* Funnel Deck: after the video, back to the home page plans */
  modal.addEventListener("click", function (e) { if (e.target === modal) closeVideo(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeVideo(); });

  /* ---------- Share ---------- */
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-share]"); if (b) doShare(b.parentNode.querySelector(".hm-share-msg")); });
  document.getElementById("shareBtn").addEventListener("click", function () { doShare(); });
  function doShare(mEl) {
    var url = location.origin + location.pathname, p = price(), msg = mEl || document.getElementById("shareMsg");
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
  }
  if (location.hash === "#home") { history.replaceState(null, "", location.pathname); S.screen = "home"; save(); }
  if (location.hash === "#cancel") { history.replaceState(null, "", location.pathname); go("cancel"); }
  window.addEventListener("hashchange", function () { if (location.hash === "#cancel") { history.replaceState(null, "", location.pathname); go("cancel"); } });
  if (location.hash === "#start") { history.replaceState(null, "", location.pathname); if (S.screen !== "q0") go("q0"); }
  document.getElementById("logoHome").addEventListener("click", function (e) { e.preventDefault(); if (S.screen !== "home") go("home"); else window.scrollTo({ top: 0, behavior: (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth" }); });

  function bootApp() {
    render();
    var dismissed = false; try { dismissed = sessionStorage.getItem(VKEY) === "1"; } catch (e) {}
    if (!dismissed && S.screen === "home") openVideo(false);
  }
  if (typeof window.SmartUpkeepAwaitGate === "function") window.SmartUpkeepAwaitGate(bootApp);
  else bootApp();
})();

/* Oct 17 2026: header van. First scroll >80px: speeds in from the right (~700ms) and parks in the larger free gap
   beside the centered logo (never over logo/Share). Stays parked until the visitor scrolls back to the top after 300px+,
   then the tech waves and it drives off left (~1.2s). Once per page load; reduced motion skips. */
(function () {
  var bar0 = document.querySelector(".topbar"); if (bar0 && window.SUVan) window.SUVan.mount(bar0, "");
  var v = document.querySelector(".hdr-van"), rd = document.querySelector(".hdr-road"); if (!v) return;
  var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var done = false;
  var state = "out", maxY = 0;
  function place() {
    var bar = document.querySelector(".topbar"), b = bar && bar.querySelector(".brand"), sh = bar && bar.querySelector(".top-share");
    if (!b || !sh) return false;
    var r = bar.getBoundingClientRect(), br = b.getBoundingClientRect(), sr = sh.getBoundingClientRect(), sL = (sh.offsetParent && sr.width) ? sr.left - r.left - 10 : r.width - 12;
    var gaps = [[12, br.left - r.left - 10], [br.right - r.left + 10, sL]];
    var g = gaps[0] /* left of the logo: pull-up spot */, room = g[1] - g[0]; if (room < 44) return false;
    var svg = v.querySelector("svg"), w = Math.min(84, room);
    svg.setAttribute("width", Math.round(w)); svg.setAttribute("height", Math.round(w * 36 / 64));
    v.style.setProperty("--park", Math.round(g[0] + (room - w) / 2) + "px");
    return true;
  }
  function check() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var bd = document.body; /* logo size: hysteresis (shrink past 24px, grow back under 4px) so it never flickers near the threshold */
    if (y > 24 && !bd.classList.contains("scrolled")) bd.classList.add("scrolled");
    else if (y < 4 && bd.classList.contains("scrolled")) bd.classList.remove("scrolled");
    if (done || rm || !document.body.classList.contains("on-home")) return;
    if (y > maxY) maxY = y;
    if (state === "out" && ready) { /* Oct 17 12:23: one smooth cross R->L, brief pull-up + wave near left, then off. No parking. */
      var bar = document.querySelector(".topbar");
      if (!(window.SUVan ? window.SUVan.play(bar, bar.querySelector(".brand"), bar.querySelector(".top-share")) : place())) return;
      state = "gone"; done = true;
    }
  }
  var rafQ = false; window.addEventListener("scroll", function () { if (rafQ) return; rafQ = true; requestAnimationFrame(function () { rafQ = false; check(); }); }, { passive: true });
  /* Oct 17 01:13: start ~0.3s after the page is visible and the gate is passed, even with the video pop-up open (header sits above its backdrop) */
  var ready = false;
  (function waitReady() {
    if (done || rm) return;
    if (document.hidden || document.body.classList.contains("gate-locked") || !document.body.classList.contains("on-home")) { setTimeout(waitReady, 200); return; }
    setTimeout(function () { ready = true; check(); }, 300);
  })();
  window.addEventListener("resize", function () { if (state === "park") place(); });
})();
