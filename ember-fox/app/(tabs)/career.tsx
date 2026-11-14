import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse } from "react-native-svg";
import { EmptyState } from "../../components/EmptyState";
import { GearTile, type Access } from "../../components/career/Unlocks";
import { Appear, GrowBar, Mascot, Skeleton, Stagger } from "../../components/motion";
import { showPaywall } from "../../components/paywallSource";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAthlete } from "../../components/useAthlete";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  addDays,
  alcoholFreeDays,
  dayKey,
  formatCount,
  parseDay,
  unlockState,
  weeksWithinLimit,
  type Unlock,
  type UnlockState,
  type WeeklyGoal,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const RANK: Record<Access, number> = { unlocked: 0, locked: 1, plus: 2 };
const MASCOT = 120;

/**
 * Consecutive weeks inside the limit, counting back from this week. This week counts while it's
 * still in progress and inside the limit; a week with no saved result ends the run.
 */
function streakWeeks(goals: WeeklyGoal[], thisWeek: string, thisWeekInside: boolean): number {
  const start = parseDay(thisWeek);
  let streak = 0;
  for (let n = 0; n < 520; n++) {
    const key = dayKey(addDays(start, -7 * n));
    const record = goals.find((goal) => goal.week_start === key);
    const met = record ? record.goal_met : n === 0 && thisWeekInside;
    if (!met) break;
    streak += 1;
  }
  return streak;
}

function accessFor(
  item: Unlock,
  progress: { weeksMet: number; alcoholFreeDays: number },
  isPremium: boolean,
): Access {
  if (item.premium && !isPremium) return "plus";
  return unlockState(item, progress).unlocked ? "unlocked" : "locked";
}

function unitOf(item: Unlock, count: number): string {
  if (item.metric === "weeks_met") return count === 1 ? "week within your limit" : "weeks within your limit";
  return count === 1 ? "alcohol-free day" : "alcohol-free days";
}

/** The line under a gear tile: where it stands. */
function statusLine(item: Unlock, access: Access, state: UnlockState): string {
  if (access === "plus") return "Plus";
  if (access === "unlocked") return "Unlocked";
  const unit = item.metric === "weeks_met" ? "weeks in limit" : "alcohol-free days";
  return `${state.have} of ${item.needs} ${unit}`;
}

export default function CareerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const athlete = useAthlete();
  const { isPremium } = usePurchases();
  const unlocksState = useCollection<Unlock>("unlocks");

  const loading = athlete.loading || unlocksState.loading;
  const goals = athlete.goals.items;
  const checkins = athlete.checkins.items;
  const drinks = athlete.drinks.items;
  const unlocks = unlocksState.items;

  const progress = {
    weeksMet: weeksWithinLimit(goals),
    alcoholFreeDays: alcoholFreeDays(checkins),
  };
  const freeDays = progress.alcoholFreeDays;
  const streak = streakWeeks(goals, athlete.weekKey, !athlete.over);
  const hasHistory = goals.length + checkins.length + drinks.length > 0;
  const lastWeekKey = dayKey(addDays(parseDay(athlete.weekKey), -7));
  const lastWeek = goals.find((goal) => goal.week_start === lastWeekKey) ?? null;

  // Athlete levels, lowest first. The current one is the highest earned level the person can
  // use; the next one is the level after it, which may already be earned but part of Plus.
  const levels = unlocks
    .filter((unlock) => unlock.kind === "level")
    .sort((a, b) => a.needs - b.needs);
  let currentIndex = -1;
  levels.forEach((level, index) => {
    if (unlockState(level, progress).unlocked && (!level.premium || isPremium)) currentIndex = index;
  });
  const current = levels[currentIndex] ?? null;
  const nextIndex = currentIndex + 1;
  const next = levels[nextIndex] ?? null;
  const nextState: UnlockState | null = next ? unlockState(next, progress) : null;
  const nextInPlus = Boolean(next && nextState?.unlocked && next.premium && !isPremium);

  // Gear and kits for the person's sport: unlocked first, then locked, then Plus.
  const gear = unlocks
    .filter(
      (unlock) =>
        unlock.kind !== "level" && (unlock.sport === athlete.sport || unlock.sport === "any"),
    )
    .map((item) => {
      const state = unlockState(item, progress);
      const access = accessFor(item, progress, isPremium);
      return { item, access, status: statusLine(item, access, state) };
    })
    .sort((a, b) => RANK[a.access] - RANK[b.access] || a.item.needs - b.item.needs);
  const rows: (typeof gear)[] = [];
  for (let i = 0; i < gear.length; i += 2) rows.push(gear.slice(i, i + 2));

  // The athlete's pose follows the moment: over the limit, on a streak, or the usual stance.
  const pose = athlete.over
    ? "dash-heavy-legs"
    : streak >= 2
      ? "dash-game-day-sharp"
      : "dash-match-ready";

  let hero: React.ReactNode;
  if (loading) {
    hero = <Skeleton height={176} radius={theme.radius.lg} />;
  } else if (!hasHistory) {
    hero = (
      <EmptyState
        icon="ribbon-outline"
        title="Your athlete starts on week one"
        body="Log a drink or an alcohol-free day. Every week you stay within your limit counts toward your next level."
        actionLabel="Go to Tonight"
        onAction={() => router.navigate("/")}
      />
    );
  } else {
    hero = (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
        }}
      >
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {current ? `Level ${currentIndex + 1}: ${current.name}` : "No level yet"}
            </Text>
            {current ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                {current.description}
              </Text>
            ) : null}
          </View>
          {next && nextState ? (
            nextInPlus ? (
              <Pressable
                onPress={() => showPaywall("career_level")}
                accessibilityRole="button"
                accessibilityLabel={`Level ${nextIndex + 1}, ${next.name}, is earned and part of Plus. See plans`}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
                  {`You've earned level ${nextIndex + 1}, ${next.name}. It's part of Plus. `}
                  <Text style={{ color: theme.colors.primary, fontWeight: theme.font.weight.bold }}>
                    See plans
                  </Text>
                </Text>
              </Pressable>
            ) : (
              <View
                accessible
                accessibilityLabel={`${nextState.have} of ${next.needs} ${unitOf(next, next.needs)} to reach level ${nextIndex + 1}, ${next.name}`}
                style={{ gap: theme.spacing.sm }}
              >
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
                  <Text
                    style={{ fontWeight: theme.font.weight.bold, fontVariant: ["tabular-nums"] }}
                  >
                    {`${nextState.have} of ${next.needs}`}
                  </Text>
                  {` ${unitOf(next, next.needs)} to reach level ${nextIndex + 1}, ${next.name}`}
                </Text>
                <GrowBar progress={nextState.progress} height={10} />
              </View>
            )
          ) : (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {levels.length > 0
                ? `All ${levels.length} levels reached. Keep each week within your limit to hold your place.`
                : "Keep logging to build your career."}
            </Text>
          )}
        </View>

        {/* The athlete stands on a drawn platform, inside the card. */}
        <View style={{ width: MASCOT, height: MASCOT + 6 }}>
          <Svg
            width={MASCOT}
            height={28}
            viewBox="0 0 120 28"
            style={{ position: "absolute", left: 0, bottom: 0 }}
          >
            <Ellipse
              cx={60}
              cy={14}
              rx={50}
              ry={12}
              fill={theme.colors.success + "26"}
              stroke={theme.colors.success}
              strokeWidth={1.5}
            />
            <Ellipse
              cx={60}
              cy={14}
              rx={30}
              ry={7}
              fill="none"
              stroke={theme.colors.success + "80"}
              strokeWidth={1}
            />
          </Svg>
          <Mascot pose={pose} size={MASCOT} />
        </View>
      </View>
    );
  }

  const gearGrid = loading ? (
    <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
      {[0, 1].map((i) => (
        <Skeleton key={i} height={170} radius={theme.radius.md} style={{ flex: 1 }} />
      ))}
    </View>
  ) : gear.length === 0 ? (
    <EmptyState
      icon="lock-closed-outline"
      title="No gear for your sport yet"
      body="Kits and gear for your sport appear here. You can change your sport in Settings."
      actionLabel="Open Settings"
      onAction={() => router.push("/settings")}
    />
  ) : (
    <View style={{ gap: theme.spacing.md }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {row.map((entry, index) => (
            <Appear
              key={entry.item.id}
              delay={Math.min(rowIndex * 2 + index, 8) * 60}
              style={{ flex: 1 }}
            >
              <GearTile
                item={entry.item}
                access={entry.access}
                status={entry.status}
                prompt={`${entry.item.name} illustration: ${entry.item.description}, cut-out on a plain background, gold outline`}
                onPress={entry.access === "plus" ? () => showPaywall("career_gear") : undefined}
              />
            </Appear>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );

  const streakCard = (
    <View
      accessible
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Ionicons
        name={streak > 0 ? "checkmark-circle-outline" : "ellipse-outline"}
        size={32}
        color={streak > 0 ? theme.colors.success : theme.colors.textMuted}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {streak > 0
            ? `${streak} ${streak === 1 ? "week" : "weeks"} in a row within your limit`
            : "No streak yet"}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: 18,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`This week so far: ${formatCount(athlete.weekTotal)} of ${formatCount(athlete.limit)}, ${
            athlete.over ? "over your limit" : "within your limit"
          }.`}
          {lastWeek
            ? `\nLast week: ${formatCount(lastWeek.total_drinks)} of ${formatCount(lastWeek.limit)}, ${
                lastWeek.goal_met ? "within your limit" : "over your limit"
              }.`
            : ""}
          {`\n${freeDays} alcohol-free ${freeDays === 1 ? "day" : "days"} logged in total.`}
        </Text>
      </View>
    </View>
  );

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
      <Stagger step={70} style={{ gap: theme.spacing.lg }}>
        <ScreenHeader title="Career" subtitle={athlete.sportLabel} />
        {hero}
        {!loading && hasHistory ? streakCard : null}
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Gear locker
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              Kits unlock with alcohol-free days, gear with weeks within your limit.
            </Text>
          </View>
          {gearGrid}
        </View>
      </Stagger>
    </ScrollView>
  );
}
