import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, type ComponentProps } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** Approximate length of the check's stroke, in the 56-unit drawing. */
const CHECK_LENGTH = 32;

/** Width of the floating side panel that overlaps the featured verse card. */
export const PANEL_WIDTH = 96;

/** The tabs the app opens with, in the app's own order. */
const PREVIEW_TABS: Array<{ label: string; icon: IconName }> = [
  { label: "Read", icon: "book-outline" },
  { label: "Search", icon: "search-outline" },
  { label: "Saved", icon: "bookmark-outline" },
];

/**
 * A completion check that draws itself: the ring is already there and the tick is traced in.
 * Mount it again (give it a new key) to draw it again.
 */
export function DrawCheck({ size = 56 }: { size?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const draw = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    const animation = Animated.timing(draw, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, draw]);

  const strokeDashoffset = draw.interpolate({
    inputRange: [0, 1],
    outputRange: [CHECK_LENGTH, 0],
  });

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Circle
          cx={28}
          cy={28}
          r={26}
          fill={theme.colors.surface}
          stroke={theme.colors.success}
          strokeWidth={2}
        />
        <AnimatedPath
          d="M18 29 L25 36 L39 21"
          fill="none"
          stroke={theme.colors.success}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </View>
  );
}

/**
 * A verse as a tappable card for the starting list. The featured card has a warm gradient fill
 * and a stronger border; the others are flat. `inset` is the right padding, so text stays clear
 * of the side panel that overlaps the featured card's edge.
 */
export function VerseStartCard({
  label,
  text,
  featured = false,
  inset,
  onPress,
  style,
}: {
  label: string;
  text: string;
  featured?: boolean;
  inset?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Start reading at ${label}`}
      accessibilityHint="Opens the reader at this verse"
      style={[
        {
          minHeight: featured ? 200 : 140,
          gap: theme.spacing.sm,
          overflow: "hidden",
          paddingVertical: theme.spacing.lg,
          paddingLeft: theme.spacing.lg,
          paddingRight: inset ?? theme.spacing.lg,
          borderRadius: featured ? theme.radius.lg : theme.radius.md,
          borderWidth: featured ? 1.5 : 1,
          borderColor: featured ? theme.colors.primary : theme.colors.border,
          backgroundColor: featured ? theme.colors.surface : theme.colors.background,
        },
        style,
      ]}
    >
      {featured ? (
        <LinearGradient
          colors={[theme.colors.background, theme.colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.body,
          lineHeight: theme.font.size.body * 1.5,
        }}
      >
        {text}
      </Text>
    </PressScale>
  );
}

function SideAction({ icon, label }: { icon: IconName; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={24} color={theme.colors.primary} />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.caption,
          lineHeight: theme.font.size.caption * 1.3,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The floating panel that hangs off the right edge of the featured verse card, centred on it.
 * Render it inside a relatively laid-out wrapper around the card. It is a preview of what the
 * reader offers, so it never takes touches: the card underneath stays tappable.
 */
export function SideActions({ hasNote }: { hasNote: boolean }) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: -theme.spacing.lg,
        justifyContent: "center",
        zIndex: 1,
      }}
    >
      <View
        style={{
          width: PANEL_WIDTH,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.lg,
          alignItems: "center",
          borderTopLeftRadius: theme.radius.md,
          borderBottomLeftRadius: theme.radius.md,
          borderWidth: 1,
          borderRightWidth: 0,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <SideAction icon="open-outline" label="Full Context" />
        {hasNote ? <SideAction icon="document-text-outline" label="Note Available" /> : null}
      </View>
    </View>
  );
}

/**
 * A preview of the app's bottom tab bar, shown at the foot of onboarding. The tabs open once
 * onboarding is finished, so the bar is decorative and never takes touches.
 */
export function PreviewTabBar({ bottomInset }: { bottomInset: number }) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingBottom: Math.max(bottomInset, theme.spacing.sm),
      }}
    >
      {PREVIEW_TABS.map((tab, index) => {
        const active = index === 0;
        const ink = active ? theme.colors.primary : theme.colors.textMuted;
        return (
          <View key={tab.label} style={{ flex: 1, alignItems: "center" }}>
            {active ? (
              <View
                style={{
                  width: 32,
                  height: 3,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ) : (
              <View style={{ height: 3 }} />
            )}
            <View style={{ alignItems: "center", gap: 2, paddingTop: theme.spacing.sm }}>
              <Ionicons name={tab.icon} size={24} color={ink} />
              <Text
                style={{
                  color: ink,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                {tab.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
