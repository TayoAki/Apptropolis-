# Evidence and UI recreation

The film is only as truthful as its evidence. Gather it yourself, from the real product, read-only.

## Sources, best first

**The running product.** Use production, staging, a PR preview deployment or a local production build.
- Prefer a local build (`npm run build && npm run start -- -p <port>`). You can seed state freely there without
  touching anyone's account.

**The PR that ships the feature.** Read these:
- its description and linked issue;
- its screenshots and recordings;
- the changed components, tests and stories;
- its preview URL.

Use the GitHub integration read-only: never comment, review, push or re-run checks.

**Supplied material.** Screenshots, recordings and Figma frames count too, and can be enough on their own.

**Component source.** It holds the exact labels, states, tokens and error messages. Copy strings from source rather
than retyping them from a screenshot.

## Walking the flow with Playwright
- Script the real flow end to end and capture every state you will film. Use 1440×900 at deviceScaleFactor 1 for
  evidence; it's for you, not the viewer.
- **Seed state instead of making real changes.** Seed `localStorage`, fixtures or a local database to reach progress,
  dashboard and history states. Never send, create, invite, purchase or change settings in a real account to get a
  shot.
- **Time-dependent states** (due dates, "tomorrow", warm-ups): set the clock with `page.clock.setFixedTime(...)` or
  `page.clock.install(...)`.
- **Slow states** (an in-browser engine running a query): wait for them. If a state is impractical headless, take the
  exact strings from source, and say so in the truth notes.
- **Save it all:** screenshots, the seeded state JSON and the computed styles in an `evidence/` folder that isn't
  committed.

Extracting computed styles for the surfaces you will recreate:

```js
const styles = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const cs = getComputedStyle(el);
  const pick = ["font-family", "font-size", "font-weight", "line-height", "color", "background-color",
                "border-radius", "box-shadow", "padding", "gap"];
  return Object.fromEntries(pick.map((p) => [p, cs.getPropertyValue(p)]));
}, ".lesson-panel");
```

## The brand kit (built once per team)
- **Contents:** colours, type (families, weights and sizes), radii, shadows, the logo and lockup, the CTA style, and
  how product surfaces differ from marketing surfaces.
- **Where:** `<composition dir>/brand.ts` (tokens) and `brand.md` (notes), with the location recorded in memory.
- **Fonts:**
  - Use the brand's real fonts. Web apps often have the woff2 files in their build output (Next.js:
    `.next/static/media/`).
  - Check the licences. Google Fonts are OFL; copying them into the video project is fine.
  - Load them in the composition (see `remotion-build.md`).

## Recreating a surface
1. **Same anatomy.** Keep the regions, controls, labels, states and colours of the real component.
2. **Stylized for the frame.** Enlarge what matters, remove what doesn't (toolbars, unrelated tabs, scrollbars), and
   keep spacing generous so it reads as a thumbnail.
3. **Coherent scenario data.** Use the product's own sample or demo data, never real customers. Numbers must add up
   across shots: if the dashboard says 465 XP, the XP gained earlier has to fit.
4. **Remove what would mislead:**
   - measured timings ("0.17 s", "took 120 ms") in staged shots;
   - live-looking user counts;
   - features that aren't available (an unconfigured AI tutor);
   - names the team can't use (check memory for naming rules).
5. **Hide platform UI that would break the team's naming rules,** such as a tab bar listing vendor names, by framing,
   not by editing it into something false.
6. **Pre-release features** get a "pre-release recreation" label in the review notes.
7. **Make it reusable.** Build each surface as a parameterized component (state in, pixels out) and record its path in
   memory, so the next film reuses it.

## The truth notes in every storyboard
- Which shots are recreations, and from which evidence.
- Which data is scenario data.
- What timing is staged.
- Any simplification: for example, "the quiz recap thumbnail is a static approximation".
- Any difference between the live product and the film (e.g. the film follows the repo at commit X).
