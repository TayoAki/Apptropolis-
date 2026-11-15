// The weekly loop: plan a week from the answers, swap and cook dinners, tick the shop, and when
// a week ends write what is left of its packs into the cupboard for the next plan.
// Every change goes through one queue and reads the stored rows fresh, so quick taps and two
// screens changing things at once never overwrite each other.
import { useEffect, useMemo } from "react";
import { chooseDinners, closeWeekChanges, reconcileDinners, type Replacement } from "./planner";
import { defaultRepository, newId, useCollection } from "./repo";
import {
  DINNERS_PER_WEEK,
  PACKS,
  PLAN_DAYS,
  STORE_LABEL,
  PRICE_SOURCE,
  addDays,
  basketTotal,
  buildBasket,
  cupboardStock,
  dinnerCosts,
  dinnerUsage,
  formatPackSize,
  getRecipe,
  pantryFromSnapshot,
  readHousehold,
  todayISO,
  type BasketLine,
  type PantryItem,
  type PlanDinner,
  type PriceCheck,
  type WeekPlan,
} from "./schema";

const PLANS = "week_plans";
const DINNERS = "plan_dinners";
const PANTRY = "pantry_items";
const CHECKS = "price_checks";

const repo = defaultRepository;

let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Plans in the order they were made; the last one is the current plan. */
export function sortPlans(plans: WeekPlan[]): WeekPlan[] {
  return [...plans].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** The day after the plan's seventh day. */
export function planEnds(plan: WeekPlan): string {
  return addDays(plan.weekStart, PLAN_DAYS);
}

export function isActive(plan: WeekPlan, today: string = todayISO()): boolean {
  return today >= plan.weekStart && today < planEnds(plan);
}

function dinnersOf(dinners: PlanDinner[], planId: string): PlanDinner[] {
  return dinners.filter((d) => d.planId === planId).sort((a, b) => a.dayIndex - b.dayIndex);
}

async function load() {
  const [plans, dinners, pantry] = await Promise.all([
    repo.list<WeekPlan>(PLANS),
    repo.list<PlanDinner>(DINNERS),
    repo.list<PantryItem>(PANTRY),
  ]);
  return { plans: sortPlans(plans), dinners, pantry };
}

async function writeCupboard(plan: WeekPlan, dinners: PlanDinner[], pantry: PantryItem[]) {
  const changes = closeWeekChanges(plan.weekStart, dinners, pantry, todayISO());
  for (const id of changes.remove) await repo.remove(PANTRY, id);
  for (const item of changes.put) await repo.put(PANTRY, item);
  for (const item of changes.add) await repo.put(PANTRY, { ...item, id: newId() });
  await repo.put(PLANS, {
    ...plan,
    closed: true,
    cupboardAtClose: Object.fromEntries(cupboardStock(pantry)),
  });
}

/** Write the current plan's leftovers into the cupboard once its seven days are over. */
export function closeEndedPlan(): Promise<boolean> {
  return exclusive(async () => {
    const { plans, dinners, pantry } = await load();
    const plan = plans[plans.length - 1];
    if (!plan || plan.closed || isActive(plan)) return false;
    await writeCupboard(plan, dinnersOf(dinners, plan.id), pantry);
    return true;
  });
}

export type PlanResult =
  | { ok: true; plan: WeekPlan }
  | { ok: false; reason: "locked" | "active" | "empty" };

/**
 * Plan the next week from the saved answers. The first plan is the free week; after that a new
 * plan needs premium, and the current plan must be over or fully cooked. Its leftovers go into
 * the cupboard first, so the new plan is chosen around them.
 */
export function createPlan(answers: Record<string, string>, isPremium: boolean): Promise<PlanResult> {
  return exclusive(async () => {
    let { plans, dinners, pantry } = await load();
    const current = plans[plans.length - 1];
    if (current) {
      if (!isPremium) return { ok: false, reason: "locked" } as const;
      const currentDinners = dinnersOf(dinners, current.id);
      const allCooked = currentDinners.length > 0 && currentDinners.every((d) => d.cooked);
      if (isActive(current) && !allCooked) return { ok: false, reason: "active" } as const;
      if (!current.closed) {
        await writeCupboard(current, currentDinners, pantry);
        pantry = await repo.list<PantryItem>(PANTRY);
      }
    }
    const household = readHousehold(answers);
    const previous = current ? dinnersOf(dinners, current.id) : [];
    const ids = chooseDinners({ household, pantry, isPremium, history: dinners, previous });
    if (ids.length === 0) return { ok: false, reason: "empty" } as const;
    const today = todayISO();
    const plan: WeekPlan = {
      id: newId(),
      weekStart: today,
      servings: household.servings,
      ticked: [],
      receipt: 0,
      closed: false,
    };
    await repo.put(PLANS, plan);
    for (let i = 0; i < ids.length; i++) {
      const dinner: PlanDinner = {
        id: newId(),
        planId: plan.id,
        weekStart: plan.weekStart,
        recipeId: ids[i]!,
        dayIndex: i + 1,
        servings: household.servings,
        cooked: false,
        used: {},
        cookedOn: "",
        rating: "",
        keepNextWeek: false,
      };
      await repo.put(DINNERS, dinner);
    }
    return { ok: true, plan } as const;
  });
}

/**
 * Apply changed answers to the current plan: dinners not cooked yet are rescaled to the
 * household size, and any the household no longer eats (or too few vegetarian nights) are
 * swapped. Returns the swaps made.
 */
export function applyAnswersToPlan(
  answers: Record<string, string>,
  isPremium: boolean,
): Promise<Replacement[]> {
  return exclusive(async () => {
    const { plans, dinners, pantry } = await load();
    const plan = plans[plans.length - 1];
    if (!plan || !isActive(plan)) return [];
    const household = readHousehold(answers);
    const mine = dinnersOf(dinners, plan.id);
    const previousPlan = plans[plans.length - 2];
    const previous = previousPlan ? dinnersOf(dinners, previousPlan.id) : [];
    const resized = mine.map((d) => (d.cooked ? d : { ...d, servings: household.servings }));
    const swaps = reconcileDinners(resized, {
      household,
      pantry,
      isPremium,
      history: dinners.filter((d) => d.planId !== plan.id),
      previous,
    });
    for (const d of resized) {
      const swap = swaps.find((s) => s.dinnerId === d.id);
      const next = swap ? { ...d, recipeId: swap.to, rating: "" as const, keepNextWeek: false } : d;
      const before = mine.find((m) => m.id === d.id)!;
      if (next.servings !== before.servings || next.recipeId !== before.recipeId) {
        await repo.put(DINNERS, next);
      }
    }
    if (plan.servings !== household.servings) {
      await repo.put(PLANS, { ...plan, servings: household.servings });
    }
    return swaps;
  });
}

async function patchRecord<T extends { id: string }>(
  collection: string,
  id: string,
  patch: (current: T) => Partial<T> | null,
): Promise<T | null> {
  return exclusive(async () => {
    const rows = await repo.list<T>(collection);
    const current = rows.find((r) => r.id === id);
    if (!current) return null;
    const change = patch(current);
    if (!change) return current;
    const next = { ...current, ...change, id };
    await repo.put(collection, next);
    return next;
  });
}

export function swapDinner(dinnerId: string, recipeId: string) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, () => ({
    recipeId,
    cooked: false,
    used: {},
    cookedOn: "",
    rating: "",
    keepNextWeek: false,
  }));
}

/** Mark a dinner cooked and record what it took from the packs. */
export function cookDinner(dinnerId: string) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, (d) => {
    const recipe = getRecipe(d.recipeId);
    if (!recipe || d.cooked) return null;
    return { cooked: true, used: dinnerUsage(recipe, d.servings), cookedOn: todayISO() };
  });
}

export function uncookDinner(dinnerId: string) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, () => ({
    cooked: false,
    used: {},
    cookedOn: "",
  }));
}

export function rateDinner(dinnerId: string, rating: PlanDinner["rating"]) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, () => ({ rating }));
}

export function setKeepNextWeek(dinnerId: string, keepNextWeek: boolean) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, () => ({ keepNextWeek }));
}

/** Servings for one dinner that isn't cooked yet; the list and prices follow. */
export function setDinnerServings(dinnerId: string, servings: number) {
  return patchRecord<PlanDinner>(DINNERS, dinnerId, (d) =>
    d.cooked ? null : { servings: Math.max(1, Math.min(12, servings)) },
  );
}

export function setTicked(planId: string, ticked: string[]) {
  return patchRecord<WeekPlan>(PLANS, planId, () => ({ ticked: [...new Set(ticked)] }));
}

export function setReceipt(planId: string, receipt: number) {
  return patchRecord<WeekPlan>(PLANS, planId, () => ({ receipt }));
}

export function setPantryConfirmed(itemId: string, confirmed: boolean) {
  return patchRecord<PantryItem>(PANTRY, itemId, () => ({ confirmed, updatedAt: todayISO() }));
}

/** A staple ticked as in the cupboard counts as one full pack until a week's use is written. */
export function setStaple(packKey: string, inCupboard: boolean) {
  return exclusive(async () => {
    const pack = PACKS[packKey];
    if (!pack) return;
    const rows = await repo.list<PantryItem>(PANTRY);
    const existing = rows.find((r) => r.packKey === packKey && r.isStaple);
    if (existing) {
      await repo.put(PANTRY, {
        ...existing,
        confirmed: inCupboard,
        quantity: inCupboard && existing.quantity <= 0 ? pack.size : existing.quantity,
        updatedAt: todayISO(),
      });
    } else if (inCupboard) {
      await repo.put(PANTRY, {
        id: newId(),
        packKey,
        ingredient: pack.name,
        quantity: pack.size,
        unit: pack.unit,
        isStaple: true,
        fromWeek: "",
        confirmed: true,
        updatedAt: todayISO(),
      });
    }
  });
}

/** Log what was paid for a pack on the list (and tick it). */
export function savePaidPrice(plan: WeekPlan, line: BasketLine, amount: number) {
  return exclusive(async () => {
    const checks = await repo.list<PriceCheck>(CHECKS);
    const existing = checks.find((c) => c.planId === plan.id && c.packKey === line.pack.key);
    const today = todayISO();
    await repo.put(CHECKS, {
      ...(existing ?? {
        id: newId(),
        planId: plan.id,
        packKey: line.pack.key,
        ingredient: line.pack.name,
        packSize: formatPackSize(line.pack),
        store: STORE_LABEL,
        estimateDate: PRICE_SOURCE.checked,
        weekStart: plan.weekStart,
      }),
      estimatedPrice: line.cost,
      paidPrice: amount,
      paidDate: today,
    } as PriceCheck);
    const plans = await repo.list<WeekPlan>(PLANS);
    const current = plans.find((p) => p.id === plan.id);
    if (current && !current.ticked.includes(line.pack.key)) {
      await repo.put(PLANS, { ...current, ticked: [...current.ticked, line.pack.key] });
    }
  });
}

let cleaned: Promise<void> | null = null;
/**
 * Earlier builds seeded a demo week (UK packs, no plan ids). Those rows match nothing in the
 * current catalogue, so they are cleared once rather than shown as someone's leftovers.
 */
function clearLegacyRows(): Promise<void> {
  cleaned ??= exclusive(async () => {
    const [dinners, pantry, checks] = await Promise.all([
      repo.list<PlanDinner>(DINNERS),
      repo.list<PantryItem>(PANTRY),
      repo.list<PriceCheck>(CHECKS),
    ]);
    for (const d of dinners) if (!d.planId) await repo.remove(DINNERS, d.id);
    for (const p of pantry) if (!p.packKey || !PACKS[p.packKey]) await repo.remove(PANTRY, p.id);
    for (const c of checks) if (!c.planId) await repo.remove(CHECKS, c.id);
  });
  return cleaned;
}

/** The current plan and everything priced from it: the one source for every screen's numbers. */
export function usePlanData() {
  const plansCol = useCollection<WeekPlan>(PLANS);
  const dinnersCol = useCollection<PlanDinner>(DINNERS);
  const pantryCol = useCollection<PantryItem>(PANTRY);
  const loading = plansCol.loading || dinnersCol.loading || pantryCol.loading;
  const today = todayISO();

  const plans = useMemo(() => sortPlans(plansCol.items), [plansCol.items]);
  const plan = plans[plans.length - 1] ?? null;
  const firstPlan = plans[0] ?? null;
  const status: "none" | "active" | "ended" = !plan ? "none" : isActive(plan, today) ? "active" : "ended";

  const dinners = useMemo(
    () => (plan ? dinnersOf(dinnersCol.items, plan.id) : []),
    [plan, dinnersCol.items],
  );
  const pantry = pantryCol.items;
  // A closed plan stays priced against the cupboard it was planned with, not today's.
  const planPantry = useMemo(
    () => (plan?.closed && plan.cupboardAtClose ? pantryFromSnapshot(plan.cupboardAtClose) : pantry),
    [plan, pantry],
  );
  const inputs = useMemo(
    () => dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings })),
    [dinners],
  );
  const lines = useMemo(() => buildBasket(inputs, planPantry), [inputs, planPantry]);
  const total = basketTotal(lines);
  const costs = useMemo(() => dinnerCosts(inputs, planPantry), [inputs, planPantry]);
  const costOf = (dinnerId: string) => costs[dinners.findIndex((d) => d.id === dinnerId)] ?? 0;

  const leftovers = pantry.filter((p) => !p.isStaple && p.fromWeek && p.quantity > 0);
  const carried = leftovers.filter((p) => p.confirmed);
  const allCooked = dinners.length > 0 && dinners.every((d) => d.cooked);

  // The free week is the first plan's seven days.
  const freeWeekEnds = firstPlan ? planEnds(firstPlan) : "";
  const inFreeWeek = Boolean(firstPlan) && today < freeWeekEnds;

  useEffect(() => {
    void clearLegacyRows();
  }, []);

  useEffect(() => {
    if (!loading && plan && status === "ended" && !plan.closed) void closeEndedPlan();
  }, [loading, plan, status]);

  return {
    loading,
    plans,
    plan,
    firstPlan,
    status,
    dinners,
    allDinners: dinnersCol.items,
    pantry,
    planPantry,
    lines,
    total,
    costs,
    costOf,
    leftovers,
    carried,
    allCooked,
    freeWeekEnds,
    inFreeWeek,
    planEnds: plan ? planEnds(plan) : "",
    dinnersPerWeek: DINNERS_PER_WEEK,
  };
}
