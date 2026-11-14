// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "AI opponent scouting and technique analysis from photo frames, with a game plan and drills",
    "Unlimited AI coach questions",
    "AI meal photo logging with fighter macros",
    "More timer combos, and custom callout combos for your game plans"
  ],
  "offers": [
    {
      "id": "weekly",
      "label": "Weekly",
      "price": "$3.99",
      "period": "week",
      "trialDays": 0,
      "badge": ""
    },
    {
      "id": "yearly",
      "label": "Yearly",
      "price": "$39.99",
      "period": "year",
      "trialDays": 7,
      "badge": "Save 80%"
    },
    {
      "id": "lifetime",
      "label": "Lifetime",
      "price": "$89.99",
      "period": "lifetime",
      "trialDays": 0,
      "badge": "Pay once"
    }
  ],
  "defaultOfferId": "yearly"
};
