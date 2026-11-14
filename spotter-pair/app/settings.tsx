import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, PARTNER_PHOTO } from "../components/Avatar";
import { Button } from "../components/Button";
import { haptic, Mascot, PressScale, Stagger } from "../components/motion";
import {
  ChoiceRow,
  NavRow,
  SectionLabel,
  SettingsCard,
  ToggleRow,
} from "../components/settings/rows";
import { SupportButton, useSupport } from "../components/support";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { DAYS_PER_WEEK_OPTIONS, GOAL_OPTIONS, formatClock } from "../data/schema";
import { setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";
import { themes } from "../theme/tokens";

const PARTNER = { name: "Marcus S.", linkedSince: "Sept 2024" };

// Goal and days a week are the answers onboarding saved ("goal", "daysperweek"), with the same
// choices, so changing them here changes what the rest of the app reads.
const GOALS: string[] = [...GOAL_OPTIONS];
const FREQUENCIES = DAYS_PER_WEEK_OPTIONS.map((key) => ({ key, label: `${key} a week` }));
const DEFAULT_FREQUENCY = "4 days";
const EQUIPMENT = ["Full commercial gym", "Home dumbbells", "Bodyweight only", "Resistance bands"];
const TIMES: Array<[number, number]> = [
  [6, 0],
  [6, 30],
  [7, 0],
  [7, 30],
  [12, 0],
  [17, 30],
  [18, 30],
  [19, 30],
  [20, 0],
  [21, 0],
];
const TIME_OPTIONS = TIMES.map(([hour, minute]) => ({
  key: `${hour}:${minute}`,
  label: formatClock(hour, minute),
}));
const NUDGE = {
  title: "Time to train",
  body: "Your session is set for today. Log your sets and tell Marcus.",
};
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const asOptions = (list: string[]) => list.map((label) => ({ key: label, label }));

function newInviteCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

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
  const { answers, setAnswer } = useAppState();
  const reminder = useReminder();
  const purchases = usePurchases();
  const support = useSupport();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const linked = answers.partner_link !== "unlinked";
  const goal = answers.goal ?? GOALS[0];
  const frequencyKey = answers.daysperweek ?? DEFAULT_FREQUENCY;
  const frequency = FREQUENCIES.find((option) => option.key === frequencyKey)?.label ?? frequencyKey;
  const equipment = answers.equipment ?? EQUIPMENT[0];
  const timeKey = `${reminder.hour}:${reminder.minute}`;
  const restoring = purchases.status === "restoring";
  const blocked = reminder.permission === "denied";

  function togglePartner() {
    haptic(linked ? "warning" : "success");
    void setAnswer("partner_link", linked ? "unlinked" : "linked");
  }

  async function shareInvite() {
    haptic("light");
    const code = newInviteCode();
    void setAnswer("invite_code", code);
    setInviteCode(code);
    await Share.share({
      message: `Pair with me on ${appInfo.name}. Invite code: ${code}`,
    }).catch(() => undefined);
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

  function chooseTheme(id: string) {
    haptic("selection");
    setActiveThemeId(id);
  }

  const reminderHelp = blocked
    ? "Notifications are off for Spotter Pair. Allow them in your phone's Settings to get your nudge."
    : "Your nudge comes once a day at this time, so you never leave Marcus hanging.";

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
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <Section label="PARTNER CONNECTION">
            <SettingsCard>
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                  <View style={{ width: 56, height: 56 }}>
                    <Avatar prompt={PARTNER_PHOTO} name={PARTNER.name} size={56} />
                    <View
                      style={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: linked ? theme.colors.success : theme.colors.textMuted,
                        borderWidth: 2,
                        borderColor: theme.colors.surface,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {PARTNER.name}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                      {linked ? `Linked since ${PARTNER.linkedSince}` : "Not linked right now"}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  {/* The wrapper stretches so the button takes the room the second one leaves. */}
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Share invite code"
                      icon="share-outline"
                      variant="secondary"
                      onPress={shareInvite}
                    />
                  </View>
                  <PressScale
                    onPress={togglePartner}
                    scaleTo={0.94}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={linked ? "Unlink partner" : "Re-invite partner"}
                    style={{
                      minHeight: 48,
                      justifyContent: "center",
                      paddingHorizontal: theme.spacing.lg,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.colors.textMuted,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {linked ? "Unlink" : "Re-invite"}
                    </Text>
                  </PressScale>
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  {inviteCode
                    ? `Invite code ${inviteCode} is ready to send. Pairing takes about 3 minutes.`
                    : "Pairing takes about 3 minutes. Share an invite code to sync your accountability."}
                </Text>
              </View>
            </SettingsCard>
          </Section>

          <Section label="TRAINING PREFERENCES">
            <SettingsCard>
              <ChoiceRow
                title={`Goal: ${goal}`}
                options={asOptions(GOALS)}
                selected={goal}
                onChoose={(value) => void setAnswer("goal", value)}
              />
              <ChoiceRow
                title={`Frequency: ${frequency}`}
                options={FREQUENCIES}
                selected={frequencyKey}
                onChoose={(value) => void setAnswer("daysperweek", value)}
              />
              <ChoiceRow
                title={`Equipment: ${equipment}`}
                options={asOptions(EQUIPMENT)}
                selected={equipment}
                onChoose={(value) => void setAnswer("equipment", value)}
              />
            </SettingsCard>
          </Section>

          <Section label="ACCOUNTABILITY & NUDGES">
            <SettingsCard
              footer={
                <View
                  style={{
                    paddingHorizontal: theme.spacing.lg,
                    paddingBottom: theme.spacing.md,
                  }}
                >
                  <Text
                    style={{
                      color: reminderNote || blocked ? theme.colors.warning : theme.colors.textMuted,
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
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: "row", gap: theme.spacing.xs }}
            >
              {themes.map((pack) => {
                // The pack on screen, which is the light or dark partner when the phone asks for it.
                const selected = pack.id === theme.id;
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
                      accessibilityState={{ selected }}
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
                      style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                    >
                      {restoreNote}
                    </Text>
                  </View>
                ) : undefined
              }
            >
              <NavRow
                title={purchases.isPremium ? "Manage Spotter Pair Pro" : "Get Spotter Pair Pro"}
                onPress={purchases.openPaywall}
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
                  title="Privacy policy and weights vault guarantee"
                  chevron={false}
                  onPress={() => openLink(appInfo.privacyUrl)}
                  trailing={<Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />}
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
