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
- Keep the 360 px check on the hook: zoom the reminder until its text reads, but never let the phone
  cover the band.

## Films made
| Version | Date | Cuts | Notes |
|---|---|---|---|
| Verse by Verse v1 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | rim missing on the right; replaced |
| Verse by Verse v2 | 2026-11-15 | vertical 9:16, 16:9 (21 s, silent) | videos/verse-by-verse/renders/ |
