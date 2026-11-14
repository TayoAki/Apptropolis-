import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Text, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

// The bar's own content: 5 padding + 28 icon + 16 label line + 5 padding, with room left for the
// label to grow to 1.3x with the phone's text size. The home-indicator inset is added on top.
const TAB_BAR_HEIGHT = 60;
const LABEL_SIZE = 12;

/** A tab's icon: filled when its tab is open, outlined otherwise (so the open tab isn't shown by color alone). */
function tabIcon(filled: IconName, outline: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color as string} />
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{
              color,
              fontSize: LABEL_SIZE,
              lineHeight: 16,
              fontWeight: focused ? theme.font.weight.bold : theme.font.weight.medium,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Today", tabBarIcon: tabIcon("barbell", "barbell-outline") }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: "My Plan", tabBarIcon: tabIcon("calendar", "calendar-outline") }}
      />
      <Tabs.Screen
        name="partner"
        options={{ title: "Partner", tabBarIcon: tabIcon("people", "people-outline") }}
      />
    </Tabs>
  );
}
