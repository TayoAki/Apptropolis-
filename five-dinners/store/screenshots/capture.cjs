// Captures Five Dinners' App Store screens from the real web build. Nothing is seeded: a
// fictional household sets the app up through its own onboarding and then uses it for two weeks,
// with page.clock moving the phone's date (America/Chicago) from one day to the next.
//
// The demo household: 4 people, a $65 weekly dinner budget, no pork, with olive oil, rice,
// onions, garlic, cumin and paprika already in the cupboard. Sunday Nov 15, 2026 they finish
// onboarding (the app plans their free week), shop that morning, logging a few shelf prices,
// and cook Monday to Friday. Sunday Nov 22 the free week is over: the paywall's test-mode
// purchase (simulated, nothing charged) unlocks unlimited plans, and week 2 is planned around
// what's left. Every dinner, pack, amount and price on screen is what the app produced from
// those taps; the only typed numbers are the shelf prices the shopper logs.
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
const PORT = 8137;

// Local times in Chicago (November is UTC-6).
const T = {
  setup: "2026-11-15T09:30:00-06:00", // Sunday: onboarding plans the free week
  shop1: "2026-11-15T11:10:00-06:00", // at the store
  cook: [
    "2026-11-16T18:30:00-06:00",
    "2026-11-17T18:40:00-06:00",
    "2026-11-18T18:20:00-06:00",
    "2026-11-19T18:35:00-06:00",
    "2026-11-20T18:25:00-06:00",
  ],
  week2: "2026-11-22T09:20:00-06:00", // next Sunday: the free week has ended
  shop2: "2026-11-22T11:05:00-06:00",
};

// Shelf prices the shopper types in on the Shop tab (pack name -> dollars), by week.
const PAID = {
  1: { "Chicken thighs": 6.92, "Ground beef 93/7": 7.21, Carrots: 2.19, "Bell peppers": 2.99 },
  2: { "Chicken thighs": 6.57, "Bell peppers": 2.89, "Wild pink salmon (frozen)": 10.15 },
};

const crops = {};
const errors = [];

async function main() {
  const server = await serve(path.resolve(build), PORT);
  const { browser, page } = await phone({ colorScheme: "light", clock: new Date(T.setup) });
  page.on("pageerror", (e) => errors.push(e.message));

  const at = (iso) => page.clock.setSystemTime(new Date(iso));
  const go = async (route) => {
    await page.goto(server.url + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  };
  const store = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), key);
  async function plan() {
    const plans = ((await store("app:collection:week_plans")) || []).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart),
    );
    const p = plans[plans.length - 1];
    const dinners = ((await store("app:collection:plan_dinners")) || [])
      .filter((d) => d.planId === p.id)
      .sort((a, b) => a.dayIndex - b.dayIndex);
    return { plan: p, dinners };
  }
  /** Scroll the screen's scroll view so `locator` sits `top` points from the top. */
  async function scrollTo(locator, top) {
    await locator.first().evaluate((el, top) => {
      let s = el.parentElement;
      while (s && !(s.scrollHeight > s.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(s).overflowY)))
        s = s.parentElement;
      if (s) s.scrollTop += el.getBoundingClientRect().top - top;
    }, top);
    await page.waitForTimeout(400);
  }
  /** Note an element's box (app points) for the spec's callout crops. */
  async function note(name, locator) {
    const b = await locator.first().boundingBox();
    crops[name] = b && [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
  }
  async function logPaid(week) {
    for (const [name, amount] of Object.entries(PAID[week])) {
      const box = page.getByLabel(`What you paid for ${name}`);
      if (!(await box.count())) continue;
      await box.fill(amount.toFixed(2));
      await box.press("Enter");
      await page.waitForTimeout(300);
    }
  }
  // ===== Sunday Nov 15: onboarding plans the free week =====
  await go("/");
  await page.getByRole("radio", { name: "4, A family of four" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "$65, Room for a treat" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "No pork" }).click();
  await page.waitForTimeout(300);
  await shoot(page, out("onboarding-foods.png"));
  await note("foods", page.getByRole("checkbox", { name: "Vegetarian" }));
  await page.getByRole("button", { name: "Continue" }).click();
  for (const n of ["Olive oil", "Rice", "Onions", "Garlic", "Cumin", "Paprika"]) {
    await page.getByRole("checkbox", { name: `${n} in the cupboard` }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Not now" }).click();
  await page.waitForTimeout(2500);
  // The template opens the paywall over the new week; it is closed without buying (never captured).
  if (await page.getByRole("button", { name: "Close" }).count()) {
    await page.getByRole("button", { name: "Close" }).click();
  }
  await go("/");
  await shoot(page, out("week1.png"));
  await note("week1-basket", page.getByText("This week's basket"));

  // Swap options for Monday's dinner, cheapest first, with the change to the list.
  let { dinners } = await plan();
  const monday = page.getByRole("button", { name: /^Swap / }).first();
  const mondayName = (await monday.getAttribute("aria-label")).replace(/^Swap /, "");
  await monday.click();
  await page.waitForTimeout(500);
  await scrollTo(page.getByText("Five dinners", { exact: true }), 12);
  await shoot(page, out("week1-swap.png"));
  await note("swap-panel", page.getByText(/^Swap for one of these/));
  await note("swap-locked", page.getByRole("button", { name: /more recipes$/ }));
  await page.getByRole("button", { name: `Close swap options for ${mondayName}` }).click();

  // ===== At the store: tick as you go, log a few shelf prices =====
  await at(T.shop1);
  await go("/shop");
  await page.getByRole("button", { name: "Tick everything in Produce" }).click();
  for (const name of ["Chicken thighs", "Ground beef 93/7"]) {
    await page.getByRole("checkbox", { name: new RegExp(`^${name.replace(/[/()]/g, "\\$&")}, Buy`) }).click();
  }
  await page.waitForTimeout(400);
  await logPaid(1);
  await scrollTo(page.getByText("Shop", { exact: true }), 0);
  await shoot(page, out("shop-ticking.png"));
  await note("shop-card", page.getByText("Estimate", { exact: true }));
  await note("shop-onions", page.getByRole("checkbox", { name: /^Yellow onions, / }));
  // Then the rest of the list goes in the cart.
  for (const title of ["Meat & seafood", "Dairy & eggs", "Pantry", "Frozen & bakery"]) {
    const b = page.getByRole("button", { name: `Tick everything in ${title}` });
    if (await b.count()) await b.click();
  }
  await page.waitForTimeout(500);

  // ===== Monday to Friday: cook =====
  ({ dinners } = await plan());
  for (let i = 0; i < dinners.length; i++) {
    await at(T.cook[i]);
    const d = dinners[i];
    if (i === 2) {
      // Wednesday: open the recipe before cooking it.
      await go(`/recipe/${d.id}`);
      await shoot(page, out("recipe.png"));
      await scrollTo(page.getByText("Method", { exact: true }), 96);
      await shoot(page, out("recipe-method.png"));
      await note("recipe-method", page.getByText("Method", { exact: true }));
      await page.getByRole("button", { name: "Mark cooked" }).click();
      await page.getByRole("button", { name: "Liked it" }).click();
      await page.waitForTimeout(400);
      await go("/cook");
      await shoot(page, out("cook-midweek.png"));
      await note("cook-left", page.getByText("What's left").first());
      continue;
    }
    await go("/cook");
    await page.getByRole("button", { name: /^Mark .* as cooked$/ }).first().click();
    await page.waitForTimeout(600);
    // They rate most dinners; Tuesday's goes unrated.
    if (i !== 1) await page.getByRole("button", { name: "Liked it" }).last().click();
    await page.waitForTimeout(300);
  }

  // ===== Sunday Nov 22: the free week is over; unlock and plan around what's left =====
  await at(T.week2);
  await go("/");
  await page.waitForTimeout(800);
  await go("/paywall");
  await page.getByRole("button", { name: /^Unlock for / }).click(); // test mode: simulated
  await page.waitForTimeout(2000);
  await go("/");
  await page.getByRole("button", { name: "Plan next week" }).click();
  await page.waitForTimeout(2000);
  await go("/");
  await shoot(page, out("week2.png"));
  await note("week2-carried", page.getByText(/^Carried over:/));
  await scrollTo(page.getByText("Five dinners", { exact: true }), 12);
  await shoot(page, out("week2-dinners.png"));
  await note("week2-rows", page.getByRole("button", { name: /^Open recipe: / }));

  // ===== Week 2 at the store, then the price history =====
  await at(T.shop2);
  await go("/shop");
  for (const title of ["Produce", "Meat & seafood", "Frozen & bakery"]) {
    const b = page.getByRole("button", { name: `Tick everything in ${title}` });
    if (await b.count()) await b.click();
  }
  await page.waitForTimeout(400);
  await logPaid(2);
  await shoot(page, out("shop-week2.png"));
  await page.getByRole("button", { name: "Price history" }).click();
  await page.waitForTimeout(500);
  await scrollTo(page.getByRole("button", { name: "Price history" }), 150);
  await shoot(page, out("price-history.png"));
  await note("history", page.getByRole("button", { name: "Price history" }));

  fs.writeFileSync(out("crops.json"), JSON.stringify(crops, null, 2));
  console.log(JSON.stringify(crops));
  if (errors.length) console.log("page errors:", errors);
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
