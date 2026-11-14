import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

/**
 * The app's one button. primary is the filled call to action, secondary a quiet filled button,
 * outline the second choice next to a primary, ghost a text button, danger a destructive outline.
 */
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
  // A disabled button goes quiet but stays readable: muted label, no chromatic fill, no opacity.
  const off = !!disabled && !loading;

  const background = off
    ? variant === "primary" || variant === "secondary"
      ? theme.colors.surfaceAlt
      : "transparent"
    : variant === "primary"
      ? theme.colors.primary
      : variant === "secondary"
        ? theme.colors.surfaceAlt
        : "transparent";
  const foreground = off
    ? theme.colors.textMuted
    : variant === "primary"
      ? theme.colors.onPrimary
      : variant === "danger"
        ? theme.colors.danger
        : variant === "ghost" || variant === "outline"
          ? theme.colors.primary
          : theme.colors.text;
  const borderColor = off
    ? variant === "ghost"
      ? "transparent"
      : theme.colors.border
    : variant === "secondary"
      ? theme.colors.border
      : variant === "outline"
        ? theme.colors.primary
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
      style={({ pressed }) => [
        {
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: background,
          opacity: pressed ? 0.8 : 1,
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
          flexShrink: 1,
          color: foreground,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
          fontFamily: theme.font.family,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
