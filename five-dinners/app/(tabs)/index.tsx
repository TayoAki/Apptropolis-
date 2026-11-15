import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { Penny } from "../../components/Penny";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { Meter } from "../../components/Meter";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useShareImage } from "../../components/share";
import { DinnerRow, type Candidate, type SwapInfo } from "../../components/index/DinnerRow";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { createPlan, setPantryConfirmed, swapDinner, usePlanData } from "../../data/plan";
import { recipePool } from "../../data/planner";
import { usePurchases } from "../../data/purchases";
import {
  PACKS,
  PRICE_SOURCE,
  RECIPES,
  addDays,
  basketTotal,
  buildBasket,
  compareBaskets,
  dayName,
  dinnerDate,
  formatLongDate,
  formatPackSize,
  formatPantry,
  formatPrice,
  formatQty,
  formatShortDate,
  getRecipe,
  isAllowed,
  leftoverSummary,
  readHousehold,
  round2,
  scaleQty,
  weekRange,
  type PantryItem,
  type PlanDinner,
  type Recipe,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

function leftoverNote(recipe: Recipe, servings: number, pantry: PantryItem[]): string {
  for (const [key, per] of recipe.ingredients) {
    const pack = PACKS[key];
    if (!pack) continue;
    const have = pantry
      .filter((p) => p.confirmed && p.quantity > 0 && !p.isStaple && p.fromWeek && p.packKey === key)
      .reduce((sum, p) => sum + p.quantity, 0);
    if (have > 0) {
      const use = Math.min(scaleQty(pack, per, servings), have);
      return `Uses ${formatQty(pack, use)} leftover ${pack.name.toLowerCase()}`;
    }
  }
  return "";
}

function carriedList(items: PantryItem[]): string {
  return leftoverSummary(items);
}

export default function WeekScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { answers, setAnswer } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const { ref, share, sharing } = useShareImage();
  const data = usePlanData();
  const { plan, plans, status, dinners, pantry, total, costs, leftovers, carried, allCooked } =
    data;

  const [openSwap, setOpenSwap] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<Record<string, SwapInfo & { fromId: string }>>({});
  const [editBudget, setEditBudget] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const household = readHousehold(answers);
  const budget = household.budget;
  const householdServings = household.servings;
  const pool = useMemo(
    () => recipePool(household, isPremium),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers.excluded, answers.vegnights, isPremium],
  );

  const inputs = useMemo(
    () => dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings })),
    [dinners],
  );
  const carriedText = carriedList(carried);

  const openDinner = dinners.find((d) => d.id === openSwap);
  const candidates: Candidate[] = useMemo(() => {
    if (!openDinner) return [];
    const used = new Set(dinners.map((d) => d.recipeId));
    return pool
      .filter((r) => !used.has(r.id))
      .map((recipe) => {
        const next = inputs.map((i, idx) =>
          dinners[idx]!.id === openDinner.id ? { ...i, recipeId: recipe.id } : i,
        );
        return { recipe, delta: round2(basketTotal(buildBasket(next, pantry)) - total) };
      })
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 6);
  }, [openDinner, dinners, inputs, pantry, pool, total]);
  const lockedCount = isPremium
    ? 0
    : RECIPES.filter((r) => r.premium && isAllowed(r, household.excluded)).length;

  const loading = data.loading;

  async function pickSwap(dinner: PlanDinner, recipeId: string) {
    const before = buildBasket(inputs, pantry);
    const nextInputs = inputs.map((i, idx) =>
      dinners[idx]!.id === dinner.id ? { ...i, recipeId } : i,
    );
    const after = buildBasket(nextInputs, pantry);
    const from = getRecipe(dinner.recipeId);
    setSwaps((s) => ({
      ...s,
      [dinner.id]: {
        fromId: s[dinner.id]?.fromId ?? dinner.recipeId,
        fromName: s[dinner.id]?.fromName ?? from?.name ?? "Previous dinner",
        diff: compareBaskets(before, after),
      },
    }));
    setOpenSwap(null);
    track("dinner_swapped", { library: getRecipe(recipeId)?.premium ?? false });
    await swapDinner(dinner.id, recipeId);
  }

  async function undoSwap(dinner: PlanDinner) {
    const info = swaps[dinner.id];
    if (!info) return;
    setSwaps((s) => {
      const { [dinner.id]: _gone, ...rest } = s;
      return rest;
    });
    await swapDinner(dinner.id, info.fromId);
  }

  async function setConfirmed(item: PantryItem, confirmed: boolean) {
    await setPantryConfirmed(item.id, confirmed);
  }

  async function planWeek() {
    setPlanning(true);
    setPlanNote(null);
    try {
      const result = await createPlan(answers, isPremium);
      if (result.ok) {
        setSwaps({});
        track("week_planned", { leftovers: carried.length });
      } else if (result.reason === "locked") {
        openPaywall();
      } else if (result.reason === "empty") {
        setPlanNote("No dinners fit your answers. Loosen \u201cFoods we don't eat\u201d in Settings.");
      }
    } finally {
      setPlanning(false);
    }
  }

  const left = round2(budget - total);
  const over = left < 0;
  const pct = budget > 0 ? Math.min(1, total / budget) : 0;
  const pctLabel = `${budget > 0 ? Math.round((total / budget) * 100) : 0}%`;
  const shownServings = dinners[0]?.servings ?? householdServings;
  const lastDay = plan ? addDays(plan.weekStart, 6) : "";
  const showPlan = !loading && status === "active" && dinners.length > 0;

  function shareWeek() {
    const used = carried.length ? ` · ${carriedText} carried over` : "";
    void share({
      message: `${dinners.length} dinners · ${formatPrice(total)} of ${formatPrice(budget)}${used}`,
      title: "My week of dinners",
    });
    track("week_shared");
  }

  const base = { fontFamily: theme.font.family, color: theme.colors.text } as const;
  const iconButton = (pressed: boolean) => ({
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: pressed ? 0.6 : 1,
  });

  // Before planning, the leftovers are asked about in full; during a week they fold away.
  const checkInShown = status !== "active" || checkInOpen;
  const checkIn =
    leftovers.length > 0 ? (
      <View
        style={{
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.md,
          overflow: "hidden",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`What's left from last week, ${leftovers.length} items. ${checkInShown ? "Hide" : "Check what's still in the cupboard"}`}
          accessibilityState={{ expanded: checkInShown }}
          disabled={status !== "active"}
          onPress={() => setCheckInOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            minHeight: 48,
            padding: theme.spacing.md,
            paddingBottom: checkInShown ? theme.spacing.sm : theme.spacing.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body }}>
            <Text style={{ fontWeight: theme.font.weight.bold }}>What's left</Text>
            {checkInShown
              ? " · Still in the cupboard?"
              : ` · ${leftovers.length} ${leftovers.length === 1 ? "item" : "items"} from last week`}
          </Text>
          {status === "active" ? (
            <Ionicons
              name={checkInShown ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textMuted}
            />
          ) : null}
        </Pressable>
        {(checkInShown ? leftovers : []).map((item) => {
          const pack = PACKS[item.packKey];
          return (
            <View
              key={item.id}
              accessibilityRole="radiogroup"
              accessibilityLabel={`${item.ingredient}, ${formatPantry(item)}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderTopColor: theme.colors.textMuted + "33",
                borderTopWidth: 1,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    ...base,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  {item.ingredient}
                </Text>
                <Text
                  style={{
                    ...base,
                    fontSize: theme.font.size.caption + 1,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatPantry(item)}
                  {pack ? ` of a ${formatPackSize(pack)}` : ""}
                </Text>
              </View>
              <CheckPill
                label="Still there"
                selected={item.confirmed}
                onPress={() => setConfirmed(item, true)}
              />
              <CheckPill
                label="Used up"
                selected={!item.confirmed}
                onPress={() => setConfirmed(item, false)}
              />
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.lg,
        // On a wide screen the page stays a readable column.
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
      }}
    >
      <ScreenHeader
        title="Week"
        subtitle={
          showPlan && plan
            ? `${weekRange(plan.weekStart)} · for ${shownServings}`
            : `For ${householdServings} · ${formatPrice(budget)} budget`
        }
      >
        {showPlan ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share this week"
            accessibilityState={{ disabled: sharing }}
            disabled={sharing}
            onPress={shareWeek}
            style={({ pressed }) => iconButton(pressed)}
          >
            <Ionicons name="share-social-outline" size={24} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push("/settings")}
          style={({ pressed }) => iconButton(pressed)}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </ScreenHeader>

      {loading ? <LoadingState label="Loading your week" /> : null}

      {!loading && status === "none" ? (
        <EmptyState
          icon="calendar-outline"
          title="Plan your first week"
          body={`Five dinners for ${householdServings}, priced by the full packs you buy at Aldi, against your ${formatPrice(budget)} budget. Your first week is free.`}
          actionLabel="Plan my week"
          actionLoading={planning}
          onAction={planWeek}
        />
      ) : null}

      {!loading && status === "ended" && plan ? (
        <>
          {isPremium ? (
            <EmptyState
              icon="calendar-outline"
              title="Plan next week"
              body={
                carried.length
                  ? `Five dinners for ${householdServings}, planned around what's left: ${carriedText}.`
                  : `Five dinners for ${householdServings}, priced by full packs against your ${formatPrice(budget)} budget.`
              }
              actionLabel="Plan next week"
              actionLoading={planning}
              onAction={planWeek}
            />
          ) : (
            <EmptyState
              icon="lock-closed-outline"
              title={plans.length === 1 ? "Your free week is done" : "This week's plan is over"}
              body={`It ended ${formatLongDate(lastDay)}. Unlimited weekly plans are a one-time $4.99${carried.length ? `, and next week starts with what's left: ${carriedText}` : ""}.`}
              actionLabel="See unlimited plans"
              onAction={openPaywall}
            />
          )}
          {checkIn}
        </>
      ) : null}

      {planNote ? (
        <Text style={{ ...base, color: theme.colors.warning, textAlign: "center" }}>{planNote}</Text>
      ) : null}

      {showPlan && plan ? (
        <>
          <View ref={ref} collapsable={false}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderTopLeftRadius: theme.radius.md,
                borderTopRightRadius: theme.radius.md,
                padding: theme.spacing.md,
                gap: theme.spacing.sm,
              }}
            >
              <Text style={{ ...base, fontSize: theme.font.size.body }}>This week's basket</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    flexShrink: 1,
                    gap: theme.spacing.sm,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        ...base,
                        fontSize: theme.font.size.display,
                        fontWeight: theme.font.weight.bold,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {formatPrice(total)}
                    </Text>
                    <View
                      style={{
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: theme.colors.text,
                        marginTop: -2,
                      }}
                    />
                  </View>
                  {/* Two short lines beside the total, so a wide "over" pill never squeezes it. */}
                  <Text
                    style={{
                      ...base,
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.body,
                      paddingBottom: 4,
                      flexShrink: 1,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {`of ${formatPrice(budget)}\nbudget`}
                  </Text>
                </View>
                <View
                  style={{
                    borderColor: over ? theme.colors.danger : theme.colors.accent,
                    borderWidth: 1.5,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.spacing.sm + 4,
                    paddingVertical: theme.spacing.xs,
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      ...base,
                      color: over ? theme.colors.danger : theme.colors.accent,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {over ? `${formatPrice(-left)} over` : `${formatPrice(left)} left`}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Meter
                    value={pct}
                    color={over ? theme.colors.danger : theme.colors.primary}
                    accessibilityLabel={`${pctLabel} of budget`}
                  />
                </View>
                <Text
                  style={{
                    ...base,
                    fontSize: theme.font.size.caption + 1,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {pctLabel}
                </Text>
              </View>
              <Text
                style={{
                  ...base,
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption + 1,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {dinners.length} dinners · full packs · Aldi ZIP {PRICE_SOURCE.zip} · prices{" "}
                {formatShortDate(PRICE_SOURCE.checked)}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  marginTop: theme.spacing.xs,
                }}
              >
                <Penny
                  mood={carried.length ? "half-full" : total <= budget ? "happy" : "neutral"}
                  width={44}
                />
                {carried.length ? (
                  <Text
                    style={{
                      ...base,
                      flex: 1,
                      fontSize: theme.font.size.body,
                      color: theme.colors.accent,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    <Text style={{ fontWeight: theme.font.weight.bold }}>Carried over: </Text>
                    {carriedText}
                  </Text>
                ) : (
                  <Text
                    style={{
                      ...base,
                      flex: 1,
                      fontSize: theme.font.size.body,
                      color: theme.colors.textMuted,
                    }}
                  >
                    Nothing carried over yet. What's left of this week's packs appears here when the
                    week ends.
                  </Text>
                )}
              </View>
            </View>
            {/* The torn receipt edge: a row of diamonds in the page color. */}
            <View style={{ height: 7, backgroundColor: theme.colors.surface, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", position: "absolute", top: 2, left: -5 }}>
                {Array.from({ length: Math.ceil(width / 14) + 1 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      marginRight: 4,
                      backgroundColor: theme.colors.background,
                      transform: [{ rotate: "45deg" }],
                    }}
                  />
                ))}
              </View>
            </View>
          </View>

          {checkIn}

          <View style={{ gap: theme.spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  ...base,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Five dinners
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dinner budget ${formatPrice(budget)}. Change budget`}
                accessibilityState={{ expanded: editBudget }}
                hitSlop={10}
                onPress={() => setEditBudget((v) => !v)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    ...base,
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  Budget {formatPrice(budget)}
                </Text>
                <Ionicons
                  name={editBudget ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.colors.primary}
                />
              </Pressable>
            </View>

            {editBudget ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.sm,
                }}
              >
                <Text
                  style={{
                    ...base,
                    flex: 1,
                    fontSize: theme.font.size.body,
                    paddingLeft: theme.spacing.sm,
                  }}
                >
                  Dinner budget for the week
                </Text>
                <StepButton
                  icon="remove"
                  label="Lower budget by $1"
                  disabled={budget <= 10}
                  onPress={() => setAnswer("weeklybudget", `$${Math.max(10, budget - 1)}`)}
                />
                <Text
                  style={{
                    ...base,
                    minWidth: 56,
                    textAlign: "center",
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatPrice(budget).replace(".00", "")}
                </Text>
                <StepButton
                  icon="add"
                  label="Raise budget by $1"
                  disabled={budget >= 300}
                  onPress={() => setAnswer("weeklybudget", `$${Math.min(300, budget + 1)}`)}
                />
              </View>
            ) : null}

            {dinners.map((d, i) => {
              const recipe = getRecipe(d.recipeId);
              if (!recipe) return null;
              return (
                <DinnerRow
                  key={d.id}
                  day={dayName(dinnerDate(plan.weekStart, d.dayIndex))}
                  recipe={recipe}
                  servings={d.servings}
                  cost={costs[i] ?? 0}
                  note={leftoverNote(recipe, d.servings, pantry)}
                  cooked={d.cooked}
                  open={openSwap === d.id}
                  swap={swaps[d.id]}
                  candidates={openSwap === d.id ? candidates : []}
                  lockedCount={lockedCount}
                  canSwap={!d.cooked}
                  onOpen={() => router.push(`/recipe/${d.id}`)}
                  onToggle={() => setOpenSwap(openSwap === d.id ? null : d.id)}
                  onPick={(id) => pickSwap(d, id)}
                  onUndo={() => undoSwap(d)}
                  onUnlock={openPaywall}
                />
              );
            })}
          </View>

          {allCooked ? (
            <View
              style={{
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
              }}
            >
              <Text
                style={{ ...base, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}
              >
                All {dinners.length} cooked
              </Text>
              <Text style={{ ...base, fontSize: theme.font.size.body }}>
                {isPremium
                  ? "Plan next week now and it starts with what's left of these packs."
                  : `Your free week runs to ${formatLongDate(lastDay)}. Planning next week around what's left is part of unlimited plans.`}
              </Text>
              {isPremium ? (
                <Button label="Plan next week now" onPress={planWeek} loading={planning} />
              ) : (
                <Button
                  label="See unlimited plans"
                  variant="outline"
                  icon="lock-closed-outline"
                  onPress={openPaywall}
                />
              )}
            </View>
          ) : isPremium ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                minHeight: 44,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
              <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body }}>
                What's left carries into next week's plan
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See what's left on the Cook tab"
                hitSlop={10}
                onPress={() => router.push("/cook")}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    ...base,
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  See what's left
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unlock next week planned around what's left"
              onPress={openPaywall}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                minHeight: 44,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
              <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body }}>
                Plan next week around what's left
              </Text>
              <Text
                style={{
                  ...base,
                  color: theme.colors.primary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                Unlock
              </Text>
            </Pressable>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

/** One of the two answers to "still in the cupboard?". The chosen one carries a tick. */
function CheckPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: theme.spacing.sm + 2,
        borderRadius: theme.radius.pill,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? theme.colors.accent : theme.colors.textMuted,
        backgroundColor: selected ? theme.colors.surface : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {selected ? <Ionicons name="checkmark" size={14} color={theme.colors.accent} /> : null}
      <Text
        style={{
          fontFamily: theme.font.family,
          fontSize: theme.font.size.caption + 1,
          color: selected ? theme.colors.accent : theme.colors.text,
          fontWeight: selected ? theme.font.weight.bold : theme.font.weight.regular,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "add" | "remove";
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: disabled ? theme.colors.border : theme.colors.textMuted,
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
      })}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? theme.colors.textMuted : theme.colors.text}
      />
    </Pressable>
  );
}
