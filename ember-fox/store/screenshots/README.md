# ShotOClock: App Store screenshots

There are seven iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen | Plus |
|---|---|---|---|---|---|
| 1 | `01-fridays-pints-play-saturday` | Friday's pints / play **Saturday** | Every drink you log counts toward your form for the next game. | Week on Friday night after two pints. The chart is zoomed: Friday's bar sits next to Saturday's game-day flag. Below it is "Game form: drinks logged today, 76 of 100, Next game: tomorrow". | |
| 2 | `02-know-your-form` | Know your form / before **kickoff** | Log a drink or an alcohol-free day. ShotOClock rates your form out of 100. | Tonight on Thursday evening (alcohol-free). The form rating card is zoomed: "83 / 100, Fresh legs for Saturday". | |
| 3 | `03-form-card-for-matchday` | Your form card / for **matchday** | Your rating, alcohol-free days and next game, ready to share. | Week on Thursday. The shareable card is zoomed: "Game form: sharp, 83 of 100, 2 alcohol-free days, Next game: Saturday". | |
| 4 | `04-weeks-in-limit-level-up` | Weeks in limit / **level** you up | Each week within your limit counts toward your next level and gear. | Career: Level 3, Dependable (zoomed), "2 of 4 weeks" to level 4, the two-week streak and the gear locker. | |
| 5 | `05-pick-your-weekly-limit` | Pick your / weekly **limit** | 3, 7, 10 or 14 drinks a week. Change it any time in Settings. | Onboarding step 2, with "Up to 10 drinks a week" picked (zoomed). | |
| 6 | `06-your-night-before-games` | Your night / before **games** | How your drinking lines up with game days. | Week with Plus: trend insights. Two lines are zoomed: "Friday is your heaviest day" and "The day before a game or training day you average 3.8 drinks, against 0.8 on other days". | Plus |
| 7 | `07-lighter-match-week` | Go lighter in / **match** week | Set a lower limit for one week only. | Settings with Plus: "Lighter limit this week" set to 6 (zoomed), "For a match or race week. Goes back to your usual limit next week." | Plus |

The first three carry what no competitor offers. Drinking is tied to how you play: the drinks you log turn into a form rating and a card for your next game. Screens 6 and 7 show Plus features and carry the Plus badge.

Two Plus items also appear in free screens, and the app labels both as Plus:

- the locked "Trend insights" teaser at the bottom of 3;
- the Compression Sleeves and Away Kit tiles in 4.

## The demo athlete

The athlete is a fictional person who plays Saturday soccer. No name appears anywhere. They were made through the app's own screens in [`capture.cjs`](capture.cjs), with the browser clock moved to each moment. The app stamps every drink with the current time and closes each finished week by itself.

1. **Mon Oct 26, 2026: onboarding.** Sport is "Soccer / basketball", the limit is "Up to 10 drinks a week", today is marked alcohol-free, the reminder is skipped and the paywall is closed. In Settings: game days are Saturday and the body profile is 175 lb, male. The body profile is used only by the BAC estimate.
2. **Four weeks of entries.** Each drink is a tap on the Beer, Wine or Cocktail tile at the time it was had. Each alcohol-free day is a tap on "Mark today alcohol-free".
   - Week of Oct 26: 11.4 drinks, over the limit.
   - Week of Nov 2: 7.4 drinks.
   - Week of Nov 9: 7.4 drinks.
   - This week (Nov 16): Monday alcohol-free, a glass of wine Tuesday, a pint after Wednesday training, and Thursday alcohol-free.

   The app worked out the rest: Level 3, a two-week streak, Shin Guards unlocked and 8 alcohol-free days in total.
3. **Thursday 7:05 PM.** Screens 2, 3 and 4 were taken. Then came two pints on Friday at 8:00 and 9:10 PM, and screen 1 was taken at 9:25 PM.
4. **Plus.** The same phone storage from Thursday evening was opened in a second browser and upgraded with the paywall's test-mode purchase. In this build purchases are simulated and nothing is charged. Screens 6 and 7 come from that browser.

Every number in the images (83, 76, 2.9 of 10, 3.8 against 0.8 and so on) is the app's own arithmetic. Nothing was typed into an image.

Playwright's fake clock stops the web bundle from mounting once a page has been moved forward more than about 24 days. Its `performance.now()` passes 2^31 ms. To get around this, the script hands the phone's storage to a fresh browser every two weeks of simulated time. This is a limit of the test tool, not an app bug.

## How they were made

1. **Capture.** [`capture.cjs`](capture.cjs) drives the real web build in Chromium.
   - Size: the app area of a 6.9" iPhone, 440 × 868 points at 3x, between the status bar and the home indicator.
   - Theme: the app's default pack, Stadium Night (dark). The app follows the phone's appearance, so the phone is set to dark.
   - Animations show their final state.
   - Raw captures are in `captures/`, and two runs gave identical pixels.
2. **Compose.** [`spec.json`](spec.json) goes through `tools/store-screenshots/compose.cjs`, which adds:
   - a background in the theme's surface and background colors (`theme/tokens.ts`), with the gold primary as the accent;
   - the headline;
   - our own plain phone frame (no Apple bezel);
   - a status bar and home indicator drawn in the app's colors;
   - one zoomed callout cut from the same capture.

   Text in the app renders in Inter, which is close to iOS's system font.
3. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders: exact sizes, RGB with no alpha, and 7 images of the 10 allowed.

To retake: build the web app (`CI=1 npx expo export -p web --output-dir <dir>`), then

```bash
node store/screenshots/capture.cjs <dir> store/screenshots/captures
```

```bash
node ../tools/store-screenshots/compose.cjs store/screenshots/spec.json
```

The script serves the build on port 8131.

## Rules checked

- **Real app only.** The screenshots show only the real app, with a fictional athlete and numbers the app produced. There are no mock-ups.
- **No prices.** No headline mentions a price, trial, cost or saving. The paywall, which shows prices, is not pictured.
- **Nothing that is not ours.** There are no ratings, reviews, testimonials, press, "#1", "best", competitor names or other platforms.
- **No health or medical claims.** The lines are the app's own wording: "Recovery is strong", and "Any alcohol still in your system affects coordination and reaction time." on screen 1.
- **No photos.** There are no photos, so there are no photo credits. The drink tile icons and the mascot are the app's own illustrations.
- **Alcohol is shown carefully.**
  - Nothing glamorizes drinking. Drinks appear only as entries and totals against a weekly limit.
  - There is no "cut back or quit" language and no shaming.
  - The app's guardrail is visible: it says "sharp" only on a clear day inside the limit (screens 2 and 3). After Friday's pints it says "drinks logged today" (screen 1).
  - The BAC estimate is never the subject. Only its header ("0.00%" on an alcohol-free day) shows at the bottom edge of screen 2, and no callout points at it.
- **Age rating.** ShotOClock is about alcohol, so its App Store age rating needs to be 17+. In the age rating questionnaire, answer "Frequent" for alcohol, tobacco or drug use or references, and let the questionnaire set the rating. Apple's 2025 update replaced the 17+ tier with 16+ and 18+, so confirm the result is the adult tier. These images keep to the app's own UI and icons.

## Upload

1. In App Store Connect, open ShotOClock and then the new version. Create it with + next to "iOS App"; a live version's screenshots are locked.
2. Go to Previews and Screenshots, then iPhone, and remove any old screenshots.
3. Drag `01` to `07` from the folder matching the slot (6.9" or 6.5").
4. Save.
