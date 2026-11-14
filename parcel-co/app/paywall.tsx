import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lottie } from "../components/lottie";
import { Float, haptic, PressScale, Pulse, Skeleton, Stagger } from "../components/motion";
import { Pip } from "../components/Pip";
import { ProductArt, type IconName } from "../components/ProductArt";
import {
  DISPLAY_FONT,
  EmptyState,
  InlineNotice,
  PrimaryButton,
  ScreenTitle,
} from "../components/ui";
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

/** Where a subscription is managed on this phone. */
const STORE = Platform.OS === "android" ? "Google Play" : "App Store";

const BENEFIT_PROMPT = "a small cardboard parcel box mascot, flat illustration, soft beige";

/** `icon` stands in for the picture until the project has one for `prompt`. */
const BENEFITS: Array<{ title: string; body: string; prompt: string; icon: IconName }> = [
  {
    title: "Unlimited AI order routing",
    body: "Pip proactively alerts courier changes and reroutes with one tap",
    prompt: "a small cardboard box character holding a folded map, on a light background",
    icon: "map-outline",
  },
  {
    title: "Complimentary express courier",
    body: "Next-day courier on all shop modes with zero minimums",
    prompt: "a cardboard box with motion lines, speeding to the right with a smiling face",
    icon: "flash-outline",
  },
  {
    title: "Extended 60-day studio returns",
    body: "Instant QR returns with complimentary courier doorstep pickup",
    prompt: "a cardboard box with a curved return arrow and a QR code beside it",
    icon: "qr-code-outline",
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

/** One thing the Club includes: a picture or icon, its name, and a line about it. */
function Benefit({
  title,
  body,
  prompt,
  icon,
}: {
  title: string;
  body: string;
  prompt: string;
  icon: IconName;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <ProductArt
        prompt={prompt}
        icon={icon}
        fit="contain"
        label={title}
        style={{ width: 52, height: 52, borderRadius: theme.radius.md }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            lineHeight: 21,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
        {body ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 21 }}>
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
      ? `${plan.trialDays}-day free trial`
      : plan.period === "lifetime"
        ? "One-time purchase"
        : plan.period === "year"
          ? "Billed yearly"
          : plan.period === "month"
            ? "Billed monthly"
            : "Billed weekly";

  return (
    <Pressable
      onPress={() => {
        if (!selected) haptic("selection");
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityLabel={`${plan.label}, ${plan.price}${suffix ? ` per ${PERIOD_WORD[plan.period]}` : ""}, ${billing}`}
      accessibilityState={{ checked: selected, selected }}
      style={({ pressed }) => ({
        flex: 1,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.surfaceAlt : theme.colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {plan.badge ? (
        <View
          style={{
            position: "absolute",
            top: -13,
            left: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
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
      <Text
        style={{
          marginTop: "auto",
          color: theme.colors.text,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {billing}
      </Text>
    </Pressable>
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
    { key: "restore", label: restoring ? "Restoring…" : "Restore purchases", onPress: onRestore },
    ...(termsUrl
      ? [{ key: "terms", label: "Terms", onPress: () => void Linking.openURL(termsUrl) }]
      : []),
    ...(privacyUrl
      ? [
          {
            key: "privacy",
            label: "Privacy policy",
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
        : `Start my ${selected.trialDays}-day free trial`
      : status === "purchasing"
        ? "Processing…"
        : "Continue";

  const shortTerms = !selected
    ? ""
    : selected.period === "lifetime"
      ? "One-time purchase. No subscription."
      : `${trial ? "Then " : ""}${selected.price}/${PERIOD_WORD[selected.period]}. Cancel anytime in ${STORE} settings.`;

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
    ? premiumFeatures.map((title) => ({
        title,
        body: "",
        prompt: BENEFIT_PROMPT,
        icon: "sparkles-outline" as IconName,
      }))
    : BENEFITS;

  const clubName = `${appInfo.name} Club`;
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
      <Lottie name="sparkle" size={48} />
      <ScreenTitle align="center" style={{ flexShrink: 1 }}>
        You're in the Club
      </ScreenTitle>
    </View>
  ) : (
    <ScreenTitle align="center">{"Ship free, skip queues,\nask Pip without limits"}</ScreenTitle>
  );

  const benefitList = (
    <View style={{ gap: theme.spacing.lg }}>
      {benefits.map((benefit) => (
        <Benefit
          key={benefit.title}
          title={benefit.title}
          body={benefit.body}
          prompt={benefit.prompt}
          icon={benefit.icon}
        />
      ))}
    </View>
  );

  const plansSection = !ready ? (
    <View style={{ flexDirection: "row", gap: theme.spacing.md, paddingTop: theme.spacing.md }}>
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
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: "row", gap: theme.spacing.md, paddingTop: theme.spacing.md }}
    >
      {offers.map((offer) => (
        <View key={offer.id} style={{ flex: 1, minWidth: 0 }}>
          <PlanCard
            plan={offer}
            selected={selected?.id === offer.id}
            onSelect={() => setPicked(offer.id)}
          />
        </View>
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
              minHeight: 56,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: theme.spacing.lg,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
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
            lineHeight: 17,
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
        {`Change or cancel in ${STORE} settings.`}
      </Text>
      <View style={{ alignSelf: "stretch" }}>
        <PrimaryButton label="Back to the app" onPress={dismissPaywall} />
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
          gap: theme.spacing.sm,
          paddingTop: insets.top + theme.spacing.xs,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xs,
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
            marginLeft: -theme.spacing.sm,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: theme.colors.text,
            fontFamily: DISPLAY_FONT,
            fontSize: theme.font.size.title,
            lineHeight: 28,
            textAlign: "center",
          }}
        >
          {clubName}
        </Text>
        <View style={{ width: 44 - theme.spacing.sm }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
            <Float amplitude={6}>
              <Pip pose={ready ? "pip-celebrating" : "pip-neutral"} size={148} />
            </Float>
            {headerRow}
          </View>
          {premiumView ? premiumSection : benefitList}
          {premiumView ? null : plansSection}
          <Footer
            onRestore={restore}
            restoring={status === "restoring"}
            termsUrl={appInfo.termsUrl}
            privacyUrl={appInfo.privacyUrl}
          />
        </Stagger>
      </ScrollView>

      {/* The offer's button stays in reach under the scrolling content. */}
      {premiumView ? null : (
        <View
          style={{
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          {error ? (
            <InlineNotice tone="danger" live>
              {error}
            </InlineNotice>
          ) : null}
          {purchaseSection}
        </View>
      )}
      {premiumView && error ? (
        <InlineNotice
          tone="danger"
          live
          style={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg }}
        >
          {error}
        </InlineNotice>
      ) : null}
    </View>
  );
}
