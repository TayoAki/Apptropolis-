// Captures ShotOClock's App Store screens from the real web build, dark theme (the app's default
// pack, Stadium Night). The demo athlete is fictional and made through the app's own screens:
// onboarding on Monday Oct 26, 2026, then four weeks of drinks and alcohol-free days, each one
// tapped on Tonight with the browser clock moved to the moment it was had (the app stamps every
// drink with the current time). Every number on screen is worked out by the app itself.
//
// The athlete plays Saturday soccer, chose "Up to 10 drinks a week" in onboarding and set 175 lb,
// male in Settings for the BAC estimate. Week of Oct 26 went over the limit (11.4), the next two
// finished at 7.4, and this week (Nov 16) has a glass of wine, a pint after Wednesday training and
// two alcohol-free days by Thursday. Plus screens come from a second phone seeded with Thursday's
// storage, upgraded with the paywall's test-mode (simulated) purchase.
//
// Usage: node capture.cjs <web-build-dir> <captures-dir>
const fs = require("fs");
const path = require("path");
const { serve, phone, shoot } = require("../../../tools/store-screenshots/capture-lib.cjs");

const [build, outDir] = process.argv.slice(2);
if (!build || !outDir) {
  console.error("Usage: node capture.cjs <web-build-dir> <captures-dir>");
  process.exit(2);
}
const out = (name) => path.join(outDir, name);
const TIMEZONE = "America/Chicago";

/** "2026-11-19 19:05" in Chicago time. US daylight time ends on Sunday Nov 1, 2026. */
function at(local) {
  const [day, time] = local.split(" ");
  return new Date(`${day}T${time}:00${day < "2026-11-01" ? "-05:00" : "-06:00"}`);
}

const BEER = "Log a pint of beer, 1.5 drinks";
const WINE = "Log a glass of wine, 1.4 drinks";
const SHOT = "Log a cocktail or shot, 1 drink";
const FREE = "Mark today alcohol-free";

// What the athlete logged, in order. Weeks start on Monday (the app's default).
const DIARY = [
  // Week of Oct 26 (onboarding on Monday marked it alcohol-free): 11.4, over the limit of 10.
  ["2026-10-28 21:15", BEER],
  ["2026-10-30 19:30", BEER], ["2026-10-30 20:40", BEER], ["2026-10-30 21:50", BEER], ["2026-10-30 22:45", SHOT],
  ["2026-10-31 17:30", BEER], ["2026-10-31 18:40", BEER], ["2026-10-31 20:15", WINE],
  // Week of Nov 2: 7.4.
  ["2026-11-02 20:00", FREE], ["2026-11-03 19:45", WINE], ["2026-11-05 20:00", FREE],
  ["2026-11-06 19:40", BEER], ["2026-11-06 21:00", BEER],
  ["2026-11-07 17:45", BEER], ["2026-11-07 19:30", BEER],
  // Week of Nov 9: 7.4.
  ["2026-11-09 20:00", FREE], ["2026-11-11 21:10", BEER], ["2026-11-12 20:00", FREE],
  ["2026-11-13 19:50", BEER], ["2026-11-13 21:05", BEER],
  ["2026-11-14 17:30", BEER], ["2026-11-14 19:45", WINE], ["2026-11-15 20:00", FREE],
  // This week, up to Thursday evening.
  ["2026-11-16 20:00", FREE], ["2026-11-17 19:40", WINE], ["2026-11-18 21:10", BEER],
  ["2026-11-19 19:00", FREE],
];

async function newPhone(time) {
  const p = await phone({ colorScheme: "dark", clock: time, timezoneId: TIMEZONE });
  // Motion components show their final state at once (the app's own still-render switch).
  await p.context.addInitScript(() => {
    globalThis.__appbuilderStill = true;
  });
  await p.page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  if (process.env.DEBUG_SHOTS) {
    p.page.on("console", (m) => m.type() === "error" && console.error("console:", m.text().slice(0, 300)));
    p.page.on("pageerror", (e) => console.error("pageerror:", e.message.slice(0, 300)));
  }
  return p;
}

const wait = (page, ms = 500) => page.waitForTimeout(ms);

async function tap(page, label, ms = 450) {
  try {
    await page.getByLabel(label, { exact: true }).filter({ visible: true }).first().click({ timeout: 10000 });
  } catch (e) {
    if (process.env.DEBUG_SHOTS) {
      await page.screenshot({ path: path.join(process.env.DEBUG_SHOTS, "failed-tap.png") });
      console.error("url:", page.url(), "time:", await page.evaluate(() => new Date().toString()));
    }
    throw e;
  }
  await wait(page, ms);
}

async function tapText(page, text, ms = 450) {
  await page.getByText(text, { exact: true }).filter({ visible: true }).first().click();
  await wait(page, ms);
}

async function radio(page, name, ms = 450) {
  await page.getByRole("radio", { name, exact: true }).filter({ visible: true }).first().click();
  await wait(page, ms);
}

/** Move the page's clock forward to a moment (never back). Reloads when the day changes. */
async function moveTo(page, time) {
  const now = await page.evaluate(() => Date.now());
  const before = new Date(now).toDateString();
  if (time.getTime() > now) await page.clock.fastForward(time.getTime() - now);
  await wait(page, 300);
  if (time.toDateString() !== before) {
    await page.reload({ waitUntil: "networkidle" });
    await wait(page, 1200);
    if (process.env.DEBUG_SHOTS) {
      const t = await page.evaluate(() => document.body.innerText.slice(0, 60).replace(/\n/g, " | "));
      console.error("reload", time.toISOString(), JSON.stringify(t));
    }
  }
}

async function openTab(page, name) {
  await page.getByRole("tab", { name }).filter({ visible: true }).first().click();
  await wait(page, 1500);
}

/** Scroll the visible screen so the element with this exact text sits `offset` pt from the top. */
async function scrollToText(page, text, offset) {
  await page.evaluate(
    ({ text, offset }) => {
      const el = [...document.querySelectorAll("div")].find(
        (node) => node.textContent === text && node.offsetParent !== null && node.children.length === 0,
      );
      if (!el) throw new Error(`no visible "${text}"`);
      let box = el.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(box).overflowY)))
        box = box.parentElement;
      if (!box) throw new Error("no scroll container");
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - offset;
    },
    { text, offset },
  );
  await wait(page, 600);
}

async function storage(page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serve(build, 8131);
  const errors = [];

  // ---- The free athlete, built day by day ----
  const main = await newPhone(at("2026-10-26 18:30"));
  const { page } = main;
  await page.goto(server.url + "/", { waitUntil: "networkidle" });
  await wait(page, 2000);

  // Onboarding: sport, weekly limit, today's first entry, no reminder, then close the paywall.
  await tap(page, "Soccer / basketball. Matches, scrimmages and sprints");
  await shoot(page, out("onboarding-sport.png"));
  await tapText(page, "Next: your weekly limit", 900);
  await tap(page, "Up to 10 drinks a week. Room for a couple of social evenings.");
  await shoot(page, out("onboarding-limit.png"));
  await tapText(page, "Next: log today", 900);
  await tap(page, FREE, 900);
  await tapText(page, "Next: daily reminder", 900);
  await tapText(page, "Not now, finish setup", 2000);
  await tap(page, "Not now, keep the free version", 1500);

  // Settings: Saturday games, and a body profile for the BAC estimate.
  await tap(page, "Settings", 1200);
  await tap(page, "Game and training days");
  await radio(page, "Saturday");
  await tap(page, "Body weight");
  await tap(page, "Increase body weight", 250);
  await tap(page, "Increase body weight", 250);
  await tap(page, "Sex or body profile");
  await radio(page, "Male");
  await page.goBack();
  await wait(page, 1200);

  for (const [when, label] of DIARY) {
    await moveTo(page, at(when));
    await tap(page, label, 500);
  }

  // Thursday Nov 19, evening: a clear day inside the limit, two days before the match.
  await moveTo(page, at("2026-11-19 19:05"));
  await page.reload({ waitUntil: "networkidle" });
  await wait(page, 2500);
  await shoot(page, out("tonight-thursday.png"));
  const thursday = await storage(page);
  if (process.env.DEBUG_SHOTS) fs.writeFileSync(path.join(process.env.DEBUG_SHOTS, "thursday-storage.json"), JSON.stringify(thursday, null, 1));
  await openTab(page, "Week");
  await shoot(page, out("week-thursday.png"));
  await openTab(page, "Career");
  await shoot(page, out("career-thursday.png"));
  await openTab(page, "Tonight");

  // Friday Nov 20: two pints the night before the match.
  await moveTo(page, at("2026-11-20 20:00"));
  await tap(page, BEER, 600);
  await moveTo(page, at("2026-11-20 21:10"));
  await tap(page, BEER, 600);
  await moveTo(page, at("2026-11-20 21:25"));
  await page.reload({ waitUntil: "networkidle" });
  await wait(page, 2500);
  await shoot(page, out("tonight-friday.png"));
  await openTab(page, "Week");
  await shoot(page, out("week-friday.png"));
  errors.push(...main.errors);
  await main.browser.close();

  // ---- The same athlete on Plus (test-mode purchase), Thursday evening ----
  const plus = await newPhone(at("2026-11-19 19:06"));
  const p2 = plus.page;
  await p2.goto(server.url + "/", { waitUntil: "networkidle" });
  await p2.evaluate((saved) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
  }, thursday);
  await p2.reload({ waitUntil: "networkidle" });
  await wait(p2, 2500);
  await tap(p2, "Settings", 1200);
  await tap(p2, "ShotOClock Plus", 1500);
  await tap(p2, "Start 7-day free trial", 2500);
  await p2.goBack();
  await wait(p2, 1200);
  await openTab(p2, "Week");
  await scrollToText(p2, "Trend insights", 28);
  await shoot(p2, out("week-plus-insights.png"));
  await tap(p2, "Settings", 1200);
  await tap(p2, "Lighter limit this week");
  await radio(p2, "6");
  await shoot(p2, out("settings-lighter-limit.png"));
  await p2.goBack();
  await wait(p2, 1200);
  await openTab(p2, "Tonight");
  await shoot(p2, out("tonight-lighter-limit.png"));
  errors.push(...plus.errors);
  await plus.browser.close();

  console.log("errors:", errors.length ? errors : "none");
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
