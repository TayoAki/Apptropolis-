// Shapes of the app's records and the small helpers the screens share. Pure functions only:
// no storage and no React.

export const DAY_MS = 86_400_000;

/** Stored in a bookmark's folder to mark where the reader left off. Hidden from lists. */
export const READING_POSITION = "__reading_position";

export interface Verse {
  id: string;
  /** Book name as shown, e.g. "John". */
  book: string;
  /** Canonical position of the book (Genesis is 1, Revelation is 66). */
  bookOrder: number;
  chapter: number;
  verse: number;
  /** Scripture text, World English Bible. */
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

export interface Collections {
  verses: Verse[];
  study_notes: StudyNote[];
  bookmarks: Bookmark[];
}

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface ParsedReference {
  book: string;
  chapter: number;
  /** Undefined for a whole chapter, e.g. "Psalms 23". */
  verse?: number;
}

/** "John 3:16" */
export function formatReference(ref: VerseRef): string {
  return `${ref.book} ${ref.chapter}:${ref.verse}`;
}

export function isSameVerse(a: VerseRef, b: VerseRef): boolean {
  return a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;
}

/** Canonical reading order: book, then chapter, then verse. Returns a new array. */
export function sortCanonical<T extends Pick<Verse, "bookOrder" | "chapter" | "verse">>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => a.bookOrder - b.bookOrder || a.chapter - b.chapter || a.verse - b.verse,
  );
}

/** One chapter's verses in order, for the chapter-context screen. */
export function chapterVerses(verses: Verse[], book: string, chapter: number): Verse[] {
  return sortCanonical(verses.filter((v) => v.book === book && v.chapter === chapter));
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

/**
 * Read what someone typed into a reference: "john 3:16", "1 John 2", "Psalm 23", "ps 23:1".
 * `books` are the book names the app holds. Returns null when no book matches.
 */
export function parseReference(query: string, books: string[]): ParsedReference | null {
  const match = /^\s*(.*?)\s+(\d+)(?::(\d+))?\s*$/.exec(query);
  if (!match) return null;
  const wanted = (match[1] ?? "").replace(/\s+/g, "").toLowerCase();
  if (!wanted) return null;
  const squash = (name: string) => name.replace(/\s+/g, "").toLowerCase();
  const book =
    books.find((name) => squash(name) === wanted) ??
    books.find((name) => squash(name).startsWith(wanted));
  if (!book) return null;
  return {
    book,
    chapter: Number(match[2]),
    verse: match[3] ? Number(match[3]) : undefined,
  };
}

/** An ISO date `days` before `from` (now by default). Used for seed data and "x days ago". */
export function isoDaysAgo(days: number, from: number = Date.now()): string {
  return new Date(from - days * DAY_MS).toISOString();
}

/** "Today", "Yesterday", or a short date ("Mar 4", or "Mar 4, 2024" from another year). */
export function formatDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(now) - midnight(date)) / DAY_MS);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
