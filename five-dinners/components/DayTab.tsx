import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/**
 * The day label down the left edge of a dinner card (Mon to Fri), upright so it stays readable
 * at any text size. A cooked dinner adds a tick under the day, so the state is never color alone.
 */
export function DayTab({
  day,
  cooked,
  width = 48,
  top,
}: {
  day: string;
  cooked?: boolean;
  width?: number;
  /** Pin the label this far from the top (for tall cards) instead of centering it. */
  top?: number;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={cooked ? `${day}, cooked` : day}
      style={{
        width,
        alignItems: "center",
        justifyContent: top === undefined ? "center" : "flex-start",
        gap: theme.spacing.xs,
        paddingTop: top ?? theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.caption + 1,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {day}
      </Text>
      {cooked ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
      ) : null}
    </View>
  );
}
