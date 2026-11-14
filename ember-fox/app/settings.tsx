import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Appear, Mascot, Stagger, haptic } from "../components/motion";
import { Chips, SettingsRow, SettingsSection, Stepper } from "../components/settings/rows";
import { SupportButton, useSupport } from "../components/support";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import {
  DEFAULT_PROFILE,
  SPORTS,
  dayKey,
  drinkName,
  weekStart,
  type BodyType,
  type Checkin,
  type Drink,
  type Sport,
  type WeeklyGoal,
} from "../data/schema";
import { usePurchases } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

const SPORT_OPTIONS = SPORTS.map((sport) => ({ id: sport.id, label: sport.label }));
const TRAINING_OPTIONS = [
  "Wednesday & Saturday",
  "Tuesday & Thursday",
  "Saturday",
  "Sunday",
  "Every day",
].map((id) => ({ id, label: id }));
const LIMIT_OPTIONS = [4, 5, 6, 7, 8, 10, 12, 14].map((n) => ({ id: n, label: String(n) }));
const WEEK_OPTIONS = [
  { id: "Monday", label: "Monday" },
  { id: "Sunday", label: "Sunday" },
];
const SEX_OPTIONS: { id: BodyType; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];
const TIME_SLOTS: [number, number][] = [
  [18, 0],
  [19, 0],
  [20, 0],
  [20, 30],
  [21, 0],
  [22, 0],
];
const DEFAULT_LBS = Math.round(DEFAULT_PROFILE.weightKg / 0.45359237);
const MANAGE_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

function clock(hour: number, minute: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

const TIME_OPTIONS = TIME_SLOTS.map(([h, m]) => ({ id: `${h}:${m}`, label: clock(h, m) }));

/** The month a subscription next renews, from when it started. */
function renewsOn(since: string, period: "week" | "month" | "year" | "lifetime"): string | null {
  if (period === "lifetime") return null;
  const date = new Date(since);
  if (period === "week") date.setDate(date.getDate() + 7);
  else if (period === "month") date.setMonth(date.getMonth() + 1);
  else date.setFullYear(date.getFullYear() + 1);
  return date.toLocaleDateString([], { month: "short", year: "numeric" });
}

function drinkCsv(drinks: Drink[]): string {
  const rows = [...drinks]
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .map((d) =>
      [dayKey(d.logged_at), d.logged_at, drinkName(d.label), d.standard_drinks, d.edited ? "yes" : "no"].join(
        ",",
      ),
    );
  return ["date,logged_at,drink,standard_drinks,edited", ...rows].join("\n");
}

async function removeAll(rows: { id: string }[], remove: (id: string) => Promise<void>) {
  await Promise.all(rows.map((row) => remove(row.id)));
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useAppState();
  const reminder = useReminder();
  const {
    isPremium,
    activeOffer,
    entitlement,
    status,
    restorePurchases,
    openPaywall,
  } = usePurchases();
  const support = useSupport();
  const drinks = useCollection<Drink>("drinks");
  const checkins = useCollection<Checkin>("checkins");
  const goals = useCollection<WeeklyGoal>("weekly_goals");

  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"reset" | "erase" | null>(null);
  const [status_, setStatusText] = useState<string | null>(null);
  const [nudgeNote, setNudgeNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  // Preferences, saved as onboarding-style answers the rest of the app can read.
  const sport = (answers.sport as Sport | undefined) ?? "team";
  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? "Soccer / basketball";
  const training = answers.training_days ?? "Wednesday & Saturday";
  const limit = Number(answers.weekly_limit ?? 7);
  const weekStartsOn = answers.week_start ?? "Monday";
  const startsOn = weekStartsOn === "Sunday" ? 0 : 1;
  const weight = Number(answers.weight_lbs ?? DEFAULT_LBS);
  const bodyType = (answers.body_type as BodyType | undefined) ?? DEFAULT_PROFILE.bodyType;
  const sexLabel = SEX_OPTIONS.find((o) => o.id === bodyType)?.label ?? "Other";
  const timeId = `${reminder.hour}:${reminder.minute}`;
  const renews =
    entitlement && activeOffer ? renewsOn(entitlement.since, activeOffer.period) : null;

  async function setLimit(next: number) {
    void setAnswer("weekly_limit", String(next));
    const current = weekStart(new Date(), startsOn);
    const goal = goals.items.find((g) => g.week_start === current);
    if (goal) await goals.update(goal.id, { limit: next, goal_met: goal.total_drinks <= next });
  }

  async function toggleNudge(on: boolean) {
    setNudgeNote(null);
    if (!on) {
      await reminder.disable();
      return;
    }
    const allowed = await reminder.enable({
      title: "Quiet pre-game check-in",
      body: "Log tonight's drinks, or mark an alcohol-free day.",
    });
    if (!allowed)
      setNudgeNote(
        "Notifications for ShotOClock are off. Allow them in your phone's Settings to get the nudge.",
      );
  }

  async function restoreNow() {
    setRestoreNote(null);
    const ok = await restorePurchases();
    setRestoreNote(ok ? "Your purchases are restored." : "No purchases to restore on this account.");
  }

  async function exportHistory() {
    if (drinks.items.length === 0) {
      setStatusText("Nothing logged yet to export.");
      return;
    }
    try {
      await Share.share({ title: "ShotOClock drink log", message: drinkCsv(drinks.items) });
    } catch {
      setStatusText("Couldn't open the share sheet. Try again.");
    }
  }

  function askConfirm(kind: "reset" | "erase") {
    haptic("warning");
    setStatusText(null);
    setConfirm(kind);
  }

  async function resetProgress() {
    await Promise.all([
      removeAll(checkins.items, checkins.remove),
      removeAll(goals.items, goals.remove),
    ]);
    haptic("success");
    setConfirm(null);
    setStatusText("Career progress was reset. Your logged drinks are still here.");
  }

  async function eraseAll() {
    await Promise.all([
      removeAll(drinks.items, drinks.remove),
      removeAll(checkins.items, checkins.remove),
      removeAll(goals.items, goals.remove),
    ]);
    haptic("success");
    setConfirm(null);
    setStatusText("All logged data was erased from this phone.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.xl,
        }}
      >
        <Appear>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "flex-start",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={30} color={theme.colors.text} />
          </Pressable>
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
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Settings
            </Text>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceAlt,
                shadowColor: theme.colors.primary,
                shadowOpacity: 0.7,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}
            >
              <Mascot pose="dash-match-ready" size={60} />
            </View>
          </View>
        </Appear>

        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <SettingsSection title="Athlete & Sport">
            <SettingsRow
              icon="football-outline"
              tint="primary"
              label="Primary Sport"
              value={sportLabel}
              open={open === "sport"}
              onPress={() => toggle("sport")}
            >
              {open === "sport" ? (
                <Chips
                  label="Primary sport"
                  options={SPORT_OPTIONS}
                  value={sport}
                  onChange={(id) => void setAnswer("sport", id)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="calendar-outline"
              tint="primary"
              label="Next Match / Training Days"
              subtitle={training}
              open={open === "training"}
              onPress={() => toggle("training")}
            >
              {open === "training" ? (
                <Chips
                  label="Next match or training days"
                  options={TRAINING_OPTIONS}
                  value={training}
                  onChange={(id) => void setAnswer("training_days", id)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="beer-outline"
              tint="primary"
              label="Weekly Drink Limit"
              value={`${limit} standard drinks`}
              open={open === "limit"}
              onPress={() => toggle("limit")}
            >
              {open === "limit" ? (
                <Chips
                  label="Weekly drink limit"
                  options={LIMIT_OPTIONS}
                  value={limit}
                  onChange={(n) => void setLimit(n)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="sync-outline"
              tint="accent"
              label="Week Starts On"
              value={weekStartsOn}
              open={open === "week"}
              onPress={() => toggle("week")}
            >
              {open === "week" ? (
                <Chips
                  label="Week starts on"
                  options={WEEK_OPTIONS}
                  value={weekStartsOn}
                  onChange={(id) => void setAnswer("week_start", id)}
                />
              ) : null}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            title="BAC Metabolism Calibration"
            footer="Used strictly for formulaic metabolic burn estimates. Never consider estimates safe for driving decisions."
          >
            <SettingsRow
              icon="scale-outline"
              tint="accent"
              label="Body Weight"
              value={`${weight} lbs`}
              open={open === "weight"}
              onPress={() => toggle("weight")}
            >
              {open === "weight" ? (
                <Stepper
                  label="Body weight"
                  value={weight}
                  min={80}
                  max={400}
                  format={(n) => `${n} lbs`}
                  onChange={(n) => void setAnswer("weight_lbs", String(n))}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="person-outline"
              tint="accent"
              label="Biological Sex / Profile"
              value={sexLabel}
              open={open === "sex"}
              onPress={() => toggle("sex")}
            >
              {open === "sex" ? (
                <Chips
                  label="Biological sex or profile"
                  options={SEX_OPTIONS}
                  value={bodyType}
                  onChange={(id) => void setAnswer("body_type", id)}
                />
              ) : null}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            title="Reminders & Coaching"
            footer="Single quiet notification. No spam or nagging text messages."
          >
            <SettingsRow
              icon="notifications-outline"
              tint="primary"
              label="Quiet Pre-Game Nudge"
              chevron={false}
              trailing={
                <Switch
                  value={reminder.enabled}
                  onValueChange={(on) => void toggleNudge(on)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                  thumbColor={theme.colors.text}
                  ios_backgroundColor={theme.colors.border}
                  accessibilityLabel="Quiet pre-game nudge"
                />
              }
            >
              {nudgeNote ? (
                <Text
                  style={{
                    color: theme.colors.warning,
                    fontSize: theme.font.size.caption,
                    paddingHorizontal: theme.spacing.md,
                    paddingBottom: theme.spacing.md,
                  }}
                >
                  {nudgeNote}
                </Text>
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="time-outline"
              tint="accent"
              label="Check-In Time"
              value={clock(reminder.hour, reminder.minute)}
              open={open === "time"}
              onPress={() => toggle("time")}
            >
              {open === "time" ? (
                <Chips
                  label="Check-in time"
                  options={TIME_OPTIONS}
                  value={timeId}
                  onChange={(id) => {
                    const [h, m] = id.split(":").map(Number);
                    void reminder.setTime(h ?? 20, m ?? 0);
                  }}
                />
              ) : null}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Membership">
            {isPremium ? (
              <SettingsRow
                label="ShotOClock Plus: Active"
                labelTint="primary"
                strong
                value={renews ? `Renews ${renews}` : "Lifetime"}
                valueTint="primary"
                onPress={() => void Linking.openURL(MANAGE_URL)}
                accessibilityLabel="ShotOClock Plus is active. Manage subscription"
              />
            ) : (
              <SettingsRow label="ShotOClock Plus" value="See plans" onPress={() => openPaywall()} />
            )}
            <SettingsRow
              label="Manage Subscription"
              onPress={() => void Linking.openURL(MANAGE_URL)}
            />
            <SettingsRow
              label="Restore Purchases"
              value={status === "restoring" ? "Restoring…" : undefined}
              subtitle={restoreNote ?? undefined}
              onPress={() => void restoreNow()}
            />
          </SettingsSection>

          <SettingsSection
            title="Data & Privacy"
            footer={
              status_ ? (
                <Text
                  style={{
                    color: theme.colors.success,
                    fontSize: theme.font.size.caption,
                    paddingHorizontal: theme.spacing.sm,
                  }}
                >
                  {status_}
                </Text>
              ) : (
                "Logged drinks, check-ins and goals stay on this phone until you erase them."
              )
            }
          >
            <SettingsRow
              icon="share-outline"
              tint="primary"
              label="Export Logged History (.CSV)"
              onPress={() => void exportHistory()}
            />
            <SettingsRow
              label="Reset Career Progress"
              labelTint="textMuted"
              value="Keeps drinks"
              onPress={() => askConfirm("reset")}
            />
            <SettingsRow
              label="Erase All Data"
              labelTint="danger"
              strong
              chevron={false}
              onPress={() => askConfirm("erase")}
            />
            {confirm ? (
              <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
                  {confirm === "erase"
                    ? "Erase every drink, check-in and weekly goal on this phone? This can't be undone."
                    : "Reset weekly goals and alcohol-free days? Your logged drinks stay."}
                </Text>
                <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={confirm === "erase" ? "Erase my data" : "Reset my progress"}
                    onPress={() => void (confirm === "erase" ? eraseAll() : resetProgress())}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 44,
                      borderRadius: theme.radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.danger,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.background,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {confirm === "erase" ? "Erase my data" : "Reset my progress"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    onPress={() => setConfirm(null)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 44,
                      borderRadius: theme.radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {support.available ? (
              <View style={{ paddingHorizontal: theme.spacing.md }}>
                <SupportButton />
              </View>
            ) : null}
          </SettingsSection>
        </Stagger>

        <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            {`${appInfo.name} v${appInfo.version}`}
          </Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
            {appInfo.privacyUrl ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Privacy policy"
                hitSlop={10}
                onPress={() => void Linking.openURL(appInfo.privacyUrl)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  Privacy Policy
                </Text>
              </Pressable>
            ) : null}
            {appInfo.termsUrl ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Terms of use"
                hitSlop={10}
                onPress={() => void Linking.openURL(appInfo.termsUrl)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  Terms of Use
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
