// Starting records for a new install. Dates are relative to the day the app first runs.
// `unlocks` is the reference content for the Career tab: the athlete's levels, kits and gear.
// Levels unlock by weeks within the weekly limit, kits and gear by alcohol-free days. The first
// item of each kind is free; the rest are premium.
import {
  addDays,
  daysAgoKey,
  dayKey,
  isoDaysAgo,
  isoMinutesAgo,
  parseDay,
  weekStart,
  type Checkin,
  type Drink,
  type Unlock,
  type WeeklyGoal,
} from "./schema";

const now = new Date();
const thisWeek = weekStart(now, 1);
/** The Monday-start week, n weeks before this one. */
const weekAgo = (n: number) => dayKey(addDays(parseDay(thisWeek), -7 * n));

const drinks: Drink[] = [
  { id: "d1", logged_at: isoMinutesAgo(130, now), label: "beer", standard_drinks: 1.5, edited: false },
  { id: "d2", logged_at: isoMinutesAgo(70, now), label: "wine", standard_drinks: 1, edited: true },
  { id: "d3", logged_at: isoDaysAgo(1, 21, 10, now), label: "beer", standard_drinks: 1, edited: false },
  { id: "d4", logged_at: isoDaysAgo(1, 22, 40, now), label: "shot", standard_drinks: 1, edited: false },
  { id: "d5", logged_at: isoDaysAgo(3, 20, 15, now), label: "wine", standard_drinks: 2, edited: false },
  { id: "d6", logged_at: isoDaysAgo(4, 19, 5, now), label: "wine", standard_drinks: 2, edited: false },
  { id: "d7", logged_at: isoDaysAgo(6, 22, 30, now), label: "custom", standard_drinks: 2.5, edited: false },
];

const checkins: Checkin[] = [
  { id: "c1", date: daysAgoKey(0, now), alcohol_free: false, game_day: true, note: "Game tonight. Keeping it to two." },
  { id: "c2", date: daysAgoKey(2, now), alcohol_free: true, game_day: true, note: "Five-a-side. Legs felt quick." },
  { id: "c3", date: daysAgoKey(3, now), alcohol_free: false, game_day: false, note: "Dinner out with the team." },
  { id: "c4", date: daysAgoKey(4, now), alcohol_free: false, game_day: false, note: "Two glasses at dinner. Slow on the morning run." },
  { id: "c5", date: daysAgoKey(5, now), alcohol_free: true, game_day: false, note: "" },
  { id: "c6", date: daysAgoKey(6, now), alcohol_free: false, game_day: true, note: "Match day. Late dinner after." },
  { id: "c7", date: daysAgoKey(7, now), alcohol_free: true, game_day: true, note: "12 km long run, felt easy." },
];

const weeklyGoals: WeeklyGoal[] = [
  { id: "w1", week_start: weekAgo(1), limit: 7, total_drinks: 6, goal_met: true },
  { id: "w2", week_start: weekAgo(2), limit: 7, total_drinks: 9, goal_met: false },
  { id: "w3", week_start: weekAgo(3), limit: 7, total_drinks: 5, goal_met: true },
  { id: "w4", week_start: weekAgo(4), limit: 7, total_drinks: 7, goal_met: true },
  { id: "w5", week_start: weekAgo(5), limit: 7, total_drinks: 10, goal_met: false },
];

const unlocks: Unlock[] = [
  { id: "l1", kind: "level", name: "Rookie", description: "Turns up ready to train.", sport: "any", metric: "weeks_met", needs: 0, premium: false },
  { id: "l2", kind: "level", name: "Regular", description: "Shows up to every session.", sport: "any", metric: "weeks_met", needs: 1, premium: false },
  { id: "l3", kind: "level", name: "Dependable", description: "Keeps the plan without being reminded.", sport: "any", metric: "weeks_met", needs: 2, premium: false },
  { id: "l4", kind: "level", name: "Committed", description: "Holds the week together when it gets busy.", sport: "any", metric: "weeks_met", needs: 4, premium: true },
  { id: "l5", kind: "level", name: "Consistent", description: "Recovers quickly between sessions.", sport: "any", metric: "weeks_met", needs: 6, premium: true },
  { id: "l6", kind: "level", name: "Driven", description: "Pushes for the next personal best.", sport: "any", metric: "weeks_met", needs: 8, premium: true },
  { id: "l7", kind: "level", name: "Reliable", description: "The one every team wants on the roster.", sport: "any", metric: "weeks_met", needs: 11, premium: true },
  { id: "l8", kind: "level", name: "Seasoned", description: "Reads the game and adjusts early.", sport: "any", metric: "weeks_met", needs: 14, premium: true },
  { id: "l9", kind: "level", name: "Veteran", description: "Has seen every kind of week.", sport: "any", metric: "weeks_met", needs: 18, premium: true },
  { id: "l10", kind: "level", name: "Captain", description: "Leads by showing up sharp.", sport: "any", metric: "weeks_met", needs: 22, premium: true },
  { id: "l11", kind: "level", name: "Elite", description: "Trains hard and recovers harder.", sport: "any", metric: "weeks_met", needs: 27, premium: true },
  { id: "l12", kind: "level", name: "Pro", description: "Form that holds through the whole season.", sport: "any", metric: "weeks_met", needs: 33, premium: true },
  { id: "l13", kind: "level", name: "Legend", description: "Strong weeks, stacked over a year.", sport: "any", metric: "weeks_met", needs: 40, premium: true },
  { id: "l14", kind: "level", name: "Hall of Fame", description: "Built on a year of disciplined weeks.", sport: "any", metric: "weeks_met", needs: 48, premium: true },

  { id: "k1", kind: "kit", name: "Gym Starter Kit", description: "Plain black training tee and shorts.", sport: "gym", metric: "alcohol_free_days", needs: 0, premium: false },
  { id: "k2", kind: "kit", name: "Heavy Lift Kit", description: "Compression top for the heavy sets.", sport: "gym", metric: "alcohol_free_days", needs: 25, premium: true },
  { id: "k3", kind: "kit", name: "Road Starter Kit", description: "Light singlet and shorts for early runs.", sport: "running", metric: "alcohol_free_days", needs: 0, premium: false },
  { id: "k4", kind: "kit", name: "Trail Kit", description: "Grippy shoes and a windproof layer.", sport: "running", metric: "alcohol_free_days", needs: 18, premium: true },
  { id: "k5", kind: "kit", name: "Matchday Shirt", description: "Your colours for match day.", sport: "team", metric: "alcohol_free_days", needs: 0, premium: false },
  { id: "k6", kind: "kit", name: "Away Kit", description: "A second strip for away fixtures.", sport: "team", metric: "alcohol_free_days", needs: 30, premium: true },
  { id: "k7", kind: "kit", name: "Club Polo", description: "A clean polo for the court or the course.", sport: "racquet", metric: "alcohol_free_days", needs: 0, premium: false },
  { id: "k8", kind: "kit", name: "Tournament Whites", description: "Crisp whites for the big weekend.", sport: "racquet", metric: "alcohol_free_days", needs: 22, premium: true },

  { id: "g1", kind: "gear", name: "Lifting Straps", description: "Grip the bar when the last sets get heavy.", sport: "gym", metric: "weeks_met", needs: 2, premium: false },
  { id: "g2", kind: "gear", name: "Weightlifting Belt", description: "Extra support for the heaviest lifts.", sport: "gym", metric: "weeks_met", needs: 12, premium: true },
  { id: "g3", kind: "gear", name: "Racing Flats", description: "Light shoes for tempo days.", sport: "running", metric: "weeks_met", needs: 3, premium: false },
  { id: "g4", kind: "gear", name: "Carbon Plate Shoes", description: "Stiff, fast shoes for race week.", sport: "running", metric: "weeks_met", needs: 14, premium: true },
  { id: "g5", kind: "gear", name: "Shin Guards", description: "Protection for every match.", sport: "team", metric: "weeks_met", needs: 2, premium: false },
  { id: "g6", kind: "gear", name: "Compression Sleeves", description: "Calf and thigh sleeves for long games.", sport: "team", metric: "weeks_met", needs: 10, premium: true },
  { id: "g7", kind: "gear", name: "Overgrip Pack", description: "A fresh grip for a steady hold.", sport: "racquet", metric: "weeks_met", needs: 4, premium: false },
  { id: "g8", kind: "gear", name: "Full-Size Kit Bag", description: "Room for two racquets or a half set of clubs.", sport: "racquet", metric: "weeks_met", needs: 16, premium: true },
];

export const seed = {
  drinks,
  checkins,
  weekly_goals: weeklyGoals,
  unlocks,
};
