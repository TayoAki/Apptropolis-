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
const KG_PER_LB = 0.45359237;
export const DEFAULT_WEIGHT_LBS = Math.round(DEFAULT_PROFILE.weightKg / KG_PER_LB);

/** Saved preferences: onboarding answers and the choices made in Settings, by key. */
export type Answers = Record<string, string | undefined>;

/** The person's sport; soccer / basketball until they pick one. */
export function sportFrom(answers: Answers): Sport {
  return SPORTS.find((sport) => sport.id === answers.sport)?.id ?? "team";
}

export interface ProfileChoice extends Profile {
  weightLbs: number;
  /** False while the weight is still the app's default, not the person's own. */
  weightSet: boolean;
  /** False while the body profile is still the default (the midpoint of male and female). */
  bodyTypeSet: boolean;
}

/** Body weight and body profile for the BAC estimate, from Settings; defaults until they are set. */
export function profileFrom(answers: Answers): ProfileChoice {
  const lbs = Number(answers.weight_lbs);
  const weightSet = Number.isFinite(lbs) && lbs > 0;
  const weightLbs = weightSet ? lbs : DEFAULT_WEIGHT_LBS;
  const bodyTypeSet =
    answers.body_type === "male" || answers.body_type === "female" || answers.body_type === "other";
  return {
    weightKg: weightSet ? weightLbs * KG_PER_LB : DEFAULT_PROFILE.weightKg,
    bodyType: bodyTypeSet ? (answers.body_type as BodyType) : DEFAULT_PROFILE.bodyType,
    weightLbs,
    weightSet,
    bodyTypeSet,
  };
}

/** Standard drinks allowed per week when none has been chosen. */
export const DEFAULT_WEEKLY_LIMIT = 7;

/**
 * The weekly limit the person chose (in onboarding or in Settings), in standard drinks.
 * `weekly_goal` is the key older versions of onboarding saved it under.
 */
export function limitFrom(answers: Answers): number {
  for (const raw of [answers.weekly_limit, answers.weekly_goal]) {
    const value = Number(raw);
    if (raw !== undefined && raw !== "" && Number.isFinite(value) && value >= 0) return value;
  }
  return DEFAULT_WEEKLY_LIMIT;
}

/**
 * A lighter limit set for one week only (a Plus feature), saved as "<week start>=<limit>".
 * Null when none is set for `weekKey`, or when it isn't lighter than the usual limit.
 */
export function lighterLimitFor(answers: Answers, weekKey: string): number | null {
  const [key, raw] = (answers.week_override ?? "").split("=");
  const value = Number(raw);
  if (key !== weekKey || raw === undefined || raw === "" || !Number.isFinite(value)) return null;
  return value >= 0 && value < limitFrom(answers) ? value : null;
}

/** The first day of the person's week: 0 for Sunday, 1 for Monday (the default). */
export function weekStartsOn(answers: Answers): 0 | 1 {
  return answers.week_start === "Sunday" ? 0 : 1;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** The weekdays (0 = Sunday) the person plays or trains on, from Settings; empty until set. */
export function gameWeekdays(answers: Answers): number[] {
  const value = answers.training_days ?? "";
  if (/every day/i.test(value)) return [0, 1, 2, 3, 4, 5, 6];
  return WEEKDAYS.map((name, index) => (value.includes(name) ? index : -1)).filter(
    (index) => index >= 0,
  );
}

/** The next game or training day from today on (today counts), as YYYY-MM-DD; null when none is set. */
export function nextGameDay(weekdays: number[], now: Date = new Date()): string | null {
  if (weekdays.length === 0) return null;
  const today = startOfDay(now);
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    if (weekdays.includes(day.getDay())) return dayKey(day);
  }
  return null;
}

/** "today", "tomorrow" or the weekday name ("Saturday") for a coming YYYY-MM-DD day. */
export function comingDayName(key: string, now: Date = new Date()): string {
  if (key === dayKey(now)) return "today";
  if (key === dayKey(addDays(startOfDay(now), 1))) return "tomorrow";
  return formatDay(key, "long");
}

/** What the BAC estimate is based on, as one plain sentence part: "165 lb and the male body profile". */
export function profileBasis(profile: ProfileChoice): string {
  const weight = `${profile.weightSet ? "" : "a default "}body weight of ${profile.weightLbs} lb`;
  const body =
    profile.bodyType === "other"
      ? "a body profile midway between male and female"
      : `the ${profile.bodyType} body profile`;
  return `${weight} and ${body}`;
}

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

/** A count of standard drinks without the word: "8.5", "7". */
export function formatCount(count: number): string {
  return String(Math.round(count * 10) / 10);
}

/** The estimate to two decimals with a leading "~" ("~0.04%"): it is not exact enough for three. */
export function formatBac(percent: number): string {
  if (percent > 0 && percent < 0.005) return "under 0.01%";
  return `~${percent.toFixed(2)}%`;
}

/** "about 2 h 10 min" for a number of hours. */
export function formatDuration(hours: number): string {
  const minutes = Math.max(0, Math.round(hours * 60));
  if (minutes < 1) return "under a minute";
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

/** How far back the estimate looks for drinks. */
export const BAC_WINDOW_HOURS = 24;

/**
 * A rough Widmark estimate from the drinks of the last 24 hours, body weight and body type.
 * Drinks are taken in the order they were logged: the body clears alcohol at an average rate
 * between them and never below zero, so an early drink that has already cleared can't cancel a
 * later one. It isn't a breath test and ignores food, drink strength and each person's
 * metabolism, and it counts each drink as absorbed at once.
 */
export function estimateBac(drinks: Drink[], profile: Profile, now: Date = new Date()): BacEstimate {
  const nowMs = now.getTime();
  const recent = drinks
    .map((drink) => ({ at: Date.parse(drink.logged_at), amount: drink.standard_drinks }))
    .filter((drink) => drink.at <= nowMs && drink.at >= nowMs - BAC_WINDOW_HOURS * HOUR)
    .sort((a, b) => a.at - b.at);
  if (recent.length === 0) return { percent: 0, hoursToZero: 0 };
  const perDrink =
    (GRAMS_PER_STANDARD_DRINK / (BODY_FACTOR[profile.bodyType] * profile.weightKg * 1000)) * 100;
  let percent = 0;
  let last = recent[0]!.at;
  for (const drink of recent) {
    percent = Math.max(0, percent - (ELIMINATION_PER_HOUR * (drink.at - last)) / HOUR);
    percent += drink.amount * perDrink;
    last = drink.at;
  }
  percent = Math.max(0, percent - (ELIMINATION_PER_HOUR * (nowMs - last)) / HOUR);
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

// ---------- weeks and trends ----------

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Whether anything was logged in a week: a drink or a check-in. */
export function weekHasEntries(drinks: Drink[], checkins: Checkin[], startKey: string): boolean {
  const days = new Set(weekDays(startKey));
  return (
    drinks.some((drink) => days.has(dayKey(drink.logged_at))) ||
    checkins.some((checkin) => days.has(checkin.date))
  );
}

/** The earliest day anything was logged, as YYYY-MM-DD; null with no records. */
export function firstEntryDay(drinks: Drink[], checkins: Checkin[]): string | null {
  const keys = [...drinks.map((drink) => dayKey(drink.logged_at)), ...checkins.map((c) => c.date)];
  return keys.length > 0 ? keys.reduce((min, key) => (key < min ? key : min)) : null;
}

/**
 * The finished weeks that still need a result: every week from the one holding `sinceKey` up to
 * last week that has entries and no saved result. After the first day of the week is changed in
 * Settings, a week that is mostly the same days as a saved one counts as that week.
 */
export function weeksToClose(
  drinks: Drink[],
  checkins: Checkin[],
  goals: WeeklyGoal[],
  sinceKey: string,
  currentWeekKey: string,
): { week_start: string; total_drinks: number }[] {
  const current = parseDay(currentWeekKey);
  const startsOn = current.getDay();
  const closed = goals.map((goal) => parseDay(goal.week_start).getTime());
  const result: { week_start: string; total_drinks: number }[] = [];
  let start = parseDay(weekStart(parseDay(sinceKey), startsOn));
  // Never look further back than two years: older weeks can't change a level now.
  const floor = addDays(current, -7 * 104);
  if (start < floor) start = floor;
  for (; start < current; start = addDays(start, 7)) {
    const key = dayKey(start);
    // The same week under another first day starts within three days of the saved one.
    const overlaps = closed.some((time) => Math.abs(time - start.getTime()) < 3.5 * 24 * HOUR);
    if (overlaps || !weekHasEntries(drinks, checkins, key)) continue;
    result.push({ week_start: key, total_drinks: round1(totalForWeek(drinks, key)) });
  }
  return result;
}

export interface WeekTotal {
  weekStart: string;
  total: number;
  /** False for a week with nothing logged (shown as a gap, not as a zero). */
  hasEntries: boolean;
}

/** Weekly totals for the `count` weeks ending with the current one, oldest first. */
export function weeklyHistory(
  drinks: Drink[],
  checkins: Checkin[],
  currentWeekKey: string,
  count = 12,
): WeekTotal[] {
  const current = parseDay(currentWeekKey);
  return Array.from({ length: count }, (_, i) => {
    const key = dayKey(addDays(current, -7 * (count - 1 - i)));
    return {
      weekStart: key,
      total: round1(totalForWeek(drinks, key)),
      hasEntries: weekHasEntries(drinks, checkins, key),
    };
  });
}

export interface WeekdayPattern {
  /** 0 = Sunday. */
  weekday: number;
  /** Standard drinks logged on that weekday in the period. */
  total: number;
  /** All standard drinks logged in the period. */
  all: number;
}

/** The weekday that carries the most drinks from `sinceKey` on; null when nothing was logged. */
export function heaviestWeekday(drinks: Drink[], sinceKey: string): WeekdayPattern | null {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const drink of drinks) {
    const key = dayKey(drink.logged_at);
    if (key >= sinceKey) totals[parseDay(key).getDay()]! += drink.standard_drinks;
  }
  const all = totals.reduce((sum, n) => sum + n, 0);
  if (all <= 0) return null;
  const weekday = totals.indexOf(Math.max(...totals));
  return { weekday, total: round1(totals[weekday]!), all: round1(all) };
}

export interface GameEveAverages {
  /** Average standard drinks on the day before a game or training day. */
  eve: number;
  /** Average on every other day. */
  other: number;
}

/**
 * How drinking lines up with game days: the average on the day before a game or training day
 * against the average on other days, from `sinceKey` up to yesterday. Null without game days or
 * without at least one day of each kind.
 */
export function gameEveAverages(
  drinks: Drink[],
  weekdays: number[],
  sinceKey: string,
  now: Date = new Date(),
): GameEveAverages | null {
  if (weekdays.length === 0 || weekdays.length === 7) return null;
  const sums = { eve: 0, other: 0 };
  const counts = { eve: 0, other: 0 };
  const today = startOfDay(now);
  for (let day = parseDay(sinceKey); day < today; day = addDays(day, 1)) {
    const kind = weekdays.includes((day.getDay() + 1) % 7) ? "eve" : "other";
    sums[kind] += totalOn(drinks, dayKey(day));
    counts[kind] += 1;
  }
  if (counts.eve === 0 || counts.other === 0) return null;
  return { eve: round1(sums.eve / counts.eve), other: round1(sums.other / counts.other) };
}
