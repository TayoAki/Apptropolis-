// The app's main call to action: full width by default, springs when pressed, light haptic.
// One shape and height everywhere, so the primary action looks the same on every screen.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  busy = false,
  tone = "primary",
  accessibilityLabel,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  /** Work is in progress: a spinner replaces the icon and the button can't be pressed again. */
  busy?: boolean;
  /** "danger" for a destructive confirmation. */
  tone?: "primary" | "danger";
  accessibilityLabel?: string;
  fullWidth?: boolean;
}) {
  const theme = useTheme();
  const blocked = disabled || busy;
  // A disabled button goes neutral instead of fading, so its label stays readable.
  const off = disabled && !busy;
  const ink = off ? theme.colors.textMuted : theme.colors.onPrimary;
  return (
    <PressScale
      onPress={onPress}
      disabled={blocked}
      haptic="light"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy }}
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: off
          ? theme.colors.surfaceAlt
          : tone === "danger"
            ? theme.colors.danger
            : theme.colors.primary,
        alignSelf: fullWidth ? "stretch" : "center",
      }}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={ink} />
      ) : null}
      <Text
        style={{
          flexShrink: 1,
          textAlign: "center",
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}
