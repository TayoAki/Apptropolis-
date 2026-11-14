import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useState } from "react";
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
import { AiImage } from "../components/AiImage";
import { PrimaryButton } from "../components/button";
import { EmptyState } from "../components/empty-state";
import { FeatureList } from "../components/paywall/FeatureList";
import { CornerBrackets, MetalPanel } from "../components/paywall/Frame";
import { OfferCard, periodLabel } from "../components/paywall/OfferCard";
import { Lottie } from "../components/lottie";
import { Float, haptic, Pulse, PressScale, Skeleton, Stagger } from "../components/motion";
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
          fontSize: theme.font.size.caption,
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
      <View
        style={{
          borderRadius: theme.radius.lg,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.5,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      >
        <Float amplitude={4} duration={3000}>
          <AiImage
            prompt={ICON_PROMPT}
            style={{ width: 96, height: 96, borderRadius: theme.radius.lg }}
          />
        </Float>
      </View>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          alignSelf: "stretch",
          textAlign: "center",
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.display,
          fontWeight: theme.font.weight.bold,
          letterSpacing: -1,
        }}
      >
        PR<Text style={{ color: theme.colors.primary }}>O</Text> CORNERMAN
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
      <Skeleton height={84} radius={theme.radius.lg} />
      <Skeleton height={96} radius={theme.radius.lg} />
      <Skeleton height={84} radius={theme.radius.lg} />
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
    <View key="plans" style={{ gap: theme.spacing.md }}>
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
    <MetalPanel
      key="premium"
      selected
      style={{ alignItems: "center", gap: theme.spacing.md }}
    >
      <Lottie name="success" size={96} loop={false} />
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
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
          }}
        >
          {`${activeOffer.price} ${periodLabel(activeOffer)}`}
        </Text>
      ) : null}
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          lineHeight: 18,
          textAlign: "center",
        }}
      >
        Renewals and cancellation are managed in your App Store or Google Play settings.
      </Text>
      <PrimaryButton label="Done" onPress={() => dismissPaywall()} />
    </MetalPanel>
  );

  const cta = !ready ? (
    <Skeleton key="cta" height={64} radius={theme.radius.md} />
  ) : (
    <View key="cta" style={{ gap: theme.spacing.md }}>
      <Pulse every={1500} scale={1.03}>
        <View
          style={{
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
            shadowOpacity: disabled ? 0 : 0.7,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        >
          <PressScale
            onPress={buy}
            disabled={disabled}
            haptic="light"
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            accessibilityState={{ disabled, busy: purchasing }}
            style={{
              minHeight: 64,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.md,
              overflow: "hidden",
              backgroundColor: theme.colors.primary,
              opacity: disabled && !purchasing ? 0.6 : 1,
            }}
          >
            <CornerBrackets color={theme.colors.background} size={14} inset={8} thickness={3} />
            {purchasing ? <ActivityIndicator color={theme.colors.onPrimary} /> : null}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                flexShrink: 1,
                color: theme.colors.onPrimary,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {purchasing ? "Processing" : ctaLabel}
            </Text>
          </PressScale>
        </View>
      </Pulse>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          lineHeight: 18,
          textAlign: "center",
        }}
      >
        {`Cancel anytime in ${Platform.OS === "ios" ? "Apple ID" : "Google Play"} settings. Free round timer never expires.`}
      </Text>
      {selected ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {billingLine(selected)}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: theme.colors.danger,
            fontSize: theme.font.size.caption,
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      ) : null}
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
      {selected ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {renewalText(selected)}
        </Text>
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
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.xs,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: theme.spacing.xs,
          }}
        >
          {!isPremium ? (
            <Pressable
              onPress={() => void restore()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
              hitSlop={12}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.sm,
                opacity: pressed || busy ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {status === "restoring" ? "Restoring" : "Restore"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => dismissPaywall()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
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

        <Stagger step={80} style={{ gap: theme.spacing.xl }}>
          {[hero, features, isPremium ? premium : plans, isPremium ? null : cta, legal]}
        </Stagger>
      </ScrollView>
    </View>
  );
}
