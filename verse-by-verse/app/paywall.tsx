import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
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
import { Emblem, hasArt } from "../components/Art";
import { PrimaryButton } from "../components/PrimaryButton";
import { Appear, Float, PressScale, Skeleton, Stagger, haptic } from "../components/motion";
import {
  OfferCard,
  buyLabel,
  priceLabel,
  termsSentence,
} from "../components/paywall/OfferCard";
import { takePaywallSource } from "../components/paywall/source";
import { useSavedTheme } from "../components/reading";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { BIBLE_TOTALS } from "../data/bible";
import { PAYWALL_ENABLED } from "../data/launch";
import { dismissPaywall, usePurchases } from "../data/purchases";
import { useCollection } from "../data/repo";
import { FREE_KEYWORD_RESULTS, type StudyNote } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

const BANNER_PROMPT =
  "Engraved ribbon banner illustration with a floral crest and the text 'VERSE BY VERSE PATRON' in a scroll shape, centered at the top of the screen";

type FooterLinkItem = {
  key: string;
  label: string;
  onPress: () => void;
  role: "button" | "link";
  disabled?: boolean;
};

/** "3 verses", "1 book". */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The /paywall route. With the paywall off (data/launch.ts) it shows nothing and goes straight
 * back to where it was opened from, or home; with it on, the paywall below.
 */
export default function PaywallRoute() {
  return PAYWALL_ENABLED ? <PaywallScreen /> : <PaywallOff />;
}

/** The paywall is off: leave at once, without showing a plan or a price. */
function PaywallOff() {
  const theme = useTheme();
  useEffect(() => {
    dismissPaywall();
  }, []);
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

/**
 * The paywall. Someone on the free plan sees what stays free, what premium adds, each plan with
 * the price that renews, and the terms of the chosen plan in a plain sentence above the button.
 * A subscriber sees their plan instead of the offer.
 */
function PaywallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const serif = { fontFamily: theme.font.family };
  useSavedTheme();
  const {
    ready,
    isPremium,
    activeOffer,
    entitlement,
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
  const notes = useCollection<StudyNote>("study_notes");

  const [chosenId, setChosenId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  // Where this paywall was opened from, for the owner's analytics.
  const [source] = useState(takePaywallSource);

  useEffect(() => {
    track("paywall_shown", { source });
    return () => track("paywall_closed", { source });
  }, [source]);

  const selected = offers.find((o) => o.id === (chosenId ?? defaultOfferId)) ?? offers[0] ?? null;
  const busy = status !== "idle";
  const canBuy = ready && !isPremium && offers.length > 0;
  const store = Platform.OS === "ios" ? "App Store" : "Google Play";

  // What is free, counted from the Bible the app ships with rather than promised.
  const library = `The whole World English Bible: all ${count(BIBLE_TOTALS.books, "book", "books")}, ${BIBLE_TOTALS.chapters.toLocaleString()} chapters`;
  const studyNotes =
    notes.items.length > 0
      ? `all ${count(notes.items.length, "study note", "study notes")}`
      : "the study notes";
  const freeLine = `${library}, ${studyNotes}, bookmarks, sharing, the daily reminder and search by reference. Keyword search covers every book and shows the first ${FREE_KEYWORD_RESULTS} matches.`;

  function choose(id: string) {
    if (busy || id === selected?.id) return;
    haptic("selection");
    setChosenId(id);
  }

  async function buy() {
    if (!selected || busy) return;
    const ok = await purchase(selected.id);
    if (ok) {
      haptic("success");
      dismissPaywall();
    }
  }

  async function restore() {
    setRestored(await restorePurchases());
  }

  const links: FooterLinkItem[] = [];
  if (ready && !isPremium)
    links.push({
      key: "restore",
      label: status === "restoring" ? "Restoring…" : "Restore purchases",
      onPress: () => void restore(),
      role: "button",
      disabled: busy,
    });
  if (appInfo.termsUrl)
    links.push({
      key: "terms",
      label: "Terms of use",
      onPress: () => void Linking.openURL(appInfo.termsUrl),
      role: "link",
    });
  if (appInfo.privacyUrl)
    links.push({
      key: "privacy",
      label: "Privacy policy",
      onPress: () => void Linking.openURL(appInfo.privacyUrl),
      role: "link",
    });

  // The purchase button stays pinned under the plans, with the chosen plan's terms above it.
  const showCta = canBuy && selected !== null;

  const sectionHeading = {
    ...serif,
    color: theme.colors.text,
    fontSize: theme.font.size.title,
    fontWeight: theme.font.weight.bold,
  } as const;
  const bodyText = {
    color: theme.colors.text,
    fontSize: theme.font.size.body,
    lineHeight: 24,
  } as const;
  const finePrint = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption,
    lineHeight: theme.font.size.caption * 1.4,
    textAlign: "center",
  } as const;

  const featureList = (
    <View style={{ gap: theme.spacing.sm }}>
      {premiumFeatures.map((feature) => (
        <View
          key={feature}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
        >
          <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
          <Text style={{ ...bodyText, flex: 1 }}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  const errorLine = error ? (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
      }}
    >
      <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
      <Text
        style={{
          flexShrink: 1,
          color: theme.colors.danger,
          fontSize: theme.font.size.caption,
          lineHeight: theme.font.size.caption * 1.4,
        }}
      >
        {error}
      </Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Premium", headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: "row",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={dismissPaywall}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: showCta ? theme.spacing.lg : insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          {/* The ribbon banner is drawn with its text inside the artwork and floats gently.
              Until that artwork exists, the patron emblem stands in for it. */}
          {hasArt(BANNER_PROMPT) ? (
            <Float amplitude={4} duration={3200}>
              <AiImage
                prompt={BANNER_PROMPT}
                fit="contain"
                style={{ alignSelf: "center", width: 260, height: 150 }}
              />
            </Float>
          ) : (
            <Emblem icon="ribbon-outline" size={56} style={{ alignSelf: "center" }} />
          )}
          <Text
            accessibilityRole="header"
            style={{
              ...serif,
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
              lineHeight: theme.font.size.headline * 1.2,
              textAlign: "center",
            }}
          >
            {isPremium ? "You're a Patron" : "Become a Patron"}
          </Text>
          <Text
            style={{
              ...serif,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              lineHeight: theme.font.size.body * 1.4,
              textAlign: "center",
            }}
          >
            {isPremium
              ? "Thank you for supporting the craft. Every study tool is open to you."
              : "Reading stays free. Premium supports the app and adds the study tools below."}
          </Text>
        </View>

        {!ready ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading plans"
            style={{ gap: theme.spacing.md }}
          >
            <Skeleton height={84} radius={theme.radius.md} />
            <Skeleton height={84} radius={theme.radius.md} />
            <Skeleton height={84} radius={theme.radius.md} />
          </View>
        ) : isPremium ? (
          <Appear>
            <View style={{ gap: theme.spacing.xl }}>
              <View
                style={{
                  gap: theme.spacing.xs,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  <Text
                    style={{
                      flex: 1,
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {activeOffer ? `${activeOffer.label} plan` : "Premium is active"}
                  </Text>
                </View>
                {activeOffer ? (
                  <Text style={{ ...bodyText, fontVariant: ["tabular-nums"] }}>
                    {priceLabel(activeOffer)}
                  </Text>
                ) : null}
                {entitlement ? (
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                      lineHeight: theme.font.size.caption * 1.4,
                    }}
                  >
                    {`Started ${new Date(entitlement.since).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}. ${
                      activeOffer?.period === "lifetime"
                        ? "A one-time purchase: nothing renews."
                        : `Manage or cancel it in ${store} subscription settings.`
                    }`}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: theme.spacing.md }}>
                <Text accessibilityRole="header" style={sectionHeading}>
                  Included in your plan
                </Text>
                {featureList}
              </View>

              <PrimaryButton label="Back to reading" onPress={dismissPaywall} />
            </View>
          </Appear>
        ) : (
          <>
            <Stagger step={50} delay={80} style={{ gap: theme.spacing.lg }}>
              <View style={{ gap: theme.spacing.sm }}>
                <Text accessibilityRole="header" style={sectionHeading}>
                  Free, always
                </Text>
                <Text style={bodyText}>{freeLine}</Text>
              </View>
              <View style={{ gap: theme.spacing.md }}>
                <Text accessibilityRole="header" style={sectionHeading}>
                  Premium adds
                </Text>
                {featureList}
              </View>
            </Stagger>

            {offers.length === 0 ? (
              <Appear>
                <View
                  style={{
                    alignItems: "center",
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={32}
                    color={theme.colors.textMuted}
                  />
                  <Text style={{ ...sectionHeading, textAlign: "center" }}>
                    Plans aren't loaded yet
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.body,
                      lineHeight: theme.font.size.body * 1.4,
                      textAlign: "center",
                    }}
                  >
                    The store didn't return plans. Reading the Bible stays free while you wait.
                  </Text>
                  {errorLine}
                  <PrimaryButton label="Keep reading" variant="quiet" onPress={dismissPaywall} />
                </View>
              </Appear>
            ) : (
              <Appear delay={200}>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Plans"
                  style={{ gap: theme.spacing.md, paddingTop: theme.spacing.sm }}
                >
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      offers={offers}
                      selected={offer.id === selected?.id}
                      disabled={busy}
                      onSelect={() => choose(offer.id)}
                    />
                  ))}
                </View>
              </Appear>
            )}
          </>
        )}

        <View style={{ gap: theme.spacing.sm, alignItems: "center" }}>
          {links.length > 0 ? (
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
                    <Text style={{ color: theme.colors.textMuted, marginHorizontal: theme.spacing.sm }}>
                      ·
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole={link.role}
                    accessibilityLabel={link.label}
                    accessibilityState={{ disabled: link.disabled }}
                    disabled={link.disabled}
                    onPress={link.onPress}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
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
          ) : null}

          {restored && isPremium ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ ...finePrint, color: theme.colors.success }}
            >
              Your purchases are restored.
            </Text>
          ) : null}

          {testMode && ready ? (
            <Text style={{ ...finePrint, color: theme.colors.warning }}>
              Test mode: purchases are simulated, nothing is charged.
            </Text>
          ) : null}

          <Text style={finePrint}>
            The World English Bible is in the public domain. Reading it here stays free.
          </Text>
        </View>
      </ScrollView>

      {showCta && selected ? (
        <View
          style={{
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          {/* The whole deal for the chosen plan, in words, before the button. */}
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.caption,
              lineHeight: theme.font.size.caption * 1.4,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {termsSentence(selected, store)}
          </Text>
          {errorLine}
          <PressScale
            onPress={buy}
            disabled={busy}
            scaleTo={0.97}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={status === "purchasing" ? "Confirming purchase" : buyLabel(selected)}
            accessibilityState={{ disabled: busy, busy }}
            style={{
              minHeight: 56,
              borderRadius: theme.radius.pill,
              backgroundColor: busy ? theme.colors.surfaceAlt : theme.colors.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            {status === "purchasing" ? <ActivityIndicator color={theme.colors.textMuted} /> : null}
            <Text
              style={{
                color: busy ? theme.colors.textMuted : theme.colors.onPrimary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                textAlign: "center",
              }}
            >
              {status === "purchasing" ? "Confirming…" : buyLabel(selected)}
            </Text>
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}
