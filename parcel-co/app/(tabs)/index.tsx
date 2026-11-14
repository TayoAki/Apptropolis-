import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrackCard } from "../../components/index/TrackCard";
import { Celebrate } from "../../components/lottie";
import { Appear, PressScale, Skeleton, Stagger, useReducedMotion } from "../../components/motion";
import { ProductImage } from "../../components/ProductArt";
import { ModeSwitch } from "../../components/shop/controls";
import {
  EmptyState,
  LoadProblem,
  ScreenTitle,
  SectionTitle,
  useStalled,
  withRetry,
} from "../../components/ui";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { useAuth } from "../../data/auth";
import { useCollection } from "../../data/repo";
import {
  DEFAULT_SHOP_MODE,
  formatDate,
  formatMoney,
  modeLabel,
  shopModeFrom,
  statusLabel,
  type Order,
  type Product,
  type ShopMode,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

function greetingNow(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** The first item's name from "Vitamin C Serum x1, Water-Gel Moisturizer x1". */
function firstItem(items: string): string {
  return items.split(",")[0]?.replace(/\s+x\d+$/, "").trim() || "parcel";
}

/** A product in the picks grid, with a quick-add badge that springs when the count changes. */
function PickCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const count = product.cartQuantity;
  const badge = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    badge.setValue(0.6);
    Animated.spring(badge, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 14,
    }).start();
  }, [count, reduced, badge]);

  return (
    <View
      style={{
        flex: 1,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <ProductImage
        product={product}
        fit="contain"
        style={{ height: 120, borderRadius: theme.radius.sm }}
      />
      <Text
        numberOfLines={2}
        style={{
          minHeight: 44,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          lineHeight: 22,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {product.name}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatMoney(product.price)}
        </Text>
        <PressScale
          onPress={onAdd}
          scaleTo={0.84}
          haptic="light"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            count > 0
              ? `Add another ${product.name} to cart, ${count} in cart`
              : `Add ${product.name} to cart`
          }
          style={{ width: 40, height: 40 }}
        >
          <Animated.View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: count > 0 ? theme.colors.primary : theme.colors.surfaceAlt,
              transform: [{ scale: badge }],
            }}
          >
            {count > 0 ? (
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {count}
              </Text>
            ) : (
              <Ionicons name="add" size={20} color={theme.colors.primary} />
            )}
          </Animated.View>
        </PressScale>
      </View>
    </View>
  );
}

/** A past order in the horizontal list: its first item, the number, status and date. */
function OrderChip({ order, products }: { order: Order; products: Product[] }) {
  const theme = useTheme();
  const item = firstItem(order.items);
  const tone =
    order.status === "delivered"
      ? theme.colors.success
      : order.status === "returned"
        ? theme.colors.warning
        : theme.colors.textMuted;
  const title = order.status === "delivered" ? "Delivered" : statusLabel(order.status);
  return (
    <PressScale
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${statusLabel(order.status)}`}
      style={{
        width: 248,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <ProductImage
        product={products.find((p) => p.name === item)}
        name={item}
        style={{ width: 56, height: 56, borderRadius: theme.radius.sm }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Order #{order.orderNumber}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <Ionicons
            name={
              order.status === "delivered"
                ? "checkmark-circle"
                : order.status === "returned"
                  ? "return-up-back-outline"
                  : "time-outline"
            }
            size={14}
            color={tone}
          />
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: tone,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {title}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          {formatDate(order.estimatedDelivery)}
        </Text>
      </View>
    </PressScale>
  );
}

function HomeScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { answers, setAnswer } = useAppState();
  const orders = useCollection<Order>("orders");
  const products = useCollection<Product>("products");

  const mode = shopModeFrom(answers.shopmode) ?? DEFAULT_SHOP_MODE;
  const loading = orders.loading || products.loading;
  const stalled = useStalled(loading);

  const sorted = useMemo(
    () => [...orders.items].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
    [orders.items],
  );
  const latest = sorted[0];
  const past = sorted.slice(1);
  const picks = useMemo(
    () =>
      products.items
        .filter((p) => p.mode === mode)
        .sort((a, b) => Number(b.isWishlisted) - Number(a.isWishlisted))
        .slice(0, 4),
    [products.items, mode],
  );

  // Confetti only when the latest parcel is delivered while this screen is open.
  const [celebrateAt, setCelebrateAt] = useState(0);
  const lastSeen = useRef<{ id: string; status: string } | null>(null);
  useEffect(() => {
    if (!latest) return;
    const before = lastSeen.current;
    if (
      before &&
      before.id === latest.id &&
      before.status !== "delivered" &&
      latest.status === "delivered"
    ) {
      setCelebrateAt(Date.now());
    }
    lastSeen.current = { id: latest.id, status: latest.status };
  }, [latest?.id, latest?.status]);

  function chooseMode(next: ShopMode) {
    void setAnswer("shopmode", next);
  }

  function addToCart(product: Product) {
    void products.update(product.id, { cartQuantity: product.cartQuantity + 1 });
    track("cart_add", { mode });
  }

  function askPip(params: Record<string, string> = {}) {
    router.push({ pathname: "/assistant", params });
  }

  const name = user?.name?.trim().split(/\s+/)[0];
  const greeting = `${greetingNow()}${name ? `, ${name}` : ""}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ScreenTitle numberOfLines={2}>{greeting}</ScreenTitle>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {formatDate(new Date().toISOString())}
              </Text>
            </View>
            <Link href="/settings" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                hitSlop={10}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  marginRight: -theme.spacing.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
              </Pressable>
            </Link>
          </View>

          {stalled ? (
            <LoadProblem onRetry={onRetry} />
          ) : loading ? (
            <Skeleton height={320} radius={theme.radius.lg} />
          ) : latest ? (
            <TrackCard
              order={latest}
              onTrack={() => router.push({ pathname: "/order/[id]", params: { id: latest.id } })}
              onAsk={() => askPip({ order: latest.id })}
            />
          ) : (
            <EmptyState
              icon="cube-outline"
              title="No parcels yet"
              body="When you check out, Pip follows your parcel here from packing to the front door."
              actionLabel="Start shopping"
              onAction={() => router.push("/shop")}
            />
          )}

          {stalled ? null : loading || past.length > 0 ? (
            <View>
              <SectionTitle title="Recent orders" flush />
              {loading ? (
                <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                  <Skeleton width={248} height={92} radius={theme.radius.md} />
                  <Skeleton width={248} height={92} radius={theme.radius.md} />
                </View>
              ) : (
                <FlatList
                  horizontal
                  data={past}
                  keyExtractor={(order) => order.id}
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -theme.spacing.lg }}
                  contentContainerStyle={{
                    gap: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                  }}
                  renderItem={({ item, index }) => (
                    <Appear delay={Math.min(index, 8) * 50}>
                      <OrderChip order={item} products={products.items} />
                    </Appear>
                  )}
                />
              )}
            </View>
          ) : null}

          {stalled ? null : (
          <View>
            <SectionTitle title="Picks for you" flush />
            <View style={{ marginBottom: theme.spacing.md }}>
              <ModeSwitch value={mode} onChange={chooseMode} />
            </View>
            {loading ? (
              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Skeleton height={230} radius={theme.radius.md} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton height={230} radius={theme.radius.md} />
                </View>
              </View>
            ) : picks.length > 0 ? (
              <FlatList
                data={picks}
                numColumns={2}
                scrollEnabled={false}
                keyExtractor={(product) => product.id}
                columnWrapperStyle={{ gap: theme.spacing.md }}
                renderItem={({ item, index }) => (
                  <Appear
                    delay={Math.min(index, 8) * 50}
                    style={{ flex: 1, marginBottom: theme.spacing.md }}
                  >
                    <PickCard product={item} onAdd={() => addToCart(item)} />
                  </Appear>
                )}
              />
            ) : (
              <EmptyState
                icon="sparkles-outline"
                title={`Nothing in ${modeLabel(mode)} yet`}
                body="Browse the shop to see what's new in this category."
                actionLabel="Browse the shop"
                onAction={() => router.push("/shop")}
              />
            )}
          </View>
          )}
        </Stagger>
      </ScrollView>

      <Celebrate trigger={celebrateAt} />
    </View>
  );
}

export default withRetry(HomeScreen);
