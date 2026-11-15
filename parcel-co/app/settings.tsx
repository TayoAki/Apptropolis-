// Settings: what you shop for and follow, how Pip talks, Pip Plus, where the codes come from, and
// account actions.
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { LottieBox } from "../components/LottieBox";
import { haptic, PressScale, Stagger } from "../components/motion";
import { Pip } from "../components/Pip";
import { Card, Row, Segmented } from "../components/settings/Controls";
import { useSupport } from "../components/support";
import { navTitleStyle, SectionTitle } from "../components/ui";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { affiliateLinks } from "../data/deals-config";
import type { PipTone } from "../data/pip";
import { usePrefs } from "../data/prefs";
import { usePurchases } from "../data/purchases";
import { useCollection } from "../data/repo";
import { FREE_QUESTIONS_PER_DAY, INTERESTS, type ChatMessage, type SavedItem } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

export default function SettingsScreen() {
  const theme = useTheme();
  const { resetOnboarding } = useAppState();
  const prefs = usePrefs();
  const purchases = usePurchases();
  const support = useSupport();
  const saved = useCollection<SavedItem>("saved");
  const messages = useCollection<ChatMessage>("pip_messages");
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  function toggleInterest(key: string) {
    haptic("selection");
    const next = prefs.interests.includes(key) ? prefs.interests.filter((k) => k !== key) : [...prefs.interests, key];
    void prefs.setInterests(next);
  }

  async function restore() {
    setRestoreNote(null);
    const ok = await purchases.restorePurchases();
    setRestoreNote(ok ? "Pip Plus restored on this phone." : null);
  }

  async function resetData() {
    if (!armed) {
      haptic("warning");
      setCleared(false);
      setArmed(true);
      return;
    }
    setArmed(false);
    setClearing(true);
    try {
      for (const item of saved.items) await saved.remove(item.id);
      for (const message of messages.items) await messages.remove(message.id);
      haptic("success");
      setCleared(true);
    } finally {
      setClearing(false);
    }
  }

  const restoreMessage = restoreNote ?? (purchases.error && purchases.status === "idle" ? purchases.error : undefined);
  const plusDetail = purchases.isPremium
    ? "Active: ask Pip as much as you like, and ask with a photo."
    : `Free answers ${FREE_QUESTIONS_PER_DAY} questions a day. Plus has no limit and takes photos.`;

  return (
    <>
      <Stack.Screen options={{ title: "Settings", headerTitleStyle: navTitleStyle(theme) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          <View>
            <SectionTitle title="Your shopping" flush />
            <Card>
              <Row label="What you shop for" detail="Codes and deals for these come first on Home." chevron={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
                  {INTERESTS.map((interest) => {
                    const on = prefs.interests.includes(interest.key);
                    return (
                      <PressScale
                        key={interest.key}
                        onPress={() => toggleInterest(interest.key)}
                        scaleTo={0.95}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        aria-checked={on}
                        accessibilityLabel={interest.label}
                        style={{
                          minHeight: 40,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: theme.spacing.md,
                          borderRadius: theme.radius.pill,
                          borderWidth: 1.5,
                          borderColor: on ? theme.colors.primary : theme.colors.textMuted,
                          backgroundColor: on ? theme.colors.primary : "transparent",
                        }}
                      >
                        {on ? <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} /> : null}
                        <Text style={{ color: on ? theme.colors.onPrimary : theme.colors.text, fontSize: theme.font.size.caption, fontWeight: theme.font.weight.medium }}>
                          {interest.label}
                        </Text>
                      </PressScale>
                    );
                  })}
                </View>
              </Row>
              <Row
                label="Stores you follow"
                detail={prefs.storeNames.length ? prefs.storeNames.join(", ") : "None yet. Follow stores in the Stores tab."}
                onPress={() => router.push("/stores")}
                last
              />
            </Card>
          </View>

          <View>
            <SectionTitle title="Pip" flush />
            <Card>
              <Row label="How Pip answers" chevron={false} last>
                <Segmented<PipTone>
                  label="How Pip answers"
                  options={[
                    { key: "friendly", label: "Friendly" },
                    { key: "brief", label: "Brief" },
                  ]}
                  value={prefs.tone}
                  onChange={(key) => void prefs.setTone(key)}
                />
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                  Your questions go to an AI service, with the codes and deals Pip found for them, so it can write the answer. Your name and account aren't sent.
                </Text>
              </Row>
            </Card>
          </View>

          <View>
            <SectionTitle title="Pip Plus" flush />
            <Card>
              <Row
                label={purchases.isPremium ? "Pip Plus" : "See Pip Plus"}
                detail={plusDetail}
                onPress={() => router.push({ pathname: "/paywall", params: { from: "settings" } })}
              />
              <Row
                label="Restore purchases"
                detail={restoreMessage}
                disabled={purchases.status !== "idle"}
                chevron={false}
                onPress={restore}
                last
                right={
                  purchases.status === "restoring" ? (
                    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>Checking…</Text>
                  ) : null
                }
              />
            </Card>
          </View>

          <View>
            <SectionTitle title="Where the codes come from" flush />
            <Card style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
                Pip collects codes and deals from public coupon and store sites, and shows when each one was last seen there. Codes can stop working at any time.
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
                A code marked Tested was tried at a checkout on the date shown. Nothing else is promised to work.
              </Text>
              {affiliateLinks ? (
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
                  Some Shop and View deal links are affiliate links: Pip may earn a commission when you buy, at no cost to you.
                </Text>
              ) : null}
            </Card>
          </View>

          <View>
            <SectionTitle title="Account & support" flush />
            <Card>
              {support.available ? <Row label="Help & support" onPress={support.open} /> : null}
              {appInfo.termsUrl ? <Row label="Terms of service" onPress={() => Linking.openURL(appInfo.termsUrl)} /> : null}
              {appInfo.privacyUrl ? <Row label="Privacy policy" onPress={() => Linking.openURL(appInfo.privacyUrl)} /> : null}
              <Row label="Replay setup" onPress={() => resetOnboarding()} />
              <Row
                label="Clear saved items and chat"
                danger
                chevron={false}
                last
                disabled={saved.loading || messages.loading || clearing}
                detail={
                  cleared
                    ? "Cleared."
                    : armed
                      ? "Tap again to confirm. This can't be undone."
                      : "Removes your saved codes and deals and your Pip conversation. Stores you follow stay."
                }
                right={cleared ? <LottieBox name="success" size={32} /> : null}
                onPress={resetData}
                accessibilityLabel={armed ? "Confirm clear saved items and chat" : "Clear saved items and chat"}
              />
            </Card>
          </View>

          <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
            <Pip pose="pip-celebrating" size={72} />
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, textAlign: "center" }}>
              {`${appInfo.name} v${appInfo.version}`}
            </Text>
          </View>
        </Stagger>
      </ScrollView>
    </>
  );
}
