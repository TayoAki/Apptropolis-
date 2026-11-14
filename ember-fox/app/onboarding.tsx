import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AiImage } from "../components/AiImage";
import { Lottie } from "../components/lottie";
import { glowStyle, withAlpha } from "../components/onboarding/glow";
import { OptionTile } from "../components/onboarding/OptionTile";
import { StepDots } from "../components/onboarding/StepDots";
import { Panel } from "../components/Panel";
import {
  CountUp,
  Float,
  GrowBar,
  Mascot,
  PressScale,
  Skeleton,
  Stagger,
  StepTransition,
  haptic,
  useReducedMotion,
} from "../components/motion";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import {
  DEFAULT_PROFILE,
  SPORTS,
  athleteStats,
  estimateBac,
  formatDrinks,
  formatDuration,
  totalStandardDrinks,
  type Drink,
  type DrinkLabel,
  type Sport,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Step = 0 | 1 | 2 | 3;
type ReminderState = "idle" | "busy" | "on" | "declined";

const STEPS = 4;

/** The tile copy and icon for each sport in the first question. Labels come from data/schema. */
const SPORT_TILE: Record<Sport, { hint: string; value: string; icon: IconName }> = {
  gym: { hint: "Heavy sets and recovery days", value: "Heavy sets", icon: "barbell-outline" },
  running: {
    hint: "Easy runs, tempo days and long rides",
    value: "Easy runs",
    icon: "footsteps-outline",
  },
  team: { hint: "Matches, scrimmages and sprints", value: "Matches", icon: "football-outline" },
  racquet: {
    hint: "Rounds, rallies and tournament weekends",
    value: "Rallies",
    icon: "tennisball-outline",
  },
};

const LIMIT_OPTIONS = [
  { id: "3", limit: 3, title: "Light week", hint: "A tight week for a serious season" },
  {
    id: "7",
    limit: 7,
    title: "Balanced",
    hint: "About one a night, with rest days built in",
  },
  {
    id: "10",
    limit: 10,
    title: "Social",
    hint: "A couple of nights out, still in control",
  },
  {
    id: "14",
    limit: 14,
    title: "Big weekend",
    hint: "A social weekend that doesn't cost you the next session",
  },
];

interface DemoDrink {
  key: string;
  label: DrinkLabel;
  name: string;
  standard: number;
  image: { name?: string; prompt?: string };
}

const DEMO_DRINKS: DemoDrink[] = [
  {
    key: "ipa",
    label: "beer",
    name: "Pint IPA",
    standard: 1.8,
    image: { name: "Pint of beer icon in amber inside a dark rounded square tile" },
  },
  {
    key: "wine",
    label: "wine",
    name: "Red Wine",
    standard: 1.4,
    image: { name: "Wine glass icon in red inside a dark rounded square tile" },
  },
  {
    key: "shot",
    label: "shot",
    name: "Tequila Shot",
    standard: 1.0,
    image: {
      prompt:
        "a golden tequila shot glass with a lime wedge, flat icon in a dark rounded square tile",
    },
  },
  {
    key: "na",
    label: "custom",
    name: "Athletic NA Beer",
    standard: 0,
    image: {
      prompt:
        "a slim sports drink can with a yellow stripe, flat icon in a dark rounded square tile",
    },
  },
];

const REMINDER_HOURS = [16, 17, 18, 19];

const GAUGE = { width: 200, height: 112, cx: 100, cy: 102, r: 84, stroke: 12, glow: 26 };
const ARC_LENGTH = Math.PI * GAUGE.r;
const ARC_PATH = `M ${GAUGE.cx - GAUGE.r} ${GAUGE.cy} A ${GAUGE.r} ${GAUGE.r} 0 0 1 ${GAUGE.cx + GAUGE.r} ${GAUGE.cy}`;
const AnimatedPath = Animated.createAnimatedComponent(Path);

function isSport(value: string | undefined): value is Sport {
  return SPORTS.some((sport) => sport.id === value);
}

function limitOf(id: string | null | undefined): number | null {
  return LIMIT_OPTIONS.find((option) => option.id === id)?.limit ?? null;
}

function formatHour(hour: number): string {
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The telemetry gauge: a half ring with a soft amber glow, filled to the athlete's form (0 to 1). */
function Gauge({ value, color, track }: { value: Animated.Value; color: string; track: string }) {
  const offset = value.interpolate({
    inputRange: [0, 1],
    outputRange: [ARC_LENGTH, 0],
    extrapolate: "clamp",
  });
  return (
    <Svg width={GAUGE.width} height={GAUGE.height} viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}>
      <Path
        d={ARC_PATH}
        stroke={track}
        strokeWidth={GAUGE.stroke}
        strokeLinecap="round"
        fill="none"
      />
      <AnimatedPath
        d={ARC_PATH}
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={GAUGE.glow}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
        strokeDashoffset={offset}
      />
      <AnimatedPath
        d={ARC_PATH}
        stroke={color}
        strokeWidth={GAUGE.stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/** A step's label, title and optional line of guidance, with an optional picture on the right. */
function StepHead({
  step,
  title,
  body,
  aside,
}: {
  step: number;
  title: string;
  body?: string;
  aside?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {`STEP ${step} OF ${STEPS}`}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </Text>
        {body ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            {body}
          </Text>
        ) : null}
      </View>
      {aside}
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const app = useAppState();
  const reminder = useReminder();

  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [sport, setSport] = useState<Sport | null>(
    isSport(app.answers.sport) ? app.answers.sport : null,
  );
  const [limitId, setLimitId] = useState<string | null>(
    limitOf(app.answers.weekly_goal) ? app.answers.weekly_goal : null,
  );
  const [log, setLog] = useState<{ key: string; at: string }[]>([]);
  const [hour, setHour] = useState(18);
  const [reminderState, setReminderState] = useState<ReminderState>("idle");

  // The sample drinks live only on this screen: nothing is written to the person's records.
  const limit = limitOf(limitId) ?? 10;
  const now = new Date();
  const drinks: Drink[] = log.map((entry, index) => {
    const drink = DEMO_DRINKS.find((d) => d.key === entry.key)!;
    return {
      id: `${entry.key}-${index}`,
      logged_at: entry.at,
      label: drink.label,
      standard_drinks: drink.standard,
      edited: false,
    };
  });
  const bac = estimateBac(drinks, DEFAULT_PROFILE, now);
  const stats = athleteStats(drinks, [], limit, now);
  const total = totalStandardDrinks(drinks);
  const left = Math.max(0, limit - total);
  const over = total > limit;

  const activeSport = sport ?? "gym";
  const noun = SPORTS.find((s) => s.id === activeSport)?.noun ?? "session";
  const nounTitle = noun.charAt(0).toUpperCase() + noun.slice(1);
  const tone =
    stats.form >= 75
      ? { label: "Fresh legs", color: theme.colors.success }
      : stats.form >= 50
        ? { label: "Recovering", color: theme.colors.primary }
        : { label: "Heavy Recovery", color: theme.colors.warning };
  const pose =
    log.length === 0
      ? "dash-game-day-sharp"
      : stats.form >= 50
        ? "dash-match-ready"
        : "dash-heavy-legs";

  // The gauge follows the form, springing down after a drink and back as it recovers.
  const gauge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      gauge.setValue(stats.form / 100);
      return;
    }
    const animation = Animated.spring(gauge, {
      toValue: stats.form / 100,
      useNativeDriver: false,
      speed: 12,
      bounciness: 8,
    });
    animation.start();
    return () => animation.stop();
  }, [stats.form, reduced, gauge]);

  const reminderDone = reminderState === "on" || (reminder.ready && reminder.enabled);
  const declined = reminderState === "declined";

  function go(next: Step) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function next() {
    go(Math.min(STEPS - 1, step + 1) as Step);
  }

  function back() {
    go(Math.max(0, step - 1) as Step);
  }

  function finish() {
    void app.completeOnboarding();
  }

  function chooseSport(id: Sport) {
    setSport(id);
    void app.setAnswer("sport", id);
  }

  function chooseLimit(id: string) {
    setLimitId(id);
    void app.setAnswer("weekly_goal", id);
  }

  function addDrink(key: string) {
    setLog((previous) => [...previous, { key, at: new Date().toISOString() }]);
  }

  function undoDrink() {
    setLog((previous) => previous.slice(0, -1));
  }

  async function turnOn() {
    setReminderState("busy");
    let on = false;
    try {
      on = await reminder.enable({
        title: "ShotOClock check-in",
        body: "Log today's drinks, or mark an alcohol-free day, before your next session.",
        hour,
        minute: 0,
      });
    } catch {
      on = false;
    }
    if (on) haptic("success");
    setReminderState(on ? "on" : "declined");
  }

  function sportStep(): ReactNode[] {
    return [
      <StepHead
        key="head"
        step={1}
        title="What's your sport?"
        body="Your athlete is built around this. Change it any time in Settings."
        aside={<Mascot pose="dash-match-ready" size={104} />}
      />,
      <View key="grid" style={gridStyle(theme.spacing.md)}>
        {SPORTS.map((option) => (
          <OptionTile
            key={option.id}
            selected={sport === option.id}
            title={option.label}
            value={SPORT_TILE[option.id].value}
            accessibilityLabel={`${option.label}. ${SPORT_TILE[option.id].hint}`}
            leading={
              <Ionicons
                name={SPORT_TILE[option.id].icon}
                size={24}
                color={theme.colors.primary}
              />
            }
            onPress={() => chooseSport(option.id)}
          />
        ))}
      </View>,
    ];
  }

  function demoStep(): ReactNode[] {
    const hero = (
      <View key="hero" style={{ marginTop: theme.spacing.xl }}>
        <View
          style={{
            paddingLeft: theme.spacing.md,
            paddingRight: 104,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            gap: theme.spacing.sm,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            backgroundColor: theme.colors.surface,
            ...glowStyle(theme, true),
          }}
        >
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
            }}
          >
            Telemetry
          </Text>
          <View style={{ width: GAUGE.width, height: GAUGE.height }}>
            <Gauge value={gauge} color={theme.colors.primary} track={theme.colors.border} />
            <View
              pointerEvents="none"
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: theme.spacing.xs }}>
                <CountUp
                  value={stats.form}
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.display,
                    fontWeight: theme.font.weight.bold,
                  }}
                />
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.title,
                    fontVariant: ["tabular-nums"],
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  / 100
                </Text>
              </View>
            </View>
          </View>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
              textAlign: "center",
            }}
          >
            {`Saturday ${nounTitle} Readiness`}
          </Text>
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: withAlpha(tone.color, 0.16),
            }}
          >
            <Text
              style={{
                color: tone.color,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {tone.label}
            </Text>
          </View>
          <View pointerEvents="box-none" style={{ position: "absolute", top: -24, right: -14, zIndex: 2 }}>
            <Mascot pose={pose} size={184} />
          </View>
        </View>
      </View>
    );

    return [
      <StepHead key="head" step={2} title="Log a Drink, See Your Game" />,
      hero,
      <View
        key="bac"
        style={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        {drinks.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: withAlpha(theme.colors.primary, 0.16),
            }}
          >
            <CountUp
              value={bac.percent}
              format={(n) => `~${n.toFixed(3)}%`}
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            />
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
              {`BAC • Cleared ${formatDuration(bac.hoursToZero)}`}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            Tap a drink below to see what it does to your game.
          </Text>
        )}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              This week
            </Text>
            <Text
              style={{
                color: over ? theme.colors.danger : theme.colors.text,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {over ? `${formatDrinks(total - limit)} over` : `${formatDrinks(left)} left`}
            </Text>
          </View>
          <GrowBar
            progress={total / limit}
            color={over ? theme.colors.danger : theme.colors.primary}
            duration={500}
          />
        </View>
      </View>,
      <View key="grid" style={gridStyle(theme.spacing.sm)}>
        {DEMO_DRINKS.map((drink) => {
          const count = log.filter((entry) => entry.key === drink.key).length;
          return (
            <OptionTile
              key={drink.key}
              role="button"
              selected={count > 0}
              count={count}
              title={drink.name}
              value={`(${drink.standard.toFixed(1)})`}
              accessibilityLabel={`Add ${drink.name}, ${drink.standard.toFixed(1)} standard drinks`}
              leading={
                <AiImage
                  name={drink.image.name}
                  prompt={drink.image.prompt}
                  fit="contain"
                  style={{ width: 44, height: 44 }}
                />
              }
              onPress={() => addDrink(drink.key)}
            />
          );
        })}
      </View>,
      log.length > 0 ? (
        <Pressable
          key="undo"
          onPress={undoDrink}
          accessibilityRole="button"
          accessibilityLabel="Remove the last drink"
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
          <Ionicons name="arrow-undo-outline" size={18} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            Remove last drink
          </Text>
        </Pressable>
      ) : null,
      <Text
        key="note"
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          textAlign: "center",
        }}
      >
        Rough estimate based on standard metabolic rate. Never use this app to decide if you are
        safe to drive.
      </Text>,
    ];
  }

  function limitStep(): ReactNode[] {
    return [
      <StepHead
        key="head"
        step={3}
        title="Set your weekly limit"
        body="Pick a limit that feels realistic. Your athlete trains around it, and you can change it any time."
      />,
      <View key="grid" style={gridStyle(theme.spacing.md)}>
        {LIMIT_OPTIONS.map((option) => (
          <OptionTile
            key={option.id}
            selected={limitId === option.id}
            title={option.title}
            value={`Under ${option.limit}`}
            accessibilityLabel={`${option.title}, under ${option.limit} drinks. ${option.hint}`}
            leading={
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {option.limit}
              </Text>
            }
            onPress={() => chooseLimit(option.id)}
          />
        ))}
      </View>,
    ];
  }

  function reminderStep(): ReactNode[] {
    const timeLabel = formatHour(reminder.enabled ? reminder.hour : hour);
    return [
      <StepHead
        key="head"
        step={4}
        title="One quiet pre-game nudge"
        body="One local reminder a day, at the time you pick. Never a stream of texts, and you can turn it off in Settings."
      />,
      <View key="mascot" style={{ alignItems: "center" }}>
        <Float>
          <Mascot pose="dash-game-day-sharp" size={140} />
        </Float>
      </View>,
      !reminder.ready ? (
        <Skeleton key="loading" height={96} radius={theme.radius.md} />
      ) : reminderDone ? (
        <Panel key="done" style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Lottie name="success" size={88} />
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
              textAlign: "center",
            }}
          >
            {`Reminder set for ${timeLabel}`}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            Change the time or turn it off any time in Settings.
          </Text>
        </Panel>
      ) : (
        <View key="choose" style={{ gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            REMIND ME AT
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {REMINDER_HOURS.map((option) => {
              const selected = hour === option;
              return (
                <View key={option} style={{ flex: 1 }}>
                  <PressScale
                    onPress={() => setHour(option)}
                    haptic="selection"
                    scaleTo={0.94}
                    accessibilityRole="radio"
                    accessibilityLabel={`Remind me at ${formatHour(option)}`}
                    accessibilityState={{ checked: selected }}
                    style={{
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: theme.radius.md,
                      borderWidth: 1.5,
                      ...glowStyle(theme, selected),
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.colors.primary : theme.colors.text,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.bold,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {formatHour(option)}
                    </Text>
                  </PressScale>
                </View>
              );
            })}
          </View>
        </View>
      ),
      declined ? (
        <Panel key="declined" style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="notifications-off-outline" size={22} color={theme.colors.warning} />
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.caption,
            }}
          >
            Notifications are off for ShotOClock. Allow them in your phone's Settings to get this
            check-in later. Nothing else changes.
          </Text>
        </Panel>
      ) : null,
      !reminderDone ? (
        <Pressable
          key="later"
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Not now, start the app"
          hitSlop={8}
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            Not now
          </Text>
        </Pressable>
      ) : null,
    ];
  }

  const body: ReactNode[] =
    step === 0
      ? sportStep()
      : step === 1
        ? demoStep()
        : step === 2
          ? limitStep()
          : reminderStep();

  // The primary action changes with the step; it stays disabled until the step's choice is made.
  const primary =
    step === 0
      ? { label: "Next: Try a Sample Drink", disabled: !sport, onPress: next }
      : step === 1
        ? { label: `Next: Set Weekly Limit (${limit} Drinks)`, disabled: false, onPress: next }
        : step === 2
          ? { label: "Next: Set My Check-in", disabled: !limitId, onPress: next }
          : reminderDone
            ? { label: "Start my athlete", disabled: false, onPress: finish }
            : declined
              ? { label: "Continue", disabled: false, onPress: finish }
              : reminderState === "busy"
                ? { label: "Setting up…", disabled: true, onPress: () => undefined }
                : {
                    label: "Turn on reminders",
                    disabled: !reminder.ready,
                    onPress: () => void turnOn(),
                  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Welcome" }} />

      <View
        style={{
          height: 44,
          justifyContent: "center",
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {step > 0 ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              marginLeft: -12,
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
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepTransition step={step} direction={direction}>
          <Stagger key={step} step={60} style={{ gap: theme.spacing.md }}>
            {body}
          </Stagger>
        </StepTransition>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + theme.spacing.sm,
          gap: theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}
      >
        <PressScale
          onPress={primary.onPress}
          disabled={primary.disabled}
          haptic="light"
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={primary.label}
          accessibilityState={{ disabled: primary.disabled }}
          style={{
            minHeight: 56,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: primary.disabled ? theme.colors.surfaceAlt : theme.colors.primary,
            shadowColor: theme.colors.primary,
            shadowOpacity: primary.disabled ? 0 : 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: primary.disabled ? 0 : 4,
          }}
        >
          <Text
            style={{
              color: primary.disabled ? theme.colors.textMuted : theme.colors.onPrimary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {primary.label}
          </Text>
        </PressScale>
        <StepDots count={STEPS} index={step} />
      </View>
    </View>
  );
}

/** A two-column grid of tiles with even gaps. */
function gridStyle(gap: number) {
  return {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
    rowGap: gap,
  };
}
