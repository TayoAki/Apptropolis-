# Storyboard: Verse by Verse — "One verse. Then put it down." (v1)

**Runtime:** 21.0 s · **Masters:** 1080 × 1920 @ 30 fps (vertical), 1920 × 1080 @ 30 fps (16:9)
· **Sound plan:** silent

## Beat sheet

| # | Time | Beat | Lands on |
|---|---|---|---|
| B1 | 0:00–0:02.6 | Hook: lock screen at 8:30 pm, the reminder already showing ("Pick up where you left off / Your verse is waiting, right where you stopped."). Text hook "One verse." in the band from frame 0 (= poster) | frame 0 |
| B2 | 0:02.6–0:03.2 | A finger taps the reminder; it opens the app | press at 2.25 s |
| B3 | 0:03.2–0:08.8 | Read: Psalms 46:10, the place kept. Camera eases in; hold to read (22 words ≈ 5 s) | — |
| B4 | 0:08.8–0:09.5 | Finger taps Share on the card's rail; the share card rises | press at 8.85 s |
| B5 | 0:09.5–0:12.6 | Payoff artifact: the verse as a card (reference, ornament, verse, "Verse by Verse · World English Bible"). Hold | — |
| B6 | 0:12.6–0:15.4 | Finger taps "Share card"; the card lands in a message to Mom; "Delivered" | press at 12.75 s |
| B7 | 0:15.4–0:18.2 | The screen goes dark and the phone drops away. "Then put it down." lands under "One verse." | 16.2 s |
| B8 | 0:18.2–0:21.0 | Close: the Flourish, "Verse by Verse", "The whole World English Bible, free to read.", CTA "Coming soon on iPhone". Clean hold | — |

## Shot cards

### B1 Hook
- **Shot:** recreated lock screen (system UI) in our plain phone frame; notification card with the
  app's mark. Band above the phone: "One verse." (Gelasio, 104 px).
- **Camera:** still; the phone breathes 0.6% scale. **Touch:** enters from the bottom edge at 1.0 s,
  arcs to the notification. **Hold:** 2.2 s (hook + 12-word notification).

### B2 Open
- **Touch:** press at 2.25 s inside the notification. **Change:** the notification scales up into the
  app (2.35–2.95 s). The touch leaves off the right edge.

### B3 Read
- **Shot:** Read screen: "Psalms 46:10" pill, Chapter, settings; the verse card with its rail (Save,
  Share, Full context, Study note); Verse 9 / Next · Verse 11; "Continue in Psalms 46" with 46:11.
- **Camera:** push 1.00 → 1.12 from the top of the screen (3.3–4.6 s), hold to 8.8 s.

### B4 Share
- **Touch:** enters from the right edge at 7.9 s, press on Share at 8.85 s (inside the rail item).
  **Change:** the share sheet rises (8.95–9.45 s).

### B5 Card
- **Shot:** the share card at Psalms 46:10, "Share card" button, "Done". **Camera:** push onto the card
  (9.5–10.6 s), hold to 12.6 s.

### B6 Send
- **Touch:** from the bottom edge at 11.9 s, press on "Share card" at 12.75 s. **Change:** the card
  shrinks into a message bubble in a thread with Mom (12.9–13.6 s); "Delivered" at 14.0 s. Hold.

### B7 Put it down
- Screen fades to black (15.4–16.1 s); the phone eases down and out (15.7–17.4 s). Kinetic type:
  "Then put it down." (16.2–16.7 s in), hold.

### B8 Close
- Lockup in from 18.2 s; clean hold from 18.9 s to 21.0 s.

## Sound plan
- Silent. If a music bed is approved later: cut B2, B4 and B6 presses to beats, B7 to a release.

## Truth notes
- **Recreations:** every screen is a stylized recreation. Read screen and share card follow
  `verse-by-verse/components/index/*` and `store/screenshots/captures/read-note.png` /
  `share-card.png` (same labels, layout and Parchment colours); the study note is left closed.
  Lock screen, notification and message thread are recreations of the phone's system UI, kept
  generic (no platform branding).
- **Data:** Psalm 46:10–11 text from the bundled World English Bible (`data/bible/PSA.json`); the
  reminder copy from `components/reminder.ts`. "Mom" and the 8:30 pm time are scenario data.
- **Staged:** all timing is staged. Sending the card is the system share sheet's job; the film
  shows its outcome (the image in a thread) without the sheet, and nothing was sent.
- **Simplifications:** fonts are Gelasio (open, Georgia-metric) and Inter, not the phone's
  system fonts. The app has no icon yet: the notification and lockup use the app's own Flourish
  ornament as its mark.
- **Pre-release:** the app isn't on the App Store; the CTA is a placeholder.

## Checkpoint tests (see REVIEW.md after render)
- Frame 0 as poster · muted comprehension · 360 px legibility · every shot earns its time.

## Open choices for the team
1. The CTA line once the listing is live (and whether to add the store badge).
2. An app icon to replace the Flourish mark in the notification and lockup.
3. A licensed music bed, if you want sound.
