// The offer for Pip Plus. Everything someone needs to decide is on screen before the button:
// what stays free, what Plus adds, each plan's price and length, the trial and what it costs
// afterwards, that it renews and where to cancel. A subscriber sees their plan instead.
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lottie } from "../components/lottie";
import { OfferCard, periodText } from "../components/paywall/OfferCard";
import { haptic, PressScale, Skeleton } from "../components/motion";
import { Pip } from "../components/Pip";
import { Card } from "../components/settings/Controls";
import { EmptyState } from "../components/ui";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { usePurchases, type Offer } from "../data/purchases";
import { FREE_QUESTIONS_PER_DAY } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** What Plus adds. Each one is a feature the app has today (see data/monetization.ts). */
const PERKS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "chatbubbles-outline",
    title: "Ask Pip as much as you like",
    body: `Free answers ${FREE_QUESTIONS_PER_DAY} questions a day. Plus has no daily limit.`,
  },
  {
    icon: "camera-outline",
    title: "Ask with a photo",
    body: "Snap a product or its label. Pip names it, then looks for codes and deals for it.",
  },
];

const FREE_LINE = `Free, with no time limit: every code and deal in Pip's list, following stores, saving, and ${FREE_QUESTIONS_PER_DAY} questions to Pip a day.`;
const CANCEL_LINE = "Cancel any time in your App Store or Google Play subscription settings.";

/** The whole deal for a plan in plain sentences: trial, price after it, renewal. */
function termsOf(offer: Offer): string {
  if (offer.period === "lifetime") return `${offer.price} once. It does not renew.`;
  const price = `${offer.price} ${periodText(offer)}`;
  return offer.trialDays > 0
    ? `${offer.trialDays} days free, then ${price}. Renews automatically until canceled.`
    : `${price}, charged today. Renews automatically until canceled.`;
}

/** What pressing the button does, in the button's own words. */
function actionOf(offer: Offer): string {
  if (offer.period === "lifetime") return `Buy once for ${offer.price}`;
  return offer.trialDays > 0
    ? `Start ${offer.trialDays}-day free trial`
    : `Subscribe for ${offer.price} ${periodText(offer)}`;
}

/** A quiet text link for the footer row (restore, terms, privacy). */
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          textDecorationLine: "underline",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const {
    ready,
    isPremium,
    activeOffer,
    entitlement,
    offers,
    defaultOfferId,
    status,
    error,
    testMode,
    purchase,
    restorePurchases,
    dismissPaywall,
  } = usePurchases();

  // Opened without a source, this is the paywall the app shows once setup is finished.
  const from = typeof params.from === "string" && params.from ? params.from : "after_onboarding";
  const premiumNow = useRef(isPremium);
  premiumNow.current = isPremium;
  useEffect(() => {
    track("paywall_shown", { from });
    // Closing covers every way out: the close button, a purchase, Done, or a swipe down.
    return () => track("paywall_closed", { from, premium: premiumNow.current });
  }, [from]);

  const [chosen, setChosen] = useState<string | null>(null);
  const selected: Offer | undefined =
    offers.find((o) => o.id === (chosen ?? defaultOfferId)) ?? offers[0];
  const busy = status !== "idle";

  async function buy() {
    if (!selected || busy) return;
    const ok = await purchase(selected.id);
    if (ok) {
      haptic("success");
      dismissPaywall();
    }
  }

  async function restore() {
    if (busy) return;
    const ok = await restorePurchases();
    if (ok) haptic("success");
  }

  const ctaLabel = isPremium
    ? "Done"
    : status === "purchasing"
      ? "Processing…"
      : selected
        ? actionOf(selected)
        : "No plan available";
  const ctaDisabled = !ready || busy || (!isPremium && !selected);
  const ctaInk = ctaDisabled ? theme.colors.textMuted : theme.colors.onPrimary;
  const since = entitlement?.since ? new Date(entitlement.since) : null;
  const sinceText =
    since && !Number.isNaN(since.getTime())
      ? since.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Pip Plus", headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top + theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={dismissPaywall}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            {/* The product's name as a small lockup: the tag mark, then "Pip Plus". */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
              <Ionicons name="pricetags" size={24} color={theme.colors.primary} />
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  color: theme.colors.primary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Pip Plus
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
                lineHeight: 34,
              }}
            >
              {isPremium ? "You're on Pip Plus" : "Ask Pip without a limit. The codes stay free."}
            </Text>
          </View>
          <Pip pose={isPremium ? "pip-celebrating" : "pip-neutral"} size={88} />
        </View>

        {isPremium ? (
          <Card style={{ padding: theme.spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {activeOffer
                    ? `${activeOffer.label.replace(/\s*\([^)]*\)/g, "")} plan: ${activeOffer.price} ${periodText(activeOffer)}`
                    : "Plus is active on this phone"}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  {`${sinceText ? `Since ${sinceText}. ` : ""}${
                    activeOffer && activeOffer.period !== "lifetime"
                      ? "Renews automatically until canceled."
                      : ""
                  }`.trim() || "Every Plus feature is unlocked."}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={{ paddingVertical: 0, paddingHorizontal: theme.spacing.lg }}>
          {PERKS.map((perk, index) => (
            <View
              key={perk.title}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: theme.colors.border,
              }}
            >
              <Ionicons
                name={perk.icon}
                size={22}
                color={theme.colors.primary}
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {perk.title}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    lineHeight: 19,
                  }}
                >
                  {perk.body}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: 19,
          }}
        >
          {isPremium
            ? "These are unlocked on this phone, on top of everything that is free."
            : FREE_LINE}
        </Text>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.sm,
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {isPremium ? null : !ready ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Skeleton height={124} radius={theme.radius.md} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton height={124} radius={theme.radius.md} />
            </View>
          </View>
        ) : offers.length === 0 ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Plans aren't available yet"
            body="The store didn't return any plans. Check your connection and open this screen again."
          />
        ) : (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Plan"
            style={{ flexDirection: "row", gap: theme.spacing.sm }}
          >
            {offers.map((offer) => (
              <View key={offer.id} style={{ flex: 1 }}>
                <OfferCard
                  offer={offer}
                  selected={selected?.id === offer.id}
                  onSelect={() => setChosen(offer.id)}
                />
              </View>
            ))}
          </View>
        )}

        {/* The terms of the picked plan, in full, right above the button. */}
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.caption,
            lineHeight: 19,
            textAlign: "center",
          }}
        >
          {isPremium
            ? "Manage or cancel your plan in your App Store or Google Play subscription settings."
            : selected
              ? `${termsOf(selected)}${selected.period === "lifetime" ? "" : ` ${CANCEL_LINE}`}`
              : ""}
        </Text>

        {testMode ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            Test mode: purchases are simulated, nothing is charged.
          </Text>
        ) : null}

        {error ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
            }}
          >
            <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
            <Text
              style={{
                flexShrink: 1,
                color: theme.colors.danger,
                fontSize: theme.font.size.caption,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <PressScale
          onPress={isPremium ? dismissPaywall : buy}
          disabled={ctaDisabled}
          haptic="light"
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityState={{ disabled: ctaDisabled, busy: status === "purchasing" }}
          aria-busy={status === "purchasing"}
        >
          <View
            style={{
              minHeight: 56,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              // Disabled goes neutral with a readable label; it never fades.
              borderColor: ctaDisabled ? theme.colors.border : theme.colors.primary,
              backgroundColor: ctaDisabled ? theme.colors.surfaceAlt : theme.colors.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
            }}
          >
            {status === "purchasing" ? (
              <View style={{ width: 28, height: 28, overflow: "hidden" }}>
                <Lottie name="loading" size={28} color={ctaInk} />
              </View>
            ) : null}
            <Text
              style={{
                color: ctaInk,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {ctaLabel}
            </Text>
          </View>
        </PressScale>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: theme.spacing.lg,
          }}
        >
          <TextLink
            label={status === "restoring" ? "Restoring…" : "Restore purchases"}
            onPress={() => void restore()}
          />
          {appInfo.termsUrl ? (
            <TextLink label="Terms of use" onPress={() => void Linking.openURL(appInfo.termsUrl)} />
          ) : null}
          {appInfo.privacyUrl ? (
            <TextLink
              label="Privacy policy"
              onPress={() => void Linking.openURL(appInfo.privacyUrl)}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
