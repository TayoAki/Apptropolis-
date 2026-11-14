// The shared score as one gradient ring: a track, the arc, and the percentage in the middle. The
// arc draws in on load and glides when the score changes. Every color comes from the theme (the
// gradient runs from the primary color to the accent).
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { CountUp, useReducedMotion } from "../motion";

const SIZE = 124;
const CENTER = SIZE / 2;
const RADIUS = 56;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GRADIENT_ID = "weekRingGradient";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The shared score for the week as a gradient ring (percent is 0 to 100). */
export function WeekRing({ percent, label = "Shared score for this week" }: { percent: number; label?: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(100, percent)) / 100;

  useEffect(() => {
    if (reduced) {
      fill.setValue(target);
      return;
    }
    const run = Animated.timing(fill, {
      toValue: target,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [target, reduced, fill]);

  const offset = fill.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] });
  const score = Math.round(percent);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: score }}
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.primary} />
            <Stop offset="1" stopColor={theme.colors.accent} />
          </LinearGradient>
        </Defs>
        <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={theme.colors.surfaceAlt}
            strokeWidth={STROKE}
          />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={`url(#${GRADIENT_ID})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
            strokeDashoffset={offset}
          />
        </G>
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CountUp
          value={score}
          format={(n) => `${Math.round(n)}%`}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        />
      </View>
    </View>
  );
}
