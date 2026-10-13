/* DRAFT lawn mowing pricing, pending Max's approval. Per cut, USD, by mowable turf sq ft.
   Derived from metro Detroit 2025-26 market data (LawnStarter MI, LawnByseason Detroit,
   ProMatcher Detroit, LawnGuru "$35-$60 per cut"). Includes mow + trim + blow. */
window.SU_LAWN_PRICING = {
  tiers: [ // [maxSqFt, weeklyPerCut]
    [3000, 35], [5000, 40], [7500, 46], [10000, 52],
    [15000, 62], [20000, 74], [30000, 92], [43560, 115]
  ],
  overAcrePer1000: 2.5,      // weekly, each 1,000 sq ft beyond 1 acre
  oneTimeMultiplier: 1.4,    // one-time / overgrown premium
  biweeklyMultiplier: 1.25, // every other week: longer grass, more time per cut
  biweeklyCuts: 13,
  oneTimeMin: 55,
  memberDiscount: 0,         // members pay the same mowing price (no discount)
  seasonCuts: 26,            // ~Apr 15 – Oct 15 weekly
  minSqFt: 500
};
window.suLawnQuote = function (sqft, freq) {
  var P = window.SU_LAWN_PRICING, w = null;
  sqft = Math.max(sqft, 0);
  for (var i = 0; i < P.tiers.length; i++) if (sqft <= P.tiers[i][0]) { w = P.tiers[i][1]; break; }
  if (w === null) w = P.tiers[P.tiers.length - 1][1] + Math.ceil((sqft - 43560) / 1000) * P.overAcrePer1000;
  if (freq === "biweekly") return { perCut: Math.round(w * P.biweeklyMultiplier), cuts: P.biweeklyCuts, custom: sqft > 43560 };
  if (freq === "once") return { perCut: Math.max(P.oneTimeMin, Math.round(w * P.oneTimeMultiplier)), cuts: 1, custom: sqft > 43560 };
  return { perCut: w, cuts: P.seasonCuts, custom: sqft > 43560 };
};
