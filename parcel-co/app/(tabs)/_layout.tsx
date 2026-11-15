import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Room for a 24pt icon and a 12pt label without clipping, before the phone's bottom inset. */
const TAB_BAR_HEIGHT = 60;

/** The selected tab's icon is filled, so selection never rests on color alone. */
function tabIcon(outline: IconName, filled: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={24} color={color as string} />
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
          paddingTop: theme.spacing.xs,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.font.size.caption,
          lineHeight: 16,
          fontWeight: theme.font.weight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Ask Pip",
          tabBarIcon: tabIcon("chatbubble-ellipses-outline", "chatbubble-ellipses"),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{ title: "Stores", tabBarIcon: tabIcon("storefront-outline", "storefront") }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: "Saved", tabBarIcon: tabIcon("bookmark-outline", "bookmark") }}
      />
    </Tabs>
  );
}
