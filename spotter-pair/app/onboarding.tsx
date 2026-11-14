import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Celebrate, Lottie } from "../components/lottie";
import {
  Appear,
  GrowBar,
  Mascot,
  PressScale,
  Skeleton,
  Stagger,
  StepTransition,
  haptic,
  useReducedMotion,
} from "../components/motion";
import {
  LogChip,
  OptionRow,
  PreviewCard,
  PrivacyFooter,
  ProgressBadge,
  StepSegments,
} from "../components/onboarding/Parts";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import { formatClock, type Exercise } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ReminderState = "idle" | "working" | "on" | "declined";

const STEP_COUNT = 4;
const MASCOT = 88;
const GOALS = [
  "Build raw strength",
  "Lose fat & lean out",
  "Stay consistent",
  "Athletic conditioning",
];
const DAYS = [
  { value: "2 days", detail: "A solid base you can keep up in a busy week" },
  { value: "3 days", detail: "Full-body sessions with a rest day between" },
  { value: "4 days", detail: "Upper and lower splits, each trained twice" },
  { value: "5 days", detail: "A dedicated session for each muscle group" },
];
const TIMES = [
  { hour: 6, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
];
const DEMO_TITLE = "Bench Press (Barbell)";
const DEMO_EXERCISE = "bench-press";
const DEMO_SUBTITLE = "3 Sets, Target 8–10 reps";
const DEMO_SETS = 3;
const DEMO_TARGET = "8–10";
const DEMO_LOG_REPS = 8;
const START_WEIGHT = 135;
const WEIGHT_STEP = 5;
const REMINDER = {
  title: "Time to train",
  body: "Your session is ready. Log your first set and keep your partner in the loop.",
};

/** Mascot that slides in from the right, then flexes when a choice is made. */
function PeekMascot({ chosen }: { chosen: boolean }) {
  const reduced = useReducedMotion();
  const slide = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const flex = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const run = Animated.spring(slide, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10,
      bounciness: 8,
    });
    run.start();
    return () => run.stop();
  }, [reduced, slide]);

  useEffect(() => {
    if (!chosen || reduced) return;
    const run = Animated.sequence([
      Animated.spring(flex, { toValue: 1.14, useNativeDriver: true, speed: 20, bounciness: 14 }),
      Animated.spring(flex, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]);
    run.start();
    return () => run.stop();
  }, [chosen, reduced, flex]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [72, 0] }) },
          { scale: flex },
        ],
      }}
    >
      <Mascot pose={chosen ? "rocco-fist-bump-spotter" : "rocco-neutral-ready"} size={MASCOT} />
    </Animated.View>
  );
}

/**
 * A step's heading. The mascot sits at the top right, beside the first headline line; a second
 * headline line runs full width underneath it.
 */
function Heading({
  eyebrow,
  title,
  second,
  body,
  mascot,
}: {
  eyebrow: string;
  title: string;
  second?: string;
  body: string;
  mascot?: ReactNode;
}) {
  const theme = useTheme();
  // A touch under the theme's headline size so the first line clears the mascot.
  const headlineSize = theme.font.size.headline - 2;
  return (
    <View
      style={{
        gap: theme.spacing.sm,
        paddingTop: mascot ? theme.spacing.xl + theme.spacing.lg : 0,
      }}
    >
      {mascot ? (
        <View style={{ position: "absolute", top: theme.spacing.xs, right: 0 }}>{mascot}</View>
      ) : null}
      <Text
        style={{
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.medium,
          color: theme.colors.textMuted,
        }}
      >
        {eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: headlineSize,
          fontWeight: theme.font.weight.bold,
          lineHeight: 34,
          letterSpacing: -0.5,
          color: theme.colors.text,
          paddingRight: mascot && !second ? MASCOT + theme.spacing.sm : 0,
        }}
      >
        {second ? `${title}\n${second}` : title}
      </Text>
      <Text
        style={{
          fontSize: theme.font.size.body,
          lineHeight: 24,
          color: theme.colors.textMuted,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

/** A round +/- control for the weight, at least 44pt. */
function Stepper({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Ionicons name={icon} size={22} color={theme.colors.text} />
    </PressScale>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { ready, answers, setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();
  const exercises = useCollection<Exercise>("exercises");
  const demo = exercises.items.find((exercise) => exercise.id === DEMO_EXERCISE);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [goal, setGoal] = useState<string>(GOALS[0]!);
  const [days, setDays] = useState<string | null>(null);
  const [weight, setWeight] = useState(START_WEIGHT);
  const [loggedWeights, setLoggedWeights] = useState<number[]>([]);
  const [timeIndex, setTimeIndex] = useState(2);
  const [reminderState, setReminderState] = useState<ReminderState>("idle");
  const bump = useRef(new Animated.Value(1)).current;

  // Answers saved on an earlier launch take over the defaults once they've loaded.
  useEffect(() => {
    if (ready && answers.goal) setGoal(answers.goal);
  }, [ready, answers.goal]);
  useEffect(() => {
    if (ready && answers.daysperweek) setDays(answers.daysperweek);
  }, [ready, answers.daysperweek]);

  const last = STEP_COUNT - 1;
  const complete = loggedWeights.length >= DEMO_SETS;
  const time = TIMES[timeIndex]!;
  const reminderDone = reminderState === "on" || reminderState === "declined";

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
          paddingTop: insets.top + theme.spacing.xl,
          backgroundColor: theme.colors.background,
        }}
      >
        <Skeleton width="40%" height={28} />
        <Skeleton height={44} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    );
  }

  function go(delta: 1 | -1) {
    setDirection(delta);
    setStep((current) => Math.min(last, Math.max(0, current + delta)));
  }

  function finish() {
    void completeOnboarding();
  }

  function pickGoal(option: string) {
    haptic("selection");
    setGoal(option);
    void setAnswer("goal", option);
  }

  function pickDays(option: string) {
    haptic("selection");
    setDays(option);
    void setAnswer("daysperweek", option);
  }

  function bumpWeight(delta: number) {
    haptic("heavy");
    setWeight((current) => Math.max(0, current + delta));
    if (!reduced) {
      bump.setValue(1.12);
      Animated.spring(bump, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 12,
      }).start();
    }
  }

  function logSet() {
    if (complete) return;
    haptic("success");
    setLoggedWeights((list) => [...list, weight]);
  }

  const logLabel = complete
    ? "All sets logged"
    : loggedWeights.length === 0
      ? "Log First Set"
      : "Log next set";

  function pickTime(index: number) {
    haptic("selection");
    setTimeIndex(index);
    if (reminderState === "on") {
      const next = TIMES[index]!;
      void reminder.setTime(next.hour, next.minute);
    }
  }

  async function turnOnReminders() {
    setReminderState("working");
    let ok = false;
    try {
      ok = await reminder.enable({
        title: REMINDER.title,
        body: REMINDER.body,
        hour: time.hour,
        minute: time.minute,
      });
    } catch {
      ok = false;
    }
    if (ok) haptic("success");
    setReminderState(ok ? "on" : "declined");
  }

  const action: {
    label: string;
    icon?: IconName;
    onPress: () => void;
    disabled: boolean;
  } =
    step === 3
      ? reminderDone
        ? { label: "Start my plan", icon: "arrow-forward", onPress: finish, disabled: false }
        : {
            label: "Turn on reminders",
            icon: "notifications-outline",
            onPress: () => void turnOnReminders(),
            disabled: reminderState === "working",
          }
      : {
          label: "Continue",
          onPress: () => {
            if (step === 0) void setAnswer("goal", goal);
            go(1);
          },
          disabled: step === 1 && !days,
        };

  let content: ReactNode;

  if (step === 0) {
    content = (
      <>
        <Heading
          eyebrow="Welcome"
          title="Train for yourself."
          second="Show up for each other."
          body="Spotter Pair writes your custom lifting split while keeping your actual weights 100% private. Your partner only sees if you showed up."
          mascot={<Mascot pose="rocco-neutral-ready" size={MASCOT} />}
        />
        <View style={{ gap: theme.spacing.md }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              color: theme.colors.text,
            }}
          >
            What is your primary training goal?
          </Text>
          <Stagger step={70} style={{ gap: theme.spacing.md }}>
            {GOALS.map((option) => (
              <OptionRow
                key={option}
                label={option}
                selected={goal === option}
                onPress={() => pickGoal(option)}
              />
            ))}
          </Stagger>
        </View>
        <Appear delay={260}>
          {exercises.loading ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}
            >
              <Skeleton width="70%" height={22} />
              <Skeleton width="45%" height={14} />
              <Skeleton width="100%" height={44} radius={theme.radius.pill} />
            </View>
          ) : (
            <PreviewCard
              title={DEMO_TITLE}
              subtitle={DEMO_SUBTITLE}
              logged={loggedWeights.length}
              total={DEMO_SETS}
              complete={complete}
              actionLabel={logLabel}
              onLog={logSet}
            />
          )}
        </Appear>
      </>
    );
  } else if (step === 1) {
    content = (
      <>
        <Heading
          eyebrow="Your week"
          title="How many days a week?"
          body="Pick what you can really keep up. Your partner counts on the days you commit to, not the ones you hope for."
          mascot={<PeekMascot chosen={days !== null} />}
        />
        <Stagger step={70} style={{ gap: theme.spacing.md }}>
          {DAYS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.value}
              detail={option.detail}
              selected={days === option.value}
              onPress={() => pickDays(option.value)}
            />
          ))}
        </Stagger>
      </>
    );
  } else if (step === 2) {
    content = (
      <>
        <Heading
          eyebrow="Practice"
          title="Log your first set"
          body="Try one set of bench press. Each set you log counts toward today's workout, and finished workouts count toward your week."
        />
        <Appear delay={120}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
            }}
          >
            <View style={{ gap: theme.spacing.xs }}>
              {exercises.loading ? (
                <>
                  <Skeleton width="70%" height={24} />
                  <Skeleton width="45%" height={14} />
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: theme.font.size.title,
                      fontWeight: theme.font.weight.bold,
                      color: theme.colors.text,
                    }}
                  >
                    {DEMO_TITLE}
                  </Text>
                  <Text style={{ fontSize: theme.font.size.body, color: theme.colors.textMuted }}>
                    {DEMO_SUBTITLE}
                  </Text>
                  {demo?.cue ? (
                    <Text
                      style={{ fontSize: theme.font.size.caption, color: theme.colors.textMuted }}
                    >
                      {demo.cue}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: theme.spacing.sm,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.medium,
                    color: theme.colors.textMuted,
                  }}
                >
                  Weight per set
                </Text>
                <Animated.View style={{ transform: [{ scale: bump }] }}>
                  <Text
                    style={{
                      fontSize: theme.font.size.headline,
                      fontWeight: theme.font.weight.bold,
                      fontVariant: ["tabular-nums"],
                      color: theme.colors.text,
                    }}
                  >
                    {`${weight} lb`}
                  </Text>
                </Animated.View>
              </View>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Stepper
                  icon="remove"
                  label={`Lighter by ${WEIGHT_STEP} pounds`}
                  onPress={() => bumpWeight(-WEIGHT_STEP)}
                />
                <Stepper
                  icon="add"
                  label={`Heavier by ${WEIGHT_STEP} pounds`}
                  onPress={() => bumpWeight(WEIGHT_STEP)}
                />
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              {Array.from({ length: DEMO_SETS }, (_, i) => {
                const done = i < loggedWeights.length;
                return (
                  <View
                    key={i}
                    style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
                  >
                    <Ionicons
                      name={done ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={done ? theme.colors.success : theme.colors.textMuted}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: theme.font.size.body,
                        fontVariant: ["tabular-nums"],
                        color: done ? theme.colors.text : theme.colors.textMuted,
                      }}
                    >
                      {done
                        ? `Set ${i + 1} · ${loggedWeights[i]} lb × ${DEMO_LOG_REPS}`
                        : `Set ${i + 1} · target ${DEMO_TARGET} reps`}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <GrowBar progress={loggedWeights.length / DEMO_SETS} height={10} />
                <Text style={{ fontSize: theme.font.size.caption, color: theme.colors.textMuted }}>
                  {complete
                    ? "Workout complete. It counts toward your week."
                    : "Finish all sets to count this workout toward your week."}
                </Text>
              </View>
              {loggedWeights.length > 0 ? (
                <Lottie key={loggedWeights.length} name="success" size={48} />
              ) : null}
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <LogChip label={logLabel} complete={complete} onPress={logSet} />
              <ProgressBadge logged={loggedWeights.length} total={DEMO_SETS} complete={complete} />
            </View>

            <PrivacyFooter>Your privacy · weights stay yours</PrivacyFooter>
          </View>
        </Appear>
      </>
    );
  } else {
    content = (
      <>
        <Heading
          eyebrow="Reminders"
          title="A nudge on workout days"
          body="Pick a time and we'll send one reminder a day so you don't let your partner down. You can change it in Settings."
          mascot={
            <Mascot
              pose={reminderState === "on" ? "rocco-fist-bump-spotter" : "rocco-vault-guardian"}
              size={MASCOT}
            />
          }
        />
        <Appear delay={100}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: theme.spacing.md,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.lg,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Text
                style={{
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                  color: theme.colors.text,
                }}
              >
                One reminder a day
              </Text>
              <Text
                style={{
                  fontSize: theme.font.size.caption,
                  lineHeight: 20,
                  color: theme.colors.textMuted,
                }}
              >
                At the time you pick, once a day. It never mentions your weights.
              </Text>
            </View>
          </View>
        </Appear>
        <View style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              color: theme.colors.text,
            }}
          >
            Remind me at
          </Text>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}
          >
            {TIMES.map((slot, i) => {
              const on = i === timeIndex;
              return (
                <Pressable
                  key={`${slot.hour}-${slot.minute}`}
                  onPress={() => pickTime(i)}
                  accessibilityRole="radio"
                  accessibilityLabel={formatClock(slot.hour, slot.minute)}
                  accessibilityState={{ selected: on }}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                    backgroundColor: on ? theme.colors.primary : theme.colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                      fontVariant: ["tabular-nums"],
                      color: on ? theme.colors.onPrimary : theme.colors.text,
                    }}
                  >
                    {formatClock(slot.hour, slot.minute)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {reminderState === "on" ? (
          <Appear style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Lottie name="success" size={56} />
            <Text style={{ flex: 1, fontSize: theme.font.size.body, color: theme.colors.text }}>
              {`Reminder set for ${formatClock(time.hour, time.minute)}. Change it any time in Settings.`}
            </Text>
          </Appear>
        ) : reminderState === "declined" ? (
          <Appear>
            <Text
              style={{
                fontSize: theme.font.size.body,
                lineHeight: 24,
                color: theme.colors.textMuted,
              }}
            >
              Notifications are off for Spotter Pair. Allow them in your phone's Settings to get
              reminders. Your plan works without them.
            </Text>
          </Appear>
        ) : null}
      </>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <Stack.Screen options={{ title: "Welcome" }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.sm,
        }}
      >
        <StepSegments count={STEP_COUNT} index={step} />
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={12}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text
            style={{
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
              color: theme.colors.textMuted,
            }}
          >
            Skip
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <StepTransition step={step} direction={direction} style={{ gap: theme.spacing.xl }}>
          {content}
        </StepTransition>
      </ScrollView>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          {step > 0 ? (
            <PressScale
              onPress={() => go(-1)}
              scaleTo={0.92}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{
                width: 56,
                height: 56,
                borderRadius: theme.radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </PressScale>
          ) : null}
          {/* The wrapper stretches so the button fills the footer's width. */}
          <View style={{ flex: 1 }}>
            <PressScale
              onPress={action.onPress}
              disabled={action.disabled}
              scaleTo={0.97}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: action.disabled }}
              style={{
                minHeight: 56,
                borderRadius: theme.radius.md,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.primary,
                opacity: action.disabled ? 0.5 : 1,
              }}
            >
              {action.icon ? (
                <Ionicons name={action.icon} size={20} color={theme.colors.onPrimary} />
              ) : null}
              <Text
                style={{
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  color: theme.colors.onPrimary,
                }}
              >
                {action.label}
              </Text>
            </PressScale>
          </View>
        </View>
        {step === 3 && reminderState === "idle" ? (
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Not now, start my plan without reminders"
            hitSlop={12}
            style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: theme.font.size.body, color: theme.colors.textMuted }}>
              Not now
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Celebrate trigger={complete} />
    </View>
  );
}
