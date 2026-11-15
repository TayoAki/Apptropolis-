# Team memory: Apptropolis (six Expo apps in one repo)

Read this at the start of every job. Save every correction as a rule with its reason.

## Product and access
- Repo: tayoaki/apptropolis- (apps in `<app>/`, films in `videos/<app>/`)
- Product URLs: none live; evidence is each app's web build (`CI=1 npx expo export -p web`) and its
  App Store captures in `<app>/store/screenshots/captures/`
- Local build command: see each app's README; Remotion renders need
  `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
  in the cloud container (Remotion can't download its own browser there).
- Stored login: none needed.

## Brand kit
- Verse by Verse: `videos/verse-by-verse/src/brand.ts` (Parchment tokens from `verse-by-verse/theme/tokens.ts`)
- Five Dinners: `videos/five-dinners/src/brand.ts` (Larder tokens from `five-dinners/theme/tokens.ts`;
  Inter for the system sans, Ionicons; Penny the bag mascot in `public/penny-*.png`, from the app's own
  image URLs in `five-dinners/data/images.ts`)
- Fonts: Gelasio (OFL, Georgia-metric stand-in for the app's Georgia), Inter (OFL), Ionicons (MIT,
  the app's icon font) in `videos/verse-by-verse/public/fonts/`
- Logo / lockup: none yet (no app icon); the app's Flourish ornament + "Verse by Verse" in Gelasio
- CTA copy that is true today: "Coming soon on iPhone" (not on the App Store yet)

## Recreated surfaces (reuse them)
| Surface | Component path | States built |
|---|---|---|
| Verse by Verse Read screen (verse card + rail, prev/next, continue) | videos/verse-by-verse/src/ui/screens.tsx `ReadScreen` | Psalms 46:10, Share pressed |
| Verse by Verse share card + sheet | `ShareCard`, `ShareSheet` | idle, button pressed |
| Generic lock screen + app notification | `LockScreen`, `Notification` | reminder copy |
| Generic message thread | `Thread` | incoming message, sent image, Delivered |
| Status bar, home bar, tab bar, Flourish, AppMark | videos/verse-by-verse/src/ui/parts.tsx | — |
| Five Dinners Week screen (basket, five dinners, What's left bar) | videos/five-dinners/src/ui/screens.tsx `WeekScreen` | week 1 (Nov 15–21), week 2 planned around leftovers |
| Five Dinners Shop screen (estimate, paid so far, by aisle, produce rows) | `ShopScreen` | onions / spinach ticking 0 → 1 |
| Five Dinners Cook screen (week circles, dinner cards, What's left) | `CookScreen` | Monday next → cooked, bars filling |
| Five Dinners status bar, tab bar (Week/Shop/Cook), meter, recipe photo | videos/five-dinners/src/ui/parts.tsx | — |
| Screen check against the app's captures | videos/five-dinners/src/ScreenCheck.tsx | all four end states at 1 px/pt |

## Taste (approved)
- Camera and pacing: frame each subject close (reminder, verse card, share card, thread); holds
  dominate; keep the phone below the text band so type never sits on UI.
- Caption style: no narration so far; text hook in a band from frame 0.
- Music: none approved; ship silent.
- Runtime and aspect defaults: ~20 s; vertical 1080×1920 @ 30 is the master for these consumer apps,
  plus a recomposed 16:9.

## Rules (each with its reason)
- Give the phone's rim div `boxSizing: "content-box"` (or size it as screen + 2 × rim): Remotion's
  default is border-box, which squeezed the rim and let the screen spill out of the right side (v1 of
  the Verse by Verse film shipped with this; the owner caught it).
- Re-encode Remotion output to yuv420p limited range with +faststart: Remotion's JPEG frames come out
  as full-range yuvj420p, which some social players show with crushed tones.
- Never say "one verse at a time" or "scroll the Bible" for Verse by Verse: it is Scroll The Bible's
  own App Store copy (see the competitor research).
- Measure recreated screens from the app's own 3x captures (pt = px / 3, add the 54 pt status bar)
  and check them side by side at 1 px/pt before filming: it caught a misplaced list and a wrong
  title wrap on the Five Dinners screens.
- Keep the top edge of the phone in view in every frame, under the type band: the owner reads a
  phone cropped at the top (by a fade window or the frame edge) as broken (Five Dinners v1). Fix the
  phone's top on the canvas and change only the scale; for the tab bar, pull back to the whole phone.
  If the band needs the room, show its lines one at a time in the vertical cut.
- Label paid features where they appear (Five Dinners: "With Unlimited weekly plans"), with no price.
- Keep the 360 px check on the hook: zoom the reminder until its text reads, but never let the phone
  cover the band.

## Films made
| Version | Date | Cuts | Notes |
|---|---|---|---|
| Verse by Verse v1 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | rim missing on the right; replaced |
| Verse by Verse v2 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | videos/verse-by-verse/renders/ |
| Five Dinners v1 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | top of the phone out of view; replaced |
| Five Dinners v2 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | videos/five-dinners/renders/ |
