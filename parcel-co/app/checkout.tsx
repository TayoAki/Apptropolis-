import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { SlideToPay } from "../components/checkout/SlideToPay";
import { Celebrate, Lottie } from "../components/lottie";
import {
  Appear,
  CountUp,
  Mascot,
  PressScale,
  Skeleton,
  Stagger,
  useReducedMotion,
} from "../components/motion";
import { EmptyState, PrimaryButton } from "../components/ui";
import { track } from "../data/analytics";
import { useCollection } from "../data/repo";
import {
  cartCount,
  cartLines,
  cartSubtotal,
  daysFromNow,
  formatMoney,
  modeLabel,
  relativeDay,
  shippingCost,
  type Order,
  type Product,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

/** Estimated sales tax on the subtotal. */
const TAX_RATE = 0.0863;

type Placed = { id: string; orderNumber: string; estimatedDelivery: string };

function nextOrderNumber(existing: Order[]): string {
  const highest = existing.reduce(
    (max, order) => Math.max(max, Number(order.orderNumber.replace(/\D/g, "")) || 0),
    20400,
  );
  return `PC-${highest + 1}`;
}

function Heading({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.colors.text,
        fontSize: theme.font.size.title,
        fontWeight: theme.font.weight.medium,
      }}
    >
      {children}
    </Text>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>{label}</Text>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** A delivery option. The selected one fills and its radio dot springs in; Pip rides express. */
function SpeedOption({
  selected,
  title,
  detail,
  price,
  pip = false,
  onSelect,
}: {
  selected: boolean;
  title: string;
  detail: string;
  price: string;
  pip?: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pick = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      pick.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(pick, {
      toValue: selected ? 1 : 0,
      useNativeDriver: false,
      speed: 16,
      bounciness: 8,
    }).start();
  }, [selected, reduced, pick]);

  const fill = pick.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, theme.colors.surfaceAlt],
    extrapolate: "clamp",
  });
  const edge = pick.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
    extrapolate: "clamp",
  });
  const dot = pick.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <PressScale
      onPress={onSelect}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${detail}, ${price}`}
      accessibilityState={{ selected }}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={{
          flex: 1,
          minHeight: 156,
          borderRadius: theme.radius.md,
          borderWidth: 2,
          borderColor: edge,
          backgroundColor: fill,
          padding: theme.spacing.md,
          gap: theme.spacing.xs,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
          <Animated.View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: edge,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.primary,
                transform: [{ scale: dot }],
              }}
            />
          </Animated.View>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>{detail}</Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
            marginTop: "auto",
          }}
        >
          {price}
        </Text>
        {pip ? (
          <View pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 6 }}>
            <Mascot pose="pip-delivering" size={44} />
          </View>
        ) : null}
      </Animated.View>
    </PressScale>
  );
}

function CheckoutSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your checkout"
      style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}
    >
      <Skeleton height={172} radius={theme.radius.md} />
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width={120} height={22} />
        <Skeleton height={76} radius={theme.radius.md} />
      </View>
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width={150} height={22} />
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <Skeleton width="48%" height={132} radius={theme.radius.md} />
          <Skeleton width="48%" height={132} radius={theme.radius.md} />
        </View>
      </View>
    </View>
  );
}

function Confirmation({ order }: { order: Placed }) {
  const theme = useTheme();
  const when = relativeDay(order.estimatedDelivery);
  const arriving = when === "Today" || when === "Tomorrow" ? when.toLowerCase() : `on ${when}`;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <Appear>
        <Mascot pose="pip-celebrating" size={180} />
      </Appear>
      <Appear delay={120}>
        <Lottie name="success" size={72} />
      </Appear>
      <Appear delay={200} style={{ alignItems: "center", gap: theme.spacing.sm }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            textAlign: "center",
          }}
        >
          Order placed
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          {`Order ${order.orderNumber} is packed and arriving ${arriving}. Pip will show each step on your tracking timeline.`}
        </Text>
      </Appear>
      <Appear delay={280} style={{ alignSelf: "stretch", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <PrimaryButton
          label="Track your order"
          icon="cube-outline"
          onPress={() => router.replace(`/order/${order.id}`)}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => ({
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
            }}
          >
            Back to home
          </Text>
        </Pressable>
      </Appear>
    </View>
  );
}

export default function CheckoutScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const products = useCollection<Product>("products");
  const orders = useCollection<Order>("orders");

  const lines = useMemo(() => cartLines(products.items), [products.items]);
  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);
  const modes = Array.from(new Set(lines.map((product) => product.mode)));
  const catalogTitle = `${count} ${count === 1 ? "Item" : "Items"}${
    modes.length === 1 ? ` from ${modeLabel(modes[0]!)} Catalog` : ""
  }`;

  const lastAddress = useMemo(() => {
    const latest = [...orders.items].sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
    return latest?.shippingAddress ?? "";
  }, [orders.items]);

  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [speed, setSpeed] = useState<Order["deliverySpeed"]>("express");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const [placed, setPlaced] = useState<Placed | null>(null);

  // Use the address from the last order until the person changes it here.
  useEffect(() => {
    if (!addressTouched && lastAddress) setAddress(lastAddress);
  }, [lastAddress, addressTouched]);

  const shipping = shippingCost(speed, subtotal);
  const standardShipping = shippingCost("standard", subtotal);
  const expressShipping = shippingCost("express", subtotal);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const hasAddress = address.trim().length > 0;
  const canPlace = lines.length > 0 && hasAddress && !editingAddress && !placing;
  const hint = editingAddress
    ? "Tap Done to save your address."
    : !hasAddress
      ? "Add a shipping address to continue."
      : null;

  async function placeOrder() {
    if (!canPlace) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await orders.add({
        orderNumber: nextOrderNumber(orders.items),
        items: lines.map((product) => `${product.name} x${product.cartQuantity}`).join(", "),
        total,
        shippingAddress: address.trim(),
        deliverySpeed: speed,
        status: "placed",
        placedAt: new Date().toISOString(),
        estimatedDelivery: speed === "express" ? daysFromNow(1, 12) : daysFromNow(4, 18),
      });
      for (const line of lines) await products.update(line.id, { cartQuantity: 0 });
      track("order_placed", { delivery: speed, items: count });
      setPlaced({
        id: order.id,
        orderNumber: order.orderNumber,
        estimatedDelivery: order.estimatedDelivery,
      });
    } catch {
      haptic("error");
      setError("We couldn't place your order. Your cart is unchanged, so try again.");
      setSlideKey((key) => key + 1);
    } finally {
      setPlacing(false);
    }
  }

  const card: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  };

  const loading = products.loading || orders.loading;

  function renderBody() {
    if (placed) return <Confirmation order={placed} />;
    if (loading) return <CheckoutSkeleton />;
    if (lines.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="bag-outline"
            title="Your cart is empty"
            body="Add a few things from the shop and they'll appear here, ready to check out."
            actionLabel="Browse the shop"
            onAction={() => router.replace("/(tabs)/shop")}
          />
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <Stagger step={70} style={{ gap: theme.spacing.lg }}>
            <View style={card}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
                <Text
                  numberOfLines={2}
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  {catalogTitle}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit cart"
                  hitSlop={12}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/shop"))}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                      textDecorationLine: "underline",
                    }}
                  >
                    Edit Cart
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
                {lines.slice(0, 3).map((product) => (
                  <View key={product.id} style={{ flex: 1, alignItems: "center", gap: theme.spacing.xs }}>
                    <AiImage
                      prompt={product.name}
                      style={{ width: 72, height: 72, borderRadius: theme.radius.sm }}
                    />
                    <Text
                      numberOfLines={2}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        textAlign: "center",
                      }}
                    >
                      {`${product.name} (x${product.cartQuantity})`}
                    </Text>
                  </View>
                ))}
                {lines.length > 3 ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                      {`+${lines.length - 3} more`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Heading>Shipping Address</Heading>
              <View style={[card, { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }]}>
                <View style={{ flex: 1, gap: theme.spacing.sm }}>
                  {editingAddress ? (
                    <>
                      <TextInput
                        value={address}
                        onChangeText={(text) => {
                          setAddressTouched(true);
                          setAddress(text);
                        }}
                        multiline
                        autoFocus
                        placeholder="Street, apartment, city, state and ZIP"
                        placeholderTextColor={theme.colors.textMuted}
                        accessibilityLabel="Shipping address"
                        style={{
                          minHeight: 88,
                          borderRadius: theme.radius.sm,
                          backgroundColor: theme.colors.surfaceAlt,
                          padding: theme.spacing.md,
                          color: theme.colors.text,
                          fontSize: theme.font.size.body,
                          textAlignVertical: "top",
                        }}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save shipping address"
                        onPress={() => setEditingAddress(false)}
                        style={({ pressed }) => ({
                          alignSelf: "flex-end",
                          minHeight: 44,
                          justifyContent: "center",
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontSize: theme.font.size.body,
                            fontWeight: theme.font.weight.bold,
                          }}
                        >
                          Done
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text
                      style={{
                        color: hasAddress ? theme.colors.text : theme.colors.textMuted,
                        fontSize: theme.font.size.body,
                        lineHeight: 22,
                      }}
                    >
                      {hasAddress ? address.trim() : "No address yet"}
                    </Text>
                  )}
                </View>
                {!editingAddress ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change shipping address"
                    hitSlop={10}
                    onPress={() => setEditingAddress(true)}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      paddingHorizontal: theme.spacing.md,
                      justifyContent: "center",
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.surfaceAlt,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Change
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Heading>Delivery Speed</Heading>
              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <SpeedOption
                  selected={speed === "standard"}
                  title="Standard Eco Parcel"
                  detail="3-5 business days"
                  price={standardShipping === 0 ? "Free" : formatMoney(standardShipping)}
                  onSelect={() => setSpeed("standard")}
                />
                <SpeedOption
                  selected={speed === "express"}
                  title="Express Courier with Pip Live Tracking"
                  detail="Tomorrow by 12 PM"
                  price={formatMoney(expressShipping)}
                  pip
                  onSelect={() => setSpeed("express")}
                />
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Heading>Payment Method</Heading>
              <View style={[card, { flexDirection: "row", alignItems: "center", gap: theme.spacing.md }]}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: theme.colors.text,
                    borderRadius: theme.radius.sm,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                  }}
                >
                  <Ionicons name="logo-apple" size={16} color={theme.colors.text} />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Pay
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    Apple Pay
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                    Charged when you place the order
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Heading>Price Breakdown</Heading>
              <View style={[card, { gap: theme.spacing.md }]}>
                <MoneyRow label="Subtotal" value={formatMoney(subtotal)} />
                <MoneyRow label="Shipping" value={shipping === 0 ? "Free" : formatMoney(shipping)} />
                <MoneyRow label="Taxes" value={formatMoney(tax)} />
                <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.title,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Total
                  </Text>
                  <CountUp
                    value={total}
                    format={formatMoney}
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.title,
                      fontWeight: theme.font.weight.bold,
                    }}
                  />
                </View>
              </View>
            </View>
          </Stagger>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.md,
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.background,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ color: theme.colors.danger, fontSize: theme.font.size.caption, textAlign: "center" }}
            >
              {error}
            </Text>
          ) : hint ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, textAlign: "center" }}>
              {hint}
            </Text>
          ) : null}
          <SlideToPay
            key={slideKey}
            label="Slide to Place Order"
            disabled={!canPlace}
            done={placing}
            onComplete={placeOrder}
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, textAlign: "center" }}>
            Charged via Apple Pay. Protected by Parcel & Co Guarantee
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: "Checkout",
          headerRight: () => (
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
          ),
        }}
      />
      {renderBody()}
      <Celebrate trigger={placed?.id ?? null} />
    </View>
  );
}
