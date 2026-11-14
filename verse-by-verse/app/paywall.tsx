import { Ionicons } from "@expo/vector-icons";
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
import { PrimaryButton } from "../components/PrimaryButton";
import { Lottie } from "../components/lottie";
import { Appear, Float, Pulse, PressScale, Skeleton, Stagger, haptic } from "../components/motion";
import { OfferCard, priceLabel } from "../components/paywall/OfferCard";
import { appInfo } from "../data/app-info";
import { usePurchases } from "../data/purchases";
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

export default function PaywallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const serif = { fontFamily: theme.font.family };
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

  const [chosenId, setChosenId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const selected = offers.find((o) => o.id === (chosenId ?? defaultOfferId)) ?? offers[0] ?? null;
  const busy = status !== "idle";
  const canBuy = ready && !isPremium && offers.length > 0;
  const store = Platform.OS === "ios" ? "App Store" : "Google Play";
  const ctaLabel =
    selected && selected.trialDays > 0
      ? `Start ${selected.trialDays}-Day Free Trial`
      : "Continue";

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
  if (canBuy)
    links.push({
      key: "restore",
      label: status === "restoring" ? "Restoring…" : "Restore Purchases",
      onPress: () => void restore(),
      role: "button",
      disabled: busy,
    });
  if (appInfo.termsUrl)
    links.push({
      key: "terms",
      label: "Terms of Use",
      onPress: () => void Linking.openURL(appInfo.termsUrl),
      role: "link",
    });
  if (appInfo.privacyUrl)
    links.push({
      key: "privacy",
      label: "Privacy Policy",
      onPress: () => void Linking.openURL(appInfo.privacyUrl),
      role: "link",
    });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Go Premium", headerShown: false }} />

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
          hitSlop={14}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        {/* The ribbon banner is drawn with its text inside the artwork; it floats gently. */}
        <Float amplitude={4} duration={3200}>
          <AiImage
            prompt={BANNER_PROMPT}
            fit="contain"
            style={{ alignSelf: "center", width: 260, height: 150 }}
          />
        </Float>

        <Appear delay={80}>
          <View style={{ gap: theme.spacing.sm }}>
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
              Deeper reflection. Zero clutter.
            </Text>
            <Text
              style={{
                ...serif,
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                lineHeight: theme.font.size.body * 1.4,
                textAlign: "center",
              }}
            >
              Reading Scripture is always free. Support thoughtful craftsmanship and unlock deep
              study tools.
            </Text>
          </View>
        </Appear>

        <Stagger step={50} delay={160} style={{ gap: theme.spacing.md }}>
          {premiumFeatures.map((feature) => (
            <View
              key={feature}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
            >
              <Ionicons
                name="checkmark"
                size={22}
                color={theme.colors.accent}
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  ...serif,
                  flex: 1,
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  lineHeight: theme.font.size.body * 1.3,
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </Stagger>

        {!ready ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading plans"
            style={{ gap: theme.spacing.md }}
          >
            <Skeleton height={96} radius={theme.radius.md} />
            <Skeleton height={96} radius={theme.radius.md} />
            <Skeleton height={96} radius={theme.radius.md} />
            <Skeleton height={56} radius={theme.radius.pill} />
          </View>
        ) : isPremium ? (
          <Appear>
            <View
              style={{
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Lottie name="success" size={96} />
              <Text
                accessibilityRole="header"
                style={{
                  ...serif,
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  textAlign: "center",
                }}
              >
                You're a Patron
              </Text>
              <Text
                style={{
                  ...serif,
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  textAlign: "center",
                }}
              >
                {activeOffer
                  ? `${activeOffer.label} plan, ${priceLabel(activeOffer)}`
                  : "Premium is active on this phone."}
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
                Thank you for supporting the craft. Every study tool is open to you.
              </Text>
              <View style={{ alignSelf: "stretch", marginTop: theme.spacing.sm }}>
                <PrimaryButton label="Back to reading" onPress={dismissPaywall} />
              </View>
            </View>
          </Appear>
        ) : offers.length === 0 ? (
          <Appear>
            <View
              style={{
                alignItems: "center",
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textMuted} />
              <Text
                style={{
                  ...serif,
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  textAlign: "center",
                }}
              >
                Plans aren't loaded yet
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
                The store didn't return plans. Reading the Bible stays free while you wait.
              </Text>
              <PrimaryButton label="Keep reading" variant="quiet" onPress={dismissPaywall} />
            </View>
          </Appear>
        ) : (
          <>
            <Appear delay={280}>
              <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.md }}>
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    selected={offer.id === selected?.id}
                    onSelect={() => choose(offer.id)}
                  />
                ))}
              </View>
            </Appear>

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

            {selected ? (
              <Appear delay={360}>
                <Pulse every={3200} scale={1.015}>
                  <PressScale
                    onPress={buy}
                    disabled={busy}
                    scaleTo={0.97}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityLabel={ctaLabel}
                    accessibilityState={{ disabled: busy, busy }}
                    style={{
                      minHeight: 56,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.primary,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.lg,
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    {status === "purchasing" ? (
                      <ActivityIndicator color={theme.colors.onPrimary} />
                    ) : null}
                    <Text
                      style={{
                        ...serif,
                        color: theme.colors.onPrimary,
                        fontSize: theme.font.size.title,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {status === "purchasing" ? "Confirming…" : ctaLabel}
                    </Text>
                  </PressScale>
                </Pulse>
              </Appear>
            ) : null}
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
                    disabled={link.disabled}
                    onPress={link.onPress}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: "center",
                      opacity: pressed || link.disabled ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...serif,
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

          {restored ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: theme.colors.success,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
                textAlign: "center",
              }}
            >
              Your purchases are restored.
            </Text>
          ) : null}

          {testMode && ready ? (
            <Text
              style={{
                color: theme.colors.warning,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
                textAlign: "center",
              }}
            >
              Test mode: purchases are simulated, nothing is charged.
            </Text>
          ) : null}

          {canBuy && selected && selected.period !== "lifetime" ? (
            <Text
              style={{
                ...serif,
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
              }}
            >
              {`Cancel anytime in ${store} settings.`}
            </Text>
          ) : null}

          {isPremium ? (
            <Text
              style={{
                ...serif,
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
              }}
            >
              {`Manage your plan in ${store} settings.`}
            </Text>
          ) : null}

          <Text
            style={{
              ...serif,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            Public domain WEB translation remains 100% free forever.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
