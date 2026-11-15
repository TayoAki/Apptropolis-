// Home: ask Pip before you buy, then the codes for the stores you follow, the newest codes and
// the biggest price drops. Everything shown comes from the Pip API; nothing is made up here.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CouponCard, DealCard, SettingsButton, useSaved } from "../../components/offers";
import { Appear, haptic, PressScale, SkeletonList } from "../../components/motion";
import { Pip } from "../../components/Pip";
import { EmptyState, ScreenTitle, SectionTitle } from "../../components/ui";
import { affiliateLinks } from "../../data/deals-config";
import { deals, useRemote } from "../../data/deals";
import { usePrefs } from "../../data/prefs";
import { seenLabel } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Questions to start from: the first store they follow, then two everyday ones. */
function suggestions(storeNames: string[]): string[] {
  const first = storeNames[0];
  return [
    first ? `Any codes for ${first}?` : "Is there a code for Nike?",
    "Gift ideas under $40",
    "What's the best deal today?",
  ];
}

function askPip(question: string) {
  const q = question.trim();
  if (!q) return;
  haptic("light");
  router.push({ pathname: "/assistant", params: { q } });
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const saved = useSaved();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const feed = useRemote(
    () => deals.feed(prefs.stores, prefs.interests),
    `${prefs.stores.join(",")}|${prefs.interests.join(",")}`,
  );

  const data = feed.data;
  const empty = data && !data.followed.length && !data.coupons.length && !data.deals.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl * 2,
        gap: theme.spacing.md,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={feed.loading && Boolean(data)} onRefresh={feed.reload} tintColor={theme.colors.primary} />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Pip pose="pip-neutral" size={44} />
        <View style={{ flex: 1 }}>
          <ScreenTitle>Pip</ScreenTitle>
        </View>
        <SettingsButton onPress={() => router.push("/settings")} />
      </View>

      {/* The habit: ask before you pay. */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.colors.text, fontSize: theme.font.size.title, fontWeight: theme.font.weight.bold }}
          >
            About to buy something?
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 22 }}>
            Ask Pip first. It checks the codes and deals it has collected and tells you which one to use.
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => {
              askPip(draft);
              setDraft("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What are you buying, and where?"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="send"
            accessibilityLabel="Ask Pip"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              borderWidth: 1.5,
              borderColor: focused ? theme.colors.primary : theme.colors.textMuted,
              outlineStyle: "solid",
              outlineWidth: 0,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
            }}
          />
          <PressScale
            onPress={() => {
              askPip(draft);
              setDraft("");
            }}
            disabled={!draft.trim()}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Ask Pip"
            accessibilityState={{ disabled: !draft.trim() }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: draft.trim() ? theme.colors.primary : theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name="send" size={18} color={draft.trim() ? theme.colors.onPrimary : theme.colors.textMuted} />
          </PressScale>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {suggestions(prefs.storeNames).map((q) => (
            <PressScale
              key={q}
              onPress={() => askPip(q)}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={`Ask Pip: ${q}`}
              style={{
                minHeight: 40,
                justifyContent: "center",
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: theme.colors.primary,
              }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.medium }}>
                {q}
              </Text>
            </PressScale>
          ))}
        </View>
      </View>

      {feed.loading && !data ? (
        <SkeletonList rows={3} />
      ) : feed.error && !data ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load deals"
          body={feed.error}
          actionLabel="Try again"
          onAction={feed.reload}
        />
      ) : empty ? (
        <EmptyState
          icon="pricetags-outline"
          title="No codes yet"
          body="Pip's list of codes and deals is still being filled. Pull down to check again soon."
          actionLabel="Check again"
          onAction={feed.reload}
        />
      ) : data ? (
        <>
          {prefs.stores.length === 0 ? (
            <PressScale
              onPress={() => router.push("/stores")}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel="Follow your stores"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.md,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Ionicons name="storefront-outline" size={24} color={theme.colors.primary} />
              <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
                Follow the stores you buy from and their codes show up here first.
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressScale>
          ) : null}

          {data.followed.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionTitle title="Codes for your stores" flush />
              {data.followed.slice(0, 6).map((c, i) => (
                <Appear key={c.key} delay={i * 50}>
                  <CouponCard coupon={c} saved={saved.isSaved(c.key)} onToggleSave={() => void saved.toggleCoupon(c)} />
                </Appear>
              ))}
            </View>
          ) : prefs.stores.length ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 22 }}>
              {`No codes for ${prefs.storeNames.slice(0, 3).join(", ")}${prefs.storeNames.length > 3 ? " and the rest" : ""} right now. Pip adds them as it finds them.`}
            </Text>
          ) : null}

          {data.coupons.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionTitle title="New codes" flush />
              {data.coupons.slice(0, 6).map((c) => (
                <CouponCard key={c.key} coupon={c} saved={saved.isSaved(c.key)} onToggleSave={() => void saved.toggleCoupon(c)} />
              ))}
            </View>
          ) : null}

          {data.deals.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionTitle title="Price drops" flush />
              {data.deals.slice(0, 6).map((d) => (
                <DealCard key={d.key} deal={d} saved={saved.isSaved(d.key)} onToggleSave={() => void saved.toggleDeal(d)} />
              ))}
            </View>
          ) : null}

          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}>
            {[
              data.updatedAt ? `Pip's list was last updated: ${seenLabel(data.updatedAt).replace("Seen ", "").toLowerCase()}.` : null,
              "Codes come from public coupon and store sites and can stop working. Only codes marked Tested were tried at a checkout.",
              affiliateLinks ? "Some Shop and View deal links are affiliate links: Pip may earn a commission, at no cost to you." : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}
