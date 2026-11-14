import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { comingDayName, type Outlook } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { CountUp, Mascot, useReducedMotion } from "../motion";

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

/** The mascot pose that fits each form tier. */
export const FORM_POSE: Record<Outlook["tier"], string> = {
  sharp: "dash-game-day-sharp",
  steady: "dash-match-ready",
  flat: "dash-heavy-legs",
};

const LEGS: Record<Outlook["tier"], string> = {
  sharp: "Fresh legs",
  steady: "Solid legs",
  flat: "Heavy legs",
};

/**
 * The hero's headline: how the legs feel and what for. It names the next game or training day
 * when Settings has one ("Solid legs for Saturday"), and the sport's noun otherwise.
 */
export function formHeadline(
  tier: Outlook["tier"],
  game: { nextGame: string | null; today: string; noun: string; now: Date },
): string {
  if (!game.nextGame) return `${LEGS[tier]} for your next ${game.noun}`;
  if (game.nextGame === game.today) return `${LEGS[tier]} for today's ${game.noun}`;
  return `${LEGS[tier]} for ${comingDayName(game.nextGame, game.now)}`;
}

/**
 * The Form Rating hero: the arc gauge and score beside the mascot, then the headline and the
 * outlook line (what the score means and what would raise it) across the card.
 */
export function FormHero({
  form,
  outlook,
  pose,
  headline,
}: {
  form: number;
  outlook: Outlook;
  /** A mascot pose name from data/images.ts. */
  pose: string;
  headline: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Form rating ${form} out of 100. ${headline}. ${outlook.line}`}
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
        <Mascot pose={pose} size={116} />
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
          {outlook.line}
        </Text>
      </View>
    </View>
  );
}
