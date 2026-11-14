import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, haptic } from "../motion";
import { glowStyle } from "./glow";

/**
 * A compact tile for a 2x2 grid of choices: a square leading well (icon, picture or number), a
 * title and a numeric value. A selected tile lights up with the amber glow. `count` shows a small
 * badge, for tiles that can be tapped more than once.
 */
export function OptionTile({
  selected,
  title,
  value,
  leading,
  count,
  onPress,
  role = "radio",
  accessibilityLabel,
}: {
  selected: boolean;
  title: string;
  value?: string;
  leading: ReactNode;
  count?: number;
  onPress: () => void;
  role?: "radio" | "button";
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ width: "48%" }}>
      <PressScale
        onPress={() => {
          haptic("selection");
          onPress();
        }}
        scaleTo={0.96}
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
        accessibilityState={role === "radio" ? { checked: selected } : undefined}
        style={{
          minHeight: 76,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          backgroundColor: theme.colors.surface,
          ...glowStyle(theme, selected),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            {leading}
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {title}
            </Text>
            {value ? (
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.medium,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {value}
              </Text>
            ) : null}
          </View>
        </View>
        {count ? (
          <View
            style={{
              position: "absolute",
              top: -8,
              right: -6,
              minWidth: 26,
              height: 26,
              paddingHorizontal: theme.spacing.xs,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {`×${count}`}
            </Text>
          </View>
        ) : null}
      </PressScale>
    </View>
  );
}
