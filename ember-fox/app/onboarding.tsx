// Onboarding: four short steps that end in the person's first real entry. Sport and weekly limit
// are the two answers the app needs; "today so far" is the real log (a drink or an alcohol-free
// day), with the form rating and week it produces; the daily reminder is optional. Nothing here is
// a demo: every entry is saved and is there on Tonight afterwards. The current step is saved as
// an answer, so leaving the app mid-way comes back to the same step with the same answers.
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import {
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlcoholFreeButton } from "../components/index/AlcoholFreeButton";
import { DrinkLogRow } from "../components/index/DrinkLogRow";
import { DrinkTiles } from "../components/index/DrinkTiles";
import { FormHero } from "../components/index/FormHero";
import { WeekProgress } from "../components/index/WeekProgress";
import { OptionRow } from "../components/onboarding/OptionRow";
import { StepDots } from "../components/onboarding/StepDots";
import { Panel } from "../components/Panel";
import { notePaywallSource } from "../components/paywallSource";
import { Dash } from "../components/Dash";
import { PressScale, Skeleton, Stagger, StepTransition, haptic } from "../components/motion";
import { useAthlete } from "../components/useAthlete";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { SPORTS, WEEKDAYS, dayKey, type Sport } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];
type ReminderState = "idle" | "busy" | "on" | "declined";

/** The setup steps, in order. The progress line counts exactly these. */
const STEPS = ["sport", "limit", "today", "reminder"] as const;
type StepId = (typeof STEPS)[number];

/** The hint and icon for each sport. Labels come from data/schema. */
const SPORT_ROW: Record<Sport, { hint: string; icon: IconName }> = {
  gym: { hint: "Heavy sets and recovery days", icon: "barbell-outline" },
  running: { hint: "Easy runs, tempo days and long rides", icon: "footsteps-outline" },
  team: { hint: "Matches, scrimmages and sprints", icon: "football-outline" },
  racquet: { hint: "Rounds, rallies and tournament weekends", icon: "tennisball-outline" },
};

/** The weekly limits offered here; Settings has the in-between values. */
const LIMIT_OPTIONS = [
  { limit: 3, hint: "The lightest option, for a serious training block." },
  { limit: 7, hint: "No more than one a day on average." },
  { limit: 10, hint: "Room for a couple of social evenings." },
  { limit: 14, hint: "The highest limit offered here. Lower it when you're ready." },
];

const REMINDER_HOURS = [16, 17, 18, 19];

function isSport(value: string | undefined): value is Sport {
  return SPORTS.some((sport) => sport.id === value);
}

function savedLimit(answers: Record<string, string>): number | null {
  const raw = answers.weekly_limit ?? answers.weekly_goal;
  const value = Number(raw);
  return raw !== undefined && raw !== "" && Number.isFinite(value) ? value : null;
}

function formatHour(hour: number): string {
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A step's title and line of guidance, with an optional picture on the right. */
function StepHead({ title, body, aside }: { title: string; body?: string; aside?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            lineHeight: 34,
            fontWeight: theme.font.weight.bold,
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

/** The question a set of options answers, and what the answer is used for. */
function Question({ label, use }: { label: string; use: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
        {use}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const app = useAppState();
  const reminder = useReminder();
  const athlete = useAthlete();

  const [sport, setSport] = useState<Sport | null>(
    isSport(app.answers.sport) ? app.answers.sport : null,
  );
  const [limit, setLimit] = useState<number | null>(() => savedLimit(app.answers));
  // Resume on the step the person left, as long as the answers the step needs are there.
  const [step, setStep] = useState(() => {
    const saved = Math.round(Number(app.answers.onboarding_step));
    const furthest = !isSport(app.answers.sport) ? 0 : savedLimit(app.answers) === null ? 1 : 3;
    return Number.isFinite(saved) ? Math.max(0, Math.min(saved, furthest)) : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hour, setHour] = useState(18);
  const [reminderState, setReminderState] = useState<ReminderState>("idle");

  const stepId: StepId = STEPS[step] ?? "sport";
  const todays = athlete.drinks.items
    .filter((d) => dayKey(d.logged_at) === athlete.today)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const hasEntry = todays.length > 0 || athlete.markedAlcoholFree;

  // The first entry puts the result under the log: bring it into view once, so the person sees
  // what their entry did without hunting for it.
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentHeight = useRef(0);
  const revealed = useRef(hasEntry);
  function revealResult(resultHeight: number) {
    if (revealed.current) return;
    revealed.current = true;
    setTimeout(() => {
      const y = contentHeight.current - resultHeight - theme.spacing.xl - theme.spacing.md;
      scroll.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }, 120);
  }
  const reminderOn = reminderState === "on" || (reminder.ready && reminder.enabled);
  const declined = reminderState === "declined";

  function go(next: number) {
    const target = Math.max(0, Math.min(STEPS.length - 1, next));
    setDirection(target > step ? 1 : -1);
    setStep(target);
    void app.setAnswer("onboarding_step", String(target));
  }

  function completeStep(outcome?: string) {
    track("onboarding_step_completed", { step: stepId, ...(outcome ? { outcome } : {}) });
  }

  function next(outcome?: string) {
    completeStep(outcome);
    go(step + 1);
  }

  function finish(outcome: string) {
    completeStep(outcome);
    void app.setAnswer("onboarding_step", "");
    // The platform opens the paywall right after this; tell it where it came from.
    notePaywallSource("onboarding");
    void app.completeOnboarding();
  }

  function chooseSport(id: Sport) {
    setSport(id);
    void app.setAnswer("sport", id);
  }

  function chooseLimit(value: number) {
    setLimit(value);
    // The key Settings and the tabs read (data/schema limitFrom).
    void app.setAnswer("weekly_limit", String(value));
  }

  async function turnOn() {
    setReminderState("busy");
    let on = false;
    try {
      on = await reminder.enable({
        title: "ShotOClock check-in",
        body: "Log today's drinks, or mark an alcohol-free day.",
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
        title="See your form for game day"
        body="Log your drinks against a weekly limit and see what they do to your next game. Four short steps: your sport, your limit, today's log and an optional reminder."
        aside={<Dash pose="steady" size={88} />}
      />,
      <Question
        key="question"
        label="What do you play or train for?"
        use="It words your form outlook and picks the kit and gear in your career. You can change it in Settings."
      />,
      <View
        key="list"
        accessibilityRole="radiogroup"
        accessibilityLabel="Your sport"
        style={{ gap: theme.spacing.sm }}
      >
        {SPORTS.map((option) => (
          <OptionRow
            key={option.id}
            selected={sport === option.id}
            title={option.label}
            hint={SPORT_ROW[option.id].hint}
            icon={SPORT_ROW[option.id].icon}
            onPress={() => chooseSport(option.id)}
          />
        ))}
      </View>,
    ];
  }

  function limitStep(): ReactNode[] {
    return [
      <StepHead
        key="head"
        title="Set your weekly limit"
        body="Your weekly total, form rating and career levels are measured against it. A lower limit is easier on recovery, and you can change it in Settings."
      />,
      <View
        key="list"
        accessibilityRole="radiogroup"
        accessibilityLabel="Weekly limit"
        style={{ gap: theme.spacing.sm }}
      >
        {LIMIT_OPTIONS.map((option) => (
          <OptionRow
            key={option.limit}
            selected={limit === option.limit}
            title={`Up to ${option.limit} drinks a week`}
            hint={option.hint}
            badge={String(option.limit)}
            onPress={() => chooseLimit(option.limit)}
          />
        ))}
      </View>,
      <Text
        key="unit"
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
      >
        One drink here is one standard drink, about 14 g of alcohol.
      </Text>,
    ];
  }

  function todayStep(): ReactNode[] {
    return [
      <StepHead
        key="head"
        title="Log today so far"
        body="Tap what you've had today, or mark the day alcohol-free. This is your real log, not a demo: it starts your week and your form rating."
      />,
      athlete.loading ? (
        <Skeleton key="loading" height={160} radius={theme.radius.md} />
      ) : (
        <DrinkTiles
          key="tiles"
          onLog={(label, amount) => void athlete.logDrink(label, amount, "onboarding")}
        />
      ),
      athlete.loading ? null : (
        <AlcoholFreeButton
          key="free"
          marked={athlete.markedAlcoholFree}
          drinksToday={athlete.todayTotal}
          onChange={(value) => void athlete.setAlcoholFree(value, "onboarding")}
        />
      ),
      todays.length > 0 ? (
        <View key="log" style={{ gap: theme.spacing.sm }}>
          {todays.map((drink) => (
            <DrinkLogRow
              key={drink.id}
              drink={drink}
              onDelete={() => void athlete.removeDrink(drink.id)}
            />
          ))}
        </View>
      ) : null,
      hasEntry ? (
        <View
          key="result"
          onLayout={(event) => revealResult(event.nativeEvent.layout.height)}
          style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Where that leaves you
          </Text>
          <FormHero
            form={athlete.stats.form}
            headline={athlete.message.headline}
            line={athlete.message.line}
            pose={athlete.message.pose}
          />
          <WeekProgress
            total={athlete.weekTotal}
            limit={athlete.limit}
            resetDay={WEEKDAYS[athlete.startsOn]}
          />
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {`Worked out from what you just logged and your limit of ${athlete.limit} a week. It updates each time you log on Tonight.`}
          </Text>
        </View>
      ) : athlete.loading ? null : (
        <Panel key="pending" style={{ padding: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            Your form rating and your week appear here after your first entry.
          </Text>
        </Panel>
      ),
    ];
  }

  function reminderStep(): ReactNode[] {
    const timeLabel = formatHour(reminder.enabled ? reminder.hour : hour);
    return [
      <StepHead
        key="head"
        title="One quiet pre-game nudge"
        body="Optional. One notification a day from this phone, at the time you pick, asking you to log the day or mark it alcohol-free. You can turn it off in Settings."
      />,
      !reminder.ready ? (
        <Skeleton key="loading" height={96} radius={theme.radius.md} />
      ) : reminderOn ? (
        <Panel
          key="done"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}
        >
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {`Reminder set for ${timeLabel} each day`}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              Change the time or turn it off in Settings.
            </Text>
          </View>
        </Panel>
      ) : (
        <View key="choose" style={{ gap: theme.spacing.sm }}>
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
            accessibilityLabel="Reminder time"
            style={{ flexDirection: "row", gap: theme.spacing.sm }}
          >
            {REMINDER_HOURS.map((option) => {
              const selected = hour === option;
              return (
                <View key={option} style={{ flex: 1 }}>
                  <PressScale
                    onPress={() => setHour(option)}
                    haptic="selection"
                    scaleTo={0.94}
                    accessibilityRole="radio"
                    accessibilityLabel={formatHour(option)}
                    accessibilityState={{ checked: selected }}
                    style={{
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      borderRadius: theme.radius.md,
                      borderWidth: 1.5,
                      borderColor: selected ? theme.colors.primary : theme.colors.textMuted,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    }}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
                    ) : null}
                    <Text
                      style={{
                        color: selected ? theme.colors.onPrimary : theme.colors.text,
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
        <Panel
          key="declined"
          style={{ flexDirection: "row", alignItems: "flex-start", padding: theme.spacing.lg }}
        >
          <Ionicons name="notifications-off-outline" size={22} color={theme.colors.warning} />
          <Text
            accessibilityLiveRegion="polite"
            style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}
          >
            Notifications are off for ShotOClock, so no reminder was set. Everything else works
            without it. To get the reminder later, allow notifications in your phone's settings,
            then turn it on in the app's Settings.
          </Text>
        </Panel>
      ) : null,
    ];
  }

  const body: ReactNode[] =
    stepId === "sport"
      ? sportStep()
      : stepId === "limit"
        ? limitStep()
        : stepId === "today"
          ? todayStep()
          : reminderStep();

  // The primary action names what it does; the quieter action under it is the way past a step
  // that is optional.
  const primary =
    stepId === "sport"
      ? { label: "Next: your weekly limit", disabled: !sport, onPress: () => next() }
      : stepId === "limit"
        ? { label: "Next: log today", disabled: limit === null, onPress: () => next() }
        : stepId === "today"
          ? {
              label: "Next: daily reminder",
              disabled: !hasEntry,
              onPress: () => next(todays.length > 0 ? "drink" : "alcohol_free"),
            }
          : reminderOn
            ? { label: "Finish setup", disabled: false, onPress: () => finish("on") }
            : declined
              ? { label: "Finish setup", disabled: false, onPress: () => finish("declined") }
              : reminderState === "busy"
                ? { label: "Setting up…", disabled: true, onPress: () => undefined }
                : {
                    label: `Turn on the ${formatHour(hour)} reminder`,
                    disabled: !reminder.ready,
                    onPress: () => void turnOn(),
                  };
  const secondary =
    stepId === "today" && !hasEntry
      ? { label: "Skip, I'll log later", onPress: () => next("skipped") }
      : stepId === "reminder" && !reminderOn && !declined && reminderState !== "busy"
        ? { label: "Not now, finish setup", onPress: () => finish("skipped") }
        : null;
  const progress = `Setup: step ${step + 1} of ${STEPS.length}`;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Welcome" }} />

      <View
        style={{
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <View style={{ width: 44 }}>
          {step > 0 ? (
            <Pressable
              onPress={() => go(step - 1)}
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
        <View style={{ alignItems: "center", gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
              fontVariant: ["tabular-nums"],
            }}
          >
            {progress}
          </Text>
          <StepDots count={STEPS.length} index={step} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scroll}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
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
          gap: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        {stepId === "today" && !hasEntry ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            Log a drink or mark the day alcohol-free to see your form rating.
          </Text>
        ) : null}
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
            borderWidth: 1,
            borderColor: primary.disabled ? theme.colors.textMuted : theme.colors.primary,
            backgroundColor: primary.disabled ? theme.colors.surfaceAlt : theme.colors.primary,
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
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            accessibilityLabel={secondary.label}
            style={({ pressed }) => ({
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
                textDecorationLine: "underline",
              }}
            >
              {secondary.label}
            </Text>
          </Pressable>
        ) : null}
        {stepId === "reminder" ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            After setup you'll see what ShotOClock Plus adds. It's optional: close it to keep
            using the free version.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
