/* Smart Upkeep tier pricing. DRAFT, pending Max's approval. Annual USD.
   Recalibrated from the metro Detroit pricing research (pricing-48322):
   price = visits + per-system services at market midpoints, not multipliers.
   Silver targets (pre-floor): ~$700–$900 (1.2–2k sq ft), ~$800–$1,100 (2–3k),
   ~$900–$1,300 (3.5–5k). Hard floor: every membership >= $139/mo ($1,668/yr).
   Nov 2 2026 (Machan approved): plan prices raised. Essentials from $129/mo, Plus from $209/mo, Complete from $399/mo.
   Nov 5 2026 (Machan locked): Essentials from $139/mo, Plus from $209/mo, Complete from $379/mo.
   Every per-service input below scaled by about 1.27, and each tier has its own minimum (tierMinAnnual). */
window.SMART_UPKEEP_PRICING = {
  /* Pre-launch password gate. At launch: set enabled to false (or remove gate.js script tag). */
  prelaunchGate: {
    enabled: true,
    passwordSha256Labels: { "bcb9dae6ea88dbf28c262998e6661ec60f32a760faa5aef96745b39c38dbf235": "u2", "6df85d68da9f1f949bc43346a2d84643736b955194f25738fd74100ae1874523": "u10", "84983c60f7daadc1cb8698621f802c0d9f9a3c3c295c810748fb048115c186ec": "guest" },  /* SHA-256 (lowercased, trimmed) -> label; unlock logged once per session via MWSubmit to upkeep */
    storageKey: "smartUpkeep.gateUnlocked"
  },
  /* Retention offer (draft): shown on cancel or renewal. 6+ months a member: 1 month free to stay. 1+ year: 2 months free. */
  retention: [{ minMonths: 12, freeMonths: 2 }, { minMonths: 6, freeMonths: 1 }],
  /* Welcome offers (draft). At launch keep or tune; free months have $0 refund value. */
  welcomeOffers: {
    twoYear: {
      id: "twoYear",
      label: "Pay for 2 Years, Get 6 Extra Months Free at the End of Your Term",  /* free months added AFTER the 24 paid months; no "effective" monthly shown */
      payMonths: 24,
      getMonths: 30,
      freeMonths: 6
    },
    referral: {
      id: "referral",
      label: "Refer a Neighbor, You Both Get a Month Free",
      freeMonthsEach: 1,
      uncapped: true,
      creditWhen: "after_referred_first_payment_clears"
    }
  },
  status: "Prototype, Draft Pricing",
  roundTo: 10,
  minMonthly: 139,                             // Nov 5 2026 lock: no subscription under $139/mo (was $129)
  minAnnual: 1668,                             // 139 * 12
  tierMinAnnual: { silver: 1668, gold: 2508, platinum: 4548 }, // $139 / $209 / $379 per month minimums (Nov 5 2026 lock)
  // Visit pricing scales gently with home size
  silverVisit:   { base: 185, perSqft: 0.03 }, // 2 seasonal visits (Silver)
  seasonalVisit: { base: 342, perSqft: 0.03 }, // 4 seasonal visits (Gold+)
  checkInVisit:  { base: 214, perSqft: 0.02 }, // 8 extra monthly check-ins (Platinum)
  perUnit: { furnace: 184, ac: 178, tankWaterHeater: 140, tanklessWaterHeater: 318 },
  dryerVent: 171,                                // one per home, assumed
  gutters2Cleanings: { 1: 457, 2: 686, 3: 914 }, // by stories (Gold+)
  /* Systems the member owns. Plan Services deck (Nov 2 2026): servicing them is an extra. If picked, it is added to ANY plan
     at the yearly price below (higher monthly price); the member can remove it on the Accept step. Draft prices unchanged. */
  extras: {        // Nov 5 2026: Standby Generator and Gas Fireplace moved to a la carte (no longer plan extras questions). all = added to every plan when the member has it
    irrigation:  { label: "Irrigation System", all: 229 },
    sump:        { label: "Sump Pump", all: 76 },
    pool:        { label: "Pool or Hot Tub", gold: 0, note: "Checked during visits" },
    humidifier:  { label: "Whole-House Humidifier", all: 76 },
    softener:    { label: "Water Softener", gold: 0, note: "Salt top-off and service check included on Plus and up" } /* Funnel Deck Oct 14: softener is one tile in Extras, not its own screen */
  },
  platinumRoofInspection: 318,
  platinumAnnualDiscount: 0.10, // DRAFT — unused in the funnel; do not apply alongside annualDiscount (never stack)
  annualDiscount: 0.10, // Full-price annual after Founding 50: 12 x monthly quote less 10%, Machan Nov 12 2026
  unsureDefaults: { sqft: 4000, furnaces: 2, acs: 2, waterHeaters: 1, whType: "tank", stories: 2 },
  /* Plans shown, in order. Remove a key (e.g. "platinum") to show 2 tiers; layouts adapt. */
  /* Final pop-up offer shown once, right before sign-up Submit (beta test).
     strategy: "roundRobin" (index kept in localStorage) or "random". Items already in the cart are skipped. */
  finalOffer: { enabled: false, /* Order Form Details Deck 03/07 (Max 19:33 ICT Oct 15): pop-up dropped for an Add Extras row */ strategy: "roundRobin", storageKey: "smartUpkeep.finalOfferIdx",
    candidates: ["chimney", "radon", "guttersExtra", "ducts"] },
  /* Home hero teaser loop (muted, autoplay, loop, inline). Tap opens the full explainer with sound.
     Built with ffmpeg from video/explainer-16x9.mp4 (V.1): 7.9s, 640x360 H.264, no audio, faststart.
     To swap to V.2 later, change these two paths only. */
  /* V7 (official = V6.2, Max 10:49 ICT Oct 16): first 8s of the 50.5s V7 cut, 640x360 (9:16 teaser 720x1280), no audio. Rollback to V6: swap v7 -> v6 and ?v=v7a -> ?v=v6a in the four paths below (V6 files kept). */
  /* V6 (was official, Max OK 20:30 ICT Oct 15): first 8s of the 48s V6 cut, 640x360 (9:16 teaser 720x1280), no audio. Rollback to V5: swap v6 -> v5 in the four paths below (V5 files kept). */
  /* V5 (official, Oct 15): first 8s of the 48s cut, 640x360, no audio. Rollback to V4: video/teaser-v4-16x9.mp4 + assets/teaser-v4-poster.jpg */
  teaser: { src: "video/teaser-v7-16x9.mp4?v=v7a", poster: "assets/teaser-v7-poster.jpg?v=v7a", srcV: "video/teaser-v7-9x16.mp4?v=v7a", posterV: "assets/teaser-v7-9x16-poster.jpg?v=v7a" }, /* Oct 15: 9:16 teaser on phones/portrait (<=768px or portrait), 16:9 on big screens */
  tierOrder: ["silver", "gold", "platinum"],
  /* fromMonthly = home-page "From $X/Mo" per tier. Computed by running app.js buildLines/tierAmt/monthlyOf
     against this config for the smallest quote the flow allows: Under 2,000 sq ft (1500), 1 furnace, 0 AC (None),
     1 tank water heater, 1 story, no extras. Annual totals (Nov 2 2026 inputs): Essentials 955 -> floored to 1668, Plus 2500 -> floored to 2508,
     Complete 4770, above the 4548 floor (roundTo 10). Nov 5 2026: fromMonthly LOCKED by Machan at 139 / 209 / 379; keep these unless Machan changes them. */
  tiers: {
    /* Plan Services deck (Machan, Nov 2 2026). Plans differ mainly by visit frequency. Drone roof frequency per plan is a DEFAULT, not decided yet:
       Essentials once a year, Plus twice a year, Complete after storms too. */
    silver: { fromMonthly: 139, label: "Essentials", tagline: "Seasonal Care", visits: 2,
      /* Machan Nov 13 7:35-7:37 PM ICT: Essentials tile lines, his order and wording (gutter cleaning and fridge filters moved into Essentials, prices unchanged). */
      keyPoints: ["Furnace/AC Tune-Up", "Water Heater Flush/Descale", "Appliance Filter Cleaning/Changes", "Gutter Cleaning", "Mold And Moisture Scan", "Roof Inspections", "Dryer Vent Cleaning", "Sump Pump Test", "And More"],
      keyPointsOnCard: true,
      features: ["2 seasonal visits a year (spring and fall)", "Roof Drone Inspection once a year: shingles, flashing, vents and the chimney cap and crown checked from the air by drone. Nobody walks on your roof", "Fall furnace tune-up for every furnace", "Spring AC tune-up for every AC unit", "Furnace filter changes during visits", "Water Heater Flush/Descale", "Dryer vent cleaning", "Gutter and downspout cleaning, spring and fall", "Fridge water filter changes during visits", "Smoke and CO detector checks and battery swap", "Drone Gutter Check: a drone flight spots clogged or sagging gutters and downspouts, no ladder needed", "Drone Roof Photos To Home Record: dated roof photos from each drone flight, saved to track wear", "Whole-Home Mold and Moisture Scan: pinless moisture meter and thermal camera check ceilings under bathrooms, windows, basement walls and under sinks; readings and photos saved to your Home Record, damp spots where mold can grow flagged (not a lab mold test)", "Winter Freeze Prep: hose bibs, crawlspace vents and exposed pipes checked before the first hard freeze; outdoor faucets shut off and drained", "Pipe Insulation Check on your first visit (repairs are a paid extra)", "Thermostat battery and settings check", "Sump pump test before spring thaw", "Main water shut-off found, tested and tagged", "Washing machine hose check", "Toilet leak dye test", "Caulk check at tubs and sinks", "Range hood filter clean", "Fridge coil cleaning", "Basement window well check", "Grading and downspout check", "Humidifier pad swap and service", "Dehumidifier check", "Attic insulation check", "Seasonal home checklist email before each season", "Annual Home Health Score built from your Home Record", "Vetted Contractor Network: every contractor licensed, certified and insured", "Recall Monitoring on your equipment", "Warranties Checked badge on your Home Record", "Written report after every visit", "Downloadable Visit Record: every visit kept in a downloadable record with dates, photos and work done", "Home Record Transfers When You Sell", "Selling? Gift the Buyers 3 Months Free"] },
    gold: { fromMonthly: 209, label: "Plus", tagline: "Quarterly Care", visits: 4, recommended: true,
      keyPoints: ["Everything in Essentials, Plus:", "4 Seasonal Visits A Year", "Roof Drone Inspection Twice A Year", "Garage Door Tune-Up", "Salt in Water Softener", "And More"],
      keyPointsOnCard: true,
      features: ["Everything in Essentials", "4 seasonal visits a year (one per quarter)", "Roof Drone Inspection twice a year: shingles, flashing, vents and the chimney cap and crown checked from the air by drone. Nobody walks on your roof", "Gutter and downspout cleaning, spring and fall", "Garage door tune-up", "Water softener salt top-off during visits", "Fridge water filter changes during visits"] },
    platinum: { fromMonthly: 379, label: "Complete", tagline: "Monthly Care", visits: 12,
      keyPoints: ["Everything in Plus, and:", "Monthly Visits", "Storm Checks After Major Storms", "Vent and Ice Dam Clearing After Storms", "And More"],
      keyPointsOnCard: true,
      features: ["Everything in Plus", "12 visits a year (monthly check-ins)", "Roof Drone Inspection twice a year and after major storms: shingles, flashing, vents and the chimney cap and crown checked from the air by drone. Nobody walks on your roof", "Storm checks after major storms", "Vent and ice dam clearing after storms"] }
  },
  /* A la carte add-ons / one-off services. Midpoints from pricing-48322. Draft. */
  /* Add Extras row on the sign-up form shows these first (Max's note, deck card 11: offer the ones members are likeliest to add).
     Picks: yearly seasonal jobs most homes can use that pair with visits. Tune from the add-on event log once real data exists. */
  likelyAddons: ["guttersExtra", "chimney"],
  /* Removed Nov 2 2026 (Plan Services deck): Carpet Cleaning, Deck Sealing, Furniture Assembly, TV/Picture Hanging; Smoke/CO Battery Swap and Range Hood Filter now in every plan. Removed Oct 17 (Max): Pool Opening/Closing, Snow Removal, Extra Handyman Hours, Pest Control, Irrigation Backflow Test. */
  addons: [
    { id: "chimney", label: "Chimney Sweep", desc: "Wood-burning chimney cleaning and Level 1 check. Quote required — we will follow up.", quoteRequired: true, low: 129, high: 381, unit: "service", annual: 255 },
    { id: "ducts", label: "Air Duct Cleaning", desc: "Full duct clean, usually every few years. Quote required — we will follow up.", quoteRequired: true, low: 271, high: 509, unit: "service", annual: 390 },
    { id: "generatorTune", label: "Generator Annual Service", desc: "Yearly tune-up / service for a standby generator. Quote required — we will follow up.", quoteRequired: true, low: 200, high: 400, unit: "service", annual: 275 },
    { id: "radon", label: "Radon Test", desc: "Professional radon test for your home.", low: 50, high: 150, unit: "service", annual: 100 },
    { id: "guttersExtra", label: "Extra Gutter Cleaning", desc: "One more cleaning when trees drop heavy debris.", low: 180, high: 360, unit: "service", annual: 270 },
  ],
  /* Last-minute extras tacked onto an upcoming visit. Flat one-time prices (draft).
     Chosen to complement (not duplicate) the seasonal add-on menu: interior glass,
     screens, bulbs, caulk, hanging, small wash, assembly, detector batteries. */
  lastMinute: [
    { id: "lmCaulk", label: "Caulk Touch-Ups", desc: "Up to one hour of sink, tub or window caulk touch-ups. Quote required — we will follow up.", quoteRequired: true, price: 125 },
    /* Added Oct 18 (Max, Extras Ideas deck: 01 both, 05B, 06B, 07A). One-time prices are the example prices shown on the deck cards. Draft. home: also listed in the home Shop À La Carte list. */
    { id: "lmLeakSensors", label: "Water Leak Sensor Setup", desc: "Leak sensors under sinks, by the water heater and washer, linked to your phone.", price: 149, home: true },
    { id: "lmSumpBackup", label: "Sump Pump Battery Backup", desc: "A battery backup pump that keeps the basement dry when the power goes out.", price: 650, home: true },
    { id: "lmBathFan", label: "Bath Fan Clean And Check", desc: "Clean bathroom exhaust fans and check they vent outside.", price: 95, home: true },
    { id: "lmThermostat", label: "Smart Thermostat Install", desc: "Install and set up a smart thermostat you buy or we bring.", price: 175, home: true },
    /* Plan Services deck (Machan, Nov 2 2026): new extras. Prices are DRAFT estimates in line with the existing extras. */
    { id: "lmWeather", label: "Weatherproofing Refresh", desc: "Weatherstripping and door sweeps checked and replaced where worn. Parts included.", price: 145, home: true, draft: true },
    { id: "lmPipeInsul", label: "Pipe Insulation Repair", desc: "Patch or replace foam pipe insulation in garages, crawlspaces and outside walls.", price: 95, home: true, draft: true },
    { id: "lmPanelLabels", label: "Electrical Panel Label Check", desc: "Make sure every breaker is labeled and note anything that looks unsafe.", price: 85, home: true, draft: true },
    { id: "lmExtinguisher", label: "Fire Extinguisher Check", desc: "Check gauge and date on each extinguisher and flag ones to replace.", price: 45, home: true, draft: true },
    { id: "lmFrozenPipe", label: "Frozen Pipe Rescue", desc: "Fast response and thaw help if a pipe freezes.", price: 225, home: true, draft: true },
    { id: "lmMower", label: "Lawn Mower Winterizing", desc: "Drain fuel, sharpen the blade and store the mower for winter.", price: 95, home: true, draft: true },
    { id: "lmSnowblower", label: "Snowblower Tune-Up", desc: "Oil, plug and a test start before the first snow.", price: 135, home: true, draft: true },
    { id: "lmBibCovers", label: "Hose Bib Freeze Covers", desc: "Frost covers installed on your outdoor faucets for winter. Covers included.", price: 45, home: true, draft: true },
    { id: "lmSurge", label: "Whole-House Surge Protector", desc: "A surge protector installed at the panel by a licensed electrician from our network.", price: 395, home: true, draft: true },
    { id: "lmSmartLock", label: "Smart Lock Install", desc: "Install and set up a keypad or smart lock you buy or we bring.", price: 150, home: true, draft: true },
    { id: "lmDoorbell", label: "Video Doorbell Install", desc: "Mount and set up a video doorbell.", price: 150, home: true, draft: true },
    { id: "lmMesh", label: "Wi-Fi Mesh Setup", desc: "Set up mesh Wi-Fi so every room gets signal.", price: 125, home: true, draft: true },
    { id: "lmCameras", label: "Security Camera Setup", desc: "Mount and set up up to 2 outdoor cameras.", price: 225, home: true, draft: true },
    { id: "lmWaterShutoff", label: "Smart Water Shut-Off Valve", desc: "An auto shut-off that closes the main when it senses a leak. Installed by a licensed plumber from our network.", price: 695, home: true, draft: true },
    { id: "lmApplianceClean", label: "Appliance Deep Clean", desc: "Oven, fridge and dishwasher cleaned inside.", price: 195, home: true, draft: true },
    { id: "lmPatio", label: "Seasonal Patio Furniture Setup", desc: "Put out patio furniture in spring and store it in fall.", price: 110, home: true, draft: true },
    { id: "lmLeadTest", label: "Lead And Water Test", desc: "Tap water tested for lead, useful in older Detroit homes.", price: 95, home: true, draft: true },
    { id: "lmHumInstall", label: "Whole-House Humidifier Install", desc: "A whole-house humidifier added to your furnace.", price: 650, home: true, draft: true }
  ]
};
