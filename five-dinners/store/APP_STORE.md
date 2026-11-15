# Five Dinners: App Store Connect submission (pre-order, v1.0.0)

Everything to paste into App Store Connect, and what App Review will look at. The build has the
paywall switched off (`data/launch.ts`, `PAYWALL_ENABLED = false`): every feature is free and the
app has no in-app purchases in this version.

## App record
| Field | Value |
|---|---|
| Name | Five Dinners |
| Bundle ID | `com.appbuilder.fivedinners5hpa` (set in `app.json`; register it in your Apple Developer account) |
| SKU | `five-dinners-ios` (any unique string) |
| Primary language | English (U.S.) |
| Primary category | Food & Drink |
| Secondary category | Lifestyle |
| Price | Free |
| Availability | **United States only**: prices are in USD from a US store's price list |
| Pre-order | Pricing and Availability → Pre-Orders → on, with a release date up to 180 days out. The build still has to pass App Review before the pre-order page goes live. |

## Listing copy
**Subtitle** (24/30): Budget dinners, one list

**Promotional text** (141/170):
Five dinners for your household, priced against your weekly budget, with one shopping list in whole packs. Next week starts with what's left.

**Description:**
```
Five Dinners plans the week's dinners for your household, priced against the budget you set.

PLAN
Tell it how many people you cook for, your weekly budget and what you don't eat. It picks five dinners from 25 tested recipes and shows what the week's basket costs against your budget. Swap any dinner and see the basket change.

SHOP
One shopping list, in whole packs as the store sells them: a 3 lb bag of onions, not "2 onions". Each line says how much the week uses and how much will be left. Tick things off in the store and type what you paid to see it against the estimate.

COOK
Every recipe is scaled for your household. Mark a dinner cooked and see what's left of each pack.

NEXT WEEK
When the week ends, the next plan starts with what's left in your cupboard, so the half bag of spinach gets used.

PRIVATE BY DESIGN
No account. Your plans, lists and prices stay on your phone.

Prices are estimates from one store's price list for one ZIP code, dated in the app. Your store's prices may differ. Recipe pictures are illustrations.
```

**Keywords** (96/100): `meal planner,grocery list,budget,dinner,recipes,shopping list,leftovers,family meals,weekly plan`

Keep "Aldi" out of the name, subtitle, keywords and screenshot headlines (trademark, Guideline 5.2.1).
The app shows it only as its price source, with "Five Dinners isn't affiliated with or endorsed by
Aldi." in Settings.

| Field | Value |
|---|---|
| Support URL | **Needed**: an https page with a way to contact you |
| Marketing URL | optional |
| Privacy Policy URL | **Needed**: host `store/privacy-policy.md` at an https URL, then put the same URL in `data/app-info.ts` `privacyUrl` (it is a localhost link today) |
| Copyright | 2026 your name or company |

## Screenshots
`store/screenshots/6.9/` (1320 × 2868) and `store/screenshots/6.5/` (1284 × 2778), in upload order.
Retaken from the free build: no paywall, prices or "Unlimited" labels.

## Age rating
Answer "None" to every content question. Expected rating: 4+.

## App Privacy (nutrition label)
**Data Not Collected.** The app makes no network requests of its own: no account, no analytics, no
crash reporting, no ads, no tracking, and RevenueCat is never started in this build. The Privacy
and Terms links open in the browser only when tapped.

## App Review information
- Sign-in required: **No**
- Contact: your name, phone and email
- Notes for the reviewer:
```
No account or sign-in is needed. All data stays on the device.

To test the main flow:
1. Complete the short setup (household size, budget, foods you don't eat), or tap Skip.
2. Week tab: five dinners priced against the weekly budget. Tap Swap on any dinner to change it.
3. Shop tab: one list in whole packs. Tick items; tap a price box to enter what you paid.
4. Cook tab: tap Mark cooked on a dinner to see what's left of each pack.
5. Once all five dinners are cooked, the Week tab offers "Plan next week now", which plans the next week around the leftovers.

Settings > Redo setup starts over. Reminders are local notifications; permission is asked only when the user turns a reminder on.

All features are free in this version; there are no in-app purchases. Prices are estimates from a fixed price list for one store and ZIP code, and the app says so. Recipe pictures are AI-generated illustrations, labelled as such in the app.
```

## Export compliance
`ios.config.usesNonExemptEncryption: false` is set, so App Store Connect won't ask on each build.

## Still to do before submitting
1. Host the privacy policy and set `privacyUrl` (blocker, Guideline 5.1.1(i)).
2. A Support URL (blocker, Guideline 1.5). Optionally fill `supportEmail` in `data/app-info.ts` so Settings shows a Help row.
3. Apple signing credentials on Expo for the store build (see the root `LAUNCH.md`).
