import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Lottie } from "../components/lottie";
import { OfferCard } from "../components/paywall/OfferCard";
import { haptic, PressScale, Skeleton, Stagger } from "../components/motion";
import { Rocco } from "../components/Rocco";
import { appInfo } from "../data/app-info";
import { usePurchases, type Offer } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

const PERKS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "barbell-outline",
    title: "Custom stakes",
    body: "Create fun penalties like buying coffee, making dinner, or playlist control.",
  },
  {
    icon: "sparkles-outline",
    title: "AI plan regeneration",
    body: "Adapt splits for new injuries, goals, or hotel gyms on demand.",
  },
  {
    icon: "clipboard-outline",
    title: "Scorecard vault",
    body: "Full historical charts, streaks, and head-to-head records.",
  },
  {
    icon: "analytics-outline",
    title: "Private exercise analytics",
    body: "Deep volume and estimated 1RM tracking for your eyes only.",
  },
];

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
  const {
    ready,
    isPremium,
    activeOffer,
    offers,
    defaultOfferId,
    status,
    error,
    testMode,
    purchase,
    restorePurchases,
    dismissPaywall,
  } = usePurchases();

  const [chosen, setChosen] = useState<string | null>(null);
  const selected: Offer | undefined =
    offers.find((o) => o.id === (chosen ?? defaultOfferId)) ?? offers[0];
  const trial = selected !== undefined && selected.trialDays > 0;
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
    const ok = await restorePurchases();
    if (ok) haptic("success");
  }

  const headline = isPremium
    ? "Spotter Pair Pro is on."
    : "One subscription covers both you and your partner.";
  const subhead = isPremium
    ? "Custom stakes, plan changes, full score history and progress charts are unlocked."
    : "Double the accountability with zero excuses.";
  const mascotPose = isPremium ? "rocco-vault-guardian" : "rocco-fist-bump-spotter";

  const ctaLabel = isPremium
    ? "Done"
    : trial && selected
      ? `Start ${selected.trialDays}-day free trial`
      : "Continue";
  const ctaDisabled = !ready || busy || (!isPremium && !selected);
  const ctaInk = ctaDisabled ? theme.colors.textMuted : theme.colors.onPrimary;

  const billing = !selected
    ? null
    : selected.period === "lifetime"
      ? `${selected.price}, one time.`
      : trial
        ? `No charge until day ${selected.trialDays}. Then ${selected.price}/${selected.period}.`
        : `Billed today at ${selected.price}/${selected.period}.`;

  const smallPrint = isPremium
    ? "Manage or cancel your plan in your App Store or Google Play settings."
    : selected?.period === "lifetime"
      ? "One-time purchase."
      : selected
        ? `Renews automatically at ${selected.price}/${selected.period} unless canceled at least 24 hours before the end of the period. Cancel anytime in your App Store or Google Play settings.`
        : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Spotter Pair Pro", headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top + theme.spacing.xs,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Pressable
          onPress={dismissPaywall}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={28} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Stagger step={80} style={{ gap: theme.spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.md,
            }}
          >
            {/* The product's name as a small lockup: the barbell mark, then "Spotter Pair Pro". */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <View>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: -14,
                    top: -18,
                    width: 64,
                    height: 64,
                    overflow: "hidden",
                  }}
                >
                  <Lottie name="sparkle" size={64} />
                </View>
                <Ionicons name="barbell" size={36} color={theme.colors.primary} />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  color: theme.colors.primary,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Spotter Pair Pro
              </Text>
            </View>
            <Rocco pose={mascotPose} size={112} />
          </View>

          <View style={{ gap: theme.spacing.sm, alignItems: "center" }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.display,
                fontWeight: theme.font.weight.bold,
                textAlign: "center",
                lineHeight: 40,
              }}
            >
              {headline}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body,
                textAlign: "center",
              }}
            >
              {subhead}
            </Text>
          </View>

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
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginTop: 2 }}
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
                      fontSize: theme.font.size.body,
                      lineHeight: 22,
                    }}
                  >
                    {perk.body}
                  </Text>
                </View>
              </View>
            ))}
          </Card>

          {isPremium ? (
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                }}
              >
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    You're premium on this phone
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                    }}
                  >
                    {activeOffer
                      ? `${activeOffer.label} · ${activeOffer.price}${
                          activeOffer.period === "lifetime" ? "" : `/${activeOffer.period}`
                        }`
                      : "Every premium feature is unlocked."}
                  </Text>
                </View>
              </View>
            </Card>
          ) : !ready ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Skeleton height={92} radius={theme.radius.lg} />
              <Skeleton height={92} radius={theme.radius.lg} />
            </View>
          ) : offers.length === 0 ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Plans aren't available yet"
              body="The store didn't return any plans. Check your connection and open this screen again."
            />
          ) : (
            <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.sm }}>
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  selected={selected?.id === offer.id}
                  onSelect={() => setChosen(offer.id)}
                />
              ))}
            </View>
          )}
        </Stagger>
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
        {error ? (
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

        {testMode ? (
          <View
            style={{
              alignSelf: "center",
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
              }}
            >
              Test mode: purchases are simulated, nothing is charged.
            </Text>
          </View>
        ) : null}

        {!isPremium && billing ? (
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
              textAlign: "center",
            }}
          >
            {billing}
          </Text>
        ) : null}

        <PressScale
          onPress={isPremium ? dismissPaywall : buy}
          disabled={ctaDisabled}
          haptic="light"
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityState={{ disabled: ctaDisabled }}
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
              {status === "purchasing" ? "Processing…" : ctaLabel}
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
            onPress={restore}
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

        {smallPrint ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            {smallPrint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
