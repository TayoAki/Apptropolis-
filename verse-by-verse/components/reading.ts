// The reader's own settings (Settings > Reading experience) and the type styles that follow them.
// Scripture on the Read tab and in the chapter view uses useReadingType(), so the text size and
// line spacing chosen in Settings change what is read.
import { useEffect } from "react";
import type { TextStyle } from "react-native";
import { useAppState } from "../data/app-state";
import { setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";
import { themes } from "../theme/tokens";

export const TEXT_SIZE_KEY = "pref.textSize";
export const LINE_SPACING_KEY = "pref.lineSpacing";
export const THEME_KEY = "pref.theme";

export const LINE_SPACING = ["Compact", "Comfortable", "Generous"] as const;
export type LineSpacing = (typeof LINE_SPACING)[number];

/** How much each of the five text sizes scales Scripture (the middle one is the design size). */
const SCALE = [0.86, 0.93, 1, 1.1, 1.2] as const;
const DEFAULT_SIZE = 2;

/** Line height as a multiple of the font size. Generous is the default and the design value. */
const LEADING: Record<LineSpacing, number> = { Compact: 1.3, Comfortable: 1.4, Generous: 1.5 };

/** The saved reading settings, with their defaults. */
export function useReadingPrefs(): { textSize: number; lineSpacing: LineSpacing } {
  const { answers } = useAppState();
  const stored = Number(answers[TEXT_SIZE_KEY]);
  const textSize =
    answers[TEXT_SIZE_KEY] !== undefined && Number.isInteger(stored)
      ? Math.min(SCALE.length - 1, Math.max(0, stored))
      : DEFAULT_SIZE;
  const lineSpacing = LINE_SPACING.find((s) => s === answers[LINE_SPACING_KEY]) ?? "Generous";
  return { textSize, lineSpacing };
}

/**
 * Styles for Scripture. `verse(size)` is running text at a size from the theme's scale;
 * `display(size)` is a verse set large on its own card, which needs tighter lines.
 */
export function useReadingType(): {
  verse: (size: number) => TextStyle;
  display: (size: number) => TextStyle;
} {
  const theme = useTheme();
  const { textSize, lineSpacing } = useReadingPrefs();
  const scale = SCALE[textSize] ?? 1;
  const leading = LEADING[lineSpacing];
  const style = (size: number, lines: number): TextStyle => {
    const fontSize = Math.round(size * scale);
    return {
      fontFamily: theme.font.family,
      fontSize,
      lineHeight: Math.round(fontSize * lines),
    };
  };
  return {
    verse: (size) => style(size, leading),
    display: (size) => style(size, leading - 0.15),
  };
}

let themeRestored = false;

/**
 * Bring back the theme picked in Settings the first time the app's state has loaded. Without
 * this the choice is saved but the next launch opens in the default theme again.
 */
export function useSavedTheme(): void {
  const { ready, answers } = useAppState();
  const saved = answers[THEME_KEY];
  useEffect(() => {
    if (!ready || themeRestored) return;
    themeRestored = true;
    // Applied even when it is the default pack: picking a theme also fixes light or dark,
    // which would otherwise go back to following the phone.
    if (saved && themes.some((t) => t.id === saved)) setActiveThemeId(saved);
  }, [ready, saved]);
}
