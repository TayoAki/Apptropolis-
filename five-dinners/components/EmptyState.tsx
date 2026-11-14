import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./Button";

export function EmptyState({
  icon = "restaurant-outline",
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        gap: theme.spacing.sm,
        padding: theme.spacing.xl,
      }}
    >
      <Ionicons name={icon} size={36} color={theme.colors.textMuted} />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          fontFamily: theme.font.family,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          fontFamily: theme.font.family,
          textAlign: "center",
        }}
      >
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing.sm }} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.xl }}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontFamily: theme.font.family,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
