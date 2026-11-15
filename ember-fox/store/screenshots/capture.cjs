// Captures ShotOClock's App Store screens from the real web build, in the app's default theme
// pack (Stadium Night, dark). The demo athlete is fictional and is made through the app's own
// screens: onboarding on Monday Oct 26, 2026, then four weeks of drinks and alcohol-free days,
// each one tapped on Tonight with the browser clock moved to the moment it was had (the app stamps
// every drink with the current time and closes each finished week itself). Every number on
// screen is worked out by the app.
//
// The athlete plays Saturday soccer, chose "Up to 10 drinks a week" in onboarding and set 175 lb,
// male in Settings (used only by the BAC estimate). The week of Oct 26 went over the limit (11.4),
// the next two finished at 7.4, and this week (Nov 16) has a glass of wine, a pint after Wednesday
// training and two alcohol-free days by Thursday evening, then two pints on Friday. The Plus
// screens use the same phone storage from Thursday evening, upgraded with the paywall's test-mode
// (simulated) purchase; nothing is charged.
//
// Playwright's fake clock stops the bundle from mounting once a page has been moved more than
// about 24 days forward (its performance.now() passes 2^31 ms), so every two weeks of simulated
// time the phone's storage is handed to a fresh browser, like the same phone after a restart.
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
const DAY = 24 * 60 * 60 * 1000;

/** "2026-11-19 19:05" in Chicago time. US daylight time ends on Sunday Nov 1, 2026. */
function at(local) {
  const [day, time] = local.split(" ");
  return new Date(`${day}T${time}:00${day < "2026-11-01" ? "-05:00" : "-06:00"}`);
}

const BEER = "Log a pint of beer, 1.5 drinks";
const WINE = "Log a glass of wine, 1.4 drinks";
const SHOT = "Log a cocktail or shot, 1 drink";
const FREE = "Mark today alcohol-free";

// What the athlete logged after onboarding, in order. Weeks start on Monday (the app's default).
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

let server;
const errors = [];
const wait = (page, ms = 500) => page.waitForTimeout(ms);

/** A fresh phone at `time`, holding `saved` storage when given (else a new install). */
async function openPhone(time, saved) {
  const p = await phone({ colorScheme: "dark", clock: time, timezoneId: TIMEZONE });
  // Motion components show their final state at once (the app's own still-render switch).
  await p.context.addInitScript(() => {
    globalThis.__appbuilderStill = true;
  });
  await p.page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await p.page.goto(server.url + "/", { waitUntil: "networkidle" });
  if (saved) {
    await p.page.evaluate((entries) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    }, saved);
    await p.page.reload({ waitUntil: "networkidle" });
  }
  await wait(p.page, 2000);
  return { ...p, started: time.getTime() };
}

async function closePhone(p) {
  errors.push(...p.errors);
  await p.browser.close();
}

async function storage(page) {
  return page.evaluate(() =>
    Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
  );
}

async function tap(page, label, ms = 450) {
  await page.getByLabel(label, { exact: true }).filter({ visible: true }).first().click({ timeout: 10000 });
  await wait(page, ms);
}

async function tapText(page, text, ms = 450) {
  await page.getByText(text, { exact: true }).filter({ visible: true }).first().click({ timeout: 10000 });
  await wait(page, ms);
}

async function radio(page, name, ms = 450) {
  await page.getByRole("radio", { name, exact: true }).filter({ visible: true }).first().click({ timeout: 10000 });
  await wait(page, ms);
}

async function openTab(page, name) {
  await page.getByRole("tab", { name }).filter({ visible: true }).first().click({ timeout: 10000 });
  await wait(page, 1500);
}

/**
 * Move the phone's clock forward to `time` and open Tonight. On a new day the app is reloaded
 * (it is opened again); after two weeks of simulated time the storage moves to a fresh browser.
 */
async function moveTo(p, time) {
  if (time.getTime() - p.started > 14 * DAY) {
    const saved = await storage(p.page);
    await closePhone(p);
    return openPhone(new Date(time.getTime() - 60 * 1000), saved).then((fresh) => moveTo(fresh, time));
  }
  const { page } = p;
  const now = await page.evaluate(() => Date.now());
  const before = await page.evaluate(() => new Date().toDateString());
  if (time.getTime() > now) await page.clock.fastForward(time.getTime() - now);
  await wait(page, 300);
  if ((await page.evaluate(() => new Date().toDateString())) !== before) {
    await page.reload({ waitUntil: "networkidle" });
    await wait(page, 1500);
  }
  return p;
}

/** Scroll the visible screen so the element with this exact text sits `offset` pt from the top. */
async function scrollToText(page, text, offset) {
  await page.evaluate(
    ({ text, offset }) => {
      const el = [...document.querySelectorAll("body *")].find(
        (node) => node.textContent === text && node.offsetParent !== null && node.children.length === 0,
      );
      if (!el) throw new Error(`no visible "${text}"`);
      let box = el.parentElement;
      while (
        box &&
        !(box.scrollHeight > box.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))
      )
        box = box.parentElement;
      if (!box) throw new Error("no scroll container");
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - offset;
    },
    { text, offset },
  );
  await wait(page, 600);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = await serve(build, 8131);

  // ---- A new install on Monday Oct 26: onboarding, then Settings ----
  let p = await openPhone(at("2026-10-26 18:30"));
  let page = p.page;
  await tap(page, "Soccer / basketball. Matches, scrimmages and sprints");
  await tapText(page, "Next: your weekly limit", 900);
  await tap(page, "Up to 10 drinks a week. Room for a couple of social evenings.");
  await shoot(page, out("onboarding-limit.png"));
  await tapText(page, "Next: log today", 900);
  await tap(page, FREE, 900);
  await tapText(page, "Next: daily reminder", 900);
  await tapText(page, "Not now, finish setup", 2000);
  await tap(page, "Not now, keep the free version", 1500);

  // Saturday games, and a body profile for the BAC estimate.
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

  // ---- Four weeks of entries, each tapped at the time it was had ----
  for (const [when, label] of DIARY) {
    p = await moveTo(p, at(when));
    await tap(p.page, label, 500);
  }

  // Thursday Nov 19, evening: a clear day inside the limit, two days before the match.
  p = await moveTo(p, at("2026-11-19 19:05"));
  page = p.page;
  await page.reload({ waitUntil: "networkidle" });
  await wait(page, 2500);
  await shoot(page, out("tonight-thursday.png"));
  const thursday = await storage(page);
  await openTab(page, "Week");
  await shoot(page, out("week-thursday.png"));
  await openTab(page, "Career");
  await shoot(page, out("career-thursday.png"));
  await openTab(page, "Tonight");

  // Friday Nov 20: two pints the night before the match.
  p = await moveTo(p, at("2026-11-20 20:00"));
  await tap(p.page, BEER, 600);
  p = await moveTo(p, at("2026-11-20 21:10"));
  await tap(p.page, BEER, 600);
  p = await moveTo(p, at("2026-11-20 21:25"));
  page = p.page;
  await page.reload({ waitUntil: "networkidle" });
  await wait(page, 2500);
  await openTab(page, "Week");
  await shoot(page, out("week-friday.png"));
  await closePhone(p);

  await plusScreens(thursday);
})()
  .then(() => {
    console.log("errors:", errors.length ? errors : "none");
    server.close();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/** The same phone on Thursday evening, upgraded to Plus with the test-mode purchase. */
async function plusScreens(thursday) {
  const p = await openPhone(at("2026-11-19 19:06"), thursday);
  const { page } = p;
  await tap(page, "Settings", 1200);
  await tap(page, "ShotOClock Plus", 1500);
  await tap(page, "Start 7-day free trial", 2500);
  await page.goBack();
  await wait(page, 1200);
  await openTab(page, "Week");
  await scrollToText(page, "Trend insights", 28);
  await shoot(page, out("week-plus-insights.png"));
  await openTab(page, "Tonight");
  await tap(page, "Settings", 1200);
  await tap(page, "Lighter limit this week");
  await radio(page, "6");
  await shoot(page, out("settings-lighter-limit.png"));
  await closePhone(p);
}
