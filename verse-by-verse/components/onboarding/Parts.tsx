import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { GrowBar, PressScale } from "../motion";

/**
 * Where the person is in setup: the task's name, the step they are on and how many there are,
 * with a bar that shows the same thing. It counts only the setup steps themselves.
 */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Getting started, step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step }}
      style={{ alignItems: "center", gap: theme.spacing.sm }}
    >
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`Getting started: step ${step} of ${total}`}
      </Text>
      <GrowBar progress={step / total} height={6} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

/**
 * One choice in a list where exactly one can be picked: a radio mark, a title and optional
 * text under it. The chosen one has a filled mark and a heavier border, and says so to a
 * screen reader.
 */
export function ChoiceCard({
  title,
  text,
  selected,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  text?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? (text ? `${title}. ${text}` : title)}
      accessibilityState={{ selected, checked: selected, disabled }}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.md,
        minHeight: 56,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.surface : theme.colors.background,
      }}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={24}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        {text ? (
          <Text
            numberOfLines={3}
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.body,
              lineHeight: theme.font.size.body * 1.45,
            }}
          >
            {text}
          </Text>
        ) : null}
      </View>
    </PressScale>
  );
}

/** One reminder time in a row of three: the time, its name, and a check when it is chosen. */
export function TimeChoice({
  time,
  label,
  selected,
  onPress,
}: {
  time: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ink = selected ? theme.colors.onPrimary : theme.colors.text;
  return (
    <View style={{ flex: 1 }}>
      <PressScale
        onPress={onPress}
        scaleTo={0.94}
        accessibilityRole="radio"
        accessibilityLabel={`${label}, ${time}`}
        accessibilityState={{ selected, checked: selected }}
        style={{
          minHeight: 60,
          borderRadius: theme.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          paddingHorizontal: theme.spacing.xs,
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderWidth: 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        }}
      >
        <Text
          style={{
            color: ink,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {time}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {selected ? <Ionicons name="checkmark" size={14} color={ink} /> : null}
          <Text
            style={{
              color: selected ? theme.colors.onPrimary : theme.colors.textMuted,
              fontSize: theme.font.size.caption,
            }}
          >
            {label}
          </Text>
        </View>
      </PressScale>
    </View>
  );
}

/** A short status line with an icon: a confirmation, or what to do when something is off. */
export function StatusNote({
  tone,
  title,
  text,
}: {
  tone: "done" | "off" | "problem";
  title: string;
  text?: string;
}) {
  const theme = useTheme();
  const color =
    tone === "done"
      ? theme.colors.success
      : tone === "problem"
        ? theme.colors.danger
        : theme.colors.textMuted;
  return (
    <View
      accessibilityRole={tone === "problem" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Ionicons
        name={
          tone === "done"
            ? "checkmark-circle"
            : tone === "problem"
              ? "alert-circle-outline"
              : "notifications-off-outline"
        }
        size={24}
        color={color}
      />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {title}
        </Text>
        {text ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              lineHeight: theme.font.size.caption * 1.4,
            }}
          >
            {text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
