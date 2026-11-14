import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import {
  drinkName,
  formatDrinks,
  formatTime,
  type Drink,
  type DrinkLabel,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<DrinkLabel, IconName> = {
  beer: "beer-outline",
  wine: "wine-outline",
  shot: "flask-outline",
  custom: "ellipsis-horizontal",
};

/** One drink logged today: its type, time and size, with a delete button on the right. */
export function DrinkLogRow({ drink, onDelete }: { drink: Drink; onDelete: () => void }) {
  const theme = useTheme();
  const name = drinkName(drink.label);
  const time = formatTime(drink.logged_at);
  const amount = formatDrinks(drink.standard_drinks);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 60,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.xs,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Ionicons name={ICONS[drink.label]} size={20} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2, paddingVertical: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`${time} · ${amount}`}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptic("warning");
          onDelete();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name.toLowerCase()} logged at ${time}`}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        })}
      >
        <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}
