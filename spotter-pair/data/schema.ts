// The app's data: one interface per collection (each record has an id), the exercise catalog's
// types, and small pure helpers for dates, numbers and the weekly score. Screens read and write
// records through useCollection<T>(name) with these types. Nothing here touches storage.

export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "full body";
export type Equipment = "bodyweight" | "dumbbell" | "barbell" | "kettlebell" | "machine" | "band";
export type ExerciseLevel = "beginner" | "intermediate";

/** A move from the catalog (reference content, see data/content/exercises.ts). */
export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  level: ExerciseLevel;
  /** One line of form advice shown under the exercise. */
  cue: string;
}

/** A planned or completed session for one person. */
export interface Workout {
  id: string;
  /** Local day of the session, YYYY-MM-DD. */
  date: string;
  /** e.g. "Upper Body A". */
  title: string;
  /** Catalog ids, in the order they're done. */
  exercises: string[];
  completed: boolean;
  /** ISO time the workout was marked complete, or null. */
  completedAt: string | null;
  /** Soft delete, so past weeks' scores can still be recalculated. Hide deleted records. */
  deleted: boolean;
}

/** One set the person did. Private: never shared with the partner. */
export interface SetLog {
  id: string;
  workoutId: string;
  /** Catalog id. */
  exercise: string;
  /** 1-based position of this set within its exercise. */
  setNumber: number;
  reps: number;
  /** Pounds; 0 for bodyweight. */
  weight: number;
}

export type UpdateType = "completion" | "cheer" | "stake";

/** One item in the feed shared between the two partners. Only this is shared. */
export interface PartnerUpdate {
  id: string;
  type: UpdateType;
  /** Who sent it: the person using this phone, or their partner. */
  from: "you" | "partner";
  message: string;
  createdAt: string;
  /** The sender's weekly score (0 to 100) at the time they sent it. */
  weekScore: number;
}

export interface Collections {
  workouts: Workout;
  set_logs: SetLog;
  partner_updates: PartnerUpdate;
  exercises: Exercise;
}

export type CollectionName = keyof Collections;

/**
 * The goals plan setup offers (the "goal" answer). The plan builder, setup and Settings all read
 * the choices from here.
 */
export const GOAL_OPTIONS = [
  "Build raw strength",
  "Lose fat & lean out",
  "Stay consistent",
  "Athletic conditioning",
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** A local calendar day as YYYY-MM-DD (the form Workout.date uses). */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** The local midnight that starts a YYYY-MM-DD day. */
export function parseDayKey(key: string): Date {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The same time of day, `days` calendar days later (or earlier). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** The Monday that starts the week containing `date`. */
export function startOfWeek(date: Date = new Date()): Date {
  const day = startOfDay(date);
  return addDays(day, -((day.getDay() + 6) % 7));
}

/** The seven day keys (Monday to Sunday) of the week containing `date`. */
export function weekDays(date: Date = new Date()): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i)));
}

/** "Today", "Tomorrow", "Yesterday", or "Fri, Mar 6". */
export function dayLabel(key: string, now: Date = new Date()): string {
  const day = parseDayKey(key);
  const diff = daysBetween(now, day);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return `${WEEKDAYS[day.getDay()]}, ${MONTHS[day.getMonth()]} ${day.getDate()}`;
}

/** One-letter-friendly weekday name, e.g. "Mon". */
export function weekdayShort(key: string): string {
  return WEEKDAYS[parseDayKey(key).getDay()] ?? "";
}

/** "7:05 PM" for an hour (0 to 23) and minute. */
export function formatClock(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${pad2(minute)} ${suffix}`;
}

/** "7:05 PM" for an ISO time, in the phone's time zone. */
export function formatTime(iso: string): string {
  const when = new Date(iso);
  return formatClock(when.getHours(), when.getMinutes());
}

/** "Just now", "23 min ago", "3 h ago", "Yesterday" or "4 days ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const sent = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - sent.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const days = daysBetween(sent, now);
  if (days === 0) return `${Math.floor(minutes / 60)} h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Thousands separators on a whole number: 12,450. */
export function formatNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "185 lb", or "Bodyweight" for 0. */
export function formatWeight(pounds: number): string {
  return pounds === 0 ? "Bodyweight" : `${formatNumber(pounds)} lb`;
}

/** "1 set", "3 sets", "1 rep", "10 reps": a count with the right word. */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/** Total work done for some sets: reps times weight, in pounds. */
export function volume(sets: Array<Pick<SetLog, "reps" | "weight">>): number {
  return sets.reduce((total, set) => total + set.reps * set.weight, 0);
}

export interface WeekStats {
  /** Workouts scheduled this week. */
  planned: number;
  /** This week's workouts up to and including today. */
  due: number;
  completed: number;
  /** completed / due as 0 to 100, or 0 when nothing is due yet. */
  percent: number;
}

/**
 * This week's score. Due workouts are those dated up to and including today, so today's
 * session counts until it's done. Deleted workouts never count.
 */
export function weekStats(workouts: Workout[], now: Date = new Date()): WeekStats {
  const days = new Set(weekDays(now));
  const today = dayKey(now);
  const live = workouts.filter((w) => !w.deleted && days.has(w.date));
  const due = live.filter((w) => w.date <= today);
  const completed = due.filter((w) => w.completed).length;
  return {
    planned: live.length,
    due: due.length,
    completed,
    percent: due.length ? Math.round((completed / due.length) * 100) : 0,
  };
}

export interface SharedWeek {
  /** Sessions due so far this week (the two partners share one schedule). */
  due: number;
  yours: number;
  partnerDone: number;
  /** Both partners' completions over twice the sessions due, as 0 to 100. */
  percent: number;
}

/**
 * A week's shared score as of `asOf`: the number Today calls "Team" and the Partner tab draws as
 * a ring. The partner's completions come from their updates, capped at the sessions due. A past
 * week is scored as of its Sunday.
 */
export function sharedWeek(
  workouts: Workout[],
  updates: PartnerUpdate[],
  asOf: Date = new Date(),
): SharedWeek {
  const mine = weekStats(workouts, asOf);
  const days = new Set(weekDays(asOf));
  const partnerDone = Math.min(
    updates.filter(
      (u) =>
        u.from === "partner" && u.type === "completion" && days.has(dayKey(new Date(u.createdAt))),
    ).length,
    mine.due,
  );
  return {
    due: mine.due,
    yours: mine.completed,
    partnerDone,
    percent: mine.due ? Math.round(((mine.completed + partnerDone) / (2 * mine.due)) * 100) : 0,
  };
}

/** The live workout dated today, if there is one. */
export function todaysWorkout(workouts: Workout[], now: Date = new Date()): Workout | undefined {
  const today = dayKey(now);
  return workouts.find((w) => !w.deleted && w.date === today);
}
