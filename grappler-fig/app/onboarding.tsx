import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionBar } from "../components/onboarding/action-bar";
import { ChoiceCard } from "../components/onboarding/choice-card";
import { Lottie } from "../components/lottie";
import {
  Appear,
  PressScale,
  Stagger,
  StepTransition,
  haptic,
  useReducedMotion,
} from "../components/motion";
import { IconButton, SecondaryButton, displayFace, type IconName } from "../components/ui";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useTheme } from "../theme/ThemeProvider";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEP_COUNT = 4;
const ROUND_SECONDS = 30;
const CALLOUT_EVERY = 2;
const CALLOUTS = ["Jab", "Cross", "Hook", "Jab", "Cross", "Slip", "Uppercut", "Cross"];
const RING_SIZE = 180;
const RING_STROKE = 12;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

const SKILL_OPTIONS = [
  { value: "First jab", body: "Never wrapped hands" },
  { value: "Some training", body: "Know basic 1-2 combos and stance" },
  { value: "Amateur sparring", body: "Active gym sparring, need round pace" },
  { value: "Competitive", body: "Fighter camp ready" },
];

const SETUP_OPTIONS = [
  { value: "Shadowboxing only", body: "Mirror or open floor, no equipment" },
  { value: "Heavy bag", body: "Hanging or freestanding bag" },
  { value: "Pads with a partner", body: "Mitts or a training partner" },
];

const REMINDER_TIMES = [
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "12:30 PM", hour: 12, minute: 30 },
  { label: "6:30 PM", hour: 18, minute: 30 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

const REMINDER_COPY = {
  title: "Time to train",
  body: "Three rounds keep your streak alive. Your timer is ready.",
};

const CAPTION = "Core timer & callouts are forever free";

type ReminderResult = "idle" | "on" | "off";

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
      accessibilityLabel={`Step ${step + 1} of ${count}`}
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
        {`Step ${step + 1} of ${count}`}
      </Text>
    </View>
  );
}

function QuestionStep({
  title,
  options,
  value,
  onChoose,
}: {
  title: string;
  options: { value: string; body: string }[];
  value: string;
  onChoose: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.xl }}>
      <StepHeader title={title} />
      <Stagger step={50} style={{ gap: theme.spacing.md }}>
        {options.map((option) => (
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
  );
}

function DemoStep() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ring = useRef(new Animated.Value(1)).current;
  const calloutIndex = Math.floor((ROUND_SECONDS - left) / CALLOUT_EVERY) % CALLOUTS.length;

  // Count down one second at a time, with a click on every second.
  useEffect(() => {
    if (!running) return;
    if (left === 0) {
      setRunning(false);
      setDone(true);
      haptic("success");
      return;
    }
    const id = setTimeout(() => {
      haptic("selection");
      setLeft((n) => n - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [running, left]);

  // The ring drains smoothly toward the seconds left.
  useEffect(() => {
    const target = left / ROUND_SECONDS;
    if (reduced) {
      ring.setValue(target);
      return;
    }
    const anim = Animated.timing(ring, {
      toValue: target,
      duration: 950,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [left, reduced, ring]);

  const offset = ring.interpolate({ inputRange: [0, 1], outputRange: [RING_C, 0] });

  function start() {
    setDone(false);
    setLeft(ROUND_SECONDS);
    setRunning(true);
  }

  const label = running ? "Round in progress" : done ? "Go again" : "Start 30-second round";

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader
        title="Try a 30-second round"
        body={`Punch names come up as you go, like "jab, cross, hook". Throw along and feel the rhythm.`}
      />
      <View style={{ alignItems: "center", gap: theme.spacing.lg }}>
        <View
          accessibilityLabel={`${left} seconds left`}
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={theme.colors.surfaceAlt}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={theme.colors.primary}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${RING_C} ${RING_C}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <Text
            style={[
              displayFace,
              {
                position: "absolute",
                fontSize: theme.font.size.display,
                color: theme.colors.text,
                fontVariant: ["tabular-nums"],
              },
            ]}
          >
            {left}
          </Text>
        </View>

        <Appear key={calloutIndex} distance={10} duration={260}>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              displayFace,
              {
                color: running ? theme.colors.primary : theme.colors.textMuted,
                fontSize: theme.font.size.display,
                lineHeight: 70,
                textTransform: "uppercase",
              },
            ]}
          >
            {CALLOUTS[calloutIndex]}
          </Text>
        </Appear>

        {done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Lottie name="success" size={56} />
            <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
              That's the pace every round asks for. Your rounds will follow it.
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            Throw each punch as it's called. Keep your hands up between them.
          </Text>
        )}

        <SecondaryButton
          label={label}
          icon={running ? undefined : "play"}
          onPress={start}
          disabled={running}
          fullWidth={false}
        />
      </View>
    </View>
  );
}

function ReminderStep({
  timeIndex,
  onPickTime,
  result,
}: {
  timeIndex: number;
  onPickTime: (index: number) => void;
  result: ReminderResult;
}) {
  const theme = useTheme();
  const time = REMINDER_TIMES[timeIndex]!;
  const locked = result !== "idle";
  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader
        title="Daily training reminder"
        body="Pick a time and we'll nudge you to keep your streak alive. You can change it any time."
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <Lottie name="success" size={56} />
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
            Reminder set for {time.label} every day. Your first round starts today.
          </Text>
        </View>
      ) : result === "off" ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, lineHeight: 24 }}>
          Notifications are off for this app. Allow them in your phone's Settings to get reminders.
          You can still train without them.
        </Text>
      ) : null}
    </View>
  );
}

type Action = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  busy?: boolean;
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Each question always has a choice selected, so Continue is always ready.
  const [skill, setSkill] = useState(answers.skilllevel ?? SKILL_OPTIONS[1]!.value);
  const [setup, setSetup] = useState(answers.trainingsetup ?? SETUP_OPTIONS[1]!.value);
  const [timeIndex, setTimeIndex] = useState(2);
  const [result, setResult] = useState<ReminderResult>("idle");
  const [asking, setAsking] = useState(false);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  // A declined permission never blocks onboarding: the result is shown and the app opens.
  async function turnOnReminders() {
    setAsking(true);
    const time = REMINDER_TIMES[timeIndex]!;
    const ok = await reminder.enable({
      ...REMINDER_COPY,
      hour: time.hour,
      minute: time.minute,
    });
    if (ok) haptic("success");
    setResult(ok ? "on" : "off");
    setAsking(false);
  }

  function renderStep() {
    if (step === 0) {
      return (
        <QuestionStep
          title="What's your level?"
          options={SKILL_OPTIONS}
          value={skill}
          onChoose={setSkill}
        />
      );
    }
    if (step === 1) {
      return (
        <QuestionStep
          title="Where do you train?"
          options={SETUP_OPTIONS}
          value={setup}
          onChoose={setSetup}
        />
      );
    }
    if (step === 2) return <DemoStep />;
    return (
      <ReminderStep
        timeIndex={timeIndex}
        onPickTime={setTimeIndex}
        result={result}
      />
    );
  }

  let action: Action;
  if (step === 0)
    action = {
      label: "Continue",
      onPress: () => {
        void setAnswer("skilllevel", skill);
        go(1);
      },
    };
  else if (step === 1)
    action = {
      label: "Continue",
      onPress: () => {
        void setAnswer("trainingsetup", setup);
        go(2);
      },
    };
  else if (step === 2) action = { label: "Continue", onPress: () => go(3) };
  else if (result === "idle")
    action = {
      label: "Turn on reminders",
      icon: "notifications-outline",
      busy: asking,
      onPress: () => void turnOnReminders(),
    };
  else action = { label: "Start training", onPress: () => void completeOnboarding() };

  const caption =
    step === 3 ? "You can change the time any time in Settings" : CAPTION;

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
          <IconButton icon="chevron-back" label="Back" size={26} onPress={() => go(step - 1)} />
        ) : null}
        <StepProgress step={step} count={STEP_COUNT} />
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
          {renderStep()}
        </StepTransition>
      </ScrollView>

      <ActionBar
        label={action.label}
        onPress={action.onPress}
        icon={action.icon}
        busy={action.busy}
        caption={caption}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
