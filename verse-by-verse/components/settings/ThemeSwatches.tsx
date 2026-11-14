import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { themes } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { phoneThemes } from "../reading";

const SWATCH = 36;

/** What `selected` is when no theme is pinned and the app follows the phone. */
export const AUTOMATIC = "automatic";

/**
 * The reading themes as round swatches. The first is Automatic (half light, half dark): the
 * app's own light and dark themes, following the phone. The rest each pin one theme and show
 * its background and primary color. The chosen one has a ring in the app's primary color and a
 * check mark. Each swatch is a 44pt touch target.
 */
export function ThemeSwatches({
  selected,
  onSelect,
}: {
  /** A theme id, or AUTOMATIC. */
  selected: string;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  const pair = phoneThemes();
  const count = themes.length + (pair ? 1 : 0);
  const ring = (on: boolean) => ({
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // textMuted, not the hairline border: a swatch close to the card's own color would
    // otherwise have no visible edge.
    borderWidth: on ? 2 : 1,
    borderColor: on ? theme.colors.primary : theme.colors.textMuted,
  });
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme"
      // Spread across the row up to a 12pt gap, so the swatches close up instead of
      // overflowing the card on a narrow phone.
      style={{
        maxWidth: count * SWATCH + (count - 1) * theme.spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {pair ? (
        <PressScale
          onPress={() => onSelect(AUTOMATIC)}
          scaleTo={0.9}
          hitSlop={4}
          accessibilityRole="radio"
          accessibilityLabel={`Automatic: ${pair.light.name} in light mode, ${pair.dark.name} in dark mode`}
          accessibilityState={{ selected: selected === AUTOMATIC, checked: selected === AUTOMATIC }}
          style={{ ...ring(selected === AUTOMATIC), overflow: "hidden", flexDirection: "row" }}
        >
          <View style={{ flex: 1, alignSelf: "stretch", backgroundColor: pair.light.colors.background }} />
          <View style={{ flex: 1, alignSelf: "stretch", backgroundColor: pair.dark.colors.background }} />
          {selected === AUTOMATIC ? (
            <View
              style={{
                position: "absolute",
                width: 20,
                height: 20,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primary,
              }}
            >
              <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
            </View>
          ) : null}
        </PressScale>
      ) : null}
      {themes.map((pack) => {
        const on = pack.id === selected;
        return (
          <PressScale
            key={pack.id}
            onPress={() => onSelect(pack.id)}
            scaleTo={0.9}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityLabel={`${pack.name} theme`}
            accessibilityState={{ selected: on, checked: on }}
            style={{ ...ring(on), backgroundColor: pack.colors.background }}
          >
            {on ? (
              <Ionicons name="checkmark" size={18} color={pack.colors.primary} />
            ) : (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: pack.colors.primary,
                }}
              />
            )}
          </PressScale>
        );
      })}
    </View>
  );
}
