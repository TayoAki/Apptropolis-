// The plan in storage: the saved template (the "plan" answer) and the week's sessions it lays out
// (the workouts collection). Screens build, regenerate and read the plan through usePlanner(),
// which also lays out each new week from the template the first time the app is opened in it.
import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "./app-state";
import { useToday } from "./clock";
import {
  MAX_TRAINING_DAYS,
  MIN_TRAINING_DAYS,
  buildPlan,
  defaultTrainingDays,
  parsePlanTemplate,
  parseTrainingDays,
  sessionsForWeek,
  type PlanTemplate,
} from "./plan";
import { useCollection } from "./repo";
import { dayKey, weekDays, type Exercise, type SetLog, type Workout } from "./schema";

/** The training days the answers describe: the picked weekdays, or the usual ones for a count. */
export function trainingDaysFrom(answers: Record<string, string>): number[] {
  const picked = parseTrainingDays(answers.training_days);
  if (picked.length >= MIN_TRAINING_DAYS && picked.length <= MAX_TRAINING_DAYS) return picked;
  const count = parseInt(answers.daysperweek ?? "", 10);
  return defaultTrainingDays(Number.isFinite(count) ? count : 3);
}

export function usePlanner() {
  const workouts = useCollection<Workout>("workouts");
  const sets = useCollection<SetLog>("set_logs");
  const catalog = useCollection<Exercise>("exercises");
  const { ready, answers, setAnswer } = useAppState();
  const today = useToday();
  const template = useMemo(() => parsePlanTemplate(answers.plan), [answers.plan]);
  const loading = !ready || workouts.loading || sets.loading || catalog.loading;
  const rolling = useRef(false);

  /**
   * Lays the plan's sessions into the current week, from `from` on (the whole week without it).
   * Finished sessions are never touched, and neither is a session under way today (one with
   * sets already logged); a day the plan no longer trains has its unfinished session removed.
   */
  async function writeWeek(plan: PlanTemplate, from?: string): Promise<void> {
    const now = new Date();
    const live = workouts.items.filter((w) => !w.deleted);
    const planned = new Map(sessionsForWeek(plan, now).map((s) => [s.date, s] as const));
    for (const date of weekDays(now)) {
      if (from && date < from) continue;
      const existing = live.find((w) => w.date === date);
      if (existing?.completed) continue;
      if (existing && date === dayKey(now) && sets.items.some((s) => s.workoutId === existing.id))
        continue;
      const session = planned.get(date);
      if (!session) {
        if (existing) await workouts.add({ ...existing, deleted: true });
        continue;
      }
      // One record per date (the id is the date), so writing a week twice can't duplicate it.
      await workouts.add({
        id: existing?.id ?? `plan-${date}`,
        date,
        title: session.title,
        exercises: session.exercises,
        completed: false,
        completedAt: null,
        deleted: false,
      });
    }
  }

  /**
   * Builds the plan from the saved answers (or the ones passed in), saves it, and lays out the
   * rest of this week. Resolves null when no plan can be built (the catalog hasn't loaded).
   */
  async function build(input?: {
    goal?: string;
    days?: number[];
    equipment?: string;
    variant?: number;
  }): Promise<PlanTemplate | null> {
    const days = input?.days ?? trainingDaysFrom(answers);
    const plan = buildPlan({
      goal: input?.goal ?? answers.goal,
      days,
      equipment: input?.equipment ?? answers.equipment,
      catalog: catalog.items,
      variant: input?.variant ?? (Number(answers.plan_variant) || 0),
    });
    if (!plan) return null;
    await setAnswer("plan", JSON.stringify(plan));
    await setAnswer("training_days", plan.days.map((day) => day.weekday).join(","));
    await setAnswer("daysperweek", `${plan.days.length} days`);
    await writeWeek(plan, dayKey(new Date()));
    return plan;
  }

  /** The same answers, a different mix of lifts. */
  async function regenerate(): Promise<PlanTemplate | null> {
    const variant = (Number(answers.plan_variant) || 0) + 1;
    const plan = await build({ variant });
    if (plan) await setAnswer("plan_variant", String(variant));
    return plan;
  }

  /** Keeps a swap for the weeks to come: the template's session for that weekday changes too. */
  async function swapInTemplate(weekday: number, from: string, to: string): Promise<void> {
    if (!template) return;
    const days = template.days.map((day) =>
      day.weekday === weekday
        ? { ...day, exercises: day.exercises.map((id) => (id === from ? to : id)) }
        : day,
    );
    await setAnswer("plan", JSON.stringify({ ...template, days }));
  }

  // A new week starts empty: lay it out from the template the first time the app is open in it.
  // A plan that was already running gets its whole week (sessions before today stay unfinished,
  // which is what happened); a plan built this week only gets the days from today on.
  useEffect(() => {
    if (loading || !template || rolling.current) return;
    const week = weekDays(new Date());
    const live = workouts.items.filter((w) => !w.deleted);
    if (live.some((w) => week.includes(w.date))) return;
    const ranBefore = live.some((w) => w.date < week[0]!);
    if (!ranBefore && sessionsForWeek(template, new Date(), today).length === 0) return;
    rolling.current = true;
    void writeWeek(template, ranBefore ? undefined : today).finally(() => {
      rolling.current = false;
    });
    // writeWeek reads the same collections this effect already watches.
  }, [loading, template, workouts.items, today]);

  return {
    /** The saved plan, or null before one is built. */
    template,
    /** False once the answers, the workouts and the catalog have loaded. */
    loading,
    today,
    workouts,
    catalog: catalog.items,
    build,
    regenerate,
    swapInTemplate,
  };
}
