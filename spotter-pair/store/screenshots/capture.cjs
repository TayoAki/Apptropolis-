// Captures Spotter Pair's App Store screens from the real web build. Nothing is seeded: a
// fictional lifter sets the app up through its own onboarding and then uses it for four weeks,
// with page.clock moving the phone's date from one training day to the next.
//
// The demo lifter: goal "Build raw strength", trains Mon, Wed and Fri with home dumbbells, picks
// the preset stake "Sunday cold brew & bagels". Week 44 all three sessions, week 45 misses
// Friday, week 46 all three, week 47 Monday and Wednesday, then Friday Nov 20 is the capture day
// (2 of 3 before the last session). Every weight, rep, score and date on screen is what the app
// computed from those taps. Pro is the paywall's test-mode simulated purchase (nothing charged),
// bought only after the free screens are captured.
//
// Usage: node capture.cjs <web-build-dir> <captures-dir>
const path = require("path");
const fs = require("fs");
const { serve, phone, shoot } = require("../../../tools/store-screenshots/capture-lib.cjs");

const [build, outDir] = process.argv.slice(2);
if (!build || !outDir) {
  console.error("Usage: node capture.cjs <web-build-dir> <captures-dir>");
  process.exit(2);
}
const out = (name) => path.join(outDir, name);

// Weights in pounds the lifter works at, per catalog name, by week (index 0 = week 44).
// Bodyweight moves stay at bodyweight; reps stay at the plan's 5 unless listed.
const WEIGHTS = {
  "Bulgarian Split Squat": [30, 30, 35, 35],
  "Incline Dumbbell Press": [35, 35, 40, 40],
  "One-Arm Dumbbell Row": [45, 45, 50, 50],
  "Seated Dumbbell Press": [30, 30, 30, 35],
  "Goblet Squat": [40, 40, 45, 45],
  "Dumbbell Bench Press": [40, 40, 45, 45],
  "Dumbbell Curl": [25, 25, 25, 25],
  "Walking Lunge": [30, 30, 35, 35],
  "Dumbbell Chest Fly": [20, 20, 25, 25],
  "Farmer's Carry": [50, 50, 55, 55],
};
const REPS = { "Hanging Knee Raise": 8, Plank: 1, "Side Plank": 1 };

// Training days the lifter opens the app and trains (local evening times, America/Chicago).
// US daylight saving ends Nov 1 2026: October is UTC-5, November UTC-6.
const SESSIONS = [
  { at: "2026-10-28T18:20:00-05:00", week: 0 },
  { at: "2026-10-30T18:05:00-05:00", week: 0 },
  { at: "2026-11-02T18:35:00-06:00", week: 1 },
  { at: "2026-11-04T18:10:00-06:00", week: 1 },
  // Friday Nov 6: skipped (week 45 ends 2 of 3).
  { at: "2026-11-09T18:25:00-06:00", week: 2 },
  { at: "2026-11-11T18:40:00-06:00", week: 2 },
  { at: "2026-11-13T18:15:00-06:00", week: 2 },
  { at: "2026-11-16T18:30:00-06:00", week: 3 },
  { at: "2026-11-18T18:20:00-06:00", week: 3 },
];
const SETUP_AT = "2026-10-26T18:00:00-05:00"; // Monday of week 44: setup, then the first session
const FRIDAY_AT = "2026-11-20T18:10:00-06:00"; // the capture day

const errors = [];

/** A phone at `at`, holding `storage` (written once per tab, so reloads keep the app's own writes). */
async function open(server, at, storage) {
  const p = await phone({ colorScheme: "dark", clock: new Date(at) });
  await p.context.addInitScript((saved) => {
    // The app's own switch for still renders: motion shows its final state at once.
    globalThis.__appbuilderStill = true;
    if (saved && !sessionStorage.getItem("demo:seeded")) {
      localStorage.clear();
      for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
      sessionStorage.setItem("demo:seeded", "1");
    }
  }, storage ?? null);
  p.page.on("pageerror", (e) => errors.push(e.message));
  return p;
}

async function dump(page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
}

async function go(page, server, route) {
  await page.goto(server.url + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
}

/** The value the open card's weight stepper shows, in pounds (0 for bodyweight). */
async function shownWeight(page) {
  const text = await page
    .getByRole("button", { name: "Decrease weight" })
    .evaluate((el) => el.parentElement.innerText);
  const m = text.match(/(\d[\d,]*) lb/);
  return m ? Number(m[1].replace(/,/g, "")) : 0;
}
async function shownReps(page) {
  const text = await page
    .getByRole("button", { name: "Decrease reps" })
    .evaluate((el) => el.parentElement.innerText);
  return Number(text.match(/(\d+) reps?/)[1]);
}

/** Sets the open card's steppers with the app's own + and − buttons. */
async function setDraft(page, weight, reps) {
  for (let i = 0; i < 40; i++) {
    const w = await shownWeight(page);
    if (w === weight) break;
    await page.getByRole("button", { name: w < weight ? "Increase weight" : "Decrease weight" }).click();
  }
  for (let i = 0; i < 40; i++) {
    const r = await shownReps(page);
    if (r === reps) break;
    await page.getByRole("button", { name: r < reps ? "Increase reps" : "Decrease reps" }).click();
  }
}

/** Logs one set of `name` (its card must be open). */
async function logSet(page, name, n, week) {
  const weight = WEIGHTS[name]?.[week] ?? 0;
  const reps = REPS[name] ?? 5;
  await setDraft(page, weight, reps);
  await page.getByRole("button", { name: `Log set ${n} of ${name}` }).click();
  // The app ignores a second log within half a second (a double tap): let the clock move on.
  await page.clock.fastForward(900);
  await page.waitForTimeout(150);
}

/** Today's session from the app's own storage: its lifts' names, in the plan's order. */
async function todaysExercises(page) {
  return page.evaluate(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const d = new Date();
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const workouts = JSON.parse(localStorage.getItem("app:collection:workouts") || "[]");
    const catalog = JSON.parse(localStorage.getItem("app:collection:exercises") || "[]");
    const w = workouts.find((x) => !x.deleted && x.date === key);
    const names = new Map(catalog.map((e) => [e.id, e.name]));
    return w ? w.exercises.map((id) => names.get(id)) : [];
  });
}

/** Opens an exercise's card on Today (a tap on its collapsed card). */
async function pick(page, name) {
  const card = page.getByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, `) });
  if (await card.count()) await card.first().click();
  await page.waitForTimeout(200);
}

/** One full session on Today: every set of every lift, in order, then Mark workout complete. */
async function train(page, week, { order, stopBeforeLast = false } = {}) {
  const names = order ?? (await todaysExercises(page));
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    await pick(page, name);
    for (let n = 1; n <= 3; n++) {
      if (stopBeforeLast && i === names.length - 1 && n === 3) return;
      await logSet(page, name, n, week);
    }
  }
  await page.getByRole("button", { name: "Mark workout complete" }).click();
  await page.waitForTimeout(800);
}

/** Scrolls the screen's scroll view so `locator` sits `offset` points below the top. */
async function scrollTo(page, locator, offset = 0) {
  await locator.first().evaluate((el, offset) => {
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(box).overflowY)))
      box = box.parentElement;
    if (!box) return;
    const delta = el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += delta - offset;
  }, offset);
  await page.waitForTimeout(500);
}

async function tab(page, name) {
  await page.getByRole("tab", { name }).first().click().catch(async () => {
    await page.getByText(name, { exact: true }).last().click();
  });
  await page.waitForTimeout(1200);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serve(build, 8135);

  // Monday Oct 26: setup through the onboarding, the stake, then the first session.
  let storage;
  {
    const { browser, page } = await open(server, SETUP_AT, null);
    await go(page, server, "/");
    await page.getByRole("radio", { name: /^Build raw strength/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(400);
    for (const d of ["Monday", "Wednesday", "Friday"]) await page.getByRole("checkbox", { name: d }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("radio", { name: /^Home dumbbells/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(1500);
    await shoot(page, out("setup-plan.png"));
    await page.getByRole("button", { name: "Start training" }).click();
    await page.waitForTimeout(1500);
    // The paywall shown after setup: closed without buying.
    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(1000);
    await tab(page, "Partner");
    await page.getByRole("radio", { name: "Sunday cold brew & bagels" }).click();
    await page.waitForTimeout(600);
    await tab(page, "Today");
    await page.clock.fastForward(20 * 60_000);
    await train(page, 0);
    storage = await dump(page);
    await browser.close();
  }

  // The training days that follow.
  for (const s of SESSIONS) {
    const { browser, page } = await open(server, s.at, storage);
    await go(page, server, "/");
    await train(page, s.week);
    storage = await dump(page);
    await browser.close();
    console.log("trained", s.at);
  }

  // Friday Nov 20: the capture day.
  const { browser, page } = await open(server, FRIDAY_AT, storage);
  await go(page, server, "/");

  // My Plan before the session: Friday's lifts, each with its swap button.
  await tab(page, "My Plan");
  await shoot(page, out("plan-friday.png"));

  // Partner at 2 of 3: the score, and what is owed.
  await tab(page, "Partner");
  await scrollTo(page, page.getByText(/^WEEK \d+ ACCOUNTABILITY$/), 30);
  await shoot(page, out("partner-before.png"));

  // Today: every set but the last. Walking Lunge goes last, so its third set closes the week.
  await tab(page, "Today");
  await page.clock.fastForward(5 * 60_000);
  const names = await todaysExercises(page);
  const order = [...names.filter((n) => n !== "Walking Lunge"), "Walking Lunge"];
  await train(page, 3, { order, stopBeforeLast: true });
  await scrollTo(page, page.getByText("Accountability", { exact: true }), 14);
  await shoot(page, out("today-last-set.png"));

  // The last set, then Mark workout complete. The web Lottie player can't show a finished
  // animation in a still render (lottie-react-native: "progress is not supported on web"), so
  // the success check that appears on completion is left to play through once.
  await logSet(page, "Walking Lunge", 3, 3);
  await page.evaluate(() => { globalThis.__appbuilderStill = false; });
  await page.getByRole("button", { name: "Mark workout complete" }).click();
  await page.waitForTimeout(3000);
  await page.evaluate(() => { globalThis.__appbuilderStill = true; });
  await scrollTo(page, page.getByText("3 of 3 sessions done this week", { exact: true }), 34);
  await shoot(page, out("today-complete.png"));

  // Partner at 3 of 3: the scorecard that gets shared.
  await tab(page, "Partner");
  await scrollTo(page, page.getByText(/^WEEK \d+ ACCOUNTABILITY$/), 30);
  await shoot(page, out("partner-after.png"));

  // Pro, through the paywall's test-mode purchase (simulated; nothing is charged).
  await page.getByRole("button", { name: /^See every past week's score/ }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Start 7-day free trial/ }).click();
  await page.waitForTimeout(2500);
  await scrollTo(page, page.getByText("SCORE HISTORY", { exact: true }), 120);
  await shoot(page, out("pro-history.png"));

  // Pro: a stake in their own words, typed into the composer.
  await scrollTo(page, page.getByText(/^WEEK \d+ ACCOUNTABILITY$/), 30);
  await page.getByRole("radio", { name: "Write your own" }).click();
  await page.waitForTimeout(500);
  await page.getByLabel("Your stake").fill("Loser walks the dog on Sunday");
  await page.waitForTimeout(300);
  await scrollTo(page, page.getByText("THE STAKE", { exact: true }), 34);
  await shoot(page, out("pro-stake.png"));

  fs.writeFileSync(out("demo-storage.json"), JSON.stringify(await dump(page), null, 1));
  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
