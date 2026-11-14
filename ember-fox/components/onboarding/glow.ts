import type { ViewStyle } from "react-native";
import type { Theme } from "../../theme/types";

/** The theme's color with an alpha (0 to 1) appended, for tints of a theme color. */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return color;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex[1]}${a}`;
}

/** A card's border and amber glow: lit when `active`, a quiet outline otherwise. */
export function glowStyle(theme: Theme, active: boolean): ViewStyle {
  return {
    borderColor: active ? theme.colors.primary : theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOpacity: active ? 0.5 : 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: active ? 6 : 0,
  };
}
