import type { Theme } from "./types";

const radius = { sm: 6, md: 10, lg: 16, pill: 999 };
const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const font: Theme["font"] = {
  size: { caption: 12, body: 15, title: 20, headline: 28, display: 36 },
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
    // Terracotta with a herb-green accent. Success is a cooler emerald so it is not the herb
    // accent; warning is amber-brown.
    id: "larder",
    name: "Larder",
    dark: false,
    colors: {
      background: "#F3EAD8",
      surface: "#FBF6E8",
      surfaceAlt: "#E5D3B0",
      border: "#E2D3B3",
      text: "#2A1F16",
      textMuted: "#675946",
      primary: "#994000",
      onPrimary: "#FFFFFF",
      accent: "#4D6220",
      success: "#036752",
      warning: "#785400",
      danger: "#AA293C",
    },
    radius,
    spacing,
    font,
  },
  {
    // Basil green with a tomato accent (complements). Danger is a darker crimson so it is not
    // the tomato; success is leaf green.
    id: "basil",
    name: "Basil",
    dark: false,
    colors: {
      background: "#F5F8F3",
      surface: "#FFFFFF",
      surfaceAlt: "#E6EFE3",
      border: "#D3DFD0",
      text: "#162419",
      textMuted: "#51635A",
      primary: "#2A7749",
      onPrimary: "#FFFFFF",
      accent: "#B54518",
      success: "#5C7203",
      warning: "#826603",
      danger: "#980B40",
    },
    radius,
    spacing,
    font,
  },
  {
    // Ink blue with a rust accent (near-complements). Danger is crimson, clear of the rust.
    id: "receipt",
    name: "Receipt",
    dark: false,
    colors: {
      background: "#F3EEDC",
      surface: "#FBF8EC",
      surfaceAlt: "#E8E1CA",
      border: "#D6CDB2",
      text: "#1A1E29",
      textMuted: "#575A62",
      primary: "#1F4E8C",
      onPrimary: "#FFFFFF",
      accent: "#A04A15",
      success: "#2F6F46",
      warning: "#795F02",
      danger: "#97123D",
    },
    radius,
    spacing,
    font,
  },
  {
    // Orange on warm black with a gold accent. Danger is rose, warning pale yellow.
    id: "castiron",
    name: "Cast Iron",
    dark: true,
    colors: {
      background: "#151413",
      surface: "#201E1C",
      surfaceAlt: "#2C2926",
      border: "#3B3733",
      text: "#F3ECE4",
      textMuted: "#B2A79B",
      primary: "#E8743B",
      onPrimary: "#1A0E07",
      accent: "#F0B35A",
      success: "#7CC48A",
      warning: "#EADB64",
      danger: "#F27192",
    },
    radius,
    spacing,
    font,
  },
  {
    // Gold on aubergine (complements). Warning is orange, not the brand gold.
    id: "aubergine",
    name: "Aubergine",
    dark: true,
    colors: {
      background: "#1D1120",
      surface: "#2A1B2E",
      surfaceAlt: "#38253F",
      border: "#4B3453",
      text: "#F6EDF5",
      textMuted: "#BDAABE",
      primary: "#D9A62E",
      onPrimary: "#241508",
      accent: "#D98BA8",
      success: "#8CCB93",
      warning: "#FDA258",
      danger: "#F47C6E",
    },
    radius,
    spacing,
    font,
  },
];

export const defaultThemeId = "larder";
