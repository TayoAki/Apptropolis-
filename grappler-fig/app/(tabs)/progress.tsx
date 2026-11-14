// Progress: the streak, level, this week's training, the last session's card and today's
// nutrition. Logging a meal photo is a premium feature; it estimates the meal with the AI.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { EmptyState } from "../../components/empty-state";
import { Lottie, Celebrate } from "../../components/lottie";
import { FightNightCard } from "../../components/progress/fight-night";
import { displayFont, monoFont, Panel } from "../../components/progress/panel";
import { WeeklyTraining } from "../../components/progress/week";
import {
  CountUp,
  GrowBar,
  PressScale,
  Skeleton,
  Stagger,
  haptic,
} from "../../components/motion";
import { track } from "../../data/analytics";
import { useAI } from "../../data/ai";
import { pickPhoto } from "../../data/photos";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  currentStreak,
  dayTotals,
  formatGrams,
  levelProgress,
  totalXp,
  weekActivity,
  type Meal,
  type WorkoutSession,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const LEVEL_TITLES = [
  "Newcomer",
  "Jab Ready",
  "Hook Rookie",
  "Pad Holder",
  "Sparring Ready",
  "Ring Tested",
  "Iron Chin",
  "Golden Glove",
  "Ring General",
  "Champion",
];

/** Reads the AI's JSON estimate; null when it isn't a usable meal. */
function parseMeal(text: string): { name: string; calories: number; proteinGrams: number } | null {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const calories = Number(value.calories);
    const proteinGrams = Number(value.proteinGrams);
    if (!Number.isFinite(calories) || !Number.isFinite(proteinGrams)) return null;
    const name =
      typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 60) : "Meal";
    return { name, calories: Math.round(calories), proteinGrams: Math.round(proteinGrams) };
  } catch {
    return null;
  }
}

export default function ProgressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sessions = useCollection<WorkoutSession>("workout_sessions");
  const meals = useCollection<Meal>("meals");
  const { isPremium, openPaywall } = usePurchases();
  const ai = useAI();
  const [mealError, setMealError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  const loading = sessions.loading || meals.loading;
  const empty = !loading && sessions.items.length === 0;
  const sorted = useMemo(
    () => [...sessions.items].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions.items],
  );
  const latest = sorted[0];
  const fix = sorted.find((session) => session.topFix)?.topFix ?? "";
  const streak = currentStreak(sessions.items);
  const level = levelProgress(totalXp(sessions.items));
  const title = LEVEL_TITLES[(level.level - 1) % LEVEL_TITLES.length]!;
  const week = weekActivity(sessions.items);
  const today = dayTotals(meals.items);
  // A real achievement: every full week of training in a row.
  const milestone = streak > 0 && streak % 7 === 0 ? streak : 0;

  async function logMeal() {
    if (!isPremium) {
      openPaywall();
      return;
    }
    setLogged(false);
    setMealError(null);
    const photo = await pickPhoto({ source: "camera" });
    if (!photo) return;
    const reply = await ai.ask({
      prompt:
        'Estimate this meal for a food log. Reply with JSON only: {"name": a short meal name, "calories": whole number, "proteinGrams": whole number}.',
      instructions: "You estimate calories and protein from a photo of one meal. Assume a normal adult portion.",
      photo,
      json: true,
    });
    if (!reply) return;
    const meal = parseMeal(reply);
    if (!meal) {
      setMealError("Couldn't read the estimate. Try a clearer photo.");
      return;
    }
    await meals.add({ ...meal, loggedAt: new Date().toISOString() });
    haptic("success");
    track("meal_logged");
    setLogged(true);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <AiImage
            prompt="a flame icon, flat and bold, red and orange, no text, transparent background"
            fit="contain"
            style={{ width: 22, height: 22 }}
          />
          <CountUp
            value={streak}
            style={{
              color: theme.colors.text,
              fontFamily: displayFont,
              fontSize: theme.font.size.headline,
            }}
          />
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: displayFont,
              fontSize: theme.font.size.headline,
            }}
          >
            DAYS
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{
            flex: 2,
            textAlign: "center",
            color: theme.colors.text,
            fontFamily: displayFont,
            fontSize: theme.font.size.title,
            letterSpacing: 1,
          }}
        >
          PROGRESS
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={12}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AiImage
              prompt="a settings gear icon, flat line style, light grey, no text, transparent background"
              fit="contain"
              style={{ width: 28, height: 28 }}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        {loading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={96} radius={theme.radius.md} />
            <Skeleton height={150} radius={theme.radius.md} />
            <Skeleton height={260} radius={theme.radius.md} />
          </View>
        ) : (
          <Stagger step={80} style={{ gap: theme.spacing.lg }}>
            {empty ? (
              <EmptyState
                icon="stats-chart-outline"
                title="Your progress starts with one session"
                body="Finish a round set on the Train tab. Your level, streak and weekly rounds build from there."
                actionLabel="Start training"
                onAction={() => router.navigate("/")}
              />
            ) : null}

            {latest ? (
              <Panel>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: theme.colors.text,
                    fontFamily: displayFont,
                    fontSize: theme.font.size.title,
                    letterSpacing: 0.5,
                  }}
                >
                  {`LEVEL ${level.level} — ${title.toUpperCase()}`}
                </Text>
                <GrowBar progress={level.fraction} height={12} />
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <CountUp
                    value={level.into}
                    format={(n) => Math.round(n).toLocaleString()}
                    style={{
                      color: theme.colors.text,
                      fontFamily: monoFont,
                      fontSize: theme.font.size.body,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontFamily: monoFont,
                      fontSize: theme.font.size.body,
                    }}
                  >
                    {` / ${level.needed.toLocaleString()} XP`}
                  </Text>
                </View>
              </Panel>
            ) : null}

            {latest ? (
              <Panel>
                <WeeklyTraining days={week} />
              </Panel>
            ) : null}

            {latest ? <FightNightCard session={latest} fix={fix} /> : null}

            <Panel>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.text,
                  fontFamily: displayFont,
                  fontSize: theme.font.size.title,
                  letterSpacing: 0.5,
                }}
              >
                NUTRITION LOG
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1,
                }}
              >
                FIGHTER MACROS · TODAY
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: theme.spacing.md,
                }}
              >
                <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
                  <View>
                    <CountUp
                      value={today.protein}
                      format={(n) => formatGrams(n)}
                      style={{
                        color: theme.colors.text,
                        fontFamily: displayFont,
                        fontSize: theme.font.size.headline,
                      }}
                    />
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption,
                      }}
                    >
                      PROTEIN
                    </Text>
                  </View>
                  <View>
                    <CountUp
                      value={today.calories}
                      format={(n) => Math.round(n).toLocaleString()}
                      style={{
                        color: theme.colors.text,
                        fontFamily: displayFont,
                        fontSize: theme.font.size.headline,
                      }}
                    />
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption,
                      }}
                    >
                      KCAL
                    </Text>
                  </View>
                </View>

                <PressScale
                  onPress={() => void logMeal()}
                  disabled={ai.loading}
                  scaleTo={0.94}
                  haptic="light"
                  accessibilityRole="button"
                  accessibilityLabel="Log meal photo"
                  accessibilityState={{ disabled: ai.loading, busy: ai.loading }}
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.background,
                    opacity: ai.loading ? 0.6 : 1,
                  }}
                >
                  <Ionicons
                    name={isPremium ? "camera-outline" : "lock-closed-outline"}
                    size={22}
                    color={theme.colors.text}
                  />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {ai.loading ? "Reading the meal…" : "Log meal photo"}
                  </Text>
                </PressScale>
              </View>

              {mealError ?? ai.error ? (
                <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
                  {mealError ?? ai.error}
                </Text>
              ) : null}
              {logged ? <Lottie name="success" size={64} /> : null}
            </Panel>
          </Stagger>
        )}
      </ScrollView>
      <Celebrate trigger={milestone} />
    </View>
  );
}
