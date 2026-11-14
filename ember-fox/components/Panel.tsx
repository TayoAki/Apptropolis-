import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/** A bordered surface card with an optional heading and an optional action on its right. */
export function Panel({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {title || action ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 28,
          }}
        >
          {title ? (
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
