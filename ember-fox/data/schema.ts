// ShotOClock's records, the reference athlete content and the pure helpers the screens share:
// dates, formatting, the rough BAC estimate and athlete form. Nothing here reads or writes storage.

export type Sport = "gym" | "running" | "team" | "racquet";
export type BodyType = "male" | "female" | "other";
export type DrinkLabel = "beer" | "wine" | "shot" | "custom";

export interface Drink {
  id: string;
  /** ISO date and time the drink was had. */
  logged_at: string;
  label: DrinkLabel;
  /** Standard drinks in this entry (one standard drink is about 14 g of alcohol). */
  standard_drinks: number;
  /** True when the entry was changed after it was first saved. */
  edited: boolean;
}

export interface Checkin {
  id: string;
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  alcohol_free: boolean;
  game_day: boolean;
  note: string;
}

export interface WeeklyGoal {
  id: string;
  /** First day of the week, YYYY-MM-DD. */
  week_start: string;
  /** Most standard drinks allowed in the week. */
  limit: number;
  total_drinks: number;
  goal_met: boolean;
}

export type UnlockKind = "level" | "kit" | "gear";
export type UnlockMetric = "weeks_met" | "alcohol_free_days";

/** An athlete level, kit or piece of gear the Career tab shows. */
export interface Unlock {
  id: string;
  kind: UnlockKind;
  name: string;
  description: string;
  /** The sport the item belongs to; levels fit every sport. */
  sport: Sport | "any";
  /** What it counts: weeks within the limit, or alcohol-free days in total. */
  metric: UnlockMetric;
  /** How many of `metric` it takes to unlock. */
  needs: number;
  /** Premium items show as locked to free users. */
  premium: boolean;
}

export interface Profile {
  weightKg: number;
  bodyType: BodyType;
}

export const SPORTS: { id: Sport; label: string; noun: string }[] = [
  { id: "gym", label: "Gym / lifting", noun: "session" },
  { id: "running", label: "Running / cycling", noun: "run" },
  { id: "team", label: "Soccer / basketball", noun: "match" },
  { id: "racquet", label: "Golf / racquet sports", noun: "game" },
];

export const DRINK_TYPES: { id: DrinkLabel; label: string; standardDrinks: number }[] = [
  { id: "beer", label: "Beer", standardDrinks: 1 },
  { id: "wine", label: "Wine", standardDrinks: 1 },
  { id: "shot", label: "Shot", standardDrinks: 1 },
  { id: "custom", label: "Custom", standardDrinks: 1 },
];

export const DEFAULT_PROFILE: Profile = { weightKg: 75, bodyType: "other" };

const GRAMS_PER_STANDARD_DRINK = 14;
/** Widmark body-water factor for each body type. */
const BODY_FACTOR: Record<BodyType, number> = { male: 0.68, female: 0.55, other: 0.615 };
/** Alcohol the body clears per hour, in BAC percentage points. */
const ELIMINATION_PER_HOUR = 0.015;
const HOUR = 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

// ---------- dates (all in the phone's local time) ----------

/** Local calendar day as YYYY-MM-DD. Date-only strings pass through unchanged. */
export function dayKey(input: Date | string = new Date()): string {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = typeof input === "string" ? new Date(input) : input;
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-");
}

/** Local midnight of a YYYY-MM-DD day. */
export function parseDay(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The first day of the week containing `date`, as YYYY-MM-DD. startsOn: 0 = Sunday, 1 = Monday. */
export function weekStart(date: Date = new Date(), startsOn: number = 1): string {
  const offset = (date.getDay() - startsOn + 7) % 7;
  return dayKey(addDays(startOfDay(date), -offset));
}

/** The seven YYYY-MM-DD days starting at a week's first day. */
export function weekDays(startKey: string): string[] {
  const start = parseDay(startKey);
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
}

/** YYYY-MM-DD for `days` days before today (0 is today). */
export function daysAgoKey(days: number, now: Date = new Date()): string {
  return dayKey(addDays(startOfDay(now), -days));
}

/** An ISO time on the day `days` ago, at hour:minute local time. */
export function isoDaysAgo(days: number, hour: number, minute = 0, now: Date = new Date()): string {
  const d = addDays(startOfDay(now), -days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** An ISO time `minutes` before now. */
export function isoMinutesAgo(minutes: number, now: Date = new Date()): string {
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString();
}

// ---------- formatting ----------

export function formatDrinks(count: number): string {
  const rounded = Math.round(count * 10) / 10;
  return `${rounded} ${rounded === 1 ? "drink" : "drinks"}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Mon" (or the long weekday with style "long") for a YYYY-MM-DD day. */
export function formatDay(key: string, style: "short" | "long" = "short"): string {
  return parseDay(key).toLocaleDateString([], { weekday: style });
}

/** "May 4" for a YYYY-MM-DD day. */
export function formatDate(key: string): string {
  return parseDay(key).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatBac(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

/** "about 2 h 10 min" for a number of hours. */
export function formatDuration(hours: number): string {
  const minutes = Math.max(0, Math.round(hours * 60));
  if (minutes === 0) return "less than 15 minutes";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `about ${m} min`;
  return m ? `about ${h} h ${m} min` : `about ${h} h`;
}

export function drinkName(label: DrinkLabel): string {
  return DRINK_TYPES.find((type) => type.id === label)?.label ?? "Drink";
}

// ---------- totals ----------

export function totalStandardDrinks(drinks: Drink[]): number {
  return drinks.reduce((sum, drink) => sum + drink.standard_drinks, 0);
}

/** Standard drinks logged on one YYYY-MM-DD day. */
export function totalOn(drinks: Drink[], key: string): number {
  return totalStandardDrinks(drinks.filter((drink) => dayKey(drink.logged_at) === key));
}

/** Standard drinks logged in a week (given its first day, YYYY-MM-DD). */
export function totalForWeek(drinks: Drink[], startKey: string): number {
  const days = new Set(weekDays(startKey));
  return totalStandardDrinks(drinks.filter((drink) => days.has(dayKey(drink.logged_at))));
}

export function alcoholFreeDays(checkins: Checkin[]): number {
  return checkins.filter((checkin) => checkin.alcohol_free).length;
}

export function weeksWithinLimit(goals: WeeklyGoal[]): number {
  return goals.filter((goal) => goal.goal_met).length;
}

// ---------- the rough BAC estimate ----------

export interface BacEstimate {
  /** Estimated BAC in percent. Rough: never use it to decide whether to drive. */
  percent: number;
  /** Hours until the estimate reaches zero at the usual rate. */
  hoursToZero: number;
}

/**
 * A rough Widmark estimate from the drinks of the last 12 hours, body weight and body type.
 * It isn't a breath test and ignores food, drink strength and each person's metabolism.
 */
export function estimateBac(drinks: Drink[], profile: Profile, now: Date = new Date()): BacEstimate {
  const nowMs = now.getTime();
  const recent = drinks.filter((drink) => {
    const t = Date.parse(drink.logged_at);
    return t <= nowMs && t >= nowMs - 12 * HOUR;
  });
  if (recent.length === 0) return { percent: 0, hoursToZero: 0 };
  const grams = recent.reduce((sum, drink) => sum + drink.standard_drinks * GRAMS_PER_STANDARD_DRINK, 0);
  const first = Math.min(...recent.map((drink) => Date.parse(drink.logged_at)));
  const hours = (nowMs - first) / HOUR;
  const weightGrams = profile.weightKg * 1000;
  const peak = (grams / (BODY_FACTOR[profile.bodyType] * weightGrams)) * 100;
  const percent = Math.max(0, peak - ELIMINATION_PER_HOUR * hours);
  return { percent, hoursToZero: percent / ELIMINATION_PER_HOUR };
}

// ---------- the athlete ----------

export interface AthleteStats {
  /** Overall form, 0 to 100. */
  form: number;
  /** How well the athlete bounces back, 0 to 100. Lower after recent drinks. */
  recovery: number;
  /** Endurance across the last week, 0 to 100. Lower when over the limit. */
  stamina: number;
}

/**
 * Form from the last two days (recovery) and the last seven (stamina). Drinks lower both;
 * alcohol-free days and staying within the weekly limit raise them.
 */
export function athleteStats(
  drinks: Drink[],
  checkins: Checkin[],
  limit: number,
  now: Date = new Date(),
): AthleteStats {
  const nowMs = now.getTime();
  const drunkBetween = (fromHours: number, toHours: number) =>
    drinks.reduce((sum, drink) => {
      const hoursAgo = (nowMs - Date.parse(drink.logged_at)) / HOUR;
      return hoursAgo >= fromHours && hoursAgo < toHours ? sum + drink.standard_drinks : sum;
    }, 0);
  const last24 = drunkBetween(0, 24);
  const previous24 = drunkBetween(24, 48);
  const week = drunkBetween(0, 168);
  const days = new Set(Array.from({ length: 7 }, (_, i) => daysAgoKey(i, now)));
  const freeDays = checkins.filter((checkin) => checkin.alcohol_free && days.has(checkin.date)).length;
  const recovery = clamp(95 - 14 * last24 - 6 * previous24);
  const stamina = clamp(90 - 6 * Math.max(0, week - limit) + 3 * freeDays);
  return { form: Math.round((recovery + stamina) / 2), recovery, stamina };
}

export interface Outlook {
  tier: "sharp" | "steady" | "flat";
  title: string;
  line: string;
}

/** The next-game outlook for a form score, worded for the athlete's sport. */
export function outlookFor(form: number, sport: Sport): Outlook {
  const noun = SPORTS.find((s) => s.id === sport)?.noun ?? "session";
  if (form >= 75) {
    return {
      tier: "sharp",
      title: "Sharp",
      line: `Recovery is strong. Expect fresh legs for your next ${noun}.`,
    };
  }
  if (form >= 50) {
    return {
      tier: "steady",
      title: "Steady",
      line: `Recovery is on track. One more alcohol-free day would sharpen your next ${noun}.`,
    };
  }
  return {
    tier: "flat",
    title: "Flat",
    line: `Recovery is slow right now. Two or three alcohol-free days give your body room to bounce back before your next ${noun}.`,
  };
}

export interface UnlockState {
  unlocked: boolean;
  /** Progress toward the item, capped at what it needs. */
  have: number;
  /** 0 to 1. */
  progress: number;
}

/** Whether an unlock is earned, and how close the person is to it. */
export function unlockState(
  unlock: Unlock,
  progress: { weeksMet: number; alcoholFreeDays: number },
): UnlockState {
  const have = unlock.metric === "weeks_met" ? progress.weeksMet : progress.alcoholFreeDays;
  return {
    unlocked: have >= unlock.needs,
    have: Math.min(have, unlock.needs),
    progress: unlock.needs <= 0 ? 1 : Math.min(1, have / unlock.needs),
  };
}
