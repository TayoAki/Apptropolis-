// The one place the tabs get the person's week from, so Tonight, Week and Career always show the
// same limit, totals, form and game days. It reads the saved records and the choices made in
// onboarding and Settings; the arithmetic itself lives in data/schema.
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import { useCollection } from "../data/repo";
import {
  SPORTS,
  athleteStats,
  dayKey,
  estimateBac,
  firstEntryDay,
  gameWeekdays,
  lighterLimitFor,
  limitFrom,
  nextGameDay,
  outlookFor,
  parseDay,
  profileFrom,
  sportFrom,
  totalForWeek,
  totalOn,
  weekDays,
  weekStart,
  weekStartsOn,
  weeksToClose,
  type Checkin,
  type Drink,
  type DrinkLabel,
  type WeeklyGoal,
} from "../data/schema";
import { haptic } from "./motion";

/** Re-renders the screen every minute and whenever the app comes back to the front. */
function useClock(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const tick = () => setTick((n) => n + 1);
    const timer = setInterval(tick, 60 * 1000);
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Every write to the on-device store rewrites a whole collection, so two writes that overlap
// (a quick double tap, an erase of many rows) can lose one. All of the app's writes go through
// this queue and run one after another.
let queue: Promise<unknown> = Promise.resolve();
export function inOrder<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Weeks whose result is being saved right now, so two screens don't both save it. */
const closing = new Set<string>();

export function useAthlete() {
  const { answers, setAnswer } = useAppState();
  const drinks = useCollection<Drink>("drinks");
  const checkins = useCollection<Checkin>("checkins");
  const goals = useCollection<WeeklyGoal>("weekly_goals");
  useClock();

  const now = new Date();
  const today = dayKey(now);
  const startsOn = weekStartsOn(answers);
  const weekKey = weekStart(now, startsOn);
  const days = weekDays(weekKey);
  // This week's limit: the usual one, or a lighter one set for this week only.
  const usualLimit = limitFrom(answers);
  const limit = lighterLimitFor(answers, weekKey) ?? usualLimit;
  const sport = sportFrom(answers);
  const sportInfo = SPORTS.find((s) => s.id === sport) ?? SPORTS[0]!;
  const profile = profileFrom(answers);

  const weekTotal = round1(totalForWeek(drinks.items, weekKey));
  const over = weekTotal > limit;
  const weekCheckins = checkins.items.filter((c) => days.includes(c.date));
  const freeDaysThisWeek = weekCheckins.filter((c) => c.alcohol_free).length;
  const todayCheckin = checkins.items.find((c) => c.date === today);
  const todayTotal = round1(totalOn(drinks.items, today));

  // Game days come from the training days chosen in Settings, plus any day a check-in marks.
  const weekdays = gameWeekdays(answers);
  const gameDays = days.filter(
    (key) =>
      weekdays.includes(parseDay(key).getDay()) ||
      weekCheckins.some((c) => c.date === key && c.game_day),
  );
  const nextGame = nextGameDay(weekdays, now) ?? gameDays.find((key) => key >= today) ?? null;

  const stats = athleteStats(drinks.items, checkins.items, limit, now);
  const outlook = outlookFor(stats.form, sport);
  const bac = estimateBac(drinks.items, profile, now);

  const loading = drinks.loading || checkins.loading || goals.loading;
  const [error, setError] = useState<string | null>(null);
  /** The drink removed last, kept so the removal can be undone. */
  const [removed, setRemoved] = useState<Drink | null>(null);

  // Close finished weeks: each past week with entries gets one saved result (its total against
  // the limit), which is what Career's levels, gear and streak count. Weeks before
  // `career_since` (the first entry, or the last reset) are left alone.
  const since = answers.career_since;
  const sinceRef = useRef(since);
  sinceRef.current = since;
  useEffect(() => {
    if (loading) return;
    if (!since) {
      const first = firstEntryDay(drinks.items, checkins.items);
      if (first) void setAnswer("career_since", first);
      return;
    }
    const due = weeksToClose(drinks.items, checkins.items, goals.items, since, weekKey).filter(
      (week) => !closing.has(week.week_start),
    );
    for (const week of due) {
      closing.add(week.week_start);
      const weekLimit = lighterLimitFor(answers, week.week_start) ?? usualLimit;
      void inOrder(async () => {
        // A reset in the meantime moves `career_since` forward: leave older weeks alone.
        if (sinceRef.current && week.week_start < weekStart(parseDay(sinceRef.current), startsOn)) {
          return;
        }
        await goals.add({
          id: `week-${week.week_start}`,
          week_start: week.week_start,
          limit: weekLimit,
          total_drinks: week.total_drinks,
          goal_met: week.total_drinks <= weekLimit,
        });
      })
        .catch(() => undefined)
        .finally(() => closing.delete(week.week_start));
    }
    // The records themselves are the trigger: a new week, a new entry or a reset re-runs this.
  }, [loading, since, weekKey, drinks.items, checkins.items, goals.items]);

  /** Run a write in order; a failure is shown to the person instead of being swallowed. */
  async function save(task: () => Promise<void>): Promise<boolean> {
    try {
      await inOrder(task);
      setError(null);
      return true;
    } catch {
      setError("That didn't save. Check your phone's storage and try again.");
      return false;
    }
  }

  /** The person's first real entry, counted once: the app's first meaningful success. */
  function noteFirstEntry(kind: "drink" | "alcohol_free", where: string) {
    if (answers.first_entry) return;
    track("first_success", { kind, where });
    void setAnswer("first_entry", kind);
  }

  /** Log a drink now. A day with a drink on it is no longer marked alcohol-free. */
  async function logDrink(label: DrinkLabel, amount: number, where = "tonight") {
    setRemoved(null);
    const ok = await save(async () => {
      await drinks.add({
        logged_at: new Date().toISOString(),
        label,
        standard_drinks: amount,
        edited: false,
      });
      if (todayCheckin?.alcohol_free) {
        await checkins.update(todayCheckin.id, { alcohol_free: false });
      }
    });
    if (!ok) return;
    haptic("success");
    track("drink_logged", { type: label, units: amount });
    noteFirstEntry("drink", where);
  }

  /** Remove a logged drink; it can be put back with undoRemove until the next entry. */
  async function removeDrink(id: string) {
    const drink = drinks.items.find((d) => d.id === id) ?? null;
    const ok = await save(() => drinks.remove(id));
    if (ok) setRemoved(drink);
  }

  /** Put back the drink removed last, at the time it was first logged. */
  async function undoRemove() {
    if (!removed) return;
    const drink = removed;
    const ok = await save(async () => {
      await drinks.add(drink);
    });
    if (ok) setRemoved(null);
  }

  /** Mark today alcohol-free, or take the mark back. Not possible once a drink is logged today. */
  async function setAlcoholFree(next: boolean, where = "tonight") {
    if (next && todayTotal > 0) return;
    const ok = await save(async () => {
      if (todayCheckin) await checkins.update(todayCheckin.id, { alcohol_free: next });
      else if (next) {
        await checkins.add({ date: today, alcohol_free: true, game_day: false, note: "" });
      }
    });
    if (!ok) return;
    haptic(next ? "success" : "selection");
    if (next) {
      track("alcohol_free_day");
      noteFirstEntry("alcohol_free", where);
    }
  }

  return {
    loading,
    error,
    logDrink,
    setAlcoholFree,
    removeDrink,
    removed,
    undoRemove,
    dismissRemoved: () => setRemoved(null),
    markedAlcoholFree: Boolean(todayCheckin?.alcohol_free),
    usualLimit,
    answers,
    now,
    today,
    startsOn,
    weekKey,
    days,
    limit,
    sport,
    sportLabel: sportInfo.label,
    sportNoun: sportInfo.noun,
    profile,
    drinks,
    checkins,
    goals,
    weekTotal,
    over,
    freeDaysThisWeek,
    todayCheckin,
    todayTotal,
    gameDays,
    nextGame,
    stats,
    outlook,
    bac,
  };
}

export type Athlete = ReturnType<typeof useAthlete>;
