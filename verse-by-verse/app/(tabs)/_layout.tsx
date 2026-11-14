import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useWindowDimensions, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSavedTheme } from "../../components/reading";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * A tab is 5 padding, a 28pt icon, the label's line and 5 padding, and the bar adds 2 above and
 * below: 42pt plus the label line, plus the home indicator's inset. The default 49pt bar clips
 * the label. The label line grows with the phone's text size, so the bar does too.
 */
const BAR_CHROME = 42;
const LABEL_LINE = 16;

/** The selected tab's icon is filled, the others outlined, so the state isn't color alone. */
function tabIcon(outline: IconName, filled: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color as string} />
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const barHeight = BAR_CHROME + Math.ceil(LABEL_LINE * Math.max(1, fontScale));
  useSavedTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          height: barHeight + insets.bottom,
          paddingTop: 2,
          paddingBottom: insets.bottom + 2,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: LABEL_LINE,
          fontWeight: theme.font.weight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Read", tabBarIcon: tabIcon("book-outline", "book") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: tabIcon("search-outline", "search") }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: "Saved", tabBarIcon: tabIcon("bookmark-outline", "bookmark") }}
      />
    </Tabs>
  );
}
