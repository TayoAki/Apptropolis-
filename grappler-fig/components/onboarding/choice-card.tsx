// One answer in a onboarding question: a metal-edged panel with corner brackets. When selected it
// takes the primary color as a border, a glow, a left accent bar and a check mark.
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { Corners } from "./corners";

export function ChoiceCard({
  title,
  body,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityState={{ checked: selected }}
      style={{
        minHeight: 88,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingLeft: theme.spacing.xl,
        paddingRight: theme.spacing.lg,
        borderRadius: theme.radius.sm,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.primary,
        shadowOpacity: selected ? 0.55 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: selected ? 6 : 0,
      }}
    >
      {/* A faint highlight along the top edge gives the panel its bevel. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 1,
          left: 12,
          right: 12,
          height: 1,
          backgroundColor: theme.colors.text,
          opacity: 0.08,
        }}
      />
      <Corners color={theme.colors.textMuted} size={12} inset={8} />
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.primary,
          }}
        />
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>{body}</Text>
      </View>
      <View style={{ width: 32, alignItems: "center" }}>
        {selected ? (
          <Ionicons name="checkmark-circle-outline" size={30} color={theme.colors.primary} />
        ) : null}
      </View>
    </PressScale>
  );
}
