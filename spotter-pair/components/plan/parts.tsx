import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { count, dayLabel, type Exercise, type Workout } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { CountUp, PressScale, haptic } from "../motion";
import { Rocco } from "../Rocco";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The screen's title beside the mascot, the same header the other tabs use. */
export function PlanHeader({ pose }: { pose: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.font.size.display,
          fontWeight: theme.font.weight.bold,
          lineHeight: 38,
        }}
      >
        My Plan
      </Text>
      <Rocco pose={pose} size={96} />
    </View>
  );
}

/** The outlined "Regenerate plan" action. Without Pro it carries a lock and opens the paywall. */
export function RegenerateButton({
  isPremium,
  busy,
  onPress,
}: {
  isPremium: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  // While a plan is being built the button goes neutral (never faded) and says what is happening.
  const ink = busy ? theme.colors.textMuted : theme.colors.primary;
  return (
    <PressScale
      onPress={onPress}
      disabled={busy}
      haptic="light"
      scaleTo={0.94}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={isPremium ? "Regenerate plan" : "Regenerate plan, a Pro feature"}
      accessibilityState={{ disabled: busy, busy }}
      aria-busy={busy}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: ink,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Ionicons
        name={busy ? "hourglass-outline" : isPremium ? "refresh" : "lock-closed"}
        size={16}
        color={ink}
      />
      <Text
        numberOfLines={1}
        style={{
          color: ink,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {busy ? "Rebuilding your plan…" : isPremium ? "Regenerate plan" : "Regenerate plan (Pro)"}
      </Text>
    </PressScale>
  );
}

/** The name of the split, as a quiet tag (it is a fact about the plan, not a button). */
export function SplitBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexShrink: 1,
        minHeight: 32,
        justifyContent: "center",
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export interface DayChipData {
  key: string;
  day: string;
  focus: string;
  trained: boolean;
}

/** Seven day chips across the week; the selected one has an orange ring and a dot. */
export function DayChips({
  days,
  selected,
  onSelect,
}: {
  days: DayChipData[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6, paddingBottom: theme.spacing.md }}>
      {days.map((day) => {
        const active = day.key === selected;
        return (
          <Pressable
            key={day.key}
            onPress={() => {
              if (!active) haptic("selection");
              onSelect(day.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${day.day}, ${day.focus}`}
            accessibilityState={{ selected: active }}
            aria-selected={active}
            hitSlop={6}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 64,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: 2,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surface,
              borderWidth: active ? 1.5 : 1,
              borderColor: active ? theme.colors.primary : theme.colors.border,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: active
                  ? theme.colors.primary
                  : day.trained
                    ? theme.colors.text
                    : theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontWeight: active ? theme.font.weight.bold : theme.font.weight.medium,
              }}
            >
              {day.day}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: active ? theme.colors.primary : theme.colors.textMuted,
                fontSize: theme.font.size.caption,
              }}
            >
              {day.focus}
            </Text>
            {active ? (
              <View
                style={{
                  position: "absolute",
                  bottom: -9,
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Stat({ icon, children }: { icon: IconName; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      {children}
    </View>
  );
}

/** "4 exercises, 12 sets, Est. 45 min" for the selected day, spread across one row. */
export function SummaryCard({
  exercises,
  sets,
  minutes,
}: {
  exercises: number;
  sets: number;
  minutes: number;
}) {
  const theme = useTheme();
  const text = {
    color: theme.colors.text,
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.medium,
  } as const;
  return (
    <Card style={{ paddingHorizontal: theme.spacing.lg }}>
      <View
        accessible
        accessibilityLabel={`${count(exercises, "exercise")}, ${count(sets, "set")}, about ${minutes} minutes`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          columnGap: theme.spacing.md,
          rowGap: theme.spacing.sm,
        }}
      >
        <Stat icon="barbell-outline">
          <CountUp
            value={exercises}
            format={(n) => count(Math.round(n), "exercise")}
            style={text}
          />
        </Stat>
        <Stat icon="layers-outline">
          <CountUp value={sets} format={(n) => count(Math.round(n), "set")} style={text} />
        </Stat>
        <Stat icon="timer-outline">
          <CountUp value={minutes} format={(n) => `Est. ${Math.round(n)} min`} style={text} />
        </Stat>
      </View>
    </Card>
  );
}

function groupLabel(group: string): string {
  return group.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** One exercise of the day: name, muscle-group tag, and swap when there's an alternative. */
export function ExerciseCard({
  exercise,
  swapTo,
  onSwap,
}: {
  exercise: Exercise;
  swapTo: Exercise | null;
  onSwap?: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={{ paddingHorizontal: theme.spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {exercise.name}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 3,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {groupLabel(exercise.group)}
            </Text>
          </View>
        </View>
        {swapTo && onSwap ? (
          <Pressable
            onPress={onSwap}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Swap ${exercise.name} for ${swapTo.name}`}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceAlt,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

/** Past sessions and the note on how their score stays fair. */
export function HistoryCard({ past }: { past: Workout[] }) {
  const theme = useTheme();
  return (
    <Card style={{ padding: theme.spacing.lg }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        Workout history
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          lineHeight: 22,
          marginTop: theme.spacing.xs,
        }}
      >
        A session counts once you mark it complete on its day. Past sessions can't be changed
        afterwards, so each week's score stays fair.
      </Text>
      {past.length ? (
        past.map((w) => (
          <View
            key={w.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <Ionicons
              name={w.completed ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={w.completed ? theme.colors.success : theme.colors.textMuted}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {w.title}
            </Text>
            <Text
              style={{
                color: w.completed ? theme.colors.textMuted : theme.colors.warning,
                fontSize: theme.font.size.caption,
              }}
            >
              {w.completed ? dayLabel(w.date) : `Missed, ${dayLabel(w.date)}`}
            </Text>
          </View>
        ))
      ) : (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            marginTop: theme.spacing.md,
          }}
        >
          Finished sessions show up here, with their dates.
        </Text>
      )}
    </Card>
  );
}
