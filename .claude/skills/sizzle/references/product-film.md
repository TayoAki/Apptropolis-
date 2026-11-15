# Product Film: the craft rails

Contents:
1. Story types
2. The arc
3. Camera
4. Cursor
5. Timing table
6. Text and kinetic type
7. Sound
8. Format and cutdowns
9. Common failures

## 1. Story types
Pick a story proportionate to the brief. A feature launch is the default.

| Story | Shape |
|---|---|
| Feature clip | one action and its result (6–15 s) |
| Feature launch | one feature with its context and its payoff |
| Multi-feature launch | several features, escalating toward one payoff |
| Hero film | the full product story (30–50 s) |
| Walkthrough | follows the real sequence; staged timing never implies measured speed |

## 2. The arc (a rail, not a template)

**Hook.** Frame 0 is already moving and legible, because it is also the poster.
- Open on the product's most visual outcome, or on something proactive arriving on its real surface (a message, an
  alert, incoming work).
- No logo intro or title card.

**Engage.** One establishing view of the real surface, then push in.

**Work.** One action leading to one result per beat:
1. The cursor arrives.
2. It presses the real control.
3. The UI responds.
4. The camera follows to the result.
5. The shot holds long enough to read.

**Escalate.** More actors, more complexity or more scale, when the story has them. A pull-back to several surfaces
side by side makes a strong marquee.

**Payoff.** A finished, dense, inspectable artifact the product made (a report, results page, PR, campaign or sent
message), held long enough to read.

**Close.** The authentic lockup lands, then a clean hold with one CTA. Use the team's real logo and real CTA copy,
and make only claims that are true (e.g. "Free during beta" only if the pricing page says so).

**Variety.** Vary the opening device, the beats and the payoff from film to film, so a team's films never look
stamped from one mold.

## 3. Camera
- **One camera.** One virtual camera moves over a full-resolution UI canvas, in the same time model as the cursor and
  the UI, with a calmer response than either.
- **Push and hold.** Ease a push onto the control being used so it lands centred before the click. Hold through the
  selection, then ease out to reveal the result.
- **Direction.** Pull back for growth or scale; push in for a small, consequential action.
- **Holds dominate.** No idle creep, constant zoom or arbitrary pans.
- **Scale.** Never play a small control at full-screen scale. A button should never fill the frame.
- **Focus.** When the camera settles, dim or soften whatever isn't the subject: a 35–55% dim layer, or a light blur on
  non-subject panels.
- **Signature moves.** Spend one marquee moment per film, and keep any signature move to about a fifth of the
  runtime.
- **Legibility.** Before rendering, scale a styleframe to 360 px wide and look at it. Text that matters must read.

## 4. Cursor
- It is a causal actor. It travels on continuous arcs (a quadratic Bézier with a slight bow) and enters and exits
  through a frame edge.
- Its tip is inside the real control when it presses. The press (about 6 frames of pressed state at 60 fps) causes the
  next visible change within 4–10 frames.
- It never parks over the text it points at. After the click, it moves off to the side.
- A depicted agent gets its own named actor cursor. An unattended run shows no cursor at all.
- Typing is shown as characters arriving at a human rate (about 12–18 characters per second), or as a
  select-and-replace, never as text appearing instantly.

## 5. Timing table (starting points, at 60 fps)

| Motion | Frames | Easing |
|---|---|---|
| UI element arrival | 12–20 | ease-out (cubic) |
| UI element exit | 8–14 | ease-in |
| Camera push or pull | 36–60 | ease-in-out, settles ≥ 6 frames before the click |
| Cursor travel | 18–40 | ease-in-out along the arc |
| Click → visible result | 4–10 | — |
| Hold after a result | max(60, words ÷ 4 × 60) | — |
| Kinetic type in, hold, out | 10–16 in; reading time + 30 hold; 8 out | ease-out in, ease-in out |
| Transition between beats | 8–14 (only at beat changes) | — |

**Holding the read:**
- Hold long enough to read, without dead air.
- Let every element settle before the next competing move.
- Keep reading load around 4 words per second at feed size. Once a pattern is established, cut tighter.
- With narration, the voice carries the meaning. A long on-screen message then only has to stay up while its words
  are spoken.

## 6. Text and kinetic type
- Let the action carry the story.
- When a beat truly needs words (a feature name, a benefit line, labels for side-by-side surfaces), give them a
  dedicated kinetic-type moment.
- Never put text over playing UI.
- Use the team's exact copy, and their naming rules: some teams can't name a vendor or an unreleased feature.

## 7. Sound
- A Product Film must read muted. It ships silent by default.
- When the brief asks for sound:
  - Use a licensed music bed, supplied or approved by the team, cut to its measured beats. Align the marquee moment
    to a drop, and the close to the final hit.
  - Narration can be added if the team supplies it: their own read, or a stock synthetic narrator they generated and
    have the rights to. Never clone a real person's voice.
  - Frame-exact UI foley (clicks, ticks) only if a licensed foley set is available.
- Method: `audio.md`.

## 8. Format and cutdowns
- **The master** is 16:9 at 60 fps unless the destination caps the frame rate (LinkedIn is 30 fps or lower).
- **Square, 4:5 and 9:16 cutdowns** are recomposed shot by shot:
  - re-frame the camera keyframes for the tall frame;
  - stack side-by-side surfaces vertically;
  - push into dense artifacts so their key rows read at 360 px.

  Never centre-crop the master.
- **Captions:**
  - The 16:9 master carries no burned-in captions (no text over UI). Ship an SRT beside it.
  - Vertical cuts with narration burn captions into a dedicated band that never covers the subject.

## 9. Common failures
- Opening on a logo, a title card or an empty state, so frame 0 is not a poster.
- A full-screen, unscaled UI: a screen recording in disguise. Push in, and hide what isn't the subject.
- The cursor teleporting, or a click with no visible consequence.
- Constant slow zoom ("Ken Burns creep") instead of holds.
- Text over playing UI; text faster than about 4 words per second with no narration.
- A real timing label ("0.17 s") left in a staged shot.
- The payoff flashing by: the artifact must be readable.
