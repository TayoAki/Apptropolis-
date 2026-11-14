// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Custom stakes (create your own non-cash penalties and rewards)",
    "Regenerate your AI plan any time with new goals or equipment",
    "Full weekly score history and past scorecards",
    "Progress charts per exercise on your private log"
  ],
  "offers": [
    {
      "id": "yearly",
      "label": "Yearly (covers you and your partner)",
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
