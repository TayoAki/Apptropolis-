import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The app's button: a filled primary action, or a quiet secondary one. At least 48pt tall. */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const primary = variant === "primary";
  // A disabled button goes quiet instead of fading: the label stays readable on a neutral fill.
  const filled = primary && !disabled;
  const ink = disabled
    ? theme.colors.textMuted
    : primary
      ? theme.colors.onPrimary
      : theme.colors.text;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic={filled ? "light" : undefined}
      scaleTo={0.94}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        {
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: filled ? theme.colors.primary : theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: filled ? theme.colors.primary : theme.colors.border,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={ink} /> : null}
      <Text
        style={{
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
