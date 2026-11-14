import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { track } from "../../data/analytics";
import { useCollection } from "../../data/repo";
import { pickPhoto, type Photo } from "../../data/photos";
import { usePurchases } from "../../data/purchases";
import type { Stance } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PrimaryButton } from "../../components/button";
import { EmptyState } from "../../components/empty-state";
import { Lottie } from "../../components/lottie";
import {
  Appear,
  CountUp,
  GrowBar,
  SkeletonList,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import {
  Corners,
  firstSentence,
  parseCallouts,
  PlanRow,
  Reticle,
  ScoutCard,
  weaknessOf,
  type ScoutRecord,
} from "../../components/scout/ScoutCard";

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

/** A thin line that sweeps up and down the photo with a soft glow behind it. */
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
          shadowColor: theme.colors.primary,
          shadowOpacity: 1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          transform: [{ translateY: line }],
        }}
      />
    </View>
  );
}

export default function ScoutScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, add } = useCollection<ScoutRecord>("opponent_scouts");
  const { isPremium, openPaywall } = usePurchases();
  const { answers } = useAppState();
  const { ask, loading: scanning, error: scanError } = useAI();

  const [tab, setTab] = useState<"all" | "plans">("all");
  const [draft, setDraft] = useState<Photo | null>(null);
  const [name, setName] = useState("");
  const [done, setDone] = useState<ScoutRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items],
  );
  const plans = useMemo(
    () => sorted.filter((item) => parseCallouts(item.gamePlan).length > 0),
    [sorted],
  );
  // Free users get one scouting read; after that, reads and game plans need Go Pro.
  const freeUsed = !isPremium && items.some((item) => item.sample === true);
  const readable = (item: ScoutRecord) => isPremium || item.sample === true;
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
    const text = await ask({
      prompt: `The boxer training is at a ${level} level. Read this photo of an opponent or sparring partner named "${who}". Describe only what the frame shows; if the body or guard is hidden, say so and lower the confidence. Return JSON with these keys: "stance" ("orthodox", "southpaw" or "unclear"); "tendencies" (two or three sentences on guard, footwork and habits you can see); "weakness" (one sentence: the single opening to attack); "confidence" (a whole number from 0 to 100 for how sure you are from this one frame); "gamePlan" (two or three sentences of strategy for a boxer training alone, ending with "Callouts:" and five to seven punch callouts such as jab, cross, hook to the body, slip left).`,
      instructions:
        "You are a calm, precise boxing coach. Use plain boxing language a beginner can act on. Never guess at what you cannot see. Reply with JSON only.",
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
    } catch {
      setNotice("Couldn't save this report. Try again.");
    }
  }

  const tile = draft?.uri ?? done?.photoUri ?? null;
  const stage = scanning ? "scanning" : done ? "done" : draft ? "picked" : "idle";
  const message = notice ?? scanError;
  const copy =
    stage === "idle"
      ? "One frame with the whole body in shot, guard up. The read covers stance, habits and the punch that opens them."
      : stage === "picked"
        ? "Name them, then analyze. One clear frame is enough."
        : stage === "scanning"
          ? "Hold on, the read takes a few seconds."
          : "Saved to All Reports. Open it for the full game plan.";

  const analysisPanel = (
    <View
      style={{
        padding: theme.spacing.md,
        gap: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center" }}>
        <View
          style={{
            width: 96,
            height: 112,
            borderRadius: theme.radius.md,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {tile ? (
            <>
              <Image source={{ uri: tile }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              <Reticle width={96} height={112} color={theme.colors.primary} />
            </>
          ) : (
            <Ionicons name="camera-outline" size={36} color={theme.colors.textMuted} />
          )}
          {scanning ? <RadarSweep height={112} /> : null}
        </View>

        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            New Opponent Analysis
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 22 }}>
            {copy}
          </Text>
        </View>
      </View>

      {stage === "idle" ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View>
            <PrimaryButton
              label={freeUsed ? "Unlock another scout" : "Add Footage Frame"}
              icon={freeUsed ? "lock-closed" : "add"}
              onPress={freeUsed ? openPaywall : () => choose("library")}
            />
            <Corners color={theme.colors.primary} size={14} inset={-6} />
          </View>
          <Pressable
            onPress={() => choose("camera")}
            accessibilityRole="button"
            accessibilityLabel="Take a photo of an opponent"
            hitSlop={12}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="camera-outline" size={20} color={theme.colors.text} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              Take a photo
            </Text>
          </Pressable>
          {!isPremium ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
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
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surfaceAlt,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
            }}
          />
          <PrimaryButton label="Analyze this frame" icon="scan-outline" onPress={analyze} />
          <Pressable
            onPress={() => choose("library")}
            accessibilityRole="button"
            accessibilityLabel="Choose another frame"
            hitSlop={12}
            style={({ pressed }) => ({
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              Choose another frame
            </Text>
          </Pressable>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Lottie name="success" size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                Read confidence
              </Text>
              <CountUp
                value={done.confidence ?? 0}
                format={(n) => `${Math.round(n)}%`}
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.headline,
                  fontWeight: theme.font.weight.bold,
                }}
              />
            </View>
          </View>
          <GrowBar progress={(done.confidence ?? 0) / 100} height={8} />
          <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
            <Text style={{ color: theme.colors.textMuted }}>Weakness: </Text>
            {weaknessOf(done)}
          </Text>
          <PrimaryButton
            label="Open report"
            icon="document-text-outline"
            onPress={() => router.push(`/opponent/${done.id}`)}
          />
          <Pressable
            onPress={() => {
              setDone(null);
              setDraft(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Scout another opponent"
            hitSlop={12}
            style={({ pressed }) => ({
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              Scout another
            </Text>
          </Pressable>
        </View>
      ) : null}

      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.danger, fontSize: theme.font.size.body }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );

  const tabs: Array<{ key: "all" | "plans"; label: string; count: number }> = [
    { key: "all", label: "All Reports", count: items.length },
    { key: "plans", label: "Saved Game Plans", count: plans.length },
  ];

  const segment = (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        padding: 4,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {tabs.map((option) => {
        const active = tab === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => {
              if (active) return;
              haptic("selection");
              setTab(option.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option.label}, ${option.count}`}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: theme.spacing.xs,
              borderRadius: theme.radius.sm,
              backgroundColor: active ? theme.colors.surfaceAlt : theme.colors.surface,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? theme.colors.text : theme.colors.textMuted,
                fontSize: theme.font.size.body,
                fontWeight: active ? theme.font.weight.bold : theme.font.weight.medium,
                fontVariant: ["tabular-nums"],
              }}
            >
              {`${option.label} (${option.count})`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const header = (
    <View style={{ gap: theme.spacing.lg }}>
      <Appear>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 1,
              }}
            >
              OPPONENT SCOUT
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 22 }}>
              Upload video stills or photos. AI maps stance, habits and punch counters.
            </Text>
          </View>
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={12}
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </Link>
        </View>
      </Appear>
      <Appear delay={80}>{analysisPanel}</Appear>
      <Appear delay={140}>{segment}</Appear>
    </View>
  );

  const empty = loading ? (
    <SkeletonList rows={3} />
  ) : tab === "all" ? (
    <EmptyState
      icon="eye-outline"
      title="No opponents scouted yet"
      body="Add one frame of a sparring partner or a video still. The AI reads their stance and the punch that opens them."
      actionLabel="Add footage frame"
      onAction={() => choose("library")}
    />
  ) : (
    <EmptyState
      icon="document-text-outline"
      title="No game plans yet"
      body="Each scouted opponent gets a plan with callouts you can run as a round."
      actionLabel="Scout an opponent"
      onAction={() => choose("library")}
    />
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item, index }) => (
        <Appear delay={Math.min(index, 8) * 50}>
          {tab === "all" ? (
            <ScoutCard
              item={item}
              onPress={() => router.push(`/opponent/${item.id}`)}
            />
          ) : (
            <PlanRow
              item={item}
              readable={readable(item)}
              onRun={() => router.push(`/opponent/${item.id}`)}
              onUnlock={openPaywall}
            />
          )}
        </Appear>
      )}
    />
  );
}
