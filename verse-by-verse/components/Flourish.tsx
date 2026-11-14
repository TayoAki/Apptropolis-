import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

/**
 * The app's ornament: two rules with a small scroll each side of a dot, drawn in the theme's
 * primary color so it sits on any surface in every theme. Decorative, hidden from screen readers.
 */
export function Flourish({
  width = 200,
  style,
}: {
  /** Drawn width in points; the height follows (a 200 x 24 drawing). */
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const ink = theme.colors.primary;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ alignItems: "center" }, style]}
    >
      <Svg width={width} height={(width * 24) / 200} viewBox="0 0 200 24">
        <Line x1={4} y1={12} x2={60} y2={12} stroke={ink} strokeWidth={1} strokeOpacity={0.5} />
        <Line x1={140} y1={12} x2={196} y2={12} stroke={ink} strokeWidth={1} strokeOpacity={0.5} />
        <Path
          d="M80 12 C74 4 64 6 68 12 C72 18 80 15 81 12"
          fill="none"
          stroke={ink}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M120 12 C126 4 136 6 132 12 C128 18 120 15 119 12"
          fill="none"
          stroke={ink}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Circle cx={100} cy={12} r={3} fill={ink} />
      </Svg>
    </View>
  );
}
