// Shared card and section header for the app's lists and panels.
import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

/** A surface panel. With onPress it becomes a button that springs when pressed. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const look: StyleProp<ViewStyle> = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  };
  if (!onPress) return <View style={[look, style]}>{children}</View>;
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      scaleTo={0.97}
      style={[look, style]}
    >
      {children}
    </PressScale>
  );
}

/** A section title with an optional action on the right (e.g. "See all"). */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.md,
        minHeight: 32,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
