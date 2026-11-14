import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Appear, PressScale } from "./motion";

/** Shown when a list or screen has nothing yet: what it is for, and the next action. */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <Appear
      style={{
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors.primary} />
      </View>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          textAlign: "center",
        }}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <PressScale
          onPress={onAction}
          haptic="light"
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{
            minHeight: 44,
            justifyContent: "center",
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {actionLabel}
          </Text>
        </PressScale>
      ) : null}
    </Appear>
  );
}
