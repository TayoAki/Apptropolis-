import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Rect } from "react-native-svg";
import { Avatar, PARTNER_PHOTO } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { ExerciseCard, type Draft } from "../../components/index/ExerciseCard";
import { Celebrate, Lottie } from "../../components/lottie";
import {
  Appear,
  CountUp,
  GrowBar,
  PressScale,
  Pulse,
  Skeleton,
  SkeletonList,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { Rocco } from "../../components/Rocco";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { SETS_PER_EXERCISE, nextSessionDate, repsFor, startingWeight } from "../../data/plan";
import { usePlanner } from "../../data/planner";
import { useCollection } from "../../data/repo";
import {
  count,
  dayKey,
  dayLabel,
  formatTime,
  sharedWeek,
  todaysWorkout,
  weekDays,
  weekdayShort,
  weekStats,
  type Exercise,
  type PartnerUpdate,
  type SetLog,
  type Workout,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const TARGET_SETS = SETS_PER_EXERCISE;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function lastOf<T>(rows: T[]): T | undefined {
  return rows[rows.length - 1];
}

export default function TodayScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { answers, resetOnboarding } = useAppState();
  // The saved plan. The planner also lays out each new week from it, and re-renders this
  // screen when the calendar day changes.
  const planner = usePlanner();
  const template = planner.template;
  const workoutsStore = useCollection<Workout>("workouts");
  const setsStore = useCollection<SetLog>("set_logs");
  const exercisesStore = useCollection<Exercise>("exercises");
  const updatesStore = useCollection<PartnerUpdate>("partner_updates");

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(0);
  const [buttonSize, setButtonSize] = useState({ w: 0, h: 0 });
  const trace = useRef(new Animated.Value(0)).current;
  const tone = useRef(new Animated.Value(0)).current;
  // True while a completion is being saved, so a second tap can't post it twice.
  const completing = useRef(false);

  const now = new Date();
  const today = dayKey(now);
  const workouts = workoutsStore.items;
  const sets = setsStore.items;
  const updates = updatesStore.items;
  const loading =
    planner.loading ||
    workoutsStore.loading ||
    setsStore.loading ||
    exercisesStore.loading ||
    updatesStore.loading;

  const workout = todaysWorkout(workouts, now);
  const completed = Boolean(workout?.completed);
  const week = weekStats(workouts, now);
  // A partner is linked once an update from them has arrived. Until then the score is the
  // person's own; afterwards it is the shared one, the same number the Partner tab draws.
  const paired = updates.some((u) => u.from === "partner");
  const scorePercent = paired ? sharedWeek(workouts, updates, now).percent : week.percent;
  // The week's target is the sessions the plan laid out this week: as many as the training
  // days picked in setup (fewer in the week the plan was built, which starts from that day).
  const sessionsTarget = week.planned;
  const planGoal = template?.goal ?? answers.goal;
  const nextSession = template ? nextSessionDate(template, now) : null;

  const exerciseById = useMemo(
    () => new Map(exercisesStore.items.map((e) => [e.id, e] as const)),
    [exercisesStore.items],
  );
  const session: Exercise[] = workout
    ? workout.exercises
        .map((id) => exerciseById.get(id))
        .filter((e): e is Exercise => Boolean(e))
    : [];

  const todaysSets = workout ? sets.filter((s) => s.workoutId === workout.id) : [];
  const loggedFor = (id: string) =>
    todaysSets.filter((s) => s.exercise === id).sort((a, b) => a.setNumber - b.setNumber);
  const draftFor = (id: string): Draft => {
    const existing = drafts[id];
    if (existing) return existing;
    // The last set logged for this lift (today or any earlier day), else a sensible start: the
    // plan's reps for the goal and a light weight for the equipment.
    const last = lastOf(loggedFor(id)) ?? lastOf(sets.filter((s) => s.exercise === id));
    return {
      weight: last?.weight ?? startingWeight(exerciseById.get(id)?.equipment),
      reps: last?.reps ?? repsFor(planGoal),
    };
  };
  const isDone = (id: string) => loggedFor(id).length >= TARGET_SETS;
  const firstOpen = session.find((e) => !isDone(e.id));
  // The open card: the one the person tapped (a finished one too, to take a set back),
  // otherwise the first exercise with sets left.
  const activeId = completed
    ? null
    : picked && session.some((e) => e.id === picked)
      ? picked
      : (firstOpen?.id ?? null);

  const dayOf = (iso: string) => dayKey(new Date(iso));
  const partnerDone = updates.find(
    (u) => u.from === "partner" && u.type === "completion" && dayOf(u.createdAt) === today,
  );
  const cheeredToday = updates.some(
    (u) => u.from === "you" && u.type === "cheer" && dayOf(u.createdAt) === today,
  );

  // The privacy chip shifts from muted to success when the workout is completed.
  useEffect(() => {
    if (reduced) {
      tone.setValue(completed ? 1 : 0);
      return;
    }
    const animation = Animated.timing(tone, {
      toValue: completed ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [completed, reduced, tone]);

  function step(id: string, field: "weight" | "reps", delta: number) {
    haptic("selection");
    setDrafts((previous) => {
      const base = previous[id] ?? draftFor(id);
      const next: Draft =
        field === "weight"
          ? { ...base, weight: clamp(base.weight + delta, 0, 1000) }
          : { ...base, reps: clamp(base.reps + delta, 1, 50) };
      return { ...previous, [id]: next };
    });
  }

  async function logSet(exercise: Exercise) {
    if (!workout || completed) return;
    const draft = draftFor(exercise.id);
    const setNumber = loggedFor(exercise.id).length + 1;
    haptic("selection");
    try {
      await setsStore.add({
        workoutId: workout.id,
        exercise: exercise.id,
        setNumber,
        reps: draft.reps,
        weight: draft.weight,
      });
      if (setNumber === TARGET_SETS) {
        haptic("success");
        // Its sets are in: move on to the next exercise with sets left.
        setPicked(null);
      }
      setNotice(null);
    } catch {
      setNotice("That set didn't save. Try logging it again.");
    }
  }

  /** Takes back the last set logged for an exercise (a wrong weight or a mis-tap). */
  async function undoSet(exercise: Exercise) {
    if (!workout || completed) return;
    const last = lastOf(loggedFor(exercise.id));
    if (!last) return;
    haptic("selection");
    try {
      await setsStore.remove(last.id);
      setNotice(null);
    } catch {
      setNotice("That set couldn't be removed. Try again.");
    }
  }

  async function completeWorkout() {
    if (!workout || completed || completing.current) return;
    completing.current = true;
    if (!reduced) {
      trace.setValue(0);
      Animated.timing(trace, { toValue: 1, duration: 320, useNativeDriver: false }).start();
    }
    const finishedAt = new Date().toISOString();
    const score = weekStats(
      workouts.map((w) => (w.id === workout.id ? { ...w, completed: true } : w)),
      now,
    ).percent;
    try {
      await workoutsStore.update(workout.id, { completed: true, completedAt: finishedAt });
      await updatesStore.add({
        type: "completion",
        from: "you",
        message: `${workout.title} done.`,
        createdAt: finishedAt,
        weekScore: score,
      });
      haptic("success");
      track("workout_completed", { exercises: session.length, sets: todaysSets.length });
      setCelebration((n) => n + 1);
      setNotice(null);
    } catch {
      setNotice("The workout didn't save. Try again.");
    } finally {
      completing.current = false;
    }
  }

  async function reopenWorkout() {
    if (!workout) return;
    haptic("selection");
    try {
      await workoutsStore.update(workout.id, { completed: false, completedAt: null });
      // The "done" note it posted goes too, so finishing again doesn't leave two of them.
      const posted = updates.filter(
        (u) => u.from === "you" && u.type === "completion" && dayOf(u.createdAt) === today,
      );
      for (const update of posted) await updatesStore.remove(update.id);
    } catch {
      setNotice("Couldn't reopen the workout. Try again.");
    }
  }

  async function cheer() {
    try {
      await updatesStore.add({
        type: "cheer",
        from: "you",
        message: "Saw you finish today. Proud of you.",
        createdAt: new Date().toISOString(),
        weekScore: week.percent,
      });
    } catch {
      setNotice("Couldn't send your cheer. Try again.");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.lg,
          }}
        >
          <Skeleton width={160} height={12} />
          <Skeleton width="80%" height={36} />
          <Skeleton width="100%" height={84} radius={theme.radius.lg} />
          <Skeleton width="60%" height={16} />
          <Skeleton width="100%" height={44} radius={theme.radius.md} />
          <SkeletonList rows={3} />
        </ScrollView>
      </View>
    );
  }

  const dateLabel = `${WEEKDAY_NAMES[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;
  const partnerName = (answers.partner_name ?? "").trim();
  const partnerLine = partnerDone
    ? `Finished today's workout at ${formatTime(partnerDone.createdAt)}.`
    : "Not finished today yet. You'll see it here the moment they do.";
  const byDay = new Map(
    workouts.filter((w) => !w.deleted).map((w) => [w.date, w] as const),
  );
  const perimeter = 2 * (buttonSize.w + buttonSize.h);
  const dashOffset = trace.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0] });
  const traceOpacity = trace.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] });

  const header = (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        gap: theme.spacing.lg,
      }}
    >
      <Appear>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {dateLabel}
          </Text>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              marginRight: -theme.spacing.sm,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      </Appear>

      <Appear delay={60}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.display,
                fontWeight: theme.font.weight.bold,
                lineHeight: 38,
              }}
            >
              {workout ? workout.title : template ? "Rest day" : "No plan yet"}
            </Text>
            {template && planGoal ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {`Goal: ${planGoal}`}
              </Text>
            ) : null}
          </View>
          <Rocco
            pose={completed ? "rocco-fist-bump-spotter" : "rocco-neutral-ready"}
            size={96}
          />
        </View>
      </Appear>

      <Appear delay={120}>
        {paired ? (
          <Card
            label={partnerDone ? "Your partner finished today" : "Your partner hasn't finished today"}
            style={{ gap: theme.spacing.md }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <View>
                <Avatar prompt={PARTNER_PHOTO} name={partnerName} size={52} />
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: theme.colors.surface,
                    backgroundColor: partnerDone ? theme.colors.success : theme.colors.textMuted,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {partnerName || "Your partner"}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  {partnerLine}
                </Text>
              </View>
              {partnerDone ? (
                <Pulse>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.colors.success,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text
                      style={{
                        color: theme.colors.success,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      Done
                    </Text>
                  </View>
                </Pulse>
              ) : null}
            </View>
            {partnerDone ? (
              cheeredToday ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <View style={{ width: 40, height: 40, overflow: "hidden" }}>
                    <Lottie name="heart" size={40} />
                  </View>
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, flex: 1 }}>
                    Cheer sent. They'll see it on their side.
                  </Text>
                </View>
              ) : (
                <Button label="Cheer" icon="flame" onPress={cheer} />
              )
            ) : null}
          </Card>
        ) : (
          // No partner is linked: phones can't be linked in this version, so the card says so
          // and points at the one thing that does reach a partner, the scorecard.
          <Card
            onPress={() => router.navigate("/partner")}
            label="No partner linked yet. Open the Partner tab to send your scorecard."
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <Avatar name={partnerName} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {partnerName ? `${partnerName} isn't linked yet` : "No partner linked yet"}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  Send your scorecard from the Partner tab so they can see you showed up.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </Card>
        )}
      </Appear>

      <Appear delay={180}>
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Accountability
            </Text>
            {/* A score only once a session has been due this week: 0% of nothing isn't a result. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                display: week.due ? "flex" : "none",
              }}
            >
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                {paired ? "Team:" : "You:"}
              </Text>
              <CountUp
                value={scorePercent}
                format={(n) => `${Math.round(n)}%`}
                style={{
                  color: scorePercent >= 70 ? theme.colors.success : theme.colors.warning,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", marginTop: theme.spacing.xs }}>
            {weekDays(now).map((key) => {
              const item = byDay.get(key);
              const isToday = key === today;
              const past = key < today;
              let status = "rest day";
              let icon: ReactNode = (
                <Ionicons name="remove" size={14} color={theme.colors.textMuted} />
              );
              if (item?.completed) {
                status = "done";
                icon = <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />;
              } else if (item && past) {
                status = "missed";
                icon = (
                  <Ionicons name="close-circle-outline" size={22} color={theme.colors.textMuted} />
                );
              } else if (item && isToday) {
                status = "today";
                icon = <Ionicons name="ellipse-outline" size={20} color={theme.colors.primary} />;
              } else if (item) {
                status = "scheduled";
                icon = <Ionicons name="ellipse" size={8} color={theme.colors.textMuted} />;
              }
              return (
                <View
                  key={key}
                  accessible
                  accessibilityLabel={`${weekdayShort(key)}, ${status}`}
                  style={{ flex: 1, alignItems: "center", gap: theme.spacing.xs }}
                >
                  <Text
                    style={{
                      color: isToday ? theme.colors.primary : theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {weekdayShort(key).charAt(0)}
                  </Text>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isToday ? (
                      <Svg width={34} height={34} style={{ position: "absolute" }}>
                        <Circle
                          cx={17}
                          cy={17}
                          r={15}
                          fill={theme.colors.surfaceAlt}
                          stroke={theme.colors.primary}
                          strokeWidth={2}
                        />
                      </Svg>
                    ) : null}
                    {icon}
                  </View>
                </View>
              );
            })}
          </View>

          <GrowBar progress={week.percent / 100} color={theme.colors.success} height={6} />
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {sessionsTarget
              ? `${week.completed} of ${count(sessionsTarget, "session")} done this week`
              : nextSession
                ? `Your first session is ${dayLabel(nextSession, now)}`
                : "No sessions planned this week"}
          </Text>
        </View>
      </Appear>

      {/* On a rest day there is no list to title: the empty state below speaks for itself. */}
      {workout ? (
        <Appear delay={240}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: theme.spacing.sm,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Exercises
            </Text>
            <CountUp
              value={todaysSets.length}
              format={(n) => `${count(Math.round(n), "set")} logged`}
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            />
          </View>
        </Appear>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
      {workout ? (
        <>
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              backgroundColor: theme.colors.surface,
              borderColor: tone.interpolate({
                inputRange: [0, 1],
                outputRange: [theme.colors.border, theme.colors.success],
              }),
            }}
          >
            <Ionicons
              name={completed ? "lock-closed" : "lock-closed-outline"}
              size={16}
              color={completed ? theme.colors.success : theme.colors.textMuted}
            />
            <Animated.Text
              style={{
                flex: 1,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
                color: tone.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.colors.textMuted, theme.colors.success],
                }),
              }}
            >
              {completed
                ? "Shared: completed. Your sets are locked and stay private."
                : "Set details stay on your device. Your partner only sees completion."}
            </Animated.Text>
            {completed ? (
              <View style={{ width: 32, height: 32, overflow: "hidden" }}>
                <Lottie name="success" size={32} />
              </View>
            ) : null}
          </Animated.View>

          <View
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (width !== buttonSize.w || height !== buttonSize.h)
                setButtonSize({ w: width, h: height });
            }}
          >
            <PressScale
              onPress={completeWorkout}
              disabled={completed}
              haptic="heavy"
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={completed ? "Workout complete" : "Mark workout complete"}
              accessibilityState={{ disabled: completed }}
              style={{
                minHeight: 56,
                borderRadius: theme.radius.pill,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                backgroundColor: completed ? theme.colors.surfaceAlt : theme.colors.primary,
                borderWidth: 1,
                borderColor: completed ? theme.colors.border : theme.colors.primary,
              }}
            >
              <Ionicons
                name={completed ? "checkmark-done" : "checkmark"}
                size={22}
                color={completed ? theme.colors.success : theme.colors.onPrimary}
              />
              <Text
                style={{
                  color: completed ? theme.colors.text : theme.colors.onPrimary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {completed ? "Workout complete" : "Mark workout complete"}
              </Text>
            </PressScale>
            {buttonSize.w > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  opacity: traceOpacity,
                }}
              >
                <Svg width={buttonSize.w} height={buttonSize.h}>
                  <AnimatedRect
                    x={2}
                    y={2}
                    width={buttonSize.w - 4}
                    height={buttonSize.h - 4}
                    rx={(buttonSize.h - 4) / 2}
                    ry={(buttonSize.h - 4) / 2}
                    fill="none"
                    stroke={theme.colors.primary}
                    strokeWidth={4}
                    strokeDasharray={`${perimeter} ${perimeter}`}
                    strokeDashoffset={dashOffset}
                  />
                </Svg>
              </Animated.View>
            ) : null}
          </View>

          {completed ? (
            <Pressable
              onPress={reopenWorkout}
              accessibilityRole="button"
              accessibilityLabel="Reopen workout"
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
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Reopen workout
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : template ? (
        <EmptyState
          icon="moon-outline"
          title="Nothing planned today"
          body={
            nextSession
              ? `Your next session is ${dayLabel(nextSession, now)}. My Plan has the whole week.`
              : "My Plan has the whole week."
          }
          actionLabel="Open My Plan"
          onAction={() => router.navigate("/plan")}
        />
      ) : (
        // Setup was skipped: three questions build the plan, and the answers given so far are kept.
        <EmptyState
          icon="barbell-outline"
          title="Build your lifting week"
          body="Answer three questions (your goal, your training days and your equipment) and your plan for this week is laid out."
          actionLabel="Set up my plan"
          onAction={() => void resetOnboarding()}
        />
      )}

      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: theme.colors.danger,
            fontSize: theme.font.size.caption,
            textAlign: "center",
          }}
        >
          {notice}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={session}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const logged = loggedFor(item.id);
          return (
            <Appear delay={Math.min(index, 8) * 50}>
              <View style={{ marginBottom: theme.spacing.md }}>
                <ExerciseCard
                  exercise={item}
                  logged={logged}
                  target={TARGET_SETS}
                  active={activeId === item.id}
                  locked={completed}
                  targetReps={repsFor(planGoal)}
                  draft={draftFor(item.id)}
                  onSelect={() => setPicked(item.id)}
                  onStep={(field, delta) => step(item.id, field, delta)}
                  onLog={() => logSet(item)}
                  onUndo={() => undoSet(item)}
                />
              </View>
            </Appear>
          );
        }}
      />
      <Celebrate trigger={celebration} />
    </View>
  );
}
