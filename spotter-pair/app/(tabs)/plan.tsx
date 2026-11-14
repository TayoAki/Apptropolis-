import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { Appear, Skeleton, SkeletonList, Stagger, haptic } from "../../components/motion";
import { PlanPreview } from "../../components/onboarding/Parts";
import { openPaywallFrom } from "../../components/paywall/open";
import {
  DayChips,
  ExerciseCard,
  HistoryCard,
  PlanHeader,
  RegenerateButton,
  SplitBadge,
  SummaryCard,
  type DayChipData,
} from "../../components/plan/parts";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import {
  EQUIPMENT_INFO,
  EQUIPMENT_OPTIONS,
  SETS_PER_EXERCISE,
  nextSessionDate,
  weekdayIndex,
  type EquipmentChoice,
} from "../../data/plan";
import { usePlanner } from "../../data/planner";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  dayLabel,
  parseDayKey,
  weekDays,
  weekdayShort,
  type Exercise,
  type SetLog,
  type Workout,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const WARMUP_MINUTES = 5;
const MINUTES_PER_EXERCISE = 10;

export default function PlanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const planner = usePlanner();
  const { items: workouts, update } = planner.workouts;
  const { items: sets } = useCollection<SetLog>("set_logs");
  const { resetOnboarding } = useAppState();
  const { isPremium } = usePurchases();
  const { template, catalog, today, loading } = planner;

  const [selected, setSelected] = useState(today);
  const [generating, setGenerating] = useState(false);
  const [justBuilt, setJustBuilt] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // A new day: a selection that was sitting on "today" moves with it.
  const lastToday = useRef(today);
  useEffect(() => {
    if (lastToday.current === today) return;
    setSelected((current) => (current === lastToday.current ? today : current));
    lastToday.current = today;
  }, [today]);

  const now = parseDayKey(today);
  const week = weekDays(now);
  const catalogById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const names = useMemo(() => new Map(catalog.map((e) => [e.id, e.name] as const)), [catalog]);
  const live = useMemo(() => workouts.filter((w) => !w.deleted), [workouts]);
  const byDate = (key: string) => live.find((w) => w.date === key);

  const selectedWorkout = byDate(selected);
  const exercises = (selectedWorkout?.exercises ?? [])
    .map((id) => catalogById.get(id))
    .filter((e): e is Exercise => Boolean(e));
  const nextSession = template ? nextSessionDate(template, now) : null;

  const past = useMemo(
    () =>
      live
        .filter((w) => w.date < today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [live, today],
  );

  const dayChips: DayChipData[] = week.map((key) => {
    const w = byDate(key);
    return {
      key,
      day: weekdayShort(key),
      focus: w ? w.title.split(" ")[0] || "Train" : "Rest",
      trained: Boolean(w && w.exercises.length),
    };
  });

  // A session can change until it is finished or its day has passed.
  const editable = Boolean(selectedWorkout && !selectedWorkout.completed && selected >= today);

  /**
   * The next lift for the same muscle group that the plan's equipment allows and the session
   * doesn't already have. Swapping again steps on through the catalog, so every option comes up.
   */
  function alternativeFor(workout: Workout | undefined, exercise: Exercise): Exercise | null {
    if (!workout) return null;
    const choice = (EQUIPMENT_OPTIONS as readonly string[]).includes(template?.equipment ?? "")
      ? (template!.equipment as EquipmentChoice)
      : null;
    const allowed = choice ? EQUIPMENT_INFO[choice].allowed : null;
    const inSession = new Set(workout.exercises);
    const position = catalog.findIndex((e) => e.id === exercise.id);
    const options = catalog
      .map((e, index) => ({ e, index }))
      .filter(
        ({ e }) =>
          e.group === exercise.group &&
          e.id !== exercise.id &&
          !inSession.has(e.id) &&
          (!allowed || allowed.includes(e.equipment)),
      );
    return (options.find(({ index }) => index > position) ?? options[0])?.e ?? null;
  }

  async function swap(workout: Workout, exercise: Exercise, next: Exercise) {
    haptic("selection");
    setPlanError(null);
    try {
      await update(workout.id, {
        exercises: workout.exercises.map((id) => (id === exercise.id ? next.id : id)),
      });
      // The swap holds for the weeks to come, not only this session.
      await planner.swapInTemplate(weekdayIndex(parseDayKey(workout.date)), exercise.id, next.id);
      track("exercise_swapped", { group: exercise.group });
    } catch {
      setPlanError("That swap didn't save. Try again.");
    }
  }

  /** Pro: the same answers, a different mix of lifts, from today on. */
  async function regenerate() {
    if (generating) return;
    setGenerating(true);
    setPlanError(null);
    try {
      const plan = await planner.regenerate();
      if (!plan) throw new Error("no plan");
      haptic("success");
      setJustBuilt(true);
      setTimeout(() => setJustBuilt(false), 2600);
      track("plan_regenerated", { days: plan.days.length, from: "plan" });
    } catch {
      setPlanError("The plan couldn't be rebuilt. Your current plan is unchanged: try again.");
    } finally {
      setGenerating(false);
    }
  }

  const pose = justBuilt
    ? "rocco-fist-bump-spotter"
    : !isPremium
      ? "rocco-vault-guardian"
      : "rocco-neutral-ready";

  const onRegenerate = () => {
    if (isPremium) void regenerate();
    else openPaywallFrom("plan_regenerate");
  };

  const header = (
    <View style={{ paddingBottom: theme.spacing.md }}>
      <Stagger step={70} style={{ gap: theme.spacing.lg }}>
        <PlanHeader pose={pose} />
        {template ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <SplitBadge label={template.split} />
            <RegenerateButton isPremium={isPremium} busy={generating} onPress={onRegenerate} />
          </View>
        ) : null}
        {loading ? (
          <Skeleton height={64} radius={theme.radius.pill} />
        ) : template ? (
          <DayChips days={dayChips} selected={selected} onSelect={setSelected} />
        ) : null}
        {loading ? (
          <Skeleton height={76} radius={theme.radius.lg} />
        ) : selectedWorkout ? (
          <SummaryCard
            exercises={exercises.length}
            sets={exercises.length * SETS_PER_EXERCISE}
            minutes={
              exercises.length ? WARMUP_MINUTES + exercises.length * MINUTES_PER_EXERCISE : 0
            }
          />
        ) : null}
        {planError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: theme.colors.danger,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            {planError}
          </Text>
        ) : null}
      </Stagger>
    </View>
  );

  function emptyContent() {
    if (loading || generating) return <SkeletonList rows={3} />;
    if (!template) {
      // Setup was skipped: the three questions build the plan, and earlier answers are kept.
      return (
        <EmptyState
          icon="barbell-outline"
          title="No plan yet"
          body="Answer three questions (your goal, your training days and your equipment) and this week is laid out with every lift chosen."
          actionLabel="Set up my plan"
          onAction={() => void resetOnboarding()}
        />
      );
    }
    return (
      <View style={{ gap: theme.spacing.lg }}>
        <EmptyState
          icon="moon-outline"
          title="Rest day"
          body={
            nextSession
              ? `Nothing is scheduled for this day. Your next session is ${dayLabel(nextSession, now)}.`
              : "Nothing is scheduled for this day."
          }
        />
        {/* The whole week on a rest day, so the plan is in view before its first session too. */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Every week
          </Text>
          <PlanPreview days={template.days} names={names} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      data={loading || generating ? [] : exercises}
      keyExtractor={(exercise) => exercise.id}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyContent}
      ListFooterComponent={
        loading || !template ? undefined : (
          <View style={{ marginTop: theme.spacing.xl }}>
            <HistoryCard past={past} />
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
      renderItem={({ item, index }) => {
        // A lift with sets already logged today stays: swapping it would orphan those sets.
        const logged =
          selectedWorkout !== undefined &&
          sets.some((s) => s.workoutId === selectedWorkout.id && s.exercise === item.id);
        const alternative = editable && !logged ? alternativeFor(selectedWorkout, item) : null;
        return (
          <Appear delay={Math.min(index, 8) * 50}>
            <ExerciseCard
              exercise={item}
              swapTo={alternative}
              onSwap={
                alternative && selectedWorkout
                  ? () => void swap(selectedWorkout, item, alternative)
                  : undefined
              }
            />
          </Appear>
        );
      }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
