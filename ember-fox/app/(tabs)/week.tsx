import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { GameFormCard } from "../../components/week/GameFormCard";
import { InsightsCard, type Trends } from "../../components/week/InsightsCard";
import { WeeklyProgressCard, type DayBar } from "../../components/week/WeeklyProgressCard";
import { Skeleton, Stagger } from "../../components/motion";
import { showPaywall } from "../../components/paywallSource";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useShareImage } from "../../components/share";
import { useAthlete } from "../../components/useAthlete";
import { useAI } from "../../data/ai";
import { backend } from "../../data/backend";
import { usePurchases } from "../../data/purchases";
import {
  addDays,
  comingDayName,
  firstEntryDay,
  formatDate,
  formatDay,
  gameEveAverages,
  gameWeekdays,
  heaviestWeekday,
  parseDay,
  totalOn,
  weeklyHistory,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Standard drinks in one day that the chart's dashed line marks. */
const DAILY_GUIDE = 2;
/** Alcohol-free days the week is aiming for. */
const FREE_DAY_TARGET = 4;

/** ISO week number of the week that holds `date` (week 1 holds the year's first Thursday). */
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
  const [shareNote, setShareNote] = useState<string | null>(null);

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
  // The week's number is its Thursday's ISO week, so a Sunday-start week gets the same number
  // as the Monday-start week it mostly overlaps.
  const weekNumber = isoWeek(addDays(parseDay(athlete.weekKey), athlete.startsOn === 1 ? 3 : 4));

  // The Plus trends, all worked out here from the person's own log.
  const history = weeklyHistory(drinks.items, checkins.items, athlete.weekKey, 12);
  const first = firstEntryDay(drinks.items, checkins.items);
  const daysTracked = first
    ? Math.round((parseDay(today).getTime() - parseDay(first).getTime()) / 86400000) + 1
    : 0;
  const since = first && first > history[0]!.weekStart ? first : history[0]!.weekStart;
  const weekdays = gameWeekdays(athlete.answers);
  const trends: Trends = {
    history,
    limit: athlete.usualLimit,
    daysTracked,
    weekday: daysTracked >= 14 ? heaviestWeekday(drinks.items, since) : null,
    gameEve: daysTracked >= 14 ? gameEveAverages(drinks.items, weekdays, since, now) : null,
    gameDaysSet: weekdays.length > 0,
  };

  const teaser = `Your stamina score is ${stats.stamina} this week. Trend insights show which days pull it down: your heaviest weekday, your last 12 weeks and how your drinking lines up with game days.`;

  function askCoach() {
    void coach.ask({
      prompt: `This week's standard drinks by day: ${dayBars
        .map((d) => `${d.label} ${d.value}`)
        .join(", ")}. Weekly total ${total} against a limit of ${limit}${
        athlete.over ? `, so ${Math.round((total - limit) * 10) / 10} over the limit` : ""
      }. Alcohol-free days ${freeDays} of ${FREE_DAY_TARGET}. Stamina score ${stats.stamina} of 100 and recovery ${stats.recovery} of 100. Give one specific trend from this week and one thing to do before the next game${
        athlete.over ? ", reflecting on the week going over the limit without blame" : ""
      }. Two short sentences.`,
      instructions:
        "You are a practical sports coach for a recreational athlete who is cutting down on alcohol. Plain English, no medical claims, no shaming, never suggest drinking more, and never give advice on whether it is safe to drive.",
    });
  }

  async function shareForm() {
    setShareNote(null);
    const shared = await share.share({
      message: `My game form is ${stats.form} of 100 (${outlook.title.toLowerCase()}) with ${freeDays} alcohol-free ${
        freeDays === 1 ? "day" : "days"
      } this week.`,
      title: "Game form",
    });
    if (!shared) setShareNote("Sharing isn't available here. Nothing was shared.");
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
        <ScreenHeader title={`Week ${weekNumber}`} subtitle={range} />

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
            onShare={() => void shareForm()}
            sharing={share.sharing}
            note={shareNote}
            onSetGameDays={() => router.push("/settings")}
          />
        ) : null}

        {show ? (
          <InsightsCard
            premium={isPremium}
            teaser={teaser}
            trends={trends}
            coach={{
              // The coach's written feedback runs on the app's AI service (App Cloud). Until
              // that is connected the button would only ever fail, so it isn't offered.
              available: Boolean(backend.apiUrl),
              answer: coach.answer,
              loading: coach.loading,
              error: coach.error,
              onAsk: askCoach,
            }}
            onUnlock={() => showPaywall("week_insights")}
            onOpenSettings={() => router.push("/settings")}
          />
        ) : null}
      </Stagger>
    </ScrollView>
  );
}
