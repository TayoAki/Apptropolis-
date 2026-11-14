// The last seven days of training as a bar per day: rounds on top of each bar, the weekday
// beneath it, today's day in bold. Days without training show the baseline only.
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { displayFace } from "../ui";

export interface WeekDay {
  key: string;
  label: string;
  rounds: number;
}

const BAR_MAX = 72;
const BAR_WIDTH = 20;

export function WeeklyTraining({ days }: { days: WeekDay[] }) {
  const theme = useTheme();
  const total = days.reduce((sum, day) => sum + day.rounds, 0);
  const peak = Math.max(1, ...days.map((day) => day.rounds));
  const trained = days.filter((day) => day.rounds > 0).length;
  const spoken = days.map((day) => `${day.label} ${day.rounds}`).join(", ");

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.sm }}>
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Last 7 days
        </Text>
        <Text
          style={[
            displayFace,
            {
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontVariant: ["tabular-nums"],
            },
          ]}
        >
          {total}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
          {total === 1 ? "round" : "rounds"}
        </Text>
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rounds per day over the last seven days: ${spoken}. ${trained} of 7 days trained.`}
        style={{ flexDirection: "row" }}
      >
        {days.map((day, index) => {
          const today = index === days.length - 1;
          const height = day.rounds > 0 ? Math.max(6, Math.round((day.rounds / peak) * BAR_MAX)) : 0;
          return (
            <View key={day.key} style={{ flex: 1, alignItems: "center", gap: theme.spacing.xs }}>
              <View
                style={{
                  alignSelf: "stretch",
                  height: BAR_MAX + 20,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.textMuted,
                }}
              >
                {day.rounds > 0 ? (
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.bold,
                      fontVariant: ["tabular-nums"],
                      marginBottom: 2,
                    }}
                  >
                    {day.rounds}
                  </Text>
                ) : null}
                <View
                  style={{
                    width: BAR_WIDTH,
                    height,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              </View>
              <Text
                style={{
                  color: today ? theme.colors.text : theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: today ? theme.font.weight.bold : theme.font.weight.regular,
                }}
              >
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
