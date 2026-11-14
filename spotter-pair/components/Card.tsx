import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

/** A surface for a group of related content. Pass onPress to make the whole card a button. */
export function Card({
  children,
  onPress,
  label,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  /** Read out by screen readers when the card is a button. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const body: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  };
  if (!onPress) return <View style={[body, style]}>{children}</View>;
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[body, style]}
    >
      {children}
    </PressScale>
  );
}
