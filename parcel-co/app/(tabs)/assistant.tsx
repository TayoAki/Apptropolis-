// Ask Pip: a question in, Pip's answer out, with the codes and deals it points to as cards under
// the answer. Pip reads the matching rows from the Pip API before it answers and never makes up
// a code. Free answers FREE_QUESTIONS_PER_DAY questions a day; Plus answers any number and
// takes photos.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
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
import { pickPhoto, type Photo } from "../../data/photos";
import { askPip } from "../../data/pip";
import { usePrefs } from "../../data/prefs";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  FREE_QUESTIONS_PER_DAY,
  formatTime,
  isToday,
  relativeDay,
  type ChatMessage,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { CouponCard, DealCard, SettingsButton, useSaved } from "../../components/offers";
import { Appear, haptic, PressScale, Skeleton, useReducedMotion } from "../../components/motion";
import { Pip } from "../../components/Pip";
import { ScreenTitle } from "../../components/ui";

/** Messages further apart than this get their own time stamp. */
const STAMP_GAP_MS = 30 * 60_000;

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
          Animated.timing(value, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, dots]);

  return (
    <View accessibilityLabel="Pip is looking" style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 20 }}>
      {dots.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.textMuted,
            opacity: reduced ? 0.6 : value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ translateY: reduced ? 0 : value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
}

/** A chat bubble: Pip's sits on the surface, yours is the brand color. */
function Bubble({ from, text, photo, children }: { from: "pip" | "you"; text?: string; photo?: boolean; children?: ReactNode }) {
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
        borderBottomLeftRadius: mine ? theme.radius.md : theme.spacing.xs,
        backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
        borderWidth: mine ? 0 : 1,
        borderColor: theme.colors.border,
      }}
    >
      {text ? <Text style={{ color: ink, fontSize: theme.font.size.body, lineHeight: 24 }}>{text}</Text> : null}
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

/** A plain text button inside a bubble. */
function BubbleAction({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => ({ alignSelf: "flex-start", minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>{label}</Text>
    </Pressable>
  );
}

function ChatSkeleton() {
  const theme = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading your conversation" style={{ gap: theme.spacing.md }}>
      <Skeleton width="78%" height={72} radius={theme.radius.md} />
      <Skeleton width="48%" height={44} radius={theme.radius.md} style={{ alignSelf: "flex-end" }} />
    </View>
  );
}

const WELCOME =
  "Hi, I'm Pip. Tell me what you're about to buy and where, and I'll check the codes and deals I've collected. I'll tell you if I don't have one.";

export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const { isPremium, openPaywall } = usePurchases();
  const saved = useSaved();
  const history = useCollection<ChatMessage>("pip_messages");
  const params = useLocalSearchParams<{ q?: string }>();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const settled = useRef(false);
  const handledParam = useRef<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ question: string; photo: Photo | null; message: string } | null>(null);
  /** A question waiting for the person to agree to the AI notice. */
  const [pending, setPending] = useState<{ question: string; photo: Photo | null } | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const messages = useMemo(
    () => [...history.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [history.items],
  );
  const askedToday = messages.filter((m) => m.role === "user" && isToday(m.createdAt)).length;
  const left = Math.max(0, FREE_QUESTIONS_PER_DAY - askedToday);
  const loading = history.loading;

  const quick = [
    prefs.storeNames[0] ? `Any codes for ${prefs.storeNames[0]}?` : "Is there a code for Nike?",
    "Gift ideas under $40",
    "What's the best deal today?",
    "Free shipping codes",
  ];

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(timer);
  }, [loading]);

  // A question sent from Home or a store page arrives as ?q=; ask it once.
  useEffect(() => {
    const q = typeof params.q === "string" ? params.q.trim() : "";
    if (!q || loading || handledParam.current === q) return;
    handledParam.current = q;
    router.setParams({ q: undefined });
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q, loading]);

  async function respond(question: string, attached: Photo | null) {
    setBusy(true);
    try {
      const answer = await askPip({
        question,
        history: messages,
        interests: prefs.interests,
        followed: prefs.storeNames,
        tone: prefs.tone,
        photo: attached,
      });
      await history.add({
        role: "assistant",
        text: answer.text,
        createdAt: new Date().toISOString(),
        couponKeys: answer.coupons.map((c) => c.key),
        dealKeys: answer.deals.map((d) => d.key),
        coupons: answer.coupons,
        deals: answer.deals,
      });
      track("pip_answered", { coupons: answer.coupons.length, deals: answer.deals.length });
    } catch (e) {
      setFailed({
        question,
        photo: attached,
        message: e instanceof Error ? e.message : "Pip couldn't answer that just now.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string, attached: Photo | null = null, consented = prefs.aiConsent) {
    const clean = text.trim();
    if ((!clean && !attached) || busy) return;
    const question = clean || "Is there a code or a deal for this?";
    if (!consented) {
      setPending({ question, photo: attached });
      return;
    }
    if (!isPremium && left <= 0) {
      setLimitHit(true);
      track("pip_limit_reached");
      return;
    }
    haptic("light");
    setDraft("");
    setPhoto(null);
    setFailed(null);
    setLimitHit(false);
    track("pip_question", { photo: attached !== null });
    await history.add({
      role: "user",
      text: clean || "Sent a photo",
      createdAt: new Date().toISOString(),
      photo: attached !== null,
    });
    await respond(question, attached);
  }

  async function agree() {
    await prefs.giveAiConsent();
    const next = pending;
    setPending(null);
    if (next) await send(next.question, next.photo, true);
  }

  function retry() {
    if (!failed) return;
    const { question, photo: attached } = failed;
    setFailed(null);
    void respond(question, attached);
  }

  async function attach() {
    if (!isPremium) {
      router.push({ pathname: "/paywall", params: { from: "pip_photo" } });
      return;
    }
    haptic("selection");
    const picked = await pickPhoto({ source: "library" });
    if (picked) setPhoto(picked);
  }

  function renderMessage(item: ChatMessage, index: number) {
    const previous = messages[index - 1];
    const stamp = !previous || Date.parse(item.createdAt) - Date.parse(previous.createdAt) > STAMP_GAP_MS;
    const fresh = index >= messages.length - 2;
    return (
      <Appear delay={fresh ? 0 : Math.min(index, 8) * 40} distance={18}>
        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          {stamp ? (
            <Text
              style={{
                alignSelf: "center",
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontVariant: ["tabular-nums"],
                marginTop: theme.spacing.sm,
              }}
            >
              {`${relativeDay(item.createdAt)}, ${formatTime(item.createdAt)}`}
            </Text>
          ) : null}
          <Bubble from={item.role === "user" ? "you" : "pip"} text={item.text} photo={item.photo} />
          {(item.coupons ?? []).map((c) => (
            <View key={c.key} style={{ width: "92%", alignSelf: "flex-start" }}>
              <CouponCard coupon={c} saved={saved.isSaved(c.key)} onToggleSave={() => void saved.toggleCoupon(c)} />
            </View>
          ))}
          {(item.deals ?? []).map((d) => (
            <View key={d.key} style={{ width: "92%", alignSelf: "flex-start" }}>
              <DealCard deal={d} saved={saved.isSaved(d.key)} onToggleSave={() => void saved.toggleDeal(d)} />
            </View>
          ))}
        </View>
      </Appear>
    );
  }

  const header = (
    <View style={{ paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      {loading ? (
        <ChatSkeleton />
      ) : (
        <Appear delay={120}>
          <Bubble from="pip" text={WELCOME} />
        </Appear>
      )}
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
      {busy ? (
        <Appear>
          <Bubble from="pip">
            <TypingDots />
          </Bubble>
        </Appear>
      ) : null}
      {pending ? (
        <Appear>
          <Bubble
            from="pip"
            text="Before I answer: your question goes to an AI service, with the codes and deals I found for it, so it can write my reply. Your name and account aren't sent."
          >
            <BubbleAction label="OK, ask Pip" onPress={() => void agree()} />
          </Bubble>
        </Appear>
      ) : null}
      {limitHit ? (
        <Appear>
          <Bubble
            from="pip"
            text={`That's your ${FREE_QUESTIONS_PER_DAY} free questions for today. More tomorrow, or Pip Plus answers as many as you like. Codes and deals on Home and Stores stay free.`}
          >
            <BubbleAction label="See Pip Plus" onPress={() => router.push({ pathname: "/paywall", params: { from: "pip_limit" } })} />
          </Bubble>
        </Appear>
      ) : null}
      {failed ? (
        <Appear>
          <Bubble from="pip" text={failed.message}>
            <BubbleAction label="Try again" onPress={retry} />
          </Bubble>
        </Appear>
      ) : null}
    </View>
  );

  const canSend = !busy && (draft.trim().length > 0 || photo !== null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Pip pose={busy ? "pip-delivering" : "pip-neutral"} size={38} />
        </View>
        <View style={{ flex: 1 }}>
          <ScreenTitle numberOfLines={1}>Ask Pip</ScreenTitle>
          <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {isPremium ? "Pip Plus: ask as much as you like" : `${left} of ${FREE_QUESTIONS_PER_DAY} free questions left today`}
          </Text>
        </View>
        <SettingsButton onPress={() => router.push("/settings")} />
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => renderMessage(item, index)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          listRef.current?.scrollToEnd({ animated: settled.current });
          if (!loading) settled.current = true;
        }}
      />

      {!loading && !busy && messages.length < 2 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
        >
          {quick.map((label) => (
            <PressScale
              key={label}
              scaleTo={0.94}
              hitSlop={6}
              onPress={() => void send(label)}
              accessibilityRole="button"
              accessibilityLabel={`Ask Pip: ${label}`}
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
              <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.medium }}>
                {label}
              </Text>
            </PressScale>
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
              Pip names the product in the photo, then looks for codes and deals for it.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={12}
              onPress={() => setPhoto(null)}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPremium ? "Attach a photo of a product" : "Ask with a photo (Pip Plus)"}
            hitSlop={8}
            onPress={attach}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              marginLeft: -theme.spacing.sm,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="camera-outline" size={24} color={theme.colors.text} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void send(draft, photo)}
            placeholder="What are you buying, and where?"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="send"
            maxLength={400}
            accessibilityLabel="Message Pip"
            onFocus={() => setComposing(true)}
            onBlur={() => setComposing(false)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              borderWidth: 1.5,
              borderColor: composing ? theme.colors.primary : theme.colors.textMuted,
              outlineStyle: "solid",
              outlineWidth: 0,
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
              backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name="send" size={18} color={canSend ? theme.colors.onPrimary : theme.colors.textMuted} />
          </PressScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
