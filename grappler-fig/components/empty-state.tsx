// What a list or panel shows when there is nothing yet: an icon, a short reason and one next action.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PrimaryButton } from "./button";
import { Appear } from "./motion";

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
    <Appear>
      <View
        style={{
          alignItems: "center",
          paddingVertical: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Ionicons name={icon} size={32} color={theme.colors.primary} />
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
          <PrimaryButton label={actionLabel} onPress={onAction} fullWidth={false} />
        ) : null}
      </View>
    </Appear>
  );
}
