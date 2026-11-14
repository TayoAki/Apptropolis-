// First launch, in three steps: pick a level, run a first 30-second round that is saved like any
// other, and (optionally) set a daily reminder. The step and the answers are saved as they are
// given, so leaving and coming back picks up where the person was.
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoundClock, clockSizeFor } from "../components/index/Clock";
import { ActionBar } from "../components/onboarding/action-bar";
import { ChoiceCard } from "../components/onboarding/choice-card";
import { PressScale, Stagger, StepTransition, haptic } from "../components/motion";
import { expectPaywall } from "../components/paywall/open";
import { IconButton, displayFace, type IconName } from "../components/ui";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import { currentStreak, xpForSession, type WorkoutSession } from "../data/schema";
import {
  CALLOUT_MS,
  FIRST_ROUND_SECONDS,
  REMINDER_COPY,
  SKILL_OPTIONS,
  firstRoundSteps,
} from "../data/training";
import { useTheme } from "../theme/ThemeProvider";

const STEPS = ["level", "first_round", "reminder"] as const;

const REMINDER_TIMES = [
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "12:30 PM", hour: 12, minute: 30 },
  { label: "6:30 PM", hour: 18, minute: 30 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

type ReminderResult = "idle" | "on" | "off";
type RoundState = { startedAt: number; endsAt: number } | null;

function StepHeader({ title, body }: { title: string; body?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.headline,
          fontWeight: theme.font.weight.bold,
          lineHeight: 34,
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/** Where the person is in setup: a segment per step and the count in words. */
function StepProgress({ step, count }: { step: number; count: number }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`First round setup, step ${step + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: step + 1 }}
      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
    >
      <View style={{ flex: 1, flexDirection: "row", gap: theme.spacing.xs }}>
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: index <= step ? theme.colors.primary : theme.colors.surfaceAlt,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption + 2,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`Setup step ${step + 1} of ${count}`}
      </Text>
    </View>
  );
}

function LevelStep({ value, onChoose }: { value: string; onChoose: (value: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader
        title="What's your level?"
        body={`${appInfo.name} times your rounds and calls the punches. Your level sets the punches in your first round and your daily challenge. You can change it in Settings.`}
      />
      <View accessibilityRole="radiogroup">
        <Stagger step={50} style={{ gap: theme.spacing.md }}>
          {SKILL_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              title={option.value}
              body={option.body}
              selected={value === option.value}
              onPress={() => onChoose(option.value)}
            />
          ))}
        </Stagger>
      </View>
    </View>
  );
}

/** The first round: the real clock and callouts, thirty seconds long. */
function RoundStep({
  skill,
  steps,
  run,
  now,
  done,
  streak,
  xp,
  saveFailed,
}: {
  skill: string;
  steps: string[];
  run: RoundState;
  now: number;
  done: boolean;
  streak: number;
  xp: number;
  saveFailed: boolean;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const left = run ? Math.max(0, Math.ceil((run.endsAt - now) / 1000)) : FIRST_ROUND_SECONDS;
  const live = run ? Math.floor((now - run.startedAt) / CALLOUT_MS) % steps.length : -1;
  const clockSize = clockSizeFor(width - theme.spacing.lg * 2, 104);

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader
        title="Your first round"
        body={`Thirty seconds. A punch is called every 3 seconds: throw it, then bring your hands back up. You chose "${skill}", so this round calls ${NUMBER_WORDS[steps.length] ?? steps.length} punches.`}
      />

      <View style={{ alignItems: "center", gap: theme.spacing.md }}>
        <RoundClock seconds={done && !run ? 0 : left} size={clockSize} dim={done && !run} />

        {run ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Throw: ${steps[live]}`}
            style={{ alignItems: "center", gap: theme.spacing.xs, minHeight: 104 }}
          >
            <Text
              style={[
                displayFace,
                {
                  color: theme.colors.primary,
                  fontSize: theme.font.size.display,
                  lineHeight: 70,
                  textTransform: "uppercase",
                },
              ]}
            >
              {steps[live]}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {steps.join(" · ")}
            </Text>
          </View>
        ) : done ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              alignSelf: "stretch",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              minHeight: 104,
            }}
          >
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Round done
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  lineHeight: 24,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {saveFailed
                  ? "It couldn't be saved just now, so it won't show in Progress. Your next round will."
                  : `Saved to Progress: +${xp} XP${
                      streak > 0 ? `, day ${streak} of your streak` : ""
                    }.`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: theme.spacing.xs, minHeight: 104 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
              This round calls
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
                textAlign: "center",
              }}
            >
              {steps.join(" · ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ReminderStep({
  timeIndex,
  onPickTime,
  result,
  trained,
}: {
  timeIndex: number;
  onPickTime: (index: number) => void;
  result: ReminderResult;
  trained: boolean;
}) {
  const theme = useTheme();
  const time = REMINDER_TIMES[timeIndex]!;
  const locked = result !== "idle";
  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader
        title="Want a daily reminder?"
        body={`One notification a day at the time you pick, so ${
          trained ? "the streak you just started" : "your streak"
        } doesn't lapse. It's optional, and you can change it or turn it off in Settings.`}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Remind me at
        </Text>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}
        >
          {REMINDER_TIMES.map((t, i) => {
            const selected = i === timeIndex;
            return (
              <PressScale
                key={t.label}
                onPress={() => onPickTime(i)}
                disabled={locked}
                haptic="selection"
                scaleTo={0.94}
                accessibilityRole="radio"
                accessibilityLabel={`Remind me at ${t.label}`}
                accessibilityState={{ selected, checked: selected, disabled: locked }}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.textMuted,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  opacity: locked && !selected ? 0.5 : 1,
                }}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.onPrimary} />
                ) : null}
                <Text
                  style={{
                    color: selected ? theme.colors.onPrimary : theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {t.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`The reminder will read: ${REMINDER_COPY.title}. ${REMINDER_COPY.body} Every day at ${time.label}.`}
        style={{
          flexDirection: "row",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Ionicons name="notifications" size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {REMINDER_COPY.title}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
            {REMINDER_COPY.body}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              fontVariant: ["tabular-nums"],
            }}
          >
            Every day at {time.label}
          </Text>
        </View>
      </View>

      {result === "on" ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
        >
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
            Reminder set for {time.label} every day.
          </Text>
        </View>
      ) : result === "off" ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
        >
          <Ionicons name="notifications-off-outline" size={24} color={theme.colors.textMuted} />
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
            {`Notifications are off for ${appInfo.name}, so no reminder was set. You can allow them in your phone's settings and turn the reminder on in Settings later. Training works without it.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type Action = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  quiet?: boolean;
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();
  const sessions = useCollection<WorkoutSession>("workout_sessions");

  // Resume where the person left off: the step is saved as it changes, answers as they are given.
  const saved = Number(answers.onboardingstep);
  const [step, setStep] = useState(
    answers.skilllevel && Number.isInteger(saved) && saved > 0 && saved < STEPS.length ? saved : 0,
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const skill = answers.skilllevel ?? "";
  const steps = firstRoundSteps(skill);

  const [run, setRun] = useState<RoundState>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saveFailed, setSaveFailed] = useState(false);
  const calloutRef = useRef(0);
  const finishing = useRef(false);
  const roundDone = answers.firstround === "done";

  const [timeIndex, setTimeIndex] = useState(2);
  const [result, setResult] = useState<ReminderResult>("idle");
  const [asking, setAsking] = useState(false);
  const [finishingUp, setFinishingUp] = useState(false);

  const xp = xpForSession({ rounds: 1, roundSeconds: FIRST_ROUND_SECONDS });
  const streak = currentStreak(sessions.items);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    void setAnswer("onboardingstep", String(next));
  }

  function completeStep(skipped = false) {
    track("onboarding_step_completed", { step: STEPS[step]!, skipped });
  }

  async function finishRound(endedAt: number) {
    if (finishing.current) return;
    finishing.current = true;
    setRun(null);
    haptic("success");
    try {
      await sessions.add({
        date: new Date(endedAt).toISOString(),
        rounds: 1,
        roundSeconds: FIRST_ROUND_SECONDS,
        mode: "callout",
        xpEarned: xp,
        topFix: "",
      });
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
    await setAnswer("firstround", "done");
    track("first_round_completed", { level: skill });
    finishing.current = false;
  }

  // The round runs off the wall clock, like the timer on the Train tab.
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= run.endsAt) {
        void finishRound(t);
        return;
      }
      const callout = Math.floor((t - run.startedAt) / CALLOUT_MS);
      if (callout !== calloutRef.current) {
        calloutRef.current = callout;
        haptic("light");
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  function startRound() {
    const t = Date.now();
    calloutRef.current = 0;
    setNow(t);
    setRun({ startedAt: t, endsAt: t + FIRST_ROUND_SECONDS * 1000 });
    haptic("medium");
  }

  // A declined permission never blocks onboarding: the result is shown and the app opens.
  async function turnOnReminders() {
    setAsking(true);
    const time = REMINDER_TIMES[timeIndex]!;
    let ok = false;
    try {
      ok = await reminder.enable({ ...REMINDER_COPY, hour: time.hour, minute: time.minute });
    } catch {
      ok = false;
    }
    if (ok) haptic("success");
    setResult(ok ? "on" : "off");
    setAsking(false);
  }

  async function finish(skipped: boolean) {
    if (finishingUp) return;
    setFinishingUp(true);
    completeStep(skipped);
    // A later replay from Settings starts at the first step again.
    await setAnswer("onboardingstep", "0");
    expectPaywall("onboarding");
    await completeOnboarding();
  }

  const offerNote =
    "Next you'll see what Pro adds, once. Closing it keeps everything you just used free.";
  let action: Action;
  let secondary: { label: string; onPress: () => void } | undefined;
  let caption: string | undefined;

  if (step === 0) {
    action = {
      label: "Continue",
      disabled: !skill,
      onPress: () => {
        completeStep();
        go(1);
      },
    };
    caption = skill ? "The timer and its callouts are free." : "Pick a level to continue.";
  } else if (step === 1) {
    if (run) {
      action = { label: "Stop", icon: "stop", quiet: true, onPress: () => setRun(null) };
    } else if (roundDone) {
      action = {
        label: "Continue",
        onPress: () => {
          completeStep();
          go(2);
        },
      };
      secondary = { label: "Go again", onPress: startRound };
    } else {
      action = { label: "Start 30-second round", icon: "play", onPress: startRound };
      secondary = {
        label: "Skip for now",
        onPress: () => {
          completeStep(true);
          go(2);
        },
      };
    }
  } else if (result === "idle") {
    action = {
      label: "Turn on reminders",
      icon: "notifications-outline",
      busy: asking,
      onPress: () => void turnOnReminders(),
    };
    secondary = { label: "Not now", onPress: () => void finish(true) };
    caption = offerNote;
  } else {
    action = { label: "Start training", busy: finishingUp, onPress: () => void finish(false) };
    caption = offerNote;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Welcome" }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          minHeight: insets.top + 52,
          paddingTop: insets.top,
          paddingLeft: step > 0 ? theme.spacing.xs : theme.spacing.lg,
          paddingRight: theme.spacing.lg,
        }}
      >
        {step > 0 ? (
          <IconButton
            icon="chevron-back"
            label="Back"
            size={26}
            disabled={run !== null}
            onPress={() => go(step - 1)}
          />
        ) : null}
        <StepProgress step={step} count={STEPS.length} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepTransition step={step} direction={direction}>
          {step === 0 ? (
            <LevelStep value={skill} onChoose={(value) => void setAnswer("skilllevel", value)} />
          ) : step === 1 ? (
            <RoundStep
              skill={skill}
              steps={steps}
              run={run}
              now={now}
              done={roundDone}
              streak={streak}
              xp={xp}
              saveFailed={saveFailed}
            />
          ) : (
            <ReminderStep
              timeIndex={timeIndex}
              onPickTime={setTimeIndex}
              result={result}
              trained={roundDone}
            />
          )}
        </StepTransition>
      </ScrollView>

      <ActionBar
        label={action.label}
        onPress={action.onPress}
        icon={action.icon}
        busy={action.busy}
        disabled={action.disabled}
        quiet={action.quiet}
        secondary={secondary}
        caption={caption}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
