import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { EmptyState } from "../../components/empty-state";
import { Lottie } from "../../components/lottie";
import { Brackets } from "../../components/opponent-detail/Brackets";
import { FrameCard } from "../../components/opponent-detail/FrameCard";
import {
  Appear,
  PressScale,
  Pulse,
  Skeleton,
  Stagger,
  StepTransition,
  haptic,
} from "../../components/motion";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import { formatDay, type OpponentScout, type Stance } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const STANCES: Stance[] = ["orthodox", "southpaw", "unclear"];
const STANCE_LABEL: Record<Stance, string> = {
  orthodox: "Orthodox",
  southpaw: "Southpaw",
  unclear: "Switch stance",
};
const OPENING_LABEL: Record<Stance, string> = {
  orthodox: "Orthodox jab",
  southpaw: "Southpaw jab",
  unclear: "Switch-stance jab",
};

interface Frame {
  key: string;
  label: string;
  uri?: string;
  prompt?: string;
}

/** Splits the stored game plan into its strategy text and its callout list. */
function parseGamePlan(gamePlan: string): { plan: string; callouts: string[] } {
  const plan = gamePlan.split(/callouts?:/i)[0]?.trim() ?? "";
  const listed = /callouts?:\s*(.+)$/i.exec(gamePlan)?.[1] ?? "";
  const callouts = listed
    .replace(/\.\s*$/, "")
    .split(",")
    .map((callout) => callout.trim())
    .filter(Boolean);
  return { plan, callouts };
}

/** "Rests the rear hand. Steps back." becomes one line per sentence. */
function sentences(text: string): string[] {
  return text
    .split(/\.\s+/)
    .map((sentence) => sentence.replace(/\.$/, "").trim())
    .filter(Boolean);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Callouts split into up to `count` rounds of equal length, in order. */
function toRounds(callouts: string[], count = 3): string[][] {
  if (callouts.length === 0) return [];
  const size = Math.ceil(callouts.length / count);
  const rounds: string[][] = [];
  for (let i = 0; i < callouts.length; i += size) rounds.push(callouts.slice(i, i + size));
  return rounds;
}

function framesFor(scout: OpponentScout): Frame[] {
  const stanceWords =
    scout.stance === "southpaw"
      ? "a southpaw"
      : scout.stance === "orthodox"
        ? "an orthodox"
        : "a switch-stance";
  const saved: Frame[] = scout.photoUri
    ? [{ key: "photo", label: "Main frame", uri: scout.photoUri }]
    : [];
  return [
    ...saved,
    {
      key: "jab",
      label: OPENING_LABEL[scout.stance],
      prompt: `black and white photo of a boxer throwing a jab from ${stanceWords} stance, dramatic side light, dark arena, no text`,
    },
    {
      key: "guard",
      label: "Pulled guard",
      prompt:
        "black and white photo of a boxer pulling his lead hand back into a high guard after a jab, dark arena, no text",
    },
    {
      key: "chin",
      label: "Dropped chin",
      prompt:
        "black and white photo of a boxer mid-punch with his chin dropped and head forward, motion blur, dark arena, no text",
    },
  ];
}

function Heading({ children }: { children: string }) {
  const { colors, spacing, font } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.textMuted,
        fontSize: font.size.caption,
        fontWeight: font.weight.bold,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { colors, spacing, font } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: font.size.caption,
          fontWeight: font.weight.bold,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export default function OpponentReportScreen() {
  const theme = useTheme();
  const { colors, spacing, radius, font } = theme;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, update, remove } = useCollection<OpponentScout>("opponent_scouts");
  const { answers } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const scout = items.find((item) => item.id === id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    stance: "unclear" as Stance,
    read: "",
    callouts: "",
  });

  const press = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const launching = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  const ringColor = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  function startEdit() {
    if (!scout) return;
    setDraft({
      name: scout.name,
      stance: scout.stance,
      read: scout.tendencies,
      callouts: parseGamePlan(scout.gamePlan).callouts.join(", "),
    });
    setNameError(false);
    setConfirming(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setNameError(false);
  }

  async function save() {
    if (!scout || saving) return;
    const name = draft.name.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    const { plan, callouts } = parseGamePlan(scout.gamePlan);
    const list = draft.callouts
      .split(",")
      .map((callout) => callout.trim())
      .filter(Boolean);
    const changedCallouts = list.join(", ") !== callouts.join(", ");
    // Custom callout combos are premium: free users keep the plan's callouts as written.
    const gamePlan =
      isPremium && changedCallouts && list.length > 0
        ? `${plan} Callouts: ${list.join(", ")}.`.trim()
        : scout.gamePlan;
    setSaving(true);
    try {
      await update(scout.id, {
        name,
        stance: draft.stance,
        tendencies: draft.read.trim() || scout.tendencies,
        gamePlan,
      });
      haptic("success");
      setSavedTick((n) => n + 1);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  /** The signature move: a shutter flash, the card presses and flashes red, a double heavy tap, then the round starts. */
  function startRound() {
    if (!scout || launching.current) return;
    launching.current = true;
    const scoutId = scout.id;
    haptic("heavy");
    timers.current.push(setTimeout(() => haptic("heavy"), 110));
    Animated.timing(press, {
      toValue: 0.95,
      duration: 120,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(press, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }).start();
    });
    Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 90, useNativeDriver: false }),
      Animated.timing(ring, { toValue: 0, duration: 320, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    // The Train screen reads `scout` to load these callouts as a round.
    timers.current.push(
      setTimeout(() => {
        router.navigate({ pathname: "/", params: { scout: scoutId } });
        launching.current = false;
      }, 460),
    );
  }

  async function confirmDelete() {
    if (!scout) return;
    haptic("warning");
    await remove(scout.id);
    if (router.canGoBack()) router.back();
    else router.replace("/scout");
  }

  const headerTitle = () =>
    scout ? (
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: font.size.title,
          fontWeight: font.weight.bold,
          letterSpacing: -0.3,
        }}
      >
        {scout.name}
      </Text>
    ) : null;

  const headerRight = () => (
    <Pressable
      onPress={editing ? cancelEdit : startEdit}
      accessibilityRole="button"
      accessibilityLabel={editing ? "Cancel editing" : "Edit report"}
      hitSlop={12}
      style={({ pressed }) => ({
        minHeight: 36,
        minWidth: 64,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: radius.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Brackets color={colors.primary} size={6} inset={2} thickness={1.5} />
      <Text
        style={{
          color: colors.primary,
          fontSize: font.size.caption,
          fontWeight: font.weight.bold,
          letterSpacing: 1,
        }}
      >
        {editing ? "CANCEL" : "EDIT"}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          padding: spacing.lg,
          gap: spacing.xl,
        }}
      >
        <Stack.Screen options={{ title: "Opponent Report" }} />
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Skeleton width={140} height={106} radius={radius.md} />
          <Skeleton width={140} height={106} radius={radius.md} />
        </View>
        <Skeleton height={150} radius={radius.lg} />
        <View style={{ gap: spacing.sm }}>
          <Skeleton width="40%" height={12} />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton width="70%" height={14} />
        </View>
      </View>
    );
  }

  if (!scout) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          padding: spacing.lg,
        }}
      >
        <Stack.Screen options={{ title: "Opponent Report" }} />
        <EmptyState
          icon="eye-off-outline"
          title="This report is gone"
          body="It was deleted on this phone. Scout a new opponent to build another game plan."
          actionLabel="Back to Scout"
          onAction={() => router.replace("/scout")}
        />
      </View>
    );
  }

  const { callouts } = parseGamePlan(scout.gamePlan);
  const rounds = toRounds(callouts);
  const weaknesses = sentences(scout.tendencies);
  const verdictSentence = weaknesses[0];
  const verdict = verdictSentence ? `${capitalize(verdictSentence)}.` : scout.tendencies;
  const frames = framesFor(scout);
  const frameWidth = Math.round(screenWidth * 0.38);
  const frameHeight = Math.round(frameWidth * 0.76);
  const level = answers["skilllevel"] ?? "";
  const tip = /beginner/i.test(level)
    ? "Run each round at half speed first. Get the shape right before you add power."
    : /intermediate|advanced/i.test(level)
      ? "Run it at full speed and call your own counter off the first shot."
      : "";

  const inputStyle = {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    fontSize: font.size.body,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const readCard = (
    <Animated.View
      style={{
        borderWidth: 1,
        borderColor: ringColor,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
        transform: [{ scale: press }],
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={{
              color: colors.onPrimary,
              fontSize: font.size.caption,
              fontWeight: font.weight.bold,
              letterSpacing: 1,
            }}
          >
            AI READ
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: colors.textMuted, fontSize: font.size.caption }}
        >
          {`${STANCE_LABEL[scout.stance]} · ${formatDay(scout.createdAt)}`}
        </Text>
        {savedTick > 0 ? <Lottie key={savedTick} name="success" size={36} /> : null}
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: colors.text,
          fontSize: font.size.title,
          fontWeight: font.weight.medium,
          lineHeight: 28,
        }}
      >
        {verdict}
      </Text>
    </Animated.View>
  );

  const editForm = (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <Field label="Name or nickname">
        <TextInput
          value={draft.name}
          onChangeText={(name) => {
            setNameError(false);
            setDraft((d) => ({ ...d, name }));
          }}
          placeholder="Marcus, Thursday partner"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Opponent name"
          maxLength={60}
          returnKeyType="done"
          style={inputStyle}
        />
        {nameError ? (
          <Text style={{ color: colors.danger, fontSize: font.size.caption }}>
            Give them a name so you can find this report.
          </Text>
        ) : null}
      </Field>

      <Field label="Stance">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {STANCES.map((stance) => {
            const selected = draft.stance === stance;
            return (
              <Pressable
                key={stance}
                onPress={() => {
                  haptic("selection");
                  setDraft((d) => ({ ...d, stance }));
                }}
                accessibilityRole="button"
                accessibilityLabel={STANCE_LABEL[stance]}
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: spacing.md,
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: selected ? colors.onPrimary : colors.text,
                    fontWeight: font.weight.medium,
                  }}
                >
                  {STANCE_LABEL[stance]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Read">
        <TextInput
          value={draft.read}
          onChangeText={(read) => setDraft((d) => ({ ...d, read }))}
          placeholder="What you see in their guard, footwork and habits"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Read on this opponent"
          multiline
          textAlignVertical="top"
          style={{ ...inputStyle, minHeight: 110 }}
        />
      </Field>

      <Field label="Callout combo">
        {isPremium ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={draft.callouts}
              onChangeText={(callouts) => setDraft((d) => ({ ...d, callouts }))}
              placeholder="jab, jab, cross, slip left"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Callout combo, separated by commas"
              style={inputStyle}
            />
            <Text style={{ color: colors.textMuted, fontSize: font.size.caption, lineHeight: 18 }}>
              Separate callouts with commas. The timer splits them into three rounds.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => openPaywall()}
            accessibilityRole="button"
            accessibilityLabel="Unlock custom callouts"
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              minHeight: 44,
              padding: spacing.md,
              borderRadius: radius.sm,
              backgroundColor: colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="lock-closed" size={18} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: font.size.body }}>
              Custom callout combos are premium
            </Text>
            <Text style={{ color: colors.primary, fontWeight: font.weight.bold }}>Unlock</Text>
          </Pressable>
        )}
      </Field>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Pressable
          onPress={cancelEdit}
          accessibilityRole="button"
          accessibilityLabel="Cancel changes"
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontWeight: font.weight.medium }}>Cancel</Text>
        </Pressable>
        <PressScale
          onPress={save}
          disabled={saving}
          haptic="light"
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Save report"
          accessibilityState={{ disabled: saving }}
          style={{
            flex: 1,
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: font.weight.bold }}>
            {saving ? "Saving…" : "Save report"}
          </Text>
        </PressScale>
      </View>
    </View>
  );

  const weaknessSection = (
    <View>
      <Heading>Weaknesses to attack</Heading>
      {weaknesses.length === 0 ? (
        <EmptyState
          icon="locate-outline"
          title="No weak spot yet"
          body="This read didn't name one. Scout again with a clearer frame of their guard."
          actionLabel="Scout again"
          onAction={() => router.navigate("/scout")}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {weaknesses.map((text, index) => (
            <Appear key={text} delay={index * 70} distance={6} duration={240}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing.md,
                }}
              >
                <Ionicons
                  name="locate-outline"
                  size={22}
                  color={colors.primary}
                  style={{ marginTop: 1 }}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: font.size.body,
                    lineHeight: 22,
                  }}
                >
                  {capitalize(text)}
                </Text>
              </View>
            </Appear>
          ))}
        </View>
      )}
    </View>
  );

  const planSection = (
    <View>
      <Heading>Generated game plan</Heading>
      {rounds.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="No callouts yet"
          body="This plan has no callout combo to run. Add one in Edit, or scout again with a clearer frame."
          actionLabel="Edit report"
          onAction={startEdit}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {rounds.map((calls, index) => (
            <Appear key={index} delay={index * 90} distance={8} duration={260}>
              <View style={{ flexDirection: "row", alignItems: "stretch", gap: spacing.md }}>
                <View
                  style={{
                    width: 64,
                    minHeight: 56,
                    borderRadius: radius.sm,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Brackets color={colors.onPrimary} size={9} inset={5} thickness={1.5} />
                  <Text
                    style={{
                      color: colors.onPrimary,
                      fontSize: font.size.title,
                      fontWeight: font.weight.bold,
                      letterSpacing: -0.5,
                    }}
                  >
                    {`R${index + 1}`}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 22 }}>
                    <Text style={{ fontWeight: font.weight.bold }}>{`ROUND ${index + 1}: `}</Text>
                    {calls.map(capitalize).join(", ")}
                  </Text>
                </View>
              </View>
            </Appear>
          ))}
          {tip ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.caption, lineHeight: 18 }}>
              {tip}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  const deleteSection = (
    <View style={{ gap: spacing.md }}>
      {confirming ? (
        <Appear distance={6} duration={220}>
          <View
            style={{
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.danger,
            }}
          >
            <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 22 }}>
              Delete this report? Its frames, read and game plan are removed from this phone.
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Pressable
                onPress={() => setConfirming(false)}
                accessibilityRole="button"
                accessibilityLabel="Keep report"
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontWeight: font.weight.medium }}>Keep it</Text>
              </Pressable>
              <PressScale
                onPress={confirmDelete}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel="Delete my report"
                style={{
                  flex: 1,
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  backgroundColor: colors.danger,
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: font.weight.bold }}>
                  Delete my report
                </Text>
              </PressScale>
            </View>
          </View>
        </Appear>
      ) : (
        <Pressable
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete report"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.sm,
            minHeight: 48,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: font.weight.medium }}>
            Delete report
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: scout.name, headerTitle, headerRight }} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 200 + insets.bottom,
          gap: spacing.xl,
        }}
      >
        <Stagger step={70} style={{ gap: spacing.xl }}>
          <View>
            <Heading>Analyzed frames</Heading>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={frameWidth + spacing.md}
              snapToAlignment="start"
              style={{ marginHorizontal: -spacing.lg }}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                gap: spacing.md,
              }}
            >
              {frames.map((frame, index) => (
                <FrameCard
                  key={frame.key}
                  label={frame.label}
                  prompt={frame.prompt}
                  uri={frame.uri}
                  width={frameWidth}
                  height={frameHeight}
                  index={index}
                />
              ))}
            </ScrollView>
          </View>

          <StepTransition step={editing ? "edit" : "read"} direction={editing ? 1 : -1}>
            {editing ? editForm : readCard}
          </StepTransition>

          {weaknessSection}

          {planSection}

          {deleteSection}
        </Stagger>
      </ScrollView>

      {!editing ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Pulse>
            <PressScale
              onPress={startRound}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel="Drill this game plan, three rounds of three minutes"
              style={{
                minHeight: 60,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.sm,
                backgroundColor: colors.primary,
              }}
            >
              <Brackets color={colors.onPrimary} size={12} inset={6} thickness={2} />
              <AiImage
                prompt="a dark boxing glove icon, flat, no text, transparent background"
                fit="contain"
                style={{ width: 30, height: 30 }}
              />
              <Text
                style={{
                  color: colors.onPrimary,
                  fontSize: font.size.body,
                  fontWeight: font.weight.bold,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Drill this game plan (3x3m)
              </Text>
            </PressScale>
          </Pulse>
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.text,
          opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
        }}
      />
    </View>
  );
}
