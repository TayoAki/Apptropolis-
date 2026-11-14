// What the timer trains: the built-in combos and daily programs, the levels onboarding asks
// about, and how a callout is shown for the boxer's stance and callout style. Pure data and
// helpers, shared by onboarding, the Train screen, Settings and the scouting report.
import type { Stance } from "./schema";

/** How often the next punch is called out during a round. */
export const CALLOUT_MS = 3000;
/** Callouts per minute of work, for a session's "callouts" figure. */
export const CALLOUTS_PER_MINUTE = 60_000 / CALLOUT_MS;

/** Coach questions a day without Pro. */
export const FREE_COACH_QUESTIONS_PER_DAY = 3;

/**
 * What the app does without Pro, as the paywall states it. Each line is something the free app
 * really does; keep it in step with the gates in the screens.
 */
export const FREE_FEATURES = [
  "The round timer with punch callouts and haptics",
  "Today's challenge",
  "Your streak, level and weekly rounds",
  `${FREE_COACH_QUESTIONS_PER_DAY} coach questions a day`,
  "Your first opponent read with its game plan",
];

/** The level question, in onboarding and in Settings. The value is what is saved. */
export const SKILL_OPTIONS = [
  { value: "First jab", body: "Never wrapped hands" },
  { value: "Some training", body: "Know basic 1-2 combos and stance" },
  { value: "Amateur sparring", body: "Active gym sparring, need round pace" },
  { value: "Competitive", body: "Fighter camp ready" },
] as const;

/** Where the person trains, asked in Settings: the coach fits its drills to it. */
export const SETUP_OPTIONS = [
  { value: "Shadowboxing only", label: "Shadow" },
  { value: "Heavy bag", label: "Heavy bag" },
  { value: "Pads with a partner", label: "Pads" },
] as const;

export type Level = "beginner" | "intermediate";

/** The two program pools the four skill answers map to. Unanswered counts as beginner. */
export function levelOf(skill: string | undefined): Level {
  return /amateur|compet|inter|advanced/i.test(skill ?? "") ? "intermediate" : "beginner";
}

/** The punches the first round in onboarding calls, by the level just chosen. */
export function firstRoundSteps(skill: string | undefined): string[] {
  if (skill === "First jab") return ["Jab", "Cross"];
  if (skill === "Amateur sparring") return ["Jab", "Cross", "Slip", "Hook"];
  if (skill === "Competitive") return ["Jab", "Jab", "Cross", "Hook"];
  return ["Jab", "Cross", "Hook"];
}

/** The first round is short on purpose: one real round, saved like any other. */
export const FIRST_ROUND_SECONDS = 30;

/** The daily reminder's notification, the same wherever it is turned on. */
export const REMINDER_COPY = {
  title: "Time to train",
  body: "One round keeps your streak going. Your timer is ready.",
};

export interface Combo {
  name: string;
  steps: string[];
}

/** The timer's combos. The first is free; the others are part of Pro. */
export const COMBOS: Combo[] = [
  { name: "Classic", steps: ["Jab", "Cross", "Slip", "Hook"] },
  { name: "Body work", steps: ["Jab", "Body hook", "Cross", "Step out"] },
  { name: "Counter", steps: ["Slip left", "Hook", "Cross", "Step out"] },
  { name: "Pressure", steps: ["Jab", "Jab", "Cross", "Hook"] },
];

export interface Program {
  id: string;
  name: string;
  level: Level;
  rounds: number;
  roundSeconds: number;
  restSeconds: number;
  steps: string[];
}

/** The daily challenges, written for an orthodox stance (see `forStance`). */
export const PROGRAMS: Program[] = [
  {
    id: "counter-hook",
    name: "Counter left hook drill",
    level: "beginner",
    rounds: 3,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Slip right", "Left hook", "Step out"],
  },
  {
    id: "jab-footwork",
    name: "Jab and footwork",
    level: "beginner",
    rounds: 4,
    roundSeconds: 120,
    restSeconds: 60,
    steps: ["Jab", "Jab", "Step left", "Cross"],
  },
  {
    id: "defense-first",
    name: "Defense first",
    level: "beginner",
    rounds: 3,
    roundSeconds: 120,
    restSeconds: 60,
    steps: ["Slip left", "Slip right", "Roll", "Cross"],
  },
  {
    id: "double-jab",
    name: "Double jab pressure",
    level: "intermediate",
    rounds: 5,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Jab", "Cross", "Body hook", "Slip right"],
  },
  {
    id: "cross-hook",
    name: "Cross hook combos",
    level: "intermediate",
    rounds: 5,
    roundSeconds: 180,
    restSeconds: 45,
    steps: ["Cross", "Left hook", "Cross", "Slip left"],
  },
  {
    id: "ring-pace",
    name: "Ring pace rounds",
    level: "intermediate",
    rounds: 6,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Cross", "Slip", "Hook", "Step out", "Uppercut"],
  },
];

/** Day of the year, so the challenge changes once a day. */
function dayNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Today's challenge for a level: the level's programs in turn, one a day. */
export function programForDay(level: Level, date: Date = new Date()): Program {
  const pool = PROGRAMS.filter((program) => program.level === level);
  return pool[dayNumber(date) % pool.length]!;
}

/**
 * A built-in callout for the boxer's stance. The combos are written for an orthodox boxer, so a
 * southpaw gets the mirror image: "Slip right" becomes "Slip left", "Left hook" "Right hook".
 */
export function forStance(step: string, stance: Stance | undefined): string {
  if (stance !== "southpaw") return step;
  return step.replace(/\b(left|right)\b/gi, (side) => {
    const flipped = side.toLowerCase() === "left" ? "right" : "left";
    return side[0] === side[0]!.toUpperCase()
      ? flipped[0]!.toUpperCase() + flipped.slice(1)
      : flipped;
  });
}

/**
 * The usual gym numbers: 1 jab, 2 cross, 3 lead hook, 4 rear hook, 5 lead uppercut, 6 rear
 * uppercut. Body shots keep the word ("3 body"); footwork and defense stay as words.
 */
export function punchNumber(step: string, stance: Stance | undefined): string {
  const text = step.trim().toLowerCase();
  const lead = stance === "southpaw" ? "right" : "left";
  const rear = lead === "left" ? "right" : "left";
  const body = /\bbody\b/.test(text) ? " body" : "";
  const side = text.includes(`${rear} `) || /\brear\b/.test(text) ? "rear" : "lead";
  if (/\bjab\b/.test(text)) return `1${body}`;
  if (/\bcross\b|\bstraight\b/.test(text)) return `2${body}`;
  if (/\bhook\b/.test(text)) return `${side === "rear" ? 4 : 3}${body}`;
  if (/\buppercut\b/.test(text)) return `${side === "rear" ? 6 : 5}${body}`;
  return step;
}

/** A callout as the timer shows it: a punch name, or its number when the boxer chose numbers. */
export function showCallout(
  step: string,
  style: "names" | "numbers",
  stance: Stance | undefined,
): string {
  return style === "numbers" ? punchNumber(step, stance) : step;
}
