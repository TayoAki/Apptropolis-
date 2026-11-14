import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { VerseLine } from "../components/chapter/VerseLine";
import { Appear, PressScale, Skeleton, Stagger, haptic } from "../components/motion";
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
  else router.navigate("/");
}

/** A small drawn divider that closes the chapter. */
function Ornament() {
  const theme = useTheme();
  const c = theme.colors.primary;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: "center" }}
    >
      <Svg width={200} height={24} viewBox="0 0 200 24">
        <Line x1={4} y1={12} x2={60} y2={12} stroke={c} strokeWidth={1} strokeOpacity={0.5} />
        <Line x1={140} y1={12} x2={196} y2={12} stroke={c} strokeWidth={1} strokeOpacity={0.5} />
        <Path
          d="M80 12 C74 4 64 6 68 12 C72 18 80 15 81 12"
          fill="none"
          stroke={c}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M120 12 C126 4 136 6 132 12 C128 18 120 15 119 12"
          fill="none"
          stroke={c}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Circle cx={100} cy={12} r={3} fill={c} />
      </Svg>
    </View>
  );
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
          radius={theme.radius.lg}
        />
      ))}
    </View>
  );
}

export default function ChapterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; verse?: string }>();
  const { answers } = useAppState();
  const verseRows = useCollection<Verse>("verses");
  const bookmarkRows = useCollection<Bookmark>("bookmarks");
  const [picked, setPicked] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const position = readingPosition(bookmarkRows.items);
  // Without a book in the link, the chapter the reader left off in (or the chosen starting book).
  const base = params.book ? null : (position ?? null);
  const book = params.book || base?.book || answers.startingbook || "John";
  const chapterNumber = Number(params.chapter ?? base?.chapter ?? 1) || 1;

  const chapter = useMemo(
    () => chapterVerses(verseRows.items, book, chapterNumber),
    [verseRows.items, book, chapterNumber],
  );

  const requested = params.verse ? Number(params.verse) : NaN;
  const samePosition =
    position && position.book === book && position.chapter === chapterNumber
      ? position.verse
      : undefined;
  const target =
    chapter.find((v) => v.verse === requested) ??
    chapter.find((v) => v.verse === samePosition) ??
    chapter[0];

  const resumeAt = position ?? target;
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

  // Tapping a verse moves the feed's resume point there, lets the line pulse, then returns.
  function openInFeed(verse: Verse) {
    if (picked) return;
    haptic("selection");
    setPicked(verse.id);
    void Promise.all([
      saveReadingPosition(verse).catch(() => undefined),
      wait(340),
    ]).then(() => router.navigate("/"));
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: `${book} Chapter ${chapterNumber}`,
          headerTitleStyle: {
            fontFamily: theme.font.family,
            fontWeight: theme.font.weight.bold,
          },
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back to verse"
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>
                Back to Verse
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Text size and settings"
              hitSlop={12}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.title,
                }}
              >
                AA
              </Text>
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <ChapterSkeleton />
      ) : chapter.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", padding: theme.spacing.lg }}>
          <EmptyState
            icon="book-outline"
            title="This chapter isn't in the reader yet"
            body="Go back to the feed and pick another chapter, or search for a reference."
            actionLabel="Back to Read"
            onAction={() => router.navigate("/")}
          />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroller}
            contentContainerStyle={{
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
            decelerationRate="normal"
            showsVerticalScrollIndicator={false}
          >
            <Stagger step={55} style={{ gap: theme.spacing.sm }}>
              {chapter.map((verse) => (
                <View
                  key={verse.id}
                  onLayout={(event) => onRowLayout(verse, event.nativeEvent.layout.y)}
                >
                  <VerseLine
                    verse={verse}
                    isTarget={target?.id === verse.id}
                    picked={picked === verse.id}
                    onPress={() => openInFeed(verse)}
                  />
                </View>
              ))}
            </Stagger>
            <Appear delay={350} style={{ marginTop: theme.spacing.lg }}>
              <Ornament />
            </Appear>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.sm,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              backgroundColor: theme.colors.background,
            }}
          >
            <View
              style={{
                alignItems: "center",
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  textAlign: "center",
                }}
              >
                {resumeAt
                  ? `Resuming at ${formatReference(resumeAt)} · Tap any verse to jump there in feed`
                  : "Tap any verse to jump there in feed"}
              </Text>
              <PressScale
                onPress={() => router.navigate("/")}
                scaleTo={0.97}
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel="Return to feed"
                style={{
                  alignSelf: "stretch",
                  minHeight: 48,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onPrimary,
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  Return to Feed
                </Text>
              </PressScale>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
