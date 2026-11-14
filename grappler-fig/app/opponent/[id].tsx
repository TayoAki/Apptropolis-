import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/button";
import { EmptyState } from "../../components/empty-state";
import { Lottie } from "../../components/lottie";
import { goPro } from "../../components/paywall/open";
import {
  Appear,
  Skeleton,
  Stagger,
  StepTransition,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { LoadProblem, useStalled } from "../../components/load-problem";
import {
  Reticle,
  SampleTag,
  parseCallouts,
  planIsOpen,
  planText,
  stanceLabel,
  toRounds,
  weaknessOf,
  type ScoutRecord,
} from "../../components/scout/ScoutCard";
import { Segmented } from "../../components/settings/controls";
import { FrameMarks, Monogram, SecondaryButton, TextButton } from "../../components/ui";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import { formatDay, type Stance } from "../../data/schema";
import { levelOf } from "../../data/training";
import { useTheme } from "../../theme/ThemeProvider";

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: "orthodox", label: "Orthodox" },
  { value: "southpaw", label: "Southpaw" },
  { value: "unclear", label: "Unclear" },
];

/** "Rests the rear hand. Steps back." becomes one line per sentence. */
function sentences(text: string): string[] {
  return text
    .split(/\.\s+/)
    .map((sentence) => sentence.replace(/\.$/, "").trim())
    .filter(Boolean);
}

/** "today", "yesterday" or "on Wed 11 Nov", to follow "Scouted". */
function scoutedWhen(iso: string): string {
  const day = formatDay(iso);
  return day === "Today" || day === "Yesterday" ? day.toLowerCase() : `on ${day}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Heading({ children }: { children: string }) {
  const { colors, font } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.text,
        fontSize: font.size.body + 2,
        fontWeight: font.weight.bold,
        lineHeight: 24,
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
          fontSize: font.size.caption + 2,
          fontWeight: font.weight.medium,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function OpponentReportScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const { colors, spacing, radius, font } = theme;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, update, remove } = useCollection<ScoutRecord>("opponent_scouts");
  const reduced = useReducedMotion();
  const { answers } = useAppState();
  const { isPremium } = usePurchases();
  const openPaywall = () => goPro("report");
  const scout = items.find((item) => item.id === id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<"save" | "delete" | null>(null);
  const stalled = useStalled(loading);
  const [draft, setDraft] = useState({
    name: "",
    stance: "unclear" as Stance,
    read: "",
    callouts: "",
  });

  const flash = useRef(new Animated.Value(0)).current;
  const launching = useRef(false);
  const deleting = useRef(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => clearTimeout(timer)), []);

  function startEdit() {
    if (!scout) return;
    setDraft({
      name: scout.name,
      stance: scout.stance,
      read: scout.tendencies,
      callouts: parseCallouts(scout.gamePlan).join(", "),
    });
    setNameError(false);
    setProblem(null);
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
    const plan = planText(scout.gamePlan);
    const callouts = parseCallouts(scout.gamePlan);
    const list = draft.callouts
      .split(",")
      .map((callout) => callout.trim())
      .filter(Boolean);
    const changedCallouts =
      list.join(", ").toLowerCase() !== callouts.join(", ").toLowerCase();
    // Custom callout combos are premium: free users keep the plan's callouts as written.
    const gamePlan =
      isPremium && changedCallouts && list.length > 0
        ? `${plan} Callouts: ${list.join(", ")}.`.trim()
        : scout.gamePlan;
    setSaving(true);
    setProblem(null);
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
    } catch {
      // The form stays open with what was typed, so nothing is lost.
      setProblem("save");
    } finally {
      setSaving(false);
    }
  }

  /** A double heavy tap and a short flash, then the round's plan opens on the Train tab. */
  function startRound() {
    if (!scout || launching.current) return;
    launching.current = true;
    const scoutId = scout.id;
    haptic("heavy");
    timers.current.push(setTimeout(() => haptic("heavy"), 110));
    if (!reduced)
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    // The Train screen reads `scout` to load these callouts as a round.
    timers.current.push(
      setTimeout(
        () => {
          // Back to the tabs that are already open (not a second copy on top of this report).
          router.dismissTo({ pathname: "/", params: { scout: scoutId } });
          launching.current = false;
        },
        reduced ? 0 : 300,
      ),
    );
  }

  async function confirmDelete() {
    if (!scout || deleting.current) return;
    deleting.current = true;
    haptic("warning");
    setProblem(null);
    try {
      await remove(scout.id);
    } catch {
      deleting.current = false;
      setProblem("delete");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/scout");
  }

  // A long name is cut with an ellipsis before it can run under the back and Edit buttons.
  const headerTitle = () =>
    scout ? (
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          maxWidth: screenWidth - 176,
          color: colors.text,
          fontSize: font.size.body + 1,
          fontWeight: "600",
        }}
      >
        {scout.name}
      </Text>
    ) : null;

  const headerRight = () => (
    <TextButton
      label={editing ? "Cancel" : "Edit"}
      onPress={editing ? cancelEdit : startEdit}
      accessibilityLabel={editing ? "Cancel editing" : "Edit report"}
      style={{ paddingHorizontal: spacing.sm }}
    />
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
        <Stack.Screen options={{ title: "Opponent report" }} />
        {stalled ? <LoadProblem what="this report" onRetry={onRetry} /> : null}
        <Skeleton width="60%" height={40} radius={radius.sm} />
        <Skeleton height={96} radius={radius.md} />
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
        <Stack.Screen options={{ title: "Opponent report" }} />
        <EmptyState
          icon="eye-off-outline"
          title="This report is gone"
          body="It was deleted. Scout a new opponent to build another game plan."
          actionLabel="Back to Scout"
          onAction={() => router.replace("/scout")}
        />
      </View>
    );
  }

  const plan = planText(scout.gamePlan);
  const rounds = toRounds(parseCallouts(scout.gamePlan));
  const open = planIsOpen(scout, isPremium);
  const opening = weaknessOf(scout);
  const allTendencies = sentences(scout.tendencies);
  // With no separate weakness on the report, the opening is the first tendency: don't list it twice.
  const tendencies = scout.weakness?.trim() ? allTendencies : allTendencies.slice(1);
  const frameWidth = screenWidth - spacing.lg * 2;
  const frameHeight = Math.round(frameWidth * 0.62);
  // The tip follows the level chosen in onboarding or Settings; with no level set there is none.
  const tip = !answers.skilllevel
    ? ""
    : levelOf(answers.skilllevel) === "beginner"
      ? "Run each round at half speed first. Get the shape right before you add power."
      : "Run it at full speed and call your own counter off the first shot.";

  const inputStyle = {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: font.size.body,
    borderWidth: 1,
    borderColor: colors.textMuted,
  };

  const summary = (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {scout.photoUri ? null : <Monogram name={scout.name} size={48} />}
        <View style={{ flex: 1, gap: 2 }}>
          {scout.example ? <SampleTag /> : null}
          <Text style={{ color: colors.text, fontSize: font.size.body, fontWeight: font.weight.bold }}>
            {stanceLabel(scout.stance)}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.caption + 2,
              lineHeight: 20,
              fontVariant: ["tabular-nums"],
            }}
          >
            {scout.example
              ? "Shows what a read looks like. Your first real read replaces it."
              : `Scouted ${scoutedWhen(scout.createdAt)}${
                  scout.confidence !== undefined
                    ? ` \u00B7 ${Math.round(scout.confidence)}% read confidence`
                    : ""
                }`}
          </Text>
        </View>
        {savedTick > 0 ? <Lottie key={savedTick} name="success" size={36} /> : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Heading>The opening</Heading>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size.title,
            fontWeight: font.weight.medium,
            lineHeight: 30,
          }}
        >
          {opening}
        </Text>
      </View>
    </View>
  );

  const editForm = (
    <View
      style={{
        borderRadius: radius.md,
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
          style={[inputStyle, nameError ? { borderColor: colors.danger } : null]}
        />
        {nameError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger, fontSize: font.size.caption + 2, lineHeight: 20 }}
          >
            Give them a name so you can find this report.
          </Text>
        ) : null}
      </Field>

      <Field label="Stance">
        <Segmented
          accessibilityLabel="Stance"
          options={STANCE_OPTIONS}
          value={draft.stance}
          onChange={(stance) => setDraft((d) => ({ ...d, stance }))}
        />
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
          style={{ ...inputStyle, minHeight: 110, lineHeight: 24 }}
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
            <Text style={{ color: colors.textMuted, fontSize: font.size.caption + 2, lineHeight: 20 }}>
              Separate callouts with commas. The timer splits them into three rounds.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 24 }}>
              Custom callout combos are part of Pro.
            </Text>
            <TextButton
              label="Unlock custom callouts"
              icon="lock-closed"
              onPress={() => openPaywall()}
              style={{ alignSelf: "flex-start" }}
            />
          </View>
        )}
      </Field>

      {problem === "save" ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger, fontSize: font.size.body, lineHeight: 24 }}
        >
          Couldn't save your changes. Check your connection and press Save report again.
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={cancelEdit} accessibilityLabel="Cancel changes" />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={saving ? "Saving…" : "Save report"}
            busy={saving}
            onPress={() => void save()}
            accessibilityLabel="Save report"
          />
        </View>
      </View>
    </View>
  );

  const tendencySection =
    tendencies.length > 0 ? (
      <View style={{ gap: spacing.sm }}>
        <Heading>Tendencies</Heading>
        <View style={{ gap: spacing.sm }}>
          {tendencies.map((text, index) => (
            <Appear key={text} delay={index * 70} distance={6} duration={240}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    marginTop: 9,
                    backgroundColor: colors.primary,
                  }}
                />
                <Text style={{ flex: 1, color: colors.text, fontSize: font.size.body, lineHeight: 24 }}>
                  {`${capitalize(text)}.`}
                </Text>
              </View>
            </Appear>
          ))}
        </View>
      </View>
    ) : null;

  const planSection = (
    <View style={{ gap: spacing.sm }}>
      <Heading>Game plan</Heading>
      {!open ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 24 }}>
            Game plans and callout rounds are part of Pro. Your read and its tendencies stay here.
          </Text>
          <TextButton
            label="Unlock game plans"
            icon="lock-closed"
            onPress={() => openPaywall()}
            accessibilityLabel="Unlock game plans with Pro"
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      ) : null}
      {open && plan ? (
        <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 24 }}>{plan}</Text>
      ) : null}
      {!open ? null : rounds.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="No callouts yet"
          body="This plan has no callout combo to run. Add one in Edit, or scout again with a clearer frame."
          actionLabel="Edit report"
          onAction={startEdit}
        />
      ) : (
        <>
          <View
            style={{
              marginTop: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {rounds.map((calls, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  style={{
                    width: 64,
                    color: colors.textMuted,
                    fontSize: font.size.caption + 2,
                    fontWeight: font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {`Round ${index + 1}`}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: font.size.body,
                    fontWeight: font.weight.bold,
                    lineHeight: 24,
                  }}
                >
                  {calls.map(capitalize).join(" · ")}
                </Text>
              </View>
            ))}
          </View>
          {tip ? (
            <Text style={{ color: colors.textMuted, fontSize: font.size.caption + 2, lineHeight: 20 }}>
              {tip}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  const deleteSection = confirming ? (
    <Appear distance={6} duration={220}>
      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.danger,
        }}
      >
        <Text style={{ color: colors.text, fontSize: font.size.body, lineHeight: 24 }}>
          Delete this report? Its frame, read and game plan are removed for good.
        </Text>
        {problem === "delete" ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger, fontSize: font.size.body, lineHeight: 24 }}
          >
            Couldn't delete it. Check your connection and try again.
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label="Keep it"
              onPress={() => setConfirming(false)}
              accessibilityLabel="Keep report"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Delete"
              tone="danger"
              icon="trash-outline"
              onPress={() => void confirmDelete()}
              accessibilityLabel="Delete this report"
            />
          </View>
        </View>
      </View>
    </Appear>
  ) : (
    <TextButton
      label="Delete report"
      icon="trash-outline"
      tone="danger"
      onPress={() => setConfirming(true)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: scout.name, headerTitle, headerRight }} />
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        // The delete confirmation opens at the foot of the page: bring it into view.
        onContentSizeChange={() => {
          if (confirming) scroller.current?.scrollToEnd({ animated: !reduced });
        }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: (editing ? 0 : 76 + insets.bottom) + spacing.xl,
        }}
      >
        <Stagger step={70} style={{ gap: spacing.xl }}>
          {scout.photoUri ? (
            <View
              style={{
                width: frameWidth,
                height: frameHeight,
                borderRadius: radius.md,
                overflow: "hidden",
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Image
                source={{ uri: scout.photoUri }}
                accessibilityLabel={`The frame this read of ${scout.name} came from`}
                contentFit="cover"
                style={{ width: frameWidth, height: frameHeight }}
              />
              <Reticle width={frameWidth} height={frameHeight} color={colors.primary} />
              <FrameMarks />
            </View>
          ) : null}

          <StepTransition step={editing ? "edit" : "read"} direction={editing ? 1 : -1}>
            {editing ? editForm : summary}
          </StepTransition>

          {tendencySection}

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
          {open ? (
            <PrimaryButton
              label={"Drill this game plan (3 \u00D7 3 min)"}
              icon="play"
              disabled={rounds.length === 0}
              onPress={startRound}
              accessibilityLabel="Drill this game plan: load three rounds of three minutes on the timer"
            />
          ) : (
            <PrimaryButton
              label="Unlock game plans"
              icon="lock-closed"
              onPress={() => openPaywall()}
              accessibilityLabel="Unlock game plans with Pro"
            />
          )}
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
          opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
        }}
      />
    </View>
  );
}

/** Retrying a failed load starts the screen afresh, which asks for its data again. */
export default function OpponentReportRoute() {
  const [attempt, setAttempt] = useState(0);
  return <OpponentReportScreen key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}
