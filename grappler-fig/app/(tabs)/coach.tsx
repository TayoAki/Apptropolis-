import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AiImage } from "../../components/AiImage";
import { Card } from "../../components/card";
import {
  DrillTile,
  TechniqueOverlay,
  WaveDots,
  type Drill,
} from "../../components/coach/CoachParts";
import { EmptyState } from "../../components/empty-state";
import { goPro } from "../../components/paywall/open";
import { Appear, PressScale, Skeleton, haptic } from "../../components/motion";
import { FrameMarks, ScreenHeader, TextButton, type IconName } from "../../components/ui";
import { track } from "../../data/analytics";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { pickPhoto, type Photo } from "../../data/photos";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import { dayKey, type CoachMessage, type WorkoutSession } from "../../data/schema";
import { FREE_COACH_QUESTIONS_PER_DAY } from "../../data/training";
import { useTheme } from "../../theme/ThemeProvider";

const openPaywall = () => goPro("coach");
const SAMPLE_QUESTION = "How is my hip rotation here?";
const SUGGESTIONS = [
  "My jab drops after the cross. Why?",
  "Give me a drill for a hook that gets countered",
  "How hard should I hit on bag day vs. shadowboxing?",
];

const COACH_RULES = [
  "You are Corner Coach, a direct boxing coach for someone training alone at home or in a gym with a bag or shadowboxing.",
  "Answer in at most four short sentences: name the one fault that matters most, the body part causing it, and the fix.",
  'Then give one drill to run as a timed round. Keep callouts short, like "jab, cross, pivot".',
  'Reply with JSON only: {"answer": string, "drill": {"title": string, "rounds": number, "roundSeconds": number, "callouts": string} | null}.',
  "Set drill to null when the question isn't about technique, conditioning or strategy you can drill. Never use emoji.",
].join(" ");

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

/** The coach answers JSON (an answer and an optional drill); plain text is shown as it is. */
function parseReply(raw: string): { answer: string; drill: Drill | null } {
  const text = raw.trim();
  const body = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const value = JSON.parse(body) as { answer?: unknown; drill?: unknown };
    const answer =
      typeof value.answer === "string" && value.answer.trim() ? value.answer.trim() : text;
    const d = value.drill as
      | { title?: unknown; rounds?: unknown; roundSeconds?: unknown; callouts?: unknown }
      | null
      | undefined;
    const drill: Drill | null =
      d && typeof d.title === "string" && d.title.trim()
        ? {
            title: d.title.trim().slice(0, 60),
            rounds: clamp(d.rounds, 1, 6, 3),
            roundSeconds: clamp(d.roundSeconds, 30, 180, 60),
            callouts: typeof d.callouts === "string" ? d.callouts.trim().slice(0, 120) : "",
          }
        : null;
    return { answer, drill };
  } catch {
    return { answer: text, drill: null };
  }
}

/** One message. The coach's sit on the left as cards; yours sit on the right. */
function Bubble({
  role,
  text,
  photoUri,
  drill,
  onRun,
}: {
  role: "user" | "coach";
  text: string;
  photoUri?: string | null;
  drill?: Drill;
  onRun?: (drill: Drill) => void;
}) {
  const theme = useTheme();
  const coach = role === "coach";
  return (
    <View
      accessible={!drill}
      accessibilityLabel={`${coach ? "Coach" : "You"}: ${text}`}
      style={{
        alignSelf: coach ? "flex-start" : "flex-end",
        maxWidth: "88%",
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderBottomLeftRadius: coach ? theme.radius.sm / 2 : theme.radius.md,
        borderBottomRightRadius: coach ? theme.radius.md : theme.radius.sm / 2,
        borderWidth: coach ? 1 : 0,
        borderColor: theme.colors.border,
        backgroundColor: coach ? theme.colors.surface : theme.colors.surfaceAlt,
      }}
    >
      {coach ? (
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Coach
        </Text>
      ) : null}
      {photoUri ? (
        <View style={{ borderRadius: theme.radius.sm, overflow: "hidden" }}>
          <Image
            source={{ uri: photoUri }}
            accessibilityLabel="Your frame"
            contentFit="cover"
            style={{ width: 240, maxWidth: "100%", height: 180 }}
          />
          <FrameMarks />
        </View>
      ) : null}
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
        {text}
      </Text>
      {drill && onRun ? <DrillTile drill={drill} onRun={() => onRun(drill)} /> : null}
    </View>
  );
}

function Chip({
  label,
  icon,
  onPress,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.96}
      style={[
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={theme.colors.primary} /> : null}
      <Text
        style={{
          flexShrink: 1,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

export default function CoachScreen() {
  const theme = useTheme();
  const { answers } = useAppState();
  const { isPremium } = usePurchases();
  const { items: messages, loading, add } = useCollection<CoachMessage>("coach_messages");
  const { items: sessions } = useCollection<WorkoutSession>("workout_sessions");
  const { ask, error, reset } = useAI();

  const listRef = useRef<FlatList<CoachMessage>>(null);
  const stick = useRef(true);
  const opened = useRef(false);
  const [draft, setDraft] = useState("");
  const [frame, setFrame] = useState<Photo | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [pending, setPending] = useState<{ text: string; photoUri: string | null } | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [drills, setDrills] = useState<Record<string, Drill>>({});

  const ordered = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );
  const askedToday = ordered.filter(
    (m) => m.role === "user" && dayKey(m.createdAt) === dayKey(new Date()),
  ).length;
  const left = Math.max(0, FREE_COACH_QUESTIONS_PER_DAY - askedToday);
  const canAsk = isPremium || left > 0;
  const busy = pending !== null;
  const canSend = Boolean((draft.trim() || frame) && !busy);

  function buildPrompt(question: string, photo: Photo | null): string {
    const fixes = [...sessions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((s) => s.topFix)
      .filter(Boolean);
    const history = ordered
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Boxer" : "Coach"}: ${m.text}`)
      .join("\n");
    return [
      `Boxer level: ${answers.skilllevel ?? "not set"}. Training setup: ${answers.trainingsetup ?? "not set"}.`,
      `Recent fixes from their sessions: ${fixes.length ? fixes.join(" | ") : "none yet"}.`,
      history ? `Conversation so far:\n${history}` : "",
      photo ? "A frame of their own training is attached: check stance, guard, hands and hips in it." : "",
      `New question: ${question}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function send(text: string, photo: Photo | null) {
    const question = text.trim() || (photo ? "Check the technique in this frame." : "");
    if (!question || busy) return;
    if (!canAsk || (photo && !isPremium)) {
      openPaywall();
      return;
    }
    reset();
    stick.current = true;
    setPending({ text: question, photoUri: photo?.uri ?? null });
    setDraft("");
    setFrame(null);
    setChoosing(false);
    const reply = await ask({
      prompt: buildPrompt(question, photo),
      instructions: COACH_RULES,
      photo,
      json: true,
    });
    if (reply === null) {
      // Nothing was saved and nothing counted: the question goes back into the box.
      setPending(null);
      setDraft(question);
      setFrame(photo);
      return;
    }
    const { answer, drill } = parseReply(reply);
    const mine = await add({ role: "user", text: question, createdAt: new Date().toISOString() });
    if (photo) setPhotos((p) => ({ ...p, [mine.id]: photo.uri }));
    const coach = await add({ role: "coach", text: answer, createdAt: new Date().toISOString() });
    if (drill) setDrills((d) => ({ ...d, [coach.id]: drill }));
    setPending(null);
    track("coach_question", { photo: photo !== null });
  }

  function runDrill(drill: Drill) {
    haptic("medium");
    track("drill_started", { source: "coach" });
    router.navigate({
      pathname: "/",
      params: {
        drill: drill.title,
        rounds: String(drill.rounds),
        roundSeconds: String(drill.roundSeconds),
        callouts: drill.callouts,
      },
    });
  }

  function onCamera() {
    if (!isPremium) {
      openPaywall();
      return;
    }
    haptic("selection");
    setChoosing((open) => !open);
  }

  async function takeFrame(source: "library" | "camera") {
    setChoosing(false);
    const photo = await pickPhoto({ source });
    if (photo) {
      setFrame(photo);
      haptic("selection");
    }
  }

  // What a frame check is, shown while the conversation is empty.
  const frameCheck = (
    <Card>
      <View style={{ height: 180, borderRadius: theme.radius.sm, overflow: "hidden" }}>
        <AiImage
          prompt="black and white side view of a boxer throwing a rear cross in a dim gym, dramatic light"
          style={{ height: 180 }}
        />
        <TechniqueOverlay label="Rear cross" />
        <FrameMarks />
      </View>
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Technique check from a frame
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
          Send a frame of your own training and ask about it, for example "{SAMPLE_QUESTION}"
        </Text>
      </View>
      {isPremium ? (
        <TextButton
          label="Add a frame"
          icon="camera-outline"
          onPress={onCamera}
          style={{ alignSelf: "flex-start" }}
        />
      ) : (
        <TextButton
          label="Frame checks are part of Pro"
          icon="lock-closed"
          onPress={openPaywall}
          accessibilityLabel="Unlock frame checks with Pro"
          style={{ alignSelf: "flex-start" }}
        />
      )}
    </Card>
  );

  const empty = loading ? (
    <View style={{ gap: theme.spacing.md }}>
      <Skeleton width="70%" height={64} radius={theme.radius.md} style={{ alignSelf: "flex-end" }} />
      <Skeleton width="88%" height={120} radius={theme.radius.md} />
    </View>
  ) : pending ? null : (
    <View style={{ gap: theme.spacing.lg }}>
      <EmptyState
        icon="chatbubbles-outline"
        title="Ask about the round you just threw"
        body="Describe a round, a sparring session or a drill that keeps breaking down. Answers take a few lines, plus one drill to run next."
      />
      <View style={{ gap: theme.spacing.sm }}>
        {SUGGESTIONS.map((suggestion, i) => (
          <Appear key={suggestion} delay={250 + i * 90}>
            <Chip label={suggestion} onPress={() => setDraft(suggestion)} />
          </Appear>
        ))}
      </View>
      {frameCheck}
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.md, marginTop: pending || error ? theme.spacing.md : 0 }}>
      {pending ? (
        <>
          <Appear distance={18}>
            <Bubble role="user" text={pending.text} photoUri={pending.photoUri} />
          </Appear>
          <Appear distance={18}>
            <View
              style={{
                alignSelf: "flex-start",
                gap: theme.spacing.sm,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <WaveDots />
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                Coach is writing…
              </Text>
            </View>
          </Appear>
        </>
      ) : null}
      {error && !pending ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            gap: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="alert-circle" size={22} color={theme.colors.danger} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
              {error}
            </Text>
            <Text
              style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2, lineHeight: 20 }}
            >
              Your question is back in the box. Send it again when you're ready.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  const quota = isPremium ? null : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.md,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 2,
          fontVariant: ["tabular-nums"],
        }}
      >
        {left > 0
          ? `${left} free ${left === 1 ? "question" : "questions"} left today`
          : "No free questions left today"}
      </Text>
      <TextButton
        label="Go Pro"
        onPress={openPaywall}
        accessibilityLabel="Go Pro for unlimited coaching and frame checks"
      />
    </View>
  );

  const composer = (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.sm,
        gap: theme.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
      {quota}
      {choosing ? (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <Chip
            label="Photo library"
            icon="images-outline"
            onPress={() => takeFrame("library")}
            style={{ flex: 1, justifyContent: "center" }}
          />
          <Chip
            label="Take photo"
            icon="camera-outline"
            onPress={() => takeFrame("camera")}
            style={{ flex: 1, justifyContent: "center" }}
          />
        </View>
      ) : null}
      {frame ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <Image
            source={{ uri: frame.uri }}
            accessibilityLabel="Frame to check"
            contentFit="cover"
            style={{ width: 52, height: 52, borderRadius: theme.radius.sm }}
          />
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
            }}
          >
            Frame ready for a technique check
          </Text>
          <Pressable
            onPress={() => setFrame(null)}
            accessibilityRole="button"
            accessibilityLabel="Remove frame"
            hitSlop={12}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Pressable
          onPress={onCamera}
          accessibilityRole="button"
          accessibilityLabel={
            isPremium ? "Add a frame for a technique check" : "Frame checks are part of Pro"
          }
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons
            name={isPremium ? "camera-outline" : "lock-closed-outline"}
            size={22}
            color={theme.colors.text}
          />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft, frame)}
          placeholder="Ask your coach"
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel="Message to the coach"
          returnKeyType="send"
          editable={!busy}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.textMuted,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
          }}
        />
        <PressScale
          onPress={() => send(draft, frame)}
          disabled={!canSend}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Send question"
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
          <Ionicons
            name="arrow-up"
            size={22}
            color={canSend ? theme.colors.onPrimary : theme.colors.textMuted}
          />
        </PressScale>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Corner coach" />

      <FlatList
        ref={listRef}
        data={ordered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Appear delay={Math.min(index, 8) * 50} distance={18}>
            <Bubble
              role={item.role}
              text={item.text}
              photoUri={photos[item.id]}
              drill={drills[item.id]}
              onRun={runDrill}
            />
          </Appear>
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        ListEmptyComponent={empty ?? undefined}
        ListFooterComponent={footer}
        contentContainerStyle={{ padding: theme.spacing.lg, flexGrow: 1 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          stick.current =
            contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
        }}
        onContentSizeChange={(_width, height) => {
          if (!stick.current || ordered.length === 0) return;
          // Open on the latest message without a visible scroll; follow new ones smoothly. The
          // offset comes from the measured height: scrollToEnd guesses before rows are measured.
          listRef.current?.scrollToOffset({ offset: height, animated: opened.current });
          opened.current = true;
        }}
      />

      {composer}
    </KeyboardAvoidingView>
  );
}
