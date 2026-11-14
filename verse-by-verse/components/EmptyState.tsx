import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ComponentProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Appear } from "./motion";
import { PrimaryButton } from "./PrimaryButton";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Shown when a list has nothing in it yet. Says what goes here and offers the next action.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
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
          justifyContent: "center",
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
          <Ionicons name={icon} size={28} color={theme.colors.primary} />
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
            lineHeight: theme.font.size.body * 1.4,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
        {actionLabel && onAction ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <PrimaryButton label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
      </View>
    </Appear>
  );
}
