import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { ReadHeader } from "../../components/index/ReadHeader";
import { VerseHero } from "../../components/index/VerseHero";
import { Appear, haptic, Skeleton, SkeletonList } from "../../components/motion";
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
 * the place you reached is remembered for next time.
 */
export default function ReadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const verses = useCollection<Verse>("verses");
  const notes = useCollection<StudyNote>("study_notes");
  const marks = useCollection<Bookmark>("bookmarks");
  const { ref: shareRef, share } = useShareImage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [wholeChapter, setWholeChapter] = useState(false);

  const ordered = useMemo(() => sortCanonical(verses.items), [verses.items]);
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
          <Skeleton width={96} height={40} />
        </View>
        <Skeleton height={280} radius={theme.radius.md} />
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

  function readChapter() {
    const first = chapter[0];
    if (!first) return;
    haptic("light");
    setWholeChapter(false);
    choose(first);
  }

  return (
    <FlatList
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
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 0.5,
              }}
            >
              {wholeChapter
                ? `ALL OF ${chapterLabel.toUpperCase()}`
                : `CONTINUE IN ${chapterLabel.toUpperCase()}`}
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
            fontFamily: theme.font.family,
            fontSize: theme.font.size.body,
            textAlign: "center",
            paddingVertical: theme.spacing.lg,
          }}
        >
          {`That's the last verse in ${chapterLabel}.`}
        </Text>
      }
    />
  );
}
