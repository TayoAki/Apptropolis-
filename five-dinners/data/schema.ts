// ---------- Collection records ----------

export interface PlanDinner {
  id: string;
  /** The Sunday the plan belongs to (YYYY-MM-DD). */
  weekStart: string;
  recipeId: string;
  /** Order in the week, 1 to 5. */
  dayIndex: number;
  servings: number;
  /** Share of the full-pack basket cost in £. */
  estimatedCost: number;
  cooked: boolean;
  liked: boolean;
  keepNextWeek: boolean;
}

export interface PantryItem {
  id: string;
  /** Matches a pack name, e.g. "Penne". */
  ingredient: string;
  quantity: number;
  /** "g", "ml" or "each". */
  unit: string;
  isStaple: boolean;
  /** Week the remainder came from; "" for staples. */
  fromWeek: string;
  /** Confirmed as still in the cupboard at the last plan. */
  confirmed: boolean;
  updatedAt: string;
}

export interface PriceCheck {
  id: string;
  ingredient: string;
  /** Pack as sold, e.g. "500 g". */
  packSize: string;
  /** Store label, e.g. "Aldi – Kings Heath". */
  store: string;
  estimatedPrice: number;
  estimateDate: string;
  /** What the shopper paid in £, 0 if not logged. */
  paidPrice: number;
  paidDate: string;
  weekStart: string;
}

// ---------- Reference content types ----------

export type Unit = "g" | "ml" | "each";
export type Diet = "vegetarian" | "meat" | "pork" | "fish";

export interface Pack {
  key: string;
  name: string;
  size: number;
  unit: Unit;
  price: number;
  staple?: boolean;
  /** Singular and plural noun for "each" packs, e.g. ["clove", "cloves"]. */
  noun?: [string, string];
}

export interface Recipe {
  id: string;
  name: string;
  minutes: number;
  diet: Diet;
  /** Premium recipes are only offered as swaps after unlocking. */
  premium: boolean;
  blurb: string;
  /** [pack key, quantity per serving]. */
  ingredients: [string, number][];
  /** Steps with {packKey} placeholders for scaled quantities. */
  steps: string[];
}

export const HOME_STORE = "Aldi – Kings Heath";
export const STORES = ["Aldi – Kings Heath", "Lidl – Kings Heath"];
export const FREE_SWAP_LIMIT = 8;

// ---------- Pack catalogue (home store, catalogue estimate in £) ----------

const packs: Pack[] = [
  { key: "oil", name: "Olive oil", size: 500, unit: "ml", price: 3.49, staple: true },
  { key: "rice", name: "Basmati rice", size: 1000, unit: "g", price: 1.89, staple: true },
  { key: "penne", name: "Penne", size: 500, unit: "g", price: 0.69, staple: true },
  { key: "spaghetti", name: "Spaghetti", size: 500, unit: "g", price: 0.69, staple: true },
  { key: "tomatoes", name: "Chopped tomatoes", size: 400, unit: "g", price: 0.45, staple: true },
  { key: "onion", name: "Onions", size: 8, unit: "each", price: 0.89, staple: true, noun: ["onion", "onions"] },
  { key: "garlic", name: "Garlic", size: 30, unit: "each", price: 0.89, staple: true, noun: ["clove", "cloves"] },
  { key: "stock", name: "Vegetable stock cubes", size: 12, unit: "each", price: 0.65, staple: true, noun: ["cube", "cubes"] },
  { key: "cumin", name: "Ground cumin", size: 40, unit: "g", price: 0.89, staple: true },
  { key: "paprika", name: "Smoked paprika", size: 40, unit: "g", price: 0.89, staple: true },
  { key: "curry", name: "Mild curry powder", size: 40, unit: "g", price: 0.89, staple: true },
  { key: "chickenThigh", name: "Chicken thigh fillets", size: 650, unit: "g", price: 3.79 },
  { key: "chickenBreast", name: "Chicken breast fillets", size: 650, unit: "g", price: 4.19 },
  { key: "mince", name: "Beef mince 5% fat", size: 500, unit: "g", price: 2.99 },
  { key: "sausages", name: "Pork sausages", size: 8, unit: "each", price: 1.79, noun: ["sausage", "sausages"] },
  { key: "bacon", name: "Smoked bacon lardons", size: 200, unit: "g", price: 1.49 },
  { key: "salmon", name: "Salmon fillets", size: 4, unit: "each", price: 4.49, noun: ["fillet", "fillets"] },
  { key: "tuna", name: "Tuna in spring water", size: 4, unit: "each", price: 2.99, noun: ["tin", "tins"] },
  { key: "eggs", name: "Free-range eggs", size: 12, unit: "each", price: 2.29, noun: ["egg", "eggs"] },
  { key: "spinach", name: "Baby spinach", size: 240, unit: "g", price: 1.19 },
  { key: "peppers", name: "Mixed peppers", size: 3, unit: "each", price: 1.29, noun: ["pepper", "peppers"] },
  { key: "carrots", name: "Carrots", size: 1000, unit: "g", price: 0.59 },
  { key: "potatoes", name: "White potatoes", size: 2000, unit: "g", price: 1.49 },
  { key: "sweetPotato", name: "Sweet potatoes", size: 1000, unit: "g", price: 1.15 },
  { key: "broccoli", name: "Broccoli", size: 350, unit: "g", price: 0.85 },
  { key: "courgette", name: "Courgettes", size: 3, unit: "each", price: 1.19, noun: ["courgette", "courgettes"] },
  { key: "mushrooms", name: "Chestnut mushrooms", size: 300, unit: "g", price: 1.15 },
  { key: "peas", name: "Frozen peas", size: 900, unit: "g", price: 1.15 },
  { key: "chickpeas", name: "Chickpeas (400 g tin)", size: 400, unit: "g", price: 0.55 },
  { key: "kidneyBeans", name: "Kidney beans (400 g tin)", size: 400, unit: "g", price: 0.55 },
  { key: "lentils", name: "Red lentils", size: 500, unit: "g", price: 1.19 },
  { key: "coconut", name: "Coconut milk", size: 400, unit: "ml", price: 0.95 },
  { key: "tortillas", name: "Tortilla wraps", size: 8, unit: "each", price: 0.99, noun: ["wrap", "wraps"] },
  { key: "cheddar", name: "Mature cheddar", size: 400, unit: "g", price: 2.49 },
  { key: "feta", name: "Feta", size: 200, unit: "g", price: 1.29 },
  { key: "yoghurt", name: "Greek yoghurt", size: 500, unit: "g", price: 1.15 },
  { key: "noodles", name: "Medium egg noodles", size: 250, unit: "g", price: 0.89 },
  { key: "soy", name: "Soy sauce", size: 150, unit: "ml", price: 0.89 },
  { key: "ginger", name: "Fresh ginger", size: 100, unit: "g", price: 0.69 },
  { key: "pesto", name: "Green pesto", size: 190, unit: "g", price: 1.19 },
];

// ---------- Tested recipe library ----------
// Quantities are per serving, by pack key. {key} in a step becomes the scaled quantity.

const recipes: Recipe[] = [
  {
    id: "r1", name: "Tomato, garlic & spinach penne", minutes: 20, diet: "vegetarian", premium: false,
    blurb: "A quick garlicky tomato sauce with wilted spinach.",
    ingredients: [["penne", 85], ["tomatoes", 200], ["spinach", 40], ["garlic", 1], ["onion", 0.5], ["oil", 5]],
    steps: [
      "Boil {penne} penne in salted water for 10 to 11 minutes, then drain.",
      "Soften {onion}, finely chopped, with {garlic} of garlic in {oil} oil for 5 minutes.",
      "Add {tomatoes} chopped tomatoes and simmer for 10 minutes until thick.",
      "Stir in {spinach} spinach until wilted, then toss through the pasta.",
    ],
  },
  {
    id: "r2", name: "Chicken thigh & potato traybake", minutes: 45, diet: "meat", premium: false,
    blurb: "One tray of chicken thighs and paprika potatoes.",
    ingredients: [["chickenThigh", 130], ["potatoes", 250], ["carrots", 100], ["onion", 0.5], ["oil", 10], ["paprika", 2]],
    steps: [
      "Heat the oven to 200°C (180°C fan). Cut {potatoes} potatoes and {carrots} carrots into chunks.",
      "Toss on a large tray with {onion} cut into wedges, {oil} oil and {paprika} smoked paprika.",
      "Nestle {chickenThigh} chicken thigh fillets on top and season well.",
      "Roast for 35 to 40 minutes until golden and the chicken is cooked through.",
    ],
  },
  {
    id: "r3", name: "Beef & kidney bean chilli with rice", minutes: 40, diet: "meat", premium: false,
    blurb: "A mild, filling chilli that reheats well.",
    ingredients: [["mince", 110], ["kidneyBeans", 100], ["tomatoes", 200], ["onion", 0.5], ["garlic", 1], ["cumin", 2], ["paprika", 2], ["rice", 75], ["oil", 5]],
    steps: [
      "Fry {onion}, chopped, in {oil} oil for 5 minutes, then add {garlic} of garlic, {cumin} cumin and {paprika} paprika.",
      "Add {mince} beef mince and brown for 6 minutes, breaking it up.",
      "Tip in {tomatoes} chopped tomatoes and {kidneyBeans} drained kidney beans; simmer for 25 minutes.",
      "Boil {rice} rice for 12 minutes, drain and serve alongside.",
    ],
  },
  {
    id: "r4", name: "Egg & veg fried rice", minutes: 20, diet: "vegetarian", premium: false,
    blurb: "Carrots, peas and scrambled egg in soy-glazed rice.",
    ingredients: [["rice", 75], ["eggs", 1], ["peas", 60], ["carrots", 60], ["soy", 10], ["onion", 0.5], ["oil", 10]],
    steps: [
      "Boil {rice} rice for 12 minutes, drain and spread out to steam dry.",
      "Stir-fry {onion} and {carrots} carrots, both diced, in {oil} oil for 5 minutes, then add {peas} peas.",
      "Push the veg aside, scramble {eggs} in the pan, then stir in the rice.",
      "Splash in {soy} soy sauce and toss over a high heat for 2 minutes.",
    ],
  },
  {
    id: "r5", name: "Sausage & tomato penne", minutes: 30, diet: "pork", premium: false,
    blurb: "Browned sausage chunks in a smoky tomato sauce.",
    ingredients: [["sausages", 2], ["penne", 85], ["tomatoes", 200], ["onion", 0.5], ["garlic", 1], ["paprika", 2], ["oil", 5]],
    steps: [
      "Brown {sausages}, cut into chunks, in {oil} oil for 8 minutes.",
      "Add {onion}, chopped, {garlic} of garlic and {paprika} paprika; cook for 4 minutes.",
      "Pour in {tomatoes} chopped tomatoes and simmer for 15 minutes.",
      "Boil {penne} penne for 10 to 11 minutes, drain and stir into the sauce.",
    ],
  },
  {
    id: "r6", name: "Red lentil dahl with rice", minutes: 35, diet: "vegetarian", premium: false,
    blurb: "Cheap, soft and gently spiced.",
    ingredients: [["lentils", 70], ["rice", 75], ["onion", 0.5], ["garlic", 1], ["curry", 3], ["tomatoes", 100], ["stock", 0.5], ["ginger", 5], ["oil", 10]],
    steps: [
      "Fry {onion}, chopped, {garlic} of garlic and {ginger} grated ginger in {oil} oil for 5 minutes.",
      "Stir in {curry} curry powder for a minute, then {lentils} rinsed red lentils, {tomatoes} chopped tomatoes and {stock}, crumbled.",
      "Add about 250 ml water per person and simmer for 20 to 25 minutes, stirring, until thick and soft.",
      "Serve with {rice} rice, boiled for 12 minutes.",
    ],
  },
  {
    id: "r7", name: "Bean & cheese quesadillas", minutes: 20, diet: "vegetarian", premium: false,
    blurb: "Crisp wraps stuffed with spiced beans and melted cheddar.",
    ingredients: [["tortillas", 2], ["cheddar", 50], ["kidneyBeans", 100], ["peppers", 0.5], ["onion", 0.5], ["cumin", 1], ["oil", 5]],
    steps: [
      "Soften {onion} and {peppers}, both sliced, in {oil} oil with {cumin} cumin for 6 minutes.",
      "Roughly mash {kidneyBeans} drained kidney beans and mix in.",
      "Spread over half of each of {tortillas}, scatter with {cheddar} grated cheddar and fold over.",
      "Toast in a dry pan for 2 to 3 minutes each side until golden.",
    ],
  },
  {
    id: "r8", name: "Spaghetti bolognese", minutes: 45, diet: "meat", premium: false,
    blurb: "A grated-carrot bolognese that stretches the mince.",
    ingredients: [["spaghetti", 85], ["mince", 110], ["tomatoes", 200], ["onion", 0.5], ["garlic", 1], ["carrots", 50], ["stock", 0.5], ["oil", 5]],
    steps: [
      "Fry {onion} and {carrots} carrots, finely chopped, in {oil} oil for 6 minutes, then add {garlic} of garlic.",
      "Add {mince} beef mince and brown for 6 minutes.",
      "Add {tomatoes} chopped tomatoes and {stock} dissolved in a splash of water; simmer for 30 minutes.",
      "Boil {spaghetti} spaghetti for 10 minutes, drain and serve with the sauce.",
    ],
  },
  {
    id: "r9", name: "Salmon with sweet potato wedges", minutes: 35, diet: "fish", premium: true,
    blurb: "Roasted salmon on paprika wedges with broccoli.",
    ingredients: [["salmon", 1], ["sweetPotato", 250], ["broccoli", 100], ["oil", 10], ["paprika", 2]],
    steps: [
      "Heat the oven to 210°C (190°C fan). Cut {sweetPotato} sweet potatoes into wedges, toss with {oil} oil and {paprika} smoked paprika and roast for 25 minutes.",
      "Add {salmon} to the tray for the last 12 minutes.",
      "Steam or boil {broccoli} broccoli for 4 minutes and serve alongside.",
    ],
  },
  {
    id: "r10", name: "Chicken fajita wraps", minutes: 25, diet: "meat", premium: true,
    blurb: "Smoky chicken and peppers with cooling yoghurt.",
    ingredients: [["chickenBreast", 120], ["peppers", 1], ["onion", 0.5], ["tortillas", 2], ["paprika", 2], ["cumin", 2], ["yoghurt", 40], ["oil", 10]],
    steps: [
      "Slice {chickenBreast} chicken breast, {peppers} and {onion} into strips.",
      "Fry the chicken in {oil} oil with {paprika} paprika and {cumin} cumin for 7 minutes.",
      "Add the vegetables and cook for 5 minutes more.",
      "Warm {tortillas}, fill, and top with {yoghurt} Greek yoghurt.",
    ],
  },
  {
    id: "r11", name: "Spaghetti carbonara", minutes: 20, diet: "pork", premium: true,
    blurb: "Silky egg sauce, crisp lardons and plenty of pepper.",
    ingredients: [["spaghetti", 85], ["bacon", 50], ["eggs", 1], ["cheddar", 20], ["garlic", 1], ["oil", 5]],
    steps: [
      "Boil {spaghetti} spaghetti for 10 minutes; keep a mugful of the water.",
      "Fry {bacon} bacon lardons with {garlic} of garlic in {oil} oil until crisp.",
      "Beat {eggs} with {cheddar} finely grated cheddar and black pepper.",
      "Off the heat, toss the pasta with the bacon, then the egg mix, loosening with cooking water.",
    ],
  },
  {
    id: "r12", name: "Chickpea & spinach coconut curry", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Creamy, mild and ready in one pan.",
    ingredients: [["chickpeas", 200], ["spinach", 50], ["tomatoes", 150], ["coconut", 100], ["onion", 0.5], ["garlic", 1], ["curry", 3], ["rice", 75], ["oil", 5]],
    steps: [
      "Soften {onion}, chopped, in {oil} oil, add {garlic} of garlic and {curry} curry powder and cook for 2 minutes.",
      "Add {tomatoes} chopped tomatoes, {coconut} coconut milk and {chickpeas} drained chickpeas; simmer for 15 minutes.",
      "Stir in {spinach} spinach until wilted.",
      "Serve with {rice} rice, boiled for 12 minutes.",
    ],
  },
  {
    id: "r13", name: "Tuna, tomato & pea pasta", minutes: 20, diet: "fish", premium: true,
    blurb: "A storecupboard supper with flaked tuna.",
    ingredients: [["penne", 85], ["tuna", 0.5], ["tomatoes", 200], ["peas", 40], ["onion", 0.5], ["garlic", 1], ["oil", 5]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes, adding {peas} peas for the last 3.",
      "Soften {onion}, chopped, and {garlic} of garlic in {oil} oil, add {tomatoes} chopped tomatoes and simmer for 10 minutes.",
      "Flake in {tuna} of drained tuna and stir through the drained pasta and peas.",
    ],
  },
  {
    id: "r14", name: "Mushroom stroganoff", minutes: 25, diet: "vegetarian", premium: true,
    blurb: "Paprika mushrooms finished with Greek yoghurt.",
    ingredients: [["mushrooms", 120], ["yoghurt", 60], ["onion", 0.5], ["garlic", 1], ["paprika", 3], ["rice", 75], ["stock", 0.5], ["oil", 10]],
    steps: [
      "Fry {onion}, sliced, in {oil} oil for 5 minutes, add {mushrooms} sliced mushrooms and cook for 8 minutes.",
      "Stir in {garlic} of garlic and {paprika} paprika, then {stock} dissolved in a splash of boiling water; simmer for 5 minutes.",
      "Take off the heat and stir in {yoghurt} Greek yoghurt.",
      "Serve over {rice} rice, boiled for 12 minutes.",
    ],
  },
  {
    id: "r15", name: "Chicken noodle stir-fry", minutes: 25, diet: "meat", premium: true,
    blurb: "Crunchy veg, ginger and soy over egg noodles.",
    ingredients: [["chickenBreast", 120], ["noodles", 60], ["peppers", 0.5], ["carrots", 80], ["broccoli", 80], ["soy", 15], ["ginger", 5], ["garlic", 1], ["oil", 10]],
    steps: [
      "Slice {chickenBreast} chicken breast thinly; cook {noodles} noodles as the packet says, then drain.",
      "Stir-fry the chicken in {oil} oil for 6 minutes.",
      "Add {peppers}, sliced, {carrots} carrots in matchsticks, {broccoli} broccoli florets, {garlic} of garlic and {ginger} grated ginger; fry for 5 minutes.",
      "Toss in the noodles with {soy} soy sauce.",
    ],
  },
  {
    id: "r16", name: "Sausage & bean casserole", minutes: 45, diet: "pork", premium: true,
    blurb: "A paprika stew with rough mash.",
    ingredients: [["sausages", 2], ["kidneyBeans", 100], ["tomatoes", 200], ["carrots", 80], ["onion", 0.5], ["paprika", 3], ["stock", 0.5], ["potatoes", 200], ["oil", 5]],
    steps: [
      "Brown {sausages} in {oil} oil for 6 minutes, then lift out.",
      "Fry {onion} and {carrots} carrots, chopped, for 6 minutes with {paprika} paprika.",
      "Add {tomatoes} chopped tomatoes, {kidneyBeans} drained kidney beans, {stock} and the sausages, sliced; simmer for 25 minutes.",
      "Boil {potatoes} potatoes in chunks for 15 minutes, mash roughly and serve.",
    ],
  },
  {
    id: "r17", name: "Roasted veg & feta penne", minutes: 35, diet: "vegetarian", premium: true,
    blurb: "Sweet roasted courgette and pepper, salty feta on top.",
    ingredients: [["penne", 85], ["courgette", 0.5], ["peppers", 0.5], ["onion", 0.5], ["feta", 40], ["tomatoes", 100], ["garlic", 1], ["oil", 10]],
    steps: [
      "Heat the oven to 200°C (180°C fan). Roast {courgette}, {peppers} and {onion}, all in chunks, with {oil} oil for 25 minutes.",
      "Boil {penne} penne for 10 to 11 minutes and drain.",
      "Warm {tomatoes} chopped tomatoes with {garlic} of garlic for 8 minutes.",
      "Combine everything and crumble over {feta} feta.",
    ],
  },
  {
    id: "r18", name: "Beef & pepper noodles", minutes: 20, diet: "meat", premium: true,
    blurb: "Quick mince stir-fry with soy and ginger.",
    ingredients: [["mince", 100], ["noodles", 60], ["peppers", 0.5], ["onion", 0.5], ["soy", 15], ["ginger", 5], ["garlic", 1], ["peas", 40], ["oil", 10]],
    steps: [
      "Cook {noodles} noodles as the packet says, then drain.",
      "Fry {onion}, sliced, {garlic} of garlic and {ginger} grated ginger in {oil} oil for 3 minutes, add {mince} beef mince and brown for 6 minutes.",
      "Add {peppers}, sliced, and {peas} peas; cook for 4 minutes.",
      "Toss with the noodles and {soy} soy sauce.",
    ],
  },
  {
    id: "r19", name: "Coconut chicken curry", minutes: 40, diet: "meat", premium: true,
    blurb: "Tender thighs in a ginger-coconut sauce.",
    ingredients: [["chickenThigh", 130], ["coconut", 100], ["tomatoes", 100], ["onion", 0.5], ["garlic", 1], ["ginger", 5], ["curry", 4], ["rice", 75], ["oil", 5]],
    steps: [
      "Fry {chickenThigh} chicken thighs, in chunks, in {oil} oil for 6 minutes; lift out.",
      "In the same pan soften {onion}, chopped, {garlic} of garlic and {ginger} grated ginger, then stir in {curry} curry powder for a minute.",
      "Add {tomatoes} chopped tomatoes, {coconut} coconut milk and the chicken; simmer for 25 minutes.",
      "Serve with {rice} rice, boiled for 12 minutes.",
    ],
  },
  {
    id: "r20", name: "Shakshuka", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Eggs baked in spiced tomato and pepper sauce.",
    ingredients: [["eggs", 2], ["tomatoes", 200], ["peppers", 0.5], ["onion", 0.5], ["garlic", 1], ["cumin", 2], ["paprika", 2], ["feta", 30], ["oil", 10]],
    steps: [
      "Soften {onion} and {peppers}, sliced, in {oil} oil for 8 minutes; add {garlic} of garlic, {cumin} cumin and {paprika} paprika.",
      "Add {tomatoes} chopped tomatoes and simmer for 10 minutes.",
      "Make wells and crack in {eggs}; cover and cook for 6 to 8 minutes.",
      "Crumble over {feta} feta.",
    ],
  },
  {
    id: "r21", name: "Bacon & pea pasta", minutes: 20, diet: "pork", premium: true,
    blurb: "Crisp lardons, sweet peas and a little cheddar.",
    ingredients: [["penne", 85], ["bacon", 50], ["peas", 60], ["onion", 0.5], ["garlic", 1], ["cheddar", 25]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes, adding {peas} peas for the last 3.",
      "Fry {bacon} bacon lardons dry with {onion}, chopped, for 6 minutes, then add {garlic} of garlic for a minute.",
      "Toss with the drained pasta and peas, {cheddar} grated cheddar and a splash of pasta water.",
    ],
  },
  {
    id: "r22", name: "Kidney bean burritos", minutes: 30, diet: "vegetarian", premium: true,
    blurb: "Rice, beans and cheddar rolled in a warm wrap.",
    ingredients: [["tortillas", 2], ["kidneyBeans", 100], ["rice", 50], ["peppers", 0.5], ["tomatoes", 100], ["cheddar", 30], ["cumin", 2], ["paprika", 2], ["onion", 0.5], ["oil", 5]],
    steps: [
      "Boil {rice} rice for 12 minutes and drain.",
      "Soften {onion} in {oil} oil, add {peppers}, sliced, {cumin} cumin and {paprika} paprika; cook for 5 minutes.",
      "Add {kidneyBeans} drained kidney beans and {tomatoes} chopped tomatoes; simmer for 10 minutes.",
      "Spoon onto {tortillas} with the rice and {cheddar} cheddar, then roll up.",
    ],
  },
  {
    id: "r23", name: "Salmon rice bowl", minutes: 25, diet: "fish", premium: true,
    blurb: "Soy-ginger salmon over rice with greens.",
    ingredients: [["salmon", 1], ["rice", 75], ["broccoli", 80], ["peas", 40], ["soy", 15], ["ginger", 5], ["oil", 5]],
    steps: [
      "Boil {rice} rice for 12 minutes, adding {broccoli} broccoli and {peas} peas for the last 4.",
      "Pan-fry {salmon} in {oil} oil, 4 minutes skin side down and 3 on the other side.",
      "Mix {soy} soy sauce with {ginger} grated ginger and spoon over.",
      "Flake the salmon over the rice and vegetables.",
    ],
  },
  {
    id: "r24", name: "Cottage pie", minutes: 60, diet: "meat", premium: true,
    blurb: "Beef and veg under a cheddar mash crust.",
    ingredients: [["mince", 120], ["potatoes", 300], ["carrots", 80], ["onion", 0.5], ["peas", 40], ["tomatoes", 100], ["stock", 0.5], ["cheddar", 20], ["oil", 5]],
    steps: [
      "Boil {potatoes} potatoes in chunks for 15 to 20 minutes, then mash with {cheddar} grated cheddar.",
      "Heat the oven to 200°C (180°C fan). Fry {onion} and {carrots} carrots, chopped, in {oil} oil for 6 minutes, add {mince} beef mince and brown for 6 minutes.",
      "Add {tomatoes} chopped tomatoes, {stock} and {peas} peas; simmer for 15 minutes.",
      "Top with the mash and bake for 25 minutes until golden.",
    ],
  },
  {
    id: "r25", name: "Pesto chicken pasta", minutes: 25, diet: "meat", premium: true,
    blurb: "Chicken, courgette and spinach in a pesto coat.",
    ingredients: [["penne", 85], ["chickenBreast", 120], ["pesto", 40], ["courgette", 0.5], ["spinach", 30], ["oil", 5]],
    steps: [
      "Boil {penne} penne for 10 to 11 minutes.",
      "Fry {chickenBreast} chicken breast, in strips, with {courgette}, sliced, in {oil} oil for 8 minutes.",
      "Stir in {spinach} spinach, then drain the pasta into the pan with {pesto} pesto and a splash of pasta water.",
    ],
  },
];

export const PACKS: Record<string, Pack> = Object.fromEntries(packs.map((p) => [p.key, p]));
export const PACK_LIST: Pack[] = packs;
export const RECIPES: Recipe[] = recipes;

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function getPack(key: string): Pack | undefined {
  return PACKS[key];
}

export function packByName(name: string): Pack | undefined {
  return packs.find((p) => p.name === name);
}

/** Recipes that avoid the excluded kinds (e.g. ["pork"] for "no pork"). */
export function allowedRecipes(excluded: Diet[]): Recipe[] {
  return recipes.filter((r) => !excluded.includes(r.diet));
}

// ---------- Formatting ----------

export function formatPrice(n: number): string {
  return `£${n.toFixed(2)}`;
}

export function formatPriceDiff(n: number): string {
  const v = Math.round(n * 100) / 100;
  if (v === 0) return "£0.00";
  return `${v > 0 ? "+" : "−"}£${Math.abs(v).toFixed(2)}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "£25" becomes 25. */
export function parseBudget(label: string): number {
  const n = parseFloat(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 25;
}

/** "3–4" becomes 4, "5+" becomes 5, "2" becomes 2. */
export function parseServings(label: string): number {
  const nums = label.match(/\d+/g);
  if (!nums) return 2;
  return Math.max(...nums.map(Number));
}

export function formatQty(pack: Pack, qty: number): string {
  const n = Math.round(qty * 10) / 10;
  if (pack.unit === "each") {
    const [one, many] = pack.noun ?? ["item", "items"];
    return `${n} ${n === 1 ? one : many}`;
  }
  if (n >= 1000) return `${Math.round(n) / 1000} ${pack.unit === "g" ? "kg" : "l"}`;
  return `${n} ${pack.unit}`;
}

export function formatPackSize(pack: Pack): string {
  return formatQty(pack, pack.size);
}

/** A pantry amount in words, using the pack's noun when there is one. */
export function formatPantry(item: PantryItem): string {
  const pack = packByName(item.ingredient);
  if (pack && pack.unit === item.unit) return formatQty(pack, item.quantity);
  return `${Math.round(item.quantity * 10) / 10} ${item.unit === "each" ? "" : item.unit}`.trim();
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

export function daysAgoISO(n: number): string {
  return addDays(todayISO(), -n);
}

/** The Sunday on or before the given date. */
export function weekStartOf(iso: string = todayISO()): string {
  const d = parseISODate(iso);
  return addDays(iso, -d.getDay());
}

export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatLongDate(iso: string): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekLabel(weekStart: string): string {
  return `Week of ${formatShortDate(weekStart)}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}

// ---------- Scaling and steps ----------

/** Quantity of an ingredient for a recipe at a given number of servings. */
export function scaleQty(pack: Pack, perServing: number, servings: number): number {
  const raw = perServing * servings;
  return pack.unit === "each" ? Math.max(1, Math.ceil(raw - 1e-9)) : Math.max(1, Math.round(raw));
}

export interface IngredientLine {
  pack: Pack;
  qty: number;
  text: string;
}

export function recipeIngredients(recipe: Recipe, servings: number): IngredientLine[] {
  return recipe.ingredients.map(([key, per]) => {
    const pack = PACKS[key]!;
    const qty = scaleQty(pack, per, servings);
    return { pack, qty, text: formatQty(pack, qty) };
  });
}

/** The recipe steps with each {placeholder} replaced by the scaled quantity. */
export function fillSteps(recipe: Recipe, servings: number): string[] {
  return recipe.steps.map((step) =>
    step.replace(/\{(\w+)\}/g, (_m, key: string) => {
      const ing = recipe.ingredients.find(([k]) => k === key);
      const pack = PACKS[key];
      if (!ing || !pack) return "";
      return formatQty(pack, scaleQty(pack, ing[1], servings));
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
  /** Confirmed cupboard stock of this ingredient. */
  inCupboard: number;
  /** Full packs to buy (0 when the cupboard covers it). */
  packs: number;
  cost: number;
  /** What remains after cooking: cupboard plus packs bought minus needed. */
  leftover: number;
}

function rawNeeds(dinners: DinnerInput[]): Map<string, number> {
  const needs = new Map<string, number>();
  for (const d of dinners) {
    const recipe = getRecipe(d.recipeId);
    if (!recipe) continue;
    for (const [key, per] of recipe.ingredients) {
      needs.set(key, (needs.get(key) ?? 0) + per * d.servings);
    }
  }
  return needs;
}

export function buildBasket(dinners: DinnerInput[], pantry: PantryItem[]): BasketLine[] {
  const needs = rawNeeds(dinners);
  const lines: BasketLine[] = [];
  for (const pack of packs) {
    const raw = needs.get(pack.key);
    if (raw === undefined) continue;
    const needed = pack.unit === "each" ? Math.ceil(raw - 1e-9) : Math.round(raw);
    const inCupboard = pantry
      .filter((p) => p.confirmed && p.quantity > 0 && p.ingredient === pack.name)
      .reduce((sum, p) => sum + p.quantity, 0);
    const short = Math.max(0, needed - inCupboard);
    const count = Math.ceil(short / pack.size - 1e-9);
    lines.push({
      pack,
      needed,
      inCupboard,
      packs: count,
      cost: round2(count * pack.price),
      leftover: inCupboard + count * pack.size - needed,
    });
  }
  return lines;
}

export function basketTotal(lines: BasketLine[]): number {
  return round2(lines.reduce((sum, l) => sum + l.cost, 0));
}

/** Each dinner's share of the basket cost, in the same order as the dinners. */
export function dinnerCosts(dinners: DinnerInput[], pantry: PantryItem[]): number[] {
  const lines = buildBasket(dinners, pantry);
  const needs = rawNeeds(dinners);
  return dinners.map((d) => {
    const recipe = getRecipe(d.recipeId);
    if (!recipe) return 0;
    let total = 0;
    for (const [key, per] of recipe.ingredients) {
      const line = lines.find((l) => l.pack.key === key);
      const all = needs.get(key) ?? 0;
      if (line && all > 0) total += line.cost * ((per * d.servings) / all);
    }
    return round2(total);
  });
}

export interface BasketDiff {
  added: { pack: Pack; packs: number }[];
  removed: { pack: Pack; packs: number }[];
  /** After minus before, in £. */
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
