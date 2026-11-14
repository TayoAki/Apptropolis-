import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
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
import { formatClock } from "../data/schema";
import { getActiveThemeId, setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";
import { themes } from "../theme/tokens";

const PARTNER = { name: "Marcus S.", linkedSince: "Sept 2024" };
const PARTNER_PHOTO =
  "close-up portrait of a friendly smiling person in a gym t-shirt, plain studio background";

const GOALS = ["Build Strength", "Build Muscle", "Lose Fat", "Improve Endurance"];
const FREQUENCIES = ["2 Days / Week", "3 Days / Week", "4 Days / Week", "5 Days / Week"];
const EQUIPMENT = ["Full Commercial Gym", "Home Dumbbells", "Bodyweight Only", "Resistance Bands"];
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
        <Ionicons name="chevron-back" size={28} color={theme.colors.textMuted} />
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
  const frequency = answers.frequency ?? FREQUENCIES[2];
  const equipment = answers.equipment ?? EQUIPMENT[0];
  const activeThemeId = getActiveThemeId();
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
      ok ? "Premium is back on this phone." : "No earlier purchases were found for this account.",
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
                    <AiImage
                      prompt={PARTNER_PHOTO}
                      style={{ width: 56, height: 56, borderRadius: 28 }}
                    />
                    {linked ? (
                      <View
                        style={{
                          position: "absolute",
                          right: 0,
                          bottom: 0,
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor: theme.colors.success,
                          borderWidth: 2,
                          borderColor: theme.colors.surface,
                        }}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
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
                  <PressScale
                    onPress={togglePartner}
                    scaleTo={0.94}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={linked ? "Unlink or re-invite partner" : "Re-invite partner"}
                    style={{
                      minHeight: 44,
                      maxWidth: 136,
                      justifyContent: "center",
                      paddingHorizontal: theme.spacing.md,
                      borderRadius: theme.radius.pill,
                      borderWidth: 1,
                      borderColor: theme.colors.textMuted,
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.medium,
                        textAlign: "center",
                      }}
                    >
                      {linked ? "Unlink / Re-invite Partner" : "Re-invite Partner"}
                    </Text>
                  </PressScale>
                </View>
                <Button
                  label="Copy New Invite Link"
                  icon="link-outline"
                  variant="secondary"
                  onPress={shareInvite}
                />
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  {inviteCode
                    ? `Invite code ${inviteCode} is ready to send. Pairing takes about 3 minutes.`
                    : "Quick pair takes 3 minutes. Share this link to sync your accountability."}
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
                options={asOptions(FREQUENCIES)}
                selected={frequency}
                onChoose={(value) => void setAnswer("frequency", value)}
              />
              <ChoiceRow
                title={`Exercise Equipment: ${equipment}`}
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
                title="Daily Workout Nudge"
                value={reminder.enabled}
                loading={!reminder.ready}
                onChange={(on) => void toggleNudge(on)}
              />
              <ChoiceRow
                title="Scheduled Time"
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
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              {themes.map((pack) => {
                const selected = pack.id === activeThemeId;
                return (
                  <View
                    key={pack.id}
                    style={{
                      flex: 1,
                      borderRadius: theme.radius.sm + 2,
                      borderWidth: 2,
                      borderColor: selected ? theme.colors.primary : theme.colors.background,
                    }}
                  >
                    <PressScale
                      onPress={() => chooseTheme(pack.id)}
                      scaleTo={0.94}
                      accessibilityRole="radio"
                      accessibilityLabel={pack.name}
                      accessibilityState={{ selected }}
                      style={{
                        height: 60,
                        borderRadius: theme.radius.sm,
                        backgroundColor: pack.colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          color: pack.colors.onPrimary,
                          fontSize: theme.font.size.caption,
                          fontWeight: theme.font.weight.bold,
                          textAlign: "center",
                        }}
                      >
                        {pack.name}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={pack.colors.onPrimary}
                          style={{ position: "absolute", top: 4, right: 4 }}
                        />
                      ) : null}
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
                      backgroundColor: theme.colors.warning,
                    }}
                  >
                    <Ionicons name="star" size={16} color={theme.colors.onPrimary} />
                  </View>
                }
              />
              <NavRow
                title="Restore Purchases"
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
                  title="Privacy Policy & Weights Vault Guarantee"
                  chevron={false}
                  onPress={() => openLink(appInfo.privacyUrl)}
                  trailing={
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />
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
              accessibilityLabel="Terms of Use"
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
                Terms of Use
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
