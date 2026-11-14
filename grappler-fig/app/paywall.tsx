// The Pro offer. Before the button it says what stays free, what Pro adds, how long the plan
// runs, the price it renews at and how to cancel. A subscriber sees their plan instead.
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { PrimaryButton } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { FeatureList } from "../components/paywall/FeatureList";
import { OfferCard, periodLabel } from "../components/paywall/OfferCard";
import { paywallClosed, paywallSource } from "../components/paywall/open";
import { haptic, Skeleton, Stagger } from "../components/motion";
import { IconButton, SecondaryButton, TextButton, displayFace } from "../components/ui";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { dismissPaywall, usePurchases, type Offer } from "../data/purchases";
import { FREE_FEATURES } from "../data/training";
import { useTheme } from "../theme/ThemeProvider";

// The same prompt as the app's stored icon, so the drawn picture is used.
const ICON_PROMPT =
  "rounded square app badge with a glowing crosshair reticle, minimal flat icon, no text";

/** Where the purchase is billed and where it is canceled. */
const STORE =
  Platform.OS === "ios"
    ? "App Store"
    : Platform.OS === "android"
      ? "Google Play"
      : "App Store or Google Play";

const MANAGE_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : Platform.OS === "android"
      ? "https://play.google.com/store/account/subscriptions"
      : null;

function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

/** The plan in plain words: what is charged, when, whether it renews, and the button's label. */
function planTerms(offer: Offer): { headline: string; detail: string; button: string } {
  if (offer.period === "lifetime")
    return {
      headline: `${offer.price} once`,
      detail: `One payment through your ${STORE} account for Pro on this account for good. It does not renew.`,
      button: `Buy once for ${offer.price}`,
    };
  const each = `${offer.price} per ${offer.period}`;
  const cancel = `Cancel anytime in your ${STORE} subscription settings, at least 24 hours before it renews.`;
  if (offer.trialDays > 0) {
    const ends = new Date(Date.now() + offer.trialDays * 86_400_000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return {
      headline: `${days(offer.trialDays)} free, then ${each}`,
      detail: `Your free trial ends on ${ends}. You're charged ${offer.price} that day and then every ${offer.period}: it renews automatically until you cancel. Cancel before ${ends} and you pay nothing. ${cancel}`,
      button: `Start ${offer.trialDays}-day free trial`,
    };
  }
  return {
    headline: each,
    detail: `You're charged ${offer.price} today and then every ${offer.period}: it renews automatically until you cancel. ${cancel}`,
    button: `Subscribe for ${each}`,
  };
}

function LegalLink({ label, url }: { label: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(url).catch(() => undefined)}
      hitSlop={12}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 2,
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
    offers,
    defaultOfferId,
    premiumFeatures,
    status,
    error,
    testMode,
    purchase,
    restorePurchases,
  } = usePurchases();
  const [picked, setPicked] = useState<string | null>(null);
  // Which action the store's last message belongs to, so it shows beside that control.
  const [lastAction, setLastAction] = useState<"buy" | "restore" | null>(null);
  const [restored, setRestored] = useState(false);
  const purchased = useRef(false);

  // Paywall shown and closed, with where it was opened from (does nothing while analytics is off).
  const source = paywallSource(params.from);
  useEffect(() => {
    track("paywall_shown", { from: source });
    return () => {
      track("paywall_closed", { from: source, purchased: purchased.current });
      paywallClosed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedId = picked && offers.some((o) => o.id === picked) ? picked : defaultOfferId;
  const selected: Offer | undefined = offers.find((o) => o.id === selectedId) ?? offers[0];
  const purchasing = status === "purchasing";
  const busy = status !== "idle";
  const terms = selected ? planTerms(selected) : null;

  async function buy() {
    if (!selected || busy) return;
    setLastAction("buy");
    if (await purchase(selected.id)) {
      purchased.current = true;
      haptic("success");
      dismissPaywall();
    }
  }

  async function restore() {
    if (busy) return;
    setLastAction("restore");
    setRestored(false);
    if (await restorePurchases()) {
      purchased.current = true;
      setRestored(true);
      haptic("success");
    }
  }

  const fine = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption + 2,
    lineHeight: 20,
  };

  const notice = (text: string, tone: "danger" | "success") => (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}
    >
      <Ionicons
        name={tone === "danger" ? "alert-circle" : "checkmark-circle"}
        size={20}
        color={tone === "danger" ? theme.colors.danger : theme.colors.success}
      />
      <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.caption + 2, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );

  const hero = (
    <View key="hero" style={{ alignItems: "center", gap: theme.spacing.sm }}>
      <AiImage
        prompt={ICON_PROMPT}
        style={{ width: 56, height: 56, borderRadius: theme.radius.sm }}
      />
      <Text
        accessibilityRole="header"
        style={[
          displayFace,
          {
            textAlign: "center",
            color: theme.colors.text,
            fontSize: theme.font.size.headline + 6,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          },
        ]}
      >
        <Text style={{ color: theme.colors.primary }}>Pro</Text> Cornerman
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          lineHeight: 24,
          textAlign: "center",
        }}
      >
        {isPremium
          ? "Pro is unlocked on this account."
          : "Turn opponent footage and technique flaws into targeted callout rounds."}
      </Text>
    </View>
  );

  const restoreNote =
    lastAction === "restore" && !busy
      ? restored
        ? notice("Your purchase is restored. Pro is active.", "success")
        : error
          ? notice(error, "danger")
          : null
      : null;

  const lists = (
    <View key="lists" style={{ gap: theme.spacing.md }}>
      <FeatureList title={isPremium ? "Included in Pro" : "Pro adds"} items={premiumFeatures} />
      {isPremium ? null : (
        <Text style={[fine, { paddingHorizontal: theme.spacing.xs }]}>
          <Text style={{ color: theme.colors.text, fontWeight: theme.font.weight.bold }}>
            Free with or without Pro:{" "}
          </Text>
          {`${FREE_FEATURES.map((line) => line.charAt(0).toLowerCase() + line.slice(1)).join("; ")}.`}
        </Text>
      )}
    </View>
  );

  const plans = !ready ? (
    <View key="plans" style={{ gap: theme.spacing.md }}>
      <Skeleton height={76} radius={theme.radius.md} />
      <Skeleton height={76} radius={theme.radius.md} />
      <Skeleton height={76} radius={theme.radius.md} />
    </View>
  ) : offers.length === 0 ? (
    <EmptyState
      key="plans"
      icon="cloud-offline-outline"
      title="Plans aren't loading"
      body="The store didn't return any plans. Check your connection, close this and try again. Everything free keeps working."
    />
  ) : (
    <View key="plans" style={{ gap: theme.spacing.md }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        Choose a plan
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.md }}>
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            selected={offer.id === selected?.id}
            onSelect={() => setPicked(offer.id)}
          />
        ))}
      </View>
    </View>
  );

  const cta =
    !ready || !selected || !terms ? null : (
      <View key="cta" style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body + 2,
              fontWeight: theme.font.weight.bold,
              lineHeight: 24,
              fontVariant: ["tabular-nums"],
            }}
          >
            {terms.headline}
          </Text>
          <Text style={[fine, { color: theme.colors.text, fontVariant: ["tabular-nums"] }]}>
            {terms.detail}
          </Text>
        </View>
        <PrimaryButton
          label={purchasing ? "Waiting for the store…" : terms.button}
          busy={purchasing}
          disabled={busy}
          onPress={() => void buy()}
          accessibilityLabel={terms.button}
        />
        {lastAction !== "restore" && error && !busy
          ? notice(`${error} Try again, or close this and keep training.`, "danger")
          : null}
        <TextButton label="Not now" tone="plain" onPress={() => dismissPaywall()} />
        {testMode ? (
          <Text style={[fine, { textAlign: "center" }]}>
            Test mode: purchases are simulated here and nothing is charged.
          </Text>
        ) : null}
      </View>
    );

  const premium = (
    <Card key="premium">
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {activeOffer ? `${activeOffer.label} plan is active` : "Pro is active"}
          </Text>
          {activeOffer ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontVariant: ["tabular-nums"],
              }}
            >
              {`${activeOffer.price} ${periodLabel(activeOffer)}`}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[fine, { color: theme.colors.text }]}>
        {activeOffer?.period === "lifetime"
          ? "A one-time purchase. It does not renew and there is nothing to cancel."
          : `It renews automatically until you cancel. Manage or cancel it in your ${STORE} subscription settings.`}
      </Text>
      {activeOffer?.period !== "lifetime" && MANAGE_URL ? (
        <SecondaryButton
          label="Manage subscription"
          icon="open-outline"
          onPress={() => void Linking.openURL(MANAGE_URL).catch(() => undefined)}
        />
      ) : null}
      <PrimaryButton label="Done" onPress={() => dismissPaywall()} />
    </Card>
  );

  const legal = (
    <View
      key="legal"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: theme.spacing.lg,
      }}
    >
      {appInfo.termsUrl ? <LegalLink label="Terms of Use" url={appInfo.termsUrl} /> : null}
      {appInfo.privacyUrl ? <LegalLink label="Privacy Policy" url={appInfo.privacyUrl} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Pro Cornerman" }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + theme.spacing.xs,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
        }}
      >
        {!isPremium ? (
          <TextButton
            label={status === "restoring" ? "Restoring…" : "Restore purchases"}
            tone="plain"
            disabled={busy}
            onPress={() => void restore()}
            accessibilityLabel="Restore purchases"
          />
        ) : (
          <View />
        )}
        <IconButton icon="close" label="Close" size={26} onPress={() => dismissPaywall()} />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Stagger step={80} style={{ gap: theme.spacing.lg }}>
          {[restoreNote, hero, isPremium ? premium : null, lists, isPremium ? null : plans, isPremium ? null : cta, legal]}
        </Stagger>
      </ScrollView>
    </View>
  );
}
