import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./Button";

export function EmptyState({
  icon = "restaurant-outline",
  title,
  body,
  actionLabel,
  actionLoading,
  onAction,
}: {
  /** Pass null when a picture already sits above the message. */
  icon?: React.ComponentProps<typeof Ionicons>["name"] | null;
  title: string;
  body: string;
  actionLabel?: string;
  /** The action is running: the button stays in place and shows a spinner. */
  actionLoading?: boolean;
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
      {icon ? <Ionicons name={icon} size={36} color={theme.colors.textMuted} /> : null}
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
        <Button
          label={actionLabel}
          onPress={onAction}
          loading={actionLoading}
          style={{ marginTop: theme.spacing.sm, minWidth: 180 }}
        />
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
