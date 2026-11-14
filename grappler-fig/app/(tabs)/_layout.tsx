import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Room for the icon, a full line of label and the bar's own padding. The default height squeezes
 * the label to a few points and clips it.
 */
const BAR_HEIGHT = 64;

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
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
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
        options={{
          title: "Train",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "timer" : "timer-outline"}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scout"
        options={{
          title: "Scout",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "eye" : "eye-outline"} size={24} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
