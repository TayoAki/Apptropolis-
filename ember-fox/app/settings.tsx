import { Ionicons } from "@expo/vector-icons";
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
import { Stagger, haptic } from "../components/motion";
import { showPaywall } from "../components/paywallSource";
import { inOrder } from "../components/useAthlete";
import { Chips, SettingsRow, SettingsSection, Stepper } from "../components/settings/rows";
import { SupportButton, useSupport } from "../components/support";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import {
  SPORTS,
  dayKey,
  drinkName,
  lighterLimitFor,
  limitFrom,
  profileFrom,
  sportFrom,
  weekStart,
  weekStartsOn,
  type BodyType,
  type Checkin,
  type Drink,
  type WeeklyGoal,
} from "../data/schema";
import { usePurchases } from "../data/purchases";
import { useTheme } from "../theme/ThemeProvider";

const SPORT_OPTIONS = SPORTS.map((sport) => ({ id: sport.id, label: sport.label }));
const TRAINING_OPTIONS = [
  { id: "", label: "Not set" },
  ...["Wednesday & Saturday", "Tuesday & Thursday", "Saturday", "Sunday", "Every day"].map(
    (id) => ({ id, label: id }),
  ),
];
const LIMIT_CHOICES = [3, 4, 5, 6, 7, 8, 10, 12, 14];
const LIGHTER_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
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
const MANAGE_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

function clock(hour: number, minute: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

const TIME_OPTIONS = TIME_SLOTS.map(([h, m]) => ({ id: `${h}:${m}`, label: clock(h, m) }));

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

/** One at a time: each removal rewrites the whole collection, so they must not overlap. */
async function removeAll(rows: { id: string }[], remove: (id: string) => Promise<void>) {
  for (const row of rows) await remove(row.id);
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useAppState();
  const reminder = useReminder();
  const {
    isPremium,
    activeOffer,
    status,
    restorePurchases,
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

  // Preferences, saved as onboarding-style answers the rest of the app reads through
  // data/schema (sportFrom, limitFrom, weekStartsOn, profileFrom, gameWeekdays).
  const sport = sportFrom(answers);
  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? "";
  const training = answers.training_days ?? "";
  const limit = limitFrom(answers);
  const limitOptions = [...new Set([...LIMIT_CHOICES, limit])]
    .sort((a, b) => a - b)
    .map((n) => ({ id: n, label: String(n) }));
  const startsOn = weekStartsOn(answers);
  const weekStartsOnLabel = startsOn === 0 ? "Sunday" : "Monday";
  const profile = profileFrom(answers);
  const sexLabel = SEX_OPTIONS.find((o) => o.id === profile.bodyType)?.label ?? "Other";
  const timeId = `${reminder.hour}:${reminder.minute}`;
  const timeOptions = TIME_OPTIONS.some((o) => o.id === timeId)
    ? TIME_OPTIONS
    : [{ id: timeId, label: clock(reminder.hour, reminder.minute) }, ...TIME_OPTIONS];

  // A lighter limit for this week only (Plus): saved with the week it belongs to, so it lapses
  // by itself when the week ends.
  const weekKey = weekStart(new Date(), startsOn);
  const lighter = lighterLimitFor(answers, weekKey);
  const lighterOptions = [
    { id: -1, label: `Usual (${limit})` },
    ...LIGHTER_CHOICES.filter((n) => n < limit).map((n) => ({ id: n, label: String(n) })),
  ];

  function setLighter(next: number) {
    void setAnswer("week_override", next < 0 ? "" : `${weekKey}=${next}`);
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
        "Notifications are off for ShotOClock. Allow them in your phone's settings to get the nudge.",
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
    try {
      // Career counts from today on: earlier weeks are not turned back into results.
      await setAnswer("career_since", dayKey());
      await inOrder(async () => {
        await removeAll(checkins.items, checkins.remove);
        await removeAll(goals.items, goals.remove);
      });
      haptic("success");
      setStatusText("Career progress was reset. Your logged drinks are still here.");
    } catch {
      setStatusText("The reset didn't finish. Try again.");
    }
    setConfirm(null);
  }

  async function eraseAll() {
    try {
      await setAnswer("career_since", dayKey());
      await setAnswer("week_override", "");
      await inOrder(async () => {
        await removeAll(drinks.items, drinks.remove);
        await removeAll(checkins.items, checkins.remove);
        await removeAll(goals.items, goals.remove);
      });
      haptic("success");
      setStatusText("All logged data was erased from this phone.");
    } catch {
      setStatusText("The erase didn't finish. Try again.");
    }
    setConfirm(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerShown: true,
          // Opened directly (a link, a reload) there is nothing to go back to: offer the app.
          headerLeft: router.canGoBack()
            ? undefined
            : () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to Tonight"
                  hitSlop={12}
                  onPress={() => router.replace("/")}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
                </Pressable>
              ),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.xl,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <SettingsSection title="Athlete and sport">
            <SettingsRow
              icon="football-outline"
              tint="primary"
              label="Sport"
              value={sportLabel}
              open={open === "sport"}
              onPress={() => toggle("sport")}
            >
              {open === "sport" ? (
                <Chips
                  label="Sport"
                  options={SPORT_OPTIONS}
                  value={sport}
                  onChange={(id) => void setAnswer("sport", id)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="calendar-outline"
              tint="primary"
              label="Game and training days"
              subtitle={training || "Not set. Pick your days to mark them on Week."}
              open={open === "training"}
              onPress={() => toggle("training")}
            >
              {open === "training" ? (
                <Chips
                  label="Game and training days"
                  options={TRAINING_OPTIONS}
                  value={training}
                  onChange={(id) => void setAnswer("training_days", id)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="speedometer-outline"
              tint="primary"
              label="Weekly limit"
              value={`${limit} ${limit === 1 ? "drink" : "drinks"}`}
              open={open === "limit"}
              onPress={() => toggle("limit")}
            >
              {open === "limit" ? (
                <Chips
                  label="Weekly limit, in standard drinks"
                  options={limitOptions}
                  value={limit}
                  onChange={(n) => void setAnswer("weekly_limit", String(n))}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon={isPremium ? "trending-down-outline" : "lock-closed-outline"}
              tint="primary"
              label="Lighter limit this week"
              subtitle={
                isPremium
                  ? "For a match or race week. Goes back to your usual limit next week."
                  : "Part of Plus. For a match or race week."
              }
              value={isPremium ? (lighter === null ? "Off" : `${lighter} drinks`) : "Plus"}
              open={isPremium ? open === "lighter" : undefined}
              onPress={() => (isPremium ? toggle("lighter") : showPaywall("settings"))}
              accessibilityLabel={
                isPremium ? "Lighter limit this week" : "Lighter limit this week. Part of Plus. See plans"
              }
            >
              {isPremium && open === "lighter" ? (
                <Chips
                  label="Limit for this week only, in standard drinks"
                  options={lighterOptions}
                  value={lighter ?? -1}
                  onChange={(n) => setLighter(n)}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="sync-outline"
              tint="primary"
              label="Week starts on"
              value={weekStartsOnLabel}
              open={open === "week"}
              onPress={() => toggle("week")}
            >
              {open === "week" ? (
                <Chips
                  label="Week starts on"
                  options={WEEK_OPTIONS}
                  value={weekStartsOnLabel}
                  onChange={(id) => void setAnswer("week_start", id)}
                />
              ) : null}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            title="BAC estimate"
            footer="Used only for the rough blood alcohol estimate on Tonight. Other uses a value midway between male and female. The estimate is never a reason to drive."
          >
            <SettingsRow
              icon="scale-outline"
              tint="accent"
              label="Body weight"
              subtitle={profile.weightSet ? undefined : "Default. Set yours for a closer estimate."}
              value={`${profile.weightLbs} lb`}
              open={open === "weight"}
              onPress={() => toggle("weight")}
            >
              {open === "weight" ? (
                <Stepper
                  label="body weight"
                  value={profile.weightLbs}
                  min={80}
                  max={400}
                  step={5}
                  format={(n) => `${n} lb`}
                  onChange={(n) => void setAnswer("weight_lbs", String(n))}
                />
              ) : null}
            </SettingsRow>
            <SettingsRow
              icon="person-outline"
              tint="accent"
              label="Sex or body profile"
              value={sexLabel}
              open={open === "sex"}
              onPress={() => toggle("sex")}
            >
              {open === "sex" ? (
                <Chips
                  label="Sex or body profile"
                  options={SEX_OPTIONS}
                  value={profile.bodyType}
                  onChange={(id) => void setAnswer("body_type", id)}
                />
              ) : null}
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            title="Reminders"
            footer="One quiet notification a day, from this phone. No texts and no nagging."
          >
            <SettingsRow
              icon="notifications-outline"
              tint="primary"
              label="Quiet pre-game nudge"
              chevron={false}
              trailing={
                <Switch
                  value={reminder.enabled}
                  onValueChange={(on) => void toggleNudge(on)}
                  trackColor={{ false: theme.colors.textMuted, true: theme.colors.success }}
                  thumbColor={theme.dark ? theme.colors.text : theme.colors.background}
                  ios_backgroundColor={theme.colors.textMuted}
                  accessibilityLabel="Quiet pre-game nudge"
                />
              }
            >
              {nudgeNote ? (
                <Text
                  accessibilityLiveRegion="polite"
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
              tint="primary"
              label="Check-in time"
              value={clock(reminder.hour, reminder.minute)}
              open={open === "time"}
              onPress={() => toggle("time")}
            >
              {open === "time" ? (
                <Chips
                  label="Check-in time"
                  options={timeOptions}
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
                icon="star-outline"
                tint="primary"
                label="ShotOClock Plus is active"
                value={activeOffer ? activeOffer.label : undefined}
                onPress={() => showPaywall("settings")}
                accessibilityLabel="ShotOClock Plus is active. See your plan"
              />
            ) : (
              <SettingsRow
                icon="star-outline"
                tint="primary"
                label="ShotOClock Plus"
                value="See plans"
                onPress={() => showPaywall("settings")}
              />
            )}
            {isPremium ? (
              <SettingsRow
                icon="card-outline"
                tint="primary"
                label="Manage or cancel"
                subtitle={`Opens your ${Platform.OS === "ios" ? "App Store" : "Google Play"} subscriptions, where the renewal date is shown.`}
                onPress={() => void Linking.openURL(MANAGE_URL)}
              />
            ) : null}
            <SettingsRow
              icon="refresh-outline"
              tint="primary"
              label="Restore purchases"
              value={status === "restoring" ? "Restoring…" : undefined}
              subtitle={restoreNote ?? undefined}
              onPress={() => void restoreNow()}
            />
          </SettingsSection>

          <SettingsSection
            title="Data and privacy"
            footer={
              status_ ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    color: theme.colors.success,
                    fontSize: theme.font.size.caption,
                    paddingHorizontal: theme.spacing.sm,
                  }}
                >
                  {status_}
                </Text>
              ) : (
                "Logged drinks, check-ins and weekly results stay on this phone until you erase them."
              )
            }
          >
            <SettingsRow
              icon="share-outline"
              tint="primary"
              label="Export drink log (CSV)"
              onPress={() => void exportHistory()}
            />
            <SettingsRow
              icon="arrow-undo-outline"
              tint="textMuted"
              label="Reset career progress"
              value="Keeps drinks"
              onPress={() => askConfirm("reset")}
            />
            <SettingsRow
              icon="trash-outline"
              tint="danger"
              label="Erase all data"
              labelTint="danger"
              strong
              chevron={false}
              onPress={() => askConfirm("erase")}
            />
            {confirm ? (
              <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
                  {confirm === "erase"
                    ? "Erase every drink, check-in and weekly result on this phone? This can't be undone."
                    : "Reset weekly results and alcohol-free days? Your logged drinks stay."}
                </Text>
                <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    onPress={() => setConfirm(null)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      borderRadius: theme.radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.textMuted,
                      backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={confirm === "erase" ? "Erase my data" : "Reset my progress"}
                    onPress={() => void (confirm === "erase" ? eraseAll() : resetProgress())}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      borderRadius: theme.radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.danger,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.onPrimary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {confirm === "erase" ? "Erase my data" : "Reset my progress"}
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
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    textDecorationLine: "underline",
                  }}
                >
                  Privacy policy
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
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    textDecorationLine: "underline",
                  }}
                >
                  Terms of use
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
