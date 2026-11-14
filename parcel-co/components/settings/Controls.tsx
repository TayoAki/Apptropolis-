// Building blocks for Settings: a grouped card, rows, a segmented control, a radio and a drag wheel.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, PressScale } from "../motion";

/** A grouped card for a settings section: one surface with a hairline edge. Holds rows. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A row inside a card: an optional leading element, a label and detail, a right-hand value and
 * a chevron when it opens something. `children` sit below the row, full width.
 */
export function Row({
  label,
  detail,
  leading,
  right,
  onPress,
  danger = false,
  disabled = false,
  selected,
  last = false,
  chevron = true,
  children,
  accessibilityLabel,
}: {
  label: string;
  detail?: string;
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  selected?: boolean;
  last?: boolean;
  chevron?: boolean;
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const container: ViewStyle = {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: theme.colors.border,
    opacity: disabled ? 0.6 : 1,
  };
  const content = (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          minHeight: 44,
        }}
      >
        {leading}
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: danger ? theme.colors.danger : theme.colors.text,
              fontSize: theme.font.size.body,
              lineHeight: 21,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {label}
          </Text>
          {detail ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                lineHeight: 17,
              }}
            >
              {detail}
            </Text>
          ) : null}
        </View>
        {right}
        {onPress && chevron ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        ) : null}
      </View>
      {children ? <View style={{ marginTop: theme.spacing.sm }}>{children}</View> : null}
    </>
  );
  if (!onPress) return <View style={container}>{content}</View>;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      style={container}
    >
      {content}
    </PressScale>
  );
}

const PAD = 3;

/** Two or three choices in a pill; the brand-colored indicator slides to the chosen one. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  /** Smaller text and height, for a segmented control inside a row. */
  compact?: boolean;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const count = options.length;
  const index = Math.max(0, options.findIndex((option) => option.key === value));
  const segment = Math.max(0, (width - PAD * 2) / count);
  const slide = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    const spring = Animated.spring(slide, {
      toValue: index,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    });
    spring.start();
    return () => spring.stop();
  }, [index, slide]);

  const translateX = slide.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * segment),
  });

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        padding: PAD,
        backgroundColor: theme.colors.surface,
      }}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: PAD,
            bottom: PAD,
            left: PAD,
            width: segment,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            transform: [{ translateX }],
          }}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected }}
            hitSlop={4}
            onPress={() => {
              if (selected) return;
              haptic("selection");
              onChange(option.key);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: compact ? 40 : 44,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: theme.spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{
                color: selected ? theme.colors.onPrimary : theme.colors.text,
                fontSize: compact ? theme.font.size.caption + 1 : theme.font.size.body,
                fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A radio dot that springs open when its choice is selected. */
export function Radio({ selected }: { selected: boolean }) {
  const theme = useTheme();
  const dot = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(dot, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [selected, dot]);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.textMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: theme.colors.primary,
          transform: [{ scale: dot }],
        }}
      />
    </View>
  );
}

export const WHEEL_ROW = 40;

/**
 * A drag wheel for one column of a time. Drags snap to the nearest item and tick once per item;
 * it also adjusts by swipe up and down for VoiceOver and TalkBack.
 */
export function Wheel({
  items,
  index,
  onChange,
  label,
  width = 80,
}: {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  label: string;
  width?: number;
}) {
  const theme = useTheme();
  const offsetOf = (i: number) => -i * WHEEL_ROW;

  const offset = useRef(new Animated.Value(offsetOf(index))).current;
  const position = useRef(offsetOf(index));
  const grabbedAt = useRef(0);
  const dragging = useRef(false);
  const ticked = useRef(index);
  const latest = useRef({ index, last: items.length - 1, onChange });
  latest.current = { index, last: items.length - 1, onChange };

  const indexAt = (value: number) =>
    Math.min(latest.current.last, Math.max(0, Math.round(-value / WHEEL_ROW)));

  function glideTo(i: number) {
    position.current = offsetOf(i);
    Animated.spring(offset, {
      toValue: position.current,
      useNativeDriver: true,
      speed: 22,
      bounciness: 2,
    }).start();
  }

  // Follow the value when it changes from outside (or after a drag has settled).
  useEffect(() => {
    if (!dragging.current && Math.abs(position.current - offsetOf(index)) > 0.5) glideTo(index);
  }, [index]);

  const [responder] = useState(() => {
    const finish = () => {
      dragging.current = false;
      const next = indexAt(position.current);
      glideTo(next);
      if (next !== latest.current.index) latest.current.onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 3 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      // Keep the drag even though the screen is a scroll view.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging.current = true;
        offset.stopAnimation();
        grabbedAt.current = position.current;
        ticked.current = latest.current.index;
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(
          0,
          Math.max(-latest.current.last * WHEEL_ROW, grabbedAt.current + gesture.dy),
        );
        position.current = next;
        offset.setValue(next);
        const i = indexAt(next);
        if (i !== ticked.current) {
          ticked.current = i;
          haptic("selection");
        }
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  });

  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        const { index: current, last, onChange: change } = latest.current;
        if (event.nativeEvent.actionName === "increment" && current < last) change(current + 1);
        if (event.nativeEvent.actionName === "decrement" && current > 0) change(current - 1);
        haptic("selection");
      }}
      style={{
        width,
        height: WHEEL_ROW * 3,
        overflow: "hidden",
        borderRadius: theme.radius.sm,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: WHEEL_ROW,
          height: WHEEL_ROW,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: WHEEL_ROW,
          transform: [{ translateY: offset }],
        }}
      >
        {items.map((item, i) => {
          const chosen = i === index;
          return (
            <View
              key={`${i}-${item}`}
              style={{ height: WHEEL_ROW, alignItems: "center", justifyContent: "center" }}
            >
              <Text
                style={{
                  color: chosen ? theme.colors.text : theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  fontWeight: chosen ? theme.font.weight.bold : theme.font.weight.regular,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
