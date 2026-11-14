import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Text, TextInput, View } from "react-native";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { track } from "../../data/analytics";
import { useCollection } from "../../data/repo";
import { pickPhoto, type Photo } from "../../data/photos";
import { usePurchases } from "../../data/purchases";
import type { Stance } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PrimaryButton } from "../../components/button";
import { Card } from "../../components/card";
import { EmptyState } from "../../components/empty-state";
import { Lottie } from "../../components/lottie";
import { goPro } from "../../components/paywall/open";
import {
  Appear,
  CountUp,
  GrowBar,
  SkeletonList,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import {
  firstSentence,
  parseCallouts,
  planIsOpen,
  PlanRow,
  Reticle,
  ScoutCard,
  weaknessOf,
  type ScoutRecord,
} from "../../components/scout/ScoutCard";
import { LoadProblem, useStalled } from "../../components/load-problem";
import { Segmented } from "../../components/settings/controls";
import { FrameMarks, ScreenHeader, TextButton, displayFace } from "../../components/ui";

const TILE = { width: 96, height: 112 };

interface Scan {
  stance: Stance;
  tendencies: string;
  weakness: string;
  gamePlan: string;
  confidence: number;
}

/** The AI's JSON answer, checked before anything is saved. */
function parseScan(text: string): Scan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const stanceRaw = str(raw.stance).toLowerCase();
    const stance: Stance =
      stanceRaw === "orthodox" || stanceRaw === "southpaw" ? (stanceRaw as Stance) : "unclear";
    const tendencies = str(raw.tendencies);
    const gamePlan = str(raw.gamePlan);
    if (!tendencies || !gamePlan) return null;
    const weakness = str(raw.weakness) || firstSentence(tendencies);
    const confidence = Number(raw.confidence);
    return {
      stance,
      tendencies,
      weakness,
      gamePlan,
      confidence: Number.isFinite(confidence)
        ? Math.max(0, Math.min(100, Math.round(confidence)))
        : 50,
    };
  } catch {
    return null;
  }
}

/** A thin line that sweeps up and down the photo while it is being read. */
function RadarSweep({ height }: { height: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, sweep]);

  const line = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, height - 2] });
  const glow = sweep.interpolate({ inputRange: [0, 1], outputRange: [-18, height - 18] });

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 36,
          backgroundColor: theme.colors.primary,
          opacity: 0.22,
          transform: [{ translateY: glow }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 2,
          backgroundColor: theme.colors.primary,
          transform: [{ translateY: line }],
        }}
      />
    </View>
  );
}

function ScoutScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const { items, loading, add, remove } = useCollection<ScoutRecord>("opponent_scouts");
  const { isPremium } = usePurchases();
  const openPaywall = () => goPro("scout");
  const { answers, setAnswer } = useAppState();
  const stalled = useStalled(loading);
  const { ask, loading: scanning, error: scanError } = useAI();

  const [tab, setTab] = useState<"all" | "plans">("all");
  const [draft, setDraft] = useState<Photo | null>(null);
  const [name, setName] = useState("");
  const [done, setDone] = useState<ScoutRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const analyzing = useRef(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items],
  );
  const plans = useMemo(
    () => sorted.filter((item) => parseCallouts(item.gamePlan).length > 0),
    [sorted],
  );
  // Free users get one scouting read; after that, reads and game plans need Pro. The read is
  // remembered apart from its report, so deleting the report doesn't hand out another.
  const freeUsed =
    !isPremium && (answers.freescoutused === "1" || items.some((item) => item.sample === true));
  const readable = (item: ScoutRecord) => planIsOpen(item, isPremium);
  const shown = tab === "all" ? sorted : plans;

  async function choose(source: "library" | "camera") {
    if (freeUsed) {
      openPaywall();
      return;
    }
    try {
      const photo = await pickPhoto({ source });
      if (photo) {
        setDraft(photo);
        setDone(null);
        setNotice(null);
      }
    } catch {
      setNotice("Couldn't open your photos. Allow access in your phone's Settings and try again.");
    }
  }

  async function analyze() {
    if (analyzing.current) return;
    analyzing.current = true;
    try {
      await readFrame();
    } finally {
      analyzing.current = false;
    }
  }

  async function readFrame() {
    if (!draft) return;
    if (!draft.base64) {
      setNotice("That photo didn't come through. Choose it again.");
      return;
    }
    if (freeUsed) {
      openPaywall();
      return;
    }
    setNotice(null);
    const who = name.trim() || "Opponent";
    const level = answers.skilllevel || "beginner to intermediate";
    const mine = answers.stance === "southpaw" ? "southpaw" : "orthodox";
    const text = await ask({
      prompt: `The boxer training is at a ${level} level and boxes ${mine}. Read this photo of an opponent or sparring partner named "${who}". Describe only what the frame shows; if the body or guard is hidden, say so and lower the confidence. Return JSON with these keys: "stance" ("orthodox", "southpaw" or "unclear"); "tendencies" (two or three sentences on guard, footwork and habits you can see); "weakness" (one sentence: the single opening to attack); "confidence" (a whole number from 0 to 100 for how sure you are from this one frame); "gamePlan" (two or three sentences of strategy for a boxer training alone, ending with "Callouts:" and five to seven punch callouts such as jab, cross, hook to the body, slip left).`,
      instructions:
        "You are a calm, precise boxing coach. Use plain boxing language a beginner can act on. Never guess at what you cannot see. Keep to technique, footwork and tactics for training: no medical or weight advice, and nothing that needs sparring without protective gear. Reply with JSON only.",
      photo: draft,
      json: true,
    });
    if (!text) return;
    const scan = parseScan(text);
    if (!scan) {
      setNotice("The read came back unclear. Try a sharper frame with the whole body in shot.");
      return;
    }
    try {
      const record = await add({
        name: who,
        photoUri: draft.uri,
        stance: scan.stance,
        tendencies: scan.tendencies,
        gamePlan: scan.gamePlan,
        weakness: scan.weakness,
        confidence: scan.confidence,
        createdAt: new Date().toISOString(),
        ...(isPremium ? {} : { sample: true }),
      });
      track("opponent_scouted", { stance: scan.stance, premium: isPremium });
      haptic("success");
      setDone(record);
      setDraft(null);
      setName("");
      if (!isPremium) void setAnswer("freescoutused", "1");
      // The first real read replaces the sample report.
      for (const item of items) {
        if (item.example) void remove(item.id).catch(() => undefined);
      }
    } catch {
      setNotice("Couldn't save this report. Try again.");
    }
  }

  const tile = draft?.uri ?? done?.photoUri ?? null;
  const stage = scanning ? "scanning" : done ? "done" : draft ? "picked" : "idle";
  const message = notice ?? scanError;
  const copy =
    stage === "idle"
      ? "Add one frame of an opponent or sparring partner: whole body in shot, guard up. The read covers stance, habits and the punch that opens them."
      : stage === "picked"
        ? "Name them, then analyze. One clear frame is enough."
        : stage === "scanning"
          ? "Hold on, the read takes a few seconds."
          : "Saved to your reports. Open it for the full game plan.";

  const analysisPanel = (
    <Card>
      <View style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center" }}>
        {tile ? (
          <View
            style={{
              ...TILE,
              borderRadius: theme.radius.sm,
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Image
              source={{ uri: tile }}
              accessibilityLabel="The frame you chose"
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
            <Reticle {...TILE} color={theme.colors.primary} />
            <FrameMarks size={10} inset={6} />
            {scanning ? <RadarSweep height={TILE.height} /> : null}
          </View>
        ) : null}
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            New opponent analysis
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
            {copy}
          </Text>
        </View>
      </View>

      {stage === "idle" ? (
        <View style={{ gap: theme.spacing.xs }}>
          <PrimaryButton
            label={freeUsed ? "Unlock another scout" : "Add footage frame"}
            icon={freeUsed ? "lock-closed" : "add"}
            onPress={freeUsed ? openPaywall : () => choose("library")}
          />
          <TextButton
            label="Take a photo"
            icon="camera-outline"
            tone="plain"
            onPress={() => choose("camera")}
            accessibilityLabel="Take a photo of an opponent"
          />
          {!isPremium ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption + 2,
                lineHeight: 20,
                textAlign: "center",
              }}
            >
              {freeUsed
                ? "Your free read is used. Go Pro for unlimited opponent reads and game plans."
                : "Your first read is free. Go Pro for unlimited opponent reads and game plans."}
            </Text>
          ) : null}
        </View>
      ) : null}

      {stage === "picked" ? (
        <View style={{ gap: theme.spacing.sm }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name or nickname"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Opponent name"
            maxLength={40}
            returnKeyType="done"
            style={{
              minHeight: 48,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.sm,
              borderWidth: 1,
              borderColor: theme.colors.textMuted,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
            }}
          />
          <PrimaryButton label="Analyze this frame" icon="scan-outline" onPress={analyze} />
          <TextButton label="Choose another frame" onPress={() => choose("library")} />
        </View>
      ) : null}

      {stage === "scanning" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <Lottie name="loading" size={40} />
          <Text style={{ flex: 1, color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            Reading stance, guard and footwork…
          </Text>
        </View>
      ) : null}

      {stage === "done" && done ? (
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.sm }}>
              <CountUp
                value={done.confidence ?? 0}
                format={(n) => `${Math.round(n)}%`}
                style={[
                  displayFace,
                  { color: theme.colors.text, fontSize: theme.font.size.headline },
                ]}
              />
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                read confidence
              </Text>
            </View>
            <GrowBar progress={(done.confidence ?? 0) / 100} height={6} />
          </View>
          <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
            <Text style={{ color: theme.colors.textMuted }}>Opening: </Text>
            {weaknessOf(done)}
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            <PrimaryButton
              label="Open report"
              icon="document-text-outline"
              onPress={() => router.push(`/opponent/${done.id}`)}
            />
            <TextButton
              label="Scout another"
              onPress={() => {
                setDone(null);
                setDraft(null);
              }}
              accessibilityLabel="Scout another opponent"
            />
          </View>
        </View>
      ) : null}

      {message ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", gap: theme.spacing.sm }}
        >
          <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
          <Text style={{ flex: 1, color: theme.colors.danger, fontSize: theme.font.size.body, lineHeight: 22 }}>
            {message}
          </Text>
        </View>
      ) : null}
    </Card>
  );

  const header = (
    <View style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.xs }}>
      <Appear>{analysisPanel}</Appear>
      {stalled ? (
        <LoadProblem
          what="your reports"
          note="A new read can't be saved until they load."
          onRetry={onRetry}
        />
      ) : null}
      <Appear delay={80}>
        <Segmented
          accessibilityLabel="Reports or game plans"
          options={[
            { value: "all", label: `Reports (${items.length})` },
            { value: "plans", label: `Game plans (${plans.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Appear>
    </View>
  );

  const empty = loading ? (
    stalled ? null : (
      <SkeletonList rows={3} />
    )
  ) : tab === "all" ? (
    <EmptyState
      icon="eye-outline"
      title="No opponents scouted yet"
      body="Add one frame of a sparring partner or a video still. The AI reads their stance and the punch that opens them."
    />
  ) : (
    <EmptyState
      icon="document-text-outline"
      title="No game plans yet"
      body="Each scouted opponent gets a plan with callouts you can run as a round."
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Opponent scout" />
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.md,
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty ?? undefined}
        renderItem={({ item, index }) => (
          <Appear delay={Math.min(index, 8) * 50}>
            {tab === "all" ? (
              <ScoutCard item={item} onPress={() => router.push(`/opponent/${item.id}`)} />
            ) : (
              <PlanRow
                item={item}
                readable={readable(item)}
                onRun={() => router.navigate({ pathname: "/", params: { scout: item.id } })}
                onUnlock={openPaywall}
              />
            )}
          </Appear>
        )}
      />
    </View>
  );
}

/** Retrying a failed load starts the screen afresh, which asks for its data again. */
export default function ScoutTab() {
  const [attempt, setAttempt] = useState(0);
  return <ScoutScreen key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}
