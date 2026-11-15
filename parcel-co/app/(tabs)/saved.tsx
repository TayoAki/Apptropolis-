// Saved: the codes and deals the person kept, newest first. A saved code whose end date has
// passed stays, marked Expired, until they remove it.
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CouponCard, DealCard, SettingsButton, useSaved } from "../../components/offers";
import { SkeletonList } from "../../components/motion";
import { Segmented } from "../../components/settings/Controls";
import { EmptyState, ScreenTitle } from "../../components/ui";
import { dayDiff } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

type Tab = "codes" | "deals";

export default function SavedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const saved = useSaved();
  const [tab, setTab] = useState<Tab>("codes");

  const items = useMemo(
    () =>
      [...saved.items]
        .filter((s) => (tab === "codes" ? s.kind === "coupon" && s.coupon : s.kind === "deal" && s.deal))
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [saved.items, tab],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <ScreenTitle>Saved</ScreenTitle>
        </View>
        <SettingsButton onPress={() => router.push("/settings")} />
      </View>
      <Segmented<Tab>
        label="Show"
        options={[
          { key: "codes", label: "Codes" },
          { key: "deals", label: "Deals" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {saved.loading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={tab === "codes" ? "No saved codes" : "No saved deals"}
          body="Tap the bookmark on any code or deal to keep it here for later."
          actionLabel="Browse stores"
          onAction={() => router.push("/stores")}
        />
      ) : (
        items.map((item) =>
          item.coupon ? (
            <CouponCard
              key={item.id}
              coupon={item.coupon}
              saved
              expired={Boolean(item.coupon.expiresAt && dayDiff(item.coupon.expiresAt) < 0)}
              onToggleSave={() => void saved.toggleCoupon(item.coupon!)}
            />
          ) : item.deal ? (
            <DealCard key={item.id} deal={item.deal} saved onToggleSave={() => void saved.toggleDeal(item.deal!)} />
          ) : null,
        )
      )}
    </ScrollView>
  );
}
