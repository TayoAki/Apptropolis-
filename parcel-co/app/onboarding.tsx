import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { Lottie } from "../components/lottie";
import { ModeCard, ModeCardSkeleton } from "../components/onboarding/ModeCard";
import { PipBubble } from "../components/onboarding/PipBubble";
import { OnboardingTabBar } from "../components/onboarding/TabBar";
import {
  Appear,
  Float,
  haptic,
  PageDots,
  Skeleton,
  Stagger,
  StepTransition,
} from "../components/motion";
import { Pip } from "../components/Pip";
import {
  Chip,
  InlineNotice,
  PrimaryButton,
  ScreenTitle,
  Surface,
  useStalled,
} from "../components/ui";
import { useAI } from "../data/ai";
import { useAppState } from "../data/app-state";
import { useCollection } from "../data/repo";
import { useReminder } from "../data/reminders";
import {
  formatDate,
  formatMoney,
  statusLabel,
  type Order,
  type Product,
  type ShopMode,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

const STEPS = 3;
const HERO_HEIGHT = 180;
const REMINDER_HOURS = [8, 12, 18, 21];

const MODES: { key: ShopMode; label: string; caption: string }[] = [
  { key: "style", label: "Style", caption: "Clothes, bags and everyday accessories" },
  { key: "glow", label: "Glow", caption: "Skincare, from cleansers to sunscreen" },
  { key: "home", label: "Home", caption: "Candles, kitchen and bedding" },
  { key: "pantry", label: "Pantry", caption: "Coffee, tea, oils and staples" },
];

/** Two staggered columns: the heights of the pictures make the grid feel like a catalog. */
const COLUMNS: { mode: (typeof MODES)[number]; imageHeight: number }[][] = [
  [
    { mode: MODES[0]!, imageHeight: 210 },
    { mode: MODES[2]!, imageHeight: 168 },
  ],
  [
    { mode: MODES[1]!, imageHeight: 150 },
    { mode: MODES[3]!, imageHeight: 190 },
  ],
];

const QUESTIONS = [
  { id: "package", label: "Where is my package?" },
  { id: "serum", label: "What goes well with a vitamin C serum?" },
] as const;

type QuestionId = (typeof QUESTIONS)[number]["id"];

const INSTRUCTIONS =
  "You are Pip, the friendly parcel-box assistant in the Parcel & Co shopping app. Answer in at most three short sentences, warmly and specifically, in plain text with no lists and no emoji.";

const TAB_PATHS: Record<string, string> = {
  home: "/",
  shop: "/shop",
  assistant: "/assistant",
  settings: "/settings",
};

/** The product a mood card shows: a wishlisted one when there is one, else the first in the mode. */
function featuredFor(mode: ShopMode, products: Product[]): Product | undefined {
  const inMode = products.filter((p) => p.mode === mode);
  return inMode.find((p) => p.isWishlisted) ?? inMode[0];
}

function hourLabel(hour: number): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${hour < 12 ? "am" : "pm"}`;
}

function buildPrompt(id: QuestionId, orders: Order[], products: Product[]): string {
  if (id === "package") {
    const latest = [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
    const detail = latest
      ? `Their latest order is ${latest.orderNumber} (${latest.items}). Status: ${statusLabel(latest.status)}. Estimated delivery: ${formatDate(latest.estimatedDelivery)}.`
      : "They have no orders yet.";
    return `The customer asks: "Where is my package?" ${detail} Say where the package is and what happens next.`;
  }
  const glow = products
    .filter((p) => p.mode === "glow")
    .map((p) => `${p.name} (${formatMoney(p.price)})`)
    .join("; ");
  return `The customer asks: "What goes well with a vitamin C serum?" Suggest up to three products from this list only, by exact name, with one short reason each: ${glow}.`;
}

function StepHeader({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, alignItems: "center" }}>
      <ScreenTitle align="center">{title}</ScreenTitle>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          lineHeight: 24,
          textAlign: "center",
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

export default function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();
  const orders = useCollection<Order>("orders");
  const products = useCollection<Product>("products");
  const ai = useAI();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [asked, setAsked] = useState<QuestionId | null>(null);
  const [hour, setHour] = useState(18);
  const [saving, setSaving] = useState(false);
  const [reminderState, setReminderState] = useState<"idle" | "on" | "declined">("idle");
  // If the catalog doesn't arrive, the moods are still offered, without a featured product.
  const catalogStalled = useStalled(products.loading, 6000);

  const selected: string | null = answers.shopmode ?? null;
  const canNext = step === 0 ? Boolean(selected) : true;

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  function next() {
    if (canNext && step < STEPS - 1) go(step + 1);
  }

  function finish() {
    void completeOnboarding();
  }

  /** The tab bar opens the app at that tab: onboarding completes, then the tab is shown. */
  async function openTab(key: string) {
    await completeOnboarding();
    router.replace(TAB_PATHS[key] ?? "/");
  }

  function choose(key: ShopMode) {
    void setAnswer("shopmode", key);
  }

  function askPip(id: QuestionId) {
    setAsked(id);
    void ai.ask({
      prompt: buildPrompt(id, orders.items, products.items),
      instructions: INSTRUCTIONS,
    });
  }

  async function turnOn() {
    setSaving(true);
    const ok = await reminder.enable({
      title: "Check on your parcels",
      body: "Pip has news on your open orders. Tap to see where they are.",
      hour,
      minute: 0,
    });
    setSaving(false);
    setReminderState(ok ? "on" : "declined");
    if (ok) haptic("success");
  }

  const labelStyle = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption,
    fontWeight: theme.font.weight.medium,
  };

  const bodyStyle = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.body,
    textAlign: "center" as const,
  };

  const moodStep = (
    <Stagger step={70} style={{ gap: theme.spacing.lg }}>
      <StepHeader
        title="What are you shopping for?"
        body="Pick your primary mood. Shop catalog, home recommendations, and Pip's tips change to match."
      />
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "flex-start" }}
      >
        {COLUMNS.map((column, c) => (
          <View key={c} style={{ flex: 1, gap: theme.spacing.md }}>
            {column.map((cell, i) => (
              <Appear key={cell.mode.key} delay={(i * 2 + c) * 90}>
                {products.loading && !catalogStalled ? (
                  <ModeCardSkeleton imageHeight={cell.imageHeight} />
                ) : (
                  <ModeCard
                    label={cell.mode.label}
                    caption={cell.mode.caption}
                    product={featuredFor(cell.mode.key, products.items)}
                    selected={selected === cell.mode.key}
                    imageHeight={cell.imageHeight}
                    onPress={() => choose(cell.mode.key)}
                  />
                )}
              </Appear>
            ))}
          </View>
        ))}
      </View>
    </Stagger>
  );

  const demoStep = (
    <Stagger step={70} style={{ gap: theme.spacing.lg }}>
      <StepHeader
        title="Meet Pip"
        body="Pip is your parcel buddy. It knows your orders and the shop, so ask it something real."
      />
      <View style={{ gap: theme.spacing.sm }}>
        <Text style={labelStyle}>Try asking</Text>
        {QUESTIONS.map((q) => (
          <Chip key={q.id} label={q.label} selected={asked === q.id} onPress={() => askPip(q.id)} />
        ))}
      </View>
      {asked ? (
        <Surface style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Pip pose="pip-delivering" size={44} />
            <Text style={labelStyle}>Pip says</Text>
          </View>
          {ai.loading ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Pip is thinking"
              style={{ gap: theme.spacing.sm }}
            >
              <Skeleton height={12} />
              <Skeleton width="80%" height={12} />
              <Skeleton width="55%" height={12} />
            </View>
          ) : ai.error ? (
            <InlineNotice tone="danger" live>
              {ai.error}
            </InlineNotice>
          ) : (
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                lineHeight: 22,
              }}
            >
              {ai.answer}
            </Text>
          )}
        </Surface>
      ) : null}
    </Stagger>
  );

  const hourChoices = (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={labelStyle}>Remind me at</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
        {REMINDER_HOURS.map((h) => (
          <Chip key={h} label={hourLabel(h)} selected={hour === h} onPress={() => setHour(h)} />
        ))}
      </View>
    </View>
  );

  const permissionStep = (
    <Stagger step={70} style={{ gap: theme.spacing.lg }}>
      <StepHeader
        title="Let Pip nudge you"
        body="One reminder a day about your open orders, at the time you pick. Change it or turn it off anytime in Settings."
      />
      <View style={{ alignItems: "center" }}>
        <Pip pose={reminderState === "on" ? "pip-celebrating" : "pip-delivering"} size={120} />
      </View>
      {reminderState === "idle" ? (
        hourChoices
      ) : reminderState === "on" ? (
        <Surface style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Lottie name="success" size={64} />
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Reminders are on
          </Text>
          <Text style={bodyStyle}>
            Every day at {hourLabel(hour)}. Change the time or turn it off in Settings.
          </Text>
        </Surface>
      ) : (
        <Surface>
          <InlineNotice icon="notifications-off-outline">
            Notifications are off for Parcel & Co. Allow them in your phone's Settings to get
            reminders later.
          </InlineNotice>
        </Surface>
      )}
      {reminderState === "idle" ? (
        <View style={{ gap: theme.spacing.md }}>
          <PrimaryButton
            label={saving ? "Turning on..." : "Turn on reminders"}
            onPress={() => void turnOn()}
            disabled={saving}
            icon="notifications-outline"
          />
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={finish}
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
        </View>
      ) : (
        <PrimaryButton label="Start shopping" onPress={finish} icon="bag-handle-outline" />
      )}
    </Stagger>
  );

  const content = step === 0 ? moodStep : step === 1 ? demoStep : permissionStep;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Welcome", headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top,
          height: insets.top + 56,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ width: 96, alignItems: "flex-start" }}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => go(step - 1)}
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.textMuted} />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                Back
              </Text>
            </Pressable>
          ) : null}
        </View>
        <PageDots count={STEPS} index={step} />
        <View style={{ width: 96, alignItems: "flex-end" }}>
          {step < STEPS - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              accessibilityState={{ disabled: !canNext }}
              disabled={!canNext}
              hitSlop={12}
              onPress={next}
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: canNext ? theme.colors.primary : theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  fontWeight: canNext ? theme.font.weight.bold : theme.font.weight.medium,
                }}
              >
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canNext ? theme.colors.primary : theme.colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Float amplitude={6} duration={3200} style={{ alignItems: "center" }}>
          {/* The picture has its own cream paper, so it is framed like a print in both themes. */}
          <AiImage
            prompt="Watercolor postcards with postage stamps, a postmark and a red ribbon on warm cream paper, no characters"
            fit="cover"
            style={{
              height: HERO_HEIGHT,
              aspectRatio: 4 / 3,
              borderRadius: theme.radius.lg,
            }}
          />
        </Float>
        <StepTransition step={step} direction={direction}>
          {content}
        </StepTransition>
      </ScrollView>

      {/* Pip's question sits in its own strip above the tab bar, so it never covers a card. */}
      {step === 0 ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            alignItems: "flex-end",
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <PipBubble
            label="Where is my package?"
            onPress={() => {
              go(1);
              askPip("package");
            }}
          />
        </View>
      ) : null}

      <OnboardingTabBar activeKey="home" onOpen={(key) => void openTab(key)} />
    </View>
  );
}
