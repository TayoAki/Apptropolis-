import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Rect } from "react-native-svg";
import { AiImage } from "../../components/AiImage";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { ExerciseCard, type Draft } from "../../components/index/ExerciseCard";
import { Celebrate, Lottie } from "../../components/lottie";
import {
  Appear,
  CountUp,
  GrowBar,
  Mascot,
  PressScale,
  Pulse,
  Skeleton,
  SkeletonList,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { track } from "../../data/analytics";
import { appInfo } from "../../data/app-info";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import {
  count,
  dayKey,
  formatTime,
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

const TARGET_SETS = 3;
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
  const { answers } = useAppState();
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

  const now = new Date();
  const today = dayKey(now);
  const workouts = workoutsStore.items;
  const sets = setsStore.items;
  const updates = updatesStore.items;
  const loading =
    workoutsStore.loading || setsStore.loading || exercisesStore.loading || updatesStore.loading;

  const workout = todaysWorkout(workouts, now);
  const completed = Boolean(workout?.completed);
  const week = weekStats(workouts, now);
  const sessionsTarget = Math.max(1, Number(answers.daysperweek) || week.planned);

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
    const last = lastOf(loggedFor(id)) ?? lastOf(sets.filter((s) => s.exercise === id));
    return { weight: last?.weight ?? 0, reps: last?.reps ?? 8 };
  };
  const isDone = (id: string) => loggedFor(id).length >= TARGET_SETS;
  const firstOpen = session.find((e) => !isDone(e.id));
  const activeId = completed
    ? null
    : picked && session.some((e) => e.id === picked) && !isDone(picked)
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
      if (setNumber === TARGET_SETS) haptic("success");
      setNotice(null);
    } catch {
      setNotice("That set didn't save. Try logging it again.");
    }
  }

  async function completeWorkout() {
    if (!workout || completed) return;
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
      setNotice("Couldn't save the workout. Check your connection and try again.");
    }
  }

  async function reopenWorkout() {
    if (!workout) return;
    haptic("selection");
    try {
      await workoutsStore.update(workout.id, { completed: false, completedAt: null });
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
            paddingBottom: insets.bottom + theme.spacing.xl,
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

  const dateLabel = `${WEEKDAY_NAMES[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`.toUpperCase();
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
    <View style={{ paddingTop: insets.top + theme.spacing.md, gap: theme.spacing.lg }}>
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
              color: theme.colors.primary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              letterSpacing: 1.2,
            }}
          >
            {dateLabel}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 1.2,
              }}
            >
              {appInfo.name.toUpperCase()}
            </Text>
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
                <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
              </Pressable>
            </Link>
          </View>
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
              {workout ? workout.title : "Rest day"}
            </Text>
            {answers.goal ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {`Goal: ${answers.goal}`}
              </Text>
            ) : null}
          </View>
          <Mascot
            pose={completed ? "rocco-fist-bump-spotter" : "rocco-neutral-ready"}
            size={96}
          />
        </View>
      </Appear>

      <Appear delay={120}>
        <Card
          label={partnerDone ? "Your partner finished today" : "Your partner hasn't finished today"}
          style={{ gap: theme.spacing.md }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <View>
              <AiImage
                prompt="close-up portrait of a friendly smiling person in a gym t-shirt, plain studio background"
                style={{ width: 52, height: 52, borderRadius: 26 }}
              />
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
                Your partner
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
                <Lottie name="heart" size={40} />
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, flex: 1 }}>
                  Cheer sent. They'll see it on their side.
                </Text>
              </View>
            ) : (
              <Button label="Cheer" icon="flame" onPress={cheer} />
            )
          ) : null}
        </Card>
      </Appear>

      <Appear delay={180}>
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1.2,
                }}
              >
                ACCOUNTABILITY
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>Team:</Text>
              <CountUp
                value={week.percent}
                format={(n) => `${Math.round(n)}%`}
                style={{
                  color: week.percent >= 70 ? theme.colors.success : theme.colors.warning,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", marginTop: theme.spacing.sm }}>
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
            {`${week.completed} of ${count(sessionsTarget, "session")} done this week`}
          </Text>
        </View>
      </Appear>

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
            format={(n) => `${Math.round(n)} sets logged`}
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
            }}
          />
        </View>
      </Appear>
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
                ? "Shared: Completed (Sets Locked & Private)"
                : "Set details stay on your device. Your partner only sees completion."}
            </Animated.Text>
            {completed ? <Lottie name="success" size={32} /> : null}
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
                minHeight: 64,
                borderRadius: theme.radius.md,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                backgroundColor: completed ? theme.colors.surfaceAlt : theme.colors.primary,
                borderWidth: completed ? 1 : 0,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.primary,
                shadowOpacity: completed ? 0 : 0.45,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: completed ? 0 : 6,
              }}
            >
              <Ionicons
                name={completed ? "checkmark-done" : "lock-closed"}
                size={22}
                color={completed ? theme.colors.success : theme.colors.onPrimary}
              />
              <Text
                style={{
                  color: completed ? theme.colors.text : theme.colors.onPrimary,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {completed ? "Workout complete" : "Mark Workout Complete"}
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
                    rx={theme.radius.md}
                    ry={theme.radius.md}
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
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="Nothing planned today"
          body="Your plan schedules each training day from your answers. Open My Plan to build this week, or enjoy a rest day."
          actionLabel="Open My Plan"
          onAction={() => router.push("/plan")}
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
          paddingBottom: insets.bottom + theme.spacing.xl,
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
                  draft={draftFor(item.id)}
                  onSelect={() => setPicked(item.id)}
                  onStep={(field, delta) => step(item.id, field, delta)}
                  onLog={() => logSet(item)}
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
