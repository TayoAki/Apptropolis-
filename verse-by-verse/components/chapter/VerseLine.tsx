import { useEffect, useRef } from "react";
import { Animated, Easing, Text, type ViewStyle } from "react-native";
import { formatReference, type Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";
import { useReadingType } from "../reading";

const FILL: ViewStyle = { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 };

/**
 * One verse in the chapter. The verse the reader came from sits on a tinted panel with a short
 * underline that draws in; a tapped verse flashes once (`picked`) before the reader returns to
 * the Read tab.
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
  const type = useReadingType();
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
    if (!picked) return;
    if (reduced) {
      flash.setValue(1);
      return;
    }
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.35, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [picked, reduced, flash]);

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${formatReference(verse)}. ${verse.text}`}
      accessibilityHint="Reads from this verse"
      accessibilityState={{ selected: isTarget }}
      style={{
        borderRadius: theme.radius.md,
        overflow: "hidden",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: theme.colors.surface, opacity: glow }]}
      />
      {/* A tint, not the solid accent, so the verse stays readable while it flashes. */}
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: theme.colors.accent + "38", opacity: flash }]}
      />
      <Text style={{ ...type.verse(theme.font.size.title), color: theme.colors.text }}>
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {verse.verse}
        </Text>
        {" "}
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
