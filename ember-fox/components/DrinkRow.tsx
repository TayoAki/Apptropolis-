import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View, type ViewStyle } from "react-native";
import {
  drinkName,
  formatDrinks,
  formatTime,
  type Drink,
  type DrinkLabel,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<DrinkLabel, IconName> = {
  beer: "beer-outline",
  wine: "wine-outline",
  shot: "flask-outline",
  custom: "ellipsis-horizontal",
};

/** One logged drink: its type, time and size. Pass onPress to edit it. */
export function DrinkRow({ drink, onPress }: { drink: Drink; onPress?: () => void }) {
  const theme = useTheme();
  const name = drinkName(drink.label);
  const time = formatTime(drink.logged_at);
  const amount = formatDrinks(drink.standard_drinks);

  const content = (
    <>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Ionicons name={ICONS[drink.label]} size={20} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {name}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          {drink.edited ? `${time} · edited` : time}
        </Text>
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontVariant: ["tabular-nums"],
        }}
      >
        {amount}
      </Text>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  const row: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    minHeight: 56,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  };

  if (!onPress) return <View style={row}>{content}</View>;

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${name} at ${time}, ${amount}. Edit`}
      style={row}
    >
      {content}
    </PressScale>
  );
}
