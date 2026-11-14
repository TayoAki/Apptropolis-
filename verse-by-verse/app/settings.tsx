import { LayoutAnimation, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { SettingsCard, SettingsRow, SettingsSection } from "../components/settings/SettingsGroup";
import { SettingsHeader } from "../components/settings/SettingsHeader";
import { TextSizeSlider } from "../components/settings/TextSizeSlider";
import { ThemeSwatches } from "../components/settings/ThemeSwatches";
import { SupportButton, useSupport } from "../components/support";
import { PressScale, SkeletonList, Stagger, haptic } from "../components/motion";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { getActiveThemeId, setActiveThemeId } from "../theme/active";
import { useTheme } from "../theme/ThemeProvider";

const LINE_SPACING = ["Compact", "Comfortable", "Generous"] as const;

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
  { label: "Privacy Policy", url: appInfo.privacyUrl },
  { label: "Terms of Use", url: appInfo.termsUrl },
].filter((link) => link.url);

const REMINDER_BODY = "Your last verse is waiting. Take one quiet minute with it.";

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, answers, setAnswer } = useAppState();
  const reminder = useReminder();
  const { isPremium, activeOffer, status, error, restorePurchases, openPaywall } =
    usePurchases();
  const support = useSupport();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const storedSize = Number(answers["pref.textSize"]);
  const textSize = Number.isInteger(storedSize) ? Math.min(4, Math.max(0, storedSize)) : 2;
  const lineSpacing = LINE_SPACING.find((s) => s === answers["pref.lineSpacing"]) ?? "Generous";
  const activeThemeId = getActiveThemeId();
  const loaded = ready && reminder.ready;

  function cycleLineSpacing() {
    haptic("selection");
    const index = LINE_SPACING.indexOf(lineSpacing);
    void setAnswer("pref.lineSpacing", LINE_SPACING[(index + 1) % LINE_SPACING.length]!);
  }

  function pickTheme(id: string) {
    haptic("selection");
    setActiveThemeId(id);
    void setAnswer("pref.theme", id);
  }

  function setTextSize(index: number) {
    void setAnswer("pref.textSize", String(index));
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
    : { text: "Inactive (Go Premium)", color: theme.colors.warning };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <SettingsHeader title="Settings" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
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
                  label="Text Size"
                  wide
                  control={<TextSizeSlider value={textSize} onChange={setTextSize} />}
                />
                <SettingsRow
                  icon="color-palette-outline"
                  label="Theme"
                  wide
                  control={<ThemeSwatches selected={activeThemeId} onSelect={pickTheme} />}
                />
                <SettingsRow
                  icon="reorder-three-outline"
                  label="Line Spacing"
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
                  label="Quiet Reminder"
                  accessory={
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                      }}
                    >
                      <Switch
                        value={reminder.enabled}
                        onValueChange={(on) => void toggleReminder(on)}
                        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.success }}
                        thumbColor={theme.colors.onPrimary}
                        ios_backgroundColor={theme.colors.surfaceAlt}
                        accessibilityLabel="Quiet reminder"
                      />
                      <PressScale
                        onPress={nextReminderTime}
                        scaleTo={0.94}
                        accessibilityRole="button"
                        accessibilityLabel={`Reminder time, ${formatTime(reminder.hour, reminder.minute)}`}
                        accessibilityHint="Moves to the next suggested time"
                        style={{
                          minHeight: 44,
                          minWidth: 44,
                          paddingHorizontal: theme.spacing.md,
                          justifyContent: "center",
                          borderRadius: theme.radius.md,
                          backgroundColor: theme.colors.surfaceAlt,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: theme.font.size.body,
                            fontFamily: theme.font.family,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {formatTime(reminder.hour, reminder.minute)}
                        </Text>
                      </PressScale>
                    </View>
                  }
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="Translation & integrity">
              <SettingsCard>
                <SettingsRow
                  icon="book-outline"
                  label="Translation"
                  value="World English Bible (WEB)"
                  chevron
                  expanded={aboutOpen}
                  onPress={() => reveal(aboutOpen, setAboutOpen)}
                  accessibilityHint="Shows what the translation is"
                />
                <SettingsRow
                  icon="information-circle-outline"
                  label="About the Translation"
                  subtitle="Public-domain status and fidelity"
                  chevron
                  expanded={aboutOpen}
                  onPress={() => reveal(aboutOpen, setAboutOpen)}
                  accessibilityHint="Shows details about the translation"
                >
                  {aboutOpen ? (
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption + 1,
                        lineHeight: (theme.font.size.caption + 1) * 1.5,
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
                  label="Study Notes Disclosure"
                  subtitle="Human historical curation without generative AI."
                  chevron
                  expanded={notesOpen}
                  onPress={() => reveal(notesOpen, setNotesOpen)}
                  accessibilityHint="Shows how study notes are written"
                >
                  {notesOpen ? (
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption + 1,
                        lineHeight: (theme.font.size.caption + 1) * 1.5,
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
                  label="Restore Purchases"
                  subtitle={
                    status === "restoring"
                      ? "Checking your purchases…"
                      : (error ?? "Use this if you bought premium on another device.")
                  }
                  onPress={() => void restore()}
                  accessibilityHint="Restores purchases made with this store account"
                />
                <SettingsRow
                  icon="heart"
                  label="Patron Status"
                  onPress={openPaywall}
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
              <AiImage
                prompt="Ornamental flourish divider above the footer text 'Verse by Verse v1.0.0'"
                fit="contain"
                style={{ width: 200, height: 28 }}
              />
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
