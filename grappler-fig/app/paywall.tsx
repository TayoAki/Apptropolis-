import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { PrimaryButton } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { FeatureList } from "../components/paywall/FeatureList";
import { OfferCard, periodLabel } from "../components/paywall/OfferCard";
import { haptic, Skeleton, Stagger } from "../components/motion";
import { IconButton, TextButton, displayFace } from "../components/ui";
import { appInfo } from "../data/app-info";
import { dismissPaywall, usePurchases, type Offer } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

// The same prompt as the app's stored icon, so the drawn picture is used.
const ICON_PROMPT =
  "rounded square app badge with a glowing crosshair reticle, minimal flat icon, no text";

function LegalLink({ label, url }: { label: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(url)}
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

/** What the first charge is, and when. */
function billingLine(offer: Offer): string {
  if (offer.period === "lifetime") return `You're charged ${offer.price} once.`;
  if (offer.trialDays > 0) {
    const when = new Date(Date.now() + offer.trialDays * 86_400_000).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric" },
    );
    return `Free for ${offer.trialDays} days. You're charged ${offer.price} on ${when} unless you cancel.`;
  }
  return `You're charged ${offer.price} today, and it renews every ${offer.period}.`;
}

function renewalText(offer: Offer): string {
  if (offer.period === "lifetime")
    return "One-time purchase, charged to your App Store or Google Play account. There is no renewal.";
  return `Renews automatically at ${offer.price}/${offer.period} unless canceled at least 24 hours before the end of the period. Cancel anytime in your App Store or Google Play settings.`;
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
  } = usePurchases();
  const [picked, setPicked] = useState<string | null>(null);

  const selectedId = picked && offers.some((o) => o.id === picked) ? picked : defaultOfferId;
  const selected: Offer | undefined = offers.find((o) => o.id === selectedId) ?? offers[0];
  const purchasing = status === "purchasing";
  const busy = status !== "idle";
  const disabled = !selected || busy;
  const trialDays = selected && selected.trialDays > 0 ? selected.trialDays : 0;
  const ctaLabel = trialDays ? `Start ${trialDays}-day free trial` : "Continue";

  async function buy() {
    if (!selected || busy) return;
    if (await purchase(selected.id)) {
      haptic("success");
      dismissPaywall();
    }
  }

  async function restore() {
    if (busy) return;
    if (await restorePurchases()) haptic("success");
  }

  const hero = (
    <View key="hero" style={{ alignItems: "center", gap: theme.spacing.md }}>
      <AiImage
        prompt={ICON_PROMPT}
        style={{ width: 80, height: 80, borderRadius: theme.radius.md }}
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
          ? "Everything below is unlocked on this phone."
          : "Turn opponent footage and technique flaws into targeted callout rounds."}
      </Text>
    </View>
  );

  const features = <FeatureList key="features" items={premiumFeatures} />;

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
      body="The store didn't return any plans. Check your connection, then try again."
      actionLabel="Restore purchases"
      onAction={() => void restore()}
    />
  ) : (
    <View key="plans" accessibilityRole="radiogroup" style={{ gap: theme.spacing.md }}>
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          selected={offer.id === selected?.id}
          onSelect={() => setPicked(offer.id)}
        />
      ))}
    </View>
  );

  const premium = (
    <Card key="premium">
      <Ionicons
        name="checkmark-circle"
        size={56}
        color={theme.colors.success}
        style={{ alignSelf: "center" }}
      />
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          textAlign: "center",
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
            textAlign: "center",
          }}
        >
          {`${activeOffer.price} ${periodLabel(activeOffer)}`}
        </Text>
      ) : null}
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 2,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        Renewals and cancellation are managed in your App Store or Google Play settings.
      </Text>
      <PrimaryButton label="Done" onPress={() => dismissPaywall()} />
    </Card>
  );

  const fine = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption + 2,
    lineHeight: 20,
    textAlign: "center" as const,
  };

  const cta = !ready ? (
    <Skeleton key="cta" height={52} radius={theme.radius.pill} />
  ) : (
    <View key="cta" style={{ gap: theme.spacing.md }}>
      <PrimaryButton
        label={purchasing ? "Processing…" : ctaLabel}
        busy={purchasing}
        disabled={disabled}
        onPress={() => void buy()}
        accessibilityLabel={ctaLabel}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[fine, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}
      {selected ? <Text style={fine}>{billingLine(selected)}</Text> : null}
      <Text style={fine}>
        {`Cancel anytime in ${Platform.OS === "ios" ? "Apple ID" : "Google Play"} settings. Free round timer never expires.`}
      </Text>
      {selected ? <Text style={fine}>{renewalText(selected)}</Text> : null}
      {testMode ? (
        <Text style={fine}>Test mode: purchases are simulated, nothing is charged.</Text>
      ) : null}
    </View>
  );

  const legal =
    appInfo.termsUrl || appInfo.privacyUrl ? (
      <View
        key="legal"
        style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.lg }}
      >
        {appInfo.termsUrl ? <LegalLink label="Terms of Use" url={appInfo.termsUrl} /> : null}
        {appInfo.privacyUrl ? (
          <LegalLink label="Privacy Policy" url={appInfo.privacyUrl} />
        ) : null}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Go Pro" }} />
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
            label={status === "restoring" ? "Restoring…" : "Restore"}
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
        <Stagger step={80} style={{ gap: theme.spacing.xl }}>
          {[hero, features, isPremium ? premium : plans, isPremium ? null : cta, legal]}
        </Stagger>
      </ScrollView>
    </View>
  );
}
