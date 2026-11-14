// The paywall: what is free, what Plus adds, what each plan costs and when it renews, all above
// the button. Closing it is one tap at the top or the "Not now" line under the button. A
// subscriber sees their plan instead of the offer.
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { OfferCard } from "../components/paywall/OfferCard";
import { Panel } from "../components/Panel";
import { takePaywallSource } from "../components/paywallSource";
import { Picture } from "../components/Picture";
import { Appear, haptic, Mascot, PressScale, Skeleton } from "../components/motion";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { backend } from "../data/backend";
import { usePurchases, type Offer } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

const STORE = Platform.OS === "ios" ? "App Store" : "Google Play";
const MANAGE_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

/** What the app does without paying. Each of these works for everyone. */
const FREE_FEATURES =
  "Logging drinks and alcohol-free days, your form rating, the weekly limit and chart, the BAC estimate, the daily reminder, athlete levels 1 to 3 and your sport's starter kit and first gear.";

/** "Trend insights: weekday patterns…" becomes a title and a detail line. */
function splitFeature(text: string): { title: string; detail: string } {
  const at = text.indexOf(":");
  if (at === -1) return { title: text, detail: "" };
  const detail = text.slice(at + 1).trim();
  return {
    title: text.slice(0, at).trim(),
    detail: detail.charAt(0).toUpperCase() + detail.slice(1),
  };
}

/** What is charged and when, in one plain sentence. */
function termsLine(offer: Offer): string {
  if (offer.period === "lifetime") return `One payment of ${offer.price}. It does not renew.`;
  const price = `${offer.price} per ${offer.period}`;
  return offer.trialDays > 0
    ? `${offer.trialDays} days free, then ${price}. Renews automatically until you cancel.`
    : `${price}. Renews automatically until you cancel.`;
}

/** The button says what pressing it does. */
function buttonLabel(offer: Offer): string {
  if (offer.period === "lifetime") return `Buy once for ${offer.price}`;
  if (offer.trialDays > 0) return `Start ${offer.trialDays}-day free trial`;
  return `Subscribe for ${offer.price} per ${offer.period}`;
}

export default function PaywallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    ready,
    isPremium,
    activeOffer,
    offers,
    defaultOfferId,
    premiumFeatures,
    status,
    error,
    testMode,
    purchase,
    restorePurchases,
    dismissPaywall,
  } = usePurchases();
  const [pickedId, setPickedId] = useState<string | null>(null);
  // What happened on this visit. The store's last error is kept by the platform between visits,
  // so it is only shown after an attempt made here.
  const [attempt, setAttempt] = useState<"none" | "purchase" | "restore">("none");
  const [restored, setRestored] = useState(false);

  // Where this paywall was opened from, and how it was left, for the owner's analytics.
  const [from] = useState(takePaywallSource);
  const outcome = useRef<string | null>(null);
  useEffect(() => {
    track("paywall_shown", { from });
    return () => {
      track("paywall_closed", { from, outcome: outcome.current ?? "dismissed" });
    };
  }, [from]);

  const busy = status !== "idle";
  // The default plan leads the list.
  const defaultOffer = offers.find((o) => o.id === defaultOfferId);
  const ordered = defaultOffer
    ? [defaultOffer, ...offers.filter((o) => o.id !== defaultOfferId)]
    : offers;
  const selected = ordered.find((o) => o.id === pickedId) ?? ordered[0] ?? null;
  // Coach feedback needs the app's AI service; it is only listed when that service is connected.
  const features = premiumFeatures.filter((feature) => backend.apiUrl || !/\bAI\b/.test(feature));
  const links = [
    { label: "Terms of use", url: appInfo.termsUrl },
    { label: "Privacy policy", url: appInfo.privacyUrl },
  ].filter((link) => link.url);

  function close(result: string) {
    outcome.current = result;
    dismissPaywall();
  }

  async function buy() {
    if (!selected || busy) return;
    setRestored(false);
    setAttempt("purchase");
    const done = await purchase(selected.id);
    if (done) {
      haptic("success");
      close("purchased");
    }
  }

  async function restore() {
    if (busy) return;
    setRestored(false);
    setAttempt("restore");
    const ok = await restorePurchases();
    setRestored(ok);
    if (ok) outcome.current = "restored";
  }

  const errorLine = (message: string) => (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={theme.colors.danger}
        style={{ marginTop: 1 }}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={{ flex: 1, color: theme.colors.danger, fontSize: theme.font.size.caption }}
      >
        {message}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "ShotOClock Plus", headerShown: false }} />
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          alignItems: "flex-end",
        }}
      >
        <Pressable
          onPress={() => close(isPremium ? "already_plus" : "dismissed")}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? theme.colors.border : theme.colors.surfaceAlt,
          })}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <Appear>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <View style={{ flex: 1, gap: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Picture
                  prompt="a glowing gold trophy on a dark stadium pedestal, flat illustration"
                  icon="trophy-outline"
                  size={44}
                />
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.primary,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  ShotOClock Plus
                </Text>
              </View>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.headline,
                  lineHeight: 34,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {isPremium ? "You're on ShotOClock Plus" : "Train harder. Drink smarter."}
              </Text>
            </View>
            <Mascot pose={isPremium ? "dash-game-day-sharp" : "dash-match-ready"} size={104} />
          </View>
        </Appear>

        {isPremium ? (
          <Appear delay={80} style={{ gap: theme.spacing.lg }}>
            <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {activeOffer ? `${activeOffer.label} plan` : "Plus is active"}
                </Text>
              </View>
              {activeOffer ? (
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
                  {activeOffer.period === "lifetime"
                    ? `One payment of ${activeOffer.price}. It does not renew.`
                    : `${activeOffer.price} per ${activeOffer.period}. Renews automatically until you cancel.`}
                </Text>
              ) : null}
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {`Your renewal date is in your ${STORE} subscriptions, where you can also change or cancel the plan.`}
              </Text>
            </Panel>
            <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Included in your plan
              </Text>
              {features.map((feature) => (
                <FeatureRow key={feature} feature={feature} />
              ))}
            </Panel>
            <PressScale
              onPress={() => close("already_plus")}
              haptic="light"
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={{
                minHeight: 56,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Done
              </Text>
            </PressScale>
            <Pressable
              onPress={() => void Linking.openURL(MANAGE_URL)}
              accessibilityRole="link"
              accessibilityLabel={`Manage or cancel in ${STORE}`}
              style={({ pressed }) => ({
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.medium,
                  textDecorationLine: "underline",
                }}
              >
                {`Manage or cancel in ${STORE}`}
              </Text>
            </Pressable>
          </Appear>
        ) : (
          <>
            <Appear delay={80} style={{ gap: theme.spacing.md }}>
              <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  Free for everyone
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                  {FREE_FEATURES}
                </Text>
              </Panel>
              <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  Plus adds
                </Text>
                {features.map((feature) => (
                  <FeatureRow key={feature} feature={feature} />
                ))}
              </Panel>
            </Appear>

            <Appear delay={160}>
              {!ready ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Skeleton height={76} radius={theme.radius.lg} />
                  <Skeleton height={76} radius={theme.radius.lg} />
                </View>
              ) : ordered.length === 0 ? (
                <EmptyState
                  icon="pricetag-outline"
                  title="No plans to show yet"
                  body="The store hasn't returned plans for this app. If you already subscribed, restore your purchases below. Everything free keeps working."
                />
              ) : (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Plan"
                  style={{ gap: theme.spacing.sm }}
                >
                  {ordered.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      selected={selected?.id === offer.id}
                      onSelect={() => setPickedId(offer.id)}
                      disabled={busy}
                    />
                  ))}
                </View>
              )}
            </Appear>

            {!ready ? (
              <Skeleton height={56} radius={theme.radius.md} />
            ) : selected ? (
              <Appear delay={220} style={{ gap: theme.spacing.md }}>
                <View style={{ gap: theme.spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {termsLine(selected)}
                  </Text>
                  {selected.period === "lifetime" ? null : (
                    <Text
                      style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                    >
                      {`Cancel any time in your ${STORE} subscription settings, at least 24 hours before the ${
                        selected.trialDays > 0 ? "trial ends or the " : ""
                      }plan renews, and you won't be charged again.`}
                    </Text>
                  )}
                </View>
                {attempt === "purchase" && error && status === "idle"
                  ? errorLine(`${error} You can try again, or close this screen and keep the free version.`)
                  : null}
                <PressScale
                  onPress={buy}
                  haptic="light"
                  scaleTo={0.97}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={buttonLabel(selected)}
                  accessibilityState={{ busy, disabled: busy }}
                  style={{
                    minHeight: 56,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  {status === "purchasing" ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
                    >
                      <ActivityIndicator color={theme.colors.onPrimary} />
                      <Text
                        style={{
                          color: theme.colors.onPrimary,
                          fontSize: theme.font.size.body,
                          fontWeight: theme.font.weight.bold,
                        }}
                      >
                        Contacting the store…
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.onPrimary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {buttonLabel(selected)}
                    </Text>
                  )}
                </PressScale>
              </Appear>
            ) : null}

            <Appear delay={280} style={{ gap: theme.spacing.xs }}>
              <Pressable
                onPress={() => close("dismissed")}
                accessibilityRole="button"
                accessibilityLabel="Not now, keep the free version"
                style={({ pressed }) => ({
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    textDecorationLine: "underline",
                  }}
                >
                  Not now, keep the free version
                </Text>
              </Pressable>
              <Pressable
                onPress={restore}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                accessibilityState={{ busy: status === "restoring", disabled: busy }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    textDecorationLine: "underline",
                  }}
                >
                  {status === "restoring" ? "Checking your purchases…" : "Restore purchases"}
                </Text>
              </Pressable>
              {restored ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    color: theme.colors.success,
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.bold,
                    textAlign: "center",
                  }}
                >
                  Purchases restored.
                </Text>
              ) : attempt === "restore" && error && status === "idle" ? (
                errorLine(error)
              ) : null}
              {links.length > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    columnGap: theme.spacing.xl,
                  }}
                >
                  {links.map((link) => (
                    <Pressable
                      key={link.label}
                      onPress={() => void Linking.openURL(link.url)}
                      accessibilityRole="link"
                      accessibilityLabel={link.label}
                      hitSlop={8}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: theme.font.size.caption,
                          textDecorationLine: "underline",
                        }}
                      >
                        {link.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {testMode ? (
                <Text
                  style={{
                    color: theme.colors.warning,
                    fontSize: theme.font.size.caption,
                    textAlign: "center",
                  }}
                >
                  Test mode: purchases are simulated, nothing is charged.
                </Text>
              ) : null}
            </Appear>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** One line of what Plus adds: a check, the feature and its detail. */
function FeatureRow({ feature }: { feature: string }) {
  const theme = useTheme();
  const { title, detail } = splitFeature(feature);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {title}
        </Text>
        {detail ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
