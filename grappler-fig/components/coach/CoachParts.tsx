// Pieces of the Coach screen: the trace drawn over the technique photo, the dot wave while the
// coach writes, and the drill row that springs out of an answer.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View, type ViewStyle } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";
import { tint } from "../ui";

/** A drill the coach wrote for a fix: it runs as a timed round on the Train tab. */
export interface Drill {
  title: string;
  rounds: number;
  roundSeconds: number;
  callouts: string;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Drawn over a technique photo: a trace of the movement that draws itself in, with a label. */
export function TechniqueOverlay({ label }: { label: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const draw = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    const animation = Animated.timing(draw, {
      toValue: 1,
      duration: 900,
      delay: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, draw]);
  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [160, 0] });
  const fill: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
  return (
    <View pointerEvents="none" style={fill}>
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <AnimatedPath
          d="M 232 150 Q 214 86 150 62"
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={[160, 160]}
          strokeDashoffset={dashOffset}
        />
        <Polyline
          points="136,70 150,62 146,78"
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d="M 170 28 Q 150 96 128 176"
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={2}
          strokeDasharray={[6, 6]}
          opacity={0.7}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          right: theme.spacing.md,
          bottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 2,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text
          style={{
            color: theme.colors.onPrimary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Three-plus dots that rise in a wave while the coach is writing. Still when Reduce Motion is on. */
export function WaveDots({ count = 5, size = 8 }: { count?: number; size?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const waves = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduced) return;
    const loops = waves.map((wave, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(wave, {
            toValue: 1,
            duration: 360,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wave, {
            toValue: 0,
            duration: 360,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay((count - 1 - i) * 90),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, count, waves]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Coach is writing"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        height: 24,
      }}
    >
      {waves.map((wave, i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primary,
            opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              { translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** The coach's drill for a fix: springs out of the answer, and runs as a round when tapped. */
export function DrillTile({ drill, onRun }: { drill: Drill; onRun: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const spring = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.spring(spring, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 12,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, spring]);
  const scale = spring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const lift = spring.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const fade = spring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  const detail = [
    `${drill.rounds} ${drill.rounds === 1 ? "round" : "rounds"}`,
    drill.roundSeconds % 60 === 0 ? `${drill.roundSeconds / 60} min` : `${drill.roundSeconds} sec`,
    drill.callouts,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: lift }, { scale }] }}>
      <PressScale
        onPress={onRun}
        haptic="medium"
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={`Run drill: ${drill.title}. ${detail}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          minHeight: 64,
          padding: theme.spacing.md,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          backgroundColor: tint(theme.colors.primary, "1F"),
        }}
      >
        <Ionicons name="flash" size={22} color={theme.colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {drill.title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              lineHeight: 20,
              fontVariant: ["tabular-nums"],
            }}
          >
            {detail}
          </Text>
        </View>
        <Ionicons name="play-circle" size={28} color={theme.colors.primary} />
      </PressScale>
    </Animated.View>
  );
}
