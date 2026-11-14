import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

/** Onboarding's progress: equal round dots, the current one in the primary color. */
export function StepDots({ count, index }: { count: number; index: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}
