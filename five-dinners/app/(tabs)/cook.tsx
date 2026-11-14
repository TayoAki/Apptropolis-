import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Penny } from "../../components/Penny";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { ScreenHeader } from "../../components/ScreenHeader";
import { DinnerCard, type LeftLine } from "../../components/cook/DinnerCard";
import { track } from "../../data/analytics";
import { useCollection } from "../../data/repo";
import { usePurchases } from "../../data/purchases";
import {
  PACKS,
  buildBasket,
  formatQty,
  getRecipe,
  scaleQty,
  weekStartOf,
  type PantryItem,
  type PlanDinner,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** Seasonings and cooking oil: too small to be worth tracking as leftovers. */
const SKIP = new Set(["oil", "onion", "garlic", "stock", "cumin", "paprika", "curry"]);

function carryLabel(key: string, amount: number): string {
  const pack = PACKS[key]!;
  if (pack.unit === "each") return formatQty(pack, amount);
  return `${formatQty(pack, amount)} ${pack.name.toLowerCase()}`;
}

export default function CookScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dinnerData = useCollection<PlanDinner>("plan_dinners");
  const pantryData = useCollection<PantryItem>("pantry_items");
  const { isPremium, openPaywall } = usePurchases();

  const week = weekStartOf();
  const loading = dinnerData.loading || pantryData.loading;

  const dinners = useMemo(
    () =>
      dinnerData.items
        .filter((d) => d.weekStart === week)
        .sort((a, b) => a.dayIndex - b.dayIndex),
    [dinnerData.items, week],
  );

  const { leftByDinner, carry } = useMemo(() => {
    const inputs = dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings }));
    const basket = buildBasket(inputs, pantryData.items);
    const total = new Map<string, number>();
    const remaining = new Map<string, number>();
    for (const line of basket) {
      const available = line.inCupboard + line.packs * line.pack.size;
      total.set(line.pack.key, available);
      remaining.set(line.pack.key, available);
    }

    const leftByDinner: Record<string, LeftLine[]> = {};
    for (const d of dinners) {
      if (!d.cooked) continue;
      const recipe = getRecipe(d.recipeId);
      if (!recipe) continue;
      const lines: LeftLine[] = [];
      for (const [key, per] of recipe.ingredients) {
        const pack = PACKS[key];
        if (!pack) continue;
        const used = scaleQty(pack, per, d.servings);
        const rem = Math.max(0, (remaining.get(key) ?? 0) - used);
        remaining.set(key, rem);
        const available = total.get(key) ?? 0;
        if (SKIP.has(key) || available <= 0) continue;
        lines.push({
          key,
          name: pack.name,
          amount: `${formatQty(pack, rem)} of ${formatQty(pack, available)}`,
          pct: (rem / available) * 100,
        });
      }
      leftByDinner[d.id] = lines.slice(0, 3);
    }

    const carry: string[] = [];
    for (const line of basket) {
      if (SKIP.has(line.pack.key) || line.leftover <= 0) continue;
      const fromPantry = pantryData.items.some(
        (p) => p.confirmed && p.ingredient === line.pack.name && !p.isStaple,
      );
      if (line.packs > 0 || fromPantry) carry.push(carryLabel(line.pack.key, line.leftover));
    }
    return { leftByDinner, carry: carry.slice(0, 8) };
  }, [dinners, pantryData.items]);

  const cookedCount = dinners.filter((d) => d.cooked).length;
  const nextId = dinners.find((d) => !d.cooked)?.id;
  const allCooked = dinners.length > 0 && cookedCount === dinners.length;

  const markCooked = (d: PlanDinner) => {
    void dinnerData.update(d.id, { cooked: true, liked: true });
    track("dinner_cooked", { recipe: d.recipeId });
  };
  const toggleLiked = (d: PlanDinner) => {
    void dinnerData.update(d.id, { liked: !d.liked });
    track("dinner_rated", { liked: !d.liked });
  };

  const pennyMood = allCooked ? "happy" : carry.length > 0 ? "half-full" : "neutral";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.md,
        // On a wide screen the page stays a readable column.
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
      }}
    >
      <ScreenHeader
        title="Cook"
        subtitle={
          dinners.length === 0
            ? undefined
            : allCooked
              ? "All five cooked. Here's what carries over."
              : `${cookedCount} of ${dinners.length} cooked this week`
        }
      />

      {loading ? (
        <LoadingState label="Loading this week's dinners" />
      ) : dinners.length === 0 ? (
        <EmptyState
          icon="flame-outline"
          title="No dinners to cook yet"
          body="Plan your five dinners on the Week tab and they'll line up here, Monday to Friday."
          actionLabel="Plan this week"
          onAction={() => router.push("/")}
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
            }}
          >
            {dinners.map((d, i) => (
              <View
                key={d.id}
                accessible
                accessibilityLabel={`${DAY_LABELS[d.dayIndex - 1] ?? DAY_LABELS[i]}: ${d.cooked ? "cooked" : "not cooked yet"}`}
                style={{ alignItems: "center", gap: theme.spacing.xs + 2 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: d.cooked ? theme.colors.accent : "transparent",
                    borderWidth: 1.5,
                    borderColor: d.cooked ? theme.colors.accent : theme.colors.textMuted,
                  }}
                >
                  {d.cooked ? (
                    <Ionicons name="checkmark" size={22} color={theme.colors.onPrimary} />
                  ) : null}
                </View>
                <Text
                  style={{
                    color: d.cooked ? theme.colors.text : theme.colors.textMuted,
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.caption + 1,
                    fontWeight: d.cooked ? theme.font.weight.bold : theme.font.weight.regular,
                  }}
                >
                  {DAY_LABELS[d.dayIndex - 1] ?? DAY_LABELS[i]}
                </Text>
              </View>
            ))}
          </View>

          {dinners.map((d, i) => {
            const recipe = getRecipe(d.recipeId);
            const name = recipe?.name ?? "Dinner";
            return (
              <DinnerCard
                key={d.id}
                day={DAY_LABELS[d.dayIndex - 1] ?? DAY_LABELS[i] ?? ""}
                dinner={d}
                name={name}
                minutes={recipe?.minutes ?? 30}
                state={d.cooked ? "cooked" : d.id === nextId ? "next" : "later"}
                left={leftByDinner[d.id] ?? []}
                onOpen={() => router.push(`/recipe/${d.recipeId}`)}
                onStart={() => router.push(`/recipe/${d.recipeId}`)}
                onMarkCooked={() => markCooked(d)}
                onToggleLiked={() => toggleLiked(d)}
                onUndo={() => void dinnerData.update(d.id, { cooked: false })}
              />
            );
          })}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
            }}
          >
            <Penny mood={pennyMood} width={72} height={96} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Carrying forward
              </Text>
              {carry.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                  {carry.map((label) => (
                    <View
                      key={label}
                      style={{
                        borderRadius: theme.radius.pill,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.sm + 2,
                        paddingVertical: theme.spacing.xs + 1,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontFamily: theme.font.family,
                          fontSize: theme.font.size.caption + 1,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={{
                    color: theme.colors.text,
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.body,
                  }}
                >
                  Nothing to carry over: this week's packs get used up.
                </Text>
              )}
              {carry.length > 0 ? (
                isPremium ? (
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.font.family,
                      fontSize: theme.font.size.body,
                    }}
                  >
                    These go into next Sunday's plan.
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Unlock leftover carry-over with Premium"
                    onPress={openPaywall}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="lock-closed" size={16} color={theme.colors.primary} />
                    <Text
                      style={{
                        flex: 1,
                        color: theme.colors.primary,
                        fontFamily: theme.font.family,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Plan next Sunday around these
                    </Text>
                  </Pressable>
                )
              ) : null}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
