import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/**
 * A thin progress bar that fills its parent's width (in a row, wrap it in a flex: 1 view).
 * The number it shows is always written next to it by the caller.
 */
export function Meter({
  value,
  color,
  height = 8,
  accessibilityLabel,
}: {
  /** 0 to 1. */
  value: number;
  /** Fill color; the brand color when left out. */
  color?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "progressbar" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        accessibilityLabel ? { min: 0, max: 100, now: Math.round(pct * 100) } : undefined
      }
      style={{
        height,
        borderRadius: height / 2,
        // A tint of the muted text color, so the track shows on every surface in both modes.
        backgroundColor: theme.colors.textMuted + "33",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct > 0 ? Math.max(pct * 100, 3) : 0}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.primary,
        }}
      />
    </View>
  );
}
