import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { EmptyState } from "../components/EmptyState";
import { Lottie } from "../components/lottie";
import { OfferCard } from "../components/paywall/OfferCard";
import { Panel } from "../components/Panel";
import {
  Appear,
  Float,
  haptic,
  Mascot,
  PressScale,
  Pulse,
  Skeleton,
  Stagger,
} from "../components/motion";
import { appInfo } from "../data/app-info";
import { usePurchases, type Offer } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Icons for the first premium features (checks for the first two, sport icons after). */
const FEATURE_ICONS: IconName[] = [
  "checkmark-circle",
  "checkmark-circle",
  "basketball-outline",
  "american-football-outline",
];

/** "Trend insights: weekday patterns…" becomes a title and a detail line. */
function splitFeature(text: string): { title: string; detail: string } {
  const at = text.indexOf(":");
  if (at === -1) return { title: text, detail: "" };
  return { title: text.slice(0, at).trim(), detail: text.slice(at + 1).trim() };
}

/** What is billed and when, in plain words. */
function renewalLine(offer: Offer): string {
  if (offer.period === "lifetime") {
    return "One-time purchase. Charged to your App Store or Google Play account.";
  }
  const price = `${offer.price}/${offer.period}`;
  const lead =
    offer.trialDays > 0
      ? `Your ${offer.trialDays}-day free trial then renews automatically at ${price}`
      : `Renews automatically at ${price}`;
  return `${lead} unless canceled at least 24 hours before the end of the period. Cancel anytime in your App Store or Google Play settings.`;
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
  const [restored, setRestored] = useState(false);

  const busy = status !== "idle";
  // The default plan leads the list, as on the mockup.
  const defaultOffer = offers.find((o) => o.id === defaultOfferId);
  const ordered = defaultOffer
    ? [defaultOffer, ...offers.filter((o) => o.id !== defaultOfferId)]
    : offers;
  const selected = ordered.find((o) => o.id === pickedId) ?? ordered[0] ?? null;
  const pose = isPremium ? "dash-game-day-sharp" : "dash-match-ready";
  const ctaLabel =
    selected && selected.trialDays > 0 ? `Start ${selected.trialDays}-Day Free Trial` : "Continue";
  const renewal = selected ? renewalLine(selected) : "";
  const links = [
    { label: "Terms of Use", url: appInfo.termsUrl },
    { label: "Privacy Policy", url: appInfo.privacyUrl },
  ].filter((link) => link.url);

  async function buy() {
    if (!selected || busy) return;
    const done = await purchase(selected.id);
    if (done) {
      haptic("success");
      dismissPaywall();
    }
  }

  async function restore() {
    if (busy) return;
    setRestored(false);
    setRestored(await restorePurchases());
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "ShotOClock Plus", headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
      >
        <Appear>
          <View
            style={{
              alignSelf: "center",
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Cancel Anytime
            </Text>
          </View>
        </Appear>

        <Appear delay={60}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <AiImage
              prompt="a glowing gold trophy on a dark stadium pedestal, flat illustration"
              fit="contain"
              style={{ width: 76, height: 76 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityRole="header"
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.headline,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                ShotOClock
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                    fontStyle: "italic",
                  }}
                >
                  Plus
                </Text>
                <Lottie name="sparkle" size={44} />
              </View>
            </View>
            <Float amplitude={4}>
              <Mascot pose={pose} size={116} />
            </Float>
          </View>
        </Appear>

        <Appear delay={140} style={{ gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
              textAlign: "center",
            }}
          >
            {isPremium ? "You're on ShotOClock Plus" : "Train Harder. Drink Smarter."}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            {isPremium
              ? "Every premium feature is unlocked, from game trends to every career kit."
              : "See how your drinking lines up with your games, set match-week limits and unlock every career kit."}
          </Text>
        </Appear>

        <Appear delay={220}>
          <Panel>
            <Stagger step={50} style={{ gap: theme.spacing.md }}>
              {premiumFeatures.map((feature, index) => {
                const { title, detail } = splitFeature(feature);
                return (
                  <View
                    key={feature}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: theme.spacing.md,
                    }}
                  >
                    <Ionicons
                      name={FEATURE_ICONS[index] ?? "checkmark-circle"}
                      size={22}
                      color={theme.colors.primary}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: theme.font.size.body,
                          fontWeight: theme.font.weight.bold,
                        }}
                      >
                        {title}
                      </Text>
                      {detail ? (
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: theme.font.size.body,
                          }}
                        >
                          {detail}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </Stagger>
          </Panel>
        </Appear>

        {isPremium ? (
          <Appear delay={320} style={{ gap: theme.spacing.lg }}>
            <Panel style={{ alignItems: "center", gap: theme.spacing.sm }}>
              <Lottie name="success" size={88} />
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  textAlign: "center",
                }}
              >
                {activeOffer ? `${activeOffer.label} plan` : "Premium is active"}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  textAlign: "center",
                }}
              >
                {activeOffer
                  ? `${activeOffer.label} · ${activeOffer.price}`
                  : "Thanks for backing your training."}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  textAlign: "center",
                }}
              >
                Manage or cancel anytime in your App Store or Google Play settings.
              </Text>
            </Panel>
            <PressScale
              onPress={dismissPaywall}
              haptic="light"
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel="Keep training"
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
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Keep training
              </Text>
            </PressScale>
          </Appear>
        ) : (
          <>
            <Appear delay={320}>
              {!ready ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Skeleton height={76} radius={theme.radius.lg} />
                  <Skeleton height={76} radius={theme.radius.lg} />
                </View>
              ) : ordered.length === 0 ? (
                <EmptyState
                  icon="pricetag-outline"
                  title="No plans to show yet"
                  body="The store hasn't returned plans for this app. If you already subscribed, restore your purchases below."
                />
              ) : (
                <View style={{ gap: theme.spacing.sm }}>
                  {ordered.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      selected={selected?.id === offer.id}
                      onSelect={() => setPickedId(offer.id)}
                      shimmer={Boolean(offer.badge)}
                      disabled={busy}
                    />
                  ))}
                </View>
              )}
            </Appear>

            {!ready ? (
              <Skeleton height={56} radius={theme.radius.md} />
            ) : selected ? (
              <Appear delay={420} style={{ gap: theme.spacing.sm }}>
                <Pulse every={2400} scale={1.02}>
                  <PressScale
                    onPress={buy}
                    haptic="light"
                    scaleTo={0.97}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={ctaLabel}
                    accessibilityState={{ busy }}
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
                      <ActivityIndicator color={theme.colors.onPrimary} />
                    ) : (
                      <Text
                        style={{
                          color: theme.colors.onPrimary,
                          fontSize: theme.font.size.title,
                          fontWeight: theme.font.weight.bold,
                        }}
                      >
                        {ctaLabel}
                      </Text>
                    )}
                  </PressScale>
                </Pulse>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    textAlign: "center",
                  }}
                >
                  {renewal}
                </Text>
              </Appear>
            ) : null}

            <Appear delay={480} style={{ gap: theme.spacing.xs }}>
              {status === "restoring" ? (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    textAlign: "center",
                  }}
                >
                  Checking your purchases…
                </Text>
              ) : restored ? (
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
              ) : error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    color: theme.colors.danger,
                    fontSize: theme.font.size.caption,
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
              ) : null}
              <Pressable
                onPress={restore}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Restore Purchases"
                hitSlop={8}
                style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
              >
                {({ pressed }) => (
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                      textDecorationLine: "underline",
                      opacity: pressed ? 0.6 : 1,
                    }}
                  >
                    Restore Purchases
                  </Text>
                )}
              </Pressable>
              {links.length > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    gap: theme.spacing.lg,
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

      <Pressable
        onPress={dismissPaywall}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={8}
        style={({ pressed }) => ({
          position: "absolute",
          top: insets.top + theme.spacing.sm,
          right: theme.spacing.lg,
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="close" size={22} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}
