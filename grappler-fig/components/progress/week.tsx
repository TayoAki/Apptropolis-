// The week's training: a mark per day (a ring for a day trained, an empty square for a rest
// day), the rounds total, and a bar per day scaled to the busiest day.
import { Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { Appear, CountUp } from "../motion";
import { displayFont } from "./panel";

export interface WeekDay {
  key: string;
  label: string;
  rounds: number;
}

const BAR_MAX = 64;

function DayMark({ label, trained }: { label: string; trained: boolean }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${trained ? "trained" : "rest day"}`}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20">
        {trained ? (
          <Circle
            cx={10}
            cy={10}
            r={7}
            fill={theme.colors.background}
            stroke={theme.colors.primary}
            strokeWidth={3}
          />
        ) : (
          <Rect
            x={2}
            y={2}
            width={16}
            height={16}
            rx={3}
            fill="none"
            stroke={theme.colors.border}
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
}

export function WeeklyTraining({ days }: { days: WeekDay[] }) {
  const theme = useTheme();
  const total = days.reduce((sum, day) => sum + day.rounds, 0);
  const peak = Math.max(1, ...days.map((day) => day.rounds));

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md }}>
      <View style={{ flex: 1, gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1,
          }}
        >
          WEEKLY TRAINING
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {days.map((day, index) => (
            <Appear key={day.key} delay={index * 40}>
              <DayMark label={day.label} trained={day.rounds > 0} />
            </Appear>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
          <CountUp
            value={total}
            style={{
              color: theme.colors.text,
              fontFamily: displayFont,
              fontSize: theme.font.size.headline,
            }}
          />
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: displayFont,
              fontSize: theme.font.size.body,
            }}
          >
            ROUNDS
          </Text>
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: displayFont,
              fontSize: theme.font.size.body,
            }}
          >
            COMPLETED
          </Text>
        </View>
      </View>

      <View
        accessibilityRole="image"
        accessibilityLabel={`${total} rounds in the last seven days`}
        style={{ height: BAR_MAX, flexDirection: "row", alignItems: "flex-end", gap: 5 }}
      >
        {days.map((day, index) => (
          <Appear key={day.key} delay={index * 50}>
            <View
              style={{
                width: 9,
                height: Math.max(4, Math.round((day.rounds / peak) * BAR_MAX)),
                borderRadius: 2,
                backgroundColor: day.rounds > 0 ? theme.colors.primary : theme.colors.border,
              }}
            />
          </Appear>
        ))}
      </View>
    </View>
  );
}
