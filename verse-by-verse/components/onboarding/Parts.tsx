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

/** Width of the action column on the right of the featured verse card. */
export const PANEL_WIDTH = 84;

/** The tabs the app opens with, in the app's own order. */
const PREVIEW_TABS: Array<{ label: string; icon: IconName; activeIcon: IconName }> = [
  { label: "Read", icon: "book-outline", activeIcon: "book" },
  { label: "Search", icon: "search-outline", activeIcon: "search" },
  { label: "Saved", icon: "bookmark-outline", activeIcon: "bookmark" },
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
 * of the action column drawn inside the featured card.
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
          // The featured card is at least as tall as its action column; the rest fit their text.
          minHeight: featured ? 152 : undefined,
          gap: theme.spacing.sm,
          overflow: "hidden",
          paddingVertical: theme.spacing.lg,
          paddingLeft: theme.spacing.lg,
          paddingRight: inset ?? theme.spacing.lg,
          borderRadius: theme.radius.md,
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
      <Ionicons name={icon} size={22} color={theme.colors.text} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
          lineHeight: theme.font.size.caption + 3,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The action column on the right of the featured verse card, laid out like the reader's own
 * rail: inside the card, beside the verse and divided from it by a hairline. Render it inside
 * a relatively laid-out wrapper around the card, and give the card `inset` so its text stays
 * clear. It is a preview of what the reader offers, so it never takes touches: the card
 * underneath stays tappable.
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
        top: 2,
        bottom: 2,
        right: 0,
        width: PANEL_WIDTH,
        justifyContent: "center",
        alignItems: "center",
        gap: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xs,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
      }}
    >
      <SideAction icon="reader-outline" label="Full context" />
      {hasNote ? <SideAction icon="document-text-outline" label="Study note" /> : null}
    </View>
  );
}

/**
 * A preview of the app's bottom tab bar, shown at the foot of onboarding with the same metrics
 * as the real one. The tabs open once onboarding is finished, so the bar is decorative and
 * never takes touches.
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
        height: 58 + bottomInset,
        paddingTop: 2,
        paddingBottom: bottomInset + 2,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {PREVIEW_TABS.map((tab, index) => {
        const active = index === 0;
        const ink = active ? theme.colors.primary : theme.colors.textMuted;
        return (
          <View
            key={tab.label}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}
          >
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={24} color={ink} />
            <Text
              style={{
                color: ink,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
