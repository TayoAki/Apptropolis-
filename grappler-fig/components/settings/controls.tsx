// Pieces of the Settings screen: a quiet section title above one rounded card of rows with
// hairline dividers, rows with a value and a chevron, a segmented control whose labels stay on
// one line, and a wheel picker. Every color comes from the theme.
import { Ionicons } from "@expo/vector-icons";
import { Children, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, PressScale, useReducedMotion } from "../motion";

const PILL_INSET = 3;
const WHEEL_ITEM = 44;
const WHEEL_ROWS = 5;

/** A titled section: a small muted header above one rounded card of rows. */
export function SettingsGroup({ title, children }: { title: string; children?: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 1,
          fontWeight: theme.font.weight.medium,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        }}
      >
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? (
              <View
                style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }}
              />
            ) : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Explanatory text inside a panel. */
export function SettingsNote({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger";
}) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: tone === "danger" ? theme.colors.danger : theme.colors.textMuted,
        fontSize: theme.font.size.caption,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * One row: a label (and optional detail), a value, an optional
 * control on the right (or stacked under the label) and a chevron when it opens something.
 */
export function SettingsRow({
  label,
  detail,
  value,
  active = false,
  accent = false,
  chevron,
  onPress,
  right,
  stacked = false,
  accessibilityLabel,
  children,
}: {
  label: string;
  detail?: string;
  value?: string;
  /** A check before the value (an active membership), so the state isn't told by color alone. */
  active?: boolean;
  /** Label in the accent color, for actions such as Restore purchases. */
  accent?: boolean;
  /** Defaults to true when the row can be pressed. */
  chevron?: boolean;
  onPress?: () => void;
  /** A control on the right in place of the value (a Switch, a segmented control). */
  right?: ReactNode;
  /** Put `right` under the label, full width (for long segmented controls). */
  stacked?: boolean;
  accessibilityLabel?: string;
  /** Shown under the row, e.g. an open wheel picker. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const showChevron = chevron ?? Boolean(onPress);
  const line = (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, gap: theme.spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: accent ? theme.colors.primary : theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: accent ? theme.font.weight.bold : theme.font.weight.medium,
          }}
        >
          {label}
        </Text>
        {detail ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              lineHeight: 20,
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {active ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
      ) : null}
      {value ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            fontVariant: ["tabular-nums"],
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {value}
        </Text>
      ) : null}
      {stacked ? null : right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </View>
  );
  const body = (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      {line}
      {stacked ? right : null}
    </View>
  );
  const accessible = accessibilityLabel ?? [label, value].filter(Boolean).join(", ");
  return (
    <View>
      {onPress ? (
        <PressScale
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessible}
          scaleTo={0.985}
        >
          {body}
        </PressScale>
      ) : (
        body
      )}
      {children}
    </View>
  );
}

/**
 * Two or three choices in a compact pill. The selected choice sits on a filled pill that slides
 * to its place on a spring, with a selection tick on each change. Labels stay on one line.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const slide = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reduced) {
      slide.setValue(index);
      return;
    }
    const spring = Animated.spring(slide, {
      toValue: index,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    });
    spring.start();
    return () => spring.stop();
  }, [index, reduced, slide]);

  const segment = width > 0 ? (width - PILL_INSET * 2) / options.length : 0;
  const translateX = slide.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => i * segment),
  });

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        {
          flexDirection: "row",
          height: 44,
          padding: PILL_INSET,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
        },
        style,
      ]}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: PILL_INSET,
            bottom: PILL_INSET,
            left: PILL_INSET,
            width: segment,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            transform: [{ translateX }],
          }}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (selected) return;
              haptic("selection");
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: theme.spacing.xs,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.onPrimary : theme.colors.text,
                fontSize: theme.font.size.caption + 2,
                fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
                textAlign: "center",
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

/**
 * A wheel of values. Items fade and shrink away from the centre as they scroll. The value that
 * settles in the centre clicks once (a selection tap on the phone), never while the wheel moves.
 * It is also adjustable by VoiceOver and TalkBack without dragging.
 */
export function Wheel({
  values,
  value,
  format,
  onChange,
  accessibilityLabel,
}: {
  values: number[];
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const start = Math.max(0, values.indexOf(value));
  const settled = useRef(start);
  const scrollY = useRef(new Animated.Value(start * WHEEL_ITEM)).current;

  // Start on the current value. (contentOffset alone isn't honoured on every platform.)
  useEffect(() => {
    list.current?.scrollTo({ y: start * WHEEL_ITEM, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The value changed from outside the wheel: move to it.
  useEffect(() => {
    const index = values.indexOf(value);
    if (index < 0 || index === settled.current) return;
    settled.current = index;
    list.current?.scrollTo({ y: index * WHEEL_ITEM, animated: !reduced });
  }, [value, values, reduced]);

  const clamp = (index: number) => Math.min(values.length - 1, Math.max(0, index));

  const commit = (index: number) => {
    const next = clamp(index);
    if (next === settled.current) return;
    settled.current = next;
    haptic("selection");
    onChange(values[next]!);
  };

  const settle = (offset: number) => commit(Math.round(offset / WHEEL_ITEM));

  const choose = (index: number) => {
    const next = clamp(index);
    list.current?.scrollTo({ y: next * WHEEL_ITEM, animated: !reduced });
    commit(next);
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
  });

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        choose(settled.current + (event.nativeEvent.actionName === "increment" ? 1 : -1))
      }
      style={{ height: WHEEL_ITEM * WHEEL_ROWS, overflow: "hidden" }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: theme.spacing.md,
          right: theme.spacing.md,
          top: WHEEL_ITEM * 2,
          height: WHEEL_ITEM,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      />
      <Animated.ScrollView
        ref={list}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: start * WHEEL_ITEM }}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM * 2 }}
        onScroll={onScroll}
        onScrollEndDrag={(event) => {
          // With no momentum the drag is the last movement; with momentum, the end settles it.
          if (!event.nativeEvent.velocity || event.nativeEvent.velocity.y === 0)
            settle(event.nativeEvent.contentOffset.y);
        }}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
      >
        {values.map((item, i) => {
          const near = [(i - 1) * WHEEL_ITEM, i * WHEEL_ITEM, (i + 1) * WHEEL_ITEM];
          const opacity = scrollY.interpolate({
            inputRange: near,
            outputRange: [0.25, 1, 0.25],
            extrapolate: "clamp",
          });
          const scale = scrollY.interpolate({
            inputRange: near,
            outputRange: [0.8, 1, 0.8],
            extrapolate: "clamp",
          });
          return (
            <Pressable
              key={item}
              onPress={() => choose(i)}
              accessibilityRole="button"
              accessibilityLabel={format(item)}
              style={{ height: WHEEL_ITEM, alignItems: "center", justifyContent: "center" }}
            >
              <Animated.Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                  opacity,
                  transform: [{ scale }],
                }}
              >
                {format(item)}
              </Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}
