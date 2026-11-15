// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
// One purchase, once: "lifetime" is a non-renewing product in RevenueCat (package type LIFETIME).
// Each feature below is gated on isPremium in the code: planning any week after the free one
// (data/plan.ts createPlan), the full recipe library for plans and swaps (data/planner.ts
// recipePool), "Keep for next week" (app/recipe/[id].tsx) and price history (app/(tabs)/shop.tsx).
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Unlimited weekly plans: plan a new week whenever the last one is over, for as long as you like",
    "Leftovers first: each new week is planned around what's left of last week's packs",
    "All 25 tested recipes for plans and swaps (the free week uses the 8 starter recipes)",
    "Keep for next week: bring back a dinner you loved",
    "Price history: what you paid against the estimate, shop by shop"
  ],
  "offers": [
    {
      "id": "unlimited",
      "label": "Unlimited weekly plans",
      "price": "$4.99",
      "period": "lifetime",
      "trialDays": 0,
      "badge": "Pay once"
    }
  ],
  "defaultOfferId": "unlimited"
};
