import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { Lottie } from "../components/lottie";
import { Float, haptic, Mascot, PressScale, Pulse, Skeleton, Stagger } from "../components/motion";
import { EmptyState } from "../components/ui";
import { appInfo } from "../data/app-info";
import { usePurchases } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

type Plan = ReturnType<typeof usePurchases>["offers"][number];

const SUFFIX: Record<Plan["period"], string> = {
  week: "wk",
  month: "mo",
  year: "yr",
  lifetime: "",
};

const PERIOD_WORD: Record<Plan["period"], string> = {
  week: "week",
  month: "month",
  year: "year",
  lifetime: "",
};

const BENEFIT_PROMPT = "a small cardboard parcel box mascot, flat illustration, soft beige";

const BENEFITS: Array<{ title: string; body: string; prompt: string }> = [
  {
    title: "Unlimited AI Order Routing",
    body: "Pip proactively alerts courier changes and reroutes with one tap",
    prompt: "a small cardboard box character holding a folded map, on a light background",
  },
  {
    title: "Complimentary Express Courier",
    body: "Next-day courier on all shop modes with zero minimums",
    prompt: "a cardboard box with motion lines, speeding to the right with a smiling face",
  },
  {
    title: "Extended 60-Day Studio Returns",
    body: "Instant QR returns with complimentary courier doorstep pickup",
    prompt: "a cardboard box with a curved return arrow and a QR code beside it",
  },
];

/** "$29.99" on a yearly plan becomes "($2.50/mo)" (same currency symbol). */
function perMonth(price: string, period: Plan["period"]): string | null {
  if (period !== "year") return null;
  const match = /^(\D*?)([\d.,]+)/.exec(price);
  if (!match) return null;
  const amount = parseFloat(match[2].replace(/,/g, "")) / 12;
  return Number.isFinite(amount) ? `${match[1]}${amount.toFixed(2)}/mo` : null;
}

function Benefit({ title, body, prompt }: { title: string; body: string; prompt: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <AiImage prompt={prompt} fit="contain" style={{ width: 80, height: 80 }} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        {body ? (
          <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 21 }}>
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const suffix = SUFFIX[plan.period];
  const monthly = perMonth(plan.price, plan.period);
  const billing =
    plan.trialDays > 0
      ? `${plan.trialDays} days free trial`
      : plan.period === "lifetime"
        ? "One-time purchase"
        : plan.period === "year"
          ? "Billed yearly"
          : plan.period === "month"
            ? "Billed monthly"
            : "Billed weekly";

  return (
    <PressScale
      onPress={() => {
        if (!selected) haptic("selection");
        onSelect();
      }}
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityLabel={`${plan.label}, ${plan.price}${suffix ? ` per ${PERIOD_WORD[plan.period]}` : ""}`}
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        minWidth: 0,
        marginTop: plan.badge ? theme.spacing.sm : 0,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
        borderRadius: theme.radius.md,
        borderWidth: selected ? 1.5 : 1,
        borderStyle: selected ? "dashed" : "solid",
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {plan.badge ? (
        <View
          style={{
            position: "absolute",
            top: -11,
            left: theme.spacing.md,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.onPrimary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {plan.badge}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {plan.label}
        </Text>
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={22}
          color={selected ? theme.colors.primary : theme.colors.textMuted}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {plan.price}
        </Text>
        {suffix ? (
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              marginBottom: 4,
            }}
          >
            /{suffix}
          </Text>
        ) : null}
      </View>
      {monthly ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontVariant: ["tabular-nums"],
          }}
        >
          ({monthly})
        </Text>
      ) : null}
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.caption }}>{billing}</Text>
    </PressScale>
  );
}

function Footer({
  onRestore,
  restoring,
  termsUrl,
  privacyUrl,
}: {
  onRestore: () => void;
  restoring: boolean;
  termsUrl: string;
  privacyUrl: string;
}) {
  const theme = useTheme();
  const links = [
    { key: "restore", label: restoring ? "Restoring…" : "Restore Purchases", onPress: onRestore },
    ...(termsUrl
      ? [{ key: "terms", label: "Terms", onPress: () => void Linking.openURL(termsUrl) }]
      : []),
    ...(privacyUrl
      ? [
          {
            key: "privacy",
            label: "Privacy Policy",
            onPress: () => void Linking.openURL(privacyUrl),
          },
        ]
      : []),
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {links.map((link, index) => (
        <View key={link.key} style={{ flexDirection: "row", alignItems: "center" }}>
          {index > 0 ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              ·
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={link.label}
            hitSlop={8}
            onPress={link.onPress}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: theme.spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {link.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
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
    premiumFeatures,
    status,
    error,
    purchase,
    restorePurchases,
    dismissPaywall,
  } = usePurchases();

  const [picked, setPicked] = useState<string | null>(null);
  const selected: Plan | undefined =
    offers.find((o) => o.id === (picked ?? defaultOfferId)) ?? offers[0];
  const busy = status !== "idle";
  const trial = selected !== undefined && selected.trialDays > 0;

  const buttonLabel = !selected
    ? "Continue"
    : trial
      ? status === "purchasing"
        ? "Starting your trial…"
        : `Start My ${selected.trialDays}-Day Free Trial`
      : status === "purchasing"
        ? "Processing…"
        : "Continue";

  const shortTerms = !selected
    ? ""
    : selected.period === "lifetime"
      ? "One-time purchase. No subscription."
      : `${trial ? "Then " : ""}${selected.price}/${PERIOD_WORD[selected.period]}. Cancel anytime in App Store settings.`;

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
    await restorePurchases();
  }

  const benefits = premiumFeatures.length
    ? premiumFeatures.map((title) => ({ title, body: "", prompt: BENEFIT_PROMPT }))
    : BENEFITS;

  const clubName = `${appInfo.name} Club`.toUpperCase();
  const premiumView = ready && isPremium;

  const headerRow = premiumView ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
      }}
    >
      <Lottie name="sparkle" size={56} />
      <Text
        accessibilityRole="header"
        style={{
          flexShrink: 1,
          color: theme.colors.text,
          fontFamily: theme.font.family ?? "Georgia",
          fontSize: theme.font.size.display - 6,
          fontWeight: "400",
          textAlign: "center",
        }}
      >
        You're in the Club
      </Text>
    </View>
  ) : (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.colors.text,
        fontFamily: theme.font.family ?? "Georgia",
        fontSize: theme.font.size.display - 6,
        fontWeight: "400",
        lineHeight: 42,
        textAlign: "center",
      }}
    >
      {"Ship free, skip queues,\nask Pip without limits"}
    </Text>
  );

  const benefitList = (
    <View style={{ gap: theme.spacing.sm }}>
      {benefits.map((benefit) => (
        <Benefit
          key={benefit.title}
          title={benefit.title}
          body={benefit.body}
          prompt={benefit.prompt}
        />
      ))}
    </View>
  );

  const plansSection = !ready ? (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
      <Skeleton height={148} radius={theme.radius.md} style={{ flex: 1 }} />
      <Skeleton height={148} radius={theme.radius.md} style={{ flex: 1 }} />
    </View>
  ) : offers.length === 0 ? (
    <EmptyState
      icon="pricetag-outline"
      title="Plans aren't available yet"
      body="The store hasn't returned prices for this app. Restore earlier purchases, or check back shortly."
      actionLabel="Restore purchases"
      onAction={restore}
    />
  ) : (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
      {offers.map((offer) => (
        <PlanCard
          key={offer.id}
          plan={offer}
          selected={selected?.id === offer.id}
          onSelect={() => setPicked(offer.id)}
        />
      ))}
    </View>
  );

  const purchaseSection =
    ready && selected ? (
      <View style={{ gap: theme.spacing.sm }}>
        <Pulse>
          <PressScale
            onPress={buy}
            disabled={busy || offers.length === 0}
            scaleTo={0.97}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            accessibilityState={{ disabled: busy }}
            style={{
              height: 56,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
              opacity: busy || offers.length === 0 ? 0.6 : 1,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 5,
            }}
          >
            <Text
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.body + 2,
                fontWeight: "600",
              }}
            >
              {buttonLabel}
            </Text>
          </PressScale>
        </Pulse>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            textAlign: "center",
          }}
        >
          {shortTerms}
        </Text>
      </View>
    ) : ready ? null : (
      <Skeleton height={56} radius={theme.radius.pill} />
    );

  const premiumSection = (
    <View style={{ alignItems: "center", gap: theme.spacing.md }}>
      <Lottie name="success" size={96} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          textAlign: "center",
        }}
      >
        {activeOffer
          ? `Your ${activeOffer.label.toLowerCase()} plan is active. Everything Club includes is unlocked.`
          : "Club is active on this phone. Everything Club includes is unlocked."}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          textAlign: "center",
        }}
      >
        Change or cancel in App Store or Google Play settings.
      </Text>
      <View style={{ alignSelf: "stretch" }}>
        <PressScale
          onPress={dismissPaywall}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Back to the app"
          style={{
            minHeight: 50,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Back to the app
          </Text>
        </PressScale>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Premium" }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + theme.spacing.xs,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={dismissPaywall}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.text,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Ionicons name="close" size={22} color={theme.colors.background} />
        </Pressable>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.warning,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              letterSpacing: 1.2,
            }}
          >
            {clubName}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          <View style={{ alignItems: "center" }}>
            <Float amplitude={6}>
              <Mascot pose={ready ? "pip-celebrating" : "pip-neutral"} size={260} />
            </Float>
          </View>
          {headerRow}
          {premiumView ? premiumSection : benefitList}
          {premiumView ? null : plansSection}
          {premiumView ? null : purchaseSection}
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: theme.colors.danger,
                fontSize: theme.font.size.body,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          ) : null}
          <Footer
            onRestore={restore}
            restoring={status === "restoring"}
            termsUrl={appInfo.termsUrl}
            privacyUrl={appInfo.privacyUrl}
          />
        </Stagger>
      </ScrollView>
    </View>
  );
}
