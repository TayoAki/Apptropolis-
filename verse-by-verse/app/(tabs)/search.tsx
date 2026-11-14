import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plate } from "../../components/Art";
import { EmptyState } from "../../components/EmptyState";
import { Highlighted } from "../../components/search/Highlighted";
import {
  Appear,
  CountUp,
  Float,
  haptic,
  PressScale,
  Skeleton,
  SkeletonList,
  useReducedMotion,
} from "../../components/motion";
import { useBookmarks } from "../../components/bookmarks";
import { openPaywallFrom } from "../../components/paywall/source";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  FREE_KEYWORD_RESULTS,
  formatReference,
  isSameVerse,
  noteFor,
  parseReference,
  sortCanonical,
  type StudyNote,
  type Verse,
  type VerseRef,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

type Mode = "reference" | "keywords";
type IconName = ComponentProps<typeof Ionicons>["name"];

const MODES: Array<{ id: Mode; label: string; placeholder: string }> = [
  { id: "reference", label: "Reference jump", placeholder: "Reference, e.g. John 3:16" },
  { id: "keywords", label: "Keywords", placeholder: "Word or phrase, e.g. peace" },
];

// Passages people look up most. Only the ones in the library are shown, so every chip opens.
const QUICK_JUMP = ["John 3:16", "Psalm 23:1", "Romans 8:38", "Matthew 6:33", "Philippians 4:6"];
const QUICK_JUMP_COUNT = 5;
const MAX_RECENT = 3;

/** The passages last opened from this screen, newest first. Saved on the phone. */
const RECENT_KEY = "search.recent";

function readRecent(raw: string | undefined): VerseRef[] {
  try {
    const value = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (r): r is VerseRef =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as VerseRef).book === "string" &&
          Number.isInteger((r as VerseRef).chapter) &&
          Number.isInteger((r as VerseRef).verse),
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function findVerse(items: Verse[], books: string[], text: string): Verse | undefined {
  const parsed = parseReference(text, books);
  if (!parsed || parsed.verse === undefined) return undefined;
  return items.find(
    (v) => v.book === parsed.book && v.chapter === parsed.chapter && v.verse === parsed.verse,
  );
}

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { answers, setAnswer } = useAppState();
  const { isPremium } = usePurchases();
  const verses = useCollection<Verse>("verses");
  const notes = useCollection<StudyNote>("study_notes");
  const marks = useBookmarks();

  const [mode, setMode] = useState<Mode>("reference");
  const [query, setQuery] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [focused, setFocused] = useState(false);

  const slide = useRef(new Animated.Value(0)).current;
  const clearOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      slide.setValue(mode === "keywords" ? 1 : 0);
      return;
    }
    Animated.spring(slide, {
      toValue: mode === "keywords" ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [mode, reduced, slide]);

  useEffect(() => {
    Animated.timing(clearOpacity, {
      toValue: query ? 1 : 0,
      duration: reduced ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [query, reduced, clearOpacity]);

  const trimmed = query.trim();
  const terms = useMemo(() => trimmed.split(/\s+/).filter(Boolean), [trimmed]);
  const books = useMemo(
    () => Array.from(new Set(sortCanonical(verses.items).map((v) => v.book))),
    [verses.items],
  );
  const startingBook = answers.startingbook;

  const results = useMemo<Verse[]>(() => {
    if (!trimmed) return [];
    if (mode === "reference") {
      const parsed = parseReference(trimmed, books);
      if (!parsed) return [];
      return sortCanonical(
        verses.items.filter(
          (v) =>
            v.book === parsed.book &&
            v.chapter === parsed.chapter &&
            (parsed.verse === undefined || v.verse === parsed.verse),
        ),
      );
    }
    const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    return sortCanonical(
      verses.items.filter((v) => {
        const text = v.text.toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    );
  }, [trimmed, mode, books, verses.items]);

  // Keyword search with highlights and all results is premium; free users see a few results.
  const keywordLimited = mode === "keywords" && !isPremium;
  const visible = keywordLimited ? results.slice(0, FREE_KEYWORD_RESULTS) : results;
  const highlight = mode === "keywords" && isPremium;

  const quickJump = useMemo(() => {
    const picks: Verse[] = [];
    const add = (verse: Verse | undefined) => {
      if (verse && picks.length < QUICK_JUMP_COUNT && !picks.some((p) => p.id === verse.id))
        picks.push(verse);
    };
    // The book the person chose during setup comes first.
    if (startingBook)
      add(sortCanonical(verses.items.filter((v) => v.book === startingBook))[0]);
    for (const ref of QUICK_JUMP) add(findVerse(verses.items, books, ref));
    for (const verse of verses.items) if (verse.hasNote) add(verse);
    return picks;
  }, [startingBook, books, verses.items]);

  // Only passages this person opened from Search, and only those still in the library.
  const recentRaw = answers[RECENT_KEY];
  const recent = useMemo(
    () =>
      readRecent(recentRaw).flatMap((ref) => {
        const verse = verses.items.find((v) => isSameVerse(v, ref));
        return verse
          ? [
              {
                key: formatReference(verse),
                ref: verse,
                text: verse.text,
                topic: noteFor(notes.items, verse)?.title ?? "",
              },
            ]
          : [];
      }),
    [recentRaw, verses.items, notes.items],
  );

  /** Jump into the reader at a verse: the reader resumes there. */
  async function openVerse(ref: VerseRef, text: string) {
    setJumpError(null);
    const next = { book: ref.book, chapter: ref.chapter, verse: ref.verse, text };
    const place = { book: next.book, chapter: next.chapter, verse: next.verse };
    const earlier = readRecent(recentRaw).filter((r) => !isSameVerse(r, place));
    void setAnswer(RECENT_KEY, JSON.stringify([place, ...earlier].slice(0, MAX_RECENT))).catch(
      () => undefined,
    );
    try {
      await marks.keepPlace(next);
      router.navigate({
        pathname: "/",
        params: {
          book: next.book,
          chapter: String(next.chapter),
          verse: String(next.verse),
          at: String(Date.now()),
        },
      });
    } catch {
      setJumpError("Couldn't open that verse. Try again.");
    }
  }

  const segmentHalf = Math.max(0, (segmentWidth - 8) / 2);
  const indicatorX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, segmentHalf] });

  const loadingLibrary = verses.loading;

  // What to say when a search finds nothing (or the reference isn't understood). A reference
  // to a book the library doesn't hold is told so, not asked to retype what was typed.
  const tryThese = quickJump.slice(0, 2).map(formatReference).join(" or ") || "John 3:16";
  const bookList =
    books.length > 1 ? `${books.slice(0, -1).join(", ")} and ${books[books.length - 1]}` : books[0];
  const looksLikeReference = /^\S.*?\s*\d+(?::\d+)?$/.test(trimmed);
  const emptyCopy: { icon: IconName; title: string; body: string } | null = !trimmed
    ? null
    : mode === "reference"
      ? parseReference(trimmed, books)
        ? {
            icon: "book-outline",
            title: `${trimmed} isn't in the library yet`,
            body: `This library holds a starter set of passages. Try ${tryThese}, or search by keyword.`,
          }
        : looksLikeReference && bookList
          ? {
              icon: "book-outline",
              title: `${trimmed} isn't in the library yet`,
              body: `The library holds passages from ${bookList}. Try ${tryThese}, or search by keyword.`,
            }
          : {
              icon: "compass-outline",
              title: "Try a book and chapter",
              body: "Type a reference like John 3:16 or Psalm 23. To search the words of the text, switch to Keywords.",
            }
      : {
          icon: "text-outline",
          title: `No verse says “${trimmed}”`,
          body: "Check the spelling, or try a shorter word. Keyword search looks through every verse in the library.",
        };

  const emptyView = loadingLibrary ? (
    trimmed ? (
      <SkeletonList rows={3} />
    ) : null
  ) : emptyCopy ? (
    <EmptyState
      icon={emptyCopy.icon}
      title={emptyCopy.title}
      body={emptyCopy.body}
      actionLabel="Clear search"
      onAction={() => setQuery("")}
    />
  ) : null;

  const header = (
    <View style={{ gap: theme.spacing.xl, paddingBottom: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.md }}>
        <Appear>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
              lineHeight: 44,
            }}
          >
            Search
          </Text>
        </Appear>

        <Appear delay={60}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 52,
              // The border thickens when the field has focus; the padding gives the pixel back.
              paddingHorizontal: theme.spacing.lg - (focused ? 1 : 0),
              gap: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? theme.colors.primary : theme.colors.textMuted,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={MODES.find((option) => option.id === mode)?.placeholder}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel={
                mode === "reference" ? "Search by reference" : "Search by keyword"
              }
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (mode === "reference" && results[0])
                  void openVerse(results[0], results[0].text);
              }}
              style={{
                flex: 1,
                minHeight: 48,
                fontSize: theme.font.size.body,
                color: theme.colors.text,
                // The field's own border shows focus, so the web's default ring is turned off.
                ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
              }}
            />
            <Animated.View style={{ opacity: clearOpacity }}>
              <Pressable
                onPress={() => setQuery("")}
                disabled={!query}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                accessibilityElementsHidden={!query}
                hitSlop={12}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: -theme.spacing.sm,
                }}
              >
                <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </Animated.View>
          </View>
        </Appear>

        <Appear delay={120}>
          <View
            accessibilityRole="tablist"
            onLayout={(event: LayoutChangeEvent) => setSegmentWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              minHeight: 44,
              padding: 4,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: 4,
                width: segmentHalf,
                borderRadius: theme.radius.sm - 2,
                backgroundColor: theme.colors.background,
                transform: [{ translateX: indicatorX }],
              }}
            />
            {MODES.map((option) => {
              const active = mode === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    if (active) return;
                    setMode(option.id);
                    haptic("selection");
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  hitSlop={{ top: 4, bottom: 4 }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  <Text
                    style={{
                      color: active ? theme.colors.primary : theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: active ? theme.font.weight.bold : theme.font.weight.medium,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Appear>

        {jumpError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
            {jumpError}
          </Text>
        ) : null}
      </View>

      {trimmed && results.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.xs }}>
          <CountUp
            value={results.length}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              fontVariant: ["tabular-nums"],
            }}
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            {results.length === 1 ? "verse matches" : "verses match"}
          </Text>
        </View>
      ) : null}

      {!trimmed && mode === "reference" ? (
        <Appear delay={180}>
          <View style={{ gap: theme.spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Quick jump
            </Text>
            {loadingLibrary ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {[120, 132, 110, 128].map((width, index) => (
                  <Skeleton
                    key={index}
                    width={width}
                    height={44}
                    radius={theme.radius.pill}
                  />
                ))}
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {quickJump.map((verse) => (
                  <PressScale
                    key={verse.id}
                    onPress={() => void openVerse(verse, verse.text)}
                    haptic="light"
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${formatReference(verse)}`}
                    style={{
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: theme.spacing.lg,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      {formatReference(verse)}
                    </Text>
                  </PressScale>
                ))}
              </View>
            )}
          </View>
        </Appear>
      ) : null}

      {!trimmed ? (
        <Appear delay={240}>
          <View style={{ gap: theme.spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Recently opened
            </Text>
            {loadingLibrary ? (
              <SkeletonList rows={3} />
            ) : recent.length === 0 ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  lineHeight: theme.font.size.body * 1.4,
                }}
              >
                Passages you open from Search will appear here.
              </Text>
            ) : (
              <View>
                {recent.map((item, index) => (
                  <Appear key={item.key} delay={index * 60}>
                    <PressScale
                      onPress={() => void openVerse(item.ref, item.text)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.topic ? `${item.key}, ${item.topic}` : item.key
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.md,
                        minHeight: 56,
                        paddingVertical: theme.spacing.md,
                        borderBottomWidth: index < recent.length - 1 ? 1 : 0,
                        borderBottomColor: theme.colors.border,
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontFamily: theme.font.family,
                            fontSize: theme.font.size.body,
                            fontWeight: theme.font.weight.bold,
                          }}
                        >
                          {item.key}
                        </Text>
                        {item.topic ? (
                          <Text
                            numberOfLines={1}
                            style={{
                              color: theme.colors.textMuted,
                              fontSize: theme.font.size.caption,
                            }}
                          >
                            {item.topic}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                    </PressScale>
                  </Appear>
                ))}
              </View>
            )}
          </View>
        </Appear>
      ) : null}
    </View>
  );

  const footer =
    keywordLimited && results.length > visible.length ? (
      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
        <PressScale
          onPress={() => openPaywallFrom("search_all_matches")}
          accessibilityRole="button"
          accessibilityLabel={`Show all ${results.length} matches with Premium`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            minHeight: 56,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name="lock-closed" size={18} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {`Show all ${results.length} matches`}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              Keyword highlights and full results are in Premium
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </PressScale>
      </View>
    ) : !trimmed && !isPremium ? (
      <View style={{ marginTop: theme.spacing.sm }}>
        <PressScale
          onPress={() => openPaywallFrom("search_promo")}
          accessibilityRole="button"
          accessibilityLabel="See what Premium adds"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Float amplitude={3}>
            <Plate
              prompt="an open book with a quill pen, sepia ink line drawing on a plain cream background"
              icon="book-outline"
              size={72}
            />
          </Float>
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontStyle: "italic",
              fontSize: theme.font.size.body,
              lineHeight: theme.font.size.body * 1.4,
            }}
          >
            {`Keyword search shows the first ${FREE_KEYWORD_RESULTS} matches. See every match, with the words highlighted, with `}
            <Text style={{ color: theme.colors.accent, fontWeight: theme.font.weight.bold }}>
              Premium
            </Text>
            {"."}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </PressScale>
      </View>
    ) : null;

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <Appear delay={Math.min(index, 10) * 30}>
          <PressScale
            onPress={() => void openVerse(item, item.text)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${formatReference(item)}. ${item.text}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              marginBottom: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 0.5,
                }}
              >
                {formatReference(item).toUpperCase()}
              </Text>
              <Highlighted
                text={item.text}
                terms={terms}
                highlight={highlight}
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.body,
                  lineHeight: theme.font.size.body * 1.45,
                }}
              />
              {item.hasNote ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                  <Ionicons
                    name="document-text-outline"
                    size={13}
                    color={theme.colors.textMuted}
                  />
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                    Study note
                  </Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </PressScale>
        </Appear>
      )}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.spacing.xl,
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyView ?? undefined}
      ListFooterComponent={footer ?? undefined}
    />
  );
}
