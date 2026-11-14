// The app's records. Every collection record has a string id and is stored as JSON.
// Dates are ISO strings: read them with new Date(iso). Helpers here are pure, so screens and
// seed data share the same rules for days, streaks, XP and formatting.

export type WorkoutMode = "guided" | "free" | "callout" | "pad" | "scouted";
export type Stance = "orthodox" | "southpaw" | "unclear";
export type ChatRole = "user" | "coach";

/** A finished training session. */
export interface WorkoutSession {
  id: string;
  /** When the session finished (ISO). */
  date: string;
  rounds: number;
  roundSeconds: number;
  mode: WorkoutMode;
  xpEarned: number;
  /** The coach's top correction from the session, or "" when there wasn't one. */
  topFix: string;
}

/** A drill the coach wrote with an answer: it runs as a timed round on the Train tab. */
export interface CoachDrill {
  title: string;
  rounds: number;
  roundSeconds: number;
  /** Comma-separated callouts, e.g. "jab, cross, pivot". */
  callouts: string;
}

/** One message in the chat with the AI coach. */
export interface CoachMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  /** The drill that came with a coach's answer, kept so it can be run later. */
  drill?: CoachDrill;
  /** Local URI of the frame sent with a question. */
  photoUri?: string;
}

/** A saved scouting report built from photos or frames of an opponent. */
export interface OpponentScout {
  id: string;
  /** Opponent name or nickname. */
  name: string;
  /** Local URI of the main frame, or null when there is no frame. */
  photoUri: string | null;
  stance: Stance;
  /** AI description of guard, footwork and habits seen in the frames. */
  tendencies: string;
  /** AI-suggested strategy and callout combos. */
  gamePlan: string;
  createdAt: string;
  /** How sure the read was from its one frame, 0 to 100. */
  confidence?: number;
  /** The single opening to attack, in one sentence. */
  weakness?: string;
  /** The person's one free read (its game plan stays open without Pro). */
  sample?: boolean;
  /** A sample report the app ships with: labelled as one, and removed by the first real read. */
  example?: boolean;
}

/** A logged meal, with estimated macros. */
export interface Meal {
  id: string;
  name: string;
  calories: number;
  proteinGrams: number;
  loggedAt: string;
}

export interface Collections {
  workout_sessions: WorkoutSession[];
  coach_messages: CoachMessage[];
  opponent_scouts: OpponentScout[];
  meals: Meal[];
}

export type CollectionName = keyof Collections;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** XP needed for each level. */
export const XP_PER_LEVEL = 500;

/** An ISO time `days` calendar days before `from`, at a local hour and minute. */
export function isoDaysAgo(days: number, hour = 18, minute = 0, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/** The local calendar day as "YYYY-MM-DD": the key for "same day" checks. */
export function dayKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The last `count` local days, oldest first, ending with `from`'s day. */
export function lastDays(count: number, from: Date = new Date()): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(from);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (count - 1 - index));
    return day;
  });
}

/** Rounds per day for the last seven days, oldest first, for a weekly bar chart. */
export function weekActivity(
  sessions: WorkoutSession[],
  from: Date = new Date(),
): Array<{ key: string; label: string; rounds: number }> {
  return lastDays(7, from).map((day) => {
    const key = dayKey(day);
    const rounds = sessions.reduce(
      (sum, session) => sum + (dayKey(session.date) === key ? session.rounds : 0),
      0,
    );
    return { key, label: WEEKDAYS[day.getDay()]!, rounds };
  });
}

/** Consecutive days with a session, ending today. Today doesn't have to be done yet. */
export function currentStreak(sessions: WorkoutSession[], from: Date = new Date()): number {
  const done = new Set(sessions.map((session) => dayKey(session.date)));
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (!done.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (done.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** XP for a session: 10 per round, plus 1 per minute of work. */
export function xpForSession(session: { rounds: number; roundSeconds: number }): number {
  return session.rounds * 10 + Math.round((session.rounds * session.roundSeconds) / 60);
}

export function totalXp(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, session) => sum + session.xpEarned, 0);
}

/** The level for a total XP, with progress into it (for a level bar). */
export function levelProgress(xp: number): {
  level: number;
  into: number;
  needed: number;
  fraction: number;
} {
  const into = xp % XP_PER_LEVEL;
  return {
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    into,
    needed: XP_PER_LEVEL,
    fraction: into / XP_PER_LEVEL,
  };
}

/** Calories and protein eaten on one day. */
export function dayTotals(
  meals: Meal[],
  day: Date = new Date(),
): { calories: number; protein: number } {
  const key = dayKey(day);
  return meals.reduce(
    (totals, meal) =>
      dayKey(meal.loggedAt) === key
        ? {
            calories: totals.calories + meal.calories,
            protein: totals.protein + meal.proteinGrams,
          }
        : totals,
    { calories: 0, protein: 0 },
  );
}

/** "Mon 12 May" */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Today", "Yesterday", or a short date. */
export function formatDay(iso: string, from: Date = new Date()): string {
  const day = dayKey(iso);
  if (day === dayKey(from)) return "Today";
  const yesterday = new Date(from);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === dayKey(yesterday)) return "Yesterday";
  return formatShortDate(iso);
}

/** "7:40 PM" */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(date.getMinutes()).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** A countdown clock: 180 becomes "3:00". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A round length: 180 becomes "3 min", 90 becomes "1.5 min". */
export function formatRoundLength(seconds: number): string {
  return `${Number((seconds / 60).toFixed(2))} min`;
}

export function formatKcal(calories: number): string {
  return `${Math.round(calories)} kcal`;
}

export function formatGrams(grams: number): string {
  return `${Math.round(grams)} g`;
}
