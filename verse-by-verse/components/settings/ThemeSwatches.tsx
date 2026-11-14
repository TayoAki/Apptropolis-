import { View } from "react-native";
import { themes } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

const SWATCH = 36;

/**
 * The reading themes as round swatches, each showing its own background and accent. The chosen
 * one has a ring in the app's primary color. Each swatch is a 44pt touch target.
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
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
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
            accessibilityState={{ selected: on }}
            style={{
              width: SWATCH,
              height: SWATCH,
              borderRadius: SWATCH / 2,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: on ? 2 : 1,
              borderColor: on ? theme.colors.primary : theme.colors.border,
              backgroundColor: pack.colors.background,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: pack.colors.primary,
              }}
            />
          </PressScale>
        );
      })}
    </View>
  );
}
