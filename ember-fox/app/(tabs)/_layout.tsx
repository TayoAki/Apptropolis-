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
        tabBarLabelStyle: { fontWeight: theme.font.weight.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="beer-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "Week",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="career"
        options={{
          title: "Career",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
