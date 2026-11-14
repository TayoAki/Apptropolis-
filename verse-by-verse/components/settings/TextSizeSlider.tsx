import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, useReducedMotion } from "../motion";

export const TEXT_SIZE_LABELS = ["Smallest", "Small", "Medium", "Large", "Largest"] as const;
const STEPS = TEXT_SIZE_LABELS.length;
const THUMB = 28;
const TOUCH = 44;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * A five-step slider for the reading text size: drag it, tap the thumb and drag, or use
 * VoiceOver/TalkBack's increment and decrement. It snaps to each step with a light tap.
 */
export function TextSizeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (index: number) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [track, setTrack] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const trackRef = useRef(0);
  const posRef = useRef(0);
  const startRef = useRef(0);
  const valueRef = useRef(value);
  const changeRef = useRef(onChange);
  valueRef.current = value;
  changeRef.current = onChange;

  /** Position (px along the track) of a step. */
  const at = (index: number) => (trackRef.current * index) / (STEPS - 1);

  // Follow the value from outside (a saved setting, an accessibility action).
  useEffect(() => {
    if (!track) return;
    trackRef.current = track;
    const target = at(value);
    posRef.current = target;
    if (reduced) {
      thumbX.setValue(target);
      return;
    }
    const animation = Animated.spring(thumbX, {
      toValue: target,
      speed: 18,
      bounciness: 6,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, track, reduced, thumbX]);

  const pan = useMemo(() => {
    const snap = (pos: number) => {
      const index = clamp(
        Math.round((pos / (trackRef.current || 1)) * (STEPS - 1)),
        0,
        STEPS - 1,
      );
      const target = at(index);
      posRef.current = target;
      if (reduced) {
        thumbX.setValue(target);
      } else {
        Animated.spring(thumbX, {
          toValue: target,
          speed: 18,
          bounciness: 6,
          useNativeDriver: false,
        }).start();
      }
      if (index !== valueRef.current) {
        haptic("selection");
        changeRef.current(index);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        startRef.current = posRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(startRef.current + g.dx, 0, trackRef.current);
        posRef.current = next;
        thumbX.setValue(next);
      },
      onPanResponderRelease: () => snap(posRef.current),
      onPanResponderTerminate: () => snap(posRef.current),
    });
  }, [thumbX, reduced]);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.caption,
        }}
      >
        A
      </Text>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Text size"
        accessibilityValue={{ text: TEXT_SIZE_LABELS[value] }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const next = clamp(
            value + (event.nativeEvent.actionName === "increment" ? 1 : -1),
            0,
            STEPS - 1,
          );
          if (next !== value) {
            haptic("selection");
            onChange(next);
          }
        }}
        onLayout={(event) => setTrack(Math.max(0, event.nativeEvent.layout.width - THUMB))}
        {...pan.panHandlers}
        style={{ flex: 1, height: TOUCH, justifyContent: "center", minWidth: 110 }}
      >
        {/* The empty part of the track: thin, in textMuted so it can be seen on the card. */}
        <View
          style={{
            position: "absolute",
            left: THUMB / 2,
            right: THUMB / 2,
            top: TOUCH / 2 - 1,
            height: 2,
            borderRadius: 1,
            backgroundColor: theme.colors.textMuted,
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            left: THUMB / 2,
            top: TOUCH / 2 - 2,
            height: 4,
            borderRadius: 2,
            width: thumbX,
            backgroundColor: theme.colors.primary,
          }}
        />
        {track
          ? [1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: THUMB / 2 + at(i) - 1,
                  top: TOUCH / 2 - 5,
                  width: 2,
                  height: 10,
                  borderRadius: 1,
                  backgroundColor: theme.colors.textMuted,
                }}
              />
            ))
          : null}
        <Animated.View
          style={{
            position: "absolute",
            left: thumbX,
            top: (TOUCH - THUMB) / 2,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: theme.colors.primary,
            borderWidth: 3,
            borderColor: theme.colors.surface,
          }}
        />
      </View>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.title,
        }}
      >
        A
      </Text>
    </View>
  );
}
