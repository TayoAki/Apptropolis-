import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { FlatList, Text, View } from "react-native";
import { useAppState } from "../../data/app-state";
import {
  bookOf,
  chapterVerses,
  fetchVerse,
  FIRST_REF,
  getVerse,
  lastOfChapter,
  nextRef,
  normalizeRef,
  previousRef,
  withNotes,
} from "../../data/bible";
import { useCollection } from "../../data/repo";
import {
  findBookmark,
  formatReference,
  noteFor,
  type StudyNote,
  type Verse,
  type VerseRef,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { bookIdOf, startOf, useBooks } from "../bible";
import { useBookmarks } from "../bookmarks";
import { EmptyState } from "../EmptyState";
import { Appear, haptic, PressScale, Skeleton, SkeletonList, useReducedMotion } from "../motion";
import { PrimaryButton } from "../PrimaryButton";
import { useShareImage } from "../share";
import { VerseCard } from "../VerseCard";
import { VerseHero } from "./VerseHero";

/** What the row above the verse card is given: the verse on show and how to move to another. */
export interface ReaderTop {
  current: Verse;
  choose: (ref: VerseRef) => void;
}

/** A verse to open, as passed in a link. `at` changes on every jump. */
export interface ReaderJump {
  book?: string;
  chapter?: string;
  verse?: string;
  at?: string;
}

/**
 * The reader: one verse as a card, with the rest of its chapter below. Tap a verse, or Next, to
 * read on; reading runs on across chapters and books from Genesis 1:1 to Revelation 22:21, and the
 * place reached is remembered for next time. The Read tab shows it with its header, and
 * onboarding shows the same reader for the first verse, so what people try there is the real
 * thing.
 */
export function Reader({
  paddingTop,
  renderTop,
  hint,
  jump,
  onJumped,
  onAct,
}: {
  paddingTop: number;
  /** The row above the verse card (the Read tab's verse pill and buttons). */
  renderTop?: (reader: ReaderTop) => ReactNode;
  /** A line of guidance shown beside the list of following verses. */
  hint?: string;
  jump?: ReaderJump;
  /** Called once a jump has been taken, so the link can let go of it. */
  onJumped?: () => void;
  /** Called when the person reads on to another verse, or saves one. */
  onAct?: (action: "read_on" | "save") => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { answers } = useAppState();
  const list = useRef<ComponentRef<typeof FlatList<Verse>>>(null);
  const notes = useCollection<StudyNote>("study_notes");
  const marks = useBookmarks();
  const { ref: shareRef, share } = useShareImage();
  const [selected, setSelected] = useState<VerseRef | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [wholeChapter, setWholeChapter] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const saving = useRef(false);

  // A verse opened from another screen: show it, from the top. `at` changes on every jump, so
  // opening the same verse twice still lands on it. The screen that opened it has already made it
  // the reading place, so once taken the link is let go of: reloading the page then opens the
  // place reached since, not this verse again.
  useEffect(() => {
    if (!jump?.book) return;
    const wanted = normalizeRef({
      book: jump.book,
      chapter: Number(jump.chapter),
      verse: Number(jump.verse),
    });
    if (wanted) {
      setSelected(wanted);
      setNoteOpen(false);
      setProblem(null);
      list.current?.scrollToOffset({ offset: 0, animated: false });
    }
    onJumped?.();
    // onJumped is a fresh function on every render; the jump itself is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.book, jump?.chapter, jump?.verse, jump?.at]);

  // The verse on show: the one just chosen, else the place left off, else the start of the book
  // picked during setup, else Genesis 1:1. A place saved by an earlier version (when the app held
  // 50 verses) is a book name, chapter and verse, and opens as is.
  const place = marks.place ? normalizeRef(marks.place) : undefined;
  const currentRef: VerseRef =
    (selected ? normalizeRef(selected) : undefined) ??
    place ??
    startOf(answers.startingbook) ??
    FIRST_REF;
  const book = bookOf(currentRef.book)!;
  const chapterEnd = lastOfChapter(book, currentRef.chapter);
  // Where reading goes once this chapter runs out: the next chapter, or the next book.
  const upNextRef = nextRef(chapterEnd);
  const atEnd = nextRef(currentRef) === undefined;

  const text = useBooks([book.id]);
  const following = useBooks([bookIdOf(upNextRef)]);
  const loaded = text.ready && !notes.loading;

  const chapter = useMemo(
    () => (loaded ? withNotes(chapterVerses(book, currentRef.chapter) ?? [], notes.items) : []),
    [loaded, book, currentRef.chapter, notes.items],
  );
  const current = chapter.find((v) => v.verse === currentRef.verse);
  const upNext = upNextRef && following.ready ? getVerse(upNextRef) : undefined;
  const saved = current ? findBookmark(marks.items, current) : undefined;

  // A save or removal is finished once the list shows it; until then further taps on the
  // bookmark are ignored, so a double tap can't save the verse twice.
  useEffect(() => {
    saving.current = false;
  }, [saved?.id, current?.id]);

  if (text.failed) {
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
          icon="cloud-offline-outline"
          title={`${book.name} didn't open`}
          body="The book couldn't be loaded. Check the connection and try again."
          actionLabel="Try again"
          onAction={text.retry}
        />
      </View>
    );
  }

  if (!loaded || marks.loading || !current) {
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

  const at = chapter.findIndex((v) => v.id === current.id);
  const listed = wholeChapter ? chapter.filter((v) => v.id !== current.id) : chapter.slice(at + 1);
  const note = noteFor(notes.items, current);
  const chapterLabel = `${current.book} ${current.chapter}`;
  const before = previousRef(currentRef);
  const after = nextRef(currentRef);
  const newBook = upNextRef !== undefined && upNextRef.book !== current.book;

  function choose(ref: VerseRef) {
    setSelected(ref);
    setNoteOpen(false);
    setProblem(null);
    // The chosen verse becomes the card at the top, so bring the top back into view.
    list.current?.scrollToOffset({ offset: 0, animated: !reduced });
    // If the place can't be stored the verse still shows; only the resume point stays behind.
    void fetchVerse(ref)
      .then((verse) => (verse ? marks.keepPlace(verse) : undefined))
      .catch(() => undefined);
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

  const heading = {
    color: theme.colors.text,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.title,
    fontWeight: theme.font.weight.bold,
  } as const;

  // Under the last verse of the Bible: say so, and offer to begin again.
  const theEnd = (
    <View
      style={{
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text accessibilityRole="header" style={heading}>
        You've reached the end of the Bible
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.body,
          lineHeight: theme.font.size.body * 1.45,
        }}
      >
        {`${formatReference(current)} is the last verse of Revelation and of the whole Bible. Start again at ${formatReference(FIRST_REF)} whenever you like, or open any passage from Search.`}
      </Text>
      <PrimaryButton
        label={`Start again at ${formatReference(FIRST_REF)}`}
        icon="refresh-outline"
        onPress={() => choose(FIRST_REF)}
      />
      <PrimaryButton
        label="Find a passage"
        variant="quiet"
        onPress={() => router.navigate("/search")}
      />
    </View>
  );

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
            {renderTop?.({ current, choose })}
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
            <StepRow
              before={before}
              after={after}
              current={currentRef}
              onStep={(ref) => {
                haptic("selection");
                choose(ref);
              }}
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
              <Text accessibilityRole="header" style={heading}>
                {wholeChapter
                  ? `All of ${chapterLabel}`
                  : listed.length > 0
                    ? `Continue in ${chapterLabel}`
                    : `End of ${chapterLabel}`}
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
        // At the very end, the card below says it.
        atEnd && !wholeChapter ? undefined : (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            lineHeight: theme.font.size.body * 1.4,
            paddingVertical: theme.spacing.sm,
          }}
        >
          {wholeChapter
            ? `${chapterLabel} has this one verse.`
            : atEnd
              ? `That's the end of ${current.book}, the last book of the Bible.`
              : newBook
                ? `That's the end of ${current.book}.`
                : `That's the end of ${chapterLabel}.`}
        </Text>
        )
      }
      ListFooterComponent={
        atEnd ? (
          theEnd
        ) : upNextRef ? (
          <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
            <Text accessibilityRole="header" style={heading}>
              {newBook ? `Next book: ${upNextRef.book}` : `Next: ${upNextRef.book} ${upNextRef.chapter}`}
            </Text>
            {upNext ? (
              <VerseCard reference={upNext} text={upNext.text} onPress={() => choose(upNext)} />
            ) : following.failed ? (
              <PrimaryButton
                label={`Open ${formatReference(upNextRef)}`}
                variant="quiet"
                onPress={() => choose(upNextRef)}
              />
            ) : (
              <Skeleton height={96} radius={theme.radius.md} />
            )}
          </View>
        ) : undefined
      }
    />
  );
}

/**
 * Previous and Next under the verse card: one verse back or on, across chapters and books.
 * At Genesis 1:1 there is no Previous; at Revelation 22:21 the end of the page offers to start again.
 */
function StepRow({
  before,
  after,
  current,
  onStep,
}: {
  before: VerseRef | undefined;
  after: VerseRef | undefined;
  current: VerseRef;
  onStep: (ref: VerseRef) => void;
}) {
  const theme = useTheme();
  const label = (ref: VerseRef) =>
    ref.book !== current.book
      ? formatReference(ref)
      : ref.chapter !== current.chapter
        ? `${ref.chapter}:${ref.verse}`
        : `Verse ${ref.verse}`;
  const button = (ref: VerseRef, direction: "back" | "on") => (
    <PressScale
      onPress={() => onStep(ref)}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`${direction === "back" ? "Previous" : "Next"} verse, ${formatReference(ref)}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        minHeight: 44,
        paddingLeft: direction === "back" ? theme.spacing.sm : theme.spacing.md,
        paddingRight: direction === "back" ? theme.spacing.md : theme.spacing.sm,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {direction === "back" ? (
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.primary,
          fontSize: theme.font.size.caption + 1,
          fontWeight: theme.font.weight.bold,
          fontVariant: ["tabular-nums"],
        }}
      >
        {direction === "back" ? label(ref) : `Next · ${label(ref)}`}
      </Text>
      {direction === "on" ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
      ) : null}
    </PressScale>
  );
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
        marginTop: -theme.spacing.xs,
      }}
    >
      {before ? button(before, "back") : <View />}
      {after ? button(after, "on") : null}
    </View>
  );
}
