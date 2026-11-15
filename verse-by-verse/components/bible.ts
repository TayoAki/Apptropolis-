// The Bible for screens: wait for the books a screen shows, and the passages setup offers.
import { useCallback, useEffect, useState } from "react";
import { bookOf, loadBook, onBookLoaded, peekBook } from "../data/bible";
import type { VerseRef } from "../data/schema";

/**
 * Loads the books a screen needs (by id; undefined entries are ignored) and re-renders when
 * they arrive. On a phone a book is ready almost at once; the web build fetches each book the
 * first time it is opened. `failed` turns true when a book couldn't be loaded; `retry` tries again.
 */
export function useBooks(ids: Array<string | undefined>): {
  ready: boolean;
  failed: boolean;
  retry: () => void;
} {
  const wanted = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  const key = wanted.join(",");
  const [, rerender] = useState(0);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const books = key.split(",");
    if (books.every((id) => peekBook(id))) return;
    setFailedKey(null);
    // Another screen may load a book this one shows: re-render then too.
    const unsubscribe = onBookLoaded(() => alive && rerender((n) => n + 1));
    Promise.all(books.map(loadBook)).then(
      () => alive && rerender((n) => n + 1),
      () => alive && setFailedKey(key),
    );
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [key, attempt]);

  const ready = wanted.every((id) => peekBook(id) !== undefined);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ready, failed: !ready && failedKey === key, retry };
}

/** The id of the book a reference is in, if it names one. */
export function bookIdOf(ref: Pick<VerseRef, "book"> | undefined | null): string | undefined {
  return ref ? bookOf(ref.book)?.id : undefined;
}

/**
 * The starting passages setup offers, one per book. A book chosen during setup opens here when
 * there is no reading place yet; any other book opens at its first verse.
 */
export const STARTING_PASSAGES: VerseRef[] = [
  { book: "Genesis", chapter: 1, verse: 1 },
  { book: "Psalms", chapter: 23, verse: 1 },
  { book: "Proverbs", chapter: 1, verse: 7 },
  { book: "John", chapter: 1, verse: 1 },
];

/** Where a book chosen during setup starts: its curated passage, else chapter 1 verse 1. */
export function startOf(bookName: string | undefined): VerseRef | undefined {
  if (!bookName) return undefined;
  const book = bookOf(bookName);
  if (!book) return undefined;
  return (
    STARTING_PASSAGES.find((p) => p.book === book.name) ?? { book: book.name, chapter: 1, verse: 1 }
  );
}
