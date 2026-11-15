// A store in a list: its logo, name, live code and deal counts, and Follow. Used by Stores, a
// store's page and setup.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { usePrefs } from "../data/prefs";
import type { Store } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { haptic, PressScale } from "./motion";
import { StoreAvatar } from "./offers";

export function FollowButton({ store }: { store: Pick<Store, "slug" | "name"> }) {
  const theme = useTheme();
  const prefs = usePrefs();
  const following = prefs.isFollowing(store.slug);
  return (
    <PressScale
      onPress={() => {
        haptic("selection");
        void prefs.toggleStore(store);
      }}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={following ? `Unfollow ${store.name}` : `Follow ${store.name}`}
      accessibilityState={{ selected: following }}
      style={{
        minHeight: 36,
        minWidth: 92,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        backgroundColor: following ? theme.colors.primary : "transparent",
      }}
    >
      {following ? <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} /> : null}
      <Text
        style={{
          color: following ? theme.colors.onPrimary : theme.colors.primary,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {following ? "Following" : "Follow"}
      </Text>
    </PressScale>
  );
}

function counts(store: Store): string {
  const parts = [
    store.couponCount ? `${store.couponCount} ${store.couponCount === 1 ? "code" : "codes"}` : null,
    store.dealCount ? `${store.dealCount} ${store.dealCount === 1 ? "deal" : "deals"}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No live codes right now";
}

export function StoreRow({ store }: { store: Store }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Pressable
        onPress={() => router.push({ pathname: "/store/[slug]", params: { slug: store.slug } })}
        accessibilityRole="button"
        accessibilityLabel={`${store.name}. ${counts(store)}`}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <StoreAvatar name={store.name} logoUrl={store.logoUrl} size={44} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
            {store.name}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {[store.category, counts(store)].filter(Boolean).join(" · ")}
          </Text>
          {store.cashback ? (
            <Text numberOfLines={1} style={{ color: theme.colors.success, fontSize: theme.font.size.caption }}>
              {store.cashback}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <FollowButton store={store} />
    </View>
  );
}
