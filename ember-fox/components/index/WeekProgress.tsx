import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatCount, formatDrinks } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { CountUp, GrowBar } from "../motion";
import { Panel } from "../Panel";

/**
 * The week's drinks against its limit: the count, a bar, and one plain line. Under the limit it
 * says what is left; over it, it says by how much and what the app suggests next.
 */
export function WeekProgress({
  total,
  limit,
  resetDay,
}: {
  total: number;
  limit: number;
  /** The weekday the week resets on, e.g. "Monday". */
  resetDay: string;
}) {
  const theme = useTheme();
  const over = total > limit + 0.001;
  const remaining = Math.max(0, limit - total);
  const progress = limit > 0 ? Math.min(1, total / limit) : 1;
  const color = over ? theme.colors.warning : theme.colors.primary;
  const status = over
    ? `${formatDrinks(total - limit)} over your limit. Alcohol-free days until ${resetDay} bring your form back fastest.`
    : remaining === 0
      ? `At your limit. The week resets on ${resetDay}.`
      : `${formatDrinks(remaining)} left. The week resets on ${resetDay}.`;

  return (
    <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <View
        accessible
        accessibilityLabel={`This week: ${formatCount(total)} of ${formatDrinks(limit)}. ${status}`}
        style={{ gap: theme.spacing.md }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            This week
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontVariant: ["tabular-nums"],
            }}
          >
            <CountUp
              value={total}
              format={formatCount}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            />
            {` of ${formatDrinks(limit)}`}
          </Text>
        </View>
        <GrowBar progress={progress} height={10} color={color} trackColor={theme.colors.surfaceAlt} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <Ionicons
            name={over ? "alert-circle-outline" : "checkmark-circle-outline"}
            size={18}
            color={over ? theme.colors.warning : theme.colors.success}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              color: over ? theme.colors.text : theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              lineHeight: 18,
            }}
          >
            {status}
          </Text>
        </View>
      </View>
    </Panel>
  );
}
