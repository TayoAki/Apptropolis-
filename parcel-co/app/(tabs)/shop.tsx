import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { FlatList, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { Appear, CountUp, Mascot, PressScale, Skeleton, Stagger } from "../../components/motion";
import { CartPill, InStockChip, ModeSwitch, WishlistButton } from "../../components/shop/controls";
import { EmptyState } from "../../components/ui";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import {
  SHOP_MODES,
  cartCount,
  cartSubtotal,
  formatMoney,
  modeLabel,
  type Order,
  type Product,
  type ShopMode,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** A product can carry stock information; one without it is in stock. */
type ShopProduct = Product & { inStock?: boolean };

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const BAR_HEIGHT = 52;

const SEARCH_HINT: Record<ShopMode, string> = {
  style: "Search tops, knitwear, bags",
  glow: "Search botanical serums, oils...",
  home: "Search candles, kitchen, decor",
  pantry: "Search oils, coffee, tea",
};

/** The vessel or form each category is drawn in, for its picture. */
const CATEGORY_VESSEL: Record<string, string> = {
  serums: "glass dropper bottle",
  oils: "glass oil bottle",
  toners: "spray mist bottle",
  moisturizers: "cream jar",
  masks: "cream jar",
  "eye care": "small cream jar",
  cleansers: "squeeze tube",
  sunscreen: "squeeze tube",
  candles: "glass candle in a ceramic vessel",
  bags: "canvas tote bag",
  tops: "folded shirt",
  knitwear: "folded sweater",
  bottoms: "pair of trousers",
  tableware: "stoneware plate",
  kitchen: "ceramic kitchen piece",
  coffee: "bag of coffee beans",
  tea: "tin of loose tea",
};

/** The picture description for a product: drawn once per product, shown whole on a beige tile. */
function productPicture(product: ShopProduct): string {
  const vessel = CATEGORY_VESSEL[product.category];
  const subject = vessel ? `${vessel} for ${product.name}` : product.name;
  return `${subject}, soft watercolor illustration, centered on a plain background`;
}

/** The mode from onboarding's answer (a key or a label), Glow when there is none. */
function modeFromAnswer(answer: string | undefined): ShopMode {
  const needle = (answer ?? "").trim().toLowerCase();
  const found = SHOP_MODES.find(
    (mode) => mode.key === needle || mode.label.toLowerCase() === needle,
  );
  return found?.key ?? "glow";
}

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
        <AiImage
          prompt={productPicture(product)}
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
          minHeight: 40,
          marginTop: theme.spacing.xs,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {product.name}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
      >
        {product.description}
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

export default function ShopScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const products = useCollection<ShopProduct>("products");
  const orders = useCollection<Order>("orders");

  const [mode, setMode] = useState<ShopMode>(() => modeFromAnswer(answers["shopmode"]));
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

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
  // The cart bar sits just above the tab bar; the list and Pip clear it when it shows.
  const barSpace = count > 0 ? BAR_HEIGHT + theme.spacing.md + theme.spacing.sm : 0;

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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontFamily: SERIF,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.regular,
          }}
        >
          Boutique Catalog
        </Text>
        <Pressable
          onPress={openCart}
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Cart, ${count} items` : "Cart, empty"}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
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
                backgroundColor: theme.colors.danger,
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
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            height: 44,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={SEARCH_HINT[mode]}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Search products"
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
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
              hitSlop={10}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
        </View>
        <InStockChip selected={inStockOnly} onPress={() => setInStockOnly((on) => !on)} />
      </View>
    </Stagger>
  );

  const empty: ReactNode = products.loading ? (
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
      body="Turn off In Stock to see everything, including items being restocked."
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
        data={visible}
        keyExtractor={(product) => product.id}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: theme.spacing.xl + barSpace,
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

      {count > 0 ? (
        <Appear
          style={{
            position: "absolute",
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: theme.spacing.md,
          }}
        >
          <PressScale
            onPress={openCart}
            scaleTo={0.97}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={`Review cart and checkout, ${count} items, ${formatMoney(subtotal)}`}
            style={{
              height: BAR_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.onPrimary, fontSize: theme.font.size.body }}
              >
                {count} {count === 1 ? "item" : "items"} in cart ·{" "}
              </Text>
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
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Review Cart & Checkout →
            </Text>
          </PressScale>
        </Appear>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: theme.spacing.md,
          bottom: theme.spacing.md + barSpace,
          alignItems: "flex-end",
        }}
      >
        {activeOrder ? (
          <View style={{ marginBottom: theme.spacing.sm, marginRight: theme.spacing.xs }}>
            <Pressable
              onPress={() => router.push("/assistant")}
              accessibilityRole="button"
              accessibilityLabel="Ask Pip where your package is"
              style={({ pressed }) => ({
                maxWidth: 230,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: theme.colors.text, fontSize: theme.font.size.caption }}>
                Where is my package?
              </Text>
            </Pressable>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: -5,
                right: 20,
                width: 12,
                height: 12,
                backgroundColor: theme.colors.surfaceAlt,
                transform: [{ rotate: "45deg" }],
              }}
            />
          </View>
        ) : null}
        <Mascot
          pose={pose}
          size={50}
          onPress={() => router.push("/assistant")}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        />
      </View>
    </View>
  );
}
