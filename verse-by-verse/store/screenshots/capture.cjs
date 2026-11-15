// Captures Verse by Verse's App Store screens from the real web build. The demo reader is
// fictional: a few weeks in, started at Psalm 23 during setup, now reading Romans 8, with nine
// saved verses (four in Comfort, three in Promises) and Premium (the app's test-mode purchase,
// stored the way the app stores it). Everything is seeded in the app's own storage shapes before
// the app loads; every screen after that is reached through the app's own controls.
// Usage: node capture.cjs <web-build-dir> <captures-dir>
const path = require("path");
const { serve, phone, shoot } = require("../../../tools/store-screenshots/capture-lib.cjs");

const [build, outDir] = process.argv.slice(2);
if (!build || !outDir) {
  console.error("Usage: node capture.cjs <web-build-dir> <captures-dir>");
  process.exit(2);
}

const DAY = 86_400_000;
const now = Date.now();
const ago = (days, hours = 0) => new Date(now - days * DAY - hours * 3_600_000).toISOString();

// Saved verses: [book, chapter, verse, folder, days ago, text]. The text is the app's own
// (World English Bible, ENGWEBP); Saved shows the Bible's text for each row in any case.
const SAVED = [
  ["John", 14, 27, "Comfort", 0, "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don’t let your heart be troubled, neither let it be fearful."],
  ["Lamentations", 3, 23, "", 1, "They are new every morning. Great is your faithfulness."],
  ["Romans", 8, 28, "Promises", 2, "We know that all things work together for good for those who love God, for those who are called according to his purpose."],
  ["Matthew", 11, 28, "Comfort", 5, "“Come to me, all you who labor and are heavily burdened, and I will give you rest."],
  ["Isaiah", 40, 31, "Promises", 9, "but those who wait for the LORD will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."],
  ["Psalms", 46, 1, "Comfort", 12, "God is our refuge and strength, a very present help in trouble."],
  ["Isaiah", 41, 10, "Promises", 16, "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."],
  ["Psalms", 23, 4, "Comfort", 19, "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me."],
  ["Proverbs", 3, 5, "", 22, "Trust in the LORD with all your heart, and don’t lean on your own understanding."],
];

const bookmarks = [
  {
    id: "reading-position",
    book: "Romans",
    chapter: 8,
    verse: 28,
    text: SAVED[2][5],
    folder: "__reading_position",
    createdAt: ago(0, 13),
  },
  ...SAVED.map(([book, chapter, verse, folder, days, text], i) => ({
    id: `demo${i + 1}`,
    book,
    chapter,
    verse,
    text,
    folder,
    createdAt: ago(days, 2 + i),
  })),
];

const storage = {
  "app:onboarded": "1",
  "app:answers": JSON.stringify({
    startingbook: "Psalms",
    "onboarding.step": "0",
    "onboarding.reminderTime": "0",
    "search.recent": JSON.stringify([
      { book: "Romans", chapter: 8, verse: 1 },
      { book: "Lamentations", chapter: 3, verse: 22 },
      { book: "John", chapter: 14, verse: 27 },
    ]),
  }),
  "app:collection:bookmarks": JSON.stringify(bookmarks),
  // Premium, as the app records a purchase made in its test mode.
  "app:entitlement": JSON.stringify({ offerId: "yearly", since: ago(20) }),
};

(async () => {
  const server = await serve(build, 8136);
  const { browser, page, errors } = await phone({ storage });
  const out = (n) => path.join(outDir, n);
  const wait = (ms) => page.waitForTimeout(ms);
  const tab = async (name) => {
    await page.getByRole("tab", { name: new RegExp(name) }).click();
    await wait(1200);
  };

  await page.goto(server.url + "/", { waitUntil: "networkidle" });
  await wait(2500);

  // 2. The place kept: the Read tab opens at Romans 8:28; its chapter, at that verse.
  await page.getByLabel("Read all of Romans chapter 8").click();
  await wait(2500);
  await shoot(page, out("chapter-left-off.png"));
  await page.getByText("Back to Read", { exact: true }).click();
  await wait(1500);

  // 3. The whole Bible: the passage picker's 66 books.
  await page.getByLabel(/^Choose a passage/).click();
  await wait(600);
  await page.getByRole("button", { name: "Show all books" }).click();
  await wait(800);
  await shoot(page, out("picker-books.png"));

  // 1. One verse with its study note: Psalm 46:10, chosen in the same picker.
  await page.getByRole("button", { name: "Psalms", exact: true }).click();
  await wait(500);
  await page.getByRole("button", { name: "Chapter 46", exact: true }).click();
  await wait(500);
  await page.getByRole("button", { name: "Verse 10", exact: true }).click();
  await wait(1500);
  await page.getByRole("button", { name: "Study note" }).click();
  await wait(1500);
  await shoot(page, out("read-note.png"));

  // 5. Find any passage: a reference search.
  await tab("Search");
  await page.getByRole("tab", { name: "Reference jump" }).click();
  await page.getByLabel("Search by reference").fill("Psalm 23");
  await wait(1500);
  await page.getByLabel("Search by reference").blur();
  await wait(1200);
  await shoot(page, out("search-reference.png"));

  // 6. Premium: every keyword match, highlighted.
  await page.getByLabel("Clear search").click();
  await page.getByRole("tab", { name: "Keywords" }).click();
  await wait(400);
  await page.getByLabel("Search by keyword").fill("love one another");
  await page.getByText(/verses? match$/).first().waitFor({ timeout: 30000 });
  await page.getByLabel("Search by keyword").blur();
  await wait(2500);
  await shoot(page, out("search-keywords.png"));

  // 7. Premium: folders. 4. Sharing a saved verse as a card.
  await tab("Saved");
  await page.getByLabel(/^Comfort, \d+ verses?$/).click();
  await wait(1800);
  await shoot(page, out("saved-folder.png"));
  await page.getByLabel(/^All, \d+ verses?$/).click();
  await wait(1200);
  await page.getByLabel("Share John 14:27 as a card").click();
  await wait(1800);
  await shoot(page, out("share-card.png"));

  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
