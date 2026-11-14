import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { count, formatNumber, type Exercise, type SetLog } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { Appear, PressScale } from "../motion";

export interface Draft {
  weight: number;
  reps: number;
}

const WEIGHT_STEP = 5;

/** "185 lbs × 8 reps", or "Bodyweight × 10 reps". */
export function setLabel(weight: number, reps: number): string {
  const load = weight === 0 ? "Bodyweight" : `${formatNumber(weight)} lbs`;
  return `${load} × ${count(reps, "rep")}`;
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: "add" | "remove";
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={theme.colors.text} />
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: theme.spacing.xs }}>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <StepButton icon="remove" label={`Decrease ${label.toLowerCase()}`} onPress={onDecrease} />
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value}
        </Text>
        <StepButton icon="add" label={`Increase ${label.toLowerCase()}`} onPress={onIncrease} />
      </View>
    </View>
  );
}

export function ExerciseCard({
  exercise,
  logged,
  target,
  active,
  locked,
  draft,
  onSelect,
  onStep,
  onLog,
}: {
  exercise: Exercise;
  /** This exercise's logged sets today, in order. */
  logged: SetLog[];
  /** Sets planned for the exercise. */
  target: number;
  /** This is the exercise being logged right now (expanded). */
  active: boolean;
  /** The workout is complete, so sets are locked. */
  locked: boolean;
  /** The values the next set will be logged with. */
  draft: Draft;
  onSelect: () => void;
  onStep: (field: "weight" | "reps", delta: number) => void;
  onLog: () => void;
}) {
  const theme = useTheme();
  const done = logged.length >= target;
  const pending = Math.max(0, target - logged.length);
  const open = active && !done && !locked;
  const tappable = !open && !done && !locked;
  const label = `${exercise.name}, ${done ? "done" : `${count(pending, "set")} pending`}`;

  return (
    <Card
      label={label}
      onPress={tappable ? onSelect : undefined}
      style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {exercise.name}
          </Text>
          {open ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {exercise.cue}
            </Text>
          ) : null}
          {!open && !done ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {`${count(pending, "set")} pending`}
            </Text>
          ) : null}
          {done ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {`${count(logged.length, "set")} logged`}
            </Text>
          ) : null}
        </View>
        {done ? (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
        ) : null}
      </View>

      {open ? (
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
          {logged.map((set) => (
            <Appear key={set.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Text
                  style={{
                    width: 52,
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.body,
                  }}
                >
                  {`Set ${set.setNumber}`}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {setLabel(set.weight, set.reps)}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  Done
                </Text>
              </View>
            </Appear>
          ))}

          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Text
              style={{ width: 52, color: theme.colors.textMuted, fontSize: theme.font.size.body }}
            >
              {`Set ${logged.length + 1}`}
            </Text>
            <Text style={{ flex: 1, color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              Up next
            </Text>
            <PressScale
              onPress={onLog}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel={`Log set ${logged.length + 1} of ${exercise.name}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                minHeight: 44,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="add" size={18} color={theme.colors.text} />
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Log Set
              </Text>
            </PressScale>
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.xs }}>
            <Stepper
              label="Weight"
              value={draft.weight === 0 ? "Bodyweight" : `${formatNumber(draft.weight)} lbs`}
              onDecrease={() => onStep("weight", -WEIGHT_STEP)}
              onIncrease={() => onStep("weight", WEIGHT_STEP)}
            />
            <Stepper
              label="Reps"
              value={count(draft.reps, "rep")}
              onDecrease={() => onStep("reps", -1)}
              onIncrease={() => onStep("reps", 1)}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
