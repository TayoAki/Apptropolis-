import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { GameFormCard } from "../../components/week/GameFormCard";
import { InsightsCard } from "../../components/week/InsightsCard";
import { WeeklyProgressCard, type DayBar } from "../../components/week/WeeklyProgressCard";
import { Skeleton, Stagger } from "../../components/motion";
import { useShareImage } from "../../components/share";
import { useAI } from "../../data/ai";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  athleteStats,
  dayKey,
  formatDate,
  formatDay,
  outlookFor,
  SPORTS,
  totalForWeek,
  totalOn,
  weekDays,
  weekStart,
  type Checkin,
  type Drink,
  type Sport,
  type WeeklyGoal,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Standard drinks a typical night out is worth; drawn as the dashed guide line. */
const DAILY_GUIDE = 2;
/** Alcohol-free days the week is aiming for. */
const DRY_TARGET = 4;
/** Weekly limit when no goal is saved for this week. */
const DEFAULT_LIMIT = 7;

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
  const drinks = useCollection<Drink>("drinks");
  const checkins = useCollection<Checkin>("checkins");
  const goals = useCollection<WeeklyGoal>("weekly_goals");
  const { isPremium, openPaywall } = usePurchases();
  const { answers } = useAppState();
  const coach = useAI();
  const share = useShareImage();

  const now = new Date();
  const todayKey = dayKey(now);
  const start = weekStart(now, 1);
  const days = weekDays(start);

  const loading = drinks.loading || checkins.loading || goals.loading;
  const empty = !loading && drinks.items.length === 0 && checkins.items.length === 0;
  const show = !loading && !empty;

  const goal = goals.items.find((g) => g.week_start === start);
  const limit = goal?.limit ?? DEFAULT_LIMIT;
  const total = Math.round(totalForWeek(drinks.items, start) * 10) / 10;
  const weekCheckins = checkins.items.filter((c) => days.includes(c.date));
  const dryDays = weekCheckins.filter((c) => c.alcohol_free).length;
  const gameDays = days.filter((key) => weekCheckins.some((c) => c.date === key && c.game_day));
  const nextGame = gameDays.find((key) => key >= todayKey) ?? gameDays[0];

  const dayBars: DayBar[] = days.map((key) => ({
    key,
    label: formatDay(key),
    value: totalOn(drinks.items, key),
    gameDay: gameDays.includes(key),
    highlight: key === nextGame,
  }));

  const stats = athleteStats(drinks.items, checkins.items, limit, now);
  const sport: Sport = SPORTS.find((s) => s.id === answers.sport)?.id ?? "team";
  const outlook = outlookFor(stats.form, sport);
  const onTrack = total <= limit;
  const gameLabel = nextGame ? formatDay(nextGame, "long") : "Match";
  const range = `${formatDate(days[0])} - ${formatDate(days[6])}`;

  const teaser = `Your stamina score is ${stats.stamina} this week. ${
    isPremium
      ? "Ask your coach which days pull it down."
      : "Trend insights show which days pull it down."
  }`;

  function askCoach() {
    void coach.ask({
      prompt: `This week's standard drinks by day, Monday to Sunday: ${dayBars
        .map((d) => `${d.label} ${d.value}`)
        .join(", ")}. Weekly total ${total} against a limit of ${limit}. Alcohol-free days ${dryDays} of ${DRY_TARGET}. Stamina score ${stats.stamina} of 100 and recovery ${stats.recovery} of 100. Give one specific trend from this week and one thing to do before the next game. Two short sentences.`,
      instructions:
        "You are a practical sports coach for a recreational athlete. Plain English, no medical claims, and never advice on whether to drive.",
    });
  }

  function shareForm() {
    void share.share({
      message: `My Game Form is ${stats.form} (${outlook.title}) with ${dryDays} alcohol-free ${
        dryDays === 1 ? "day" : "days"
      } this week.`,
      title: "Game Form",
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      <Stagger step={90} style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {`Week ${isoWeek(now)} Overview`}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
            {range}
          </Text>
          <View
            style={{
              alignSelf: "center",
              marginTop: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              Week
            </Text>
          </View>
        </View>

        {loading ? (
          <Skeleton height={230} radius={theme.radius.lg} />
        ) : null}
        {loading ? (
          <Skeleton height={190} radius={theme.radius.lg} />
        ) : null}
        {loading ? (
          <Skeleton height={150} radius={theme.radius.lg} />
        ) : null}

        {empty ? (
          <EmptyState
            icon="bar-chart-outline"
            title="Nothing to chart yet"
            body="Log a drink or a dry day on Tonight and this week fills in here."
            actionLabel="Log tonight"
            onAction={() => router.navigate("/")}
          />
        ) : null}

        {show ? (
          <WeeklyProgressCard
            days={dayBars}
            guide={DAILY_GUIDE}
            total={total}
            limit={limit}
            dryDays={dryDays}
            dryTarget={DRY_TARGET}
            onTrack={onTrack}
          />
        ) : null}

        {show ? (
          <GameFormCard
            form={stats.form}
            outlook={outlook}
            dryDays={dryDays}
            gameLabel={gameLabel}
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
            onUnlock={openPaywall}
          />
        ) : null}
      </Stagger>
    </ScrollView>
  );
}
