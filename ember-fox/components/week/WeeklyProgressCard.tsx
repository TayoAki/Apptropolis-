import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatCount, formatDay, formatDrinks } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { CountUp } from "../motion";

export interface DayBar {
  key: string;
  label: string;
  /** Standard drinks logged that day. */
  value: number;
  gameDay: boolean;
  today: boolean;
  /** The day is marked alcohol-free. */
  alcoholFree: boolean;
}

interface Props {
  days: DayBar[];
  /** Standard drinks in one day that the dashed line marks. */
  guide: number;
  total: number;
  limit: number;
  freeDays: number;
  freeTarget: number;
  over: boolean;
}

const CHART_HEIGHT = 164;
const MARK_HEIGHT = 22;
const VALUE_HEIGHT = 20;
const BAR_WIDTH = 24;

function Stat({
  label,
  flex = 1,
  children,
}: {
  label: string;
  flex?: number;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex, gap: theme.spacing.xs }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** The week as a bar chart of drinks per day, with the week's totals under it. */
export function WeeklyProgressCard({
  days,
  guide,
  total,
  limit,
  freeDays,
  freeTarget,
  over,
}: Props) {
  const theme = useTheme();
  const scale = Math.max(3, guide, ...days.map((day) => day.value));
  const barMax = CHART_HEIGHT - MARK_HEIGHT - VALUE_HEIGHT;
  const guideBottom = (guide / scale) * barMax;
  const statusColor = over ? theme.colors.warning : theme.colors.success;
  const hasGameDay = days.some((day) => day.gameDay);
  const value = {
    color: theme.colors.text,
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.bold,
    fontVariant: ["tabular-nums" as const],
  };
  const legend = { color: theme.colors.textMuted, fontSize: theme.font.size.caption };

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
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Drinks per day
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          Standard drinks you logged each day this week.
        </Text>
      </View>

      <View>
        <View style={{ height: CHART_HEIGHT }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: guideBottom,
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: theme.colors.textMuted,
            }}
          />
          <View style={{ flex: 1, flexDirection: "row" }}>
            {days.map((day) => {
              const height = day.value > 0 ? Math.max(4, (day.value / scale) * barMax) : 0;
              return (
                <View
                  key={day.key}
                  accessible
                  accessibilityLabel={`${formatDay(day.key, "long")}: ${formatDrinks(day.value)}${
                    day.alcoholFree ? ", marked alcohol-free" : ""
                  }${day.gameDay ? ", game day" : ""}`}
                  style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
                >
                  <View style={{ height: MARK_HEIGHT, justifyContent: "center" }}>
                    {day.gameDay ? (
                      <Ionicons name="flag" size={16} color={theme.colors.accent} />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      height: VALUE_HEIGHT,
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.medium,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatCount(day.value)}
                  </Text>
                  <View
                    style={{
                      width: BAR_WIDTH,
                      height,
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                      backgroundColor: theme.colors.primary,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.textMuted }} />
        <View style={{ flexDirection: "row", paddingTop: theme.spacing.sm }}>
          {days.map((day) => (
            <View key={day.key} style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <Text
                style={{
                  color: day.today ? theme.colors.text : theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: day.today ? theme.font.weight.bold : theme.font.weight.medium,
                }}
              >
                {day.label}
              </Text>
              <View style={{ height: 14 }}>
                {day.alcoholFree ? (
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: theme.spacing.lg, rowGap: 4 }}>
        <Text style={legend}>{`Dashed line: ${formatDrinks(guide)} in a day`}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
          <Text style={legend}>Alcohol-free day</Text>
        </View>
        {hasGameDay ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="flag" size={14} color={theme.colors.accent} />
            <Text style={legend}>Game day</Text>
          </View>
        ) : null}
      </View>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />

      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        <Stat label="This week">
          <Text style={value}>
            <CountUp value={total} format={formatCount} style={value} />
            <Text style={{ fontWeight: theme.font.weight.regular }}>{` of ${formatCount(limit)}`}</Text>
          </Text>
        </Stat>
        <Stat label="Alcohol-free">
          <Text style={value}>
            {freeDays}
            <Text
              style={{ fontWeight: theme.font.weight.regular }}
            >{` of ${freeTarget} days`}</Text>
          </Text>
        </Stat>
        <Stat label="Status" flex={1.2}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons
              name={over ? "alert-circle" : "checkmark-circle"}
              size={16}
              color={statusColor}
            />
            <Text style={[value, { color: statusColor, flexShrink: 1 }]}>
              {over ? "Over limit" : "On track"}
            </Text>
          </View>
        </Stat>
      </View>
    </View>
  );
}
