// Chrome for the Train screen: a double-bordered panel with optional corner brackets, a
// condensed-looking stencil heading, and a glowing red call to action. Colors come from the theme.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Four small brackets in the panel's corners, like a training card. */
function Corners() {
  const theme = useTheme();
  const size = 14;
  const inset = 8;
  const color = theme.colors.textMuted;
  const corner = (place: ViewStyle, sides: ViewStyle) => (
    <View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size, borderColor: color }, place, sides]}
    />
  );
  return (
    <>
      {corner({ top: inset, left: inset }, { borderTopWidth: 2, borderLeftWidth: 2 })}
      {corner({ top: inset, right: inset }, { borderTopWidth: 2, borderRightWidth: 2 })}
      {corner({ bottom: inset, left: inset }, { borderBottomWidth: 2, borderLeftWidth: 2 })}
      {corner({ bottom: inset, right: inset }, { borderBottomWidth: 2, borderRightWidth: 2 })}
    </>
  );
}

/** A dark panel in a heavier outer frame. `corners` adds the bracket accents. */
export function Frame({
  children,
  corners = false,
  style,
}: {
  children: ReactNode;
  corners?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.lg + 4,
          borderWidth: 2,
          borderColor: theme.colors.border,
          padding: 5,
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
    >
      <View
        style={{
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
          overflow: "hidden",
        }}
      >
        {children}
        {corners ? <Corners /> : null}
      </View>
    </View>
  );
}

/**
 * A heavy display face. The system has no condensed weight to ship with the app, so the
 * letters are set bold and squeezed horizontally, which reads as a stencil headline.
 */
export function Stencil({
  children,
  size,
  color,
  style,
  accessibilityRole,
}: {
  children: ReactNode;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
  accessibilityRole?: "header";
}) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole={accessibilityRole}
      style={[
        {
          fontSize: size,
          color,
          fontWeight: theme.font.weight.bold,
          letterSpacing: 2,
          transform: [{ scaleX: 0.86 }],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The main call to action: full width, a red glow, springs when pressed. */
export function GlowButton({
  label,
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: disabled ? 0 : 0.6,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: disabled ? 0 : 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon ? <Ionicons name={icon} size={22} color={theme.colors.onPrimary} /> : null}
      <Text
        style={{
          color: theme.colors.onPrimary,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}
