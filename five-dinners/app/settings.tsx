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
import { applyAnswersToPlan, setStaple, usePlanData } from "../data/plan";
import type { Replacement } from "../data/planner";
import {
  EXCLUSION_CHOICES,
  MAX_SERVINGS,
  PACK_LIST,
  PRICE_SOURCE,
  PRICE_SOURCE_LINE,
  RECIPES,
  addDays,
  formatLongDate,
  getRecipe,
  readHousehold,
} from "../data/schema";
import { useAppearance, useTheme } from "../theme/ThemeProvider";

const BUDGET_STEP = 5;
const MIN_BUDGET = 10;
const MAX_BUDGET = 200;

function describeSwaps(swaps: Replacement[]): string {
  return swaps
    .map((s) => `${getRecipe(s.from)?.name ?? "A dinner"} is now ${getRecipe(s.to)?.name ?? "another dinner"}`)
    .join(". ");
}

const REMINDER_TIMES: [number, number][] = [
  [8, 0],
  [9, 30],
  [11, 0],
  [17, 0],
  [19, 0],
];

/** 12-hour times: "9:30 AM", "5:00 PM". */
function formatTime(hour: number, minute: number): string {
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
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
  const planData = usePlanData();
  const pantry = { items: planData.pantry, loading: planData.loading };

  const [timeOpen, setTimeOpen] = useState(false);
  // What the last change did to this week's plan, shown under the control that changed it.
  const [planNote, setPlanNoteState] = useState<{ at: "household" | "foods"; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const household = readHousehold(answers);
  const servings = household.servings;
  const budget = household.budget;
  const excluded = (answers.excluded ?? "").split(",").filter(Boolean);
  const allVegetarian = excluded.includes("vegetarian");
  const vegNights = household.vegNights;
  const hasSetupAnswers = Boolean(answers.servings || answers.weeklybudget);

  const staples = pantry.items.filter((p) => p.isStaple);
  const missingStaples = PACK_LIST.filter(
    (pack) => pack.staple && !staples.some((s) => s.packKey === pack.key),
  );

  /** Save an answer and apply it to the plan this week, so it changes what the app does now. */
  async function change(key: string, value: string) {
    const at = key === "servings" || key === "weeklybudget" ? "household" : "foods";
    const setPlanNote = (text: string | null) => setPlanNoteState(text ? { at, text } : null);
    await setAnswer(key, value);
    const swaps = await applyAnswersToPlan({ ...answers, [key]: value }, purchases.isPremium);
    if (key === "servings" && planData.status === "active") {
      setPlanNote(
        `This week's dinners not cooked yet are now for ${value}.${swaps.length ? ` ${describeSwaps(swaps)}.` : ""}`,
      );
    } else if (swaps.length) {
      setPlanNote(`${describeSwaps(swaps)}.`);
    } else if (planData.status === "active" && key !== "weeklybudget") {
      setPlanNote("This week's plan already fits.");
    } else {
      setPlanNote(null);
    }
  }

  function toggleExclusion(key: string) {
    const next = excluded.includes(key) ? excluded.filter((k) => k !== key) : [...excluded, key];
    void change("excluded", next.join(","));
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
  // A one-time purchase has nothing to manage in the store's subscription settings.
  const activeIsOneOff = purchases.activeOffer
    ? purchases.activeOffer.period === "lifetime"
    : false;
  const manageUrl =
    Platform.OS === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
  const hasLegal = Boolean(appInfo.supportEmail || appInfo.privacyUrl || appInfo.termsUrl);
  const freeLastDay = planData.firstPlan ? formatLongDate(addDays(planData.firstPlan.weekStart, 6)) : "";
  const freeLine = !planData.firstPlan
    ? "Free week · starts with your first plan"
    : planData.inFreeWeek
      ? `Free week · ends ${freeLastDay}`
      : `Free week ended ${freeLastDay}`;

  const noteView = planNote ? (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        color: theme.colors.text,
        fontSize: theme.font.size.body,
        fontFamily: theme.font.family,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm + 4,
      }}
    >
      {planNote.text}
    </Text>
  ) : null;

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
              canIncrease={servings < MAX_SERVINGS}
              onDecrease={() => void change("servings", String(servings - 1))}
              onIncrease={() => void change("servings", String(servings + 1))}
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
                value={`$${Math.round(budget)}`}
                canDecrease={budget > MIN_BUDGET}
                canIncrease={budget < MAX_BUDGET}
                onDecrease={() =>
                  void change("weeklybudget", `$${Math.max(MIN_BUDGET, Math.round(budget) - BUDGET_STEP)}`)
                }
                onIncrease={() =>
                  void change("weeklybudget", `$${Math.min(MAX_BUDGET, Math.round(budget) + BUDGET_STEP)}`)
                }
              />
            </View>
            <Body muted size={note}>
              For the five dinners, not the whole shop. Next week's plan is chosen to fit it.
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

        {planNote?.at === "household" ? noteView : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Section title="Prices">
            <View style={{ minHeight: 44, justifyContent: "center", gap: 2 }}>
              <Body>Aldi · ZIP {PRICE_SOURCE.zip}</Body>
              <Body muted size={note}>
                {PRICE_SOURCE.area}
              </Body>
            </View>
          </Section>
          {small(
            `${PRICE_SOURCE_LINE} Meat and zucchini are sold by weight, so those prices are aldi.us estimates per pack. Paid prices you log are kept in Price history.`,
          )}
        </View>

        <Section title="Always in the cupboard">
          {pantry.loading ? (
            <LoadingState label="Loading your staples" />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {staples.length === 0 ? (
                <Body muted>
                  No staples yet. Add the oil, rice and cans you keep in stock so they come off the
                  shopping list.
                </Body>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {staples.map((item) => {
                  const on = item.confirmed && item.quantity > 0;
                  return (
                    <Chip
                      key={item.id}
                      label={item.ingredient}
                      selected={on}
                      accessibilityLabel={`${item.ingredient}, ${on ? "in the cupboard" : "not in the cupboard"}`}
                      onPress={() => void setStaple(item.packKey, !on)}
                    />
                  );
                })}
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
                      onPress={() => void setStaple(pack.key, true)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </Section>

        <Section title="Foods we don't eat">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {EXCLUSION_CHOICES.map((e) => (
              <Chip
                key={e.key}
                label={e.label}
                tone="primary"
                selected={excluded.includes(e.key)}
                onPress={() => toggleExclusion(e.key)}
              />
            ))}
          </View>
          {allVegetarian ? null : (
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
                canIncrease={vegNights < 5}
                onDecrease={() => void change("vegnights", String(vegNights - 1))}
                onIncrease={() => void change("vegnights", String(vegNights + 1))}
              />
            </View>
          )}
          <Body muted size={note}>
            Dinners not cooked yet are swapped to fit straight away.
          </Body>
        </Section>
        {planNote?.at === "foods" ? noteView : null}

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
              Repeats every day at this time, so planning never slips by.
            </Body>
          )}
        </Section>

        <Section title="Your plan">
          <View style={{ minHeight: 44, justifyContent: "center" }}>
            {purchases.isPremium ? (
              <Body weight="500">
                {purchases.activeOffer ? purchases.activeOffer.label : "Premium"} · paid once
              </Body>
            ) : (
              <Body>{freeLine}</Body>
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
              accessibilityLabel="Unlimited weekly plans, see the one-time offer"
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
                Unlimited weekly plans{defaultOffer ? ` — ${defaultOffer.price} once` : ""}
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
