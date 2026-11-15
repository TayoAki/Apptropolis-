# Brief: Verse by Verse — "One verse. Then put it down."

- **Format:** Product Film (no footage; the product is the star). Recreated UI, in code.
- **Story:** feature launch of the core habit, in one sentence: the one quiet reminder opens your
  verse right where you stopped; you read it, share it as a card, and put the phone down.
- **Audience:** Christians who want a calm, low-pressure daily Scripture habit; people tired of
  streak-and-feed Bible apps.
- **Destinations:** Reels / Shorts / TikTok (vertical master), plus a 16:9 cut for X, YouTube or
  the site.
- **Runtime:** 21 s — the shortest that lands hook → read → share → put down → close.
- **Masters and cutdowns:** vertical 1080 × 1920 @ 30 fps (master); 16:9 1920 × 1080 @ 30 fps,
  recomposed shot by shot (not cropped).
- **Sound:** silent. It must read muted; no music bed has been supplied or approved.
- **Captions:** none needed (no narration). The text hook is on screen from frame 0.
- **Product evidence:** the repo at `verse-by-verse/` (commit on branch
  `claude/dazzling-hypatia-ccf0t9`), its web build, and the App Store captures in
  `verse-by-verse/store/screenshots/captures/` (read-note.png, share-card.png). Copy and data come
  from source: `components/reminder.ts` (REMINDER_COPY), `data/bible/PSA.json` (Psalm 46:10–11,
  World English Bible), `theme/tokens.ts` (Parchment).
- **Brand:** `videos/verse-by-verse/src/brand.ts` (Parchment tokens, Gelasio for Scripture as the
  open stand-in for Georgia, Inter for UI, the app's Flourish ornament as the mark).
- **Truth boundary:**
  - may show: the reminder notification (its real copy), the Read screen at Psalm 46:10, the
    share card and its Share card button, the card sent in a message thread (staged outcome of the
    system share sheet).
  - must not show or claim: streaks, "one verse at a time" / "scroll the Bible" (a competitor's
    copy), user counts, ratings, AI, a store badge or price, "verified", anything Premium unlabelled.
  - naming rules: none known.
  - pre-release: the app is not on the App Store yet; the CTA says "Coming soon on iPhone".
- **CTA and URL:** "Coming soon on iPhone" (placeholder until the listing is live).
