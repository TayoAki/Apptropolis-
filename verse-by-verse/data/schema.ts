// Shapes of the app's records and the small helpers the screens share. Pure functions only:
// no storage and no React.

export const DAY_MS = 86_400_000;

/** Stored in a bookmark's folder to mark where the reader left off. Hidden from lists. */
export const READING_POSITION = "__reading_position";

/** How many keyword matches the free search shows. Premium shows them all, highlighted. */
export const FREE_KEYWORD_RESULTS = 3;

/**
 * One verse with its text. Verses are not stored: they come from the Bible text (data/bible.ts),
 * and `id` is "BOOK.chapter.verse", e.g. "JHN.3.16".
 */
export interface Verse {
  id: string;
  /** Book name as shown, e.g. "John". */
  book: string;
  /** Canonical position of the book (Genesis is 1, Revelation is 66). */
  bookOrder: number;
  chapter: number;
  verse: number;
  /** Scripture text, World English Bible (ENGWEBP), as published. */
  text: string;
  /** A prepared study note exists for this verse. */
  hasNote: boolean;
}

export interface StudyNote {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  /** Short heading for the note. */
  title: string;
  /** Commentary. Always shown labelled as commentary, never as Scripture. */
  body: string;
}

/**
 * A saved verse, or the reading place. It names the verse by book, chapter and verse (not by an
 * id), so rows saved when the app held 50 verses still find their verse in the whole Bible.
 */
export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  /** Copy of the verse text, so lists need no lookup. */
  text: string;
  /** Folder name (premium), or "" for none. READING_POSITION marks the resume point. */
  folder: string;
  /** ISO date the verse was saved. */
  createdAt: string;
}

/** What is stored on the phone. (Versions that held 50 verses also stored "verses"; unused now.) */
export interface Collections {
  study_notes: StudyNote[];
  bookmarks: Bookmark[];
}

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

/** "John 3:16" */
export function formatReference(ref: VerseRef): string {
  return `${ref.book} ${ref.chapter}:${ref.verse}`;
}

export function isSameVerse(a: VerseRef, b: VerseRef): boolean {
  return a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;
}

/** The note for a verse, if one was prepared. */
export function noteFor(notes: StudyNote[], ref: VerseRef): StudyNote | undefined {
  return notes.find((note) => isSameVerse(note, ref));
}

/** Saved verses (never the reading position), newest first. */
export function savedBookmarks(items: Bookmark[]): Bookmark[] {
  return items
    .filter((b) => b.folder !== READING_POSITION)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** The verse the reader left off at, once they have read before. */
export function readingPosition(items: Bookmark[]): Bookmark | undefined {
  return items.find((b) => b.folder === READING_POSITION);
}

/** The saved bookmark for a verse, if there is one. */
export function findBookmark(items: Bookmark[], ref: VerseRef): Bookmark | undefined {
  return items.find((b) => b.folder !== READING_POSITION && isSameVerse(b, ref));
}

/** An ISO date `days` before `from` (now by default). Used for seed data and "x days ago". */
export function isoDaysAgo(days: number, from: number = Date.now()): string {
  return new Date(from - days * DAY_MS).toISOString();
}

/** Whole calendar days from a date to now, by the phone's clock: 0 today, 1 yesterday. */
export function daysSince(iso: string, now: Date = new Date()): number {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((midnight(now) - midnight(new Date(iso))) / DAY_MS);
}

/** "Today", "Yesterday", or a short date ("Mar 4", or "Mar 4, 2024" from another year). */
export function formatDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = daysSince(iso, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
