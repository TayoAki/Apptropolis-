#!/usr/bin/env node
// Regenerates the app's Bible text (data/bible/) from the Free Use Bible API.
//
//   node scripts/build-bible.mjs                  # download complete.json and rebuild
//   node scripts/build-bible.mjs --input file.json # rebuild from a complete.json already on disk
//   node scripts/build-bible.mjs --translation eng_web   # another edition (e.g. WEB Classic)
//
// Source: https://bible.helloao.org/api/<translation>/complete.json (World English Bible,
// ENGWEBP, as published by eBible.org: https://ebible.org/Scriptures/details.php?id=engwebp).
// The WEB is in the public domain. eBible.org asks only that a changed text not be called the
// World English Bible, so this script keeps every word of every verse and drops only what is not
// verse text: footnote markers and section headings (e.g. the Psalm 119 letters). Psalm titles
// ("A Psalm by David.") are kept apart from the verses, for the chapter view.
//
// Writes:
//   data/bible/<BOOK>.json  one book: an array of chapters, each an array of verse strings
//                           (index 0 is verse 1). A verse the edition leaves out is "".
//   data/bible/index.json   the books in canonical order with each chapter's verse count, the
//                           Psalm titles, the footnotes that explain the left-out verses, and where
//                           the text came from.
//   data/bible/files.ts     a function per book that loads its file with import(), so a book is
//                           evaluated only when it is first opened, and the web build fetches each
//                           book as its own file instead of putting the whole Bible in the first
//                           download (measured: +4.2 MB to the Read tab's bundle with require()).
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "data", "bible");

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const translation = option("--translation") ?? "ENGWEBP";
const input = option("--input");
const sourceUrl = `https://bible.helloao.org/api/${translation}/complete.json`;

async function loadComplete() {
  if (input) return JSON.parse(await readFile(input, "utf8"));
  process.stdout.write(`Downloading ${sourceUrl} … `);
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${sourceUrl} answered ${response.status}`);
  const text = await response.text();
  console.log(`${(text.length / 1e6).toFixed(1)} MB`);
  return JSON.parse(text);
}

/** Text that closes up to the word before it: no space goes in front of it. */
const CLOSING = /^[,.;:!?’”)\]]/;
/** Text that opens onto the word after it: no space goes after it. */
const OPENING = /[“‘([]$/;

/**
 * One verse's text from its content items: plain strings, {text} runs (poetry lines, words of
 * Jesus), footnote markers ({noteId}) and line breaks. Footnote markers, line breaks and
 * descriptive headings are left out; the words are joined with single spaces.
 */
function verseText(content) {
  let out = "";
  for (const item of content) {
    let piece;
    if (typeof item === "string") piece = item;
    else if (item && typeof item.text === "string" && !item.descriptive) piece = item.text;
    else continue; // { noteId }, { lineBreak }, { heading }, descriptive headings
    piece = piece.replace(/\s+/g, " ").trim();
    if (!piece) continue;
    if (out && !CLOSING.test(piece) && !OPENING.test(out)) out += " ";
    out += piece;
  }
  return out;
}

const complete = await loadComplete();
const books = complete.books;
if (!Array.isArray(books) || books.length === 0) throw new Error("No books in the download");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const index = [];
const omitted = {};
const titles = {};
let verseTotal = 0;
let textTotal = 0;

for (const book of [...books].sort((a, b) => a.order - b.order)) {
  const chapters = [];
  for (const entry of book.chapters) {
    const chapter = entry.chapter;
    const verses = [];
    for (const item of chapter.content) {
      if (item.type === "hebrew_subtitle" && verses.length === 0) {
        // A Psalm title, before verse 1. Kept as published, apart from the verses.
        const title = verseText(item.content);
        if (title) titles[`${book.id}.${chapter.number}`] = title;
        continue;
      }
      if (item.type !== "verse") continue;
      if (item.number !== verses.length + 1) {
        throw new Error(`${book.id} ${chapter.number}: verse ${item.number} out of order`);
      }
      const text = verseText(item.content);
      verses.push(text);
      verseTotal += 1;
      if (text) textTotal += 1;
      else {
        // A verse number the edition leaves out (e.g. Acts 8:37): keep its footnote to explain.
        const notes = item.content
          .filter((x) => x && typeof x.noteId === "number")
          .map((x) => chapter.footnotes?.find((f) => f.noteId === x.noteId)?.text)
          .filter(Boolean);
        omitted[`${book.id}.${chapter.number}.${item.number}`] = notes.join(" ");
      }
    }
    if (chapter.number !== chapters.length + 1) {
      throw new Error(`${book.id}: chapter ${chapter.number} out of order`);
    }
    chapters.push(verses);
  }
  await writeFile(join(outDir, `${book.id}.json`), JSON.stringify(chapters));
  index.push({
    id: book.id,
    name: book.commonName || book.name,
    short: book.shortName,
    verses: chapters.map((c) => c.length),
  });
}

const t = complete.translation;
const meta = {
  translation: {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    website: t.website,
    license: t.license?.publicDomain ? "Public domain" : JSON.stringify(t.license),
    source: sourceUrl,
    sha256: t.sha256,
    built: new Date().toISOString().slice(0, 10),
  },
  totals: { books: index.length, chapters: index.reduce((n, b) => n + b.verses.length, 0), verses: verseTotal, withText: textTotal },
  books: index,
  titles,
  omitted,
};
// Pretty enough to read in a diff: one line per book and per left-out verse.
const { books: bookList, titles: heads, omitted: left, ...head } = meta;
const entries = (object) =>
  Object.entries(object).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
const lines = [
  "{",
  ...Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
  '  "books": [',
  bookList.map((b) => `    ${JSON.stringify(b)}`).join(",\n"),
  "  ],",
  '  "titles": {',
  entries(heads),
  "  },",
  '  "omitted": {',
  entries(left),
  "  }",
  "}",
];
await writeFile(join(outDir, "index.json"), lines.join("\n") + "\n");

// One loader per book, each a static import() so Metro can see every file. On a phone the books
// are in the app bundle and one is evaluated only when it is first opened; the web build makes
// each book its own file, fetched when it is first opened.
const loaders = index
  .map((b) => `  ${JSON.stringify(b.id)}: () => import("./${b.id}.json"),`)
  .join("\n");
await writeFile(
  join(outDir, "files.ts"),
  `// GENERATED by scripts/build-bible.mjs — do not edit. Rebuild with: node scripts/build-bible.mjs

/** One book's text: chapters of verses (index 0 is verse 1; a verse left out is ""). */
export type BookText = string[][];

/** Loads a book's file the first time it is called (data/bible.ts keeps what was loaded). */
export const BOOK_FILES: Record<string, () => Promise<{ default: BookText } | BookText>> = {
${loaders}
};
`,
);

const files = await readdir(outDir);
const bytes = (
  await Promise.all(files.map(async (f) => (await readFile(join(outDir, f))).length))
).reduce((a, b) => a + b, 0);
const digest = createHash("sha256");
for (const f of files.sort()) digest.update(await readFile(join(outDir, f)));
console.log(
  `${meta.totals.books} books, ${meta.totals.chapters} chapters, ${verseTotal} verses ` +
    `(${Object.keys(omitted).length} without text) → data/bible (${files.length} files, ` +
    `${(bytes / 1e6).toFixed(2)} MB, sha256 ${digest.digest("hex").slice(0, 12)})`,
);
