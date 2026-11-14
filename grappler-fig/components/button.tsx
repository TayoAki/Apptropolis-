// The app's main call to action: full width by default, springs when pressed, light haptic.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primary,
        opacity: disabled ? 0.5 : 1,
        alignSelf: fullWidth ? "stretch" : "center",
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={theme.colors.onPrimary} /> : null}
      <Text
        style={{
          color: theme.colors.onPrimary,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}
