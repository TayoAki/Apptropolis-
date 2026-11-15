import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, SectionList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Penny } from "../../components/Penny";
import { Button } from "../../components/Button";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { Meter } from "../../components/Meter";
import { ScreenHeader } from "../../components/ScreenHeader";
import { ShopRow } from "../../components/shop/Row";
import { useAppState } from "../../data/app-state";
import { savePaidPrice, setReceipt as saveReceipt, setTicked as saveTicked, usePlanData } from "../../data/plan";
import { useCollection } from "../../data/repo";
import { usePurchases } from "../../data/purchases";
import {
  PRICE_SOURCE,
  PRICE_SOURCE_LINE,
  basketTotal,
  formatPackSize,
  formatPrice,
  formatPriceDiff,
  formatQty,
  formatRecipeQty,
  formatShortDate,
  getRecipe,
  readHousehold,
  weekRange,
  type BasketLine,
  type PriceCheck,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const AISLES: { title: string; keys: string[] }[] = [
  {
    title: "Produce",
    keys: ["onion", "garlic", "spinach", "peppers", "carrots", "potatoes", "sweetPotato", "zucchini", "mushrooms", "ginger"],
  },
  { title: "Meat & seafood", keys: ["chickenThigh", "chickenBreast", "beef", "sausage", "bacon"] },
  { title: "Dairy & eggs", keys: ["eggs", "cheddar", "feta", "yogurt"] },
  {
    title: "Pantry",
    keys: ["oil", "rice", "penne", "spaghetti", "tomatoes", "stock", "cumin", "paprika", "curry", "chickpeas", "kidneyBeans", "lentils", "coconut", "soy", "pesto", "tuna"],
  },
  { title: "Frozen & bakery", keys: ["peas", "broccoli", "salmon", "tortillas"] },
];

interface Item {
  key: string;
  line: BasketLine;
  subtitle: string;
}
interface Section {
  id: string;
  title: string;
  data: Item[];
}

export default function ShopScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const { plan, dinners, lines, loading: planLoading } = usePlanData();
  const checksCol = useCollection<PriceCheck>("price_checks");

  const [mode, setMode] = useState<"aisle" | "dinner">("aisle");
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [coveredOpen, setCoveredOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Ticks show at once and are saved in order; each save carries the whole set.
  const tickedRef = useRef<Set<string>>(new Set());
  const loadedFor = useRef<string | null>(null);

  const loading = planLoading || checksCol.loading;
  const planId = plan?.id ?? "";
  const receipt = plan && plan.receipt > 0 ? plan.receipt : null;

  // This plan's ticks, as saved. Another week's list starts unticked.
  useEffect(() => {
    if (loading || !plan || loadedFor.current === plan.id) return;
    loadedFor.current = plan.id;
    const saved = new Set(plan.ticked ?? []);
    tickedRef.current = saved;
    setTicked(saved);
  }, [loading, plan]);

  const weekChecks = useMemo(
    () => checksCol.items.filter((c) => c.planId === planId),
    [checksCol.items, planId],
  );

  function checkFor(line: BasketLine): PriceCheck | undefined {
    return weekChecks.find((c) => c.packKey === line.pack.key);
  }

  const shoppable = lines.filter((l) => l.packs > 0);
  const covered = lines.filter((l) => l.packs === 0);
  const tickedLines = shoppable.filter((l) => ticked.has(l.pack.key));
  const estimate = basketTotal(lines);
  const tickedEstimate = tickedLines.reduce((s, l) => s + l.cost, 0);
  const paidFromItems = tickedLines.reduce((s, l) => {
    const p = checkFor(l)?.paidPrice ?? 0;
    return s + (p > 0 ? p : l.cost);
  }, 0);
  const paidSoFar = receipt !== null ? receipt : paidFromItems;
  const compareTo = receipt !== null ? estimate : tickedEstimate;
  const difference = Math.round((paidSoFar - compareTo) * 100) / 100;
  const pct = shoppable.length ? tickedLines.length / shoppable.length : 0;
  const allTicked = shoppable.length > 0 && tickedLines.length === shoppable.length;
  const budget = readHousehold(answers).budget;

  const storeLine = `Aldi · ZIP ${PRICE_SOURCE.zip} · prices ${formatShortDate(PRICE_SOURCE.checked)}`;

  function commitTicks(next: Set<string>) {
    tickedRef.current = next;
    setTicked(next);
    if (planId) void saveTicked(planId, [...next]);
  }

  function toggle(key: string) {
    const next = new Set(tickedRef.current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    commitTicks(next);
  }

  async function savePaid(line: BasketLine, amount: number) {
    if (!plan) return;
    const next = new Set(tickedRef.current).add(line.pack.key);
    tickedRef.current = next;
    setTicked(next);
    await savePaidPrice(plan, line, amount);
  }

  function subtitleFor(line: BasketLine): string {
    const parts = [`Buy ${line.packs} × ${formatPackSize(line.pack)}`, `uses ${formatQty(line.pack, line.needed)}`];
    if (line.inCupboard > 0) parts.push(`${formatQty(line.pack, Math.min(line.inCupboard, line.needed))} from cupboard`);
    if (line.leftover > 0) parts.push(`${formatQty(line.pack, line.leftover)} left`);
    // Each part stays whole when the line wraps: only the " · " between parts can break.
    return parts.map((part) => part.replace(/ /g, "\u00A0")).join(" · ");
  }

  const sections: Section[] = useMemo(() => {
    if (mode === "aisle") {
      const out: Section[] = [];
      const placed = new Set<string>();
      for (const aisle of AISLES) {
        const data = shoppable
          .filter((l) => aisle.keys.includes(l.pack.key))
          .map((l) => {
            placed.add(l.pack.key);
            return { key: l.pack.key, line: l, subtitle: subtitleFor(l) };
          });
        if (data.length) out.push({ id: aisle.title, title: aisle.title, data });
      }
      const rest = shoppable
        .filter((l) => !placed.has(l.pack.key))
        .map((l) => ({ key: l.pack.key, line: l, subtitle: subtitleFor(l) }));
      if (rest.length) out.push({ id: "other", title: "Everything else", data: rest });
      return out;
    }
    return dinners.flatMap((d) => {
      const recipe = getRecipe(d.recipeId);
      if (!recipe) return [];
      const data: Item[] = [];
      for (const [key, per] of recipe.ingredients) {
        const line = lines.find((l) => l.pack.key === key);
        if (!line) continue;
        const qty = formatRecipeQty(line.pack, per, d.servings);
        data.push({
          key: `${d.id}-${key}`,
          line,
          subtitle: line.packs === 0 ? `Uses ${qty} · already in the cupboard` : `Uses ${qty} · pack bought for the week`,
        });
      }
      return [{ id: d.id, title: `${d.dayIndex}. ${recipe.name}`, data }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shoppable.length, dinners, lines]);

  const screenPad = {
    paddingTop: insets.top + theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, ...screenPad }}>
        <ScreenHeader title="Shop" />
        <LoadingState label="Loading your list" />
      </View>
    );
  }

  if (!plan || dinners.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, ...screenPad }}>
        <ScreenHeader title="Shop" />
        <View style={{ alignItems: "center", marginTop: theme.spacing.lg }}>
          <Penny mood="half-full" width={120} />
          <EmptyState
            icon={null}
            title="No list until there's a plan"
            body="Plan your five dinners on the Week tab and the full-pack shopping list, priced at Aldi, appears here."
            actionLabel="Plan the week"
            onAction={() => router.push("/")}
          />
        </View>
      </View>
    );
  }

  const coveredStaples = covered.filter((l) => l.pack.staple).length;
  const coveredOthers = covered.filter((l) => !l.pack.staple);
  const coveredSummary =
    [
      coveredStaples > 0 ? `${coveredStaples} ${coveredStaples === 1 ? "staple" : "staples"}` : "",
      ...coveredOthers.map((l) => `${formatQty(l.pack, l.needed)} ${l.pack.name.toLowerCase()}`),
    ]
      .filter(Boolean)
      .join(" + ") + " · not on this list";

  const historyRows = checksCol.items
    .filter((c) => c.paidPrice > 0)
    .sort((a, b) => b.paidDate.localeCompare(a.paidDate));

  const label = {
    color: theme.colors.text,
    fontSize: theme.font.size.body,
    fontFamily: theme.font.family,
  } as const;

  const header = (
    <View
      style={{
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
      }}
    >
      <ScreenHeader title="Shop" subtitle={`${weekRange(plan.weekStart)} · ${storeLine}`} />

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm + 4,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={label}>Estimate</Text>
            <View style={{ alignSelf: "flex-start" }}>
              <Text
                style={{
                  ...label,
                  fontSize: theme.font.size.display,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatPrice(estimate)}
              </Text>
              <View
                style={{ height: 2, backgroundColor: theme.colors.text, marginTop: -2, borderRadius: 1 }}
              />
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={label}>{receipt !== null ? "Receipt total" : "Paid so far"}</Text>
            <Text
              style={{
                ...label,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatPrice(paidSoFar)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Meter
              value={pct}
              accessibilityLabel={`${tickedLines.length} of ${shoppable.length} ticked`}
            />
          </View>
          <Text
            style={{
              ...label,
              fontSize: theme.font.size.caption + 1,
              fontWeight: theme.font.weight.medium,
              fontVariant: ["tabular-nums"],
            }}
          >
            {tickedLines.length} of {shoppable.length} ticked
          </Text>
        </View>

        {paidSoFar > 0 && (receipt !== null || tickedLines.length > 0) ? (
          <Text
            style={{
              ...label,
              color: difference > 0 ? theme.colors.warning : theme.colors.textMuted,
              fontSize: theme.font.size.caption + 1,
              fontVariant: ["tabular-nums"],
            }}
          >
            {difference === 0
              ? receipt !== null
                ? "Exactly on the estimate."
                : "Ticked items are exactly on the estimate."
              : `${formatPriceDiff(difference)} against the estimate${receipt !== null ? "" : " on ticked items"}.`}
            {budget > 0 && estimate > budget ? (
              <Text style={{ color: theme.colors.danger }}>
                {` Estimate is over your ${formatPrice(budget)} budget.`}
              </Text>
            ) : null}
          </Text>
        ) : budget > 0 ? (
          <Text
            style={{
              ...label,
              color: estimate > budget ? theme.colors.danger : theme.colors.textMuted,
              fontSize: theme.font.size.caption + 1,
              fontVariant: ["tabular-nums"],
            }}
          >
            {estimate > budget
              ? `${formatPrice(estimate - budget)} over your ${formatPrice(budget)} budget`
              : `${formatPrice(budget - estimate)} under your ${formatPrice(budget)} budget`}
          </Text>
        ) : null}
      </View>

      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          padding: 3,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        {(
          [
            ["aisle", "By aisle"],
            ["dinner", "By dinner"],
          ] as const
        ).map(([value, text]) => {
          const on = mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.md - 3,
                borderWidth: 1,
                borderColor: on ? theme.colors.textMuted : "transparent",
                backgroundColor: on ? theme.colors.surfaceAlt : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  ...label,
                  color: on ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: on ? theme.font.weight.bold : theme.font.weight.regular,
                }}
              >
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {covered.length > 0 ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${coveredSummary}. ${coveredOpen ? "Hide" : "Show"} details`}
            accessibilityState={{ expanded: coveredOpen }}
            onPress={() => setCoveredOpen((o) => !o)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              minHeight: 44,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ ...label, flex: 1, color: theme.colors.textMuted }}>{coveredSummary}</Text>
            <Ionicons
              name={coveredOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
          {coveredOpen ? (
            <View style={{ gap: theme.spacing.xs, paddingBottom: theme.spacing.sm }}>
              {covered.map((l) => (
                <Text key={l.pack.key} style={label}>
                  {l.pack.name}
                  <Text style={{ color: theme.colors.textMuted }}>
                    {` · need ${formatQty(l.pack, l.needed)}, ${formatQty(l.pack, l.leftover)} will be left`}
                  </Text>
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
      {allTicked ? (
        <View style={{ alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md }}>
          <Penny mood="happy" width={96} />
          <Text style={{ ...label, textAlign: "center" }}>
            Whole list ticked. Log the receipt, then Cook shows what's left of each pack.
          </Text>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
        {receiptOpen ? (
          <View
            style={{
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text style={{ ...label, fontWeight: theme.font.weight.bold }}>Total on your receipt</Text>
            <TextInput
              value={receiptText}
              onChangeText={setReceiptText}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder={formatPrice(estimate)}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Receipt total in dollars"
              style={{
                height: 48,
                paddingHorizontal: theme.spacing.md,
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontFamily: theme.font.family,
                fontVariant: ["tabular-nums"],
                borderWidth: 1,
                borderColor: theme.colors.textMuted,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
              }}
            />
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <Button
                label="Save total"
                style={{ flex: 1 }}
                onPress={() => {
                  const n = parseFloat(receiptText.replace(/[^0-9.]/g, ""));
                  if (Number.isFinite(n) && n > 0) {
                    void saveReceipt(plan.id, Math.round(n * 100) / 100);
                    setReceiptOpen(false);
                  }
                }}
              />
              <Button
                label={receipt !== null ? "Clear" : "Cancel"}
                variant="outline"
                onPress={() => {
                  if (receipt !== null) {
                    void saveReceipt(plan.id, 0);
                    setReceiptText("");
                  }
                  setReceiptOpen(false);
                }}
              />
            </View>
          </View>
        ) : (
          <Button
            variant="outline"
            label={
              receipt !== null
                ? `Receipt ${formatPrice(receipt)} · change`
                : "Enter receipt total instead"
            }
            onPress={() => {
              setReceiptText(receipt !== null ? receipt.toFixed(2) : "");
              setReceiptOpen(true);
            }}
          />
        )}
      </View>

      <Text
        style={{
          ...label,
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 1,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        {PRICE_SOURCE_LINE} Meat and zucchini are sold by weight, so their prices are
        aldi.us estimates.
      </Text>

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPremium ? "Price history" : "Price history, locked. Unlock"}
          onPress={() => (isPremium ? setHistoryOpen((o) => !o) : openPaywall())}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            minHeight: 52,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.surfaceAlt,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons
            name={isPremium ? "time-outline" : "lock-closed"}
            size={18}
            color={isPremium ? theme.colors.text : theme.colors.textMuted}
          />
          <Text style={{ ...label, flex: 1 }}>Price history</Text>
          {isPremium ? (
            <Ionicons name={historyOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
          ) : (
            <Text
              style={{ ...label, color: theme.colors.primary, fontWeight: theme.font.weight.medium }}
            >
              Unlock
            </Text>
          )}
        </Pressable>
        {isPremium && historyOpen ? (
          historyRows.length === 0 ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontFamily: theme.font.family,
                padding: theme.spacing.md,
              }}
            >
              Nothing logged yet. Enter what you paid for an item and it appears here, by date.
            </Text>
          ) : (
            historyRows.map((c) => {
              const d = Math.round((c.paidPrice - c.estimatedPrice) * 100) / 100;
              return (
                <View
                  key={c.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                        fontFamily: theme.font.family,
                      }}
                    >
                      {c.ingredient}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption + 1,
                        fontFamily: theme.font.family,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {c.store} · {formatShortDate(c.paidDate)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontFamily: theme.font.family,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatPrice(c.paidPrice)}
                    <Text
                      style={{
                        color:
                          d > 0
                            ? theme.colors.warning
                            : d < 0
                              ? theme.colors.success
                              : theme.colors.textMuted,
                      }}
                    >
                      {`  ${d === 0 ? "±$0.00" : formatPriceDiff(d)}`}
                    </Text>
                  </Text>
                </View>
              );
            })
          )
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled={false}
        // A week's list is short (about 25 rows): render it all, so nothing pops in on scroll.
        initialNumToRender={60}
        // Keeps the "what you paid" boxes and the receipt total above the keyboard.
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.sm,
          // On a wide screen the list stays a readable column.
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderSectionHeader={({ section }) => {
          const keys = section.data.filter((i) => i.line.packs > 0 || mode === "dinner");
          const done = keys.filter((i) => ticked.has(i.line.pack.key) || i.line.packs === 0).length;
          const tickable = section.data.filter((i) => i.line.packs > 0);
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 44,
                paddingLeft: theme.spacing.md,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  ...label,
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  fontWeight: theme.font.weight.medium,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {section.title}
                <Text style={{ fontWeight: theme.font.weight.regular }}>
                  {` · ${done} of ${keys.length}`}
                </Text>
              </Text>
              {tickable.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tick everything in ${section.title}`}
                  onPress={() => {
                    const next = new Set(tickedRef.current);
                    tickable.forEach((i) => next.add(i.line.pack.key));
                    commitTicks(next);
                  }}
                  style={({ pressed }) => ({
                    width: 52,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons name="checkmark-done-outline" size={22} color={theme.colors.text} />
                </Pressable>
              ) : null}
            </View>
          );
        }}
        renderItem={({ item }) => {
          const line = item.line;
          const check = checkFor(line);
          const covers = line.packs === 0;
          return (
            <ShopRow
              name={line.pack.name}
              subtitle={item.subtitle}
              ticked={ticked.has(line.pack.key)}
              covered={covers}
              onToggle={() => toggle(line.pack.key)}
              showPrice={mode === "aisle" && !covers}
              estimate={line.cost}
              dateLabel={formatShortDate(check?.estimateDate || PRICE_SOURCE.checked)}
              paid={check?.paidPrice ?? 0}
              onPaid={(n) => void savePaid(line, n)}
            />
          );
        }}
      />
    </View>
  );
}
