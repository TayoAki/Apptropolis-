import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { WEEKDAY_LABELS, WEEKDAY_NAMES, type PlanDay } from "../../data/plan";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";

/** The step indicator: equal pills that fill with the primary color as each step begins. */
export function StepSegments({ count, index }: { count: number; index: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fills = useRef(
    Array.from({ length: count }, (_, i) => new Animated.Value(i <= index ? 1 : 0)),
  ).current;

  useEffect(() => {
    const runs = fills.map((fill, i) => {
      const target = i <= index ? 1 : 0;
      if (reduced) {
        fill.setValue(target);
        return null;
      }
      return Animated.spring(fill, {
        toValue: target,
        useNativeDriver: false,
        speed: 14,
        bounciness: 8,
      });
    });
    const active = runs.filter((run): run is Animated.CompositeAnimation => run !== null);
    active.forEach((run) => run.start());
    return () => active.forEach((run) => run.stop());
  }, [index, reduced, fills]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={
        index < count ? `Plan setup, step ${index + 1} of ${count}` : "Plan setup, all steps done"
      }
      accessibilityValue={{ min: 0, max: count, now: Math.min(index + 1, count) }}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={Math.min(index + 1, count)}
      style={{ flex: 1, flexDirection: "row", gap: theme.spacing.sm }}
    >
      {fills.map((fill, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 28,
            borderRadius: theme.radius.pill,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
              width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }}
          />
          <Text
            style={{
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              fontVariant: ["tabular-nums"],
              color: i <= index ? theme.colors.onPrimary : theme.colors.textMuted,
            }}
          >
            {i + 1}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * A large answer row. The selected one gets a primary ring and a filled check that snaps in.
 * Unselected rows sit on the surface with a quiet border and an empty radio.
 */
export function OptionRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const snap = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      snap.setValue(selected ? 1 : 0);
      return;
    }
    const run = Animated.spring(snap, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 14,
    });
    run.start();
    return () => run.stop();
  }, [selected, reduced, snap]);

  const checkScale = snap.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 64,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        // One border width in both states, so the row's text never shifts when it is picked.
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.medium,
            color: theme.colors.text,
          }}
        >
          {label}
        </Text>
        {detail ? (
          <Text style={{ fontSize: theme.font.size.caption, color: theme.colors.textMuted }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View
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
            position: "absolute",
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: 13,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: snap,
            transform: [{ scale: checkScale }],
          }}
        >
          <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
        </Animated.View>
      </View>
    </PressScale>
  );
}

/**
 * The week as seven toggles, Monday to Sunday. A picked day is filled and carries a check, so it
 * is not marked by color alone, and each toggle announces its day and whether it is picked.
 */
export function DayToggles({
  selected,
  onToggle,
}: {
  /** Weekday numbers, 0 for Monday. */
  selected: number[];
  onToggle: (weekday: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {WEEKDAY_LABELS.map((label, weekday) => {
        const on = selected.includes(weekday);
        return (
          <Pressable
            key={label}
            onPress={() => onToggle(weekday)}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[weekday]}
            accessibilityState={{ checked: on }}
            aria-checked={on}
            hitSlop={4}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 76,
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              borderWidth: 2,
              borderColor: on ? theme.colors.primary : theme.colors.border,
              backgroundColor: on ? theme.colors.primary : theme.colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {/* Seven across leaves each day about 44pt: the label scales with the phone's text
                size up to the width it has. */}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: theme.font.size.caption,
                fontWeight: on ? theme.font.weight.bold : theme.font.weight.medium,
                color: on ? theme.colors.onPrimary : theme.colors.text,
              }}
            >
              {label}
            </Text>
            <Ionicons
              name={on ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={on ? theme.colors.onPrimary : theme.colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The plan's sessions, one row a training day: the day, the session's name and its lifts. */
export function PlanPreview({
  days,
  names,
}: {
  days: PlanDay[];
  /** Exercise names by catalog id. */
  names: Map<string, string>;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      {days.map((day, index) => (
        <View
          key={day.weekday}
          accessible
          accessibilityLabel={`${WEEKDAY_NAMES[day.weekday]}: ${day.title}. ${day.exercises
            .map((id) => names.get(id) ?? id)
            .join(", ")}`}
          style={{
            flexDirection: "row",
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            borderTopWidth: index > 0 ? 1 : 0,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              width: 40,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              color: theme.colors.primary,
            }}
          >
            {WEEKDAY_LABELS[day.weekday]}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                color: theme.colors.text,
              }}
            >
              {day.title}
            </Text>
            <Text
              style={{
                fontSize: theme.font.size.caption,
                lineHeight: 19,
                color: theme.colors.textMuted,
              }}
            >
              {day.exercises.map((id) => names.get(id) ?? id).join(", ")}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
