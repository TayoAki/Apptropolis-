# Verse by Verse: App Store screenshots

Seven iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen | Callout | Pill |
|---|---|---|---|---|---|---|
| 1 | `01-one-verse` | One verse. / Then put it **down**. | A single verse on a calm card. Twenty well-known verses carry a short study note. | Read: Psalm 46:10 with its study note ("Be still") open | none | none |
| 2 | `02-right-where-you-left-off` | Right where / you **left off** | One quiet reminder a day. Your verse waits right where you stopped. | Chapter view of Romans 8, opened at the reading place (8:28, highlighted) | The line "You left off at Romans 8:28. Tap any verse to read from there." | none |
| 3 | `03-the-whole-bible` | The **whole** / Bible | All 66 books of the World English Bible. Jump to any book, chapter or verse. | Read: the passage picker's book list (Old Testament and the start of the New) | none | none |
| 4 | `04-share-a-card` | Share a verse / as a **card** | Send it as an image to someone who needs it today. | Saved: the share-card preview of John 14:27 | The card | none |
| 5 | `05-find-any-passage` | Find any / **passage** | Type Psalm 23, John 3:16 or just Romans, and read on from there. | Search, Reference jump: "Psalm 23", 6 verses | none | none |
| 6 | `06-search-every-word` | Search every / **word** | Every match in the whole Bible, with the words highlighted. | Search, Keywords: "love one another", 20 verses, highlighted | none | Premium |
| 7 | `07-folders` | Folders for / your **verses** | Keep saved verses together, like Comfort and Promises. | Saved, Comfort folder: four verses | none | Premium |

The first three carry what makes the app different: one calm verse with a study note, the place
kept, and the whole Bible. The two Premium features (full keyword results with highlights, and
folders) are only on shots 6 and 7, and both carry the Premium pill. No other shot shows a
Premium feature: shots 1 to 5 look the same on the free plan.

The copy follows the research brief: the hook is "One verse. Then put it down."; no shot leads
with "no streaks", "scroll the Bible", "one verse at a time", AI or "#1"; "the whole Bible" is
true now that all 66 books ship.

## How they were made

1. **Demo reader.** A fictional reader a few weeks in, seeded before the app loads, in the app's
   own storage shapes (`app:onboarded`, `app:answers`, `app:collection:bookmarks`,
   `app:entitlement`). They chose Psalm 23 during setup and are now reading Romans 8 (reading
   place 8:28). They have nine saved verses: four in Comfort, three in Promises, two in no
   folder, saved between today and three weeks ago. Recent searches are Romans 8:1,
   Lamentations 3:22 and John 14:27. Premium is the entitlement the app writes after a purchase
   in its test mode. Everything after loading is reached through the app's own controls; every
   verse, count and date shown is what the app shows. The "Saved Nov 2" style dates are relative
   to the capture day.
2. **Capture.** [`capture.cjs`](capture.cjs) drives the real web build in Chromium at the app area
   of a 6.9" iPhone (440 × 868 points at 3x, between the status bar and the home indicator).
   Text renders in Inter (close to iOS's system font) and the app's serif in Charter. Default
   theme: Parchment. The raw captures are in `captures/`.
3. **Compose.** [`spec.json`](spec.json) goes through `tools/store-screenshots/compose.cjs`. It
   adds the background, the headline, our own plain phone frame (no Apple bezel), a status bar
   and home indicator drawn in the app's own colors, the Premium pill, and a callout cut from
   the same capture.
4. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders: exact sizes, RGB
   with no alpha, 7 of at most 10.

To retake, first build the web app (`CI=1 npx expo export -p web --output-dir <dir>`). Then, from
`verse-by-verse/`:

```bash
node store/screenshots/capture.cjs <dir> store/screenshots/captures
```

```bash
cd store/screenshots && node ../../../tools/store-screenshots/compose.cjs spec.json
```

```bash
python3 ../../../tools/store-screenshots/check_shots.py 6.9 --slot 6.9
```

```bash
python3 ../../../tools/store-screenshots/check_shots.py 6.5 --slot 6.5
```

Bug fixed during this pass (visual):

- The chapter view never scrolled to the verse it opened at. Each row was measured inside its
  entrance animation, so every row reported y = 0. The fix is in `app/chapter.tsx`.
- Picking a folder chip on Saved scrolled the chip row even when that chip was already in view,
  which pushed "All" half off the left edge. The fix is in `app/(tabs)/saved.tsx`.

## Rules checked

- Only the real app, with a fictional demo reader; no mock-ups, no made-up screens.
- No app price, trial or savings anywhere; no paywall screen is used.
- No ratings, reviews, testimonials, press, "#1", "best", competitor names or other platforms.
- No photos, so no photo credits are needed.
- No Apple bezels: the frame is our own plain rim.
- Exact sizes, RGB with no alpha, 7 images (the limit is 10).

Scripture is the **World English Bible** (eBible.org edition ENGWEBP, from the Free Use Bible API
at bible.helloao.org), in the public domain. "World English Bible" is a trademark of eBible.org.
This edition writes the divine name as "the LORD".

## Upload

1. In App Store Connect, open Verse by Verse and go to the new version. Create it with + next to
   "iOS App"; a live version's screenshots are locked.
2. Open Previews and Screenshots, then iPhone, and remove any old screenshots.
3. Drag `01` to `07` from the folder that matches the slot (6.9" or 6.5"), then Save.

The upload zip has one folder per size, with the files in order.
