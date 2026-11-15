---
name: sizzle
description: >-
  Product demo video studio. Makes launch-ready demo videos of a software product in two signature formats.
  A Product Film recreates the product's UI as deterministic code, with a virtual camera, a causal cursor and paced
  holds. A Speaker + Product cut edits real talking-head footage with product b-roll. Use this skill whenever someone
  wants any of these, even if they never say Sizzle: a product demo, launch video, feature video, sizzle reel, promo
  or marketing video of their app; a changelog clip, or a video for a launch post on X, LinkedIn, Reels, Shorts or
  TikTok; a site hero video; phone footage turned into a launch video with product shots; cutdowns (9:16, 1:1, 4:5),
  captions or a storyboard/animatic for a product video; or "make it feel like this" with a reference video. It
  isn't for AI avatar or presenter videos, generated live-action films, or non-product videos.
---

# Sizzle: product demo video studio

Sizzle makes two signature formats, and everything it makes serves one of them:

1. **Product Film.** There's no presenter: the product is the star.
   - The interface is recreated faithfully, in code.
   - A virtual camera pushes in and settles with intent.
   - The cursor drives real cause and effect.
   - The pacing gives every feature time to land.
2. **Speaker + Product.** Real footage of a real person (a founder, PM, engineer or customer) talking about the
   product, cut with product b-roll. The b-roll is either a full cutaway or a product snippet composited beside the
   speaker.

**Why recreate the UI instead of screen-recording it?** A real UI is built for working in. A launch video is watched as
a thumbnail in a feed. Rebuilding the surface in code gives you creative control:
- enlarge what matters and hide clutter;
- keep scenario data coherent;
- move one camera over a full-resolution canvas;
- re-render any frame when the UI changes.

That control is the whole craft, so don't fall back to screen recordings.

## Start every job here

1. **Read the team's memory.** Look in `memory/<team>.md` in this skill folder. Copy `memory/_template.md` if the team
   is new. Memory holds:
   - the brand kit's location;
   - product URLs and logins;
   - the surfaces already recreated;
   - approved taste and past corrections.

   Reusing it is what makes the second video fast.
2. **Classify the request.**
   - If speaker footage is supplied or requested, it's **Speaker + Product**.
   - If you only have the product (a URL, a PR, screenshots, recordings, Figma frames or a feature description), it's
     a **Product Film**.
   - If you can't tell, ask once and offer the two formats.
3. **Work the five stages below in order.** Each has a reference file with the method. Load only what the format
   needs.

## The five stages

### 1. Brief
Capture these in one pass, using `assets/brief-template.md`:
- the feature or story;
- audience and destination;
- runtime and aspect ratios;
- product evidence;
- brand;
- the **truth boundary**: what may and may not be shown or claimed.

Infer routine choices from the destination table below. Ask one consolidated question, and only about what actually
blocks you:
- product evidence, for a Product Film;
- footage, for Speaker + Product;
- a brand you can't discover.

| Destination | Master | fps | Typical runtime | Captions |
|---|---|---|---|---|
| Site hero | 16:9, 1920×1080 | 60 | 30–50 s | none burned in: it autoplays muted and must read without them |
| X / LinkedIn feed | 16:9, plus 1:1 or 4:5 recomposed | 60 for X, ≤ 30 for LinkedIn | 20–45 s | SRT; burn them in only if there's narration and the frame has a band for them |
| Reels / Shorts / TikTok | 9:16, 1080×1920 | 30 | 15–45 s | burned in, plus a text hook from frame 0; keep the bottom ~20% and the right ~10% clear for platform UI |
| YouTube | 16:9 | 60 | any | SRT |
| Changelog / docs | 16:9 | 30 or 60 | 6–20 s (feature clip), often looping | none |

When neither the brief nor the destination sets the runtime, choose the shortest one that lands the story, and state
it.

### 2. Brand and evidence
- **Brand kit.** Build it once (colours, type, radii, shadows, logo lockup, motion feel) and save its location in
  memory.
- **Evidence.** Gather it yourself, read-only:
  - Use the product in your own browser session (Playwright), on production, staging or a preview deployment. Walk
    the real flow end to end and capture every state you will film.
  - Read the PR that shipped the feature: its description, linked issue, screenshots, changed components and preview
    URL.
  - Extract the rendered surface (DOM, computed styles, fonts, SVGs) and the component source, for exact labels,
    states and tokens.
- **Pre-release work.** A feature on an open or flagged PR is a pre-release recreation. Label it as one.
- **Method:** `references/evidence-and-recreation.md`.

### 3. Storyboard: lock the film before you build it
- **Product Film board:**
  - a timecoded beat sheet, with a shot card per beat;
  - a sound plan;
  - truth notes;
  - styleframes rendered from the same source that will be filmed;
  - a low-resolution animatic.
- **Speaker + Product board:** a paper edit (`references/speaker-product.md`):
  - chosen takes with source timecodes;
  - a line-coverage ledger;
  - the hook layers;
  - the b-roll plan.
- **Test the animatic** for:
  - frame 0 as a poster;
  - muted comprehension;
  - legibility at 360 px phone width;
  - whether every shot earns its time.
- **Checkpoint:** present the board (`scripts/contact_sheet.sh` turns the styleframes into one sheet), plus the
  animatic and the storyboard. Wait for approval before rendering masters, unless the team asked you to go straight
  through. A board is cheap to change; a 60 fps master isn't.
- **Template:** `assets/storyboard-template.md`.

### 4. Build and finish
- **Build:** deterministic, seekable compositions in the team's brand. Every frame is a pure function of the frame
  number, so any frame can be re-rendered cold and match. The method is in `references/remotion-build.md`.
- **Sound:** music bed, narration and mix in `references/audio.md`. `scripts/analyze_audio.py` gives word timings and
  the music's beat grid.
- **Aspect ratios:** recompose each one shot by shot, re-framing the camera. Never crop the master.

### 5. Review and deliver
- **Release review:** run it on the actual encoded files, not on source or stills (`references/release-review.md`).
- **Deliver one private review page** with:
  - each cut in its viewing context;
  - the latest full-quality master as its own file;
  - the editable source;
  - an honest test status: what passed, what was staged, what wasn't checked.

## Product Film rails (summary)

The detail is in `references/product-film.md`.

**Arc:** hook, engage, work, escalate, payoff, close.
- **Hook:** frame 0 is already moving and legible, because it is also the poster. No logo intro or title card.
- **Payoff:** a dense, inspectable artifact the product made, held long enough to read.
- **Close:** the authentic lockup, a clean hold and one CTA.

**Camera:**
- one virtual camera over a full-resolution canvas;
- holds dominate;
- ease a push onto the control so it lands centred before the click;
- one marquee moment per film;
- never play a small control at full-screen scale.

**Cursor:** a causal actor.
- It travels on arcs and enters and exits through a frame edge.
- Its tip is inside the control when it presses, and the press causes the next visible change.
- It never parks over the text it points at.

**Text:**
- The action carries the story.
- Words get their own kinetic-type moment, never text over playing UI.
- Use the team's exact copy.
- Reading load is about 4 words per second at feed size.

**Sound:** silent by default, because it must read muted. With sound, use a music bed the team supplied or approved,
cut to its measured beats. Narration only if the team supplies it.

## Speaker + Product rails (summary)

The detail is in `references/speaker-product.md`.

- **Real footage of a real person only.** Never generate, clone, dub or invent a speaker's words, speed up their
  voice, or substitute an avatar.
- **Scripted footage:** keep every completed line. Remove only slates, dead air, retakes and false starts.
- **Unscripted footage:** cut on clean speech boundaries, and keep each claim's wording and qualifiers intact.
- **Hook:** three layers land together in the first 1–3 seconds:
  - the spoken hook;
  - a visual hook that reads paused and muted;
  - a text hook of 3–7 words, on screen from frame 0, never over the face.

  Never ship a vertical cut without a text hook.
- **Structure:**
  - The product enters within about a second and carries the middle.
  - Cut back to the face for claims, personal lines and emotion.
  - Close on the brand end card while the final line plays.
- **B-roll:** a full cutaway, or an in-shot snippet beside the speaker. Avoid the clichéd vertical split screen.
- **Speaker framing:** one stable medium crop. No synthetic punch-ins or face tracking; camera moves belong to the
  product layer.

## The truth boundary (shared standard)

These rules protect the team. A launch video that overstates the product is a liability, however good it looks.

- **Evidence:**
  - Base every recreation on authorized product evidence.
  - Preserve component anatomy and action-to-result truth: the click that's shown is the click that causes that
    result.
  - Use coherent local scenario data, never real customer data or secrets.
- **Staged vs real:**
  - Keep captured footage, staged recreations and proposed UX distinct, and say which is which in the review notes.
  - Staged timing never implies measured speed. Remove real "took 0.17 s" labels from recreations.
  - Never imply a simulation completed a real external action.
- **Claims:** make no claims the product doesn't support, such as user counts, pass rates or AI features that aren't
  live. Follow the team's naming rules from memory: some teams can't name a vendor, and some features aren't public
  yet.
- **Read-only in the team's systems:**
  - In GitHub, never comment, review, push, merge or re-run checks.
  - In the product, never send, create, invite, purchase, schedule or change settings to get a shot. Seed local state
    instead.
- **Delivery:**
  - Keep review pages and source private by default.
  - Public links, external archives and real account changes need the user's say-so.
  - A review page never replaces the finished master.
- **Licensing:** music and voices must be licensed for the use. AI-generated tracks and voices need the paid plan
  that grants commercial rights; tell the user to check.

## Scope

**In scope, as part of a demo package:**
- aspect-ratio cutdowns;
- A/B hooks;
- captions and SRT files;
- a short teaser cut from a longer film;
- poster and thumbnail frames;
- logo end cards;
- the review page.

**Out of scope:**
- generated live-action or AI films;
- AI avatar or presenter videos;
- non-product explainers;
- event and real-estate videos;
- standalone graphics and prototypes.

If someone asks for one of these, say briefly that Sizzle is built for product demo videos and offer the nearest
format. For example:
- a feature explainer becomes a Product Film;
- a podcast clip becomes Speaker + Product, when there's product to show.

## Memory and revisions

**What to save, per team, in `memory/<team>.md`:**
- the brand kit's location;
- repo, product, staging and preview URLs;
- which stored login to use;
- the surfaces and components already recreated, with their source paths;
- approved camera and pacing taste;
- caption style, music taste, and runtime and aspect defaults;
- recurring speakers and delivery habits.

**Read it at the start of every job.** Reuse the recreated UI components, so the next film starts from built UI rather
than a blank canvas.

**Save every correction as a rule with its reason.** "No vendor names in visible copy, because the track avoids
trademark use" survives better than "remove Databricks".

**Revisions:**
- Each revision gets a new version, and the approved version stays untouched.
- Make the smallest change that fixes the note, preserving approved work.

Treat the numbers in these files as starting points, not laws. When this file and a reference disagree on format
scope, this file wins. On craft method, the reference wins.

## Helper scripts

| Script | Use |
|---|---|
| `scripts/analyze_audio.py VO.wav MUSIC.wav OUT_DIR` | Word timestamps for narration or speech (faster-whisper), plus the music's tempo, beats and section starts (librosa). Prints the setup command for its virtualenv if the modules are missing. |
| `scripts/loudness.sh FILE…` | Integrated LUFS, LRA and true peak (ffmpeg ebur128), for the release review. |
| `scripts/contact_sheet.sh STYLEFRAME_DIR OUT.png [COLS]` | Styleframes tiled into one image, for the storyboard checkpoint. |
| `scripts/frame_pulls.sh VIDEO OUT_DIR t1 t2 …` | Frames from an encoded file at given times, to check that visuals land on their words. |
