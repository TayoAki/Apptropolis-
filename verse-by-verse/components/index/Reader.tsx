import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { FlatList, Text, View } from "react-native";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import {
  chapterVerses,
  findBookmark,
  formatReference,
  noteFor,
  sortCanonical,
  type StudyNote,
  type Verse,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { useBookmarks } from "../bookmarks";
import { EmptyState } from "../EmptyState";
import { Appear, haptic, Skeleton, SkeletonList, useReducedMotion } from "../motion";
import { useShareImage } from "../share";
import { VerseCard } from "../VerseCard";
import { VerseHero } from "./VerseHero";

/** What the row above the verse card is given: the verse on show and how to move to another. */
export interface ReaderTop {
  current: Verse;
  verses: Verse[];
  choose: (verse: Verse) => void;
}

/** A verse to open, as passed in a link. `at` changes on every jump. */
export interface ReaderJump {
  book?: string;
  chapter?: string;
  verse?: string;
  at?: string;
}

/**
 * The reader: one verse as a card, with the rest of its chapter below. Tap a verse to read from
 * it; the place reached is remembered for next time. The Read tab shows it with its header, and
 * onboarding shows the same reader for the first verse, so what people try there is the real
 * thing.
 */
export function Reader({
  paddingTop,
  renderTop,
  hint,
  jump,
  onAct,
}: {
  paddingTop: number;
  /** The row above the verse card (the Read tab's verse pill and buttons). */
  renderTop?: (reader: ReaderTop) => ReactNode;
  /** A line of guidance shown beside the list of following verses. */
  hint?: string;
  jump?: ReaderJump;
  /** Called when the person reads on to another verse, or saves one. */
  onAct?: (action: "read_on" | "save") => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { answers } = useAppState();
  const list = useRef<ComponentRef<typeof FlatList<Verse>>>(null);
  const verses = useCollection<Verse>("verses");
  const notes = useCollection<StudyNote>("study_notes");
  const marks = useBookmarks();
  const { ref: shareRef, share } = useShareImage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [wholeChapter, setWholeChapter] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const saving = useRef(false);

  const ordered = useMemo(() => sortCanonical(verses.items), [verses.items]);

  // A verse opened from another screen: show it, from the top. `at` changes on every jump, so
  // opening the same verse twice still lands on it.
  useEffect(() => {
    if (!jump?.book) return;
    const wanted = ordered.find(
      (v) =>
        v.book === jump.book && v.chapter === Number(jump.chapter) && v.verse === Number(jump.verse),
    );
    if (!wanted) return;
    setSelectedId(wanted.id);
    setNoteOpen(false);
    setProblem(null);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [jump?.book, jump?.chapter, jump?.verse, jump?.at, ordered]);

  // The verse on show: the one just chosen, else the place left off, else the start of the
  // book picked during setup, else the first verse in the library.
  const place = marks.place;
  const current: Verse | undefined =
    ordered.find((v) => v.id === selectedId) ??
    (place
      ? ordered.find(
          (v) => v.book === place.book && v.chapter === place.chapter && v.verse === place.verse,
        )
      : undefined) ??
    ordered.find((v) => v.book === answers.startingbook) ??
    ordered[0];
  const saved = current ? findBookmark(marks.items, current) : undefined;

  // A save or removal is finished once the list shows it; until then further taps on the
  // bookmark are ignored, so a double tap can't save the verse twice.
  useEffect(() => {
    saving.current = false;
  }, [saved?.id, current?.id]);

  if (verses.loading || marks.loading || notes.loading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading the reader"
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop,
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
          paddingTop: paddingTop + theme.spacing.md,
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
  const listed = wholeChapter ? chapter.filter((v) => v.id !== current.id) : chapter.slice(at + 1);
  const note = noteFor(notes.items, current);
  const chapterLabel = `${current.book} ${current.chapter}`;
  // Where reading goes once this chapter runs out: the next passage the library holds.
  const lastOfChapter = chapter[chapter.length - 1];
  const upNext = lastOfChapter
    ? ordered[ordered.findIndex((v) => v.id === lastOfChapter.id) + 1]
    : undefined;

  function choose(verse: Verse) {
    setSelectedId(verse.id);
    setNoteOpen(false);
    setProblem(null);
    // The chosen verse becomes the card at the top, so bring the top back into view.
    list.current?.scrollToOffset({ offset: 0, animated: !reduced });
    // If the place can't be stored the verse still shows; only the resume point stays behind.
    void marks.keepPlace(verse).catch(() => undefined);
    onAct?.("read_on");
  }

  function toggleSave() {
    if (!current || saving.current) return;
    saving.current = true;
    setProblem(null);
    if (saved) {
      void marks.remove(saved.id).catch(() => {
        saving.current = false;
        setProblem("Couldn't remove that bookmark. Try again.");
      });
      return;
    }
    haptic("success");
    void marks
      .save(current)
      .then(() => onAct?.("save"))
      .catch(() => {
        saving.current = false;
        setProblem("Couldn't save that verse. Try again.");
      });
  }

  async function shareVerse() {
    if (!current) return;
    setProblem(null);
    const label = formatReference(current);
    const shared = await share({
      title: label,
      message: `${label}\n${current.text}\nWorld English Bible`,
    });
    if (!shared) setProblem("Sharing isn't available on this device.");
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

  return (
    <FlatList
      ref={list}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      data={listed}
      keyExtractor={(verse) => verse.id}
      contentContainerStyle={{
        paddingTop,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
      ListHeaderComponent={
        <Appear>
          <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
            {renderTop?.({ current, verses: ordered, choose })}
            <VerseHero
              verse={current}
              shareRef={shareRef}
              saved={saved !== undefined}
              note={note}
              noteOpen={noteOpen}
              wholeChapter={wholeChapter}
              onSave={toggleSave}
              onShare={() => void shareVerse()}
              onContext={toggleContext}
              onNote={toggleNote}
            />
            {problem ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
              >
                <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.danger,
                    fontSize: theme.font.size.caption,
                    lineHeight: theme.font.size.caption * 1.4,
                  }}
                >
                  {problem}
                </Text>
              </View>
            ) : null}
            <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {wholeChapter ? `All of ${chapterLabel}` : `Continue in ${chapterLabel}`}
              </Text>
              {hint && listed.length > 0 ? (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    lineHeight: theme.font.size.caption * 1.4,
                  }}
                >
                  {hint}
                </Text>
              ) : null}
            </View>
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
            : `That's the last verse of ${chapterLabel} in the library.`}
        </Text>
      }
      ListFooterComponent={
        upNext ? (
          <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Next in the library
            </Text>
            <VerseCard reference={upNext} text={upNext.text} onPress={() => choose(upNext)} />
          </View>
        ) : undefined
      }
    />
  );
}
