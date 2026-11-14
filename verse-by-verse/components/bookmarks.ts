// Saved verses and the reader's place, for every screen that reads or changes them.
// Both live in the "bookmarks" collection: a saved verse is a row with a folder name (or ""),
// and the place the reader left off is one row whose folder is READING_POSITION.
import { useCallback } from "react";
import { useCollection } from "../data/repo";
import {
  READING_POSITION,
  readingPosition,
  type Bookmark,
  type VerseRef,
} from "../data/schema";

/** Id of the reading-position row, so writing it again replaces it instead of adding another. */
const PLACE_ID = "reading-position";

// The on-device store rewrites the whole list on every save, so two saves that overlap can
// drop one of them. Every bookmark write in the app goes through this queue, one at a time.
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

type Passage = VerseRef & { text: string };

export function useBookmarks() {
  const { items, loading, add, update, remove } = useCollection<Bookmark>("bookmarks");
  const place = readingPosition(items);
  const placeId = place?.id ?? PLACE_ID;

  /** Remember where the reader is. Safe to call for every verse they move to. */
  const keepPlace = useCallback(
    (verse: Passage) =>
      inOrder(() =>
        add({
          id: placeId,
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
          folder: READING_POSITION,
          createdAt: new Date().toISOString(),
        }),
      ),
    [add, placeId],
  );

  /** Save a verse (in no folder). */
  const save = useCallback(
    (verse: Passage) =>
      inOrder(() =>
        add({
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
          folder: "",
          createdAt: new Date().toISOString(),
        }),
      ),
    [add],
  );

  /** Put a saved verse in a folder, or take it out of its folder with "". */
  const setFolder = useCallback(
    (id: string, folder: string) => inOrder(() => update(id, { folder })),
    [update],
  );

  const removeSaved = useCallback((id: string) => inOrder(() => remove(id)), [remove]);

  /** Put back a saved verse exactly as it was (undo a removal). */
  const restore = useCallback((bookmark: Bookmark) => inOrder(() => add(bookmark)), [add]);

  return { items, loading, place, keepPlace, save, setFolder, remove: removeSaved, restore };
}
