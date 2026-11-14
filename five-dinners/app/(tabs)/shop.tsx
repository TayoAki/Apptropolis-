import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AiImage } from "../../components/AiImage";
import { Button } from "../../components/Button";
import { EmptyState, LoadingState } from "../../components/EmptyState";
import { ShopRow } from "../../components/shop/Row";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import { usePurchases } from "../../data/purchases";
import {
  HOME_STORE,
  basketTotal,
  buildBasket,
  formatPackSize,
  formatPrice,
  formatPriceDiff,
  formatQty,
  formatShortDate,
  getRecipe,
  parseBudget,
  scaleQty,
  todayISO,
  weekStartOf,
  type BasketLine,
  type PantryItem,
  type PlanDinner,
  type PriceCheck,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const AISLES: { title: string; keys: string[] }[] = [
  {
    title: "Fresh produce",
    keys: ["onion", "garlic", "spinach", "peppers", "carrots", "potatoes", "sweetPotato", "broccoli", "courgette", "mushrooms", "ginger"],
  },
  { title: "Meat & fish", keys: ["chickenThigh", "chickenBreast", "mince", "sausages", "bacon", "salmon"] },
  { title: "Dairy & eggs", keys: ["eggs", "cheddar", "feta", "yoghurt"] },
  {
    title: "Tins & dry",
    keys: ["oil", "rice", "penne", "spaghetti", "tomatoes", "stock", "cumin", "paprika", "curry", "chickpeas", "kidneyBeans", "lentils", "coconut", "noodles", "soy", "pesto", "tuna"],
  },
  { title: "Frozen & bakery", keys: ["peas", "tortillas"] },
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
  const dinnersCol = useCollection<PlanDinner>("plan_dinners");
  const pantryCol = useCollection<PantryItem>("pantry_items");
  const checksCol = useCollection<PriceCheck>("price_checks");

  const [mode, setMode] = useState<"aisle" | "dinner">("aisle");
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [coveredOpen, setCoveredOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [receipt, setReceipt] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const initialised = useRef(false);

  const loading = dinnersCol.loading || pantryCol.loading || checksCol.loading;

  const weekStart = useMemo(() => {
    const current = weekStartOf();
    if (dinnersCol.items.some((d) => d.weekStart === current)) return current;
    const all = dinnersCol.items.map((d) => d.weekStart).sort();
    return all[all.length - 1] ?? current;
  }, [dinnersCol.items]);

  const dinners = useMemo(
    () =>
      dinnersCol.items
        .filter((d) => d.weekStart === weekStart)
        .sort((a, b) => a.dayIndex - b.dayIndex),
    [dinnersCol.items, weekStart],
  );

  const lines = useMemo(
    () =>
      buildBasket(
        dinners.map((d) => ({ recipeId: d.recipeId, servings: d.servings })),
        pantryCol.items,
      ),
    [dinners, pantryCol.items],
  );

  const weekChecks = useMemo(
    () => checksCol.items.filter((c) => c.weekStart === weekStart),
    [checksCol.items, weekStart],
  );

  function checkFor(line: BasketLine): PriceCheck | undefined {
    const matches = weekChecks.filter((c) => c.ingredient === line.pack.name);
    return matches.find((c) => c.store === HOME_STORE) ?? matches[0];
  }

  // Items already logged as paid start ticked, once the data has loaded.
  useEffect(() => {
    if (loading || initialised.current) return;
    initialised.current = true;
    const paidKeys = lines.filter((l) => l.packs > 0 && (checkFor(l)?.paidPrice ?? 0) > 0).map((l) => l.pack.key);
    if (paidKeys.length) setTicked(new Set(paidKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
  const budget = parseBudget(answers.weeklybudget ?? "");

  const latestCheck = weekChecks.map((c) => c.estimateDate).sort().pop() ?? "";
  const storeLine =
    HOME_STORE.replace(" – ", " · ").toUpperCase() +
    (latestCheck ? ` · PRICES CHECKED ${formatShortDate(latestCheck).toUpperCase()}` : "");

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function savePaid(line: BasketLine, amount: number) {
    setTicked((prev) => new Set(prev).add(line.pack.key));
    const existing = checkFor(line);
    if (existing) {
      await checksCol.update(existing.id, { paidPrice: amount, paidDate: todayISO() });
    } else {
      await checksCol.add({
        ingredient: line.pack.name,
        packSize: formatPackSize(line.pack),
        store: HOME_STORE,
        estimatedPrice: line.cost,
        estimateDate: todayISO(),
        paidPrice: amount,
        paidDate: todayISO(),
        weekStart,
      });
    }
  }

  function subtitleFor(line: BasketLine): string {
    const parts = [`buy ${line.packs} × ${formatPackSize(line.pack)}`, `uses ${formatQty(line.pack, line.needed)}`];
    if (line.inCupboard > 0) parts.push(`${formatQty(line.pack, Math.min(line.inCupboard, line.needed))} from cupboard`);
    if (line.leftover > 0) parts.push(`${formatQty(line.pack, line.leftover)} left`);
    return parts.join(" · ");
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
        const qty = formatQty(line.pack, scaleQty(line.pack, per, d.servings));
        data.push({
          key: `${d.id}-${key}`,
          line,
          subtitle: line.packs === 0 ? `uses ${qty} · already in the cupboard` : `uses ${qty} · pack bought for the week`,
        });
      }
      return [{ id: d.id, title: `${d.dayIndex}. ${recipe.name}`, data }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shoppable.length, dinners, lines]);

  const mono = Platform.select({ ios: "Menlo", default: "monospace" });

  if (loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
        <LoadingState label="Loading your list" />
      </View>
    );
  }

  if (dinners.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + theme.spacing.md, backgroundColor: theme.colors.background }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.display,
            fontWeight: theme.font.weight.bold,
            fontFamily: theme.font.family,
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          Shop
        </Text>
        <View style={{ alignItems: "center", marginTop: theme.spacing.lg }}>
          <AiImage name="penny-half-full" style={{ height: 140, width: 140, backgroundColor: undefined }} />
          <EmptyState
            icon="cart-outline"
            title="No list until there's a plan"
            body="Pick this Sunday's five dinners and the full-pack shopping list, priced at your home store, appears here."
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

  const header = (
    <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.display,
            fontWeight: theme.font.weight.bold,
            fontFamily: theme.font.family,
          }}
        >
          Shop
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            letterSpacing: 0.6,
            fontFamily: mono,
          }}
        >
          {storeLine}
        </Text>
      </View>

      <View
        style={{
          marginHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          shadowColor: theme.colors.text,
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body + 2, fontFamily: theme.font.family }}>
              Estimate
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.display,
                  fontWeight: theme.font.weight.bold,
                  fontFamily: theme.font.family,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatPrice(estimate)}
              </Text>
              <View style={{ height: 2, backgroundColor: theme.colors.text, marginTop: -4, borderRadius: 1 }} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body + 2, fontFamily: theme.font.family }}>
              {receipt !== null ? "Receipt total" : "Paid so far"}
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
                fontFamily: theme.font.family,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatPrice(paidSoFar)}
            </Text>
          </View>
        </View>

        <View
          accessibilityLabel={`${tickedLines.length} of ${shoppable.length} ticked`}
          style={{
            height: 26,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceAlt,
            overflow: "hidden",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
            }}
          />
          <Text
            style={{
              alignSelf: "flex-end",
              marginRight: theme.spacing.md,
              color: pct > 0.85 ? theme.colors.onPrimary : theme.colors.text,
              fontSize: theme.font.size.caption + 1,
              fontFamily: theme.font.family,
              fontVariant: ["tabular-nums"],
            }}
          >
            {tickedLines.length} of {shoppable.length} ticked
          </Text>
        </View>

        {paidSoFar > 0 && (receipt !== null || tickedLines.length > 0) ? (
          <Text
            style={{
              color: difference > 0 ? theme.colors.danger : theme.colors.textMuted,
              fontSize: theme.font.size.caption + 1,
              fontFamily: theme.font.family,
              fontVariant: ["tabular-nums"],
            }}
          >
            {difference === 0
              ? receipt !== null
                ? "Exactly on the estimate."
                : "Ticked items are exactly on the estimate."
              : `${formatPriceDiff(difference)} against the estimate${receipt !== null ? "" : " on ticked items"}.`}
            {budget > 0 && estimate > budget ? ` Estimate is over your ${formatPrice(budget)} budget.` : ""}
          </Text>
        ) : budget > 0 ? (
          <Text
            style={{
              color: estimate > budget ? theme.colors.danger : theme.colors.textMuted,
              fontSize: theme.font.size.caption + 1,
              fontFamily: theme.font.family,
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
          marginHorizontal: theme.spacing.lg,
          padding: 3,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.textMuted,
        }}
      >
        {(
          [
            ["aisle", "By aisle"],
            ["dinner", "By dinner"],
          ] as const
        ).map(([value, label]) => {
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
                borderRadius: theme.radius.pill,
                backgroundColor: on ? theme.colors.surface : "transparent",
                borderWidth: on ? 1 : 0,
                borderColor: theme.colors.text,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  color: on ? theme.colors.text : theme.colors.surface,
                  fontSize: theme.font.size.body + 1,
                  fontWeight: on ? theme.font.weight.bold : theme.font.weight.regular,
                  fontFamily: theme.font.family,
                }}
              >
                {label}
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
            onPress={() => setCoveredOpen((o) => !o)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              minHeight: 44,
              paddingHorizontal: theme.spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body + 2,
                fontFamily: theme.font.family,
              }}
            >
              {coveredSummary}
            </Text>
            <Ionicons name={coveredOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
          </Pressable>
          {coveredOpen ? (
            <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xs }}>
              {covered.map((l) => (
                <Text
                  key={l.pack.key}
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontFamily: theme.font.family,
                  }}
                >
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
        <View style={{ alignItems: "center", gap: theme.spacing.xs, paddingHorizontal: theme.spacing.lg }}>
          <AiImage name="penny-happy" style={{ height: 96, width: 96, backgroundColor: undefined }} />
          <Text
            style={{
              color: theme.colors.text,
              textAlign: "center",
              fontSize: theme.font.size.body,
              fontFamily: theme.font.family,
            }}
          >
            Whole list ticked. Log the receipt, then Cook shows what's left in each pack.
          </Text>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
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
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                fontFamily: theme.font.family,
              }}
            >
              Total on your receipt
            </Text>
            <TextInput
              value={receiptText}
              onChangeText={setReceiptText}
              keyboardType="decimal-pad"
              placeholder={formatPrice(estimate)}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Receipt total in pounds"
              style={{
                height: 48,
                paddingHorizontal: theme.spacing.md,
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontFamily: theme.font.family,
                fontVariant: ["tabular-nums"],
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.background,
              }}
            />
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <Button
                label="Save total"
                style={{ flex: 1 }}
                onPress={() => {
                  const n = parseFloat(receiptText.replace(/[^0-9.]/g, ""));
                  if (Number.isFinite(n) && n > 0) {
                    setReceipt(Math.round(n * 100) / 100);
                    setReceiptOpen(false);
                  }
                }}
              />
              <Button
                label={receipt !== null ? "Clear" : "Cancel"}
                variant="secondary"
                onPress={() => {
                  if (receipt !== null) {
                    setReceipt(null);
                    setReceiptText("");
                  }
                  setReceiptOpen(false);
                }}
              />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setReceiptText(receipt !== null ? receipt.toFixed(2) : "");
              setReceiptOpen(true);
            }}
            style={({ pressed }) => ({
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.md,
              borderWidth: 1.5,
              borderColor: theme.colors.text,
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body + 1,
                fontFamily: theme.font.family,
              }}
            >
              {receipt !== null ? `Receipt ${formatPrice(receipt)} · change` : "Enter receipt total instead"}
            </Text>
          </Pressable>
        )}
      </View>

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPremium ? "Price history across shops" : "Price history across shops, locked. Unlock"}
          onPress={() => (isPremium ? setHistoryOpen((o) => !o) : openPaywall())}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            minHeight: 52,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: theme.colors.surfaceAlt,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons
            name={isPremium ? "time-outline" : "lock-closed"}
            size={18}
            color={theme.colors.text}
          />
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.body + 1,
              fontFamily: theme.font.family,
            }}
          >
            Price history across shops
          </Text>
          {isPremium ? (
            <Ionicons name={historyOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
          ) : (
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.body + 2,
                fontWeight: theme.font.weight.medium,
                fontFamily: theme.font.family,
              }}
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
                padding: theme.spacing.lg,
              }}
            >
              Nothing logged yet. Enter what you paid for an item and it appears here, by store and date.
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
                    paddingHorizontal: theme.spacing.lg,
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
                        fontSize: theme.font.size.caption,
                        fontFamily: theme.font.family,
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
                    <Text style={{ color: d > 0 ? theme.colors.danger : theme.colors.textMuted }}>
                      {`  ${d === 0 ? "±£0.00" : formatPriceDiff(d)}`}
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
        contentContainerStyle={{ paddingTop: insets.top + theme.spacing.md }}
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
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontSize: theme.font.size.body + 2,
                  fontFamily: theme.font.family,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {section.title} · {done} of {keys.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Tick everything in ${section.title}`}
                hitSlop={8}
                onPress={() =>
                  setTicked((prev) => {
                    const next = new Set(prev);
                    tickable.forEach((i) => next.add(i.line.pack.key));
                    return next;
                  })
                }
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="checkmark-done-outline" size={20} color={theme.colors.text} />
              </Pressable>
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
              ticked={covers ? true : ticked.has(line.pack.key)}
              onToggle={() => (covers ? undefined : toggle(line.pack.key))}
              showPrice={mode === "aisle" && !covers}
              estimate={line.cost}
              dateLabel={check ? formatShortDate(check.estimateDate).toUpperCase() : ""}
              paid={check?.paidPrice ?? 0}
              onPaid={(n) => void savePaid(line, n)}
            />
          );
        }}
      />
    </View>
  );
}
