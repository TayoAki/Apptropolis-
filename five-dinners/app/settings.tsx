import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Children, useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingState } from "../components/EmptyState";
import { Penny } from "../components/Penny";
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

/** 24-hour times, the same way onboarding writes them ("9:30", "17:00"). */
function formatTime(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
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
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
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
            paddingVertical: theme.spacing.sm,
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
        fontSize: size ?? theme.font.size.body + 2,
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
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
      })}
    >
      <Ionicons
        name={icon}
        size={20}
        color={enabled ? theme.colors.text : theme.colors.textMuted + "80"}
      />
    </Pressable>
  );
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.textMuted,
        borderRadius: theme.radius.md,
        overflow: "hidden",
      }}
    >
      {button("remove", onDecrease, canDecrease, `Decrease ${noun}`)}
      <View
        style={{
          minWidth: 52,
          paddingHorizontal: theme.spacing.sm,
          alignItems: "center",
          justifyContent: "center",
          height: 44,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.colors.textMuted,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body + 2,
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
  const strong = active && tone === "primary";
  const color = strong
    ? theme.colors.primary
    : active
      ? theme.colors.text
      : theme.colors.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={2}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        minHeight: 40,
        paddingHorizontal: theme.spacing.sm + 4,
        borderRadius: theme.radius.pill,
        // The outline is what makes a chip a control, so it is never the faint hairline color.
        borderWidth: strong ? 1.5 : 1,
        borderColor: strong ? theme.colors.primary : theme.colors.textMuted,
        backgroundColor: pressed
          ? theme.colors.surfaceAlt
          : active
            ? color + "14"
            : "transparent",
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
          fontWeight: active ? theme.font.weight.medium : theme.font.weight.regular,
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
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
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
          name={expanded === undefined ? "chevron-forward" : expanded ? "chevron-up" : "chevron-down"}
          size={18}
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
  // A one-off purchase has nothing to manage in the store's subscription settings.
  const activeIsOneOff = purchases.activeOffer
    ? purchases.activeOffer.period === "lifetime" ||
      /one-?off|one-time/i.test(purchases.activeOffer.label)
    : false;
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
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Body>{label}</Body>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
    </Pressable>
  );

  const note = theme.font.size.caption + 1;
  const small = (text: string) => (
    <Text
      style={{
        color: theme.colors.textMuted,
        fontSize: note,
        fontFamily: theme.font.family,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      {text}
    </Text>
  );

  return (
    <>
      <Stack.Screen
        options={{ title: "Settings", headerStyle: { backgroundColor: theme.colors.background } }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          padding: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.md,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
      >
        <Section title="Household">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flexShrink: 1 }}>
                <Body>Dinner budget</Body>
              </View>
              <Stepper
                noun="budget"
                label="Dinner budget for the week"
                value={`£${Math.round(budget)}`}
                canDecrease={budget > 10}
                canIncrease={budget < 100}
                onDecrease={() => void setAnswer("weeklybudget", `£${Math.max(10, budget - 5)}`)}
                onIncrease={() => void setAnswer("weeklybudget", `£${Math.min(100, budget + 5)}`)}
              />
            </View>
            <Body muted size={note}>
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Body>Vegetarian nights</Body>
            </View>
            <Stepper
              noun="vegetarian nights"
              label="Vegetarian nights a week"
              value={vegNights === 0 ? "None" : String(vegNights)}
              canDecrease={vegNights > 0}
              canIncrease={vegNights < 3}
              onDecrease={() => void setAnswer("vegnights", String(vegNights - 1))}
              onIncrease={() => void setAnswer("vegnights", String(vegNights + 1))}
            />
          </View>
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
              trackColor={{ true: theme.colors.primary, false: theme.colors.textMuted }}
              ios_backgroundColor={theme.colors.textMuted}
              thumbColor={theme.colors.onPrimary}
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
            <Body muted size={note}>
              {reminderNote ??
                "Notifications are off for Five Dinners. Allow them in your phone's Settings to get reminders."}
            </Body>
          ) : (
            <Body muted size={note}>
              Repeats every day at this time, so Sunday planning never slips by.
            </Body>
          )}
        </Section>

        <Section title="Your plan">
          <View style={{ minHeight: 44, justifyContent: "center" }}>
            {purchases.isPremium ? (
              <Body weight="500">
                Premium{purchases.activeOffer ? ` · ${purchases.activeOffer.label}` : ""}
              </Body>
            ) : (
              <Body>Free week · ends {freeEnds}</Body>
            )}
          </View>
          {purchases.isPremium ? (
            activeIsOneOff ? null : (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Manage subscription"
                onPress={() => void Linking.openURL(manageUrl)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Body>Manage subscription</Body>
                <Ionicons name="open-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep cooking, see the one-off offer"
              onPress={() => purchases.openPaywall()}
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  flexShrink: 1,
                  color: theme.colors.primary,
                  fontSize: theme.font.size.body + 2,
                  fontWeight: theme.font.weight.medium,
                  fontFamily: theme.font.family,
                }}
              >
                Keep cooking{defaultOffer ? ` — ${defaultOffer.price} one-off` : ""}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
            </Pressable>
          )}
          <View style={{ gap: theme.spacing.xs }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Restore purchase"
              accessibilityState={{ busy: purchases.status === "restoring" }}
              disabled={purchases.status === "restoring"}
              onPress={() => void restore()}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Body muted={purchases.status === "restoring"}>
                {purchases.status === "restoring" ? "Restoring…" : "Restore purchase"}
              </Body>
            </Pressable>
            {restoreNote || purchases.error ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  color: theme.colors.textMuted,
                  fontSize: note,
                  fontFamily: theme.font.family,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                {restoreNote ?? purchases.error}
              </Text>
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
              ? linkRow("Privacy policy", "open-outline", appInfo.privacyUrl)
              : null}
            {appInfo.termsUrl ? linkRow("Terms of use", "open-outline", appInfo.termsUrl) : null}
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
              fontSize: note,
              fontFamily: theme.font.family,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {appInfo.name} · {RECIPES.length} tested recipes · Version {appInfo.version}
          </Text>
          <Penny mood={purchases.isPremium ? "happy" : "neutral"} width={64} height={72} />
        </View>
      </ScrollView>
    </>
  );
}
