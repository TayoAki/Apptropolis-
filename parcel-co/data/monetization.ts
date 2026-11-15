// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
// Every line in premiumFeatures is something the app does today: the paywall lists the same two.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Unlimited questions to Pip (free answers 3 a day)",
    "Ask Pip with a photo of a product or its label"
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
    }
  ],
  "defaultOfferId": "yearly"
};
