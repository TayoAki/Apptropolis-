import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { count, dayLabel, type Exercise, type Workout } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { CountUp, Mascot, PressScale, haptic } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Title, the Regenerate (PRO) pill and the app's mascot overlapping its top edge. */
export function PlanHeader({
  isPremium,
  pose,
  busy,
  onRegenerate,
}: {
  isPremium: boolean;
  pose: string;
  busy: boolean;
  onRegenerate: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingTop: theme.spacing.md }}>
      {/* Rendered first so the pill sits on top of the mascot and keeps its taps. */}
      <Mascot pose={pose} size={80} style={{ position: "absolute", top: -30, right: -4 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.display,
            fontWeight: theme.font.weight.bold,
          }}
        >
          My Plan
        </Text>
        <PressScale
          onPress={onRegenerate}
          disabled={busy}
          haptic="light"
          scaleTo={0.94}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={isPremium ? "Regenerate plan" : "Regenerate plan, premium feature"}
          accessibilityState={{ disabled: busy }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
            opacity: busy ? 0.6 : 1,
            shadowColor: theme.colors.primary,
            shadowOpacity: 0.55,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        >
          <Ionicons
            name={isPremium ? "refresh" : "lock-closed"}
            size={16}
            color={theme.colors.primary}
          />
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {isPremium ? "Regenerate plan" : "Regenerate Plan (PRO)"}
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

export function SplitBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text
        style={{
          color: theme.colors.primary,
          fontSize: theme.font.size.body,
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

/** "4 Exercises • 12 Sets • Est. 45 Mins" for the selected day. */
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
  const bullet = <Text style={{ color: theme.colors.textMuted }}>•</Text>;
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: theme.spacing.sm,
        }}
      >
        <Stat icon="barbell-outline">
          <CountUp
            value={exercises}
            format={(n) => count(n, "Exercise", "Exercises")}
            style={text}
          />
        </Stat>
        {bullet}
        <Stat icon="layers-outline">
          <CountUp value={sets} format={(n) => count(n, "Set", "Sets")} style={text} />
        </Stat>
        {bullet}
        <Stat icon="timer-outline">
          <CountUp value={minutes} format={(n) => `Est. ${Math.round(n)} Mins`} style={text} />
        </Stat>
      </View>
    </Card>
  );
}

function groupLabel(group: string): string {
  return group.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** One exercise of the day: name, muscle-group tag, swap (when there's an alternative), grip. */
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
    <Card>
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
              backgroundColor: `${theme.colors.primary}26`,
            }}
          >
            <Text
              style={{
                color: theme.colors.primary,
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
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="swap-horizontal" size={22} color={theme.colors.primary} />
          </Pressable>
        ) : null}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ width: 9, flexDirection: "row", flexWrap: "wrap", gap: 3 }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.colors.textMuted,
              }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

/** Past sessions and the note on how their score stays fair. */
export function HistoryCard({ past }: { past: Workout[] }) {
  const theme = useTheme();
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        Workout History
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          lineHeight: 22,
          marginTop: theme.spacing.xs,
        }}
      >
        Score updates automatically if past sessions are modified to ensure fair accountability.{" "}
        <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
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
