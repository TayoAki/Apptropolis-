import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/EmptyState";
import { DrinkLogRow } from "../../components/index/DrinkLogRow";
import { DrinkTiles } from "../../components/index/DrinkTiles";
import { FormHero } from "../../components/index/FormHero";
import { WeekProgress } from "../../components/index/WeekProgress";
import { Lottie } from "../../components/lottie";
import {
  Appear,
  PressScale,
  Skeleton,
  SkeletonList,
  Stagger,
  haptic,
} from "../../components/motion";
import { track } from "../../data/analytics";
import { useAppState } from "../../data/app-state";
import { useCollection } from "../../data/repo";
import {
  DEFAULT_PROFILE,
  SPORTS,
  athleteStats,
  dayKey,
  estimateBac,
  formatTime,
  outlookFor,
  totalForWeek,
  weekStart,
  type Checkin,
  type Drink,
  type DrinkLabel,
  type Outlook,
  type Sport,
  type WeeklyGoal,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Standard drinks allowed per week when no goal has been set for this week. */
const DEFAULT_LIMIT = 8;

/** The mascot pose that fits each form tier. */
const POSE: Record<Outlook["tier"], string> = {
  sharp: "dash-game-day-sharp",
  steady: "dash-match-ready",
  flat: "dash-heavy-legs",
};

const HEADLINE: Record<Outlook["tier"], string> = {
  sharp: "Fresh Legs for Saturday",
  steady: "Solid Legs for Saturday",
  flat: "Heavy Legs for Saturday",
};

function LoadingBlocks() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Skeleton height={230} radius={theme.radius.lg} />
      <Skeleton height={78} radius={theme.radius.lg} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: theme.spacing.md,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={72} radius={theme.radius.md} />
        ))}
      </View>
      <Skeleton height={56} radius={theme.radius.md} />
      <Skeleton height={64} radius={theme.radius.lg} />
    </View>
  );
}

export default function TonightScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const drinks = useCollection<Drink>("drinks");
  const checkins = useCollection<Checkin>("checkins");
  const goals = useCollection<WeeklyGoal>("weekly_goals");
  const { answers } = useAppState();
  const [justMarked, setJustMarked] = useState(false);

  const loading = drinks.loading || checkins.loading || goals.loading;

  const now = new Date();
  const today = dayKey(now);
  const thisWeek = weekStart(now, 1);
  const limit = goals.items.find((g) => g.week_start === thisWeek)?.limit ?? DEFAULT_LIMIT;
  const weekTotal = totalForWeek(drinks.items, thisWeek);
  const daysLeft = 7 - ((now.getDay() + 6) % 7);
  const todays = drinks.items
    .filter((d) => dayKey(d.logged_at) === today)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const todayCheckin = checkins.items.find((c) => c.date === today);
  const marked = Boolean(todayCheckin?.alcohol_free);
  const sport: Sport = SPORTS.some((s) => s.id === answers.sport)
    ? (answers.sport as Sport)
    : "team";
  const stats = athleteStats(drinks.items, checkins.items, limit, now);
  const outlook = outlookFor(stats.form, sport);
  const bac = estimateBac(drinks.items, DEFAULT_PROFILE, now);
  const recoveryTime =
    bac.percent > 0
      ? formatTime(new Date(now.getTime() + bac.hoursToZero * 3600000).toISOString())
      : "now";
  const division = answers.team || "Soccer • Division 2";
  const dateLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  async function logDrink(label: DrinkLabel, units: number) {
    await drinks.add({
      logged_at: new Date().toISOString(),
      label,
      standard_drinks: units,
      edited: false,
    });
    haptic("success");
    track("drink_logged", { type: label, units });
  }

  async function toggleAlcoholFree() {
    if (todayCheckin) {
      const next = !todayCheckin.alcohol_free;
      await checkins.update(todayCheckin.id, { alcohol_free: next });
      setJustMarked(next);
      haptic(next ? "success" : "selection");
    } else {
      await checkins.add({ date: today, alcohol_free: true, game_day: false, note: "" });
      setJustMarked(true);
      haptic("success");
    }
    if (!marked) track("alcohol_free_day");
  }

  const header = (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: theme.spacing.sm,
          rowGap: 4,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: 30,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Tonight
        </Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {division}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            flexShrink: 1,
          }}
        >
          {dateLabel}
        </Text>
      </View>

      {loading ? (
        <LoadingBlocks />
      ) : (
        <Stagger step={70} style={{ gap: theme.spacing.md }}>
          <FormHero
            form={stats.form}
            outlook={outlook}
            pose={POSE[outlook.tier]}
            headline={HEADLINE[outlook.tier]}
          />

          <WeekProgress total={weekTotal} limit={limit} daysLeft={daysLeft} />

          <DrinkTiles onLog={logDrink} />

          <PressScale
            onPress={toggleAlcoholFree}
            haptic="light"
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={
              marked ? "Unmark today as alcohol-free" : "Mark today as 100% alcohol-free"
            }
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.md,
              borderWidth: 1.5,
              borderColor: theme.colors.success,
              backgroundColor: marked ? theme.colors.surfaceAlt : theme.colors.background,
            }}
          >
            <Ionicons
              name={marked ? "checkmark-circle" : "checkmark-circle-outline"}
              size={22}
              color={theme.colors.success}
            />
            <Text
              style={{
                color: theme.colors.success,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {marked ? "Unmark Today’s Alcohol-Free Day" : "Mark Today 100% Alcohol-Free"}
            </Text>
            {marked && justMarked ? <Lottie name="success" size={40} /> : null}
          </PressScale>

          <View
            style={{
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                textAlign: "center",
              }}
            >
              <Text style={{ fontWeight: theme.font.weight.bold, fontVariant: ["tabular-nums"] }}>
                {`~${bac.percent.toFixed(3)}%`}
              </Text>
              {` Est. BAC • Est. baseline recovery: ${recoveryTime}`}
            </Text>
          </View>

          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            Estimates only. Never drive after drinking.
          </Text>
        </Stagger>
      )}
    </View>
  );

  return (
    <FlatList
      data={loading ? [] : todays}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <Appear delay={Math.min(index, 8) * 50}>
          <DrinkLogRow drink={item} onDelete={() => void drinks.remove(item.id)} />
        </Appear>
      )}
      ListEmptyComponent={
        loading ? (
          <SkeletonList rows={2} />
        ) : (
          <EmptyState
            icon="beer-outline"
            title="Nothing logged today"
            body="Tap a drink above to log it. Your logged drinks feed your form rating and weekly total."
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    />
  );
}
