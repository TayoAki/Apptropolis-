import { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic } from "../motion";

const KNOB = 56;
const PAD = 4;
const TRACK = KNOB + PAD * 2;
/** How far along the track the knob must be released to commit. */
const COMMIT_AT = 0.85;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * A slider that confirms something important. Drag the knob to the end (or use increase) to
 * commit. Landing snaps the knob to the end with a check and a firm tap; letting go early
 * springs it back to the start.
 */
export function SlideToPay({
  label,
  onComplete,
  disabled = false,
  done = false,
}: {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  /** The action is underway: the knob stays at the end and shows a check. */
  done?: boolean;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - TRACK);

  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const fired = useRef(false);
  const travelRef = useRef(0);
  const blockedRef = useRef(disabled || done);
  const completeRef = useRef(onComplete);
  travelRef.current = travel;
  blockedRef.current = disabled || done;
  completeRef.current = onComplete;

  const controls = useMemo(() => {
    const commit = () => {
      if (blockedRef.current || fired.current) return;
      fired.current = true;
      haptic("medium");
      Animated.timing(x, {
        toValue: travelRef.current,
        duration: 140,
        useNativeDriver: false,
      }).start(() => completeRef.current());
    };

    const release = (value: number) => {
      if (travelRef.current > 0 && value >= travelRef.current * COMMIT_AT) {
        commit();
      } else {
        Animated.spring(x, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 6,
          speed: 18,
        }).start();
      }
    };

    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => !blockedRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !blockedRef.current && Math.abs(g.dx) > 2 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        x.stopAnimation((value) => {
          start.current = value;
        });
        haptic("selection");
      },
      onPanResponderMove: (_, g) =>
        x.setValue(clamp(start.current + g.dx, 0, travelRef.current)),
      onPanResponderRelease: (_, g) =>
        release(clamp(start.current + g.dx, 0, travelRef.current)),
      onPanResponderTerminate: (_, g) =>
        release(clamp(start.current + g.dx, 0, travelRef.current)),
    });

    return { pan, commit };
  }, [x]);

  const fillWidth = x.interpolate({
    inputRange: [0, Math.max(travel, 1)],
    outputRange: [TRACK, Math.max(width, TRACK)],
    extrapolate: "clamp",
  });
  const hintOpacity = x.interpolate({
    inputRange: [0, Math.max(travel, 1)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height: TRACK,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        justifyContent: "center",
        overflow: "hidden",
        opacity: disabled && !done ? 0.5 : 1,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: fillWidth,
          backgroundColor: theme.colors.primary,
          opacity: 0.22,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.Text
          style={{
            opacity: hintOpacity,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
            paddingLeft: TRACK - PAD,
          }}
        >
          {done ? "Placing your order" : label}
        </Animated.Text>
      </View>
      <Animated.View
        {...controls.pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="Slide to the end to confirm, or use increase"
        accessibilityValue={{ text: done ? "Placing" : "Not placed yet" }}
        accessibilityState={{ disabled: disabled || done }}
        accessibilityActions={[{ name: "increment", label: "Confirm" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") controls.commit();
        }}
        style={{
          position: "absolute",
          left: PAD,
          top: PAD,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX: x }],
        }}
      >
        <Ionicons
          name={done ? "checkmark" : "chevron-forward"}
          size={26}
          color={theme.colors.onPrimary}
        />
      </Animated.View>
    </View>
  );
}

// Keep Text imported for consumers that compose this file's styles; the label above is animated.
export const SlideToPayHint = ({ children }: { children: string }) => {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, textAlign: "center" }}>
      {children}
    </Text>
  );
};
