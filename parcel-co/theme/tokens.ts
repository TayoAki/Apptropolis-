import type { Theme } from "./types";

// Shared scale: every pack uses the same corner radius, spacing and type sizes.
const radius: Theme["radius"] = { sm: 10, md: 16, lg: 22, pill: 999 };
const spacing: Theme["spacing"] = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const font: Theme["font"] = {
  size: { caption: 12, body: 16, title: 22, headline: 28, display: 40 },
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
    // Kraft neutrals with a terracotta primary. The teal accent is the terracotta's
    // split-complement, so it never reads as success green; status hues sit about 35 degrees
    // either side of the primary.
    id: "linen",
    name: "Linen",
    dark: false,
    colors: {
      background: "#F6F1E9",
      surface: "#FFFCF7",
      surfaceAlt: "#EFE7DB",
      border: "#E2D6C5",
      text: "#3A2A1F",
      textMuted: "#766454",
      primary: "#A05101",
      onPrimary: "#FFFFFF",
      accent: "#227179",
      success: "#337344",
      warning: "#7D6403",
      danger: "#B93747",
    },
    radius,
    spacing,
    font,
  },
  {
    // Rose primary with a light label, so the same rose also works as link text. Plum accent is
    // analogous; danger is a darker brick so an error is never the brand rose.
    id: "clay",
    name: "Rose Clay",
    dark: false,
    colors: {
      background: "#FBF4F2",
      surface: "#FFFFFF",
      surfaceAlt: "#F5E6E4",
      border: "#EBD3D0",
      text: "#3D2A2C",
      textMuted: "#7D6265",
      primary: "#A84956",
      onPrimary: "#FFF9F8",
      accent: "#835A7F",
      success: "#327454",
      warning: "#886001",
      danger: "#A5220B",
    },
    radius,
    spacing,
    font,
  },
  {
    // Green brand: success is a yellower leaf green, the accent is copper (near-complement) and
    // warning is olive-gold, so the three never blur.
    id: "fern",
    name: "Fern",
    dark: false,
    colors: {
      background: "#F3F6F0",
      surface: "#FFFFFF",
      surfaceAlt: "#E6EDE2",
      border: "#D3DFCC",
      text: "#1F2E25",
      textMuted: "#5C6B60",
      primary: "#257655",
      onPrimary: "#FFFFFF",
      accent: "#A25325",
      success: "#567200",
      warning: "#7C6702",
      danger: "#B93D3B",
    },
    radius,
    spacing,
    font,
  },
  {
    // Gold on warm black. Warning is orange (it used to be the brand gold), the accent is a cool
    // blue-teal against the warm primary.
    id: "midnight",
    name: "Midnight Market",
    dark: true,
    colors: {
      background: "#15130F",
      surface: "#1F1C17",
      surfaceAlt: "#2A261F",
      border: "#3A3429",
      text: "#F5EEDF",
      textMuted: "#A89E8A",
      primary: "#E0B15A",
      onPrimary: "#1A1408",
      accent: "#7ABEC6",
      success: "#7DBE8A",
      warning: "#F7945A",
      danger: "#EE6C71",
    },
    radius,
    spacing,
    font,
  },
  {
    // Vermilion on neutral black. Danger is rose, not the brand red.
    id: "ink",
    name: "Ink",
    dark: true,
    colors: {
      background: "#0B0B0C",
      surface: "#161618",
      surfaceAlt: "#222225",
      border: "#33333A",
      text: "#F7F7F8",
      textMuted: "#A1A1AA",
      primary: "#FF6648",
      onPrimary: "#0B0B0C",
      accent: "#4FD1C5",
      success: "#4ADE80",
      warning: "#FFC857",
      danger: "#F95992",
    },
    radius,
    spacing,
    font,
  },
];

export const defaultThemeId = "linen";
