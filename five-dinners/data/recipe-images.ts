// Recipe pictures, by recipe id. They are AI-generated illustrations of each dish (Google's
// Gemini 3.1 Flash Image via OpenRouter, Nov 15, 2026; prompts in scripts/gen-recipe-images.py),
// not photos of the finished recipe. A recipe without one shows its diet icon tile instead.
/** Bundled assets (the number Metro gives each required image). */
export const RECIPE_IMAGES: Record<string, number> = {
  r1: require("../assets/recipes/r1.jpg"),
  r2: require("../assets/recipes/r2.jpg"),
  r3: require("../assets/recipes/r3.jpg"),
  r4: require("../assets/recipes/r4.jpg"),
  r5: require("../assets/recipes/r5.jpg"),
  r6: require("../assets/recipes/r6.jpg"),
  r7: require("../assets/recipes/r7.jpg"),
  r8: require("../assets/recipes/r8.jpg"),
  r9: require("../assets/recipes/r9.jpg"),
  r10: require("../assets/recipes/r10.jpg"),
  r11: require("../assets/recipes/r11.jpg"),
  r12: require("../assets/recipes/r12.jpg"),
  r13: require("../assets/recipes/r13.jpg"),
  r14: require("../assets/recipes/r14.jpg"),
  r15: require("../assets/recipes/r15.jpg"),
  r16: require("../assets/recipes/r16.jpg"),
  r17: require("../assets/recipes/r17.jpg"),
  r18: require("../assets/recipes/r18.jpg"),
  r19: require("../assets/recipes/r19.jpg"),
  r20: require("../assets/recipes/r20.jpg"),
  r21: require("../assets/recipes/r21.jpg"),
  r22: require("../assets/recipes/r22.jpg"),
  r23: require("../assets/recipes/r23.jpg"),
  r24: require("../assets/recipes/r24.jpg"),
  r25: require("../assets/recipes/r25.jpg"),
};

export function recipeImage(recipeId: string): number | undefined {
  return RECIPE_IMAGES[recipeId];
}
