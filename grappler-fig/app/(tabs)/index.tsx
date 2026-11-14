// Train: the round timer with its punch callouts, today's challenge, and scouted plans to run.
// The timer's setup is the one saved in Settings (round length, rest, rounds, stance, callout
// style). A challenge, a scouted plan or a coach's drill loads on top of it for one session.
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
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
  type Stance,
  type WorkoutMode,
  type WorkoutSession,
} from "../../data/schema";
import {
  CALLOUT_MS,
  COMBOS,
  forStance,
  levelOf,
  programForDay,
  showCallout,
} from "../../data/training";
import { PrimaryButton } from "../../components/button";
import { Card, SectionHeader } from "../../components/card";
import { EmptyState } from "../../components/empty-state";
import { RoundClock, clockSizeFor } from "../../components/index/Clock";
import { ComboPanel } from "../../components/index/Combo";
import { useScreenAwake } from "../../components/keep-awake";
import { LoadProblem, useStalled } from "../../components/load-problem";
import { Lottie, Celebrate } from "../../components/lottie";
import { CountUp, PressScale, Skeleton, Stagger, haptic } from "../../components/motion";
import { goPro } from "../../components/paywall/open";
import {
  SCOUTED_ROUNDS,
  SCOUTED_ROUND_SECONDS,
  parseCallouts,
  planIsOpen,
  toRounds,
} from "../../components/scout/ScoutCard";
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
  mode: WorkoutMode;
  /** The callouts for each round, used in turn (one list repeats every round). */
  rounds: string[][];
  /** Written for an orthodox boxer: mirror left and right for a southpaw. */
  builtIn: boolean;
}
/** A challenge, scouted plan or coach drill loaded over the person's own setup. */
interface Loaded {
  plan: Plan;
  setup: Setup;
}
type Phase = "idle" | "work" | "rest" | "done";
interface Run {
  phase: Phase;
  round: number;
  startedAt: number;
  endsAt: number;
}
/** A finished (or stopped) session and whether it reached Progress. */
interface Result {
  record: Omit<WorkoutSession, "id">;
  stopped: boolean;
  save: "saving" | "saved" | "failed";
}

const ROUND_OPTIONS = [3, 5, 6, 8, 10];
const LENGTH_OPTIONS = [120, 180, 240, 300];
const REST_OPTIONS = [30, 60, 90];
const DEFAULT_SETUP: Setup = { rounds: 5, roundSeconds: 180, restSeconds: 60 };
const IDLE: Run = { phase: "idle", round: 1, startedAt: 0, endsAt: 0 };

function restLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} sec` : formatRoundLength(seconds);
}

function roundsWord(count: number): string {
  return `${count} ${count === 1 ? "round" : "rounds"}`;
}

/** A saved number within bounds, or the fallback when it is missing or out of range. */
function savedNumber(value: string | undefined, min: number, max: number, fallback: number) {
  const n = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(n) && n >= min && n <= max
    ? Math.round(n)
    : fallback;
}

/** The next option after the current value (which Settings may have set between the options). */
function nextOption(options: number[], current: number): number {
  return options.find((option) => option > current) ?? options[0]!;
}

function comboPlan(index: number): Plan {
  const combo = COMBOS[index] ?? COMBOS[0]!;
  return { name: `${combo.name} combo`, mode: "callout", rounds: [combo.steps], builtIn: true };
}

/** A scouting report's callouts as three rounds, the way the report lists them. */
function scoutPlan(scout: OpponentScout): Plan | null {
  const rounds = toRounds(parseCallouts(scout.gamePlan), SCOUTED_ROUNDS);
  if (rounds.length === 0) return null;
  return { name: scout.name, mode: "scouted", rounds, builtIn: false };
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

function TrainScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isPremium } = usePurchases();
  const { answers, setAnswer } = useAppState();
  const sessions = useCollection<WorkoutSession>("workout_sessions");
  const scouts = useCollection<OpponentScout>("opponent_scouts");
  const { add } = sessions;
  const params = useLocalSearchParams<{
    scout?: string;
    drill?: string;
    rounds?: string;
    roundSeconds?: string;
    callouts?: string;
  }>();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const stalled = useStalled(sessions.loading || scouts.loading);

  // The person's own setup, saved with their answers so Settings and this screen always agree.
  const own: Setup = {
    rounds: savedNumber(answers.rounds, 1, 20, DEFAULT_SETUP.rounds),
    roundSeconds: savedNumber(answers.roundseconds, 30, 600, DEFAULT_SETUP.roundSeconds),
    restSeconds: savedNumber(answers.restseconds, 5, 600, DEFAULT_SETUP.restSeconds),
  };
  const stance: Stance = answers.stance === "southpaw" ? "southpaw" : "orthodox";
  const style = answers.callouts === "numbers" ? "numbers" : "names";
  const cues = answers.haptics !== "off";
  const level = levelOf(answers.skilllevel);

  const [combo, setCombo] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [run, setRun] = useState<Run>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [callout, setCallout] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [finishedChallenges, setFinishedChallenges] = useState(0);
  const [today, setToday] = useState(() => new Date());

  // What the running round reads: frozen when it starts, so nothing changes under it.
  const runRef = useRef<Run>(IDLE);
  const liveRef = useRef<Loaded>({ plan: comboPlan(0), setup: own });
  const cuesRef = useRef(cues);
  cuesRef.current = cues;
  const calloutRef = useRef(0);

  const active = run.phase === "work" || run.phase === "rest";
  const plan = active ? liveRef.current.plan : (loaded?.plan ?? comboPlan(combo));
  const setup = active ? liveRef.current.setup : (loaded?.setup ?? own);
  const { rounds, roundSeconds, restSeconds } = setup;

  useScreenAwake(active);

  // A new day brings a new challenge: look at the date again whenever the tab is opened.
  useFocusEffect(
    useCallback(() => {
      setToday(new Date());
    }, []),
  );

  function commit(next: Run) {
    runRef.current = next;
    setRun(next);
  }

  async function save(record: Omit<WorkoutSession, "id">, stopped: boolean) {
    setResult({ record, stopped, save: "saving" });
    try {
      await add(record);
      setResult({ record, stopped, save: "saved" });
      track("round_completed", { rounds: record.rounds, mode: record.mode });
      if (record.mode === "guided" && !stopped) setFinishedChallenges((n) => n + 1);
    } catch {
      setResult({ record, stopped, save: "failed" });
    }
  }

  /** End the session with the rounds that were finished, and log it. */
  function finish(completed: number, endedAt: number, stopped: boolean) {
    const live = liveRef.current;
    commit({ ...runRef.current, phase: "done", startedAt: endedAt, endsAt: endedAt });
    calloutRef.current = 0;
    setCallout(0);
    haptic(stopped ? "light" : "success");
    void save(
      {
        date: new Date(endedAt).toISOString(),
        rounds: completed,
        roundSeconds: live.setup.roundSeconds,
        mode: live.plan.mode,
        xpEarned: xpForSession({ rounds: completed, roundSeconds: live.setup.roundSeconds }),
        topFix: "",
      },
      stopped,
    );
  }

  // The round clock. It reads the latest run from a ref, so each tick moves the timer on
  // from the wall clock and never double-counts a phase change.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = runRef.current;
      const live = liveRef.current.setup;

      if (cur.phase === "work" && t < cur.endsAt) {
        const step = Math.floor((t - cur.startedAt) / CALLOUT_MS);
        if (step !== calloutRef.current) {
          calloutRef.current = step;
          setCallout(step);
          if (cuesRef.current) haptic("light");
        }
        return;
      }
      if (t < cur.endsAt) return;

      if (cur.phase === "work") {
        if (cur.round < live.rounds) {
          calloutRef.current = 0;
          setCallout(0);
          commit({ ...cur, phase: "rest", startedAt: t, endsAt: t + live.restSeconds * 1000 });
          haptic("light");
        } else {
          finish(live.rounds, t, false);
        }
      } else if (cur.phase === "rest") {
        calloutRef.current = 0;
        setCallout(0);
        commit({
          phase: "work",
          round: cur.round + 1,
          startedAt: t,
          endsAt: t + live.roundSeconds * 1000,
        });
        haptic("medium");
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function startRound(next: Loaded) {
    if (active) return;
    liveRef.current = next;
    setResult(null);
    calloutRef.current = 0;
    setCallout(0);
    const t = Date.now();
    setNow(t);
    commit({ phase: "work", round: 1, startedAt: t, endsAt: t + next.setup.roundSeconds * 1000 });
    haptic("medium");
    scroller.current?.scrollTo({ y: 0, animated: true });
  }

  /** Stopping keeps the rounds already finished; a stop in the first round logs nothing. */
  function stopRound() {
    const cur = runRef.current;
    const completed = cur.phase === "rest" ? cur.round : cur.round - 1;
    if (completed >= 1) {
      finish(completed, Date.now(), true);
      return;
    }
    commit(IDLE);
    calloutRef.current = 0;
    setCallout(0);
    haptic("light");
  }

  function backToSetup() {
    commit(IDLE);
    setResult(null);
  }

  function changeCombo() {
    // From a loaded plan, the press goes back to the person's own combo.
    if (loaded) {
      setLoaded(null);
      return;
    }
    const next = (combo + 1) % COMBOS.length;
    if (!isPremium && next !== 0) {
      goPro("train");
      return;
    }
    setCombo(next);
  }

  // A plan sent from a scouting report ("Drill this game plan") or the coach ("Run drill") is
  // loaded here, ready to start. It is read once, then the route's parameters are cleared.
  useEffect(() => {
    if (params.scout) {
      if (scouts.loading) return;
      const scout = scouts.items.find((item) => item.id === params.scout);
      const scouted = scout && planIsOpen(scout, isPremium) ? scoutPlan(scout) : null;
      if (scouted && !active) {
        setLoaded({
          plan: scouted,
          setup: {
            rounds: SCOUTED_ROUNDS,
            roundSeconds: SCOUTED_ROUND_SECONDS,
            restSeconds: own.restSeconds,
          },
        });
        if (run.phase === "done") backToSetup();
        scroller.current?.scrollTo({ y: 0, animated: false });
      }
      router.setParams({ scout: undefined });
    } else if (params.drill) {
      if (!active) {
        const calls = (params.callouts ?? "")
          .split(",")
          .map((call) => call.trim())
          .filter(Boolean)
          .slice(0, 9)
          .map((call) => call.charAt(0).toUpperCase() + call.slice(1));
        setLoaded({
          plan: {
            name: params.drill,
            mode: "callout",
            rounds: [calls.length ? calls : COMBOS[0]!.steps],
            builtIn: calls.length === 0,
          },
          setup: {
            rounds: savedNumber(params.rounds, 1, 12, 3),
            roundSeconds: savedNumber(params.roundSeconds, 30, 300, 60),
            restSeconds: own.restSeconds,
          },
        });
        if (run.phase === "done") backToSetup();
        scroller.current?.scrollTo({ y: 0, animated: false });
      }
      router.setParams({
        drill: undefined,
        rounds: undefined,
        roundSeconds: undefined,
        callouts: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.scout, params.drill, scouts.loading]);

  // Derived values
  const streak = sessions.loading ? 0 : currentStreak(sessions.items, today);
  const program = programForDay(level, today);
  // Done means the whole challenge, not a round of it before stopping.
  const doneToday = sessions.items.some(
    (s) => s.mode === "guided" && dayKey(s.date) === dayKey(today) && s.rounds >= program.rounds,
  );
  const challenge: Loaded = {
    plan: { name: program.name, mode: "guided", rounds: [program.steps], builtIn: true },
    setup: {
      rounds: program.rounds,
      roundSeconds: program.roundSeconds,
      restSeconds: program.restSeconds,
    },
  };

  /** A callout as this boxer sees it: mirrored for a southpaw, as a number if they chose numbers. */
  const shown = (step: string, builtIn: boolean) =>
    showCallout(builtIn ? forStance(step, stance) : step, style, stance);

  const clock =
    run.phase === "idle" ? roundSeconds : Math.max(0, Math.ceil((run.endsAt - now) / 1000));
  const displayRound = run.phase === "idle" ? 1 : run.round;
  const roundSteps = plan.rounds[(displayRound - 1) % plan.rounds.length] ?? [];
  const steps = roundSteps.map((step) => shown(step, plan.builtIn));
  const liveIndex = run.phase === "work" && steps.length ? callout % steps.length : -1;
  const planName = plan.builtIn ? forStance(plan.name, stance) : plan.name;

  // The clock is as large as the card allows: the screen less its padding, the card's and a border.
  const clockSize = clockSizeFor(width - 2 * (theme.spacing.lg * 2 + 1));
  const roundLabel =
    run.phase === "rest"
      ? `Round ${run.round} of ${rounds} done`
      : `Round ${displayRound} of ${rounds}`;
  const setupLine = `${roundsWord(rounds)} · ${formatRoundLength(roundSeconds)} each · ${restLabel(restSeconds)} rest`;

  const donePanel = result ? (
    <View style={{ alignItems: "center", gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
      {result.save === "failed" ? (
        <Ionicons name="cloud-offline-outline" size={56} color={theme.colors.danger} />
      ) : result.stopped ? (
        <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
      ) : (
        <Lottie name="success" size={96} />
      )}
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          textAlign: "center",
        }}
      >
        {result.save === "failed"
          ? "Session not saved yet"
          : result.stopped
            ? "Stopped early"
            : "Session logged"}
      </Text>
      {result.save === "failed" ? null : (
        <CountUp
          value={result.record.xpEarned}
          format={(n) => `+${Math.round(n)} XP`}
          style={[displayFace, { color: theme.colors.primary, fontSize: theme.font.size.headline }]}
        />
      )}
      <Text
        accessibilityLiveRegion="polite"
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.body,
          lineHeight: 24,
          textAlign: "center",
        }}
      >
        {result.save === "failed"
          ? `Your ${roundsWord(result.record.rounds)} couldn't be saved. Check your connection and try again. They're kept here until you leave this screen.`
          : result.save === "saving"
            ? "Saving to Progress…"
            : `${roundsWord(result.record.rounds)} saved to Progress.${
                result.stopped ? "" : " Keep the streak going tomorrow."
              }`}
      </Text>
      <View style={{ alignSelf: "stretch", gap: theme.spacing.sm }}>
        {result.save === "failed" ? (
          <PrimaryButton
            label="Try saving again"
            icon="refresh"
            onPress={() => void save(result.record, result.stopped)}
          />
        ) : null}
        <SecondaryButton label="Back to setup" icon="arrow-undo-outline" onPress={backToSetup} />
      </View>
    </View>
  ) : null;

  const heroCard = (
    <Card style={{ gap: theme.spacing.md }}>
      {run.phase === "done" && donePanel ? (
        donePanel
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
            name={planName}
            steps={steps}
            phase={run.phase === "work" ? "work" : run.phase === "rest" ? "rest" : "idle"}
            current={liveIndex}
            restNote={`Round ${run.round + 1} of ${rounds} is next`}
            locked={!isPremium && !loaded}
            changeLabel={loaded ? "Use my combo" : "Change"}
            onPress={changeCombo}
          />

          {active ? (
            <SecondaryButton
              label="Stop"
              icon="stop"
              onPress={stopRound}
              accessibilityLabel="Stop the session"
            />
          ) : (
            <>
              {loaded ? (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.body,
                    lineHeight: 24,
                    textAlign: "center",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {setupLine}
                </Text>
              ) : (
                <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <SetupChip
                      label="Rounds"
                      value={String(rounds)}
                      onPress={() =>
                        void setAnswer("rounds", String(nextOption(ROUND_OPTIONS, rounds)))
                      }
                      accessibilityLabel={`${rounds} rounds. Change the number of rounds`}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SetupChip
                      label="Round"
                      value={formatRoundLength(roundSeconds)}
                      onPress={() =>
                        void setAnswer(
                          "roundseconds",
                          String(nextOption(LENGTH_OPTIONS, roundSeconds)),
                        )
                      }
                      accessibilityLabel={`${formatRoundLength(roundSeconds)} rounds. Change the round length`}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SetupChip
                      label="Rest"
                      value={restLabel(restSeconds)}
                      onPress={() =>
                        void setAnswer("restseconds", String(nextOption(REST_OPTIONS, restSeconds)))
                      }
                      accessibilityLabel={`${restLabel(restSeconds)} rest. Change the rest`}
                    />
                  </View>
                </View>
              )}
              <PrimaryButton
                label="Start round"
                icon="play"
                onPress={() => startRound({ plan, setup })}
                accessibilityLabel={`Start: ${planName}, ${setupLine}`}
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
                void setAnswer("haptics", next ? "on" : "off");
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
          {forStance(program.name, stance)}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption + 2,
            lineHeight: 20,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`${roundsWord(program.rounds)} · ${formatRoundLength(program.roundSeconds)} each · ${restLabel(program.restSeconds)} rest`}
        </Text>
        <Text
          style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2, lineHeight: 20 }}
        >
          {program.steps.map((step) => shown(step, true)).join(" · ")}
        </Text>
      </View>
      <SecondaryButton
        label={doneToday ? "Run it again" : "Start challenge"}
        icon={doneToday ? "refresh" : "play"}
        disabled={active}
        accessibilityLabel={`Start ${program.name}, ${program.rounds} rounds`}
        onPress={() => {
          setLoaded(challenge);
          startRound(challenge);
        }}
      />
    </Card>
  );

  const plans = scouts.items
    .map((scout) => ({ scout, scouted: scoutPlan(scout) }))
    .filter((entry): entry is { scout: OpponentScout; scouted: Plan } => entry.scouted !== null)
    .slice(0, 6);

  const scoutSection = (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Run a scouted plan" />
      {scouts.loading ? (
        stalled ? null : (
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton height={72} radius={theme.radius.md} />
            <Skeleton height={72} radius={theme.radius.md} />
          </View>
        )
      ) : plans.length ? (
        <View
          style={{
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            overflow: "hidden",
          }}
        >
          {plans.map(({ scout, scouted }, index) => {
            const open = planIsOpen(scout, isPremium);
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
                  onPress={() => {
                    if (!open) {
                      goPro("train");
                      return;
                    }
                    const next: Loaded = {
                      plan: scouted,
                      setup: {
                        rounds: SCOUTED_ROUNDS,
                        roundSeconds: SCOUTED_ROUND_SECONDS,
                        restSeconds: own.restSeconds,
                      },
                    };
                    setLoaded(next);
                    startRound(next);
                  }}
                  disabled={active}
                  haptic="light"
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={
                    open
                      ? `Run the plan against ${scout.name}, three rounds of three minutes: ${scouted.rounds.flat().join(", ")}`
                      : `The plan against ${scout.name} is part of Pro`
                  }
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
                      {open
                        ? `3 × 3 min · ${scouted.rounds.flat().join(" · ")}`
                        : "Game plans are part of Pro"}
                    </Text>
                  </View>
                  <Ionicons
                    name={open ? "play-circle-outline" : "lock-closed"}
                    size={open ? 28 : 20}
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
          body="Scout your next opponent from a photo or a video still, and their game plan appears here to run as a round."
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
        right={
          sessions.loading ? (
            stalled ? null : (
              <Skeleton width={72} height={32} radius={16} />
            )
          ) : (
            <StreakBadge days={streak} />
          )
        }
      />

      <ScrollView
        ref={scroller}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          {heroCard}
          {stalled && !active && run.phase !== "done" ? (
            <LoadProblem
              what="your streak and scouted plans"
              note="The timer works meanwhile."
              onRetry={onRetry}
            />
          ) : null}
          {challengeCard}
          {scoutSection}
        </Stagger>
      </ScrollView>

      <Celebrate trigger={finishedChallenges} />
    </View>
  );
}

/** Retrying a failed load starts the screen afresh, which asks for its data again. */
export default function TrainTab() {
  const [attempt, setAttempt] = useState(0);
  return <TrainScreen key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}
