// The paywall's metal panels: a brushed gradient, a bevelled edge, red corner brackets and a glow
// when selected. Used for plan cards, the feature list and the premium panel. Pass onPress to
// make the panel a button that springs when pressed.
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { View, type AccessibilityState, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, type HapticKind } from "../motion";

const FILL: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

/** Four corner brackets drawn over the corners of the panel they sit in. */
export function CornerBrackets({
  color,
  size = 12,
  inset = 6,
  thickness = 2,
}: {
  color?: string;
  size?: number;
  inset?: number;
  thickness?: number;
}) {
  const theme = useTheme();
  const c = color ?? theme.colors.primary;
  const arm: ViewStyle = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: c,
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          arm,
          { top: inset, left: inset, borderTopWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          arm,
          { top: inset, right: inset, borderTopWidth: thickness, borderRightWidth: thickness },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          arm,
          { bottom: inset, left: inset, borderBottomWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          arm,
          { bottom: inset, right: inset, borderBottomWidth: thickness, borderRightWidth: thickness },
        ]}
      />
    </>
  );
}

export function MetalPanel({
  children,
  selected = false,
  onPress,
  haptic,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  style,
}: {
  children: ReactNode;
  /** Glows and takes the primary edge (the chosen plan). */
  selected?: boolean;
  onPress?: () => void;
  haptic?: HapticKind;
  accessibilityRole?: "radio" | "button";
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  /** Layout of the content inside the panel (padding is 16pt by default). */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const edge = selected ? theme.colors.primary : theme.colors.border;

  // The glow lives on an outer view so the clipping inner view doesn't cut it off.
  const glow: ViewStyle = {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOpacity: selected ? 0.55 : 0,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: selected ? 6 : 0,
  };
  const frame: ViewStyle = {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    borderWidth: selected ? 2 : 1,
    borderColor: edge,
    backgroundColor: theme.colors.surface,
  };

  const body = (
    <>
      <LinearGradient
        colors={[theme.colors.surfaceAlt, theme.colors.surface, theme.colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={FILL}
      />
      <CornerBrackets color={selected ? theme.colors.primary : theme.colors.textMuted} />
      <View
        style={[
          {
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
          },
          style,
        ]}
      >
        {children}
      </View>
    </>
  );

  return (
    <View style={glow}>
      {onPress ? (
        <PressScale
          onPress={onPress}
          haptic={haptic}
          scaleTo={0.97}
          accessibilityRole={accessibilityRole}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={accessibilityState}
          style={frame}
        >
          {body}
        </PressScale>
      ) : (
        <View style={frame}>{body}</View>
      )}
    </View>
  );
}
