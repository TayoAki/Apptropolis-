import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BOOKS, bookOf, omittedNote, verseCount, type BookInfo } from "../data/bible";
import type { VerseRef } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { haptic } from "./motion";

/** One choice in a wrapping grid: a book name or a number. The chosen one is filled. */
function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  square = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  square?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: square ? 48 : undefined,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: square ? theme.spacing.sm : theme.spacing.md,
        borderRadius: square ? theme.radius.sm : theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary : theme.colors.background,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.text,
          fontSize: theme.font.size.caption + 1,
          fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The 66 books in Bible order, under Old Testament and New Testament. */
export function BookGrid({
  selected,
  onPick,
}: {
  /** Name of the chosen book, if any. */
  selected?: string;
  onPick: (book: BookInfo) => void;
}) {
  const theme = useTheme();
  const sections = [
    { title: "Old Testament", books: BOOKS.filter((b) => b.testament === "old") },
    { title: "New Testament", books: BOOKS.filter((b) => b.testament === "new") },
  ];
  return (
    <View style={{ gap: theme.spacing.md }}>
      {sections.map((section) => (
        <View key={section.title} style={{ gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              letterSpacing: 0.5,
            }}
          >
            {section.title.toUpperCase()}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {section.books.map((book) => (
              <Chip
                key={book.id}
                label={book.name}
                selected={book.name === selected}
                accessibilityLabel={book.name}
                onPress={() => onPick(book)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Numbers 1 to `count` in a wrapping grid (chapters, or the verses of a chapter). */
function NumberGrid({
  count,
  selected,
  noun,
  skip,
  onPick,
}: {
  count: number;
  selected?: number;
  noun: "Chapter" | "Verse";
  skip?: (n: number) => boolean;
  onPick: (n: number) => void;
}) {
  const theme = useTheme();
  const numbers = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !skip?.(n));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
      {numbers.map((n) => (
        <Chip
          key={n}
          square
          label={String(n)}
          selected={n === selected}
          accessibilityLabel={`${noun} ${n}`}
          onPress={() => onPick(n)}
        />
      ))}
    </View>
  );
}

type Level = "book" | "chapter" | "verse";

/**
 * Go anywhere in the Bible: a verse of this chapter, another chapter, or another book. It opens
 * on the verses of the chapter being read; the trail above the grid steps back to the chapters
 * or to all 66 books.
 */
export function PassagePicker({
  current,
  onPick,
}: {
  current: VerseRef;
  onPick: (ref: VerseRef) => void;
}) {
  const theme = useTheme();
  const start = bookOf(current.book) ?? BOOKS[0]!;
  const [level, setLevel] = useState<Level>("verse");
  const [book, setBook] = useState<BookInfo>(start);
  const [chapter, setChapter] = useState(current.chapter);

  const here = book.id === start.id;
  const prompt =
    level === "book"
      ? "Choose a book"
      : level === "chapter"
        ? `Choose a chapter of ${book.name}`
        : `Choose a verse in ${book.name} ${chapter}`;

  const trail: Array<{ label: string; level: Level }> = [{ label: "Books", level: "book" }];
  if (level !== "book") trail.push({ label: book.name, level: "chapter" });
  if (level === "verse" && book.verses.length > 1)
    trail.push({ label: `Chapter ${chapter}`, level: "verse" });

  function chooseBook(next: BookInfo) {
    setBook(next);
    if (next.verses.length === 1) {
      setChapter(1);
      setLevel("verse");
    } else {
      setChapter(next.id === start.id ? current.chapter : 1);
      setLevel("chapter");
    }
  }

  return (
    <View
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        {trail.map((crumb, index) => {
          const active = crumb.level === level;
          return (
            <View key={crumb.level} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              {index > 0 ? (
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              ) : null}
              <Pressable
                onPress={() => {
                  if (active) return;
                  haptic("selection");
                  setLevel(crumb.level);
                }}
                disabled={active}
                accessibilityRole="button"
                accessibilityLabel={
                  crumb.level === "book"
                    ? "Show all books"
                    : crumb.level === "chapter"
                      ? `Show the chapters of ${book.name}`
                      : `Show the verses of chapter ${chapter}`
                }
                accessibilityState={{ selected: active }}
                hitSlop={4}
                style={({ pressed }) => ({
                  minHeight: 36,
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.xs,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: active ? theme.colors.text : theme.colors.primary,
                    fontSize: theme.font.size.caption + 1,
                    fontWeight: active ? theme.font.weight.bold : theme.font.weight.medium,
                    textDecorationLine: active ? "none" : "underline",
                  }}
                >
                  {crumb.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {prompt}
      </Text>

      {level === "book" ? (
        <BookGrid selected={book.name} onPick={chooseBook} />
      ) : level === "chapter" ? (
        <NumberGrid
          noun="Chapter"
          count={book.verses.length}
          selected={here || chapter !== 1 ? chapter : undefined}
          onPick={(n) => {
            setChapter(n);
            setLevel("verse");
          }}
        />
      ) : (
        <NumberGrid
          noun="Verse"
          count={verseCount(book, chapter)}
          selected={here && chapter === current.chapter ? current.verse : undefined}
          skip={(n) => omittedNote({ book: book.name, chapter, verse: n }) !== undefined}
          onPick={(n) => onPick({ book: book.name, chapter, verse: n })}
        />
      )}
    </View>
  );
}
