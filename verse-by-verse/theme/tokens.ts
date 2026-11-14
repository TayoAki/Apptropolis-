import type { Theme } from "./types";

// Shared shape for every pack: the mockup's card radius, the spacing scale, and a serif reading face.
const shape: Omit<Theme, "id" | "name" | "dark" | "colors"> = {
  radius: { sm: 10, md: 20, lg: 28, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  font: {
    family: "Georgia",
    size: { caption: 13, body: 17, title: 22, headline: 28, display: 40 },
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
    // Warm paper tones for calm, book-like reading.
    // Ink brown with a copper accent (analogous). Warning is olive-gold and danger crimson.
    id: "parchment",
    name: "Parchment",
    dark: false,
    colors: {
      background: "#F8F4EC",
      surface: "#EFE7DA",
      surfaceAlt: "#E6DBC8",
      border: "#D8CBB4",
      text: "#1F1812",
      textMuted: "#6E5D4B",
      primary: "#835529",
      onPrimary: "#FFF9F0",
      accent: "#9F440F",
      success: "#3E6A3A",
      warning: "#6F5F00",
      danger: "#AA3643",
    },
    ...shape,
  },
  {
    // Deep ink background for late-evening reading.
    // Gold on blue-black, a complementary pair. Warning is pale yellow, not the brand gold.
    id: "night-watch",
    name: "Night Watch",
    dark: true,
    colors: {
      background: "#12141C",
      surface: "#1C1F2A",
      surfaceAlt: "#262A37",
      border: "#333849",
      text: "#F3EDE2",
      textMuted: "#A9A398",
      primary: "#E0B25C",
      onPrimary: "#1A1408",
      accent: "#C98B5A",
      success: "#7FBF8E",
      warning: "#E8D66B",
      danger: "#E87782",
    },
    ...shape,
  },
  {
    // Soft sage and olive, quiet and grounded.
    // Olive brand: success is teal-green, the accent ochre-brown, warning olive-gold.
    id: "olive",
    name: "Olive Grove",
    dark: false,
    colors: {
      background: "#F3F4EC",
      surface: "#E7EADC",
      surfaceAlt: "#DCE1CD",
      border: "#C7CEB4",
      text: "#1E2519",
      textMuted: "#5A6450",
      primary: "#4D6938",
      onPrimary: "#F7F9F2",
      accent: "#8F521B",
      success: "#006D64",
      warning: "#736000",
      danger: "#A93C39",
    },
    ...shape,
  },
  {
    // Dark charcoal with a glowing terracotta accent.
    // Ember orange, light enough to read on its own surfaces. Danger is rose, warning pale
    // yellow.
    id: "ember",
    name: "Ember",
    dark: true,
    colors: {
      background: "#1E1B19",
      surface: "#2A2624",
      surfaceAlt: "#363130",
      border: "#4A433F",
      text: "#F4EDE8",
      textMuted: "#B5A9A1",
      primary: "#EE7A5B",
      onPrimary: "#1E1410",
      accent: "#E9B872",
      success: "#8DBB7E",
      warning: "#E8D66B",
      danger: "#F17996",
    },
    ...shape,
  },
  {
    // Light, airy blue-grey like early morning.
    // Blue with an orange accent (complements).
    id: "dawn",
    name: "Dawn",
    dark: false,
    colors: {
      background: "#F3F7F9",
      surface: "#E4EEF2",
      surfaceAlt: "#D5E3EA",
      border: "#B9CDD8",
      text: "#14262E",
      textMuted: "#4F6672",
      primary: "#25698A",
      onPrimary: "#F8FCFE",
      accent: "#9D4C14",
      success: "#1E7049",
      warning: "#756104",
      danger: "#AB3D40",
    },
    ...shape,
  },
];

export const defaultThemeId = "parchment";
