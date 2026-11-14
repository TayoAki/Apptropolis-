// Train: the round timer with its punch callouts, today's challenge, and scouted plans to run.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
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
import { PrimaryButton } from "../../components/button";
import { Card, SectionHeader } from "../../components/card";
import { EmptyState } from "../../components/empty-state";
import { RoundClock, clockSizeFor } from "../../components/index/Clock";
import { ComboPanel } from "../../components/index/Combo";
import { Lottie, Celebrate } from "../../components/lottie";
import { CountUp, PressScale, Skeleton, Stagger, haptic } from "../../components/motion";
import {
  AppSwitch,
  Monogram,
  ScreenHeader,
  SecondaryButton,
  StreakBadge,
  displayFace,
} from "../../components/ui";

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

function restLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} sec` : formatRoundLength(seconds);
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

/** One setup value: its name above the value, and a press moves to the next option. */
function SetupChip({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 56,
        justifyContent: "center",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: theme.colors.textMuted,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value}
        </Text>
        <Ionicons name="swap-vertical" size={14} color={theme.colors.textMuted} />
      </View>
    </PressScale>
  );
}

export default function TrainScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isPremium, openPaywall } = usePurchases();
  const { answers } = useAppState();
  const sessions = useCollection<WorkoutSession>("workout_sessions");
  const scouts = useCollection<OpponentScout>("opponent_scouts");
  const { add } = sessions;

  const level: "beginner" | "intermediate" = /inter|advanced/i.test(answers.skilllevel ?? "")
    ? "intermediate"
    : "beginner";

  const [setup, setSetup] = useState<Setup>({ rounds: 5, roundSeconds: 180, restSeconds: 60 });
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

  // The clock is as large as the card allows: the screen less its padding, the card's and a border.
  const clockSize = clockSizeFor(width - 2 * (theme.spacing.lg * 2 + 1));
  const roundLabel =
    run.phase === "rest"
      ? `Round ${run.round} of ${rounds} done`
      : `Round ${displayRound} of ${rounds}`;

  const heroCard = (
    <Card style={{ gap: theme.spacing.md }}>
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
            Session logged
          </Text>
          <CountUp
            value={xp}
            format={(n) => `+${Math.round(n)} XP`}
            style={[
              displayFace,
              { color: theme.colors.primary, fontSize: theme.font.size.headline },
            ]}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {`${rounds} ${rounds === 1 ? "round" : "rounds"} saved to Progress. Keep the streak going tomorrow.`}
          </Text>
          <SecondaryButton
            label="Back to setup"
            icon="arrow-undo-outline"
            onPress={() => commit(IDLE)}
          />
        </View>
      ) : (
        <>
          <Text
            accessibilityRole="header"
            style={[
              displayFace,
              {
                color: run.phase === "work" ? theme.colors.primary : theme.colors.textMuted,
                fontSize: theme.font.size.title,
                letterSpacing: 0.5,
                textAlign: "center",
                textTransform: "uppercase",
                fontVariant: ["tabular-nums"],
              },
            ]}
          >
            {roundLabel}
          </Text>

          <RoundClock seconds={clock} size={clockSize} dim={run.phase === "rest"} />

          <ComboPanel
            name={plan.name}
            steps={steps}
            phase={run.phase === "work" ? "work" : run.phase === "rest" ? "rest" : "idle"}
            current={liveIndex}
            restNote={`Round ${run.round + 1} of ${rounds} is next`}
            locked={!isPremium}
            onPress={cycleCombo}
          />

          {active ? (
            <SecondaryButton label="Stop" icon="stop" onPress={stopRound} accessibilityLabel="Stop round" />
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <SetupChip
                    label="Rounds"
                    value={String(rounds)}
                    onPress={() => setSetup({ ...setup, rounds: cycle(ROUND_OPTIONS, rounds) })}
                    accessibilityLabel={`${rounds} rounds. Change the number of rounds`}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SetupChip
                    label="Round"
                    value={formatRoundLength(roundSeconds)}
                    onPress={() =>
                      setSetup({ ...setup, roundSeconds: cycle(LENGTH_OPTIONS, roundSeconds) })
                    }
                    accessibilityLabel={`${formatRoundLength(roundSeconds)} rounds. Change the round length`}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SetupChip
                    label="Rest"
                    value={restLabel(restSeconds)}
                    onPress={() =>
                      setSetup({ ...setup, restSeconds: cycle(REST_OPTIONS, restSeconds) })
                    }
                    accessibilityLabel={`${restLabel(restSeconds)} rest. Change the rest`}
                  />
                </View>
              </View>
              <PrimaryButton
                label="Start round"
                icon="play"
                onPress={() => startRound(setup, plan)}
              />
            </>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.md,
              minHeight: 44,
            }}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
              <Ionicons name="pulse-outline" size={20} color={theme.colors.textMuted} />
              <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
                Haptic callouts
              </Text>
            </View>
            <AppSwitch
              label="Haptic callouts"
              value={cues}
              onValueChange={(next) => {
                haptic("selection");
                setCues(next);
              }}
            />
          </View>
        </>
      )}
    </Card>
  );

  const challengeCard = (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Ionicons name="flash" size={22} color={theme.colors.primary} />
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Today's challenge
        </Text>
        {doneToday ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
            <Text
              style={{
                color: theme.colors.success,
                fontSize: theme.font.size.caption + 2,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Done
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {program.name}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption + 2,
            lineHeight: 20,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`${program.rounds} rounds · ${formatRoundLength(program.roundSeconds)} each · ${restLabel(program.restSeconds)} rest`}
        </Text>
        <Text
          style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2, lineHeight: 20 }}
        >
          {program.steps.join(" · ")}
        </Text>
      </View>
      <SecondaryButton
        label={doneToday ? "Run it again" : "Start challenge"}
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
    </Card>
  );

  const scoutSection = (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Run a scouted plan" />
      {scouts.loading ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Skeleton height={72} radius={theme.radius.md} />
          <Skeleton height={72} radius={theme.radius.md} />
        </View>
      ) : scouts.items.length ? (
        <View
          style={{
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            overflow: "hidden",
          }}
        >
          {scouts.items.slice(0, 6).map((scout, index) => {
            const scoutPlan = planFromScout(scout);
            return (
              <View key={scout.id}>
                {index > 0 ? (
                  <View
                    style={{
                      height: 1,
                      marginLeft: theme.spacing.lg + 40 + theme.spacing.md,
                      backgroundColor: theme.colors.border,
                    }}
                  />
                ) : null}
                <PressScale
                  onPress={() => startRound(setup, scoutPlan)}
                  disabled={active}
                  haptic="light"
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`Run the plan against ${scout.name}: ${scoutPlan.steps.join(", ")}`}
                  accessibilityState={{ disabled: active }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    minHeight: 72,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  <Monogram name={scout.name} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {scout.name}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption + 2,
                        lineHeight: 20,
                      }}
                    >
                      {scoutPlan.steps.join(" · ")}
                    </Text>
                  </View>
                  <Ionicons
                    name="play-circle-outline"
                    size={28}
                    color={active ? theme.colors.border : theme.colors.primary}
                  />
                </PressScale>
              </View>
            );
          })}
        </View>
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
      <ScreenHeader
        title="Train"
        right={sessions.loading ? <Skeleton width={72} height={32} radius={16} /> : <StreakBadge days={streak} />}
      />

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
