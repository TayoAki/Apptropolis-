// The round's punch sequence in a red glowing panel. The punch being thrown is white; while
// resting the whole sequence goes grey and stops glowing.
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

export function ComboPanel({
  steps,
  current,
  muted = false,
  locked = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  steps: string[];
  /** Index of the punch being thrown now, or -1 for none (every punch shows red). */
  current: number;
  /** Resting: grey, no glow. */
  muted?: boolean;
  /** Custom combos are premium: a small lock shows on the panel. */
  locked?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const glow = !muted;
  const accent = muted ? theme.colors.textMuted : theme.colors.primary;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        minHeight: 76,
        justifyContent: "center",
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        borderColor: muted ? theme.colors.border : theme.colors.primary,
        backgroundColor: theme.colors.surfaceAlt,
        shadowColor: theme.colors.primary,
        shadowOpacity: glow ? 0.7 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: glow ? 6 : 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontSize: theme.font.size.body + 2,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {steps.map((step, index) => {
          const live = index === current;
          const color = muted
            ? theme.colors.textMuted
            : live
              ? theme.colors.text
              : theme.colors.primary;
          return (
            <Text key={`${index}-${step}`}>
              {index > 0 ? <Text style={{ color: accent }}>{"  —  "}</Text> : null}
              <Text
                style={{
                  color,
                  ...(glow
                    ? {
                        textShadowColor: theme.colors.primary,
                        textShadowRadius: 10,
                        textShadowOffset: { width: 0, height: 0 },
                      }
                    : {}),
                }}
              >
                {step}
              </Text>
            </Text>
          );
        })}
      </Text>
      {locked ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 8, right: 10 }}>
          <Ionicons name="lock-closed" size={14} color={theme.colors.primary} />
        </View>
      ) : null}
    </PressScale>
  );
}
