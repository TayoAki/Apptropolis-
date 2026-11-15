# Building the film in Remotion

Remotion renders React to video frame by frame. That makes it ideal for this job: the recreated UI is React
components, and determinism comes from making every frame a pure function of `useCurrentFrame()`.

## Project layout (one film per folder)

```
src/remotion/<film>/
  ProductFilm.tsx       the composition: beats, camera, cursor, layers
  script.ts             the timing map: every beat's start and end in seconds, derived from VO word timings
  camera.ts             camera keyframes and interpolation
  cursor.tsx            the cursor actor (arcs, press state)
  brand.ts, brand.md    the brand kit
  fonts.ts              FontFace loading with delayRender
  audio.tsx             music and narration layers, with the ducking envelope
  ui/*.tsx              the recreated surfaces, as parameterized components
  STORYBOARD.md         the board: beat sheet, shot cards, sound plan, truth notes
video/public/           Remotion's public dir: fonts/, audio/ (kept out of the website's own public/ folder)
```

Register each composition in the Remotion root:
- `ProductFilm` (1920×1080, 60 fps);
- `ProductFilmAnimatic` (the same film at 30 fps, rendered at scale 0.5);
- `ProductFilmVertical` (1080×1920, 30 fps).

Point Remotion at its own public dir, so audio and fonts aren't served by the website:

```ts
// remotion.config.ts
Config.setPublicDir("video/public");
```

## Determinism rules
- **No hidden inputs.** No `Math.random()`, `Date.now()`, timers or network data. Use seeded noise (a hash of the frame
  and an index) when you need texture.
- **Pure functions of time.** All state at frame N comes from N: which beat is active, the camera position, the
  cursor position, how many characters have been typed, which rows have appeared.
- **Check it.** Re-render 3–4 frames out of order (`npx remotion still … --frame=N`) and compare bytes with earlier
  renders. They must match.

## Timing from the voice (when there is narration)
- Put the word timings (`vo_words.json`, from `scripts/analyze_audio.py`) next to the composition, and derive every
  beat's start from the word that introduces it:
  `const at = (word, nth = 0) => words.filter(w => w.w.toLowerCase().startsWith(word))[nth].s;`
- A new voice take is then re-timed by swapping the JSON.
- Visuals land on the phrase that introduces them, never before.

## Camera
- Model one camera as `{ x, y, scale }` over a full-resolution canvas (e.g. 3840×2160 world units).
- Keyframes per beat: `[{ t: 9.6, x, y, scale, ease: "inOut" }, …]`. Interpolate with Remotion's `interpolate` and
  `Easing.bezier(...)`, and hold between keyframes.
- Apply it as a single CSS `transform` on the canvas container. The dim layer for non-subject panels is a separate
  overlay keyed to the same beats.

## Cursor
- Each move is `{ from, to, t0, t1, bow }`. Its position is a quadratic Bézier with a control point offset
  perpendicular to the path by `bow` px.
- Its press state shows for about 6 frames at the click time. The UI's state change keys off the same click time plus
  4–10 frames.
- Draw the cursor in screen space (after the camera transform), at a constant size.

## Fonts
- Load them with the FontFace API and `staticFile("fonts/…woff2")`.
- Block rendering until they're ready with `delayRender()` and `continueRender()`. Otherwise frame 0 renders in a
  fallback font.

## Audio
- Use `<Audio src={staticFile("audio/music.wav")} startFrom={offsetFrames} volume={(f) => envelope(f)} />` and a
  separate `<Audio>` for the narration at unity.
- Compute the ducking envelope from the word timings (see `audio.md`).

## Rendering

```bash
# styleframes: one still per beat, plus frame 0
npx remotion still src/remotion/index.ts ProductFilm out/<film>/styleframes/B01.png --frame=<n>
# animatic, for the checkpoint
npx remotion render src/remotion/index.ts ProductFilmAnimatic out/<film>/animatic.mp4 --scale=0.5
# master
npx remotion render src/remotion/index.ts ProductFilm out/<film>/master-16x9-60fps.mp4 \
  --codec=h264 --crf=16 --pixel-format=yuv420p --audio-codec=aac --audio-bitrate=320k
# LinkedIn copy: the same composition at 30 fps (a separate registration, or --fps=30 if supported)
# vertical
npx remotion render src/remotion/index.ts ProductFilmVertical out/<film>/vertical-9x16.mp4 --crf=18
# web preview for the review page (about 2 Mbit/s, under 14 MB)
ffmpeg -i master.mp4 -vf scale=1280:-2 -c:v libx264 -b:v 2M -maxrate 2.5M -bufsize 5M -c:a aac -b:a 128k \
  -movflags +faststart web-preview.mp4
```

**Rendering time and memory:**
- On a 4-CPU machine, 1080p60 renders at a few frames per second, so a 45 s master takes several minutes.
- Run one render at a time.
- Use `--concurrency` to trade memory for speed if renders get killed (exit 137 means out of memory).

## Vertical recomposition
- Don't crop. Give the vertical its own camera keyframes per beat.
- Stack side-by-side surfaces vertically, and push into dense artifacts so their key rows read at 360 px.
- Burn the captions into a band, clear of the subject and the platform's UI zones (the bottom ~20% and the right
  ~10%).
- Render the text hook from frame 0 if there's a speaker.
