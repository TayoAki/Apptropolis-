// What premium unlocks and how it's sold. Written from the plan; edit it to change prices.
import type { Monetization } from "./purchases";

export const monetization: Monetization = {
  "premiumFeatures": [
    "Four more planned weeks after your free week",
    "Leftover carry-over: next week's dinners are chosen to use up what's left from this week's packs",
    "The full library of ~25 tested recipes for swaps (the free week offers 8 swap options)",
    "Paid-vs-estimate history across every shop, by store and date"
  ],
  "offers": [
    {
      "id": "four-weeks",
      "label": "Four more weeks, one-off",
      "price": "£4.99",
      "period": "month",
      "trialDays": 0,
      "badge": "No subscription"
    }
  ],
  "defaultOfferId": "four-weeks"
};
