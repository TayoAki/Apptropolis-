// Choosing a week's five dinners, replacing dinners when answers change, and working out what
// is left of the packs when a week ends. Pure functions: data/plan.ts reads and writes.
import {
  DINNERS_PER_WEEK,
  PACK_LIST,
  RECIPES,
  buildBasket,
  cupboardStock,
  dinnerUsage,
  getRecipe,
  isAllowed,
  round2,
  type Household,
  type PantryItem,
  type PlanDinner,
  type Recipe,
} from "./schema";

/** The recipes a plan can use: what the household eats, and the free set until unlocked. */
export function recipePool(household: Household, isPremium: boolean): Recipe[] {
  return RECIPES.filter((r) => isAllowed(r, household.excluded) && (isPremium || !r.premium));
}

/** Leftovers from earlier weeks (not staples) still confirmed in the cupboard, by pack key. */
export function leftoverStock(pantry: PantryItem[]): Map<string, number> {
  return cupboardStock(pantry.filter((p) => !p.isStaple && p.fromWeek));
}

const PROTEINS = ["chickenThigh", "chickenBreast", "beef", "sausage", "bacon", "salmon", "tuna", "eggs", "chickpeas", "lentils", "mushrooms"];

const BASES: Record<string, string> = {
  penne: "pasta",
  spaghetti: "pasta",
  rice: "rice",
  tortillas: "tortillas",
  potatoes: "potatoes",
  sweetPotato: "potatoes",
};

function mainProtein(recipe: Recipe): string {
  return recipe.ingredients.find(([key]) => PROTEINS.includes(key))?.[0] ?? recipe.id;
}

/** Pasta, rice, tortillas or potatoes: no more than two nights of the same. */
function mainBase(recipe: Recipe): string {
  const key = recipe.ingredients.find(([k]) => BASES[k])?.[0];
  return key ? BASES[key]! : recipe.id;
}

export interface PlanInputs {
  household: Household;
  pantry: PantryItem[];
  isPremium: boolean;
  /** Every dinner from earlier plans: ratings steer the choice. */
  history: PlanDinner[];
  /** Dinners of the plan before this one: "Keep for next week" and repeats. */
  previous: PlanDinner[];
}

interface Scorer {
  pool: Recipe[];
  score(ids: string[]): { score: number; cost: number; veg: number };
}

/** The latest rating each recipe got. */
function latestRatings(history: PlanDinner[]): Map<string, "up" | "down"> {
  const sorted = [...history].sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.dayIndex - b.dayIndex,
  );
  const out = new Map<string, "up" | "down">();
  for (const d of sorted) if (d.rating) out.set(d.recipeId, d.rating);
  return out;
}

function makeScorer(inputs: PlanInputs): Scorer {
  const { household, pantry, isPremium } = inputs;
  const pool = recipePool(household, isPremium);
  const stock = cupboardStock(pantry);
  const leftovers = leftoverStock(pantry);
  const ratings = latestRatings(inputs.history);
  const kept = new Set(inputs.previous.filter((d) => d.keepNextWeek).map((d) => d.recipeId));
  const lastWeek = new Set(inputs.previous.map((d) => d.recipeId));
  const usage = new Map(
    RECIPES.map((r) => [r.id, dinnerUsage(r, household.servings)] as const),
  );
  const budget = Math.max(1, household.budget);

  function score(ids: string[]) {
    const needs = new Map<string, number>();
    let veg = 0;
    let s = 0;
    const diets = new Map<string, number>();
    const proteins = new Map<string, number>();
    const bases = new Map<string, number>();
    for (const id of ids) {
      const recipe = getRecipe(id);
      if (!recipe) continue;
      for (const [key, qty] of Object.entries(usage.get(id) ?? {})) {
        needs.set(key, (needs.get(key) ?? 0) + qty);
      }
      if (recipe.diet === "vegetarian") veg += 1;
      diets.set(recipe.diet, (diets.get(recipe.diet) ?? 0) + 1);
      const p = mainProtein(recipe);
      proteins.set(p, (proteins.get(p) ?? 0) + 1);
      const b = mainBase(recipe);
      bases.set(b, (bases.get(b) ?? 0) + 1);
      const rating = ratings.get(id);
      if (rating === "up") s += 2;
      if (rating === "down") s -= 6;
      // Last week again only when kept: a liked dinner can come back, just not every week.
      if (lastWeek.has(id) && !kept.has(id)) s -= rating === "up" ? 3 : 4;
    }
    let cost = 0;
    for (const pack of PACK_LIST) {
      const need = needs.get(pack.key);
      if (!need) continue;
      const short = Math.max(0, need - (stock.get(pack.key) ?? 0));
      if (short > 0) cost += Math.ceil(short / pack.size - 1e-9) * pack.price;
      const left = leftovers.get(pack.key);
      // Using up last week's packs is the point of the plan: worth more than anything but budget.
      if (left) s += 6 + (6 * Math.min(need, left)) / left;
    }
    for (const n of diets.values()) if (n > 2) s -= 2 * (n - 2);
    for (const n of proteins.values()) if (n > 1) s -= n - 1;
    for (const n of bases.values()) if (n > 2) s -= 2 * (n - 2);
    cost = round2(cost);
    s -= (4 * cost) / budget;
    return { score: s, cost, veg };
  }

  return { pool, score };
}

/**
 * The best five dinners for the household: within budget when any set is, with at least the
 * asked-for vegetarian nights, "Keep for next week" dinners first, then whatever uses up the
 * leftovers in the cupboard, liked dinners, variety and a low basket total.
 */
export function chooseDinners(inputs: PlanInputs): string[] {
  const { household } = inputs;
  const { pool, score } = makeScorer(inputs);
  const poolIds = pool.map((r) => r.id);
  const kept = [
    ...new Set(inputs.previous.filter((d) => d.keepNextWeek).map((d) => d.recipeId)),
  ]
    .filter((id) => poolIds.includes(id))
    .slice(0, DINNERS_PER_WEEK);
  const candidates = poolIds.filter((id) => !kept.includes(id));
  const k = Math.min(DINNERS_PER_WEEK - kept.length, candidates.length);
  const vegNeeded = Math.min(household.vegNights, DINNERS_PER_WEEK);

  type Best = { ids: string[]; score: number } | null;
  let withinBudget: Best = null;
  let anyCost: Best = null;
  let fallback: Best = null;
  const pick: string[] = [];

  function consider(ids: string[]) {
    const r = score(ids);
    if (!fallback || r.score > fallback.score) fallback = { ids, score: r.score };
    if (r.veg < Math.min(vegNeeded, ids.length)) return;
    if (!anyCost || r.score > anyCost.score) anyCost = { ids, score: r.score };
    if (r.cost <= household.budget && (!withinBudget || r.score > withinBudget.score))
      withinBudget = { ids, score: r.score };
  }

  function walk(start: number) {
    if (pick.length === k) {
      consider([...kept, ...pick]);
      return;
    }
    for (let i = start; i <= candidates.length - (k - pick.length); i++) {
      pick.push(candidates[i]!);
      walk(i + 1);
      pick.pop();
    }
  }
  walk(0);

  const best = (withinBudget ?? anyCost ?? fallback) as Best;
  const ids = best ? best.ids : kept;
  return orderDinners(ids, inputs.pantry);
}

/** Dinners that use leftovers (most first) go early in the week, then the library order. */
function orderDinners(ids: string[], pantry: PantryItem[]): string[] {
  const leftovers = leftoverStock(pantry);
  const uses = (id: string) => {
    const recipe = getRecipe(id);
    return recipe ? recipe.ingredients.filter(([key]) => leftovers.has(key)).length : 0;
  };
  const index = (id: string) => RECIPES.findIndex((r) => r.id === id);
  return [...ids].sort((a, b) => uses(b) - uses(a) || index(a) - index(b));
}

/** Leftover pack keys a recipe would use. */
export function leftoverKeysUsed(recipe: Recipe, pantry: PantryItem[]): string[] {
  const leftovers = leftoverStock(pantry);
  return recipe.ingredients.map(([key]) => key).filter((key) => leftovers.has(key));
}

export interface Replacement {
  dinnerId: string;
  from: string;
  to: string;
  reason: "excluded" | "vegetarian";
}

/**
 * Make the not-yet-cooked dinners of a plan fit the answers: dinners the household no longer
 * eats are replaced, and non-vegetarian dinners are swapped until the vegetarian nights are met.
 */
export function reconcileDinners(dinners: PlanDinner[], inputs: PlanInputs): Replacement[] {
  const { household } = inputs;
  const { pool, score } = makeScorer(inputs);
  const ids = dinners.map((d) => d.recipeId);
  const changes: Replacement[] = [];

  function bestFor(index: number, filter: (r: Recipe) => boolean): string | null {
    let best: { id: string; score: number } | null = null;
    for (const r of pool) {
      if (ids.includes(r.id) || !filter(r)) continue;
      const next = ids.map((id, i) => (i === index ? r.id : id));
      const { score: s, cost } = score(next);
      // Prefer a replacement that keeps the week within budget.
      const value = s - (cost > household.budget ? 100 : 0);
      if (!best || value > best.score) best = { id: r.id, score: value };
    }
    return best?.id ?? null;
  }

  dinners.forEach((d, i) => {
    if (d.cooked) return;
    const recipe = getRecipe(ids[i]!);
    if (recipe && isAllowed(recipe, household.excluded) && (inputs.isPremium || !recipe.premium))
      return;
    const to = bestFor(i, () => true);
    if (to) {
      changes.push({ dinnerId: d.id, from: ids[i]!, to, reason: "excluded" });
      ids[i] = to;
    }
  });

  const vegCount = () => ids.filter((id) => getRecipe(id)?.diet === "vegetarian").length;
  const target = Math.min(household.vegNights, DINNERS_PER_WEEK);
  while (vegCount() < target) {
    // Replace the uncooked non-vegetarian dinner whose best vegetarian swap scores highest.
    let best: { i: number; to: string; score: number } | null = null;
    dinners.forEach((d, i) => {
      if (d.cooked || getRecipe(ids[i]!)?.diet === "vegetarian") return;
      const to = bestFor(i, (r) => r.diet === "vegetarian");
      if (!to) return;
      const s = score(ids.map((id, j) => (j === i ? to : id))).score;
      if (!best || s > best.score) best = { i, to, score: s };
    });
    if (!best) break;
    const { i, to } = best as { i: number; to: string; score: number };
    const existing = changes.find((c) => c.dinnerId === dinners[i]!.id);
    if (existing) {
      existing.to = to;
    } else {
      changes.push({ dinnerId: dinners[i]!.id, from: ids[i]!, to, reason: "vegetarian" });
    }
    ids[i] = to;
  }
  return changes;
}

/** What is left of each pack right now: the cupboard plus the list, less what cooked dinners used. */
export function remainingStock(dinners: PlanDinner[], pantry: PantryItem[]) {
  const lines = buildBasket(
    dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings })),
    pantry,
  );
  const remaining = new Map<string, number>();
  const available = new Map<string, number>();
  for (const line of lines) {
    const have = round2(line.inCupboard + line.packs * line.pack.size);
    available.set(line.pack.key, have);
    remaining.set(line.pack.key, have);
  }
  for (const d of dinners) {
    if (!d.cooked) continue;
    for (const [key, qty] of Object.entries(d.used ?? {})) {
      if (!remaining.has(key)) continue;
      remaining.set(key, Math.max(0, round2(remaining.get(key)! - qty)));
    }
  }
  return { lines, available, remaining };
}

export interface CupboardChanges {
  put: PantryItem[];
  add: Omit<PantryItem, "id">[];
  remove: string[];
}

/**
 * When a week ends, what is left of its packs goes into the cupboard: staples keep their place
 * with the new amount, other packs become leftovers dated to the week, and anything marked
 * "used up" at the check-in is cleared.
 */
export function closeWeekChanges(
  weekStart: string,
  dinners: PlanDinner[],
  pantry: PantryItem[],
  today: string,
): CupboardChanges {
  const { remaining } = remainingStock(dinners, pantry);
  const changes: CupboardChanges = { put: [], add: [], remove: [] };
  const handled = new Set<string>();
  for (const [key, left] of remaining) {
    const pack = PACK_LIST.find((p) => p.key === key)!;
    const staple = pantry.find((p) => p.packKey === key && p.isStaple);
    const others = pantry.filter((p) => p.packKey === key && !p.isStaple);
    others.forEach((p) => {
      changes.remove.push(p.id);
      handled.add(p.id);
    });
    if (staple) {
      handled.add(staple.id);
      changes.put.push({ ...staple, quantity: left, confirmed: staple.confirmed || left > 0, updatedAt: today });
    } else if (left > 0) {
      changes.add.push({
        packKey: key,
        ingredient: pack.name,
        quantity: left,
        unit: pack.unit,
        isStaple: false,
        fromWeek: weekStart,
        confirmed: true,
        updatedAt: today,
      });
    }
  }
  for (const p of pantry) {
    if (handled.has(p.id)) continue;
    if (!p.isStaple && (!p.confirmed || p.quantity <= 0)) changes.remove.push(p.id);
  }
  return changes;
}
