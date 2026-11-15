// Stores: every store in Pip's list, searchable, with how many live codes and deals each has.
// Follow a store and its codes lead Home and Pip's answers.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsButton } from "../../components/offers";
import { SkeletonList } from "../../components/motion";
import { StoreRow } from "../../components/StoreRow";
import { EmptyState, ScreenTitle } from "../../components/ui";
import { deals, useRemote } from "../../data/deals";
import { usePrefs } from "../../data/prefs";
import { INTERESTS, type Store } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

export default function StoresScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const result = useRemote(() => deals.stores(debounced || undefined), debounced);
  const interestLabels = new Set<string>(
    INTERESTS.filter((i) => prefs.interests.includes(i.key)).map((i) => i.key),
  );
  // Followed stores first, then stores in their interests, then the rest (the API sorts by codes).
  const stores = [...(result.data?.stores ?? [])].sort((a, b) => {
    const rank = (s: Store) =>
      prefs.isFollowing(s.slug) ? 0 : interestLabels.has((s.category ?? "").toLowerCase()) ? 1 : 2;
    return rank(a) - rank(b);
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <ScreenTitle>Stores</ScreenTitle>
          </View>
          <SettingsButton onPress={() => router.push("/settings")} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            minHeight: 48,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            borderWidth: 1.5,
            borderColor: focused ? theme.colors.primary : theme.colors.textMuted,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Find a store"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Find a store"
            autoCorrect={false}
            returnKeyType="search"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              outlineStyle: "solid",
              outlineWidth: 0,
            }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {result.loading && !result.data ? (
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList rows={6} />
        </View>
      ) : result.error && !result.data ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn't load stores" body={result.error} actionLabel="Try again" onAction={result.reload} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(s) => s.slug}
          renderItem={({ item }) => <StoreRow store={item} />}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={result.loading} onRefresh={result.reload} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            debounced ? (
              <EmptyState icon="search" title={`No store matches "${debounced}"`} body="Pip adds stores as it finds codes for them. Try another name." />
            ) : (
              <EmptyState icon="storefront-outline" title="No stores yet" body="Pip's store list is still being filled. Pull down to check again soon." />
            )
          }
        />
      )}
    </View>
  );
}
