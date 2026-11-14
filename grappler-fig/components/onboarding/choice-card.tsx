// One answer to an onboarding question: a radio row. The selected answer has a filled radio with
// a check, a heavier edge and a light tint, so the choice never rests on color alone.
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { RadioMark, tint } from "../ui";

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
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityState={{ checked: selected, selected }}
      style={{
        minHeight: 76,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.md,
        // The edge is 2pt either way so the row doesn't shift when it is chosen.
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? tint(theme.colors.primary, "14") : theme.colors.surface,
      }}
    >
      <RadioMark selected={selected} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body + 2,
            fontWeight: theme.font.weight.bold,
            lineHeight: 24,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption + 2,
            lineHeight: 20,
          }}
        >
          {body}
        </Text>
      </View>
    </PressScale>
  );
}
