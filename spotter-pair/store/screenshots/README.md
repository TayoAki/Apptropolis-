# Spotter Pair: App Store screenshots

Eight iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen | Pro |
|---|---|---|---|---|---|
| 1 | `01-miss-a-session` | Miss a session, / you buy **coffee**. | Set a stake with your partner. Finish the week under 100% and it's on you. | Partner tab on Friday before the session: scorecard at 67%, "Catching up · You owe the stake this week", stake "Sunday cold brew & bagels" (zoomed) | |
| 2 | `02-one-set-left` | One set left / for **3 of 3** | Log the last set, mark the workout complete, and this week is 3 of 3. | Today: Mon and Wed done, "2 of 3 sessions done this week" (zoomed), Walking Lunge with sets 1 and 2 logged and set 3 up next | |
| 3 | `03-you-showed-up` | 3 of 3. / You **showed up**. | Send the weekly scorecard to your partner. It counts sessions, never weights. | Partner tab after the session: the scorecard (the card the app shares as an image, zoomed) at 100%, "You showed up · Nothing owed" | |
| 4 | `04-week-from-three-answers` | A week of lifts / from **3 answers** | Your goal, training days and equipment. Every lift fits what you have. | Setup's last step, "Your week is built": the 3-day plan made from the lifter's answers | |
| 5 | `05-weights-stay-private` | Your weights / stay **private** | Sets stay on this phone. Your partner only sees that you trained. | Today after Mark workout complete: all lifts done, 3 of 3, "Completed. Your sets are locked and stay on this phone." (zoomed) | |
| 6 | `06-swap-a-lift` | Swap a lift / in **one tap** | Same muscle group, your equipment. The swap carries into the weeks ahead. | My Plan, Friday: five lifts, each with its swap button (first one zoomed) | |
| 7 | `07-every-week-on-record` | Every week, / **on record** | See each past week's score, not just this one. | Partner tab, score history: weeks 46, 45 and 44 (zoomed) | Pro |
| 8 | `08-write-your-own-stake` | Write your / own **stake** | Lunch, chores, the dog walk: type the stake you both agreed on. | Partner tab: "Write your own" open with a stake typed in (zoomed) | Pro |

The first three carry what makes Spotter Pair different: a weekly score with a friendly stake,
the last set that finishes the week, and the scorecard you send your partner. Screens 7 and 8
show Pro features and carry a "Pro" badge; no other screenshot shows a Pro feature (the locked
"Regenerate plan (Pro)" button on screen 6 is the app's own marked upsell, not a Pro screen).

## How they were made

1. **Demo lifter.** A fictional person, built through the real UI, not seeded.
   [`capture.cjs`](capture.cjs) runs the app's own onboarding on Monday Oct 26 2026 (goal "Build
   raw strength", Mon/Wed/Fri, "Home dumbbells"), closes the paywall without buying, picks the
   preset stake "Sunday cold brew & bagels", and then trains through the app with Playwright's
   `page.clock` set to each training evening. Every set is logged with the card's own + / −
   steppers and Log set button, and every session is finished with Mark workout complete.
   - Week 44: 3 of 3. Week 45: Friday skipped, 2 of 3 (67%). Week 46: 3 of 3.
   - Week 47: Monday and Wednesday done; Friday Nov 20 is the capture day (2 of 3 before the
     last set, 3 of 3 after it).
   - Weights rise 5 lb on some lifts in week 46 (e.g. Walking Lunge 30 → 35 lb).

   Every number on screen (scores, sets, weights, dates, "Week 47") is what the app computed
   from those taps. No partner exists: the app can't link two phones, so the scorecard honestly
   says "Partner: Not linked", and "Recent activity" lists only the lifter's own sessions.
2. **Pro.** After the free screens are captured, Pro is bought with the paywall's test-mode
   simulated purchase ("Test mode: purchases are simulated, nothing is charged"). The paywall
   itself, with its prices, is never captured.
3. **Capture.** The real web build in Chromium at the app area of a 6.9" iPhone (440 × 868 points
   at 3x, between the status bar and the home indicator), in the app's default theme (Iron Gym,
   dark). The app's own still-render switch (`__appbuilderStill`) shows every animation's final
   state. One exception: the web Lottie player can't show a finished animation in a still render
   (lottie-react-native: "progress is not supported on web"), so the success check that appears
   on completion is left to play through once for screen 5. Some screens are scrolled so the part
   that matters is in view. Raw captures are in `captures/`.
4. **Compose.** [`spec.json`](spec.json) → `tools/store-screenshots/compose.cjs` adds the dark
   background in the app's colors, the headline (accent in the app's orange), our own plain
   phone frame (no Apple bezel), a drawn status bar and home indicator in the app's own colors,
   and one zoomed callout cut from the same capture.
5. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders (exact sizes, RGB
   with no alpha, 8 of at most 10).

To retake (about two minutes; the four weeks are replayed each time): build the web app, then
capture and compose from `spotter-pair/`:

```bash
CI=1 npx expo export -p web --output-dir <dir>
node store/screenshots/capture.cjs <dir> store/screenshots/captures
node ../tools/store-screenshots/compose.cjs store/screenshots/spec.json
python3 ../tools/store-screenshots/check_shots.py store/screenshots/6.9 --slot 6.9
python3 ../tools/store-screenshots/check_shots.py store/screenshots/6.5 --slot 6.5
python3 ../tools/store-screenshots/package_upload.py store/screenshots <out.zip>
```

The capture script serves the build on port 8135. If the app's screens change, check the
callout crops in `spec.json` (they are in app points, 440 × 868).

## Rules checked

- Only the real app with a fictional demo person; every number is the app's own result.
- No app price, trial, cost or savings anywhere in the copy, and no paywall screen.
- No ratings, reviews, testimonials, press, "#1", "best", competitor names or other platforms.
  No health or body claims and no physique talk: the copy is about showing up, not results.
- No photos (so no photo credits) and no people; the bulldog is the app's own mascot.
- No partner linking, combined score or partner feed is shown: the app doesn't have working
  versions of those, and the screens that would show them are unreachable.
- "Never weights" is checkable: the scorecard shows sessions done and due, no weights.
- Two lines per headline, at most 16 characters a line, one accent word or phrase.

## Upload

App Store Connect → Spotter Pair → the new version (create it with + next to "iOS App"; a live
version's screenshots are locked) → Previews and Screenshots → iPhone → remove old ones → drag
`01` to `08` from the folder matching the slot (6.9" or 6.5") → Save.
