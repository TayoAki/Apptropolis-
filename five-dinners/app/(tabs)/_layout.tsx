import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Room for the icon and a 12pt label with some slack for larger text, before the
 * home-indicator inset. (The default 49pt bar clips the label.)
 */
const TAB_BAR_HEIGHT = 64;

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // The selected tab is the filled icon, so selection is not carried by color alone.
  const icon =
    (on: IconName, off: IconName) =>
    ({ focused }: { focused: boolean }) => (
      <Ionicons
        name={focused ? on : off}
        size={26}
        color={focused ? theme.colors.primary : theme.colors.textMuted}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarItemStyle: { paddingTop: 3 },
        tabBarLabelStyle: {
          fontFamily: theme.font.family,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Week", tabBarIcon: icon("calendar", "calendar-outline") }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: "Shop", tabBarIcon: icon("cart", "cart-outline") }}
      />
      <Tabs.Screen
        name="cook"
        options={{ title: "Cook", tabBarIcon: icon("flame", "flame-outline") }}
      />
    </Tabs>
  );
}
