import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Appear, CountUp, Mascot, PressScale, Skeleton, Stagger } from "../../components/motion";
import { ProductImage } from "../../components/ProductArt";
import { CartPill, InStockChip, ModeSwitch, WishlistButton } from "../../components/shop/controls";
import {
  EmptyState,
  LoadProblem,
  ScreenTitle,
  useStalled,
  withRetry,
} from "../../components/ui";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import {
  DEFAULT_SHOP_MODE,
  cartCount,
  cartSubtotal,
  categoryLabel,
  formatMoney,
  modeLabel,
  shopModeFrom,
  type Order,
  type Product,
  type ShopMode,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** A product can carry stock information; one without it is in stock. */
type ShopProduct = Product & { inStock?: boolean };

const BAR_HEIGHT = 52;

/** Short enough to fit the search field beside the In stock chip on a small phone. */
const SEARCH_HINT: Record<ShopMode, string> = {
  style: "Tops, knitwear, bags",
  glow: "Serums, oils, masks",
  home: "Candles, kitchen, decor",
  pantry: "Oils, coffee, tea",
};

function matches(product: Product, needle: string): boolean {
  return [product.name, product.category, product.description].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

function ProductCard({
  product,
  onSave,
  onAdd,
  onOpenCart,
}: {
  product: ShopProduct;
  onSave: () => void;
  onAdd: () => void;
  onOpenCart: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={`${product.name}. ${product.description}`}
      style={{
        flex: 1,
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          height: 150,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceAlt,
          overflow: "hidden",
        }}
      >
        <ProductImage
          product={product}
          fit="contain"
          style={{ width: "100%", height: "100%", borderRadius: 0 }}
        />
        <View style={{ position: "absolute", top: 0, right: 0 }}>
          <WishlistButton saved={product.isWishlisted} name={product.name} onToggle={onSave} />
        </View>
      </View>
      <Text
        numberOfLines={2}
        style={{
          minHeight: 44,
          marginTop: theme.spacing.xs,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          lineHeight: 22,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {product.name}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
      >
        {categoryLabel(product.category)}
      </Text>
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
      <View style={{ marginTop: theme.spacing.xs }}>
        <CartPill
          name={product.name}
          quantity={product.cartQuantity}
          onAdd={onAdd}
          onOpenCart={onOpenCart}
        />
      </View>
    </View>
  );
}

function ShopScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const products = useCollection<ShopProduct>("products");
  const orders = useCollection<Order>("orders");

  const saved = shopModeFrom(answers.shopmode);
  const [mode, setMode] = useState<ShopMode>(saved ?? DEFAULT_SHOP_MODE);
  // Open on the default shop mode, and follow it when it is changed on Home or in Settings.
  useEffect(() => {
    if (saved) setMode(saved);
  }, [saved]);
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searching, setSearching] = useState(false);
  const stalled = useStalled(products.loading);

  const needle = query.trim().toLowerCase();
  const inMode = products.items.filter((product) => product.mode === mode);
  const visible = inMode.filter(
    (product) =>
      (!inStockOnly || product.inStock !== false) && (!needle || matches(product, needle)),
  );
  const count = cartCount(products.items);
  const subtotal = cartSubtotal(products.items);
  const activeOrder = orders.items.find(
    (order) => order.status !== "delivered" && order.status !== "returned",
  );
  const pose = activeOrder?.status === "out_for_delivery" ? "pip-delivering" : "pip-neutral";

  function openCart() {
    router.push("/checkout");
  }

  function addToCart(product: ShopProduct) {
    if (product.cartQuantity === 0) track("add_to_cart", { mode: product.mode });
    void products.update(product.id, { cartQuantity: product.cartQuantity + 1 });
  }

  function toggleSaved(product: ShopProduct) {
    if (!product.isWishlisted) track("wishlist_save", { mode: product.mode });
    void products.update(product.id, { isWishlisted: !product.isWishlisted });
  }

  const header = (
    <Stagger step={70} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <ScreenTitle numberOfLines={1} style={{ flex: 1 }}>
          Boutique catalog
        </ScreenTitle>
        <Pressable
          onPress={() => router.push("/assistant")}
          accessibilityRole="button"
          accessibilityLabel={activeOrder ? "Ask Pip where your package is" : "Ask Pip"}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ pointerEvents: "none" }}>
            <Mascot pose={pose} size={34} />
          </View>
        </Pressable>
        <Pressable
          onPress={openCart}
          accessibilityRole="button"
          accessibilityLabel={
            count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"
          }
          hitSlop={6}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            marginRight: -theme.spacing.sm,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="bag-handle-outline" size={26} color={theme.colors.text} />
          {count > 0 ? (
            <View
              style={{
                position: "absolute",
                top: 2,
                right: 0,
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                paddingHorizontal: 5,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {count > 99 ? "99+" : count}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ModeSwitch value={mode} onChange={setMode} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            height: 44,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            borderWidth: 1.5,
            borderColor: searching ? theme.colors.primary : theme.colors.textMuted,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={SEARCH_HINT[mode]}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={`Search ${modeLabel(mode)} products`}
            returnKeyType="search"
            autoCorrect={false}
            onFocus={() => setSearching(true)}
            onBlur={() => setSearching(false)}
            style={{
              flex: 1,
              minWidth: 0,
              height: 40,
              outlineWidth: 0,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              paddingVertical: 0,
            }}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <InStockChip selected={inStockOnly} onPress={() => setInStockOnly((on) => !on)} />
      </View>
    </Stagger>
  );

  const empty: ReactNode = stalled ? (
    <LoadProblem onRetry={onRetry} />
  ) : products.loading ? (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading products"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}
    >
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            width: "48%",
            gap: theme.spacing.sm,
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Skeleton height={150} radius={theme.radius.sm} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="55%" height={12} />
          <Skeleton width="40%" height={16} />
          <Skeleton height={40} radius={theme.radius.pill} />
        </View>
      ))}
    </View>
  ) : needle ? (
    <EmptyState
      icon="search-outline"
      title={`No matches for "${query.trim()}"`}
      body="Try a shorter word, or a product type such as serum, tote or candle."
      actionLabel="Clear search"
      onAction={() => setQuery("")}
    />
  ) : inStockOnly ? (
    <EmptyState
      icon="pricetag-outline"
      title={`Nothing in stock in ${modeLabel(mode)} right now`}
      body="Turn off In stock to see everything, including items being restocked."
      actionLabel="Show all"
      onAction={() => setInStockOnly(false)}
    />
  ) : (
    <EmptyState
      icon="bag-outline"
      title={`No ${modeLabel(mode)} products yet`}
      body="Ask Pip what to start with, or browse another mode above."
      actionLabel="Ask Pip"
      onAction={() => router.push("/assistant")}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(product) => product.id}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item, index }) => (
          <Appear delay={Math.min(index, 8) * 50} style={{ flex: 1 }}>
            <ProductCard
              product={item}
              onSave={() => toggleSaved(item)}
              onAdd={() => addToCart(item)}
              onOpenCart={openCart}
            />
          </Appear>
        )}
      />

      {/* The cart bar has its own strip above the tab bar, so it never covers a product. */}
      {count > 0 ? (
        <Appear
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <PressScale
            onPress={openCart}
            scaleTo={0.97}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={`Checkout, ${count} ${count === 1 ? "item" : "items"}, ${formatMoney(subtotal)}`}
            style={{
              height: BAR_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                flexShrink: 1,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.body,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {count} {count === 1 ? "item" : "items"}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.onPrimary,
                }}
              />
              <CountUp
                value={subtotal}
                format={formatMoney}
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Checkout
              </Text>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.onPrimary} />
            </View>
          </PressScale>
        </Appear>
      ) : null}
    </View>
  );
}

export default withRetry(ShopScreen);
