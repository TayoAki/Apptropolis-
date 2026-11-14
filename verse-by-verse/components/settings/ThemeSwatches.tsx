import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { themes } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

const SWATCH = 36;

/**
 * The reading themes as round swatches, each showing its own background and primary color. The
 * theme on screen has a ring in the app's primary color and a check mark; the others show a dot.
 * Each swatch is a 44pt touch target.
 */
export function ThemeSwatches({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme"
      // Spread across the space the row gives it, up to an 8pt gap, so the five swatches
      // close up instead of overflowing the card on a narrow phone.
      style={{
        flex: 1,
        maxWidth: themes.length * SWATCH + (themes.length - 1) * theme.spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
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
            style={{
              width: SWATCH,
              height: SWATCH,
              borderRadius: SWATCH / 2,
              alignItems: "center",
              justifyContent: "center",
              // textMuted, not the hairline border: a swatch close to the card's own color
              // would otherwise have no visible edge.
              borderWidth: on ? 2 : 1,
              borderColor: on ? theme.colors.primary : theme.colors.textMuted,
              backgroundColor: pack.colors.background,
            }}
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
