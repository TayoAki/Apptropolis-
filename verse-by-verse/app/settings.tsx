import { LayoutAnimation, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flourish } from "../components/Flourish";
import { ScreenHeader } from "../components/ScreenHeader";
import { SettingsCard, SettingsRow, SettingsSection } from "../components/settings/SettingsGroup";
import { TextSizeSlider } from "../components/settings/TextSizeSlider";
import { AUTOMATIC, ThemeSwatches } from "../components/settings/ThemeSwatches";
import { SupportButton, useSupport } from "../components/support";
import { SkeletonList, Stagger, haptic } from "../components/motion";
import { openPaywallFrom } from "../components/paywall/source";
import {
  LINE_SPACING,
  LINE_SPACING_KEY,
  TEXT_SIZE_KEY,
  THEME_KEY,
  followPhoneTheme,
  useReadingPrefs,
  useSavedTheme,
} from "../components/reading";
import { REMINDER_COPY, REMINDER_TIMES, clockTime } from "../components/reminder";
import { appInfo } from "../data/app-info";
import { BIBLE_TOTALS, TRANSLATION } from "../data/bible";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";
import { themes } from "../theme/tokens";

const LEGAL = [
  { label: "Privacy policy", url: appInfo.privacyUrl },
  { label: "Terms of use", url: appInfo.termsUrl },
].filter((link) => link.url);


export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, answers, setAnswer } = useAppState();
  const { textSize, lineSpacing } = useReadingPrefs();
  useSavedTheme();
  const reminder = useReminder();
  const { isPremium, activeOffer, status, error, restorePurchases, paywallEnabled } =
    usePurchases();
  const support = useSupport();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [reminderProblem, setReminderProblem] = useState<string | null>(null);
  const [restoredNow, setRestoredNow] = useState(false);

  // A pinned theme is one the person picked here; with none saved the app follows the phone.
  const pinned = themes.find((t) => t.id === answers[THEME_KEY]);
  const themeChoice = pinned ? pinned.id : AUTOMATIC;

  const loaded = ready && reminder.ready;

  function cycleLineSpacing() {
    haptic("selection");
    const index = LINE_SPACING.indexOf(lineSpacing);
    void setAnswer(LINE_SPACING_KEY, LINE_SPACING[(index + 1) % LINE_SPACING.length]!);
  }

  function pickTheme(id: string) {
    haptic("selection");
    if (id === AUTOMATIC) {
      followPhoneTheme();
      void setAnswer(THEME_KEY, "");
      return;
    }
    setActiveThemeId(id);
    void setAnswer(THEME_KEY, id);
  }

  function setTextSize(index: number) {
    void setAnswer(TEXT_SIZE_KEY, String(index));
  }

  async function toggleReminder(on: boolean) {
    haptic("selection");
    setReminderProblem(null);
    try {
      if (on) {
        const ok = await reminder.enable({
          ...REMINDER_COPY,
          hour: reminder.hour,
          minute: reminder.minute,
        });
        if (ok) haptic("success");
      } else {
        await reminder.disable();
      }
    } catch {
      setReminderProblem(
        on ? "The reminder couldn't be set. Try again." : "The reminder couldn't be turned off. Try again.",
      );
    }
  }

  /** Step to the next suggested time after the current one, wrapping round at the end. */
  function nextReminderTime() {
    haptic("selection");
    setReminderProblem(null);
    const now = reminder.hour * 60 + reminder.minute;
    const [hour, minute] =
      REMINDER_TIMES.find(([h, m]) => h * 60 + m > now) ?? REMINDER_TIMES[0]!;
    reminder
      .setTime(hour, minute)
      .catch(() => setReminderProblem("The reminder time couldn't be changed. Try again."));
  }

  async function restore() {
    setRestoredNow(false);
    if (await restorePurchases()) {
      haptic("success");
      setRestoredNow(true);
    }
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
  const reminderTime = clockTime(reminder.hour, reminder.minute);

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
                  value={pinned ? pinned.name : "Automatic"}
                >
                  <ThemeSwatches selected={themeChoice} onSelect={pickTheme} />
                </SettingsRow>
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
                reminderProblem ??
                (reminder.permission === "denied"
                  ? "Notifications are off for this app. Allow them in your phone's Settings, then turn this on."
                  : reminder.enabled
                    ? `One notification a day at ${reminderTime} to pick up where you left off. No streaks, no guilt.`
                    : "One notification a day to pick up where you left off. No streaks, no guilt.")
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
                  subtitle={`World English Bible (WEB), all ${BIBLE_TOTALS.books} books`}
                />
                <SettingsRow
                  icon="information-circle-outline"
                  label="About the translation"
                  subtitle="Public-domain status, source and fidelity"
                  chevron
                  expanded={aboutOpen}
                  onPress={() => reveal(aboutOpen, setAboutOpen)}
                  accessibilityHint="Shows details about the translation"
                >
                  {aboutOpen ? (
                    <View style={{ gap: theme.spacing.sm }}>
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
                        added to Scripture: only footnote markers and section headings are left
                        out.
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: theme.font.size.caption,
                          lineHeight: theme.font.size.caption * 1.5,
                        }}
                      >
                        {`Source: ${TRANSLATION.name} (eBible.org edition ${TRANSLATION.id}, the Protestant canon of ${BIBLE_TOTALS.books} books), from the Free Use Bible API at bible.helloao.org. License: public domain, as stated by eBible.org. "World English Bible" is a trademark of eBible.org.`}
                      </Text>
                    </View>
                  ) : null}
                </SettingsRow>
                <SettingsRow
                  icon="journal-outline"
                  label="Study notes disclosure"
                  subtitle="Commentary, never presented as Scripture."
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
                      Study notes are commentary on the passage, labelled as commentary, and never
                      presented as Scripture. The verse text itself is the World English Bible,
                      unchanged.
                    </Text>
                  ) : null}
                </SettingsRow>
              </SettingsCard>
            </SettingsSection>

            {/* Restore and plan status exist only while the paywall is on (data/launch.ts). */}
            {paywallEnabled ? (
              <SettingsSection title="Patronage">
                <SettingsCard>
                  <SettingsRow
                    icon="refresh-outline"
                    label="Restore purchases"
                    subtitle={
                      status === "restoring"
                        ? "Checking your purchases…"
                        : restoredNow
                          ? "Your purchases are restored."
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
                    onPress={() => openPaywallFrom("settings")}
                    accessibilityLabel={`Patron status, ${badge.text}`}
                    accessibilityHint={isPremium ? "Shows your plan" : "Opens the premium plans"}
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
            ) : null}

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
