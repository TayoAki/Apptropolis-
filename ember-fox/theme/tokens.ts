import type { Theme } from "./types";

// Shared shape for every pack: the card corner radius from the approved mockup (18) and the
// same spacing and type scale, so switching packs changes only the colors and feel.
const shape: Pick<Theme, "radius" | "spacing" | "font"> = {
  radius: { sm: 10, md: 18, lg: 24, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  font: {
    size: { caption: 13, body: 16, title: 22, headline: 28, display: 56 },
    weight: { regular: "400", medium: "500", bold: "700" },
  },
};

// Color rules every pack follows (checked with WCAG 2.2 contrast math):
// - primary, accent, success, warning and danger each reach 4.5:1 as text on background, surface
//   and surfaceAlt, so any of them can be a label, link or icon on any neutral surface.
// - onPrimary reaches 4.5:1 on all five of those colors, so it is the label color for any filled
//   chip, badge or button.
// - Brand and status hues are kept apart, so a warning or an error is never the brand color.
// Use textMuted, not border, for the outline of a control (border is a decorative hairline).
export const themes: Theme[] = [
  {
    // Gold with a blue accent (complements). Orange warning and red danger sit clear of the
    // gold.
    id: "stadium",
    name: "Stadium Night",
    dark: true,
    ...shape,
    colors: {
      background: "#0D0F13",
      surface: "#171A21",
      surfaceAlt: "#222630",
      border: "#2E3440",
      text: "#F5F6F8",
      textMuted: "#9AA3B2",
      primary: "#FFB627",
      onPrimary: "#1A1206",
      accent: "#4FA8E8",
      success: "#34D17A",
      warning: "#FF8A3D",
      danger: "#FF5C5C",
    },
  },
  {
    // Orange with a blue accent (complements) and a light label, so the orange also works as
    // link text. Warning is olive-gold and danger crimson, clear of the orange.
    id: "court",
    name: "Court Orange",
    dark: false,
    ...shape,
    colors: {
      background: "#FFFFFF",
      surface: "#F7F4F1",
      surfaceAlt: "#EFEAE4",
      border: "#DAD3CB",
      text: "#17110C",
      textMuted: "#5E554D",
      primary: "#B54500",
      onPrimary: "#FFF9F5",
      accent: "#046EA9",
      success: "#01793F",
      warning: "#826401",
      danger: "#C03057",
    },
  },
  {
    // Green brand with a light label: success is leaf green, the accent copper, warning
    // olive-gold.
    id: "pitch",
    name: "Fresh Pitch",
    dark: false,
    ...shape,
    colors: {
      background: "#F7FBF8",
      surface: "#FFFFFF",
      surfaceAlt: "#E8F3EA",
      border: "#C9DDCD",
      text: "#10231A",
      textMuted: "#4F6658",
      primary: "#007D34",
      onPrimary: "#F7FFF9",
      accent: "#A15A16",
      success: "#5E7402",
      warning: "#7F6A03",
      danger: "#C23C3C",
    },
  },
  {
    // Cyan with a violet accent (analogous cool pair); warm status hues stand apart.
    id: "track",
    name: "Track Cyan",
    dark: true,
    ...shape,
    colors: {
      background: "#07090D",
      surface: "#0F141B",
      surfaceAlt: "#18202A",
      border: "#243041",
      text: "#EAF6FB",
      textMuted: "#8CA0B3",
      primary: "#2EC4F0",
      onPrimary: "#04161D",
      accent: "#A78BFA",
      success: "#3DDC97",
      warning: "#FFB020",
      danger: "#FF5C7A",
    },
  },
  {
    // Red brand with a navy accent. Danger is a much darker wine, separated by lightness because
    // the hue is the brand's.
    id: "jersey",
    name: "Jersey Red",
    dark: false,
    ...shape,
    colors: {
      background: "#FBF8F6",
      surface: "#FFFFFF",
      surfaceAlt: "#F2ECE9",
      border: "#DDD2CD",
      text: "#1C1113",
      textMuted: "#6B5A5E",
      primary: "#CC2635",
      onPrimary: "#FFFFFF",
      accent: "#1F3A68",
      success: "#1E7A4A",
      warning: "#8E6200",
      danger: "#900141",
    },
  },
];

export const defaultThemeId = "stadium";
