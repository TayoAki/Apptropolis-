import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { Outlook } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Dash } from "../Dash";
import { CountUp, useReducedMotion } from "../motion";

/** A half circle (radius 86) across the top of a 200 x 112 canvas. */
const ARC = "M 14 100 A 86 86 0 0 1 186 100";
const ARC_LENGTH = Math.PI * 86;
const GAUGE_W = 192;
const GAUGE_H = (GAUGE_W * 112) / 200;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The arc gauge: a track, then the score drawn in over it from primary to accent. */
function Gauge({ score }: { score: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fraction = Math.max(0, Math.min(1, score / 100));
  const offset = useRef(new Animated.Value(ARC_LENGTH)).current;

  useEffect(() => {
    const target = ARC_LENGTH * (1 - fraction);
    if (reduced) {
      offset.setValue(target);
      return;
    }
    const animation = Animated.timing(offset, {
      toValue: target,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fraction, reduced, offset]);

  return (
    <Svg width={GAUGE_W} height={GAUGE_H} viewBox="0 0 200 112">
      <Defs>
        <LinearGradient id="formGauge" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={theme.colors.primary} />
          <Stop offset="1" stopColor={theme.colors.accent} />
        </LinearGradient>
      </Defs>
      <Path
        d={ARC}
        fill="none"
        stroke={theme.colors.surfaceAlt}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <AnimatedPath
        d={ARC}
        fill="none"
        stroke="url(#formGauge)"
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/**
 * The Form Rating hero: the arc gauge and score beside the mascot, then the headline and the
 * line under it. The words come from formMessage (data/schema), which decides what the rating
 * may say when drinks are logged or the week is over its limit.
 */
export function FormHero({
  form,
  headline,
  line,
  pose,
}: {
  form: number;
  headline: string;
  line: string;
  /** The tier whose mascot pose to show. */
  pose: Outlook["tier"];
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Form rating ${form} out of 100. ${headline}. ${line}`}
      style={{
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ width: GAUGE_W, height: GAUGE_H }}>
            <Gauge score={form} />
            <View
              style={{
                position: "absolute",
                top: 34,
                left: 0,
                right: 0,
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                Form rating
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "center",
                }}
              >
                <CountUp
                  value={form}
                  duration={1000}
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.display,
                    lineHeight: 60,
                    fontWeight: theme.font.weight.bold,
                  }}
                />
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.title,
                    marginLeft: theme.spacing.xs,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  / 100
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Dash pose={pose} size={116} />
      </View>
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {headline}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
          {line}
        </Text>
      </View>
    </View>
  );
}
