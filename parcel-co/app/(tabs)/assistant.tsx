import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { track } from "../../data/analytics";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { pickPhoto, type Photo } from "../../data/photos";
import { useCollection } from "../../data/repo";
import {
  formatDate,
  formatMoney,
  formatTime,
  relativeDay,
  statusLabel,
  type AssistantMessage,
  type Order,
  type Product,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { ProductCard } from "../../components/assistant/ProductCard";
import {
  Appear,
  haptic,
  Mascot,
  PressScale,
  Skeleton,
  useReducedMotion,
} from "../../components/motion";

type ChatMessage = AssistantMessage & { productId?: string; photo?: boolean };

const QUICK_REPLIES = [
  "Where is my package?",
  "Build a skincare routine",
  "How do I start a return?",
  "Help me pick my size",
];

/** Messages further apart than this get their own time stamp. */
const STAMP_GAP_MS = 30 * 60_000;

const PHRASE: Record<Order["status"], string> = {
  placed: "being prepared",
  packed: "packed and waiting to ship",
  shipped: "on its way to you",
  out_for_delivery: "out for delivery right now",
  delivered: "delivered",
  returned: "back with us after a return",
};

function greeting(order: Order | undefined): string {
  if (!order)
    return "Hi there! I know your orders and the whole catalog, and I can help you build a routine. What can I help you with today?";
  const item = (order.items.split(",")[0] ?? order.items).replace(/\s*x\d+$/, "").trim();
  const open = order.status === "delivered" || order.status === "returned";
  const day = relativeDay(order.estimatedDelivery);
  const when = open
    ? ""
    : ` Expected ${day === "Today" || day === "Tomorrow" ? day.toLowerCase() : `on ${day}`}.`;
  return `Hi there! Your ${item} from order ${order.orderNumber} is ${PHRASE[order.status]}.${when} What can I help you with today?`;
}

function orderLine(order: Order): string {
  const eta =
    order.status === "delivered" || order.status === "returned"
      ? `arrived ${formatDate(order.estimatedDelivery)}`
      : `expected ${formatDate(order.estimatedDelivery)}`;
  return `${order.orderNumber} | ${order.items} | ${statusLabel(order.status)} | ${formatMoney(order.total)} | ${order.deliverySpeed} | ${eta}`;
}

function instructions(tone: "playful" | "brief", shopMode: string | undefined): string {
  return [
    "You are Pip, the friendly parcel-box assistant of Parcel & Co, a small brand with four shop modes: Style (clothing), Glow (skincare), Home and Pantry.",
    "Answer questions about the customer's orders, products, skincare routines, sizing and returns, using only the data you are given. Never invent order numbers, tracking details, prices, dates or products. If the data doesn't say, say so and suggest Help & support in Settings.",
    tone === "brief"
      ? "Keep it to two short sentences."
      : "Be warm and a little playful, in at most three short sentences.",
    shopMode ? `The customer mostly shops in ${shopMode}.` : "",
    'Reply with JSON only, in this shape: {"reply": "your answer", "productId": "a catalog id that fits the answer, or null"}. Pick a product only when it genuinely helps (a routine step, a size, a reorder); otherwise use null.',
  ]
    .filter(Boolean)
    .join(" ");
}

/** The model's JSON reply, or its plain text when the JSON doesn't come through. */
function parseReply(raw: string, catalog: Product[]): { reply: string; productId?: string } {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  try {
    const value = JSON.parse(cleaned) as { reply?: unknown; productId?: unknown };
    if (typeof value.reply === "string" && value.reply.trim()) {
      const productId =
        typeof value.productId === "string" && catalog.some((p) => p.id === value.productId)
          ? value.productId
          : undefined;
      return { reply: value.reply.trim(), productId };
    }
  } catch {
    // Plain text answer.
  }
  return { reply: cleaned };
}

/** Pip's three dots, rising one after another while Pip writes. */
function TypingDots() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    if (reduced) return;
    const loops = dots.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(value, {
            toValue: 1,
            duration: 320,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 320,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(480 - i * 160),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, dots]);

  return (
    <View
      accessibilityLabel="Pip is typing"
      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 20 }}
    >
      {dots.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.textMuted,
            opacity: reduced
              ? 0.6
              : value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              {
                translateY: reduced
                  ? 0
                  : value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** A chat bubble: Pip's sits on paper, yours is the brand color. */
function Bubble({
  from,
  text,
  photo,
  children,
}: {
  from: "pip" | "you";
  text?: string;
  photo?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const mine = from === "you";
  const ink = mine ? theme.colors.onPrimary : theme.colors.text;
  return (
    <View
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: mine ? "82%" : "88%",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderBottomRightRadius: mine ? theme.spacing.xs : theme.radius.md,
        backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
        borderWidth: mine ? 0 : 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.border,
        shadowOpacity: mine ? 0 : 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: mine ? 0 : 2,
      }}
    >
      {text ? (
        <Text style={{ color: ink, fontSize: theme.font.size.body, lineHeight: 24 }}>{text}</Text>
      ) : null}
      {photo ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <Ionicons name="image-outline" size={14} color={ink} />
          <Text style={{ color: ink, fontSize: theme.font.size.caption }}>Photo attached</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function ChatSkeleton() {
  const theme = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading your conversation" style={{ gap: theme.spacing.md }}>
      <Skeleton width="78%" height={96} radius={theme.radius.md} />
      <Skeleton width="48%" height={44} radius={theme.radius.md} style={{ alignSelf: "flex-end" }} />
      <Skeleton width="70%" height={64} radius={theme.radius.md} />
    </View>
  );
}

export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const history = useCollection<ChatMessage>("assistant_messages");
  const orders = useCollection<Order>("orders");
  const catalog = useCollection<Product>("products");
  const ai = useAI();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [failed, setFailed] = useState<{ question: string; photo: Photo | null } | null>(null);
  const [opened] = useState(() => new Date().toISOString());

  const tone: "playful" | "brief" = answers.tone === "brief" ? "brief" : "playful";
  const messages = useMemo(
    () => [...history.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [history.items],
  );
  const recentOrders = useMemo(
    () => [...orders.items].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
    [orders.items],
  );
  const latest = recentOrders[0];
  const loading = history.loading || orders.loading;
  const pose =
    latest?.status === "delivered"
      ? "pip-celebrating"
      : latest && (latest.status === "shipped" || latest.status === "out_for_delivery")
        ? "pip-delivering"
        : "pip-neutral";

  /** Ask Pip, with the customer's orders, cart and catalog in the prompt. */
  async function respond(question: string, attached: Photo | null) {
    const context = messages
      .filter((m) => !(m.role === "user" && m.text === question))
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Customer" : "Pip"}: ${m.text}`);
    const cart = catalog.items
      .filter((p) => p.cartQuantity > 0)
      .map((p) => `${p.name} x${p.cartQuantity}`)
      .join(", ");
    const prompt = [
      "Customer's orders, newest first:",
      recentOrders.slice(0, 6).map(orderLine).join("\n") || "No orders yet.",
      "Cart:",
      cart || "Empty.",
      "Catalog (id | name | shop | price | category):",
      catalog.items
        .map((p) => `${p.id} | ${p.name} | ${p.mode} | ${formatMoney(p.price)} | ${p.category}`)
        .join("\n"),
      "Recent conversation:",
      context.join("\n") || "This is the first message.",
      `Customer's new message: ${question}`,
    ].join("\n");

    const raw = await ai.ask({
      prompt,
      instructions: instructions(tone, answers.shopmode),
      photo: attached,
      json: true,
    });
    if (raw === null) {
      setFailed({ question, photo: attached });
      return;
    }
    const { reply, productId } = parseReply(raw, catalog.items);
    await history.add({
      role: "assistant",
      text: reply,
      createdAt: new Date().toISOString(),
      productId,
    });
  }

  async function send(text: string, attached: Photo | null = null) {
    const clean = text.trim();
    if ((!clean && !attached) || ai.loading) return;
    const question = clean || "What is in this photo, and what should I know about it?";
    haptic("light");
    setDraft("");
    setPhoto(null);
    setFailed(null);
    track("pip_question", { photo: attached !== null });
    await history.add({
      role: "user",
      text: clean || "Sent a photo",
      createdAt: new Date().toISOString(),
      photo: attached !== null,
    });
    await respond(question, attached);
  }

  function retry() {
    if (!failed) return;
    const { question, photo: attached } = failed;
    setFailed(null);
    void respond(question, attached);
  }

  async function attach() {
    haptic("selection");
    const picked = await pickPhoto({ source: "library" });
    if (picked) setPhoto(picked);
  }

  function addToCart(product: Product) {
    haptic("success");
    void catalog.update(product.id, { cartQuantity: product.cartQuantity + 1 });
  }

  function renderMessage(item: ChatMessage, index: number) {
    const previous = messages[index - 1];
    const stamp =
      !previous ||
      Date.parse(item.createdAt) - Date.parse(previous.createdAt) > STAMP_GAP_MS;
    const product = item.productId
      ? catalog.items.find((p) => p.id === item.productId)
      : undefined;
    const fresh = index >= messages.length - 2;
    return (
      <Appear delay={fresh ? 0 : Math.min(index, 8) * 50} distance={18}>
        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          {stamp ? (
            <Text
              style={{
                alignSelf: "center",
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                letterSpacing: 1,
                fontVariant: ["tabular-nums"],
                marginTop: theme.spacing.sm,
              }}
            >
              {`${relativeDay(item.createdAt).toUpperCase()}, ${formatTime(item.createdAt)}`}
            </Text>
          ) : null}
          <Bubble from={item.role === "user" ? "you" : "pip"} text={item.text} photo={item.photo} />
          {product ? (
            <View style={{ width: "88%", alignSelf: "flex-start" }}>
              <ProductCard product={product} onAdd={() => addToCart(product)} />
            </View>
          ) : null}
        </View>
      </Appear>
    );
  }

  const header = (
    <View>
      <View
        style={{
          alignItems: "center",
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.xs,
        }}
      >
        <Appear>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.border,
              shadowOpacity: 1,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <Mascot pose={pose} size={68} />
            <View
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 3,
                borderColor: theme.colors.surface,
                backgroundColor: theme.colors.success,
              }}
            />
          </View>
        </Appear>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            marginTop: theme.spacing.sm,
          }}
        >
          Pip Concierge
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
          Knows your orders & catalog
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            letterSpacing: 1,
            fontVariant: ["tabular-nums"],
            marginTop: theme.spacing.xs,
          }}
        >
          {`${relativeDay(opened).toUpperCase()}, ${formatTime(opened)}`}
        </Text>
      </View>

      {loading ? (
        <ChatSkeleton />
      ) : (
        <Appear delay={120}>
          <Bubble from="pip">
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
              {greeting(latest)}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                <Mascot pose={pose} size={26} />
              </View>
            </View>
          </Bubble>
        </Appear>
      )}
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
      {ai.loading ? (
        <Appear>
          <Bubble from="pip">
            <TypingDots />
          </Bubble>
        </Appear>
      ) : null}
      {failed ? (
        <Appear>
          <Bubble from="pip" text={ai.error ?? "Pip couldn't answer that just now."}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask Pip again"
              hitSlop={12}
              onPress={retry}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
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
                Try again
              </Text>
            </Pressable>
          </Bubble>
        </Appear>
      ) : null}
    </View>
  );

  const canSend = !ai.loading && (draft.trim().length > 0 || photo !== null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {router.canGoBack() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => ({
            position: "absolute",
            top: insets.top + theme.spacing.sm,
            left: theme.spacing.lg,
            zIndex: 1,
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
      ) : null}

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => renderMessage(item, index)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {!loading && !ai.loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          }}
        >
          {QUICK_REPLIES.map((label, i) => (
            <Appear key={label} delay={i * 70} distance={8}>
              <PressScale
                scaleTo={0.94}
                hitSlop={6}
                onPress={() => {
                  haptic("selection");
                  void send(label);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  {label}
                </Text>
              </PressScale>
            </Appear>
          ))}
        </ScrollView>
      ) : null}

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        {photo ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              contentFit="cover"
              accessibilityLabel="Photo to send"
              style={{ width: 44, height: 44, borderRadius: theme.radius.sm }}
            />
            <Text style={{ flex: 1, color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              Ask about this photo, or send it as it is.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={12}
              onPress={() => setPhoto(null)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach a photo"
            hitSlop={8}
            onPress={attach}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="attach-outline" size={24} color={theme.colors.textMuted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void send(draft, photo)}
            placeholder="Ask Pip about orders, returns, or routines..."
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="send"
            maxLength={600}
            accessibilityLabel="Message Pip"
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
            }}
          />
          <PressScale
            onPress={() => void send(draft, photo)}
            disabled={!canSend}
            scaleTo={0.9}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Send to Pip"
            accessibilityState={{ disabled: !canSend }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
              opacity: canSend ? 1 : 0.5,
            }}
          >
            <Ionicons name="send" size={18} color={theme.colors.onPrimary} />
          </PressScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
