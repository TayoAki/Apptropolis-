import { Text, View, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, Mascot } from "../motion";

/**
 * A chat bubble with Pip's avatar, shown in a strip above the tab bar. Tapping the avatar or the
 * question asks Pip that question.
 */
export function PipBubble({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const press = () => {
    haptic("light");
    onPress();
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        maxWidth: "100%",
        gap: theme.spacing.sm,
        paddingLeft: theme.spacing.xs,
        paddingRight: theme.spacing.lg,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: 44, height: 44 }}
      >
        <Mascot pose="pip-neutral" size={44} onPress={press} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ask Pip: ${label}`}
        hitSlop={8}
        onPress={press}
        style={({ pressed }) => ({
          flexShrink: 1,
          minHeight: 44,
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
