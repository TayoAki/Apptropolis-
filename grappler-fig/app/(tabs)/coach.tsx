import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useRef, useState, type ComponentProps } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import {
  DrillTile,
  Frame,
  TechniqueOverlay,
  WaveDots,
  type Drill,
} from "../../components/coach/CoachParts";
import { EmptyState } from "../../components/empty-state";
import {
  Appear,
  CountUp,
  PressScale,
  Skeleton,
  Stagger,
  haptic,
} from "../../components/motion";
import { track } from "../../data/analytics";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { pickPhoto, type Photo } from "../../data/photos";
import { openPaywall, usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import { dayKey, type CoachMessage, type WorkoutSession } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const FREE_QUESTIONS_PER_DAY = 3;
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

type IconName = ComponentProps<typeof Ionicons>["name"];

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
    <Frame accent={coach} style={{ gap: theme.spacing.sm }}>
      <Text
        style={{
          color: coach ? theme.colors.primary : theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.bold,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {coach ? "Coach AI" : "You"}
      </Text>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          accessibilityLabel="Your frame"
          contentFit="cover"
          style={{ height: 180, borderRadius: theme.radius.md }}
        />
      ) : null}
      <Text
        style={{
          color: theme.colors.text,
          fontSize: coach ? theme.font.size.title : theme.font.size.body,
          fontWeight: coach ? theme.font.weight.medium : theme.font.weight.regular,
          lineHeight: coach ? 30 : 24,
        }}
      >
        {text}
      </Text>
      {drill && onRun ? <DrillTile drill={drill} onRun={() => onRun(drill)} /> : null}
    </Frame>
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
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const { isPremium } = usePurchases();
  const { items: messages, loading, add } = useCollection<CoachMessage>("coach_messages");
  const { items: sessions } = useCollection<WorkoutSession>("workout_sessions");
  const { ask, error, reset } = useAI();

  const listRef = useRef<FlatList<CoachMessage>>(null);
  const stick = useRef(true);
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
  const left = Math.max(0, FREE_QUESTIONS_PER_DAY - askedToday);
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

  const header = (
    <Stagger step={70} style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
      <Frame accent style={{ gap: theme.spacing.sm }}>
        <View style={{ height: 200, borderRadius: theme.radius.md, overflow: "hidden" }}>
          <AiImage
            prompt="black and white side view of a boxer throwing a rear cross in a dim gym, dramatic light"
            style={{ height: 200, borderRadius: theme.radius.md }}
          />
          <TechniqueOverlay label="REAR CROSS TRAIN" />
        </View>
        <Pressable
          onPress={() => setDraft(SAMPLE_QUESTION)}
          accessibilityRole="button"
          accessibilityLabel={`Use the question: ${SAMPLE_QUESTION}`}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {SAMPLE_QUESTION}
          </Text>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
          }}
        >
          <Text
            style={{
              flexShrink: 1,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
            }}
          >
            Send a frame of your own training for a technique check
          </Text>
          {!isPremium ? (
            <Pressable
              onPress={openPaywall}
              accessibilityRole="button"
              accessibilityLabel="Unlock frame checks with Go Pro"
              hitSlop={8}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="lock-closed" size={14} color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Go Pro
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Frame>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        {isPremium ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Ionicons name="infinite" size={22} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              Unlimited coaching is on
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: theme.spacing.xs,
              flexShrink: 1,
            }}
          >
            <CountUp
              value={left}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              free questions left today
            </Text>
          </View>
        )}
        {!isPremium ? (
          <Pressable
            onPress={openPaywall}
            accessibilityRole="button"
            accessibilityLabel="Go Pro for unlimited coaching and frame checks"
            hitSlop={12}
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
                fontWeight: theme.font.weight.bold,
              }}
            >
              Go Pro
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Stagger>
  );

  const empty = loading ? (
    <Frame>
      <Skeleton width={70} height={10} />
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
      <Skeleton width="55%" height={12} />
    </Frame>
  ) : (
    <View style={{ gap: theme.spacing.md }}>
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
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
      {pending ? (
        <>
          <Appear distance={18}>
            <Bubble role="user" text={pending.text} photoUri={pending.photoUri} />
          </Appear>
          <Appear distance={18}>
            <Frame accent style={{ gap: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Coach AI
              </Text>
              <WaveDots />
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                Checking your stance, hands and hips against your last sessions.
              </Text>
            </Frame>
          </Appear>
        </>
      ) : null}
      {error && !pending ? (
        <Frame style={{ borderColor: theme.colors.danger }}>
          <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>{error}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            Your question is back in the box. Send it again when you're ready.
          </Text>
        </Frame>
      ) : null}
    </View>
  );

  const composer = (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
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
            isPremium ? "Add a frame for a technique check" : "Frame checks are in Go Pro"
          }
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="camera-outline" size={24} color={theme.colors.text} />
          {!isPremium ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 16,
                height: 16,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primary,
              }}
            >
              <Ionicons name="lock-closed" size={9} color={theme.colors.onPrimary} />
            </View>
          ) : null}
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => send(draft, frame)}
            placeholder="Ask coach anything..."
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Message to the coach"
            returnKeyType="send"
            editable={!busy}
            style={{
              flex: 1,
              minHeight: 44,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              paddingVertical: theme.spacing.sm,
            }}
          />
        </View>
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
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
            opacity: canSend ? 1 : 0.5,
          }}
        >
          <Ionicons name="arrow-forward" size={22} color={theme.colors.onPrimary} />
        </PressScale>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ width: 44 }} />
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Corner Coach
        </Text>
        <Pressable
          onPress={() => router.navigate("/progress")}
          accessibilityRole="button"
          accessibilityLabel="Session history"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="clipboard-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

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
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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
        onContentSizeChange={() => {
          if (stick.current) listRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {composer}
    </KeyboardAvoidingView>
  );
}
