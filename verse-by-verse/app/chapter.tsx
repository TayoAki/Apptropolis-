import { Redirect, Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { Flourish } from "../components/Flourish";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderAction, ScreenHeader } from "../components/ScreenHeader";
import { VerseLine } from "../components/chapter/VerseLine";
import { Appear, Skeleton, Stagger, haptic } from "../components/motion";
import { useSavedTheme } from "../components/reading";
import { useAppState } from "../data/app-state";
import { useCollection } from "../data/repo";
import {
  READING_POSITION,
  chapterVerses,
  formatReference,
  readingPosition,
  type Bookmark,
  type Verse,
} from "../data/schema";
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
  const verseRows = useCollection<Verse>("verses");
  const bookmarkRows = useCollection<Bookmark>("bookmarks");
  const [picked, setPicked] = useState<string | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  useSavedTheme();

  const position = readingPosition(bookmarkRows.items);
  // Without a book in the link, the chapter the reader left off in (or the chosen starting book).
  const base = params.book ? null : (position ?? null);
  const book = params.book || base?.book || answers.startingbook || "John";
  const chapterNumber = Number(params.chapter ?? base?.chapter ?? 1) || 1;

  const chapter = useMemo(
    () => chapterVerses(verseRows.items, book, chapterNumber),
    [verseRows.items, book, chapterNumber],
  );

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

  const loading = verseRows.loading || bookmarkRows.loading;

  function onRowLayout(verse: Verse, y: number) {
    if (scrolled.current || !target || verse.id !== target.id || y <= 0) return;
    scrolled.current = true;
    scroller.current?.scrollTo({ y: Math.max(0, theme.spacing.lg + y - 96), animated: false });
  }

  async function saveReadingPosition(verse: Verse) {
    const record = {
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      folder: READING_POSITION,
      createdAt: new Date().toISOString(),
    };
    if (position) await bookmarkRows.update(position.id, record);
    else await bookmarkRows.add(record);
  }

  // Tapping a verse moves the reader's place there, lets the line flash, then opens it in Read.
  function readFrom(verse: Verse) {
    if (picked) return;
    haptic("selection");
    setPicked(verse.id);
    void Promise.all([
      saveReadingPosition(verse).catch(() => undefined),
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
      ) : chapter.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", padding: theme.spacing.lg }}>
          <EmptyState
            icon="book-outline"
            title="This chapter isn't in the reader yet"
            body="Go back to Read and pick another chapter, or search for a reference."
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
            <Stagger step={55} style={{ gap: theme.spacing.xs }}>
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
            <Appear delay={350} style={{ marginTop: theme.spacing.xl }}>
              <Flourish />
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
