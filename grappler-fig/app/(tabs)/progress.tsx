// Progress: the streak, level, this week's training, the last session's card and today's
// nutrition. Logging a meal photo is a premium feature; it estimates the meal with the AI.
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../../components/card";
import { EmptyState } from "../../components/empty-state";
import { Lottie, Celebrate } from "../../components/lottie";
import { FightNightCard } from "../../components/progress/fight-night";
import { goPro } from "../../components/paywall/open";
import { WeeklyTraining } from "../../components/progress/week";
import { CountUp, GrowBar, Skeleton, Stagger, haptic } from "../../components/motion";
import { ScreenHeader, SecondaryButton, StreakBadge, displayFace } from "../../components/ui";
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
  const sessions = useCollection<WorkoutSession>("workout_sessions");
  const meals = useCollection<Meal>("meals");
  const { isPremium } = usePurchases();
  const openPaywall = () => goPro("progress");
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

  const figure = [
    displayFace,
    { color: theme.colors.text, fontSize: theme.font.size.headline },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title="Progress"
        right={
          sessions.loading ? (
            <Skeleton width={72} height={32} radius={16} />
          ) : (
            <StreakBadge days={streak} />
          )
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        {loading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={112} radius={theme.radius.md} />
            <Skeleton height={176} radius={theme.radius.md} />
            <Skeleton height={240} radius={theme.radius.md} />
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
              <Card>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {`Level ${level.level} · ${title}`}
                </Text>
                <GrowBar progress={level.fraction} height={10} />
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.caption + 2,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {`${level.into.toLocaleString()} of ${level.needed.toLocaleString()} XP to level ${level.level + 1}`}
                </Text>
              </Card>
            ) : null}

            {latest ? (
              <Card>
                <WeeklyTraining days={week} />
              </Card>
            ) : null}

            {latest ? <FightNightCard session={latest} fix={fix} /> : null}

            <Card>
              <View style={{ gap: 2 }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  Nutrition log
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
                  Fighter macros today
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <CountUp value={today.protein} format={(n) => formatGrams(n)} style={figure} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
                    protein
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <CountUp
                    value={today.calories}
                    format={(n) => Math.round(n).toLocaleString()}
                    style={figure}
                  />
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
                    kcal
                  </Text>
                </View>
              </View>
              <SecondaryButton
                label={ai.loading ? "Reading the meal…" : "Log meal photo"}
                icon={isPremium ? "camera-outline" : "lock-closed-outline"}
                disabled={ai.loading}
                onPress={() => void logMeal()}
                accessibilityLabel={isPremium ? "Log meal photo" : "Log meal photo, part of Pro"}
              />
              {mealError ?? ai.error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: theme.colors.danger, fontSize: theme.font.size.caption + 2, lineHeight: 20 }}
                >
                  {mealError ?? ai.error}
                </Text>
              ) : null}
              {logged ? <Lottie name="success" size={64} /> : null}
            </Card>
          </Stagger>
        )}
      </ScrollView>
      <Celebrate trigger={milestone} />
    </View>
  );
}
