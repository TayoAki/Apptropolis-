// Plan setup: three questions (goal, training days, equipment), then the plan they produce.
// Every answer is saved as it is given and the step is saved too, so leaving the app and coming
// back resumes here. Nothing is asked that the plan doesn't use, and the plan on the last screen
// is the real one: it is built on the phone from the three answers, with no waiting screen.
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lottie } from "../components/lottie";
import {
  Appear,
  PressScale,
  Skeleton,
  Stagger,
  StepTransition,
  haptic,
  useReducedMotion,
} from "../components/motion";
import { DayToggles, OptionRow, PlanPreview, StepSegments } from "../components/onboarding/Parts";
import { Rocco } from "../components/Rocco";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import {
  EQUIPMENT_INFO,
  EQUIPMENT_OPTIONS,
  GOAL_INFO,
  MAX_TRAINING_DAYS,
  MIN_TRAINING_DAYS,
  SETS_PER_EXERCISE,
  buildPlan,
  nextSessionDate,
  parseTrainingDays,
  repsFor,
  splitAbout,
  trainingDaysLabel,
  type EquipmentChoice,
  type Goal,
} from "../data/plan";
import { usePlanner } from "../data/planner";
import { useReminder } from "../data/reminders";
import { GOAL_OPTIONS, count, dayLabel, formatClock } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ReminderState = "idle" | "working" | "on" | "declined";

/** The questions, then the result. The names are the ones the step events carry. */
const STEPS = ["goal", "days", "equipment", "plan"] as const;
const QUESTIONS = 3;
const PLAN_STEP = 3;
const MASCOT = 88;
const TIMES = [
  { hour: 6, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
];
const REMINDER = {
  title: "Time to train",
  body: "Open Spotter Pair for today's session and log your sets.",
};

function asGoal(value: string | undefined): Goal | null {
  return (GOAL_OPTIONS as readonly string[]).includes(value ?? "") ? (value as Goal) : null;
}

function asEquipment(value: string | undefined): EquipmentChoice | null {
  return (EQUIPMENT_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as EquipmentChoice)
    : null;
}

function validDays(days: number[]): boolean {
  return days.length >= MIN_TRAINING_DAYS && days.length <= MAX_TRAINING_DAYS;
}

/** The step to open on: the saved one, but never past a question that still has no answer. */
function resumeStep(answers: Record<string, string>): number {
  const saved = parseInt(answers.onboarding_step ?? "", 10);
  const reachable = !asGoal(answers.goal)
    ? 0
    : !validDays(parseTrainingDays(answers.training_days))
      ? 1
      : !asEquipment(answers.equipment)
        ? 2
        : PLAN_STEP;
  return Math.max(0, Math.min(Number.isFinite(saved) ? saved : 0, reachable));
}

/** Mascot that slides in from the right, then flexes when a choice is made. */
function PeekMascot({ chosen }: { chosen: boolean }) {
  const reduced = useReducedMotion();
  const slide = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const flex = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      // Reduce Motion can report after the first render: land in place instead of staying off-screen.
      slide.setValue(1);
      return;
    }
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
      <Rocco pose={chosen ? "rocco-fist-bump-spotter" : "rocco-neutral-ready"} size={MASCOT} />
    </Animated.View>
  );
}

/**
 * A step's heading. The mascot stands at the top right and the headline sits on the same ground
 * line to its left; a second headline line runs full width underneath.
 */
function Heading({
  title,
  second,
  body,
  mascot,
}: {
  title: string;
  second?: string;
  body: string;
  mascot?: ReactNode;
}) {
  const theme = useTheme();
  const headline = {
    fontSize: theme.font.size.headline,
    fontWeight: theme.font.weight.bold,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: theme.colors.text,
  } as const;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={second ? `${title} ${second}` : title}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: theme.spacing.sm }}>
          <Text style={[headline, { flex: 1 }]}>{title}</Text>
          {mascot}
        </View>
        {second ? <Text style={headline}>{second}</Text> : null}
      </View>
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

/** A question with the line that says what its answer is used for. */
function Question({ title, use }: { title: string; use: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
          color: theme.colors.text,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: theme.font.size.caption, color: theme.colors.textMuted }}>
        {use}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready } = useAppState();
  // The saved step is read once the saved answers have loaded, so the flow opens where it was left.
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
  return <Setup />;
}

function Setup() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const planner = usePlanner();
  const reminder = useReminder();

  const [step, setStep] = useState(() => resumeStep(answers));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [dayNote, setDayNote] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState(2);
  const [reminderState, setReminderState] = useState<ReminderState>("idle");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reportedSuccess = useRef(false);

  const goal = asGoal(answers.goal);
  const days = useMemo(() => parseTrainingDays(answers.training_days), [answers.training_days]);
  const equipment = asEquipment(answers.equipment);
  const time = TIMES[timeIndex]!;

  // The plan on the last step: the real one, built from the three answers as soon as they exist.
  const plan = useMemo(
    () =>
      goal && equipment && validDays(days)
        ? buildPlan({ goal, days, equipment, catalog: planner.catalog })
        : null,
    [goal, days, equipment, planner.catalog],
  );
  const names = useMemo(
    () => new Map(planner.catalog.map((e) => [e.id, e.name] as const)),
    [planner.catalog],
  );

  // The first success: the person's own plan is on screen.
  useEffect(() => {
    if (step !== PLAN_STEP || !plan || reportedSuccess.current) return;
    reportedSuccess.current = true;
    track("first_success", { kind: "plan_built", days: plan.days.length });
  }, [step, plan]);

  function go(delta: 1 | -1) {
    const next = Math.max(0, Math.min(PLAN_STEP, step + delta));
    setDirection(delta);
    setStep(next);
    setSaveError(null);
    void setAnswer("onboarding_step", String(next));
  }

  function next() {
    track("onboarding_step_completed", { step: STEPS[step]! });
    go(1);
  }

  function pickGoal(option: Goal) {
    haptic("selection");
    void setAnswer("goal", option);
  }

  function toggleDay(weekday: number) {
    const on = days.includes(weekday);
    if (!on && days.length >= MAX_TRAINING_DAYS) {
      haptic("warning");
      setDayNote("Five training days is the most. Rest days are part of the plan.");
      return;
    }
    haptic("selection");
    setDayNote(null);
    const chosen = on ? days.filter((d) => d !== weekday) : [...days, weekday];
    void setAnswer("training_days", chosen.sort((a, b) => a - b).join(","));
  }

  function pickEquipment(option: EquipmentChoice) {
    haptic("selection");
    void setAnswer("equipment", option);
  }

  /** Leave setup without a plan. Today and My Plan both offer the way back in. */
  function skip() {
    void completeOnboarding();
  }

  /** Saves the plan on screen, lays out this week, and opens the app. */
  async function start() {
    if (!plan || !goal || !equipment || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await planner.build({ goal, days, equipment, variant: 0 });
      if (!saved) throw new Error("no plan");
      track("onboarding_step_completed", { step: "plan" });
      await setAnswer("onboarding_step", "0");
      await completeOnboarding();
    } catch {
      setSaving(false);
      setSaveError("Your plan didn't save. Your answers are kept: try again.");
    }
  }

  function pickTime(index: number) {
    haptic("selection");
    setTimeIndex(index);
    if (reminderState === "on") {
      const slot = TIMES[index]!;
      void reminder.setTime(slot.hour, slot.minute);
    }
  }

  async function turnOnReminder() {
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

  const dayHint = !validDays(days)
    ? `Pick at least ${MIN_TRAINING_DAYS} days.`
    : `${count(days.length, "day")} a week: ${splitAbout(days.length)}. Your scorecard counts ${count(days.length, "session")} a week.`;

  const action: { label: string; icon?: IconName; onPress: () => void; disabled: boolean } =
    step === PLAN_STEP
      ? {
          label: saving ? "Saving your plan…" : "Start training",
          icon: saving ? undefined : "arrow-forward",
          onPress: () => void start(),
          disabled: saving || !plan,
        }
      : {
          label: "Continue",
          onPress: next,
          disabled: step === 0 ? !goal : step === 1 ? !validDays(days) : !equipment,
        };
  const actionInk = action.disabled ? theme.colors.textMuted : theme.colors.onPrimary;

  let content: ReactNode;

  if (step === 0) {
    content = (
      <>
        <Heading
          title="Your lifting week,"
          second="built from three answers."
          body="Pick a goal, your training days and your equipment. You get this week's plan with every lift chosen, and a scorecard that shows a partner whether you trained, never your weights."
          mascot={<Rocco pose="rocco-neutral-ready" size={MASCOT} />}
        />
        <View style={{ gap: theme.spacing.md }}>
          <Question
            title="What are you training for?"
            use="Your goal sets the reps for each set and which lifts come first."
          />
          <Stagger step={70} style={{ gap: theme.spacing.md }}>
            {GOAL_OPTIONS.map((option) => (
              <OptionRow
                key={option}
                label={option}
                detail={GOAL_INFO[option].summary}
                selected={goal === option}
                onPress={() => pickGoal(option)}
              />
            ))}
          </Stagger>
        </View>
      </>
    );
  } else if (step === 1) {
    content = (
      <>
        <Heading
          title="Which days will you train?"
          body="Pick two to five days you can really keep. The number you pick is your weekly target, and your sessions land on these days."
          mascot={<PeekMascot chosen={validDays(days)} />}
        />
        <View style={{ gap: theme.spacing.md }}>
          <DayToggles selected={days} onToggle={toggleDay} />
          <Text
            accessibilityLiveRegion="polite"
            style={{
              fontSize: theme.font.size.body,
              lineHeight: 22,
              color: dayNote ? theme.colors.text : theme.colors.textMuted,
            }}
          >
            {dayNote ?? dayHint}
          </Text>
        </View>
      </>
    );
  } else if (step === 2) {
    content = (
      <>
        <Heading
          title="What can you train with?"
          body="Only lifts you can do with this go into your plan."
          mascot={<Rocco pose="rocco-vault-guardian" size={MASCOT} />}
        />
        <Stagger step={70} style={{ gap: theme.spacing.md }}>
          {EQUIPMENT_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              detail={EQUIPMENT_INFO[option].summary}
              selected={equipment === option}
              onPress={() => pickEquipment(option)}
            />
          ))}
        </Stagger>
      </>
    );
  } else {
    const first = plan ? nextSessionDate(plan, new Date()) : null;
    content = (
      <>
        <Heading
          title="Your week is built"
          body={
            goal && equipment
              ? `From your answers: ${goal}, ${trainingDaysLabel(days)}, ${equipment}. Go back to change any of them.`
              : "Go back and finish the three questions to see your plan."
          }
          mascot={<Rocco pose="rocco-fist-bump-spotter" size={MASCOT} />}
        />
        {planner.loading ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton height={72} radius={theme.radius.lg} />
            <Skeleton height={72} radius={theme.radius.lg} />
            <Skeleton height={72} radius={theme.radius.lg} />
          </View>
        ) : plan ? (
          <Appear>
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ gap: theme.spacing.xs }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                    color: theme.colors.text,
                  }}
                >
                  {plan.split}
                </Text>
                <Text style={{ fontSize: theme.font.size.body, color: theme.colors.textMuted }}>
                  {`${SETS_PER_EXERCISE} sets of ${repsFor(goal ?? undefined)} on every lift.${
                    first ? ` First session: ${dayLabel(first)}.` : ""
                  }`}
                </Text>
              </View>
              <PlanPreview days={plan.days} names={names} />
            </View>
          </Appear>
        ) : (
          <Text style={{ fontSize: theme.font.size.body, color: theme.colors.danger }}>
            The plan couldn't be built from these answers. Go back and check your training days.
          </Text>
        )}

        {/* The one optional part: a daily reminder, asked with its reason and easy to leave off. */}
        <View
          style={{
            gap: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.colors.primary}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Text
                style={{
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                  color: theme.colors.text,
                }}
              >
                A daily nudge (optional)
              </Text>
              <Text
                style={{
                  fontSize: theme.font.size.caption,
                  lineHeight: 20,
                  color: theme.colors.textMuted,
                }}
              >
                One reminder a day at the time you pick, so a session doesn't slip by. It never
                mentions your weights, and you can turn it off in Settings.
              </Text>
            </View>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Reminder time"
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
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                    backgroundColor: on ? theme.colors.primary : theme.colors.surfaceAlt,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {on ? (
                    <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
                  ) : null}
                  <Text
                    style={{
                      fontSize: theme.font.size.body,
                      fontWeight: on ? theme.font.weight.bold : theme.font.weight.medium,
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
          {reminderState === "on" ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
            >
              <View style={{ width: 40, height: 40, overflow: "hidden" }}>
                <Lottie name="success" size={40} />
              </View>
              <Text style={{ flex: 1, fontSize: theme.font.size.body, color: theme.colors.text }}>
                {`Nudge set for ${formatClock(time.hour, time.minute)} every day.`}
              </Text>
            </View>
          ) : (
            <>
              {/* The wrapper stretches so the button fills the card. */}
              <View>
                <PressScale
                  onPress={() => void turnOnReminder()}
                  disabled={reminderState === "working"}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={`Turn on the nudge at ${formatClock(time.hour, time.minute)}`}
                  accessibilityState={{ disabled: reminderState === "working" }}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.radius.pill,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceAlt,
                  }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={
                      reminderState === "working" ? theme.colors.textMuted : theme.colors.primary
                    }
                  />
                  <Text
                    style={{
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                      color:
                        reminderState === "working" ? theme.colors.textMuted : theme.colors.text,
                    }}
                  >
                    {reminderState === "working" ? "Asking your phone…" : "Turn on the nudge"}
                  </Text>
                </PressScale>
              </View>
              {reminderState === "declined" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    fontSize: theme.font.size.caption,
                    lineHeight: 20,
                    color: theme.colors.textMuted,
                  }}
                >
                  Notifications are off for Spotter Pair, so no nudge is set. Allow them in your
                  phone's Settings, then turn this on in the app's Settings. Your plan works without
                  it.
                </Text>
              ) : null}
            </>
          )}
        </View>
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
      <Stack.Screen options={{ title: "Plan setup" }} />

      {/* Progress that counts only the questions: three of them, then the plan itself. */}
      <View
        style={{
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <StepSegments count={QUESTIONS} index={step} />
          {step < PLAN_STEP ? (
            <Pressable
              onPress={skip}
              accessibilityRole="button"
              accessibilityLabel="Skip plan setup and open the app without a plan"
              hitSlop={12}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
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
          ) : (
            <View style={{ minHeight: 44 }} />
          )}
        </View>
        <Text style={{ fontSize: theme.font.size.caption, color: theme.colors.textMuted }}>
          {step < PLAN_STEP
            ? `Plan setup: step ${step + 1} of ${QUESTIONS}`
            : "Plan setup: all three answered"}
        </Text>
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
        {saveError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              fontSize: theme.font.size.caption,
              textAlign: "center",
              color: theme.colors.danger,
            }}
          >
            {saveError}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          {step > 0 ? (
            <PressScale
              onPress={() => go(-1)}
              disabled={saving}
              scaleTo={0.92}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityState={{ disabled: saving }}
              style={{
                width: 56,
                height: 56,
                borderRadius: theme.radius.pill,
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
              accessibilityState={{ disabled: action.disabled, busy: saving }}
              aria-busy={saving}
              style={{
                minHeight: 56,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.pill,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                borderWidth: 1,
                // Disabled goes neutral with a readable label; it never fades.
                borderColor: action.disabled ? theme.colors.border : theme.colors.primary,
                backgroundColor: action.disabled ? theme.colors.surfaceAlt : theme.colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                  color: actionInk,
                }}
              >
                {action.label}
              </Text>
              {action.icon ? <Ionicons name={action.icon} size={20} color={actionInk} /> : null}
            </PressScale>
          </View>
        </View>
      </View>
    </View>
  );
}
