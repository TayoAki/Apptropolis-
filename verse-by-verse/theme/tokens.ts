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

export const themes: Theme[] = [
  {
    // Warm paper tones for calm, book-like reading.
    id: "parchment",
    name: "Parchment",
    dark: false,
    colors: {
      background: "#F8F4EC",
      surface: "#EFE7DA",
      surfaceAlt: "#E6DBC8",
      border: "#D8CBB4",
      text: "#1F1812",
      textMuted: "#6E5F4F",
      primary: "#8B5E34",
      onPrimary: "#FFF9F0",
      accent: "#C07A36",
      success: "#4F7A4A",
      warning: "#B7862A",
      danger: "#A8432F",
    },
    ...shape,
  },
  {
    // Deep ink background for late-evening reading.
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
      warning: "#E8A94A",
      danger: "#E07A6A",
    },
    ...shape,
  },
  {
    // Soft sage and olive, quiet and grounded.
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
      primary: "#5F7A4B",
      onPrimary: "#F7F9F2",
      accent: "#A67B3D",
      success: "#4E7A45",
      warning: "#A9762A",
      danger: "#A3482F",
    },
    ...shape,
  },
  {
    // Dark charcoal with a glowing terracotta accent.
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
      primary: "#D9694A",
      onPrimary: "#1E1410",
      accent: "#E9B872",
      success: "#8DBB7E",
      warning: "#E5A852",
      danger: "#F07A6A",
    },
    ...shape,
  },
  {
    // Light, airy blue-grey like early morning.
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
      primary: "#3E7C9C",
      onPrimary: "#F8FCFE",
      accent: "#D08A4E",
      success: "#3F8A62",
      warning: "#B88A22",
      danger: "#B5503D",
    },
    ...shape,
  },
];

export const defaultThemeId = "parchment";
