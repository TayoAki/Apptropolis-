import { useEffect, useRef } from "react";
import { Animated, Easing, Text, type ViewStyle } from "react-native";
import { formatReference, type Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";

const FILL: ViewStyle = { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 };

/**
 * One verse in the chapter. The target verse glows in with a short amber underline; a tapped
 * verse flashes once (`picked`) before the reader returns to the feed.
 */
export function VerseLine({
  verse,
  isTarget,
  picked,
  onPress,
}: {
  verse: Verse;
  isTarget: boolean;
  picked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const glow = useRef(new Animated.Value(0)).current;
  const underline = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTarget) return;
    if (reduced) {
      glow.setValue(1);
      underline.setValue(1);
      return;
    }
    const run = Animated.parallel([
      Animated.timing(glow, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.timing(underline, {
        toValue: 1,
        duration: 700,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    run.start();
    return () => run.stop();
  }, [isTarget, reduced, glow, underline]);

  useEffect(() => {
    if (!picked || reduced) return;
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.35, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [picked, reduced, flash]);

  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${formatReference(verse)}. ${verse.text}`}
      accessibilityHint="Opens this verse in the feed"
      accessibilityState={{ selected: isTarget }}
      style={{
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderLeftWidth: isTarget ? 3 : 0,
        borderLeftColor: theme.colors.primary,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: theme.colors.surface, opacity: glow }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: theme.colors.accent, opacity: flashOpacity }]}
      />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.title,
          lineHeight: theme.font.size.title * 1.5,
        }}
      >
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {verse.verse}
        </Text>
        {"\u2002"}
        {verse.text}
      </Text>
      {isTarget ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            alignSelf: "flex-start",
            width: 56,
            height: 3,
            marginTop: theme.spacing.sm,
            borderRadius: 2,
            backgroundColor: theme.colors.accent,
            transform: [{ scaleX: underline }],
          }}
        />
      ) : null}
    </PressScale>
  );
}
