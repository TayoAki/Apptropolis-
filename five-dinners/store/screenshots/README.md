# Five Dinners: App Store screenshots

Eight iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen | Paid |
|---|---|---|---|---|---|
| 1 | `01-five-dinners-for-your-household` | Five dinners for / your **household** | Say who's eating, your budget and what you skip. The week comes back planned. | Week, Nov 15–21, "for 4": the basket card over the five dinners, Monday's and Tuesday's rows (picture, cost, 4 servings) zoomed | |
| 2 | `02-one-list-in-whole-packs` | One list, in / **whole packs** | Every pack as it sits on the shelf, with what the week uses and what's left over. | Shop at the store: 7 of 15 ticked, Produce done, the onions row zoomed ("Buy 1 × 3 lb bag, about 8 · uses 10 onions · 8 onions from cupboard · 6 onions left") | |
| 3 | `03-next-week-starts-with-whats-left` | Next week starts / with **what's left** | Leftover chicken and eggs go in first. | Week 2, Nov 22–28: "Carried over" and dinners marked "Uses 11.6 oz leftover chicken thighs", "Uses 8 eggs leftover large eggs", "Uses 2 tortillas leftover flour tortillas" (zoomed) | Unlimited |
| 4 | `04-know-whats-left-in-every-pack` | Know what's left / in every **pack** | Mark a dinner cooked and each pack goes down by what it used. | Cook on Wednesday evening: Mon–Wed cooked, Monday's card with its picture strip and "What's left" bars (penne, diced tomatoes, spinach) zoomed | |
| 5 | `05-swap-a-dinner` | Swap a dinner, / see the **change** | Each option shows what it adds to or takes off this week's list. | Week 1 with Monday's swap options open: two starter recipes with thumbnails and their change to the list (the whole card zoomed) | |
| 6 | `06-every-recipe-scaled-for-four` | Every recipe / scaled for **four** | Change who's eating and every amount and pack on your list follows. | Wednesday's chili: the picture (captioned "Illustration"), then title, "For 4" and "Scaled for 4 · Changing it updates your list and prices" zoomed | |
| 7 | `07-leave-out-what-you-dont-eat` | Leave out what / you **don't eat** | No pork, no fish, no nuts: every plan and every swap skips them. | Onboarding's "Anything you don't eat?" step with No pork picked (chips zoomed) | |
| 8 | `08-what-you-paid-shop-by-shop` | What you paid, / **shop by shop** | Shelf prices against the estimate. | Shop, week 2: Price history open, prices logged on Nov 15 and Nov 22 against the estimate (zoomed) | Unlimited |

The first three carry what makes Five Dinners different: five dinners sized to the household,
one list in whole packs, and next week planned around what's left of them. The two screens that
show paid features (a week after the free one, planned around leftovers; price history) carry an
"Unlimited" pill, after the purchase's name on the paywall ("Unlimited weekly plans"). No other
screenshot shows a paid feature. The app's own locked rows ("14 more tested recipes in the full
library · Unlock", "Plan next week around what's left · Unlock", the padlocked "Keep for next
week") appear on screens 5 and 6 as marked upsells, not as paid screens.

## Recipe pictures: AI illustrations, not photos

The food pictures on screens 1, 3, 4, 5 and 6 are the app's own recipe pictures
(`assets/recipes/`). They are **AI-generated illustrations**, made with Google's Gemini 3.1 Flash
Image model via OpenRouter on Nov 15, 2026 (prompts in `scripts/gen-recipe-images.py`). They are
**not CC0 or public-domain photos**, and not photos of these recipes being cooked. The app is
upfront about this: the recipe page captions its picture "Illustration", and Settings says
"Recipe pictures are AI-generated illustrations of each dish, so your dinner will look a little
different."

**Flag for the owner:** the screenshot rules prefer CC0 photos, and these are not CC0. They show
in the screenshots only because they are part of the app as shipped. Two things to decide:

- whether App Store screenshots should show AI food imagery;
- whether to swap in CC0 photos later (each photo must match its recipe's real ingredients).

If not, retake with the pictures cropped out (recipe hero, Cook strips) or before they were
added.

## How they were made

1. **Demo household.** A fictional household, built through the real UI, nothing seeded.
   [`capture.cjs`](capture.cjs) runs the app with Playwright's `page.clock` (America/Chicago):
   - **Sun Nov 15, 2026, 9:30.** Onboarding: 4 people, "$65 · Room for a treat", No pork,
     staples olive oil, rice, onions, garlic, cumin and paprika, reminders "Not now". The app
     plans the free week; the paywall it opens on top is closed without buying.
   - **11:10, at the store.** Produce and the two meats are ticked, and a few shelf prices are
     typed in: chicken thighs $6.92, ground beef $7.21, carrots $2.19, bell peppers $2.99. The
     rest is ticked after the capture.
   - **Mon to Fri, evenings.** One dinner cooked each day, most of them rated thumbs-up.
     Wednesday's chili is opened before it is cooked.
   - **Sun Nov 22.** The free week has ended and its leftovers are in the cupboard. Unlimited
     plans are bought with the paywall's test mode ("purchases are simulated, nothing is
     charged"), and "Plan next week" builds week 2 around the leftovers. At the store three
     more prices are logged: chicken thighs $6.57, bell peppers $2.89, salmon $10.15.

   Every dinner, pack, amount, total, budget figure, leftover and date on screen is what the app
   computed from those taps. The only typed numbers are the seven shelf prices above, which are
   the demo shopper's input. Grocery prices are the app's own catalogue (aldi.us, ZIP 60601,
   checked Nov 15, 2026).
2. **Capture.** The real web build runs in Chromium at the app area of a 6.9" iPhone (440 × 868
   points at 3x, Inter fonts), in the default theme (Larder, light). Some screens are scrolled
   so the part that matters is in view. Raw captures are in `captures/`.
3. **Compose.** [`spec.json`](spec.json) feeds `tools/store-screenshots/compose.cjs`, which adds:
   - the background in Larder's surface colors, with the headline accent in its terracotta
     primary and the pill in its herb green;
   - our own plain phone frame (no Apple bezel);
   - a drawn status bar and home indicator;
   - one zoomed callout cut from the same capture.
4. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders: exact sizes,
   RGB with no alpha, 8 of at most 10 images.

To retake (about two minutes), build the web app, then capture and compose from `five-dinners/`:

```bash
CI=1 npx expo export -p web --output-dir <dir>
node store/screenshots/capture.cjs <dir> <captures-dir>       # copy the 8 used PNGs into store/screenshots/captures
node ../tools/store-screenshots/compose.cjs store/screenshots/spec.json
python3 ../tools/store-screenshots/check_shots.py store/screenshots/6.9 --slot 6.9
python3 ../tools/store-screenshots/check_shots.py store/screenshots/6.5 --slot 6.5
python3 ../tools/store-screenshots/package_upload.py store/screenshots <out.zip>
```

The capture script serves the build on port 8137 and writes `crops.json`: the boxes of the parts
the callouts zoom, and the rendered boxes of the recipe pictures (Week row, swap thumbnail,
recipe hero, Cook card strip), for anyone recreating these screens. If the screens change, check the callout crops in `spec.json` (app points,
440 × 868). A pill plus a two-line sub doesn't fit above the phone on the 6.5" size, so paid
shots keep their sub to one line.

## Rules checked

- Only the real app with a fictional household; every number is the app's own result, apart
  from the shopper's typed shelf prices.
- No app price, trial, cost or savings claim in any headline or sub line, and no paywall screen.
  The grocery prices on screen are the app's content.
- No brand named in headlines or subs. **Trademark judgment for the owner:** the app's own
  screens show "Aldi ZIP 60601", "Prices from aldi.us (ZIP 60601)…" and "Aldi · Nov 15" (screens
  1, 2, 3, 6 and 8), because that is where the prices come from. Decide whether showing the
  retailer's name in store screenshots is acceptable, or ask Aldi; if not, retake with those
  lines cropped or scrolled out.
- No ratings, reviews, testimonials, press, "#1", "best", competitor names, other platforms or
  health claims.
- No "save time and money", "plan in minutes", "what's for dinner?", recipe counts as a hook, or
  food montage.
- No stock or third-party photos and no people. The food pictures are the app's own recipe
  pictures, AI-generated illustrations (see above), not CC0 photos. The paper bag is the app's
  own mascot.
- Two lines per headline, at most 16 characters a line, one accent word or phrase.

## Upload

App Store Connect → Five Dinners → the new version (create it with + next to "iOS App"; a live
version's screenshots are locked) → Previews and Screenshots → iPhone → remove the old ones →
drag `01` to `08` from the folder that matches the slot (6.9" or 6.5") → Save. The zip from
`package_upload.py` has one folder per slot, files in upload order.
