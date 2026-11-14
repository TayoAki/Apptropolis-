import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

/** Width kept free on each side of the title for the back button and the right-hand action. */
const SIDE = 88;

/**
 * The header of a pushed screen (Settings, the chapter view): a chevron and "Back" on the left,
 * a centered serif title, and room for one action on the right. Back returns to the previous
 * screen, or to the Read tab when the screen was opened directly.
 */
export function ScreenHeader({
  title,
  backAccessibilityLabel = "Back",
  onBack,
  right,
}: {
  title: string;
  backAccessibilityLabel?: string;
  onBack?: () => void;
  /** One 44pt action, e.g. <HeaderAction />. */
  right?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  function back() {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.xs,
        paddingBottom: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <View
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            paddingRight: theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>Back</Text>
        </Pressable>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: SIDE,
            right: SIDE,
            top: 0,
            bottom: 0,
            justifyContent: "center",
          }}
        >
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              textAlign: "center",
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
        </View>
        {right ?? null}
      </View>
    </View>
  );
}

/** A 44pt icon button for the right side of a ScreenHeader. */
export function HeaderAction({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  /** What the button does, for screen readers. */
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={24} color={theme.colors.primary} />
    </Pressable>
  );
}
