import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./Button";
import { Appear } from "./motion";

/** What a screen shows when there is nothing yet, with the next action to take. */
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
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
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
          <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing.sm }} />
        ) : null}
      </View>
    </Appear>
  );
}
