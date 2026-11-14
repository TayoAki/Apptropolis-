// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Trend insights: weekday patterns, 12-week history and how your drinking lines up with game days",
    "Extra athlete levels, kits and gear beyond the first three",
    "Custom goals per week, such as a lighter week before a match or race",
    "Over-limit reflection with tailored AI feedback from your coach"
  ],
  "offers": [
    {
      "id": "monthly",
      "label": "Monthly",
      "price": "$4.99",
      "period": "month",
      "trialDays": 7,
      "badge": ""
    },
    {
      "id": "yearly",
      "label": "Yearly",
      "price": "$29.99",
      "period": "year",
      "trialDays": 7,
      "badge": "Save 50%"
    }
  ],
  "defaultOfferId": "yearly"
};
