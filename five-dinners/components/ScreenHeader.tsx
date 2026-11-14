import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/** The title block every tab opens with: a large title, one muted line under it, actions on the right. */
export function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Icon buttons shown on the right, each 44pt. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.display,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.body,
              fontVariant: ["tabular-nums"],
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
