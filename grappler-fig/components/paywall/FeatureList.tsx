// What premium unlocks: one metal panel of uppercase lines, each with a red mark. The first two
// tick in as checks, the rest carry crosshairs.
import { Animated, Easing, View, Text } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useEffect, useRef } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { useReducedMotion } from "../motion";
import { MetalPanel } from "./Frame";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_PATH = "M4 12.5 L9.5 18 L20 6.5";
const CHECK_LENGTH = 24;

/** A checkmark that draws itself in, stroke by stroke. */
function DrawnCheck({ delay }: { delay: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const draw = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      draw.setValue(1);
      return;
    }
    const animation = Animated.timing(draw, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, delay, draw]);
  const offset = draw.interpolate({ inputRange: [0, 1], outputRange: [CHECK_LENGTH, 0] });
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK_PATH}
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/** A crosshair bullet: a ring, a centre dot and four ticks. */
function Crosshair() {
  const theme = useTheme();
  const c = theme.colors.primary;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={7} fill="none" stroke={c} strokeWidth={2} />
      <Circle cx={12} cy={12} r={2} fill={c} />
      <Line x1={12} y1={1} x2={12} y2={5} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Line x1={12} y1={19} x2={12} y2={23} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Line x1={1} y1={12} x2={5} y2={12} stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Line x1={19} y1={12} x2={23} y2={12} stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  const theme = useTheme();
  return (
    <MetalPanel style={{ gap: theme.spacing.lg }}>
      {items.map((item, index) => (
        <View
          key={item}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
        >
          <View style={{ width: 24, height: 24, marginTop: 1 }}>
            {index < 2 ? (
              <DrawnCheck delay={200 + index * 160} />
            ) : (
              <Crosshair />
            )}
          </View>
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              lineHeight: 22,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </MetalPanel>
  );
}
