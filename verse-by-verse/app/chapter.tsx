import { Redirect, Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { Flourish } from "../components/Flourish";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderAction, ScreenHeader } from "../components/ScreenHeader";
import { useBookmarks } from "../components/bookmarks";
import { VerseLine } from "../components/chapter/VerseLine";
import { useBooks } from "../components/bible";
import { Appear, PressScale, Skeleton, Stagger, haptic } from "../components/motion";
import { useSavedTheme } from "../components/reading";
import { useAppState } from "../data/app-state";
import { BOOKS, bookOf, chapterTitle, chapterVerses, type BookInfo } from "../data/bible";
import { formatReference, type Verse } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Close the chapter and open a verse on the Read tab underneath. `at` makes each jump
 * distinct, even to the same verse.
 */
function openInReader(verse: Verse) {
  router.dismissTo({
    pathname: "/",
    params: {
      book: verse.book,
      chapter: String(verse.chapter),
      verse: String(verse.verse),
      at: String(Date.now()),
    },
  });
}

function ChapterSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading chapter"
      style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.md }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          height={i === 0 ? 96 : 64}
          width={i === 2 ? "85%" : "100%"}
          radius={theme.radius.md}
        />
      ))}
    </View>
  );
}

export default function ChapterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; verse?: string }>();
  const { ready, onboarded, answers } = useAppState();
  const marks = useBookmarks();
  const [picked, setPicked] = useState<string | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  useSavedTheme();

  const position = marks.place;
  // Without a book in the link, the chapter the reader left off in (or the chosen starting book).
  const base = params.book ? null : (position ?? null);
  const info = bookOf(params.book || base?.book || answers.startingbook || "Genesis");
  const book = info?.name ?? params.book ?? "";
  const chapterNumber = Number(params.chapter ?? base?.chapter ?? 1) || 1;
  const text = useBooks([info?.id]);
  const title = info ? chapterTitle(info, chapterNumber) : undefined;

  const chapter = useMemo(
    () => (info && text.ready ? (chapterVerses(info, chapterNumber) ?? []) : []),
    [info, text.ready, chapterNumber],
  );
  // The chapters either side, across books: Malachi 4 leads on to Matthew 1.
  const before = info ? neighbour(info, chapterNumber, -1) : undefined;
  const after = info ? neighbour(info, chapterNumber, 1) : undefined;

  // This screen sits outside the root layout's guarded group, so on a first launch the router
  // can land here before onboarding. Send those launches to onboarding.
  if (ready && !onboarded) return <Redirect href="/onboarding" />;

  const requested = params.verse ? Number(params.verse) : NaN;
  const samePosition =
    position && position.book === book && position.chapter === chapterNumber
      ? position.verse
      : undefined;
  const target =
    chapter.find((v) => v.verse === requested) ??
    chapter.find((v) => v.verse === samePosition) ??
    chapter[0];

  const loading = (!text.ready && !text.failed) || marks.loading;

  function onRowLayout(verse: Verse, y: number) {
    if (scrolled.current || !target || verse.id !== target.id || y <= 0) return;
    scrolled.current = true;
    scroller.current?.scrollTo({ y: Math.max(0, theme.spacing.lg + y - 96), animated: false });
  }

  /** Open another chapter on this page, from its first verse. */
  function turnTo(next: { book: BookInfo; chapter: number }) {
    haptic("selection");
    scrolled.current = false;
    setPicked(null);
    router.setParams({ book: next.book.name, chapter: String(next.chapter), verse: "1" });
    scroller.current?.scrollTo({ y: 0, animated: false });
  }

  // Tapping a verse moves the reader's place there, lets the line flash, then opens it in Read.
  function readFrom(verse: Verse) {
    if (picked) return;
    haptic("selection");
    setPicked(verse.id);
    void Promise.all([
      marks.keepPlace(verse).catch(() => undefined),
      wait(340),
    ]).then(() => openInReader(verse));
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: `${book} ${chapterNumber}`, headerShown: false }} />
      <ScreenHeader
        title={`${book} ${chapterNumber}`}
        backAccessibilityLabel="Back to the verse"
        onBack={goBack}
        right={
          <HeaderAction
            icon="settings-outline"
            label="Text size and settings"
            onPress={() => router.push("/settings")}
          />
        }
      />

      {loading ? (
        <ChapterSkeleton />
      ) : text.failed ? (
        <View style={{ flex: 1, justifyContent: "center", padding: theme.spacing.lg }}>
          <EmptyState
            icon="cloud-offline-outline"
            title={`${book} didn't open`}
            body="The book couldn't be loaded. Check the connection and try again."
            actionLabel="Try again"
            onAction={text.retry}
          />
        </View>
      ) : chapter.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", padding: theme.spacing.lg }}>
          <EmptyState
            icon="book-outline"
            title={`${book} ${chapterNumber} isn't in the Bible`}
            body={
              info
                ? `${info.name} has ${info.verses.length === 1 ? "one chapter" : `${info.verses.length} chapters`}. Go back to Read, or search for a reference.`
                : "Go back to Read, or search for a reference."
            }
            actionLabel="Back to Read"
            onAction={() => router.dismissTo("/")}
          />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroller}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.xl,
            }}
            decelerationRate="normal"
            showsVerticalScrollIndicator={false}
          >
            {title ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.font.family,
                  fontStyle: "italic",
                  fontSize: theme.font.size.body,
                  lineHeight: theme.font.size.body * 1.45,
                  paddingHorizontal: theme.spacing.lg,
                  paddingBottom: theme.spacing.sm,
                }}
              >
                {title}
              </Text>
            ) : null}
            <Stagger key={`${book} ${chapterNumber}`} step={55} style={{ gap: theme.spacing.xs }}>
              {chapter.map((verse) => (
                <View
                  key={verse.id}
                  onLayout={(event) => onRowLayout(verse, event.nativeEvent.layout.y)}
                >
                  <VerseLine
                    verse={verse}
                    isTarget={target?.id === verse.id}
                    picked={picked === verse.id}
                    onPress={() => readFrom(verse)}
                  />
                </View>
              ))}
            </Stagger>
            <Appear delay={350} style={{ marginTop: theme.spacing.xl, gap: theme.spacing.lg }}>
              <Flourish />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                }}
              >
                {before ? (
                  <ChapterLink
                    label={`${before.book.name} ${before.chapter}`}
                    direction="back"
                    onPress={() => turnTo(before)}
                  />
                ) : (
                  <View />
                )}
                {after ? (
                  <ChapterLink
                    label={`${after.book.name} ${after.chapter}`}
                    direction="on"
                    onPress={() => turnTo(after)}
                  />
                ) : null}
              </View>
            </Appear>
          </ScrollView>

          <View
            style={{
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                lineHeight: theme.font.size.caption * 1.4,
                textAlign: "center",
              }}
            >
              {position
                ? `You left off at ${formatReference(position)}. Tap any verse to read from there.`
                : "Tap any verse to read from there."}
            </Text>
            <PrimaryButton label="Back to Read" onPress={() => router.dismissTo("/")} />
          </View>
        </>
      )}
    </View>
  );
}

/** The chapter before (-1) or after (+1) this one, across books; undefined past either end. */
function neighbour(
  book: BookInfo,
  chapter: number,
  direction: 1 | -1,
): { book: BookInfo; chapter: number } | undefined {
  const next = chapter + direction;
  if (next >= 1 && next <= book.verses.length) return { book, chapter: next };
  const other = BOOKS[book.order - 1 + direction];
  if (!other) return undefined;
  return { book: other, chapter: direction === 1 ? 1 : other.verses.length };
}

function ChapterLink({
  label,
  direction,
  onPress,
}: {
  label: string;
  direction: "back" | "on";
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`${direction === "back" ? "Previous" : "Next"} chapter, ${label}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        minHeight: 44,
        paddingHorizontal: theme.spacing.md,
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
        style={{
          color: theme.colors.primary,
          fontSize: theme.font.size.caption + 1,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
      {direction === "on" ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
      ) : null}
    </PressScale>
  );
}
