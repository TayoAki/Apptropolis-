# Grappler Fig: App Store screenshots

Six iPhone screenshots, in upload order, at both sizes App Store Connect asks for:

- `6.9/`: 1320 × 2868 (the "iPhone 6.9-inch" slot)
- `6.5/`: 1284 × 2778 (the "iPhone 6.5-inch" slot)

| # | File | Headline | Line under it | Screen |
|---|---|---|---|---|
| 1 | `01-see-the-combo` | See the combo. / **Throw** it. | Every 3 seconds the next punch flashes up in big letters, until the round ends. | Train, mid-round: round 2 of 3, 01:42, LEFT HOOK (the punch zoomed) |
| 2 | `02-one-challenge-a-day` | One challenge / **every** day | Rounds, rest and punches set for your level. Prop the phone up and press start. | Train before today's session: Counter left hook drill (the challenge card zoomed) |
| 3 | `03-streak` | Challenge **done**. / Streak: 7 days. | +39 XP, saved when the last round ends. Train tomorrow to make it 8. | Train right after the challenge: Session logged, +39 XP, Done (the streak badge zoomed) |
| 4 | `04-ask-for-a-drill` | Ask a question, / get a **drill** | Say what keeps going wrong. The answer comes with a round to run. | Corner coach: "My jab drops after the cross. Why?", the answer and its drill (the drill zoomed) |
| 5 | `05-drill-on-the-timer` | The drill loads / on the **timer** | One tap on the answer: its punches, rounds and rest, ready to start. | Train with the coach's drill loaded (its punches zoomed) |
| 6 | `06-scout-a-partner` | Scout a partner, / drill the **plan** | One photo in, a 3-round plan out. | **Pro.** The app's labelled sample scouting report (the three rounds zoomed) |

The first three carry what is different about Grappler Fig: the punch to throw is on screen (no
voice), there is a challenge each day, and finishing it moves the streak and XP. The one Pro
feature shown (opponent scouting) carries a "Pro" badge. Coach questions are free (3 a day), so
5 and 6 have no badge; the free-quota line and "Go Pro" link show in 5 as the app shows them.

## How they were made

1. **Demo boxer.** A fictional person with no name in the app: level "Some training", heavy bag,
   orthodox (set as onboarding answers). Their history was made by the app: [`capture.cjs`](capture.cjs)
   sets the phone's date with Playwright's `page.clock` to each training day (Nov 4 to 13, 2026,
   with Saturday the 7th off), presses Start round or Start challenge, and fast-forwards the clock
   through every round and rest, so the Train screen logs each session to App Cloud as it would on
   a phone. Today (Saturday Nov 14, 7:02 AM) the streak reads 6; the challenge is run on camera and
   makes it 7. Every number on screen (streak, XP, level, rounds per day, Fight night stats) is the
   app's own arithmetic on those sessions.
2. **Mid-round.** The clock is paused 78.4 seconds into round 2, while "Left hook" is showing.
3. **AI.** One real coach question per run (a suggested question the app offers); its fix becomes
   the Coach's top fix on the Fight night card. No other AI call is made.
4. **Scouting.** Shot 7 is the sample report the app ships with: it is labelled "Sample report" and
   its title starts "Sample:". No photo was read: the rules allow no recognizable people, so no
   opponent frame was used.
5. **Capture.** The real web build in Chromium at the app area of a 6.9" iPhone (440 × 868 points
   at 3x), in the app's default theme (Ringside, dark). Raw captures are in `captures/`.
6. **Compose.** [`spec.json`](spec.json) → `tools/store-screenshots/compose.cjs`: background,
   headline, our own plain phone frame (no Apple bezel), a drawn status bar and home indicator in
   the app's colors, and one zoomed callout cut from the same capture. Colors are Ringside's
   (background `#0A0A0B`, surface `#22242A`, red `#FB4E4A`, muted `#9BA1AA`).
7. **Check.** `tools/store-screenshots/check_shots.py` passes for both folders (exact sizes, RGB
   with no alpha, 7 of at most 10).

To retake (a run makes a fresh anonymous App Cloud account, about 2 minutes, one AI call; the
coach's words will differ, so check the callout crop in `spec.json` for shots 5 and 6):

```bash
CI=1 npx expo export -p web --output-dir <dir>
```

```bash
node store/screenshots/capture.cjs <dir> store/screenshots/captures
```

```bash
node ../tools/store-screenshots/compose.cjs store/screenshots/spec.json
```

## Rules checked

- Only the real app, with a fictional demo boxer and numbers the app produced.
- No price, trial, cost or savings anywhere in the headlines or lines under them, and no paywall
  screen.
- No ratings, reviews, press, "#1", "best", competitor names or other platforms. No health or body
  claims. Nothing says or suggests the punches are spoken: the copy says they flash up.
- No photos at all (so no credits needed), no people, no Apple bezels.
- Pro: shot 6 has the badge. The lock beside "Change" in 2 and the camera lock and "Go Pro" link
  in 4 are the app's own markers on locked controls. A Progress screenshot was dropped because the
  top of the Pro-only Nutrition log card shows at its foot with no Pro badge, and no scroll
  position hides it.

## Upload

App Store Connect → Grappler Fig → the new version (create it with + next to "iOS App"; a live
version's screenshots are locked) → Previews and Screenshots → iPhone → remove old ones → drag
`01` to `07` from the folder matching the slot (6.9" or 6.5") → Save.
