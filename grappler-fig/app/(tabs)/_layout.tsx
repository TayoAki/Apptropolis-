import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.font.size.caption,
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
