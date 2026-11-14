// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Study notes beyond the 20 free selected verses",
    "Bookmark folders and tags to organize saved verses",
    "Verse card themes and fonts for sharing",
    "Keyword search with highlighted matches across all books"
  ],
  "offers": [
    {
      "id": "yearly",
      "label": "Yearly",
      "price": "$19.99",
      "period": "year",
      "trialDays": 7,
      "badge": "Save 45%"
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
