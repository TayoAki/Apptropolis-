import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  WEEKDAYS,
  formatCount,
  formatDate,
  formatDrinks,
  type GameEveAverages,
  type WeekTotal,
  type WeekdayPattern,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, Skeleton } from "../motion";

/** What the Plus trends are worked out from. All of it comes from the person's own log. */
export interface Trends {
  /** The last 12 weeks, oldest first; the last one is this week. */
  history: WeekTotal[];
  limit: number;
  /** Days since the first entry, today included. */
  daysTracked: number;
  /** Null until there are two weeks of entries. */
  weekday: WeekdayPattern | null;
  /** Null without game days in Settings, or before two weeks of entries. */
  gameEve: GameEveAverages | null;
  gameDaysSet: boolean;
}

/** The coach's written feedback. It needs the app's AI service, so it may not be available. */
export interface Coach {
  available: boolean;
  answer: string | null;
  loading: boolean;
  error: string | null;
  onAsk: () => void;
}

interface Props {
  premium: boolean;
  /** Shown to free users in place of the trends. */
  teaser: string;
  trends: Trends;
  coach: Coach;
  onUnlock: () => void;
  onOpenSettings: () => void;
}

const CHART_HEIGHT = 84;
const LABEL_HEIGHT = 18;
const BAR_WIDTH = 14;

/** Twelve weekly totals as thin bars against the weekly limit. */
function HistoryChart({ history, limit }: { history: WeekTotal[]; limit: number }) {
  const theme = useTheme();
  const top = Math.max(limit, ...history.map((week) => week.total), 1);
  const barMax = CHART_HEIGHT - LABEL_HEIGHT;
  const limitBottom = (limit / top) * barMax;
  const highest = history.reduce((best, week) => (week.total > best.total ? week : best));
  const last = history[history.length - 1]!;
  const caption = { color: theme.colors.textMuted, fontSize: theme.font.size.caption };
  const summary = history
    .filter((week) => week.hasEntries)
    .map((week) => `week of ${formatDate(week.weekStart)} ${formatCount(week.total)}`)
    .join(", ");

  return (
    <View
      accessible
      accessibilityLabel={`Drinks per week for the last ${history.length} weeks, against a limit of ${limit}: ${summary || "nothing logged yet"}.`}
      style={{ gap: theme.spacing.xs }}
    >
      <View style={{ height: CHART_HEIGHT }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: limitBottom,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderColor: theme.colors.textMuted,
          }}
        />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {history.map((week) => {
            const height = week.total > 0 ? Math.max(3, (week.total / top) * barMax) : 0;
            const labelled = week.total > 0 && (week === highest || week === last);
            return (
              <View
                key={week.weekStart}
                style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
              >
                {labelled ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      height: LABEL_HEIGHT,
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.medium,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatCount(week.total)}
                  </Text>
                ) : null}
                {week.hasEntries ? (
                  <View
                    style={{
                      width: BAR_WIDTH,
                      height,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      backgroundColor: theme.colors.primary,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.textMuted }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={caption}>{`Week of ${formatDate(history[0]!.weekStart)}`}</Text>
        <Text style={caption}>This week</Text>
      </View>
    </View>
  );
}

/**
 * Trend insights. Free users see a teaser and the way to Plus. Plus shows the last 12 weeks, the
 * heaviest weekday and how drinking lines up with game days, all worked out on the phone from
 * the person's own log, and the coach's written feedback when the AI service is connected.
 */
export function InsightsCard({ premium, teaser, trends, coach, onUnlock, onOpenSettings }: Props) {
  const theme = useTheme();
  const body = { color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 };
  const finished = trends.history.slice(0, -1).filter((week) => week.hasEntries);
  const within = finished.filter((week) => week.total <= trends.limit).length;
  const anyHistory = trends.history.some((week) => week.hasEntries);

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
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Trend insights
        </Text>
        {!premium ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Plus
            </Text>
          </View>
        ) : null}
      </View>

      {!premium ? (
        <>
          <Text style={body}>{teaser}</Text>
          <PressScale
            onPress={onUnlock}
            haptic="light"
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="See what Plus adds"
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
              See what Plus adds
            </Text>
            <Ionicons name="lock-closed" size={18} color={theme.colors.onPrimary} />
          </PressScale>
        </>
      ) : (
        <>
          {anyHistory ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {`Drinks per week, last 12 weeks. Dashed line: your limit of ${trends.limit}.`}
              </Text>
              <HistoryChart history={trends.history} limit={trends.limit} />
              {finished.length > 0 ? (
                <Text style={body}>
                  <Text style={{ fontWeight: theme.font.weight.bold }}>
                    {`${within} of ${finished.length}`}
                  </Text>
                  {` finished ${finished.length === 1 ? "week" : "weeks"} within your current limit.`}
                </Text>
              ) : null}
            </View>
          ) : null}

          {trends.daysTracked < 14 ? (
            <Text style={body}>
              {`Weekday and game-day patterns need about two weeks of entries. You're ${trends.daysTracked} ${
                trends.daysTracked === 1 ? "day" : "days"
              } in: keep logging and they appear here.`}
            </Text>
          ) : (
            <>
              <Text style={body}>
                {trends.weekday ? (
                  <>
                    <Text style={{ fontWeight: theme.font.weight.bold }}>
                      {`${WEEKDAYS[trends.weekday.weekday]} is your heaviest day: `}
                    </Text>
                    {`${formatCount(trends.weekday.total)} of the ${formatDrinks(trends.weekday.all)} you logged in the last 12 weeks.`}
                  </>
                ) : (
                  "No drinks logged in the last 12 weeks."
                )}
              </Text>
              {trends.gameEve ? (
                <Text style={body}>
                  <Text style={{ fontWeight: theme.font.weight.bold }}>
                    {`The day before a game or training day you average ${formatDrinks(trends.gameEve.eve)}, `}
                  </Text>
                  {`against ${formatCount(trends.gameEve.other)} on other days.`}
                </Text>
              ) : null}
            </>
          )}

          {!trends.gameDaysSet ? (
            <Pressable
              onPress={onOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Set your game and training days in Settings"
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={body}>
                {"To see how your drinking lines up with game days, "}
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: theme.font.weight.bold,
                    textDecorationLine: "underline",
                  }}
                >
                  set your game and training days
                </Text>
                .
              </Text>
            </Pressable>
          ) : null}

          {coach.available ? (
            <View style={{ gap: theme.spacing.md }}>
              <View
                style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }}
              />
              {coach.loading ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Skeleton height={14} />
                  <Skeleton width="80%" height={14} />
                </View>
              ) : coach.answer ? (
                <Text accessibilityLiveRegion="polite" style={body}>
                  {coach.answer}
                </Text>
              ) : null}
              {coach.error ? (
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{
                      flex: 1,
                      color: theme.colors.danger,
                      fontSize: theme.font.size.caption,
                    }}
                  >
                    {`${coach.error} Your trends above don't depend on it.`}
                  </Text>
                </View>
              ) : null}
              <PressScale
                onPress={coach.onAsk}
                haptic="light"
                scaleTo={0.97}
                disabled={coach.loading}
                accessibilityRole="button"
                accessibilityLabel={coach.answer ? "Ask your coach again" : "Ask your coach"}
                accessibilityState={{ busy: coach.loading, disabled: coach.loading }}
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
                  {coach.loading
                    ? "Asking your coach…"
                    : coach.error
                      ? "Try again"
                      : coach.answer
                        ? "Ask your coach again"
                        : "Ask your coach"}
                </Text>
                <Ionicons name="sparkles-outline" size={18} color={theme.colors.onPrimary} />
              </PressScale>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
