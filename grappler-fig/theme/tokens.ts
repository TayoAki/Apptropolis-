import type { Theme } from "./types";

const radius: Theme["radius"] = { sm: 10, md: 18, lg: 24, pill: 999 };

const spacing: Theme["spacing"] = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const font: Theme["font"] = {
  size: { caption: 12, body: 16, title: 22, headline: 28, display: 64 },
  weight: { regular: "400", medium: "500", bold: "700" },
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
    // Red corner, blue corner. The red is light enough to read as text on the dark surfaces and
    // takes a dark label; danger is rose so an error is never the brand red.
    id: "ringside",
    name: "Ringside",
    dark: true,
    colors: {
      background: "#0A0A0B",
      surface: "#16171A",
      surfaceAlt: "#22242A",
      border: "#2F3239",
      text: "#FFFFFF",
      textMuted: "#9BA1AA",
      primary: "#FB4E4A",
      onPrimary: "#1F0706",
      accent: "#67AAED",
      success: "#3DDC84",
      warning: "#F5B301",
      danger: "#FC5C95",
    },
    radius,
    spacing,
    font,
  },
  {
    // Brick red with a slate accent. Danger is a darker wine so it is not the brand red.
    id: "canvas",
    name: "Canvas",
    dark: false,
    colors: {
      background: "#F4EEE6",
      surface: "#FBF7F1",
      surfaceAlt: "#EAE2D6",
      border: "#D5CABB",
      text: "#1E1B18",
      textMuted: "#6B625A",
      primary: "#B7351C",
      onPrimary: "#FFFFFF",
      accent: "#2F4858",
      success: "#217145",
      warning: "#7D6001",
      danger: "#95043E",
    },
    radius,
    spacing,
    font,
  },
  {
    // Gold with a paler gold accent. Warning is orange and danger crimson, clear of the gold.
    id: "gym-gold",
    name: "Gym Gold",
    dark: true,
    colors: {
      background: "#121212",
      surface: "#1C1D21",
      surfaceAlt: "#26282E",
      border: "#3A3D45",
      text: "#F5F3EE",
      textMuted: "#A4A7AE",
      primary: "#F2B01E",
      onPrimary: "#1A1400",
      accent: "#FFD76A",
      success: "#4CAF7A",
      warning: "#FE8F5B",
      danger: "#F95E7C",
    },
    radius,
    spacing,
    font,
  },
  {
    // Green with a deeper green accent (one-hue scheme). Success is leaf green so it is not the
    // brand green.
    id: "tape",
    name: "Hand Wrap",
    dark: false,
    colors: {
      background: "#F5F8F6",
      surface: "#FFFFFF",
      surfaceAlt: "#E6EEE9",
      border: "#CBD8D0",
      text: "#14201A",
      textMuted: "#5B6B63",
      primary: "#03794C",
      onPrimary: "#FFFFFF",
      accent: "#0F6B47",
      success: "#507400",
      warning: "#846500",
      danger: "#BE3939",
    },
    radius,
    spacing,
    font,
  },
  {
    // Orange with a steel-blue accent (complements) and a light label. Warning is olive-gold,
    // danger crimson.
    id: "steel",
    name: "Steel Bag",
    dark: false,
    colors: {
      background: "#E9EDF1",
      surface: "#F7F9FB",
      surfaceAlt: "#DCE2E9",
      border: "#C2CBD5",
      text: "#16202B",
      textMuted: "#586472",
      primary: "#A84400",
      onPrimary: "#FFF9F5",
      accent: "#3B5B7A",
      success: "#007240",
      warning: "#786000",
      danger: "#BB244C",
    },
    radius,
    spacing,
    font,
  },
];

export const defaultThemeId = "ringside";
