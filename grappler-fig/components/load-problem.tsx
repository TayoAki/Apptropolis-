// What a screen shows when its saved data hasn't arrived after a while (no connection, or the
// service is down), instead of a skeleton that never ends: what is missing, and a way to retry.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { SecondaryButton } from "./ui";

/** True once `loading` has lasted longer than `afterMs`; false again as soon as it ends. */
export function useStalled(loading: boolean, afterMs = 8000): boolean {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!loading) {
      setStalled(false);
      return;
    }
    const id = setTimeout(() => setStalled(true), afterMs);
    return () => clearTimeout(id);
  }, [loading, afterMs]);
  return stalled;
}

export function LoadProblem({
  what,
  note,
  onRetry,
}: {
  /** What couldn't be loaded, e.g. "your reports". */
  what: string;
  /** What still works meanwhile. */
  note?: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
        <Ionicons name="cloud-offline-outline" size={24} color={theme.colors.danger} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {`Can't load ${what}`}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
            {`Check your connection, then try again.${note ? ` ${note}` : ""}`}
          </Text>
        </View>
      </View>
      <SecondaryButton label="Try again" icon="refresh" onPress={onRetry} />
    </View>
  );
}
