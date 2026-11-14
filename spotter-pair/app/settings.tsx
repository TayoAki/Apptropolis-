// Settings: the partner's name, the answers the plan is built from, the daily nudge, the theme
// and the subscription. Every control here changes something the rest of the app reads.
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { haptic, Mascot, PressScale, Stagger } from "../components/motion";
import { DayToggles } from "../components/onboarding/Parts";
import { openPaywallFrom } from "../components/paywall/open";
import {
  ChoiceRow,
  NavRow,
  SectionLabel,
  SettingsCard,
  ToggleRow,
} from "../components/settings/rows";
import { matchPhone, pickPack, usePickedPack } from "../components/settings/themeChoice";
import { SupportButton, useSupport } from "../components/support";
import { track } from "../data/analytics";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import {
  EQUIPMENT_OPTIONS,
  MAX_TRAINING_DAYS,
  MIN_TRAINING_DAYS,
  splitAbout,
  trainingDaysLabel,
} from "../data/plan";
import { usePlanner } from "../data/planner";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import { GOAL_OPTIONS, count, formatClock, type PartnerUpdate } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { defaultThemeId, themes } from "../theme/tokens";

const TIMES: Array<[number, number]> = [
  [6, 0],
  [6, 30],
  [7, 0],
  [7, 30],
  [12, 0],
  [17, 30],
  [18, 0],
  [18, 30],
  [19, 30],
  [20, 0],
  [21, 0],
];
const TIME_OPTIONS = TIMES.map(([hour, minute]) => ({
  key: `${hour}:${minute}`,
  label: formatClock(hour, minute),
}));
/** The daily reminder's words. It fires every day at the chosen time, rest days included. */
const NUDGE = {
  title: "Time to train",
  body: "Open Spotter Pair for today's session and log your sets.",
};

const asOptions = (list: readonly string[]) => list.map((label) => ({ key: label, label }));

function Header() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {/* The back mark each platform uses: a chevron on iOS, an arrow on Android. */}
        <Ionicons
          name={Platform.OS === "android" ? "arrow-back" : "chevron-back"}
          size={Platform.OS === "android" ? 24 : 28}
          color={theme.colors.text}
        />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          flex: 1,
          textAlign: "center",
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        Settings
      </Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Mascot pose="rocco-neutral-ready" size={36} />
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, resetOnboarding } = useAppState();
  const planner = usePlanner();
  const reminder = useReminder();
  const purchases = usePurchases();
  const support = useSupport();
  const updates = useCollection<PartnerUpdate>("partner_updates");

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ goal?: string; days?: number[]; equipment?: string }>({});
  const [daysOpen, setDaysOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [planNote, setPlanNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const isPro = purchases.isPremium;
  const template = planner.template;
  // A partner is linked once an update from them has arrived; nothing in this version sends one.
  const paired = updates.items.some((u) => u.from === "partner");
  const partnerName = (answers.partner_name ?? "").trim();
  const nameValue = nameDraft ?? partnerName;

  // The plan's answers as they stand, and the changes picked here that aren't applied yet.
  const planDays = template?.days.map((day) => day.weekday) ?? [];
  const goal = draft.goal ?? template?.goal ?? "";
  const days = draft.days ?? planDays;
  const equipment = draft.equipment ?? template?.equipment ?? "";
  const daysValid = days.length >= MIN_TRAINING_DAYS && days.length <= MAX_TRAINING_DAYS;
  const dirty =
    template !== null &&
    (goal !== template.goal ||
      equipment !== template.equipment ||
      days.join(",") !== planDays.join(","));

  const timeKey = `${reminder.hour}:${reminder.minute}`;
  const restoring = purchases.status === "restoring";
  const blocked = reminder.permission === "denied";
  const pickedPack = usePickedPack();

  function saveName() {
    if (nameDraft === null) return;
    const next = nameDraft.replace(/\s+/g, " ").trim();
    setNameDraft(null);
    if (next !== partnerName) void setAnswer("partner_name", next);
  }

  function toggleDay(weekday: number) {
    const on = days.includes(weekday);
    if (!on && days.length >= MAX_TRAINING_DAYS) {
      haptic("warning");
      return;
    }
    haptic("selection");
    setPlanNote(null);
    setDraft((current) => ({
      ...current,
      days: (on ? days.filter((d) => d !== weekday) : [...days, weekday]).sort((a, b) => a - b),
    }));
  }

  /** Pro: applies the changed answers and lays the plan out again from today. */
  async function rebuild() {
    if (!dirty || !daysValid || rebuilding) return;
    setRebuilding(true);
    setPlanNote(null);
    try {
      await setAnswer("goal", goal);
      await setAnswer("equipment", equipment);
      const plan = await planner.build({ goal, days, equipment });
      if (!plan) throw new Error("no plan");
      haptic("success");
      setDraft({});
      setDaysOpen(false);
      setPlanNote({
        text: "Plan rebuilt. It applies from today; finished sessions are unchanged.",
        failed: false,
      });
      track("plan_regenerated", { days: plan.days.length, from: "settings" });
    } catch {
      setPlanNote({
        text: "The plan couldn't be rebuilt. Your choices are kept: try again.",
        failed: true,
      });
    } finally {
      setRebuilding(false);
    }
  }

  async function toggleNudge(on: boolean) {
    setReminderNote(null);
    if (!on) {
      await reminder.disable();
      return;
    }
    const ok = await reminder.enable(NUDGE);
    if (!ok)
      setReminderNote(
        "Notifications are off for Spotter Pair. Allow them in your phone's Settings, then turn this on again.",
      );
  }

  function chooseTime(key: string) {
    const [hour = 7, minute = 0] = key.split(":").map(Number);
    void reminder.setTime(hour, minute);
  }

  async function restore() {
    setRestoreNote(null);
    const ok = await purchases.restorePurchases();
    setRestoreNote(
      ok
        ? "Spotter Pair Pro is back on this phone."
        : "No earlier purchases were found for this account.",
    );
  }

  function openLink(url: string) {
    void Linking.openURL(url).catch(() => undefined);
  }

  /** A picked pack is saved, so it is still the app's theme the next time it opens. */
  function chooseTheme(id: string) {
    haptic("selection");
    pickPack(id);
  }

  function chooseMatchPhone() {
    haptic("selection");
    matchPhone();
  }

  const defaultPack = themes.find((pack) => pack.id === defaultThemeId);
  const reminderHelp = blocked
    ? "Notifications are off for Spotter Pair. Allow them in your phone's Settings to get your nudge."
    : "One reminder a day at this time, rest days included. It never mentions your weights.";
  const lock = <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <Header />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <Section label="PARTNER">
            <SettingsCard>
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                  <Avatar name={nameValue} size={56} />
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Partner's name (optional)
                    </Text>
                    <TextInput
                      value={nameValue}
                      onChangeText={setNameDraft}
                      onBlur={saveName}
                      onSubmitEditing={saveName}
                      placeholder="Their first name"
                      placeholderTextColor={theme.colors.textMuted}
                      accessibilityLabel="Partner's name, optional"
                      autoCapitalize="words"
                      autoCorrect={false}
                      maxLength={24}
                      returnKeyType="done"
                      style={{
                        minHeight: 48,
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.textMuted,
                        backgroundColor: theme.colors.background,
                      }}
                    />
                  </View>
                </View>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    lineHeight: 19,
                  }}
                >
                  {paired
                    ? "Linked. Their updates show on the Partner tab."
                    : "Not linked: two phones can't be linked in this version. The name is only used for this app's own labels, and your partner sees your week when you share your scorecard from the Partner tab."}
                </Text>
              </View>
            </SettingsCard>
          </Section>

          <Section label="TRAINING PLAN">
            {template === null ? (
              <SettingsCard>
                <NavRow
                  title="Set up my plan"
                  icon="barbell-outline"
                  onPress={() => void resetOnboarding()}
                />
              </SettingsCard>
            ) : (
              <SettingsCard
                footer={
                  <View
                    style={{
                      paddingHorizontal: theme.spacing.lg,
                      paddingBottom: theme.spacing.md,
                      gap: theme.spacing.md,
                    }}
                  >
                    {isPro && dirty ? (
                      <Button
                        label={rebuilding ? "Rebuilding your plan…" : "Rebuild my plan"}
                        icon={rebuilding ? undefined : "refresh"}
                        onPress={() => void rebuild()}
                        disabled={rebuilding || !daysValid}
                      />
                    ) : null}
                    <Text
                      accessibilityLiveRegion="polite"
                      style={{
                        color: planNote?.failed ? theme.colors.danger : theme.colors.textMuted,
                        fontSize: theme.font.size.caption,
                        lineHeight: 19,
                      }}
                    >
                      {planNote
                        ? planNote.text
                        : !isPro
                          ? "Your plan is built from these three answers. Changing them rebuilds it, which is part of Spotter Pair Pro."
                          : dirty
                            ? daysValid
                              ? "Not applied yet. Rebuilding lays the plan out again from today; finished sessions stay as they are."
                              : `Pick ${MIN_TRAINING_DAYS} to ${MAX_TRAINING_DAYS} training days to rebuild.`
                            : "Changing any of these rebuilds your plan from today. Finished sessions stay as they are."}
                    </Text>
                  </View>
                }
              >
                {isPro ? (
                  <ChoiceRow
                    title={`Goal: ${goal}`}
                    options={asOptions(GOAL_OPTIONS)}
                    selected={goal}
                    onChoose={(value) => {
                      setPlanNote(null);
                      setDraft((current) => ({ ...current, goal: value }));
                    }}
                  />
                ) : (
                  <NavRow
                    title={`Goal: ${goal}`}
                    chevron={false}
                    trailing={lock}
                    onPress={() => openPaywallFrom("settings_training")}
                  />
                )}
                {isPro ? (
                  <View>
                    <Pressable
                      onPress={() => setDaysOpen((open) => !open)}
                      accessibilityRole="button"
                      accessibilityLabel={`Training days: ${trainingDaysLabel(days)}`}
                      accessibilityState={{ expanded: daysOpen }}
                      aria-expanded={daysOpen}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        minHeight: 52,
                        paddingHorizontal: theme.spacing.lg,
                        paddingVertical: theme.spacing.md,
                        gap: theme.spacing.md,
                        backgroundColor: pressed ? theme.colors.surfaceAlt : undefined,
                      })}
                    >
                      <Text
                        style={{
                          flex: 1,
                          color: theme.colors.text,
                          fontSize: theme.font.size.body,
                        }}
                      >
                        {`Training days: ${trainingDaysLabel(days) || "none picked"}`}
                      </Text>
                      <Ionicons
                        name={daysOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                    {daysOpen ? (
                      <View
                        style={{
                          gap: theme.spacing.sm,
                          paddingHorizontal: theme.spacing.md,
                          paddingBottom: theme.spacing.md,
                        }}
                      >
                        <DayToggles selected={days} onToggle={toggleDay} />
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: theme.font.size.caption,
                          }}
                        >
                          {daysValid
                            ? `${count(days.length, "day")} a week: ${splitAbout(days.length)}.`
                            : `Pick ${MIN_TRAINING_DAYS} to ${MAX_TRAINING_DAYS} days.`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <NavRow
                    title={`Training days: ${trainingDaysLabel(days)}`}
                    chevron={false}
                    trailing={lock}
                    onPress={() => openPaywallFrom("settings_training")}
                  />
                )}
                {isPro ? (
                  <ChoiceRow
                    title={`Equipment: ${equipment}`}
                    options={asOptions(EQUIPMENT_OPTIONS)}
                    selected={equipment}
                    onChoose={(value) => {
                      setPlanNote(null);
                      setDraft((current) => ({ ...current, equipment: value }));
                    }}
                  />
                ) : (
                  <NavRow
                    title={`Equipment: ${equipment}`}
                    chevron={false}
                    trailing={lock}
                    onPress={() => openPaywallFrom("settings_training")}
                  />
                )}
              </SettingsCard>
            )}
          </Section>

          <Section label="DAILY NUDGE">
            <SettingsCard
              footer={
                <View
                  style={{
                    paddingHorizontal: theme.spacing.lg,
                    paddingBottom: theme.spacing.md,
                  }}
                >
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{
                      color:
                        reminderNote || blocked ? theme.colors.warning : theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                    }}
                  >
                    {reminderNote ?? reminderHelp}
                  </Text>
                </View>
              }
            >
              <ToggleRow
                title="Daily workout nudge"
                value={reminder.enabled}
                loading={!reminder.ready}
                onChange={(on) => void toggleNudge(on)}
              />
              <ChoiceRow
                title="Scheduled time"
                trailing={
                  <View
                    style={{
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.radius.sm,
                      backgroundColor: theme.colors.surfaceAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {formatClock(reminder.hour, reminder.minute)}
                    </Text>
                  </View>
                }
                options={TIME_OPTIONS}
                selected={timeKey}
                onChoose={chooseTime}
              />
            </SettingsCard>
          </Section>

          <Section label="VISUAL THEME">
            <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.sm }}>
              {/* The default: no pick is saved and the app follows the phone's light or dark mode. */}
              <PressScale
                onPress={chooseMatchPhone}
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityLabel="Match my phone's light and dark mode"
                accessibilityState={{ checked: pickedPack === null }}
                aria-checked={pickedPack === null}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  minHeight: 56,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  borderWidth: 2,
                  borderColor: pickedPack === null ? theme.colors.text : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    Match my phone
                  </Text>
                  <Text
                    style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                  >
                    {`${defaultPack?.name ?? "The app's theme"} in dark mode, its light partner in light mode`}
                  </Text>
                </View>
                <Ionicons
                  name={pickedPack === null ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={pickedPack === null ? theme.colors.primary : theme.colors.textMuted}
                />
              </PressScale>
              <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                {themes.map((pack) => {
                  const selected = pack.id === pickedPack;
                  return (
                    <View
                      key={pack.id}
                      style={{
                        flex: 1,
                        padding: 2,
                        borderRadius: theme.radius.sm + 4,
                        borderWidth: 2,
                        borderColor: selected ? theme.colors.text : theme.colors.background,
                      }}
                    >
                      <PressScale
                        onPress={() => chooseTheme(pack.id)}
                        scaleTo={0.94}
                        accessibilityRole="radio"
                        accessibilityLabel={`${pack.name}, ${pack.dark ? "dark" : "light"} theme`}
                        accessibilityState={{ checked: selected }}
                        aria-checked={selected}
                        style={{
                          height: 76,
                          borderRadius: theme.radius.sm,
                          backgroundColor: pack.colors.primary,
                          alignItems: "center",
                          justifyContent: "flex-end",
                          paddingHorizontal: 2,
                          paddingBottom: theme.spacing.sm,
                        }}
                      >
                        <Ionicons
                          name={pack.dark ? "moon" : "sunny"}
                          size={14}
                          color={pack.colors.onPrimary}
                          style={{ position: "absolute", top: 6, left: 6 }}
                        />
                        {selected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={pack.colors.onPrimary}
                            style={{ position: "absolute", top: 4, right: 4 }}
                          />
                        ) : null}
                        <Text
                          numberOfLines={2}
                          style={{
                            color: pack.colors.onPrimary,
                            fontSize: theme.font.size.caption,
                            lineHeight: 16,
                            fontWeight: theme.font.weight.bold,
                            textAlign: "center",
                          }}
                        >
                          {pack.name}
                        </Text>
                      </PressScale>
                    </View>
                  );
                })}
              </View>
            </View>
          </Section>

          <Section label="SUBSCRIPTION & SUPPORT">
            <SettingsCard
              footer={
                restoreNote ? (
                  <View
                    style={{
                      paddingHorizontal: theme.spacing.lg,
                      paddingBottom: theme.spacing.md,
                    }}
                  >
                    <Text
                      accessibilityLiveRegion="polite"
                      style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                    >
                      {restoreNote}
                    </Text>
                  </View>
                ) : undefined
              }
            >
              <NavRow
                title={isPro ? "Your Spotter Pair Pro plan" : "Get Spotter Pair Pro"}
                onPress={() => openPaywallFrom("settings")}
                trailing={
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.primary,
                    }}
                  >
                    <Ionicons name="star" size={16} color={theme.colors.onPrimary} />
                  </View>
                }
              />
              <NavRow
                title="Restore purchases"
                chevron={false}
                disabled={restoring}
                onPress={() => void restore()}
                trailing={
                  restoring ? (
                    <Text
                      style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                    >
                      Restoring…
                    </Text>
                  ) : undefined
                }
              />
              {appInfo.privacyUrl ? (
                <NavRow
                  title="Privacy policy"
                  chevron={false}
                  onPress={() => openLink(appInfo.privacyUrl)}
                  trailing={
                    <Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />
                  }
                />
              ) : null}
              {support.available ? (
                <View style={{ paddingHorizontal: theme.spacing.lg }}>
                  <SupportButton />
                </View>
              ) : null}
            </SettingsCard>
          </Section>
        </Stagger>

        <View style={{ alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
          {appInfo.termsUrl ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Terms of use"
              hitSlop={10}
              onPress={() => openLink(appInfo.termsUrl)}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
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
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            {`v${appInfo.version}`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
