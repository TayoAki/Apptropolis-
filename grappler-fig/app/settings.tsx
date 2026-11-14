// Settings: the fight profile, timer and callout defaults, the daily camp reminder, membership,
// appearance, support and legal. Preferences are saved as onboarding answers, so the rest of the
// app reads them the same way it reads what onboarding collected.
import { Stack } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { Lottie } from "../components/lottie";
import { Appear, haptic, Skeleton, Stagger } from "../components/motion";
import {
  Segmented,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  Wheel,
} from "../components/settings/controls";
import { SupportButton, useSupport } from "../components/support";
import { AppSwitch, TextButton } from "../components/ui";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases, type Offer } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { formatClock, type Stance } from "../data/schema";
import { useAppearance, useTheme, type Appearance } from "../theme/ThemeProvider";

type Callouts = "names" | "numbers";
type Panel = "round" | "rest" | "reminder";

/** Round lengths from 1:00 to 5:00, in 15-second steps. */
const ROUND_SECONDS = Array.from({ length: 17 }, (_, i) => 60 + i * 15);
/** Rest from 0:15 to 3:00. */
const REST_SECONDS = Array.from({ length: 12 }, (_, i) => 15 + i * 15);
/** Reminder times every half hour, as minutes after midnight. */
const REMINDER_MINUTES = Array.from({ length: 48 }, (_, i) => i * 30);

/** What the rows show before anything is chosen (the same starting points Train uses). */
const DEFAULTS = { skill: "Amateur sparring", round: 180, rest: 60 };

const STANCES: { value: Stance; label: string }[] = [
  { value: "orthodox", label: "Orthodox" },
  { value: "southpaw", label: "Southpaw" },
];
const CALLOUTS: { value: Callouts; label: string }[] = [
  { value: "names", label: "Punch names" },
  { value: "numbers", label: "Numbers 1–6" },
];
const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const MANAGE_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : Platform.OS === "android"
      ? "https://play.google.com/store/account/subscriptions"
      : null;

function nearest(values: number[], target: number): number {
  return values.reduce(
    (best, value) => (Math.abs(value - target) < Math.abs(best - target) ? value : best),
    values[0]!,
  );
}

/** 390 minutes after midnight reads "6:30 AM". */
function clockOfDay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** When a paid period renews, counted from the purchase. Lifetime never renews. */
function renewsOn(since: string, period: Offer["period"]): string | null {
  if (period === "lifetime") return null;
  const date = new Date(since);
  if (period === "week") date.setDate(date.getDate() + 7);
  else if (period === "month") date.setMonth(date.getMonth() + 1);
  else date.setFullYear(date.getFullYear() + 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** The inline panel that opens under a row to hold its picker. */
function PickerPanel({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Appear distance={8} duration={280}>
      <View
        style={{
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        {children}
      </View>
    </Appear>
  );
}

/** Shaped like the sections while the saved preferences load. */
function SettingsSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading settings"
      style={{ gap: theme.spacing.xl }}
    >
      {[2, 3, 1].map((rows, group) => (
        <View key={group} style={{ gap: theme.spacing.sm }}>
          <Skeleton width={140} height={14} />
          <View
            style={{
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} width={row % 2 ? "45%" : "70%"} height={16} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const app = useAppState();
  const purchases = usePurchases();
  const reminder = useReminder();
  const [appearance, setAppearance] = useAppearance();
  const support = useSupport();
  const [open, setOpen] = useState<Panel | null>(null);
  const [restored, setRestored] = useState<"idle" | "restored" | "none">("idle");

  const loading = !app.ready || !purchases.ready || !reminder.ready;
  const toggle = (name: Panel) => setOpen((current) => (current === name ? null : name));

  const { answers } = app;
  const stance: Stance = answers.stance === "southpaw" ? "southpaw" : "orthodox";
  const callouts: Callouts = answers.callouts === "numbers" ? "numbers" : "names";
  const ducking = answers.musicducking !== "off";
  const roundSeconds = nearest(ROUND_SECONDS, Number(answers.roundseconds) || DEFAULTS.round);
  const restSeconds = nearest(REST_SECONDS, Number(answers.restseconds) || DEFAULTS.rest);
  const reminderMinute = reminder.hour * 60 + reminder.minute;
  const reminderSlot = nearest(REMINDER_MINUTES, reminderMinute);

  const { isPremium, activeOffer, entitlement, status } = purchases;
  const renews =
    activeOffer && entitlement ? renewsOn(entitlement.since, activeOffer.period) : null;
  const membership = !isPremium
    ? "Free plan"
    : renews
      ? `Active · renews ${renews}`
      : "Active · lifetime";

  async function setReminderOn(on: boolean) {
    haptic("selection");
    if (!on) {
      await reminder.disable();
      return;
    }
    const ok = await reminder.enable({
      title: "Daily camp",
      body: "Your round is ready: three minutes of named callouts.",
    });
    if (ok) haptic("success");
  }

  async function restore() {
    if (status !== "idle") return;
    const ok = await purchases.restorePurchases();
    setRestored(ok ? "restored" : "none");
    if (ok) haptic("success");
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
      >
        {loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <Stagger step={70} style={{ gap: theme.spacing.xl }}>
              <SettingsGroup title="Fight profile">
                <SettingsRow
                  label="Skill level"
                  value={answers.skilllevel || DEFAULTS.skill}
                  onPress={() => void app.resetOnboarding()}
                  accessibilityLabel={`Skill level ${answers.skilllevel || DEFAULTS.skill}, change`}
                />
                <SettingsRow
                  label="Stance"
                  right={
                    <Segmented
                      accessibilityLabel="Stance"
                      options={STANCES}
                      value={stance}
                      onChange={(next) => void app.setAnswer("stance", next)}
                      style={{ width: 208 }}
                    />
                  }
                />
              </SettingsGroup>

              <SettingsGroup title="Timer & callouts">
                <SettingsRow
                  label="Round duration"
                  value={formatClock(roundSeconds)}
                  onPress={() => toggle("round")}
                  accessibilityLabel={`Round duration ${formatClock(roundSeconds)}`}
                >
                  {open === "round" ? (
                    <PickerPanel>
                      <Wheel
                        values={ROUND_SECONDS}
                        value={roundSeconds}
                        format={formatClock}
                        onChange={(next) => void app.setAnswer("roundseconds", String(next))}
                        accessibilityLabel="Round duration"
                      />
                    </PickerPanel>
                  ) : null}
                </SettingsRow>
                <SettingsRow
                  label="Rest period"
                  value={formatClock(restSeconds)}
                  onPress={() => toggle("rest")}
                  accessibilityLabel={`Rest period ${formatClock(restSeconds)}`}
                >
                  {open === "rest" ? (
                    <PickerPanel>
                      <Wheel
                        values={REST_SECONDS}
                        value={restSeconds}
                        format={formatClock}
                        onChange={(next) => void app.setAnswer("restseconds", String(next))}
                        accessibilityLabel="Rest period"
                      />
                    </PickerPanel>
                  ) : null}
                </SettingsRow>
                <SettingsRow
                  label="Callout style"
                  stacked
                  right={
                    <Segmented
                      accessibilityLabel="Callout style"
                      options={CALLOUTS}
                      value={callouts}
                      onChange={(next) => void app.setAnswer("callouts", next)}
                      style={{ width: "100%" }}
                    />
                  }
                />
                <SettingsRow
                  label="Music ducking"
                  right={
                    <AppSwitch
                      label="Music ducking"
                      value={ducking}
                      onValueChange={(on) => {
                        haptic("selection");
                        void app.setAnswer("musicducking", on ? "on" : "off");
                      }}
                    />
                  }
                />
              </SettingsGroup>

              <SettingsGroup title="Notifications">
                <SettingsRow
                  label="Daily camp reminder"
                  value={reminder.enabled ? clockOfDay(reminderMinute) : "Off"}
                  onPress={() => toggle("reminder")}
                  accessibilityLabel={
                    reminder.enabled
                      ? `Daily camp reminder at ${clockOfDay(reminderMinute)}`
                      : "Daily camp reminder, off"
                  }
                >
                  {open === "reminder" ? (
                    <PickerPanel>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: 44,
                          gap: theme.spacing.md,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.font.size.body,
                            fontWeight: theme.font.weight.medium,
                          }}
                        >
                          Send a reminder
                        </Text>
                        <AppSwitch
                          label="Send a daily reminder"
                          value={reminder.enabled}
                          onValueChange={(on) => void setReminderOn(on)}
                        />
                      </View>
                      {reminder.enabled ? (
                        <Wheel
                          values={REMINDER_MINUTES}
                          value={reminderSlot}
                          format={clockOfDay}
                          onChange={(next) =>
                            void reminder.setTime(Math.floor(next / 60), next % 60)
                          }
                          accessibilityLabel="Reminder time"
                        />
                      ) : null}
                      {reminder.permission === "denied" ? (
                        <>
                          <SettingsNote>
                            {`Notifications are off for ${appInfo.name}, so the reminder can't ring. Allow them in your phone's settings.`}
                          </SettingsNote>
                          <TextButton
                            label="Open notification settings"
                            onPress={() => void Linking.openSettings()}
                            style={{ alignSelf: "flex-start" }}
                          />
                        </>
                      ) : null}
                    </PickerPanel>
                  ) : null}
                </SettingsRow>
              </SettingsGroup>

              <SettingsGroup title="Account & membership">
                <SettingsRow
                  label="Pro Cornerman"
                  value={membership}
                  active={isPremium}
                  onPress={() => purchases.openPaywall()}
                  accessibilityLabel={`Pro Cornerman, ${membership}`}
                />
                <SettingsRow
                  label={status === "restoring" ? "Restoring purchases…" : "Restore purchases"}
                  detail={
                    purchases.testMode
                      ? "Purchases are simulated in this build. Nothing is charged."
                      : undefined
                  }
                  accent
                  chevron={false}
                  onPress={() => void restore()}
                />
                {restored === "restored" ? (
                  <SettingsRow
                    label="Premium is active on this phone."
                    right={<Lottie name="success" size={36} />}
                  />
                ) : null}
                {restored === "none" ? (
                  <SettingsRow
                    label={purchases.error ?? "No purchases to restore on this account."}
                  />
                ) : null}
              </SettingsGroup>

              <SettingsGroup title="Appearance">
                <SettingsRow
                  label="Appearance"
                  right={
                    <Segmented
                      accessibilityLabel="Appearance"
                      options={APPEARANCES}
                      value={appearance}
                      onChange={setAppearance}
                      style={{ width: 208 }}
                    />
                  }
                />
              </SettingsGroup>

              <SettingsGroup title="Support & legal">
                {support.available ? (
                  <SupportButton
                    label="Contact support"
                    style={{
                      minHeight: 52,
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                    }}
                  />
                ) : null}
                {appInfo.privacyUrl ? (
                  <SettingsRow
                    label="Privacy policy"
                    onPress={() => void Linking.openURL(appInfo.privacyUrl)}
                  />
                ) : null}
                {appInfo.termsUrl ? (
                  <SettingsRow
                    label="Terms of use"
                    onPress={() => void Linking.openURL(appInfo.termsUrl)}
                  />
                ) : null}
                {isPremium && MANAGE_URL ? (
                  <SettingsRow
                    label="Manage subscription"
                    onPress={() => void Linking.openURL(MANAGE_URL)}
                  />
                ) : null}
              </SettingsGroup>

              <SettingsGroup title="About">
                <SettingsRow
                  label="Replay onboarding"
                  detail="Pick your level and setup again"
                  onPress={() => void app.resetOnboarding()}
                />
              </SettingsGroup>
            </Stagger>

            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
                marginTop: theme.spacing.xl,
              }}
            >
              {`${appInfo.name} v${appInfo.version}`}
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}
