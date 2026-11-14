import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { Button } from "../../components/Button";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { Section } from "../../components/recipe/Section";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { openPaywall, usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  HOME_STORE,
  PACKS,
  basketTotal,
  buildBasket,
  formatPackSize,
  formatPrice,
  formatQty,
  formatShortDate,
  getRecipe,
  parseServings,
  recipeIngredients,
  round2,
  scaleQty,
  type PantryItem,
  type PlanDinner,
  type PriceCheck,
  type Recipe,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 8;

const PACK_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  oil: "water-outline",
  coconut: "water-outline",
  soy: "water-outline",
  eggs: "egg-outline",
  salmon: "fish-outline",
  tuna: "fish-outline",
  mince: "restaurant-outline",
  chickenThigh: "restaurant-outline",
  chickenBreast: "restaurant-outline",
  sausages: "restaurant-outline",
  bacon: "restaurant-outline",
  carrots: "leaf-outline",
  spinach: "leaf-outline",
  broccoli: "leaf-outline",
  courgette: "leaf-outline",
  peppers: "leaf-outline",
  ginger: "leaf-outline",
  onion: "nutrition-outline",
  garlic: "nutrition-outline",
  tomatoes: "nutrition-outline",
};

function stepContent(step: string, recipe: Recipe, servings: number): ReactNode[] {
  return step.split(/(\{\w+\})/).map((part, i) => {
    const match = /^\{(\w+)\}$/.exec(part);
    if (!match) return part;
    const key = match[1]!;
    const ing = recipe.ingredients.find(([k]) => k === key);
    const pack = PACKS[key];
    if (!ing || !pack) return "";
    return (
      <Text key={i} style={{ fontWeight: "700" }}>
        {formatQty(pack, scaleQty(pack, ing[1], servings))}
      </Text>
    );
  });
}

export default function RecipeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { answers } = useAppState();
  const { isPremium } = usePurchases();
  const dinners = useCollection<PlanDinner>("plan_dinners");
  const pantry = useCollection<PantryItem>("pantry_items");
  const checks = useCollection<PriceCheck>("price_checks");

  const [override, setOverride] = useState<number | null>(null);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  const dinner = useMemo(
    () =>
      dinners.items.find((d) => d.id === id) ??
      dinners.items
        .filter((d) => d.recipeId === id)
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0],
    [dinners.items, id],
  );
  const recipe = getRecipe(dinner?.recipeId ?? String(id));
  const servings = override ?? dinner?.servings ?? parseServings(answers.servings ?? "2");

  const lines = useMemo(() => (recipe ? recipeIngredients(recipe, servings) : []), [recipe, servings]);

  const estimate = useMemo(() => {
    if (!recipe) return 0;
    if (dinner) return round2((dinner.estimatedCost * servings) / Math.max(1, dinner.servings));
    return basketTotal(buildBasket([{ recipeId: recipe.id, servings }], pantry.items));
  }, [recipe, dinner, servings, pantry.items]);

  const priceDate = useMemo(() => {
    if (!recipe) return "";
    const names = new Set(recipe.ingredients.map(([key]) => PACKS[key]?.name));
    return checks.items
      .filter((c) => names.has(c.ingredient) && c.estimateDate)
      .map((c) => c.estimateDate)
      .sort()
      .pop() ?? "";
  }, [recipe, checks.items]);

  if (dinners.loading || pantry.loading || checks.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ title: "Recipe" }} />
        <LoadingState label="Opening the recipe" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ title: "Recipe" }} />
        <EmptyState
          icon="book-outline"
          title="This dinner isn't in your plan"
          body="It may have been swapped out on the Week tab. Open this week's dinners to pick another."
          actionLabel="Back to Cook"
          onAction={() => router.replace("/cook")}
        />
      </View>
    );
  }

  const storeName = HOME_STORE.split(" – ")[0]!;
  const metaFont = Platform.select({ ios: "Menlo", default: "monospace" });
  const cooked = dinner?.cooked ?? false;
  const kept = dinner?.keepNextWeek ?? false;
  const liked = dinner?.liked ?? false;

  const chips = [
    `${recipe.minutes} min`,
    `for ${servings}`,
    `${formatPrice(estimate)}${priceDate ? ` · ${storeName} · ${formatShortDate(priceDate)}` : ` · ${storeName}`}`,
  ];

  function toggleStep(index: number) {
    setDoneSteps((current) =>
      current.includes(index) ? current.filter((n) => n !== index) : [...current, index],
    );
  }

  async function toggleCooked() {
    if (!dinner) return;
    await dinners.update(dinner.id, { cooked: !cooked });
    if (!cooked) track("dinner_cooked", { diet: recipe!.diet, servings });
  }

  async function toggleKeep() {
    if (!dinner) return;
    if (!isPremium) {
      openPaywall();
      return;
    }
    await dinners.update(dinner.id, { keepNextWeek: !kept });
    if (!kept) track("dinner_kept", { diet: recipe!.diet });
  }

  async function rate(value: "up" | "down") {
    if (!dinner) return;
    setRating(value);
    await dinners.update(dinner.id, { liked: value === "up" });
  }

  const heartLabel = liked ? "Remove from favourites" : "Add to favourites";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerTitle: "",
          headerBackButtonDisplayMode: "default",
          headerBackTitle: "Cook",
          headerRight: dinner
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={heartLabel}
                  hitSlop={12}
                  onPress={() => void dinners.update(dinner.id, { liked: !liked })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: theme.spacing.xs })}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={26}
                    color={theme.colors.primary}
                  />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ alignItems: "center", gap: theme.spacing.md }}>
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: theme.colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AiImage
              prompt={`${recipe.name}, plated home-cooked dinner seen from above, soft watercolour illustration`}
              style={{ width: 168, height: 168, borderRadius: 84 }}
            />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
              fontFamily: theme.font.family,
              textAlign: "center",
            }}
          >
            {recipe.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: theme.spacing.sm,
            }}
          >
            {chips.map((chip) => (
              <View
                key={chip}
                style={{
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.colors.textMuted,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.sm + 2,
                  paddingVertical: theme.spacing.xs + 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption + 1,
                    fontFamily: metaFont,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {chip}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontFamily: theme.font.family,
              fontVariant: ["tabular-nums"],
            }}
          >
            Scaled for {servings}
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {(["minus", "plus"] as const).map((kind) => {
              const disabled =
                kind === "minus" ? servings <= MIN_SERVINGS : servings >= MAX_SERVINGS;
              return (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityLabel={kind === "minus" ? "Fewer servings" : "More servings"}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  hitSlop={4}
                  onPress={() => setOverride(servings + (kind === "minus" ? -1 : 1))}
                  style={({ pressed }) => ({
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={kind === "minus" ? "remove" : "add"}
                    size={26}
                    color={theme.colors.primary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title="Packs used">
          {lines.map(({ pack, qty, text }) => {
            const stock = pantry.items
              .filter((p) => p.confirmed && p.ingredient === pack.name && p.unit === pack.unit)
              .reduce((sum, p) => sum + p.quantity, 0);
            const fromCupboard = stock >= qty;
            const bought = Math.ceil(qty / pack.size - 1e-9);
            const left = bought * pack.size - qty;
            const usesText =
              pack.unit === "each"
                ? `uses ${qty} of ${pack.size}`
                : `uses ${text} of ${formatPackSize(pack)}`;
            const leftText = left > 0 ? ` · ${formatQty(pack, left)} left` : "";
            return (
              <View
                key={pack.key}
                style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm + 2 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.surfaceAlt,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={PACK_ICONS[pack.key] ?? "basket-outline"}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontFamily: theme.font.family,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  <Text style={{ fontWeight: theme.font.weight.bold }}>{pack.name}</Text>
                  {fromCupboard ? ` — ${text}, from cupboard` : ` — ${usesText}${leftText}`}
                </Text>
                {fromCupboard ? (
                  <View
                    style={{
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.onPrimary,
                        fontSize: 10,
                        fontWeight: theme.font.weight.bold,
                        letterSpacing: 0.4,
                      }}
                    >
                      IN CUPBOARD
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </Section>

        <Section title="Method">
          {recipe.steps.map((step, index) => {
            const done = doneSteps.includes(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}${done ? ", done" : ""}`}
                accessibilityHint="Tap to tick this step off"
                onPress={() => toggleStep(index)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: theme.spacing.sm + 2,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 24, alignItems: "center", paddingTop: 1 }}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontFamily: theme.font.family,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: done ? theme.colors.textMuted : theme.colors.text,
                    fontSize: theme.font.size.body,
                    lineHeight: 21,
                    fontFamily: theme.font.family,
                    textDecorationLine: done ? "line-through" : "none",
                  }}
                >
                  {stepContent(step, recipe, servings)}
                </Text>
              </Pressable>
            );
          })}
        </Section>
      </ScrollView>

      {dinner ? (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            gap: theme.spacing.sm + 2,
          }}
        >
          <View style={{ flexDirection: "row", gap: theme.spacing.sm + 2 }}>
            <Button
              label={cooked ? "Undo cooked" : "Mark cooked"}
              icon={cooked ? "arrow-undo-outline" : undefined}
              onPress={() => void toggleCooked()}
              style={{ flex: 1 }}
            />
            <Button
              label="Keep for next week"
              variant="secondary"
              icon={!isPremium ? "lock-closed-outline" : kept ? "checkmark" : undefined}
              onPress={() => void toggleKeep()}
              accessibilityLabel={
                !isPremium
                  ? "Keep for next week, premium feature"
                  : kept
                    ? "Kept for next week, tap to remove"
                    : "Keep for next week"
              }
              style={{ flex: 1.2 }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontFamily: theme.font.family,
              }}
            >
              {cooked && rating
                ? rating === "up"
                  ? "Noted, we'll plan more like this."
                  : "Noted, we'll steer away from this one."
                : "How was it?"}
            </Text>
            {(["up", "down"] as const).map((value) => {
              const active = value === "up" ? liked : rating === "down";
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={value === "up" ? "Liked it" : "Didn't like it"}
                  accessibilityState={{ selected: active }}
                  hitSlop={8}
                  onPress={() => void rate(value)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons
                    name={
                      value === "up"
                        ? active
                          ? "thumbs-up"
                          : "thumbs-up-outline"
                        : active
                          ? "thumbs-down"
                          : "thumbs-down-outline"
                    }
                    size={24}
                    color={active ? theme.colors.primary : theme.colors.text}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            padding: theme.spacing.md,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          }}
        >
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontFamily: theme.font.family,
              textAlign: "center",
            }}
          >
            This dinner isn't in this week's plan, so it can't be marked cooked.
          </Text>
        </View>
      )}
    </View>
  );
}
