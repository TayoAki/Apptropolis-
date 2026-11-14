// The Progress screen's dark panel: a soft gradient fill, a light stroke, a faint red glow and
// red corner brackets. Also the two type faces the screen uses for headings and readouts.
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

/** A condensed bold face for headings and big numbers (system faces, so nothing to load). */
export const displayFont = Platform.select({
  ios: "AvenirNextCondensed-Bold",
  android: "sans-serif-condensed",
  default: undefined,
});

/** A monospace face for XP and other readouts. */
export const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const INSET = 6;
const ARM = 10;

function Corner({ top, left }: { top: boolean; left: boolean }) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: ARM,
        height: ARM,
        top: top ? INSET : undefined,
        bottom: top ? undefined : INSET,
        left: left ? INSET : undefined,
        right: left ? undefined : INSET,
        borderColor: theme.colors.primary,
        borderTopWidth: top ? 2 : 0,
        borderBottomWidth: top ? 0 : 2,
        borderLeftWidth: left ? 2 : 0,
        borderRightWidth: left ? 0 : 2,
      }}
    />
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.18,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.surfaceAlt, theme.colors.surface]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          borderRadius: theme.radius.md,
          overflow: "hidden",
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        {children}
        <Corner top left />
        <Corner top left={false} />
        <Corner top={false} left />
        <Corner top={false} left={false} />
      </LinearGradient>
    </View>
  );
}
