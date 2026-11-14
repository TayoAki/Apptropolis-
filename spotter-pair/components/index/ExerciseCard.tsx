import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { count, formatWeight, type Exercise, type SetLog } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { Appear, PressScale } from "../motion";

export interface Draft {
  weight: number;
  reps: number;
}

const WEIGHT_STEP = 5;

/** "185 lb × 8 reps", or "Bodyweight × 10 reps". */
export function setLabel(weight: number, reps: number): string {
  return `${formatWeight(weight)} × ${count(reps, "rep")}`;
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
  // Hold to keep stepping, like a native stepper: a tap is one step, a hold repeats it.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef(onPress);
  press.current = onPress;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const repeat = () => {
    press.current();
    timer.current = setTimeout(repeat, 90);
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={repeat}
      delayLongPress={400}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.textMuted,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text} />
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
  // One full-width row per value: the name on the left, then minus, the value and plus. The
  // value's width is fixed so the buttons don't move as the number changes ("Bodyweight" fits).
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <Text
        style={{
          flex: 1,
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
        }}
      >
        {label}
      </Text>
      <StepButton icon="remove" label={`Decrease ${label.toLowerCase()}`} onPress={onDecrease} />
      <Text
        accessibilityLiveRegion="polite"
        numberOfLines={1}
        style={{
          width: 104,
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
  );
}

export function ExerciseCard({
  exercise,
  logged,
  target,
  active,
  locked,
  targetReps,
  draft,
  onSelect,
  onStep,
  onLog,
  onUndo,
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
  /** The reps each set is planned for (from the goal). */
  targetReps: number;
  /** The values the next set will be logged with. */
  draft: Draft;
  onSelect: () => void;
  onStep: (field: "weight" | "reps", delta: number) => void;
  onLog: () => void;
  /** Takes back the last logged set. */
  onUndo: () => void;
}) {
  const theme = useTheme();
  const done = logged.length >= target;
  const pending = Math.max(0, target - logged.length);
  // A finished exercise can still be opened (to take back its last set); a locked one can't.
  const open = active && !locked;
  const tappable = !open && !locked;
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
          {open && !done ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {`${count(target, "set")} of ${targetReps}. ${exercise.cue}`}
            </Text>
          ) : null}
          {!open && !done ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {`${count(pending, "set")} of ${targetReps} pending`}
            </Text>
          ) : null}
          {done ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {`${count(logged.length, "set")} logged`}
            </Text>
          ) : null}
        </View>
        {done ? <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} /> : null}
      </View>

      {open ? (
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
          {logged.map((set, index) => (
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
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                {index === logged.length - 1 ? (
                  // Only the newest set can be taken back, so the numbering never has a gap.
                  <Pressable
                    onPress={onUndo}
                    accessibilityRole="button"
                    accessibilityLabel={`Undo set ${set.setNumber} of ${exercise.name}`}
                    hitSlop={12}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      Undo
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: theme.colors.success,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    Done
                  </Text>
                )}
              </View>
            </Appear>
          ))}

          {done ? null : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Text
                  style={{
                    width: 52,
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.body,
                  }}
                >
                  {`Set ${logged.length + 1}`}
                </Text>
                <Text
                  style={{ flex: 1, color: theme.colors.textMuted, fontSize: theme.font.size.body }}
                >
                  Up next
                </Text>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <Stepper
                  label="Weight"
                  value={formatWeight(draft.weight)}
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

              {/* The wrapper stretches so the button fills the card: set the values, then log. */}
              <View style={{ marginTop: theme.spacing.xs }}>
                <PressScale
                  onPress={onLog}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={`Log set ${logged.length + 1} of ${exercise.name}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.xs,
                    minHeight: 48,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Ionicons name="add" size={20} color={theme.colors.primary} />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {`Log set ${logged.length + 1}`}
                  </Text>
                </PressScale>
              </View>
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}
