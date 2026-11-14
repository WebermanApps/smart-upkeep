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
  function money(n) {
    n = Math.round((Number(n) || 0) * 100) / 100;
    if (Math.abs(n - Math.round(n)) < 1e-9) return "$" + Math.round(n).toLocaleString("en-US");
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cents(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  /* Machan Nov 14 10:43 ICT (Option B, "Spread across months"): yearly flats billed monthly = approved /yr ÷ 12, rounded DOWN to the cent (Legal Nov 14: $275/yr is $22.91/mo, never more than the shown yearly price; no true-up). Do not use monthlyOf (whole dollars) or cents() (which rounds half-up). */
  function monthlySpread(annual) { return Math.floor(Math.round((Number(annual) || 0) * 100) / 12) / 100; }
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
      if (!a || a.once || a.fromExtras || a.quoteRequired || !(a.annual > 0) || isApprovedFlatAnnual(a)) return;
      n += monthlyOf(a.annual);
    });
    return n;
  }
  /* Machan approved flat annual prices (Nov 13 10:04 PM ICT). Annual and founding still charge the approved /yr amount in Due Today. On monthly (Machan Nov 14, Option B) the same approved /yr is spread with monthlySpread() into the monthly price. */
  function addonsFlatAnnual() {
    return selectedFunnelAddons().reduce(function (sum, a) { return sum + (isApprovedFlatAnnual(a) ? (+a.annual || 0) : 0); }, 0);
  }
  function addonsFlatMonthly() {
    return selectedFunnelAddons().reduce(function (sum, a) { return cents(sum + (isApprovedFlatAnnual(a) ? monthlySpread(a.annual) : 0)); }, 0);
  }
  /* Machan Nov 13 11:00 PM: priced one-time add-ons (e.g. Water Leak Sensor $149) are charged in Due Today on every payment choice. Quote and range rows stay $0. */
  function addonsOnceToday() {
    return selectedFunnelAddons().reduce(function (sum, a) { return sum + (a.once ? serviceOncePrice(a) : 0); }, 0);
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
    extras = extras.filter(function (k) { return k !== "pool" && P.extras && P.extras[k]; });
    var addons = Array.isArray(S.addons) ? S.addons.slice() : [];
    addons = addons.filter(function (id) { return id !== "x_pool"; });
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

  /* What's Included Redo 04A (Machan Nov 12 2026): Sump Pump and Whole-House Humidifier stay included in every plan, so their +$6/mo add-ons are removed (5 monthly add-ons). */
  var SU_MONTHLY_ADDONS = ["Flat Roof Inspection And Clean","Irrigation System","Gutter Cleaning","Chimney Sweep","Generator Annual Service"];
  var INCLUDED_EXTRAS = { sump: 1, humidifier: 1 };
  /* MONEY CHANGE (flagged for Machan): on this page the sump and humidifier extras no longer add their $76/yr (about $6/mo) to plan quotes. pricing-config.js is not edited; /member/ pages still read the config. */
  /* Storm cap (Machan Nov 12: Complete storm checks "4 A Year"; Legal Nov 12 night). pricing-config.js is read-only without Machan's OK, so this page overrides its
     plan text at load, the same way HOME_KEYPOINTS does. /member/ pages still read pricing-config.js directly. */
  (function () {
    function swap(arr, from, to) { return (arr || []).map(function (x) { return x === from ? to : x; }); }
    var s = P && P.tiers && P.tiers.silver, pl = P && P.tiers && P.tiers.platinum;
    if (s) s.keyPoints = swap(s.keyPoints, "Roof Drone Inspection", "Roof Drone Inspection Once a Year");
    if (pl) {
      pl.keyPoints = swap(pl.keyPoints, "Storm Checks After Major Storms", "After-Storm Checks, Up To 4 A Year");
      pl.features = swap(pl.features, "Storm checks after major storms", "After-storm checks after major storms, up to 4 a year").map(function (f) {
        return f.indexOf("Roof Drone Inspection twice a year and after major storms:") === 0 ? "Roof Drone Inspection twice a year, plus a drone roof check with each After-Storm Check:" + f.slice(f.indexOf(":") + 1) : f; });
    }
  })();
  Object.keys(INCLUDED_EXTRAS).forEach(function (k) { if (P && P.extras && P.extras[k]) P.extras[k] = { label: P.extras[k].label, all: 0, included: true, note: "Included in every plan" }; });
  var SU_ONCE_ADDONS = ["Furnace Tune-Up","AC Tune-Up","Exterior Window Washing","Christmas Lights Up And Down","Extra Gutter Cleaning","Extra Flat Roof Cleaning","Irrigation System Startup Or Shutdown","Chimney Sweep","Generator Annual Service","Radon Test","Water Leak Sensor Setup","Sump Pump Battery Backup","Bath Fans Clean And Check","Smart Thermostat Install","Lawn Mower Winterizing","Snowblower Tune-Up","Hose Bib Freeze Covers","Video Doorbell Install","Appliance Deep Clean","Lead And Water Test"];
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
        /* Item 50: keep pricing-config low/high ranges (Radon, Extra Gutter) off the Quote path. Explicit quoteRequired rows stay Quote. */
        var keepRange = once && !found.quoteRequired && !found.draft && hasConfigRange(out) && !(+out.price>0);
        if (!keepRange) {
          if(once && (out.price==null || out.quoteRequired) && out.quoteRequired!==false && out.price==null) out.quoteRequired=true;
          if(once && out.price==null) out.quoteRequired=true;
        }
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
      if(a && a.id===GUTTER_ID){ var g=gutterAnnual(); a.gutter=true; a.annual=g||null; a.quoteRequired=!g; a.label="Added Gutter Cleaning"; a.note="For homes with lots of trees and leaves."; }
      var v = flatRoofPerVisit();
      if(a && suClose(a.label, "Flat Roof Inspection And Clean")){
        a.flatRoof=true;
        /* Machan Nov 13 11:00 PM: the plan add-on is 2 visits a year, annual = visits x per visit (e.g. 2 stories, 1,500 sq ft = 2 x $225 = $450/yr). Quote only when stories or sq ft are unknown. */
        var fvN=(P.flatRoofPlanVisits!=null && +P.flatRoofPlanVisits>0) ? +P.flatRoofPlanVisits : 2;
        a.perVisit=v||null; a.annual=v ? fvN*v : null; a.quoteRequired=!v;
      }
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
  function homeSqft(){
    var sq=(S.answers||{}).sqft;
    if (sq==null || sq==="" || sq==="unsure") return null;
    var n=Number(sq);
    return (isFinite(n) && n>0) ? n : null;
  }
  /* Machan Nov 13 9:00 PM: per visit = base {1:150, 2:195, 3:240} by stories + $0.02 × home sq ft. Quote only when stories or sq ft are unknown. */
  function flatRoofPerVisit(){
    var st=Number((S.answers||{}).stories), sq=homeSqft(), base, rate;
    if (!(st>=1) || sq==null) return 0;
    base=(P.flatRoofVisit||{1:150,2:195,3:240})[Math.min(3,st)];
    rate=(P.flatRoofPerSqFt!=null && isFinite(+P.flatRoofPerSqFt)) ? +P.flatRoofPerSqFt : 0.02;
    if (base==null || !isFinite(+base)) return 0;
    return Math.round(+base + rate*sq);
  }
  function onceAddonCatalog(){
    var lm=(P.lastMinute||[]).map(function(a){ var o={}; for(var k in a) o[k]=a[k]; o.fromLastMinute=true; return o; });
    var pool=lm.concat(P.addons||[]);
    var rows=suCatalogByLabels(SU_ONCE_ADDONS, pool, true);
    var monthlyIds={};
    monthlyAddonCatalog().forEach(function(a){ if(a&&a.id) monthlyIds[a.id]=1; });
    rows.forEach(function(a,i){ if(!a.id) a.id="o_cur_"+i; a.once=true; if(monthlyIds[a.id]) a.id=a.id+"_once";
      /* r2: restore the draft/quoteRequired gate. Only Machan's approved flats (and already-bookable non-draft rows) show a price. */
      if (suClose(a.label, "Extra Flat Roof Cleaning")) {
        var fv = flatRoofPerVisit();
        if (fv) { a.price = fv; a.quoteRequired = false; a.draft = false; a.flatRoof = true; }
        else { a.price = null; a.quoteRequired = true; a.flatRoof = true; }
      } else if (isApprovedFlatOnce(a) && +a.price > 0) {
        a.quoteRequired = false;
        a.draft = false;
      } else {
        var ranged = !a.draft && !a.quoteRequired && !(+a.price>0) && hasConfigRange(a);
        if (ranged) { a.priceRange = true; a.price = null; }
        else if (a.draft || a.quoteRequired || !(+a.price>0)) { a.quoteRequired = true; a.price = null; }
      }
    }); /* B1: fixed, non-draft pricing-config prices show; ranged low/high show as a range; everything else stays Quote */
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
  /* Approved one-time / annual flats (Machan Nov 13 10:04 PM ICT). Draft and quoteRequired rows are not on this list. */
  var APPROVED_FLAT_ONCE = {
    "generator annual service": 1,
    "chimney sweep": 1,
    "radon test": 1,
    "lead and water test": 1,
    "snowblower tune-up": 1,
    "lawn mower winterizing": 1,
    "extra flat roof cleaning": 1
  };
  function isApprovedFlatOnce(a){ return !!(a && APPROVED_FLAT_ONCE[suNorm(a.label)]); }
  function isApprovedFlatAnnual(a){
    return !!(a && !a.once && !a.fromExtras && !a.gutter && !a.quoteRequired && a.annual!=null && isFinite(+a.annual) && +a.annual>0 && (
      suClose(a.label, "Generator Annual Service") || suClose(a.label, "Chimney Sweep") || suClose(a.label, "Flat Roof Inspection And Clean") || a.flatRoof
    ));
  }
  function yrLabel(annual){ return money(annual) + "/yr"; }
  /* Existing approved monthly add-ons only (Irrigation and similar extras, plus Essentials gutter). Introduced 93a1ea51 (Nov 12); do not monthlyOf newly approved flats. */
  function hasRealMonthly(a){
    return !!(a && (a.fromExtras || a.gutter) && a.annual!=null && a.annual!=="" && !a.quoteRequired && isFinite(+a.annual) && +a.annual>0 && !a.draft);
  }
  function hasRealOncePrice(a){
    return !!(a && a.price!=null && a.price!=="" && !a.quoteRequired && !a.draft && isFinite(+a.price) && +a.price>0);
  }
  function isPricedBookable(a){
    if (!a || needsSiteVisit(a.label)) return false;
    if (hasRealOncePrice(a)) return true;
    if (!a.quoteRequired && hasConfigRange(a)) return true;
    return false;
  }
  function hasConfigRange(a){
    return !!(a && a.low != null && a.high != null && isFinite(+a.low) && isFinite(+a.high) && +a.low > 0 && +a.high > 0);
  }
  function rangePriceLabel(a){
    var lo = +a.low, hi = +a.high;
    if (lo === hi) return money(lo);
    return money(Math.min(lo, hi)) + "\u2013" + money(Math.max(lo, hi));
  }
  function needsSiteVisit(label){
    var n=String(label||"").toLowerCase();
    return /window/.test(n)&&/wash/.test(n);
  }
  function addMo(a) {
    if (needsSiteVisit(a && a.label)) return "Needs A Site Visit";
    if (hasRealMonthly(a)) return "+" + money(monthlyOf(a.annual)) + "/mo";
    if (isApprovedFlatAnnual(a)) return (obPlan() === "monthly") ? ("+" + money(monthlySpread(a.annual)) + "/mo") : yrLabel(a.annual);
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
    linesSilver.push({ label: "We check your furnace filter every visit and change it when it's due.", amt: 0, est: false, note: "Included" });
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
    linesPlat.push({ label: "Roof drone inspections after major storms (up to 4 a year), with vent and ice dam clearing", amt: P.platinumRoofInspection, est: false });
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
  /* Funnel Drop-Off deck #01 A (Machan Nov 13 8:57 AM): browser Back goes to the previous step and keeps the picks. Each screen change pushes a history entry;
     popstate moves to that screen without clearing answers. The in-app Back pill uses the same history so the two never disagree. */
  function suHist(screen, replace) { try { var st = { su: 1, s: screen }; if (replace) history.replaceState(st, "", location.pathname + location.search); else history.pushState(st, "", location.pathname + location.search); } catch (e) {} }
  function go(screen) { if (typeof obSkip === "function" && obSkip(screen)) screen = obNextOf(screen); if (screen !== "home" && screen !== "confirm") S.resume = screen; else if (screen === "confirm") S.resume = null; var moved = S.screen !== screen; if (moved) { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); } S.screen = screen; save(); if (moved) suHist(screen, screen === "confirm"); render(); try { window.suTrackScreen && suTrackScreen(screen); } catch (x) {} window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function back() { if (history.state && history.state.su && S.path.length) { suBackPending = true; history.back(); setTimeout(function () { if (suBackPending) { suBackPending = false; backNow(); } }, 400); return; } backNow(); }
  var suBackPending = false;
  window.addEventListener("popstate", function (e) {
    suBackPending = false;
    var t = e.state && e.state.su ? e.state.s : "home";
    if (t === S.screen) return;
    if (S.screen === "confirm" && isOb(t)) { suHist("confirm", true); return; } /* B7: no Back into Accept after You're In */
    var ix = S.path.lastIndexOf(t);
    if (ix > -1) S.path = S.path.slice(0, ix); else { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); }
    S.screen = t; if (t !== "home" && t !== "confirm") S.resume = t; save(); render(); window.scrollTo(0, 0);
  });
  function backNow() { var p = S.path.pop(); while (p && obSkip(p)) p = S.path.pop(); S.screen = p || "home"; if (S.screen !== "home") S.resume = S.screen; save(); render(); window.scrollTo(0, 0); }
  /* B7: after You're In there is no Back into Accept; only the Home pill. */
  function homePill() { return '<span class="nav-pills">' + backBtn().replace(/^<span class="nav-pills">/, "").replace(/<button class="back back-pill[\s\S]*?<\/button>/, ""); }
  function backBtn() { return '<span class="nav-pills"><button class="back back-pill mw-hover" data-act="back" type="button"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="#C1502E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Back</button><button class="home-pill mw-hover" data-act="home" type="button" aria-label="Home"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.6V20h12V9.6" fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5.2h4V20" fill="none" stroke="#C1502E" stroke-width="2" stroke-linejoin="round"/></svg></button></span>'; }

  function render() {
    /* Nov 11 2026 onboarding redo: the old question screens, photos, free tech visit, compare, sign-up and pay screens are retired. Saved state on any of them lands on step 1. */
    if (/^(overview|q\d|choice|photos|visit|quote|extras|signup|pay)$/.test(S.screen)) S.screen = OB[0];
    if (S.screen === "basics") S.screen = "address"; if (S.resume === "basics") S.resume = "address"; /* Home Basics merged into step 1 (Nov 12) */
    if (S.screen === "access") S.screen = "start"; if (S.resume === "access") S.resume = "start"; /* Access step removed (Machan Nov 13 10:18 PM): resume on Start Date */
    S.path = S.path.filter(function (x) { return x === "home" || isOb(x) || /^(alacarte|alacarteConfirm|confirm|cancel)$/.test(x); });
    if (obSkip(S.screen)) S.screen = obNextOf(S.screen); if (obSkip(S.resume)) S.resume = obNextOf(S.resume);
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
    if (window.suHouse) { try { window.suHouse.sync(obHouseState()); } catch (x) {} } /* before bind(), so the one-screen fits (sfit*) measure with the house band in place */
    bind();
    if (window.suHouse && window.suHouse.fit) { try { window.suHouse.fit(); } catch (x) {} } /* house-build-1113: re-check the one-screen cut order after the step's own fits run */
    document.body.classList.toggle("on-home", s === "home"); document.body.classList.toggle("su-band", s === "home" || isOb(s)); /* Machan Nov 13 7:41 PM: Home header on every onboarding step */ document.documentElement.classList.toggle("su-home-snap", s === "home"); if (window.suBandSync) window.suBandSync();
    document.documentElement.classList.remove("su-boot"); /* Swatch QA F1: Share stays hidden until the first render */
    document.body.classList.toggle("on-accept", s === "accept");
    document.body.classList.toggle("on-ob", isOb(s));
    syncResumeMenu(s);
    try { document.title = isOb(s) && OB_NAME[s] ? OB_NAME[s] + " | Smart Upkeep" : (s === "confirm" ? "Thank You | Smart Upkeep" : "Smart Upkeep"); } catch (x) {}
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
  /* Home Four Sections deck (Machan Nov 12 2026, receipt 2007): 01A simple 2px chevron, 02B Title Case label + chevron, 03A bottom center of the section it leaves, 04A full screen. Tap lands the next title ~12px under the header (hmJump). */
  function hsArrow(target, label) { return '<button type="button" class="hs-arrow mw-hover" data-hs-go="' + target + '"><span class="hs-arrow-lab">' + label + '</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'; }
  /* Machan Nov 14 9:26 AM: a small quiet up arrow under Plans / Tailor / FAQ headers glides to the previous section. Home keeps only its down arrow. */
  function hsArrowUp(target) { return '<button type="button" class="hs-arrow hs-arrow-up mw-hover" data-hs-go="' + target + '" aria-label="Previous Section"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>'; }
  /* Four Sections 05 note (Machan: "with the more space we could show more lines, and not have to use the 'and more' so early on"): Home plan cards show more lines before And More. Legal-approved copy, Nov 12 2026 night (LEGAL-FINAL-COPY section 4). Home cards only; pricing-config.js keyPoints (also read by /member/ pages) stay unchanged. */
  var HOME_KEYPOINTS = { /* silver reads pricing-config.js keyPoints (Machan Nov 13 7:35-7:37 PM ICT); see homeKeypoints() */
    /* Machan Nov 13 11:09-11:11 PM ICT "6-8" real items per Plans preview (the lead line doesn't count): Plus and Complete show 7 services each,
       named once with the sheet's own labels and counts (PC_SUM). "add" = this plan's own pricing-config features (accent dot, "Added In {Plan}"
       key like the sheet); "inh" = services the plan includes from the plan below ("Everything in ..."), check mark. No new services. */
    gold: { add: ["Seasonal Visits ×4", "Drone Roof Inspection ×2", "Gutter Cleaning ×2", "Garage Door Tune-Up", "Water Softener Salt Top-Off"], inh: ["Furnace/AC Tune-Up", "Water Heater Flush/Descale"] },
    platinum: { add: ["Monthly Visits ×12", "After-Storm Checks, Up To 4 A Year", "Drone Roof Inspection ×2 + After Storms", "Vent And Ice Dam Clearing After Storms"], inh: ["Gutter Cleaning ×2", "Garage Door Tune-Up", "Furnace/AC Tune-Up"] }
  };
  /* Late build Nov 12 (Fill The Sections 02, Swatch pick B): existing lines only. 390: Essentials 10, Plus 5, Complete 4 (+ lead). 360x640: Essentials 4, Plus/Complete lead + 4. 1280+: Essentials 9. Always ends in And More. */
  function hsSmall() { return window.innerWidth <= 400 && window.innerHeight <= 700; }
  /* Machan Nov 13 7:35-7:37 PM ICT: Essentials and Plus tile lines come straight from pricing-config.js keyPoints (his order and wording; fridge
     filters moved into Essentials; Gutter Cleaning held on Plus until pricing is final, 8:42 PM). Essentials renders every keyPoint and pcFitLines()
     shows as many as fit (one-screen rule). Complete keeps HOME_KEYPOINTS (Legal storm-cap wording). */
  /* Plans Expand deck picks (Machan Nov 13 8:25 PM ICT): Plus peeks 22% at the right edge, the sheet grows from the tile, X close only, most lines that fit. */
  var PC_PEEK = 22;
  function homeKeypoints(k) {
    if (k === "silver") return ((P.tiers[k] && P.tiers[k].keyPoints) || []).filter(function (x) { return x !== "And More"; }).concat(["And More"]);
    if (HOME_KEYPOINTS[k] && HOME_KEYPOINTS[k].add) return HOME_KEYPOINTS[k].add.concat(HOME_KEYPOINTS[k].inh).concat(["And More"]);
    var src = HOME_KEYPOINTS[k] || [], lead = src.filter(function (s) { return /Plus:$|and:$/.test(s); }), rest = src.filter(function (s) { return lead.indexOf(s) < 0; });
    var n = rest.length; /* Machan Nov 13 11:09-11:11 PM ICT: 6-8 lines on every phone (the old 4-line cut at 360x640 is gone) */
    return lead.concat(rest.slice(0, n)).concat(["And More"]);
  }
  /* Home FAQ (Machan Nov 13 9:11 AM "we can do just an FAQ section"): the same five questions and answers the Details FAQ drop-down had, word for word. */
  /* Machan Nov 13 11:12 AM: every FAQ lives on Home, grouped by the /faq/ page's own categories and order. Questions and answers are copied
     word for word from the live /faq/ page (main e8df4a2; PR #80's unmerged lines are not used). Format: [category, [[question, answer HTML, id]]]. */
  var FAQ_ALL = [["Heating, Cooling And Furnace Filters", [["How Often Should I Change My Furnace Filter?", "<p>It depends on the filter: about every 1 to 3 months for standard 1-inch filters, and about every 6 to 12 months for 4- to 5-inch media filters. Homes with pets often need changes sooner. Our tech checks your filter at every visit and changes it when it&#x27;s due.</p>", "how-often-should-i-change-my-furnace-filter"], ["How Often Does a Furnace Need a Tune-Up?", "<p>Once a year, ideally in the fall before heating season. Every plan includes a fall furnace tune-up for every furnace.</p>", "how-often-does-a-furnace-need-a-tune-up"], ["How Often Should My AC Be Serviced?", "<p>Once a year in spring, before the first hot week. Every plan includes a spring AC tune-up for every AC unit.</p>", "how-often-should-my-ac-be-serviced"], ["Is Skipped Maintenance Really That Costly?", "<p>Often, yes. A clogged filter, a blocked dryer vent or an overflowing gutter can turn a small fix into a repair or a denied warranty claim. A plan keeps a dated record of every visit.</p>", "is-skipped-maintenance-really-that-costly"]]], ["Safety Checks", [["What Should I Do In An Emergency?", "<ul><li>Flooding or a burst pipe: shut off the main water valve, then give us a call or send a message in the app.</li><li>Electrical (sparks, burning smell, hot panel): if it&#x27;s safe to reach, switch off the main breaker, then give us a call or send a message in the app. If there&#x27;s fire or smoke, get out and call 911.</li><li>Carbon monoxide alarm: get everyone outside and call 911.</li></ul><p>If you smell gas (a rotten-egg or sulfur smell):</p><ol><li>Leave the home right away and get everyone out, pets too. Leave the door open behind you.</li><li>Don&#x27;t flip light switches, unplug anything, use the garage door, light a match, or start a car near the home.</li><li>Once you&#x27;re a safe distance away, call 911 and DTE Gas at 800-947-5000.</li><li>Then call us or send a message in the app. We&#x27;ll help with next steps once DTE says it&#x27;s safe.</li></ol><p>Please don&#x27;t try to shut off the gas meter yourself unless DTE or 911 tells you to. Never turn the gas back on yourself; DTE needs to do that.</p><p class=\"fq-note\">This is general safety information, not professional emergency advice. In any emergency, follow the directions of 911, your utility, and first responders. Smart Upkeep is not an emergency service and does not respond to gas leaks.</p>", "what-should-i-do-in-an-emergency"], ["How Often Should Smoke Detector Batteries Be Changed?", "<p>Test monthly and replace batteries at least once a year, unless the unit has a sealed 10-year battery. Every plan tests smoke and CO detectors at each visit.</p>", "how-often-should-smoke-detector-batteries-be-changed"], ["When Should Smoke and CO Detectors Be Replaced?", "<p>Smoke alarms at 10 years. CO alarms typically at 5 to 7 years, depending on the model; check the date on the back. We flag expired units during visits.</p>", "when-should-smoke-and-co-detectors-be-replaced"], ["How Risky Is a Clogged Dryer Vent?", "<p>Lint buildup is a leading cause of home dryer fires, and a clogged vent also makes drying slower. Clean it at least once a year. Every plan includes dryer vent cleaning.</p>", "how-risky-is-a-clogged-dryer-vent"]]], ["Water, Gutters And Michigan Winters", [["How Often Should Gutters Be Cleaned?", "<p>At least twice a year, spring and fall, and more under heavy trees. Plus and Complete include gutter and downspout cleaning, spring and fall.</p>", "how-often-should-gutters-be-cleaned"], ["How Is Gutter Cleaning Priced?", "<p>By how many stories your home has. Plus and Complete include gutter and downspout cleaning in spring and fall. If heavy trees need more, you can add an Extra Gutter Cleaning.</p>", "how-is-gutter-cleaning-priced"], ["Should I Flush My Water Heater?", "<p>Yes, about once a year, to clear sediment that shortens tank life. Tankless units need descaling. Every plan includes a water heater flush or tankless descale.</p>", "should-i-flush-my-water-heater"], ["How Often Should I Test My Sump Pump?", "<p>Every few months and before spring thaw: pour water into the pit and make sure it starts and drains. Every plan tests your sump pump before spring thaw.</p>", "how-often-should-i-test-my-sump-pump"], ["How Do I Prep My Home for a Michigan Winter?", "<p>Tune the furnace, clean gutters, shut off and drain outside spigots, blow out irrigation and check weatherstripping. Every plan includes Winter Freeze Prep; Complete adds vent and ice dam clearing after storms.</p>", "how-do-i-prep-my-home-for-a-michigan-winter"], ["What Is the Mold and Moisture Scan?", "<p>A pinless moisture meter and thermal camera check under bathrooms, windows, basement walls and sinks. It flags damp spots where mold can grow. It is not a lab mold test and doesn&#x27;t diagnose or rule out mold. Readings and photos go to your Home Record. It&#x27;s in every plan.</p>", "what-is-the-mold-and-moisture-scan"]]], ["Plans And Visits", [["What's Included, and How Many Visits Do I Get?", "<p>Essentials: 2 visits a year, with furnace and AC tune-ups. Plus: 4 visits a year, adding gutter cleaning and more. Complete: 12 visits a year, adding after-storm checks after major storms, up to 4 a year. Your Starter Visit counts as one of your yearly visits. See What&#x27;s Included on the home page for the full list.</p>", "what-is-included-in-each-plan"], ["Is Smart Upkeep a Home Warranty or Insurance?", "<p>No. Smart Upkeep is preventive maintenance that lowers the chance of breakdowns. It doesn&#x27;t pay for repairs or replacements when something breaks, so keep your homeowner&#x27;s insurance.</p>", "is-smart-upkeep-a-home-warranty-or-insurance"], ["What Do You Do on a Visit?", "<p>Every plan includes a fall furnace tune-up, a spring AC tune-up, furnace filter changes, fridge water filter changes, a water heater flush or tankless descale, dryer vent cleaning, smoke and CO detector checks and battery swap, a whole-home mold and moisture scan, a drone roof inspection and gutter check, winter freeze prep, and a written report saved to your Home Record. Plus adds quarterly visits, gutter cleaning, a garage door tune-up, and water softener salt. Complete visits monthly and adds after-storm checks after major storms, up to 4 a year, with vent and ice dam clearing.</p>", "what-do-you-do-on-a-visit"], ["What Does a Plan Cost?", "<p>Essentials from $139 a month, Plus from $209 a month, Complete from $379 a month. Your price depends on home size and equipment. After our 50 Founding spots are gone, you can pay monthly or prepay 12 months at 10% off your monthly price.</p>", "what-does-a-plan-cost"], ["Why Is My Price Different From the Starting Price?", "<p>Every plan has a starting price: Essentials $139, Plus $209 and Complete $379 a month. Your plan price depends on your home&#x27;s size and equipment and never goes below that starting price. Any extras you add go on top.</p>", "why-is-my-price-different-from-the-starting-price"], ["What Is the First 50 Founding Offer?", "<p>The first 50 members get 2 years for the price of 1: prepay 12 months at your full quoted plan price, including any add-ons, and get 24 months of care, while the 50 spots last. Offers do not stack. After our 50 Founding spots are gone, you can pay monthly or prepay 12 months at 10% off your monthly price.</p>", "what-is-the-first-50-founding-offer"], ["Do I Need to Send Photos?", "<p>No. We don&#x27;t ask for photos to sign up. Your price is based on your answers, and your tech confirms your home&#x27;s systems at the first visit. If anything changes your price, we&#x27;ll send the new price within 7 days, and you can accept it or cancel with no fee. Photos from your visits are handled as described in our Privacy Policy.</p>", "do-i-need-to-send-photos"], ["What One-Time Services Can I Book?", "<p>With Tailor Your Plan, you can book one-time services, no membership needed. A radon test, an extra gutter cleaning, a chimney sweep and generator annual service show a price you can book. Air duct cleaning is quote-only: we follow up with a price, and nothing is done or charged without your OK.</p>", "how-does-shop-a-la-carte-work"], ["Can I Add Extras After I Join?", "<p>Yes. In the member app you can tailor your plan or change it: turn extras on or off, add monthly extras, or request a one-time job. Nothing bills until the team confirms the change with you.</p>", "can-i-add-extras-after-i-join"], ["What If Something Breaks Between Visits?", "<p>Send us a message in the app or give us a call, and we&#x27;ll help with next steps and who to call. In an emergency, call 911 or your utility first. Smart Upkeep is not an emergency service.</p>", "what-if-something-breaks-between-visits"]]], ["Our Techs And Service Area", [["Where Do You Work?", "<p>Metro Detroit: Wayne, Oakland and Macomb counties. If your ZIP is outside our area today, join the waitlist and we&#x27;ll let you know when Smart Upkeep comes to your area.</p>", "where-do-you-work"], ["How Are Techs Vetted, Licensed and Insured?", "<p>Every tech is insured and background-checked each year by a third party. Licensed work (mechanical, plumbing, electrical and builder work) is done by partners with an active Michigan license you can check. We keep general liability and auto insurance certificates on file. Required certifications include EPA Section 608, EPA Lead-Safe RRP, OSHA 10, and CPR and First Aid.</p>", "how-are-techs-vetted"], ["What Do I Get After a Visit, and What Is the Home Record?", "<p>After every visit you get a written report with photos, saved to your Home Record, plus a Downloadable Visit Record with dates, photos and work done. The Home Record is the file of your home&#x27;s care. It also keeps mold and moisture readings, dated roof drone photos, recall checks, a Warranties Checked badge and an Annual Home Health Score. It transfers when you sell, and you can gift the buyers 3 months free.</p>", "what-will-i-get-after-a-visit"], ["Who Sees Photos From My Visits?", "<p>Your visit photos are kept in your Home Record and visit reports. We may also use photos with personal details removed (no faces, street numbers or documents) to train our team, improve our service, and in our marketing. Photos of private living spaces are never used in marketing without your written OK. You can opt out of marketing use anytime by messaging us in the app. Our Privacy Policy explains how we use and protect your information.</p>", "who-sees-photos-from-my-visits"]]], ["Billing, Cancel And Moving", [["Can I Cancel?", "<p>Yes, anytime, with no fee. Cancel online in the member app under Profile &amp; Account. Before your first visit, you get a full refund. After visits begin, prepaid members are refunded for services they&#x27;ve paid for that we haven&#x27;t done yet. Services already done aren&#x27;t refunded. Founding members are refunded at the 2-for-1 price they paid, and annual prepaid members at the 10%-off price they paid. Monthly members just stop being billed and keep service until the day before their next charge. Refunds go out within 14 days. Free months have no cash or refund value.</p>", "can-i-cancel"], ["Can I Pause My Plan?", "<p>Yes. You can pause for up to 3 months each membership year. Paused months aren&#x27;t billed, and your membership term and renewal date move back by the length of the pause. Message us in the app to pause.</p>", "can-i-pause-my-plan"], ["What Happens If I Move?", "<p>If you move within our area, your membership moves with you and we requote it for the new home. You can accept the new price or cancel with no fee. If you move out of the area, you can cancel. Your Home Record can transfer to your buyer, and you can gift them 3 months free.</p>", "what-happens-if-i-move"], ["Is There a Cancellation Right in Michigan?", "<p>Yes. If you sign up in person at your home, at an event, or on a sales call we start, you can cancel within 3 business days. This is in addition to the full refund before your first visit.</p>", "is-there-a-cancellation-right-in-michigan"]]]];
  function hmAcc(id, icon, title, body) {
    return '<details class="acc hm-acc" id="acc-' + id + '"' + (arguments[4] ? " open" : "") + '><summary class="mw-hover">' + I(icon, "sm") + '<span>' + title + '</span></summary><div class="acc-body">' + body + '</div></details>';
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
      '<p class="small muted">Visits / Year: ' + t.visits + '</p>' +
      '<div class="pd-cta"><button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button><button class="link mw-hover pd-back" type="button" data-hm-back="1">Back to Plans</button></div>';
  }
  function planCard(k, ord) {
    var t = P.tiers[k], inc = (HOME_KEYPOINTS[k] || k === "silver" || k === "gold") ? homeKeypoints(k) : t.keyPointsOnCard && t.keyPoints ? t.keyPoints : t.features.slice(0, 3).map(function (f) { return f.split(":")[0].split(" (")[0]; });
    return '<div class="hm-card card hm-plan pc mw-hover' + (t.recommended ? " rec" : "") + (k === selK ? " sel" : "") + '" data-tier="' + k + '" tabindex="0" role="button" aria-pressed="' + (k === selK ? "true" : "false") + '" style="--po:' + (ord || 0) + '">' +
      '<div class="pc-top"><strong class="pc-name">' + t.label + '</strong></div>' +
      '<span class="pc-tag muted small">' + t.tagline + '</span>' +
      '<button type="button" class="pc-offer" data-offer="1" aria-haspopup="dialog">' + I("tag", "xs") + '<span>Welcome Offer</span></button>' +
      '<div class="pc-price"><span class="pc-from">From</span><span class="pc-big">' + money(t.fromMonthly || P.minMonthly || 139) + '</span><span class="pc-per">/mo</span></div>' +
      '<div class="pc-year"><svg class="pc-year-cal" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="pc-year-n">' + t.visits + '</span><span class="pc-year-l">Visits / Year</span></div>' +
            '<ul class="pc-inc">' + (HOME_KEYPOINTS[k] && HOME_KEYPOINTS[k].add ? '<li class="pc-lead pc-key" aria-hidden="true">Added In ' + t.label + '</li>' : '') + inc.filter(function (f) { return f !== "And More"; }).map(function (f, i) { var up = HOME_KEYPOINTS[k] && HOME_KEYPOINTS[k].add && HOME_KEYPOINTS[k].add.indexOf(f) > -1; return /Plus:$|and:$/.test(f) ? '<li class="pc-lead">' + f + '</li>' : '<li data-i="' + i + '"' + (up ? ' class="up"' : '') + '>' + esc(f) + (up ? '<span class="sr-only"> (added in ' + esc(t.label) + ')</span>' : '') + '</li>'; }).join("") + '</ul>' +
      /* Plans Expand: And More opens the full-screen sheet (bindPlanMore); the old in-tile list and inner scroll are gone. */
      (inc.indexOf("And More") > -1 ? '<p class="pc-more"><button class="link mw-hover pc-more-link" type="button" data-pc-more="' + k + '" aria-expanded="false" aria-haspopup="dialog">See More</button></p>' : '') + '</div>';
  }
  /* Oct 15 (Max 19:03): phones and narrow/portrait screens get 9:16 media, big screens 16:9. Chosen in JS at load (Safari ignores <source media>). */
  function suPortrait() { return !!(window.matchMedia && window.matchMedia("(max-width: 768px), (orientation: portrait)").matches); }
  /* Late build Nov 12: phone hero box is ~335x449 (3:4) with object-fit: cover. A later 4-scene cut is a one-line swap here. */
  var HERO_PHONE = { src: "video/teaser-v7-phone-4svc-fill-3x4.mp4?v=f4", poster: "assets/teaser-v7-phone-4svc-fill-3x4-poster.jpg?v=p4", wh: 'width="1080" height="1440"' };
  /* Hero: muted looping teaser (poster only when reduced motion is preferred). */
  function heroMedia() {
    var T = P.teaser || {}, port = !!(window.matchMedia && matchMedia("(max-width: 480px)").matches) /* Oct 17: phone square hero crops the 9:16 teaser */, /* Max 20:34 ICT Oct 15: home thumbnail/teaser always horizontal 16:9; the opened video still picks 9:16 or 16:9 (vSrc) */ poster = (port ? T.posterV : T.poster) || "assets/poster-16x9.jpg", tsrc = port ? T.srcV : T.src, wh = port ? 'width="360" height="640"' : 'width="640" height="360"';
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (port) { /* Oct 17 08:00: phone hero loops word-free in-home work scenes (V7 9:16 24.5-25.9 fridge filter, 26.6-28.4 furnace filter, 29.0-30.9 moisture scan) */ tsrc = HERO_PHONE.src; poster = HERO_PHONE.poster; wh = HERO_PHONE.wh; }
    if (!tsrc || reduce) return '<img src="' + esc(poster) + '" alt="" loading="eager" ' + wh + '>';
    var hold = port && !window.__suFirst; /* Oct 17: phone holds the van-at-house poster until first interaction */
    return '<video class="hm-teaser" src="' + esc(tsrc) + '" poster="' + esc(poster) + '" muted ' + (hold ? 'data-hold="1" preload="metadata"' : 'autoplay') + ' playsinline disablepictureinpicture ' + (hold ? '' : 'preload="auto" ') + wh + ' aria-hidden="true" tabindex="-1" style="filter:saturate(1.15) contrast(1.06) sepia(.06)"></video>';
  }

  /* Phone hero trust chips (Oct 17 2026). Each backed by existing site copy (FAQ / Refund Promise / plan features). */
  var HERO_CHIPS = [["shield", "Certified Techs"], ["refund", "Cancel Anytime"], ["clipboard", "Home Reports"], ["user", "Background-Checked Yearly"], ["meter", "Moisture Scan Every Visit"], ["doc", "Licensed & Insured"], ["shield", "Warranties Checked"]]; /* Max-approved list, Oct 17; Warranties Checked added by Machan Nov 13 7:47 PM */
  /* Hero badge explanations (Machan Nov 13 7:48 PM). Wording only from the live FAQ (How Are Techs Vetted / Can I Cancel / What Do I Get After a Visit /
     What Is the Mold and Moisture Scan) and the Warranties Checked Featured Service pop-up. Pending copy check before merge. */
  var HERO_INFO = {"Certified Techs": "Our techs hold the required certifications: EPA Section 608, EPA Lead-Safe RRP, OSHA 10, and CPR and First Aid.", "Cancel Anytime": "Cancel online anytime with no fee. Before your first visit, you get a full refund.", "Home Reports": "After every visit you get a written report with photos, saved to your Home Record.", "Background-Checked Yearly": "Every tech is background-checked each year by a third party.", "Moisture Scan Every Visit": "A moisture meter and thermal camera check for damp spots where mold can grow. It is not a lab mold test.", "Licensed & Insured": "Every tech is insured. Licensed work is done by partners with an active Michigan license you can check.", "Warranties Checked": "We check the warranties on your equipment and add a Warranties Checked badge to your Home Record."};
  /* Trust Tags Theme deck 09 (Max note "Random order"): same 6 badges, shuffled once per page load; hero chips and Why Trust Us row share the order. */
  (function () { for (var i = HERO_CHIPS.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = HERO_CHIPS[i]; HERO_CHIPS[i] = HERO_CHIPS[j]; HERO_CHIPS[j] = t; } })();
  /* Hero trust chips (Max, Oct 17 list and per-load shuffle unchanged).
     Follow-up Nov 13: the six chips wrap in place so no label is cut. The earlier
     edge-fading marquee is retired; CSS on .hm-hchips does the wrap. */

  /* Hero C: start teaser at 0.6s (skip white fade-in) and loop from there */
  (function heroSeek() {
    var S = 0.6;
    /* Home First Section Deck card 01 B (Machan Nov 13 1:34 PM): the Home loop plays at about 0.75x (deck retimed 6.3s -> 8.4s). */
    function go(v) { try { v.currentTime = S; } catch (e) {} try { v.defaultPlaybackRate = 0.75; v.playbackRate = 0.75; } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); }
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
    ["Water", ["waterheater", "meter"], [[2, "Water Heater", "Essentials"], [5, "Moisture Scan", "Essentials"], [6, "Gutters", "Plus"], [6, "Water Softener Salt Top-Off", "Plus"], [6, "Fridge Water Filter Changes", "Essentials"]], "l"],
    ["Heating & Cooling", ["furnace", "ac"], [[0, "Furnace", "Essentials"], [1, "AC", "Essentials"], [0, "Furnace Filter Check and Change", "Essentials"], [0, "Thermostat Battery and Settings Check", "Essentials"]], "t"],
    ["Air & Safety", ["detector", "dryer"], [[4, "Smoke/CO", "Essentials"], [3, "Dryer Vent", "Essentials"], [5, "Moisture Readings", "Essentials"], [5, "Main Water Shut-Off Tag", "Essentials"]], "s"],
    ["Outside", ["gutter", "chimney"], [[6, "Gutters", "Plus"], [7, "Roof Drone Inspection", "Essentials"], [6, "Drone Gutter Check", "Essentials"], [6, "Garage Door Tune-Up", "Plus"], [6, "After-Storm Checks, Up To 4 A Year", "Complete"], [6, "Vent and Ice Dam Clearing After Storms", "Complete"]], "j"]];
  /* Card Colours And Finish picks (Max, Oct 18): 01B every card its own colour (Water lagoon, Heating terracotta, Air mustard, Outside jungle), 02A flat white face, 03B thin colour band on top, 04B fine line icons in the card colour, 05B deeper lifted shadow, 06A See All link kept, 07 header unchanged (skipped), 08A soft filled chips kept, 09B warm cream band behind the cards, 10B active dot in the colour of the card in view. */
  var WW_WI = [
    ["clock", "Visits", "Seasonal visits on a set schedule", [["2 Seasonal Visits a Year", "Essentials"], ["4 Visits a Year, One Per Quarter", "Plus"], ["12 Visits a Year, Monthly Check-Ins", "Complete"]]],
    ["furnace", "Heating & Cooling", "Tune-ups before every season", [["Fall Furnace Tune-Up", "Essentials"], ["Spring AC Tune-Up", "Essentials"], ["Furnace Filters Changed During Visits", "Essentials"], ["Thermostat Battery and Settings Check", "Essentials"]]],
    ["waterheater", "Water", "Less sediment, longer life", [["Water Heater Flush/Descale", "Essentials"], ["Water Softener Salt Top-Off", "Plus"], ["Fridge Water Filter Changes", "Essentials"]]],
    ["detector", "Air & Safety", "Alarms that work when it counts", [["Dryer Vent Cleaning", "Essentials"], ["Smoke and CO Checks and Battery Swap", "Essentials"], ["Main Water Shut-Off Tag", "Essentials"]]],
    ["meter", "Mold and Moisture Scan", "Every visit, whole home", [["Moisture Meter and Thermal Camera Check", "Essentials"], ["Damp Spots Flagged With Photos", "Essentials"], ["Readings Saved to Your Home Record", "Essentials"]]],
    ["gutter", "Outside", "Gutters, roof and winter prep", [["Roof Drone Inspection", "Essentials"], ["Drone Gutter Check", "Essentials"], ["Gutter and Downspout Cleaning", "Plus"], ["Garage Door Tune-Up", "Plus"], ["After-Storm Checks, Up To 4 A Year", "Complete"], ["Vent and Ice Dam Clearing After Storms", "Complete"]]],
    ["clipboard", "Records", "Records for warranties and resale", [["Written Report After Every Visit", "Essentials"], ["Downloadable Visit Record", "Essentials"], ["Recall Check", "Essentials"], ["Home Record Transfers When You Sell", "Essentials"]]]];
  function fsBg(c, fill, inner) { return '<svg class="' + c + '" viewBox="0 0 120 80" fill="none" stroke="#1f1b17" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="116" height="76" rx="8" fill="' + fill + '" stroke="none"/>' + inner + '</svg>'; }
  var FS_ART = {
    warranty: function (c) { return fsBg(c, "#FAF3EB", '<rect x="18" y="14" width="40" height="52" rx="4" fill="#fff"/><path d="M26 26h24M26 34h24M26 42h16"/><path d="M38 52l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/><rect x="70" y="30" width="30" height="34" rx="3" fill="#fff"/><path d="M70 38h30" stroke="#C1502E"/><path d="M78 26v8M92 26v8"/><circle cx="85" cy="51" r="6" stroke="#05668D"/><path d="M85 48v3l2 2" stroke="#05668D"/>'); },
    mold: function (c) { return fsBg(c, "#EEF5F8", '<path d="M20 64V30l26-16 26 16v34z" fill="#fff"/><path d="M34 64V46h14v18"/><path d="M60 40c-3 5-3 8 0 9s3-4 0-9z" fill="#05668D" stroke="#05668D"/><rect x="74" y="28" width="22" height="34" rx="4" fill="#fff"/><rect x="78" y="32" width="14" height="10" rx="1.5" fill="#A8431F"/><path d="M80 50h10M80 55h6"/><path d="M85 28v-8" stroke="#C1502E"/>'); },
    wh: function (c) { return fsBg(c, "#FAF3EB", '<rect x="40" y="12" width="32" height="54" rx="12" fill="#fff"/><path d="M48 30h16M48 38h16"/><circle cx="56" cy="52" r="4" fill="#C1502E"/><path d="M72 58h14v8" stroke="#05668D"/><path d="M86 68c-2 3-2 5 0 6s2-3 0-6z" fill="#05668D" stroke="#05668D"/>'); },
    storm: function (c) { return fsBg(c, "#F3F1EC", '<path d="M24 34a12 12 0 0 1 22-6 10 10 0 1 1 6 18H28a8 8 0 0 1-4-12z" fill="#fff"/><path d="M44 48l-5 9h7l-5 9" stroke="#A8431F" stroke-width="2.2"/><path d="M70 64V42l14-10 14 10v22z" fill="#fff"/><path d="M80 64v-10h8v10"/><path d="M98 26l4 4 8-9" stroke="#0B6E4F" stroke-width="2.2"/>'); }
  };
  /* Featured Service ad slot. FEATURED[0] shows; others can rotate in later. Entries start the Get Started flow. */
  var FEATURED = [
    { id: "warranty", art: "warranty", title: "Warranties Checked", hook: "A Badge On Your Home Record.", popTitle: "Warranties Checked", popText: "We check the warranties on your equipment and add a Warranties Checked badge to your Home Record.", cta: "Free Quote in Minutes" },
    { id: "mold", art: "mold", title: "Mold and Moisture Scan", hook: "Whole Home, Every Visit.", popTitle: "Mold and Moisture Scan", popText: "Protects against mold and water leaks. Damp spots flagged early. Not a lab mold test.", cta: "Free Quote in Minutes" },
    { id: "wh", art: "wh", title: "Water Heater Flush/Descale", hook: "Less Sediment, Longer Tank Life.", popTitle: "Water Heater Flush/Descale", popText: "A yearly flush, or descale for tankless, to cut sediment and extend its life.", cta: "Free Quote in Minutes" },
    { id: "storm", art: "storm", title: "Storm Checks", hook: "After-Storm Checks, Up To 4 A Year.", popTitle: "Storm Checks", popText: "On Complete, we check your home after major storms, up to 4 a year, with a drone roof check and vent and ice dam clearing.", cta: "Free Quote in Minutes" }];
  function wwCarousel() {
    return '<div class="ww"><div class="ca-row" data-ptr-ignore>' + WW_CATS.map(function (c) {
      return '<article class="ca-card ca-' + c[3] + '"><div class="ca-art" aria-hidden="true">' + wwIco(c[1][0]) + wwIco(c[1][1], "ca-b") + '</div><div class="ca-body"><h3>' + c[0] + '</h3><ul>' +
        c[2].slice(0, hsSmall() && c[0] === "Outside" ? 5 : c[2].length).map(function (s) { return '<li><span>' + s[1] + '</span><em class="ca-pl pl-' + s[2] + '" title="Included from ' + s[2] + ' up">' + s[2] + '</em></li>'; }).join("") + '</ul></div></article>';
    }).join("") + '</div><div class="ca-dots" aria-hidden="true">' + WW_CATS.map(function (c, i) { return '<b class="d-' + c[3] + (i ? "" : " on") + '"></b>'; }).join("") + '</div></div>';
  }

  /* What's Included Redo deck (Machan Nov 12 2026, receipt 2018): 01A plan comparison table + 02A checklist cards with tabs (Swatch resolution: tabs under 768px, full table at 768px and up), 03B plans only (no Not Included list), 04A sump and humidifier stay included (their +$6/mo add-ons are removed), 05B no Starter Visit line.
     Every sentence below is Legal's, word for word (LEGAL-WHATS-INCLUDED.md FINAL + Legal 8:20 PM, LEGAL-FINAL-COPY-20261112-night.md). Item labels follow pricing-config.js tier features. */
  var WI_FILTER = "Furnace Filter Check and Change";
  var WI_LINES = {
    visits: { silver: "Essentials: 2 visits a year, spring and fall.", gold: "Plus: 4 visits a year, one each season.", platinum: "Complete: 12 visits a year, one each month." },
    filterEP: "We check your furnace filter every visit and change it when it's due.",
    filterC: "We check your furnace filter every visit and change it when it's due, and test your smoke and CO detectors at every visit.",
    smokeEP: "We test your smoke and CO detectors at every visit.",
    tuneup: "Furnace tune-up each fall and AC tune-up each spring, one for every unit.",
    drone: { silver: "Roof Drone Inspection once a year. Nobody walks on your roof.", gold: "Roof Drone Inspection twice a year. Nobody walks on your roof.", platinum: "Roof Drone Inspection twice a year, plus a drone roof check with each After-Storm Check. Nobody walks on your roof." },
    mold: "A moisture meter and thermal camera check for damp spots where mold can grow. It's not a lab mold test and doesn't diagnose or rule out mold.",
    gutters: "Gutter and downspout cleaning in spring and fall, done on your seasonal visits. Your plan price reflects how many stories your home has.",
    stormTile: "After-Storm Checks, Up To 4 A Year",
    storm: "After a major storm, we check your home, including a drone roof check and vent and ice dam clearing. Up to 4 a year, on top of your 12 visits.",
    stormNote: "A major storm means the National Weather Service issued a severe thunderstorm, tornado, high wind or winter storm warning for your area. We schedule your check within a reasonable time once it's safe. Unused checks don't roll over.",
    equip: "Items that need equipment are done only if your home has it. Your price is based on the equipment you tell us about."
  };
  /* [label, detail (string or per-plan map), lowest plan] */
  var WI_ITEMS = [
    ["Furnace And AC Tune-Ups", WI_LINES.tuneup, "silver"],
    ["Smoke And CO Detector Checks", { silver: WI_LINES.smokeEP, gold: WI_LINES.smokeEP, platinum: "" }, "silver"],
    ["Roof Drone Inspection", WI_LINES.drone, "silver"],
    ["Mold and Moisture Scan, Every Visit", WI_LINES.mold, "silver"],
    ["Water Heater Flush Or Tankless Descale", "", "silver"],
    ["Dryer Vent Cleaning", "", "silver"],
    ["Main Water Shut-Off Found, Tested And Tagged", "", "silver"],
    ["Winter Freeze Prep", "", "silver"],
    ["Sump Pump Test Before Spring Thaw (if you have a sump pump)", "", "silver"],
    ["Humidifier Pad Swap And Service", "", "silver"],
    ["Written Report After Every Visit", "", "silver"],
    ["Downloadable Visit Record", "", "silver"],
    ["Gutter And Downspout Cleaning", WI_LINES.gutters, "gold"],
    ["Garage Door Tune-Up", "", "gold"],
    ["Water Softener Salt Top-Off, each visit (if you have a softener)", "", "gold"],
    ["Fridge Water Filter Changes During Visits", "", "silver"],
    [WI_LINES.stormTile, WI_LINES.storm, "platinum"]];
  var WI_RANK = { silver: 0, gold: 1, platinum: 2 };
  /* 06A: Home À La Carte hides items every plan already includes (Furnace and AC tune-ups). */
  var WI_EVERY_PLAN = ["Furnace Tune-Up", "AC Tune-Up"];
  var WI_CK = '<svg class="wi-ck" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12 9 17 20 6"/></svg>';
  function wiDetail(it, k) { var d = it[1]; return typeof d === "string" ? d : (d[k] || ""); }
  function wiTabPanel(k) {
    var ks = tierKeys(), r = WI_RANK[k], prev = ks[r - 1], t = P.tiers[k];
    var items = WI_ITEMS.filter(function (it) { return WI_RANK[it[2]] === r || (r > 0 && it[0] === "Roof Drone Inspection"); });
    var li = items.map(function (it) { var d = wiDetail(it, k); return '<li>' + WI_CK + '<span><b>' + it[0] + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</span></li>'; }).join("");
    return '<div class="wi-panel" role="tabpanel" id="wiP-' + k + '" aria-labelledby="wiT-' + k + '" data-wi-panel="' + k + '"' + (t.recommended ? '' : ' hidden') + '>' +
      '<p class="wi-meta">From ' + money(t.fromMonthly) + '/Mo · ' + WI_LINES.visits[k] + '</p>' +
      '<div class="wi-core"><h4>' + WI_FILTER + '</h4><p>' + (k === "platinum" ? WI_LINES.filterC : WI_LINES.filterEP) + '</p></div>' +
      (prev ? '<p class="wi-lead">Everything In ' + P.tiers[prev].label + ', And:</p>' : '') +
      '<ul class="wi-ul">' + li + '</ul>' +
      (k === "platinum" ? '<p class="wi-fn">' + WI_LINES.stormNote + '</p>' : '') + '</div>';
  }
  function wiTable() {
    var ks = tierKeys();
    function cell(it, k) { if (WI_RANK[k] < WI_RANK[it[2]]) return '<td class="no" aria-label="Not included">&ndash;</td>'; return '<td class="ck-' + k + '" aria-label="Included">' + WI_CK + '</td>'; }
    var head = '<tr><th class="lab" scope="col"><span class="sr">Item</span></th>' + ks.map(function (k) { var t = P.tiers[k]; return '<th scope="col" class="th-' + k + '">' + t.label + '<span class="wi-from">From ' + money(t.fromMonthly) + '/Mo</span></th>'; }).join("") + '</tr>';
    var rows = '<tr><th scope="row" class="lab"><b>Visits</b></th>' + ks.map(function (k) { return '<td class="txt">' + WI_LINES.visits[k] + '</td>'; }).join("") + '</tr>';
    rows += '<tr><th scope="row" class="lab"><b>' + WI_FILTER + '</b></th>' + ks.map(function (k) { return '<td class="txt">' + (k === "platinum" ? WI_LINES.filterC : WI_LINES.filterEP) + '</td>'; }).join("") + '</tr>';
    rows += WI_ITEMS.map(function (it) {
      if (typeof it[1] !== "string") return '<tr><th scope="row" class="lab"><b>' + it[0] + '</b></th>' + ks.map(function (k) { var d = wiDetail(it, k); return d ? '<td class="txt">' + d + '</td>' : cell(it, k); }).join("") + '</tr>';
      return '<tr><th scope="row" class="lab"><b>' + it[0] + '</b>' + (it[1] ? '<small>' + it[1] + '</small>' : '') + '</th>' + ks.map(function (k) { return cell(it, k); }).join("") + '</tr>';
    }).join("");
    /* Same sentence in neighbouring plans: one cell across both columns. */
    rows = rows.replace(/(<td class="txt">([^<]*)<\/td>)(<td class="txt">\2<\/td>)/g, '<td class="txt" colspan="2">$2</td>');
    return '<div class="wi-tablewrap"><table class="wi-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table><p class="wi-fn">' + WI_LINES.stormNote + '</p></div>';
  }
  function wiRedo() {
    var ks = tierKeys(), sel = ks.filter(function (k) { return P.tiers[k].recommended; })[0] || ks[0];
    return '<div class="wi-r">' +
      '<div class="wi-visit">' + ks.map(function (k) { return '<p>' + WI_LINES.visits[k] + '</p>'; }).join("") + '</div>' +
      '<div class="wi-tabsw"><div class="wi-tabs" role="tablist" aria-label="Plans">' + ks.map(function (k) { var t = P.tiers[k], on = k === sel; return '<button type="button" role="tab" class="wi-tab wt-' + k + (on ? ' on' : '') + '" id="wiT-' + k + '" aria-controls="wiP-' + k + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-wi-tab="' + k + '">' + t.label + '</button>'; }).join("") + '</div>' +
      '<div class="wi-tabbody">' + ks.map(wiTabPanel).join("") + '</div></div>' +
      wiTable() +
      '<p class="wi-fn wi-equip">' + WI_LINES.equip + '</p></div>';
  }
  function wiSelect(root, k) {
    root.querySelectorAll("[data-wi-tab]").forEach(function (b) { var on = b.getAttribute("data-wi-tab") === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
    root.querySelectorAll("[data-wi-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-wi-panel") !== k; });
  }
  function bindWiRedo(root) {
    var tabs = [].slice.call(root.querySelectorAll("[data-wi-tab]"));
    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { wiSelect(root, b.getAttribute("data-wi-tab")); });
      b.addEventListener("keydown", function (e) { var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return; e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); });
    });
  }
  function wiRow() {
    return '<div class="wi-row va" data-ptr-ignore>' + WW_WI.map(function (g, i) { return '<button type="button" class="mw-hover" data-wi="' + i + '" aria-haspopup="dialog"><span class="wt-i">' + wwIco(g[0]) + '</span><strong>' + g[1] + '</strong><small>' + g[3].length + ' Included &rsaquo;</small></button>'; }).join("") + '</div>' +
      '<p class="small muted wi-note">Every plan: Furnace/AC Tune-Ups, Water Heater Flush/Descale, Dryer Vent, Smoke/CO and the Mold and Moisture Scan. Plus and Complete add more each visit.</p>';
  }
  function wiPop() {
    return '<div class="wi-pop va" role="dialog" aria-modal="true" aria-labelledby="wiT" data-ptr-ignore hidden><div class="wi-bg" data-wi-close></div><div class="wi-card"><button type="button" class="hm-pop-x wi-x mw-hover" data-wi-close aria-label="Close">' + X_SVG + '</button><div class="wi-head"></div><ul class="wi-list"></ul><button type="button" class="btn btn-primary mw-hover wi-go" data-act="start">Free Quote in Minutes</button></div></div>';
  }
  /* Machan Nov 13 1:43 PM ("teh same one we have at the bottom"): the same Featured Service bar also sits at the bottom of Plans; both open the one
     bottom-sheet pop-up (same motion, unchanged). Same markup and wording; only the extra class differs. */
  function fsAdBtn(cls, hook) {
    var f = FEATURED[0], art = FS_ART[f.art];
    return '<button type="button" class="fs-ad mw-hover' + (cls ? " " + cls : "") + '" aria-haspopup="dialog" data-featured="' + f.id + '">' + art("fs-art") + '<span class="fs-tx"><span class="fs-tag">Featured Service</span><b>' + f.title + '</b><small>' + (hook || f.hook) + '</small></span><span class="fs-go" aria-hidden="true">&rsaquo;</span></button>';
  }
  function featuredAd() {
    var f = FEATURED[0], art = FS_ART[f.art];
    var cta = f.href ? '<a class="btn btn-primary mw-hover" href="' + f.href + '">' + f.cta + '</a>' : '<button type="button" class="btn btn-primary mw-hover" data-act="start">' + f.cta + '</button>';
    return fsAdBtn("") +
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
    if (fp) root.querySelectorAll(".fs-ad").forEach(function (fa) { fa.addEventListener("click", function () { open(fp, fa); }); });
    /* Plans copy of the bar rises from the bottom when Plans comes into view (off under reduced motion). */
    (function () { var pb = root.querySelector(".fs-ad-plans"); if (!pb || !("IntersectionObserver" in window) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
      pb.classList.add("rise"); var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { pb.classList.add("in"); io2.disconnect(); } }); }, { threshold: .4 });
      io2.observe(pb); })();
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
    var row = root.querySelector(".ic-row"), pop = root.querySelector(".ic-pop"); if (!pop) return;
    var cards = row ? [].slice.call(row.querySelectorAll(".ic-card")) : [], dots = [].slice.call(root.querySelectorAll(".ic-dots b")), sheet = pop.querySelector(".ic-sheet"), last = null;
    function idx() { var w = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1, i = Math.round(row.scrollLeft / w); if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) i = cards.length - 1; return i; }
    function sync() { var i = idx(); dots.forEach(function (d, k) { d.classList.toggle("on", k === i); }); }
    if (row) { row.addEventListener("scroll", sync, { passive: true }); sync();
    function go(d) { var i = Math.max(0, Math.min(cards.length - 1, idx() + d)); row.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: "smooth" }); }
    root.querySelector(".ic-prev").addEventListener("click", function () { go(-1); });
    root.querySelector(".ic-next").addEventListener("click", function () { go(1); }); }
    function open(k, from) { var t = P.tiers[k], f = t.features.slice(), lead = "";
      if (/^Everything in/.test(f[0])) lead = f.shift();
      show(t.label + " · What's Included", lead, f.map(function (x) { var i = x.indexOf(":"); return '<li>' + I(FICO(x), "xs") + '<span>' + (i > 0 ? '<b>' + x.slice(0, i) + '</b>: ' + x.slice(i + 1).trim() : x) + '</span></li>'; }).join(""), "Get Started", from); }
    /* A la carte pop-up: only facts from P.addons (desc, unit, low, high, note). Parts with no fact are left out. */
    function openAddon(id, from) { var a = P.addons.filter(function (x) { return x.id === id; })[0];
      if (!a) { var o = (P.lastMinute || []).filter(function (x) { return x.id === id; })[0]; if (!o) return;
        var onceHow = o.quoteRequired ? "Quote required. Add it to your request and we will follow up with a price." : money(o.price) + " one time, done on a visit. Not added to your monthly membership." + (isApprovedFlatOnce(o) ? "" : " Draft price.");
        var op = [["What's Included", o.desc], ["Limits", AC_LIMITS[o.id] || "Not set yet. We confirm limits when you book."], ["How the Price Is Set", onceHow]];
        return show(o.label, o.quoteRequired ? QUOTE_LABEL : money(o.price) + " one time", op.map(function (p) { return '<li class="ac-part"><span><b>' + p[0] + '</b><br>' + p[1] + '</span></li>'; }).join(""), "Tailor Your Plan", from); }
      var parts = [["What's Included", a.desc]];
      parts.push(["Limits", AC_LIMITS[a.id] || "Not set yet. We confirm limits when you book."]);
      var priceHow = a.quoteRequired
        ? "Quote required. No flat annual price. Add it to your request and we will follow up with a quote."
        : (isApprovedFlatAnnual(a) || (a.annual > 0 && isApprovedFlatOnce(a))
          ? (a.annual > 0 ? yrLabel(a.annual) : money(a.price)) + ". Flat price."
          : addMo(a) + " added to your membership. It is the yearly price divided by 12, rounded, and the yearly price is set at the midpoint of metro Detroit market pricing research." + " Draft price.");
      parts.push(["How the Price Is Set", priceHow]);
      show(a.label, (isApprovedFlatAnnual(a) ? yrLabel(a.annual) : addMo(a)), parts.map(function (p) { return '<li class="ac-part"><span><b>' + p[0] + '</b><br>' + p[1] + '</span></li>'; }).join(""), "Tailor Your Plan", from); }
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
      ["furnace", "Furnace", "furnace", "Fall tune-up on every furnace. We check your furnace filter every visit and change it when it's due.", "silver"],
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
    var trust = [["shield", "Certified Techs", "State license checked, insured, background checked yearly."], ["refund", "Cancel Anytime", "No fee. Full refund before your first visit, then a refund for paid services not yet done."], ["clipboard", "Home Reports", "Written report with photos saved to your Home Record."], ["user", "Background-Checked Yearly", "Third-party background check, renewed every year."], ["meter", "Moisture Scan Every Visit", "Whole-home moisture meter and thermal camera check every visit."], ["doc", "Licensed & Insured", "Licensed partners for work that needs a Michigan license, and insured techs."], ["shield", "Warranties Checked", "We check the warranties on your equipment and add a Warranties Checked badge to your Home Record."]];
    trust = HERO_CHIPS.map(function (c) { return trust.filter(function (t) { return t[1] === c[1]; })[0]; }).filter(Boolean);
    var popular = ["windows", "chimney", "ducts", "pressure", "radon", "guttersExtra", "deck", "lights"];
    var addons = popular.map(function (id) { return P.addons.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
    function card(ic, t, sub, extra, cls) { return '<div class="hm-card card mw-hover ' + (cls || "") + '">' + I(ic) + '<strong>' + t + '</strong>' + (sub ? '<span class="muted small">' + sub + '</span>' : '') + (extra || "") + '</div>'; }
    function row(id, title, cards, link, pre) {
      return '<section class="hm-row" id="row-' + id + '"><div class="hm-row-h"><h2>' + title + '</h2>' + (link || "") + '</div>' + (pre || "") + '<div class="hm-scroll">' + cards + '</div></section>';
    }
    return '<div class="hm">' +
      '<section class="hs-sec hs-top" id="hs-top"><section class="hm-hero">' +
        '<button class="hm-thumb mw-hover' + '' + '" data-act="watch" type="button" aria-label="Watch Video">' + heroMedia() + '<span class="hm-expand" aria-hidden="true">' + I("play", "xs") + '</span><span class="hm-dur">0:50</span></button>' +
        /* Machan Nov 12 7:59 PM: eyebrow 'Preventive Home Maintenance'; headline 'Starting At $139/mo' in the h1 slot; $139 from pricing-config minMonthly; price shows once */
        '<div class="hm-hero-txt"><p class="hm-eb"><span class="hm-eb-t">Preventive Home Maintenance</span></p><h1>Starting At ' + money(P.minMonthly || 139) + '/mo</h1>' +
        '<p class="hm-lead"><span class="hm-lead-l">Home Care, On Schedule</span><span class="hm-lead-s">Home Care, On Schedule</span></p>' +
        /* Machan Nov 13 9:12 AM: the bottom bar is always visible, so the hero's own CTA (Get Started on desktop, Free Quote In Minutes on phones) is removed. */
        '<div class="hm-hcw"><button type="button" class="hm-hc-arr l" data-hc="l" aria-label="Move badges left">&lsaquo;</button><div class="hm-hchips" aria-label="Why Trust Us" data-ptr-ignore><div class="hm-hc-track">' + [0, 1].map(function (k) { return '<div class="hm-hc-set"' + (k ? ' aria-hidden="true"' : '') + '>' + HERO_CHIPS.map(function (c, i) { return '<button type="button" class="hm-hchip t' + (i % 4) + '" data-hc-info="' + esc(c[1]) + '" aria-controls="hcInfo" aria-expanded="false"' + (k ? ' tabindex="-1"' : '') + '><span>' + c[1] + '</span></button>'; }).join("") + '</div>'; }).join("") + '</div></div><button type="button" class="hm-hc-arr r" data-hc="r" aria-label="Move badges right">&rsaquo;</button><div class="hm-hc-info" id="hcInfo" role="dialog" aria-modal="true" aria-live="polite" aria-label="Badge Details" hidden><div class="hm-hc-scrim" data-hc-close="1"></div><div class="hm-hc-info-card"><span class="hm-hc-info-ico" aria-hidden="true"></span><div class="hm-hc-info-body"><b class="hm-hc-info-t"></b><span class="hm-hc-info-x"></span></div><span class="hm-hc-info-caret" aria-hidden="true"></span></div></div></div></div>' +
      '</section>' +
      hsArrow("row-plans", "See Plans") + '</section>' +
      /* Services search removed from the home/sales page (Max, Oct 14). It belongs in the future member 'My Home' area. */
      '<section class="hs-sec hs-plans" id="hs-plans">' + row("plans", "Plans", tiers.map(function (k) { return planCard(k, phoneOrder.indexOf(k)); }).join(""), "" /* Machan Nov 13 11:09 PM ICT ("its already on the badge in hero ... so i guess we just remove from plans section"): the Warranties Checked header bar is gone from Plans. */ /* Machan Nov 13 11:06 AM: "Free Quote In Minutes" link removed from the Plans header too (bottom bar's Get Started covers it) */,
        hsArrowUp("hs-top")).replace('</div></section>', '</div><div class="pc-dots" aria-hidden="true">' + phoneOrder.map(function (k) { return '<span class="pc-dot" data-dot="' + k + '"></span>'; }).join("") + '</div></section>') + hsArrow("hs-alc", "Tailor Your Plan") + '</section>' +
      /* Waitlist card removed from home (Max, Oct 17): it shows only at the end of the quote flow for out-of-area ZIPs. */
      '<div class="hm-offer-pop" role="dialog" aria-modal="true" aria-label="Welcome Offer" hidden><div class="hm-offer-bg" data-offer-close></div><div class="hm-offer-card"><button type="button" class="hm-pop-x mw-hover" data-offer-close aria-label="Close">' + X_SVG + '</button><h3>Welcome Offer</h3><div class="hm-offer-body small"><p>Founding Member: 2 Years For The Price Of 1, while founding spots last. No code needed.</p><p>Refer A Neighbor: You both get a month free when your neighbor makes their first payment.</p><p class="muted">Free months have no cash value.</p></div></div></div>' +
      /* Machan Nov 13 9:09-9:11 AM: page sections are Hero, Plans, Shop À La Carte, FAQ. What We Take Care Of and the Details blocks (Why Trust Us, What's Included,
         Shop À La Carte drop-down, Refund Promise) are off the page; the À La Carte list moves into its own section with the same rows and prices. */
      /* Machan Nov 13 11:11 AM + Swatch default: every à la carte service on Home, grouped under always-visible headers, no inner scroll and no link out.
         Rows are buttons (aria-expanded) that open in place; one open at a time; scrollY unchanged. */
      '<section class="hs-sec hs-alc" id="hs-alc"><section class="hm-row" id="row-alc"><div class="hm-row-h"><div><h2>Tailor Your Plan</h2><p class="hm-sub alc-sub">Members can tailor their plan or add one-time services.</p></div></div>' +
        hsArrowUp("hs-plans") + alcGroupsHtml() + '</section>' + hsArrow("hs-faq", "See FAQ") + '</section>' +
      '<div class="hm-pop" role="dialog" aria-modal="true" aria-labelledby="hmPopT" data-ptr-ignore hidden><div class="hm-pop-bg" data-pop-close></div><div class="hm-pop-card">' +
        '<button type="button" class="hm-pop-x mw-hover" data-pop-close aria-label="Close">' + X_SVG + '</button>' +
        '<div class="hm-pop-art"></div><p class="hm-pop-tag"></p><h3 id="hmPopT"></h3><p class="hm-pop-txt"></p>' +
        '<button type="button" class="btn btn-primary mw-hover hm-pop-go">Free Quote in Minutes</button></div></div>' +
      /* Machan Nov 13 11:12 AM: all FAQs on Home (no See All FAQs link), grouped like À La Carte. */
      '<section class="hs-sec hs-faq" id="hs-faq"><section class="hm-accs hm-faqs"><h2>FAQ</h2>' +
        hsArrowUp("hs-alc") + faqCarouselHtml() +
      '</section></section>' + featuredAd() + /* lower Share pill removed (Max, Oct 17): the header share arrow is the only Share */ wiPop() + icSheet() + acPop() +
      /* Floating Bottom Bar: 4 section tabs stacked above Get Started (Machan Nov 14 9:12 AM: "get started should go under the 4 tabs", "same sizing just flip it around"). Sizes unchanged (tabs 48, gap 6, CTA 44). Shown from load (Machan Nov 13 9:11 AM). */
      '<nav class="hm-tabs hm-dock" aria-label="Page Sections"><div class="hm-pill"><div class="hm-tabs-row"><span class="hm-tab-ind" aria-hidden="true"></span>' +
        [["home", "Home", "hs-top", "house"], ["plans", "Plans", "hs-plans", "clipboard"], ["alacarte", "Tailor Your Plan", "hs-alc", "wrench"], ["faq", "FAQ", "hs-faq", "faq"]].map(function (t, i) { return '<button type="button" class="mw-hover' + (i === 0 ? " on" : "") + '" data-hm-tab="' + t[0] + '" data-hs-sec="' + t[2] + '"' + (i === 0 ? ' aria-current="page"' : "") + '><span class="hm-tab-core">' + I(t[3], "sm") + '<span>' + t[1] + '</span></span></button>'; }).join("") +
      '</div></div><button type="button" class="btn btn-primary mw-hover hm-tab-cta" data-act="start">Get Started<span class="hm-cta-arr" aria-hidden="true">→</span></button></nav>' +
      '</div>';
  }
  /* Phones (<=600px): center the recommended plan and keep the dots in sync with the swipe row. */
  /* Plans phone snap (Machan Nov 14 3:36-3:37 PM ICT): Essentials stays left-aligned on landing
     (he did not ask to change that). Plus and Complete snap to the center. Plus shows a peek of
     Essentials and Complete; Complete shows a Plus peek on the left and empty space on the right.
     Tile width is unchanged from the Nov 13 22% peek formula, plus the Nov 14 9% tighten. */
  function hmPlanCards(sc) { return [].slice.call(sc.querySelectorAll(".hm-plan")); }
  function hmPlanSnapLeft(sc, card) {
    var sr = sc.getBoundingClientRect(), cr = card.getBoundingClientRect();
    var first = hmPlanCards(sc)[0];
    var padL = parseFloat(getComputedStyle(sc).paddingLeft) || 0;
    if (card === first) return sc.scrollLeft + (cr.left - sr.left - padL);
    return sc.scrollLeft + (cr.left + cr.width / 2) - (sr.left + sr.width / 2);
  }
  function hmPlanGo(sc, card, behavior) {
    if (!sc || !card) return;
    var left = Math.round(hmPlanSnapLeft(sc, card));
    var max = Math.max(0, sc.scrollWidth - sc.clientWidth);
    if (left < 0) left = 0; if (left > max) left = max;
    sc.scrollTo({ left: left, behavior: behavior || "auto" });
  }
  function bindPlanSwipe(root) {
    var sc = root.querySelector("#row-plans .hm-scroll"); if (!sc) return;
    var dots = [].slice.call(root.querySelectorAll("#row-plans .pc-dot"));
    var mq = window.matchMedia("(max-width:600px)");
    var armed = false, quiet = false;
    function cards() { return hmPlanCards(sc); }
    function arm() { if (armed) return; armed = true; sc.classList.add("pc-dimmed"); sync(); }
    function sync() {
      if (!mq.matches) return;
      var best = null, d = 1e9, cs = cards(), sr = sc.getBoundingClientRect(), midX = sr.left + sr.width / 2;
      if (sc.scrollLeft <= 2) best = cs[0] || null;
      else {
        cs.forEach(function (c) { var cr = c.getBoundingClientRect(), x = Math.abs((cr.left + cr.width / 2) - midX); if (x < d) { d = x; best = c; } });
      }
      dots.forEach(function (o) { o.classList.toggle("on", !!best && o.getAttribute("data-dot") === best.getAttribute("data-tier")); });
      cs.forEach(function (c) { c.classList.toggle("pc-on", armed && c === best); });
    }
    function viewW() {
      /* Visible width only (never the content width), same guard as bindPeekSwipe. */
      var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var w = sc.clientWidth, host = sc.parentElement;
      if (host && host.clientWidth && w > host.clientWidth + 40) w = host.clientWidth;
      if (vw && w > vw + 1) w = vw;
      return w;
    }
    function size() {
      if (!mq.matches) { sc.style.removeProperty("--pc-w"); sc.style.paddingRight = ""; sc.style.scrollPadding = ""; return; }
      var cs = getComputedStyle(sc), padL = parseFloat(cs.paddingLeft) || 0, gap = parseFloat(cs.columnGap || cs.gap) || 0;
      var view = viewW();
      /* Machan Nov 14 9:25 AM: Plans tiles and text slightly smaller (~9% narrower). */
      var w = Math.floor((view - padL - gap) / (1 + PC_PEEK / 100) * 0.91);
      if (w < 200) w = Math.max(200, Math.floor(view * 0.72));
      if (w > view - 24) w = Math.max(200, view - 48);
      sc.style.setProperty("--pc-w", w + "px");
      /* Right pad so Complete's center can reach the viewport center. */
      sc.style.paddingRight = Math.max(0, Math.round((view - w) / 2)) + "px";
      sc.style.scrollPadding = "0px";
    }
    function start() {
      size();
      if (!mq.matches) return;
      quiet = true;
      var sb = sc.style.scrollBehavior; sc.style.scrollBehavior = "auto";
      sc.scrollLeft = 0;
      sc.style.scrollBehavior = sb;
      sync();
      requestAnimationFrame(function () { quiet = false; });
    }
    var raf = 0;
    sc.addEventListener("scroll", function () {
      if (!quiet && sc.scrollLeft > 2) arm();
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); });
    }, { passive: true });
    if (mq.addEventListener) mq.addEventListener("change", start);
    window.addEventListener("resize", function () { size(); sync(); });
    if (window.visualViewport) visualViewport.addEventListener("resize", function () { size(); sync(); });
    sc.hmPlanArm = arm;
    start(); requestAnimationFrame(start);
    [60, 300, 800].forEach(function (ms) { setTimeout(function () { if (!armed) start(); else { size(); sync(); } }, ms); });
  }
  /* Shared peek-swipe for Home Tailor and FAQ carousels. Same feel as Plans (22% peek, snap to start, dots in sync) but each card keeps its own look. Plans binding is unchanged. */
  function bindPeekSwipe(sc, cardSel, dots, onChange) {
    if (!sc) return;
    var PEEK = 22;
    function cards() { return [].slice.call(sc.querySelectorAll(cardSel)); }
    /* Visible width only (never the content width). On desktop, cap cards to one Plans-tile width (3-col grid at >=700px). */
    function viewW() {
      var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var w = sc.clientWidth, host = sc.parentElement;
      if (host && host.clientWidth && w > host.clientWidth + 1) w = host.clientWidth;
      if (w > vw + 1) w = vw;
      return w;
    }
    function capW(view) {
      if (view < 700) return 10000;
      return Math.max(280, Math.floor((view - 32 - 22) / 3));
    }
    function size() {
      var cs = getComputedStyle(sc), padL = parseFloat(cs.paddingLeft) || 0, gap = parseFloat(cs.columnGap || cs.gap) || 0;
      var view = viewW();
      var raw;
      /* Home FAQ Section Look Deck (Machan Nov 14): Slim Peek is 326px at a 390 viewport, about 39px of the next card. Scale with the viewport; keep the desktop cap. */
      if (sc.closest("#hs-faq")) {
        var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        raw = 326 * vw / 390;
      } else {
        raw = (view - padL - gap) / (1 + PEEK / 100);
      }
      sc.style.setProperty("--car-w", Math.max(200, Math.min(Math.floor(raw), capW(view))) + "px");
      sc.style.scrollPaddingLeft = padL + "px";
    }
    function sync() {
      var best = null, d = 1e9, cs = cards();
      var sl = sc.getBoundingClientRect().left + (parseFloat(getComputedStyle(sc).paddingLeft) || 0);
      cs.forEach(function (c) { var x = Math.abs(c.getBoundingClientRect().left - sl); if (x < d) { d = x; best = c; } });
      /* Only treat the last card as current when the row has actually been scrolled to its end (not when content fits or width exploded). */
      if (cs.length && sc.scrollLeft > 4 && sc.scrollWidth - sc.clientWidth > 8 && sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4) best = cs[cs.length - 1];
      var i = best ? cs.indexOf(best) : 0;
      if (dots) dots.forEach(function (o, j) {
        var on = (o.getAttribute("data-dot") != null ? o.getAttribute("data-dot") === String(i) : j === i);
        o.classList.toggle("on", on);
        if (on) o.setAttribute("aria-current", "true"); else o.removeAttribute("aria-current");
      });
      if (onChange) onChange(best, i, cs);
    }
    function go(i) {
      var cs = cards(), c = cs[Math.max(0, Math.min(cs.length - 1, i))]; if (!c) return;
      var padL = parseFloat(getComputedStyle(sc).paddingLeft) || 0;
      var smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      sc.scrollTo({ left: c.offsetLeft - sc.offsetLeft - padL, behavior: smooth });
    }
    if (dots) dots.forEach(function (o, j) {
      o.addEventListener("click", function () { go(o.getAttribute("data-dot") != null ? +o.getAttribute("data-dot") : j); });
    });
    if (sc.tabIndex < 0) sc.tabIndex = 0;
    if (!sc.getAttribute("aria-label")) sc.setAttribute("aria-label", sc.closest("#hs-faq") ? "FAQ sections" : "Tailor Your Plan groups");
    sc.addEventListener("keydown", function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
      var cs = cards(), sl = sc.getBoundingClientRect().left + (parseFloat(getComputedStyle(sc).paddingLeft) || 0), cur = 0, d = 1e9;
      cs.forEach(function (c, j) { var x = Math.abs(c.getBoundingClientRect().left - sl); if (x < d) { d = x; cur = j; } });
      e.preventDefault();
      go(e.key === "Home" ? 0 : e.key === "End" ? cs.length - 1 : e.key === "ArrowRight" ? cur + 1 : cur - 1);
    });
    function start() {
      size();
      var sb = sc.style.scrollBehavior; sc.style.scrollBehavior = "auto";
      sc.scrollLeft = 0;
      sc.style.scrollBehavior = sb;
      sync();
    }
    var raf = 0;
    sc.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(); }); }, { passive: true });
    function refit() { size(); sync(); }
    window.addEventListener("resize", refit);
    if (window.visualViewport) visualViewport.addEventListener("resize", refit);
    start();
    requestAnimationFrame(function () { start(); });
    [60, 300, 800].forEach(function (ms) { setTimeout(refit, ms); });
  }
  function bindAlcCar(root) {
    var sc = root.querySelector("#hs-alc .alc-car-scroll"); if (!sc) return;
    bindPeekSwipe(sc, ".alc-card", [].slice.call(root.querySelectorAll("#hs-alc .alc-dot")));
  }
  function bindFaqCar(root) {
    var sc = root.querySelector("#hs-faq .faq-car-scroll"); if (!sc) return;
    var lab = root.querySelector("#hs-faq .faq-car-lab");
    var bar = root.querySelector("#hs-faq .faq-car-bar");
    bindPeekSwipe(sc, ".faq-card", [], function (best, i, cs) {
      if (lab && best) lab.textContent = best.getAttribute("data-faq-topic") || "";
      if (!bar) return;
      var n = cs.length, html = "", k;
      if (bar.children.length !== n) {
        for (k = 0; k < n; k++) html += "<i></i>";
        bar.innerHTML = html;
      }
      bar.setAttribute("aria-label", "Section " + (i + 1) + " of " + n);
      [].forEach.call(bar.children, function (s, j) {
        s.classList.toggle("is-done", j < i);
        s.classList.toggle("is-on", j === i);
      });
    });
    sc.setAttribute("aria-label", "FAQ sections");
    var wrap = root.querySelector("#hs-faq .faq-sheet-wrap");
    var sheet = wrap && wrap.querySelector(".faq-sheet");
    var lastBtn = null, y0 = null, dy = 0;
    function placeSheet() {
      if (!wrap) return;
      var dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
      var h = 0;
      if (dock) h = Math.max(0, Math.round(window.innerHeight - dock.getBoundingClientRect().top));
      wrap.style.setProperty("--su-dock-h", h + "px");
    }
    function faqFocusables() {
      if (!sheet) return [];
      return [].slice.call(sheet.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'));
    }
    function setExpanded(btn) {
      root.querySelectorAll("#hs-faq .faq-item-q[aria-expanded='true']").forEach(function (b) {
        if (b !== btn) b.setAttribute("aria-expanded", "false");
      });
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
    var lockY = 0;
    function pinY() {
      var y = lockY;
      try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    }
    function closeSheet() {
      if (!wrap || wrap.hidden) return;
      wrap.hidden = true;
      document.documentElement.classList.remove("faq-sheet-open");
      pinY();
      if (sheet) sheet.style.transform = "";
      setExpanded(null);
      var back = lastBtn; lastBtn = null;
      if (back) back.focus();
    }
    function openSheet(btn) {
      if (!wrap || !sheet || !btn) return;
      var id = btn.getAttribute("data-faq-id");
      var data = faqSheetData[id]; if (!data) return;
      lastBtn = btn;
      var secEl = wrap.querySelector("#faqSheetSec"), titleEl = wrap.querySelector("#faqSheetT"), bodyEl = wrap.querySelector("#faqSheetA");
      if (secEl) secEl.textContent = data.topic || "";
      if (titleEl) titleEl.textContent = data.q || "";
      if (bodyEl) bodyEl.innerHTML = data.a || "";
      setExpanded(btn);
      placeSheet();
      sheet.style.transform = "";
      lockY = window.scrollY || document.documentElement.scrollTop || 0;
      wrap.hidden = false;
      document.documentElement.classList.add("faq-sheet-open");
      pinY();
      var x = wrap.querySelector(".faq-sheet-x");
      if (x) x.focus();
    }
    sc.addEventListener("click", function (e) {
      var btn = e.target.closest(".faq-item-q"); if (!btn || !sc.contains(btn)) return;
      if (btn.getAttribute("aria-expanded") === "true" && wrap && !wrap.hidden) closeSheet();
      else openSheet(btn);
    });
    sc.addEventListener("keydown", function (e) {
      if (e.target === sc) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      sc.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, bubbles: false, cancelable: true }));
    });
    if (wrap && sheet) {
      wrap.addEventListener("click", function (e) {
        if (e.target.closest("[data-faq-close]")) { e.preventDefault(); closeSheet(); }
      });
      document.addEventListener("keydown", function (e) {
        if (wrap.hidden) return;
        if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
        if (e.key !== "Tab") return;
        var fs = faqFocusables();
        if (!fs.length) { e.preventDefault(); sheet.focus(); return; }
        var i = fs.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
        } else if (i === -1 || i === fs.length - 1) { e.preventDefault(); fs[0].focus(); }
      });
      sheet.addEventListener("touchstart", function (e) {
        var body = wrap.querySelector(".faq-sheet-body");
        y0 = (!body || body.scrollTop <= 0) ? e.touches[0].clientY : null;
        dy = 0;
      }, { passive: true });
      sheet.addEventListener("touchmove", function (e) {
        if (y0 === null) return;
        dy = e.touches[0].clientY - y0;
        if (dy > 0) sheet.style.transform = "translateY(" + dy + "px)";
      }, { passive: true });
      sheet.addEventListener("touchend", function () {
        if (y0 !== null && dy > 90) closeSheet();
        else if (sheet) sheet.style.transform = "";
        y0 = null;
      });
      window.addEventListener("resize", function () { if (!wrap.hidden) placeSheet(); });
      function lockPageScroll(e) {
        if (wrap.hidden) return;
        var body = wrap.querySelector(".faq-sheet-body");
        if (body && body.contains(e.target)) return;
        e.preventDefault();
      }
      document.addEventListener("wheel", lockPageScroll, { passive: false, capture: true });
      document.addEventListener("touchmove", lockPageScroll, { passive: false, capture: true });
      window.addEventListener("scroll", function () {
        if (wrap.hidden) return;
        if (Math.abs((window.scrollY || 0) - lockY) > 0.5) pinY();
      }, { passive: true });
    }
  }
  /* One tap selects a plan card (one at a time); on phones the card also scrolls to center. */
  function bindPlanSelect(root) {
    var sc = root.querySelector("#row-plans .hm-scroll"); if (!sc) return;
    var cards = [].slice.call(sc.querySelectorAll(".hm-plan"));
    var smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    function pick(c) {
      cards.forEach(function (x) { var on = x === c; x.classList.toggle("sel", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      if (sc.hmPlanArm) sc.hmPlanArm();
      if (window.matchMedia("(max-width:600px)").matches) hmPlanGo(sc, c, smooth);
    }
    cards.forEach(function (c) {
      c.addEventListener("click", function (e) { if (e.target.closest(".pc-see, .pc-more-link, [data-hs-next]")) return; pick(c); });
      c.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); pick(c); } });
    });
    root.querySelectorAll("[data-hm-back]").forEach(function (b) { b.addEventListener("click", function () { hmJumpSec(root.querySelector("#hs-plans") || root.querySelector("#row-plans")); }); });
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
      '<div class="xt-top"><h3 id="acPopT">Tailor Your Plan</h3><button type="button" class="modal-x mw-hover" data-acpop-close="1" aria-label="Close">' + X_SVG + '</button></div>' +
      '<p class="lead-sm">One-time services, no membership needed. Tap Add on anything you want, then Book. <span class="draft">Draft prices</span></p>' +
      '<h4 class="acp-h">Plan Add-Ons</h4>' + renderAddonList(monthlyAddonCatalog(), sel, "acpop", function (x) { return addMo(x) + (x.note ? ' <span class="muted">· ' + esc(x.note) + '</span>' : '') + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
      '<h4 class="acp-h">One-Time Add-Ons</h4>' + renderAddonList(onceAddonCatalog(), sel, "acpop", function (x) { return oncePriceLabel(x) + '<span class="acp-add">' + (sel.indexOf(x.id) > -1 ? "Added" : "Add") + '</span>'; }) +
      '<div class="acp-foot"><button type="button" class="btn btn-primary btn-big mw-hover" data-acpop-book="1">' + (sel.length ? "Book " + sel.length + " Selected" : "Book One-Time Services") + '</button></div></div></div>';
  }
  function bindAcPop(root) {
    var pop = root.querySelector("#acPop"); if (!pop) return; var from = null;
    function close() { if (pop.hidden) return; pop.hidden = true; document.body.classList.remove("xt-lock"); if (from) from.focus(); }
    function foot() { var n = (S.alacarte || []).length; pop.querySelector("[data-acpop-book]").textContent = n ? "Book " + n + " Selected" : "Book One-Time Services"; }
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
  function zoomFactor() {
    var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--su-zoom"));
    if (!z) z = parseFloat(getComputedStyle(document.documentElement).zoom);
    return z && isFinite(z) && z > 0 ? z : 1;
  }
  function hmHdrSync() {
    var t = document.querySelector(".topbar");
    if (t && t.offsetHeight) document.documentElement.style.setProperty("--su-hdr-h", t.offsetHeight + "px");
    /* Size each Home section to one visual screen after html zoom (1440+). Unzoomed 1280 stays 100svh - header. */
    if (t) {
      var z = zoomFactor();
      var usable = (window.innerHeight - t.getBoundingClientRect().height) / z;
      if (usable > 0) document.documentElement.style.setProperty("--su-sec-h", usable + "px");
    }
  }
  function hmJumpTitle(el) {
    if (!el) return el;
    if (el.matches && el.matches("h1,h2,h3,summary")) return el;
    if (el.matches && el.matches(".hm-row-h")) return el.querySelector("h2,h1,h3") || el;
    return el.querySelector(":scope > summary, :scope > .hm-row-h h2, .hm-row-h h2, :scope > h2, h2, summary") || el;
  }
  /* One Home scroll path (PR home-scroll-polish-1113): a single distance-scaled 700-780ms easeInOutSine glide,
     cancelled on user input, with scroll-snap disabled for the duration so the browser cannot re-snap.
     Reduced motion is an instant jump to the same flush point (section top = header bottom). */
  var hmGlide = { raf: 0, lock: false, tab: null, ignoreUntil: 0, gen: 0, onEnd: null };
  function hmReduced() {
    return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function hmSnapHold(off) {
    document.documentElement.classList.toggle("su-glide", !!off);
  }
  function hmTabIdFor(el) {
    var sec = el && el.id ? el : (el && el.closest && el.closest(".hs-sec"));
    return ({ "hs-top": "home", "hs-plans": "plans", "hs-alc": "alacarte", "hs-faq": "faq" })[(sec && sec.id) || ""] || null;
  }
  /* Machan Nov 13 11:13 PM ICT ("slow down the slide/glide across a little ... smooth it up"): easeInOutSine (CSS cubic-bezier(.37,0,.63,1)),
     a gentler start and stop than the old cubic, with the duration scaled by distance: 700ms up to 780ms (was a flat 560ms). */
  function hmEaseInOutSine(tt) {
    return -(Math.cos(Math.PI * tt) - 1) / 2;
  }
  function hmGlideDur(dist) { return Math.round(Math.min(780, Math.max(700, 640 + Math.abs(dist) * 0.08))); }
  function hmGlideStop(keepTab) {
    if (hmGlide.raf) { cancelAnimationFrame(hmGlide.raf); hmGlide.raf = 0; }
    if (hmGlide.onEnd) {
      window.removeEventListener("scrollend", hmGlide.onEnd);
      hmGlide.onEnd = null;
    }
    hmGlide.gen += 1;
    hmSnapHold(false);
    hmGlide.lock = false;
    if (!keepTab) hmGlide.tab = null;
  }
  function hmOnUserScroll(e) {
    if (!hmGlide.lock) return;
    if (performance.now() < hmGlide.ignoreUntil) return;
    if (e && e.target && e.target.closest && e.target.closest(".hm-dock, .hs-arrow, [data-hs-go], [data-hs-next], [data-hm-tab]")) return;
    hmGlideStop(true);
  }
  function hmGlideTo(top, tabId) {
    top = Math.max(0, Math.round(top));
    if (tabId) {
      hmGlide.tab = tabId;
      if (typeof window.suMarkTab === "function") window.suMarkTab(tabId, true);
    }
    hmGlideStop(true);
    var gen = hmGlide.gen;
    var from = window.scrollY || 0;
    if (hmReduced() || Math.abs(from - top) < 1) {
      if (tabId) hmGlide.tab = tabId;
      window.scrollTo(0, top);
      hmSnapHold(false);
      hmGlide.lock = false;
      setTimeout(function () { if (gen === hmGlide.gen && !hmGlide.lock) hmGlide.tab = null; }, 80);
      return;
    }
    hmGlide.lock = true;
    hmSnapHold(true);
    hmGlide.ignoreUntil = performance.now() + 80;
    var dist = top - from, t0 = performance.now(), dur = hmGlideDur(dist);
    function step(now) {
      if (gen !== hmGlide.gen) return;
      var tt = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + dist * hmEaseInOutSine(tt));
      if (tt < 1) { hmGlide.raf = requestAnimationFrame(step); return; }
      window.scrollTo(0, top);
      hmGlide.raf = 0;
      function done() {
        if (gen !== hmGlide.gen) return;
        if (hmGlide.onEnd) {
          window.removeEventListener("scrollend", hmGlide.onEnd);
          hmGlide.onEnd = null;
        }
        hmGlideStop(true);
        window.scrollTo(0, top);
        requestAnimationFrame(function () { if (gen === hmGlide.gen) window.scrollTo(0, top); });
        if (tabId && typeof window.suMarkTab === "function") window.suMarkTab(tabId, true);
        setTimeout(function () { if (gen === hmGlide.gen && !hmGlide.lock) hmGlide.tab = null; }, 80);
      }
      if ("onscrollend" in window) {
        hmGlide.onEnd = done;
        window.addEventListener("scrollend", done, { once: true });
        setTimeout(done, 120);
      } else setTimeout(done, 32);
    }
    hmGlide.raf = requestAnimationFrame(step);
  }
  function hmJump(el, smooth) {
    if (!el) return;
    var sec = el.closest && el.closest(".hs-sec");
    if (sec) { hmJumpSec(sec, smooth); return; }
    hmHdrSync();
    var title = hmJumpTitle(el);
    var hdr = document.querySelector(".topbar");
    var off = hdr ? hdr.getBoundingClientRect().bottom : 0;
    var top = Math.max(0, Math.round(window.scrollY + (title.getBoundingClientRect().top - off)));
    if (smooth === false || hmReduced()) window.scrollTo(0, top);
    else hmGlideTo(top, hmTabIdFor(el));
  }
  /* Skip visually hidden titles (e.g. phone "Why Trust Us" is clipped to 1px in #row-trust .hm-row-h). */
  function titleVisible(h) {
    if (!h || !h.getClientRects().length) return false;
    var r = h.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    for (var p = h, i = 0; p && i < 6; i++, p = p.parentElement) {
      if (p.offsetWidth <= 2 && p.offsetHeight <= 2) return false;
    }
    return true;
  }
  function firstSecTitle(el) {
    if (!el) return el;
    if (el.classList.contains("hs-sec") || el.classList.contains("hm-row")) {
      el = [].filter.call(el.querySelectorAll("h1,h2"), titleVisible)[0] || el;
    }
    return el;
  }
  /* Section jumps (bar, arrows, see-more) land the section box just under the header, the same as a natural scroll, so margin-top:auto centering stays and the next section does not peek in. */
  function hmJumpSec(el, smooth) {
    if (!el) return; hmHdrSync();
    var sec = (el.classList && el.classList.contains("hs-sec")) ? el : (el.closest && el.closest(".hs-sec")) || el;
    var hdr = document.querySelector(".topbar");
    var off = hdr ? hdr.getBoundingClientRect().bottom : 0;
    /* scrollY and getBoundingClientRect share a coordinate space, including when html { zoom } is on; do not divide by zoom. */
    var top = Math.max(0, Math.round(window.scrollY + (sec.getBoundingClientRect().top - off)));
    var tabId = hmTabIdFor(sec);
    if (smooth === false || hmReduced()) {
      if (tabId && typeof window.suMarkTab === "function") window.suMarkTab(tabId, true);
      window.scrollTo(0, top);
      return;
    }
    hmGlideTo(top, tabId);
  }
  function jumpSec(id) {
    var el = document.getElementById(id); if (!el) return;
    hmJumpSec(el);
  }
  window.addEventListener("resize", hmHdrSync); window.addEventListener("orientationchange", hmHdrSync);
  /* Late build Nov 12: bar hidden on the top section only, always shown after it; arrow guard hides Get Started only.
     Every section is one screen (innerHeight - header); the bar (with the resume strip when shown) is subtracted, and the main block fills what is left. */
  function hsBarSync() {
    var tabs = document.querySelector(".hm-tabs"), pl = document.getElementById("hs-plans"), hdr = document.querySelector(".topbar");
    if (!tabs || !pl || !document.body.classList.contains("on-home")) return;
    var line = hdr ? hdr.getBoundingClientRect().bottom : 0;
    document.body.classList.remove("hs-bar-off"); /* Machan Nov 13 9:11 AM: the bar shows from load, no scroll gate. */
    /* Get Started stays visible on every Home section (do not hide it when a section arrow overlaps the dock). */
    tabs.classList.remove("arrow-off");
  }
  function hsBarFill(root) {
    var tabs = root.querySelector(".hm-tabs"), z = zoomFactor();
    if (!tabs) return;
    var off = document.body.classList.contains("hs-bar-off"); document.body.classList.remove("hs-bar-off");
    var tr = tabs.getBoundingClientRect(), reserve = Math.ceil((window.innerHeight - tr.top) / z) + 8; /* 8px air above the bar. Used for last-page clearance only, not as a per-section spacer. */
    if (off) document.body.classList.add("hs-bar-off");
    document.documentElement.style.setProperty("--su-sec-pb", reserve + "px");
    function barTop() {
      var dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
      return dock ? dock.getBoundingClientRect().top / z : (window.innerHeight / z);
    }
    function viewRoom() {
      var hdr = document.querySelector(".topbar");
      var top = hdr ? hdr.getBoundingClientRect().bottom / z : 0;
      return Math.max(80, barTop() - 8 - top);
    }
    function budget(sec) {
      var arrow = sec.querySelector(":scope > .hs-arrow");
      var ah = arrow ? arrow.getBoundingClientRect().height / z : 0;
      return Math.max(80, viewRoom() - ah);
    }
    /* Continuous page (Machan 10:16): do not stretch sections to a header-sized min-height or bar-reserve padding. */
    ["hs-top","hs-plans","hs-alc","hs-faq"].forEach(function (id) {
      var s = document.getElementById(id); if (!s) return;
      s.style.height = ""; s.style.minHeight = ""; s.style.maxHeight = "";
    });
    /* Top (Machan Nov 13 9:03-9:12 AM): eyebrow, price, line, video and badge carousel on one screen above See Plans, which sits 12px over the bar stack.
       Phones: the video takes every pixel left over (3:4 up to the full content width; below that it keeps the width and crops top/bottom white space),
       and the text starts over the video's empty floor (--hero-ov). Gaps come from the --hs-* scale. */
    (function () {
      var sec = document.getElementById("hs-top"), thumb = sec && sec.querySelector(".hm-thumb");
      if (!thumb) return;
      var chips = sec.querySelector(".hm-hcw") || sec.querySelector(".hm-hchips"), arrow = sec.querySelector(":scope > .hs-arrow"), txt = sec.querySelector(".hm-hero-txt");
      thumb.style.height = ""; thumb.style.maxHeight = ""; thumb.style.minHeight = ""; thumb.style.width = ""; thumb.style.aspectRatio = "";
      if (!window.matchMedia("(max-width:480px)").matches) return;
      var root = document.documentElement, gap = parseFloat(getComputedStyle(root).getPropertyValue("--hs-4")) || 16; /* Machan Nov 13 10:06: at least 16px between badges and See Plans */
      var W = thumb.getBoundingClientRect().width / z, H = Math.round(W * 4 / 3);
      /* the bottom fifth of every scene is empty floor: the text block starts there (fade = 40% of it, text over the rest) */
      function apply(h) { h = Math.min(H, Math.round(h)); var ov = Math.round(Math.min(96, h * 0.2)); root.style.setProperty("--hero-ov", ov + "px"); root.style.setProperty("--hero-ov-pad", Math.max(gap, Math.round(ov * 0.4)) + "px"); thumb.style.height = h + "px"; thumb.style.aspectRatio = "auto"; }
      apply(H);
      if (chips && arrow) {
        /* Arrow sits 8px above the real bar top. Section is content-sized, so measure against the bar, not a padding spacer. */
        var limit = function () { return barTop() - 8 - arrow.getBoundingClientRect().height / z; };
        for (var n = 0; n < 6; n++) {
          var slack = limit() - gap - chips.getBoundingClientRect().bottom / z, cur = thumb.getBoundingClientRect().height / z;
          if (slack >= 0 && (slack < 2 || cur >= H)) break;
          apply(Math.max(160, Math.floor(cur + slack / 0.88)));
        }
        if (limit() - gap - chips.getBoundingClientRect().bottom / z < 0) apply(Math.max(160, thumb.getBoundingClientRect().height / z - 2));
        /* Machan Nov 13 1:25 PM ("a little more room beneath see plans ... make the video section a little larger"): when the video is already at its
           full 3:4 and room is left above See Plans, grow it proportionally (wider and taller, same 3:4) into that room, up to 10px past each side margin. */
        var room = limit() - gap - chips.getBoundingClientRect().bottom / z, curH = thumb.getBoundingClientRect().height / z;
        if (room > 2 && curH >= H - 1) {
          var grow = Math.min(20, Math.floor(room * 0.75 / 2) * 2);
          if (grow >= 2) {
            thumb.style.setProperty("width", (W + grow) + "px", "important"); thumb.style.setProperty("margin-left", "auto", "important"); thumb.style.setProperty("margin-right", "auto", "important");
            H = Math.round((W + grow) * 4 / 3); apply(H);
            for (var m = 0; m < 4 && limit() - gap - chips.getBoundingClientRect().bottom / z < 0; m++) { grow -= 2; thumb.style.setProperty("width", (W + grow) + "px", "important"); H = Math.round((W + grow) * 4 / 3); apply(H); }
          }
        }
      }
    })();
    /* Plans: stretch the cards to the leftover height, same height each. */
    (function () {
      var sec = document.getElementById("hs-plans"); if (!sec) return;
      var cards = [].slice.call(sec.querySelectorAll(".hm-plan"));
      cards.forEach(function (c) { c.style.height = ""; c.style.minHeight = ""; c.style.maxHeight = ""; });
      var row = sec.querySelector("#row-plans") || sec.querySelector(".hm-row");
      var used = row ? row.getBoundingClientRect().height / z : 0;
      var room = budget(sec) - used;
      if (cards.length && room < 0 && sec.scrollHeight > sec.clientHeight) { /* nothing to shrink below content; CSS short-phone rules keep this from happening */ }
      /* PR108 r3 (Swatch Nov 13 4:49 PM): tiles keep their own natural height (row align-items:flex-start in CSS); title + tiles + dots + See arrow
         form one block centered in the section (CSS justify-content:center), so no JS gaps here. */
      var sc = sec.querySelector(".hm-scroll"), dots = sec.querySelector(".pc-dots");
      if (sc) sc.style.removeProperty("margin-top"); if (dots) dots.style.removeProperty("margin-bottom");
      /* Warranties block: top right of the title row when both lines fit beside the title; otherwise its own row under the title (16px edge). */
      var hh = sec.querySelector("#row-plans > .hm-row-h"), wb = hh && hh.querySelector(".fs-ad-hdr"), t2 = hh && hh.querySelector("h2");
      if (hh && wb && t2) { hh.classList.remove("fs-stack"); if (t2.getBoundingClientRect().right + 10 * z > wb.getBoundingClientRect().left + 0.5 || wb.scrollWidth > wb.clientWidth + 1) hh.classList.add("fs-stack"); }
    })();
    /* Shop À La Carte and FAQ (Machan Nov 13 1:26-1:27 PM): chip row + one group at a time; the list box never runs past the section's one screen. */
    pcFitLines(); /* Plans Expand: Essentials tile shows the most keyPoints that fit its one screen (12px air above the bottom bar) */
    saFit(document.getElementById("hs-alc")); saFit(document.getElementById("hs-faq"));
    hsBarSync();
  }
  window.addEventListener("scroll", function () { hsBarSync(); }, { passive: true });
  function hmRefit() { var r = app.querySelector(".hm"); if (!r) return; hmHdrSync(); hsBarFill(r); }
  window.addEventListener("resize", hmRefit);
  [60, 300, 800].forEach(function (ms) { setTimeout(hmRefit, ms); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { hmRefit(); }).catch(function () {});
  /* Plan tile And More / Show Less: expands the tile in place, no jump; scroll position stays put. The one-screen Plans rule relaxes only while a tile is open. */
  /* Machan Nov 13 11:09 AM: the expanded And More list is grouped under short Title Case headers. Real plan features only (pricing-config.js untouched);
     a feature goes to the first group whose pattern matches; empty groups are left out. No icons yet (Swatch deck pending). */
  var PC_GROUPS = [
    ["Visits", /visits a year/i],
    ["Heating And Cooling", /furnace|\bac\b|thermostat|humidifier/i],
    ["Water And Plumbing", /water heater|pipe|sump|water shut-off|hose|toilet|caulk|water softener|water filter|freeze/i],
    ["Roof And Outside (Drone)", /roof|drone|gutter|downspout|window well|grading|garage door|storm|ice dam/i],
    ["Inside The Home", /dryer|smoke|mold|range hood|fridge coil|attic/i],
    ["Records And Perks", /checklist|health score|contractor|recall|warrant|report|record|sell|gift/i]
  ];
  /* Home First Section Deck card 05 (Machan Decides -> Swatch default B, Nov 13 1:36 PM): a 16px Essentials-green line icon inline beside each header (deck mock SVGs). */
  var PC_ICONS = {
    "Visits": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "Heating And Cooling": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3c0 0-2.2 3.2-2.2 6.2A2.2 2.2 0 0012 11.4a2.2 2.2 0 002.2-2.2C14.2 6.2 12 3 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.2 14.2c0-2 1.4-3.4 2.4-4.2M15.8 14.2c0-2-1.4-3.4-2.4-4.2M7 18.2c0-2.4 2.2-3.6 5-3.6s5 1.2 5 3.6-2.2 3.5-5 3.5-5-1.2-5-3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "Water And Plumbing": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3s-6.2 7.2-6.2 11.4A6.2 6.2 0 0012 21a6.2 6.2 0 006.2-6.6C18.2 10.2 12 3 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    "Roof And Outside (Drone)": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 13l9-8 9 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 13v7h12v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17.5" cy="6" r="1.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M17.5 7.4v2.2M16 6h-2.1M19 6h2.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    "Inside The Home": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.8V20h12v-9.2M10 20v-5.5h4V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "Records And Perks": '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 4.5h8.2L19 8.2V20a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 20V6A1.5 1.5 0 017 4.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 4.8V8h3.4M8.5 12h7M8.5 15.5h7M8.5 19h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function pcGroupHtml(features) {
    var lead = "", g = PC_GROUPS.map(function () { return []; }), rest = [];
    (features || []).forEach(function (f) {
      var x = pcTitle(String(f).split(":")[0]);
      if (/^Everything in /i.test(x)) { lead += '<li class="pc-lead">' + esc(x) + '</li>'; return; }
      for (var i = 0; i < PC_GROUPS.length; i++) { if (PC_GROUPS[i][1].test(x)) { g[i].push(x); return; } }
      rest.push(x);
    });
    if (rest.length) g[g.length - 1] = g[g.length - 1].concat(rest); /* never drop a feature */
    return lead + PC_GROUPS.map(function (G, i) {
      if (!g[i].length) return "";
      return '<li class="pc-grp"><p class="pc-grp-h">' + (PC_ICONS[G[0]] ? '<span class="pc-ico" aria-hidden="true">' + PC_ICONS[G[0]] + '</span>' : '') + '<span>' + esc(G[0]) + '</span></p><ul class="pc-sub">' + g[i].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></li>';
    }).join("");
  }
  /* Swatch QA (b): display-only Title Case for the expanded feature lists, matching the site's Title Case lines (every word capped, e.g. "Mold And Moisture Scan").
     Caps the first letter after a start, space, hyphen, slash, quote or "("; all-caps tokens (AC, CO) and numbers are left as they are. pricing-config.js is untouched. */
  function pcTitle(x) { x = String(x); return x.replace(/(^|[\s\-\/("])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  /* Shared in-place accordion row (À La Carte rows and Home FAQ): a real button with aria-expanded/aria-controls, so Enter and Space work. */
  function saItem(id, headHtml, bodyHtml, cls) {
    return '<div class="sa-item' + (cls ? " " + cls : "") + '"><button type="button" class="sa-q mw-hover" id="' + id + '-b" aria-expanded="false" aria-controls="' + id + '">' + headHtml +
      '<svg class="sa-chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="sa-a" id="' + id + '" role="region" aria-labelledby="' + id + '-b" hidden>' + bodyHtml + '</div></div>';
  }
  /* À La Carte groups: same names and order as the plan lists, plus one À La Carte-only group. Items are the full monthly and one-time catalogs
     (the same rows as the À La Carte page); names, descs and prices come from pricing-config via the existing catalog code. */
  var ALC_GROUPS = [
    ["Heating And Cooling", /furnace|\bac\b|thermostat|chimney/i],
    ["Water And Plumbing", /water|sump|hose bib|irrigation/i],
    ["Roof And Outside", /roof|gutter|window wash|christmas/i],
    ["Inside The Home", /bath fan|radon|appliance|doorbell/i],
    ["Seasonal Equipment", /generator|mower|snowblower/i]
  ];
  /* Home Tailor list (Machan Nov 14 3:38 PM ICT): shorter Title Case names on the
     collapsed row. Official catalog labels and all scope copy live in the expansion.
     pricing-config.js is untouched. */
  var HOME_ALC_SHORT = {
    "Flat Roof Inspection And Clean": "Flat Roof Inspection",
    "Irrigation System Startup Or Shutdown": "Irrigation Start Or Shutdown",
    "Exterior Window Washing": "Window Washing",
    "Christmas Lights Up And Down": "Christmas Lights",
    "Water Leak Sensor Setup": "Leak Sensor Setup",
    "Generator Annual Service": "Generator Service",
    "Extra Flat Roof Cleaning": "Extra Flat Roof Clean",
    "Bath Fans Clean And Check": "Bath Fan Clean And Check",
    "Sump Pump Battery Backup": "Sump Battery Backup",
    "Lawn Mower Winterizing": "Mower Winterizing"
  };
  function alcRowName(label) { return pcTitle(HOME_ALC_SHORT[label] || label); }
  function alcDetail(a, monthly, skipDesc) {
    var d = [];
    if (a.desc && !skipDesc) d.push('<p>' + esc(a.desc) + '</p>');
    if (a.note) d.push('<p>' + esc(a.note) + '</p>');
    var cfg = (P.addons || []).concat(P.lastMinute || []).filter(function (x) { return x.id === a.id || x.id + "_once" === a.id; })[0];
    var lk = cfg ? cfg.id : (/window/i.test(a.label) ? "windows" : /christmas/i.test(a.label) ? "lights" : "");
    if (lk && AC_LIMITS[lk]) d.push('<p>' + esc(AC_LIMITS[lk]) + '</p>');
    var pl = monthly ? addMo(a) : oncePriceLabel(a);
    if (!/quote required/i.test(a.desc || "") && pl === QUOTE_LABEL) d.push('<p>Quote required. Add it to your request and we will follow up with a price.</p>');
    if (monthly && /^\+\$/.test(pl)) d.push('<p>' + esc(pl + " added to your membership. It is the yearly price divided by 12, rounded, and the yearly price is set at the midpoint of metro Detroit market pricing research.") + '</p>');
    return d.join("");
  }
  function alcGroupsHtml() {
    var rows = monthlyAddonCatalog().map(function (a) { return { a: a, m: true }; }).concat(onceAddonCatalog().map(function (a) { return { a: a, m: false }; }));
    var g = ALC_GROUPS.map(function () { return []; }), other = [];
    rows.forEach(function (r) { for (var i = 0; i < ALC_GROUPS.length; i++) { if (ALC_GROUPS[i][1].test(r.a.label)) { g[i].push(r); return; } } other.push(r); });
    var groups = ALC_GROUPS.map(function (G, i) { return [G[0], g[i]]; }); if (other.length) groups.push(["More Services", other]);
    groups = groups.filter(function (G) { return G[1].length; });
    var n = 0;
    /* Machan Nov 14 9:13 AM: drop the black/white pills; one swipeable card per section, peek + dots. Cards are designed for the service list, not copied from Plans. */
    return '<div class="alc-car">' +
      '<div class="alc-car-scroll" data-ptr-ignore>' + groups.map(function (G, i) {
        var list = G[1].map(function (r) {
          var price = r.m ? addMo(r.a) : oncePriceLabel(r.a);
          var official = r.a.label, name = alcRowName(official);
          var body = (name !== official ? '<p class="sa-full-name">' + esc(official) + '</p>' : '') + alcDetail(r.a, r.m, false);
          return saItem("alc-" + (n++), '<span class="sa-n">' + esc(name) + '<small>' + (r.m ? "Plan Add-On" : "One-Time Add-On") + '</small></span><b class="sa-p' + (price === QUOTE_LABEL ? ' is-quote' : '') + '" data-alc-id="' + esc(r.a.id) + '">' + esc(price) + '</b>', body);
        }).join("");
        return '<article class="alc-card" data-alc-g="' + i + '"><div class="alc-ghd"><span class="alc-gico" aria-hidden="true">' + alcIco(G[0], 28) + '</span><p>' + esc(G[0]) + '</p></div><div class="sa-list">' + list + '</div></article>';
      }).join("") + '</div>' +
      '<div class="alc-dots" role="tablist" aria-label="Tailor Your Plan Groups">' + groups.map(function (G, i) {
        return '<button type="button" class="alc-dot' + (i ? "" : " on") + '" data-dot="' + i + '" aria-label="' + esc(G[0]) + '"' + (i ? "" : ' aria-current="true"') + '></button>';
      }).join("") + '</div></div>';
  }
  /* Home-only shorter answers (Machan Nov 14 9:29 AM). FAQ_ALL is unchanged and still used by /faq/. Every fact, number, condition and legal caveat is kept; no new claims or prices. */
  var HOME_FAQ_SHORT = {
    "how-often-should-i-change-my-furnace-filter": "<p>About every 1 to 3 months for standard 1-inch filters, and about every 6 to 12 months for 4- to 5-inch media filters. Homes with pets often need changes sooner. Our tech checks your filter at every visit and changes it when it&#x27;s due.</p>",
    "what-should-i-do-in-an-emergency": "<p>Flooding or a burst pipe: shut off the main water valve, then give us a call or send a message in the app. Electrical (sparks, burning smell, hot panel): if it&#x27;s safe to reach, switch off the main breaker, then give us a call or send a message in the app; if there&#x27;s fire or smoke, get out and call 911. Carbon monoxide alarm: get everyone outside and call 911.</p><p>If you smell gas (a rotten-egg or sulfur smell): leave the home right away and get everyone out, pets too, and leave the door open behind you. Don&#x27;t flip light switches, unplug anything, use the garage door, light a match, or start a car near the home. Once you&#x27;re a safe distance away, call 911 and DTE Gas at 800-947-5000, then call us or send a message in the app; we&#x27;ll help with next steps once DTE says it&#x27;s safe.</p><p>Please don&#x27;t try to shut off the gas meter yourself unless DTE or 911 tells you to. Never turn the gas back on yourself; DTE needs to do that.</p><p class=\"fq-note\">This is general safety information, not professional emergency advice. In any emergency, follow the directions of 911, your utility, and first responders. Smart Upkeep is not an emergency service and does not respond to gas leaks.</p>",
    "what-is-the-mold-and-moisture-scan": "<p>A pinless moisture meter and thermal camera check under bathrooms, windows, basement walls and sinks, and flags damp spots where mold can grow. It is not a lab mold test and doesn&#x27;t diagnose or rule out mold. Readings and photos go to your Home Record, and it&#x27;s in every plan.</p>",
    "what-is-included-in-each-plan": "<p>Essentials includes 2 visits a year, with furnace and AC tune-ups; Plus includes 4, adding gutter cleaning and more; Complete includes 12, adding after-storm checks after major storms, up to 4 a year. Your Starter Visit counts as one of your yearly visits. See What&#x27;s Included on the home page for the full list.</p>",
    "how-are-techs-vetted": "<p>Every tech is insured and background-checked each year by a third party. Licensed work (mechanical, plumbing, electrical and builder work) is done by partners with an active Michigan license you can check, and we keep general liability and auto insurance certificates on file. Required certifications include EPA Section 608, EPA Lead-Safe RRP, OSHA 10, and CPR and First Aid.</p>",
    "what-will-i-get-after-a-visit": "<p>After every visit you get a written report with photos, saved to your Home Record, plus a Downloadable Visit Record with dates, photos and work done. The Home Record is the file of your home&#x27;s care: mold and moisture readings, dated roof drone photos, recall checks, a Warranties Checked badge and an Annual Home Health Score. It transfers when you sell, and you can gift the buyers 3 months free.</p>",
    "who-sees-photos-from-my-visits": "<p>Your visit photos are kept in your Home Record and visit reports. We may also use photos with personal details removed (no faces, street numbers or documents) to train our team, improve our service, and in our marketing. Photos of private living spaces are never used in marketing without your written OK, and you can opt out of marketing use anytime. Our Privacy Policy explains how we use and protect your information.</p>",
    "can-i-cancel": "<p>Yes, anytime, with no fee. Cancel online in the member app under Profile &amp; Account. Monthly members stop being billed and keep service until the day before their next charge. Prepaid members are refunded for services not yet done; see How Are Refunds Calculated? for the details.</p>",
  };
  /* Home FAQ sections (Machan Nov 14 9:28–9:36 AM). FAQ_ALL order and text stay as they are; /faq/ is unchanged.
     Each section lists pinned questions in Machan's order. live:false cards stay in the list for order but are not rendered until Machan confirms the fact and Legal reviews the wording.
     After the pinned cards, leftover questions from that FAQ_ALL group are appended (deduped). Other FAQ_ALL groups follow in their existing order. */
  var HOME_FAQ_SECTIONS = [
    {
      topic: "Plans And Visits",
      sourceGroup: "Plans And Visits",
      ico: "clipboard",
      items: [
        { slug: "what-is-included-in-each-plan", live: true },
        { slug: "what-do-you-do-on-a-visit", live: true },
        { slug: "what-does-a-plan-cost", live: true },
        { slug: "what-will-i-get-after-a-visit", live: true },
        { slug: "what-is-the-first-50-founding-offer", live: true },
        { slug: "is-smart-upkeep-a-home-warranty-or-insurance", live: true }
      ]
    },
    {
      topic: "Our Team And Coverage",
      sourceGroup: "Our Techs And Service Area",
      ico: "van",
      items: [
        { slug: "are-the-technicians-employees-of-smart-upkeep", live: false },
        { slug: "how-are-techs-vetted", live: true },
        { slug: "is-smart-upkeep-a-licensed-residential-builder", live: false },
        { slug: "does-smart-upkeep-have-liability-insurance", live: false },
        { slug: "where-do-you-work", live: true }
      ]
    },
    {
      topic: "Billing, Cancel And Moving",
      sourceGroup: "Billing, Cancel And Moving",
      ico: "tag",
      items: [
        { slug: "can-i-cancel", live: true },
        { slug: "how-are-refunds-calculated", live: true },
        { slug: "can-i-pause-my-plan", live: true },
        { slug: "what-happens-if-i-move", live: true },
        { slug: "is-there-a-cancellation-right-in-michigan", live: true },
        { slug: "who-sees-my-credit-card-information", live: true }
      ]
    },
    {
      topic: "Heating, Cooling And Furnace Filters",
      sourceGroup: "Heating, Cooling And Furnace Filters",
      ico: "furnace",
      items: [
        { slug: "what-happens-during-a-furnace-tune-up", live: true },
        { slug: "what-happens-during-an-ac-tune-up", live: true },
        { slug: "how-often-should-i-change-my-furnace-filter", live: true },
        { slug: "is-skipped-maintenance-really-that-costly", live: true },
        { slug: "should-i-be-concerned-with-air-quality", live: true }
      ]
    }
  ];
  /* Hidden Home FAQ drafts. Only these three stay unrendered (item.live is false).
     License card: do not set live until Smart Upkeep's own Residential Builder license is issued, then add the issued number and check it on the state's public lookup.
     Liability card: do not set live until a certificate of insurance names Smart Upkeep LLC as the insured, with $1 million per occurrence and $2 million aggregate in force. A policy in another name does not count.
     Employees card: keep this title for now. If Machan confirms the techs are W-2 employees of Smart Upkeep LLC, prefix the answer with "Yes. " and keep the title. If they are not, retitle the card to "Who Does The Work On A Visit?" and keep the answer as written (no Yes.). */
  var HOME_FAQ_PENDING = {
    "are-the-technicians-employees-of-smart-upkeep": { q: "Are The Technicians Employees Of Smart Upkeep?", hold: "legal", a: "<p>Most of the work on a visit is done by Smart Upkeep technicians. Specialized licensed work, like radiant heat, is done by partners with an active Michigan license you can check.</p>" },
    "is-smart-upkeep-a-licensed-residential-builder": { q: "Is Smart Upkeep A Licensed Residential Builder In The State Of Michigan?", hold: "license", a: "<p>Yes. Smart Upkeep is a licensed Residential Builder in the State of Michigan, license #[number].</p>" },
    "does-smart-upkeep-have-liability-insurance": { q: "Does Smart Upkeep Have Liability Insurance?", hold: "coi", a: "<p>Yes. Smart Upkeep carries general liability insurance of $1 million per occurrence and $2 million aggregate.</p>" }
  };
  /* Home-only cards that reuse Legal-reviewed site copy (not added to FAQ_ALL). how-are-refunds-calculated excerpts the refund sentences from can-i-cancel, word for word.
     Furnace, AC, air quality, and credit-card cards were approved by Legal on Nov 14 and are Home-only (not added to FAQ_ALL). */
  var HOME_FAQ_REUSED = {
    "how-are-refunds-calculated": {
      q: "How Are Refunds Calculated?",
      a: "<p>Before your first visit, you get a full refund. After visits begin, prepaid members are refunded for services they&#x27;ve paid for that we haven&#x27;t done yet. Services already done aren&#x27;t refunded. Founding members are refunded at the 2-for-1 price they paid, and annual prepaid members at the 10%-off price they paid. Monthly members just stop being billed and keep service until the day before their next charge. Refunds go out within 14 days. Free months have no cash or refund value.</p>"
    },
    "who-sees-my-credit-card-information": {
      q: "Who Sees My Credit Card Information?",
      a: "<p>Card payments are processed by Stripe, our payment processor. Please never send card numbers by email or message.</p>"
    },
    "what-happens-during-a-furnace-tune-up": {
      q: "What Happens During A Furnace Tune-Up?",
      a: "<p>Every plan includes a fall furnace tune-up for every furnace, ideally before heating season. Your filter is checked at every visit and changed when it&#x27;s due, and the thermostat battery and settings are checked. Licensed mechanical work is done by partners with an active Michigan license you can check.</p>"
    },
    "what-happens-during-an-ac-tune-up": {
      q: "What Happens During An AC Tune-Up?",
      a: "<p>Every plan includes a spring AC tune-up for every AC unit, ideally before the first hot week. Licensed mechanical work is done by partners with an active Michigan license you can check.</p>"
    },
    "should-i-be-concerned-with-air-quality": {
      q: "Should I Be Concerned With Air Quality?",
      a: "<p>We help you keep up with the home-care work that affects the air in your house: furnace filter changes at every visit when due, dryer vent cleaning, and a whole-home mold and moisture scan that flags damp spots where mold can grow. The scan is not a lab mold test and does not diagnose or rule out mold.</p>"
    }
  };
  /* Home carousel titles only. FAQ_ALL titles on /faq/ stay as they are. */
  var HOME_FAQ_TITLES = {
    "what-is-included-in-each-plan": "What's Included And How Many Do I Get?",
    "what-do-you-do-on-a-visit": "What Do You Do On A Visit?",
    "what-does-a-plan-cost": "What Does A Plan Cost?",
    "what-will-i-get-after-a-visit": "What's In My Visit Report?",
    "what-is-the-first-50-founding-offer": "What Is The Founding 50 Offer?",
    "is-smart-upkeep-a-home-warranty-or-insurance": "Is Smart Upkeep A Home Warranty Or Insurance?",
    "how-are-techs-vetted": "How Are Techs Vetted And Trained?",
    "where-do-you-work": "What Areas Do You Service?",
    "can-i-cancel": "Can I Cancel?",
    "can-i-pause-my-plan": "Can I Pause?",
    "how-are-refunds-calculated": "How Are Refunds Calculated?",
    "what-happens-if-i-move": "What Happens If I Move?",
    "how-often-should-i-change-my-furnace-filter": "How Often Should A Furnace Filter Be Changed?",
    "is-skipped-maintenance-really-that-costly": "Is Skipped Maintenance Really That Costly?",
    "who-sees-my-credit-card-information": "Who Sees My Credit Card Information?",
    "what-happens-during-a-furnace-tune-up": "What Happens During A Furnace Tune-Up?",
    "what-happens-during-an-ac-tune-up": "What Happens During An AC Tune-Up?",
    "should-i-be-concerned-with-air-quality": "Should I Be Concerned With Air Quality?"
  };
  /* Home FAQ carousel (Machan Nov 14 10:17 AM): one card per section, questions expand in place. Home section only; /faq/ is unchanged. */
  var faqSheetData = {};
  function faqCarouselHtml() {
    var bySlug = {}, used = {};
    var topicIco = {};
    HOME_FAQ_SECTIONS.forEach(function (sec) { topicIco[sec.topic] = sec.ico; });
    FAQ_ALL.forEach(function (g, gi) {
      (g[1] || []).forEach(function (q) {
        bySlug[q[2]] = { topic: g[0], ico: FAQ_ICONS[gi], q: HOME_FAQ_TITLES[q[2]] || q[0], a: HOME_FAQ_SHORT[q[2]] || q[1], slug: q[2], emerg: q[2] === "what-should-i-do-in-an-emergency" };
      });
    });
    Object.keys(HOME_FAQ_REUSED).forEach(function (slug) {
      var r = HOME_FAQ_REUSED[slug];
      if (!bySlug[slug]) bySlug[slug] = { topic: "", ico: "tag", q: HOME_FAQ_TITLES[slug] || r.q, a: HOME_FAQ_SHORT[slug] || r.a, slug: slug, emerg: false };
    });
    function take(slug, topic) {
      var c = bySlug[slug]; if (!c || used[slug]) return null; used[slug] = 1;
      if (topic) c = Object.assign({}, c, { topic: topic, ico: topicIco[topic] || c.ico });
      return c;
    }
    var sections = [];
    function pushSec(topic, ico, items) {
      var qs = items.filter(Boolean);
      if (!qs.length) return;
      sections.push({ topic: topic, ico: ico, items: qs });
    }
    HOME_FAQ_SECTIONS.forEach(function (sec) {
      var items = [];
      sec.items.forEach(function (item) {
        if (!item.live || HOME_FAQ_PENDING[item.slug]) return;
        var c = take(item.slug, sec.topic); if (c) items.push(c);
      });
      FAQ_ALL.forEach(function (g) {
        if (g[0] === sec.sourceGroup) (g[1] || []).forEach(function (q) {
          var c = take(q[2], sec.topic); if (c) items.push(c);
        });
      });
      pushSec(sec.topic, sec.ico, items);
    });
    FAQ_ALL.forEach(function (g, gi) {
      var pinned = HOME_FAQ_SECTIONS.some(function (sec) { return sec.sourceGroup === g[0]; });
      if (pinned) return;
      var items = [];
      (g[1] || []).forEach(function (q) { var c = take(q[2]); if (c) items.push(c); });
      pushSec(g[0], FAQ_ICONS[gi] || "tag", items);
    });
    faqSheetData = {};
    return '<div class="faq-car">' +
      '<div class="faq-car-scroll" data-ptr-ignore>' + sections.map(function (sec, i) {
        return '<article class="faq-card" data-faq-i="' + i + '" data-faq-topic="' + esc(sec.topic) + '">' +
          '<h3 class="faq-card-topic"><span class="faq-ico" aria-hidden="true">' + I(sec.ico, "sm") + '</span>' + esc(sec.topic) + '</h3>' +
          '<div class="faq-card-body">' + sec.items.map(function (c, j) {
            var id = "hfq-" + i + "-" + j;
            faqSheetData[id] = { q: c.q, a: c.a, topic: sec.topic, slug: c.slug };
            return '<div class="faq-item' + (c.emerg ? " is-emerg" : "") + '" data-faq-slug="' + esc(c.slug) + '">' +
              '<button type="button" class="faq-item-q" id="' + id + '-q" data-faq-id="' + id + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="faqSheet">' + esc(c.q) + '</button></div>';
          }).join("") + '</div></article>';
      }).join("") + '</div>' +
      '<div class="faq-car-nav"><div class="faq-car-bar" role="img" aria-label="Section 1 of 6"></div><p class="faq-car-lab" aria-live="polite"></p></div>' +
      '<div class="faq-sheet-wrap" hidden><div class="faq-sheet-bg" data-faq-close></div>' +
        '<div class="faq-sheet" id="faqSheet" role="dialog" aria-modal="true" aria-labelledby="faqSheetT" tabindex="-1">' +
          '<div class="faq-sheet-grab" aria-hidden="true"></div>' +
          '<button type="button" class="faq-sheet-x mw-hover" data-faq-close aria-label="Close">' + X_SVG + '</button>' +
          '<p class="faq-sheet-sec" id="faqSheetSec"></p>' +
          '<h3 class="faq-sheet-t" id="faqSheetT"></h3>' +
          '<div class="faq-sheet-body" id="faqSheetA"></div>' +
        '</div></div></div>';
  }
  /* FAQ Rich Look Deck (Machan Nov 13 8:46 PM): topic icons on the six chips, not on each question. Live SUIcon set. */
  var FAQ_ICONS = ["furnace", "shield", "gutter", "clipboard", "van", "tag"];
  /* Machan Nov 13 1:27 PM ("divided by section with the names of the sections at the top, and then if they click the section it shows the list of the items";
     "it all needs to fit in one screen"; "same with FAQ"): group names are a sideways chip row (role=tablist); only the chosen group's rows show below,
     in a box that scrolls inside itself only when that group is taller than the room left on the screen. First group is selected by default. */
  /* À La Carte Warm Look Deck (Machan Nov 13 9:15 PM): card 3 B icons on the chips and card 5 B an Icon Header above each group's list. Rows stay text only (card 1 B).
     1.8-stroke line icons from the deck capture (capture_alcwarm.py ICO / GROUP_ICO), drawn in currentColor. */
  var ALC_ICO = {
    "Heating And Cooling": '<path d="M12 3s-2 3.2-2 6.2A2 2 0 0012 11.2a2 2 0 002-2C14 6.2 12 3 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.2 18c0-2.2 2.1-3.4 4.8-3.4s4.8 1.2 4.8 3.4-2.1 3.3-4.8 3.3-4.8-1.1-4.8-3.3z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    "Water And Plumbing": '<path d="M12 3s-6 7-6 11.2A6 6 0 0012 21a6 6 0 006-6.8C18 10 12 3 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    "Roof And Outside": '<path d="M3 13l9-8 9 8M6 13v7h12v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    "Inside The Home": '<path d="M3 11.5 12 4l9 7.5M6 10.8V20h12v-9.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    "Seasonal Equipment": '<path d="M5 19c8-1 13-7 14-14-7 1-13 6-14 14z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    "More Services": '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/>'
  };
  function alcIco(name, px) { return '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" aria-hidden="true" focusable="false">' + (ALC_ICO[name] || ALC_ICO["More Services"]) + '</svg>'; }
  function saTabsHtml(pfx, cls, label, groups) {
    var isFaq = cls === "faq-groups", isAlc = cls === "alc-groups";
    return '<div class="sa-groups sa-tabbed ' + cls + '">' +
      '<div class="sa-tabs" role="tablist" aria-label="' + esc(label) + '" data-ptr-ignore>' + groups.map(function (G, i) {
        var ico = (isFaq && G[2]) ? '<span class="faq-ico" aria-hidden="true">' + I(G[2], "sm") + '</span>' : (isAlc ? '<span class="alc-tico" aria-hidden="true">' + alcIco(G[0], 14) + '</span>' : "");
        return '<button type="button" class="sa-tab mw-hover" role="tab" id="' + pfx + '-t' + i + '" aria-controls="' + pfx + '-p' + i + '" aria-selected="' + (i ? "false" : "true") + '" tabindex="' + (i ? "-1" : "0") + '"' + (G[2] ? ' data-faq-ico="' + esc(G[2]) + '"' : "") + '>' + ico + esc(G[0]) + '</button>';
      }).join("") + '</div>' +
      (isFaq ? '<div class="sa-faq-wrap">' : "") +
      '<div class="sa-box" data-ptr-ignore>' + groups.map(function (G, i) {
        return '<div class="sa-grp" role="tabpanel" id="' + pfx + '-p' + i + '" aria-labelledby="' + pfx + '-t' + i + '"' + (i ? " hidden" : "") + '>' + (isAlc ? '<div class="alc-ghd"><span class="alc-gico" aria-hidden="true">' + alcIco(G[0], 28) + '</span><p>' + esc(G[0]) + '</p></div>' : '') + '<div class="sa-list">' + G[1] + '</div></div>';
      }).join("") + '</div>' +
      (isFaq ? '</div><div class="faq-contact" hidden><p>Give Us A Call Or Send A Message In The App.</p></div>' : "") +
      '</div>';
  }
  /* Polish item 13 (Swatch §B motion): rows open over 240ms (--su-ease) and close over 200ms (--su-ease-in) instead of snapping. Layout is measured at the
     final size first, so the one-screen fit (saFit) is unchanged. Reduced motion keeps the instant toggle. */
  function saReduced() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (x) { return false; } }
  function saAnim(pnl, open, after) {
    if (!pnl.animate || saReduced()) { if (!open) pnl.hidden = true; if (after) after(); return; }
    var h = pnl.scrollHeight; pnl.style.overflow = "hidden";
    var a = pnl.animate(open ? [{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }] : [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
      { duration: open ? 240 : 200, easing: open ? "cubic-bezier(.2,.8,.2,1)" : "cubic-bezier(.4,0,1,1)" });
    pnl._an = a;
    a.onfinish = function () { pnl._an = null; pnl.style.overflow = ""; if (!open) pnl.hidden = true; if (after) after(); };
  }
  function bindSaRows(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".sa-q"); if (!b || !root.contains(b)) return;
      var y = window.scrollY, open = b.getAttribute("aria-expanded") !== "true", sec = b.closest(".hs-sec") || root;
      sec.querySelectorAll('.sa-q[aria-expanded="true"]').forEach(function (o) { if (o !== b) { o.setAttribute("aria-expanded", "false"); var p = document.getElementById(o.getAttribute("aria-controls")); if (p) p.hidden = true; } });
      b.setAttribute("aria-expanded", String(open)); var pnl = document.getElementById(b.getAttribute("aria-controls")), box = b.closest(".sa-box");
      if (pnl && pnl._an) { pnl._an.cancel(); pnl._an = null; pnl.style.overflow = ""; }
      if (pnl && !open && pnl.animate && !saReduced()) { saAnim(pnl, false, function () { if (box) { saFit(box.closest(".hs-sec")); saFade(box); } }); pcScroll(y); return; }
      if (pnl) pnl.hidden = !open;
      pcScroll(y);
      if (box) { saFit(box.closest(".hs-sec")); if (open) saIntoBox(box, b.closest(".sa-item")); saFade(box); }
      if (pnl && open) saAnim(pnl, true);
    });
    /* Chip row: click or arrow keys pick a group; only that group's rows show. Opening a group closes any open row. */
    root.querySelectorAll(".sa-tabbed").forEach(function (w) {
      var tabs = [].slice.call(w.querySelectorAll(".sa-tab")), box = w.querySelector(".sa-box");
      function pick(t, focus) {
        var y = window.scrollY;
        tabs.forEach(function (o) {
          var on = o === t, pnl = document.getElementById(o.getAttribute("aria-controls"));
          o.setAttribute("aria-selected", String(on)); o.tabIndex = on ? 0 : -1;
          if (pnl) { pnl.hidden = !on; if (!on) pnl.querySelectorAll('.sa-q[aria-expanded="true"]').forEach(function (q) { q.setAttribute("aria-expanded", "false"); var a = document.getElementById(q.getAttribute("aria-controls")); if (a) a.hidden = true; }); }
        });
        if (focus) t.focus({ preventScroll: true });
        var row = t.parentNode, tl = t.offsetLeft - row.offsetLeft, tr = tl + t.offsetWidth;
        if (tl < row.scrollLeft + 8) row.scrollLeft = Math.max(0, tl - 16); else if (tr > row.scrollLeft + row.clientWidth - 8) row.scrollLeft = tr - row.clientWidth + 16;
        if (box) { box.scrollTop = 0; saFit(w.closest(".hs-sec")); saFade(box); }
        pcScroll(y);
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { pick(t, false); });
        t.addEventListener("keydown", function (e) {
          var k = e.key, j = k === "ArrowRight" ? i + 1 : k === "ArrowLeft" ? i - 1 : k === "Home" ? 0 : k === "End" ? tabs.length - 1 : null;
          if (j === null) return; e.preventDefault(); pick(tabs[(j + tabs.length) % tabs.length], true);
        });
      });
      if (box) box.addEventListener("scroll", function () { saFade(box); }, { passive: true });
    });
  }
  /* Inner scroll box helpers (Machan Nov 13 1:26 PM: "i never want to go past the screen size"). */
  function saFade(box) {
    var top = box.scrollTop > 2, more = box.scrollHeight - box.clientHeight - box.scrollTop > 2;
    box.classList.toggle("fade-t", top); box.classList.toggle("fade-b", more);
    var wrap = box.parentElement;
    if (wrap && wrap.classList.contains("sa-faq-wrap")) { wrap.classList.toggle("fade-t", top); wrap.classList.toggle("fade-b", more); }
  }
  function saIntoBox(box, item) {
    if (!item) return;
    var br = box.getBoundingClientRect(), ir = item.getBoundingClientRect(), z = zoomFactor();
    var d = 0;
    if (ir.bottom > br.bottom - 4) d = (ir.bottom - br.bottom + 12) / z;
    if (ir.top - d * z < br.top + 4) d = (ir.top - br.top - 8) / z;
    if (Math.abs(d) > 1) { try { box.scrollBy({ top: d, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch (x) { box.scrollTop += d; } }
  }
  /* The list box gets at most the room left in its one-screen section (title + chips + paddings + arrow); it only scrolls when the group is taller. */
  function saFit(sec) {
    if (!sec) return;
    var box = sec.querySelector(".sa-box"); if (!box) return;
    sec.classList.add("su-measure"); /* measure at natural height: the fill-the-room min-height and auto margins would count as content */
    try { saFitIn(sec, box); } finally { sec.classList.remove("su-measure"); }
  }
  function saFitIn(sec, box) {
    var z = zoomFactor();
    var contact = sec.id === "hs-faq" ? sec.querySelector(".faq-contact") : null;
    if (contact) contact.hidden = true;
    var grp = sec.querySelector(".sa-groups"); if (grp) { grp.style.removeProperty("margin-top"); grp.style.removeProperty("margin-bottom"); }
    box.style.maxHeight = "none"; box.style.height = "";
    /* PR108 r3 (Swatch Nov 13 4:49 PM): title + chips + box (+ See arrow) are one block centered in the section. The box keeps its natural height when
       the group is shorter than the room; when it is longer, the box takes the room minus 16px above and below the block and scrolls inside.
       FAQ Rich Look: FAQ is top-aligned so leftover space sits under the list; reserve 8px above and below (16 total) and measure air to the dock. */
    var hdr = document.querySelector(".topbar"), dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
    var topLine = hdr ? hdr.getBoundingClientRect().bottom / z : 0;
    var botLine = dock ? dock.getBoundingClientRect().top / z : (window.innerHeight / z);
    var inner = Math.max(80, botLine - 8 - topLine);
    var kids = [].filter.call(sec.children, function (c) { var k = getComputedStyle(c); return k.display !== "none" && k.position !== "absolute" && k.position !== "fixed"; });
    var total = kids.reduce(function (t, c) { var k = getComputedStyle(c); return t + c.getBoundingClientRect().height / z + (parseFloat(k.marginTop) || 0) + (parseFloat(k.marginBottom) || 0); }, 0);
    var nat = box.getBoundingClientRect().height / z, others = total - nat, gap = sec.id === "hs-faq" ? 16 : 32, room = Math.floor(inner - others - gap);
    if (nat > room) box.style.maxHeight = Math.max(120, room) + "px";
    for (var n = 0; n < 3; n++) { var over = sec.scrollHeight - sec.clientHeight; if (over <= 0) break; var h = Math.max(120, box.getBoundingClientRect().height / z - over - 2); box.style.maxHeight = h + "px"; }
    if (sec.id === "hs-faq") {
      var dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
      if (dock) {
        var dockTop = dock.getBoundingClientRect().top, br = box.getBoundingClientRect(), sr0 = sec.getBoundingClientRect(), overDock = (topLine * z + (br.bottom - sr0.top) - (dockTop - 8 * z)) / z; /* as if FAQ sits snapped under the header, wherever the page is scrolled now */
        if (overDock > 1) box.style.maxHeight = Math.max(120, br.height / z - overDock) + "px";
      }
      if (contact) saPlaceContact(sec, box, contact);
    }
    saFade(box);
  }
  /* FAQ Rich Look 05: a small warm Contact Panel only when a short group leaves real empty space above the dock. No panel when the group fills the screen. Live line only; no phone number. */
  function saPlaceContact(sec, box, contact) {
    if (box.scrollHeight > box.clientHeight + 2) { contact.hidden = true; return; }
    var dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
    if (!dock) { contact.hidden = true; return; }
    var z = zoomFactor(), dockTop = dock.getBoundingClientRect().top, boxBottom = box.getBoundingClientRect().bottom;
    contact.hidden = false;
    var cr = contact.getBoundingClientRect(), need = cr.height / z + 8;
    if ((dockTop - boxBottom) / z < need) { contact.hidden = true; return; }
    if (dockTop - contact.getBoundingClientRect().bottom < 8 * z) contact.hidden = true;
  }
  function pcHdr() { var t = document.querySelector(".topbar"); return t ? t.getBoundingClientRect().bottom : 0; }
  function pcScroll(top) { try { window.scrollTo({ top: Math.round(top), left: window.scrollX, behavior: "instant" }); } catch (x) { window.scrollTo(window.scrollX, Math.round(top)); } }
  /* Plans Expand (Machan Nov 13 7:34 PM ICT: "when you click 'and more' ... i think the whole tile should expand to cover the screen"):
     And More opens a full-screen sheet that grows out of the tile's own rect (FLIP via clip-path, no content distortion) and collapses back
     into it. Reduced motion: a plain fade. Dialog is aria-modal, focus is trapped and returned, page scroll is locked, and it closes on the X,
     Escape (top-right X only), a swipe down from the top of the list, or the phone's Back gesture (one history entry, removed on close). */
  /* Essentials sheet: Machan's keyPoints first, in his order; each one lists the real features it covers (detail kept, e.g. the drone roof wording),
     and those features are left out of the grouped list below. A keyPoint with no entry here simply shows its own label. */
  var PC_KP_COVER = {
    "Furnace/AC Tune-Up": /^fall furnace tune-up|^spring ac tune-up/i,
    "Water Heater Flush/Descale": /^water heater flush/i,
    "Appliance Filter Cleaning/Changes": /^furnace filter changes|^range hood filter|^fridge water filter/i,
    "Mold And Moisture Scan": /mold and moisture scan/i,
    "Roof Inspections": /^roof drone inspection/i,
    "Dryer Vent Cleaning": /^dryer vent cleaning/i,
    "Sump Pump Test": /^sump pump test/i
  };
  function pcShort(f) { return pcTitle(String(f).split(":")[0]); }
  /* Plans sheet split (Machan Nov 13 11:07-11:08 PM ICT, "first lay out whats covered in easy to understand format, and then have a link to a pop up
     that is more legal explination"; "don't say spring gutters and fall gutters, just say gutter cleaning x2"). The sheet shows one plain list, each
     service named once with a per-year count; the exact scope opens in a pop-up. Every line comes from pricing-config.js tier features, Legal's
     WI_LINES and the live FAQ answers. Warranties Checked is left out of Plans (Machan 11:09 PM: it already lives on the hero badge).
     [group (PC_ICONS key), label or per-plan label, lowest plan] */
  var PC_SUM = [
    ["Visits", { silver: "Seasonal Visits ×2", gold: "Seasonal Visits ×4", platinum: "Monthly Visits ×12" }, "silver"],
    ["Visits", WI_LINES.stormTile, "platinum"],
    ["Heating And Cooling", "Furnace Tune-Up", "silver"],
    ["Heating And Cooling", "AC Tune-Up", "silver"],
    ["Heating And Cooling", "Furnace Filter Changes", "silver"],
    ["Heating And Cooling", "Thermostat Check", "silver"],
    ["Heating And Cooling", "Humidifier Service", "silver"],
    ["Heating And Cooling", "Dehumidifier Check", "silver"],
    ["Water And Plumbing", "Water Heater Flush Or Descale", "silver"],
    ["Water And Plumbing", "Sump Pump Test", "silver"],
    ["Water And Plumbing", "Winter Freeze Prep", "silver"],
    ["Water And Plumbing", "Main Water Shut-Off Tagged", "silver"],
    ["Water And Plumbing", "Hose, Toilet And Caulk Checks", "silver"],
    ["Water And Plumbing", "Pipe Insulation Check", "silver"],
    ["Water And Plumbing", "Fridge Water Filter Changes", "silver"],
    ["Water And Plumbing", "Water Softener Salt Top-Off", "gold"],
    ["Roof And Outside (Drone)", { silver: "Drone Roof Inspection ×1", gold: "Drone Roof Inspection ×2", platinum: "Drone Roof Inspection ×2 + After Storms" }, "silver"],
    ["Roof And Outside (Drone)", "Drone Gutter Check", "silver"],
    ["Roof And Outside (Drone)", "Gutter Cleaning ×2", "gold"],
    ["Roof And Outside (Drone)", "Garage Door Tune-Up", "gold"],
    ["Roof And Outside (Drone)", "Vent And Ice Dam Clearing After Storms", "platinum"],
    ["Roof And Outside (Drone)", "Grading, Downspout And Window Well Checks", "silver"],
    ["Inside The Home", "Dryer Vent Cleaning", "silver"],
    ["Inside The Home", "Smoke And CO Detector Checks", "silver"],
    ["Inside The Home", "Mold And Moisture Scan", "silver"],
    ["Inside The Home", "Range Hood Filter And Fridge Coil Cleaning", "silver"],
    ["Inside The Home", "Attic Insulation Check", "silver"],
    ["Records And Perks", "Written Report After Every Visit", "silver"],
    ["Records And Perks", "Downloadable Visit Record", "silver"],
    ["Records And Perks", "Drone Roof Photos In Your Home Record", "silver"],
    ["Records And Perks", "Annual Home Health Score", "silver"],
    ["Records And Perks", "Seasonal Checklist Email", "silver"],
    ["Records And Perks", "Recall Check", "silver"],
    ["Records And Perks", "Vetted Contractor Network", "silver"],
    ["Records And Perks", "Home Record Transfers When You Sell", "silver"]
  ];
  var PC_TIER_ORDER = ["silver", "gold", "platinum"];
  function pcSumLabel(it, k) { return typeof it[1] === "string" ? it[1] : it[1][k]; }
  function pcGrpName(n) { return String(n).replace(" (Drone)", ""); }
  function pcSheetList(k) {
    var r = WI_RANK[k], prev = PC_TIER_ORDER[r - 1], g = {}, order = [];
    PC_SUM.forEach(function (it) {
      if (WI_RANK[it[2]] > r) return;
      var lab = pcSumLabel(it, k), up = r > 0 && (WI_RANK[it[2]] === r || (typeof it[1] !== "string" && it[1][prev] !== lab));
      if (!g[it[0]]) { g[it[0]] = []; order.push(it[0]); }
      g[it[0]].push('<li' + (up ? ' class="up"' : '') + '>' + esc(lab) + (up ? '<span class="sr-only"> (added in ' + esc(P.tiers[k].label) + ')</span>' : '') + '</li>');
    });
    return '<p class="pc-sum-key"><span>Counts Are Per Year</span>' + (r > 0 ? '<span class="pc-sum-up" aria-hidden="true">Added In ' + esc(P.tiers[k].label) + '</span>' : '') + '</p>' +
      '<div class="pc-sum">' + order.map(function (n) {
        return '<section class="pc-sum-g"><h4 class="pc-sum-h">' + (PC_ICONS[n] ? '<span class="pc-ico" aria-hidden="true">' + PC_ICONS[n] + '</span>' : '') + '<span>' + esc(pcGrpName(n)) + '</span></h4><ul class="pc-sum-l">' + g[n].join("") + '</ul></section>';
      }).join("") + '</div>' +
      '<p class="pc-lg-row"><button type="button" class="link mw-hover pc-lg-link" data-pc-legal aria-haspopup="dialog">See Exactly What\'s Included</button></p>';
  }
  /* The pop-up: exact scope per plan. Word for word from existing copy only (sources listed in plans-swipe-1113/legal-popup-copy.md for Legal):
     pricing-config.js tier features, WI_LINES (Legal's What's Included copy) and these FAQ answers. No new terms are written here. */
  var PC_LG_FAQ = {
    starter: "Your Starter Visit counts as one of your yearly visits.", /* FAQ what-is-included-in-each-plan */
    warranty: "Smart Upkeep is preventive maintenance that lowers the chance of breakdowns. It doesn't pay for repairs or replacements when something breaks, so keep your homeowner's insurance.", /* FAQ is-smart-upkeep-a-home-warranty-or-insurance */
    emergency: "Smart Upkeep is not an emergency service.", /* FAQ what-if-something-breaks-between-visits */
    licensed: "Licensed work (mechanical, plumbing, electrical and builder work) is done by partners with an active Michigan license you can check.", /* FAQ how-are-techs-vetted */
    price: "Your plan price depends on your home's size and equipment and never goes below that starting price. Any extras you add go on top.", /* FAQ why-is-my-price-different-from-the-starting-price */
    confirm: "Your price is based on your answers, and your tech confirms your home's systems at the first visit. If anything changes your price, we'll send the new price within 7 days, and you can accept it or cancel with no fee.", /* FAQ do-i-need-to-send-photos */
    trees: "If heavy trees need more, you can add an Extra Gutter Cleaning.", /* FAQ how-is-gutter-cleaning-priced */
    area: "Metro Detroit: Wayne, Oakland and Macomb counties." /* FAQ where-do-you-work */
  };
  /* Legal-approved pop-up lines (Legal on PR #124, Nov 13 11:4x PM ICT; logged on /workspace/legal-docs/PRE-LAUNCH-LEGAL-LIST.md): G1 highlights
     line (no link until the attorney-reviewed agreement is posted), the Recall Check line in place of "Recall Monitoring on your equipment"
     (pop-up only), and the Good To Know lines G4 (access only), G5, G6 (drone plans) and G7 (water heater flush plans). Parts, repairs,
     rescheduling/rollover, gutter limits, caps and liability wait on Machan. */
  var PC_LG_LEGAL = {
    top: "These are the highlights. Your Member Agreement has the full terms.",
    recall: "Recall Check: we look up recalls on the equipment we record at your visits.",
    access: "An adult needs to give us access, and pets need to be secured. If a task isn't safe or we can't reach it, we'll skip it and note why in your report.",
    pit: "Our visits are preventive maintenance and point-in-time checks. They lower the chance of problems but can't promise nothing will break or that every issue will be found. Keep your homeowner's insurance.",
    drone: "Drone flights depend on weather and flight rules. If we can't fly, we'll reschedule or check what we safely can from the ground.",
    flush: "We may skip the flush on a tank that's leaking, very old or has a stuck drain valve, and we'll tell you why."
  };
  function pcCap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pcLegalFeats(k) {
    var r = WI_RANK[k], out = [];
    PC_TIER_ORDER.slice(0, r + 1).forEach(function (t) { ((P.tiers[t] && P.tiers[t].features) || []).forEach(function (f) { out.push(f); }); });
    var drone = out.filter(function (f) { return /^Roof Drone Inspection/i.test(f); }).pop(); /* the highest plan's drone line replaces the lower ones */
    return out.filter(function (f) { return !/^Everything in /i.test(f) && !/visits a year/i.test(f) && !/warrant/i.test(f) && (!/^Roof Drone Inspection/i.test(f) || f === drone); })
      .map(function (f) { return f === "Recall Monitoring on your equipment" ? PC_LG_LEGAL.recall : f; });
  }
  function pcLegalHtml(k) {
    var r = WI_RANK[k], g = PC_GROUPS.map(function () { return []; });
    pcLegalFeats(k).forEach(function (f) {
      var i = f.indexOf(":"), h = i > 0 ? f.slice(0, i) : f, d = i > 0 ? f.slice(i + 1).trim() : "", x = pcTitle(h), gi = PC_GROUPS.length - 1;
      for (var j = 0; j < PC_GROUPS.length; j++) if (PC_GROUPS[j][1].test(x)) { gi = j; break; }
      g[gi].push('<li>' + (d ? '<b>' + esc(pcCap(h)) + ':</b> ' + esc(f === PC_LG_LEGAL.recall ? d : pcCap(d)) : esc(pcCap(h))) + '</li>'); /* Legal's Recall Check line stays word for word */
    });
    function sec(h, body) { return '<section class="pc-lg-s"><h4>' + esc(h) + '</h4>' + body + '</section>'; }
    function ul(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>'; }
    var plat = k === "platinum", feats = pcLegalFeats(k);
    var good = [PC_LG_LEGAL.access, PC_LG_LEGAL.pit].concat(feats.some(function (f) { return /drone/i.test(f); }) ? [PC_LG_LEGAL.drone] : []).concat(feats.some(function (f) { return /water heater flush/i.test(f); }) ? [PC_LG_LEGAL.flush] : []);
    var visits = [WI_LINES.visits[k], PC_LG_FAQ.starter].concat(plat ? [WI_LINES.storm, WI_LINES.stormNote] : []);
    var how = [WI_LINES.tuneup, plat ? WI_LINES.filterC : WI_LINES.filterEP].concat(plat ? [] : [WI_LINES.smokeEP]).concat([WI_LINES.drone[k], WI_LINES.mold]).concat(r > 0 ? [WI_LINES.gutters] : []).concat([WI_LINES.equip]);
    var lim = [PC_LG_FAQ.warranty, PC_LG_FAQ.emergency, PC_LG_FAQ.licensed, PC_LG_FAQ.price, PC_LG_FAQ.confirm].concat(r > 0 ? [PC_LG_FAQ.trees] : []);
    return '<p class="pc-lg-top">' + esc(PC_LG_LEGAL.top) + '</p>' + sec("Visits", ul(visits)) +
      sec("Every Included Service", PC_GROUPS.map(function (G, i) { return g[i].length ? '<h5>' + esc(pcGrpName(G[0])) + '</h5><ul>' + g[i].join("") + '</ul>' : ""; }).join("")) +
      sec("How Each Service Is Done", ul(how)) +
      sec("Limits And Exclusions", ul(lim)) +
      sec("Service Area", ul([PC_LG_FAQ.area])) +
      sec("Good To Know", ul(good));
  }
  function bindPlanMore(root) {
    /* Sheet motion (Machan Nov 13 8:40 PM ICT, "make the close really smooth"): the sheet surface is clipped (clip-path inset, the radius
       interpolated from 0 to the tile's own corner radius) between the full screen and the tile's rect; content moves only by opacity/transform.
       The real tile stays painted under the sheet the whole time, so the sheet dissolves into it on close (no hide/unhide swap, no border or
       radius snap). will-change is set only while an animation runs. Scroll lock is html-only (body overflow would break the sticky top bar),
       scrollY is saved on open and put back on close, and history scroll restoration is paused while the sheet's history entry exists.
       Swipe between plans (Machan Nov 13 11:06 PM ICT, "you should still be able to swipe between the plans and stay expanded"): a sideways
       swipe, Left/Right keys or the small arrows slide the next plan in (same easeInOutSine feel as the Home glide), with no wrap past the ends
       (soft edge resistance). Axis lock: the first 8px decide sideways vs up/down, so a diagonal never does both. The row and dots under the sheet
       follow, so closing lands on the shown plan's tile. No history entry per swipe: Back still closes in one step. */
    var sheetDur = 340, closeDur = 300, ease = "cubic-bezier(.2,.8,.2,1)", easeIn = "cubic-bezier(.4,0,.2,1)", slideEase = "cubic-bezier(.37,0,.63,1)";
    var cur = null; /* { wrap, sheet, card, trigger, hist, y, sr, k, anim, lg } */
    function reduce() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    function rad(card) { return parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0; }
    function inset(r, rr) { var w = document.documentElement.clientWidth, h = window.innerHeight; return "inset(" + Math.max(0, r.top) + "px " + Math.max(0, w - r.right) + "px " + Math.max(0, h - r.bottom) + "px " + Math.max(0, r.left) + "px round " + rr + "px)"; }
    var FULL = "inset(0px 0px 0px 0px round 0px)";
    function lock(on) { document.documentElement.classList.toggle("pc-lock", on); }
    function wc(els, v) { els.forEach(function (el) { el.style.willChange = v || ""; }); }
    function focusables(el) { return [].slice.call(el.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; }); }
    function cards() { return [].slice.call(root.querySelectorAll("#row-plans .hm-plan[data-tier]")); }
    function keys() { return cards().map(function (c) { return c.getAttribute("data-tier"); }); }
    function goLabel(k) { return "Get Started With " + esc(P.tiers[k].label) + '<span class="hm-cta-arr" aria-hidden="true">→</span>'; }
    function tierCls(k) { return "pc-sheet-wrap tier-" + k + (P.tiers[k].recommended ? " rec" : ""); }
    function slideDur(px) { return Math.round(Math.min(560, Math.max(440, 320 + Math.abs(px) * 0.4))); }
    function mkPane(k, active) {
      var t = P.tiers[k], p = document.createElement("div");
      p.className = "pc-pane"; p.setAttribute("data-k", k);
      p.innerHTML = '<div class="pc-sheet-hd">' +
          '<h3' + (active ? ' id="pcSheetT"' : '') + ' class="pc-name">' + esc(t.label) + '</h3><span class="pc-tag muted small">' + esc(t.tagline) + '</span>' +
          '<div class="pc-price"><span class="pc-from">From</span><span class="pc-big">' + money(t.fromMonthly || P.minMonthly || 139) + '</span><span class="pc-per">/mo</span></div>' +
          '<div class="pc-year"><span class="pc-year-n">' + t.visits + '</span> <span class="pc-year-l">Visits / Year</span></div></div>' +
        '<div class="pc-sheet-body">' + pcSheetList(k) + '</div>';
      return p;
    }
    function navHtml(k) {
      var ks = keys(), i = ks.indexOf(k);
      if (ks.length < 2) return "";
      return '<div class="pc-nav"><button type="button" class="pc-nav-b mw-hover" data-pc-step="-1" aria-label="Previous Plan"' + (i <= 0 ? " disabled" : "") + '>&lsaquo;</button>' +
        '<span class="pc-pos" aria-hidden="true">' + ks.map(function (x) { return '<span class="pc-pos-d' + (x === k ? " on" : "") + '"></span>'; }).join("") + '</span>' +
        '<button type="button" class="pc-nav-b mw-hover" data-pc-step="1" aria-label="Next Plan"' + (i >= ks.length - 1 ? " disabled" : "") + '>&rsaquo;</button>' +
        '<span class="sr-only" aria-live="polite">' + esc(P.tiers[k].label) + ', Plan ' + (i + 1) + ' Of ' + ks.length + '</span></div>';
    }
    function build(card) {
      var k = card.getAttribute("data-tier");
      var wrap = document.createElement("div");
      wrap.className = tierCls(k);
      wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "pcSheetT");
      wrap.innerHTML = '<div class="pc-sheet-bg" data-pc-close></div><div class="pc-sheet" tabindex="-1"><div class="pc-sheet-in">' +
          '<div class="pc-sheet-grab" aria-hidden="true"></div>' +
          '<button type="button" class="pc-sheet-x mw-hover" data-pc-close aria-label="Close">' + X_SVG + '</button>' +
          '<div class="pc-panes"></div>' +
          '<div class="pc-sheet-ft"><div class="pc-nav-w">' + navHtml(k) + '</div><button type="button" class="btn btn-primary mw-hover pc-sheet-go">' + goLabel(k) + '</button></div>' +
        '</div></div>' +
        '<div class="pc-lg" role="dialog" aria-modal="true" aria-labelledby="pcLgT" hidden><div class="pc-lg-bg" data-lg-close></div><div class="pc-lg-card">' +
          '<button type="button" class="pc-lg-x mw-hover" data-lg-close aria-label="Close">' + X_SVG + '</button>' +
          '<div class="pc-lg-hd"><span class="pc-lg-ico" aria-hidden="true">' + PC_ICONS["Records And Perks"] + '</span><h3 id="pcLgT"></h3></div>' +
          '<div class="pc-lg-body" tabindex="0"></div></div></div>';
      wrap.querySelector(".pc-panes").appendChild(mkPane(k, true));
      document.body.appendChild(wrap);
      return wrap;
    }
    /* keep the swipe row and its dots on the shown plan, so the close animation flies back to the right tile */
    function syncRow(card) {
      var sc = card.parentNode; if (!sc || !sc.classList || !sc.classList.contains("hm-scroll") || sc.scrollWidth <= sc.clientWidth + 1) return;
      var sb = sc.style.scrollBehavior; sc.style.scrollBehavior = "auto";
      hmPlanGo(sc, card, "auto");
      sc.style.scrollBehavior = sb;
      try { sc.dispatchEvent(new Event("scroll")); } catch (e) {}
    }
    function setCur(k) {
      var card = cards()[keys().indexOf(k)]; if (!card || !cur) return;
      cur.trigger.setAttribute("aria-expanded", "false");
      cur.card = card; cur.k = k; cur.trigger = card.querySelector("[data-pc-more]") || card;
      cur.trigger.setAttribute("aria-expanded", "true");
      cur.wrap.className = tierCls(k);
      cur.wrap.querySelector(".pc-sheet-go").innerHTML = goLabel(k);
      var nw = cur.wrap.querySelector(".pc-nav-w"), had = nw.contains(document.activeElement) && document.activeElement.getAttribute("data-pc-step");
      nw.innerHTML = navHtml(k);
      if (had) { var nb = nw.querySelector('[data-pc-step="' + had + '"]:not([disabled])') || nw.querySelector("[data-pc-step]:not([disabled])"); if (nb) nb.focus({ preventScroll: true }); }
      syncRow(card);
    }
    function pane() { return cur && cur.wrap.querySelector(".pc-pane:not(.pc-out)"); }
    function edge(d) {
      var p = pane(); if (!p || reduce()) return;
      p.animate([{ transform: "translateX(0)" }, { transform: "translateX(" + (-d * 14) + "px)" }, { transform: "translateX(0)" }], { duration: 280, easing: slideEase });
    }
    /* slide d (+1 next, -1 previous); nb is a neighbor pane already placed by a drag, tx the drag offset so far */
    function slide(d, nb, tx) {
      var ks = keys(), j = ks.indexOf(cur.k) + d; if (j < 0 || j >= ks.length) { edge(d); return; }
      var k2 = ks[j], old = pane(), box = cur.wrap.querySelector(".pc-panes"), w = box.clientWidth || window.innerWidth;
      tx = tx || 0;
      if (!nb) { nb = mkPane(k2, false); nb.style.transform = "translateX(" + (d * w) + "px)"; box.appendChild(nb); }
      var h = old.querySelector("#pcSheetT"); if (h) h.removeAttribute("id");
      nb.querySelector(".pc-name").id = "pcSheetT";
      setCur(k2);
      function fin() { if (old.parentNode) old.remove(); nb.style.transform = ""; old.style.transform = ""; wc([nb, old]); if (cur) cur.anim = false; }
      if (reduce()) { fin(); return; }
      cur.anim = true; old.classList.add("pc-out");
      var left = Math.max(0.35, 1 - Math.abs(tx) / w), dur = Math.round(slideDur(w) * left);
      wc([nb, old], "transform");
      old.animate([{ transform: "translateX(" + tx + "px)" }, { transform: "translateX(" + (-d * w) + "px)" }], { duration: dur, easing: tx ? "cubic-bezier(.2,.6,.35,1)" : slideEase, fill: "forwards" });
      var a = nb.animate([{ transform: "translateX(" + (d * w + tx) + "px)" }, { transform: "translateX(0px)" }], { duration: dur, easing: tx ? "cubic-bezier(.2,.6,.35,1)" : slideEase, fill: "forwards" });
      var once = false; function f2() { if (once) return; once = true; try { a.cancel(); } catch (e) {} fin(); }
      a.onfinish = f2; setTimeout(f2, dur + 400);
    }
    function step(d) { if (!cur || cur.anim || cur.lg) return; slide(d); }
    function lgOpen(from) {
      if (!cur || cur.lg || cur.anim) return;
      var lg = cur.wrap.querySelector(".pc-lg"), body = lg.querySelector(".pc-lg-body");
      lg.querySelector("#pcLgT").textContent = P.tiers[cur.k].label + ": Exactly What's Included";
      body.innerHTML = pcLegalHtml(cur.k); body.scrollTop = 0;
      lg.hidden = false; cur.lg = { from: from, hist: false };
      try { history.pushState({ pcSheet: 1, pcLegal: 1, su: history.state && history.state.su, s: history.state && history.state.s }, "", location.pathname + location.search + location.hash); cur.lg.hist = true; } catch (e) {}
      if (!reduce()) {
        lg.querySelector(".pc-lg-card").animate([{ opacity: 0, transform: "translateY(8px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out" });
        lg.querySelector(".pc-lg-bg").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
      }
      var x = lg.querySelector(".pc-lg-x"); try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
    }
    function lgClose(fromPop) {
      if (!cur || !cur.lg) return;
      var L = cur.lg; cur.lg = null;
      cur.wrap.querySelector(".pc-lg").hidden = true;
      if (L.hist && !fromPop) { try { history.back(); } catch (e) {} }
      var f = L.from && L.from.isConnected ? L.from : cur.wrap.querySelector(".pc-lg-link");
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
    }
    function open(card, trigger) {
      if (cur) return;
      var y = window.scrollY, sr = null;
      try { sr = history.scrollRestoration; history.scrollRestoration = "manual"; } catch (e) {}
      var wrap = build(card), sheet = wrap.querySelector(".pc-sheet"), r = card.getBoundingClientRect(), rr = rad(card);
      cur = { wrap: wrap, sheet: sheet, card: card, trigger: trigger, hist: false, y: y, sr: sr, k: card.getAttribute("data-tier"), anim: false, lg: null };
      try { history.pushState({ pcSheet: 1, su: history.state && history.state.su, s: history.state && history.state.s }, "", location.pathname + location.search + location.hash); cur.hist = true; } catch (e) {}
      lock(true);
      trigger.setAttribute("aria-expanded", "true");
      var inn = wrap.querySelector(".pc-sheet-in"), bg = wrap.querySelector(".pc-sheet-bg"), a;
      if (reduce()) { a = wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" }); }
      else {
        wc([sheet], "clip-path, opacity"); wc([inn], "opacity, transform");
        a = sheet.animate([{ clipPath: inset(r, rr), opacity: 0 }, { opacity: 1, offset: 0.22 }, { clipPath: FULL, opacity: 1 }], { duration: sheetDur, easing: ease });
        inn.animate([{ opacity: 0, transform: "translateY(" + Math.round(Math.max(0, r.top) * 0.2) + "px)" }, { opacity: 0, offset: 0.3 }, { opacity: 1, transform: "none" }], { duration: sheetDur, easing: ease });
        bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: sheetDur, easing: "ease-out" });
      }
      a.onfinish = function () { wc([sheet, inn]); };
      var x = wrap.querySelector(".pc-sheet-x"); setTimeout(function () { try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); } }, 30);
      wrap.addEventListener("click", function (e) {
        if (e.target.closest("[data-lg-close]")) { e.preventDefault(); lgClose(); return; }
        if (e.target.closest("[data-pc-legal]")) { e.preventDefault(); lgOpen(e.target.closest("[data-pc-legal]")); return; }
        if (e.target.closest("[data-pc-close]")) { e.preventDefault(); close(); return; }
        var sb = e.target.closest("[data-pc-step]"); if (sb) { e.preventDefault(); step(+sb.getAttribute("data-pc-step")); return; }
        if (e.target.closest(".pc-sheet-go")) { e.preventDefault(); var c = cur && cur.card; close(true); if (c) { c.click(); var go = app.querySelector(".hm-tab-cta"); if (go) go.click(); } }
      });
      wrap.addEventListener("keydown", function (e) {
        var box = cur && cur.lg ? wrap.querySelector(".pc-lg-card") : wrap;
        if (e.key === "Escape") { e.preventDefault(); if (cur && cur.lg) lgClose(); else close(); return; }
        if (!(cur && cur.lg) && (e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.altKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); return; }
        if (e.key !== "Tab") return;
        var f = focusables(box); if (!f.length) return;
        var a0 = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a0 || !box.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && (document.activeElement === z || !box.contains(document.activeElement))) { e.preventDefault(); a0.focus(); }
      });
      /* one touch path: the first 8px lock the axis. Sideways drags the panes (neighbor follows, edges resist); down closes from the header,
         or from the list when it is scrolled to the top; vertical list scroll is left to the browser. */
      var box = wrap.querySelector(".pc-panes"), T = null;
      sheet.addEventListener("touchstart", function (e) {
        if (!cur || cur.anim || e.touches.length > 1 || e.target.closest(".pc-lg")) { T = null; return; }
        var p = pane(), body = p && p.querySelector(".pc-sheet-body"), inBody = body && body.contains(e.target);
        T = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, t0: performance.now(), ax: null, dx: 0, dy: 0, yOk: !inBody || body.scrollTop <= 0, inPanes: box.contains(e.target), nb: null, d: 0, tx: 0 };
      }, { passive: true });
      sheet.addEventListener("touchmove", function (e) {
        if (!T || !cur) return;
        T.dx = e.touches[0].clientX - T.x0; T.dy = e.touches[0].clientY - T.y0;
        if (!T.ax) { if (Math.max(Math.abs(T.dx), Math.abs(T.dy)) < 8) return; T.ax = (T.inPanes && Math.abs(T.dx) > Math.abs(T.dy)) ? "x" : "y"; }
        if (T.ax === "x") {
          if (e.cancelable) e.preventDefault();
          var ks = keys(), i = ks.indexOf(cur.k), d = T.dx < 0 ? 1 : -1, w = box.clientWidth || window.innerWidth, has = i + d >= 0 && i + d < ks.length;
          if (d !== T.d) { if (T.nb) { T.nb.remove(); T.nb = null; } T.d = d; if (has) { T.nb = mkPane(ks[i + d], false); box.appendChild(T.nb); } }
          T.tx = has ? T.dx : (T.dx > 0 ? 1 : -1) * Math.min(56, Math.abs(T.dx) * 0.25);
          var p = pane(); if (p) p.style.transform = "translateX(" + T.tx + "px)";
          if (T.nb) T.nb.style.transform = "translateX(" + (d * w + T.tx) + "px)";
          return;
        }
        if (!T.yOk) return;
        if (T.dy > 0) sheet.style.transform = "translateY(" + Math.round(T.dy * 0.6) + "px)"; else sheet.style.transform = "";
      }, { passive: false });
      function tEnd() {
        if (!T || !cur) { T = null; return; }
        var t = T; T = null;
        if (t.ax === "x") {
          var w = box.clientWidth || window.innerWidth, v = t.dx / Math.max(1, performance.now() - t.t0), p = pane();
          if (t.nb && (Math.abs(t.dx) > w * 0.2 || Math.abs(v) > 0.45)) { slide(t.d, t.nb, t.tx); return; }
          var back = [p, t.nb].filter(Boolean);
          if (reduce()) { back.forEach(function (el) { el.style.transform = ""; }); if (t.nb) t.nb.remove(); return; }
          if (p) p.animate([{ transform: "translateX(" + t.tx + "px)" }, { transform: "translateX(0px)" }], { duration: 240, easing: slideEase });
          if (p) p.style.transform = "";
          if (t.nb) { var nb = t.nb; nb.animate([{ transform: "translateX(" + (t.d * w + t.tx) + "px)" }, { transform: "translateX(" + (t.d * w) + "px)" }], { duration: 240, easing: slideEase }).onfinish = function () { nb.remove(); }; nb.style.transform = "translateX(" + (t.d * w) + "px)"; }
          return;
        }
        if (t.ax === "y" && t.yOk && t.dy > 90) { close(); return; }
        if (sheet.style.transform) { sheet.style.transition = "transform .2s ease-out"; sheet.style.transform = ""; setTimeout(function () { sheet.style.transition = ""; }, 220); }
      }
      sheet.addEventListener("touchend", tEnd);
      sheet.addEventListener("touchcancel", tEnd);
    }
    function close(instant, fromPop) {
      if (!cur) return;
      var c = cur; cur = null;
      var back = c.lg && c.lg.hist && !fromPop ? 2 : 1;
      if (c.lg) { c.wrap.querySelector(".pc-lg").hidden = true; c.lg = null; }
      if (c.hist && !fromPop) { c.hist = false; try { if (back === 2) history.go(-2); else history.back(); } catch (e) {} }
      c.trigger.setAttribute("aria-expanded", "false");
      var finished = false;
      var done = function () {
        if (finished) return; finished = true;
        lock(false);
        if (Math.abs(window.scrollY - c.y) > 0.5) { try { window.scrollTo({ top: c.y, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, c.y); } }
        c.wrap.remove();
        try { c.trigger.focus({ preventScroll: true }); } catch (e) { c.trigger.focus(); }
        setTimeout(function () { try { if (c.sr) history.scrollRestoration = c.sr; } catch (e) {} }, 400);
      };
      if (instant) { done(); return; }
      var r = c.card.getBoundingClientRect(), rr = rad(c.card), inn = c.wrap.querySelector(".pc-sheet-in"), bg = c.wrap.querySelector(".pc-sheet-bg"), a;
      var tf = c.sheet.style.transform;
      if (reduce()) a = c.wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in", fill: "forwards" });
      else if (tf) {
        wc([c.sheet], "transform");
        a = c.sheet.animate([{ transform: tf }, { transform: "translateY(100%)" }], { duration: 240, easing: easeIn, fill: "forwards" });
        bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: "forwards" });
      } else {
        wc([c.sheet], "clip-path, opacity"); wc([inn], "opacity, transform");
        /* surface: clip to the tile rect and corner radius, then dissolve into the real tile underneath over the last 55% */
        a = c.sheet.animate([{ clipPath: FULL, opacity: 1 }, { opacity: 1, offset: 0.45 }, { clipPath: inset(r, rr), opacity: 0 }], { duration: closeDur, easing: ease, fill: "forwards" });
        inn.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(" + Math.round(Math.max(0, r.top) * 0.12) + "px)", offset: 0.35 }, { opacity: 0, transform: "translateY(" + Math.round(Math.max(0, r.top) * 0.12) + "px)" }], { duration: closeDur, easing: "linear", fill: "forwards" });
        bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: closeDur, easing: "ease-out", fill: "forwards" });
      }
      a.onfinish = done;
      setTimeout(done, closeDur + 900); /* safety net if a throttled background tab never fires finish */
    }
    /* Back: closes the pop-up first (its own entry), then the sheet */
    window.addEventListener("popstate", function () {
      if (!cur) return;
      var st = history.state || {};
      if (cur.lg && !st.pcLegal) { lgClose(true); if (st.pcSheet) return; }
      if (!st.pcSheet) close(false, true);
    });
    root.querySelectorAll("[data-pc-more]").forEach(function (b) {
      ["pointerdown", "keydown"].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }); });
      b.setAttribute("aria-haspopup", "dialog"); b.removeAttribute("aria-controls");
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); open(b.closest(".hm-plan"), b); });
    });
  }
  /* Plans fills one screen (Machan Nov 13 11:09-11:11 PM ICT, "our goal for how many items we fit on the plans preview should be 6-8" ... "we have more
     room, its just not alligned properly"). --su-fill-h is the room between the header and the bar; Plans, Tailor Your Plan and FAQ have it as a
     min-height only (they still grow if content is taller, nothing is clipped). Essentials shows every keyPoint and drops one at a time (never below 6)
     only if the section would grow past the room. Leftover room goes first to line spacing inside the tiles (capped at 9px above and below each line,
     11px on 900px-tall screens), then is split evenly above the tiles and below the dots; the See arrow stays 8px over the bar, so Tailor Your Plan
     starts at or below the bar top. */
  function pcFitLines() {
    /* r2 (Nov 13 11:4x PM ICT, "use the leftover room for content, not padding"): every tile shows all its items (Essentials 7, Plus 7,
       Complete 7) and drops trailing items one at a time (never below 6 real items) only if the section would grow past the room. Leftover room
       then goes to the item type (up to 18px on phones, 16px on desktop), the line spacing (up to 14px above and below each item) and, last, the tiles themselves:
       the row stretches to fill the panel and items spread evenly inside each tile. Header-to-tiles and dots-to-arrow gaps stay fixed. */
    var sec = document.getElementById("hs-plans"); if (!sec) return;
    var z = zoomFactor(), rs = document.documentElement.style;
    var hdr = document.querySelector(".topbar"), dock = document.querySelector("body.on-home .hm-tabs.hm-dock") || document.querySelector(".hm-dock");
    var fill = Math.floor(Math.max(240, ((dock ? dock.getBoundingClientRect().top : window.innerHeight) - (hdr ? hdr.getBoundingClientRect().bottom : 0)) / z));
    rs.setProperty("--su-fill-h", fill + "px"); rs.setProperty("--pc-li-pad", "0px"); rs.removeProperty("--pc-li-fs"); sec.classList.remove("pc-fs");
    var cards = [].slice.call(sec.querySelectorAll("#row-plans .hm-plan")), sets = cards.map(function (c) { return [].slice.call(c.querySelectorAll(".pc-inc li[data-i]")); });
    var n = Math.max.apply(null, sets.map(function (l) { return l.length; }).concat([0]));
    function show(m) { sets.forEach(function (l) { l.forEach(function (li, i) { li.hidden = i >= m; }); }); }
    function natural() { sec.classList.add("pc-measure"); var h = sec.getBoundingClientRect().height / z; sec.classList.remove("pc-measure"); return h; }
    show(n);
    while (n > 6 && natural() > fill + 0.5) { n--; show(n); }
    cards.forEach(function (c, i) { c.setAttribute("data-lines", String(Math.min(n, sets[i].length))); });
    var lines = Math.max.apply(null, cards.map(function (c) { return [].filter.call(c.querySelectorAll(".pc-inc > li"), function (li) { return !li.hidden; }).length; }).concat([1]));
    var phone = window.innerWidth <= 600;
    var fsMax = phone ? 15 : 14; /* slightly smaller than the old 18/16 cap (Machan Nov 14 9:25 AM) */
    if (natural() < fill - 4) {
      var li0 = sec.querySelector("#row-plans .pc-inc > li[data-i]"), fs = li0 ? Math.round(parseFloat(getComputedStyle(li0).fontSize) / z) : 13;
      sec.classList.add("pc-fs");
      while (fs < fsMax) { rs.setProperty("--pc-li-fs", (fs + 1) + "px"); if (natural() > fill - 4) break; fs++; }
      rs.setProperty("--pc-li-fs", Math.max(13, fs) + "px");
    }
    var slack = fill - natural();
    /* Machan Nov 14: tighten Essentials lines to the top; ~8-10px item gaps at 430 (pad 4 => gap 9), proportional on narrower phones. */
    var padCap = Math.round(4 * Math.min(window.innerWidth, 430) / 430 * 10) / 10;
    if (slack > 4) rs.setProperty("--pc-li-pad", Math.min(padCap, Math.floor(slack * 0.5 / lines / 2 * 10) / 10) + "px");
  }

  /* Badge carousel (Machan Nov 13 1:24 PM: "i want to be able to scroll the badges as they are passing"). The CSS keyframe loop is swapped for a
     rAF loop at the same speed (one set width per animation-duration, read from the CSS, so the pace is unchanged). Drag by touch or mouse, or
     wheel/trackpad sideways, moves it by hand; about 1s after letting go it carries on from that spot. The offset wraps modulo one set width
     (two identical sets), so there is no jump in either direction. touch-action:pan-y keeps vertical page scroll; the page never scrolls sideways.
     Reduced motion: no auto-motion and the CSS native sideways scroll stays (manual only). */
  /* Machan Nov 13 7:48 PM ICT: tapping any hero badge opens a short explanation (one shared overlay card under the badge row, so the hero never grows).
     Copy lives in HERO_INFO (live FAQ + Warranties pop-up wording). Closes on a second tap, a tap outside or Esc; the strip pauses while open.
     A tap right after a swipe drag is ignored. */
  function bindBadgeInfo(c) {
    var wrapEl = c.closest(".hm-hcw"), panel = wrapEl && wrapEl.querySelector(".hm-hc-info");
    if (!panel || c.dataset.hcInfo) return; c.dataset.hcInfo = "1";
    var tEl = panel.querySelector(".hm-hc-info-t"), xEl = panel.querySelector(".hm-hc-info-x");
    var icoEl = panel.querySelector(".hm-hc-info-ico"), card = panel.querySelector(".hm-hc-info-card");
    var caret = panel.querySelector(".hm-hc-info-caret"), scrim = panel.querySelector("[data-hc-close]");
    var cur = "", hideT = 0, badgeEl = null;
    function chips(lbl) { return Array.prototype.slice.call(c.querySelectorAll(".hm-hchip")).filter(function (b) { return !lbl || b.getAttribute("data-hc-info") === lbl; }); }
    function reducedMotion() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    function chipIcon(lbl) {
      for (var i = 0; i < HERO_CHIPS.length; i++) if (HERO_CHIPS[i][1] === lbl) return HERO_CHIPS[i][0];
      return "shield";
    }
    function place() {
      if (!card || !cur || !badgeEl) return;
      var vw = innerWidth, vh = innerHeight, pad = 16, maxW = Math.min(260, vw - 32);
      card.classList.remove("sheet");
      card.style.maxWidth = maxW + "px";
      card.style.left = pad + "px"; card.style.top = "0px";
      var cw = Math.min(card.offsetWidth || maxW, maxW), ch = card.offsetHeight || 120;
      var thumb = document.querySelector(".hm-hero .hm-thumb");
      var arrow = document.querySelector("#hs-top > .hs-arrow");
      var dock = document.querySelector(".hm-dock");
      var vR = thumb && thumb.getBoundingClientRect();
      var aR = arrow && arrow.getBoundingClientRect();
      var dR = dock && dock.getBoundingClientRect();
      var bR = badgeEl.getBoundingClientRect();
      var minX = pad, maxX = vw - pad;
      /* .hm-hero-txt is a tall fade box; measure the actual type lines. */
      var typeTop = Infinity, typeBottom = 0;
      [".hm-hero .hm-eb-t", ".hm-hero h1", ".hm-hero .hm-lead"].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.height < 1) return;
        if (r.top < typeTop) typeTop = r.top;
        if (r.bottom > typeBottom) typeBottom = r.bottom;
      });
      var arrowTop = aR ? aR.top : (dR ? dR.top : vh);
      var dockTop = dR && dR.height ? dR.top : vh;
      var limitBottom = Math.min(vh - pad, arrowTop - 8, dockTop - 8);
      if (typeTop !== Infinity) limitBottom = Math.min(limitBottom, typeTop - 8);
      /* Prefer the clear video field above the eyebrow/price/tagline, never over See Plans. */
      var minY = Math.max(pad, vR ? vR.top + 8 : pad);
      var maxY = Math.min(limitBottom, vR ? Math.min(vR.bottom - 8, typeTop === Infinity ? vR.bottom - 8 : typeTop - 8) : limitBottom);
      var left, top, sheet = false;
      if (maxY - minY >= ch) {
        top = minY + Math.max(0, (maxY - minY - ch) / 2);
        left = bR.left + bR.width / 2 - cw / 2;
      } else if (vR && (vR.bottom - Math.max(minY, vR.top + 8) >= ch) && (Math.max(minY, vR.top + 8) + ch <= limitBottom)) {
        top = Math.max(minY, vR.top + 8);
        left = bR.left + bR.width / 2 - cw / 2;
      } else {
        sheet = true;
      }
      if (sheet) {
        card.classList.add("sheet");
        cw = Math.min(vw - 32, Math.max(cw, Math.min(260, vw - 32)));
        card.style.maxWidth = cw + "px";
        ch = card.offsetHeight || ch;
        top = Math.min(limitBottom, arrowTop - 8) - ch;
        left = (vw - cw) / 2;
        if (top < pad) top = pad;
      }
      if (left < minX) left = minX;
      if (left + cw > maxX) left = maxX - cw;
      if (top + ch > limitBottom) top = Math.max(pad, limitBottom - ch);
      if (top < pad) top = pad;
      left = Math.round(left); top = Math.round(top);
      card.style.left = left + "px";
      card.style.top = top + "px";
      var ox = bR.left + bR.width / 2 - left, oy = bR.top + bR.height / 2 - top;
      card.style.transformOrigin = ox + "px " + oy + "px";
      if (caret) {
        var cx = bR.left + bR.width / 2 - left - 6;
        cx = Math.max(16, Math.min(cw - 22, cx));
        var below = bR.top > top + ch / 2;
        caret.classList.toggle("up", !below && !sheet);
        caret.classList.toggle("down", below || sheet);
        caret.style.left = Math.round(cx) + "px";
        caret.style.right = "auto";
      }
    }
    function close(refocus) {
      if (!cur) return; var was = cur; cur = ""; badgeEl = null;
      chips().forEach(function (b) { b.setAttribute("aria-expanded", "false"); b.classList.remove("on"); });
      c.classList.remove("hc-open"); panel.classList.remove("open");
      clearTimeout(hideT); hideT = setTimeout(function () { if (!cur) panel.hidden = true; }, reducedMotion() ? 0 : 160);
      if (refocus) { var b = chips(was).filter(function (x) { return !x.closest("[aria-hidden]"); })[0]; if (b) b.focus({ preventScroll: true }); }
    }
    function open(lbl, from) {
      var txt = HERO_INFO[lbl]; if (!txt) return;
      chips().forEach(function (b) { var on = b.getAttribute("data-hc-info") === lbl; b.setAttribute("aria-expanded", on ? "true" : "false"); b.classList.toggle("on", on); });
      tEl.textContent = lbl; xEl.textContent = txt;
      if (icoEl) icoEl.innerHTML = I(chipIcon(lbl));
      cur = lbl; badgeEl = from || chips(lbl).filter(function (x) { return !x.closest("[aria-hidden]"); })[0];
      clearTimeout(hideT);
      panel.hidden = false; panel.classList.remove("open");
      place();
      c.classList.add("hc-open"); void panel.offsetWidth; panel.classList.add("open");
    }
    function hit(e) {
      var b = e.target.closest && e.target.closest(".hm-hchip"); if (b && c.contains(b)) return b;
      var x = e.clientX, y = e.clientY; if (!x && !y) return null;
      return chips().filter(function (k) { var r = k.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top - 4 && y <= r.bottom + 4; })[0] || null;
    }
    c.addEventListener("click", function (e) {
      if (performance.now() - (c._dragEnd || 0) < 350) return; /* a swipe is not a tap */
      var b = hit(e); if (!b) return;
      var lbl = b.getAttribute("data-hc-info"); if (cur === lbl) close(false); else open(lbl, b);
    });
    if (scrim) scrim.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); close(false); });
    panel.addEventListener("click", function (e) { if (e.target === panel) { e.preventDefault(); e.stopPropagation(); close(false); } });
    document.addEventListener("click", function (e) {
      if (!cur) return;
      if (panel.contains(e.target) || (e.target.closest && e.target.closest(".hm-hchip") && c.contains(e.target))) return;
      e.preventDefault(); e.stopPropagation(); close(false);
    }, true); /* capture so the first outside tap cannot pass through to See Plans */
    document.addEventListener("keydown", function (e) { if (cur && e.key === "Escape") { e.preventDefault(); close(true); } });
    window.addEventListener("resize", function () { if (cur) place(); });
  }
  function bindBadgeStrip(c) {
    var track = c.querySelector(".hm-hc-track"), set = track && track.querySelector(".hm-hc-set");
    if (!track || !set || c.dataset.mq) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    c.dataset.mq = "1";
    var dur = parseFloat(getComputedStyle(track).animationDuration) || 32; if (dur < 1) dur = 32;
    c.classList.add("js-mq");
    var setW = 0, x = 0, last = 0, hold = 0, hover = false, drag = null, raf = 0, dragEnd = 0;
    function measure() { var w = set.getBoundingClientRect().width / zoomFactor(); if (w > 0) { if (setW) x = x / setW * w; setW = w; } }
    function wrap() { if (setW > 0) { x = x % setW; if (x < 0) x += setW; } }
    function paint() { track.style.transform = "translate3d(" + (-x).toFixed(2) + "px,0,0)"; }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (!setW) measure();
      if (!drag && !hover && t >= hold && !document.hidden && setW && !c.classList.contains("hc-open")) { x += setW / dur * dt; wrap(); paint(); } /* paused while a badge explanation is open */
    }
    function pause(ms) { hold = performance.now() + ms; }
    measure(); paint(); raf = requestAnimationFrame(frame);
    addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    c.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, off: x, moved: false, mouse: e.pointerType === "mouse" };
      if (drag.mouse) { try { c.setPointerCapture(e.pointerId); } catch (_) {} c.classList.add("dragging"); }
    });
    c.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 4) return;
      if (!drag.moved) { drag.moved = true; if (!drag.mouse) { try { c.setPointerCapture(e.pointerId); } catch (_) {} } c.classList.add("dragging"); }
      x = drag.off - dx / zoomFactor(); wrap(); paint();
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved) { dragEnd = performance.now(); c._dragEnd = dragEnd; hover = false; }
      drag = null; c.classList.remove("dragging"); pause(1000); last = 0;
    }
    ["pointerup", "pointercancel"].forEach(function (ev) { c.addEventListener(ev, end); });
    c.addEventListener("lostpointercapture", function (e) { if (e.target === c) end(e); }); /* a child losing its implicit touch capture is not a release */
    c.addEventListener("click", function (e) { if (performance.now() - dragEnd < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
    c.addEventListener("wheel", function (e) {
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!d) return;
      e.preventDefault(); x += (e.deltaMode === 1 ? d * 16 : d); wrap(); paint(); pause(1000); hover = false;
    }, { passive: false });
    if (window.matchMedia && matchMedia("(hover: hover)").matches) {
      c.addEventListener("mouseenter", function () { hover = true; });
      c.addEventListener("mouseleave", function () { hover = false; pause(0); last = 0; });
    }
  }
  function bindHome() {
    var root = app.querySelector(".hm"); if (!root) return;
    bindPlanMore(root);
    bindSaRows(root);
    root.querySelectorAll(".hm-hchips").forEach(bindBadgeStrip); root.querySelectorAll(".hm-hchips").forEach(bindBadgeInfo);
    hmHdrSync();
    bindPlanSwipe(root); bindAlcCar(root); bindFaqCar(root); bindOffer(root); bindInc(root); bindWiRedo(root);
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
    root.querySelectorAll("[data-hs-next]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); jumpSec(b.getAttribute("data-hs-next")); }); });
    function placeInd(id, instant) {
      var row = root.querySelector(".hm-tabs-row"), ind = root.querySelector(".hm-tab-ind"), btn = root.querySelector('[data-hm-tab="' + id + '"]');
      if (!row || !ind || !btn) return;
      var rr = row.getBoundingClientRect(), br = btn.getBoundingClientRect();
      var x = Math.round(br.left - rr.left + 6);
      var w = Math.max(0, Math.round(br.width - 12));
      var h = Math.max(0, Math.round(br.height - 8));
      var first = !ind.dataset.ready;
      if (instant || first || hmReduced()) ind.style.transition = "none";
      else ind.style.transition = "";
      ind.style.width = w + "px";
      ind.style.height = h + "px";
      ind.style.top = "4px";
      ind.style.transform = "translate3d(" + x + "px,0,0)";
      ind.dataset.ready = "1";
      if (instant || first || hmReduced()) { void ind.offsetWidth; if (!hmReduced()) ind.style.transition = ""; }
    }
    function markTab(id, locked) {
      if (locked) hmGlide.tab = id;
      root.querySelectorAll("[data-hm-tab]").forEach(function (o) {
        var on = o.getAttribute("data-hm-tab") === id;
        o.classList.toggle("on", on);
        if (on) o.setAttribute("aria-current", "page");
        else o.removeAttribute("aria-current");
      });
      placeInd(id, !!locked && !root.querySelector(".hm-tab-ind").dataset.ready);
    }
    window.suMarkTab = markTab;
    root.querySelectorAll("[data-hm-tab]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-hm-tab"), sec = b.getAttribute("data-hs-sec");
      markTab(id, true);
      if (id === "home") {
        var top = document.getElementById("hs-top");
        if (top) hmJumpSec(top); else hmGlideTo(0, "home");
      } else jumpSec(sec);
    }); });
    /* Scroll spy: the section that occupies the most of the viewport below the header, with a 50% midline tie-break.
       Frozen on the target tab for the whole programmatic glide so intermediate tabs never flash. */
    var spyTick = false;
    function spyTabs() {
      if (hmGlide.lock || hmGlide.tab) { if (hmGlide.tab) markTab(hmGlide.tab, true); return; }
      var map = [["home","hs-top"],["plans","hs-plans"],["alacarte","hs-alc"],["faq","hs-faq"]];
      var hdr = document.querySelector(".topbar"), dock = document.querySelector(".hm-dock");
      var topLine = hdr ? hdr.getBoundingClientRect().bottom : 0;
      var botLine = dock ? dock.getBoundingClientRect().top : innerHeight;
      var mid = (topLine + botLine) / 2, best = "home", bestArea = -1, midHit = null;
      map.forEach(function (p) {
        var el = document.getElementById(p[1]); if (!el) return;
        var r = el.getBoundingClientRect();
        var vis = Math.max(0, Math.min(r.bottom, botLine) - Math.max(r.top, topLine));
        if (vis > bestArea) { bestArea = vis; best = p[0]; }
        if (r.top <= mid && r.bottom >= mid) midHit = p[0];
      });
      markTab(midHit || best);
    }
    function spyRaf() { if (spyTick) return; spyTick = true; requestAnimationFrame(function () { spyTick = false; spyTabs(); }); }
    if (window.__suHomeUnbind) window.__suHomeUnbind();
    var io = null;
    window.addEventListener("scroll", spyRaf, { passive: true });
    window.addEventListener("resize", spyRaf);
    window.addEventListener("wheel", hmOnUserScroll, { passive: true, capture: true });
    window.addEventListener("touchstart", hmOnUserScroll, { passive: true, capture: true });
    window.addEventListener("keydown", hmOnUserScroll, { capture: true, passive: true });
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function () { spyRaf(); }, { threshold: [0, .15, .4, .5, .7, 1] });
      ["hs-top","hs-plans","hs-alc","hs-faq"].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    }
    window.__suHomeUnbind = function () {
      window.removeEventListener("scroll", spyRaf, { passive: true });
      window.removeEventListener("resize", spyRaf);
      window.removeEventListener("wheel", hmOnUserScroll, { capture: true });
      window.removeEventListener("touchstart", hmOnUserScroll, { capture: true });
      window.removeEventListener("keydown", hmOnUserScroll, { capture: true, passive: true });
      if (io) io.disconnect();
    };
    spyTabs();
    requestAnimationFrame(function () { placeInd((root.querySelector("[data-hm-tab].on") || {}).getAttribute ? root.querySelector("[data-hm-tab].on").getAttribute("data-hm-tab") : "home", true); });
    hsBarFill(root);
    /* Shop À La Carte Scroll deck (Machan Nov 12 2026): 01A about 4 rows, 02A fade at the bottom (clears at the end of the list), 03 skipped, note "maybe centered?" -> centered divided rows. */
    root.querySelectorAll(".alc-box").forEach(function (bx) { function f() { bx.classList.toggle("alc-end", bx.scrollTop + bx.clientHeight >= bx.scrollHeight - 2); } bx.addEventListener("scroll", f, { passive: true }); f(); var d = bx.closest("details"); if (d) d.addEventListener("toggle", f); });
    root.querySelectorAll("[data-hs-go]").forEach(function (b) { b.addEventListener("click", function () { hmJumpSec(document.getElementById(b.getAttribute("data-hs-go"))); }); });
    /* Arrows sit 15–21px above the tab bar at the snap points, so do not hide the bar while an arrow passes. Clearance is handled in CSS (section padding / floating-pill offset). */
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
    onceAddonCatalog().forEach(function (a) { idx.push({ t: a.label + " · " + onceListPrice(a), k: (a.label + " " + (a.desc||"")).toLowerCase(), acc: document.getElementById("acc-addons") }); });
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
  /* Machan 11:16 PM: resume strip docked on top of the bar. Existing label + " · Step X" (same numbering as the funnel). Tap = Resume, × = clear (dismissResume). */
  /* Resume Indicator Placement Deck (Machan Nov 13 9:12 PM; team pick Menu Dot, Then Continue Row, Swatch polish item 6): a small dot on the menu button and a
     Continue Sign-Up row (with the step) at the top of the menu, replacing the strip on the dock. Sign Up hides while it shows; Log In stays. Not shown on the steps themselves. */
  function syncResumeMenu(s) {
    var btn = document.getElementById("hdrMenuBtn"), menu = document.getElementById("hdrMenu"); if (!btn || !menu) return;
    var row = menu.querySelector(".hdr-resume"), on = hasResume() && !isOb(s) && s !== "confirm";
    btn.classList.toggle("has-resume", on); menu.classList.toggle("has-resume", on);
    btn.setAttribute("aria-label", on ? "Menu, sign-up in progress" : "Menu");
    if (row) { row.hidden = !on; var sm = row.querySelector("small"); if (sm && on) sm.textContent = "Step " + obStepNo(S.resume) + " Of " + obSeq().length; }
  }
  function resumeCard() {
    var done = Math.max(0, OB.indexOf(S.resume));
    return '<div class="hm-resume-card"><span class="qf-art t3" aria-hidden="true">' + I("clock") + '</span><div><b>Pick Up Where You Left Off</b><small>' + done + ' of ' + OB.length + ' questions answered</small></div>' +
      '<button type="button" class="hm-resume-x mw-hover" data-act="dismissResume" aria-label="Dismiss and clear saved progress">' + X_SVG + '</button>' +
      '<span class="hm-resume-btns"><button class="btn btn-primary mw-hover" data-act="resume" type="button">Resume</button><button class="btn btn-outline mw-hover" data-act="startOver" type="button">Start Over</button></span></div>';
  }
  var XICO = { irrigation: "spray", sump: "meter", fireplace: "chimney", generator: "wrench", humidifier: "radon", softener: "meter" };
  /* ---------- Onboarding: homeowner quote funnel, 9 screens (Machan Nov 11 2026, 1:32-1:36 PM ICT answers) ----------
     Address > Home Basics > Systems > Add-Ons > Plan > Billing > Start Date > Details > Accept (Access removed Nov 13).
     No photos, no separate price visit, no promo-only founding offer, no 24+6 offer. Every amount comes from pricing-config.js via buildLines(). */
  /* Funnel decks (Machan Nov 12, Home Details #1 + Systems #8): address, size and stories share one screen; Systems is two short screens (counts, then extras). Still 9 steps; every screen counts. */
  /* Funnel Contact And Sign-Up deck 01 B (Machan Nov 12): Your Details is its own step before Accept. It stays after Your Plan (step 5), so the price shows before contact info is asked. */
  /* Home First Section Deck card 08 B (Machan Nov 13 1:34 PM): address and size split into two steps, so the funnel is Step X Of 11. */
  /* Machan Nov 13 10:18 PM: "we can remove step 8 how should we get in". The Access step is gone; lockbox and door codes go in the member app after login.
     Old saved state on "access" resumes on Start Date (see render), and an old S.access is ignored by the UI. */
  /* Pay Choice Deck (Machan Nov 13 ~10:27 PM via Grok; Swatch two-step plan): Review ("Your Home Care Proposal") then Pay ("Pick How You'd Like To Pay"). */
  /* Machan Nov 13 11:00 PM: payment right after the proposal: Review, Pay, Accept (agreement, charge OK, signature), then Start Date and Details; Details finishes sign-up. */
  var OB = ["address", "homesize", "systems", "systems2", "addons", "plan", "review", "billing", "accept", "start", "details"];
  var OB_NAME = { address: "Your Home", systems: "Your Systems", systems2: "Extras", addons: "Tailor Your Plan", plan: "Your Plan", review: "Your Home Care Proposal", billing: "Pick How You'd Like To Pay", start: "Start Date", details: "Your Details", accept: "Accept" };
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
  /* Legal Nov 13 (PR123 review r1 + follow-up): when one-time services or yearly flat add-ons are in Due Today, the consent itemizes the amount (each clause only when it
     applies) so it isn't read as all discounted. The rest of each sentence (renewal and cancel) is the existing text above, unchanged. Builders: consentSplit() / monthlyConsent(). */
  /* Base set (Machan Nov 11): 1 furnace, 1 AC, 1 water heater. Anything above shows as a +1 tag, e.g. "Plus · +1 Furnace". */
  var BASE_SET = { furnaces: 1, acs: 1, waterHeaters: 1 };
  var SIZE_OPTS = [["1500", "Under 2,000"], ["2500", "2,000 to 3,000"], ["3500", "3,000 to 4,000"], ["4500", "4,000 to 5,000"], ["5500", "5,000 to 6,000"], ["6500", "Over 6,000"]];
  var STORY_OPTS = [["1", "1 Story", "Ranch"], ["2", "2 Stories", ""], ["3", "3 Stories", ""]];
  /* Did You Know tips stay on the question screens (Machan Nov 11). */
  /* Did You Know Lines deck (Machan Nov 13 9:00 AM): #01 Your Home = both lines (one shows per visit, picked once per session); #02 Systems, #03 Extras, #04 Add-Ons keep today's lines;
     #05 Your Plan = Machan Decides -> Swatch default A, no tip; #06 Access = B Confirm The Time; #07 Your Details = B Why We Ask. Wording is the deck's, word for word. */
  var DYK_HOME = ["Every visit ends with a written report saved to your Home Record.", "After every visit you get a written report with photos, saved to your Home Record."];
  /* DYK_HOME is held (deck card may bring Did You Know back on step 1). Step 1 has no tip; other steps keep PR103 lines. */
  var DYK = {
    systems2: "Plus includes gutter and downspout cleaning every spring and fall.",
    systems: "We check your furnace filter every visit and change it when it's due.",
    /* addons (Tailor Your Plan): Did You Know removed so the services list can use the height (Machan Nov 14). */
    details: "You've seen your price. We ask for these details so we can reach you about your visits."
  };
  /* Legal-approved First Visit blurb. Keep word for word. */
  var FIRST_VISIT_BLURB = "Your first visit is a full visit. We check every system in your plan, start your Home Record and get to know your home. Seasonal tasks happen on the visits when they're due.";
  /* Approved price-confirm line for Accept. Keep word for word. */
  var PRICE_CONFIRM = "Your price is based on your answers. At your first visit, your tech confirms your home's systems. If anything changes your price, you'll see the new price before it applies and can accept it or cancel with no fee.";
  /* LINK SLOT: Legal's Member Agreement (UpKeep board id member-agreement-draft, commit 54e4f1d) is still in Michigan attorney review and has no public URL yet.
     Set url when Legal publishes it. Until then Accept shows a marked slot instead of agreement text (no new legal text is written here). */
  var AGREEMENT = { id: "member-agreement-draft", rev: "54e4f1d", url: "" };

  function isOb(s) { return OB.indexOf(s) > -1; }
  /* One Screen At A Time (Machan Nov 12 10:07 PM): each step fills the space under the header (--tb, set in bind). With the phone keyboard open,
     the Back/Next bar rides above the keyboard (visualViewport) and the focused field scrolls into the space above the bar. */
  /* Keyboard lift (Swatch PR97 note 4). How it behaves:
     - Only window.visualViewport is read. offset = innerHeight - (vv.height + vv.offsetTop), clamped to >= 0. It's the strip of the
       layout viewport hidden under the keyboard (iOS Safari, and Chrome Android without interactive-widget=resizes-content).
     - Offsets under 80px are treated as 0, so the browser toolbar showing or hiding never moves the bar.
     - visualViewport resize and scroll events, plus focusin and focusout, are throttled to one update per animation frame (rAF). The bar
       gets sticky bottom: offset (plus a same-height spacer after it) with no CSS transition, so it doesn't lag or bounce while iOS animates the keyboard or pans the page.
     - When the keyboard opens on a funnel field, the field is scrolled just enough to sit between the top of the visible area and the bar.
     - When the keyboard closes (offset 0), the offset and spacer are cleared. On browsers that resize the page for the keyboard, the offset stays 0
       and the sticky bar already sits above the keyboard. */
  (function () {
    var vv = window.visualViewport, queued = false, last = -1;
    function kb() {
      queued = false;
      var bar = document.querySelector(".ob .ob-bar"); if (!bar || !vv) { last = -1; return; }
      var off = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      if (off < 80) off = 0;
      /* Swatch PR97 follow-up: the bar sticks `off` px up (sticky bottom), and a spacer of the same height goes after it, so a one-screen step
         gains room to scroll the focused field above the bar instead of the bar covering it. */
      if (bar.style.transform) bar.style.transform = "";
      var pad = bar.nextElementSibling && bar.nextElementSibling.classList.contains("ob-kb-pad") ? bar.nextElementSibling : null;
      if (off) {
        document.body.classList.add("ob-kb-open");
        bar.style.bottom = off + "px";
        if (!pad) { pad = document.createElement("div"); pad.className = "ob-kb-pad"; pad.setAttribute("aria-hidden", "true"); bar.parentNode.insertBefore(pad, bar.nextSibling); }
        pad.style.height = off + "px";
        /* Let the max-height unlock apply before we measure and scroll the field. */
        void (bar.parentNode && bar.parentNode.offsetHeight);
      } else {
        document.body.classList.remove("ob-kb-open");
        bar.style.bottom = "";
        if (pad) pad.remove();
      }
      last = off;
      var f = document.activeElement;
      if (off && f && f.closest && f.closest(".ob") && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) {
        var r = f.getBoundingClientRect(), top = vv.offsetTop + 8, bottom = vv.offsetTop + vv.height - bar.getBoundingClientRect().height - 10;
        if (r.bottom > bottom) window.scrollBy(0, Math.ceil(r.bottom - bottom)); else if (r.top < top) window.scrollBy(0, Math.floor(r.top - top));
      }
    }
    function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(kb); } }
    if (vv) { vv.addEventListener("resize", queue); vv.addEventListener("scroll", queue); }
    document.addEventListener("focusin", function (e) { if (e.target && e.target.closest && e.target.closest(".ob")) queue(); });
    document.addEventListener("focusout", queue);
  })();
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
     monthly = plan + monthly add-ons + yearly flats spread across months (Machan Nov 14 Option B); Due Today = first month + one-time only.
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
    /* After-founding teaser uses the 10%-off base (plan + monthly add-ons). Yearly flats stay at full /yr on the annual card, not in this line. */
    return cents(r.monthly + r.addonsMonthly);
  }
  function fillAmt(tpl, amount) { return String(tpl).replace(/\{amount\}/g, money(amount)); }
  function afterFoundingPriceLine(monthly) {
    return AFTER_FOUNDING_PRICE.replace("{monthly}", money(monthly)).replace("{price}", money(annualPrepaidOf(monthly)));
  }
  function afterFoundingBlock(monthly) {
    /* house-build-1113: on tightened short screens (html.ob-hb-t) the block collapses to one tappable line that opens the same text, word for word, in a pop-up (bindAfPop) */
    return '<div class="after-founding" data-after-founding><button type="button" class="af-open mw-hover" data-af-open aria-haspopup="dialog">Annual Option After Founding<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="af-full"><p class="after-founding-line">' + AFTER_FOUNDING_LINE + '</p><p class="after-founding-price">' + afterFoundingPriceLine(monthly) + '</p></div></div>';
  }
  /* Annual Option After Founding pop-up: X, Esc, outside tap and browser Back close it; focus stays inside while open and returns to the line after. */
  function bindAfPop() {
    var bt = app.querySelector("[data-af-open]"), full = app.querySelector(".after-founding .af-full"); if (!bt || !full) return;
    var old = document.getElementById("afPop"); if (old) old.remove();
    var wrap = document.createElement("div"); wrap.id = "afPop"; wrap.className = "af-pop-wrap"; wrap.hidden = true;
    wrap.innerHTML = '<div class="af-pop-bg" data-af-close></div><div class="af-pop" role="dialog" aria-modal="true" aria-labelledby="afPopT" tabindex="-1"><div class="af-pop-h"><h3 id="afPopT">Annual Option After Founding</h3>' +
      '<button type="button" class="af-pop-x mw-hover" data-af-close aria-label="Close">' + X_SVG + '</button></div><div class="af-pop-b">' + full.innerHTML + '</div></div>';
    document.body.appendChild(wrap);
    var box = wrap.querySelector(".af-pop"), x = wrap.querySelector(".af-pop-x"), pushed = false;
    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); shut(true); return; }
      if (e.key === "Tab") { e.preventDefault(); x.focus(); }
    }
    function shut(fromUser) {
      if (wrap.hidden) return;
      wrap.hidden = true; document.removeEventListener("keydown", key, true); window.removeEventListener("popstate", onPop);
      if (fromUser && pushed && history.state && history.state.afPop) { pushed = false; history.back(); } pushed = false;
      if (document.body.contains(bt)) bt.focus({ preventScroll: true });
    }
    function onPop() { if (!history.state || !history.state.afPop) { pushed = false; shut(false); } }
    wrap.querySelectorAll("[data-af-close]").forEach(function (c) { c.addEventListener("click", function (e) { e.preventDefault(); shut(true); }); });
    bt.addEventListener("click", function (e) {
      e.preventDefault(); wrap.hidden = false; void wrap.offsetWidth; wrap.classList.add("on");
      try { history.pushState({ su: 1, s: S.screen, afPop: 1 }, "", location.pathname + location.search); pushed = true; } catch (x2) {}
      document.addEventListener("keydown", key, true); window.addEventListener("popstate", onPop);
      x.focus({ preventScroll: true });
    });
  }
  function consentTail(tpl, from) { return tpl.slice(tpl.indexOf(from)); } /* the unchanged rest of an existing consent line */
  function sAmt(n) { return "<strong>" + money(n) + "</strong>"; }
  function consentLead(live, amount) { return live ? "I agree Smart Upkeep may charge me " + sAmt(amount) + " today" : "I agree to pay Smart Upkeep " + sAmt(amount) + ", due today"; }
  function consentSplit(live, amount, first, yearly, oneTime) {
    var parts = [first];
    if (yearly > 0) parts.push(sAmt(yearly) + " for yearly add-ons for the first year");
    if (oneTime > 0) parts.push(sAmt(oneTime) + " for one-time services");
    return consentLead(live, amount) + ": " + parts.join(", plus ") + ".";
  }
  /* Monthly (Machan Nov 14 10:43 ICT, Option B; Legal Nov 14 approved wording). amount = monthly charge (plan + monthly add-ons + yearly flats spread across months). addonMonthly = those yearly flats only. oneTime = priced one-time services, still due today only. Yearly flats are not charged in full today on monthly. */
  function monthlyConsent(amount, oneTime, addonMonthly) {
    var live = paymentsLive(), tpl = live ? MONTHLY_CONSENT_LIVE : MONTHLY_CONSENT_BETA, tail = consentTail(tpl, " My membership");
    oneTime = +oneTime || 0; addonMonthly = +addonMonthly || 0;
    var afterPay = live ? "Smart Upkeep may charge me " : "I agree to pay ";
    if (addonMonthly > 0 && oneTime > 0) {
      return consentLead(live, amount + oneTime) + ": " + sAmt(amount) + " for my first month of membership (including " + money(addonMonthly) + "/mo for yearly add-ons, spread over 12 months), plus " + sAmt(oneTime) + " for one-time services. After that, " + afterPay + sAmt(amount) + " on this date <strong>each month</strong>." + tail;
    }
    if (addonMonthly > 0) {
      return consentLead(live, amount) + ", and " + sAmt(amount) + " on this date <strong>each month</strong>. This includes " + money(addonMonthly) + "/mo for yearly add-ons, spread over 12 months." + tail;
    }
    if (!(oneTime > 0)) return consentLead(live, amount) + ", and " + sAmt(amount) + " on this date <strong>each month</strong>." + tail;
    return consentSplit(live, amount + oneTime, sAmt(amount) + " for my first month of membership", 0, oneTime) +
      " After that, " + afterPay + sAmt(amount) + " on this date <strong>each month</strong>." + tail;
  }
  /* Annual 10% (Legal follow-up B): /yr flats are NOT 10% off (obBill: today = annualPrepaidOf(perCharge) + flat), so they are split out of the membership amount. */
  function annualConsent(amount, oneTime, yearly) {
    var live = paymentsLive(), tpl = live ? ANNUAL_CONSENT_LIVE : ANNUAL_CONSENT_BETA;
    oneTime = +oneTime || 0; yearly = +yearly || 0;
    if (!(oneTime > 0) && !(yearly > 0)) return fillAmt(tpl, amount);
    return consentSplit(live, amount, sAmt(amount - oneTime - yearly) + " for <strong>12 months</strong> of membership (10% off 12 monthly payments)", yearly, oneTime) + consentTail(tpl, " My membership");
  }
  /* Founding: /yr flats are inside the 2-for-1 (obBill: today = mem + addonsAnnual(), which includes flats, for 24 months), so only one-time services are split out. */
  function foundingConsent(amount, oneTime) {
    var live = paymentsLive(), tpl = live ? FOUNDING_CONSENT_LIVE : FOUNDING_CONSENT_BETA;
    oneTime = +oneTime || 0;
    if (!(oneTime > 0)) return fillAmt(tpl, amount);
    return consentSplit(live, amount, sAmt(amount - oneTime) + " for <strong>24 months</strong> of membership (2-for-1 founding offer)", 0, oneTime) + consentTail(tpl, " After that");
  }
  function obPlan() {
    if (foundingFull()) return S.plan === "annual" ? "annual" : "monthly";
    var p = S.plan;
    if (p === "monthly" || p === "annual" || !foundingOpen()) return "monthly";
    return "founding";
  }
  function obBill(tier) {
    tier = tier || S.tier;
    var mem = price()[tier], add = addonsAnnual(), flat = addonsFlatAnnual(), plan = obPlan();
    var addMonthlyAnnual = add - flat; if (addMonthlyAnnual < 0) addMonthlyAnnual = 0;
    var r = { tier: tier, plan: plan, membershipAnnual: mem, membership: mem, addonsAnnual: add, addonsFlatAnnual: flat, onceToday: addonsOnceToday(), monthly: monthlyOf(mem), addonsMonthly: monthlyOf(addMonthlyAnnual) };
    if (plan === "founding") { r.label = "Annual · Founding 2-For-1"; r.long = "Founding Member: 2 Years For The Price Of 1"; r.today = mem + add; r.termMonths = 24; }
    else if (plan === "annual") {
      r.perCharge = r.monthly + r.addonsMonthly;
      r.today = annualPrepaidOf(r.perCharge) + flat;
      r.label = "Annual · 10% Off";
      r.long = "Prepay 12 Months (10% Off Monthly)";
      r.termMonths = 12;
    }
    else {
      /* Machan Nov 14 10:43 ICT (Option B): spread approved yearly flats across months; Due Today = first month + one-time only. */
      r.addonsSpread = addonsFlatMonthly();
      r.label = "Monthly"; r.long = "Monthly, First Charge Today";
      r.perCharge = cents(r.monthly + r.addonsMonthly + r.addonsSpread);
      r.today = r.perCharge;
      r.termMonths = 12;
    }
    r.today = cents(r.today + r.onceToday);
    return r;
  }
  function tagLine() { return '<p class="qf-tagline">' + I("shield", "xs") + 'Tailored To Your Home &middot; Warranties Checked</p>'; }
  function startOverBtn() { return '<button type="button" class="qf-startover mw-hover" data-act="startOver" aria-label="Start Over"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 0 1 12.7-5.4M19.5 12a7.5 7.5 0 0 1-12.7 5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17.2 3.8v4.2h-4.2M6.8 20.2v-4.2h4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Start Over</button>'; }
  function homeBtn() { return '<button class="home-pill ob-bar-home mw-hover" data-act="home" type="button" aria-label="Home"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.6V20h12V9.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20v-5.2h4V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Home</button>'; }
  /* House build band (house-build-1113): onboarding-house.js draws the county map on step 1 and the live house from step 2, from this read-only snapshot.
     Systems join the house once the Systems step has been reached (S._hbSys), so they're carried through Back and to the finish. No prices are read here. */
  function obHouseState() {
    if (!isOb(S.screen)) return null;
    var a = S.answers || {}, sz = "", labels = [], seen = {};
    if (OB.indexOf(S.screen) >= OB.indexOf("systems")) S._hbSys = 1;
    SIZE_OPTS.forEach(function (o) { if (o[0] === String(a.sqft)) sz = o[1]; });
    (Array.isArray(a.extras) ? a.extras : []).forEach(function (k) { if (P.extras && P.extras[k]) labels.push(P.extras[k].label); });
    selectedFunnelAddons().forEach(function (x) { if (x && x.label) labels.push(x.label); });
    labels = labels.filter(function (l) { var k = String(l).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
    var sys = !!S._hbSys;
    var seq = obSeq();
    return { screen: S.screen, last: seq[seq.length - 1], stories: a.stories || "1", sizeLabel: sz, furnaces: sys ? cnt("furnaces") : 0, acs: sys ? cnt("acs") : 0, wh: sys ? whTypes() : [], labels: labels };
  }
  window.suHouseState = obHouseState;
  /* Called by onboarding-house.js fit() for each cut-order level: re-size the Add-Ons list for that level, and only accept the level if the list keeps at least ~3 rows. */
  window.suHouseRefit = function () { if (S.screen !== "addons") return true; sfitAddons(); var l = app.querySelector("section.ob-addons .ob-ao-list"); return !l || !l.style.maxHeight || parseFloat(l.style.maxHeight) >= 150; };
  function obShell(id, art, tint, title, help, body, foot) {
    var tl = !!S.tailor && (id === "systems" || id === "systems2"); /* Swatch D16: tailoring keeps the bar on Your Plan instead of jumping to Step 3 */
    var SQ = obSeq(), i = obStepNo(tl ? "plan" : id) - 1;
    var prog = '<div class="qf-prog"><span class="qf-step">' + (tl ? "Tailor Your Plan" : 'Step ' + (i + 1) + ' Of ' + SQ.length) + '</span><div class="qf-segs nine" role="progressbar" aria-valuenow="' + (i + 1) + '" aria-valuemin="1" aria-valuemax="' + SQ.length + '" aria-label="Step ' + (i + 1) + ' Of ' + SQ.length + '">' +
      SQ.map(function (x, k) { return '<span class="' + (k < i ? "done" : k === i ? "cur" : "") + '"></span>'; }).join("") + '</div></div>';
    var dyk = DYK[id] ? '<div class="qf-dyk">' + I("star", "xs") + '<p><b>Did You Know?</b> ' + DYK[id] + '</p></div>' : "";
    var heroArt = art ? '<div class="qf-art mid t' + tint + '" aria-hidden="true">' + I(art) + '</div>' : '';
    return '<section class="qf ob ob-' + id + ' ' + obCls() + '"><div class="ob-hb-slot"></div>' + prog +
      '<div class="qf-hero stack compact' + (art ? '' : ' qf-hero-plain') + '">' + heroArt + '<h1 class="qf-h">' + title + '</h1>' + (help ? '<p class="qf-help">' + help + '</p>' : '') + '</div>' +
      '<div class="qf-body">' + body + '</div>' + dyk + obFoot(foot) + '</section>';
  }
  /* Funnel decks #11 + #17 (sticky part): Back left and Next right in a sticky bottom bar on every step. The rest of the footer (tagline, Home, Start Over, Built by Machan) stays; the Back-only footer layout is held for the Extras deck. */
  function backOnly() { var m = backBtn().match(/<button class="back back-pill[\s\S]*?<\/button>/); return m ? m[0] : ""; }
  function obHasAnswers() {
    var a = S.answers || {}, k, v;
    if (String(a.street || "").trim() || String(a.zipcode || "").trim()) return true;
    if (a.sqft && String(a.sqft) !== SIZE_OPTS[0][0]) return true;
    if (a.stories && String(a.stories) !== "1") return true;
    for (k in a) {
      if (!Object.prototype.hasOwnProperty.call(a, k)) continue;
      if (k === "street" || k === "zipcode" || k === "zip" || k === "sqft" || k === "stories") continue;
      v = a[k];
      if (v == null || v === "" || v === "unsure") continue;
      if (Array.isArray(v) && !v.length) continue;
      return true;
    }
    if ((S.addons && S.addons.length) || (S.lastMinute && S.lastMinute.length) || S.signup || S.firstVisit) return true;
    if (S.screen && isOb(S.screen) && S.screen !== "address") return true;
    return false;
  }
  function obFoot(foot) {
    var m = String(foot || "").match(/<button class="btn btn-primary btn-big mw-hover" data-ob-next="1"[^>]*>[\s\S]*?<\/button>/), nx = m ? m[0] : "", rest = nx ? foot.replace(nx, "") : (foot || "");
    /* Funnel Extras deck 05 B (Machan Nov 12): sticky Back and Next bar with a small Built by Machan line under it; no full site footer on steps.
       Machan Nov 13 / Swatch: Start Over is a quiet link under Next, only when answers exist. */
    /* Machan Nov 14: one row of four equal buttons — Back, Home, Start Over, Next. Home uses go("home") and keeps S.resume. */
    return '<div class="ob-bar">' + backOnly() + homeBtn() + startOverBtn() + nx + '<p class="ob-built machan-ft"><span class="uk-built-a"><span class="mw-machan" style="display:inline-flex;align-items:center;gap:6px"><svg class="mw-machan-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" style="display:block;flex:none"><path d="M12 5.2C11.2 3 9.4 2 7.6 2.3c.3 1.9 1.9 3.2 4.4 2.9z" fill="#3F7D58"></path><path d="M12 5.2c.8-2.2 2.6-3.2 4.4-2.9-.3 1.9-1.9 3.2-4.4 2.9z" fill="#5E9A6E"></path><rect x="3.5" y="5.5" width="17" height="16" rx="7" fill="#C8643F"></rect><rect x="5.5" y="9" width="13" height="10" rx="5" fill="#FAF6EE"></rect><circle cx="9.6" cy="13.3" r="1.35" fill="#2E6F86"></circle><circle class="uk-eye-r" cx="14.4" cy="13.3" r="1.35" fill="#2E6F86"></circle><path d="M10.6 16.1q1.4 1.1 2.8 0" fill="none" stroke="#C8643F" stroke-width="1.1" stroke-linecap="round"></path><circle cx="7.6" cy="15.6" r=".9" fill="#E9B9A3"></circle><circle cx="16.4" cy="15.6" r=".9" fill="#E9B9A3"></circle><path class="uk-wink-l" d="M13.2 13.5q1.2-1.2 2.4 0" fill="none" stroke="#2E6F86" stroke-width="1.1" stroke-linecap="round"></path></svg>Built by Machan</span></span></p></div>' + (rest ? '<div class="qf-foot">' + rest + '</div>' : '');
  }
  function nextBtn(label, ok) {
    var short = { "Next": "Next", "Skip For Now": "Skip", "Continue To Your Proposal": "Next", "Looks Good": "Next", "Continue To Payment": "Next", "Back To Your Plan": "Done" }[label] || "Next";
    var aria = short === label ? "" : ' aria-label="' + label + '"';
    return '<button class="btn btn-primary btn-big mw-hover" data-ob-next="1" type="button"' + (ok ? "" : " disabled") + aria + '>' + short + '</button>';
  }

  /* 1. Address: first, required street address + ZIP, in-area check. Out of area shows the waitlist (Coming Soon, no date). */
  function addrOk() { var a = S.answers; return /\d+\s+\S+/.test(String(a.street || "").trim()) && /^\d{5}$/.test(String(a.zipcode || "")); }
  function obAddress() {
    var a = S.answers, out = S._outZip && S._outZip === a.zipcode;
    /* #4: size and stories start on the first option (existing SIZE_OPTS tiers only, no new prices) */
    if (a.sqft == null || a.sqft === "unsure" || !SIZE_OPTS.some(function (o) { return o[0] === String(a.sqft); })) a.sqft = SIZE_OPTS[0][0];
    if (a.stories == null || a.stories === "unsure") a.stories = STORY_OPTS[0][0];
    var si = 0; SIZE_OPTS.forEach(function (o, k) { if (o[0] === String(a.sqft)) si = k; });
    var st = String(a.stories);
    /* Swatch Nov 13: Street full width, ZIP half width with the service-area helper under it; size chips 2x3, no box; stories as a plain stepper row. Same SIZE_OPTS / STORY_OPTS values. Autofill hints stay. */
    var body = '<div class="ob-home-form"><div class="ob-fields"><label class="fl" for="obStreet">Street Address</label><input id="obStreet" type="text" autocomplete="address-line1" enterkeyhint="next" placeholder="123 Main St, Novi" value="' + esc(a.street || "") + '">' +
      '<label class="fl" for="obZip">ZIP Code</label><input id="obZip" class="ob-zip" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" enterkeyhint="go" placeholder="48322" value="' + esc(a.zipcode || "") + '">' +
      '<p class="ob-area small">We serve metro Detroit: Wayne, Oakland, Macomb and nearby</p></div>' +
      '<p class="ferr" id="obAddrErr" role="alert"></p>' + (out ? waitlistCard(a.zipcode) : "") + '</div>';
    return obShell("address", "", 0, "Where's Your Home?", "", body, nextBtn("Next", addrOk() && !out));
  }
  /* Step 2 Of 11: Home Size chips + Stories stepper (moved off step 1; same SIZE_OPTS / STORY_OPTS, same markup and CSS as before). */
  function obHomeSize() {
    var a = S.answers;
    if (a.sqft == null || a.sqft === "unsure" || !SIZE_OPTS.some(function (o) { return o[0] === String(a.sqft); })) a.sqft = SIZE_OPTS[0][0];
    if (a.stories == null || a.stories === "unsure") a.stories = STORY_OPTS[0][0];
    var si = 0; SIZE_OPTS.forEach(function (o, k) { if (o[0] === String(a.sqft)) si = k; });
    var st = String(a.stories);
    var body = '<div class="ob-home-form">' + '<div class="ob-size"><div class="meta"><p class="k" id="obSizeK">Home Size</p><p class="s">A rough range is fine</p></div>' +
      '<div class="size-chips" role="radiogroup" aria-labelledby="obSizeK">' + SIZE_OPTS.map(function (o, k) { return '<button type="button" class="size-chip mw-hover' + (k === si ? " on" : "") + '" role="radio" aria-checked="' + (k === si) + '" data-ob-size="' + o[0] + '" aria-label="' + o[1] + ' sq ft">' + o[1] + '</button>'; }).join("") + '</div></div>' +
      '<div class="ob-stories"><div class="ob-stories-row"><p class="k" id="obStoriesK">Stories</p>' + obStepper("stories", st, st === "1", st === "3", "Stories") + '</div></div></div>';
    return obShell("homesize", "", 0, "How Big Is Your Home?", "", body, nextBtn("Next", true)).replace('class="qf ob ob-homesize ', 'class="qf ob ob-address ob-homesize ');
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
    return obShell("systems", "furnace", 2, "Your Systems", "How Many Of Each", body, nextBtn("Next", true) + (S.tailor ? '<button type="button" class="link mw-hover ob-undo" data-ob-undo="1">Undo Changes</button>' : ''));
  }
  /* 3b. Extras (#8 second short screen): #10 priced extras first with prices, included ones below their label; #13 in one white card with the heading. Stays synced with the Add-Ons Monthly tab. */
  function sys2Keys() {
    var aoShared = sharedExtraMap(), aoLabels = {};
    monthlyAddonCatalog().concat(onceAddonCatalog()).forEach(function (a) { if (a && a.label) aoLabels[suNorm(a.label)] = 1; });
    return Object.keys(P.extras).filter(function (k) { return !aoShared[k] && !aoLabels[suNorm(P.extras[k].label)] && !aoLabels[suNorm(P.extras[k].label.replace("Whole-House ", ""))]; });
  }
  /* Swatch PR97 residual 2: when every item on Do You Have Any Of These? is already in Extras or Add-Ons, the step is skipped. Numbering, progress bar, Back and Next follow obSeq(). */
  function obSkip(s) { return s === "systems2" && !sys2Keys().length; }
  function obSeq() { return OB.filter(function (s) { return !obSkip(s); }); }
  function obStepNo(s) { var q = obSeq(), i = q.indexOf(s); return (i < 0 ? q.indexOf(obNextOf(s)) : i) + 1; }
  function obSystems2() {
    var ex = Array.isArray(S.answers.extras) ? S.answers.extras : [];
    function tile(k, j, sub) {
      var e = P.extras[k], on = ex.indexOf(k) > -1;
      return '<button type="button" class="qt chkt mw-hover t' + (j % 4) + (on ? " sel" : "") + '" data-ob-extra="' + k + '" aria-pressed="' + on + '"><span class="qt-ic">' + I(XICO[k] || "wrench", "sm") + '</span><span class="qt-lab">' + esc(suTitle(e.label.replace("Whole-House ", ""))) + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (on ? '<i class="qt-ok" aria-hidden="true"></i>' : '') + '</button>';
    }
    /* Machan Nov 12 10:08 PM: skip any item here that's already offered on the Add-Ons step (Monthly or One-Time). Shared items keep one selection
       (S.answers.extras + S.addons via syncSharedExtras), so picking it on Add-Ons fills the same fields and prices as before. */
    var keys = sys2Keys(), priced = keys.filter(function (k) { return P.extras[k].all > 0; }), every = keys.filter(function (k) { return P.extras[k].included; }), incl = keys.filter(function (k) { return !(P.extras[k].all > 0) && !P.extras[k].included; });
    var body = '<div class="ex-card">' + (priced.length ? '<div class="qt-grid two" data-ptr-ignore>' + priced.map(function (k, j) { return tile(k, j, moLabel(P.extras[k].all)); }).join("") + '</div>' : '') +
      (every.length ? '<p class="blk-lab ex-incl">Included In Every Plan</p><div class="qt-grid two" data-ptr-ignore>' + every.map(function (k, j) { return tile(k, j + priced.length, ""); }).join("") + '</div>' : '') +
      (incl.length ? '<p class="blk-lab ex-incl">Included On Plus And Up</p><div class="qt-grid two" data-ptr-ignore>' + incl.map(function (k, j) { return tile(k, j + priced.length + every.length, ""); }).join("") + '</div>' : '') + '</div>';
    return obShell("systems2", "wrench", 3, "Do You Have Any Of These?", "", body, nextBtn(S.tailor ? "Back To Your Plan" : "Next", true) + (S.tailor ? '<button type="button" class="link mw-hover ob-undo" data-ob-undo="1">Undo Changes</button>' : ''));
  }

  /* 4. Add-Ons: short optional list, on/off switch per row; tap a row to open its detail in place. */
  function aoPrice(a) {
    if (needsSiteVisit(a && a.label)) return "Needs A Site Visit";
    if (a && a.gutter && gutterIncluded()) return "Included On Plus And Up";
    if (a && a.once) {
      if (hasRealOncePrice(a)) return money(+a.price);
      if (!a.quoteRequired && hasConfigRange(a)) return rangePriceLabel(a);
      return QUOTE_LABEL;
    }
    if (hasRealMonthly(a)) return moLabel(a.annual);
    if (isApprovedFlatAnnual(a)) return (obPlan() === "monthly") ? ("+" + money(monthlySpread(a.annual)) + "/mo") : yrLabel(a.annual);
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
    return '<li class="ob-ao' + (on ? " on" : "") + (open ? " open" : "") + '"><div class="ob-ao-top"><button type="button" class="ob-ao-row mw-hover" data-ob-ao-open="' + a.id + '" aria-expanded="' + open + '">' + /* Machan Nov 13 10:04 PM: Add-Ons rows go text only, like À La Carte */
      '<span class="ob-ao-t"><b>' + esc(a.label) + '</b><small>' + aoPrice(a) + '</small></span><span class="ob-chev" aria-hidden="true"></span></button>' +
      (a.gutter && gutterIncluded() ? '' : '<button type="button" role="switch" aria-checked="' + on + '" aria-label="' + esc(a.label) + '" class="ob-sw mw-hover" data-ob-ao="' + a.id + '"><i></i></button>') + '</div>' +
      (open ? '<p class="ob-ao-d">' + esc(aoDesc(a)) + '</p>' : '') + '</li>';
  }
  function obAddons() {
    var sel = S.addons || [];
    var tab = S._aoTab === "once" ? "once" : "monthly";
    var monthly = monthlyAddonCatalog().map(function (a) { return aoRow(a, sel); }).join("");
    var onceAll = onceAddonCatalog(), oncePriced = onceAll.filter(isPricedBookable), onceQuote = onceAll.filter(function (a) { return oncePriced.indexOf(a) < 0; });
    /* quote-only one-time rows are no longer offered here (they stay on À La Carte); drop any old picks of them so nothing hidden rides along */
    var hid = onceQuote.map(function (a) { return a.id; }); if (sel.some(function (id) { return hid.indexOf(id) > -1; })) { S.addons = sel = sel.filter(function (id) { return hid.indexOf(id) < 0; }); save(); }
    /* Legal Nov 12: every plan includes a Furnace Tune-Up and an AC Tune-Up, so the sign-up flow can't offer them as extras. They stay on Shop À La Carte. */
    onceQuote = onceQuote.filter(function (a) { return !/^(furnace|ac) tune up$/.test(suNorm(a.label)); });
    var once = oncePriced.map(function (a) { return aoRow(a, sel); }).join("") +
      (onceQuote.length ? '<li class="ob-more-li"><details class="ob-more"><summary class="mw-hover">' + ONCE_MORE_LINE + '</summary><ul class="ob-more-list">' + onceQuote.map(function (a) { return '<li>' + esc(a.label) + '</li>'; }).join("") + '</ul></details></li>' : '');
    var addMoOnly = addonsNoteMonthly(), addYrSum = addonsFlatAnnual(), addSpread = 0, addMoSum = addMoOnly;
    if (obPlan() === "monthly") { addSpread = addonsFlatMonthly(); addMoSum = cents(addMoOnly + addSpread); addYrSum = 0; }
    /* Legal Nov 14: three Tailor notes, chosen by what's selected. Consent strings stay as they are. */
    var aoNoteBits = [], paren = "";
    if (obPlan() === "monthly" && addSpread) paren = addMoOnly ? " (includes yearly add-ons spread over 12 months)" : " (yearly add-ons spread over 12 months)";
    if (addMoSum) aoNoteBits.push("+" + money(addMoSum) + "/mo" + paren);
    if (addYrSum) aoNoteBits.push(money(addYrSum) + "/yr");
    var tabs = '<div class="seg-toggle ob-ao-tabs" role="tablist" aria-label="Tailor Your Plan">' +
      '<button type="button" role="tab" class="mw-hover' + (tab === "monthly" ? " on" : "") + '" id="ob-ao-tab-monthly" aria-selected="' + (tab === "monthly") + '" aria-controls="ob-ao-panel" data-ob-ao-tab="monthly">Plan Add-Ons</button>' +
      '<button type="button" role="tab" class="mw-hover' + (tab === "once" ? " on" : "") + '" id="ob-ao-tab-once" aria-selected="' + (tab === "once") + '" aria-controls="ob-ao-panel" data-ob-ao-tab="once">One-Time Services</button></div>';
    var list = '<ul class="ob-ao-list" id="ob-ao-panel" role="tabpanel" aria-labelledby="' + (tab === "once" ? "ob-ao-tab-once" : "ob-ao-tab-monthly") + '">' + (tab === "once" ? once : monthly) + '</ul>';
    var body = '<div class="ob-ao-groups">' + tabs + list + '</div>' + (aoNoteBits.length ? '<p class="priced-note">Your add-ons: ' + aoNoteBits.join(" + ") + '</p>' : '');
    return obShell("addons", "wrench", 3, "Tailor Your Plan", "Optional. Add any of these to your plan, or skip.", body, nextBtn(sel.length ? "Next" : "Skip For Now", true));
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
      return '<div class="plan-card' + (sel ? " sel" : "") + '" data-ob-tier="' + x + '" style="--plan-c:' + col + '">' +
        '<p class="plan-kicker">' + tx.visits + ' Visits A Year</p><h2 class="plan-name">' + esc(tx.label) + '</h2><p class="plan-price">' + money(monthlyOf(p[x])) + '<small>/mo</small></p>' +
        (tx.fromMonthly && monthlyOf(p[x]) !== +tx.fromMonthly ? '<p class="plan-base">Base plan ' + money(tx.fromMonthly) + '/mo</p>' : '') +
        (sel ? detail : "") + cta + "</div>";
    }).join("");
    return obShell("plan", "clipboard", 3, "Your Plan", "Here's the plan that fits this home. You can tailor it before you join.", '<div class="plan-stack">' + cards + '</div>' + (foundingFull() ? afterFoundingBlock(liveMonthly(k)) : ''), nextBtn("Continue To Your Proposal", true));
  }

  /* 6a. Review: "Your Home Care Proposal" (Pay Choice Deck, Layout A Stacked Cards, Tone A Calm). Machan Nov 13 10:20 PM: "meaning the plan + extras and how they
     choose to pay show the 2 for 1 if they choose that". Order: plan, add-ons, payment choice, 2-for-1 (annual only), total. Every figure is the same value the
     Accept step shows (obBill(), aoPrice(), money()); nothing new is computed here. */
  function planColor(k) { var s = (k + " " + ((P.tiers[k] || {}).label || "")).toLowerCase(); return /platinum|complete/.test(s) ? "#05668D" : (/gold|plus/.test(s) ? "#A8431F" : "#0B6E4F"); }
  function billChoiceTxt(b) { return b.plan === "monthly" ? "Monthly" : (b.plan === "annual" ? "Annual · 10% Off" : "Annual · Founding 2-For-1"); }
  function proposalRows() {
    var b = obBill(), t = P.tiers[S.tier], tags = extraTags(), adds = selectedFunnelAddons(), rows = [];
    rows.push({ k: "plan", lab: '<b class="bd-plan" style="color:' + planColor(S.tier) + '">' + esc(t.label) + '</b><small>' + t.visits + ' Visits / Year' + (tags.length ? ' · ' + esc(tags.join(", ")) : '') + '</small>', v: money(b.monthly) + "/mo" });
    /* Monthly add-ons from Systems/Extras (fromExtras, Gutter) are already priced into the plan's monthly figure (planAmtFromBase), as on Accept; say so instead of adding them twice. */
    adds.forEach(function (x) { rows.push({ k: "addon", lab: esc(x.label) + (x.once ? '<small>One-Time</small>' : ((x.fromExtras || x.gutter) && hasRealMonthly(x) ? '<small>In Your Plan Price</small>' : '')), v: aoPrice(x) }); });
    rows.push({ k: "pay", lab: "Payment", v: billChoiceTxt(b) });
    if (b.plan === "founding") rows.push({ k: "f2", lab: "Founding 2-For-1", v: "Pay 1 Year, Get 2" });
    rows.push({ k: "total", lab: "Due Today", v: money(b.today) });
    return rows;
  }
  function obReview() {
    var rows = proposalRows();
    var body = '<div class="bd-card" role="group" aria-label="Price Breakdown">' + rows.map(function (r) {
        return '<div class="bd-row bd-' + r.k + '"><span class="k">' + r.lab + '</span><span class="v">' + r.v + '</span></div>';
      }).join("") + '</div>' +
      '<p class="bd-edit"><button type="button" class="link mw-hover" data-ob-go="addons" aria-label="Edit, back to Tailor Your Plan">Edit</button></p>';
    return obShell("review", "", 0, "Your Home Care Proposal", "", body, nextBtn("Looks Good", true));
  }

  /* 6b. Pay: "Pick How You'd Like To Pay". Deck picks: Choice Style B Selectable Cards, Founding Offer B Soft Cream Banner, Tone A Calm; Annual Saving skipped
     ("only 2-for-1") while founding spots last. The 2-for-1 badge opens a short explanation quoted from the FAQ "What Is the First 50 Founding Offer?".
     Machan Nov 13 11:22 PM (option B): after the founding spots fill (foundingFull in pricing-config.js, false today), the Annual card is the 10% off annual
     prepay (12 x monthly quote less annualDiscount, obBill "annual") instead of the 2-for-1. No 2-for-1 banner, badge or pop-up then. */
  var F2_POP = { t: "Founding 2-For-1", b: "Prepay 12 months at your full quoted plan price, including any add-ons, and get 24 months of care. Offers do not stack." };
  /* Annual card line 2 (Legal Nov 13, approved): amounts match the consent split. Neither -> no line. */
  function payIncludesLine(yearly, oneTime) {
    yearly = +yearly || 0; oneTime = +oneTime || 0;
    if (yearly > 0 && oneTime > 0) return "Includes " + money(yearly) + " for yearly add-ons and " + money(oneTime) + " for one-time services, at full price.";
    if (yearly > 0) return "Includes " + money(yearly) + " for yearly add-ons at full price.";
    if (oneTime > 0) return "Includes " + money(oneTime) + " for one-time services at full price.";
    return "";
  }
  function obBilling() {
    var plan = obPlan(), t = P.tiers[S.tier], col = planColor(S.tier);
    var an = (function () { var s = S.plan; S.plan = "founding"; var r = obBill(); S.plan = s; return r; })();
    var mo = (function () { var s = S.plan; S.plan = "monthly"; var r = obBill(); S.plan = s; return r; })();
    var fOpen = foundingOpen(), fFull = foundingFull();
    var yr = fFull ? (function () { var s = S.plan; S.plan = "annual"; var r = obBill(); S.plan = s; return r; })() : null;
    if (!fOpen && S.plan !== "monthly" && !(fFull && S.plan === "annual")) { S.plan = "monthly"; plan = obPlan(); save(); } /* only the offered choices (2-for-1 or monthly; after the fill, 10% annual or monthly) can be picked, so the shown choice is always the charged one */
    var aSel = fOpen && plan === "founding", ySel = fFull && plan === "annual";
    var chk = '<span class="pay-ck" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    function card(key, sel, name, amt, copy, badge, copy2) {
      return '<div class="pay-card' + (sel ? " sel" : "") + '" role="radio" tabindex="' + (sel ? "0" : "-1") + '" aria-checked="' + sel + '" data-ob-bill="' + key + '" style="--plan-c:' + col + '">' +
        '<div class="pay-top"><span class="pay-name">' + name + '</span>' + (badge || '') + '<span class="pay-amt">' + amt + '</span>' + chk + '</div><p class="pay-copy">' + copy + '</p>' + (copy2 ? '<p class="pay-copy pay-copy2">' + copy2 + '</p>' : '') + '</div>';
    }
    var badge = '<button type="button" class="f2-badge mw-hover" data-f2-open aria-expanded="false" aria-controls="f2Pop">2-For-1<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>';
    var banner = fOpen ? '<div class="f2-banner"><span class="f2-ic" aria-hidden="true">' + I("star", "xs") + '</span><p><b>Founding Member: 2 Years For The Price Of 1</b><br>Pay one year of your ' + esc(t.label) + ' plan' + (an.addonsAnnual ? ' and add-ons' : '') + ', get two years of care.</p></div>' : '';
    var cards = (fOpen ? card("founding", aSel, "Annual", money(an.today), "Paid today for 24 months of care.", badge) : '') +
      (fFull ? card("annual", ySel, "Annual", money(yr.today), "Paid today for 12 months of care, 10% off your monthly price of " + money(yr.perCharge) + "/mo.", '<span class="f2-badge pay-off">10% Off</span>',
        payIncludesLine(yr.addonsFlatAnnual, yr.onceToday)) : '') + /* Legal Nov 13: second line only when yearly flats and/or one-time items are in the total */
      card("monthly", !aSel && !ySel, "Monthly", money(mo.perCharge) + "/mo", "First charge today, then on this date each month.");
    var pop = fOpen ? '<div class="f2-pop" id="f2Pop" role="dialog" aria-label="' + F2_POP.t + '" tabindex="-1" hidden><span class="f2-pop-ic" aria-hidden="true">' + I("star", "xs") + '</span><div><p class="f2-pop-t">' + F2_POP.t + '</p><p class="f2-pop-b">' + F2_POP.b + '</p></div></div>' : '';
    var dueNow = aSel ? an.today : (ySel ? yr.today : mo.today); /* same obBill total as Review and Accept (monthly Due Today = first month incl. spread yearly add-ons + one-time) */
    var body = banner + '<div class="pay-stack" role="radiogroup" aria-label="How to pay">' + cards + '</div>' +
      '<p class="pay-due" aria-live="polite"><span>Due Today</span><b>' + money(dueNow) + '</b></p>' + pop;
    return obShell("billing", "", 0, "Pick How You'd Like To Pay", "", body, nextBtn("Continue To Payment", true));
  }

  /* 8. Start Date: date picker, earliest two days out, with the Legal-approved First Visit blurb. */
  function obStart() {
    var d = S.firstVisit && S.firstVisit >= minStart() ? S.firstVisit : "";
    var body = '<p class="fl" id="obDateL">First Visit Date</p>' + obCalendar(d) +
      '<div class="price-confirm ob-blurb"><b>Your First Visit</b><br>' + FIRST_VISIT_BLURB + '</div>' +
      '<p class="priced-note">Your membership starts on this visit.' + "" + ' We\'ll confirm the time with you before your visit.</p>';
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
    var rows = Math.ceil((lead + days) / 7); /* PR111 r3: .cal-6 lets short screens shrink cells so a 6-row month fits like a 5-row one */
    return '<div class="ob-cal' + (rows > 5 ? " cal-6" : "") + '" role="group" aria-labelledby="obDateL obCalT"><div class="cal-top">' + nav(-1, "Previous Month", ym <= minYm, "M15 5l-7 7 7 7") + '<p class="cal-t" id="obCalT">' + CAL_MONTHS[mo] + " " + y + '</p>' + nav(1, "Next Month", ym >= maxYm, "M9 5l7 7-7 7") + '</div>' +
      '<div class="cal-wk" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="cal-grid">' + cells + '</div>' +
      (sel ? '<p class="cal-pick" aria-live="polite">' + esc(longDate(sel)) + '</p>' : '') + '</div>';
  }


  /* 9. Your Details (Contact And Sign-Up deck, Machan Nov 12): 02 A all three in one card, 03 A Full Name, Phone, Email, 04 B Service Address highlighted at the top with Edit,
     05 A "Have A Code?" link, 08 B compact 40px fields. Funnel Extras 01 A hint lines (no info icons), 02 B no contact chips. */
  var DETAIL_HINTS = { sName: "Your first and last name." }; /* Legal Nov 12 night: Full Name hint only; no Phone or Email hint. */
  function obDetails() {
    var su = S.signup || {}, a = S.answers, hasRef = !!(S.referralCodeIn || su.referralCodeIn);
    function fe(id) { return '<p class="ferr" id="e-' + id + '" aria-live="polite"></p>'; }
    function fld(id, lab, type, ac, ph, v) { return '<label class="fl" for="' + id + '">' + lab + '</label>' + fe(id) + '<input id="' + id + '" type="' + type + '" autocomplete="' + ac + '"' + (ph ? ' placeholder="' + ph + '"' : '') + (DETAIL_HINTS[id] ? ' aria-describedby="h-' + id + '"' : '') + ' value="' + esc(v || "") + '">' + (DETAIL_HINTS[id] ? '<p class="det-hint" id="h-' + id + '">' + DETAIL_HINTS[id] + '</p>' : ''); }
    var body = '<form id="obDF" novalidate class="ob-details-form"><div class="card det-card">' +
      '<div class="det-addr"><span class="det-addr-k">Service Address</span><b>' + esc((a.street || "") + ", " + (a.zipcode || "")) + '</b><button type="button" class="link mw-hover" data-ob-go="address">Edit</button></div>' +
      fld("sName", "Full Name", "text", "name", "", su.name) +
      fld("sPhone", "Phone", "tel", "tel", "Add Phone", su.phone) +
      fld("sEmail", "Email", "email", "email", "Add Email", su.email) +
      '<p class="su-havecode"><button type="button" class="link mw-hover" id="haveCode" aria-expanded="' + hasRef + '"' + (hasRef ? ' hidden' : '') + '>Have A Code?</button></p>' +
      '<div id="refWrap"' + (hasRef ? '' : ' hidden') + '><label class="fl" for="sRef">Refer A Neighbor Code</label><input id="sRef" type="text" autocomplete="off" autocapitalize="characters" placeholder="SU-HOME-1234" value="' + esc(S.referralCodeIn || su.referralCodeIn || "") + '"><p class="small ref-check" id="refCheck" aria-live="polite"></p></div>' +
      '</div></form>';
    return obShell("details", "user", 2, "Your Details", "", body, nextBtn("Next", true));
  }
  function detailErrs(s) { return [["sName", !s.name ? "Enter full name." : ""], ["sPhone", !/\d{3}.*\d{3}.*\d{4}/.test(s.phone || "") ? "Enter phone number." : ""], ["sEmail", !/^\S+@\S+\.\S+$/.test(s.email || "") ? "Enter email." : ""]]; }
  function bindDetails() {
    function keep() { var ref = val("sRef"); S.referralCodeIn = ref; S.signup = Object.assign({}, S.signup, { name: val("sName"), phone: val("sPhone"), email: val("sEmail"), referralCodeIn: ref, address: (S.answers.street || "") + ", " + (S.answers.zipcode || "") }); }
    var hc = document.getElementById("haveCode"); if (hc) hc.addEventListener("click", function () { hc.hidden = true; hc.setAttribute("aria-expanded", "true"); document.getElementById("refWrap").hidden = false; document.getElementById("sRef").focus(); });
    (function () { var r = document.getElementById("sRef"), o = document.getElementById("refCheck"); if (!r || !o) return; function chk() { var v = r.value.trim().toUpperCase(); if (!v) { o.textContent = ""; r.removeAttribute("aria-invalid"); return; } var ok = /^SU-[A-Z]{1,4}-\d{4}$/.test(v); o.textContent = ok ? "\u2713 Code looks right" : "Codes look like SU-HOME-1234"; r.setAttribute("aria-invalid", ok ? "false" : "true"); } r.addEventListener("input", chk); chk(); })();
    ["sName", "sPhone", "sEmail", "sRef"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { keep(); save(); }); });
    /* Funnel Drop-Off deck #02 A (Machan Nov 13): check each field when they leave it (blur), using the same messages as Next. A field left empty
       is only flagged once they've typed in it or pressed Next. The message clears as soon as the entry is fixed. Autofill hints (#03 A) stay. */
    (function () {
      var touched = {};
      function chk(id, live) {
        keep(); var x = detailErrs(S.signup).filter(function (r) { return r[0] === id; })[0]; if (!x) return;
        var el = document.getElementById("e-" + id), f = document.getElementById(id); if (!f) return;
        var msg = x[1];
        if (live && msg && f.getAttribute("aria-invalid") !== "true") return;
        if (!touched[id] && !f.value.trim()) return;
        if (el) el.textContent = msg; f.setAttribute("aria-invalid", msg ? "true" : "false");
      }
      ["sName", "sPhone", "sEmail"].forEach(function (id) { var f = document.getElementById(id); if (!f) return;
        f.addEventListener("input", function () { if (f.value.trim()) touched[id] = 1; chk(id, true); });
        f.addEventListener("blur", function () { if (f.value.trim()) touched[id] = 1; chk(id, false); save(); }); });
    })();
    function next() {
      keep(); save();
      var first = null;
      detailErrs(S.signup).forEach(function (x) { var el = document.getElementById("e-" + x[0]), f = document.getElementById(x[0]); if (el) el.textContent = x[1]; if (f) f.setAttribute("aria-invalid", x[1] ? "true" : "false"); if (x[1] && !first) first = f; });
      if (first) { first.focus(); return; }
      /* Details is the last step now (Machan Nov 13 11:00 PM). */
      if (acceptStillValid() && S.firstVisit) { finishSignup(); return; }
      go(!acceptStillValid() ? "accept" : "start");
    }
    var f = document.getElementById("obDF"); if (f) f.addEventListener("submit", function (e) { e.preventDefault(); next(); });
    var nx = app.querySelector("[data-ob-next]"); if (nx) nx.addEventListener("click", next);
  }
  /* 10. Accept: recap, agreement, signature, payment (contact moved to Your Details). Deck card 4: A compact recap line, B itemized. */
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
      rows.push(["Billing", billTxt]); if (start) rows.push(["Start Date", start]);
      rows.push([dueK, dueV]);
      recap = '<div class="item-card">' + rows.map(function (r, i) { return '<div class="item-row' + (i === rows.length - 1 ? " total" : "") + (String(r[1]).length > 28 ? " stack" : "") + '"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>'; }).join("") +
        '<p class="price-confirm pc-plain">' + PRICE_CONFIRM + '</p></div>';
    } else {
      var bits = [esc(planTag()), money(b.monthly) + "/mo", billTxt, start ? "Starts " + start : ""].concat(adds.map(function (x) { return "+ " + esc(x.label); })).filter(Boolean);
      recap = '<div class="accept-compact"><p class="accept-line">' + bits.join(" · ") + '</p><p class="accept-due"><span>' + dueK + '</span><b>' + dueV + '</b></p><p class="price-confirm pc-plain">' + PRICE_CONFIRM + '</p></div>';
    }
    var hasRef = !!(S.referralCodeIn || su.referralCodeIn);
    function fe(id) { return '<p class="ferr" id="e-' + id + '" aria-live="polite"></p>'; }
    /* Charge-consent text, verbatim. Founding 24-month: Legal review Nov 11. Monthly and full-price annual: Legal Nov 12 (beta uses 'due today' until PAYMENTS_LIVE). */
    var consent = b.plan === "monthly" ? monthlyConsent(b.perCharge, b.onceToday, b.addonsSpread)
      : (b.plan === "annual" ? annualConsent(b.today, b.onceToday, b.addonsFlatAnnual)
      : foundingConsent(b.today, b.onceToday));
    /* Machan Nov 13 11:16 PM: nothing goes out to customers yet, so the flow is walkable for looks while the Member Agreement link is pending.
       Accept only saves locally (no charge, no email); the checkbox and signature still apply. AGREEMENT.url still swaps in the real link when set. */
    var open = true;
    var agreeLink = AGREEMENT.url ? '<a class="link mw-hover" href="' + esc(AGREEMENT.url) + '" target="_blank" rel="noopener">Read The Member Agreement</a>'
      : '<span class="ob-slot" data-agreement-slot="' + AGREEMENT.id + '@' + AGREEMENT.rev + '">Member Agreement · Link Coming Soon</span>';
    var body = recap +
      '<form id="obF" novalidate class="stack ob-accept-form">' +
      '<div class="card"><h3>Member Agreement</h3><p class="small">' + agreeLink + '</p>' +
      (paymentsLive() ? '' : ('<div class="beta-pay-notice" data-beta-pay><h3>' + BETA_PAY_TITLE + '</h3><p>' + BETA_PAY_BODY + '</p></div>')) +
      '<label class="checkrow"><input type="checkbox" id="agree"><span>I have read and agree to the Smart Upkeep Member Agreement, including the arbitration agreement and class action waiver. I can opt out of arbitration within 30 days.</span></label>' + fe("agree") +
      '<label class="checkrow"><input type="checkbox" id="chargeOk"><span>' + consent + '</span></label>' + fe("chargeOk") +
      '<p class="fl">Signature</p>' + sigBlock("agreeSig") + fe("agreeSig") + '</div>' +
      (paymentsLive() ? ('<div class="card paybox"><h3>' + I("shield", "xs") + ' Payment</h3>' +
      '<fieldset style="border:0;padding:0;margin:0"><label class="fl">Card Number</label><input type="text" placeholder="•••• •••• •••• ••••" autocomplete="off"><div class="grid2"><div><label class="fl">Expiry</label><input type="text" placeholder="MM / YY" autocomplete="off"></div><div><label class="fl">CVC</label><input type="text" placeholder="•••" autocomplete="off"></div></div></fieldset></div>') :
        /* Finish deck #19: muted Payment box until sign-up opens (no card fields, per Legal's beta copy) */
        '<div class="card paybox paybox-soon" aria-disabled="true"><h3>' + I("shield", "xs") + ' Payment</h3><p class="small muted">Opens Soon</p></div>') +
      '<button class="btn btn-primary btn-big mw-hover" type="submit"' + (open ? '' : ' disabled aria-disabled="true"') + '>' + (paymentsLive() ? ("Accept And Pay " + money(b.today)) : "Accept And Continue") + '</button>' +
      '<p class="su-cancel-line small"><a href="#cancel" class="link mw-hover">Cancel Anytime, No Fee</a></p></form>';
    return obShell("accept", "pen", 3, "Join " + esc(t.label), "A recap of your plan and billing.", body, "");
  }

  function obRender(s) {
    if (s === "address") return obAddress();
    if (s === "homesize") return obHomeSize();
    if (s === "systems2") return obSystems2();
    if (s === "systems") { ["furnaces", "acs", "waterHeaters"].forEach(function (k) { if (S.answers[k] === undefined || S.answers[k] === "unsure") S.answers[k] = String(BASE_SET[k]); }); S.answers.whTypes = whTypes(); return obSystems(); }
    if (s === "addons") return obAddons();
    if (s === "plan") return obPlanScreen();
    if (s === "review") return obReview();
    if (s === "billing") return obBilling();
    if (s === "start") return obStart();
    if (s === "details") return obDetails();
    return obAccept();
  }
  function obNextOf(s) { var i = OB.indexOf(s), n = OB[Math.min(OB.length - 1, i + 1)]; return (n !== s && obSkip(n)) ? obNextOf(n) : n; }
  /* 2-for-1 badge pop-up (Machan Nov 13 10:19 PM: "the annual 2 for 1 should be a small badge and when its clicked it explains"). Hero badge pop-up look;
     the first outside tap only closes it, Esc closes and returns focus to the badge. */
  function bindF2Pop() {
    var bt = app.querySelector("[data-f2-open]"), pop = document.getElementById("f2Pop"); if (!bt || !pop) return;
    function place() { var r = bt.getBoundingClientRect(), host = pop.offsetParent || document.body, hr = host.getBoundingClientRect(), w = pop.offsetWidth, x = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), innerWidth - 16 - w); pop.style.left = Math.round(x - hr.left) + "px"; pop.style.top = Math.round(r.bottom - hr.top + 8) + "px"; }
    function shut(back) { if (pop.hidden || pop.classList.contains("closing")) return; pop.classList.remove("on"); pop.classList.add("closing"); bt.setAttribute("aria-expanded", "false"); document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", esc, true);
      setTimeout(function () { pop.hidden = true; pop.classList.remove("closing"); }, 160); if (back) bt.focus({ preventScroll: true }); }
    function outside(e) { if (pop.contains(e.target)) return; if (e.target === bt || bt.contains(e.target)) return; e.preventDefault(); e.stopPropagation(); shut(false);
      var swallow = function (ev) { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener("click", swallow, true); }; document.addEventListener("click", swallow, true); setTimeout(function () { document.removeEventListener("click", swallow, true); }, 500); }
    function esc(e) { if (e.key === "Escape") { e.preventDefault(); shut(true); } }
    bt.addEventListener("click", function (e) { e.stopPropagation(); if (!pop.hidden && !pop.classList.contains("closing")) { shut(true); return; }
      pop.hidden = false; place(); void pop.offsetWidth; pop.classList.add("on"); bt.setAttribute("aria-expanded", "true"); pop.focus({ preventScroll: true });
      document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", esc, true); });
  }
  function bindOb(s) {
    function rer() { save(); var y = window.scrollY; render(); window.scrollTo(0, y); }
    var afp = document.getElementById("afPop"); if (afp && s !== "plan") afp.remove();
    if (s === "plan") bindAfPop();
    var nx = app.querySelector("[data-ob-next]");
    app.querySelectorAll("[data-ob-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-ob-go")); }); });
    if (s === "address") {
      var st = document.getElementById("obStreet"), zp = document.getElementById("obZip"), er = document.getElementById("obAddrErr");
      function showSo() { /* Start Over stays visible in the four-button bar so the row stays even. */ }
      function upd() { S.answers.street = st.value; S.answers.zipcode = zp.value.replace(/\D/g, "").slice(0, 5); S.answers.zip = (S.answers.street.trim() + " " + S.answers.zipcode).trim(); er.textContent = ""; if (nx) nx.disabled = !addrOk(); showSo(); save(); }
      st.addEventListener("input", upd); zp.addEventListener("input", function () { upd(); if (S._outZip && S._outZip !== S.answers.zipcode) { var w = app.querySelector(".ob-wait"); if (w) w.remove(); } });
      [st, zp].forEach(function (el) {
        el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (el === st) zp.focus(); else if (nx && !nx.disabled) nx.click(); } });
        el.addEventListener("blur", function () { upd(); if (!addrOk() && (st.value.trim() || zp.value.trim())) er.textContent = "Enter your street address and 5-digit ZIP."; });
      });
      if (nx) nx.addEventListener("click", function () {
        upd();
        if (!addrOk()) { er.textContent = "Enter your street address and 5-digit ZIP."; return; }
        if (!inArea(S.answers.zipcode)) { S._outZip = S.answers.zipcode; save(); render(); return; }
        S._outZip = ""; go("homesize");
      });
      return;
    }
    if (s === "homesize") {
      if (nx) nx.addEventListener("click", function () { save(); go("systems"); });
      app.querySelectorAll("[data-ob-size]").forEach(function (b) { b.addEventListener("click", function () {
        var v = b.getAttribute("data-ob-size"); if (SIZE_OPTS.some(function (o) { return o[0] === v; })) { S.answers.sqft = v; rer(); var f = app.querySelector('[data-ob-size="' + v + '"]'); if (f) f.focus({ preventScroll: true }); } }); });
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
      if (nx) nx.addEventListener("click", function () { if (s === "systems" && !obSkip("systems2")) return go("systems2"); if (S.tailor) { S.tailor = false; S._tailorSnap = null; go("plan"); } else go("addons"); });
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
      sfitAddons(); setTimeout(sfitAddons, 300); if (document.fonts && document.fonts.ready) document.fonts.ready.then(sfitAddons);
    }
    if (s === "plan") {
      app.querySelectorAll("[data-ob-tier]").forEach(function (b) { if (b.classList.contains("sel")) return; b.addEventListener("click", function () { S.tier = b.getAttribute("data-ob-tier"); rer(); }); });
      var tl = app.querySelector("[data-ob-tailor]"); if (tl) tl.addEventListener("click", function () { S._tailorSnap = JSON.stringify({ answers: S.answers, addons: S.addons || [], tier: S.tier }); S.tailor = true; go("systems"); });
      if (!bindOb._quoted) { bindOb._quoted = 1; try { window.SUEvents && SUEvents.emit("quote.generated", "site", { payload: { tier: P.tiers[S.tier].label } }); } catch (x) {} }
    }
    if (s === "billing") {
      app.querySelectorAll("[data-ob-bill]").forEach(function (b) {
        function pick() { if (S.plan === b.getAttribute("data-ob-bill")) return; S.plan = b.getAttribute("data-ob-bill"); rer(); var n = app.querySelector('.pay-card[data-ob-bill="' + S.plan + '"]'); if (n) n.focus({ preventScroll: true }); }
        b.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-f2-open]")) return; pick(); });
        b.addEventListener("keydown", function (e) {
          if (e.target !== b) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
          if (/^Arrow(Up|Down|Left|Right)$/.test(e.key)) { e.preventDefault(); var all = [].slice.call(app.querySelectorAll(".pay-card")), i = all.indexOf(b), n = all[(i + (/Up|Left/.test(e.key) ? all.length - 1 : 1)) % all.length]; if (n) { S.plan = n.getAttribute("data-ob-bill"); rer(); var f = app.querySelector('.pay-card[data-ob-bill="' + S.plan + '"]'); if (f) f.focus({ preventScroll: true }); } }
        });
      });
      bindF2Pop();
    }
    if (s === "start") {
      app.querySelectorAll("[data-ob-day]").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-ob-day"); if (v < minStart()) return; S.firstVisit = v; S._calMonth = v.slice(0, 7); rer(); }); });
      app.querySelectorAll("[data-ob-cal]").forEach(function (b) { b.addEventListener("click", function () { var base = /^\d{4}-\d{2}$/.test(S._calMonth || "") ? S._calMonth : (S.firstVisit || minStart()).slice(0, 7); S._calMonth = ymShift(base, Number(b.getAttribute("data-ob-cal"))); rer(); }); });
      sfitStart();
    }
    if (s === "accept") { bindAccept(); sfitAccept(); return; }
    if (s === "details") { bindDetails(); return; }
    if (nx) nx.addEventListener("click", function () { go(obNextOf(s)); });
  }

  /* ===== Sign-Up Fit deck (Machan Nov 13 8:50 AM) =====
     #01 A: Start Date on a small phone (under 760px tall) keeps the full month; Your First Visit becomes one row with the picked date, and one tap opens Legal's box (word for word) over the calendar.
     #02 B: Accept is one screen of tap-to-open rows (Due Today, Member Agreement, Payments During Beta, Signature); each opens its full text over the page; Join Now sits in the bottom bar.
     #03 A: Add-Ons on a small phone: the list scrolls and Did You Know stays in view above the bar. No words are cut or changed; blocks only move or tuck behind a tap. */
  var SFIT_CHEV = '<svg class="sfit-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var SFIT_INFO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>';
  function sfitVars(sec) {
    var hdr = document.querySelector(".topbar"), bar = sec.querySelector(".ob-bar");
    document.documentElement.style.setProperty("--sfit-top", (hdr ? hdr.getBoundingClientRect().bottom : 72) + "px");
    document.documentElement.style.setProperty("--sfit-bar", (bar ? Math.max(bar.getBoundingClientRect().height, window.innerHeight - bar.getBoundingClientRect().top) : 76) + "px");
  }
  function sfitSheets(sec) {
    var scrim = document.createElement("div"); scrim.className = "sfit-scrim"; sec.appendChild(scrim);
    var api = { cur: null, items: {} };
    api.close = function () { var c = api.cur && api.items[api.cur]; if (c) { c.sh.classList.remove("on"); c.r.setAttribute("aria-expanded", "false"); } api.cur = null; sec.classList.remove("sfit-open"); };
    api.open = function (id) { api.close(); sfitVars(sec); var c = api.items[id]; api.cur = id; c.sh.classList.add("on"); c.r.setAttribute("aria-expanded", "true"); sec.classList.add("sfit-open"); if (c.onOpen) c.onOpen(); };
    api.add = function (id, r, label, nodes, head, onOpen) {
      r.setAttribute("aria-expanded", "false"); r.setAttribute("aria-controls", "sfit-" + id);
      var sh = document.createElement("div"); sh.className = "sfit-sheet"; sh.id = "sfit-" + id; sh.setAttribute("role", "region"); sh.setAttribute("aria-label", label);
      if (head) { var hd = document.createElement("button"); hd.type = "button"; hd.className = "sfit-sh mw-hover"; hd.innerHTML = '<span>' + label + '</span>' + SFIT_CHEV; hd.addEventListener("click", api.close); sh.appendChild(hd); }
      nodes.filter(Boolean).forEach(function (n) { sh.appendChild(n); });
      sec.appendChild(sh); api.items[id] = { r: r, sh: sh, onOpen: onOpen };
      r.addEventListener("click", function () { if (api.cur === id) api.close(); else api.open(id); });
    };
    scrim.addEventListener("click", api.close);
    document.addEventListener("keydown", function esc(e) { if (!sec.isConnected) { document.removeEventListener("keydown", esc); return; } if (e.key === "Escape") api.close(); });
    return api;
  }
  function sfitStart() {
    var sec = app.querySelector("section.ob-start"); if (!sec || window.innerHeight >= 760 + (window.suHouse ? 124 : 0)) return; /* house-build-1113: the 124px house band moves the cutoff */
    sec.classList.add("sfit-start");
    var cal = sec.querySelector(".ob-cal"), blurb = sec.querySelector(".ob-blurb"), note = sec.querySelector(".priced-note"), pick = sec.querySelector(".cal-pick");
    if (!cal || !blurb) return;
    var row = document.createElement("button"); row.type = "button"; row.className = "sfit-row mw-hover";
    row.innerHTML = '<span class="i">' + SFIT_INFO + '</span><span class="k">Your First Visit</span>' + (pick ? '<span class="d">' + esc(pick.textContent) + '</span>' : '') + SFIT_CHEV;
    cal.parentNode.insertBefore(row, cal.nextSibling);
    sfitSheets(sec).add("first", row, "Your First Visit", [blurb, note], true);
    sfitVars(sec);
  }
  function sfitAccept() {
    var sec = app.querySelector("section.ob-accept"); if (!sec) return;
    sec.classList.add("sfit-accept");
    var q = function (x) { return sec.querySelector(x); };
    var bar = q(".ob-bar"), built = bar && bar.querySelector(".ob-built"), form = q(".ob-accept-form"), card = form && form.querySelector(".card:not(.paybox)");
    var recap = q(".qf-body > .item-card") || q(".qf-body > .accept-compact");
    if (!bar || !form || !card || !recap) return;
    var tot = recap.querySelector(".item-row.total"), dueK = tot ? tot.querySelector(".k").textContent : "Due Today", dueV = tot ? tot.querySelector(".v").textContent : ((recap.querySelector(".accept-due b") || {}).textContent || "");
    var rows = document.createElement("div"); rows.className = "sfit-rows";
    var api = sfitSheets(sec);
    function mk(id, label, pre, post, nodes, onOpen) {
      var r = document.createElement("button"); r.type = "button"; r.className = "sfit-r mw-hover";
      r.innerHTML = pre + '<span class="k">' + label + '</span>' + post + SFIT_CHEV; rows.appendChild(r);
      api.add(id, r, label, nodes, true, onOpen); return r;
    }
    var h3 = card.querySelector("h3"), slot = h3 && h3.nextElementSibling, agree = document.getElementById("agree"), charge = document.getElementById("chargeOk");
    var beta = q("[data-beta-pay]"), sigL = [].filter.call(card.children, function (c) { return c.matches("p.fl"); })[0], sig = q(".sig");
    function ck(box) { return '<i class="sfit-ck' + (box && box.checked ? " on" : "") + '" aria-hidden="true"></i>'; }
    mk("recap", dueK, "", '<span class="v">' + esc(dueV) + '</span>', [recap]);
    var rA = mk("agree", h3 ? h3.textContent : "Member Agreement", ck(agree), "", [slot, agree && agree.closest("label"), document.getElementById("e-agree")]);
    var rC = mk("charge", beta ? beta.querySelector("h3").textContent : "Charge Consent", ck(charge), "", [beta, charge && charge.closest("label"), document.getElementById("e-chargeOk")]);
    var sized = false;
    mk("sig", sigL ? sigL.textContent : "Signature", "", "", [sig, document.getElementById("e-agreeSig")], function () { if (!sized && sig) { sized = true; var d = sig.querySelector('[data-sigmode="draw"]'); if (d) d.click(); } });
    [[agree, rA], [charge, rC]].forEach(function (p) { if (p[0]) p[0].addEventListener("change", function () { var i = p[1].querySelector(".sfit-ck"); if (i) i.classList.toggle("on", p[0].checked); }); });
    card.classList.add("sfit-hold");
    var pay = form.querySelector(".paybox"); if (pay) rows.appendChild(pay);
    form.insertBefore(rows, form.firstChild);
    var join = form.querySelector('button[type="submit"]'); if (join) { join.setAttribute("form", "obF"); bar.insertBefore(join, built); }
    var tail = document.createElement("div"); tail.className = "sfit-tail"; [q(".ob-soon"), q(".su-cancel-line")].forEach(function (n) { if (n) tail.appendChild(n); }); form.appendChild(tail);
    /* errors on submit open the first box that needs a fix */
    form.addEventListener("submit", function () { setTimeout(function () { var m = [["agree", "agree"], ["chargeOk", "charge"], ["agreeSig", "sig"]].filter(function (x) { var e = document.getElementById("e-" + x[0]); return e && e.textContent; })[0]; if (m) api.open(m[1]); }, 0); });
    sfitVars(sec);
  }
  function sfitAddons() {
    var sec = app.querySelector("section.ob-addons"); if (!sec) return;
    var list = sec.querySelector(".ob-ao-list"), dyk = sec.querySelector(".qf-dyk"), bar = sec.querySelector(".ob-bar");
    if (!list || !bar) return;
    list.style.maxHeight = "";
    sec.classList.remove("sfit-ao-tight");
    sec.classList.add("sfit-ao"); /* apply border + padding before measuring rows */
    function overflowPx() {
      /* Tailor Your Plan has no Did You Know (Machan Nov 14); the priced note may still sit under the list. Measure the lowest one shown so the list can use the freed height. */
      var low = 0; [dyk, list, sec.querySelector(".qf-body .priced-note")].forEach(function (e) { if (e && e.getClientRects().length) low = Math.max(low, e.getBoundingClientRect().bottom); });
      var over = Math.ceil(low + 8 - bar.getBoundingClientRect().top);
      var docOver = document.documentElement.scrollHeight - window.innerHeight;
      return Math.max(over, docOver);
    }
    var over = overflowPx();
    if (over <= 0) { sec.classList.remove("sfit-ao"); return; }
    /* Machan Nov 13 9:05 PM: size the box so about half of the next row peeks under the fade; never cut clean on a row edge. */
    function midCuts() {
      var lr = list.getBoundingClientRect(), rows = list.querySelectorAll("li.ob-ao"), out = [];
      for (var i = 0; i < rows.length; i++) {
        var rr = rows[i].getBoundingClientRect();
        out.push(Math.round(rr.top - lr.top + rr.height * 0.5));
      }
      return out;
    }
    function pickH(maxH) {
      var cuts = midCuts(), best = 0, next = 0, i;
      for (i = 0; i < cuts.length; i++) {
        if (cuts[i] <= maxH + 1) best = cuts[i];
        else if (!next) next = cuts[i];
      }
      return { h: best >= 96 ? best : maxH, next: next, maxH: maxH };
    }
    var maxH = Math.max(96, Math.floor(list.getBoundingClientRect().height - over));
    var pick = pickH(maxH);
    /* If half of the next row is only a little over the cap, tighten chrome so row 5 can peek instead of stopping at 3.5 / 4. */
    if (pick.next && pick.next - maxH <= 36 && pick.next - pick.h > 8) {
      sec.classList.add("sfit-ao-tight");
      over = overflowPx();
      maxH = Math.max(96, Math.floor(list.getBoundingClientRect().height - over));
      pick = pickH(maxH);
    }
    list.style.maxHeight = pick.h + "px";
    list.setAttribute("tabindex", "0");
  }
  function bindAccept() {
    var sigs = {}; app.querySelectorAll("[data-sig]").forEach(function (r) { sigs[r.getAttribute("data-sig")] = setupSig(r); });
    function keep() { S.signup = Object.assign({}, S.signup, { address: (S.answers.street || "") + ", " + (S.answers.zipcode || "") }); }
    var hc = document.getElementById("haveCode"); if (hc) hc.addEventListener("click", function () { hc.hidden = true; hc.setAttribute("aria-expanded", "true"); document.getElementById("refWrap").hidden = false; document.getElementById("sRef").focus(); });
    /* Refer A Neighbor codes only. Format check here; the real check happens on our side. Reward lands at the neighbor's first payment (Machan Nov 11). */
    (function () { var r = document.getElementById("sRef"), o = document.getElementById("refCheck"); if (!r || !o) return; function chk() { var v = r.value.trim().toUpperCase(); if (!v) { o.textContent = ""; r.removeAttribute("aria-invalid"); return; } var ok = /^SU-[A-Z]{1,4}-\d{4}$/.test(v); o.textContent = ok ? "\u2713 Code looks right. You and your neighbor each get 1 free month once your first payment goes through. Free months have no cash value." : "Codes look like SU-HOME-1234."; o.className = "small ref-check " + (ok ? "ok" : "bad"); r.setAttribute("aria-invalid", ok ? "false" : "true"); } r.addEventListener("input", chk); chk(); })();
    ["sName", "sPhone", "sEmail", "sRef"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", function () { keep(); save(); }); });
    document.getElementById("obF").addEventListener("submit", function (e) {
      e.preventDefault(); keep();
      var errs = [
        ["agree", !document.getElementById("agree").checked ? "Check the box to agree." : ""],
        ["chargeOk", !document.getElementById("chargeOk").checked ? "Check the box to OK the charge and auto-renewal." : ""],
        ["agreeSig", !sigs.agreeSig.valid() ? "Sign to accept." : ""]];
      var first = null;
      errs.forEach(function (x) { var el = document.getElementById("e-" + x[0]); if (el) el.textContent = x[1]; var f = document.getElementById(x[0]); if (f && f.setAttribute) f.setAttribute("aria-invalid", x[1] ? "true" : "false"); if (x[1] && !first) first = el; });
      if (first) { first.scrollIntoView({ block: "center" }); return; }
      /* Machan Nov 13 11:00 PM: Accept now comes before Start Date and Details. Keep the signed acceptance with the exact totals it covered;
         Details finishes sign-up only if the plan, payment choice and Due Today still match, otherwise it sends them back here to accept again. */
      var b = obBill();
      S.accepted = { sig: sigs.agreeSig.value(), signedAt: new Date().toISOString(), agreement: AGREEMENT.id + "@" + AGREEMENT.rev, tier: S.tier, plan: b.plan, today: b.today, addonIds: (S.addons || []).slice() };
      save();
      if (S.firstVisit && S.firstVisit >= minStart() && !detailErrs(S.signup || {}).some(function (x) { return x[1]; })) { finishSignup(); return; }
      go(obNextOf("accept"));
    });
  }
  function acceptStillValid() {
    var A = S.accepted, b = obBill();
    return !!(A && A.sig && A.tier === S.tier && A.plan === b.plan && A.today === b.today && String(A.addonIds || []) === String(S.addons || []));
  }
  function finishSignup() {
    var s = S.signup = Object.assign({}, S.signup), A = S.accepted, b = obBill();
    s.agreementSignature = A.sig; s.signedAt = A.signedAt; s.tier = S.tier; s.planTag = planTag(); s.firstVisit = S.firstVisit; s.access = S.access;
    s.agreement = A.agreement;
    s.totals = { plan: b.plan, label: b.label, today: b.today, perCharge: b.perCharge || 0, membershipAnnual: b.membershipAnnual, addonIds: (S.addons || []).slice(), termMonths: b.termMonths };
    if (!s.myReferralCode) s.myReferralCode = makeReferralCode(s.name);
    logAddon("purchase", (S.addons || []).slice(), "accept:" + S.tier);
    try { window.SUEvents && SUEvents.emit("signup.completed", "site", { member: s.name || "New member", payload: { plan: P.tiers[S.tier].label, tag: s.planTag, payment: b.plan, addons: (S.addons || []).length } }); } catch (x) {}
    S.accepted = null; save();
    go("confirm");
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
    if (hasRealOncePrice(a)) {
      if (a.price != null) return money(a.price);
      return money(a.annual) + (a.unit === "season" ? "/Season" : "");
    }
    if (a && !a.quoteRequired && hasConfigRange(a)) return rangePriceLabel(a);
    return QUOTE_LABEL;
  }
  function onceListPrice(a) {
    var lab = oncePriceLabel(a);
    if (lab === QUOTE_LABEL || lab === "Needs A Site Visit") return lab;
    return lab + " one time";
  }
  /* B1/B2: monthly services show their +$X/mo (Irrigation +$19, Sump +$6, Humidifier +$6); one-time rows show a fixed price or Quote. Only fixed one-time prices are totaled. */
  function acItemPrice(a) { return (a && (a.fromExtras || a.gutter)) ? addMo(a) : oncePriceLabel(a); }
  function alacarte() {
    var bk = S.alacarteBooking || {};
    var list = selectedAlacarte();
    var total = alacarteTotal();
    var picks = '<div class="addons"><h3>Services</h3>' +
      renderAddonList(monthlyAddonCatalog(), S.alacarte || [], "alacarte", addMo, true) + '</div>' +
      '<div class="addons last-minute"><h3>Tailor Your Plan: Quick Jobs</h3>' +
      
      renderAddonList(onceAddonCatalog(), S.alacarte || [], "alacarte", oncePriceLabel, true) + '</div>';
    return backBtn() + '<h1>Tailor Your Plan</h1><p class="hm-sub alc-sub">Members can tailor their plan or add one-time services.</p>' +
      
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
      '<div><span>Type</span><span>One-Time Services (No Membership)</span></div>' +
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
    return homePill() + '<div class="check-big" aria-hidden="true">&#10003;</div><h1>Thank You' + (su.name ? ", " + esc(su.name.split(" ")[0]) : "") + '</h1>' +
      /* Machan Nov 13 10:20 PM: "so they would eventually land on a thank you and expect an email within 1 business day" / "for now i am planning on giving them an email with log in information after sign up". Copy only: no email is wired here. */
      '<p class="lead-sm">Expect an email with your member app login details within 1 business day.</p>' +
      '<div class="card qa-next"><h3>Next Steps</h3><ol class="qa-steps">' +
      '<li><strong>Watch For Your Login Email</strong><span>Within 1 business day, we\'ll email your member app login details to the address you gave us' + (email ? ' <span class="cf-email">(<strong>' + esc(email) + '</strong>)</span>' : '') + '. Then log in at <a class="link" href="member/">smartupkeep.ai/member</a>.</span></li>' +
      '<li><strong>Read Your Welcome Message</strong><span>The first time you sign in, Ask Anything opens with a welcome from your care team.</span></li>' +
      '<li><strong>Your First Visit' + (fv ? ': ' + esc(longDate(fv)) : '') + '</strong><span>We\'ll confirm the time with you before your visit. ' + FIRST_VISIT_BLURB + '</span></li>' +
      '<li><strong>Add Access Details</strong><span>Once you log in, you can add lockbox or door codes in your member app.</span></li>' +
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
      /* Your Home card is off again (hotfix after #94). myHomeCard stays in the file but is not rendered. Street View photo stays held. Card order: Next Steps, Summary, Refer A Neighbor. */
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
      badge.className = "video-eyestack"; /* Hero Eyebrow deck #04 B: match the hero */
      badge.innerHTML = '<span class="hm-eye">Preventive Home Maintenance</span><span class="hm-phead">Starting At ' + money(P.minMonthly || 139) + '/mo</span>';
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
  vid.addEventListener("ended", function () { closeVideo(); var pl = document.getElementById("hs-plans") || document.getElementById("row-plans"); if (pl) setTimeout(function () { hmJumpSec(pl); }, 150); }); /* Funnel Deck: after the video, back to the home page plans */
  modal.addEventListener("click", function (e) { if (e.target === modal) closeVideo(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeVideo(); });

  /* ---------- Share ---------- */
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-share]"); if (b) doShare(b.parentNode.querySelector(".hm-share-msg")); });
  document.getElementById("shareBtn").addEventListener("click", function () { doShare(); });
  /* ---------- Brand band header (Home, preview Nov 13 2026 4:15 PM, Swatch spec; r4 Warm White band, never green): logo centered at all times (Nov 13 7:46 PM, no slide), Share top left, Menu top right; also on every onboarding step (7:41 PM). Menu: Log In, Sign Up (funnel start). ---------- */
  (function () {
    var root = document.documentElement, brand = document.getElementById("logoHome"), btn = document.getElementById("hdrMenuBtn"), menu = document.getElementById("hdrMenu");
    var rmq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null, ticking = false;
    function skirt() { return parseFloat(getComputedStyle(document.body).getPropertyValue("--su-skirt")) || 0; } /* body: 0 on onboarding steps */
    function sync() {
      ticking = false;
      var onHome = document.body.classList.contains("su-band"); /* Home or an onboarding step (same header) */
      /* PR108 r4: warm shadow under the band once the skirt has scrolled away (band at its 56px/64px height). */
      document.body.classList.toggle("su-band-scrolled", onHome && (window.scrollY || 0) >= Math.max(1, skirt() - 0.5));
      if (!brand || !onHome) { root.style.removeProperty("--su-lx"); root.style.removeProperty("--su-ly"); return; }
      /* Machan Nov 13 7:46 PM ICT: logo centered at all times, no slide (CSS left:50% / translate -50%). Only the vertical centring in the visible band
         (88px at the top on Home, 56px once scrolled) follows scroll, as live; reduced motion parks it in the 56px band. */
      var z = zoomFactor(), y = Math.max(0, window.scrollY || 0), lx = 0;
      var ly = (rmq && rmq.matches) ? 0 : Math.max(0, skirt() - y / z) / 2;
      root.style.setProperty("--su-lx", lx.toFixed(1) + "px"); root.style.setProperty("--su-ly", ly.toFixed(1) + "px");
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }
    window.addEventListener("scroll", req, { passive: true }); window.addEventListener("resize", req);
    if (rmq && rmq.addEventListener) rmq.addEventListener("change", req);
    window.suBandSync = req;
    if (!btn || !menu) return;
    var shutT = 0;
    function setOpen(o, back) {
      /* Polish item 13: menu opens over 160ms and closes over 120ms (keyframes in polish.css); [hidden] is set once the close has played. */
      clearTimeout(shutT); menu.classList.remove("is-closing");
      if (o) menu.hidden = false;
      else if (!menu.hidden) { var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; if (rm) menu.hidden = true; else { menu.classList.add("is-closing"); shutT = setTimeout(function () { menu.hidden = true; menu.classList.remove("is-closing"); }, 120); } }
      btn.setAttribute("aria-expanded", o ? "true" : "false");
      if (o) { var f = menu.querySelector("a,button"); if (f) f.focus(); } else if (back) btn.focus();
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(menu.hidden, true); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) setOpen(false, true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { e.preventDefault(); setOpen(false, true); } });
    menu.querySelectorAll("[data-menu-act]").forEach(function (b) { b.addEventListener("click", function () { setOpen(false, false); act(b.getAttribute("data-menu-act")); }); });
  })();
  function doShare(mEl) {
    var url = location.origin + location.pathname, p = price(), msg = mEl || document.getElementById("shareMsg");
    var text = "Preventive home maintenance for Metro Detroit. Starting at $139/mo.";
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
  /* Hotfix Nov 13 2026 (Machan 10:26 PM): a fresh visit always opens on Home at the top. Saved sign-up progress never auto-opens;
     it resumes only through the resume strip / menu dot (S.resume keeps the step). */
  try { history.scrollRestoration = "manual"; } catch (e) {}
  if (S.screen !== "home") { if (isOb(S.screen)) S.resume = S.screen; S.screen = "home"; S.path = []; save(); }
  if (location.hash === "#home") { history.replaceState(null, "", location.pathname); S.screen = "home"; save(); }
  if (location.hash === "#cancel") { history.replaceState(null, "", location.pathname); go("cancel"); }
  window.addEventListener("hashchange", function () { if (location.hash === "#cancel") { history.replaceState(null, "", location.pathname); go("cancel"); } });
  /* Home section hash links (e.g. /#row-plans, /#acc-faq): jump with the same header offset once Home is rendered */
  function hmHash() { var h = location.hash.slice(1); if (!h || S.screen !== "home" || !/^[\w-]+$/.test(h)) return; var el = document.getElementById(h); if (!el || !el.closest(".hm")) return; if (el.tagName === "DETAILS") el.open = true; setTimeout(function () { hmJump(el, false); }, 50); }
  window.addEventListener("hashchange", hmHash);
  if (location.hash === "#start") { history.replaceState(null, "", location.pathname); if (!isOb(S.screen)) go(OB[0]); }
    var obHomeBtn = document.getElementById("obHomeBtn");
  if (obHomeBtn) obHomeBtn.addEventListener("click", function (e) { e.preventDefault(); save(); go("home"); });
  document.getElementById("logoHome").addEventListener("click", function (e) { e.preventDefault(); if (S.screen !== "home") go("home"); else { var top = document.getElementById("hs-top"); if (top) hmJumpSec(top); else hmGlideTo(0, "home"); } });

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
    (function () { if (document.getElementById("obCss")) return; var l = document.createElement("link"); l.id = "obCss"; l.rel = "stylesheet"; l.href = "onboarding.css?v=h9p3"; document.head.appendChild(l); })();
    /* house-build-1113: the onboarding house band (map on step 1, live house from step 2). Loaded here so the diff stays out of index.html's page body. */
    (function () { if (document.getElementById("obHouseJs")) return; var j = document.createElement("script"); j.id = "obHouseJs"; j.src = "onboarding-house.js?v=h9p2"; j.async = true; document.head.appendChild(j); })();
  function bootApp() {
    var h0 = location.hash; /* snapshot: suHist's replaceState drops the hash */
    render(); suHist(S.screen, true);
    if (h0 && /^#[\w-]+$/.test(h0) && !location.hash) { try { history.replaceState(history.state, "", location.pathname + location.search + h0); } catch (e) {} }
    if (!h0) window.scrollTo(0, 0);
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
  /* Home Header deck (Machan Nov 12 2026): Share sits top left and fades in, in place, only after the van drives away (01A). Reduced motion or no van: shown at once, no animation. Its space is kept, so nothing jumps. */
  function shareIn() { document.body.classList.add("share-in"); }
  if (rm) shareIn();
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
      if (!(window.SUVan ? window.SUVan.play(bar, bar.querySelector(".brand"), bar.querySelector(".top-share")) : place())) { shareIn(); return; }
      state = "gone"; done = true;
      var vv = bar.querySelector(".hdr-van"), fin = false; function after() { if (fin) return; fin = true; shareIn(); }
      if (vv) vv.addEventListener("animationend", function (e) { if (e.target === vv) after(); });
      setTimeout(after, 4600);
    }
  }
  var rafQ = false; window.addEventListener("scroll", function () { if (rafQ) return; rafQ = true; requestAnimationFrame(function () { rafQ = false; check(); }); }, { passive: true });
  /* Oct 17 01:13: start ~0.3s after the page is visible and the gate is passed, even with the video pop-up open (header sits above its backdrop) */
  var ready = false;
  (function waitReady() {
    if (done || rm) return;
    if (document.body.classList.contains("on-home") && !(window.SUVan || v)) { shareIn(); return; }
    if (document.hidden || document.body.classList.contains("gate-locked") || !document.body.classList.contains("on-home")) { setTimeout(waitReady, 200); return; }
    setTimeout(function () { ready = true; check(); }, 300);
  })();
  window.addEventListener("resize", function () { if (state === "park") place(); });
})();
