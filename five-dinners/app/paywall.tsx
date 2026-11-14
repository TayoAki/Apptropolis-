import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { LoadingState } from "../components/EmptyState";
import { Penny } from "../components/Penny";
import { RecipePlate } from "../components/RecipePlate";
import { useAppState } from "../data/app-state";
import { appInfo } from "../data/app-info";
import { usePurchases, type Offer } from "../data/purchases";
import { useCollection } from "../data/repo";
import {
  addDays,
  formatPantry,
  formatPrice,
  formatShortDate,
  getRecipe,
  parseBudget,
  parseISODate,
  round2,
  weekStartOf,
  type PantryItem,
  type PlanDinner,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

function weekRange(start: string): string {
  const end = addDays(start, 6);
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${formatShortDate(end)}`;
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function isOneOff(offer: Offer): boolean {
  return offer.period === "lifetime" || /one-?off|one-time/i.test(offer.label);
}

function splitFeature(text: string): { title: string; body: string } {
  const i = text.indexOf(": ");
  if (i > 0 && i < 50) return { title: text.slice(0, i), body: text.slice(i + 2) };
  return { title: text, body: "" };
}

export default function Paywall() {
  const theme = useTheme();
  const { answers } = useAppState();
  const {
    offers,
    defaultOfferId,
    premiumFeatures,
    isPremium,
    activeOffer,
    status,
    error,
    testMode,
    purchase,
    restorePurchases,
    dismissPaywall,
  } = usePurchases();
  const dinnersData = useCollection<PlanDinner>("plan_dinners");
  const pantryData = useCollection<PantryItem>("pantry_items");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  const week = weekStartOf();
  const dinners = dinnersData.items
    .filter((d) => d.weekStart === week)
    .sort((a, b) => a.dayIndex - b.dayIndex);
  const total = round2(dinners.reduce((sum, d) => sum + d.estimatedCost, 0));
  const budget = parseBudget(answers.weeklybudget ?? "");
  const leftovers = pantryData.items.filter((p) => !p.isStaple && p.quantity > 0);
  const cardLoading = dinnersData.loading || pantryData.loading;

  const effectiveId = selectedId ?? defaultOfferId;
  const selected = offers.find((o) => o.id === effectiveId) ?? offers[0];
  const busy = status === "purchasing";
  const restoring = status === "restoring";

  const text = {
    color: theme.colors.text,
    fontSize: theme.font.size.body,
    fontFamily: theme.font.family,
  } as const;
  const muted = { ...text, color: theme.colors.textMuted } as const;
  const small = {
    ...muted,
    fontSize: theme.font.size.caption + 1,
    fontVariant: ["tabular-nums" as const],
  };
  const link = { ...small, color: theme.colors.text, textDecorationLine: "underline" as const };

  async function onBuy() {
    if (!selected) return;
    setRestoredMessage(null);
    const ok = await purchase(selected.id);
    if (ok) dismissPaywall();
  }

  async function onRestore() {
    setRestoredMessage(null);
    const ok = await restorePurchases();
    if (ok) setRestoredMessage("Purchase restored. Your weeks are unlocked.");
  }

  const primaryLabel = !selected
    ? "Continue"
    : selected.trialDays > 0
      ? "Start free trial"
      : isOneOff(selected)
        ? `Unlock four weeks for ${selected.price}`
        : "Continue";

  const smallPrint = !selected
    ? ""
    : isOneOff(selected)
      ? `One-time purchase of ${selected.price}. No auto-renew. Your plans and cupboard stay saved either way.`
      : `Renews automatically at ${selected.price}/${selected.period} unless canceled at least 24 hours before the end of the period. Cancel anytime in your App Store or Google Play settings.`;

  function renderReceipt() {
    if (cardLoading) return <LoadingState label="Loading your week" />;
    if (dinners.length === 0) return null;
    const under = total <= budget;
    const first = leftovers[0];
    const carried = leftovers.slice(0, 2).map((p) => `${formatPantry(p)} ${p.ingredient.toLowerCase()}`);
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          // Tucks up beside the close button, which sits clear of the card in the top corner.
          marginTop: -theme.spacing.md,
          marginBottom: theme.spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            transform: [{ rotate: "-1.5deg" }],
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.sm,
            padding: theme.spacing.md,
            gap: theme.spacing.xs,
          }}
        >
          <Text style={small}>Your free week · {weekRange(week)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Ionicons
              name={under ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={under ? theme.colors.success : theme.colors.warning}
            />
            <View style={{ flexDirection: "row", alignItems: "flex-end", flexShrink: 1, gap: theme.spacing.xs + 2 }}>
              <View>
                <Text
                  style={{
                    ...text,
                    fontSize: theme.font.size.headline,
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
              <Text style={{ ...muted, paddingBottom: 3, fontVariant: ["tabular-nums"] }}>
                of {formatPrice(budget)}
              </Text>
            </View>
          </View>
          <Text style={small}>
            {dinners.length} dinners · {under ? "within budget" : "over budget"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: theme.spacing.sm,
              marginVertical: theme.spacing.xs,
            }}
          >
            {dinners.slice(0, 5).map((d) => {
              const recipe = getRecipe(d.recipeId);
              return (
                <RecipePlate
                  key={d.id}
                  prompt={`overhead watercolor of a plate of ${recipe?.name ?? "home cooked dinner"}`}
                  diet={recipe?.diet}
                  size={36}
                />
              );
            })}
          </View>
          <Text style={small}>
            {carried.length > 0
              ? `Carried over: ${carried.join(", ")}`
              : "Nothing carried over yet. Cook this week and it appears here."}
          </Text>
          {/* The torn receipt edge: a row of diamonds in the page color. */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -7,
              height: 14,
              flexDirection: "row",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 48 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    transform: [{ rotate: "45deg" }],
                    backgroundColor: theme.colors.background,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
        <View style={{ alignItems: "center", marginLeft: -theme.spacing.sm }}>
          <Penny mood={first ? "half-full" : "happy"} width={84} />
          {first ? (
            <View
              style={{
                transform: [{ rotate: "6deg" }],
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                marginTop: -theme.spacing.xs,
              }}
            >
              <Text
                style={{
                  ...text,
                  fontSize: theme.font.size.caption + 1,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatPantry(first)} left
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.lg,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "flex-end", marginRight: -theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismissPaywall}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="close" size={26} color={theme.colors.text} />
          </Pressable>
        </View>

        {renderReceipt()}

        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              ...text,
              fontSize: theme.font.size.display,
              fontWeight: theme.font.weight.bold,
              textAlign: "center",
            }}
          >
            {isPremium ? "You're all set" : "Keep cooking"}
          </Text>
          <Text
            style={{
              ...muted,
              fontSize: theme.font.size.body + 2,
              textAlign: "center",
              marginTop: theme.spacing.xs,
            }}
          >
            {isPremium
              ? `Premium is on${activeOffer ? `: ${activeOffer.label}` : ""}. Your weeks and cupboard are unlocked.`
              : "Four more weeks of planned dinners. Pay once, no subscription."}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.sm + 4 }}>
          {premiumFeatures.map((feature, i) => {
            const { title, body } = splitFeature(feature);
            return (
              <View
                key={feature}
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.sm + 4,
                  paddingVertical: theme.spacing.sm,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...text, fontWeight: theme.font.weight.bold }}>{title}</Text>
                  {body ? <Text style={small}>{body}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        {isPremium ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <Button label="Back to my week" onPress={dismissPaywall} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: theme.spacing.sm + 4, gap: theme.spacing.sm }}>
              {offers.map((offer) => {
                const active = offer.id === selected?.id;
                const oneOff = isOneOff(offer);
                return (
                  <Pressable
                    key={offer.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${offer.label}, ${offer.price}${oneOff ? ", one-off payment" : `, per ${offer.period}`}`}
                    onPress={() => setSelectedId(offer.id)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.md,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.textMuted,
                        borderWidth: active ? 2 : 1,
                        borderStyle: "dashed",
                        borderRadius: theme.radius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          ...text,
                          fontSize: theme.font.size.headline,
                          fontWeight: theme.font.weight.bold,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {offer.price}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-start", gap: theme.spacing.xs }}>
                      <Text style={text}>
                        {oneOff ? "One-off · four weeks" : `Per ${offer.period}`}
                      </Text>
                      {offer.trialDays > 0 ? (
                        <Text style={small}>{offer.trialDays}-day free trial</Text>
                      ) : null}
                      {offer.badge ? (
                        <View
                          style={{
                            backgroundColor: theme.colors.accent,
                            borderRadius: theme.radius.pill,
                            paddingHorizontal: theme.spacing.sm + 2,
                            paddingVertical: theme.spacing.xs,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.onPrimary,
                              fontFamily: theme.font.family,
                              fontSize: theme.font.size.caption,
                              fontWeight: theme.font.weight.bold,
                            }}
                          >
                            {offer.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                label={primaryLabel}
                onPress={onBuy}
                loading={busy}
                disabled={!selected || restoring}
              />
            </View>

            {error || restoredMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  ...text,
                  color: error ? theme.colors.danger : theme.colors.success,
                  textAlign: "center",
                  marginTop: theme.spacing.sm,
                }}
              >
                {error ?? restoredMessage}
              </Text>
            ) : null}

            <Text style={{ ...small, textAlign: "center", marginTop: theme.spacing.sm }}>
              {smallPrint}
            </Text>
          </>
        )}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            marginTop: theme.spacing.xs,
          }}
        >
          {isPremium ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
              onPress={onRestore}
              disabled={restoring || busy}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.sm,
                opacity: pressed || restoring ? 0.6 : 1,
              })}
            >
              <Text style={link}>{restoring ? "Restoring…" : "Restore purchases"}</Text>
            </Pressable>
          )}
          {appInfo.termsUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(appInfo.termsUrl)}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={link}>Terms of use</Text>
            </Pressable>
          ) : null}
          {appInfo.privacyUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(appInfo.privacyUrl)}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={link}>Privacy policy</Text>
            </Pressable>
          ) : null}
        </View>

        {testMode ? (
          <Text style={{ ...small, textAlign: "center", marginTop: theme.spacing.xs }}>
            Test mode: purchases are simulated, nothing is charged.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
