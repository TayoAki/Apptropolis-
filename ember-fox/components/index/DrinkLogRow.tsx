import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { drinkName, formatDrinks, formatTime, type Drink } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic } from "../motion";

/** One drink logged today, with a red trash block attached to its right edge. */
export function DrinkLogRow({ drink, onDelete }: { drink: Drink; onDelete: () => void }) {
  const theme = useTheme();
  const name = drinkName(drink.label);
  const time = formatTime(drink.logged_at);
  const amount = formatDrinks(drink.standard_drinks);

  return (
    <View
      style={{
        flexDirection: "row",
        minHeight: 56,
        overflow: "hidden",
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
          <Text style={{ fontWeight: theme.font.weight.bold }}>{name}</Text>
          {` (${time}) • ${amount}`}
          {drink.edited ? " • edited" : ""}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptic("warning");
          onDelete();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name.toLowerCase()} logged at ${time}`}
        style={({ pressed }) => ({
          width: 56,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor: theme.colors.danger,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        })}
      >
        <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}
