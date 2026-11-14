import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { FlatList, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { ReadHeader } from "../../components/index/ReadHeader";
import { VerseHero } from "../../components/index/VerseHero";
import {
  Appear,
  haptic,
  Skeleton,
  SkeletonList,
  useReducedMotion,
} from "../../components/motion";
import { useShareImage } from "../../components/share";
import { VerseCard } from "../../components/VerseCard";
import { useCollection } from "../../data/repo";
import {
  chapterVerses,
  findBookmark,
  formatReference,
  noteFor,
  READING_POSITION,
  readingPosition,
  sortCanonical,
  type Bookmark,
  type StudyNote,
  type Verse,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Read: one verse at a time as a card, with its chapter below. Tap any verse to read from it;
 * the place you reached is remembered for next time. Search, Saved and the chapter view open a
 * verse here by passing its reference in the link.
 */
export default function ReadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{
    book?: string;
    chapter?: string;
    verse?: string;
    at?: string;
  }>();
  const list = useRef<ComponentRef<typeof FlatList<Verse>>>(null);
  const verses = useCollection<Verse>("verses");
  const notes = useCollection<StudyNote>("study_notes");
  const marks = useCollection<Bookmark>("bookmarks");
  const { ref: shareRef, share } = useShareImage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [wholeChapter, setWholeChapter] = useState(false);

  const ordered = useMemo(() => sortCanonical(verses.items), [verses.items]);

  // A verse opened from another screen: show it, from the top. `at` changes on every jump, so
  // opening the same verse twice still lands on it.
  useEffect(() => {
    if (!params.book) return;
    const wanted = ordered.find(
      (v) =>
        v.book === params.book &&
        v.chapter === Number(params.chapter) &&
        v.verse === Number(params.verse),
    );
    if (!wanted) return;
    setSelectedId(wanted.id);
    setNoteOpen(false);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [params.book, params.chapter, params.verse, params.at, ordered]);
  const position = readingPosition(marks.items);
  const current: Verse | undefined =
    ordered.find((v) => v.id === selectedId) ??
    (position
      ? ordered.find(
          (v) =>
            v.book === position.book &&
            v.chapter === position.chapter &&
            v.verse === position.verse,
        )
      : undefined) ??
    ordered[0];

  const loading = verses.loading || marks.loading || notes.loading;

  async function remember(verse: Verse) {
    const row = {
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      folder: READING_POSITION,
      createdAt: new Date().toISOString(),
    };
    const existing = readingPosition(marks.items);
    if (existing) await marks.update(existing.id, row);
    else await marks.add(row);
  }

  function choose(verse: Verse) {
    setSelectedId(verse.id);
    setNoteOpen(false);
    // The chosen verse becomes the card at the top, so bring the top back into view.
    list.current?.scrollToOffset({ offset: 0, animated: !reduced });
    void remember(verse).catch(() => undefined);
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={170} height={44} radius={theme.radius.pill} />
          <Skeleton width={110} height={44} radius={theme.radius.pill} />
        </View>
        <Skeleton height={260} radius={theme.radius.md} />
        <SkeletonList rows={3} />
      </View>
    );
  }

  if (!current) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <EmptyState
          icon="book-outline"
          title="Nothing to read yet"
          body="Search for a passage, then tap a verse to start reading from it."
          actionLabel="Search the Bible"
          onAction={() => router.navigate("/search")}
        />
      </View>
    );
  }

  const chapter = chapterVerses(ordered, current.book, current.chapter);
  const at = chapter.findIndex((v) => v.id === current.id);
  const listed = wholeChapter
    ? chapter.filter((v) => v.id !== current.id)
    : chapter.slice(at + 1);
  const saved = findBookmark(marks.items, current);
  const note = noteFor(notes.items, current);
  const chapterLabel = `${current.book} ${current.chapter}`;

  function toggleSave() {
    if (!current) return;
    if (saved) {
      void marks.remove(saved.id).catch(() => undefined);
      return;
    }
    haptic("success");
    void marks
      .add({
        book: current.book,
        chapter: current.chapter,
        verse: current.verse,
        text: current.text,
        folder: "",
        createdAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  }

  function shareVerse() {
    if (!current) return;
    const label = formatReference(current);
    void share({ title: label, message: `${label}\n${current.text}\nWorld English Bible` });
  }

  function toggleContext() {
    haptic("selection");
    setWholeChapter((value) => !value);
  }

  function toggleNote() {
    if (!note) return;
    haptic("selection");
    setNoteOpen((value) => !value);
  }

  /** Open the whole chapter as one page, at this verse. */
  function readChapter() {
    if (!current) return;
    haptic("light");
    router.push({
      pathname: "/chapter",
      params: {
        book: current.book,
        chapter: String(current.chapter),
        verse: String(current.verse),
      },
    });
  }

  return (
    <FlatList
      ref={list}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      data={listed}
      keyExtractor={(verse) => verse.id}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
      ListHeaderComponent={
        <Appear>
          <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
            <ReadHeader
              current={current}
              verses={ordered}
              onPick={choose}
              onReadChapter={readChapter}
              onSettings={() => router.push("/settings")}
            />
            <VerseHero
              verse={current}
              shareRef={shareRef}
              saved={saved !== undefined}
              note={note}
              noteOpen={noteOpen}
              wholeChapter={wholeChapter}
              onSave={toggleSave}
              onShare={shareVerse}
              onContext={toggleContext}
              onNote={toggleNote}
            />
            <Text
              accessibilityRole="header"
              style={{
                marginTop: theme.spacing.sm,
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {wholeChapter ? `All of ${chapterLabel}` : `Continue in ${chapterLabel}`}
            </Text>
          </View>
        </Appear>
      }
      renderItem={({ item, index }) => (
        <Appear delay={Math.min(index, 8) * 50}>
          <VerseCard reference={item} text={item.text} onPress={() => choose(item)} />
        </Appear>
      )}
      ListEmptyComponent={
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            lineHeight: theme.font.size.body * 1.4,
            paddingVertical: theme.spacing.sm,
          }}
        >
          {wholeChapter
            ? `This is the only verse of ${chapterLabel} in the library.`
            : `That's the last verse in ${chapterLabel}.`}
        </Text>
      }
    />
  );
}
