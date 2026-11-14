import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { useShareImage } from "../../components/share";
import { DinnerRow, type Candidate, type SwapInfo } from "../../components/index/DinnerRow";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  HOME_STORE,
  PACKS,
  allowedRecipes,
  basketTotal,
  buildBasket,
  compareBaskets,
  dinnerCosts,
  formatLongDate,
  formatPackSize,
  formatPantry,
  formatPrice,
  formatQty,
  formatShortDate,
  getRecipe,
  packByName,
  parseBudget,
  parseServings,
  round2,
  scaleQty,
  weekStartOf,
  type Diet,
  type PantryItem,
  type PlanDinner,
  type PriceCheck,
  type Recipe,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const DAY_NAMES = ["", "MON", "TUE", "WED", "THU", "FRI"];

function parseExclusions(raw: string): Diet[] {
  const s = raw.toLowerCase();
  const out = new Set<Diet>();
  if (s.includes("vegetarian") || s.includes("vegan")) {
    out.add("meat");
    out.add("pork");
    out.add("fish");
  }
  if (s.includes("pork")) out.add("pork");
  if (s.includes("fish")) out.add("fish");
  if (s.includes("meat")) out.add("meat");
  return [...out];
}

function leftoverNote(recipe: Recipe, servings: number, pantry: PantryItem[]): string {
  for (const [key, per] of recipe.ingredients) {
    const pack = PACKS[key];
    if (!pack) continue;
    const item = pantry.find(
      (p) => p.confirmed && p.quantity > 0 && !p.isStaple && p.ingredient === pack.name,
    );
    if (item) {
      const use = Math.min(scaleQty(pack, per, servings), item.quantity);
      return `uses ${formatQty(pack, use)} leftover ${pack.name.toLowerCase()}`;
    }
  }
  return "";
}

export default function WeekScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const { ref, share, sharing } = useShareImage();

  const plan = useCollection<PlanDinner>("plan_dinners");
  const pantryCol = useCollection<PantryItem>("pantry_items");
  const checks = useCollection<PriceCheck>("price_checks");

  const [openSwap, setOpenSwap] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<Record<string, SwapInfo & { fromId: string }>>({});
  const [editBudget, setEditBudget] = useState(false);
  const [planning, setPlanning] = useState(false);

  const weekStart = weekStartOf();
  const budget = parseBudget(answers.weeklybudget ?? "£25");
  const householdServings = parseServings(answers.servings ?? "2");
  const excluded = useMemo(
    () => parseExclusions(`${answers.diet ?? ""} ${answers.exclusions ?? ""}`),
    [answers.diet, answers.exclusions],
  );

  const dinners = useMemo(
    () =>
      plan.items.filter((d) => d.weekStart === weekStart).sort((a, b) => a.dayIndex - b.dayIndex),
    [plan.items, weekStart],
  );
  const pantry = pantryCol.items;
  const inputs = useMemo(
    () => dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings })),
    [dinners],
  );
  const lines = useMemo(() => buildBasket(inputs, pantry), [inputs, pantry]);
  const total = basketTotal(lines);
  const costs = useMemo(() => dinnerCosts(inputs, pantry), [inputs, pantry]);

  const leftovers = pantry.filter((p) => !p.isStaple && p.quantity > 0 && p.fromWeek);
  const carried = leftovers.filter((p) => p.confirmed);
  const carriedText = carried
    .map((p) => `${formatPantry(p)} ${p.ingredient.toLowerCase()}`)
    .join(", ");

  const lastChecked = checks.items
    .filter((c) => c.store === HOME_STORE)
    .map((c) => c.estimateDate)
    .sort()
    .pop();

  const openDinner = dinners.find((d) => d.id === openSwap);
  const candidates: Candidate[] = useMemo(() => {
    if (!openDinner) return [];
    const used = new Set(dinners.map((d) => d.recipeId));
    return allowedRecipes(excluded)
      .filter((r) => !used.has(r.id) && (isPremium || !r.premium))
      .map((recipe) => {
        const next = inputs.map((i, idx) =>
          dinners[idx]!.id === openDinner.id ? { ...i, recipeId: recipe.id } : i,
        );
        return { recipe, delta: round2(basketTotal(buildBasket(next, pantry)) - total) };
      })
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 6);
  }, [openDinner, dinners, inputs, pantry, excluded, isPremium, total]);
  const lockedCount = isPremium
    ? 0
    : allowedRecipes(excluded).filter((r) => r.premium).length;

  const loading = plan.loading || pantryCol.loading || checks.loading;
  const hasOlderWeeks = plan.items.some((d) => d.weekStart !== weekStart);

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
        fromId: dinner.recipeId,
        fromName: from?.name ?? "Previous dinner",
        diff: compareBaskets(before, after),
      },
    }));
    setOpenSwap(null);
    track("dinner_swapped", { library: getRecipe(recipeId)?.premium ?? false });
    await plan.update(dinner.id, { recipeId, cooked: false, liked: false });
  }

  async function undoSwap(dinner: PlanDinner) {
    const info = swaps[dinner.id];
    if (!info) return;
    setSwaps((s) => {
      const { [dinner.id]: _gone, ...rest } = s;
      return rest;
    });
    await plan.update(dinner.id, { recipeId: info.fromId });
  }

  async function setConfirmed(item: PantryItem, confirmed: boolean) {
    await pantryCol.update(item.id, { confirmed, updatedAt: new Date().toISOString() });
  }

  async function planWeek() {
    setPlanning(true);
    try {
      const pool = allowedRecipes(excluded).filter((r) => isPremium || !r.premium);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen: Recipe[] = [];
      const perDiet: Record<string, number> = {};
      for (const r of shuffled) {
        if (chosen.length === 5) break;
        if ((perDiet[r.diet] ?? 0) >= 2) continue;
        perDiet[r.diet] = (perDiet[r.diet] ?? 0) + 1;
        chosen.push(r);
      }
      for (const r of shuffled) {
        if (chosen.length === 5) break;
        if (!chosen.includes(r)) chosen.push(r);
      }
      const inp = chosen.map((r) => ({ recipeId: r.id, servings: householdServings }));
      const cs = dinnerCosts(inp, pantry);
      for (let i = 0; i < chosen.length; i++) {
        await plan.add({
          weekStart,
          recipeId: chosen[i]!.id,
          dayIndex: i + 1,
          servings: householdServings,
          estimatedCost: cs[i] ?? 0,
          cooked: false,
          liked: false,
          keepNextWeek: false,
        });
      }
      track("week_planned");
    } finally {
      setPlanning(false);
    }
  }

  const left = round2(budget - total);
  const over = left < 0;
  const pct = budget > 0 ? Math.min(1, total / budget) : 0;
  const shownServings = dinners[0]?.servings ?? householdServings;

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{
              ...base,
              fontSize: theme.font.size.display,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Week
          </Text>
          <Text
            style={{
              ...base,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              letterSpacing: 1,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatLongDate(weekStart).toUpperCase()} · FOR {shownServings}
          </Text>
        </View>
        {dinners.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share this week"
            hitSlop={4}
            disabled={sharing}
            onPress={shareWeek}
            style={({ pressed }) => iconButton(pressed)}
          >
            <Ionicons name="share-social-outline" size={26} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={4}
          onPress={() => router.push("/settings")}
          style={({ pressed }) => iconButton(pressed)}
        >
          <Ionicons name="settings-outline" size={26} color={theme.colors.text} />
        </Pressable>
      </View>

      {loading ? <LoadingState label="Loading your week" /> : null}

      {!loading && dinners.length === 0 ? (
        hasOlderWeeks && !isPremium ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Your free week is done"
            body="Keep cooking for four more planned weeks, with leftovers from this week's packs built into the next plan."
            actionLabel="See the four-week pass"
            onAction={openPaywall}
          />
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No dinners planned for this week"
            body={`Five dinners for ${householdServings}, priced by full packs against your ${formatPrice(budget)} budget.`}
            actionLabel={planning ? "Planning…" : "Plan this week"}
            onAction={planning ? undefined : planWeek}
          />
        )
      ) : null}

      {!loading && dinners.length > 0 ? (
        <>
          <View>
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
                <Text
                  style={{
                    ...base,
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    letterSpacing: 1,
                  }}
                >
                  THIS WEEK'S BASKET
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: theme.spacing.sm,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-end", flexShrink: 1, gap: theme.spacing.sm }}>
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
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: theme.colors.text,
                          marginTop: -2,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        ...base,
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.body,
                        paddingBottom: 4,
                        flexShrink: 1,
                      }}
                    >
                      of {formatPrice(budget)} budget
                    </Text>
                  </View>
                  <View
                    style={{
                      borderColor: over ? theme.colors.danger : theme.colors.accent,
                      borderWidth: 1.5,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        ...base,
                        color: over ? theme.colors.danger : theme.colors.accent,
                        fontWeight: theme.font.weight.medium,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {over ? `${formatPrice(-left)} over` : `${formatPrice(left)} left`}
                    </Text>
                  </View>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${Math.round(pct * 100)} percent of budget`}
                  style={{
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: theme.colors.surfaceAlt,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(pct * 100, 4)}%`,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: over ? theme.colors.danger : theme.colors.primary,
                      justifyContent: "center",
                      alignItems: "flex-end",
                      paddingRight: 6,
                    }}
                  >
                    {pct > 0.2 ? (
                      <Text
                        style={{
                          color: theme.colors.onPrimary,
                          fontSize: 10,
                          fontWeight: theme.font.weight.bold,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {Math.round(pct * 100)}%
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text
                  style={{
                    ...base,
                    fontSize: theme.font.size.caption + 1,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {dinners.length} dinners · full packs ·{" "}
                  {HOME_STORE.replace("–", "·").toUpperCase()}
                  {lastChecked ? ` · prices checked ${formatShortDate(lastChecked)}` : ""}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  <AiImage
                    name={carried.length ? "penny-half-full" : total <= budget ? "penny-happy" : "penny-neutral"}
                    style={{ width: 44, height: 44, resizeMode: "contain", backgroundColor: theme.colors.surface }}
                  />
                  <Text
                    style={{
                      ...base,
                      flex: 1,
                      fontSize: theme.font.size.body,
                      color: theme.colors.accent,
                    }}
                  >
                    {carried.length ? (
                      <>
                        <Text style={{ fontWeight: theme.font.weight.bold }}>Carried over: </Text>
                        {carriedText}
                      </>
                    ) : (
                      <Text style={{ color: theme.colors.textMuted }}>
                        Nothing carried over yet. What's left from this shop appears here.
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
              <View style={{ height: 7, backgroundColor: theme.colors.surface, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", position: "absolute", top: 2, left: -5 }}>
                  {Array.from({ length: 32 }).map((_, i) => (
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
          </View>

          {leftovers.length > 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.md,
                overflow: "hidden",
              }}
            >
              <Text
                style={{
                  ...base,
                  fontSize: theme.font.size.body + 2,
                  padding: theme.spacing.md,
                  paddingBottom: theme.spacing.sm,
                }}
              >
                <Text style={{ fontWeight: theme.font.weight.bold }}>Sunday check-in</Text> · Still
                in the cupboard?
              </Text>
              {leftovers.map((item) => {
                const pack = packByName(item.ingredient);
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderTopColor: theme.colors.border,
                      borderTopWidth: 1,
                    }}
                  >
                    <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body }}>
                      {item.ingredient} · {formatPantry(item)}
                      {pack ? ` of ${formatPackSize(pack)}` : ""}
                    </Text>
                    <CheckPill
                      label="Still there"
                      selected={item.confirmed}
                      check
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
          ) : null}

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
                hitSlop={10}
                onPress={() => setEditBudget((v) => !v)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    ...base,
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body + 1,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  Budget {formatPrice(budget)}
                </Text>
                <Ionicons
                  name={editBudget ? "chevron-down" : "chevron-forward"}
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
                <Text style={{ ...base, flex: 1, paddingLeft: theme.spacing.sm }}>
                  Dinner budget for the week
                </Text>
                <StepButton
                  icon="remove"
                  label="Lower budget by £1"
                  onPress={() => setAnswer("weeklybudget", `£${Math.max(5, budget - 1)}`)}
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
                  label="Raise budget by £1"
                  onPress={() => setAnswer("weeklybudget", `£${budget + 1}`)}
                />
              </View>
            ) : null}

            {dinners.map((d, i) => {
              const recipe = getRecipe(d.recipeId);
              if (!recipe) return null;
              return (
                <DinnerRow
                  key={d.id}
                  day={DAY_NAMES[d.dayIndex] ?? `D${d.dayIndex}`}
                  recipe={recipe}
                  servings={d.servings}
                  cost={costs[i] ?? d.estimatedCost}
                  note={leftoverNote(recipe, d.servings, pantry)}
                  cooked={d.cooked}
                  open={openSwap === d.id}
                  swap={swaps[d.id]}
                  candidates={openSwap === d.id ? candidates : []}
                  lockedCount={lockedCount}
                  onToggle={() => setOpenSwap(openSwap === d.id ? null : d.id)}
                  onPick={(id) => pickSwap(d, id)}
                  onUndo={() => undoSwap(d)}
                  onUnlock={openPaywall}
                />
              );
            })}
          </View>

          {isPremium ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                minHeight: 44,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
              <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body + 1 }}>
                Leftovers carry into next week
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See leftovers on the Cook tab"
                hitSlop={10}
                onPress={() => router.push("/cook")}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text
                  style={{
                    ...base,
                    color: theme.colors.primary,
                    textDecorationLine: "underline",
                    fontSize: theme.font.size.body + 1,
                  }}
                >
                  See leftovers
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unlock carrying leftovers into next week"
              onPress={openPaywall}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                minHeight: 44,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="lock-closed" size={20} color={theme.colors.warning} />
              <Text style={{ ...base, flex: 1, fontSize: theme.font.size.body + 1 }}>
                Carry leftovers into next week
              </Text>
              <Text
                style={{
                  ...base,
                  color: theme.colors.primary,
                  textDecorationLine: "underline",
                  fontSize: theme.font.size.body + 1,
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

  function CheckPill({
    label,
    selected,
    check,
    onPress,
  }: {
    label: string;
    selected: boolean;
    check?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
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
          borderWidth: 1,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          backgroundColor: selected && check ? theme.colors.surfaceAlt : theme.colors.surface,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            ...base,
            fontSize: theme.font.size.caption + 1,
            color: selected ? theme.colors.accent : theme.colors.textMuted,
            fontWeight: selected ? theme.font.weight.bold : theme.font.weight.regular,
          }}
        >
          {label}
        </Text>
        {selected && check ? (
          <Ionicons name="checkmark" size={14} color={theme.colors.accent} />
        ) : null}
      </Pressable>
    );
  }

  function StepButton({
    icon,
    label,
    onPress,
  }: {
    icon: "add" | "remove";
    label: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name={icon} size={22} color={theme.colors.text} />
      </Pressable>
    );
  }
}
