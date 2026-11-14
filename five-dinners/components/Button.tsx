import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const background =
    variant === "primary"
      ? theme.colors.primary
      : variant === "secondary"
        ? theme.colors.surfaceAlt
        : "transparent";
  const foreground =
    variant === "primary"
      ? theme.colors.onPrimary
      : variant === "danger"
        ? theme.colors.danger
        : variant === "ghost"
          ? theme.colors.primary
          : theme.colors.text;
  const borderColor =
    variant === "secondary"
      ? theme.colors.border
      : variant === "danger"
        ? theme.colors.danger
        : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor,
          backgroundColor: background,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      <Text
        style={{
          color: foreground,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
          fontFamily: theme.font.family,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
