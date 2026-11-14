import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { CountUp, useReducedMotion } from "../motion";
import { Panel } from "../Panel";

/** A pill-shaped track whose amber gradient fill grows to `progress` (0 to 1). */
function GradientBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));
  const fill = useRef(new Animated.Value(reduced ? target : 0)).current;

  useEffect(() => {
    if (reduced) {
      fill.setValue(target);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: target,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [target, reduced, fill]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View
      style={{
        height: 10,
        borderRadius: 5,
        overflow: "hidden",
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Animated.View style={{ width, height: "100%", borderRadius: 5, overflow: "hidden" }}>
        <LinearGradient
          colors={[theme.colors.warning, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
      </Animated.View>
    </View>
  );
}

/** The week's drinks against its limit: the count, a gradient bar and the days left. */
export function WeekProgress({
  total,
  limit,
  daysLeft,
}: {
  total: number;
  limit: number;
  daysLeft: number;
}) {
  const theme = useTheme();
  const remaining = Math.max(0, limit - total);
  const progress = limit > 0 ? Math.min(1, total / limit) : 0;
  return (
    <Panel>
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
        <CountUp
          value={total}
          format={(n) => n.toFixed(1)}
          style={{ color: theme.colors.primary, fontWeight: theme.font.weight.bold }}
        />
        {` of ${limit.toFixed(1)} drinks logged • ${remaining.toFixed(1)} remaining`}
      </Text>
      <GradientBar progress={progress} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          textAlign: "center",
        }}
      >
        {`${daysLeft}-day buffer until the week resets`}
      </Text>
    </Panel>
  );
}
