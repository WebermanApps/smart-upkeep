/* Smart Upkeep sign-up funnel. Static site, no backend yet.
   Progress lives in localStorage. Card fields are disabled and never read until a payment processor is connected. */
(function () {
  "use strict";
  var P = window.SMART_UPKEEP_PRICING;
  var KEY = "smartUpkeep.v1", VKEY = "smartUpkeep.videoDismissed";
  var app = document.getElementById("app");
  function I(n, c) { return window.SUIcon ? window.SUIcon(n, c) : ""; }

  var S = load();
  function fresh() { return { screen: "home", answers: {}, tier: "gold", plan: "founding", addons: [], lastMinute: [], alacarte: [], alacarteBooking: null, signup: null, referralCodeIn: "", access: null, firstVisit: "", path: [] }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.screen) { var o = Object.assign(fresh(), s); if (!Array.isArray(o.addons)) o.addons = []; if (!Array.isArray(o.lastMinute)) o.lastMinute = []; if (!Array.isArray(o.alacarte)) o.alacarte = []; return o; } } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function round(n) { return Math.round(n / P.roundTo) * P.roundTo; }
  function monthlyOf(annual) { return Math.round(Number(annual) / 12); }
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
    /* Nov 12 (B1): only priced monthly add-ons count here. One-time rows (Radon Test, Extra Gutter Cleaning, the fixed-price one-time jobs) and Quote rows never enter membership totals.
       Shared extras and Gutter Cleaning (Essentials) are priced into the plan in planAmtFromBase. */
    return selectedFunnelAddons().reduce(function (sum, a) { return sum + ((a.once || a.fromExtras || a.gutter || a.quoteRequired) ? 0 : (+a.annual || 0)); }, 0);
  }
  /* System extras that also appear as monthly add-ons (Irrigation, Sump Pump, Humidifier).
     One shared selection, priced once in buildLines() via S.answers.extras. */
  function sharedExtraMap() {
    var map = {};
    monthlyAddonCatalog().forEach(function (a) {
      if (a && a.fromExtras && a.id && a.id.indexOf("x_") === 0) map[a.id.slice(2)] = a.id;
    });
    return map;
  }
  function extrasAnnual() {
    var ex = Array.isArray((S.answers || {}).extras) ? S.answers.extras : [];
    return ex.reduce(function (sum, k) {
      var e = P.extras && P.extras[k];
      return sum + (e && e.all > 0 ? e.all : 0);
    }, 0);
  }
  function addonsNoteMonthly() {
    var n = 0;
    var ex = Array.isArray((S.answers || {}).extras) ? S.answers.extras : [];
    ex.forEach(function (k) {
      var e = P.extras && P.extras[k];
      if (e && e.all > 0) n += monthlyOf(e.all);
    });
    selectedFunnelAddons().forEach(function (a) {
      if (!a || a.once || a.fromExtras || a.quoteRequired || !(a.annual > 0)) return;
      n += monthlyOf(a.annual);
    });
    return n;
  }
  function selectedFunnelAddons() {
    var ids = Array.isArray(S.addons) ? S.addons : [];
    var seen = {}, out = [];
    monthlyAddonCatalog().concat(onceAddonCatalog()).forEach(function (a) {
      if (a && ids.indexOf(a.id) > -1 && !seen[a.id] && !(a.gutter && gutterIncluded())) { seen[a.id] = 1; out.push(a); }
    });
    return out;
  }
  function syncSharedExtras(from) {
    if (!S.answers) S.answers = {};
    var extras = Array.isArray(S.answers.extras) ? S.answers.extras.slice() : [];
    var addons = Array.isArray(S.addons) ? S.addons.slice() : [];
    var map = sharedExtraMap();
    Object.keys(map).forEach(function (k) {
      var id = map[k], on = (from === "extras") ? extras.indexOf(k) > -1 : addons.indexOf(id) > -1;
      var ixE = extras.indexOf(k), ixA = addons.indexOf(id);
      if (on) { if (ixE < 0) extras.push(k); if (ixA < 0) addons.push(id); }
      else { if (ixE > -1) extras.splice(ixE, 1); if (ixA > -1) addons.splice(ixA, 1); }
    });
    S.answers.extras = extras;
    S.addons = addons;
  }
  function healSharedExtras() {
    if (!S.answers) S.answers = {};
    var extras = Array.isArray(S.answers.extras) ? S.answers.extras.slice() : [];
    var addons = Array.isArray(S.addons) ? S.addons.slice() : [];
    var map = sharedExtraMap();
    Object.keys(map).forEach(function (k) {
      var id = map[k], on = extras.indexOf(k) > -1 || addons.indexOf(id) > -1;
      var ixE = extras.indexOf(k), ixA = addons.indexOf(id);
      if (on) { if (ixE < 0) extras.push(k); if (ixA < 0) addons.push(id); }
      else { if (ixE > -1) extras.splice(ixE, 1); if (ixA > -1) addons.splice(ixA, 1); }
    });
    S.answers.extras = extras;
    S.addons = addons;
  }
  function selectedLastMinute() {
    var ids = Array.isArray(S.lastMinute) ? S.lastMinute : [];
    return (P.lastMinute || []).filter(function (a) { return ids.indexOf(a.id) > -1; });
  }
  function lastMinuteTotal() {
    return selectedLastMinute().reduce(function (sum, a) { return sum + (a.quoteRequired ? 0 : (a.price || 0)); }, 0);
  }

  var SU_MONTHLY_ADDONS = ["Flat Roof Inspection And Clean","Irrigation System","Gutter Cleaning","Sump Pump","Chimney Sweep","Generator Annual Service","Whole-House Humidifier"];
  var SU_ONCE_ADDONS = ["Furnace Tune-Up","AC Tune-Up","Exterior Window Washing","Christmas Lights Up And Down","Extra Gutter Cleaning","Extra Flat Roof Cleaning","Irrigation System Startup Or Shutdown","Chimney Sweep","Radon Test","Water Leak Sensor Setup","Sump Pump Battery Backup","Bath Fan Clean And Check","Smart Thermostat Install","Lawn Mower Winterizing","Snowblower Tune-Up","Hose Bib Freeze Covers","Video Doorbell Install","Appliance Deep Clean","Lead And Water Test"];
  function suNorm(s){return String(s||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
  function suTitle(s){
    s=String(s||"").replace(/\s+/g," ").trim();
    var keep={AC:1,CO:1,ID:1};
    return s.split(" ").map(function(w){
      if(!w) return w;
      return w.split("-").map(function(p){
        var bare=p.replace(/[^A-Za-z]/g,"");
        if(keep[bare.toUpperCase()]) return p.replace(bare,bare.toUpperCase());
        if(!p) return p;
        return p.charAt(0).toUpperCase()+p.slice(1).toLowerCase();
      }).join("-");
    }).join(" ");
  }
  function suClose(a,b){
    a=suNorm(a); b=suNorm(b);
    if(!a||!b) return false;
    return a===b;
  }
  function suCatalogByLabels(labels, pool, once){
    return labels.map(function(label, i){
      var found=null;
      (pool||[]).forEach(function(a){
        if(!suClose(label, a.label)) return;
        if(once && a.price==null && a.quoteRequired==null && found) return;
        found=a;
      });
      if(found){
        var out={}; for(var k in found) out[k]=found[k];
        out.label=suTitle(label);
        if(once && (out.price==null || out.quoteRequired) && out.quoteRequired!==false && out.price==null) out.quoteRequired=true;
        if(once && out.price==null) out.quoteRequired=true;
        return out;
      }
      return {id:(once?"q_o_":"q_m_")+suNorm(label).replace(/ /g,"_"), label:suTitle(label), quoteRequired:true, desc:""};
    });
  }
  function monthlyAddonCatalog(){
    var pool=[];
    Object.keys((P&&P.extras)||{}).forEach(function(k){
      var e=P.extras[k]; if(!e) return;
      pool.push({id:"x_"+k, label:e.label, annual:e.all, all:e.all, quoteRequired:!e.all, fromExtras:true});
    });
    pool=pool.concat(P.addons||[]);
    return suCatalogByLabels(SU_MONTHLY_ADDONS, pool, false).map(function(a){
      /* Swatch D2 (Nov 12): Gutter Cleaning uses gutters2Cleanings by stories (Essentials only; Plus and up include it). */
      if(a && a.id===GUTTER_ID){ var g=gutterAnnual(); a.gutter=true; a.annual=g||null; a.quoteRequired=!g; }
      return a;
    });
  }
  var GUTTER_ID="q_m_gutter_cleaning";
  function gutterAnnual(){
    var an=S.answers||{}, st=Number(an.stories), sq=an.sqft;
    if(!(st>=1) || sq==null || sq==="" || sq==="unsure") return 0;
    return (P.gutters2Cleanings||{})[Math.min(3,st)]||0;
  }
  function gutterIncluded(tier){ return (tier||S.tier)!=="silver"; }
  function gutterAddonMonthly(tier){ return (tier==="silver" && (S.addons||[]).indexOf(GUTTER_ID)>-1 && gutterAnnual()>0) ? monthlyOf(gutterAnnual()) : 0; }
  function onceAddonCatalog(){
    var lm=(P.lastMinute||[]).map(function(a){ var o={}; for(var k in a) o[k]=a[k]; o.fromLastMinute=true; return o; });
    var pool=lm.concat(P.addons||[]);
    var rows=suCatalogByLabels(SU_ONCE_ADDONS, pool, true);
    var monthlyIds={};
    monthlyAddonCatalog().forEach(function(a){ if(a&&a.id) monthlyIds[a.id]=1; });
    rows.forEach(function(a,i){ if(!a.id) a.id="o_cur_"+i; a.once=true; if(monthlyIds[a.id]) a.id=a.id+"_once"; if(a.draft||a.quoteRequired||!(+a.price>0)){ a.quoteRequired=true; a.price=null; } }); /* B1: fixed, non-draft pricing-config prices show; everything else stays Quote */
    return rows;
  }

  healSharedExtras();

    function findService(id) {
    var a = (P.addons || []).find(function (x) { return x.id === id; });
    if (a) return a;
    a = (P.lastMinute || []).find(function (x) { return x.id === id; });
    if (a) return a;
    var all = monthlyAddonCatalog().concat(onceAddonCatalog());
    return all.find(function (x) { return x.id === id; }) || null;
  }
  function serviceOncePrice(a) { return (hasRealOncePrice(a) && !needsSiteVisit(a.label)) ? +a.price : 0; } /* B1: Quote rows (incl. Radon's annual figure) never count in totals */
  /* Oct 15 (Max 19:11-19:19 ICT): add-ons show ONLY the added monthly price. No add-on has its own monthly figure in pricing-config.js, so monthly = annual / 12, rounded (monthlyOf). */
  /* TODO(quoteRequired): ping-to-CC for quote requests is NOT built yet. Quote items stay in S.addons / S.lastMinute and ride the normal request/submit flow at $0; ops must follow up manually until a CC notification is wired. */
  var QUOTE_LABEL = "Quote";
  /* Close buttons: a 2px stroke icon instead of the Arial times glyph (Nov 12 funnel polish). */
  var X_SVG = '<svg class="x-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function hasRealMonthly(a){
    return !!(a && (a.fromExtras || a.gutter) && a.annual!=null && a.annual!=="" && !a.quoteRequired && isFinite(+a.annual) && +a.annual>0 && !a.draft);
  }
  function hasRealOncePrice(a){
    return !!(a && a.price!=null && a.price!=="" && !a.quoteRequired && !a.draft && isFinite(+a.price) && +a.price>0);
  }
  function needsSiteVisit(label){
    var n=String(label||"").toLowerCase();
    return /window/.test(n)&&/wash/.test(n);
  }
  function addMo(a) {
    if (needsSiteVisit(a && a.label)) return "Needs A Site Visit";
    if (hasRealMonthly(a)) return "+" + money(monthlyOf(a.annual)) + "/mo";
    return QUOTE_LABEL;
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
  function tierMin(tier) { return (P.tierMinAnnual && P.tierMinAnnual[tier]) || P.minAnnual || 1668; }
  function applyFloor(raw, tier) {
    var minA = tierMin(tier);
    var r = round(raw);
    return { raw: r, amt: Math.max(r, minA), floored: r < minA };
  }
  function tierFloorMonthly(tier) {
    var t = P.tiers && P.tiers[tier];
    if (t && t.fromMonthly != null && isFinite(+t.fromMonthly)) return +t.fromMonthly;
    return monthlyOf(tierMin(tier));
  }
  function extrasMonthlySum() {
    var n = 0;
    var ex = Array.isArray((S.answers || {}).extras) ? S.answers.extras : [];
    ex.forEach(function (k) {
      var e = P.extras && P.extras[k];
      if (e && e.all > 0) n += monthlyOf(e.all);
    });
    return n;
  }
  function linesBaseRaw(lines) {
    return lines.reduce(function (s, L) { return s + (L.kind === "system" ? 0 : (L.amt || 0)); }, 0);
  }
  /* Machan Nov 12 11:21 ICT: clamp the base plan to its monthly floor first, then add add-on monthlies.
     monthly = max(floor, rounded base monthly) + sum(add-on monthly). Annual is monthly * 12 so recap and Due Today match. */
  function planAmtFromBase(baseRaw, tier) {
    var fl = applyFloor(baseRaw, tier);
    var mo = Math.max(tierFloorMonthly(tier), monthlyOf(fl.amt)) + extrasMonthlySum() + gutterAddonMonthly(tier);
    return { raw: fl.raw, amt: mo * 12, floored: fl.floored, monthly: mo };
  }
  function buildLines() {
    var a = S.answers, d = P.unsureDefaults;
    var sqft = num("sqft", d.sqft), f = num("furnaces", d.furnaces), ac = num("acs", d.acs), wh = num("waterHeaters", d.waterHeaters);
    var whType = (a.whType && a.whType !== "unsure") ? a.whType : d.whType;
    var stories = num("stories", d.stories), extras = Array.isArray(a.extras) ? a.extras : [];
    var tankless = Array.isArray(a.whTypes) ? a.whTypes.slice(0, wh).filter(function (t) { return t === "tankless"; }).length : whType === "tankless" ? wh : whType === "both" ? Math.max(1, Math.floor(wh / 2)) : 0; /* Nov 11: tank or tankless is set per unit */
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
      if (ac > 0) L.push({ label: ac + " AC" + " × " + money(P.perUnit.ac), amt: ac * P.perUnit.ac, est: uAc });
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
    linesSilver.push({ label: "Roof drone inspection with drone gutter check and roof photos (once a year)", amt: 0, est: false, note: "Included" });
    extras.forEach(function (k) {
      var e = P.extras[k]; if (!e || !(e.all > 0)) return;
      linesSilver.push({ label: e.label + " service (you have one)", amt: e.all, est: uEx, kind: "system", sys: k });
    });
    var silverRaw = linesSilver.reduce(function (s, L) { return s + L.amt; }, 0);
    var linesGold = [];
    linesGold.push({ label: "4 seasonal visits × " + money(seasonal) + " each", amt: 4 * seasonal, est: uSqft });
    linesGold = linesGold.concat(hvacLines());
    linesGold.push({ label: "Gutter cleaning, spring and fall (" + stories + "-story home)", amt: gutters, est: uSt });
    extras.forEach(function (k) {
      var e = P.extras[k]; if (!e || !(e.all > 0)) return;
      linesGold.push({ label: e.label + " service (you have one)", amt: e.all, est: uEx, kind: "system", sys: k });
    });
    linesGold.push({ label: "Roof drone inspection with drone gutter check and roof photos (twice a year)", amt: 0, est: false, note: "Included" });
    if (a.softener === "yes" || extras.indexOf("softener") > -1) linesGold.push({ label: "Water softener salt top-off and service check", amt: 0, est: false, note: "Included" });
    linesGold.push({ label: "Whole-Home Mold and Moisture Scan (moisture meter and thermal camera, saved to your Home Record)", amt: 0, est: false, note: "Included" });
    var goldRaw = linesGold.reduce(function (s, L) { return s + L.amt; }, 0);
    var linesPlat = linesGold.slice();
    linesPlat.push({ label: "8 monthly check-ins × " + money(checkIn) + " each", amt: 8 * checkIn, est: uSqft });
    linesPlat.push({ label: "Roof drone inspections after major storms, with vent and ice dam clearing", amt: P.platinumRoofInspection, est: false });
    var platRaw = linesPlat.reduce(function (s, L) { return s + L.amt; }, 0);
    var sF = planAmtFromBase(linesBaseRaw(linesSilver), "silver"), gF = planAmtFromBase(linesBaseRaw(linesGold), "gold"), pF = planAmtFromBase(linesBaseRaw(linesPlat), "platinum");
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
  window.SmartUpkeepPrice = price; // exposed for testing

  /* ---------- Navigation ---------- */
  function go(screen) { if (screen !== "home" && screen !== "confirm") S.resume = screen; else if (screen === "confirm") S.resume = null; if (S.screen !== screen) { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); } S.screen = screen; save(); render(); try { window.suTrackScreen && suTrackScreen(screen); } catch (x) {} window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function back() { var p = S.path.pop(); S.screen = p || "home"; if (S.screen !== "home") S.resume = S.screen; save(); render(); window.scrollTo(0, 0); }
  /* B7: after You're In there is no Back into Accept; only the Home pill. */
  function homePill() { return '<span class="nav-pills">' + backBtn().replace(/^<span class="nav-pills">/, "").replace(/<button class="back back-pill[\s\S]*?<\/button>/, ""); }
  function backBtn() { return '<span class="nav-pills"><button class="back back-pill mw-hover" data-act="back" type="button"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#C1502E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button><button class="home-pill mw-hover" data-act="home" type="button" aria-label="Home"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.6V20h12V9.6" fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5.2h4V20" fill="none" stroke="#C1502E" stroke-width="2" stroke-linejoin="round"/></svg></button></span>'; }

  function render() {
    /* Nov 11 2026 onboarding redo: the old question screens, photos, free tech visit, compare, sign-up and pay screens are retired. Saved state on any of them lands on step 1. */
    if (/^(overview|q\d|choice|photos|visit|quote|extras|signup|pay)$/.test(S.screen)) S.screen = OB[0];
    if (S.screen === "basics") S.screen = "address"; if (S.resume === "basics") S.resume = "address"; /* Home Basics merged into step 1 (Nov 12) */
    S.path = S.path.filter(function (x) { return x === "home" || isOb(x) || /^(alacarte|alacarteConfirm|confirm|cancel)$/.test(x); });
    var s = S.screen, html;
    app.classList.remove("wide");
    if (s === "home") html = home();
    else if (isOb(s)) html = obRender(s);
    else if (s === "alacarte") html = alacarte();
    else if (s === "alacarteConfirm") html = alacarteConfirm();
    else if (s === "confirm") html = confirm();
    else if (s === "cancel") html = cancelPage();
    else { S.screen = "home"; html = home(); }
    app.innerHTML = html;
    app.setAttribute("data-screen", s);
    bind();
    document.body.classList.toggle("on-home", s === "home");
    document.body.classList.toggle("on-accept", s === "accept");
    if (s === "home") bindHome();
    if (s === "cancel") bindCancel();
    var wf = app.querySelector("[data-wait]"); if (wf) wf.addEventListener("submit", function (e) { e.preventDefault(); var z = wf.querySelector("input").value.trim(), em = wf.querySelector("input[type=email]").value.trim(), m = app.querySelector(".hm-wait-msg"); if (!/^\d{5}$/.test(z) || !/.+@.+\..+/.test(em)) { m.textContent = "Enter a 5-digit ZIP and your email."; return; } try { localStorage.setItem("smartUpkeep.waitlist", JSON.stringify({ zip: z, email: em, at: new Date().toISOString() })); } catch (x) {} try { window.SUEvents && SUEvents.emit("waitlist.joined", "site", { payload: { zip: z, from: S.screen } }); } catch (x) {} m.textContent = "You're on the list. We'll email you when Smart Upkeep is coming to your area."; wf.reset(); });
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
  function cancelPage() {
    return backBtn() + '<div class="card"><h1>Cancel Membership</h1><p>No phone call needed. Cancel anytime, no fee. Before your first visit, you get a full refund. After visits begin, prepaid members get back what they paid for services not yet done, within 14 days. Founding members are refunded at the 2-for-1 price they paid, and annual members at the 10%-off price they paid. Monthly members simply stop being charged and keep service through the day before their next charge date.</p>' +
      '<a class="btn btn-primary btn-big mw-hover" href="/login/?next=/member/cancel/">Sign In To Cancel</a>' +
      '</div>';
  }
  function bindCancel() { /* Email form removed (Legal Nov 12): cancel completes in the member app after sign-in. */ }

  /* ---------- Home: phone-first shopping-app layout ---------- */
  var ADDON_ICO = { windows: "window", carpet: "brush", pressure: "spray", deck: "brush", chimney: "chimney", ducts: "duct", lights: "lights", radon: "radon", guttersExtra: "gutter", lmLeakSensors: "bell", lmSumpBackup: "meter", lmHoodFilter: "spray", lmBathFan: "duct", lmThermostat: "furnace" };
  /* Limits per a-la-carte item: only what pricing-config.js desc/unit already says. Missing = not in repo (reported as a gap). */
  var AC_LIMITS = { windows: "Outside glass only.", carpet: "One whole-home clean a year.", chimney: "Wood-burning chimneys.", lights: "One fall install and one take-down after the holidays.", radon: "One test for your home.", guttersExtra: "One extra cleaning.", lmLeakSensors: "Up to 3 sensors set up. Sensors included.", lmSumpBackup: "Homes with an existing sump pit.", lmHoodFilter: "One range hood.", lmBathFan: "Up to 3 bathroom fans.", lmThermostat: "One thermostat." };
  function priceRange(a) { if (needsSiteVisit(a && a.label)) return "Needs A Site Visit"; if (a.quoteRequired || a.low==null || a.high==null || a.low !== a.high) return QUOTE_LABEL; return money(a.low); }
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
      '<div class="pc-price"><span class="pc-from">From</span><span class="pc-big">' + money(t.fromMonthly || P.minMonthly || 139) + '</span><span class="pc-per">/mo</span></div>' +
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
  /* Compact Polish picks (Max 21:32 ICT Oct 17): Water first, short name 'Moisture Scan', plain list (no tap, Max 22:09), rows tighter, two icons, 52px icon box, See All under the cards. */
  /* Fresh Look picks (Max 21:58 ICT Oct 17; 02-05 dropped, no click for more info per Max 22:09): 06 card face held (unchanged); 07 plan chips = lowest plan that covers the item, from pricing-config.js tier features; 08 fade-up + See All arrow nudge (off with reduced motion). */
  var WW_CATS = [
    ["Water", ["waterheater", "meter"], [[2, "Water Heater", "Essentials"], [5, "Moisture Scan", "Essentials"], [6, "Gutters", "Plus"]], "l"],
    ["Heating & Cooling", ["furnace", "ac"], [[0, "Furnace", "Essentials"], [1, "AC", "Essentials"], [0, "Furnace Filters", "Essentials"]], "t"],
    ["Air & Safety", ["detector", "dryer"], [[4, "Smoke/CO", "Essentials"], [3, "Dryer Vent", "Essentials"], [5, "Moisture Readings", "Essentials"]], "s"],
    ["Outside", ["gutter", "chimney"], [[6, "Gutters", "Plus"], [7, "Roof Drone Inspection", "Essentials"], [6, "Drone Gutter Check", "Essentials"]], "j"]];
  /* Card Colours And Finish picks (Max, Oct 18): 01B every card its own colour (Water lagoon, Heating terracotta, Air mustard, Outside jungle), 02A flat white face, 03B thin colour band on top, 04B fine line icons in the card colour, 05B deeper lifted shadow, 06A See All link kept, 07 header unchanged (skipped), 08A soft filled chips kept, 09B warm cream band behind the cards, 10B active dot in the colour of the card in view. */
  var WW_WI = [
    ["clock", "Visits", "Seasonal visits on a set schedule", [["2 Seasonal Visits a Year", "Essentials"], ["4 Visits a Year, One Per Quarter", "Plus"], ["12 Visits a Year, Monthly Check-Ins", "Complete"]]],
    ["furnace", "Heating & Cooling", "Tune-ups before every season", [["Fall Furnace Tune-Up", "Essentials"], ["Spring AC Tune-Up", "Essentials"], ["Furnace Filters Changed During Visits", "Essentials"], ["Thermostat Battery and Settings Check", "Essentials"]]],
    ["waterheater", "Water", "Less sediment, longer life", [["Water Heater Flush or Tankless Descale", "Essentials"], ["Water Softener Salt Top-Off", "Plus"], ["Fridge Water Filter Changes", "Plus"]]],
    ["detector", "Air & Safety", "Alarms that work when it counts", [["Dryer Vent Cleaning", "Essentials"], ["Smoke and CO Checks and Battery Swap", "Essentials"], ["Main Water Shut-Off Tag", "Essentials"]]],
    ["meter", "Mold and Moisture Scan", "Every visit, whole home", [["Moisture Meter and Thermal Camera Check", "Essentials"], ["Damp Spots Flagged With Photos", "Essentials"], ["Readings Saved to Your Home Record", "Essentials"]]],
    ["gutter", "Outside", "Gutters, roof and winter prep", [["Roof Drone Inspection", "Essentials"], ["Drone Gutter Check", "Essentials"], ["Gutter and Downspout Cleaning", "Plus"], ["Garage Door Tune-Up", "Plus"], ["Storm Checks After Major Storms", "Complete"], ["Vent and Ice Dam Clearing After Storms", "Complete"]]],
    ["clipboard", "Records", "Records for warranties and resale", [["Written Report After Every Visit", "Essentials"], ["Downloadable Visit Record", "Essentials"], ["Recall Monitoring", "Essentials"], ["Warranties Checked Badge", "Essentials"], ["Home Record Transfers When You Sell", "Essentials"]]]];
  function fsBg(c, fill, inner) { return '<svg class="' + c + '" viewBox="0 0 120 80" fill="none" stroke="#1f1b17" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="116" height="76" rx="8" fill="' + fill + '" stroke="none"/>' + inner + '</svg>'; }
  var FS_ART = {
    warranty: function (c) { return fsBg(c, "#FAF3EB", '<rect x="18" y="14" width="40" height="52" rx="4" fill="#fff"/><path d="M26 26h24M26 34h24M26 42h16"/><path d="M38 52l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/><rect x="70" y="30" width="30" height="34" rx="3" fill="#fff"/><path d="M70 38h30" stroke="#C1502E"/><path d="M78 26v8M92 26v8"/><circle cx="85" cy="51" r="6" stroke="#05668D"/><path d="M85 48v3l2 2" stroke="#05668D"/>'); },
    mold: function (c) { return fsBg(c, "#EEF5F8", '<path d="M20 64V30l26-16 26 16v34z" fill="#fff"/><path d="M34 64V46h14v18"/><path d="M60 40c-3 5-3 8 0 9s3-4 0-9z" fill="#05668D" stroke="#05668D"/><rect x="74" y="28" width="22" height="34" rx="4" fill="#fff"/><rect x="78" y="32" width="14" height="10" rx="1.5" fill="#A8431F"/><path d="M80 50h10M80 55h6"/><path d="M85 28v-8" stroke="#C1502E"/>'); },
    wh: function (c) { return fsBg(c, "#FAF3EB", '<rect x="40" y="12" width="32" height="54" rx="12" fill="#fff"/><path d="M48 30h16M48 38h16"/><circle cx="56" cy="52" r="4" fill="#C1502E"/><path d="M72 58h14v8" stroke="#05668D"/><path d="M86 68c-2 3-2 5 0 6s2-3 0-6z" fill="#05668D" stroke="#05668D"/>'); },
    storm: function (c) { return fsBg(c, "#F3F1EC", '<path d="M24 34a12 12 0 0 1 22-6 10 10 0 1 1 6 18H28a8 8 0 0 1-4-12z" fill="#fff"/><path d="M44 48l-5 9h7l-5 9" stroke="#A8431F" stroke-width="2.2"/><path d="M70 64V42l14-10 14 10v22z" fill="#fff"/><path d="M80 64v-10h8v10"/><path d="M98 26l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/>'); }
  };
  /* Featured Service ad slot. FEATURED[0] shows; others can rotate in later. Entries start the Get Started flow. */
  var FEATURED = [
    { id: "warranty", art: "warranty", title: "Warranties Checked", hook: "A Badge on Your Home Record.", popTitle: "Warranties Checked", popText: "We check the warranties on your equipment and add a Warranties Checked badge to your Home Record.", cta: "Free Quote in Minutes" },
    { id: "mold", art: "mold", title: "Mold and Moisture Scan", hook: "Whole Home, Every Visit.", popTitle: "Mold and Moisture Scan", popText: "Protects against mold and water leaks. Damp spots flagged early. Not a lab mold test.", cta: "Free Quote in Minutes" },
    { id: "wh", art: "wh", title: "Water Heater Flush", hook: "Less Sediment, Longer Tank Life.", popTitle: "Water Heater Flush", popText: "A yearly flush, or descale for tankless, to cut sediment and extend its life.", cta: "Free Quote in Minutes" },
    { id: "storm", art: "storm", title: "Storm Checks", hook: "Checked After Major Storms.", popTitle: "Storm Checks", popText: "On Complete, we check your home after major storms, with a drone roof check and vent and ice dam clearing, so problems get caught fast.", cta: "Free Quote in Minutes" }];
  function wwCarousel() {
    return '<div class="ww"><div class="ca-row" data-ptr-ignore>' + WW_CATS.map(function (c) {
      return '<article class="ca-card ca-' + c[3] + '"><div class="ca-art" aria-hidden="true">' + wwIco(c[1][0]) + wwIco(c[1][1], "ca-b") + '</div><div class="ca-body"><h3>' + c[0] + '</h3><ul>' +
        c[2].map(function (s) { return '<li><span>' + s[1] + '</span><em class="ca-pl pl-' + s[2] + '" title="Included from ' + s[2] + ' up">' + s[2] + '</em></li>'; }).join("") + '</ul></div></article>';
    }).join("") + '</div><div class="ca-dots" aria-hidden="true">' + WW_CATS.map(function (c, i) { return '<b class="d-' + c[3] + (i ? "" : " on") + '"></b>'; }).join("") + '</div></div>';
  }
  function wiRow() {
    return '<div class="wi-row va" data-ptr-ignore>' + WW_WI.map(function (g, i) { return '<button type="button" class="mw-hover" data-wi="' + i + '" aria-haspopup="dialog"><span class="wt-i">' + wwIco(g[0]) + '</span><strong>' + g[1] + '</strong><small>' + g[3].length + ' Included &rsaquo;</small></button>'; }).join("") + '</div>' +
      '<p class="small muted wi-note">Every plan: Furnace/AC Tune-Ups, Water Heater Flush, Dryer Vent, Smoke/CO and the Mold and Moisture Scan. Plus and Complete add more each visit.</p>';
  }
  function wiPop() {
    return '<div class="wi-pop va" role="dialog" aria-modal="true" aria-labelledby="wiT" data-ptr-ignore hidden><div class="wi-bg" data-wi-close></div><div class="wi-card"><button type="button" class="hm-pop-x wi-x mw-hover" data-wi-close aria-label="Close">' + X_SVG + '</button><div class="wi-head"></div><ul class="wi-list"></ul><button type="button" class="btn btn-primary mw-hover wi-go" data-act="start">Free Quote in Minutes</button></div></div>';
  }
  function featuredAd() {
    var f = FEATURED[0], art = FS_ART[f.art];
    var cta = f.href ? '<a class="btn btn-primary mw-hover" href="' + f.href + '">' + f.cta + '</a>' : '<button type="button" class="btn btn-primary mw-hover" data-act="start">' + f.cta + '</button>';
    return '<button type="button" class="fs-ad mw-hover" aria-haspopup="dialog" data-featured="' + f.id + '">' + art("fs-art") + '<span class="fs-tx"><span class="fs-tag">Featured Service</span><b>' + f.title + '</b><small>' + f.hook + '</small></span><span class="fs-go" aria-hidden="true">&rsaquo;</span></button>' +
      '<div class="wi-pop fs-pop" role="dialog" aria-modal="true" aria-label="' + esc(f.popTitle) + '" data-ptr-ignore hidden><div class="wi-bg" data-wi-close></div><div class="wi-card"><button type="button" class="hm-pop-x wi-x mw-hover" data-wi-close aria-label="Close">' + X_SVG + '</button>' + art("fs-lg") + '<h3>' + f.popTitle + '</h3><p>' + f.popText + '</p>' + cta + '</div></div>';
  }
  function bindWW(root) {
    (function () { var ww = root.querySelector(".ww"), sec = ww && ww.parentNode;
      if (!ww || !("IntersectionObserver" in window) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
      ww.classList.add("ww-fx"); [].forEach.call(ww.querySelectorAll(".ca-card"), function (c, k) { c.style.transitionDelay = (k * 70) + "ms"; });
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { ww.classList.add("ww-in"); var al = sec.querySelector(".ww-all"); if (al) al.classList.add("ww-in"); io.disconnect(); } }); }, { threshold: .2 });
      io.observe(ww); setTimeout(function () { ww.classList.add("ww-in"); }, 4000); })();
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
    return '<div class="ic-pop" role="dialog" aria-modal="true" aria-labelledby="icT" data-ptr-ignore hidden><div class="ic-bg" data-ic-close></div><div class="ic-sheet"><span class="ic-grab" aria-hidden="true"></span><button type="button" class="hm-pop-x ic-x mw-hover" data-ic-close aria-label="Close">' + X_SVG + '</button><h3 id="icT"></h3><p class="ic-lead2"></p><ul class="ic-list"></ul><button type="button" class="btn btn-primary mw-hover ic-go" data-act="start">Get Started</button></div></div>';
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
    function openAddon(id, from) { var a = P.addons.filter(function (x) { return x.id === id; })[0];
      if (!a) { var o = (P.lastMinute || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
        var op = [["What's Included", o.desc], ["Limits", AC_LIMITS[o.id] || "Not set yet. We confirm limits when you book."], ["How the Price Is Set", o.quoteRequired ? "Quote required. Add it to your request and we will follow up with a price." : money(o.price) + " one time, done on a visit. Not added to your monthly membership. Draft price."]];
        return show(o.label, o.quoteRequired ? QUOTE_LABEL : money(o.price) + " one time", op.map(function (p) { return '<li class="ac-part"><span><b>' + p[0] + '</b><br>' + p[1] + '</span></li>'; }).join(""), "Shop À La Carte", from); }
      var parts = [["What's Included", a.desc]];
      parts.push(["Limits", AC_LIMITS[a.id] || "Not set yet. We confirm limits when you book."]);
      parts.push(["How the Price Is Set", a.quoteRequired ? "Quote required. No flat annual price. Add it to your request and we will follow up with a quote." : addMo(a) + " added to your membership. It is the yearly price divided by 12, rounded, and the yearly price is set at the midpoint of metro Detroit market pricing research." + " Draft price."]);
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
    var trust = [["shield", "Certified Techs", "State license checked, insured, background checked yearly."], ["refund", "Cancel Anytime", "No fee. Full refund before your first visit, then a refund for paid services not yet done."], ["clipboard", "Home Reports", "Written report with photos saved to your Home Record."], ["user", "Background-Checked Yearly", "Third-party background check, renewed every year."], ["meter", "Moisture Scan Every Visit", "Whole-home moisture meter and thermal camera check every visit."], ["doc", "Licensed & Insured", "Licensed partners for work that needs a Michigan license, and insured techs."]];
    trust = HERO_CHIPS.map(function (c) { return trust.filter(function (t) { return t[1] === c[1]; })[0]; }).filter(Boolean);
    var popular = ["windows", "chimney", "ducts", "pressure", "radon", "guttersExtra", "deck", "lights"];
    var addons = popular.map(function (id) { return P.addons.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
    function card(ic, t, sub, extra, cls) { return '<div class="hm-card card mw-hover ' + (cls || "") + '">' + I(ic) + '<strong>' + t + '</strong>' + (sub ? '<span class="muted small">' + sub + '</span>' : '') + (extra || "") + '</div>'; }
    function row(id, title, cards, link, pre) {
      return '<section class="hm-row" id="row-' + id + '"><div class="hm-row-h"><h2>' + title + '</h2>' + (link || "") + '</div>' + (pre || "") + '<div class="hm-scroll">' + cards + '</div></section>';
    }
    return '<div class="hm">' +
      '<section class="hm-hero">' +
        '<button class="hm-thumb mw-hover' + '' + '" data-act="watch" type="button" aria-label="Watch Video">' + heroMedia() + '<span class="hm-expand" aria-hidden="true">' + I("play", "xs") + '</span><span class="hm-dur">0:50</span></button>' +
        '<div class="hm-hero-txt"><h1>Your Home,<br class="hm-br"> Taken Care Of.</h1>' +
        '<p class="hm-lead"><span class="hm-lead-l">Catch small problems before they&rsquo;re big ones.</span><span class="hm-lead-s">Catch small problems early.</span></p><p class="start-at">Membership Starting at $139/Month</p>' +
        '<button class="btn btn-primary btn-big mw-hover hm-cta-inline" data-act="start" type="button"><span class="hm-cta-l">Get Started</span><span class="hm-cta-s">Free Quote In Minutes</span></button>' +
        '<div class="hm-hcw"><button type="button" class="hm-hc-arr l" data-hc="l" aria-label="Move badges left">&lsaquo;</button><div class="hm-hchips" aria-label="Why Trust Us" data-ptr-ignore><div class="hm-hc-track">' + [0, 1].map(function (k) { return '<div class="hm-hc-set"' + (k ? ' aria-hidden="true"' : '') + '>' + HERO_CHIPS.map(function (c, i) { return '<span class="hm-hchip t' + (i % 4) + '"><span>' + c[1] + '</span></span>'; }).join("") + '</div>'; }).join("") + '</div></div><button type="button" class="hm-hc-arr r" data-hc="r" aria-label="Move badges right">&rsaquo;</button></div>' + (hasResume() ? resumeCard() : '') + '</div>' +
      '</section>' +
      '<button type="button" class="hm-plans-cue mw-hover" data-plans-cue aria-label="Scroll to Plans"><span>Plans</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg></button>' +
      /* Services search removed from the home/sales page (Max, Oct 14). It belongs in the future member 'My Home' area. */
      row("plans", "Plans", tiers.map(function (k) { return planCard(k, phoneOrder.indexOf(k)); }).join(""), '<button class="link mw-hover" type="button" data-act="start">Free Quote in Minutes</button>',
        '').replace('</div></section>', '</div><div class="pc-dots" aria-hidden="true">' + phoneOrder.map(function (k) { return '<span class="pc-dot" data-dot="' + k + '"></span>'; }).join("") + '</div></section>') +
      /* Waitlist card removed from home (Max, Oct 17): it shows only at the end of the quote flow for out-of-area ZIPs. */
      '<div class="hm-offer-pop" role="dialog" aria-modal="true" aria-label="Welcome Offer" hidden><div class="hm-offer-bg" data-offer-close></div><div class="hm-offer-card"><button type="button" class="hm-pop-x mw-hover" data-offer-close aria-label="Close">' + X_SVG + '</button><h3>Welcome Offer</h3><div class="hm-offer-body small"><p>Founding Member: 2 Years For The Price Of 1, while founding spots last. No code needed.</p><p>Refer A Neighbor: You both get a month free when your neighbor makes their first payment.</p><p class="muted">Free months have no cash value.</p></div></div></div>' +
      '<section class="hm-row" id="row-services"><div class="hm-row-h"><h2>What We Take Care Of</h2></div>' +
        wwCarousel() + '<div class="ww-all"><button class="link mw-hover" type="button" data-hm-open="plans">See All <span class="ww-arr" aria-hidden="true">&rsaquo;</span></button></div></section>' +
      '<div class="hm-pop" role="dialog" aria-modal="true" aria-labelledby="hmPopT" data-ptr-ignore hidden><div class="hm-pop-bg" data-pop-close></div><div class="hm-pop-card">' +
        '<button type="button" class="hm-pop-x mw-hover" data-pop-close aria-label="Close">' + X_SVG + '</button>' +
        '<div class="hm-pop-art"></div><p class="hm-pop-tag"></p><h3 id="hmPopT"></h3><p class="hm-pop-txt"></p>' +
        '<button type="button" class="btn btn-primary mw-hover hm-pop-go">Free Quote in Minutes</button></div></div>' +
      '<section class="hm-row" id="row-trust"><div class="hm-row-h"><h2 class="hm-trust-h">Why Trust Us</h2><button class="link mw-hover" type="button" data-hm-open="faq">How We Vet</button></div>' +
        '<div class="hm-chips">' + trust.map(function (s, i) { return '<span class="hm-chip t' + (i % 4) + '"><span>' + s[1] + '</span></span>'; }).join("") + '</div>' +
        '</section>' +
      '<section class="hm-accs"><h2>Details</h2>' +
      hmAcc("plans", "house", "What's Included", wiRow() + incCarousel()) +
      hmAcc("addons", "wrench", "Shop À La Carte", '<ul class="hm-prices">' + monthlyAddonCatalog().map(function (a) { return '<li><button type="button" class="ac-item mw-hover" data-ac="' + a.id + '" aria-haspopup="dialog">' + I(ADDON_ICO[a.id] || "wrench", "xs") + '<span>' + a.label + '</span><b>' + addMo(a) + '</b></button></li>'; }).join("") + onceAddonCatalog().map(function (a) { return '<li><button type="button" class="ac-item mw-hover" data-ac="' + a.id + '" aria-haspopup="dialog">' + I(ADDON_ICO[a.id] || "wrench", "xs") + '<span>' + a.label + '</span><b>' + (a.quoteRequired || a.price==null ? QUOTE_LABEL : money(a.price) + ' one time') + '</b></button></li>'; }).join("") + '</ul><button class="btn btn-outline mw-hover" data-act="alacarte" type="button">Shop À La Carte</button>') +
      hmAcc("refund", "refund", "Refund Promise", ul(["Cancel Anytime, No Fee", "Full Refund Before Your First Visit", "After That, We Refund Paid Services Not Yet Done, Within 14 Days", '<a href="/#cancel" class="link mw-hover">Cancel Online Anytime In One Step</a>']) + '<p class="small muted" style="margin:.4rem 0 0">Signed up in person at your home or an event, or on a sales call from us? You get a 3-day right to cancel.</p>') +
      hmAcc("faq", "faq", "FAQ", '<h4>How Often Should I Change My Furnace Filter?</h4><p>Every 1 to 3 months. Every plan includes Furnace Filters.</p><h4>Service Area?</h4><p>Metro Detroit: Wayne, Oakland, Macomb.</p><h4>How Do You Vet Techs?</h4><p>State License Checked, Insured, Yearly Background Check.</p><h4>Can I Cancel?</h4><p>Anytime, no fee. See Refund Promise.</p><h4>Do I Need To Send Photos?</h4><p>No. No photos are needed to sign up.</p><a class="btn btn-outline mw-hover" href="faq/">See All FAQs</a>') +
      '</section>' + featuredAd() + /* lower Share pill removed (Max, Oct 17): the header share arrow is the only Share */ wiPop() + icSheet() + acPop() +
      '<div class="hm-sticky"><button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button></div>' +
      '<nav class="hm-tabs" aria-label="App Sections">' +
        [["home", "house", "Home"], ["plans", "star", "Plans"], ["faq", "faq", "FAQs"], ["myhome", "clipboard", "My Home"], ["account", "user", "Account"]].map(function (t, i) { return '<button type="button" class="mw-hover' + (i === 0 ? " on" : "") + '" data-hm-tab="' + t[0] + '">' + I(t[1], "xs") + '<span>' + t[2] + '</span></button>'; }).join("") +
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
      setTimeout(function () { hmJump(g); }, 340);
    }); });
    root.querySelectorAll("[data-hm-back]").forEach(function (b) { b.addEventListener("click", function () { hmJump(root.querySelector("#row-plans")); }); });
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
      '<div class="xt-top"><h3 id="acPopT">Shop À La Carte</h3><button type="button" class="modal-x mw-hover" data-acpop-close="1" aria-label="Close">' + X_SVG + '</button></div>' +
      '<p class="lead-sm">One-time services, no membership needed. Tap Add on anything you want, then Book. <span class="draft">Draft prices</span></p>' +
      '<h4 class="acp-h">Monthly Add-Ons</h4>' + renderAddonList(monthlyAddonCatalog(), sel, "acpop", function (x) { return addMo(x) + (x.note ? ' <span class="muted">· ' + esc(x.note) + '</span>' : '') + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
      '<h4 class="acp-h">One-Time Add-Ons</h4>' + renderAddonList(onceAddonCatalog(), sel, "acpop", function (x) { return oncePriceLabel(x) + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
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
  /* Nov 12 2026 (Machan 7:16 PM): one jump helper for every Home section/anchor jump (bottom bar, down arrow, See All, hash links).
     Lands the target's title just below the sticky header. The 12px gap is keyed off the title (h2 / summary), not the section box, so section padding does not shift Plans below FAQ / What's Included. */
  function hmHdrSync() { var t = document.querySelector(".topbar"); if (t && t.offsetHeight) document.documentElement.style.setProperty("--su-hdr-h", t.offsetHeight + "px"); }
  function hmJumpTitle(el) {
    if (!el) return el;
    if (el.matches && el.matches("h1,h2,h3,summary")) return el;
    if (el.matches && el.matches(".hm-row-h")) return el.querySelector("h2,h1,h3") || el;
    return el.querySelector(":scope > summary, :scope > .hm-row-h h2, .hm-row-h h2, :scope > h2, h2, summary") || el;
  }
  function hmJump(el, smooth) {
    if (!el) return; hmHdrSync();
    var title = hmJumpTitle(el);
    var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var off = parseFloat(getComputedStyle(title).scrollMarginTop);
    if (!off) {
      var hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--su-hdr-h")) || 0;
      var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--su-jump-gap")) || 12;
      off = hdr + gap;
    }
    var top = Math.max(0, Math.round(title.getBoundingClientRect().top + window.scrollY - off));
    window.scrollTo({ top: top, behavior: rm || smooth === false ? "auto" : "smooth" });
  }
  window.addEventListener("resize", hmHdrSync); window.addEventListener("orientationchange", hmHdrSync);
  function bindHome() {
    var root = app.querySelector(".hm"); if (!root) return;
    hmHdrSync();
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
      /* jump once the accordions finish animating, so the page height (and any collapsed panel above) is final */
      if (scroll) setTimeout(function () { hmJump(d); }, reduce ? 0 : 320);
    }
    accs.forEach(function (d) { d.querySelector("summary").addEventListener("click", function (e) { e.preventDefault(); if (d.open) setOpen(d, false); else openAcc(d, false); }); });
    root.querySelectorAll("[data-hm-open]").forEach(function (b) { b.addEventListener("click", function () { var d = document.getElementById("acc-" + b.getAttribute("data-hm-open")); if (d) openAcc(d, true); }); });
    var toast = root.querySelector(".hm-toast"), tt;
    root.querySelectorAll("[data-hm-tab]").forEach(function (b) { b.addEventListener("click", function () {
      var t = b.getAttribute("data-hm-tab");
      if (t === "faq") { var fq = document.getElementById("acc-faq"); if (fq) openAcc(fq, true); return; }
      if (t === "myhome" || t === "account") { toast.textContent = (t === "myhome" ? "My Home" : "Account") + " Is Coming Soon"; toast.hidden = false; clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, 2200); return; }
      root.querySelectorAll("[data-hm-tab]").forEach(function (o) { o.classList.toggle("on", o === b); });
      if (t === "home") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      else hmJump(document.getElementById("row-" + t));
    }); });
    var cue = root.querySelector("[data-plans-cue]"); if (cue) cue.addEventListener("click", function () { hmJump(document.getElementById("row-plans")); });
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
        go(OB[0]);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") popClose(); });
    }
    /* trust chips: nothing happens on tap (Trust Tags deck 07, Max Oct 17) */
    /* search */
    var idx = [];
    accs.forEach(function (d) { var title = d.querySelector("summary span").textContent; idx.push({ t: title, k: (title + " " + d.querySelector(".acc-body").textContent).toLowerCase(), acc: d }); });
    monthlyAddonCatalog().forEach(function (a) { idx.push({ t: a.label + " · " + addMo(a), k: (a.label + " " + (a.desc||"")).toLowerCase(), acc: document.getElementById("acc-addons") }); });
    onceAddonCatalog().forEach(function (a) { idx.push({ t: a.label + " · " + (a.quoteRequired || a.price==null ? QUOTE_LABEL : money(a.price) + " one time"), k: (a.label + " " + (a.desc||"")).toLowerCase(), acc: document.getElementById("acc-addons") }); });
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
  function hasResume() { return !!S.resume && isOb(S.resume); }
  function resumeCard() {
    var done = Math.max(0, OB.indexOf(S.resume));
    return '<div class="hm-resume-card"><span class="qf-art t3" aria-hidden="true">' + I("clock") + '</span><div><b>Pick Up Where You Left Off</b><small>' + done + ' of ' + OB.length + ' questions answered</small></div>' +
      '<button type="button" class="hm-resume-x mw-hover" data-act="dismissResume" aria-label="Dismiss and clear saved progress">' + X_SVG + '</button>' +
      '<span class="hm-resume-btns"><button class="btn btn-primary mw-hover" data-act="resume" type="button">Resume</button><button class="btn btn-outline mw-hover" data-act="startOver" type="button">Start Over</button></span></div>';
  }
  var XICO = { irrigation: "spray", sump: "meter", fireplace: "chimney", generator: "wrench", pool: "pool", humidifier: "radon", softener: "meter" };
  /* ---------- Onboarding: homeowner quote funnel, 9 screens (Machan Nov 11 2026, 1:32-1:36 PM ICT answers) ----------
     Address > Home Basics > Systems > Add-Ons > Plan > Billing > Access > Start Date > Accept.
     No photos, no separate price visit, no promo-only founding offer, no 24+6 offer. Every amount comes from pricing-config.js via buildLines(). */
  /* Funnel decks (Machan Nov 12, Home Details #1 + Systems #8): address, size and stories share one screen; Systems is two short screens (counts, then extras). Still 9 steps; every screen counts. */
  var OB = ["address", "systems", "systems2", "addons", "plan", "billing", "access", "start", "accept"];
  var OB_NAME = { address: "Your Home", systems: "Your Systems", systems2: "Extras", addons: "Add-Ons", plan: "Your Plan", billing: "Billing", access: "Access", start: "Start Date", accept: "Accept" };
  /* Onboarding Flow Deck (b4c76e3). Each key adds class ob-<key>-a / ob-<key>-b on the screen; the ?ob= preview switch was removed once picks were final. */
  /* Onboarding Flow Deck picks (Machan, submitted Nov 11 2026 3:58 PM ICT): Inline Pill Stepper, Checklist With Tags, Segmented Control (+ Limited Offer badge), Itemized Summary, Steppers. */
  var OB_STYLE = { stepper: "A", plan: "B", billing: "A", accept: "B", basics: "B" };
  function obCls() { return Object.keys(OB_STYLE).map(function (k) { return "ob-" + k + "-" + OB_STYLE[k].toLowerCase(); }).join(" "); }
  /* Founding 50 (Machan Nov 11): 2 years for the price of 1 is shown and preselected automatically while founding spots last; no code needed.
     Set open to false when the 50 spots are gone. After the fill, a full-price annual option (12 x monthly quote less 10%) is offered when FOUNDING_FULL is true.
     FOUNDING_FULL stays false today so the annual path is built and tested but not shown. */
  var FOUNDING = { open: true };
  var FOUNDING_FULL = false;
  var PAYMENTS_LIVE = false;
  function foundingFull() { return !!(FOUNDING_FULL || (P && (P.FOUNDING_FULL || P.foundingFull))); }
  function paymentsLive() { return !!(PAYMENTS_LIVE || (P && (P.PAYMENTS_LIVE || P.paymentsLive))); }
  function foundingOpen() { return FOUNDING.open && !foundingFull(); }
  /* Legal copy constants (Nov 12). Placeholders {monthly}, {price} and {amount} are filled from the live quote. Easy to swap when Legal updates wording. */
  var AFTER_FOUNDING_LINE = "After our 50 Founding spots are gone, you can pay monthly or prepay 12 months at 10% off your monthly price.";
  var AFTER_FOUNDING_PRICE = "{monthly}/mo, or prepay 12 months for {price} (10% off monthly).";
  var BETA_PAY_TITLE = "Payments During Beta";
  /* Legal Nov 12 7:09 PM, word for word: One-Time tab expandable line for quote-only services (#14). */
  var ONCE_MORE_LINE = "Need More? We'll Quote It After Your Visit. Nothing Extra Is Done Or Charged Without Your OK.";
  var BETA_PAY_BODY = "Your first payment is due when you sign up. During our beta, our team collects payment personally. Right after you sign up, we'll follow up with a secure way to pay. Please don't send card numbers in chat.";
  var MONTHLY_CONSENT_LIVE = "I agree Smart Upkeep may charge me <strong>{amount}</strong> today and on this date <strong>each month</strong>. My membership runs in 12-month terms and <strong>renews automatically</strong> until I cancel, with at least 60 days' notice of any price change. I can cancel anytime in the app under Profile & Account.";
  var MONTHLY_CONSENT_BETA = "I agree to pay Smart Upkeep <strong>{amount}</strong>, due today, and on this date <strong>each month</strong>. My membership runs in 12-month terms and <strong>renews automatically</strong> until I cancel, with at least 60 days' notice of any price change. I can cancel anytime, with no fee, by emailing support@smartupkeep.ai.";
  var ANNUAL_CONSENT_LIVE = "I agree Smart Upkeep may charge me <strong>{amount}</strong> today for <strong>12 months</strong> of membership (10% off 12 monthly payments). My membership <strong>renews automatically each year</strong> at the then-current annual prepaid price until I cancel, with at least 60 days' notice of any price change. I can cancel anytime in the app under Profile & Account.";
  var ANNUAL_CONSENT_BETA = "I agree to pay Smart Upkeep <strong>{amount}</strong>, due today, for <strong>12 months</strong> of membership (10% off 12 monthly payments). My membership <strong>renews automatically each year</strong> at the then-current annual prepaid price until I cancel, with at least 60 days' notice of any price change. I can cancel anytime, with no fee, by emailing support@smartupkeep.ai.";
  var FOUNDING_CONSENT_LIVE = "I agree Smart Upkeep may charge me <strong>{amount}</strong> today for <strong>24 months</strong> of membership. After that, my membership <strong>renews automatically each year</strong> at the plan price then in effect (with at least 60 days' notice of any change) until I cancel. I can cancel anytime in the app under Profile &amp; Account.";
  var FOUNDING_CONSENT_BETA = "I agree to pay Smart Upkeep <strong>{amount}</strong>, due today, for <strong>24 months</strong> of membership. After that, my membership <strong>renews automatically each year</strong> at the plan price then in effect (with at least 60 days' notice of any change) until I cancel. I can cancel anytime, with no fee, by emailing support@smartupkeep.ai.";
  /* Base set (Machan Nov 11): 1 furnace, 1 AC, 1 water heater. Anything above shows as a +1 tag, e.g. "Plus · +1 Furnace". */
  var BASE_SET = { furnaces: 1, acs: 1, waterHeaters: 1 };
  var SIZE_OPTS = [["1500", "Under 2,000"], ["2500", "2,000 to 3,000"], ["3500", "3,000 to 4,000"], ["4500", "4,000 to 5,000"], ["5500", "5,000 to 6,000"], ["6500", "Over 6,000"]];
  var STORY_OPTS = [["1", "1 Story", "Ranch"], ["2", "2 Stories", ""], ["3", "3 Stories", ""]];
  var ACCESS_OPTS = [["home", "I'll Be Home", "user"], ["lockbox", "Lockbox", "shield"], ["door", "Door Code", "tag"], ["other", "Something Else", "pen"]];
  /* Did You Know tips stay on the question screens (Machan Nov 11). */
  var DYK = {
    address: "Every visit ends with a written report saved to your Home Record.",
    systems2: "Plus includes gutter and downspout cleaning every spring and fall.",
    systems: "We change your furnace filters during every visit, at no extra charge.",
    addons: "Every plan includes a Whole-Home Mold and Moisture Scan with a thermal camera."
  };
  /* Legal-approved First Visit blurb. Keep word for word. */
  var FIRST_VISIT_BLURB = "Your first visit is a full visit. We check every system in your plan, start your Home Record and get to know your home. Seasonal tasks happen on the visits when they're due.";
  /* Approved price-confirm line for Accept. Keep word for word. */
  var PRICE_CONFIRM = "Your price is based on your answers. At your first visit, your tech confirms your home's systems. If anything changes your price, you'll see the new price before it applies and can accept it or cancel with no fee.";
  /* LINK SLOT: Legal's Member Agreement (UpKeep board id member-agreement-draft, commit 54e4f1d) is still in Michigan attorney review and has no public URL yet.
     Set url when Legal publishes it. Until then Accept shows a marked slot instead of agreement text (no new legal text is written here). */
  var AGREEMENT = { id: "member-agreement-draft", rev: "54e4f1d", url: "" };

  function isOb(s) { return OB.indexOf(s) > -1; }
  /* Service area: metro Detroit ZIPs 480xx to 483xx (same check as before). */
  function inArea(zip) { return /^48[0-3]\d\d$/.test(zip); }
  function localISO(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function minStart() { return localISO(new Date(Date.now() + 2 * 864e5)); }
  function longDate(iso) { var t = new Date(iso + "T12:00:00"); return isNaN(t) ? iso : t.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
  function cnt(k) { var v = S.answers[k]; return v === undefined || v === "unsure" ? BASE_SET[k] : Math.max(0, Number(v) || 0); }
  function whTypes() { var n = cnt("waterHeaters"), t = Array.isArray(S.answers.whTypes) ? S.answers.whTypes.slice(0, n) : []; while (t.length < n) t.push("tank"); return t; }
  function extraTags() {
    var t = [];
    [["furnaces", "Furnace"], ["acs", "AC"], ["waterHeaters", "Water Heater"]].forEach(function (x) { var n = cnt(x[0]) - BASE_SET[x[0]]; if (n > 0) t.push("+" + n + " " + x[1]); });
    return t;
  }
  function planTag(k) { return [P.tiers[k || S.tier].label].concat(extraTags()).join(" · "); }
  function moLabel(annual) { return "+" + money(monthlyOf(annual)) + "/mo"; }
  /* Billing (Machan Nov 11, updated Nov 12): founding = pay 1 year of plan + add-ons, get 2 years (add-ons included in the 2-for-1).
     monthly = plan + add-ons each month, first charge due at sign-up, then on that date each month.
     After the Founding 50 fill (FOUNDING_FULL): full-price annual = round(monthly incl add-ons x 12 x (1 - annualDiscount)). Never stack with platinumAnnualDiscount. */
  function annualDiscountRate() {
    var d = P && P.annualDiscount;
    if (d == null || !isFinite(+d)) return 0;
    return +d;
  }
  function annualPrepaidOf(monthly) {
    /* Uses only annualDiscount. platinumAnnualDiscount is an unused DRAFT and must never be applied on top. */
    return Math.round(Number(monthly) * 12 * (1 - annualDiscountRate()));
  }
  function liveMonthly(tier) {
    var prev = S.plan;
    S.plan = "monthly";
    var r = obBill(tier);
    S.plan = prev;
    return r.perCharge;
  }
  function fillAmt(tpl, amount) { return String(tpl).replace(/\{amount\}/g, money(amount)); }
  function afterFoundingPriceLine(monthly) {
    return AFTER_FOUNDING_PRICE.replace("{monthly}", money(monthly)).replace("{price}", money(annualPrepaidOf(monthly)));
  }
  function afterFoundingBlock(monthly) {
    return '<div class="after-founding" data-after-founding><p class="after-founding-line">' + AFTER_FOUNDING_LINE + '</p><p class="after-founding-price">' + afterFoundingPriceLine(monthly) + '</p></div>';
  }
  function monthlyConsent(amount) { return fillAmt(paymentsLive() ? MONTHLY_CONSENT_LIVE : MONTHLY_CONSENT_BETA, amount); }
  function annualConsent(amount) { return fillAmt(paymentsLive() ? ANNUAL_CONSENT_LIVE : ANNUAL_CONSENT_BETA, amount); }
  function foundingConsent(amount) { return fillAmt(paymentsLive() ? FOUNDING_CONSENT_LIVE : FOUNDING_CONSENT_BETA, amount); }
  function obPlan() {
    if (foundingFull()) return S.plan === "annual" ? "annual" : "monthly";
    var p = S.plan;
    if (p === "monthly" || p === "annual" || !foundingOpen()) return "monthly";
    return "founding";
  }
  function obBill(tier) {
    tier = tier || S.tier;
    var mem = price()[tier], add = addonsAnnual(), plan = obPlan();
    var r = { tier: tier, plan: plan, membershipAnnual: mem, membership: mem, addonsAnnual: add, monthly: monthlyOf(mem), addonsMonthly: monthlyOf(add) };
    if (plan === "founding") { r.label = "Annual · Founding 2-For-1"; r.long = "Founding Member: 2 Years For The Price Of 1"; r.today = mem + add; r.termMonths = 24; }
    else if (plan === "annual") {
      r.perCharge = r.monthly + r.addonsMonthly;
      r.today = annualPrepaidOf(r.perCharge);
      r.label = "Annual · 10% Off";
      r.long = "Prepay 12 Months (10% Off Monthly)";
      r.termMonths = 12;
    }
    else { r.label = "Monthly"; r.long = "Monthly, First Charge Today"; r.perCharge = r.monthly + r.addonsMonthly; r.today = r.perCharge; r.termMonths = 12; }
    return r;
  }
  function tagLine() { return '<p class="qf-tagline">' + I("shield", "xs") + 'Tailored To Your Home &middot; Warranties Checked</p>'; }
  function startOverBtn() { return '<button type="button" class="qf-startover mw-hover" data-act="startOver">Start Over</button>'; }
  function obShell(id, art, tint, title, help, body, foot) {
    var tl = !!S.tailor && (id === "systems" || id === "systems2"); /* Swatch D16: tailoring keeps the bar on Your Plan instead of jumping to Step 3 */
    var i = OB.indexOf(tl ? "plan" : id);
    var prog = '<div class="qf-prog"><span class="qf-step">' + (tl ? "Tailor Your Plan" : 'Step ' + (i + 1) + ' of ' + OB.length + ' &middot; ' + OB_NAME[id]) + '</span><div class="qf-segs nine" role="progressbar" aria-valuenow="' + (i + 1) + '" aria-valuemin="1" aria-valuemax="' + OB.length + '" aria-label="Step ' + (i + 1) + ' of ' + OB.length + '">' +
      OB.map(function (x, k) { return '<span class="' + (k < i ? "done" : k === i ? "cur" : "") + '"></span>'; }).join("") + '</div></div>';
    var dyk = DYK[id] ? '<div class="qf-dyk">' + I("star", "xs") + '<p><b>Did You Know?</b> ' + DYK[id] + '</p></div>' : "";
    return '<section class="qf ob ob-' + id + ' ' + obCls() + '">' + prog +
      '<div class="qf-hero stack compact"><div class="qf-art mid t' + tint + '" aria-hidden="true">' + I(art) + '</div><h1 class="qf-h">' + title + '</h1>' + (help ? '<p class="qf-help">' + help + '</p>' : '') + '</div>' +
      '<div class="qf-body">' + body + '</div>' + dyk + obFoot(foot) + '</section>';
  }
  /* Funnel decks #11 + #17 (sticky part): Back left and Next right in a sticky bottom bar on every step. The rest of the footer (tagline, Home, Start Over, Built by Machan) stays; the Back-only footer layout is held for the Extras deck. */
  function backOnly() { var m = backBtn().match(/<button class="back back-pill[\s\S]*?<\/button>/); return m ? m[0] : ""; }
  function obFoot(foot) {
    var m = String(foot || "").match(/<button class="btn btn-primary btn-big mw-hover" data-ob-next="1"[^>]*>[\s\S]*?<\/button>/), nx = m ? m[0] : "", rest = nx ? foot.replace(nx, "") : (foot || "");
    return '<div class="ob-bar">' + backOnly() + nx + '</div>' + '<div class="qf-foot">' + rest + tagLine() + '<div class="qf-navbar">' + homePill() + '</div>' + startOverBtn() + '</div>';
  }
  function nextBtn(label, ok) { return '<button class="btn btn-primary btn-big mw-hover" data-ob-next="1" type="button"' + (ok ? "" : " disabled") + '>' + label + '</button>'; }

  /* 1. Address: first, required street address + ZIP, in-area check. Out of area shows the waitlist (Coming Soon, no date). */
  function addrOk() { var a = S.answers; return /\d+\s+\S+/.test(String(a.street || "").trim()) && /^\d{5}$/.test(String(a.zipcode || "")); }
  function obAddress() {
    var a = S.answers, out = S._outZip && S._outZip === a.zipcode;
    /* #4: size and stories start on the first option (existing SIZE_OPTS tiers only, no new prices) */
    if (a.sqft == null || a.sqft === "unsure" || !SIZE_OPTS.some(function (o) { return o[0] === String(a.sqft); })) a.sqft = SIZE_OPTS[0][0];
    if (a.stories == null || a.stories === "unsure") a.stories = STORY_OPTS[0][0];
    var si = 0; SIZE_OPTS.forEach(function (o, k) { if (o[0] === String(a.sqft)) si = k; });
    var st = String(a.stories);
    /* #2: ZIP first in a short box, service-area line under it; #3: Title Case labels */
    var body = '<div class="ob-fields"><label class="fl" for="obZip">ZIP Code</label><input id="obZip" class="ob-zip" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" enterkeyhint="next" placeholder="48322" value="' + esc(a.zipcode || "") + '">' +
      '<p class="ob-area small">We serve metro Detroit: Wayne, Oakland, Macomb and nearby</p>' +
      '<label class="fl" for="obStreet">Street Address</label><input id="obStreet" type="text" autocomplete="address-line1" enterkeyhint="go" placeholder="123 Main St, Novi" value="' + esc(a.street || "") + '"></div>' +
      '<p class="ferr" id="obAddrErr" role="alert"></p>' + (out ? waitlistCard(a.zipcode) : "") +
      /* #5: size and stories in one card with a divider */
      '<div class="pick-card"><div class="pick-step"><div class="meta"><p class="k">Home Size</p><p class="v">' + SIZE_OPTS[si][1] + ' sq ft</p><p class="s">A rough range is fine</p></div>' + obStepper("sqft", null, si <= 0, si >= SIZE_OPTS.length - 1, "Home size") + '</div>' +
      '<div class="pick-step"><div class="meta"><p class="k">Stories</p><p class="v">' + STORY_OPTS[Number(st) - 1][1] + '</p><p class="s">Sets gutter and ladder work</p></div>' + obStepper("stories", st, st === "1", st === "3", "Stories") + '</div></div>' +
      '<p class="priced-note">Size and stories are both priced into your plan.</p>';
    return obShell("address", "house", 0, "Where's Your Home?", "What's the address of the home you'd like us to take care of?", body, nextBtn("Next", addrOk() && !out));
  }
  function waitlistCard(z) {
    return '<section class="hm-wait qt-wait ob-wait" id="row-waitlist"><div class="card hm-wait-card"><h3>Coming Soon</h3><p class="small muted">We don\'t serve ZIP ' + esc(z) + ' yet. Join the waitlist and we\'ll email you when we\'re coming to your area. While founding spots last, founding members get 2 years for the price of 1.</p>' +
      '<form class="hm-wait-f" data-wait><input type="text" inputmode="numeric" maxlength="5" placeholder="ZIP" aria-label="ZIP code" value="' + esc(z) + '"><input type="email" placeholder="Email" aria-label="Email"><button class="btn btn-outline mw-hover" type="submit">Join The Waitlist</button></form><p class="small hm-wait-msg" aria-live="polite"></p></div></section>';
  }

  /* -/+ stepper. Deck card 1: A inline pill, B big circles (CSS only, see onboarding.css .ob-stepper-a / .ob-stepper-b). */
  function obStepper(key, n, noMinus, noPlus, label) {
    return '<div class="ob-step" role="group" aria-label="' + esc(label) + '"><button type="button" class="mw-hover" data-ob-step="' + key + ':-1" aria-label="Fewer"' + (noMinus ? " disabled" : "") + '>&minus;</button>' +
      (n === null ? '' : '<span class="n" aria-live="polite">' + esc(n) + '</span>') + '<button type="button" class="mw-hover" data-ob-step="' + key + ':1" aria-label="More"' + (noPlus ? " disabled" : "") + '>+</button></div>';
  }

  /* 3. Systems: -/+ steppers (no "or More" caps), AC labeled AC / AC 1 / AC 2, tank or tankless per water heater, priced extras tiles.
     Electrical panel and sensors are not asked; they're logged at the first visit (Machan Nov 11). */
  var SYS_MAX = 20;
  function obSystems() {
    var f = cnt("furnaces"), ac = cnt("acs"), wh = cnt("waterHeaters"), types = whTypes();
    function units(word, n) { return n > 1 ? Array.apply(null, Array(n)).map(function (_, i) { return word + " " + (i + 1); }).join(" · ") : n === 0 ? "None" : ""; }
    function plus(k, n) { var x = n - BASE_SET[k]; return x > 0 ? '<span class="plus-tag">+' + x + '</span>' : ''; }
    function row(k, ico, tint, name, n, extra) {
      var sub = units(name, n);
      return '<div class="sys-row"><div class="sys-ic t' + tint + '" aria-hidden="true">' + I(ico, "sm") + '</div><div class="sys-meta"><div class="sys-name">' + name + plus(k, n) + '</div>' + (sub ? '<p class="sys-sub">' + sub + '</p>' : '') + (extra || '') + '</div>' + obStepper(k, n, n <= 0, n >= SYS_MAX, name + " count") + '</div>';
    }
    var whx = types.map(function (t, i) {
      return '<div class="ob-wh"><span>' + (wh > 1 ? "Water Heater " + (i + 1) : "Type") + '</span><div class="type-seg" role="group" aria-label="Water Heater ' + (i + 1) + ' type">' +
        [["tank", "Tank"], ["tankless", "Tankless"]].map(function (o) { return '<button type="button" class="mw-hover' + (t === o[0] ? " on" : "") + '" data-ob-wh="' + i + ':' + o[0] + '" aria-pressed="' + (t === o[0]) + '">' + o[1] + '</button>'; }).join("") + '</div></div>';
    }).join("");
    /* #13: counts share one white card with dividers; #9: water heater type on its own full-width line under the count */
    var body = '<div class="sys-list sys-card">' + row("furnaces", "furnace", 0, "Furnace", f) + row("acs", "ac", 1, "AC", ac) + row("waterHeaters", "waterheater", 2, "Water Heater", wh) + (wh ? '<div class="ob-whs ob-whs-line">' + whx + '</div>' : '') + '</div>';
    return obShell("systems", "furnace", 2, "Your Systems", "How many of these does your home have? You can adjust this later under Tailor Your Plan.", body, nextBtn("Next", true) + (S.tailor ? '<button type="button" class="link mw-hover ob-undo" data-ob-undo="1">Undo Changes</button>' : ''));
  }
  /* 3b. Extras (#8 second short screen): #10 priced extras first with prices, included ones below their label; #13 in one white card with the heading. Stays synced with the Add-Ons Monthly tab. */
  function obSystems2() {
    var ex = Array.isArray(S.answers.extras) ? S.answers.extras : [];
    function tile(k, j, sub) {
      var e = P.extras[k], on = ex.indexOf(k) > -1;
      return '<button type="button" class="qt chkt mw-hover t' + (j % 4) + (on ? " sel" : "") + '" data-ob-extra="' + k + '" aria-pressed="' + on + '"><span class="qt-ic">' + I(XICO[k] || "wrench", "sm") + '</span><span class="qt-lab">' + esc(suTitle(e.label.replace("Whole-House ", ""))) + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (on ? '<i class="qt-ok" aria-hidden="true"></i>' : '') + '</button>';
    }
    var keys = Object.keys(P.extras), priced = keys.filter(function (k) { return P.extras[k].all > 0; }), incl = keys.filter(function (k) { return !(P.extras[k].all > 0); });
    var body = '<div class="ex-card"><div class="qt-grid two" data-ptr-ignore>' + priced.map(function (k, j) { return tile(k, j, moLabel(P.extras[k].all)); }).join("") + '</div>' +
      (incl.length ? '<p class="blk-lab ex-incl">Included On Plus And Up</p><div class="qt-grid two" data-ptr-ignore>' + incl.map(function (k, j) { return tile(k, j + priced.length, ""); }).join("") + '</div>' : '') + '</div>';
    return obShell("systems2", "wrench", 3, "Do You Have Any Of These?", "", body, nextBtn(S.tailor ? "Back To Your Plan" : "Next", true) + (S.tailor ? '<button type="button" class="link mw-hover ob-undo" data-ob-undo="1">Undo Changes</button>' : ''));
  }

  /* 4. Add-Ons: short optional list, on/off switch per row; tap a row to open its detail in place. */
  function aoPrice(a) {
    if (needsSiteVisit(a && a.label)) return "Needs A Site Visit";
    if (a && a.gutter && gutterIncluded()) return "Included On Plus And Up";
    if (a && a.once) {
      if (hasRealOncePrice(a)) return money(+a.price);
      return QUOTE_LABEL;
    }
    if (hasRealMonthly(a)) return moLabel(a.annual);
    if (hasRealOncePrice(a)) return money(+a.price);
    return QUOTE_LABEL;
  }
  function aoDesc(a) { var d = String(a.desc || "").replace(/\s*Quote required\s*[—-]\s*we will follow up\.?/i, "").trim(); return a.quoteRequired ? (d ? d + " " : "") + "We'll follow up with a price." : d; }
  function aoIco(a) {
    var id = a && a.id || "";
    return XT_ICO[id] || XICO[id.indexOf("x_") === 0 ? id.slice(2) : id] || "wrench";
  }
  function aoRow(a, sel) {
    var on = sel.indexOf(a.id) > -1, open = S._aoOpen === a.id;
    return '<li class="ob-ao' + (on ? " on" : "") + (open ? " open" : "") + '"><div class="ob-ao-top"><button type="button" class="ob-ao-row mw-hover" data-ob-ao-open="' + a.id + '" aria-expanded="' + open + '">' + I(aoIco(a), "sm") +
      '<span class="ob-ao-t"><b>' + esc(a.label) + '</b><small>' + aoPrice(a) + '</small></span><span class="ob-chev" aria-hidden="true"></span></button>' +
      (a.gutter && gutterIncluded() ? '' : '<button type="button" role="switch" aria-checked="' + on + '" aria-label="' + esc(a.label) + '" class="ob-sw mw-hover" data-ob-ao="' + a.id + '"><i></i></button>') + '</div>' +
      (open ? '<p class="ob-ao-d">' + esc(aoDesc(a)) + '</p>' : '') + '</li>';
  }
  function obAddons() {
    var sel = S.addons || [];
    var tab = S._aoTab === "once" ? "once" : "monthly";
    var monthly = monthlyAddonCatalog().map(function (a) { return aoRow(a, sel); }).join("");
    var onceAll = onceAddonCatalog(), oncePriced = onceAll.filter(function (a) { return hasRealOncePrice(a) && !needsSiteVisit(a.label); }), onceQuote = onceAll.filter(function (a) { return oncePriced.indexOf(a) < 0; });
    /* quote-only one-time rows are no longer offered here (they stay on À La Carte); drop any old picks of them so nothing hidden rides along */
    var hid = onceQuote.map(function (a) { return a.id; }); if (sel.some(function (id) { return hid.indexOf(id) > -1; })) { S.addons = sel = sel.filter(function (id) { return hid.indexOf(id) < 0; }); save(); }
    /* Legal Nov 12: every plan includes a Furnace Tune-Up and an AC Tune-Up, so the sign-up flow can't offer them as extras. They stay on Shop À La Carte. */
    onceQuote = onceQuote.filter(function (a) { return !/^(furnace|ac) tune up$/.test(suNorm(a.label)); });
    var once = oncePriced.map(function (a) { return aoRow(a, sel); }).join("") +
      (onceQuote.length ? '<li class="ob-more-li"><details class="ob-more"><summary class="mw-hover">' + ONCE_MORE_LINE + '</summary><ul class="ob-more-list">' + onceQuote.map(function (a) { return '<li>' + esc(a.label) + '</li>'; }).join("") + '</ul></details></li>' : '');
    var addMoSum = addonsNoteMonthly();
    var tabs = '<div class="seg-toggle ob-ao-tabs" role="tablist" aria-label="Add-Ons">' +
      '<button type="button" role="tab" class="mw-hover' + (tab === "monthly" ? " on" : "") + '" id="ob-ao-tab-monthly" aria-selected="' + (tab === "monthly") + '" aria-controls="ob-ao-panel" data-ob-ao-tab="monthly">Monthly</button>' +
      '<button type="button" role="tab" class="mw-hover' + (tab === "once" ? " on" : "") + '" id="ob-ao-tab-once" aria-selected="' + (tab === "once") + '" aria-controls="ob-ao-panel" data-ob-ao-tab="once">One-Time</button></div>';
    var list = '<ul class="ob-ao-list" id="ob-ao-panel" role="tabpanel" aria-labelledby="' + (tab === "once" ? "ob-ao-tab-once" : "ob-ao-tab-monthly") + '">' + (tab === "once" ? once : monthly) + '</ul>';
    var body = '<div class="ob-ao-groups">' + tabs + list + '</div>' + (addMoSum ? '<p class="priced-note">Your add-ons: +' + money(addMoSum) + '/mo</p>' : '');
    return obShell("addons", "wrench", 3, "Add-Ons", "Optional. Add any of these to your plan, or skip.", body, nextBtn(sel.length ? "Next" : "Skip For Now", true));
  }

  /* 5. Plan with tags: Essentials / Plus / Complete, Plus by default, one "Tailor Your Plan" control. Deck card 2: A tag chips, B checklist. */
  function obPlanScreen() {
    S.tailor = false;
    var p = price(), k = S.tier, t = P.tiers[k], tags = extraTags();
    var detail = OB_STYLE.plan === "B"
      ? '<ul class="check-list"><li><span class="tick" aria-hidden="true">&#10003;</span>' + esc(t.label + " · " + t.tagline) + '</li><li><span class="tick" aria-hidden="true">&#10003;</span>Standard Systems Included</li>' + tags.map(function (x) { return '<li><span class="tick" aria-hidden="true">&#10003;</span>' + esc(x) + '</li>'; }).join("") + '</ul>'
      : '<p class="plan-visits">' + esc(t.tagline) + '</p><div class="tag-row"><span class="tag-chip">' + esc(t.label) + '</span>' + tags.map(function (x) { return '<span class="tag-chip extra">' + esc(x) + '</span>'; }).join("") + '</div>';
    function planAccent(xk){
      var lab=((P.tiers[xk]||{}).label||xk)+"";
      var s=(xk+" "+lab).toLowerCase();
      if(/platinum|complete/.test(s)) return "#05668D";
      if(/gold|plus/.test(s)) return "#A8431F";
      return "#0B6E4F";
    }
    var cards = tierKeys().map(function (x) {
      var tx = P.tiers[x], col = planAccent(x), rec = !!tx.recommended, sel = x === k;
      var cta = rec
        ? '<button type="button" class="plan-cta filled mw-hover"' + (sel ? ' data-ob-tailor="1"' : ' data-ob-tier="' + x + '"') + '>' + (sel ? "Tailor Your Plan" : "Choose Plus") + "</button>"
        : '<button type="button" class="plan-cta outline mw-hover"' + (sel ? ' data-ob-tailor="1"' : ' data-ob-tier="' + x + '"') + ' style="--plan-c:' + col + '">' + (sel ? "Tailor Your Plan" : ("Choose " + tx.label)) + "</button>"; /* Swatch: Tailor on a picked Essentials/Complete card opens tailor too */
      return '<div class="plan-card' + (sel ? " sel" : "") + (rec ? " is-popular" : "") + '" data-ob-tier="' + x + '" style="--plan-c:' + col + '">' +
        (rec ? '<span class="ribbon">Most Popular</span>' : "") +
        '<p class="plan-kicker">' + tx.visits + ' Visits A Year</p><h2 class="plan-name">' + esc(tx.label) + '</h2><p class="plan-price">' + money(monthlyOf(p[x])) + '<small>/mo</small></p>' +
        (tx.fromMonthly && monthlyOf(p[x]) !== +tx.fromMonthly ? '<p class="plan-base">Base plan ' + money(tx.fromMonthly) + '/mo</p>' : '') +
        (sel ? detail : "") + cta + "</div>";
    }).join("");
    return obShell("plan", "clipboard", 3, "Your Plan", "Here's the plan that fits this home. You can tailor it before you join.", '<div class="plan-stack">' + cards + '</div>' + (foundingFull() ? afterFoundingBlock(liveMonthly(k)) : ''), nextBtn("Continue To Billing", true));
  }

  /* 6. Billing: founding 2-for-1 annual preselected vs monthly. Deck card 3: A segmented control, B stacked cards. */
  function obBilling() {
    var plan = obPlan(), t = P.tiers[S.tier];
    var an = (function () { var s = S.plan; S.plan = "founding"; var r = obBill(); S.plan = s; return r; })();
    var mo = (function () { var s = S.plan; S.plan = "monthly"; var r = obBill(); S.plan = s; return r; })();
    var aSel = plan === "founding";
    var annualCopy = "Pay one year of your " + esc(t.label) + " plan" + (an.addonsAnnual ? " and add-ons" : "") + ", get two years of care.";
    var monthlyCopy = "First charge today, then on this date each month." + (foundingOpen() ? " Switch to annual and get 2 years for the price of 1." : (foundingFull() ? " Or prepay 12 months at 10% off your monthly price." : ""));
    var addNote = an.addonsAnnual ? " Includes add-ons " + money(an.addonsAnnual) + "/yr, also 2 years for the price of 1." : "";
    function annualCard(sel, withDue) {
      return '<div class="bill-card' + (sel ? " sel" : "") + '"' + (OB_STYLE.billing === "B" ? ' role="radio" tabindex="0" aria-checked="' + sel + '" data-ob-bill="founding"' : '') + '><div class="bill-top"><p class="bill-name">Annual</p><span class="badge-found">Founding 2-For-1</span></div>' +
        '<p class="bill-lead">Founding Member: 2 Years For The Price Of 1</p><p class="bill-copy">' + annualCopy + '</p>' +
        (withDue ? '<div class="due-box in"><span class="k">Due Today</span><span class="v">' + money(an.today) + '</span></div>' : '') + '</div>';
    }
    function monthlyCard(sel) {
      return '<div class="bill-card' + (sel ? " sel" : "") + '"' + (OB_STYLE.billing === "B" ? ' role="radio" tabindex="0" aria-checked="' + sel + '" data-ob-bill="monthly"' : '') + '><div class="bill-top"><p class="bill-name">Monthly</p><span class="bill-amt">' + money(mo.perCharge) + '/mo</span></div><p class="bill-copy">' + monthlyCopy + '</p></div>';
    }
    var yr = (function () { var s = S.plan; S.plan = "annual"; var r = obBill(); S.plan = s; return r; })();
    var ySel = plan === "annual";
    function annualPrepayCard(sel, withDue) {
      return '<div class="bill-card' + (sel ? " sel" : "") + '"' + (OB_STYLE.billing === "B" ? ' role="radio" tabindex="0" aria-checked="' + sel + '" data-ob-bill="annual"' : '') + '><div class="bill-top"><p class="bill-name">Annual</p><span class="bill-amt">' + money(yr.today) + '</span></div>' +
        '<p class="bill-lead">Prepay 12 Months (10% Off Monthly)</p><p class="bill-copy">Pay ' + money(yr.today) + ' today for 12 months, 10% off your monthly price of ' + money(yr.perCharge) + '/mo.</p>' +
        (withDue ? '<div class="due-box in"><span class="k">Due Today</span><span class="v">' + money(yr.today) + '</span></div>' : '') + '</div>';
    }
    var moDue = '<div class="due-box"><span class="k">Due Today</span><span class="v">' + money(mo.perCharge) + '</span></div>';
    var body;
    if (foundingFull()) {
      /* Founding 50 filled: monthly or 10% annual prepay. Hidden today (FOUNDING_FULL=false). */
      var aOn = ySel;
      if (OB_STYLE.billing === "B") {
        body = '<div class="bill-stack" role="radiogroup" aria-label="How to pay">' + annualPrepayCard(aOn, true) + monthlyCard(!aOn) + '</div>';
      } else {
        body = '<div class="seg-toggle" role="radiogroup" aria-label="How to pay"><button type="button" role="radio" class="mw-hover' + (aOn ? " on" : "") + '" aria-checked="' + aOn + '" data-ob-bill="annual">Annual<span class="seg-badge">10% Off</span></button><button type="button" role="radio" class="mw-hover' + (!aOn ? " on" : "") + '" aria-checked="' + !aOn + '" data-ob-bill="monthly">Monthly</button></div><div class="gap-md"></div>' +
          (aOn ? annualPrepayCard(true, false) + '<div class="gap-md"></div><div class="due-box"><span class="k">Due Today</span><span class="v">' + money(yr.today) + '</span></div>' : monthlyCard(true) + '<div class="gap-md"></div>' + moDue);
      }
    } else if (!foundingOpen()) {
      /* Founding closed without FOUNDING_FULL: monthly only. */
      body = monthlyCard(true) + '<div class="gap-md"></div>' + moDue;
    } else if (OB_STYLE.billing === "B") {
      body = '<div class="bill-stack" role="radiogroup" aria-label="How to pay">' + annualCard(aSel, true) + monthlyCard(!aSel) + '</div>';
    } else {
      body = '<div class="seg-toggle" role="radiogroup" aria-label="How to pay"><button type="button" role="radio" class="mw-hover' + (aSel ? " on" : "") + '" aria-checked="' + aSel + '" data-ob-bill="founding">Annual<span class="seg-badge">Limited Offer</span></button><button type="button" role="radio" class="mw-hover' + (!aSel ? " on" : "") + '" aria-checked="' + !aSel + '" data-ob-bill="monthly">Monthly</button></div><div class="gap-md"></div>' +
        (aSel ? annualCard(true, false) + '<div class="gap-md"></div><div class="due-box"><span class="k">Due Today</span><span class="v">' + money(an.today) + '</span></div>' : monthlyCard(true) + '<div class="gap-md"></div>' + moDue);
    }
    body += '<p class="due-note">' + (foundingFull() && ySel ? ("Prepay 12 months for " + money(yr.today) + " (10% off your monthly price of " + money(yr.perCharge) + "/mo).")
      : aSel ? "One year at your " + esc(t.label) + " price of " + money(an.monthly) + "/mo, for two years of care." + addNote + " Monthly is the other choice, charged today and then each month."
      : "Charged today, then on this date each month." + (mo.addonsMonthly ? " Includes add-ons " + money(mo.addonsMonthly) + "/mo." : "")) + '</p>';
    var help = foundingOpen() ? "Founding members get two years for the price of one, while spots last. " + (aSel ? "Annual is selected." : "Monthly is selected.") : (foundingFull() ? (ySel ? "Annual is selected." : "Monthly is selected.") : "Pay monthly. Your first charge is today.");
    if (foundingFull()) body += afterFoundingBlock(mo.perCharge);
    return obShell("billing", "doc", 2, "How Would You Like To Pay?", help, body, nextBtn("Continue To Access", true));
  }

  /* 7. Access */
  function obAccess() {
    var a = S.access || {};
    var body = '<div class="qt-grid two" data-ptr-ignore>' + ACCESS_OPTS.map(function (o, k) {
        var on = a.how === o[0];
        return '<button type="button" class="qt chkt mw-hover t' + (k % 4) + (on ? " sel" : "") + '" data-ob-access="' + o[0] + '" aria-pressed="' + on + '"><span class="qt-ic">' + I(o[2], "sm") + '</span><span class="qt-lab">' + o[1] + '</span>' + (on ? '<i class="qt-ok" aria-hidden="true"></i>' : '') + '</button>';
      }).join("") + '</div>' +
      '<label class="fl" for="obAccessNote">Anything We Should Know? (Optional)</label><textarea id="obAccessNote" rows="3" placeholder="Pets, a gate, where the lockbox is">' + esc(a.note || "") + '</textarea>' +
      '<p class="priced-note">Lockbox and door codes go in your member app, not here.</p>';
    return obShell("access", "house", 0, "How Should We Get In?", "You don't need to be home. You can leave a lockbox or a door code, or meet us there.", body, nextBtn("Next", !!a.how));
  }

  /* 8. Start Date: date picker, earliest two days out, with the Legal-approved First Visit blurb. */
  function obStart() {
    var d = S.firstVisit && S.firstVisit >= minStart() ? S.firstVisit : "";
    var body = '<p class="fl" id="obDateL">First Visit Date</p>' + obCalendar(d) +
      '<div class="price-confirm ob-blurb"><b>Your First Visit</b><br>' + FIRST_VISIT_BLURB + '</div>' +
      '<p class="priced-note">Your membership starts on this visit.' + "" + ' We confirm the time by text.</p>';
    return obShell("start", "clock", 1, "When Should We Start?", "Pick the day for your first visit.", body, nextBtn("Next", !!d));
  }

  /* Sunday-first month calendar (Machan's standing rule), replacing the native date picker. Earliest day is minStart(); up to 12 months ahead. */
  var CAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function ymShift(ym, d) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + d; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + "-" + String(m + 1).padStart(2, "0"); }
  function obCalendar(sel) {
    var min = minStart(), minYm = min.slice(0, 7), maxYm = ymShift(minYm, 12);
    var ym = /^\d{4}-\d{2}$/.test(S._calMonth || "") ? S._calMonth : (sel || min).slice(0, 7);
    if (ym < minYm) ym = minYm; if (ym > maxYm) ym = maxYm;
    var y = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1, lead = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate(), cells = "";
    for (var i = 0; i < lead; i++) cells += '<span class="cal-x" aria-hidden="true"></span>';
    for (var dd = 1; dd <= days; dd++) {
      var iso = localISO(new Date(y, mo, dd)), dis = iso < min, on = iso === sel;
      cells += '<button type="button" class="cal-d mw-hover' + (on ? " on" : "") + '" data-ob-day="' + iso + '" aria-label="' + esc(longDate(iso)) + '" aria-pressed="' + on + '"' + (dis ? " disabled" : "") + '>' + dd + '</button>';
    }
    function nav(d, lab, dis, path) { return '<button type="button" class="cal-nav mw-hover" data-ob-cal="' + d + '" aria-label="' + lab + '"' + (dis ? " disabled" : "") + '><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="' + path + '" fill="none" stroke="#A8431F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'; }
    return '<div class="ob-cal" role="group" aria-labelledby="obDateL obCalT"><div class="cal-top">' + nav(-1, "Previous Month", ym <= minYm, "M15 5l-7 7 7 7") + '<p class="cal-t" id="obCalT">' + CAL_MONTHS[mo] + " " + y + '</p>' + nav(1, "Next Month", ym >= maxYm, "M9 5l7 7-7 7") + '</div>' +
      '<div class="cal-wk" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="cal-grid">' + cells + '</div>' +
      (sel ? '<p class="cal-pick" aria-live="polite">' + esc(longDate(sel)) + '</p>' : '') + '</div>';
  }

  /* 9. Accept: recap, contact, code, agreement, signature, payment. Deck card 4: A compact recap line, B itemized. */
  function accessLabel() { var a = (S.access || {}).how; var o = ACCESS_OPTS.filter(function (x) { return x[0] === a; })[0]; return o ? (a === "home" ? "Home For Visits" : o[1] + " Access") : ""; }
  function obAccept() {
    var b = obBill(), t = P.tiers[S.tier], su = S.signup || {}, a = S.answers;
    var start = S.firstVisit ? longDate(S.firstVisit) : "";
    var billTxt = b.plan === "monthly" ? "Monthly" : (b.plan === "annual" ? "Annual · 10% Off" : "Annual · Founding 2-For-1");
    var dueK = "Due Today", dueV = money(b.today);
    var adds = selectedFunnelAddons();
    var recap;
    if (OB_STYLE.accept === "B") {
      var rows = [["Plan", esc(t.label) + " · " + money(b.monthly) + "/mo"]];
      var aoBits = extraTags().concat(adds.map(function (x) { return esc(x.label) + " " + aoPrice(x); }));
      if (aoBits.length) rows.push(["Add-Ons", aoBits.join("<br>")]);
      rows.push(["Billing", billTxt], ["Start Date", start], ["Access", esc(accessLabel())]);
      rows.push([dueK, dueV]);
      recap = '<div class="item-card">' + rows.map(function (r, i) { return '<div class="item-row' + (i === rows.length - 1 ? " total" : "") + (String(r[1]).length > 28 ? " stack" : "") + '"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>'; }).join("") +
        '<p class="price-confirm">' + PRICE_CONFIRM + '</p></div>';
    } else {
      var bits = [esc(planTag()), money(b.monthly) + "/mo", billTxt, start ? "Starts " + start : "", esc(accessLabel())].concat(adds.map(function (x) { return "+ " + esc(x.label); })).filter(Boolean);
      recap = '<div class="accept-compact"><p class="accept-line">' + bits.join(" · ") + '</p><p class="accept-due"><span>' + dueK + '</span><b>' + dueV + '</b></p><p class="price-confirm">' + PRICE_CONFIRM + '</p></div>';
    }
    var hasRef = !!(S.referralCodeIn || su.referralCodeIn);
    function fe(id) { return '<p class="ferr" id="e-' + id + '" aria-live="polite"></p>'; }
    /* Charge-consent text, verbatim. Founding 24-month: Legal review Nov 11. Monthly and full-price annual: Legal Nov 12 (beta uses 'due today' until PAYMENTS_LIVE). */
    var consent = b.plan === "monthly" ? monthlyConsent(b.perCharge)
      : (b.plan === "annual" ? annualConsent(b.today)
      : foundingConsent(b.today));
    /* Guard (Legal, Nov 11): no sign-ups until the Member Agreement is published and AGREEMENT.url is set. */
    var open = !!AGREEMENT.url;
    var agreeLink = AGREEMENT.url ? '<a class="link mw-hover" href="' + esc(AGREEMENT.url) + '" target="_blank" rel="noopener">Read The Member Agreement</a>'
      : '<span class="ob-slot" data-agreement-slot="' + AGREEMENT.id + '@' + AGREEMENT.rev + '">Member Agreement · Link Coming Soon</span>';
    var body = recap +
      '<form id="obF" novalidate class="stack ob-accept-form">' +
      '<div class="card"><h3>Your Details</h3>' +
      '<label class="fl" for="sName">Full Name</label>' + fe("sName") + '<input id="sName" type="text" autocomplete="name" value="' + esc(su.name || "") + '">' +
      '<label class="fl" for="sPhone">Phone</label>' + fe("sPhone") + '<input id="sPhone" type="tel" autocomplete="tel" placeholder="Add Phone" value="' + esc(su.phone || "") + '">' +
      '<label class="fl" for="sEmail">Email</label>' + fe("sEmail") + '<input id="sEmail" type="email" autocomplete="email" placeholder="Add Email" value="' + esc(su.email || "") + '">' +
      '<p class="small ob-addr"><span>Service Address</span><b>' + esc((a.street || "") + ", " + (a.zipcode || "")) + '</b><button type="button" class="link mw-hover" data-ob-go="address">Edit</button></p>' +
      '<p class="su-havecode"><button type="button" class="link mw-hover" id="haveCode" aria-expanded="' + hasRef + '"' + (hasRef ? ' hidden' : '') + '>Have A Code?</button></p>' +
      '<div id="refWrap"' + (hasRef ? '' : ' hidden') + '><label class="fl" for="sRef">Refer A Neighbor Code</label><input id="sRef" type="text" autocomplete="off" autocapitalize="characters" placeholder="SU-HOME-1234" value="' + esc(S.referralCodeIn || su.referralCodeIn || "") + '"><p class="small ref-check" id="refCheck" aria-live="polite"></p></div></div>' +
      '<div class="card"><h3>Member Agreement</h3><p class="small">' + agreeLink + '</p>' +
      (paymentsLive() ? '' : ('<div class="beta-pay-notice" data-beta-pay><h3>' + BETA_PAY_TITLE + '</h3><p>' + BETA_PAY_BODY + '</p></div>')) +
      '<label class="checkrow"><input type="checkbox" id="agree"><span>I have read and agree to the Smart Upkeep Member Agreement, including the arbitration agreement and class action waiver. I can opt out of arbitration within 30 days.</span></label>' + fe("agree") +
      '<label class="checkrow"><input type="checkbox" id="chargeOk"><span>' + consent + '</span></label>' + fe("chargeOk") +
      '<p class="fl">Signature</p>' + sigBlock("agreeSig") + fe("agreeSig") + '</div>' +
      (paymentsLive() ? ('<div class="card paybox"><h3>' + I("shield", "xs") + ' Payment</h3>' +
      '<fieldset style="border:0;padding:0;margin:0"><label class="fl">Card Number</label><input type="text" placeholder="•••• •••• •••• ••••" autocomplete="off"><div class="grid2"><div><label class="fl">Expiry</label><input type="text" placeholder="MM / YY" autocomplete="off"></div><div><label class="fl">CVC</label><input type="text" placeholder="•••" autocomplete="off"></div></div></fieldset></div>') :
        /* Finish deck #19: muted Payment box until sign-up opens (no card fields, per Legal's beta copy) */
        '<div class="card paybox paybox-soon" aria-disabled="true"><h3>' + I("shield", "xs") + ' Payment</h3><p class="small muted">Opens Soon</p></div>') +
      '<button class="btn btn-primary btn-big mw-hover" type="submit"' + (open ? '' : ' disabled aria-disabled="true" aria-describedby="obSoon"') + '>' + (paymentsLive() ? ("Accept And Pay " + money(b.today)) : "Join Now") + '</button>' +
      (open ? '' : '<p class="small muted ob-soon" id="obSoon">Sign-up opens soon.</p>') +
      '<p class="su-cancel-line small"><a href="#cancel" class="link mw-hover">Cancel Anytime, No Fee</a></p></form>';
    return obShell("accept", "pen", 3, "Join " + esc(t.label), "A recap of your plan, billing and start date.", body, "");
  }

  function obRender(s) {
    if (s === "address") return obAddress();
    if (s === "systems2") return obSystems2();
    if (s === "systems") { ["furnaces", "acs", "waterHeaters"].forEach(function (k) { if (S.answers[k] === undefined || S.answers[k] === "unsure") S.answers[k] = String(BASE_SET[k]); }); S.answers.whTypes = whTypes(); return obSystems(); }
    if (s === "addons") return obAddons();
    if (s === "plan") return obPlanScreen();
    if (s === "billing") return obBilling();
    if (s === "access") return obAccess();
    if (s === "start") return obStart();
    return obAccept();
  }
  function obNextOf(s) { var i = OB.indexOf(s); return OB[Math.min(OB.length - 1, i + 1)]; }
  function bindOb(s) {
    function rer() { save(); var y = window.scrollY; render(); window.scrollTo(0, y); }
    var nx = app.querySelector("[data-ob-next]");
    app.querySelectorAll("[data-ob-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-ob-go")); }); });
    if (s === "address") {
      var st = document.getElementById("obStreet"), zp = document.getElementById("obZip"), er = document.getElementById("obAddrErr");
      function upd() { S.answers.street = st.value; S.answers.zipcode = zp.value.replace(/\D/g, "").slice(0, 5); S.answers.zip = (S.answers.street.trim() + " " + S.answers.zipcode).trim(); er.textContent = ""; if (nx) nx.disabled = !addrOk(); save(); }
      st.addEventListener("input", upd); zp.addEventListener("input", function () { upd(); if (S._outZip && S._outZip !== S.answers.zipcode) { var w = app.querySelector(".ob-wait"); if (w) w.remove(); } });
      [st, zp].forEach(function (el) { el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (el === zp) st.focus(); else if (nx && !nx.disabled) nx.click(); } }); });
      if (nx) nx.addEventListener("click", function () {
        upd();
        if (!addrOk()) { er.textContent = "Enter your street address and 5-digit ZIP."; return; }
        if (!inArea(S.answers.zipcode)) { S._outZip = S.answers.zipcode; save(); render(); return; }
        S._outZip = ""; go("systems");
      });
      app.querySelectorAll("[data-ob-step]").forEach(function (b) { b.addEventListener("click", function () {
        var kv = b.getAttribute("data-ob-step").split(":"), d = Number(kv[1]);
        if (kv[0] === "sqft") { var si = -1; SIZE_OPTS.forEach(function (o, k) { if (o[0] === String(S.answers.sqft)) si = k; }); si = si < 0 ? 0 : Math.max(0, Math.min(SIZE_OPTS.length - 1, si + d)); S.answers.sqft = SIZE_OPTS[si][0]; }
        else { var n = Number(S.answers.stories) || 0; n = n ? Math.max(1, Math.min(3, n + d)) : 1; S.answers.stories = String(n); }
        rer(); }); });
      return;
    }
    if (s === "systems" || s === "systems2") {
      app.querySelectorAll("[data-ob-step]").forEach(function (b) { b.addEventListener("click", function () {
        var kv = b.getAttribute("data-ob-step").split(":"), n = Math.max(0, Math.min(SYS_MAX, cnt(kv[0]) + Number(kv[1])));
        S.answers[kv[0]] = String(n); if (kv[0] === "waterHeaters") S.answers.whTypes = whTypes(); rer(); }); });
      app.querySelectorAll("[data-ob-wh]").forEach(function (b) { b.addEventListener("click", function () {
        var kv = b.getAttribute("data-ob-wh").split(":"), t = whTypes(); t[Number(kv[0])] = kv[1]; S.answers.whTypes = t; rer(); }); });
      app.querySelectorAll("[data-ob-extra]").forEach(function (b) { b.addEventListener("click", function () {
        var k = b.getAttribute("data-ob-extra"), cur = Array.isArray(S.answers.extras) ? S.answers.extras.slice() : [], ix = cur.indexOf(k);
        if (ix > -1) cur.splice(ix, 1); else cur.push(k); S.answers.extras = cur; syncSharedExtras("extras"); rer(); }); });
      if (nx) nx.addEventListener("click", function () { if (s === "systems") return go("systems2"); if (S.tailor) { S.tailor = false; S._tailorSnap = null; go("plan"); } else go("addons"); });
      var un = app.querySelector("[data-ob-undo]");
      if (un) un.addEventListener("click", function () {
        try { var sn = JSON.parse(S._tailorSnap || "null"); if (sn) { S.answers = sn.answers || {}; S.addons = sn.addons || []; S.tier = sn.tier || S.tier; } } catch (e) {}
        S.tailor = false; S._tailorSnap = null; go("plan");
      });
      return;
    }
    if (s === "addons") {
      app.querySelectorAll("[data-ob-ao-tab]").forEach(function (b) { b.addEventListener("click", function () {
        S._aoTab = b.getAttribute("data-ob-ao-tab"); rer(); }); });
      app.querySelectorAll("[data-ob-ao]").forEach(function (b) { b.addEventListener("click", function () {
        var id = b.getAttribute("data-ob-ao"); S.addons = Array.isArray(S.addons) ? S.addons.slice() : []; var ix = S.addons.indexOf(id);
        if (ix > -1) S.addons.splice(ix, 1); else S.addons.push(id); syncSharedExtras("addons"); logAddon(ix > -1 ? "untap" : "tap", id, "onboarding-addons"); rer(); }); });
      app.querySelectorAll("[data-ob-ao-open]").forEach(function (b) { b.addEventListener("click", function () { var id = b.getAttribute("data-ob-ao-open"); S._aoOpen = S._aoOpen === id ? null : id; rer(); }); });
    }
    if (s === "plan") {
      app.querySelectorAll("[data-ob-tier]").forEach(function (b) { if (b.classList.contains("sel")) return; b.addEventListener("click", function () { S.tier = b.getAttribute("data-ob-tier"); rer(); }); });
      var tl = app.querySelector("[data-ob-tailor]"); if (tl) tl.addEventListener("click", function () { S._tailorSnap = JSON.stringify({ answers: S.answers, addons: S.addons || [], tier: S.tier }); S.tailor = true; go("systems"); });
      if (!bindOb._quoted) { bindOb._quoted = 1; try { window.SUEvents && SUEvents.emit("quote.generated", "site", { payload: { tier: P.tiers[S.tier].label } }); } catch (x) {} }
    }
    if (s === "billing") {
      app.querySelectorAll("[data-ob-bill]").forEach(function (b) {
        function pick() { S.plan = b.getAttribute("data-ob-bill"); rer(); }
        b.addEventListener("click", pick); b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
    }
    if (s === "access") {
      app.querySelectorAll("[data-ob-access]").forEach(function (b) { b.addEventListener("click", function () { S.access = Object.assign({}, S.access, { how: b.getAttribute("data-ob-access"), note: val("obAccessNote") }); rer(); }); });
      var nt = document.getElementById("obAccessNote"); if (nt) nt.addEventListener("input", function () { S.access = Object.assign({}, S.access, { note: nt.value }); save(); });
    }
    if (s === "start") {
      app.querySelectorAll("[data-ob-day]").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-ob-day"); if (v < minStart()) return; S.firstVisit = v; S._calMonth = v.slice(0, 7); rer(); }); });
      app.querySelectorAll("[data-ob-cal]").forEach(function (b) { b.addEventListener("click", function () { var base = /^\d{4}-\d{2}$/.test(S._calMonth || "") ? S._calMonth : (S.firstVisit || minStart()).slice(0, 7); S._calMonth = ymShift(base, Number(b.getAttribute("data-ob-cal"))); rer(); }); });
    }
    if (s === "accept") { bindAccept(); return; }
    if (nx) nx.addEventListener("click", function () { go(obNextOf(s)); });
  }
  function bindAccept() {
    var sigs = {}; app.querySelectorAll("[data-sig]").forEach(function (r) { sigs[r.getAttribute("data-sig")] = setupSig(r); });
    function keep() { var ref = val("sRef"); S.referralCodeIn = ref; S.signup = Object.assign({}, S.signup, { name: val("sName"), phone: val("sPhone"), email: val("sEmail"), referralCodeIn: ref, address: (S.answers.street || "") + ", " + (S.answers.zipcode || "") }); }
    var hc = document.getElementById("haveCode"); if (hc) hc.addEventListener("click", function () { hc.hidden = true; hc.setAttribute("aria-expanded", "true"); document.getElementById("refWrap").hidden = false; document.getElementById("sRef").focus(); });
    /* Refer A Neighbor codes only. Format check here; the real check happens on our side. Reward lands at the neighbor's first payment (Machan Nov 11). */
    (function () { var r = document.getElementById("sRef"), o = document.getElementById("refCheck"); if (!r || !o) return; function chk() { var v = r.value.trim().toUpperCase(); if (!v) { o.textContent = ""; r.removeAttribute("aria-invalid"); return; } var ok = /^SU-[A-Z]{1,4}-\d{4}$/.test(v); o.textContent = ok ? "\u2713 Code looks right. You and your neighbor each get 1 free month once your first payment goes through. Free months have no cash value." : "Codes look like SU-HOME-1234."; o.className = "small ref-check " + (ok ? "ok" : "bad"); r.setAttribute("aria-invalid", ok ? "false" : "true"); } r.addEventListener("input", chk); chk(); })();
    ["sName", "sPhone", "sEmail", "sRef"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { keep(); save(); }); });
    document.getElementById("obF").addEventListener("submit", function (e) {
      e.preventDefault(); keep();
      if (!AGREEMENT.url) return;
      var s = S.signup, errs = [
        ["sName", !s.name ? "Enter full name." : ""],
        ["sPhone", !/\d{3}.*\d{3}.*\d{4}/.test(s.phone) ? "Enter phone number." : ""],
        ["sEmail", !/^\S+@\S+\.\S+$/.test(s.email) ? "Enter email." : ""],
        ["agree", !document.getElementById("agree").checked ? "Check the box to agree." : ""],
        ["chargeOk", !document.getElementById("chargeOk").checked ? "Check the box to OK the charge and auto-renewal." : ""],
        ["agreeSig", !sigs.agreeSig.valid() ? "Sign to accept." : ""]];
      var first = null;
      errs.forEach(function (x) { var el = document.getElementById("e-" + x[0]); if (el) el.textContent = x[1]; var f = document.getElementById(x[0]); if (f && f.setAttribute) f.setAttribute("aria-invalid", x[1] ? "true" : "false"); if (x[1] && !first) first = el; });
      if (first) { first.scrollIntoView({ block: "center" }); return; }
      var b = obBill();
      s.agreementSignature = sigs.agreeSig.value(); s.signedAt = new Date().toISOString(); s.tier = S.tier; s.planTag = planTag(); s.firstVisit = S.firstVisit; s.access = S.access;
      s.agreement = AGREEMENT.id + "@" + AGREEMENT.rev;
      s.totals = { plan: b.plan, label: b.label, today: b.today, perCharge: b.perCharge || 0, membershipAnnual: b.membershipAnnual, addonIds: (S.addons || []).slice(), termMonths: b.termMonths };
      if (!s.myReferralCode) s.myReferralCode = makeReferralCode(s.name);
      logAddon("purchase", (S.addons || []).slice(), "accept:" + S.tier);
      try { window.SUEvents && SUEvents.emit("signup.completed", "site", { member: s.name || "New member", payload: { plan: P.tiers[S.tier].label, tag: s.planTag, payment: b.plan, addons: (S.addons || []).length } }); } catch (x) {}
      go("confirm");
    });
  }
  var XT_ICO = { windows: "window", carpet: "brush", pressure: "spray", deck: "brush", chimney: "chimney", ducts: "duct", lights: "lights", radon: "radon", guttersExtra: "gutter", lmInteriorWindows: "window", lmScreens: "window", lmBulbs: "lights", lmLeakSensors: "bell", lmSumpBackup: "meter", lmHoodFilter: "spray", lmBathFan: "duct", lmThermostat: "furnace" };
  function tierKeys() { return (P.tierOrder || Object.keys(P.tiers)).filter(function (k) { return P.tiers[k]; }); }

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
    if (needsSiteVisit(a && a.label)) return "Needs A Site Visit";
    if (a.quoteRequired || !hasRealOncePrice(a)) return QUOTE_LABEL;
    if (a.price != null) return money(a.price);
    return money(a.annual) + (a.unit === "season" ? "/Season" : "");
  }
  /* B1/B2: monthly services show their +$X/mo (Irrigation +$19, Sump +$6, Humidifier +$6); one-time rows show a fixed price or Quote. Only fixed one-time prices are totaled. */
  function acItemPrice(a) { return (a && (a.fromExtras || a.gutter)) ? addMo(a) : oncePriceLabel(a); }
  function alacarte() {
    var bk = S.alacarteBooking || {};
    var list = selectedAlacarte();
    var total = alacarteTotal();
    var picks = '<div class="addons"><h3>Services</h3>' +
      renderAddonList(monthlyAddonCatalog(), S.alacarte || [], "alacarte", addMo, true) + '</div>' +
      '<div class="addons last-minute"><h3>Shop À La Carte: Quick Jobs</h3>' +
      
      renderAddonList(onceAddonCatalog(), S.alacarte || [], "alacarte", oncePriceLabel, true) + '</div>';
    return backBtn() + '<h1>Shop À La Carte</h1>' +
      
      picks +
      '<div class="running card"><h3>One-Time Total</h3>' +
      (list.length ? '<div class="price">' + (total ? money(total) + '<small> one-time</small>' : QUOTE_LABEL) + '</div><ul class="feat">' + list.map(function (x) { return '<li>' + esc(x.label) + ' · ' + acItemPrice(x) + '</li>'; }).join("") + '</ul>' : '<p class="muted" style="margin:0">Pick a Service</p>') +
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
      list.map(function (x) { return '<div><span>' + esc(x.label) + '</span><span>' + acItemPrice(x) + '</span></div>'; }).join("") +
      '<div><span>One-Time Total</span><span>' + (total ? money(total) : QUOTE_LABEL) + '</span></div>' +
      '<div><span>Preferred Dates</span><span>' + esc(bk.dates) + '</span></div>' +
      '<div><span>Contact</span><span>' + esc(bk.phone) + ' · ' + esc(bk.email) + '</span></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Next Steps</h3><ol class="feat"><li>We will confirm availability by phone or email within one business day.</li><li>No card is charged until we confirm your booking.</li><li>Want ongoing care instead? Memberships start at $139/Month.</li></ol></div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="toQuote" type="button">See Memberships</button><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }

  function confirm() {
    /* After Accept (Machan Oct 28 lock, updated Nov 11): next steps incl. how to log in. The start date was picked before Accept, so it is shown, not asked. */
    var su = S.signup || {}, t = su.totals || {}, fv = su.firstVisit || S.firstVisit || "";
    var email = su.email || "";
    try { localStorage.setItem("su.firstLoginWelcome", JSON.stringify({ at: new Date().toISOString(), name: su.name || "", email: email, tier: S.tier, plan: P.tiers[S.tier].label })); } catch (e) {}
    var paid = ['Paid Today', money(t.today || 0)];
    return homePill() + '<div class="check-big" aria-hidden="true">&#10003;</div><h1>You\'re In' + (su.name ? ", " + esc(su.name.split(" ")[0]) : "") + '</h1>' +
      '<p class="lead-sm">' + esc(P.tiers[S.tier].label) + ' is active. Here is what happens next, including how to log in.</p>' +
      '<div class="card qa-next"><h3>Next Steps</h3><ol class="qa-steps">' +
      '<li><strong>Log In To Your Member App</strong><span>Open <a class="link" href="member/">smartupkeep.ai/member</a>. Use the email you just gave us' + (email ? ' <span class="cf-email">(<strong>' + esc(email) + '</strong>)</span>' : '') + ' and the password from your welcome email.</span></li>' +
      '<li><strong>Read Your Welcome Message</strong><span>The first time you sign in, Ask Anything opens with a welcome from your care team.</span></li>' +
      '<li><strong>Your First Visit' + (fv ? ': ' + esc(longDate(fv)) : '') + '</strong><span>We confirm the time by text. ' + FIRST_VISIT_BLURB + '</span></li>' +
      '<li><strong>Add Access Details</strong><span>Lockbox or door codes go in your member app.</span></li>' +
      '</ol></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Summary</h3>' +
      '<div class="summary"><div><span>Membership</span><span>' + esc(su.planTag || planTag()) + '</span></div><div><span>Service Address</span><span>' + esc(su.address) + '</span></div><div><span>Billing</span><span>' + esc(t.label || "") + '</span></div>' +
      (function () {
        var ids = t.addonIds || S.addons || [];
        var list = monthlyAddonCatalog().concat(onceAddonCatalog()).filter(function (a) { return ids.indexOf(a.id) > -1 && !(a.gutter && gutterIncluded()); });
        return list.map(function (x) { return '<div><span>Add-On: ' + esc(x.label) + '</span><span>' + aoPrice(x) + '</span></div>'; }).join("");
      })() +
      '<div><span>' + paid[0] + '</span><span>' + paid[1] + '</span></div><div><span>Signed</span><span>Member Agreement</span></div></div></div>' +
      (function () {
        var code = (su.myReferralCode || makeReferralCode(su.name));
        if (!su.myReferralCode) { su.myReferralCode = code; S.signup = su; try { save(); } catch (e) {} }
        var shareText = "Join Smart Upkeep with my code " + code + ". We each get a free month once your first payment goes through. " + (location.origin + location.pathname);
        return '<div class="card referral-card" style="margin-top:1rem">' +
          '<h3>Refer A Neighbor</h3>' +
          '<p class="muted">You both get a month free when your neighbor makes their first payment. Free months have no cash value.</p>' +
          '<p class="ref-code" id="myRefCode">' + esc(code) + '</p>' +
          '<div class="btn-row">' +
          '<button type="button" class="btn btn-primary mw-hover" data-copy-ref="1">Copy Code</button>' +
          '<button type="button" class="btn btn-outline mw-hover" data-share-ref="1">Share Invite</button>' +
          '</div>' +
          '<p class="small muted" style="margin:.6rem 0 0" id="refCopyMsg"></p>' +
          '<p class="hide" id="refShareText">' + esc(shareText) + '</p></div>';
      })() +
      myHomeCard(su) +
      '<div class="btn-row"><a class="btn btn-primary btn-big mw-hover" href="member/">Open Member Login</a><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }

  /* Plans & Pricing Deck note (Oct 14): a picture of the member's house after sign-up. Placeholder drawing for now; real street or satellite photo from the address is a follow-up. */
  function myHomeCard(su) {
    return '<div class="card my-home-card" style="margin-top:1rem"><h3>Your Home</h3>' +
      '<div class="mh-pic" role="img" aria-label="Your home"><svg viewBox="0 0 320 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="160" fill="#EEF2E8"/><rect y="118" width="320" height="42" fill="#CFE0BF"/><path d="M0 132h320" stroke="#B8B2A7" stroke-width="10"/><path d="M110 118V74l50-36 50 36v44z" fill="#fff" stroke="#1f1b17" stroke-width="2"/><path d="M100 80l60-46 60 46" fill="none" stroke="#A8431F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="148" y="90" width="24" height="28" fill="#A8431F"/><rect x="122" y="84" width="18" height="16" fill="#CFE6EE" stroke="#1f1b17"/><rect x="180" y="84" width="18" height="16" fill="#CFE6EE" stroke="#1f1b17"/></svg></div>' +
      '<p style="margin:.6rem 0 0"><strong>' + esc(su.address || "Your Address") + '</strong></p></div>';
  }

  /* Add-on event log: placeholder until real analytics. Local only, capped at 500 events. */
  var EVKEY = "smartUpkeep.addonEvents";
  function logAddon(type, ids, ctx) {
    try { if (window.SUEvents && /tap|accepted/.test(type)) SUEvents.emit("addon.clicked", "site", { payload: { action: type, addon: ids, where: ctx } }); } catch (x) {}
    ids = [].concat(ids || []).filter(Boolean); if (!ids.length) return;
    var ev = { t: new Date().toISOString(), type: type, ids: ids, ctx: ctx || "" };
    try { var a = JSON.parse(localStorage.getItem(EVKEY) || "[]"); a.push(ev); if (a.length > 500) a = a.slice(-500); localStorage.setItem(EVKEY, JSON.stringify(a)); } catch (e) {}
    try { console.info("[addon-event]", ev); } catch (e) {}
    if (type === "tap" || type === "offer_accepted") quotePing(ids, ctx);
  }
  /* Quote ping: quoteRequired picks → window.MWQuotePing / mw:quote_request (wired by su-pings.js). */
  function quotePing(ids, ctx) {
    var all = (P.addons || []).concat(P.lastMinute || []);
    var q = ids.filter(function (id) { return all.some(function (a) { return a.id === id && a.quoteRequired; }); });
    if (!q.length) return;
    var ev = { t: new Date().toISOString(), type: "quote_request", ids: q, ctx: ctx || "" };
    try { var a = JSON.parse(localStorage.getItem(EVKEY) || "[]"); a.push(ev); localStorage.setItem(EVKEY, JSON.stringify(a.slice(-500))); } catch (e) {}
    try { console.info("[quote-ping]", ev); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("mw:quote_request", { detail: ev })); } catch (e) {}
    try { if (typeof window.MWQuotePing === "function") window.MWQuotePing(ev); } catch (e) {}
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
    document.body.classList.toggle("on-qf", isOb(s));
    document.body.classList.toggle("on-ob", isOb(s));
    var tb = document.querySelector(".topbar"); if (tb) document.documentElement.style.setProperty("--tb", tb.offsetHeight + "px");
    if (isOb(s)) bindOb(s);
    if (s === "alacarte") {
      var seen = []; app.querySelectorAll("[data-alacarte]").forEach(function (b) { seen.push(b.getAttribute("data-alacarte")); });
      if (!bind._viewed) bind._viewed = {};
      if (!bind._viewed[s]) { bind._viewed[s] = 1; logAddon("view", seen, s); }
      bindAlacarte();
    }
    if (s === "confirm") bindReferralShare();
  }
  function act(a) {
    if (a === "back") return back();
    if (a === "home") return go("home");
    if (a === "dismissResume") { S = fresh(); save(); render(); return; }
    if (a === "startOver") { S = fresh(); save(); return go(OB[0]); }
    if (a === "resume") { var r = S.resume; return go(r && r !== "home" ? r : OB[0]); }
    if (a === "start") { try { window.SUEvents && SUEvents.emit("scan.started", "site", {}); } catch (x) {} }
    if (a === "start") { var sc = app.querySelector("#row-plans .hm-plan.sel"); if (sc && P.tiers[sc.getAttribute("data-tier")]) S.tier = sc.getAttribute("data-tier"); return go(OB[0]); }
    if (a === "watch") return openVideo(true);
    if (a === "toQuote") return go(OB[0]);
    if (a === "alacarte") return go("alacarte");
    if (a === "restart") { S = fresh(); S.resume = null; save(); render(); window.scrollTo(0, 0); }
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

  /* ---------- Video modal ---------- */
  var modal = document.getElementById("videoModal"), vid = document.getElementById("explainer"), unmute = document.getElementById("unmuteBtn");
  /* V7 official (= V6.2, Max 10:49 ICT Oct 16, 50.5s). Rollback to V6: v7 -> v6 (and ?v=v7a -> ?v=v6a) here and in the poster line below (V6 and V5 files kept). */
  function vSrc() { return suPortrait() ? "video/explainer-v7-9x16.mp4?v=v7a" : "video/explainer-v7-16x9.mp4?v=v7a"; } /* Max Oct 15 19:03: 9:16 on phones/narrow/portrait, 16:9 on big screens; player shaped by .portrait */ /* V5 official (Max OK Oct 15). Rollback to V4: video/explainer-v4-9x16.mp4 / explainer-v4-16x9.mp4 */
  /* Browsers block unmuted autoplay, so the video starts muted (speaker button + Sound arrow in video-pause.js). */
  function syncTfs() {} /* Max Oct 15 19:04: big Tap for Sound removed; speaker button + jungle arrow live in video-pause.js */
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
      badge.textContent = "Membership Starting at $139/Month";
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
  vid.addEventListener("ended", function () { closeVideo(); var pl = document.getElementById("row-plans"); if (pl) setTimeout(function () { hmJump(pl); }, 150); }); /* Funnel Deck: after the video, back to the home page plans */
  modal.addEventListener("click", function (e) { if (e.target === modal) closeVideo(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeVideo(); });

  /* ---------- Share ---------- */
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-share]"); if (b) doShare(b.parentNode.querySelector(".hm-share-msg")); });
  document.getElementById("shareBtn").addEventListener("click", function () { doShare(); });
  function doShare(mEl) {
    var url = location.origin + location.pathname, p = price(), msg = mEl || document.getElementById("shareMsg");
    var text = "Smart Upkeep: home maintenance membership for metro Detroit.";
    if (S.screen === "plan" || S.screen === "billing" || S.screen === "accept" || S.screen === "confirm") text += " Memberships start at $139/Month. My estimate: Essentials " + money(monthlyOf(p.silver)) + "/Month, Plus " + money(monthlyOf(p.gold)) + "/Month, Complete " + money(monthlyOf(p.platinum)) + "/Month.";
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
  /* Home section hash links (e.g. /#row-plans, /#acc-faq): jump with the same header offset once Home is rendered */
  function hmHash() { var h = location.hash.slice(1); if (!h || S.screen !== "home" || !/^[\w-]+$/.test(h)) return; var el = document.getElementById(h); if (!el || !el.closest(".hm")) return; if (el.tagName === "DETAILS") el.open = true; setTimeout(function () { hmJump(el, false); }, 50); }
  window.addEventListener("hashchange", hmHash);
  if (location.hash === "#start") { history.replaceState(null, "", location.pathname); if (!isOb(S.screen)) go(OB[0]); }
  document.getElementById("logoHome").addEventListener("click", function (e) { e.preventDefault(); if (S.screen !== "home") go("home"); else window.scrollTo({ top: 0, behavior: (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth" }); });

  /* Onboarding styles (Nov 11 redo) live in onboarding.css, loaded here so the locked index.html stays untouched. */
  window.SUFunnel = {
    annualPrepaidOf: annualPrepaidOf,
    liveMonthly: liveMonthly,
    afterFoundingPriceLine: afterFoundingPriceLine,
    monthlyConsent: monthlyConsent,
    annualConsent: annualConsent,
    foundingConsent: foundingConsent,
    setFlags: function (o) {
      if (o && "FOUNDING_FULL" in o) FOUNDING_FULL = !!o.FOUNDING_FULL;
      if (o && "PAYMENTS_LIVE" in o) PAYMENTS_LIVE = !!o.PAYMENTS_LIVE;
      if (o && "foundingOpen" in o) FOUNDING.open = !!o.foundingOpen;
      render();
    }
  };
    (function () { if (document.getElementById("obCss")) return; var l = document.createElement("link"); l.id = "obCss"; l.rel = "stylesheet"; l.href = "onboarding.css?v=ob11"; document.head.appendChild(l); })();
  function bootApp() {
    render();
    hmHash();
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
