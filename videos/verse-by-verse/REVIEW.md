# Review: Verse by Verse — "One verse. Then put it down." (v2)

Renders (in `renders/`, made from this folder's source):
- `verse-by-verse-v2-vertical-9x16.mp4` — 1080 × 1920, 30 fps, 21.0 s, H.264 yuv420p, no audio (Reels / Shorts / TikTok)
- `verse-by-verse-v2-16x9.mp4` — 1920 × 1080, 30 fps, 21.0 s, H.264 yuv420p, no audio (X, YouTube, site)
- `poster-v2-*.png` — frame 0 of each (also the thumbnail)

## Changes in v2
- The phone's rim was missing on the right: the frame was sized with border-box, so the 440-pt screen spilled 28 pt past its right edge. The rim now wraps the screen evenly (`boxSizing: "content-box"`). Nothing else changed.

## Test status (checked on the encoded v2 files)

| Check | Vertical | 16:9 |
|---|---|---|
| Container / spec | ✅ 21.0 s, 1080×1920, 30 fps, 630 frames, yuv420p, +faststart | ✅ 21.0 s, 1920×1080, 30 fps, 630 frames, yuv420p, +faststart |
| Loudness | n/a (silent; no audio stream) | n/a |
| Beats land (frames pulled at 0, 1.5, 2.25, 4.5, 8.85, 11, 12.75, 14.6, 16.9, 20.5 s) | ✅ 10/10 | ✅ checked at 0, 6.7, 11, 14.7, 17.3, 20.7 s |
| Frame 0 as poster | ✅ "One verse." + the reminder, legible | ✅ |
| Last frame | ✅ clean hold on the lockup | ✅ |
| Phone legibility at 360 px wide | ✅ hook, reminder, verse, share card, lockup read; the sent card in the thread is small by design (its full-size version is held in B5) | n/a |
| Determinism | ✅ frames 150, 300, 400 re-rendered in a different order are byte-identical | (same source) |
| Phone frame: rim even on all four sides | ✅ | ✅ |
| Text never over playing UI | ✅ the band sits above / beside the phone; the phone stays clear of it | ✅ |
| Truth pass | ✅ see notes | ✅ |
| Not checked | playback inside the TikTok / Instagram apps; a real music bed | — |

## Truth notes
- **Recreations:** every screen is a stylized recreation built from the app's source and App Store
  captures at the branch's current commit: the Read screen and share card follow
  `verse-by-verse/components/index/*` and `store/screenshots/captures/read-note.png` /
  `share-card.png` (labels, layout, Parchment colours; the study note is left closed). The lock
  screen, the notification and the message thread are recreations of the phone's system UI, kept
  generic.
- **Data:** Psalm 46:10–11 from the bundled World English Bible; the reminder copy from
  `components/reminder.ts`. "Mom", her message and the 8:29–8:30 pm times are scenario data.
- **Staged:** all timing is staged. The film shows the outcome of sharing (the image in a thread)
  without the system share sheet; nothing was sent.
- **Simplifications:** Gelasio (open, Georgia-metric) and Inter stand in for the phone's fonts. The
  app has no icon yet, so the notification and lockup use the app's Flourish ornament as its mark.
- **Pre-release:** the app isn't on the App Store; "Coming soon on iPhone" is a placeholder CTA.
- **Claims:** "The whole World English Bible, free to read." is true of the current build (all 66
  books, reading is free; Premium adds folders and full keyword search).

## Open choices for the team
1. The CTA once the listing is live (store badge or not).
2. An app icon to replace the Flourish mark.
3. A licensed music bed, if wanted (cut the three taps and the put-down to its beats).

## Re-render
```bash
npm install
```
```bash
npx remotion render src/index.ts VerseFilmVertical out/vertical.mp4 --codec=h264 --crf=18 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
```
Then re-encode to yuv420p limited range with `+faststart` (see the ffmpeg line in git history of this file's commit).
