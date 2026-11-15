# Release review and delivery

Review the **encoded files**, not the source or the stills. Encoding can drop frames, shift audio or crush text.

## Checklist (run it for each cut)

**1. Container.** Check that the duration, fps, resolution, codec, pixel format and audio stream are what the brief
says:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate -of compact FILE
```

**2. Loudness.** Run `scripts/loudness.sh FILE`. The targets are about −14 LUFS integrated and a true peak at or below
−1 dBTP (silent films: no audio stream, or digital silence).

**3. Sync.** Pull a frame at each beat time and look at it:

```bash
scripts/frame_pulls.sh FILE out/qa 0 9.92 14.30 15.88 31.74 37.78
```

At each frame, check:
- the visual has landed on its word;
- nothing is clipped;
- the captions don't cover the subject;
- the cursor isn't parked on the text.

**4. First and last frames.**
- Frame 0 is the poster: moving, legible and on brand.
- The last frame is a clean hold on the lockup.

**5. Determinism.** Re-render 3–4 frames out of order and compare them with the encoded frames visually, or the stills
byte for byte.

**6. Phone legibility.** Scale frames of the vertical (and of the master) to 360 px wide and read them. The key text
must read.

**7. Truth pass:**
- no staged timing shown as measured;
- no unavailable features;
- naming rules followed;
- scenario data coherent across shots;
- recreations labelled in the notes.

**8. Playback.**
- Open the file in a browser `<video>` element: it starts fast (`+faststart`) and seeks.
- The audio and video lengths match.

Fix what fails, re-render and re-check. Report what you checked, honestly, including what you didn't.

## Delivery

**One private review page** with:
- each cut playing in its viewing context: a feed-width player for social, a full-width hero for the site, a phone
  frame for the vertical;
- the poster and thumbnail frames;
- the test status table (below);
- the truth notes;
- links to the editable source (paths and commit).

When an artifact or page tool is available, publish privately. Embed a web-preview encode (under about 14 MB per file);
the full masters are delivered as files beside the page, never replaced by the page.

**Files to deliver:**
- the master;
- each cutdown;
- the SRT;
- the posters;
- the source commit.

Keep everything private by default. Public links and external archives need the user's say-so.

**Test status table:**

| Check | Master | LinkedIn | Vertical |
|---|---|---|---|
| Container / spec | ✅ 44.5 s 1920×1080 60 fps | … | … |
| Loudness / true peak | −14.1 LUFS / −1.3 dBTP | … | … |
| Sync at beat times | ✅ 9/9 | … | … |
| Phone legibility | n/a | n/a | ✅ |
| Truth pass | ✅ (notes) | … | … |
| Not checked | — | — | — |
