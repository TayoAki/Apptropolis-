import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Children, useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { LoadingState } from "../components/EmptyState";
import { useAppState } from "../data/app-state";
import { appInfo } from "../data/app-info";
import { usePurchases } from "../data/purchases";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import {
  HOME_STORE,
  PACK_LIST,
  RECIPES,
  STORES,
  addDays,
  formatLongDate,
  parseBudget,
  parseServings,
  todayISO,
  weekStartOf,
  type PantryItem,
} from "../data/schema";
import { useAppearance, useTheme } from "../theme/ThemeProvider";

const EXCLUSIONS: { key: string; label: string }[] = [
  { key: "pork", label: "No pork" },
  { key: "mushrooms", label: "No mushrooms" },
  { key: "fish", label: "No fish" },
  { key: "nuts", label: "No nuts" },
];

const REMINDER_TIMES: [number, number][] = [
  [8, 0],
  [9, 30],
  [11, 0],
  [17, 0],
  [19, 0],
];

function formatTime(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "pm" : "am";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceAlt,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.medium,
            fontFamily: theme.font.family,
          }}
        >
          {title}
        </Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 2,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: theme.colors.border,
          }}
        >
          {row}
        </View>
      ))}
    </View>
  );
}

function Body({
  children,
  muted,
  size,
  weight,
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  weight?: "400" | "500" | "700";
}) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: muted ? theme.colors.textMuted : theme.colors.text,
        fontSize: size ?? theme.font.size.body + 1,
        fontWeight: weight ?? theme.font.weight.regular,
        fontFamily: theme.font.family,
      }}
    >
      {children}
    </Text>
  );
}

function Stepper({
  value,
  label,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  noun,
}: {
  value: string;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  noun: string;
}) {
  const theme = useTheme();
  const button = (icon: "remove" | "add", onPress: () => void, enabled: boolean, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
        opacity: enabled ? 1 : 0.35,
      })}
    >
      <Ionicons name={icon} size={18} color={theme.colors.text} />
    </Pressable>
  );
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.text,
        borderRadius: theme.radius.md,
        overflow: "hidden",
      }}
    >
      {button("remove", onDecrease, canDecrease, `Decrease ${noun}`)}
      <View
        style={{
          minWidth: 62,
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.colors.text,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body + 1,
            fontWeight: theme.font.weight.medium,
            fontFamily: theme.font.family,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value}
        </Text>
      </View>
      {button("add", onIncrease, canIncrease, `Increase ${noun}`)}
    </View>
  );
}

function Chip({
  label,
  selected,
  icon,
  onPress,
  accessibilityLabel,
  tone = "neutral",
}: {
  label: string;
  selected?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel?: string;
  tone?: "neutral" | "primary";
}) {
  const theme = useTheme();
  const active = !!selected;
  const color = active
    ? tone === "primary"
      ? theme.colors.primary
      : theme.colors.text
    : theme.colors.textMuted;
  const border = active && tone === "primary" ? theme.colors.primary : theme.colors.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minHeight: 36,
        paddingHorizontal: theme.spacing.sm + 4,
        borderRadius: theme.radius.pill,
        borderWidth: active && tone === "primary" ? 1.5 : 1,
        borderColor: border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
      })}
    >
      {active ? (
        <Ionicons name="checkmark" size={15} color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={15} color={color} />
      ) : null}
      <Text
        style={{
          color,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.regular,
          fontFamily: theme.font.family,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NavRow({
  label,
  value,
  onPress,
  expanded,
  accessibilityLabel,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  expanded?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Body>{label}</Body>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
        {value ? <Body muted>{value}</Body> : null}
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={theme.colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, resetOnboarding } = useAppState();
  const purchases = usePurchases();
  const reminder = useReminder();
  const [appearance, setAppearance] = useAppearance();
  const pantry = useCollection<PantryItem>("pantry_items");

  const [storeOpen, setStoreOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const servings = answers.servings ? Math.min(5, Math.max(1, parseServings(answers.servings))) : 2;
  const budget = answers.weeklybudget ? parseBudget(answers.weeklybudget) : 25;
  const store = answers.store || HOME_STORE;
  const excluded = (answers.excluded ?? "").split(",").filter(Boolean);
  const vegNights = Math.min(5, Math.max(0, parseInt(answers.vegnights ?? "0", 10) || 0));
  const hasSetupAnswers = Boolean(answers.servings || answers.weeklybudget);

  const staples = pantry.items.filter((p) => p.isStaple);
  const missingStaples = PACK_LIST.filter(
    (pack) => pack.staple && !staples.some((s) => s.ingredient === pack.name),
  );

  function toggleExclusion(key: string) {
    const next = excluded.includes(key) ? excluded.filter((k) => k !== key) : [...excluded, key];
    void setAnswer("excluded", next.join(","));
  }

  async function toggleReminder(on: boolean) {
    setReminderNote(null);
    if (!on) {
      await reminder.disable();
      return;
    }
    const untouched = reminder.hour === 20 && reminder.minute === 0;
    const ok = await reminder.enable({
      title: "Time to plan this week's dinners",
      body: "Check what's left in the cupboard, then lock in five dinners and one list.",
      ...(untouched ? { hour: 9, minute: 30 } : {}),
    });
    if (!ok)
      setReminderNote(
        "Notifications are off for Five Dinners. Allow them in your phone's Settings, then switch this on again.",
      );
  }

  async function restore() {
    setRestoreNote(null);
    const ok = await purchases.restorePurchases();
    setRestoreNote(
      ok ? "Your purchase is restored." : "No purchases to restore on this account.",
    );
  }

  const defaultOffer = purchases.offers.find((o) => o.id === purchases.defaultOfferId);
  const manageUrl =
    Platform.OS === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
  const hasLegal = Boolean(appInfo.supportEmail || appInfo.privacyUrl || appInfo.termsUrl);
  const freeEnds = formatLongDate(addDays(weekStartOf(todayISO()), 6));

  const linkRow = (label: string, icon: React.ComponentProps<typeof Ionicons>["name"], url: string) => (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(url)}
      hitSlop={6}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Body>{label}</Body>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
    </Pressable>
  );

  const small = (text: string, color = theme.colors.textMuted) => (
    <Text
      style={{
        color,
        fontSize: theme.font.size.body,
        fontFamily: theme.font.family,
        paddingHorizontal: theme.spacing.xs,
      }}
    >
      {text}
    </Text>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          padding: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.md,
        }}
      >
        <Section title="Household">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Body>Cooking for</Body>
            <Stepper
              noun="household size"
              label="Cooking for"
              value={String(servings)}
              canDecrease={servings > 1}
              canIncrease={servings < 5}
              onDecrease={() => void setAnswer("servings", String(servings - 1))}
              onIncrease={() => void setAnswer("servings", String(servings + 1))}
            />
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Body>Default dinner budget</Body>
              <Stepper
                noun="budget"
                label="Default dinner budget"
                value={`£${Math.round(budget)}`}
                canDecrease={budget > 10}
                canIncrease={budget < 100}
                onDecrease={() => void setAnswer("weeklybudget", `£${Math.max(10, budget - 5)}`)}
                onIncrease={() => void setAnswer("weeklybudget", `£${Math.min(100, budget + 5)}`)}
              />
            </View>
            <Body muted size={theme.font.size.body}>
              For the five dinners, not the whole shop.
            </Body>
          </View>
          {hasSetupAnswers ? (
            <NavRow
              label="Set during setup"
              value="Change"
              onPress={() => void resetOnboarding()}
              accessibilityLabel="Change household and budget answers by repeating setup"
            />
          ) : null}
        </Section>

        <View style={{ gap: theme.spacing.sm }}>
          <Section title="Prices">
            <NavRow
              label="Home store"
              value={store}
              expanded={storeOpen}
              onPress={() => setStoreOpen((v) => !v)}
            />
            {storeOpen ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {STORES.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={s === store}
                    tone="primary"
                    onPress={() => {
                      void setAnswer("store", s);
                      setStoreOpen(false);
                    }}
                  />
                ))}
              </View>
            ) : null}
          </Section>
          {small(
            "Prices are checked by hand and dated. Aldi prices can vary in Scotland, Wales, Aldi Local and online.",
          )}
        </View>

        <Section title="Always in the cupboard">
          {pantry.loading ? (
            <LoadingState label="Loading your staples" />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {staples.length === 0 ? (
                <Body muted>
                  No staples yet. Add the oil, rice and tins you always have so they never land on
                  the shopping list.
                </Body>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {staples.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.ingredient}
                    selected={item.confirmed}
                    accessibilityLabel={`${item.ingredient}, ${item.confirmed ? "in the cupboard" : "not in the cupboard"}`}
                    onPress={() =>
                      void pantry.update(item.id, {
                        confirmed: !item.confirmed,
                        updatedAt: todayISO(),
                      })
                    }
                  />
                ))}
                {missingStaples.length > 0 ? (
                  <Chip
                    label={addOpen ? "Done" : "Add staple"}
                    icon={addOpen ? "checkmark" : "add"}
                    onPress={() => setAddOpen((v) => !v)}
                  />
                ) : null}
              </View>
              {addOpen && missingStaples.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                  {missingStaples.map((pack) => (
                    <Chip
                      key={pack.key}
                      label={pack.name}
                      icon="add"
                      accessibilityLabel={`Add ${pack.name} as a staple`}
                      onPress={() =>
                        void pantry.add({
                          ingredient: pack.name,
                          quantity: pack.size,
                          unit: pack.unit,
                          isStaple: true,
                          fromWeek: "",
                          confirmed: true,
                          updatedAt: todayISO(),
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </Section>

        <Section title="Foods we don't eat">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {EXCLUSIONS.map((e) => (
              <Chip
                key={e.key}
                label={e.label}
                tone="primary"
                selected={excluded.includes(e.key)}
                onPress={() => toggleExclusion(e.key)}
              />
            ))}
          </View>
          <NavRow
            label="Vegetarian nights"
            value={vegNights === 0 ? "None" : `${vegNights} a week`}
            accessibilityLabel={`Vegetarian nights, ${vegNights === 0 ? "none" : `${vegNights} a week`}. Tap to change.`}
            onPress={() => void setAnswer("vegnights", String(vegNights >= 3 ? 0 : vegNights + 1))}
          />
        </Section>

        <Section title="Plan reminder">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <Body>Plan reminder</Body>
            <Switch
              accessibilityLabel="Plan reminder"
              value={reminder.enabled}
              disabled={!reminder.ready}
              onValueChange={(v) => void toggleReminder(v)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.surface}
            />
          </View>
          <NavRow
            label="Time"
            value={formatTime(reminder.hour, reminder.minute)}
            expanded={timeOpen}
            onPress={() => setTimeOpen((v) => !v)}
          />
          {timeOpen ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              {REMINDER_TIMES.map(([h, m]) => (
                <Chip
                  key={`${h}:${m}`}
                  label={formatTime(h, m)}
                  tone="primary"
                  selected={reminder.hour === h && reminder.minute === m}
                  onPress={() => {
                    void reminder.setTime(h, m);
                    setTimeOpen(false);
                  }}
                />
              ))}
            </View>
          ) : null}
          {reminderNote || reminder.permission === "denied" ? (
            <Body muted size={theme.font.size.body}>
              {reminderNote ??
                "Notifications are off for Five Dinners. Allow them in your phone's Settings to get reminders."}
            </Body>
          ) : (
            <Body muted size={theme.font.size.body}>
              Repeats every day at this time, so Sunday planning never slips by.
            </Body>
          )}
        </Section>

        <Section title="Your plan">
          <View style={{ gap: theme.spacing.xs }}>
            {purchases.isPremium ? (
              <Body weight="500">
                Premium{purchases.activeOffer ? ` · ${purchases.activeOffer.label}` : ""}
              </Body>
            ) : (
              <Body>Free week · ends {freeEnds}</Body>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
              }}
            >
              {purchases.isPremium ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Manage subscription"
                  hitSlop={8}
                  onPress={() => void Linking.openURL(manageUrl)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 36, justifyContent: "center" })}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body + 1,
                      fontFamily: theme.font.family,
                      textDecorationLine: "underline",
                    }}
                  >
                    Manage subscription
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Keep cooking, see the one-off offer"
                  hitSlop={8}
                  onPress={() => purchases.openPaywall()}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                    minHeight: 36,
                    justifyContent: "center",
                    flexShrink: 1,
                  })}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body + 1,
                      fontWeight: theme.font.weight.medium,
                      fontFamily: theme.font.family,
                      textDecorationLine: "underline",
                    }}
                  >
                    Keep cooking{defaultOffer ? ` — ${defaultOffer.price} one-off` : ""} ›
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchase"
                disabled={purchases.status === "restoring"}
                hitSlop={8}
                onPress={() => void restore()}
                style={({ pressed }) => ({
                  opacity: pressed || purchases.status === "restoring" ? 0.6 : 1,
                  minHeight: 36,
                  justifyContent: "center",
                })}
              >
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.font.size.body,
                    fontFamily: theme.font.family,
                    textDecorationLine: "underline",
                  }}
                >
                  {purchases.status === "restoring" ? "Restoring…" : "Restore purchase"}
                </Text>
              </Pressable>
            </View>
            {restoreNote || purchases.error ? (
              <Body muted size={theme.font.size.body}>
                {restoreNote ?? purchases.error}
              </Body>
            ) : null}
          </View>
        </Section>

        <Section title="Appearance">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {(["system", "light", "dark"] as const).map((mode) => (
              <Chip
                key={mode}
                label={mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
                tone="primary"
                selected={appearance === mode}
                onPress={() => setAppearance(mode)}
              />
            ))}
          </View>
        </Section>

        {hasLegal ? (
          <Section title="Support and legal">
            {appInfo.supportEmail
              ? linkRow("Contact support", "mail-outline", `mailto:${appInfo.supportEmail}`)
              : null}
            {appInfo.privacyUrl
              ? linkRow("Privacy Policy", "open-outline", appInfo.privacyUrl)
              : null}
            {appInfo.termsUrl ? linkRow("Terms of Use", "open-outline", appInfo.termsUrl) : null}
          </Section>
        ) : null}

        <View style={{ alignItems: "center", gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Replay onboarding"
            hitSlop={10}
            onPress={() => void resetOnboarding()}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
                fontFamily: theme.font.family,
              }}
            >
              Replay onboarding
            </Text>
          </Pressable>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontFamily: theme.font.family,
              textAlign: "center",
            }}
          >
            {appInfo.name} · {RECIPES.length} tested recipes · Version {appInfo.version}
          </Text>
          <AiImage
            name={purchases.isPremium ? "penny-happy" : "penny-neutral"}
            style={{
              width: 64,
              height: 72,
              resizeMode: "contain",
              backgroundColor: "transparent",
            }}
          />
        </View>
      </ScrollView>
    </>
  );
}
