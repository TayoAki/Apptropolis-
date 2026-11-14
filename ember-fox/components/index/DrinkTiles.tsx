import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import type { DrinkLabel } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { haptic, PressScale } from "../motion";

/** Standard drinks logged by one tap on each tile (a unit is one standard drink). */
export const TILE_UNITS = { beer: 1.5, wine: 1.4, shot: 1.0 } as const;
const CUSTOM_SIZES = [0.5, 1, 1.5, 2];
const ICON = 44;

function Tile({
  title,
  subtitle,
  borderColor,
  icon,
  label,
  onPress,
}: {
  title: string;
  subtitle: string;
  borderColor: string;
  icon: ReactNode;
  label: string;
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
        style={{
          minHeight: 72,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: theme.colors.surface,
        }}
      >
        {icon}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              color: theme.colors.text,
              fontSize: 15,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
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

function PlusSquare() {
  const theme = useTheme();
  return (
    <View
      style={{
        width: ICON,
        height: ICON,
        borderRadius: theme.radius.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Ionicons name="add" size={24} color={theme.colors.text} />
    </View>
  );
}

/** The four drink tiles: one tap logs a drink, Custom opens a size picker. */
export function DrinkTiles({ onLog }: { onLog: (label: DrinkLabel, units: number) => void }) {
  const theme = useTheme();
  const [customOpen, setCustomOpen] = useState(false);

  const glyph = (prompt: string) => (
    <AiImage
      prompt={prompt}
      style={{ width: ICON, height: ICON, borderRadius: theme.radius.md }}
    />
  );

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: theme.spacing.md,
      }}
    >
      <Tile
        title="Pint / Beer"
        subtitle={`${TILE_UNITS.beer.toFixed(1)} units`}
        borderColor={theme.colors.primary}
        label={`Log a pint of beer, ${TILE_UNITS.beer} units`}
        icon={glyph("Pint of beer icon in amber inside a dark rounded square tile")}
        onPress={() => onLog("beer", TILE_UNITS.beer)}
      />
      <Tile
        title="Wine Glass"
        subtitle={`${TILE_UNITS.wine.toFixed(1)} units`}
        borderColor={theme.colors.accent}
        label={`Log a glass of wine, ${TILE_UNITS.wine} units`}
        icon={glyph("Wine glass icon in red inside a dark rounded square tile")}
        onPress={() => onLog("wine", TILE_UNITS.wine)}
      />
      <Tile
        title="Cocktail / Shot"
        subtitle={`${TILE_UNITS.shot.toFixed(1)} units`}
        borderColor={theme.colors.primary}
        label={`Log a cocktail or shot, ${TILE_UNITS.shot} units`}
        icon={glyph("Cocktail glass icon in amber inside a dark rounded square tile")}
        onPress={() => onLog("shot", TILE_UNITS.shot)}
      />
      <Tile
        title="Custom"
        subtitle={customOpen ? "Pick a size" : "Choose a size"}
        borderColor={customOpen ? theme.colors.primary : theme.colors.border}
        label={customOpen ? "Hide custom sizes" : "Log a custom drink"}
        icon={<PlusSquare />}
        onPress={() => {
          haptic("selection");
          setCustomOpen((open) => !open);
        }}
      />

      {customOpen ? (
        <View style={{ width: "100%", gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
            }}
          >
            Size in units
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {CUSTOM_SIZES.map((size) => (
              <PressScale
                key={size}
                onPress={() => {
                  setCustomOpen(false);
                  onLog("custom", size);
                }}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={`Log a custom drink, ${size} units`}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                  {size.toFixed(1)}
                </Text>
              </PressScale>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
