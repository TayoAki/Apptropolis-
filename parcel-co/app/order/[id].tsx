import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { appStructure } from "../../data/app-structure";
import {
  formatDate,
  formatMoney,
  formatTime,
  ORDER_TIMELINE,
  orderProgress,
  type Order,
  type OrderStatus,
  type Product,
} from "../../data/schema";
import { useCollection } from "../../data/repo";
import { useTheme } from "../../theme/ThemeProvider";
import { Lottie } from "../../components/lottie";
import {
  Appear,
  CountUp,
  GrowBar,
  haptic,
  PressScale,
  Skeleton,
  SkeletonList,
  Stagger,
  useReducedMotion,
} from "../../components/motion";
import { OrderTimeline, dueText } from "../../components/order-detail/OrderTimeline";
import { Pip } from "../../components/Pip";
import { ProductImage } from "../../components/ProductArt";
import {
  Chip,
  DISPLAY_FONT,
  EmptyState,
  HEADER_EDGE,
  navTitleStyle,
  LoadProblem,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  useStalled,
  withRetry,
} from "../../components/ui";
import { useShareImage } from "../../components/share";

const RETURN_REASONS = ["Wrong item", "Damaged", "Doesn't suit me", "Changed my mind"];

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/** "Vitamin C Brightening Serum x1, Water-Gel Moisturizer x1" to named lines. */
function parseItems(text: string): Array<{ name: string; qty: number }> {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(.*?)\s*x(\d+)$/i.exec(part);
      return match ? { name: match[1]!.trim(), qty: Number(match[2]) } : { name: part, qty: 1 };
    });
}

function poseFor(status: OrderStatus): string {
  if (status === "delivered") return "pip-celebrating";
  if (status === "shipped" || status === "out_for_delivery") return "pip-delivering";
  return "pip-neutral";
}

function bannerCopy(order: Order): string {
  const time = formatTime(order.estimatedDelivery);
  switch (order.status) {
    case "placed":
      return "Got your order. Pip is getting it ready.";
    case "packed":
      return "Packed and labelled. Pip is waiting for the courier.";
    case "shipped":
      return "On its way to you. Pip is keeping an eye on it.";
    case "out_for_delivery":
      return `Out for delivery ${dueText(order.estimatedDelivery)} by ${time}.`;
    case "delivered":
      return "Delivered. Pip hopes you love it.";
    case "returned":
      return "Return started. Pip is sending it back to us.";
  }
}

function headlineFor(order: Order): string {
  switch (order.status) {
    case "delivered":
      return "Pip delivered it";
    case "returned":
      return "Pip sent it back";
    case "shipped":
    case "out_for_delivery":
      return "Pip is on the way";
    default:
      return "Pip is getting it ready";
  }
}

function detailFor(order: Order): string {
  if (order.status === "delivered") return `Delivered ${formatDate(order.estimatedDelivery)}`;
  if (order.status === "returned") return "Heading back to us";
  return `Expected ${dueText(order.estimatedDelivery)} by ${formatTime(order.estimatedDelivery)}`;
}

function moodFor(status: OrderStatus): string {
  switch (status) {
    case "placed":
      return "Pip is feeling sleepy";
    case "packed":
      return "Pip is feeling focused";
    case "shipped":
      return "Pip is feeling busy";
    case "out_for_delivery":
      return "Pip is buzzing";
    case "delivered":
      return "Pip is feeling proud";
    case "returned":
      return "Pip is feeling helpful";
  }
}

/** A deterministic 9 by 9 pattern from the order number, drawn like a QR code. */
function qrCells(text: string): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  const finder = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      h = Math.imul(h ^ (r * 9 + c + 1), 16777619) >>> 0;
      return finder(r, c) || (h >>> 9) % 2 === 1;
    }),
  );
}

function WaxSeal({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Svg width={96} height={124} viewBox="0 0 100 130">
      <Rect x={33} y={70} width={14} height={60} fill={theme.colors.accent} />
      <Rect x={53} y={70} width={14} height={60} fill={theme.colors.accent} />
      <Circle cx={50} cy={50} r={44} fill={theme.colors.primary} />
      <Circle
        cx={50}
        cy={50}
        r={38}
        fill="none"
        stroke={theme.colors.onPrimary}
        strokeOpacity={0.5}
        strokeWidth={1.5}
        strokeDasharray="3 4"
      />
      <Circle
        cx={50}
        cy={50}
        r={28}
        fill="none"
        stroke={theme.colors.onPrimary}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <SvgText
        x={50}
        y={59}
        fontSize={24}
        fontFamily={DISPLAY_FONT}
        fontStyle="italic"
        textAnchor="middle"
        fill={theme.colors.onPrimary}
      >
        {label}
      </SvgText>
    </Svg>
  );
}

function PostageStamp({ seed }: { seed: string }) {
  const theme = useTheme();
  const cells = qrCells(seed);
  return (
    <Svg width={64} height={76} viewBox="0 0 64 76">
      <Rect
        x={1}
        y={1}
        width={62}
        height={74}
        rx={3}
        fill={theme.colors.surfaceAlt}
        stroke={theme.colors.border}
        strokeWidth={1}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <Circle key={`top-${i}`} cx={8 + i * 9} cy={0} r={2.5} fill={theme.colors.surface} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Circle key={`bottom-${i}`} cx={8 + i * 9} cy={76} r={2.5} fill={theme.colors.surface} />
      ))}
      {cells.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <Rect
              key={`${r}-${c}`}
              x={14 + c * 4}
              y={20 + r * 4}
              width={3.4}
              height={3.4}
              fill={theme.colors.text}
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}

function Postmark() {
  const theme = useTheme();
  return (
    <Svg width={64} height={56} viewBox="0 0 64 56">
      {[12, 24, 36].map((y) => (
        <Path
          key={y}
          d={`M4 ${y} Q 14 ${y - 6} 24 ${y} T 44 ${y} T 64 ${y}`}
          stroke={theme.colors.textMuted}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

function OrderScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { ready, onboarded } = useAppState();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useCollection<Order>("orders");
  const products = useCollection<Product>("products");
  const { ref, share, sharing } = useShareImage();
  const order = orders.items.find((o) => o.id === id);
  const orderId = order?.id;
  const stalled = useStalled(orders.loading || products.loading);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const drawer = useRef(new Animated.Value(0)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  // The return drawer glides up when opened.
  useEffect(() => {
    if (!drawerOpen) return;
    if (reduced) {
      drawer.setValue(1);
      return;
    }
    const run = Animated.spring(drawer, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    });
    run.start();
    return () => run.stop();
  }, [drawerOpen, reduced, drawer]);

  // The wax seal presses onto the card once the order has loaded.
  useEffect(() => {
    if (!orderId) return;
    if (reduced) {
      stamp.setValue(1);
      return;
    }
    stamp.setValue(0);
    const run = Animated.sequence([
      Animated.delay(280),
      Animated.spring(stamp, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
    ]);
    run.start();
    return () => run.stop();
  }, [orderId, reduced, stamp]);

  // The "Pip delivered it" card tilts toward the finger and settles back on release.
  const settle = () => {
    Animated.parallel([
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: false, speed: 14, bounciness: 8 }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: false, speed: 14, bounciness: 8 }),
    ]).start();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        tiltX.setValue(clamp(g.dy / 120));
        tiltY.setValue(clamp(g.dx / 120));
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  // "Added" feedback on a buy-again row clears itself.
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(null), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  // First launch can land here before onboarding (this route sits outside the guarded group).
  if (appStructure.onboarding && ready && !onboarded) return <Redirect href="/onboarding" />;

  const header = { title: "Order", headerTitleStyle: navTitleStyle(theme) };

  if (stalled) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={header} />
        <LoadProblem onRetry={onRetry} />
      </View>
    );
  }

  if (orders.loading || products.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={header} />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <Skeleton width={230} height={30} />
          <Skeleton width={190} height={14} />
          <Skeleton height={112} radius={theme.radius.lg} />
          <Skeleton height={200} radius={theme.radius.md} />
          <SkeletonList rows={2} />
        </ScrollView>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.background }}>
        <Stack.Screen options={header} />
        <EmptyState
          icon="cube-outline"
          title="This order isn't here"
          body="It may have been removed from this phone. Your other orders are on Home."
          actionLabel="Back to home"
          onAction={() => router.replace("/")}
        />
      </View>
    );
  }

  const lines = parseItems(order.items).map(({ name, qty }) => {
    const product = products.items.find((p) => p.name === name);
    return {
      key: name,
      name,
      qty,
      product,
      lineTotal: product ? product.price * qty : null,
    };
  });
  const current = orderProgress(order.status);
  const progressFraction = current / (ORDER_TIMELINE.length - 1);
  const canReturn = order.status === "delivered";
  const returned = order.status === "returned";
  const headline = headlineFor(order);
  const detail = detailFor(order);
  const shareText = `${headline} with order ${order.orderNumber} from Parcel & Co. ${detail}.`;

  const shareCard = () => {
    void share({ message: shareText, title: `Order ${order.orderNumber}` });
  };

  const buyAgain = (product: Product) => {
    haptic("light");
    void products.update(product.id, { cartQuantity: product.cartQuantity + 1 });
    setAdded(product.id);
  };

  const openDrawer = () => {
    drawer.setValue(0);
    setDrawerOpen(true);
  };

  const confirmReturn = async () => {
    if (!reason || saving) return;
    haptic("warning");
    setSaving(true);
    try {
      await orders.update(order.id, { status: "returned" });
      track("return_started", { reason });
      haptic("success");
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const parallaxX = tiltY.interpolate({ inputRange: [-1, 1], outputRange: [8, -8] });
  const stampScale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          ...header,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share order card"
              accessibilityState={{ disabled: sharing }}
              disabled={sharing}
              hitSlop={6}
              onPress={shareCard}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                marginRight: HEADER_EDGE - theme.spacing.sm,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="share-outline" size={24} color={theme.colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Stagger step={80} style={{ gap: theme.spacing.xl }}>
          <View style={{ gap: 4 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {`Order #${order.orderNumber}`}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontVariant: ["tabular-nums"],
              }}
            >
              {`Placed ${formatDate(order.placedAt)} at ${formatTime(order.placedAt)}`}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Pip pose={poseFor(order.status)} size={96} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  lineHeight: 22,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                {bannerCopy(order)}
              </Text>
              <GrowBar progress={progressFraction} />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {`Step ${Math.min(current + 1, ORDER_TIMELINE.length)} of ${ORDER_TIMELINE.length}`}
              </Text>
            </View>
          </View>

          <View style={{ gap: theme.spacing.xl }}>
            <OrderTimeline order={order} />
            <SecondaryButton
              label="Ask Pip about this order"
              icon="chatbubble-ellipses-outline"
              onPress={() => router.push("/assistant")}
            />
          </View>

          <View>
            <SectionTitle title="Items purchased" flush />
            <FlatList
              data={lines}
              keyExtractor={(line) => line.key}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing.xs }} />}
              renderItem={({ item, index }) => {
                const product = item.product;
                return (
                  <Appear delay={Math.min(index, 8) * 50}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                      }}
                    >
                      <ProductImage
                        product={product}
                        name={item.name}
                        style={{ width: 56, height: 56, borderRadius: theme.radius.sm }}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          numberOfLines={2}
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.font.size.body,
                            lineHeight: 21,
                            fontWeight: theme.font.weight.medium,
                          }}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: theme.font.size.caption,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {`Qty ${item.qty}`}
                        </Text>
                      </View>
                      {item.lineTotal !== null ? (
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.font.size.body,
                            fontWeight: theme.font.weight.bold,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {formatMoney(item.lineTotal)}
                        </Text>
                      ) : null}
                      {product ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            added === product.id
                              ? `${item.name} added to cart`
                              : `Buy ${item.name} again`
                          }
                          hitSlop={6}
                          onPress={() => buyAgain(product)}
                          style={({ pressed }) => ({
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            borderWidth: 1.5,
                            borderColor: theme.colors.primary,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons
                            name={added === product.id ? "checkmark" : "bag-add-outline"}
                            size={22}
                            color={theme.colors.primary}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </Appear>
                );
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                  }}
                >
                  {order.deliverySpeed === "express" ? "Express delivery" : "Standard delivery"}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  Total paid
                </Text>
              </View>
              <CountUp
                value={order.total}
                format={formatMoney}
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              />
            </View>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                lineHeight: 17,
                marginTop: theme.spacing.sm,
              }}
            >
              {`Shipping to ${order.shippingAddress}`}
            </Text>
          </View>

          <View>
            <Animated.View
              {...pan.panHandlers}
              style={{
                transform: [
                  { perspective: 900 },
                  {
                    rotateX: tiltX.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ["-4deg", "4deg"],
                    }),
                  },
                  {
                    rotateY: tiltY.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ["-5deg", "5deg"],
                    }),
                  },
                ],
              }}
            >
              <View
                ref={ref}
                collapsable={false}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing.lg,
                  gap: theme.spacing.md,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontFamily: DISPLAY_FONT,
                      fontSize: theme.font.size.body,
                    }}
                  >
                    Parcel & Co
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.bold,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {`#${order.orderNumber}`}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                  <Animated.View
                    style={{
                      opacity: stamp,
                      transform: [{ translateX: parallaxX }, { scale: stampScale }],
                    }}
                  >
                    <WaxSeal label="Pip" />
                  </Animated.View>
                  <View style={{ flex: 1, gap: theme.spacing.sm }}>
                    <Text
                      accessibilityRole="header"
                      style={{
                        color: theme.colors.text,
                        fontFamily: DISPLAY_FONT,
                        fontSize: theme.font.size.title,
                        lineHeight: 28,
                      }}
                    >
                      {headline}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.body,
                      }}
                    >
                      {detail}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.caption,
                        fontStyle: "italic",
                      }}
                    >
                      {moodFor(order.status)}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <Postmark />
                  <PostageStamp seed={order.orderNumber} />
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.border }} />

                <View style={{ gap: 4 }}>
                  {lines.map((line) => (
                    <Text
                      key={line.key}
                      numberOfLines={1}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.caption,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {`${line.name} × ${line.qty}`}
                    </Text>
                  ))}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                    }}
                  >
                    Total
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatMoney(order.total)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <PrimaryButton
              label="Share order card"
              icon="share-outline"
              onPress={shareCard}
              disabled={sharing}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            {returned ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Lottie name="success" size={64} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Return started
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                    }}
                  >
                    Refunds usually land within five to seven business days after the parcel is
                    back with us.
                  </Text>
                </View>
              </View>
            ) : drawerOpen && canReturn ? (
              <Animated.View
                style={{
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  opacity: drawer,
                  transform: [
                    {
                      translateY: drawer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{
                    color: theme.colors.text,
                    fontFamily: DISPLAY_FONT,
                    fontSize: theme.font.size.title,
                    lineHeight: 28,
                  }}
                >
                  Why are you returning it?
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                  {RETURN_REASONS.map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={reason === label}
                      onPress={() => setReason(label)}
                    />
                  ))}
                </View>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                  }}
                >
                  We'll email a prepaid label. Refunds usually take five to seven business days once
                  the parcel is back with us.
                </Text>
                <PrimaryButton
                  label="Confirm return"
                  icon="return-up-back-outline"
                  onPress={confirmReturn}
                  disabled={!reason || saving}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Keep this order"
                  hitSlop={12}
                  onPress={() => setDrawerOpen(false)}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    Not now
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                <PressScale
                  onPress={openDrawer}
                  disabled={!canReturn}
                  scaleTo={0.97}
                  haptic="light"
                  accessibilityRole="button"
                  accessibilityLabel="Start a return"
                  accessibilityState={{ disabled: !canReturn }}
                  style={{
                    minHeight: 50,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1.5,
                    borderColor: canReturn ? theme.colors.primary : theme.colors.border,
                    backgroundColor: canReturn ? undefined : theme.colors.surfaceAlt,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  <Ionicons
                    name="return-up-back-outline"
                    size={20}
                    color={canReturn ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={{
                      color: canReturn ? theme.colors.primary : theme.colors.textMuted,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Start a return
                  </Text>
                </PressScale>
                {!canReturn ? (
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                      textAlign: "center",
                    }}
                  >
                    Returns open once your parcel is delivered.
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </Stagger>
      </ScrollView>
    </View>
  );
}

export default withRetry(OrderScreen);
