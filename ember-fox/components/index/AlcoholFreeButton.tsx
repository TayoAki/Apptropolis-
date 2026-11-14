import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

/**
 * Marks today alcohol-free, and takes the mark back. Once a drink is logged today the day can't
 * be marked, so the button is not shown; removing the drink brings it back.
 */
export function AlcoholFreeButton({
  marked,
  drinksToday,
  onChange,
}: {
  marked: boolean;
  /** Standard drinks logged today. */
  drinksToday: number;
  onChange: (next: boolean) => void;
}) {
  const theme = useTheme();
  // A day with a drink on it isn't alcohol-free: the option is simply not offered.
  if (drinksToday > 0 && !marked) return null;
  return (
    <PressScale
      onPress={() => onChange(!marked)}
      haptic="light"
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={marked ? "Today is marked alcohol-free. Undo" : "Mark today alcohol-free"}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: theme.colors.success,
        backgroundColor: marked ? theme.colors.success + "1F" : theme.colors.background,
      }}
    >
      <Ionicons
        name={marked ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={theme.colors.success}
      />
      <Text
        style={{
          color: theme.colors.success,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {marked ? "Today is alcohol-free" : "Mark today alcohol-free"}
      </Text>
      {marked ? (
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            textDecorationLine: "underline",
          }}
        >
          Undo
        </Text>
      ) : null}
    </PressScale>
  );
}
