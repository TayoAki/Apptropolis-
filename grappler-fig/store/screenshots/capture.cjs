// Captures Grappler Fig's App Store screens from the real web build against App Cloud (the
// browser context gets its own anonymous account, so every run starts empty).
//
// The demo boxer is fictional: level "Some training", heavy bag, orthodox. Their history is made
// by the app itself: page.clock sets the phone's date to each training day, the script presses
// Start round / Start challenge and fast-forwards the clock through every round and rest, and
// the Train screen saves each session as it would on a phone. That gives ten days of sessions
// with one rest day, so today's challenge makes a 7-day streak. Today the challenge is filmed
// mid-round (clock paused while a punch is showing), finished, then one real coach question is
// asked (one AI call). The scouting screen is the app's own labelled sample report.
//
// Usage: node capture.cjs <web-build-dir> <captures-dir> [--keep-token <file>]
//   --keep-token writes the demo account's token to <file> for retakes; keep it out of the repo.
const fs = require("fs");
const path = require("path");
const { serve, phone, shoot } = require("../../../tools/store-screenshots/capture-lib.cjs");

const [build, outDir, flag, tokenFile] = process.argv.slice(2);
const out = (name) => path.join(outDir, name);

const ANSWERS = {
  skilllevel: "Some training",
  trainingsetup: "Heavy bag",
  stance: "orthodox",
};

// November dates in Central time (UTC-6 after daylight saving ends).
const at = (day, time) => new Date(`2026-11-${day}T${time}:00-06:00`);

// [day of November, start time, sessions]. "round" is the boxer's own timer setup (the Classic
// combo, 5 rounds of 3 minutes, 1 minute rest); "challenge" is that day's challenge. Saturday the
// 7th is a rest day, so the streak that ends today starts on Sunday the 8th.
const HISTORY = [
  ["04", "18:10", ["challenge"]],
  ["05", "18:05", ["round", "challenge"]],
  ["06", "06:40", ["round", "challenge"]],
  ["08", "09:15", ["round", "challenge"]],
  ["09", "06:35", ["challenge"]],
  ["10", "18:20", ["round", "challenge"]],
  ["11", "06:45", ["challenge"]],
  ["12", "18:30", ["round", "challenge"]],
  ["13", "06:40", ["round", "challenge"]],
];
const TODAY = "14";
const QUESTION = "My jab drops after the cross. Why?";

/** Runs the clock forward through a session that has just been started, until it is saved. */
async function finishSession(page) {
  for (let i = 0; i < 400; i++) {
    if (await page.getByText("Session logged", { exact: true }).count()) break;
    // Each jump fires the round timer once: it moves on one phase (work, rest) at a time.
    await page.clock.fastForward(20_000);
    await page.waitForTimeout(40);
  }
  await page.getByText(/saved to Progress\./).waitFor({ timeout: 30_000 });
}

async function startOwnRound(page) {
  await page.getByRole("button", { name: /^Start: Classic combo/ }).click();
}

async function startChallenge(page) {
  await page.getByText("Start challenge", { exact: true }).click();
}

async function open(page, url, wait = 2500) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serve(build, 8133);
  const { browser, page, errors } = await phone({
    colorScheme: "dark",
    clock: at(HISTORY[0][0], HISTORY[0][1]),
    storage: { "app:onboarded": "1", "app:answers": JSON.stringify(ANSWERS) },
  });
  // The scroll views sit under the middle of the screen.
  const scroll = async (dy) => {
    await page.mouse.move(220, 450);
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(900);
  };

  // 1. History: the days before today, trained through the app.
  for (const [day, time, sessions] of HISTORY) {
    await page.clock.setSystemTime(at(day, time));
    await open(page, server.url + "/", 1800);
    for (const kind of sessions) {
      await (kind === "round" ? startOwnRound(page) : startChallenge(page));
      await finishSession(page);
      await page.getByText("Back to setup", { exact: true }).click();
      await page.waitForTimeout(400);
      // The next session starts a few minutes after this one.
      await page.clock.fastForward(4 * 60_000);
    }
    console.log(`Nov ${day}: ${sessions.join(" + ")}`);
  }
  if (flag === "--keep-token" && tokenFile) {
    fs.writeFileSync(tokenFile, await page.evaluate(() => localStorage.getItem("app:auth:token")));
  }

  // 2. Today, before training: the streak stands at 6 and today's challenge waits.
  await page.clock.setSystemTime(at(TODAY, "07:02"));
  await open(page, server.url + "/");
  console.log("streak before:", await page.getByLabel(/day streak$/).first().getAttribute("aria-label"));
  await shoot(page, out("train-idle.png"));

  // 3. Mid-round: round 2 of the challenge, paused 78.4 s in, while "Left hook" is showing.
  await startChallenge(page);
  await page.waitForTimeout(300);
  await page.clock.fastForward(180_400); // round 1 ends: rest
  await page.waitForTimeout(200);
  await page.clock.fastForward(60_400); // rest ends: round 2 starts on this tick
  const roundTwo = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(roundTwo + 78_400);
  await page.waitForTimeout(800);
  await page.getByLabel("Throw: Left hook").waitFor({ timeout: 5000 });
  await shoot(page, out("train-live.png"));
  await page.clock.resume();

  // 4. The challenge finished: logged, +XP, Done, and the streak at 7.
  await finishSession(page);
  await page.waitForTimeout(4500); // the confetti and the XP count-up finish
  console.log("streak after:", await page.getByLabel(/day streak$/).first().getAttribute("aria-label"));
  await shoot(page, out("train-done.png"));

  // 5. One coach question (a real AI answer); its fix goes onto today's session.
  await page.clock.fastForward(6 * 60_000);
  await open(page, server.url + "/coach");
  await page.getByRole("button", { name: QUESTION }).click();
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByText("Coach is writing…").waitFor({ timeout: 10_000 });
  await page.getByText("Coach is writing…").waitFor({ state: "detached", timeout: 120_000 });
  await page.waitForTimeout(2500);
  await shoot(page, out("coach.png"));

  // 6. Progress: level and XP, the last 7 days, and the Fight night card.
  await open(page, server.url + "/progress", 5000); // a 7-day streak plays the confetti once
  await shoot(page, out("progress.png"));
  await scroll(330);
  await shoot(page, out("progress-card.png"));

  // 7. Scout: the sample report the app ships with (no photo of a real person is used).
  await open(page, server.url + "/scout");
  await shoot(page, out("scout.png"));
  await page.getByText("Sample: southpaw partner", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await shoot(page, out("scout-sample.png"));

  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
