import type { Theme } from "./types";

// Shared shape for every pack: the same corner radii, spacing and type scale, so switching
// packs changes the mood and never the layout.
const radius: Theme["radius"] = { sm: 10, md: 16, lg: 24, pill: 999 };
const spacing: Theme["spacing"] = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const font: Theme["font"] = {
  size: { caption: 13, body: 16, title: 22, headline: 28, display: 34 },
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
    // Orange with a peach accent (analogous heat, used together in gradients). Danger cools to
    // crimson and warning goes to yellow so neither is mistaken for the brand orange.
    id: "iron",
    name: "Iron Gym",
    dark: true,
    colors: {
      background: "#0E0F11",
      surface: "#1A1C20",
      surfaceAlt: "#25282D",
      border: "#33363C",
      text: "#F4F4F5",
      textMuted: "#9A9EA6",
      primary: "#FF6B2C",
      onPrimary: "#120A06",
      accent: "#FFA65C",
      success: "#3DD68C",
      warning: "#F7D644",
      danger: "#FC587F",
    },
    radius,
    spacing,
    font,
  },
  {
    // Gold on chalk white with a light label. A warm ramp spaced about 25 degrees apart: gold,
    // amber warning, burnt-orange accent, crimson danger.
    id: "chalk",
    name: "Chalk Dust",
    dark: false,
    colors: {
      background: "#FBF8F1",
      surface: "#FFFFFF",
      surfaceAlt: "#F1EBDD",
      border: "#E2D9C6",
      text: "#2A2112",
      textMuted: "#6B5E44",
      primary: "#8C6101",
      onPrimary: "#FFFDF7",
      accent: "#BB3D2E",
      success: "#107845",
      warning: "#A75102",
      danger: "#BD3268",
    },
    radius,
    spacing,
    font,
  },
  {
    // Green brand: success is lime, warning is orange (it used to match the gold accent).
    id: "court",
    name: "Night Court",
    dark: true,
    colors: {
      background: "#07120C",
      surface: "#0F1F16",
      surfaceAlt: "#17301F",
      border: "#24452F",
      text: "#EAF7EE",
      textMuted: "#9BB8A5",
      primary: "#2ECC71",
      onPrimary: "#052412",
      accent: "#E8B04A",
      success: "#B0EB52",
      warning: "#FF9462",
      danger: "#FF6B6B",
    },
    radius,
    spacing,
    font,
  },
  {
    // Coral primary with a light label. Danger is a much darker wine, separated by lightness
    // because the hue is the brand's.
    id: "coral",
    name: "Coral Sprint",
    dark: false,
    colors: {
      background: "#FFF7F6",
      surface: "#FFFFFF",
      surfaceAlt: "#FCE7E9",
      border: "#F3CDD2",
      text: "#2B1418",
      textMuted: "#7A5559",
      primary: "#C62B49",
      onPrimary: "#FFF8F7",
      accent: "#A15604",
      success: "#007950",
      warning: "#7A6900",
      danger: "#95043E",
    },
    radius,
    spacing,
    font,
  },
  {
    // Teal with an orange accent (complements). Status hues sit clear of both.
    id: "track",
    name: "Track Blue",
    dark: false,
    colors: {
      background: "#F4FAFA",
      surface: "#FFFFFF",
      surfaceAlt: "#E0F2F3",
      border: "#C5E3E6",
      text: "#0B2A2E",
      textMuted: "#4F6B6F",
      primary: "#037681",
      onPrimary: "#F5FDFD",
      accent: "#AD5002",
      success: "#217A3E",
      warning: "#856703",
      danger: "#BF3950",
    },
    radius,
    spacing,
    font,
  },
];

export const defaultThemeId = "iron";
