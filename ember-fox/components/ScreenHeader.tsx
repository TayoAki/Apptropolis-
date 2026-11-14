import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/**
 * The title block every tab opens with: a large title, an optional line under it, and the
 * Settings button on the right (the tabs have no navigation bar of their own).
 */
export function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Extra content under the title, such as a tag. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            lineHeight: 34,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      <Pressable
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        })}
      >
        <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}
