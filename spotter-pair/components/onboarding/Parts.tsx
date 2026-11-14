import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";

/** A theme color at a low opacity for soft fills. The alpha is appended to the theme's hex token. */
function tint(color: string, alpha = 0x24): string {
  return `${color}${alpha.toString(16).padStart(2, "0")}`;
}

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
      accessibilityLabel={`Step ${index + 1} of ${count}`}
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
 * A large answer row. The selected one gets a primary ring, a warm glow and a filled check
 * that snaps in. Unselected rows sit on the surface with a quiet border.
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
      accessibilityState={{ selected }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 64,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        shadowColor: theme.colors.primary,
        shadowOpacity: selected ? 0.5 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: selected ? 6 : 0,
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
          borderColor: selected ? theme.colors.primary : theme.colors.border,
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

/** The grey filled "+ Log First Set" chip, with an orange plus (or a check once done). */
export function LogChip({
  label,
  complete,
  onPress,
}: {
  label: string;
  complete: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={complete}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: complete }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        minHeight: 44,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        opacity: complete ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={complete ? "checkmark" : "add"}
        size={20}
        color={theme.colors.primary}
      />
      <Text
        style={{
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
          color: theme.colors.text,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

/** "1/3 logged  Partner sees: IN PROGRESS": what the partner will see of this workout. */
export function ProgressBadge({
  logged,
  total,
  complete,
}: {
  logged: number;
  total: number;
  complete: boolean;
}) {
  const theme = useTheme();
  const tone = complete ? theme.colors.success : theme.colors.textMuted;
  return (
    <View
      accessibilityLabel={`${logged} of ${total} sets logged. Partner sees ${complete ? "complete" : "in progress"}.`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        flexShrink: 1,
        minHeight: 44,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        backgroundColor: complete ? tint(theme.colors.success) : theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: complete ? theme.colors.success : theme.colors.border,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: theme.font.size.caption,
          color: theme.colors.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`${logged}/${total} logged`}
        <Text style={{ color: theme.colors.textMuted }}>{"  Partner sees: "}</Text>
        <Text style={{ color: tone, fontWeight: theme.font.weight.bold }}>
          {complete ? "COMPLETE" : "IN PROGRESS"}
        </Text>
      </Text>
      {complete ? <Ionicons name="flame" size={14} color={theme.colors.warning} /> : null}
    </View>
  );
}

/** The divider and lock line at the foot of a workout card. Keep it to one short line. */
export function PrivacyFooter({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: theme.font.size.caption, color: theme.colors.textMuted }}
      >
        {children}
      </Text>
    </View>
  );
}

/** A compact exercise card for the welcome step: title, target, a log action and the partner badge. */
export function PreviewCard({
  title,
  subtitle,
  logged,
  total,
  complete,
  actionLabel,
  onLog,
}: {
  title: string;
  subtitle: string;
  logged: number;
  total: number;
  complete: boolean;
  actionLabel: string;
  onLog: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
            color: theme.colors.text,
          }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: theme.font.size.body, color: theme.colors.textMuted }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <LogChip label={actionLabel} complete={complete} onPress={onLog} />
        <ProgressBadge logged={logged} total={total} complete={complete} />
      </View>
      <PrivacyFooter>Your privacy · weights stay yours</PrivacyFooter>
    </View>
  );
}
