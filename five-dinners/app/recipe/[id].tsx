import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { aiImageUrl } from "../../components/AiImage";
import { Button } from "../../components/Button";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { PackIcon } from "../../components/PackIcon";
import { RecipePlate } from "../../components/RecipePlate";
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
  fillSteps,
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

  // The header sits on the page color, like the tab screens, with the plain back chevron.
  const headerStyle = { backgroundColor: theme.colors.background };

  if (dinners.loading || pantry.loading || checks.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ title: "Recipe", headerStyle }} />
        <LoadingState label="Opening the recipe" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ title: "Recipe", headerStyle }} />
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
  const stepTexts = fillSteps(recipe, servings);
  const heroPrompt = `${recipe.name}, plated home-cooked dinner seen from above, soft watercolour illustration`;
  const hasPicture = aiImageUrl(heroPrompt) !== null;
  const cooked = dinner?.cooked ?? false;
  const kept = dinner?.keepNextWeek ?? false;
  const liked = dinner?.liked ?? false;

  const chips = [
    `${recipe.minutes} min`,
    `For ${servings}`,
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
          headerStyle,
          headerRight: dinner
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={heartLabel}
                  accessibilityState={{ selected: liked }}
                  hitSlop={6}
                  onPress={() => void dinners.update(dinner.id, { liked: !liked })}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={24}
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
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.lg,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
      >
        <View style={{ alignItems: "center", gap: theme.spacing.md }}>
          {hasPicture ? (
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
              <RecipePlate prompt={heroPrompt} diet={recipe.diet} size={168} />
            </View>
          ) : (
            <RecipePlate prompt={heroPrompt} diet={recipe.diet} size={112} />
          )}
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
                    fontFamily: theme.font.family,
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
                  onPress={() => setOverride(servings + (kind === "minus" ? -1 : 1))}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: disabled ? theme.colors.border : theme.colors.textMuted,
                  })}
                >
                  <Ionicons
                    name={kind === "minus" ? "remove" : "add"}
                    size={24}
                    color={disabled ? theme.colors.textMuted : theme.colors.primary}
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
                <PackIcon packKey={pack.key} />
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
                  {fromCupboard ? ` — ${text}` : ` — ${usesText}${leftText}`}
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
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.bold,
                        fontFamily: theme.font.family,
                      }}
                    >
                      In cupboard
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
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Step ${index + 1}. ${stepTexts[index] ?? ""}`}
                accessibilityHint="Tap to tick this step off"
                onPress={() => toggleStep(index)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: theme.spacing.sm + 2,
                  minHeight: 44,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 24, alignItems: "center", paddingTop: 1 }}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                        lineHeight: 22,
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
                    lineHeight: 22,
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
              variant={cooked ? "outline" : "primary"}
              onPress={() => void toggleCooked()}
              style={{ flex: 2 }}
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
              style={{ flex: 3 }}
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
