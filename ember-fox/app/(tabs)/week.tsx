import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { GameFormCard } from "../../components/week/GameFormCard";
import { InsightsCard } from "../../components/week/InsightsCard";
import { WeeklyProgressCard, type DayBar } from "../../components/week/WeeklyProgressCard";
import { Skeleton, Stagger } from "../../components/motion";
import { showPaywall } from "../../components/paywallSource";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useShareImage } from "../../components/share";
import { useAthlete } from "../../components/useAthlete";
import { useAI } from "../../data/ai";
import { usePurchases } from "../../data/purchases";
import { comingDayName, formatDate, formatDay, totalOn } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Standard drinks in one day that the chart's dashed line marks. */
const DAILY_GUIDE = 2;
/** Alcohol-free days the week is aiming for. */
const FREE_DAY_TARGET = 4;

/** ISO week number (weeks start on Monday, week 1 holds the year's first Thursday). */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

export default function WeekScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const athlete = useAthlete();
  const { drinks, checkins, days, now, today, stats, outlook, limit } = athlete;
  const { isPremium } = usePurchases();
  const coach = useAI();
  const share = useShareImage();

  const loading = athlete.loading;
  const empty = !loading && drinks.items.length === 0 && checkins.items.length === 0;
  const show = !loading && !empty;

  const total = athlete.weekTotal;
  const freeDays = athlete.freeDaysThisWeek;

  const dayBars: DayBar[] = days.map((key) => ({
    key,
    label: formatDay(key),
    value: totalOn(drinks.items, key),
    gameDay: athlete.gameDays.includes(key),
    today: key === today,
    alcoholFree: checkins.items.some((c) => c.date === key && c.alcohol_free),
  }));

  const nextGame = athlete.nextGame ? comingDayName(athlete.nextGame, now) : null;
  const range = `${formatDate(days[0]!)} to ${formatDate(days[6]!)}`;

  const teaser = `Your stamina score is ${stats.stamina} this week. ${
    isPremium
      ? "Ask your coach which days pull it down."
      : "Trend insights show which days pull it down."
  }`;

  function askCoach() {
    void coach.ask({
      prompt: `This week's standard drinks by day: ${dayBars
        .map((d) => `${d.label} ${d.value}`)
        .join(", ")}. Weekly total ${total} against a limit of ${limit}. Alcohol-free days ${freeDays} of ${FREE_DAY_TARGET}. Stamina score ${stats.stamina} of 100 and recovery ${stats.recovery} of 100. Give one specific trend from this week and one thing to do before the next game. Two short sentences.`,
      instructions:
        "You are a practical sports coach for a recreational athlete. Plain English, no medical claims, and never advice on whether to drive.",
    });
  }

  function shareForm() {
    void share.share({
      message: `My game form is ${stats.form} of 100 (${outlook.title.toLowerCase()}) with ${freeDays} alcohol-free ${
        freeDays === 1 ? "day" : "days"
      } this week.`,
      title: "Game form",
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Stagger step={90} style={{ gap: theme.spacing.lg }}>
        <ScreenHeader title={`Week ${isoWeek(now)}`} subtitle={range} />

        {loading ? (
          <View style={{ gap: theme.spacing.lg }}>
            <Skeleton height={340} radius={theme.radius.lg} />
            <Skeleton height={200} radius={theme.radius.lg} />
            <Skeleton height={170} radius={theme.radius.lg} />
          </View>
        ) : null}

        {empty ? (
          <EmptyState
            icon="bar-chart-outline"
            title="Nothing to chart yet"
            body="Log a drink or an alcohol-free day on Tonight and this week fills in here."
            actionLabel="Go to Tonight"
            onAction={() => router.navigate("/")}
          />
        ) : null}

        {show ? (
          <WeeklyProgressCard
            days={dayBars}
            guide={DAILY_GUIDE}
            total={total}
            limit={limit}
            freeDays={freeDays}
            freeTarget={FREE_DAY_TARGET}
            over={athlete.over}
          />
        ) : null}

        {show ? (
          <GameFormCard
            form={stats.form}
            outlook={outlook}
            freeDays={freeDays}
            nextGame={nextGame}
            cardRef={share.ref}
            onShare={shareForm}
            sharing={share.sharing}
          />
        ) : null}

        {show ? (
          <InsightsCard
            premium={isPremium}
            teaser={teaser}
            answer={coach.answer}
            loading={coach.loading}
            error={coach.error}
            onAsk={askCoach}
            onUnlock={() => showPaywall("week_insights")}
          />
        ) : null}
      </Stagger>
    </ScrollView>
  );
}
