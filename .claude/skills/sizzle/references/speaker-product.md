# Speaker + Product: the edit

Contents:
1. Source rules
2. The package
3. Lines
4. Hook
5. Structure
6. B-roll modes
7. Speaker framing
8. Finish
9. The paper edit
10. The cut in code
11. A recording guide to send the speaker

## 1. Source rules
- **Real footage of a real person.** Never generate, clone, dub or invent a speaker's words. Never speed up the voice,
  and never substitute an avatar.
- **If the team sends a synthetic voice instead of footage,** that voice belongs on a Product Film, not on a speaker
  cut. Say so, and ask for footage.

## 2. The package
- **Default:** when the footage supports it, two recorded hooks (A and B), each authored natively in 9:16 and 16:9.
  That's four cuts on one review page.
- **Smaller briefs:** follow them exactly (e.g. "use hook B" gives two cuts).
- **Order:** cut the verticals first, then apply the approved storyboard to the horizontals.

## 3. Lines
- **Scripted footage:**
  - Keep every completed line and clause unless the team approves a removal.
  - Choose the best take. Remove only slates, dead air, retakes and false starts.
  - The recorded opening line is the spoken hook. Never rewrite it.
- **Unscripted footage (interviews, customer calls, podcasts):**
  - Select clips on clean speech boundaries.
  - Open on what the product is before any proof figure.
  - Keep each claim's wording and qualifiers intact.

## 4. Hook
Three layers land together in the first one to three seconds and point at one idea:
1. **The spoken hook.**
2. **A visual hook** that reads paused and muted (e.g. a product snippet beside the speaker showing the payoff).
3. **A text hook** of 3–7 bold words, on screen from frame 0 and never over the face.

Never ship a vertical cut without a text hook.

## 5. Structure
- Open on the speaker, and bring the product in within about a second.
- Let the product carry most of the middle.
- Cut back to the speaker for lines that need a face: claims, personal lines and emotion.
- Close on the brand end card while the final line plays, not on the speaker.
- Every visual appears on the phrase that introduces it, never before. The payoff waits until the speaker gets there.
- Joins are clean, with no dead air and no clipped word endings. Cut 2–4 frames after a word's end, and never inside a
  breath you can hear.

## 6. B-roll modes (chosen moment by moment)

**Full cutaway.** The product fills the frame while the speaker's voice continues.
- Enter and exit on phrase boundaries, never mid-word.
- Use it to show what's being described, to hide a jump cut or take change, and to cover every moment the speaker
  reads notes or looks away.

**In-shot snippet.** The speaker stays in the shot, and product cards fill the negative space.
- **16:9:** the speaker usually sits right of centre, with the product in the open space on the left. The card can
  expand into the full cutaway and shrink back, as one surface at two sizes.
- **9:16:** snippets sit in the headspace, beside the speaker, or at chest height.
- Compose snippets around the face, the captions and the text hook. Never cover the face.
- **Avoid:** the clichéd vertical split screen, with the product on the top half and the speaker on the bottom (or the
  reverse).

**Craft and customer stories.**
- Product snippets get the same evidence, camera and cursor craft as a Product Film. Never use raw screen-recording
  dumps.
- A customer-story insert plays silently under the customer's voice, with its beats mapped to the clauses of the
  quote.

## 7. Speaker framing
- Use one stable medium crop. A centred second size from a locked camera is fine for cutting on breaths.
- Don't add face tracking, synthetic punch-ins or camera moves on the speaker. Camera moves belong to the product
  layer.

## 8. Finish
- **Captions:** on by default. Short, source-timed cues that keep every spoken word and stay clear of faces and UI.
  Brand styling only if legibility holds.
- **Colour:** natural. Skin looks real and nothing looks graded.
- **Voice:** the original, with light treatment only: a high-pass at 70–80 Hz, gentle de-essing if needed, and loudness
  normalization. No speed or pitch change.
- **Music:** only when requested. It must be licensed, and it sits well under the voice (see `audio.md`).

## 9. The paper edit (the storyboard for this format)

Present it as a table before cutting:

| # | Line (as spoken) | Take | Source in → out | Mode | B-roll shot | Lands on word |
|---|---|---|---|---|---|---|
| 1 | "Studying for a data certification? …" | T3 | 00:41.20 → 00:45.90 | on camera + snippet | Check flips to Correct! | "queries" |

Add:
- **A line-coverage ledger:** every scripted line with ✓ or the reason it's missing.
- **The three hook layers,** with the time each lands.
- **The b-roll plan:** mode, shot, in and out points.

## 10. The cut in code

1. **Transcribe the footage** with word timestamps: `scripts/analyze_audio.py <footage.wav> - OUT`. Pass `-` for the
   music if there is none. Extract the audio first:
   `ffmpeg -i clip.mov -vn -ac 1 -ar 16000 clip.wav`.
2. **Choose takes** by comparing the transcript to the script. Write an edit decision list (EDL) as JSON:
   `[{ "line": 1, "file": "A001.mov", "in": 41.20, "out": 45.90 }]`.
3. **Build a Remotion composition** that plays each EDL segment with `<OffthreadVideo startFrom endAt>`, layers the
   product snippets and cutaways from the shared recreated UI components, and renders the captions from the word
   timings.
4. **Render** the vertical first, then the horizontal.

## 11. A recording guide to send the speaker
- **Camera:**
  - Hold the phone horizontally (landscape), at eye level, about 1–1.5 m away. Use 4K if available, at 30 fps.
  - Lock it on a stand: no zooming or moving it.
  - Frame from mid-chest up, slightly right of centre, with the head and shoulders inside the middle third. That one
    recording yields both the 16:9 cut and the 9:16 cut.
- **Light:** face a window or soft light, with nothing bright behind.
- **Sound:**
  - A quiet room with soft furnishings.
  - A wired-earbud or clip-on mic beats the phone's own mic.
  - Record 5 s of room tone.
- **Takes:**
  - Two takes of each line, and three of the hook.
  - Pause before and after each. Restart a stumbled line rather than stopping.
  - Look into the lens.
- **Sending:** send the original files, not copies compressed by a messaging app.
