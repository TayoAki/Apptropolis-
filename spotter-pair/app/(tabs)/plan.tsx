import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { track } from "../../data/analytics";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  dayKey,
  weekDays,
  weekdayShort,
  type Exercise,
  type Workout,
} from "../../data/schema";
import { EmptyState } from "../../components/EmptyState";
import { Appear, Skeleton, SkeletonList, Stagger, haptic } from "../../components/motion";
import {
  DayChips,
  ExerciseCard,
  HistoryCard,
  PlanHeader,
  SplitBadge,
  SummaryCard,
  type DayChipData,
} from "../../components/plan/parts";

const SETS_PER_EXERCISE = 3;
const WARMUP_MINUTES = 5;
const MINUTES_PER_EXERCISE = 10;
const MAX_EXERCISES_PER_DAY = 6;

interface PlanDay {
  weekday: number;
  title: string;
  exercises: string[];
}

interface GeneratedPlan {
  split: string;
  days: PlanDay[];
}

/** Checks the AI's JSON against the catalog so only real exercises reach the plan. */
function parsePlan(text: string, ids: Set<string>): GeneratedPlan | null {
  try {
    const raw = JSON.parse(text) as { split?: unknown; days?: unknown };
    if (!Array.isArray(raw.days)) return null;
    const days: PlanDay[] = [];
    for (const entry of raw.days as unknown[]) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const weekday = typeof e.weekday === "number" ? Math.trunc(e.weekday) : -1;
      if (weekday < 0 || weekday > 6 || !Array.isArray(e.exercises)) continue;
      const exercises = (e.exercises as unknown[])
        .filter((id): id is string => typeof id === "string" && ids.has(id))
        .slice(0, MAX_EXERCISES_PER_DAY);
      const title =
        typeof e.title === "string" && e.title.trim() ? e.title.trim().slice(0, 40) : "Training";
      days.push({ weekday, title, exercises });
    }
    if (days.length === 0) return null;
    const trainingDays = days.filter((d) => d.exercises.length > 0).length;
    const split =
      typeof raw.split === "string" && raw.split.trim()
        ? raw.split.trim().slice(0, 60)
        : `${trainingDays}-Day Split`;
    return { split, days };
  } catch {
    return null;
  }
}

export default function PlanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    items: workouts,
    loading: workoutsLoading,
    add,
    update,
  } = useCollection<Workout>("workouts");
  const { items: catalog, loading: catalogLoading } = useCollection<Exercise>("exercises");
  const { answers, setAnswer } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const { ask, loading: generating, error: aiError } = useAI();

  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [justBuilt, setJustBuilt] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const loading = workoutsLoading || catalogLoading;
  const today = dayKey(new Date());
  const week = weekDays(new Date());

  const catalogById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const live = useMemo(() => workouts.filter((w) => !w.deleted), [workouts]);
  const byDate = (key: string) => live.find((w) => w.date === key);

  const selectedWorkout = byDate(selected);
  const exercises = (selectedWorkout?.exercises ?? [])
    .map((id) => catalogById.get(id))
    .filter((e): e is Exercise => Boolean(e));

  const weekWorkouts = live.filter((w) => week.includes(w.date));
  const split = answers["split"] || (weekWorkouts.length ? `${weekWorkouts.length}-Day Split` : "");

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

  /** A same-muscle exercise not already in the session, same equipment first. */
  function alternativeFor(workout: Workout | undefined, exercise: Exercise): Exercise | null {
    if (!workout) return null;
    const inPlan = new Set(workout.exercises);
    const options = catalog
      .filter((e) => e.group === exercise.group && e.id !== exercise.id && !inPlan.has(e.id))
      .sort(
        (a, b) =>
          Number(b.equipment === exercise.equipment) - Number(a.equipment === exercise.equipment),
      );
    return options[0] ?? null;
  }

  async function swap(workout: Workout, exercise: Exercise, next: Exercise) {
    haptic("selection");
    await update(workout.id, {
      exercises: workout.exercises.map((id) => (id === exercise.id ? next.id : id)),
    });
    track("exercise_swapped", { group: exercise.group });
  }

  /**
   * Builds the week with the AI. Today and later sessions are rewritten; past days and
   * completed sessions are left alone so the history stays fair.
   */
  async function buildPlan(source: "build" | "regenerate") {
    if (generating) return;
    setPlanError(null);
    const about =
      Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n") || "No onboarding answers yet: a general strength plan for two people training together.";
    const menu = catalog
      .map((e) => `${e.id} | ${e.name} | ${e.group} | ${e.equipment} | ${e.level}`)
      .join("\n");
    const text = await ask({
      instructions: "You write weekly strength training plans. Reply with JSON only, no commentary.",
      prompt: `Build a 7-day plan for this person. Weekday 0 is Monday and 6 is Sunday.\n\nAbout them:\n${about}\n\nExercise catalog (use only these ids, formatted id | name | muscle group | equipment | level):\n${menu}\n\nReturn JSON exactly like {"split": "4-Day Hypertrophy Split", "days": [{"weekday": 0, "title": "Upper Body A", "exercises": ["bench-press", "lat-pulldown"]}]}. Train 3 to 5 days with 3 to 6 exercises each, and leave rest days out of "days".`,
      json: true,
    });
    if (!text) return;
    const plan = parsePlan(text, new Set(catalog.map((e) => e.id)));
    if (!plan) {
      setPlanError("The plan came back in an unexpected shape. Try again.");
      return;
    }

    for (let index = 0; index < week.length; index++) {
      const date = week[index]!;
      if (date < today) continue;
      const existing = byDate(date);
      if (existing?.completed) continue;
      const planned = plan.days.find((d) => d.weekday === index && d.exercises.length > 0);
      if (!planned) {
        if (existing) await update(existing.id, { deleted: true });
        continue;
      }
      if (existing) {
        await update(existing.id, { title: planned.title, exercises: planned.exercises });
      } else {
        await add({
          date,
          title: planned.title,
          exercises: planned.exercises,
          completed: false,
          completedAt: null,
          deleted: false,
        });
      }
    }

    await setAnswer("split", plan.split);
    haptic("success");
    setJustBuilt(true);
    setTimeout(() => setJustBuilt(false), 2600);
    track(source === "regenerate" ? "plan_regenerated" : "plan_built", {
      days: plan.days.length,
    });
  }

  const pose = justBuilt
    ? "rocco-fist-bump-spotter"
    : !isPremium
      ? "rocco-vault-guardian"
      : "rocco-neutral-ready";

  const onRegenerate = () => {
    if (isPremium) void buildPlan("regenerate");
    else openPaywall();
  };

  const header = (
    <View style={{ paddingBottom: theme.spacing.md }}>
      <Stagger step={70} style={{ gap: theme.spacing.lg }}>
        <PlanHeader isPremium={isPremium} pose={pose} busy={generating} onRegenerate={onRegenerate} />
        {split ? <SplitBadge label={split} /> : null}
        {loading ? (
          <Skeleton height={64} radius={theme.radius.pill} />
        ) : (
          <DayChips days={dayChips} selected={selected} onSelect={setSelected} />
        )}
        {loading ? (
          <Skeleton height={76} radius={theme.radius.lg} />
        ) : selectedWorkout ? (
          <SummaryCard
            exercises={exercises.length}
            sets={exercises.length * SETS_PER_EXERCISE}
            minutes={exercises.length ? WARMUP_MINUTES + exercises.length * MINUTES_PER_EXERCISE : 0}
          />
        ) : null}
        {planError || aiError ? (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            {planError ?? aiError}
          </Text>
        ) : null}
      </Stagger>
    </View>
  );

  function emptyContent() {
    if (loading || generating) return <SkeletonList rows={3} />;
    if (live.length === 0) {
      return (
        <EmptyState
          icon="barbell-outline"
          title="No plan yet"
          body="Build a week of training from your goals and the equipment you have."
          actionLabel="Build my plan"
          onAction={() => void buildPlan("build")}
        />
      );
    }
    if (!selectedWorkout) {
      return (
        <EmptyState
          icon="moon-outline"
          title="Rest day"
          body="Nothing is scheduled for this day. Pick a training day above to see its exercises."
        />
      );
    }
    return (
      <EmptyState
        icon="add-circle-outline"
        title="Nothing planned"
        body="This session has no exercises yet. Build the plan again to fill it in."
        actionLabel="Build my plan"
        onAction={() => void buildPlan("build")}
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      data={loading ? [] : exercises}
      keyExtractor={(exercise) => exercise.id}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyContent}
      ListFooterComponent={
        loading ? null : (
          <View style={{ marginTop: theme.spacing.md }}>
            <HistoryCard past={past} />
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
      renderItem={({ item, index }) => {
        const alternative = alternativeFor(selectedWorkout, item);
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
        paddingTop: insets.top + theme.spacing.lg,
        paddingBottom: insets.bottom + 96,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
