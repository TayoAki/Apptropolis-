import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { AiImage } from "../AiImage";
import { CountUp } from "../motion";
import { useTheme } from "../../theme/ThemeProvider";

export interface DayBar {
  key: string;
  label: string;
  /** Standard drinks logged that day. */
  value: number;
  gameDay: boolean;
  /** The next game day: gets the Game Day callout and the glow. */
  highlight: boolean;
}

interface Props {
  days: DayBar[];
  /** The per-night guide, drawn as a dashed line. */
  guide: number;
  total: number;
  limit: number;
  dryDays: number;
  dryTarget: number;
  onTrack: boolean;
}

const CHART_HEIGHT = 180;
const CALLOUT_HEIGHT = 64;
const VALUE_HEIGHT = 20;
const BAR_WIDTH = 24;

const round = (n: number) => Math.round(n * 10) / 10;

function Chip({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.xs,
        minHeight: 64,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export function WeeklyProgressCard({
  days,
  guide,
  total,
  limit,
  dryDays,
  dryTarget,
  onTrack,
}: Props) {
  const theme = useTheme();
  const scale = Math.max(3, guide, ...days.map((day) => day.value));
  const barMax = CHART_HEIGHT - CALLOUT_HEIGHT - VALUE_HEIGHT;
  const guideBottom = (guide / scale) * barMax;
  const statusColor = onTrack ? theme.colors.success : theme.colors.danger;

  return (
    <View
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1,
          }}
        >
          WEEKLY PROGRESS
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
          Standard drinks per day this week
        </Text>
      </View>

      <View style={{ height: CHART_HEIGHT }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          {days.map((day) => {
            const height = day.value > 0 ? Math.max(4, (day.value / scale) * barMax) : 0;
            return (
              <View
                key={day.key}
                style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
              >
                {day.highlight ? (
                  <View
                    style={{
                      height: CALLOUT_HEIGHT,
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 2,
                    }}
                  >
                    <AiImage
                      prompt="a gold stadium icon, flat line illustration"
                      fit="contain"
                      style={{ width: 30, height: 30 }}
                    />
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.bold,
                        textAlign: "center",
                        lineHeight: 15,
                      }}
                    >
                      {"GAME\nDAY"}
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={{
                    height: VALUE_HEIGHT,
                    color: theme.colors.text,
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {round(day.value)}
                </Text>
                <View
                  style={[
                    {
                      width: BAR_WIDTH,
                      height,
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                    },
                    day.value > 0 ? { backgroundColor: theme.colors.primary } : null,
                    day.highlight
                      ? {
                          shadowColor: theme.colors.primary,
                          shadowOpacity: 0.8,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 0 },
                          elevation: 6,
                        }
                      : null,
                  ]}
                />
              </View>
            );
          })}
        </View>

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
        <Text
          style={{
            position: "absolute",
            right: 0,
            bottom: guideBottom + 4,
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
          }}
        >
          {`Target: ≤ ${guide}`}
        </Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        {days.map((day) => (
          <Text
            key={day.key}
            style={{
              flex: 1,
              textAlign: "center",
              color: day.highlight ? theme.colors.primary : theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontWeight: day.highlight ? theme.font.weight.bold : theme.font.weight.medium,
            }}
          >
            {day.label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Chip label="Weekly Total:">
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <CountUp
              value={total}
              format={(n) => String(round(n))}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {` / ${limit} Max`}
            </Text>
          </View>
        </Chip>

        <Chip label="Dry Days:">
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              fontVariant: ["tabular-nums"],
            }}
          >
            {`${dryDays}`}
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.regular,
              }}
            >
              {` / ${dryTarget} Target`}
            </Text>
          </Text>
        </Chip>

        <Chip label="Match Status:">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: statusColor,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {onTrack ? "On Track" : "Over Limit"}
            </Text>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }}
            />
          </View>
        </Chip>
      </View>
    </View>
  );
}
