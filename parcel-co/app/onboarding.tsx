// Setup has three steps, and the progress line counts exactly these:
// 1. what they shop for (orders Home's codes and deals and the Stores list);
// 2. which stores they buy from (their codes lead Home and Pip's answers);
// 3. their first question to Pip, answered from the real list of codes and deals (the first
//    success, before the paywall). Each step can be skipped; Back keeps every answer, and leaving
//    mid-setup comes back to the same step.
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CouponCard, DealCard, useSaved } from "../components/offers";
import { haptic, PressScale, SkeletonList, StepTransition } from "../components/motion";
import { Pip } from "../components/Pip";
import { StoreRow } from "../components/StoreRow";
import { InlineNotice, PrimaryButton } from "../components/ui";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import { deals, useRemote } from "../data/deals";
import { askPip, type PipAnswer } from "../data/pip";
import { usePrefs } from "../data/prefs";
import { useCollection } from "../data/repo";
import { INTERESTS, type ChatMessage, type Store } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

const STEP_NAMES = ["interests", "stores", "first_question"] as const;
const STEPS = STEP_NAMES.length;
const STEP_KEY = "onboarding.step";

const EXAMPLES = ["Is there a code for Nike?", "Gift ideas under $40", "Free shipping codes"];

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const prefs = usePrefs();
  const saved = useSaved();
  const history = useCollection<ChatMessage>("pip_messages");

  const [step, setStep] = useState(() => {
    const n = Number(answers[STEP_KEY]);
    return Number.isInteger(n) && n >= 0 && n < STEPS ? n : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [picked, setPicked] = useState<string[]>(prefs.interests);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer_] = useState<PipAnswer | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const stores = useRemote(() => deals.stores(), step === 1 ? "stores" : "idle");

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setProblem(null);
    setStep(next);
    void setAnswer(STEP_KEY, String(next));
  }

  function toggleInterest(key: string) {
    haptic("selection");
    setPicked((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  async function saveInterests() {
    await prefs.setInterests(picked);
    track("onboarding_step_completed", { step: STEP_NAMES[0], interests: picked.length });
    go(1);
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || asking) return;
    setAsking(true);
    setProblem(null);
    setAnswer_(null);
    try {
      // Asking here is agreeing to the AI notice shown above the box.
      await prefs.giveAiConsent();
      const now = new Date().toISOString();
      await history.add({ role: "user", text: q, createdAt: now });
      const result = await askPip({
        question: q,
        history: [],
        interests: prefs.interests,
        followed: prefs.storeNames,
        tone: prefs.tone,
      });
      await history.add({
        role: "assistant",
        text: result.text,
        createdAt: new Date().toISOString(),
        couponKeys: result.coupons.map((c) => c.key),
        dealKeys: result.deals.map((d) => d.key),
        coupons: result.coupons,
        deals: result.deals,
      });
      setAnswer_(result);
      haptic("success");
      track("onboarding_first_success", { coupons: result.coupons.length, deals: result.deals.length });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Pip couldn't answer just now. Try again.");
    } finally {
      setAsking(false);
    }
  }

  function finish() {
    track("onboarding_step_completed", { step: STEP_NAMES[2], asked: answer !== null });
    void setAnswer(STEP_KEY, "0");
    void completeOnboarding();
  }

  // Their interests first, then the stores with the most live codes (the API's order).
  const storeList: Store[] = [...(stores.data?.stores ?? [])]
    .sort((a, b) => {
      const rank = (s: Store) => (picked.includes((s.category ?? "").toLowerCase()) ? 0 : 1);
      return rank(a) - rank(b);
    })
    .slice(0, 15);

  const heading = {
    color: theme.colors.text,
    fontSize: theme.font.size.headline,
    fontWeight: theme.font.weight.bold,
    lineHeight: 34,
  } as const;
  const prose = { color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 23 } as const;
  const footer = {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: Math.max(insets.bottom, theme.spacing.md),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  } as const;

  function SkipLink({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => ({ minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.medium }}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: "Getting started" }} />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ minHeight: 44, justifyContent: "center" }}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to the previous step"
              hitSlop={8}
              onPress={() => go(step - 1)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                minHeight: 44,
                paddingRight: theme.spacing.sm,
                marginLeft: -theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>Back</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, fontWeight: theme.font.weight.medium }}>
          {`Getting started: step ${step + 1} of ${STEPS}`}
        </Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", gap: 6 }}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceAlt }} />
          ))}
        </View>
      </View>

      <StepTransition step={step} direction={direction} style={{ flex: 1 }}>
        {step === 0 ? (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                <Pip pose="pip-neutral" size={64} />
                <Text style={[prose, { flex: 1 }]}>
                  {"I'm Pip. Before you buy, ask me for a code and I'll tell you what I've found, or that I haven't found one."}
                </Text>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <Text accessibilityRole="header" style={heading}>What do you shop for?</Text>
                <Text style={prose}>Codes and deals for these come first on Home. Pick as many as you like.</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {INTERESTS.map((interest) => {
                  const on = picked.includes(interest.key);
                  return (
                    <PressScale
                      key={interest.key}
                      onPress={() => toggleInterest(interest.key)}
                      scaleTo={0.95}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      accessibilityLabel={interest.label}
                      style={{
                        minHeight: 48,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.xs,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radius.pill,
                        borderWidth: 1.5,
                        borderColor: on ? theme.colors.primary : theme.colors.textMuted,
                        backgroundColor: on ? theme.colors.primary : theme.colors.surface,
                      }}
                    >
                      <Ionicons
                        name={on ? "checkmark" : (interest.icon as never)}
                        size={18}
                        color={on ? theme.colors.onPrimary : theme.colors.text}
                      />
                      <Text style={{ color: on ? theme.colors.onPrimary : theme.colors.text, fontSize: theme.font.size.body, fontWeight: theme.font.weight.medium }}>
                        {interest.label}
                      </Text>
                    </PressScale>
                  );
                })}
              </View>
            </ScrollView>
            <View style={footer}>
              <PrimaryButton
                label={picked.length ? "Continue" : "Pick at least one"}
                disabled={!picked.length}
                onPress={() => void saveInterests()}
              />
              <SkipLink
                label="Skip: show me everything"
                onPress={() => {
                  void prefs.setInterests([]);
                  go(1);
                }}
              />
            </View>
          </>
        ) : step === 1 ? (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md }}>
              <View style={{ gap: theme.spacing.xs }}>
                <Text accessibilityRole="header" style={heading}>Where do you shop?</Text>
                <Text style={prose}>Follow the stores you buy from. Their codes lead Home, and Pip checks them first. Change these any time in Stores.</Text>
              </View>
              {stores.loading ? (
                <SkeletonList rows={5} />
              ) : stores.error ? (
                <InlineNotice tone="warning">{`${stores.error} You can follow stores later in the Stores tab.`}</InlineNotice>
              ) : storeList.length === 0 ? (
                <InlineNotice tone="warning">Pip's store list is still being filled. You can follow stores later in the Stores tab.</InlineNotice>
              ) : (
                <View>
                  {storeList.map((store) => (
                    <StoreRow key={store.slug} store={store} />
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={footer}>
              <PrimaryButton
                label={prefs.stores.length ? `Continue with ${prefs.stores.length} ${prefs.stores.length === 1 ? "store" : "stores"}` : "Continue"}
                onPress={() => {
                  track("onboarding_step_completed", { step: STEP_NAMES[1], stores: prefs.stores.length });
                  go(2);
                }}
              />
            </View>
          </>
        ) : (
          <>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md }}
            >
              <View style={{ gap: theme.spacing.xs }}>
                <Text accessibilityRole="header" style={heading}>Ask before you buy</Text>
                <Text style={prose}>
                  Try it now: what are you about to buy, and where? Pip answers from the codes and deals it has collected.
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  onSubmitEditing={() => void ask(question)}
                  placeholder="e.g. a code for Nike"
                  placeholderTextColor={theme.colors.textMuted}
                  returnKeyType="send"
                  accessibilityLabel="Ask Pip"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 48,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1.5,
                    borderColor: theme.colors.textMuted,
                    outlineStyle: "solid",
                    outlineWidth: 0,
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                  }}
                />
                <PressScale
                  onPress={() => void ask(question)}
                  disabled={!question.trim() || asking}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Ask Pip"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: question.trim() && !asking ? theme.colors.primary : theme.colors.surfaceAlt,
                  }}
                >
                  <Ionicons name="send" size={18} color={question.trim() && !asking ? theme.colors.onPrimary : theme.colors.textMuted} />
                </PressScale>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {[prefs.storeNames[0] ? `Any codes for ${prefs.storeNames[0]}?` : null, ...EXAMPLES]
                  .filter((q): q is string => Boolean(q))
                  .slice(0, 3)
                  .map((q) => (
                    <PressScale
                      key={q}
                      onPress={() => {
                        setQuestion(q);
                        void ask(q);
                      }}
                      disabled={asking}
                      scaleTo={0.95}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask Pip: ${q}`}
                      style={{
                        minHeight: 40,
                        justifyContent: "center",
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radius.pill,
                        borderWidth: 1,
                        borderColor: theme.colors.primary,
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>{q}</Text>
                    </PressScale>
                  ))}
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}>
                Asking sends your question to an AI service, with the codes and deals Pip found, so it can write the answer. Your name and account aren't sent.
              </Text>

              {asking ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <Pip pose="pip-delivering" size={40} />
                  <Text style={prose}>Pip is looking…</Text>
                </View>
              ) : null}
              {problem ? <InlineNotice tone="danger" live>{problem}</InlineNotice> : null}
              {answer ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: theme.spacing.sm,
                      padding: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Pip pose="pip-celebrating" size={36} />
                    <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 23 }}>
                      {answer.text}
                    </Text>
                  </View>
                  {answer.coupons.map((c) => (
                    <CouponCard key={c.key} coupon={c} saved={saved.isSaved(c.key)} onToggleSave={() => void saved.toggleCoupon(c)} />
                  ))}
                  {answer.deals.map((d) => (
                    <DealCard key={d.key} deal={d} saved={saved.isSaved(d.key)} onToggleSave={() => void saved.toggleDeal(d)} />
                  ))}
                </View>
              ) : null}
            </ScrollView>
            <View style={footer}>
              <PrimaryButton label={answer ? "Finish setup" : "Finish without asking"} onPress={finish} />
            </View>
          </>
        )}
      </StepTransition>
    </View>
  );
}
