// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
// Every line in premiumFeatures is something the app does today: the paywall lists the same three.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Custom stakes (create your own non-cash penalties and rewards)",
    "Rebuild your plan any time with a new goal, training days or equipment",
    "Full weekly score history"
  ],
  "offers": [
    {
      "id": "yearly",
      "label": "Yearly",
      "price": "$29.99",
      "period": "year",
      "trialDays": 7,
      "badge": "Save 50%"
    },
    {
      "id": "monthly",
      "label": "Monthly",
      "price": "$4.99",
      "period": "month",
      "trialDays": 3,
      "badge": ""
    }
  ],
  "defaultOfferId": "yearly"
};
