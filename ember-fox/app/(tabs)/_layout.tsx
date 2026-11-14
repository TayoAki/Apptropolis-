import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Each tab item is 5 + 28 (icon box) + 16 (label line) + 5 = 54pt tall, so the bar needs 54pt
 * plus its own padding above the home indicator, or the labels clip.
 */
const BAR_PADDING = 4;
const BAR_HEIGHT = 54 + BAR_PADDING * 2;

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
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: BAR_PADDING,
          paddingBottom: insets.bottom + BAR_PADDING,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: theme.font.weight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "beer" : "beer-outline"} size={24} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "Week",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="career"
        options={{
          title: "Career",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
