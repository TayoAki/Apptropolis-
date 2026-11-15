# Review: Five Dinners — "Five dinners. One list. Leftovers first." (v1)

Renders (in `renders/`, made from this folder's source):
- `five-dinners-v1-vertical-9x16.mp4`: 1080 × 1920, 30 fps, 21.0 s, H.264 yuv420p, no audio (Reels / Shorts / TikTok)
- `five-dinners-v1-16x9.mp4`: 1920 × 1080, 30 fps, 21.0 s, H.264 yuv420p, no audio (X, YouTube, site)
- `poster-v1-*.jpg`: frame 0 of each (also the thumbnail)

## Test status (checked on the encoded v1 files)

| Check | Vertical | 16:9 |
|---|---|---|
| Container / spec | ✅ 21.0 s, 1080×1920, 30 fps, 630 frames, yuv420p limited range, bt709, +faststart, video only | ✅ same at 1920×1080 |
| Loudness | n/a (silent; no audio stream) | n/a |
| Beats land (frames pulled at 0, 2.75, 5.25, 6.3, 8.35, 10.05, 11.3, 12.5, 14.8, 19.5 s) | ✅ 10/10 | ✅ 10/10 |
| Frame 0 as poster | ✅ "Five dinners." + the week, $44.20 of $65.00 | ✅ |
| Last frame | ✅ clean hold on the lockup | ✅ |
| Legibility at 360 px wide | ✅ band, totals, paid so far, ticks, What's left, Carried over and the lockup read; the shop rows' small print is small by design | n/a |
| Screens against the app's captures | ✅ Week 1, Shop, Cook, Week 2 rendered at 1 px/pt beside `five-dinners/store/screenshots/captures/*.png`: same labels, numbers, layout within ~2 pt | (same source) |
| Determinism | ✅ frames 315, 150, 315, 432 rendered out of order: the two 315s are byte-identical | (same source) |
| Phone rim even on every visible side | ✅ 22 px left, right and bottom | ✅ 17 px |
| Type never over playing UI | ✅ the band sits above the phone's window | ✅ band on the left |
| Taps cause the change | ✅ Shop tab → Shop; tick → row ticked, totals update; Cook tab → Cook; Mark cooked → cooked + What's left | ✅ |
| Not checked | playback inside the TikTok / Instagram apps; a music bed | — |

## Truth notes
- **Recreations:** every screen is a recreation built from the app's source and its App Store
  captures at this branch (`five-dinners/app/(tabs)/*`, `components/shop/Row.tsx`,
  `components/cook/DinnerCard.tsx`, `store/screenshots/captures/*.png`). Labels, numbers, colours
  (Larder theme) and layout follow them; the bag mascot (Penny) is the app's own image.
- **Data:** the demo household the screenshot script builds through the real app: 4 people, $65
  budget, no pork, prices from the app's Aldi ZIP 60601 table dated Nov 15. Week 1 $44.20, week 2
  $51.68, the carried-over packs and the "Uses …" lines are the app's own numbers for that household.
- **Staged:** all timing is staged. The film ticks Yellow onions and Spinach (shown unticked first);
  "Paid so far" uses each ticked pack's estimate, as the app does when no price is typed in. The cut
  from Cook to the next week is a time jump (no tap), and the Tuesday–Friday cooking in between is
  not shown.
- **Paid feature:** planning the next week around the leftovers needs Unlimited weekly plans (a
  one-time purchase in the app). The film labels it "With Unlimited weekly plans" and shows no price.
- **Pictures:** the recipe pictures are AI-generated illustrations, not photos of the recipes as
  cooked; the app says so on the recipe page and in Settings.
- **Claims:** none about savings, health or AI. "Five dinners a week. One list, in whole packs." is
  what the app does today.
- **Naming:** "Aldi" appears only where the app itself shows its price source ("Aldi · ZIP 60601").
  Whether to show a store's name in marketing is a trademark question for the owner.
- **Pre-release:** the app isn't on the App Store; "Coming soon on iPhone" is a placeholder CTA.
- **Fonts:** Inter stands in for the phone's system font (the app uses the system sans).

## Open choices for the team
1. Keep or blur "Aldi" in the marketing cut (see Naming).
2. The CTA once the listing is live (store badge or not).
3. A licensed music bed, if wanted (cut the four taps and the week jump to its beats).

## Re-render
```bash
npm install
```
```bash
npx remotion render src/index.ts FiveDinnersVertical out/v1-vertical-raw.mp4 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
```
```bash
ffmpeg -i out/v1-vertical-raw.mp4 -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 18 -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart -an renders/five-dinners-v1-vertical-9x16.mp4
```
Same for `FiveDinnersLandscape`. `ScreenCheck` renders the four screens at 1 px per point for
comparing with the app's captures.
