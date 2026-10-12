/* Smart Upkeep sign-up funnel. Static prototype, no backend.
   Progress lives in localStorage. Photos and card data never leave the browser
   (photos are in-memory previews only; card fields are disabled and never read). */
(function () {
  "use strict";
  var P = window.SMART_UPKEEP_PRICING;
  var KEY = "smartUpkeep.v1", VKEY = "smartUpkeep.videoDismissed";
  var app = document.getElementById("app");
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
  function fresh() { return { screen: "home", answers: {}, tier: "gold", plan: "annual", photos: {}, visit: null, photosComplete: false, signup: null, path: [] }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.screen) return Object.assign(fresh(), s); } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function round(n) { return Math.round(n / P.roundTo) * P.roundTo; }

  /* ---------- Pricing ---------- */
  function num(id, def) { var v = S.answers[id]; return (v === undefined || v === "unsure") ? def : Number(v); }
  function price(answers) {
    var a = answers || S.answers, d = P.unsureDefaults;
    var sqft = num("sqft", d.sqft), f = num("furnaces", d.furnaces), ac = num("acs", d.acs), wh = num("waterHeaters", d.waterHeaters);
    var whType = (a.whType && a.whType !== "unsure") ? a.whType : d.whType;
    var stories = num("stories", d.stories), extras = Array.isArray(a.extras) ? a.extras : [];
    var tankless = whType === "tankless" ? wh : whType === "both" ? Math.max(1, Math.floor(wh / 2)) : 0;
    var tank = wh - tankless;
    var seasonal = P.seasonalVisit.base + P.seasonalVisit.perSqft * sqft;
    var checkIn = P.checkInVisit.base + P.checkInVisit.perSqft * sqft;
    var services = f * P.perUnit.furnace + ac * P.perUnit.ac + tank * P.perUnit.tankWaterHeater + tankless * P.perUnit.tanklessWaterHeater +
      P.dryerVent + (P.gutters2Cleanings[Math.min(3, stories)] || 540);
    var goldExtras = 0, platExtras = 0;
    extras.forEach(function (k) { var e = P.extras[k]; if (!e) return; goldExtras += e.gold || 0; platExtras += e.platinumOnly || 0; });
    var gold = 4 * seasonal + services + goldExtras;
    var platinum = gold + 8 * checkIn + P.platinumRoofInspection + platExtras;
    return { gold: round(gold), platinum: round(platinum), sqft: sqft };
  }
  window.SmartUpkeepPrice = price; // exposed for testing

  /* ---------- Navigation ---------- */
  function go(screen) { if (S.screen !== screen) { S.path.push(S.screen); if (S.path.length > 40) S.path.shift(); } S.screen = screen; save(); render(); window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  function back() { var p = S.path.pop(); S.screen = p || "home"; save(); render(); window.scrollTo(0, 0); }
  function backBtn() { return '<button class="link back mw-hover" data-act="back" type="button">&larr; Back</button>'; }

  function render() {
    var s = S.screen, html;
    app.classList.toggle("wide", s === "quote" || s === "photos");
    if (s === "home") html = home();
    else if (s === "overview") html = overview();
    else if (/^q\d$/.test(s)) html = question(Number(s.slice(1)));
    else if (s === "choice") html = choice();
    else if (s === "photos") html = photos();
    else if (s === "visit") html = visitForm();
    else if (s === "quote") html = quote();
    else if (s === "signup") html = signup();
    else if (s === "confirm") html = confirm();
    else { S.screen = "home"; html = home(); }
    app.innerHTML = html;
    app.setAttribute("data-screen", s);
    bind();
  }

  /* ---------- Screens ---------- */
  function home() {
    var lines = [
      ["&#128167;", "When Was the Last Time You Flushed Your Water Heater?", "Or cleaned the dryer vent, or tested the sump pump?"],
      ["&#128203;", "There's a Simple, but Long, List of Things Every Homeowner Needs to Do.", "Most people ignore it because life gets in the way."],
      ["&#9201;", "We Find Exactly What Your Home Needs. In Minutes.", "Answer a few questions and get your plan and price."],
      ["&#128737;", "Licensed &amp; Insured Techs Who Show Up Prepared", "We log your equipment first, so the right parts and filters are on the truck."],
      ["&#128276;", "We Even Track Recalls", "If a maker recalls your furnace, water heater or panel, we let you know."]
    ];
    return '<section class="hero">' +
      '<p class="eyebrow">Home Maintenance Membership &middot; Metro Detroit</p>' +
      '<h1>Your Home, Taken Care Of.</h1>' +
      '<p class="lead">Smart Upkeep is one membership for the maintenance your home needs all year: HVAC tune-ups, water heater service, gutters, dryer vents, safety checks and more, done by our licensed techs on a set schedule.</p>' +
      '<button class="link watch mw-hover" data-act="watch" type="button">&#9654; Watch Video</button>' +
      '<button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button>' +
      '</section>' +
      '<div class="lines">' + lines.map(function (l) { return '<div class="line card mw-hover"><span class="ico" aria-hidden="true">' + l[0] + '</span><div><h3>' + l[1] + '</h3><p class="muted small" style="margin:0">' + l[2] + '</p></div></div>'; }).join("") + '</div>' +
      '<h2>Learn More</h2>' +
      acc("What's Included", '<ul class="feat"><li>Fall furnace and spring AC tune-ups for every system</li><li>Water heater flush (tank) or descale (tankless)</li><li>Gutter cleaning in spring and fall</li><li>Dryer vent cleaning</li><li>Smoke, CO, GFCI and shut-off valve checks</li><li>Irrigation start-up and blowout, fireplace, sump pump and softener care if you have them</li><li>Recall Monitoring on all your logged equipment</li><li>A written report after every visit</li></ul><p class="small muted">Gold is 4 visits a year. Platinum is 12 visits a year and adds roof inspection, generator service, winter checks and more.</p>') +
      acc("How It Works", '<ol class="feat"><li>Answer a few questions about your home (about 2 minutes).</li><li>Optionally snap photos of your equipment labels for a final price.</li><li>Review your membership and estimated price.</li><li>Sign up. We schedule your first visit and start tracking recalls.</li></ol>') +
      acc("Recall Tracking", '<p>When we log your equipment (brand, model and serial from the labels), we watch for manufacturer and safety recalls on it. If something you own is recalled, we tell you and help you get it fixed. It is included in every membership.</p>') +
      acc("Service Area: Metro Detroit", '<p>We serve Wayne, Oakland and Macomb counties and nearby, including Detroit, Bloomfield Hills, Birmingham, Troy, Farmington Hills, Novi, West Bloomfield, Rochester, Grosse Pointe, Northville and Plymouth. Not sure if you are covered? Enter your ZIP in step 1.</p>') +
      acc("FAQ", '<h4>Do I need to send photos?</h4><p>No. You get an estimate without them. Photos let us give a final price.</p><h4>What if my home is different than I described?</h4><p>Your price is an estimate. If what we find on site does not match, we adjust the price before your first billed visit.</p><h4>Are your techs licensed and insured?</h4><p>Yes. Specialist work like HVAC is done by licensed pros.</p><h4>Can I cancel?</h4><p>Membership terms are being finalized. See the draft agreement at sign up.</p>') +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="start" type="button">Get Started</button></div>';
  }
  function acc(t, body) { return '<details class="acc"><summary class="mw-hover">' + t + '</summary><div class="acc-body">' + body + '</div></details>'; }

  function overview() {
    return backBtn() + '<p class="eyebrow">How It Works</p><h1>Four Quick Steps</h1>' +
      '<ol class="steps">' + [["Answer a Few Questions", "7 quick taps. Not sure? Tap Unsure."], ["Take Some Photos (Optional)", "Equipment labels give you a final price."], ["Review Your Membership", "Gold or Platinum, with your estimated price."], ["Sign Up", "Sign the agreement and pick a payment plan."]]
        .map(function (s, i) { return '<li class="card mw-hover"><span class="num">' + (i + 1) + '</span><div><h3 style="margin:0">' + s[0] + '</h3><p class="muted small" style="margin:0">' + s[1] + '</p></div></li>'; }).join("") + '</ol>' +
      '<button class="btn btn-primary btn-big mw-hover" data-act="q0" type="button">Continue to Step 1</button>';
  }

  function question(i) {
    var q = Q[i], a = S.answers[q.id], pct = Math.round((i + 1) / Q.length * 100), body = "";
    if (q.type === "zip") {
      body = '<label class="fl" for="zip">Address or ZIP</label><input id="zip" type="text" autocomplete="street-address" placeholder="e.g. 48322 or 123 Main St, Novi" value="' + esc(a && a !== "unsure" ? a : "") + '">' +
        '<div class="err" id="zipErr"></div>' +
        '<div class="opts" style="margin-top:.6rem">' + unsureBtn(a === "unsure") + '</div>';
    } else if (q.type === "multi") {
      var arr = Array.isArray(a) ? a : [];
      body = '<div class="opts two">' + q.opts.map(function (o) { var sel = arr.indexOf(o[0]) > -1; return '<button type="button" class="opt mw-hover' + (sel ? " sel" : "") + '" data-multi="' + o[0] + '" aria-pressed="' + sel + '"><span class="chk">' + (sel ? "&#10003;" : "") + '</span>' + o[1] + '</button>'; }).join("") +
        '<button type="button" class="opt mw-hover' + (a === "none" ? " sel" : "") + '" data-multi="none"><span class="chk">' + (a === "none" ? "&#10003;" : "") + '</span>None of These</button>' + unsureBtn(a === "unsure") + '</div>';
    } else {
      body = '<div class="opts two">' + q.opts.map(function (o) { return '<button type="button" class="opt mw-hover' + (String(a) === o[0] ? " sel" : "") + '" data-single="' + o[0] + '">' + o[1] + '</button>'; }).join("") + unsureBtn(a === "unsure") + '</div>';
      if (q.type === "wh") {
        var t = S.answers.whType;
        body += '<div class="sub-q"><p class="fl">Tank or Tankless?</p><div class="opts two">' + [["tank", "Tank"], ["tankless", "Tankless"], ["both", "One of Each"], ["unsure", "Unsure"]].map(function (o) { return '<button type="button" class="opt mw-hover' + (o[0] === "unsure" ? " unsure" : "") + (t === o[0] ? " sel" : "") + '" data-wh="' + o[0] + '">' + o[1] + '</button>'; }).join("") + '</div></div>';
      }
    }
    var canNext = isAnswered(q);
    return backBtn() + '<p class="eyebrow">Step 1 &middot; Question ' + (i + 1) + ' of ' + Q.length + '</p>' +
      '<div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div style="width:' + pct + '%"></div></div>' +
      '<h2>' + q.title + '</h2><p class="muted">' + q.help + '</p>' + body +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="next" type="button"' + (canNext ? "" : " disabled") + '>Next</button></div>';
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
    var p = price();
    return backBtn() + '<div class="progress"><div style="width:100%"></div></div><p class="eyebrow">Questions Done</p><h1>Nice Work. What Next?</h1>' +
      '<p>We have enough to build your estimate now. Want a final price? Add a few photos of your equipment labels.</p>' +
      '<div class="stack"><button class="btn btn-primary btn-big mw-hover" data-act="toQuote" type="button">See My Estimate Now</button>' +
      '<button class="btn btn-outline btn-big mw-hover" data-act="photos" type="button">Add Photos for a Final Price</button></div>' +
      '<p class="small muted" style="margin-top:1rem">Estimates start around ' + money(p.gold) + ' a year for Gold.</p>';
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
    return backBtn() + '<p class="eyebrow">Step 2 &middot; Optional</p><h1>Take Some Photos</h1>' +
      '<div class="notice"><strong>Photos are needed for a FINAL price, but not for an estimate.</strong> One clear shot of each label lets us confirm your equipment and lock your price. Photos stay in this browser in this prototype; nothing is uploaded.</div>' +
      '<div class="photos" style="margin-top:1rem">' + cards.map(function (c) {
        var urls = photoMem[c[0]] || [], n = urls.length || (S.photos[c[0]] || 0);
        return '<div class="card pcard mw-hover"><h3>' + esc(c[1]) + (n ? '<span class="done-badge">' + n + ' Added</span>' : "") + '</h3><p class="muted small" style="margin:0 0 .6rem">' + esc(c[2]) + '</p>' +
          '<label class="btn btn-outline mw-hover" style="width:100%">&#128247; Take or Choose Photo<input type="file" accept="image/*" capture="environment" multiple data-photo="' + c[0] + '"></label>' +
          '<div class="prev">' + urls.map(function (u) { return '<img alt="Preview" src="' + u + '">'; }).join("") + (n && !urls.length ? '<span class="small muted">Previews clear on reload.</span>' : "") + '</div></div>';
      }).join("") + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary btn-big mw-hover" data-act="photosDone" type="button">Continue to My Price</button></div>' +
      '<div class="btn-row"><button class="btn btn-outline btn-big mw-hover" data-act="visit" type="button">Skip Photos: Schedule a Free Tech Visit Instead</button></div>';
  }

  function visitForm() {
    var v = S.visit || {}, w = v.windows || [];
    var min = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    return backBtn() + '<p class="eyebrow">Free Tech Visit</p><h1>Schedule a Free Tech Visit</h1><p>A tech comes by, logs your equipment and confirms your final price. About 30 minutes, no charge.</p>' +
      '<form id="visitF" novalidate><label class="fl" for="vDate">Preferred Date</label><input id="vDate" type="date" min="' + min + '" value="' + esc(v.date) + '">' +
      '<p class="fl">Preferred Time Windows</p><div class="opts two">' + ["Morning (8 to 11)", "Midday (11 to 2)", "Afternoon (2 to 5)", "Evening (5 to 7)"].map(function (t) { var s = w.indexOf(t) > -1; return '<button type="button" class="opt mw-hover' + (s ? " sel" : "") + '" data-win="' + t + '"><span class="chk">' + (s ? "&#10003;" : "") + '</span>' + t + '</button>'; }).join("") + '</div>' +
      '<label class="fl" for="vName">Name</label><input id="vName" type="text" autocomplete="name" value="' + esc(v.name) + '">' +
      '<label class="fl" for="vPhone">Phone</label><input id="vPhone" type="tel" autocomplete="tel" value="' + esc(v.phone) + '">' +
      '<label class="fl" for="vEmail">Email</label><input id="vEmail" type="email" autocomplete="email" value="' + esc(v.email) + '">' +
      '<div class="err" id="vErr"></div><div class="btn-row"><button class="btn btn-primary btn-big mw-hover" type="submit">Request My Free Visit</button></div></form>';
  }

  function quote() {
    var p = price(), a = S.answers, d = P.unsureDefaults;
    var final = S.photosComplete && S.visit && S.visit.completed;
    var status = S.visit ? '<p class="small"><strong>Free tech visit requested</strong> for ' + esc(S.visit.date) + ' (' + esc((S.visit.windows || []).join(", ")) + '). We will confirm by text.</p>' : S.photosComplete ? '<p class="small"><strong>Photos added.</strong> We will review them and confirm your final price.</p>' : "";
    var unsure = Object.keys(a).filter(function (k) { return a[k] === "unsure"; }).length;
    return backBtn() + '<p class="eyebrow">Step 3 &middot; Review Your Membership</p><h1>Your Estimated Price</h1>' + status +
      (final ? "" : '<div class="notice"><strong>Your price is an estimate.</strong> It may change after we review your photos or complete a site visit. If photos don\'t match what we find on site, pricing will be adjusted.</div>') +
      (unsure ? '<p class="small muted" style="margin-top:.6rem">You answered Unsure ' + unsure + (unsure > 1 ? " times" : " time") + ', so we used a typical metro Detroit home for those.</p>' : "") +
      '<div class="tiers">' + ["gold", "platinum"].map(function (k) {
        var t = P.tiers[k], amt = p[k], sel = S.tier === k;
        return '<div class="card tier mw-hover' + (sel ? " sel" : "") + '" data-tier="' + k + '" role="button" tabindex="0" aria-pressed="' + sel + '">' + (t.recommended ? '<span class="ribbon">Most Popular</span>' : "") +
          '<p class="eyebrow" style="margin-top:.4rem">' + t.tagline + ' &middot; ' + t.visits + ' Visits a Year</p><h2>' + t.label + '</h2>' +
          '<p class="small muted" style="margin:0">Estimated Price</p><div class="price">' + money(amt) + '<small> / year</small></div>' +
          '<p class="small muted">About ' + money(amt / 12) + ' a month' + (k === "platinum" ? ", or " + money(amt / 4) + " a quarter" : ", paid annually") + '</p>' +
          '<ul>' + t.features.map(function (f) { return "<li>" + (/Recall Monitoring/.test(f) ? "<strong>" + f + "</strong>" : f) + "</li>"; }).join("") + '</ul>' +
          '<button class="btn ' + (sel ? "btn-primary" : "btn-outline") + ' mw-hover" data-pick="' + k + '" type="button">' + (sel ? "Selected: " : "Choose ") + t.label + '</button></div>';
      }).join("") + '</div>' +
      '<p class="small muted">Photo policy: if the photos you send don\'t match what we find on site, pricing will be adjusted before your first billed visit. Prices are draft and assume metro Detroit.</p>' +
      '<button class="btn btn-primary btn-big mw-hover" data-act="signup" type="button">Sign Up for ' + P.tiers[S.tier].label + '</button>' +
      (!S.photosComplete && !S.visit ? '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="photos" type="button">Add Photos for a Final Price</button><button class="btn btn-outline mw-hover" data-act="visit" type="button">Schedule a Free Tech Visit</button></div>' : "");
  }

  function totals() {
    var amt = price()[S.tier];
    if (S.tier === "gold") return { plan: "annual", label: "Paid in Full Annually, Up Front", today: amt, year: amt, note: "Gold is paid in full for the year, up front." };
    if (S.plan === "quarterly") return { plan: "quarterly", label: "4 Quarterly Payments", today: amt / 4, year: amt, note: "4 payments of " + money(amt / 4) + "." };
    var disc = round(amt * (1 - P.platinumAnnualDiscount));
    return { plan: "annual", label: "Paid Annually, Up Front (10% Off, Draft)", today: disc, year: disc, save: amt - disc, note: "You save " + money(amt - disc) + " (draft discount)." };
  }

  var AGREEMENT = '<span class="draft">DRAFT, pending legal review</span><h4>Smart Upkeep Membership Agreement</h4><p>This placeholder agreement is between you (the Member) and Smart Upkeep. It is not final and is shown for prototype purposes only.</p><h4>1. Services</h4><p>Smart Upkeep will perform the maintenance visits and services listed for your selected membership tier at the service address, on a schedule we set with you.</p><h4>2. Term and Renewal</h4><p>The membership runs for 12 months from your first visit. Renewal terms are to be determined.</p><h4>3. Pricing and Adjustments</h4><p>Your price is based on the information and photos you provide. If photos or answers do not match what we find on site, pricing will be adjusted and you may accept the new price or cancel before your first billed visit.</p><h4>4. Payment</h4><p>Gold memberships are paid in full annually, up front. Platinum memberships may be paid in 4 quarterly payments or annually up front at a discount.</p><h4>5. Access</h4><p>You agree to provide reasonable access to the home and equipment at scheduled times.</p><h4>6. Recall Monitoring</h4><p>We will monitor logged equipment for published manufacturer recalls and notify you. We do not guarantee that every recall will be identified.</p><h4>7. Cancellation</h4><p>Cancellation and refund terms are to be determined.</p>';
  var WAIVER = '<span class="draft">DRAFT, pending legal review</span><h4>Liability Waiver</h4><p>This placeholder waiver is for prototype purposes only and is not final.</p><p>Maintenance visits are preventive and do not guarantee that equipment will not fail. Smart Upkeep is not responsible for pre-existing conditions, normal wear, or failures of equipment that is past its service life. Our licensed and insured technicians will take reasonable care. Liability limits, exclusions and insurance details are to be determined by legal review.</p>';

  function sigBlock(id) {
    return '<div class="sig" data-sig="' + id + '"><div class="sig-tabs"><button type="button" class="btn btn-primary mw-hover" data-sigmode="draw">Draw</button><button type="button" class="btn btn-outline mw-hover" data-sigmode="type">Type</button></div>' +
      '<canvas class="sigpad" aria-label="Draw your signature"></canvas><input type="text" class="typed-sig hide" placeholder="Type your full name" aria-label="Typed signature">' +
      '<button type="button" class="link mw-hover" data-sigclear="1">Clear</button></div>';
  }

  function signup() {
    var p = price(), su = S.signup || {}, t = totals();
    var addr = su.address || (S.answers.zip && S.answers.zip !== "unsure" ? S.answers.zip : "");
    var planHtml = S.tier === "gold"
      ? '<div class="card"><strong>Gold: Paid in Full Annually, Up Front.</strong><p class="small muted" style="margin:0">' + money(p.gold) + ' a year.</p></div>'
      : '<div class="opts">' + [["quarterly", "4 Quarterly Payments", money(p.platinum / 4) + " each, " + money(p.platinum) + " a year"], ["annual", "Pay Annually, Up Front, Save 10% (Draft)", money(round(p.platinum * (1 - P.platinumAnnualDiscount))) + " a year"]].map(function (o) { var s = S.plan === o[0]; return '<button type="button" class="opt mw-hover' + (s ? " sel" : "") + '" data-plan="' + o[0] + '"><span class="chk">' + (s ? "&#10003;" : "") + '</span><span><strong>' + o[1] + '</strong><br><span class="small muted">' + o[2] + '</span></span></button>'; }).join("") + '</div>';
    return backBtn() + '<p class="eyebrow">Step 4 &middot; Sign Up</p><h1>Sign Up for ' + P.tiers[S.tier].label + '</h1>' +
      '<form id="suF" novalidate class="stack">' +
      '<div class="card"><h3>Your Details</h3><label class="fl" for="sAddr">Service Address</label><input id="sAddr" type="text" autocomplete="street-address" value="' + esc(addr) + '">' +
      '<div class="grid2"><div><label class="fl" for="sName">Full Name</label><input id="sName" type="text" autocomplete="name" value="' + esc(su.name || (S.visit && S.visit.name) || "") + '"></div>' +
      '<div><label class="fl" for="sPhone">Phone</label><input id="sPhone" type="tel" autocomplete="tel" value="' + esc(su.phone || (S.visit && S.visit.phone) || "") + '"></div></div>' +
      '<label class="fl" for="sEmail">Email</label><input id="sEmail" type="email" autocomplete="email" value="' + esc(su.email || (S.visit && S.visit.email) || "") + '"></div>' +
      '<div class="card"><h3>Membership Agreement</h3><div class="legal" tabindex="0">' + AGREEMENT + '</div>' +
      '<label class="checkrow"><input type="checkbox" id="agree"><span>I agree to the Membership Agreement.</span></label><p class="fl">Signature</p>' + sigBlock("agreeSig") + '</div>' +
      '<div class="card"><h3>Liability Waiver</h3><div class="legal" tabindex="0">' + WAIVER + '</div>' +
      '<label class="checkrow"><input type="checkbox" id="waive"><span>I have read and accept the Liability Waiver.</span></label><p class="fl">Signature</p>' + sigBlock("waiverSig") + '</div>' +
      '<div class="card"><h3>Payment Plan</h3>' + planHtml +
      '<div class="summary" style="margin-top:1rem"><div><span>Plan</span><span>' + P.tiers[S.tier].label + ' (' + P.tiers[S.tier].visits + ' visits a year)</span></div><div><span>Payment</span><span>' + t.label + '</span></div>' +
      (t.save ? '<div><span>Annual Discount (Draft)</span><span>&minus;' + money(t.save) + '</span></div>' : "") +
      '<div><span>Total per Year (Estimated)</span><span>' + money(t.year) + '</span></div><div><span>Due at Sign Up (Estimated)</span><span>' + money(t.today) + '</span></div></div></div>' +
      '<div class="card paybox"><h3>Payment</h3><div class="demo">Demo: Payment Processing Coming Soon (Secure Checkout via Stripe)</div><p class="small muted">No card is charged or stored. These fields are disabled.</p>' +
      '<fieldset disabled style="border:0;padding:0;margin:0"><label class="fl">Card Number</label><input type="text" placeholder="•••• •••• •••• ••••" autocomplete="off"><div class="grid2"><div><label class="fl">Expiry</label><input type="text" placeholder="MM / YY" autocomplete="off"></div><div><label class="fl">CVC</label><input type="text" placeholder="•••" autocomplete="off"></div></div></fieldset></div>' +
      '<div class="err" id="suErr" role="alert"></div><button class="btn btn-primary btn-big mw-hover" type="submit">Complete Sign Up (Demo)</button></form>';
  }

  function confirm() {
    var su = S.signup || {}, t = su.totals || totals();
    var next = S.visit ? "We'll confirm your free tech visit by text and email. The tech will log your equipment and confirm your final price." : S.photosComplete ? "We'll review your photos and confirm your final price within one business day." : "We'll reach out to collect a few photos or schedule a quick tech visit to confirm your final price.";
    return backBtn() + '<div class="check-big" aria-hidden="true">&#10003;</div><p class="eyebrow">You\'re In</p><h1>Welcome to Smart Upkeep' + (su.name ? ", " + esc(su.name.split(" ")[0]) : "") + '.</h1>' +
      '<div class="card"><h3>Summary</h3><div class="summary"><div><span>Membership</span><span>' + P.tiers[S.tier].label + '</span></div><div><span>Service Address</span><span>' + esc(su.address) + '</span></div><div><span>Payment</span><span>' + esc(t.label) + '</span></div><div><span>Per Year (Estimated)</span><span>' + money(t.year) + '</span></div><div><span>Due at Sign Up (Demo, Not Charged)</span><span>' + money(t.today) + '</span></div><div><span>Signed</span><span>Agreement and Waiver</span></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3>Next Steps</h3><ol class="feat"><li>' + next + '</li><li>We schedule your first seasonal visit.</li><li>You get a written report after every visit.</li></ol></div>' +
      '<div class="card" style="margin-top:1rem"><h3>&#128276; Recall Tracking Is On</h3><p style="margin:0">As we log your equipment, we watch for recalls and let you know right away.</p></div>' +
      '<div class="btn-row"><button class="btn btn-outline mw-hover" data-act="restart" type="button">Start Over</button></div>';
  }

  /* ---------- Events ---------- */
  function bind() {
    app.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { act(b.getAttribute("data-act")); }); });
    var s = S.screen;
    if (/^q\d$/.test(s)) bindQ(Number(s.slice(1)));
    if (s === "quote") app.querySelectorAll("[data-tier]").forEach(function (c) {
      function pick(e) { if (e && e.target.closest("[data-act]")) return; S.tier = c.getAttribute("data-tier"); save(); render(); }
      c.addEventListener("click", pick); c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
    if (s === "photos") app.querySelectorAll("[data-photo]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var id = inp.getAttribute("data-photo"); photoMem[id] = photoMem[id] || [];
        Array.prototype.forEach.call(inp.files || [], function (f) { if (/^image\//.test(f.type)) photoMem[id].push(URL.createObjectURL(f)); });
        S.photos[id] = photoMem[id].length; save(); render();
      });
    });
    if (s === "visit") bindVisit();
    if (s === "signup") bindSignup();
  }
  function act(a) {
    if (a === "back") return back();
    if (a === "start") return go("overview");
    if (a === "watch") return openVideo(true);
    if (a === "q0") return go("q0");
    if (a === "photos") return go("photos");
    if (a === "visit") return go("visit");
    if (a === "toQuote") return go("quote");
    if (a === "signup") { if (S.tier === "gold") S.plan = "annual"; return go("signup"); }
    if (a === "photosDone") { var c = photoCards(); S.photosComplete = c.every(function (x) { return (S.photos[x[0]] || 0) > 0; }); return go("quote"); }
    if (a === "restart") { S = fresh(); photoMem = {}; save(); render(); window.scrollTo(0, 0); }
  }
  function bindQ(i) {
    var q = Q[i], nextB = app.querySelector('[data-act="next"]');
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
    app.querySelectorAll("[data-single]").forEach(function (b) { b.addEventListener("click", function () { S.answers[q.id] = b.getAttribute("data-single"); if (q.type !== "wh") { save(); go(i + 1 < Q.length ? "q" + (i + 1) : "choice"); } else { save(); render(); } }); });
    app.querySelectorAll("[data-wh]").forEach(function (b) { b.addEventListener("click", function () { S.answers.whType = b.getAttribute("data-wh"); save(); render(); }); });
    app.querySelectorAll("[data-multi]").forEach(function (b) { b.addEventListener("click", function () {
      var k = b.getAttribute("data-multi"), cur = Array.isArray(S.answers[q.id]) ? S.answers[q.id] : [];
      if (k === "none") S.answers[q.id] = "none"; else { var ix = cur.indexOf(k); if (ix > -1) cur.splice(ix, 1); else cur.push(k); S.answers[q.id] = cur.length ? cur : undefined; }
      save(); render(); }); });
    var u = app.querySelector("[data-unsure]");
    if (u) u.addEventListener("click", function () {
      S.answers[q.id] = "unsure"; if (q.type === "wh" && !S.answers.whType) S.answers.whType = "unsure";
      if (zip) zip.value = "";
      save(); if (q.type === "zip" || q.type === "multi" || q.type === "wh") render(); else go(i + 1 < Q.length ? "q" + (i + 1) : "choice");
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
    function keepFields() { S.signup = Object.assign({}, S.signup, { address: val("sAddr"), name: val("sName"), phone: val("sPhone"), email: val("sEmail") }); }
    ["sAddr", "sName", "sPhone", "sEmail"].forEach(function (id) { document.getElementById(id).addEventListener("change", function () { keepFields(); save(); }); });
    document.getElementById("suF").addEventListener("submit", function (e) {
      e.preventDefault(); keepFields();
      var s = S.signup, err = s.address.length < 5 ? "Enter your service address." : !s.name ? "Enter your full name." : !/^\S+@\S+\.\S+$/.test(s.email) ? "Enter a valid email." : !/\d{3}.*\d{3}.*\d{4}/.test(s.phone) ? "Enter a valid phone number." :
        !document.getElementById("agree").checked ? "Please check I agree on the Membership Agreement." : !sigs.agreeSig.valid() ? "Please sign the Membership Agreement." :
        !document.getElementById("waive").checked ? "Please accept the Liability Waiver." : !sigs.waiverSig.valid() ? "Please sign the Liability Waiver." : "";
      var box = document.getElementById("suErr"); box.textContent = err;
      if (err) { box.scrollIntoView({ block: "center" }); return; }
      s.agreementSignature = sigs.agreeSig.value(); s.waiverSignature = sigs.waiverSig.value(); s.signedAt = new Date().toISOString(); s.tier = S.tier; s.totals = totals();
      go("confirm");
    });
  }

  /* ---------- Video modal ---------- */
  var modal = document.getElementById("videoModal"), vid = document.getElementById("explainer"), unmute = document.getElementById("unmuteBtn");
  function vSrc() { return window.matchMedia("(max-width: 600px), (orientation: portrait) and (max-width: 900px)").matches ? "video/explainer-9x16.mp4" : "video/explainer-16x9.mp4"; }
  function openVideo(userAsked) {
    var src = vSrc();
    if (vid.getAttribute("src") !== src) { vid.setAttribute("src", src); vid.setAttribute("poster", src.indexOf("9x16") > -1 ? "assets/poster-9x16.jpg" : "assets/poster-16x9.jpg"); }
    vid.muted = !userAsked; unmute.textContent = vid.muted ? "Unmute" : "Mute";
    modal.querySelector(".modal-inner").classList.toggle("portrait", src.indexOf("9x16") > -1);
    modal.hidden = false; document.body.style.overflow = "hidden";
    try { vid.currentTime = 0; } catch (e) {}
    var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { vid.muted = true; unmute.textContent = "Unmute"; vid.play().catch(function () {}); });
    document.getElementById("skipBtn").focus({ preventScroll: true });
  }
  function closeVideo() { vid.pause(); modal.hidden = true; document.body.style.overflow = ""; try { localStorage.setItem(VKEY, "1"); } catch (e) {} }
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
    if (S.screen === "quote" || S.screen === "signup" || S.screen === "confirm") text += " My estimate: Gold " + money(p.gold) + "/yr, Platinum " + money(p.platinum) + "/yr.";
    function copy() {
      var done = function () { msg.textContent = "Link Copied"; setTimeout(function () { msg.textContent = ""; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + " " + url).then(done, fallbackCopy); else fallbackCopy();
      function fallbackCopy() { var t = document.createElement("textarea"); t.value = text + " " + url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) { msg.textContent = url; } t.remove(); }
    }
    if (navigator.share) { navigator.share({ title: "Smart Upkeep", text: text, url: url }).catch(function (e) { if (e && e.name !== "AbortError") copy(); }); return; }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { location.href = "sms:?&body=" + encodeURIComponent(text + " " + url); setTimeout(copy, 600); return; }
    copy();
  });
  document.getElementById("logoHome").addEventListener("click", function (e) { e.preventDefault(); if (S.screen !== "home") go("home"); });

  render();
  var dismissed = false; try { dismissed = localStorage.getItem(VKEY) === "1"; } catch (e) {}
  if (!dismissed && S.screen === "home") openVideo(false);
})();
