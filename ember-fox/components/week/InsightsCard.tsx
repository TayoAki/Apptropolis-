import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { PressScale, Skeleton } from "../motion";
import { useTheme } from "../../theme/ThemeProvider";
import { router } from "expo-router";

interface Props {
  premium: boolean;
  /** Shown until a coach answer exists. */
  teaser: string;
  answer: string | null;
  loading: boolean;
  error: string | null;
  onAsk: () => void;
  onUnlock: () => void;
}

export function InsightsCard({ premium, teaser, answer, loading, error, onAsk, onUnlock }: Props) {
  const theme = useTheme();
  const label = !premium
    ? "Unlock with Plus"
    : loading
      ? "Asking your coach…"
      : answer
        ? "Ask again"
        : "Ask your coach";

  return (
    <View
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            flexShrink: 1,
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1,
          }}
        >
          AI COACH TREND INSIGHTS
        </Text>
        {!premium ? (
          <Pressable
            onPress={() => router.push("/paywall")}
            accessibilityRole="button"
            accessibilityLabel="Unlock with Plus"
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              minHeight: 32,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="lock-closed" size={14} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Unlock with Plus
            </Text>
          </Pressable>
        ) : null}
      </View>

      {premium && loading ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
        </View>
      ) : (
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            lineHeight: 22,
          }}
        >
          {premium && answer ? answer : teaser}
        </Text>
      )}

      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
          {error}
        </Text>
      ) : null}

      <PressScale
        onPress={premium ? onAsk : onUnlock}
        haptic="light"
        scaleTo={0.97}
        disabled={premium && loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          minHeight: 52,
          borderRadius: theme.radius.md,
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
          {label}
        </Text>
        <Ionicons
          name={premium ? "sparkles-outline" : "lock-closed"}
          size={18}
          color={theme.colors.onPrimary}
        />
      </PressScale>
    </View>
  );
}
