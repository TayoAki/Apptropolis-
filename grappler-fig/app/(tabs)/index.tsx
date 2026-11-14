// Train: the round timer with its punch callouts, today's challenge, and scouted plans to run.
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  currentStreak,
  dayKey,
  formatRoundLength,
  xpForSession,
  type OpponentScout,
  type WorkoutMode,
  type WorkoutSession,
} from "../../data/schema";
import { EmptyState } from "../../components/empty-state";
import { SectionHeader } from "../../components/card";
import { FlipClock } from "../../components/index/Clock";
import { ComboPanel } from "../../components/index/Combo";
import { Frame, GlowButton, Stencil } from "../../components/index/Frame";
import { Lottie, Celebrate } from "../../components/lottie";
import {
  CountUp,
  PressScale,
  Skeleton,
  Stagger,
  haptic,
} from "../../components/motion";

type IconName = ComponentProps<typeof Ionicons>["name"];
interface Setup {
  rounds: number;
  roundSeconds: number;
  restSeconds: number;
}
interface Plan {
  name: string;
  steps: string[];
  mode: WorkoutMode;
}
type Phase = "idle" | "work" | "rest" | "done";
interface Run {
  phase: Phase;
  round: number;
  startedAt: number;
  endsAt: number;
  mode: WorkoutMode;
}

/** How often the next punch is called out during a round. */
const CALLOUT_MS = 3000;
const CLOCK_SIZE = 100;
const ROUND_OPTIONS = [3, 5, 6, 8, 10];
const LENGTH_OPTIONS = [120, 180, 240, 300];
const REST_OPTIONS = [30, 60, 90];

const COMBOS: Array<{ name: string; steps: string[] }> = [
  { name: "Classic", steps: ["Jab", "Cross", "Slip", "Hook"] },
  { name: "Body work", steps: ["Jab", "Body hook", "Cross", "Step out"] },
  { name: "Counter", steps: ["Slip left", "Hook", "Cross", "Step out"] },
  { name: "Pressure", steps: ["Jab", "Jab", "Cross", "Hook"] },
];

const CLASSIC: Plan = { name: "Classic combo", steps: COMBOS[0]!.steps, mode: "callout" };
const IDLE: Run = { phase: "idle", round: 1, startedAt: 0, endsAt: 0, mode: "callout" };

interface Program {
  id: string;
  name: string;
  level: "beginner" | "intermediate";
  rounds: number;
  roundSeconds: number;
  restSeconds: number;
  steps: string[];
}

const PROGRAMS: Program[] = [
  {
    id: "counter-hook",
    name: "Counter Left Hook Drill",
    level: "beginner",
    rounds: 3,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Slip right", "Left hook", "Step out"],
  },
  {
    id: "jab-footwork",
    name: "Jab and Footwork",
    level: "beginner",
    rounds: 4,
    roundSeconds: 120,
    restSeconds: 60,
    steps: ["Jab", "Jab", "Step left", "Cross"],
  },
  {
    id: "defense-first",
    name: "Defense First",
    level: "beginner",
    rounds: 3,
    roundSeconds: 120,
    restSeconds: 60,
    steps: ["Slip left", "Slip right", "Roll", "Cross"],
  },
  {
    id: "double-jab",
    name: "Double Jab Pressure",
    level: "intermediate",
    rounds: 5,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Jab", "Cross", "Body hook", "Slip right"],
  },
  {
    id: "cross-hook",
    name: "Cross Hook Combos",
    level: "intermediate",
    rounds: 5,
    roundSeconds: 180,
    restSeconds: 45,
    steps: ["Cross", "Left hook", "Cross", "Slip left"],
  },
  {
    id: "ring-pace",
    name: "Ring Pace Rounds",
    level: "intermediate",
    rounds: 6,
    roundSeconds: 180,
    restSeconds: 60,
    steps: ["Jab", "Cross", "Slip", "Hook", "Step out", "Uppercut"],
  },
];

/** "02:41": minutes and seconds, always two digits. */
function clockText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function restLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} sec rest` : `${formatRoundLength(seconds)} rest`;
}

/** Day of the year, so the challenge changes once a day. */
function dayNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** The callouts a scouting report recommends ("Callouts: jab, cross, ..."), or the classic combo. */
function planFromScout(scout: OpponentScout): Plan {
  const match = /callouts?:\s*([^\n]+)/i.exec(scout.gamePlan);
  const steps = (match?.[1] ?? "")
    .split(",")
    .map((step) => step.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 8)
    .map((step) => step.charAt(0).toUpperCase() + step.slice(1));
  return {
    name: scout.name,
    steps: steps.length ? steps : COMBOS[0]!.steps,
    mode: "scouted",
  };
}

function comboPlan(index: number): Plan {
  const combo = COMBOS[index]!;
  return { name: `${combo.name} combo`, steps: combo.steps, mode: "callout" };
}

/** A setup chip: outlined, equal width in its row, cycles its option on press. */
function Chip({
  label,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          color: theme.colors.textMuted,
          fontSize: 13,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      haptic="light"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Ionicons name={icon} size={18} color={theme.colors.text} />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

export default function TrainScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isPremium, openPaywall } = usePurchases();
  const { answers } = useAppState();
  const sessions = useCollection<WorkoutSession>("workout_sessions");
  const scouts = useCollection<OpponentScout>("opponent_scouts");
  const { add } = sessions;

  const level: "beginner" | "intermediate" = /inter|advanced/i.test(answers.skilllevel ?? "")
    ? "intermediate"
    : "beginner";

  const [setup, setSetup] = useState<Setup>({ rounds: 5, roundSeconds: 180, restSeconds: 60 });
  const [stance, setStance] = useState<"orthodox" | "southpaw">("orthodox");
  const [combo, setCombo] = useState(0);
  const [plan, setPlan] = useState<Plan>(CLASSIC);
  const [cues, setCues] = useState(true);
  const [run, setRun] = useState<Run>(IDLE);
  const runRef = useRef<Run>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [callout, setCallout] = useState(0);
  const calloutRef = useRef(0);
  const [finishedChallenges, setFinishedChallenges] = useState(0);

  const { rounds, roundSeconds, restSeconds } = setup;
  const active = run.phase === "work" || run.phase === "rest";

  function commit(next: Run) {
    runRef.current = next;
    setRun(next);
  }

  // The round clock. It reads the latest run from a ref, so each tick moves the timer on
  // from the wall clock and never double-counts a phase change.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = runRef.current;

      if (cur.phase === "work" && t < cur.endsAt) {
        const step = Math.floor((t - cur.startedAt) / CALLOUT_MS);
        if (step !== calloutRef.current) {
          calloutRef.current = step;
          setCallout(step);
          if (cues) haptic("light");
        }
        return;
      }
      if (t < cur.endsAt) return;

      if (cur.phase === "work") {
        if (cur.round < rounds) {
          calloutRef.current = 0;
          setCallout(0);
          commit({ ...cur, phase: "rest", startedAt: t, endsAt: t + restSeconds * 1000 });
          haptic("light");
        } else {
          commit({ ...cur, phase: "done", startedAt: t, endsAt: t });
          haptic("success");
          void add({
            date: new Date(t).toISOString(),
            rounds,
            roundSeconds,
            mode: cur.mode,
            xpEarned: xpForSession({ rounds, roundSeconds }),
            topFix: "",
          }).catch(() => undefined);
          track("round_completed", { rounds, mode: cur.mode });
          if (cur.mode === "guided") setFinishedChallenges((n) => n + 1);
        }
      } else {
        calloutRef.current = 0;
        setCallout(0);
        commit({
          ...cur,
          phase: "work",
          round: cur.round + 1,
          startedAt: t,
          endsAt: t + roundSeconds * 1000,
        });
        haptic("medium");
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, rounds, roundSeconds, restSeconds, cues]);

  function startRound(next: Setup, nextPlan: Plan) {
    if (active) return;
    setSetup(next);
    setPlan(nextPlan);
    calloutRef.current = 0;
    setCallout(0);
    const t = Date.now();
    setNow(t);
    commit({
      phase: "work",
      round: 1,
      startedAt: t,
      endsAt: t + next.roundSeconds * 1000,
      mode: nextPlan.mode,
    });
    haptic("medium");
  }

  function stopRound() {
    commit(IDLE);
    calloutRef.current = 0;
    setCallout(0);
    haptic("light");
  }

  function cycle<T>(options: T[], current: T): T {
    const index = options.indexOf(current);
    return options[(index + 1) % options.length]!;
  }

  function cycleCombo() {
    const next = (combo + 1) % COMBOS.length;
    if (!isPremium && next !== 0) {
      openPaywall();
      return;
    }
    setCombo(next);
    setPlan(comboPlan(next));
  }

  // Derived values
  const streak = sessions.loading ? 0 : currentStreak(sessions.items);

  const today = new Date();
  const pool = PROGRAMS.filter((p) => p.level === level);
  const programIndex = dayNumber(today) % pool.length;
  const program = pool[programIndex]!;
  const doneToday = sessions.items.some(
    (s) => s.mode === "guided" && dayKey(s.date) === dayKey(today),
  );

  const clock =
    run.phase === "idle" ? roundSeconds : Math.max(0, Math.ceil((run.endsAt - now) / 1000));
  const steps = plan.steps;
  const liveIndex = run.phase === "work" ? callout % steps.length : -1;
  const displayRound = run.phase === "idle" ? 1 : run.round;
  const xp = xpForSession({ rounds, roundSeconds });

  const heroCard = (
    <Frame>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
            paddingVertical: theme.spacing.xs,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Stencil size={theme.font.size.headline} color={theme.colors.primary}>
            ROUND
          </Stencil>
          <View
            style={{
              minWidth: 44,
              alignItems: "center",
              paddingHorizontal: theme.spacing.xs,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.7,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <Stencil size={theme.font.size.headline} color={theme.colors.onPrimary}>
              {String(displayRound)}
            </Stencil>
          </View>
          <Stencil size={theme.font.size.headline} color={theme.colors.textMuted}>
            /
          </Stencil>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${rounds} rounds. Change the number of rounds`}
            disabled={active}
            onPress={() => {
              haptic("selection");
              setSetup({ ...setup, rounds: cycle(ROUND_OPTIONS, rounds) });
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Stencil size={theme.font.size.headline} color={theme.colors.text}>
              {String(rounds)}
            </Stencil>
          </Pressable>
        </View>
        <PressScale
          onPress={active ? stopRound : () => startRound(setup, plan)}
          haptic="light"
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={active ? "Stop round" : "Start this setup"}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
            shadowOpacity: active ? 0 : 0.7,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: active ? 0 : 6,
          }}
        >
          <Ionicons
            name={active ? "stop" : "play"}
            size={18}
            color={theme.colors.onPrimary}
          />
        </PressScale>
      </View>

      {run.phase === "done" ? (
        <View style={{ alignItems: "center", gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
          <Lottie name="success" size={96} />
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Round logged
          </Text>
          <CountUp
            value={xp}
            format={(n) => `+${Math.round(n)} XP`}
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
            }}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            {`${rounds} rounds saved to Progress. Keep the streak going tomorrow.`}
          </Text>
          <SecondaryButton
            label="Back to setup"
            icon="arrow-undo-outline"
            onPress={() => commit(IDLE)}
          />
        </View>
      ) : (
        <>
          <View style={{ alignItems: "center" }}>
            <FlipClock value={clockText(clock)} size={CLOCK_SIZE} />
          </View>

          <ComboPanel
            steps={steps}
            current={liveIndex}
            muted={run.phase === "rest"}
            locked={!isPremium}
            disabled={active}
            onPress={cycleCombo}
            accessibilityLabel={`${plan.name}. ${isPremium ? "Change the combo" : "Custom combos are premium"}`}
          />

          <Pressable
            onPress={() => {
              haptic("selection");
              setCues((value) => !value);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: cues }}
            accessibilityLabel="Haptic callouts"
            hitSlop={8}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons
              name="pulse-outline"
              size={18}
              color={cues ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
              {`Haptic callouts: ${cues ? "Active" : "Off"}`}
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Chip
              label={`${formatRoundLength(roundSeconds)} round`}
              disabled={active}
              onPress={() => setSetup({ ...setup, roundSeconds: cycle(LENGTH_OPTIONS, roundSeconds) })}
              accessibilityLabel={`${formatRoundLength(roundSeconds)} rounds. Change the length`}
            />
            <Chip
              label={restLabel(restSeconds)}
              disabled={active}
              onPress={() => setSetup({ ...setup, restSeconds: cycle(REST_OPTIONS, restSeconds) })}
              accessibilityLabel={`${restLabel(restSeconds)}. Change the rest`}
            />
            <Chip
              label={`${stance === "orthodox" ? "Orthodox" : "Southpaw"} stance`}
              disabled={active}
              onPress={() => setStance((value) => (value === "orthodox" ? "southpaw" : "orthodox"))}
            />
          </View>
        </>
      )}
    </Frame>
  );

  const challengeCard = (
    <Frame corners>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
        <Ionicons name="flash" size={24} color={theme.colors.warning} />
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
            lineHeight: theme.font.size.title * 1.3,
          }}
        >
          {`Today's Challenge: ${program.name} (${program.rounds} Rounds)`}
        </Text>
      </View>
      <GlowButton
        label={doneToday ? "Run it again" : "Start Round"}
        icon={doneToday ? "refresh" : "play"}
        disabled={active}
        accessibilityLabel={`Start ${program.name}, ${program.rounds} rounds`}
        onPress={() =>
          startRound(
            {
              rounds: program.rounds,
              roundSeconds: program.roundSeconds,
              restSeconds: program.restSeconds,
            },
            { name: program.name, steps: program.steps, mode: "guided" },
          )
        }
      />
    </Frame>
  );

  const scoutSection = (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Run a scouted plan" />
      {scouts.loading ? (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <Skeleton width={220} height={96} radius={theme.radius.lg} />
          <Skeleton width={220} height={96} radius={theme.radius.lg} />
        </View>
      ) : scouts.items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {scouts.items.slice(0, 6).map((scout) => {
              const scoutPlan = planFromScout(scout);
              return (
                <PressScale
                  key={scout.id}
                  onPress={() => startRound(setup, scoutPlan)}
                  disabled={active}
                  haptic="light"
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={`Run the plan against ${scout.name}`}
                  style={{
                    width: 220,
                    gap: theme.spacing.xs,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                    <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {scout.name}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                  >
                    {scoutPlan.steps.join(" · ")}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <EmptyState
          icon="eye-outline"
          title="No scouting reports yet"
          body="Scout your next opponent from a photo or a few frames, and their game plan appears here to run as a round."
          actionLabel="Open Scout"
          onAction={() => router.navigate("/scout")}
        />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          {sessions.loading ? (
            <Skeleton width={96} height={18} />
          ) : (
            <>
              <Ionicons name="flame" size={22} color={theme.colors.primary} />
              <CountUp
                value={streak}
                format={(n) => {
                  const days = Math.round(n);
                  return `${days} ${days === 1 ? "DAY" : "DAYS"}`;
                }}
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1,
                  transform: [{ scaleX: 0.86 }],
                }}
              />
            </>
          )}
        </View>
        <Stencil size={theme.font.size.title + 4} color={theme.colors.text} accessibilityRole="header">
          TRAIN
        </Stencil>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={12}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            </Pressable>
          </Link>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          {heroCard}
          {challengeCard}
          {scoutSection}
        </Stagger>
      </ScrollView>

      <Celebrate trigger={finishedChallenges} />
    </View>
  );
}
