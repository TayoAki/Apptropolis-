// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  // Only what premium unlocks in the app today. Keep each line true to a gate in the code:
  // folders are gated in app/(tabs)/saved.tsx, full keyword results in app/(tabs)/search.tsx.
  "premiumFeatures": [
    "Folders to organize your saved verses",
    "Every keyword match, with the words highlighted"
  ],
  "offers": [
    {
      "id": "yearly",
      "label": "Yearly",
      "price": "$19.99",
      "period": "year",
      "trialDays": 7,
      "badge": "Save 44%"
    },
    {
      "id": "monthly",
      "label": "Monthly",
      "price": "$2.99",
      "period": "month",
      "trialDays": 0,
      "badge": ""
    },
    {
      "id": "lifetime",
      "label": "Lifetime",
      "price": "$39.99",
      "period": "lifetime",
      "trialDays": 0,
      "badge": "Pay once"
    }
  ],
  "defaultOfferId": "yearly"
};
