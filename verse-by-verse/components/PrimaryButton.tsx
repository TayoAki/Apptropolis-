import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The main call to action on a screen ("filled") or a secondary one ("quiet").
 * At least 48pt tall, springs when pressed, and gives a light tap on filled presses.
 * Disabled, it turns to a neutral fill with a muted label that stays readable.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "filled",
  disabled = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "filled" | "quiet";
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const filled = variant === "filled";
  const ink = disabled
    ? theme.colors.textMuted
    : filled
      ? theme.colors.onPrimary
      : theme.colors.primary;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      haptic={filled ? "light" : undefined}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={{
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.pill,
        backgroundColor: !filled
          ? undefined
          : disabled
            ? theme.colors.surfaceAlt
            : theme.colors.primary,
      }}
    >
      {icon ? <Ionicons name={icon} size={18} color={ink} /> : null}
      <Text
        style={{
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}
