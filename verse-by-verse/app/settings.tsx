import { LayoutAnimation, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flourish } from "../components/Flourish";
import { ScreenHeader } from "../components/ScreenHeader";
import { SettingsCard, SettingsRow, SettingsSection } from "../components/settings/SettingsGroup";
import { TextSizeSlider } from "../components/settings/TextSizeSlider";
import { ThemeSwatches } from "../components/settings/ThemeSwatches";
import { SupportButton, useSupport } from "../components/support";
import { SkeletonList, Stagger, haptic } from "../components/motion";
import {
  LINE_SPACING,
  LINE_SPACING_KEY,
  TEXT_SIZE_KEY,
  THEME_KEY,
  useReadingPrefs,
  useSavedTheme,
} from "../components/reading";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";

/** Suggested times the daily reminder cycles through when tapped. */
const REMINDER_TIMES: ReadonlyArray<readonly [number, number]> = [
  [7, 0],
  [7, 15],
  [8, 0],
  [9, 0],
  [12, 30],
  [18, 0],
  [20, 0],
  [21, 0],
];

const LEGAL = [
  { label: "Privacy policy", url: appInfo.privacyUrl },
  { label: "Terms of use", url: appInfo.termsUrl },
].filter((link) => link.url);

const REMINDER_BODY = "Your last verse is waiting. Take one quiet minute with it.";

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, setAnswer } = useAppState();
  const { textSize, lineSpacing } = useReadingPrefs();
  useSavedTheme();
  const reminder = useReminder();
  const { isPremium, activeOffer, status, error, restorePurchases, openPaywall } =
    usePurchases();
  const support = useSupport();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const loaded = ready && reminder.ready;

  function cycleLineSpacing() {
    haptic("selection");
    const index = LINE_SPACING.indexOf(lineSpacing);
    void setAnswer(LINE_SPACING_KEY, LINE_SPACING[(index + 1) % LINE_SPACING.length]!);
  }

  function pickTheme(id: string) {
    haptic("selection");
    setActiveThemeId(id);
    void setAnswer(THEME_KEY, id);
  }

  function setTextSize(index: number) {
    void setAnswer(TEXT_SIZE_KEY, String(index));
  }

  async function toggleReminder(on: boolean) {
    haptic("selection");
    if (on) {
      const ok = await reminder.enable({
        title: appInfo.name,
        body: REMINDER_BODY,
        hour: reminder.hour,
        minute: reminder.minute,
      });
      if (ok) haptic("success");
    } else {
      await reminder.disable();
    }
  }

  function nextReminderTime() {
    haptic("selection");
    const index = REMINDER_TIMES.findIndex(
      ([h, m]) => h === reminder.hour && m === reminder.minute,
    );
    const [hour, minute] = REMINDER_TIMES[(index + 1) % REMINDER_TIMES.length]!;
    void reminder.setTime(hour, minute);
  }

  async function restore() {
    if (await restorePurchases()) haptic("success");
  }

  function reveal(open: boolean, set: (value: boolean) => void) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set(!open);
  }

  const badge = isPremium
    ? {
        text: activeOffer ? `Premium · ${activeOffer.label}` : "Premium",
        color: theme.colors.success,
      }
    : { text: "Inactive", color: theme.colors.warning };
  const reminderTime = formatTime(reminder.hour, reminder.minute);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <ScreenHeader title="Settings" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        {!loaded ? (
          <SkeletonList rows={4} />
        ) : (
          <Stagger step={70} style={{ gap: theme.spacing.xl }}>
            <SettingsSection title="Reading experience">
              <SettingsCard>
                <SettingsRow
                  icon="text-outline"
                  label="Text size"
                  wide
                  control={<TextSizeSlider value={textSize} onChange={setTextSize} />}
                />
                <SettingsRow
                  icon="color-palette-outline"
                  label="Theme"
                  wide
                  control={<ThemeSwatches selected={theme.id} onSelect={pickTheme} />}
                />
                <SettingsRow
                  icon="reorder-three-outline"
                  label="Line spacing"
                  value={lineSpacing}
                  chevron
                  onPress={cycleLineSpacing}
                  accessibilityHint="Changes to the next line spacing"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection
              title="Daily habit"
              note={
                reminder.permission === "denied"
                  ? "Notifications are off for this app. Allow them in your phone's Settings, then turn this on."
                  : "One notification daily with your last verse. No streaks, no guilt."
              }
            >
              <SettingsCard>
                <SettingsRow
                  icon="notifications-outline"
                  label="Quiet reminder"
                  accessory={
                    <Switch
                      value={reminder.enabled}
                      onValueChange={(on) => void toggleReminder(on)}
                      trackColor={{ false: theme.colors.textMuted, true: theme.colors.success }}
                      thumbColor={theme.colors.onPrimary}
                      ios_backgroundColor={theme.colors.textMuted}
                      accessibilityLabel="Quiet reminder"
                    />
                  }
                />
                <SettingsRow
                  icon="time-outline"
                  label="Reminder time"
                  value={reminderTime}
                  chevron
                  onPress={nextReminderTime}
                  accessibilityHint="Moves to the next suggested time"
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="Translation & integrity">
              <SettingsCard>
                <SettingsRow
                  icon="book-outline"
                  label="Translation"
                  subtitle="World English Bible (WEB)"
                />
                <SettingsRow
                  icon="information-circle-outline"
                  label="About the translation"
                  subtitle="Public-domain status and fidelity"
                  chevron
                  expanded={aboutOpen}
                  onPress={() => reveal(aboutOpen, setAboutOpen)}
                  accessibilityHint="Shows details about the translation"
                >
                  {aboutOpen ? (
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        lineHeight: theme.font.size.body * 1.5,
                        fontFamily: theme.font.family,
                      }}
                    >
                      The World English Bible is in the public domain, so it can be copied,
                      printed and shared freely. It is a modern-English update of the American
                      Standard Version of 1901. We show its text as published, with no words
                      added to Scripture.
                    </Text>
                  ) : null}
                </SettingsRow>
                <SettingsRow
                  icon="journal-outline"
                  label="Study notes disclosure"
                  subtitle="Human historical curation without generative AI."
                  chevron
                  expanded={notesOpen}
                  onPress={() => reveal(notesOpen, setNotesOpen)}
                  accessibilityHint="Shows how study notes are written"
                >
                  {notesOpen ? (
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        lineHeight: theme.font.size.body * 1.5,
                        fontFamily: theme.font.family,
                      }}
                    >
                      Every study note is written and checked by a person against historical
                      sources. No generative AI writes, edits or translates them. Notes are
                      commentary, labelled as commentary, and never presented as Scripture.
                    </Text>
                  ) : null}
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="Patronage">
              <SettingsCard>
                <SettingsRow
                  icon="refresh-outline"
                  label="Restore purchases"
                  subtitle={
                    status === "restoring"
                      ? "Checking your purchases…"
                      : (error ?? "Use this if you bought premium on another device.")
                  }
                  onPress={() => void restore()}
                  accessibilityHint="Restores purchases made with this store account"
                />
                <SettingsRow
                  icon="heart-outline"
                  label="Patron status"
                  subtitle={isPremium ? undefined : "Go Premium"}
                  chevron
                  onPress={openPaywall}
                  accessibilityLabel={`Patron status, ${badge.text}`}
                  accessibilityHint="Opens the premium plans"
                  accessory={
                    <View
                      style={{
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: 4,
                        borderRadius: theme.radius.sm,
                        backgroundColor: badge.color,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.colors.onPrimary,
                          fontSize: theme.font.size.caption,
                          fontWeight: theme.font.weight.bold,
                        }}
                      >
                        {badge.text}
                      </Text>
                    </View>
                  }
                />
              </SettingsCard>
            </SettingsSection>

            {support.available ? (
              <SettingsSection title="Help">
                <SettingsCard>
                  <View style={{ paddingHorizontal: theme.spacing.lg }}>
                    <SupportButton />
                  </View>
                </SettingsCard>
              </SettingsSection>
            ) : null}

            <View style={{ alignItems: "center", gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
              <Flourish />
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.body,
                  textAlign: "center",
                }}
              >
                {`${appInfo.name} v${appInfo.version}`}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.font.family,
                  fontStyle: "italic",
                  fontSize: theme.font.size.caption,
                  textAlign: "center",
                }}
              >
                Dedicated to peaceful contemplation.
              </Text>
              {LEGAL.length ? (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: theme.spacing.lg,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  {LEGAL.map((link) => (
                    <Pressable
                      key={link.label}
                      onPress={() => void Linking.openURL(link.url)}
                      accessibilityRole="link"
                      accessibilityLabel={link.label}
                      hitSlop={12}
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
                        {link.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </Stagger>
        )}
      </ScrollView>
    </View>
  );
}
