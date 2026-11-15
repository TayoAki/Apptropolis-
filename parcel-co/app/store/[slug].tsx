// One store: its live codes, then its deals, with Follow, Shop and Ask Pip about it.
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { CouponCard, DealCard, openLink, StoreAvatar, useSaved } from "../../components/offers";
import { PressScale, SkeletonList } from "../../components/motion";
import { EmptyState, navTitleStyle, SectionTitle } from "../../components/ui";
import { appStructure } from "../../data/app-structure";
import { useAppState } from "../../data/app-state";
import { affiliateLinks } from "../../data/deals-config";
import { deals, useRemote } from "../../data/deals";
import { useTheme } from "../../theme/ThemeProvider";
import { FollowButton } from "../../components/StoreRow";

export default function StoreScreen() {
  const theme = useTheme();
  const { ready, onboarded } = useAppState();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const saved = useSaved();
  const page = useRemote(() => deals.store(String(slug)), String(slug));
  const [problem, setProblem] = useState<string | null>(null);

  if (appStructure.onboarding && ready && !onboarded) return <Redirect href="/onboarding" />;

  const store = page.data?.store;
  const shopUrl = store
    ? (store.affiliateUrl ?? (store.domain ? `https://${store.domain}` : null))
    : null;

  return (
    <>
      <Stack.Screen
        options={{ title: store?.name ?? "Store", headerTitleStyle: navTitleStyle(theme) }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={page.loading && Boolean(page.data)}
            onRefresh={page.reload}
            tintColor={theme.colors.primary}
          />
        }
      >
        {page.loading && !page.data ? (
          <SkeletonList rows={4} />
        ) : page.error && !page.data ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load this store"
            body={page.error}
            actionLabel="Try again"
            onAction={page.reload}
          />
        ) : store && page.data ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <StoreAvatar name={store.name} logoUrl={store.logoUrl} size={56} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text
                  accessibilityRole="header"
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {store.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                >
                  {[store.domain, store.category].filter(Boolean).join(" · ")}
                </Text>
                {store.cashback ? (
                  <Text style={{ color: theme.colors.success, fontSize: theme.font.size.caption }}>
                    {store.cashback}
                  </Text>
                ) : null}
              </View>
              <FollowButton store={store} />
            </View>

            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PressScale
                  onPress={() =>
                    router.push({
                      pathname: "/assistant",
                      params: { q: `What's the best code for ${store.name}?` },
                    })
                  }
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask Pip about ${store.name}`}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.xs,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={theme.colors.onPrimary}
                  />
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Ask Pip
                  </Text>
                </PressScale>
              </View>
              {shopUrl ? (
                <View style={{ flex: 1 }}>
                  <PressScale
                    onPress={async () => setProblem(await openLink(shopUrl, store.name))}
                    scaleTo={0.97}
                    accessibilityRole="link"
                    accessibilityLabel={`Shop at ${store.name}`}
                    style={{
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: theme.spacing.xs,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {`Shop ${store.name}`}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
                  </PressScale>
                </View>
              ) : null}
            </View>
            {problem ? (
              <Text
                accessibilityRole="alert"
                style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}
              >
                {problem}
              </Text>
            ) : null}

            <SectionTitle
              title={page.data.coupons.length ? `Codes (${page.data.coupons.length})` : "Codes"}
              flush
            />
            {page.data.coupons.length ? (
              page.data.coupons.map((c) => (
                <CouponCard
                  key={c.key}
                  coupon={c}
                  showStore={false}
                  saved={saved.isSaved(c.key)}
                  onToggleSave={() => void saved.toggleCoupon(c)}
                />
              ))
            ) : (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  lineHeight: 22,
                }}
              >
                {`No live codes for ${store.name} right now. Follow it and new ones show up on Home.`}
              </Text>
            )}

            {page.data.deals.length ? (
              <>
                <SectionTitle title={`Deals (${page.data.deals.length})`} flush />
                {page.data.deals.map((d) => (
                  <DealCard
                    key={d.key}
                    deal={d}
                    saved={saved.isSaved(d.key)}
                    onToggleSave={() => void saved.toggleDeal(d)}
                  />
                ))}
              </>
            ) : null}

            {affiliateLinks ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  lineHeight: 17,
                }}
              >
                Some links here are affiliate links: Pip may earn a commission, at no cost to you.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
