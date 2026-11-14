// The one place the tabs get the person's week from, so Tonight, Week and Career always show the
// same limit, totals, form and game days. It reads the saved records and the choices made in
// onboarding and Settings; the arithmetic itself lives in data/schema.
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import { useCollection } from "../data/repo";
import {
  SPORTS,
  athleteStats,
  dayKey,
  estimateBac,
  gameWeekdays,
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
  const limit = limitFrom(answers);
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

  /** The person's first real entry, counted once: the app's first meaningful success. */
  function noteFirstEntry(kind: "drink" | "alcohol_free", where: string) {
    if (answers.first_entry) return;
    track("first_success", { kind, where });
    void setAnswer("first_entry", kind);
  }

  /** Log a drink now. A day with a drink on it is no longer marked alcohol-free. */
  async function logDrink(label: DrinkLabel, amount: number, where = "tonight") {
    await drinks.add({
      logged_at: new Date().toISOString(),
      label,
      standard_drinks: amount,
      edited: false,
    });
    if (todayCheckin?.alcohol_free) await checkins.update(todayCheckin.id, { alcohol_free: false });
    haptic("success");
    track("drink_logged", { type: label, units: amount });
    noteFirstEntry("drink", where);
  }

  /** Mark today alcohol-free, or take the mark back. Not possible once a drink is logged today. */
  async function setAlcoholFree(next: boolean, where = "tonight") {
    if (next && todayTotal > 0) return;
    if (todayCheckin) await checkins.update(todayCheckin.id, { alcohol_free: next });
    else if (next) await checkins.add({ date: today, alcohol_free: true, game_day: false, note: "" });
    haptic(next ? "success" : "selection");
    if (next) {
      track("alcohol_free_day");
      noteFirstEntry("alcohol_free", where);
    }
  }

  return {
    loading: drinks.loading || checkins.loading || goals.loading,
    logDrink,
    setAlcoholFree,
    removeDrink: (id: string) => drinks.remove(id),
    markedAlcoholFree: Boolean(todayCheckin?.alcohol_free),
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
