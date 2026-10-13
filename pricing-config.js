/* Smart Upkeep tier pricing. DRAFT, pending Max's approval. Annual USD.
   Recalibrated from the metro Detroit pricing research (pricing-48322):
   price = visits + per-system services at market midpoints, not multipliers.
   Silver targets (pre-floor): ~$700–$900 (1.2–2k sq ft), ~$800–$1,100 (2–3k),
   ~$900–$1,300 (3.5–5k). Hard floor: every membership >= $99/mo ($1,188/yr). */
window.SMART_UPKEEP_PRICING = {
  /* Pre-launch password gate. At launch: set enabled to false (or remove gate.js script tag). */
  prelaunchGate: {
    enabled: true,
    passwordSha256: "6df85d68da9f1f949bc43346a2d84643736b955194f25738fd74100ae1874523",
    storageKey: "smartUpkeep.gateUnlocked"
  },
  /* Retention offer (draft): shown on cancel or renewal. 6+ months a member: 1 month free to stay. 1+ year: 2 months free. */
  retention: [{ minMonths: 12, freeMonths: 2 }, { minMonths: 6, freeMonths: 1 }],
  /* Welcome offers (draft). At launch keep or tune; free months have $0 refund value. */
  welcomeOffers: {
    twoYear: {
      id: "twoYear",
      label: "Pay for 2 Years, Get 6 Months Free",
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
  minMonthly: 99,                              // Max: no subscription under $99/mo
  minAnnual: 1188,                             // 99 * 12
  // Visit pricing scales gently with home size
  silverVisit:   { base: 150, perSqft: 0.02 }, // 2 seasonal visits (Silver)
  seasonalVisit: { base: 275, perSqft: 0.02 }, // 4 seasonal visits (Gold+)
  checkInVisit:  { base: 175, perSqft: 0.01 }, // 8 extra monthly check-ins (Platinum)
  perUnit: { furnace: 145, ac: 140, tankWaterHeater: 110, tanklessWaterHeater: 250 },
  dryerVent: 135,                                // one per home, assumed
  gutters2Cleanings: { 1: 360, 2: 540, 3: 720 }, // by stories (Gold+)
  extras: {        // gold = included in Gold/Platinum, platinumOnly = Platinum only
    irrigation:  { label: "Irrigation System", gold: 180 },
    sump:        { label: "Sump Pump", gold: 60 },
    fireplace:   { label: "Gas Fireplace", gold: 150 },
    generator:   { label: "Standby Generator", platinumOnly: 450 },
    pool:        { label: "Pool or Hot Tub", gold: 0, note: "Checked during visits; opening and closing quoted separately" },
    humidifier:  { label: "Whole-House Humidifier or Water Softener", gold: 60 }
  },
  platinumRoofInspection: 250,
  platinumAnnualDiscount: 0.10, // DRAFT
  unsureDefaults: { sqft: 4000, furnaces: 2, acs: 2, waterHeaters: 1, whType: "tank", stories: 2 },
  /* Plans shown, in order. Remove a key (e.g. "platinum") to show 2 tiers; layouts adapt. */
  /* Final pop-up offer shown once, right before sign-up Submit (beta test).
     strategy: "roundRobin" (index kept in localStorage) or "random". Items already in the cart are skipped. */
  finalOffer: { enabled: true, strategy: "roundRobin", storageKey: "smartUpkeep.finalOfferIdx",
    candidates: ["windows", "chimney", "radon", "guttersExtra", "pressure", "ducts"] },
  tierOrder: ["silver", "gold", "platinum"],
  /* fromMonthly = home-page "From $X/Mo" per tier. Computed by running app.js buildLines/tierAmt/monthlyOf
     against this config for the smallest quote the flow allows: Under 2,000 sq ft (1500), 1 furnace, 1 AC,
     1 tank water heater, 1 story, no extras. Annual totals: Silver 890 -> floored to 1188, Gold 2110,
     Platinum 3880 (roundTo 10). Recompute if any pricing input above changes. */
  tiers: {
    silver: { fromMonthly: 99, label: "Silver", tagline: "Seasonal Care", visits: 2, recommended: true,
      keyPoints: ["2 Visits a Year", "Furnace + AC Tune-Ups", "Moisture Scan"],
      features: ["2 seasonal visits a year (spring and fall)", "Fall furnace tune-up for every furnace", "Spring AC tune-up for every AC unit", "Filter changes during visits", "Water heater flush or tankless descale", "Dryer vent cleaning", "Smoke and CO detector checks", "Whole-Home Moisture Scan: pinless moisture meter and thermal camera check ceilings under bathrooms, windows, basement walls and under sinks; readings and photos saved to your Home Record, hot spots flagged", "Recall Monitoring on your equipment", "Written report after every visit", "Maintenance Proof Pack: downloadable visit record for warranty claims", "Home Record Transfers When You Sell", "Selling? Gift the Buyers 3 Months Free"] },
    gold: { fromMonthly: 176, label: "Gold", tagline: "Quarterly Care", visits: 4,
      keyPoints: ["Everything in Silver", "4 Visits a Year", "Gutter Cleaning"],
      features: ["Everything in Silver", "4 seasonal visits a year (one per quarter)", "Gutter and downspout cleaning, spring and fall", "Smoke, CO, GFCI and shut-off valve checks", "Garage door lube and pre-winter weatherproofing", "Your selected extras serviced (irrigation start-up and blowout, fireplace, sump, softener)", "Whole-Home Moisture Scan: pinless moisture meter and thermal camera check ceilings under bathrooms, windows, basement walls and under sinks; readings and photos saved to your Home Record, hot spots flagged", "Recall Monitoring on your equipment", "Written report after every visit", "Maintenance Proof Pack: downloadable visit record for warranty claims", "Home Record Transfers When You Sell", "Selling? Gift the Buyers 3 Months Free"] },
    platinum: { fromMonthly: 323, label: "Platinum", tagline: "Monthly Care", visits: 12,
      keyPoints: ["Everything in Gold", "Monthly Visits", "Roof Inspection"],
      features: ["Everything in Gold", "12 visits a year (monthly check-ins)", "Yearly roof and flashing inspection", "Standby generator service (if you have one)", "Winter vent clearing and ice dam watch", "Pre-travel and post-storm home checks", "Fridge filters, coils and small fixes during visits", "Whole-Home Moisture Scan: pinless moisture meter and thermal camera check ceilings under bathrooms, windows, basement walls and under sinks; readings and photos saved to your Home Record, hot spots flagged", "Recall Monitoring on your equipment", "Written report after every visit", "Maintenance Proof Pack: downloadable visit record for warranty claims", "Home Record Transfers When You Sell", "Selling? Gift the Buyers 3 Months Free"] }
  },
  /* A la carte add-ons / one-off services. Midpoints from pricing-48322. Draft. */
  addons: [
    { id: "windows", label: "Exterior Window Washing", desc: "Outside glass, typically once or twice a year.", low: 150, high: 302, unit: "service", annual: 225 },
    { id: "carpet", label: "Carpet Cleaning", desc: "Whole-home carpet clean, once a year.", low: 400, high: 1800, unit: "service", annual: 600 },
    { id: "pool", label: "Pool Opening and Closing", desc: "Spring open and fall close for your pool.", low: 1100, high: 1100, unit: "service", annual: 1100, note: "$550 each (open + close)" },
    { id: "snow", label: "Snow Removal (Season)", desc: "Coordinated plowing for the winter season.", low: 1595, high: 1995, unit: "season", annual: 1795 },
    { id: "pressure", label: "Pressure Washing", desc: "House, driveway or patio wash as needed.", low: 100, high: 720, unit: "service", annual: 310 },
    { id: "deck", label: "Deck Sealing or Staining", desc: "Protect and refresh your deck every few years.", low: 550, high: 1250, unit: "service", annual: 900 },
    { id: "chimney", label: "Chimney Sweep", desc: "Wood-burning chimney cleaning and Level 1 check.", low: 129, high: 381, unit: "service", annual: 255 },
    { id: "ducts", label: "Air Duct Cleaning", desc: "Full duct clean, usually every few years.", low: 271, high: 509, unit: "service", annual: 390 },
    { id: "lights", label: "Holiday Lights", desc: "Install in fall and take down after the holidays.", low: 220, high: 684, unit: "season", annual: 450 },
    { id: "radon", label: "Radon Test", desc: "Professional radon test for your home.", low: 50, high: 150, unit: "service", annual: 100 },
    { id: "handyman", label: "Extra Handyman Hours", desc: "8 hours of extra handyman time during the year.", low: 600, high: 1000, unit: "service", annual: 800, note: "$75–$125/hr" },
    { id: "pest", label: "Pest Control (Quarterly)", desc: "Four quarterly visits through a coordinated partner.", low: 400, high: 1200, unit: "service", annual: 800 },
    { id: "guttersExtra", label: "Extra Gutter Cleaning", desc: "One more cleaning when trees drop heavy debris.", low: 180, high: 360, unit: "service", annual: 270 },
    { id: "backflow", label: "Irrigation Backflow Test", desc: "Yearly backflow preventer test where required.", low: 85, high: 100, unit: "service", annual: 90 }
  ],
  /* Last-minute extras tacked onto an upcoming visit. Flat one-time prices (draft).
     Chosen to complement (not duplicate) the seasonal add-on menu: interior glass,
     screens, bulbs, caulk, hanging, small wash, assembly, detector batteries. */
  lastMinute: [
    { id: "lmInteriorWindows", label: "Interior Window Washing", desc: "Inside glass on an upcoming visit. Pairs with exterior washing if you need both.", price: 175 },
    { id: "lmScreens", label: "Window Screen Cleaning", desc: "Remove, wash and rehang screens while we are on site.", price: 85 },
    { id: "lmBulbs", label: "High Fixture Light Bulb Swap", desc: "Replace up to 6 hard-to-reach bulbs. Common bulbs included; specialty bulbs at cost.", price: 95 },
    { id: "lmCaulk", label: "Caulk Touch-Ups", desc: "Up to one hour of sink, tub or window caulk touch-ups.", price: 125 },
    { id: "lmHang", label: "Picture or TV Hanging", desc: "Hang up to 2 pictures or one TV. Mounting hardware at cost if needed.", price: 150 },
    { id: "lmSmallWash", label: "Small Patio Pressure Wash", desc: "Entry, patio or walkway wash — not a full-house wash.", price: 175 },
    { id: "lmAssemble", label: "Furniture Assembly", desc: "Assemble one furniture item during a visit.", price: 120 },
    { id: "lmBatteries", label: "Smoke and CO Battery Swap", desc: "Replace batteries in all smoke and CO detectors. Batteries included.", price: 65 }
  ]
};
