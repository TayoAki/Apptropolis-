import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import type { Unlock } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { PressScale, useReducedMotion } from "../motion";

export type Access = "unlocked" | "locked" | "plus";

/** A thin bar that fills to `progress` (0 to 1), with a gradient from warning to primary. */
export function GradientBar({ progress, height = 10 }: { progress: number; height?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));
  const fill = useRef(new Animated.Value(reduced ? target : 0)).current;

  useEffect(() => {
    if (reduced) {
      fill.setValue(target);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: target,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [target, reduced, fill]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: "hidden",
      }}
    >
      <Animated.View style={{ width, height: "100%" }}>
        <LinearGradient
          colors={[theme.colors.warning, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height / 2 }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * One gear or kit tile for the locker: a picture, its name and a short line. Unlocked tiles
 * have an amber border; locked tiles are dimmed behind a lock; Plus tiles open the paywall.
 */
export function GearTile({
  item,
  access,
  subtitle,
  prompt,
  onPress,
}: {
  item: Unlock;
  access: Access;
  subtitle: string;
  /** A short description of the picture to draw for this item. */
  prompt: string;
  /** Plus tiles open the paywall. */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const unlocked = access === "unlocked";
  const label = `${item.name}, ${subtitle}${access === "locked" ? ", locked" : ""}`;

  const card = (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: "center",
        padding: theme.spacing.sm,
        paddingTop: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: unlocked ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          width: "100%",
          alignItems: "center",
          gap: theme.spacing.xs,
          opacity: unlocked ? 1 : 0.4,
        }}
      >
        <AiImage prompt={prompt} fit="contain" style={{ width: "100%", height: 64 }} />
        <Text
          numberOfLines={2}
          style={{
            minHeight: 34,
            textAlign: "center",
            color: theme.colors.text,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {item.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            textAlign: "center",
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
          }}
        >
          {subtitle}
        </Text>
      </View>

      {access === "locked" ? (
        <View
          style={{
            position: "absolute",
            top: theme.spacing.xs,
            right: theme.spacing.xs,
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} />
        </View>
      ) : null}

      {access === "plus" ? (
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -6,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            PLUS
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (access !== "plus" || !onPress) return card;
  return (
    <PressScale
      onPress={onPress}
      haptic="light"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. Part of ShotOClock Plus`}
      style={{ flex: 1 }}
    >
      {card}
    </PressScale>
  );
}
