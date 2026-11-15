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
import { cookDinner, rateDinner, uncookDinner, usePlanData } from "../../data/plan";
import { remainingStock } from "../../data/planner";
import { usePurchases } from "../../data/purchases";
import {
  MINOR_PACKS,
  PACKS,
  addDays,
  dayName,
  dinnerDate,
  formatLeftover,
  formatLongDate,
  formatQty,
  getRecipe,
  round2,
  type PlanDinner,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Seasonings, oil and onions: too small or too everyday to list as leftovers. */
const SKIP = MINOR_PACKS;

export default function CookScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, status, dinners, planPantry: pantry, loading } = usePlanData();
  const { isPremium, openPaywall } = usePurchases();

  const { leftByDinner, carry } = useMemo(() => {
    const { lines, available } = remainingStock(dinners, pantry);
    // Walk the cooked dinners in order, taking what each one used from the packs.
    const remaining = new Map(available);
    const leftByDinner: Record<string, LeftLine[]> = {};
    for (const d of dinners) {
      if (!d.cooked) continue;
      const lines: LeftLine[] = [];
      for (const [key, used] of Object.entries(d.used ?? {})) {
        const pack = PACKS[key];
        const have = available.get(key) ?? 0;
        if (!pack || !remaining.has(key)) continue;
        const rem = Math.max(0, round2(remaining.get(key)! - used));
        remaining.set(key, rem);
        if (SKIP.has(key) || have <= 0) continue;
        lines.push({
          key,
          name: pack.name,
          amount: `${formatQty(pack, rem)} of ${formatQty(pack, have)}`,
          pct: (rem / have) * 100,
        });
      }
      leftByDinner[d.id] = lines.slice(0, 3);
    }

    // Once all five are cooked, this is what goes into the cupboard for next week.
    const carry: string[] = [];
    for (const line of lines) {
      if (SKIP.has(line.pack.key) || line.leftover <= 0 || line.pack.staple) continue;
      carry.push(formatLeftover(line.pack.key, line.leftover));
    }
    return { leftByDinner, carry: carry.slice(0, 8) };
  }, [dinners, pantry]);

  const cookedCount = dinners.filter((d) => d.cooked).length;
  const nextId = dinners.find((d) => !d.cooked)?.id;
  const allCooked = dinners.length > 0 && cookedCount === dinners.length;
  const ended = status === "ended";

  const markCooked = (d: PlanDinner) => {
    void cookDinner(d.id);
    track("dinner_cooked", { recipe: d.recipeId });
  };
  const rate = (d: PlanDinner, rating: PlanDinner["rating"]) => {
    void rateDinner(d.id, rating);
    track("dinner_rated", { liked: rating === "up" });
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
          dinners.length === 0 || !plan
            ? undefined
            : ended
              ? `This plan ended ${formatLongDate(addDays(plan.weekStart, 6))}`
              : allCooked
                ? `All ${dinners.length} cooked. Here's what carries over.`
                : `${cookedCount} of ${dinners.length} cooked this week`
        }
      />

      {loading ? (
        <LoadingState label="Loading this week's dinners" />
      ) : dinners.length === 0 || !plan ? (
        <EmptyState
          icon="flame-outline"
          title="No dinners to cook yet"
          body="Plan your five dinners on the Week tab and they'll line up here, one for each weekday."
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
            {dinners.map((d) => (
              <View
                key={d.id}
                accessible
                accessibilityLabel={`${dayName(dinnerDate(plan.weekStart, d.dayIndex))}: ${d.cooked ? "cooked" : "not cooked yet"}`}
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
                  {dayName(dinnerDate(plan.weekStart, d.dayIndex))}
                </Text>
              </View>
            ))}
          </View>

          {dinners.map((d) => {
            const recipe = getRecipe(d.recipeId);
            const name = recipe?.name ?? "Dinner";
            return (
              <DinnerCard
                key={d.id}
                day={dayName(dinnerDate(plan.weekStart, d.dayIndex))}
                dinner={d}
                name={name}
                minutes={recipe?.minutes ?? 30}
                state={d.cooked ? "cooked" : d.id === nextId ? "next" : "later"}
                left={leftByDinner[d.id] ?? []}
                onOpen={() => router.push(`/recipe/${d.id}`)}
                onStart={() => router.push(`/recipe/${d.id}`)}
                onMarkCooked={() => markCooked(d)}
                onRate={(rating) => rate(d, rating)}
                onUndo={() => void uncookDinner(d.id)}
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
                    {ended
                      ? "These are in your cupboard now, and next week's plan starts with them."
                      : "When the week ends these go into your cupboard, and next week's plan starts with them."}
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Unlock next week planned around these"
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
                      Plan next week around these
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
