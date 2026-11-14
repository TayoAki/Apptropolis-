// The week's plan, built on the phone from three answers: the goal, the training days and the
// equipment. Nothing here touches storage or the network, so the same answers always give the
// same plan (a higher `variant` gives a different mix of the same kind of lifts).
import {
  GOAL_OPTIONS,
  addDays,
  dayKey,
  startOfWeek,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "./schema";

export type Goal = (typeof GOAL_OPTIONS)[number];

/** What each goal changes in the plan. The onboarding and Settings show `summary` beside the choice. */
export const GOAL_INFO: Record<Goal, { reps: number; summary: string }> = {
  "Build raw strength": {
    reps: 5,
    summary: "The heaviest lifts your equipment allows, 3 sets of 5",
  },
  "Lose fat & lean out": {
    reps: 12,
    summary: "3 sets of 12 and a full-body finisher each session",
  },
  "Stay consistent": { reps: 8, summary: "Beginner-friendly lifts, 3 sets of 8" },
  "Athletic conditioning": {
    reps: 10,
    summary: "A full-body move opens each session, 3 sets of 10",
  },
};

export const EQUIPMENT_OPTIONS = [
  "Full commercial gym",
  "Home dumbbells",
  "Bodyweight only",
  "Resistance bands",
] as const;
export type EquipmentChoice = (typeof EQUIPMENT_OPTIONS)[number];

export const EQUIPMENT_INFO: Record<EquipmentChoice, { allowed: Equipment[]; summary: string }> = {
  "Full commercial gym": {
    allowed: ["barbell", "machine", "dumbbell", "kettlebell", "bodyweight", "band"],
    summary: "Barbells, machines, dumbbells and kettlebells",
  },
  "Home dumbbells": { allowed: ["dumbbell", "bodyweight"], summary: "Dumbbells and bodyweight" },
  "Bodyweight only": { allowed: ["bodyweight"], summary: "No equipment needed" },
  "Resistance bands": { allowed: ["band", "bodyweight"], summary: "Bands and bodyweight" },
};

export const DEFAULT_GOAL: Goal = "Stay consistent";
export const DEFAULT_EQUIPMENT: EquipmentChoice = "Full commercial gym";
export const MIN_TRAINING_DAYS = 2;
export const MAX_TRAINING_DAYS = 5;
/** Sets planned for every exercise. */
export const SETS_PER_EXERCISE = 3;

/** Weekdays in the order the app's week runs: 0 is Monday, 6 is Sunday. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface PlanDay {
  /** 0 is Monday, 6 is Sunday. */
  weekday: number;
  /** e.g. "Upper Body A". */
  title: string;
  /** Catalog ids, in the order they're done. */
  exercises: string[];
}

/** The plan as it repeats every week, with the answers it was built from. */
export interface PlanTemplate {
  /** e.g. "4-Day Upper/Lower Split". */
  split: string;
  goal: string;
  equipment: string;
  days: PlanDay[];
}

type Slot = MuscleGroup;

const FULL_A: Slot[] = ["legs", "chest", "back", "shoulders", "core"];
const FULL_B: Slot[] = ["legs", "back", "chest", "arms", "core"];
const FULL_C: Slot[] = ["legs", "chest", "back", "full body", "core"];
const UPPER_A: Slot[] = ["chest", "back", "shoulders", "arms"];
const UPPER_B: Slot[] = ["back", "chest", "shoulders", "arms"];
const LOWER_A: Slot[] = ["legs", "legs", "legs", "legs", "core"];
const LOWER_B: Slot[] = ["legs", "legs", "legs", "core"];
const PUSH: Slot[] = ["chest", "chest", "shoulders", "shoulders", "arms"];
const PULL: Slot[] = ["back", "back", "back", "arms", "core"];

/** The sessions for each number of training days, in the order they fall through the week. */
const SPLITS: Record<number, { name: string; about: string; days: Array<[string, Slot[]]> }> = {
  2: {
    name: "2-Day Full Body Split",
    about: "two full-body sessions",
    days: [
      ["Full Body A", FULL_A],
      ["Full Body B", FULL_B],
    ],
  },
  3: {
    name: "3-Day Full Body Split",
    about: "three full-body sessions",
    days: [
      ["Full Body A", FULL_A],
      ["Full Body B", FULL_B],
      ["Full Body C", FULL_C],
    ],
  },
  4: {
    name: "4-Day Upper/Lower Split",
    about: "upper and lower body, each trained twice",
    days: [
      ["Upper Body A", UPPER_A],
      ["Lower Body A", LOWER_A],
      ["Upper Body B", UPPER_B],
      ["Lower Body B", LOWER_B],
    ],
  },
  5: {
    name: "5-Day Push, Pull, Legs Split",
    about: "push, pull and legs, then an upper and a lower day",
    days: [
      ["Push", PUSH],
      ["Pull", PULL],
      ["Legs", LOWER_A],
      ["Upper Body", UPPER_B],
      ["Lower Body", LOWER_B],
    ],
  },
};

/** Which equipment a goal reaches for first, in a gym that has all of it. */
const EQUIPMENT_ORDER: Record<Goal, Equipment[]> = {
  "Build raw strength": ["barbell", "machine", "dumbbell", "kettlebell", "bodyweight", "band"],
  "Lose fat & lean out": ["dumbbell", "kettlebell", "bodyweight", "machine", "barbell", "band"],
  "Stay consistent": ["machine", "dumbbell", "bodyweight", "band", "kettlebell", "barbell"],
  "Athletic conditioning": ["kettlebell", "bodyweight", "dumbbell", "barbell", "band", "machine"],
};

function asGoal(value: string | undefined): Goal {
  return (GOAL_OPTIONS as readonly string[]).includes(value ?? "") ? (value as Goal) : DEFAULT_GOAL;
}

function asEquipment(value: string | undefined): EquipmentChoice {
  return (EQUIPMENT_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as EquipmentChoice)
    : DEFAULT_EQUIPMENT;
}

/** The reps a set is planned for under a goal (3 sets of this many). */
export function repsFor(goal: string | undefined): number {
  return GOAL_INFO[asGoal(goal)].reps;
}

/** "upper and lower body, each trained twice": what a number of training days gives. */
export function splitAbout(count: number): string | null {
  return SPLITS[count]?.about ?? null;
}

/** The training days usually picked for a number of days a week (0 is Monday). */
export function defaultTrainingDays(count: number): number[] {
  const usual: Record<number, number[]> = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
  };
  return usual[Math.max(MIN_TRAINING_DAYS, Math.min(MAX_TRAINING_DAYS, Math.round(count)))]!;
}

/** "0,2,4" (the saved answer) as sorted weekday numbers; an empty list when it isn't usable. */
export function parseTrainingDays(raw: string | undefined): number[] {
  if (!raw) return [];
  const days = raw
    .split(",")
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** "Mon, Wed, Fri" for weekday numbers. */
export function trainingDaysLabel(days: number[]): string {
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

/** 0 for Monday to 6 for Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Builds the weekly plan. Every lift comes from the catalog, can be done with the chosen
 * equipment, and is picked in the goal's order of preference; a lift is not repeated in a
 * session, and the week spreads its picks before using one twice.
 */
export function buildPlan(input: {
  goal: string | undefined;
  /** Weekday numbers, 0 for Monday. Two to five of them. */
  days: number[];
  equipment: string | undefined;
  catalog: Exercise[];
  /** 0 for the first build; each regeneration passes the next number for a different mix. */
  variant?: number;
}): PlanTemplate | null {
  const goal = asGoal(input.goal);
  const equipment = asEquipment(input.equipment);
  const days = [...new Set(input.days)].sort((a, b) => a - b).slice(0, MAX_TRAINING_DAYS);
  const split = SPLITS[days.length];
  if (!split || input.catalog.length === 0) return null;

  const allowed = new Set(EQUIPMENT_INFO[equipment].allowed);
  // In a full gym the goal decides what to reach for first; with less equipment, the equipment
  // the person said they have comes before bodyweight moves.
  const order =
    equipment === "Full commercial gym" ? EQUIPMENT_ORDER[goal] : EQUIPMENT_INFO[equipment].allowed;
  const variant = Math.max(0, Math.round(input.variant ?? 0));
  const usable = input.catalog.filter((e) => allowed.has(e.equipment));
  const position = new Map(input.catalog.map((e, i) => [e.id, i] as const));
  const usedThisWeek = new Map<string, number>();
  const easyFirst = goal === "Stay consistent" || goal === "Lose fat & lean out";

  const rank = (e: Exercise) =>
    order.indexOf(e.equipment) * 10 + (easyFirst === (e.level === "beginner") ? 0 : 1);

  function pick(group: MuscleGroup, taken: string[]): string | null {
    const candidates = usable
      .filter((e) => e.group === group && !taken.includes(e.id))
      .sort(
        (a, b) =>
          (usedThisWeek.get(a.id) ?? 0) - (usedThisWeek.get(b.id) ?? 0) ||
          rank(a) - rank(b) ||
          position.get(a.id)! - position.get(b.id)!,
      );
    if (candidates.length === 0) return null;
    // A regeneration steps through the best few choices instead of always taking the first.
    const choice = candidates[variant % Math.min(candidates.length, 3)]!;
    usedThisWeek.set(choice.id, (usedThisWeek.get(choice.id) ?? 0) + 1);
    return choice.id;
  }

  const planDays: PlanDay[] = split.days.map(([title, base], index) => {
    const slots: Slot[] =
      goal === "Athletic conditioning"
        ? ["full body", ...base]
        : goal === "Lose fat & lean out"
          ? [...base, "full body"]
          : base;
    const exercises: string[] = [];
    for (const slot of slots) {
      // With little equipment a muscle group can run out: fall back to a full-body or core move.
      const id = pick(slot, exercises) ?? pick("full body", exercises) ?? pick("core", exercises);
      if (id) exercises.push(id);
    }
    return { weekday: days[index]!, title, exercises: exercises.slice(0, 6) };
  });

  if (planDays.some((day) => day.exercises.length === 0)) return null;
  return { split: split.name, goal, equipment, days: planDays };
}

/** The saved plan (the "plan" answer), or null when there is none or it can't be read. */
export function parsePlanTemplate(raw: string | undefined): PlanTemplate | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlanTemplate> | null;
    if (!value || !Array.isArray(value.days)) return null;
    const days: PlanDay[] = [];
    for (const entry of value.days as unknown[]) {
      const day = entry as Partial<PlanDay> | null;
      if (
        !day ||
        typeof day.weekday !== "number" ||
        day.weekday < 0 ||
        day.weekday > 6 ||
        typeof day.title !== "string" ||
        !Array.isArray(day.exercises)
      )
        continue;
      days.push({
        weekday: Math.trunc(day.weekday),
        title: day.title,
        exercises: day.exercises.filter((id): id is string => typeof id === "string"),
      });
    }
    if (days.length === 0) return null;
    days.sort((a, b) => a.weekday - b.weekday);
    return {
      split: typeof value.split === "string" ? value.split : `${days.length}-Day Split`,
      goal: typeof value.goal === "string" ? value.goal : DEFAULT_GOAL,
      equipment: typeof value.equipment === "string" ? value.equipment : DEFAULT_EQUIPMENT,
      days,
    };
  } catch {
    return null;
  }
}

/** The plan's sessions for the week containing `now`, each with its date, from `from` on. */
export function sessionsForWeek(
  template: PlanTemplate,
  now: Date,
  from?: string,
): Array<{ date: string; title: string; exercises: string[] }> {
  const monday = startOfWeek(now);
  return template.days
    .map((day) => ({
      date: dayKey(addDays(monday, day.weekday)),
      title: day.title,
      exercises: day.exercises,
    }))
    .filter((session) => !from || session.date >= from);
}

/** The date of the plan's next session on or after `now` (today counts). */
export function nextSessionDate(template: PlanTemplate, now: Date): string | null {
  if (template.days.length === 0) return null;
  const today = weekdayIndex(now);
  const ahead = template.days.map((day) => (day.weekday - today + 7) % 7).sort((a, b) => a - b)[0]!;
  return dayKey(addDays(now, ahead));
}

/** A weight to start an exercise at before anything has been logged for it (pounds). */
export function startingWeight(equipment: Equipment | undefined): number {
  // An empty Olympic bar weighs 45 lb; the rest start light or at bodyweight.
  if (equipment === "barbell") return 45;
  if (equipment === "dumbbell" || equipment === "kettlebell") return 15;
  if (equipment === "machine") return 30;
  return 0;
}
