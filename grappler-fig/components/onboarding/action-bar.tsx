// The onboarding footer: a raised panel with one bright call to action and a caption beneath it.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { Corners } from "./corners";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function ActionBar({
  label,
  onPress,
  icon,
  caption,
  busy = false,
  bottomInset = 0,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  caption: string;
  /** Work is in progress: the button dims and can't be pressed again. */
  busy?: boolean;
  /** The phone's bottom safe-area inset. */
  bottomInset?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        gap: theme.spacing.md,
        paddingTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: bottomInset + theme.spacing.md,
        borderTopLeftRadius: theme.radius.md,
        borderTopRightRadius: theme.radius.md,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.background,
        shadowOpacity: 0.9,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -8 },
        elevation: 12,
      }}
    >
      <PressScale
        onPress={onPress}
        disabled={busy}
        haptic="light"
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: busy }}
        style={{
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.primary,
          opacity: busy ? 0.6 : 1,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.6,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <Corners color={theme.colors.background} size={12} inset={8} />
        {icon ? <Ionicons name={icon} size={22} color={theme.colors.background} /> : null}
        <Text
          style={{
            color: theme.colors.background,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {label}
        </Text>
      </PressScale>
      <Text
        style={{
          textAlign: "center",
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
        }}
      >
        {caption}
      </Text>
    </View>
  );
}
