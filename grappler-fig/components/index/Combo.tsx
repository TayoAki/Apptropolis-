// The punch sequence under the round clock. Before a round it names the combo and lists its
// punches (tap to change it). During a round the punch to throw now is set large enough to read
// from across the room, with the sequence small beneath it. Between rounds it says "Rest".
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { displayFace } from "../ui";

/** The live callout is as large as its length allows on a phone's width. */
function calloutSize(text: string): number {
  if (text.length <= 6) return 64;
  if (text.length <= 10) return 52;
  if (text.length <= 14) return 40;
  return 32;
}

function Sequence({ steps, current }: { steps: string[]; current: number }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        textAlign: "center",
        color: theme.colors.textMuted,
        fontSize: theme.font.size.caption + 2,
        lineHeight: 20,
      }}
    >
      {steps.map((step, index) => (
        <Text key={`${index}-${step}`}>
          {index > 0 ? " · " : ""}
          <Text
            style={
              index === current
                ? { color: theme.colors.text, fontWeight: theme.font.weight.bold }
                : undefined
            }
          >
            {/* A non-breaking space keeps "Slip left" on one line. */}
            {step.replace(/ /g, " ")}
          </Text>
        </Text>
      ))}
    </Text>
  );
}

export function ComboPanel({
  name,
  steps,
  phase,
  current,
  restNote,
  locked = false,
  onPress,
}: {
  /** The combo or plan these punches belong to. */
  name: string;
  steps: string[];
  phase: "idle" | "work" | "rest";
  /** Index of the punch being thrown now (during a round). */
  current: number;
  /** What comes after the rest, e.g. "Round 3 of 5 is next". */
  restNote?: string;
  /** Other combos are premium: a lock shows beside "Change". */
  locked?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  // Set off from the clock and the controls by hairlines, not by a box inside the card.
  const box = {
    minHeight: 96,
    justifyContent: "center" as const,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  };

  if (phase === "work") {
    const live = steps[current] ?? "";
    const size = calloutSize(live);
    return (
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Throw: ${live}`}
        style={[box, { alignItems: "center", gap: theme.spacing.xs }]}
      >
        <Text
          numberOfLines={2}
          style={[
            displayFace,
            {
              color: theme.colors.primary,
              fontSize: size,
              lineHeight: Math.round(size * 1.1),
              textAlign: "center",
              textTransform: "uppercase",
            },
          ]}
        >
          {live}
        </Text>
        <Sequence steps={steps} current={current} />
      </View>
    );
  }

  if (phase === "rest") {
    return (
      <View
        accessible
        accessibilityLabel={`Rest. ${restNote ?? ""}`}
        style={[box, { alignItems: "center", gap: theme.spacing.xs }]}
      >
        <Text
          style={[
            displayFace,
            {
              color: theme.colors.textMuted,
              fontSize: 64,
              lineHeight: 70,
              textTransform: "uppercase",
            },
          ]}
        >
          Rest
        </Text>
        {restNote ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              textAlign: "center",
            }}
          >
            {restNote}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${steps.join(", ")}. ${
        locked ? "Other combos are part of Pro" : "Change the combo"
      }`}
      style={[box, { gap: theme.spacing.sm }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption + 2,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {name}
        </Text>
        {locked ? <Ionicons name="lock-closed" size={14} color={theme.colors.primary} /> : null}
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption + 2,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Change
        </Text>
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body + 2,
          fontWeight: theme.font.weight.bold,
          lineHeight: 26,
        }}
      >
        {steps.map((step) => step.replace(/ /g, " ")).join(" · ")}
      </Text>
    </PressScale>
  );
}
