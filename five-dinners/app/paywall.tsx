import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { Button } from "../components/Button";
import { LoadingState } from "../components/EmptyState";
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

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function weekRange(start: string): string {
  const a = parseISODate(start);
  const b = parseISODate(addDays(start, 6));
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }
  return `${formatShortDate(start)} – ${formatShortDate(addDays(start, 6))}`.toUpperCase();
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
  const budget = parseBudget(answers.budget ?? "");
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
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <View
          style={{
            transform: [{ rotate: "-1.5deg" }],
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            marginRight: theme.spacing.xl,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Ionicons
              name="checkmark"
              size={28}
              color={under ? theme.colors.success : theme.colors.warning}
            />
            <View>
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: SERIF,
                  fontSize: theme.font.size.headline,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatPrice(total)} of {formatPrice(budget)}
              </Text>
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: theme.colors.accent,
                  marginTop: 2,
                }}
              />
            </View>
          </View>
          <Text style={{ ...muted, textAlign: "center", marginTop: theme.spacing.xs }}>
            {dinners.length} dinners
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: theme.spacing.sm,
            }}
          >
            {dinners.slice(0, 5).map((d) => {
              const name = getRecipe(d.recipeId)?.name ?? "home cooked dinner";
              return (
                <AiImage
                  key={d.id}
                  prompt={`overhead watercolor of a plate of ${name}`}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                />
              );
            })}
          </View>
          <Text
            style={{
              ...muted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
              marginTop: theme.spacing.sm,
            }}
          >
            {carried.length > 0
              ? `Carried over: ${carried.join(", ")}`
              : "Nothing carried over yet. Cook this week and it appears here."}
          </Text>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -7,
              height: 14,
              flexDirection: "row",
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 40 }).map((_, i) => (
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
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: 0, top: -theme.spacing.md, alignItems: "center" }}
        >
          <AiImage
            name={first ? "penny-half-full" : "penny-happy"}
            style={{ width: 92, height: 92, backgroundColor: undefined, resizeMode: "contain" }}
          />
          {first ? (
            <View
              style={{
                transform: [{ rotate: "6deg" }],
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                marginTop: -theme.spacing.xs,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: SERIF,
                  fontWeight: theme.font.weight.bold,
                  fontSize: theme.font.size.body,
                  textAlign: "center",
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
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.text,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text
              style={{
                color: theme.colors.background,
                fontFamily: MONO,
                fontSize: theme.font.size.caption,
                letterSpacing: 1,
              }}
            >
              YOUR FREE WEEK · {weekRange(week)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismissPaywall}
            hitSlop={12}
            style={({ pressed }) => ({
              position: "absolute",
              right: -theme.spacing.sm,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </Pressable>
        </View>

        {renderReceipt()}

        <View style={{ alignItems: "center", marginTop: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: SERIF,
              fontSize: theme.font.size.display,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {isPremium ? "You're all set" : "Keep cooking"}
          </Text>
          <Text
            style={{
              ...muted,
              fontSize: theme.font.size.title - 2,
              textAlign: "center",
              marginTop: theme.spacing.xs,
            }}
          >
            {isPremium
              ? `Premium is on${activeOffer ? `: ${activeOffer.label}` : ""}. Your weeks and cupboard are unlocked.`
              : "Four more weeks of planned dinners. Pay once, no subscription."}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.md }}>
          {premiumFeatures.map((feature, i) => {
            const { title, body } = splitFeature(feature);
            return (
              <View
                key={feature}
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontFamily: SERIF,
                      fontSize: theme.font.size.body + 2,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {title}
                  </Text>
                  {body ? (
                    <Text style={{ ...muted, fontSize: theme.font.size.body - 1 }}>{body}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {isPremium ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button label="Back to my week" onPress={dismissPaywall} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
              {offers.map((offer) => {
                const active = offer.id === selected?.id;
                const oneOff = isOneOff(offer);
                return (
                  <Pressable
                    key={offer.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${offer.label}, ${offer.price}${oneOff ? ", one-off payment" : `, per ${offer.period}`}`}
                    onPress={() => setSelectedId(offer.id)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        borderWidth: 2,
                        borderStyle: "dashed",
                        borderRadius: theme.radius.md,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontFamily: SERIF,
                          fontSize: theme.font.size.headline,
                          fontWeight: theme.font.weight.bold,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {offer.price}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={text}>
                        {oneOff ? "one-off · four weeks" : `per ${offer.period}`}
                      </Text>
                      {offer.trialDays > 0 ? (
                        <Text style={{ ...muted, fontSize: theme.font.size.caption }}>
                          {offer.trialDays}-day free trial
                        </Text>
                      ) : null}
                    </View>
                    {offer.badge ? (
                      <View
                        style={{
                          backgroundColor: theme.colors.accent,
                          borderRadius: theme.radius.sm,
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: theme.spacing.xs,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.onPrimary,
                            fontSize: theme.font.size.caption,
                            fontWeight: theme.font.weight.bold,
                            letterSpacing: 0.5,
                          }}
                        >
                          {offer.badge.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
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
                style={{ borderRadius: theme.radius.md }}
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

            <Text
              style={{
                ...muted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
                marginTop: theme.spacing.sm,
              }}
            >
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
              accessibilityLabel="Restore Purchases"
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
              <Text style={{ ...text, textDecorationLine: "underline" }}>
                {restoring ? "Restoring…" : "Restore Purchases"}
              </Text>
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
              <Text style={{ ...text, textDecorationLine: "underline" }}>Terms of Use</Text>
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
              <Text style={{ ...text, textDecorationLine: "underline" }}>Privacy Policy</Text>
            </Pressable>
          ) : null}
        </View>

        {testMode ? (
          <Text
            style={{
              ...muted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
              marginTop: theme.spacing.xs,
            }}
          >
            Test mode: purchases are simulated, nothing is charged.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
