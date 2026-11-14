import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { Button } from "../components/Button";
import { LoadingState } from "../components/EmptyState";
import { useAppState } from "../data/app-state";
import { useCollection } from "../data/repo";
import { PACK_LIST, todayISO, type PantryItem } from "../data/schema";
import { useReminder } from "../data/reminders";
import { useTheme } from "../theme/ThemeProvider";

type StepId = "servings" | "budget" | "staples" | "reminder";
const STEPS: StepId[] = ["servings", "budget", "staples", "reminder"];

const SERVINGS = [
  { value: "1", note: "Just me" },
  { value: "2", note: "Two of us" },
  { value: "3–4", note: "A small family" },
  { value: "5+", note: "A full table" },
];

const BUDGETS = [
  { value: "£15", note: "Lean and careful" },
  { value: "£25", note: "A steady weekly shop" },
  { value: "£35", note: "Room for a treat" },
  { value: "£50", note: "Feeding a crowd" },
];

const SHORT_NAMES: Record<string, string> = {
  stock: "Stock cubes",
  curry: "Curry powder",
  rice: "Basmati rice",
};

const PICTURES: Record<string, string> = {
  oil: "a bottle of olive oil, soft hand-drawn illustration",
  rice: "a green paper bag of rice, soft hand-drawn illustration",
  penne: "a paper bag of penne pasta, soft hand-drawn illustration",
  spaghetti: "a bundle of dried spaghetti, soft hand-drawn illustration",
  tomatoes: "a tin of chopped tomatoes, soft hand-drawn illustration",
  onion: "a brown onion, soft hand-drawn illustration",
  garlic: "a bulb of garlic, soft hand-drawn illustration",
  stock: "a few yellow stock cubes, soft hand-drawn illustration",
  cumin: "a small jar of ground spice, soft hand-drawn illustration",
  paprika: "a small jar of red paprika, soft hand-drawn illustration",
  curry: "a small jar of yellow curry powder, soft hand-drawn illustration",
};

const REMINDER_HOURS = [8, 9, 10, 18];

const staplePacks = PACK_LIST.filter((p) => p.staple);

function formatHour(hour: number): string {
  return `${hour}:00`;
}

export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();
  const pantry = useCollection<PantryItem>("pantry_items");

  const [step, setStep] = useState(0);
  const [servings, setServings] = useState<string>(answers.servings ?? "");
  const [budget, setBudget] = useState<string>(answers.weeklybudget ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [hour, setHour] = useState(9);
  const [enabling, setEnabling] = useState(false);
  const [declined, setDeclined] = useState(false);
  const seeded = useRef(false);

  // Start the ticks from what the cupboard already says is in stock.
  useEffect(() => {
    if (pantry.loading || seeded.current) return;
    seeded.current = true;
    const keys = staplePacks
      .filter((pack) =>
        pantry.items.some((i) => i.ingredient === pack.name && i.confirmed && i.quantity > 0),
      )
      .map((p) => p.key);
    setSelected(new Set(keys));
  }, [pantry.loading, pantry.items]);

  const id = STEPS[step]!;
  const pad = theme.spacing.md;
  const contentWidth = Math.min(width, 560) - pad * 2;
  const gap = theme.spacing.sm;
  const tileWidth = Math.floor((contentWidth - gap * 3) / 4);

  const textBase = { fontFamily: theme.font.family } as const;
  const headingStyle = {
    ...textBase,
    color: theme.colors.text,
    fontSize: theme.font.size.headline,
    fontWeight: theme.font.weight.bold,
    textAlign: "center" as const,
  };
  const subStyle = {
    ...textBase,
    color: theme.colors.textMuted,
    fontSize: theme.font.size.body,
    textAlign: "center" as const,
    lineHeight: Math.round(theme.font.size.body * 1.45),
  };

  function pickServings(value: string) {
    setServings(value);
    void setAnswer("servings", value);
  }

  function pickBudget(value: string) {
    setBudget(value);
    void setAnswer("weeklybudget", value);
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveStaples() {
    setSaving(true);
    try {
      const names = staplePacks.filter((p) => selected.has(p.key)).map((p) => p.name);
      await setAnswer("staples", names.join(", "));
      for (const pack of staplePacks) {
        const on = selected.has(pack.key);
        const existing = pantry.items.find((i) => i.ingredient === pack.name);
        if (existing) {
          if (!existing.isStaple) continue;
          const needsStock = on && existing.quantity <= 0;
          if (existing.confirmed !== on || needsStock) {
            await pantry.update(existing.id, {
              confirmed: on,
              quantity: needsStock ? pack.size : existing.quantity,
              updatedAt: todayISO(),
            });
          }
        } else if (on) {
          await pantry.add({
            ingredient: pack.name,
            quantity: pack.size,
            unit: pack.unit,
            isStaple: true,
            fromWeek: "",
            confirmed: true,
            updatedAt: todayISO(),
          });
        }
      }
    } catch {
      // The ticks are a convenience; never block onboarding on them.
    } finally {
      setSaving(false);
    }
    setStep((s) => s + 1);
  }

  async function turnOnReminders() {
    setEnabling(true);
    let ok = false;
    try {
      ok = await reminder.enable({
        title: "Plan your five dinners",
        body: "Check what's left from last week's packs, then pick this week's dinners.",
        hour,
        minute: 0,
      });
    } catch {
      ok = false;
    }
    setEnabling(false);
    if (ok) void completeOnboarding();
    else setDeclined(true);
  }

  function onPrimary() {
    if (id === "servings" || id === "budget") setStep((s) => s + 1);
    else if (id === "staples") void saveStaples();
    else if (declined) void completeOnboarding();
    else void turnOnReminders();
  }

  const primaryLabel =
    id === "staples"
      ? "See my five dinners"
      : id === "reminder"
        ? declined
          ? "Start planning"
          : "Turn on reminders"
        : "Continue";

  const primaryDisabled =
    (id === "servings" && !servings) ||
    (id === "budget" && !budget) ||
    (id === "staples" && pantry.loading);

  const penny =
    id === "reminder"
      ? "penny-happy"
      : id === "staples"
        ? "penny-half-full"
        : "penny-neutral";

  function renderChoice(
    options: { value: string; note: string }[],
    current: string,
    onPick: (v: string) => void,
    label: string,
  ) {
    return (
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }} accessibilityLabel={label}>
        {options.map((option) => {
          const on = current === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.value}, ${option.note}`}
              onPress={() => onPick(option.value)}
              style={({ pressed }) => ({
                minHeight: 68,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                borderWidth: 2,
                borderColor: on ? theme.colors.primary : theme.colors.border,
                backgroundColor: on ? theme.colors.surface : theme.colors.surfaceAlt,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    ...textBase,
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {option.value}
                </Text>
                <Text
                  style={{
                    ...textBase,
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.body,
                  }}
                >
                  {option.note}
                </Text>
              </View>
              <Ionicons
                name={on ? "checkmark-circle" : "ellipse-outline"}
                size={28}
                color={on ? theme.colors.primary : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderStaples() {
    return (
      <View>
        <AiImage
          prompt="a wooden kitchen shelf with a bottle of olive oil, a bag of rice, a bag of pasta, a tin of tomatoes, a string of onions and a garlic bulb, soft hand-drawn illustration"
          style={{ height: 110, borderRadius: theme.radius.md, marginTop: theme.spacing.md }}
        />
        <Text
          style={{
            ...textBase,
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.medium,
            textAlign: "right",
            textTransform: "uppercase",
            letterSpacing: 1,
            fontVariant: ["tabular-nums"],
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          {selected.size} {selected.size === 1 ? "staple" : "staples"} already in
        </Text>
        {pantry.loading ? (
          <LoadingState label="Checking your cupboard" />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
            {staplePacks.map((pack) => {
              const on = selected.has(pack.key);
              const name = SHORT_NAMES[pack.key] ?? pack.name;
              return (
                <Pressable
                  key={pack.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${name} in the cupboard`}
                  onPress={() => toggle(pack.key)}
                  style={({ pressed }) => ({
                    width: tileWidth,
                    minHeight: 104,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingHorizontal: theme.spacing.xs,
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    borderWidth: 2,
                    borderColor: on ? theme.colors.primary : theme.colors.surface,
                    backgroundColor: theme.colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ position: "absolute", top: 4, right: 4 }}>
                    <Ionicons
                      name={on ? "checkmark" : "ellipse-outline"}
                      size={on ? 20 : 18}
                      color={on ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </View>
                  <AiImage
                    prompt={PICTURES[pack.key] ?? `${pack.name}, soft hand-drawn illustration`}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: theme.radius.sm,
                      marginBottom: theme.spacing.xs,
                      resizeMode: "contain",
                    }}
                  />
                  <Text
                    style={{
                      ...textBase,
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption + 1,
                      textAlign: "center",
                    }}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  function renderReminder() {
    return (
      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text
          style={{
            ...textBase,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
          }}
        >
          Which time suits you?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {REMINDER_HOURS.map((h) => {
            const on = hour === h;
            return (
              <Pressable
                key={h}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Remind me at ${formatHour(h)}`}
                onPress={() => setHour(h)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  minWidth: 76,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  borderWidth: 2,
                  borderColor: on ? theme.colors.primary : theme.colors.border,
                  backgroundColor: on ? theme.colors.primary : theme.colors.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    ...textBase,
                    color: on ? theme.colors.onPrimary : theme.colors.text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatHour(h)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            gap: theme.spacing.xs,
          }}
        >
          <Text
            style={{
              ...textBase,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            What you'll see at {formatHour(hour)}
          </Text>
          <Text
            style={{
              ...textBase,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Plan your five dinners
          </Text>
          <Text style={{ ...textBase, color: theme.colors.text, fontSize: theme.font.size.body }}>
            Check what's left from last week's packs, then pick this week's dinners.
          </Text>
        </View>
        {declined ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              ...textBase,
              color: theme.colors.warning,
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            No problem. If you change your mind, allow notifications for this app in your phone's
            Settings, then switch the reminder on in Five Dinners settings.
          </Text>
        ) : null}
      </View>
    );
  }

  const title =
    id === "servings"
      ? "How many are you cooking for?"
      : id === "budget"
        ? "Your dinner budget for the week"
        : id === "staples"
          ? "Tick what's already in the cupboard"
          : "A Sunday nudge to plan";

  const sub =
    id === "servings"
      ? "We scale every recipe and pack so the list fits your table."
      : id === "budget"
        ? "Just the five dinners. You can change it every Sunday."
        : id === "staples"
          ? "Anything you tick comes off the shopping list, and your first five dinners appear straight away."
          : "One reminder a day at a time you choose, so on Sunday morning you can confirm your leftovers and plan the next five dinners. Nothing else.";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top + theme.spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          paddingHorizontal: pad,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
      >
        <View style={{ width: 44, height: 44, justifyContent: "center" }}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={() => {
                setDeclined(false);
                setStep((s) => Math.max(0, s - 1));
              }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
            </Pressable>
          ) : null}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
          style={{ flex: 1, flexDirection: "row", gap: theme.spacing.xs }}
        >
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 5,
                borderRadius: theme.radius.pill,
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceAlt,
              }}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={8}
          onPress={() => void completeOnboarding()}
          style={({ pressed }) => ({
            minWidth: 44,
            height: 44,
            alignItems: "flex-end",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              ...textBase,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
            }}
          >
            Skip
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xl + theme.spacing.lg,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={headingStyle}>
          {title}
        </Text>
        <Text style={{ ...subStyle, marginTop: theme.spacing.sm }}>{sub}</Text>
        {id === "servings" ? renderChoice(SERVINGS, servings, pickServings, "Household size") : null}
        {id === "budget" ? renderChoice(BUDGETS, budget, pickBudget, "Weekly dinner budget") : null}
        {id === "staples" ? renderStaples() : null}
        {id === "reminder" ? renderReminder() : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: pad,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.md,
          gap: theme.spacing.sm,
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
        }}
      >
        {id === "staples" ? (
          <Text
            style={{
              ...textBase,
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 1,
              maxWidth: "62%",
              fontVariant: ["tabular-nums"],
            }}
          >
            Cooking for {servings || "—"} · {budget || "£—"} a week. Change any time in Settings.
          </Text>
        ) : null}
        <View>
          <View
            pointerEvents="none"
            style={{ position: "absolute", right: theme.spacing.lg, top: -48, width: 76, height: 64 }}
          >
            <AiImage
              name={penny}
              style={{ width: 76, height: 64, backgroundColor: "transparent", resizeMode: "contain" }}
            />
          </View>
          <Button
            label={primaryLabel}
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={saving || enabling}
            style={{ alignSelf: "stretch", borderRadius: theme.radius.md }}
          />
        </View>
        {id === "reminder" && !declined ? (
          <Button
            label="Not now"
            variant="ghost"
            onPress={() => void completeOnboarding()}
            disabled={enabling}
            style={{ alignSelf: "stretch" }}
          />
        ) : null}
      </View>
    </View>
  );
}
