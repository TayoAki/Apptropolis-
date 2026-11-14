import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
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
import { useAppState } from "../../data/app-state";
import { openPaywall, usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  formatReference,
  isSameVerse,
  noteFor,
  parseReference,
  READING_POSITION,
  readingPosition,
  savedBookmarks,
  sortCanonical,
  type Bookmark,
  type StudyNote,
  type Verse,
  type VerseRef,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

type Mode = "reference" | "keywords";
type IconName = ComponentProps<typeof Ionicons>["name"];

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "reference", label: "Reference Jump" },
  { id: "keywords", label: "Keywords" },
];

// Passages people look up most. Only the ones in the library are shown, so every chip opens.
const QUICK_JUMP = ["John 3:16", "Psalm 23:1", "Romans 8:38", "Matthew 6:33", "Philippians 4:6"];
const QUICK_JUMP_COUNT = 5;
const FREE_KEYWORD_RESULTS = 3;
const MAX_RECENT = 3;

interface RecentEntry {
  ref: VerseRef;
  text: string;
}

/** Searches and jumps from this session, newest first (kept while the app is open). */
const sessionRecent: RecentEntry[] = [];

function rememberSession(entry: RecentEntry) {
  const rest = sessionRecent.filter((r) => !isSameVerse(r.ref, entry.ref));
  sessionRecent.splice(0, sessionRecent.length, entry, ...rest.slice(0, MAX_RECENT - 1));
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
  const { answers } = useAppState();
  const { isPremium } = usePurchases();
  const verses = useCollection<Verse>("verses");
  const notes = useCollection<StudyNote>("study_notes");
  const saved = useCollection<Bookmark>("bookmarks");

  const [mode, setMode] = useState<Mode>("reference");
  const [query, setQuery] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);

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

  const recent = useMemo(() => {
    const picked: Array<{ key: string; ref: VerseRef; text: string; topic: string }> = [];
    const pick = (ref: VerseRef, text: string, topic: string) => {
      if (picked.length < MAX_RECENT && !picked.some((p) => isSameVerse(p.ref, ref)))
        picked.push({ key: formatReference(ref), ref, text, topic });
    };
    for (const entry of sessionRecent)
      pick(entry.ref, entry.text, noteFor(notes.items, entry.ref)?.title ?? "");
    for (const bookmark of savedBookmarks(saved.items))
      pick(
        bookmark,
        bookmark.text,
        noteFor(notes.items, bookmark)?.title ?? (bookmark.folder || ""),
      );
    return picked;
  }, [notes.items, saved.items]);

  /** Jump into the reader at a verse: the reader resumes there. */
  async function openVerse(ref: VerseRef, text: string) {
    setJumpError(null);
    const next = { book: ref.book, chapter: ref.chapter, verse: ref.verse, text };
    rememberSession({ ref: { book: next.book, chapter: next.chapter, verse: next.verse }, text });
    try {
      const position = readingPosition(saved.items);
      if (position) await saved.update(position.id, next);
      else
        await saved.add({ ...next, folder: READING_POSITION, createdAt: new Date().toISOString() });
      router.navigate({
        pathname: "/",
        params: {
          book: next.book,
          chapter: String(next.chapter),
          verse: String(next.verse),
        },
      });
    } catch {
      setJumpError("Couldn't open that verse. Try again.");
    }
  }

  const segmentHalf = Math.max(0, (segmentWidth - 8) / 2);
  const indicatorX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, segmentHalf] });

  const loadingLibrary = verses.loading;

  // What to say when a search finds nothing (or the reference isn't understood).
  const emptyCopy: { icon: IconName; title: string; body: string } | null = !trimmed
    ? null
    : mode === "reference"
      ? parseReference(trimmed, books)
        ? {
            icon: "book-outline",
            title: `${trimmed} isn't in the library yet`,
            body: `This library holds a starter set of passages. Try ${
              quickJump.slice(0, 2).map(formatReference).join(" or ") || "John 3:16"
            }, or search by keyword.`,
          }
        : {
            icon: "compass-outline",
            title: "Try a book and chapter",
            body: "Type a reference like John 3:16 or Psalm 23. To search the words of the text, switch to Keywords.",
          }
      : {
          icon: "text-outline",
          title: `No verse says “${trimmed}”`,
          body: "Check the spelling, or try a shorter word. Keyword search looks through the full text of every verse.",
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
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ gap: theme.spacing.md }}>
        <Appear>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.display,
              fontWeight: theme.font.weight.bold,
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
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.sm,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Reference (e.g. Rom 8:28) or keyword…"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search verses or references"
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
            onLayout={(event: LayoutChangeEvent) => setSegmentWidth(event.nativeEvent.layout.width)}
            style={{
              flexDirection: "row",
              height: 44,
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
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Quick Jump
              </Text>
              <Ionicons name="flower-outline" size={18} color={theme.colors.primary} />
            </View>
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
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontFamily: theme.font.family,
                        fontSize: theme.font.size.body,
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
              Recent Searches
            </Text>
            {loadingLibrary || saved.loading ? (
              <SkeletonList rows={3} />
            ) : recent.length === 0 ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                Verses you open and save will appear here.
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
                      <Text
                        style={{
                          flex: 1,
                          color: theme.colors.text,
                          fontFamily: theme.font.family,
                          fontSize: theme.font.size.title,
                        }}
                      >
                        {item.key}
                        {item.topic ? (
                          <Text
                            style={{
                              color: theme.colors.textMuted,
                              fontSize: theme.font.size.body,
                            }}
                          >
                            {"  •  "}
                            {item.topic}
                          </Text>
                        ) : null}
                      </Text>
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
          onPress={openPaywall}
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
      <View style={{ marginTop: theme.spacing.lg }}>
        <PressScale
          onPress={openPaywall}
          accessibilityRole="button"
          accessibilityLabel="See what Premium adds"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Float amplitude={4} style={{ width: 96, height: 96 }}>
            <AiImage
              prompt="an open book with a quill pen, sepia ink line drawing on a plain cream background"
              fit="contain"
              style={{ width: 96, height: 96 }}
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
            {"Find every mention of “peace” or “grace” across all 66 books with "}
            <Text style={{ color: theme.colors.accent, fontWeight: theme.font.weight.bold }}>
              Premium
            </Text>
            {" access"}
          </Text>
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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.xl,
        paddingTop: insets.top + theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyView}
      ListFooterComponent={footer}
    />
  );
}
