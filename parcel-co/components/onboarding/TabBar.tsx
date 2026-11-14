import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The bar's height without the phone's bottom inset. */
export const TAB_BAR_BASE = 60;

/**
 * The app's bottom tab bar, shown during onboarding. Each tab opens the app where it leads:
 * Home, Shop, Pip Chat, and Profile (Settings).
 */
const TABS: { key: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "shop", label: "Shop", icon: "storefront-outline", activeIcon: "storefront" },
  {
    key: "assistant",
    label: "Pip chat",
    icon: "chatbubble-ellipses-outline",
    activeIcon: "chatbubble-ellipses",
  },
  { key: "settings", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

export function OnboardingTabBar({
  activeKey = "home",
  onOpen,
}: {
  activeKey?: string;
  onOpen: (key: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        height: TAB_BAR_BASE + insets.bottom,
        paddingBottom: insets.bottom,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeKey;
        const tint = active ? theme.colors.primary : theme.colors.textMuted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            hitSlop={8}
            onPress={() => {
              haptic("selection");
              onOpen(tab.key);
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={24} color={tint} />
            <Text
              style={{
                color: tint,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
