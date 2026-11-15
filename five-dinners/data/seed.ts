// What a fresh install starts with: nothing. Onboarding saves the staples the person ticks, and
// finishing it plans their first (free) week from their answers (data/plan.ts createPlan).
import type { PantryItem, PlanDinner, PriceCheck, WeekPlan } from "./schema";

export const seed: {
  week_plans: WeekPlan[];
  plan_dinners: PlanDinner[];
  pantry_items: PantryItem[];
  price_checks: PriceCheck[];
} = {
  week_plans: [],
  plan_dinners: [],
  pantry_items: [],
  price_checks: [],
};
