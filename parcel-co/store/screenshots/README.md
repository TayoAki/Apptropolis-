# Pip: App Store screenshots

Seven iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen |
|---|---|---|---|---|
| 1 | `01-ask-before-you-pay` | Ask before / you **pay** | Pip checks the codes it has collected and tells you which one to use. | Ask Pip: a question about running shoes, Pip's answer (zoomed) and the code card |
| 2 | `02-copy-the-code` | One tap. / Code **copied**. | Then Shop opens the store. Paste the code at checkout. | The same card right after Copy (the code row zoomed) |
| 3 | `03-gift-ideas` | Gift ideas, / **on budget** | Ask in plain words. Pip answers from the deals it found. | Ask Pip: "Gift for a 6 year old under $40", the answer and deal cards (first deal zoomed) |
| 4 | `04-codes-for-your-stores` | Codes for / **your** stores | Follow the stores you shop at. Their codes come first. | Home: the ask box, then codes for followed stores |
| 5 | `05-every-store` | Every store, / one **search** | See how many live codes and deals each store has. | Stores, three followed |
| 6 | `06-store-page` | Every code / in one **place** | When each one ends, and when Pip last saw it. | A store's page: its codes and deals |
| 7 | `07-save-for-later` | Save codes / for **later** | Keep a code for the day you check out. | Saved codes |

The first three carry what makes Pip different: you ask in plain words and get one usable code
back. No Plus feature is shown, so none needs a Plus badge.

## How they were made

1. **Data.** The live Pip API, holding the demo data from [`../../backend/demo-data.sql`](../../backend/demo-data.sql):
   twelve fictional stores (Kestrel Running, Little Acorn Toys, Glowhaus Beauty, …) with made-up
   codes and deals. No real store, brand or logo appears. Remove the demo data before launch
   (`backend/demo-data-remove.sql`) and retake these with real rows if you want real stores shown;
   check each store's trademark terms first.
2. **Capture.** [`capture.cjs`](capture.cjs) drives the real web build in Chromium at the app area of a
   6.9" iPhone (440 × 868 points at 3x, between the status bar and the home indicator). The demo
   shopper follows three stores. Pip's answers are real answers from the AI service. Raw captures
   are in `captures/`.
3. **Compose.** [`spec.json`](spec.json) → `tools/store-screenshots/compose.cjs` adds the background,
   headline, our own plain phone frame (no Apple bezel), a drawn status bar and home indicator in
   the app's own colors, and one zoomed callout cut from the same capture. Text in the app renders
   in Inter, close to iOS's system font.
4. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders (exact sizes, RGB with
   no alpha, 7 of at most 10).

To retake: build the web app (`CI=1 npx expo export -p web --output-dir <dir>`), then

```bash
node store/screenshots/capture.cjs <dir> store/screenshots/captures
```

```bash
node ../tools/store-screenshots/compose.cjs store/screenshots/spec.json
```

## Rules checked

- Only the real app with real (demo) data the app itself shows; no mock-ups.
- No app price, trial or savings claim in any headline. Prices that appear are the deals' own
  prices inside the app's screens.
- No ratings, reviews, press, "#1", competitor names or other platforms. No photos (so no photo
  credits); store marks are letters drawn by the app.
- The word "Tested" on some codes is the app's real label for codes the scraper tried; in the demo
  data it is set on a few made-up codes.

## Upload

App Store Connect → Pip → the new version (create it with + next to "iOS App"; a live version's
screenshots are locked) → Previews and Screenshots → iPhone → remove old ones → drag `01` to `07`
from the folder matching the slot (6.9" or 6.5") → Save.
