import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * The screen's own header: a chevron and "Back" on the left (back to the previous screen), and a
 * centered serif title, on the cream background with no tinted bar.
 */
export function SettingsHeader({ title }: { title: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={{ height: 44, justifyContent: "center" }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
            }}
          >
            Back
          </Text>
        </Pressable>
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center" }}
        >
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              textAlign: "center",
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}
