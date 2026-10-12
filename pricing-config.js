/* Smart Upkeep tier pricing. DRAFT, pending Max's approval. Annual USD.
   Recalibrated from the metro Detroit pricing research (pricing-48322):
   price = visits + per-system services at market midpoints, not multipliers.
   Targets for 3,500-5,000 sq ft homes: Gold ~$2,600-$4,100, Platinum ~$4,400-$7,300. */
window.SMART_UPKEEP_PRICING = {
  status: "Prototype, Draft Pricing",
  roundTo: 10,
  // Visit pricing scales gently with home size
  seasonalVisit: { base: 275, perSqft: 0.02 },   // 4 seasonal visits (both tiers)
  checkInVisit:  { base: 175, perSqft: 0.01 },   // 8 extra monthly check-ins (Platinum)
  perUnit: { furnace: 145, ac: 140, tankWaterHeater: 110, tanklessWaterHeater: 250 },
  dryerVent: 135,                                // one per home, assumed
  gutters2Cleanings: { 1: 360, 2: 540, 3: 720 }, // by stories
  extras: {        // gold = included in both, platinumOnly = Platinum only
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
  tiers: {
    gold: { label: "Gold", tagline: "Quarterly Care", visits: 4, recommended: true,
      features: ["4 seasonal visits a year (one per quarter)", "Fall furnace tune-up for every furnace", "Spring AC tune-up for every AC unit", "Water heater flush or tankless descale", "Gutter and downspout cleaning, spring and fall", "Dryer vent cleaning", "Smoke, CO, GFCI and shut-off valve checks", "Garage door lube and pre-winter weatherproofing", "Your selected extras serviced (irrigation start-up and blowout, fireplace, sump, softener)", "Recall Monitoring on your equipment", "Written report after every visit"] },
    platinum: { label: "Platinum", tagline: "Monthly Care", visits: 12,
      features: ["Everything in Gold", "12 visits a year (monthly check-ins)", "Yearly roof and flashing inspection", "Standby generator service (if you have one)", "Winter vent clearing and ice dam watch", "Pre-travel and post-storm home checks", "Fridge filters, coils and small fixes during visits", "Recall Monitoring on your equipment", "Written report after every visit"] }
  },
  /* A la carte add-ons (not already included in Gold/Platinum). Midpoints from pricing-48322 market ranges. Draft. */
  addons: [
    { id: "windows", label: "Exterior Window Washing", desc: "Outside glass, typically once or twice a year.", low: 150, high: 302, unit: "yr", annual: 225 },
    { id: "carpet", label: "Carpet Cleaning", desc: "Whole-home carpet clean, once a year.", low: 400, high: 1800, unit: "service", annual: 600 },
    { id: "pool", label: "Pool Opening and Closing", desc: "Spring open and fall close for your pool.", low: 1100, high: 1100, unit: "yr", annual: 1100, note: "$550 each (open + close)" },
    { id: "snow", label: "Snow Removal (Season)", desc: "Coordinated plowing for the winter season.", low: 1595, high: 1995, unit: "season", annual: 1795 },
    { id: "pressure", label: "Pressure Washing", desc: "House, driveway or patio wash as needed.", low: 100, high: 720, unit: "service", annual: 310 },
    { id: "deck", label: "Deck Sealing or Staining", desc: "Protect and refresh your deck every few years.", low: 550, high: 1250, unit: "service", annual: 900 },
    { id: "chimney", label: "Chimney Sweep", desc: "Wood-burning chimney cleaning and Level 1 check.", low: 129, high: 381, unit: "service", annual: 255 },
    { id: "ducts", label: "Air Duct Cleaning", desc: "Full duct clean, usually every few years.", low: 271, high: 509, unit: "service", annual: 390 },
    { id: "lights", label: "Holiday Lights", desc: "Install in fall and take down after the holidays.", low: 220, high: 684, unit: "season", annual: 450 },
    { id: "radon", label: "Radon Test", desc: "Professional radon test for your home.", low: 50, high: 150, unit: "service", annual: 100 },
    { id: "handyman", label: "Extra Handyman Hours", desc: "8 hours of extra handyman time during the year.", low: 600, high: 1000, unit: "yr", annual: 800, note: "$75–$125/hr" },
    { id: "pest", label: "Pest Control (Quarterly)", desc: "Four quarterly visits through a coordinated partner.", low: 400, high: 1200, unit: "yr", annual: 800 },
    { id: "guttersExtra", label: "Extra Gutter Cleaning", desc: "One more cleaning when trees drop heavy debris.", low: 180, high: 360, unit: "service", annual: 270 },
    { id: "backflow", label: "Irrigation Backflow Test", desc: "Yearly backflow preventer test where required.", low: 85, high: 100, unit: "service", annual: 90 }
  ]
};
