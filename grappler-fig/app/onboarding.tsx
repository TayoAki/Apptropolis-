import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from "react-native";
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
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useTheme } from "../theme/ThemeProvider";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEP_COUNT = 4;
const ROUND_SECONDS = 30;
const CALLOUT_EVERY = 2;
const CALLOUTS = ["Jab", "Cross", "Hook", "Jab", "Cross", "Slip", "Uppercut", "Cross"];
const BARS = [0.4, 0.7, 0.5, 0.9, 1, 0.9, 0.5, 0.7, 0.4];
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

// Type faces for the mockup's look: a tall condensed headline and a monospace step label.
// The phone's own condensed and monospace faces are used, so nothing has to be bundled.
const HEADLINE_FONT: TextStyle = Platform.select<TextStyle>({
  ios: { fontFamily: "AvenirNextCondensed-Heavy" },
  android: { fontFamily: "sans-serif-condensed", fontWeight: "700" },
  default: { fontWeight: "700" },
});
const MONO_FONT: TextStyle = Platform.select<TextStyle>({
  ios: { fontFamily: "Menlo" },
  android: { fontFamily: "monospace" },
  default: { fontFamily: "monospace" },
});

function StepHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  const theme = useTheme();
  const headline = Math.round(theme.font.size.display * 0.75);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        style={[
          MONO_FONT,
          {
            color: theme.colors.primary,
            fontSize: theme.font.size.body,
            letterSpacing: 3,
          },
        ]}
      >
        {eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        style={[
          HEADLINE_FONT,
          {
            color: theme.colors.text,
            fontSize: headline,
            lineHeight: Math.round(headline * 1.05),
          },
        ]}
      >
        {title}
      </Text>
      {body ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>{body}</Text>
      ) : null}
    </View>
  );
}

function QuestionStep({
  eyebrow,
  title,
  options,
  value,
  onChoose,
}: {
  eyebrow: string;
  title: string;
  options: { value: string; body: string }[];
  value: string;
  onChoose: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xl }}>
      <StepHeader eyebrow={eyebrow} title={title} />
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

function DemoStep({ eyebrow }: { eyebrow: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ring = useRef(new Animated.Value(1)).current;
  const beat = useRef(new Animated.Value(0)).current;
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

  // Each callout makes the waveform jump together.
  useEffect(() => {
    if (!running || reduced) return;
    beat.setValue(1);
    const anim = Animated.timing(beat, {
      toValue: 0,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [calloutIndex, running, reduced, beat]);

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
        eyebrow={eyebrow}
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
            style={{
              position: "absolute",
              fontSize: theme.font.size.display,
              fontWeight: theme.font.weight.bold,
              color: theme.colors.text,
              fontVariant: ["tabular-nums"],
            }}
          >
            {left}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
              letterSpacing: 2,
            }}
          >
            CALLOUT
          </Text>
          <Appear key={calloutIndex} distance={10} duration={260}>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.display,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {CALLOUTS[calloutIndex]}
            </Text>
          </Appear>
        </View>

        <View
          style={{
            height: 76,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {BARS.map((level, i) => (
            <Animated.View
              key={i}
              style={{
                width: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.primary,
                height: beat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 8 + level * 60],
                }),
              }}
            />
          ))}
        </View>

        {done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Lottie name="success" size={56} />
            <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
              That's the pace every round asks for. Your rounds will follow it.
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            Throw each punch as it's called. Keep your hands up between them.
          </Text>
        )}

        <PressScale
          onPress={start}
          disabled={running}
          haptic="light"
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: running }}
          style={{
            minHeight: 52,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.sm,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: running ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {label}
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

function ReminderStep({
  eyebrow,
  timeIndex,
  onPickTime,
  result,
}: {
  eyebrow: string;
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
        eyebrow={eyebrow}
        title="Daily training reminder"
        body="Pick a time and we'll nudge you to keep your streak alive. You can change it any time."
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.medium,
            letterSpacing: 1,
          }}
        >
          REMIND ME AT
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {REMINDER_TIMES.map((t, i) => {
            const selected = i === timeIndex;
            return (
              <PressScale
                key={t.label}
                onPress={() => onPickTime(i)}
                disabled={locked}
                haptic="selection"
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={`Remind me at ${t.label}`}
                accessibilityState={{ selected, disabled: locked }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: theme.spacing.lg,
                  justifyContent: "center",
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  opacity: locked && !selected ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.colors.background : theme.colors.text,
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
          borderRadius: theme.radius.sm,
          borderWidth: 1.5,
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
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            {REMINDER_COPY.body}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
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
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
            Reminder set for {time.label} every day. Your first round starts today.
          </Text>
        </View>
      ) : result === "off" ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
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
  icon?: ComponentProps<typeof Ionicons>["name"];
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

  const eyebrow = `STEP ${step + 1} OF ${STEP_COUNT}`;

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
          eyebrow={eyebrow}
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
          eyebrow={eyebrow}
          title="Where do you train?"
          options={SETUP_OPTIONS}
          value={setup}
          onChoose={setSetup}
        />
      );
    }
    if (step === 2) return <DemoStep eyebrow={eyebrow} />;
    return (
      <ReminderStep
        eyebrow={eyebrow}
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

      {/* A faint vignette: the surface color glows at the middle and falls back to black at the edges. */}
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface, theme.colors.background]}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        style={{
          height: insets.top + 44,
          paddingTop: insets.top,
          paddingHorizontal: theme.spacing.sm,
          justifyContent: "center",
        }}
      >
        {step > 0 ? (
          <Pressable
            onPress={() => go(step - 1)}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
          </Pressable>
        ) : null}
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
