// ---------- Collection records ----------

/** One planned week: it starts the day it is planned and runs seven days. */
export interface WeekPlan {
  id: string;
  /** First day of the plan (YYYY-MM-DD). The plan runs seven days from here. */
  weekStart: string;
  /** Household size when the plan was made. */
  servings: number;
  /** Shop list: pack keys ticked as bought. */
  ticked: string[];
  /** Receipt total in $, 0 until one is entered. */
  receipt: number;
  /** What was left of the packs has been written to the cupboard. */
  closed: boolean;
  /** The cupboard (pack key to amount) the plan was priced against, kept when it closes. */
  cupboardAtClose?: Record<string, number>;
}

export interface PlanDinner {
  id: string;
  /** The WeekPlan this dinner belongs to. */
  planId: string;
  /** The plan's first day (YYYY-MM-DD). */
  weekStart: string;
  recipeId: string;
  /** Order in the plan, 1 to 5 (the five weekdays of the plan's seven days). */
  dayIndex: number;
  servings: number;
  cooked: boolean;
  /** What cooking took from the packs, by pack key, in pack units. Empty until cooked. */
  used: Record<string, number>;
  cookedOn: string;
  /** How it went: "" until rated. */
  rating: "" | "up" | "down";
  keepNextWeek: boolean;
}

export interface PantryItem {
  id: string;
  packKey: string;
  /** The pack's name, for display. */
  ingredient: string;
  /** In the pack's unit (oz, fl oz or each). */
  quantity: number;
  unit: string;
  isStaple: boolean;
  /** Start date of the plan the remainder came from; "" for staples. */
  fromWeek: string;
  /** Still in the cupboard (staples: kept in stock; leftovers: confirmed at the check-in). */
  confirmed: boolean;
  updatedAt: string;
}

export interface PriceCheck {
  id: string;
  planId: string;
  packKey: string;
  ingredient: string;
  /** Pack as sold, e.g. "16 oz box". */
  packSize: string;
  store: string;
  estimatedPrice: number;
  estimateDate: string;
  /** What the shopper paid in $, 0 if not logged. */
  paidPrice: number;
  paidDate: string;
  weekStart: string;
}

// ---------- Reference content types ----------

/** Pack units: ounces by weight, fluid ounces, or a count. */
export type Unit = "oz" | "floz" | "each";
/** Kitchen measures recipes use: teaspoons (shown as tbsp or cups when larger), cups, cans. */
export type Measure = "tsp" | "cup" | "can";
export type Diet = "vegetarian" | "meat" | "pork" | "fish";

export interface Pack {
  key: string;
  name: string;
  /** Size as sold, in `unit`. */
  size: number;
  unit: Unit;
  /** Price in $ at the price source below. */
  price: number;
  /** The pack as sold, e.g. "3 lb bag". */
  label: string;
  staple?: boolean;
  /** Singular and plural noun for "each" packs, e.g. ["clove", "cloves"]. */
  noun?: [string, string];
  /** Recipes give this in a kitchen measure: one measure is `per` pack units. */
  measure?: { unit: Measure; per: number };
  /** Sold by weight: the price is aldi.us's estimate for a typical pack. */
  estimated?: boolean;
  allergens?: "nuts"[];
  /** The aldi.us product the price comes from, and how close a match it is. */
  source: { id: string; product: string; note?: string };
}

export interface Recipe {
  id: string;
  name: string;
  minutes: number;
  diet: Diet;
  /** Premium recipes are only planned or offered as swaps after unlocking. */
  premium: boolean;
  blurb: string;
  /** [pack key, amount per serving], in the pack's measure when it has one, else pack units. */
  ingredients: [string, number][];
  /** Steps with {packKey} placeholders for scaled quantities. */
  steps: string[];
}

// ---------- Where the prices come from ----------

export const PRICE_SOURCE = {
  store: "Aldi",
  site: "aldi.us",
  zip: "60601",
  area: "Chicago, IL",
  /** The day every price below was read from aldi.us. */
  checked: "2026-11-15",
};
/** Store label saved with logged prices. */
export const STORE_LABEL = `Aldi · ZIP ${PRICE_SOURCE.zip}`;

export const PLAN_DAYS = 7;
export const DINNERS_PER_WEEK = 5;

// ---------- Pack catalogue (aldi.us, ZIP 60601, Nov 15, 2026) ----------

const packs: Pack[] = [
  { key: "oil", name: "Olive oil", size: 16.9, unit: "floz", price: 6.25, label: "16.9 fl oz bottle", staple: true, measure: { unit: "tsp", per: 1 / 6 }, source: { id: "20094138", product: "Carlini Pure Olive Oil 16.9 fl oz" } },
  { key: "rice", name: "Long grain white rice", size: 48, unit: "oz", price: 2.95, label: "3 lb bag", staple: true, measure: { unit: "cup", per: 6.5 }, source: { id: "20968019", product: "Earthly Grains Long Grain White Rice 48 oz" } },
  { key: "penne", name: "Penne", size: 16, unit: "oz", price: 1.35, label: "16 oz box", staple: true, source: { id: "29053943", product: "Reggano Penne Rigate 16 oz" } },
  { key: "spaghetti", name: "Spaghetti", size: 32, unit: "oz", price: 2.09, label: "32 oz bag", staple: true, source: { id: "19507517", product: "Reggano Spaghetti 32 oz" } },
  { key: "tomatoes", name: "Diced tomatoes", size: 14.5, unit: "oz", price: 1.09, label: "14.5 oz can", staple: true, measure: { unit: "can", per: 14.5 }, source: { id: "20752467", product: "Happy Harvest Diced Tomatoes 14.5 oz" } },
  { key: "onion", name: "Yellow onions", size: 8, unit: "each", price: 2.45, label: "3 lb bag, about 8", staple: true, noun: ["onion", "onions"], source: { id: "16507392", product: "Fresh Yellow Onions 3 lb", note: "count per bag is an estimate" } },
  { key: "garlic", name: "Garlic", size: 30, unit: "each", price: 1.65, label: "3 bulbs, about 30 cloves", staple: true, noun: ["clove", "cloves"], source: { id: "17819978", product: "Garlic 3 ct", note: "cloves per bulb is an estimate" } },
  { key: "stock", name: "Vegetable stock", size: 32, unit: "floz", price: 1.89, label: "32 fl oz carton", staple: true, measure: { unit: "cup", per: 8 }, source: { id: "20363126", product: "Chef's Cupboard Vegetable Cooking Stock 32 oz" } },
  { key: "cumin", name: "Ground cumin", size: 2, unit: "oz", price: 1.09, label: "2 oz jar", staple: true, measure: { unit: "tsp", per: 0.07 }, source: { id: "19688303", product: "Stonemill Ground Cumin 2 oz" } },
  { key: "paprika", name: "Paprika", size: 2.12, unit: "oz", price: 1.09, label: "2.12 oz jar", staple: true, measure: { unit: "tsp", per: 0.08 }, source: { id: "19688297", product: "Stonemill Paprika 2.12 oz", note: "plain paprika; aldi.us lists no smoked paprika" } },
  { key: "curry", name: "Tikka masala seasoning", size: 5.1, unit: "oz", price: 3.65, label: "5.1 oz jar", staple: true, measure: { unit: "tsp", per: 0.1 }, source: { id: "112653385", product: "Stonemill Chicken Tikka Masala Seasoning Blend 5.1 oz", note: "aldi.us lists no plain curry powder" } },
  { key: "chickenThigh", name: "Chicken thighs", size: 29.6, unit: "oz", price: 6.64, label: "boneless, about 1.85 lb pack", estimated: true, source: { id: "19133887", product: "Kirkwood Boneless Skinless Chicken Thighs, about 1.85 lb at $3.59/lb" } },
  { key: "chickenBreast", name: "Chicken breast tenderloins", size: 28.8, unit: "oz", price: 7.18, label: "about 1.8 lb pack", estimated: true, source: { id: "19115461", product: "Kirkwood Boneless Skinless Chicken Breast Tenderloins, about 1.8 lb at $3.99/lb" } },
  { key: "beef", name: "Ground beef 93/7", size: 16, unit: "oz", price: 7.39, label: "about 1 lb pack", estimated: true, source: { id: "17679850", product: "93/7 Lean Ground Beef, about 1.0 lb" } },
  { key: "sausage", name: "Mild Italian sausage", size: 19, unit: "oz", price: 3.55, label: "19 oz pack", source: { id: "19374778", product: "Mild Italian Sausage 19 oz" } },
  { key: "bacon", name: "Bacon", size: 16, unit: "oz", price: 4.35, label: "16 oz pack", source: { id: "18647763", product: "Appleton Farms Premium Sliced Bacon 16 oz" } },
  { key: "salmon", name: "Wild pink salmon (frozen)", size: 16, unit: "oz", price: 10.15, label: "16 oz bag", source: { id: "20385446", product: "Fremont Fish Market Wild Caught Pink Salmon 16 oz", note: "frozen wild pink salmon in place of fresh fillets" } },
  { key: "tuna", name: "Chunk light tuna", size: 1, unit: "each", price: 1.05, label: "5 oz can", noun: ["can", "cans"], source: { id: "115250", product: "Northern Catch Chunk Light Tuna in Water 5 oz" } },
  { key: "eggs", name: "Large eggs", size: 12, unit: "each", price: 1.85, label: "1 dozen", noun: ["egg", "eggs"], source: { id: "115095", product: "Goldhen Large Grade A Eggs 12 ct" } },
  { key: "spinach", name: "Spinach", size: 8, unit: "oz", price: 2.09, label: "8 oz bag", source: { id: "20041343", product: "Little Salad Bar Spinach 8 oz" } },
  { key: "peppers", name: "Bell peppers", size: 3, unit: "each", price: 2.99, label: "3 count", noun: ["pepper", "peppers"], source: { id: "26274165", product: "Multi-Colored Peppers 3 ct" } },
  { key: "carrots", name: "Carrots", size: 32, unit: "oz", price: 2.19, label: "2 lb bag", source: { id: "17837662", product: "Fresh Whole Carrots 2 lb" } },
  { key: "potatoes", name: "Russet potatoes", size: 80, unit: "oz", price: 4.09, label: "5 lb bag", source: { id: "16354928", product: "Baking (Russet) Potatoes 5 lb" } },
  { key: "sweetPotato", name: "Sweet potatoes", size: 48, unit: "oz", price: 1.95, label: "3 lb bag", source: { id: "16613447", product: "Sweet Potatoes 3 lb" } },
  { key: "broccoli", name: "Broccoli florets (frozen)", size: 12, unit: "oz", price: 1.29, label: "12 oz bag", source: { id: "26548777", product: "Season's Choice Steamable Broccoli Florets 12 oz", note: "frozen in place of fresh broccoli" } },
  { key: "zucchini", name: "Zucchini", size: 1, unit: "each", price: 0.7, label: "about 8 oz, sold by weight", estimated: true, noun: ["zucchini", "zucchini"], source: { id: "3253241", product: "Zucchini at $1.39/lb", note: "sold by weight; priced as one 8 oz zucchini" } },
  { key: "mushrooms", name: "Baby bella mushrooms", size: 8, unit: "oz", price: 1.89, label: "8 oz pack", source: { id: "17327058", product: "Baby Bella Mushrooms 8 oz" } },
  { key: "peas", name: "Frozen peas", size: 12, unit: "oz", price: 0.95, label: "12 oz bag", measure: { unit: "cup", per: 5 }, source: { id: "19871879", product: "Season's Choice Sweet Garden Peas 12 oz" } },
  { key: "chickpeas", name: "Chickpeas", size: 15.5, unit: "oz", price: 0.95, label: "15.5 oz can", measure: { unit: "can", per: 15.5 }, source: { id: "18649153", product: "Dakota's Pride Garbanzo Beans 15.5 oz" } },
  { key: "kidneyBeans", name: "Dark red kidney beans", size: 15.5, unit: "oz", price: 0.95, label: "15.5 oz can", measure: { unit: "can", per: 15.5 }, source: { id: "21298198", product: "Dakota's Pride Dark Red Kidney Beans 15.5 oz" } },
  { key: "lentils", name: "Green lentils", size: 16, unit: "oz", price: 1.55, label: "16 oz bag", measure: { unit: "cup", per: 7 }, source: { id: "20985595", product: "Dakota's Pride Green Lentils 16 oz", note: "green lentils; aldi.us lists no red lentils" } },
  { key: "coconut", name: "Coconut milk", size: 13.5, unit: "floz", price: 2.55, label: "13.5 fl oz can", measure: { unit: "can", per: 13.5 }, source: { id: "36953", product: "Goya Coconut Milk 13.5 fl oz", note: "the only canned coconut milk aldi.us lists for this ZIP" } },
  { key: "tortillas", name: "Flour tortillas", size: 10, unit: "each", price: 2.15, label: "10 count", noun: ["tortilla", "tortillas"], source: { id: "19630529", product: "Pueblo Lindo Flour Tortillas 10 ct" } },
  { key: "cheddar", name: "Sharp cheddar", size: 8, unit: "oz", price: 1.95, label: "8 oz block", source: { id: "20752498", product: "Happy Farms Sharp Cheddar Block 8 oz" } },
  { key: "feta", name: "Feta crumbles", size: 4, unit: "oz", price: 2.19, label: "4 oz tub", source: { id: "20723849", product: "Emporium Selection Feta Crumbles 4 oz" } },
  { key: "yogurt", name: "Plain Greek yogurt", size: 32, unit: "oz", price: 2.99, label: "32 oz tub", measure: { unit: "tsp", per: 1 / 6 }, source: { id: "20249671", product: "Friendly Farms Nonfat Plain Greek Yogurt 32 oz" } },
  { key: "soy", name: "Soy sauce", size: 15, unit: "floz", price: 1.85, label: "15 fl oz bottle", measure: { unit: "tsp", per: 1 / 6 }, source: { id: "18649296", product: "Burman's Soy Sauce 15 fl oz" } },
  { key: "ginger", name: "Fresh ginger", size: 8, unit: "oz", price: 2.19, label: "8 oz pack", measure: { unit: "tsp", per: 0.07 }, source: { id: "25946038", product: "Ginger Root 8 oz" } },
  { key: "pesto", name: "Basil pesto", size: 6.7, unit: "oz", price: 2.75, label: "6.7 oz jar", measure: { unit: "tsp", per: 1 / 6 }, allergens: ["nuts"], source: { id: "19948210", product: "Priano Genovese Pesto 6.7 oz (contains cashews and pine nuts)" } },
];

// ---------- Tested recipe library ----------
// Amounts are per serving, by pack key: in the pack's measure (tsp, cup, can) when it has one,
// otherwise in its unit (oz, fl oz, each). {key} in a step becomes the scaled amount.

const recipes: Recipe[] = [
  {
    id: "r1", name: "Tomato, garlic & spinach penne", minutes: 20, diet: "vegetarian", premium: false,
    blurb: "A quick garlicky tomato sauce with wilted spinach.",
    ingredients: [["penne", 3], ["tomatoes", 0.5], ["spinach", 1.5], ["garlic", 1], ["onion", 0.5], ["oil", 1]],
    steps: [
      "Boil {penne} penne in salted water for 10 to 11 minutes, then drain.",
      "Soften {onion}, finely chopped, with {garlic} of garlic in {oil} olive oil for 5 minutes.",
      "Add {tomatoes} of diced tomatoes and simmer for 10 minutes until thick.",
      "Stir in {spinach} spinach until wilted, then toss through the pasta.",
    ],
  },
  {
    id: "r2", name: "Chicken thigh & potato sheet-pan dinner", minutes: 45, diet: "meat", premium: false,
    blurb: "One sheet pan of chicken thighs and paprika potatoes.",
    ingredients: [["chickenThigh", 4.5], ["potatoes", 9], ["carrots", 3.5], ["onion", 0.5], ["oil", 2], ["paprika", 1]],
    steps: [
      "Heat the oven to 400°F. Cut {potatoes} potatoes and {carrots} carrots into chunks.",
      "Toss on a large sheet pan with {onion} cut into wedges, {oil} olive oil and {paprika} paprika.",
      "Nestle {chickenThigh} chicken thighs on top and season well.",
      "Roast for 35 to 40 minutes until golden and the chicken is cooked through.",
    ],
  },
  {
    id: "r3", name: "Beef & kidney bean chili with rice", minutes: 40, diet: "meat", premium: false,
    blurb: "A mild, filling chili that reheats well.",
    ingredients: [["beef", 4], ["kidneyBeans", 0.25], ["tomatoes", 0.5], ["onion", 0.5], ["garlic", 1], ["cumin", 1], ["paprika", 1], ["rice", 1 / 3], ["oil", 1]],
    steps: [
      "Fry {onion}, chopped, in {oil} olive oil for 5 minutes, then add {garlic} of garlic, {cumin} cumin and {paprika} paprika.",
      "Add {beef} ground beef and brown for 6 minutes, breaking it up.",
      "Tip in {tomatoes} of diced tomatoes and {kidneyBeans} of kidney beans, drained; simmer for 25 minutes.",
      "Simmer {rice} rice in twice its volume of water, covered, for 15 minutes and serve alongside.",
    ],
  },
  {
    id: "r4", name: "Egg & veggie fried rice", minutes: 25, diet: "vegetarian", premium: false,
    blurb: "Carrots, peas and scrambled egg in soy-glazed rice.",
    ingredients: [["rice", 1 / 3], ["eggs", 1], ["peas", 0.5], ["carrots", 2], ["soy", 2], ["onion", 0.5], ["oil", 2]],
    steps: [
      "Simmer {rice} rice in twice its volume of water, covered, for 15 minutes, then spread out to steam dry.",
      "Stir-fry {onion} and {carrots} carrots, both diced, in {oil} oil for 5 minutes, then add {peas} frozen peas.",
      "Push the vegetables aside, scramble {eggs} in the pan, then stir in the rice.",
      "Splash in {soy} soy sauce and toss over high heat for 2 minutes.",
    ],
  },
  {
    id: "r5", name: "Italian sausage & tomato penne", minutes: 30, diet: "pork", premium: false,
    blurb: "Browned sausage in a paprika tomato sauce.",
    ingredients: [["sausage", 4], ["penne", 3], ["tomatoes", 0.5], ["onion", 0.5], ["garlic", 1], ["paprika", 1], ["oil", 1]],
    steps: [
      "Brown {sausage} Italian sausage, cut into chunks, in {oil} olive oil for 8 minutes.",
      "Add {onion}, chopped, {garlic} of garlic and {paprika} paprika; cook for 4 minutes.",
      "Pour in {tomatoes} of diced tomatoes and simmer for 15 minutes.",
      "Boil {penne} penne for 10 to 11 minutes, drain and stir into the sauce.",
    ],
  },
  {
    id: "r6", name: "Lentil dal with rice", minutes: 45, diet: "vegetarian", premium: false,
    blurb: "Cheap, soft and gently spiced.",
    ingredients: [["lentils", 1 / 3], ["rice", 1 / 3], ["onion", 0.5], ["garlic", 1], ["curry", 1], ["tomatoes", 0.25], ["stock", 0.5], ["ginger", 1], ["oil", 2]],
    steps: [
      "Fry {onion}, chopped, {garlic} of garlic and {ginger} grated ginger in {oil} oil for 5 minutes.",
      "Stir in {curry} tikka masala seasoning for a minute, then {lentils} rinsed green lentils, {tomatoes} of diced tomatoes and {stock} vegetable stock.",
      "Add about 1 cup of water per person and simmer for 30 to 35 minutes, stirring, until thick and soft.",
      "Serve with {rice} rice, simmered in twice its volume of water, covered, for 15 minutes.",
    ],
  },
  {
    id: "r7", name: "Bean & cheese quesadillas", minutes: 20, diet: "vegetarian", premium: false,
    blurb: "Crisp tortillas stuffed with spiced beans and melted cheddar.",
    ingredients: [["tortillas", 2], ["cheddar", 2], ["kidneyBeans", 0.25], ["peppers", 0.5], ["onion", 0.5], ["cumin", 0.5], ["oil", 1]],
    steps: [
      "Soften {onion} and {peppers}, both sliced, in {oil} oil with {cumin} cumin for 6 minutes.",
      "Roughly mash {kidneyBeans} of kidney beans, drained, and mix in.",
      "Spread over half of each of {tortillas}, scatter with {cheddar} shredded cheddar and fold over.",
      "Toast in a dry skillet for 2 to 3 minutes a side until golden.",
    ],
  },
  {
    id: "r8", name: "Spaghetti bolognese", minutes: 45, diet: "meat", premium: false,
    blurb: "A grated-carrot bolognese that stretches the beef.",
    ingredients: [["spaghetti", 3], ["beef", 4], ["tomatoes", 0.5], ["onion", 0.5], ["garlic", 1], ["carrots", 2], ["stock", 0.25], ["oil", 1]],
    steps: [
      "Fry {onion} and {carrots} carrots, finely chopped, in {oil} olive oil for 6 minutes, then add {garlic} of garlic.",
      "Add {beef} ground beef and brown for 6 minutes.",
      "Add {tomatoes} of diced tomatoes and {stock} vegetable stock; simmer for 30 minutes.",
      "Boil {spaghetti} spaghetti for 10 minutes, drain and serve with the sauce.",
    ],
  },
  {
    id: "r9", name: "Salmon with sweet potato wedges", minutes: 35, diet: "fish", premium: true,
    blurb: "Roasted salmon on paprika wedges with broccoli.",
    ingredients: [["salmon", 4], ["sweetPotato", 9], ["broccoli", 3.5], ["oil", 2], ["paprika", 1]],
    steps: [
      "Heat the oven to 425°F. Cut {sweetPotato} sweet potatoes into wedges, toss with {oil} olive oil and {paprika} paprika and roast for 25 minutes.",
      "Add {salmon} salmon, thawed, to the pan for the last 12 minutes.",
      "Steam {broccoli} broccoli florets for 5 minutes and serve alongside.",
    ],
  },
  {
    id: "r10", name: "Chicken fajitas", minutes: 25, diet: "meat", premium: true,
    blurb: "Smoky chicken and peppers with cooling yogurt.",
    ingredients: [["chickenBreast", 4], ["peppers", 1], ["onion", 0.5], ["tortillas", 2], ["paprika", 1], ["cumin", 1], ["yogurt", 6], ["oil", 2]],
    steps: [
      "Slice {chickenBreast} chicken tenderloins, {peppers} and {onion} into strips.",
      "Fry the chicken in {oil} oil with {paprika} paprika and {cumin} cumin for 7 minutes.",
      "Add the vegetables and cook for 5 minutes more.",
      "Warm {tortillas}, fill, and top with {yogurt} Greek yogurt.",
    ],
  },
  {
    id: "r11", name: "Spaghetti carbonara", minutes: 20, diet: "pork", premium: true,
    blurb: "Silky egg sauce, crisp bacon and plenty of pepper.",
    ingredients: [["spaghetti", 3], ["bacon", 2], ["eggs", 1], ["cheddar", 0.75], ["garlic", 1], ["oil", 1]],
    steps: [
      "Boil {spaghetti} spaghetti for 10 minutes; keep a mugful of the water.",
      "Fry {bacon} bacon, chopped, with {garlic} of garlic in {oil} oil until crisp.",
      "Beat {eggs} with {cheddar} finely grated cheddar and black pepper.",
      "Off the heat, toss the pasta with the bacon, then the egg mix, loosening with cooking water.",
    ],
  },
  {
    id: "r12", name: "Chickpea & spinach coconut curry", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Creamy, mild and ready in one pan.",
    ingredients: [["chickpeas", 0.5], ["spinach", 2], ["tomatoes", 1 / 3], ["coconut", 0.25], ["onion", 0.5], ["garlic", 1], ["curry", 1], ["rice", 1 / 3], ["oil", 1]],
    steps: [
      "Soften {onion}, chopped, in {oil} oil, add {garlic} of garlic and {curry} tikka masala seasoning and cook for 2 minutes.",
      "Add {tomatoes} of diced tomatoes, {coconut} of coconut milk and {chickpeas} of chickpeas, drained; simmer for 15 minutes.",
      "Stir in {spinach} spinach until wilted.",
      "Serve with {rice} rice, simmered in twice its volume of water, covered, for 15 minutes.",
    ],
  },
  {
    id: "r13", name: "Tuna, tomato & pea pasta", minutes: 20, diet: "fish", premium: true,
    blurb: "A pantry dinner with flaked tuna.",
    ingredients: [["penne", 3], ["tuna", 0.5], ["tomatoes", 0.5], ["peas", 1 / 3], ["onion", 0.5], ["garlic", 1], ["oil", 1]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes, adding {peas} frozen peas for the last 3.",
      "Soften {onion}, chopped, and {garlic} of garlic in {oil} oil, add {tomatoes} of diced tomatoes and simmer for 10 minutes.",
      "Flake in {tuna} of tuna, drained, and stir through the drained pasta and peas.",
    ],
  },
  {
    id: "r14", name: "Mushroom stroganoff", minutes: 25, diet: "vegetarian", premium: true,
    blurb: "Paprika mushrooms finished with Greek yogurt.",
    ingredients: [["mushrooms", 4], ["yogurt", 12], ["onion", 0.5], ["garlic", 1], ["paprika", 1.5], ["rice", 1 / 3], ["stock", 0.25], ["oil", 2]],
    steps: [
      "Fry {onion}, sliced, in {oil} oil for 5 minutes, add {mushrooms} sliced baby bella mushrooms and cook for 8 minutes.",
      "Stir in {garlic} of garlic and {paprika} paprika, then {stock} vegetable stock; simmer for 5 minutes.",
      "Take off the heat and stir in {yogurt} Greek yogurt.",
      "Serve over {rice} rice, simmered in twice its volume of water, covered, for 15 minutes.",
    ],
  },
  {
    id: "r15", name: "Chicken & veggie lo mein", minutes: 25, diet: "meat", premium: true,
    blurb: "Crunchy vegetables, ginger and soy over spaghetti noodles.",
    ingredients: [["chickenBreast", 4], ["spaghetti", 2], ["peppers", 0.5], ["carrots", 3], ["broccoli", 3], ["soy", 3], ["ginger", 1], ["garlic", 1], ["oil", 2]],
    steps: [
      "Slice {chickenBreast} chicken tenderloins thinly; boil {spaghetti} spaghetti for 9 minutes, then drain.",
      "Stir-fry the chicken in {oil} oil for 6 minutes.",
      "Add {peppers}, sliced, {carrots} carrots in matchsticks, {broccoli} broccoli florets, {garlic} of garlic and {ginger} grated ginger; fry for 5 minutes.",
      "Toss in the spaghetti with {soy} soy sauce.",
    ],
  },
  {
    id: "r16", name: "Sausage & bean stew with mashed potatoes", minutes: 45, diet: "pork", premium: true,
    blurb: "A paprika stew over rough mash.",
    ingredients: [["sausage", 4], ["kidneyBeans", 0.25], ["tomatoes", 0.5], ["carrots", 3], ["onion", 0.5], ["paprika", 1.5], ["stock", 0.25], ["potatoes", 7], ["oil", 1]],
    steps: [
      "Brown {sausage} Italian sausage in {oil} oil for 6 minutes, then lift out.",
      "Fry {onion} and {carrots} carrots, chopped, for 6 minutes with {paprika} paprika.",
      "Add {tomatoes} of diced tomatoes, {kidneyBeans} of kidney beans, drained, {stock} vegetable stock and the sausage, sliced; simmer for 25 minutes.",
      "Boil {potatoes} potatoes in chunks for 15 minutes, mash roughly and serve.",
    ],
  },
  {
    id: "r17", name: "Roasted veggie & feta penne", minutes: 35, diet: "vegetarian", premium: true,
    blurb: "Sweet roasted zucchini and pepper, salty feta on top.",
    ingredients: [["penne", 3], ["zucchini", 0.5], ["peppers", 0.5], ["onion", 0.5], ["feta", 1.5], ["tomatoes", 0.25], ["garlic", 1], ["oil", 2]],
    steps: [
      "Heat the oven to 400°F. Roast {zucchini}, {peppers} and {onion}, all in chunks, with {oil} olive oil for 25 minutes.",
      "Boil {penne} penne for 10 to 11 minutes and drain.",
      "Warm {tomatoes} of diced tomatoes with {garlic} of garlic for 8 minutes.",
      "Combine everything and scatter over {feta} feta.",
    ],
  },
  {
    id: "r18", name: "Beef & pepper lo mein", minutes: 20, diet: "meat", premium: true,
    blurb: "Quick ground-beef stir-fry with soy and ginger.",
    ingredients: [["beef", 3.5], ["spaghetti", 2], ["peppers", 0.5], ["onion", 0.5], ["soy", 3], ["ginger", 1], ["garlic", 1], ["peas", 1 / 3], ["oil", 2]],
    steps: [
      "Boil {spaghetti} spaghetti for 9 minutes, then drain.",
      "Fry {onion}, sliced, {garlic} of garlic and {ginger} grated ginger in {oil} oil for 3 minutes, add {beef} ground beef and brown for 6 minutes.",
      "Add {peppers}, sliced, and {peas} frozen peas; cook for 4 minutes.",
      "Toss with the spaghetti and {soy} soy sauce.",
    ],
  },
  {
    id: "r19", name: "Coconut chicken curry", minutes: 40, diet: "meat", premium: true,
    blurb: "Tender thighs in a ginger-coconut sauce.",
    ingredients: [["chickenThigh", 4.5], ["coconut", 0.25], ["tomatoes", 0.25], ["onion", 0.5], ["garlic", 1], ["ginger", 1], ["curry", 1.5], ["rice", 1 / 3], ["oil", 1]],
    steps: [
      "Fry {chickenThigh} chicken thighs, in chunks, in {oil} oil for 6 minutes; lift out.",
      "In the same pan soften {onion}, chopped, {garlic} of garlic and {ginger} grated ginger, then stir in {curry} tikka masala seasoning for a minute.",
      "Add {tomatoes} of diced tomatoes, {coconut} of coconut milk and the chicken; simmer for 25 minutes.",
      "Serve with {rice} rice, simmered in twice its volume of water, covered, for 15 minutes.",
    ],
  },
  {
    id: "r20", name: "Shakshuka", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Eggs baked in a spiced tomato and pepper sauce.",
    ingredients: [["eggs", 2], ["tomatoes", 0.5], ["peppers", 0.5], ["onion", 0.5], ["garlic", 1], ["cumin", 1], ["paprika", 1], ["feta", 1], ["oil", 2]],
    steps: [
      "Soften {onion} and {peppers}, sliced, in {oil} oil for 8 minutes; add {garlic} of garlic, {cumin} cumin and {paprika} paprika.",
      "Add {tomatoes} of diced tomatoes and simmer for 10 minutes.",
      "Make wells and crack in {eggs}; cover and cook for 6 to 8 minutes.",
      "Scatter over {feta} feta.",
    ],
  },
  {
    id: "r21", name: "Bacon & pea pasta", minutes: 20, diet: "pork", premium: true,
    blurb: "Crisp bacon, sweet peas and a little cheddar.",
    ingredients: [["penne", 3], ["bacon", 2], ["peas", 0.5], ["onion", 0.5], ["garlic", 1], ["cheddar", 1]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes, adding {peas} frozen peas for the last 3.",
      "Fry {bacon} bacon, chopped, with {onion}, chopped, for 6 minutes, then add {garlic} of garlic for a minute.",
      "Toss with the drained pasta and peas, {cheddar} grated cheddar and a splash of pasta water.",
    ],
  },
  {
    id: "r22", name: "Kidney bean burritos", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Rice, beans and cheddar rolled in a warm tortilla.",
    ingredients: [["tortillas", 2], ["kidneyBeans", 0.25], ["rice", 0.25], ["peppers", 0.5], ["tomatoes", 0.25], ["cheddar", 1], ["cumin", 1], ["paprika", 1], ["onion", 0.5], ["oil", 1]],
    steps: [
      "Simmer {rice} rice in twice its volume of water, covered, for 15 minutes.",
      "Soften {onion} in {oil} oil, add {peppers}, sliced, {cumin} cumin and {paprika} paprika; cook for 5 minutes.",
      "Add {kidneyBeans} of kidney beans, drained, and {tomatoes} of diced tomatoes; simmer for 10 minutes.",
      "Spoon onto {tortillas} with the rice and {cheddar} shredded cheddar, then roll up.",
    ],
  },
  {
    id: "r23", name: "Salmon rice bowl", minutes: 25, diet: "fish", premium: true,
    blurb: "Soy-ginger salmon over rice with greens.",
    ingredients: [["salmon", 4], ["rice", 1 / 3], ["broccoli", 3], ["peas", 1 / 3], ["soy", 3], ["ginger", 1], ["oil", 1]],
    steps: [
      "Simmer {rice} rice in twice its volume of water, covered, for 15 minutes; steam {broccoli} broccoli and {peas} peas for the last 5.",
      "Pan-fry {salmon} salmon, thawed, in {oil} oil, 4 minutes skin side down and 3 on the other side.",
      "Mix {soy} soy sauce with {ginger} grated ginger and spoon over.",
      "Flake the salmon over the rice and vegetables.",
    ],
  },
  {
    id: "r24", name: "Beef shepherd's pie", minutes: 60, diet: "meat", premium: true,
    blurb: "Beef and vegetables under a cheddar mash crust.",
    ingredients: [["beef", 4], ["potatoes", 10], ["carrots", 3], ["onion", 0.5], ["peas", 1 / 3], ["tomatoes", 0.25], ["stock", 0.25], ["cheddar", 0.75], ["oil", 1]],
    steps: [
      "Boil {potatoes} potatoes in chunks for 15 to 20 minutes, then mash with {cheddar} grated cheddar.",
      "Heat the oven to 400°F. Fry {onion} and {carrots} carrots, chopped, in {oil} oil for 6 minutes, add {beef} ground beef and brown for 6 minutes.",
      "Add {tomatoes} of diced tomatoes, {stock} vegetable stock and {peas} frozen peas; simmer for 15 minutes.",
      "Top with the mash and bake for 25 minutes until golden.",
    ],
  },
  {
    id: "r25", name: "Pesto chicken pasta", minutes: 25, diet: "meat", premium: true,
    blurb: "Chicken, zucchini and spinach in basil pesto (contains nuts).",
    ingredients: [["penne", 3], ["chickenBreast", 4], ["pesto", 6], ["zucchini", 0.5], ["spinach", 1], ["oil", 1]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes.",
      "Fry {chickenBreast} chicken tenderloins, in strips, with {zucchini}, sliced, in {oil} oil for 8 minutes.",
      "Stir in {spinach} spinach, then drain the pasta into the pan with {pesto} pesto and a splash of pasta water.",
    ],
  },
];

export const PACKS: Record<string, Pack> = Object.fromEntries(packs.map((p) => [p.key, p]));
export const PACK_LIST: Pack[] = packs;
export const RECIPES: Recipe[] = recipes;
/** The recipes the free week plans and swaps from. */
export const FREE_RECIPES: Recipe[] = recipes.filter((r) => !r.premium);

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function getPack(key: string): Pack | undefined {
  return PACKS[key];
}

// ---------- Answers (onboarding and Settings) ----------

export const EXCLUSION_CHOICES: { key: string; label: string }[] = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "pork", label: "No pork" },
  { key: "fish", label: "No fish" },
  { key: "mushrooms", label: "No mushrooms" },
  { key: "nuts", label: "No nuts" },
];

export interface Exclusions {
  diets: Diet[];
  mushrooms: boolean;
  nuts: boolean;
}

/** "pork,nuts" (the saved chips) becomes the kinds of dinner and ingredients to leave out. */
export function parseExclusions(raw: string): Exclusions {
  const keys = raw
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  const diets = new Set<Diet>();
  if (keys.includes("vegetarian") || keys.includes("vegan")) {
    diets.add("meat");
    diets.add("pork");
    diets.add("fish");
  }
  if (keys.includes("pork")) diets.add("pork");
  if (keys.includes("fish")) diets.add("fish");
  if (keys.includes("meat")) diets.add("meat");
  return { diets: [...diets], mushrooms: keys.includes("mushrooms"), nuts: keys.includes("nuts") };
}

export function isAllowed(recipe: Recipe, ex: Exclusions): boolean {
  if (ex.diets.includes(recipe.diet)) return false;
  for (const [key] of recipe.ingredients) {
    if (ex.mushrooms && key === "mushrooms") return false;
    if (ex.nuts && PACKS[key]?.allergens?.includes("nuts")) return false;
  }
  return true;
}

export const DEFAULT_SERVINGS = 2;
export const MAX_SERVINGS = 6;
export const DEFAULT_BUDGET = 50;

export interface Household {
  servings: number;
  budget: number;
  excluded: Exclusions;
  vegNights: number;
}

/** Everything the planner needs from the saved answers, with defaults. */
export function readHousehold(answers: Record<string, string>): Household {
  const excluded = parseExclusions(answers.excluded ?? "");
  const allVeg = excluded.diets.includes("meat") && excluded.diets.includes("fish");
  return {
    servings: answers.servings
      ? Math.min(MAX_SERVINGS, Math.max(1, parseServings(answers.servings)))
      : DEFAULT_SERVINGS,
    budget: answers.weeklybudget ? parseBudget(answers.weeklybudget) : DEFAULT_BUDGET,
    excluded,
    vegNights: allVeg
      ? DINNERS_PER_WEEK
      : Math.min(DINNERS_PER_WEEK, Math.max(0, parseInt(answers.vegnights ?? "0", 10) || 0)),
  };
}

// ---------- Formatting ----------

export function formatPrice(n: number): string {
  const v = Math.round(n * 100) / 100;
  return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
}

export function formatPriceDiff(n: number): string {
  const v = Math.round(n * 100) / 100;
  if (v === 0) return "$0.00";
  return `${v > 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "$60" becomes 60. */
export function parseBudget(label: string): number {
  const n = parseFloat(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : DEFAULT_BUDGET;
}

/** "4" becomes 4; older ranges such as "3–4" take the larger number. */
export function parseServings(label: string): number {
  const nums = label.match(/\d+/g);
  if (!nums) return DEFAULT_SERVINGS;
  return Math.max(...nums.map(Number));
}

const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
];

/** 1.33 becomes "1⅓", 0.5 becomes "½": the nearest quarter or third. */
export function formatFraction(n: number): string {
  let whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  let best = FRACTIONS[0]!;
  for (const f of FRACTIONS) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  if (best[0] === 1) whole += 1;
  const frac = best[0] === 1 ? "" : best[1];
  if (whole === 0 && !frac) return "0";
  return `${whole > 0 ? whole : ""}${frac}`;
}

function trim1(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** An amount in the pack's own unit: "7.5 oz", "1.85 lb", "12 fl oz", "1½ onions", "2½ cans". */
export function formatQty(pack: Pack, qty: number): string {
  if (pack.measure?.unit === "can" && pack.measure.per === pack.size) {
    const n = formatFraction(qty / pack.size);
    return `${n} ${plural(n, "can", "cans")}`;
  }
  if (pack.unit === "each") {
    const [one, many] = pack.noun ?? ["item", "items"];
    const text = formatFraction(Math.round(qty * 2) / 2);
    return `${text} ${qty > 0 && qty <= 1 ? one : many}`;
  }
  if (pack.unit === "floz") return `${trim1(qty)} fl oz`;
  if (qty >= 16) return `${Math.round((qty / 16) * 100) / 100} lb`;
  return `${trim1(qty)} oz`;
}

export function formatPackSize(pack: Pack): string {
  return pack.label;
}

function plural(n: string, one: string, many: string): string {
  return n === "1" || /^[¼⅓½⅔¾]$/.test(n) ? one : many;
}

/** Oil, onions, garlic, stock, spices and sauces: kept track of, but not worth headlining. */
export const MINOR_PACKS = new Set(["oil", "onion", "garlic", "stock", "cumin", "paprika", "curry", "soy", "ginger"]);

/** "11.6 oz chicken thighs", "8 eggs", "½ can diced tomatoes". */
export function formatLeftover(packKey: string, quantity: number): string {
  const pack = PACKS[packKey];
  if (!pack) return `${Math.round(quantity * 10) / 10} ${packKey}`;
  if (pack.unit === "each") return formatQty(pack, quantity);
  return `${formatQty(pack, quantity)} ${pack.name.toLowerCase()}`;
}

/** The leftovers worth naming first, then "and 3 more". */
export function leftoverSummary(items: { packKey: string; quantity: number }[], max = 4): string {
  const sorted = [...items].sort(
    (a, b) => Number(MINOR_PACKS.has(a.packKey)) - Number(MINOR_PACKS.has(b.packKey)),
  );
  const shown = sorted.slice(0, max).map((i) => formatLeftover(i.packKey, i.quantity));
  const more = sorted.length - shown.length;
  return shown.join(", ") + (more > 0 ? ` and ${more} more` : "");
}

/** A pantry amount in words, using the pack's noun when there is one. */
export function formatPantry(item: PantryItem): string {
  const pack = PACKS[item.packKey];
  if (pack) return formatQty(pack, item.quantity);
  return `${Math.round(item.quantity * 10) / 10} ${item.unit === "each" ? "" : item.unit}`.trim();
}


/** A recipe amount in kitchen measures: "1⅓ tbsp", "¾ cup", "1½ cans", else pack units. */
export function formatRecipeQty(pack: Pack, perServing: number, servings: number): string {
  const amount = perServing * servings;
  const m = pack.measure;
  if (!m) return formatQty(pack, scaleQty(pack, perServing, servings));
  if (m.unit === "can") {
    const n = formatFraction(amount);
    return `${n} ${plural(n, "can", "cans")}`;
  }
  const tsp = m.unit === "cup" ? amount * 48 : amount;
  if (tsp >= 12) return `${formatFraction(tsp / 48)} cup${tsp / 48 > 1.1 ? "s" : ""}`;
  if (tsp >= 3) return `${formatFraction(tsp / 3)} tbsp`;
  return `${formatFraction(tsp)} tsp`;
}

// ---------- Dates (local, YYYY-MM-DD) ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** "Nov 15". */
export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Sun, Nov 15". */
export function formatLongDate(iso: string): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 15, 2026". */
export function formatFullDate(iso: string): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function dayName(iso: string): string {
  return DAYS[parseISODate(iso).getDay()]!;
}

/** "Nov 14–20" or "Nov 28 – Dec 4" for the seven days from `start`. */
export function weekRange(start: string): string {
  const end = addDays(start, PLAN_DAYS - 1);
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (a.getMonth() === b.getMonth()) return `${formatShortDate(start)}–${b.getDate()}`;
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}

/** The date of dinner 1 to 5: the five weekdays (Mon to Fri) inside the plan's seven days. */
export function dinnerDate(weekStart: string, dayIndex: number): string {
  let seen = 0;
  for (let i = 0; i < PLAN_DAYS; i++) {
    const iso = addDays(weekStart, i);
    const dow = parseISODate(iso).getDay();
    if (dow === 0 || dow === 6) continue;
    seen += 1;
    if (seen === dayIndex) return iso;
  }
  return addDays(weekStart, dayIndex - 1);
}

export const PRICE_SOURCE_LINE = `Prices from ${PRICE_SOURCE.site} (ZIP ${PRICE_SOURCE.zip}), checked ${formatFullDate(PRICE_SOURCE.checked)}. Your store may differ.`;

// ---------- Scaling and steps ----------

/** A recipe amount converted to pack units. */
export function toPackUnits(pack: Pack, amount: number): number {
  return pack.measure ? amount * pack.measure.per : amount;
}

/** Pack units a dinner takes: halves for counted items, hundredths of an ounce otherwise. */
export function scaleQty(pack: Pack, perServing: number, servings: number): number {
  const raw = toPackUnits(pack, perServing) * servings;
  if (pack.unit === "each") return Math.ceil(raw * 2 - 1e-9) / 2;
  return round2(raw);
}

/** What one dinner takes from the packs, by pack key. */
export function dinnerUsage(recipe: Recipe, servings: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, per] of recipe.ingredients) {
    const pack = PACKS[key];
    if (pack) out[key] = round2((out[key] ?? 0) + scaleQty(pack, per, servings));
  }
  return out;
}

export interface IngredientLine {
  pack: Pack;
  /** In pack units. */
  qty: number;
  /** In kitchen measures. */
  text: string;
}

export function recipeIngredients(recipe: Recipe, servings: number): IngredientLine[] {
  return recipe.ingredients.map(([key, per]) => {
    const pack = PACKS[key]!;
    return { pack, qty: scaleQty(pack, per, servings), text: formatRecipeQty(pack, per, servings) };
  });
}

/** The recipe steps with each {placeholder} replaced by the scaled amount. */
export function fillSteps(recipe: Recipe, servings: number): string[] {
  return recipe.steps.map((step) =>
    step.replace(/\{(\w+)\}/g, (_m, key: string) => {
      const ing = recipe.ingredients.find(([k]) => k === key);
      const pack = PACKS[key];
      if (!ing || !pack) return "";
      return formatRecipeQty(pack, ing[1], servings);
    }),
  );
}

// ---------- Baskets (full packs) ----------

export interface DinnerInput {
  recipeId: string;
  servings: number;
}

export interface BasketLine {
  pack: Pack;
  /** Total needed across the dinners, in the pack's unit. */
  needed: number;
  /** Cupboard stock of this ingredient that counts (confirmed). */
  inCupboard: number;
  /** Full packs to buy (0 when the cupboard covers it). */
  packs: number;
  cost: number;
  /** What remains once every dinner is cooked: cupboard plus packs bought minus needed. */
  leftover: number;
}

function needsOf(dinners: DinnerInput[]): Map<string, number> {
  const needs = new Map<string, number>();
  for (const d of dinners) {
    const recipe = getRecipe(d.recipeId);
    if (!recipe) continue;
    for (const [key, qty] of Object.entries(dinnerUsage(recipe, d.servings))) {
      needs.set(key, round2((needs.get(key) ?? 0) + qty));
    }
  }
  return needs;
}

/** Confirmed cupboard stock by pack key. */
export function cupboardStock(pantry: PantryItem[]): Map<string, number> {
  const stock = new Map<string, number>();
  for (const p of pantry) {
    if (!p.confirmed || p.quantity <= 0) continue;
    stock.set(p.packKey, round2((stock.get(p.packKey) ?? 0) + p.quantity));
  }
  return stock;
}

/** A stand-in cupboard from a saved snapshot, for pricing a plan that has closed. */
export function pantryFromSnapshot(snapshot: Record<string, number>): PantryItem[] {
  return Object.entries(snapshot).map(([packKey, quantity]) => ({
    id: `snapshot-${packKey}`,
    packKey,
    ingredient: PACKS[packKey]?.name ?? packKey,
    quantity,
    unit: PACKS[packKey]?.unit ?? "oz",
    isStaple: Boolean(PACKS[packKey]?.staple),
    fromWeek: "",
    confirmed: true,
    updatedAt: "",
  }));
}

export function buildBasket(dinners: DinnerInput[], pantry: PantryItem[]): BasketLine[] {
  const needs = needsOf(dinners);
  const stock = cupboardStock(pantry);
  const lines: BasketLine[] = [];
  for (const pack of packs) {
    const needed = needs.get(pack.key);
    if (needed === undefined) continue;
    const inCupboard = stock.get(pack.key) ?? 0;
    const short = Math.max(0, needed - inCupboard);
    const count = short > 0 ? Math.ceil(short / pack.size - 1e-9) : 0;
    lines.push({
      pack,
      needed,
      inCupboard,
      packs: count,
      cost: round2(count * pack.price),
      leftover: round2(inCupboard + count * pack.size - needed),
    });
  }
  return lines;
}

export function basketTotal(lines: BasketLine[]): number {
  return round2(lines.reduce((sum, l) => sum + l.cost, 0));
}

/**
 * Each dinner's share of the basket, in the same order as the dinners: every pack's cost split by
 * how much of it each dinner uses, rounded to cents so the shares add up to the basket total.
 */
export function dinnerCosts(dinners: DinnerInput[], pantry: PantryItem[]): number[] {
  const lines = buildBasket(dinners, pantry);
  const usages = dinners.map((d) => {
    const recipe = getRecipe(d.recipeId);
    return recipe ? dinnerUsage(recipe, d.servings) : {};
  });
  const raw = usages.map((usage) => {
    let cents = 0;
    for (const line of lines) {
      const used = usage[line.pack.key] ?? 0;
      if (line.needed > 0 && used > 0) cents += (line.cost * 100 * used) / line.needed;
    }
    return cents;
  });
  const totalCents = Math.round(basketTotal(lines) * 100);
  const floors = raw.map((c) => Math.floor(c + 1e-6));
  let spare = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((c, i) => ({ i, frac: c - Math.floor(c + 1e-6) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (spare <= 0) break;
    floors[i]! += 1;
    spare -= 1;
  }
  return floors.map((c) => c / 100);
}

export interface BasketDiff {
  added: { pack: Pack; packs: number }[];
  removed: { pack: Pack; packs: number }[];
  /** After minus before, in $. */
  delta: number;
}

/** What changes in the shop when the plan goes from one basket to another. */
export function compareBaskets(before: BasketLine[], after: BasketLine[]): BasketDiff {
  const b = new Map(before.map((l) => [l.pack.key, l.packs]));
  const a = new Map(after.map((l) => [l.pack.key, l.packs]));
  const added: BasketDiff["added"] = [];
  const removed: BasketDiff["removed"] = [];
  for (const pack of packs) {
    const diff = (a.get(pack.key) ?? 0) - (b.get(pack.key) ?? 0);
    if (diff > 0) added.push({ pack, packs: diff });
    else if (diff < 0) removed.push({ pack, packs: -diff });
  }
  return { added, removed, delta: round2(basketTotal(after) - basketTotal(before)) };
}
