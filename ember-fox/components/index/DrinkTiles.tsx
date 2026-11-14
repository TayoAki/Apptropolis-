import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Text, View } from "react-native";
import { formatCount, formatDrinks, type DrinkLabel } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Picture } from "../Picture";
import { haptic, PressScale } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Standard drinks logged by one tap on each tile. */
export const TILE_DRINKS = { beer: 1.5, wine: 1.4, shot: 1.0 } as const;
const CUSTOM_SIZES = [0.5, 1, 1.5, 2];
const ICON = 44;
/** The project's drink pictures sit in the middle of a wider dark canvas: crop in to the tile. */
const ZOOM = 1.45;

function Tile({
  title,
  subtitle,
  borderColor,
  icon,
  label,
  expanded,
  onPress,
}: {
  title: string;
  subtitle: string;
  borderColor: string;
  icon: ReactNode;
  label: string;
  expanded?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ width: "48%" }}>
      <PressScale
        onPress={onPress}
        scaleTo={0.96}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={expanded === undefined ? undefined : { expanded }}
        style={{
          minHeight: 72,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: theme.colors.surface,
        }}
      >
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              lineHeight: 20,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            {subtitle}
          </Text>
        </View>
      </PressScale>
    </View>
  );
}

/** The four drink tiles: one tap logs a drink, Custom opens a size picker. */
export function DrinkTiles({ onLog }: { onLog: (label: DrinkLabel, drinks: number) => void }) {
  const theme = useTheme();
  const [customOpen, setCustomOpen] = useState(false);

  const glyph = (prompt: string, icon: IconName) => (
    <Picture prompt={prompt} icon={icon} size={ICON} zoom={ZOOM} />
  );

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: theme.spacing.md,
        }}
      >
        <Tile
          title="Beer, pint"
          subtitle={formatDrinks(TILE_DRINKS.beer)}
          borderColor={theme.colors.primary}
          label={`Log a pint of beer, ${formatDrinks(TILE_DRINKS.beer)}`}
          icon={glyph("Pint of beer icon in amber inside a dark rounded square tile", "beer-outline")}
          onPress={() => onLog("beer", TILE_DRINKS.beer)}
        />
        <Tile
          title="Wine, glass"
          subtitle={formatDrinks(TILE_DRINKS.wine)}
          borderColor={theme.colors.primary}
          label={`Log a glass of wine, ${formatDrinks(TILE_DRINKS.wine)}`}
          icon={glyph("Wine glass icon in red inside a dark rounded square tile", "wine-outline")}
          onPress={() => onLog("wine", TILE_DRINKS.wine)}
        />
        <Tile
          title="Cocktail or shot"
          subtitle={formatDrinks(TILE_DRINKS.shot)}
          borderColor={theme.colors.primary}
          label={`Log a cocktail or shot, ${formatDrinks(TILE_DRINKS.shot)}`}
          icon={glyph(
            "Cocktail glass icon in amber inside a dark rounded square tile",
            "flask-outline",
          )}
          onPress={() => onLog("shot", TILE_DRINKS.shot)}
        />
        <Tile
          title="Custom"
          subtitle="Choose a size"
          borderColor={customOpen ? theme.colors.primary : theme.colors.textMuted}
          label="Log a custom drink"
          expanded={customOpen}
          icon={<Picture icon={customOpen ? "remove" : "add"} size={ICON} muted />}
          onPress={() => {
            haptic("selection");
            setCustomOpen((open) => !open);
          }}
        />
      </View>

      {customOpen ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            Size, in standard drinks
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {CUSTOM_SIZES.map((size) => (
              <View key={size} style={{ flex: 1 }}>
                <PressScale
                  onPress={() => {
                    setCustomOpen(false);
                    onLog("custom", size);
                  }}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={`Log a custom drink, ${formatDrinks(size)}`}
                  style={{
                    minHeight: 44,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: theme.colors.textMuted,
                    backgroundColor: theme.colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatCount(size)}
                  </Text>
                </PressScale>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
        One drink here is one standard drink, about 14 g of alcohol.
      </Text>
    </View>
  );
}
