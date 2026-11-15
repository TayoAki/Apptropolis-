// Captures Pip's App Store screens from the real web build against the live Pip API (which holds
// the demo data from backend/demo-data.sql: fictional stores and codes). The demo shopper follows
// three stores; Pip's answers are real answers from the AI service.
// Usage: node capture.cjs <web-build-dir> <captures-dir>
const path = require("path");
const { serve, phone, shoot } = require("../../../tools/store-screenshots/capture-lib.cjs");

const [build, outDir] = process.argv.slice(2);
const answers = {
  ai_consent: "yes",
  interests: "sports,toys,beauty",
  stores: "kestrel-running,little-acorn,glowhaus",
  store_names: "Kestrel Running,Little Acorn Toys,Glowhaus Beauty",
};

async function ask(page, question) {
  await page.getByLabel("Message Pip").fill(question);
  await page.getByRole("button", { name: "Send to Pip" }).click();
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => !document.querySelector('[aria-label="Pip is looking"]'), null, { timeout: 90000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const server = await serve(build, 8120);
  const { browser, context, page, errors } = await phone({
    storage: { "app:onboarded": "1", "app:answers": JSON.stringify(answers) },
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: server.url });
  const out = (n) => path.join(outDir, n);

  await page.goto(server.url + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await shoot(page, out("home.png"));

  await page.goto(server.url + "/assistant", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await ask(page, "Any code for running shoes at Kestrel?");
  await shoot(page, out("ask-code.png"));
  const copy = page.getByRole("button", { name: /^Copy code / }).last();
  await copy.click();
  await page.waitForTimeout(250);
  await shoot(page, out("ask-copied.png"));
  // The gift question in a conversation of its own, so its answer and deals fill the screen.
  {
    const second = await phone({ storage: { "app:onboarded": "1", "app:answers": JSON.stringify(answers) } });
    await second.page.goto(server.url + "/assistant", { waitUntil: "networkidle" });
    await second.page.waitForTimeout(1500);
    await ask(second.page, "Gift for a 6 year old under $40");
    await second.page.waitForTimeout(1500);
    await shoot(second.page, out("ask-gift.png"));
    errors.push(...second.errors);
    await second.browser.close();
  }

  await page.goto(server.url + "/stores", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shoot(page, out("stores.png"));

  await page.goto(server.url + "/store/kestrel-running", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shoot(page, out("store-kestrel.png"));

  // Save three codes, then the Saved tab.
  await page.goto(server.url + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  for (const name of [/^Save Kestrel Running/, /^Save Little Acorn Toys/, /^Save Glowhaus Beauty/]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(700);
  }
  await page.goto(server.url + "/saved", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await shoot(page, out("saved.png"));

  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
  server.close();
})();
