import {
  HOME_STORE,
  PACKS,
  addDays,
  daysAgoISO,
  dinnerCosts,
  formatPackSize,
  round2,
  weekStartOf,
  type PantryItem,
  type PlanDinner,
  type PriceCheck,
} from "./schema";

const weekStart = weekStartOf();
const lastWeek = addDays(weekStart, -7);

const pantry_items: PantryItem[] = [
  { id: "i1", ingredient: "Olive oil", quantity: 350, unit: "ml", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i2", ingredient: "Basmati rice", quantity: 900, unit: "g", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i3", ingredient: "Onions", quantity: 5, unit: "each", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i4", ingredient: "Garlic", quantity: 24, unit: "each", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i5", ingredient: "Smoked paprika", quantity: 25, unit: "g", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i6", ingredient: "Ground cumin", quantity: 30, unit: "g", isStaple: true, fromWeek: "", confirmed: true, updatedAt: daysAgoISO(1) },
  { id: "i7", ingredient: "Penne", quantity: 450, unit: "g", isStaple: false, fromWeek: lastWeek, confirmed: true, updatedAt: daysAgoISO(2) },
  { id: "i8", ingredient: "Baby spinach", quantity: 120, unit: "g", isStaple: false, fromWeek: lastWeek, confirmed: true, updatedAt: daysAgoISO(2) },
];

const picks = ["r1", "r2", "r3", "r4", "r6"];
const costs = dinnerCosts(
  picks.map((recipeId) => ({ recipeId, servings: 2 })),
  pantry_items,
);

const plan_dinners: PlanDinner[] = picks.map((recipeId, i) => ({
  id: `p${i + 1}`,
  weekStart,
  recipeId,
  dayIndex: i + 1,
  servings: 2,
  estimatedCost: costs[i] ?? 0,
  cooked: i === 0,
  liked: i === 0,
  keepNextWeek: false,
}));

function check(
  id: string,
  packKey: string,
  estimateDaysAgo: number,
  paidDelta: number | null,
  store: string = HOME_STORE,
): PriceCheck {
  const pack = PACKS[packKey]!;
  return {
    id,
    ingredient: pack.name,
    packSize: formatPackSize(pack),
    store,
    estimatedPrice: pack.price,
    estimateDate: daysAgoISO(estimateDaysAgo),
    paidPrice: paidDelta === null ? 0 : round2(pack.price + paidDelta),
    paidDate: paidDelta === null ? "" : weekStart,
    weekStart,
  };
}

const price_checks: PriceCheck[] = [
  check("c1", "chickenThigh", 3, 0.2),
  check("c2", "mince", 3, 0),
  check("c3", "kidneyBeans", 3, -0.05),
  check("c4", "potatoes", 4, 0.1),
  check("c5", "carrots", 4, 0, "Lidl – Kings Heath"),
  check("c6", "lentils", 2, null),
  check("c7", "tomatoes", 2, null),
];

export const seed = {
  plan_dinners,
  pantry_items,
  price_checks,
};
