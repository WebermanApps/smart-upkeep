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
  }
};
