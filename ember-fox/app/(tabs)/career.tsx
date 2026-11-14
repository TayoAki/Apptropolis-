import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, ScrollView, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { EmptyState } from "../../components/EmptyState";
import { GearTile, GradientBar, type Access } from "../../components/career/Unlocks";
import { Appear, CountUp, Mascot, Skeleton, Stagger } from "../../components/motion";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  SPORTS,
  addDays,
  alcoholFreeDays,
  dayKey,
  parseDay,
  totalForWeek,
  unlockState,
  weekStart,
  weeksWithinLimit,
  type Checkin,
  type Drink,
  type Sport,
  type Unlock,
  type UnlockState,
  type WeeklyGoal,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const RANK: Record<Access, number> = { unlocked: 0, locked: 1, plus: 2 };

/** The sport from onboarding's answer: its id or its label. Defaults to gym. */
function sportFrom(value: string | undefined): Sport {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "gym";
  const found = SPORTS.find(
    (s) => s.id === v || s.label.toLowerCase() === v || s.label.toLowerCase().includes(v),
  );
  return found?.id ?? "gym";
}

/** The weekly limit from onboarding, else the latest saved goal, else 7. */
function weeklyLimit(answer: string | undefined, goals: WeeklyGoal[]): number {
  const number = /\d+/.exec(answer ?? "");
  if (number && Number(number[0]) > 0) return Number(number[0]);
  const latest = goals.reduce<WeeklyGoal | null>(
    (best, goal) => (!best || goal.week_start > best.week_start ? goal : best),
    null,
  );
  return latest?.limit ?? 7;
}

/**
 * Consecutive weeks inside the allowance, counting back from this week. This week counts while
 * it's still in progress and under the limit; a week with no saved goal breaks the run.
 */
function streakWeeks(
  goals: WeeklyGoal[],
  drinks: Drink[],
  limit: number,
  thisWeek: string,
): number {
  const start = parseDay(thisWeek);
  let streak = 0;
  for (let n = 0; n < 520; n++) {
    const key = dayKey(addDays(start, -7 * n));
    const record = goals.find((goal) => goal.week_start === key);
    const met = record ? record.goal_met : n === 0 && totalForWeek(drinks, key) <= limit;
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

/** The short line under a gear tile: when it's earned. */
function targetLine(item: Unlock): string {
  if (item.needs === 0) return "Starter";
  return item.metric === "weeks_met" ? `Week ${item.needs}` : `${item.needs} free days`;
}

function unitOf(item: Unlock): string {
  return item.metric === "weeks_met" ? "weeks on target" : "alcohol-free days";
}

export default function CareerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const goalsState = useCollection<WeeklyGoal>("weekly_goals");
  const checkinsState = useCollection<Checkin>("checkins");
  const drinksState = useCollection<Drink>("drinks");
  const unlocksState = useCollection<Unlock>("unlocks");

  const loading =
    goalsState.loading || checkinsState.loading || drinksState.loading || unlocksState.loading;
  const goals = goalsState.items;
  const checkins = checkinsState.items;
  const drinks = drinksState.items;
  const unlocks = unlocksState.items;

  const sport = sportFrom(answers.sport);
  const sportLabel = (SPORTS.find((s) => s.id === sport)?.label ?? "").toLowerCase();
  const thisWeek = weekStart(new Date(), 1);
  const limit = weeklyLimit(answers.weekly_goal, goals);
  const progress = {
    weeksMet: weeksWithinLimit(goals),
    alcoholFreeDays: alcoholFreeDays(checkins),
  };
  const freeDays = progress.alcoholFreeDays;
  const weekTotal = totalForWeek(drinks, thisWeek);
  const streak = streakWeeks(goals, drinks, limit, thisWeek);
  const hasHistory = goals.length + checkins.length + drinks.length > 0;

  // Athlete levels, lowest first: the current one is the highest reached level the person can use.
  const levels = unlocks
    .filter((unlock) => unlock.kind === "level")
    .sort((a, b) => a.needs - b.needs);
  let currentIndex = -1;
  levels.forEach((level, index) => {
    if (unlockState(level, progress).unlocked && (!level.premium || isPremium)) currentIndex = index;
  });
  const current = levels[currentIndex] ?? null;
  const nextIndex = levels.findIndex((level) => !unlockState(level, progress).unlocked);
  const next = nextIndex >= 0 ? (levels[nextIndex] ?? null) : null;
  const nextState: UnlockState | null = next ? unlockState(next, progress) : null;
  const percent = nextState ? nextState.progress * 100 : 100;

  // Gear and kits for the person's sport: unlocked first, then locked, then Plus.
  const gear = unlocks
    .filter((unlock) => unlock.kind !== "level" && (unlock.sport === sport || unlock.sport === "any"))
    .map((item) => ({
      item,
      access: accessFor(item, progress, isPremium),
      state: unlockState(item, progress),
    }))
    .sort((a, b) => RANK[a.access] - RANK[b.access] || a.item.needs - b.item.needs);

  // The athlete's pose follows the moment: over the allowance, on a streak, or the usual stance.
  const pose =
    weekTotal > limit ? "dash-heavy-legs" : streak >= 2 ? "dash-game-day-sharp" : "dash-match-ready";

  const header = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.sm,
      }}
    >
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
        }}
      >
        Athlete Career & Gear
      </Text>
      {current ? (
        <View
          style={{
            flexShrink: 0,
            maxWidth: 116,
            borderRadius: theme.radius.sm,
            borderWidth: 1,
            borderColor: theme.colors.primary,
            overflow: "hidden",
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.primary,
              opacity: 0.16,
            }}
          />
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              textAlign: "center",
            }}
          >
            {`LEVEL ${currentIndex + 1}: ${current.name.toUpperCase()}`}
          </Text>
        </View>
      ) : null}
    </View>
  );

  let hero: React.ReactNode;
  if (loading) {
    hero = <Skeleton height={168} radius={theme.radius.lg} />;
  } else if (!hasHistory) {
    hero = (
      <EmptyState
        icon="ribbon-outline"
        title="Your athlete starts on week one"
        body="Log a drink or an alcohol-free day. Every week you stay inside your allowance counts toward your next level."
        actionLabel="Log tonight"
        onAction={() => router.push("/")}
      />
    );
  } else {
    const cardStyle: ViewStyle = {
      minHeight: 168,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    };
    hero = (
      <View style={cardStyle}>
        <View style={{ width: "60%", gap: theme.spacing.xs }}>
          {next && nextState ? (
            <>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                <CountUp
                  value={nextState.have}
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                />
                {` of ${next.needs} ${unitOf(next)}`}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}
              >
                {`to unlock Level ${nextIndex + 1}: ${next.name}`}
              </Text>
              <CountUp
                value={percent}
                format={(n) => `${Math.round(n)}%`}
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.medium,
                  marginTop: theme.spacing.xs,
                }}
              />
              <GradientBar progress={nextState.progress} height={10} />
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {levels.length > 0 ? `All ${levels.length} levels unlocked` : "Keep logging"}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                Keep every week on target to hold your place.
              </Text>
            </>
          )}
        </View>

        {/* The athlete stands on the glowing platform, overlapping the card's top-right edge. */}
        <View
          style={{ position: "absolute", top: -28, right: -12, width: 200, height: 200 }}
        >
          <Mascot
            pose={pose}
            size={200}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.55,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <AiImage
            prompt="glowing green circular stadium platform seen from above, soft light, no background"
            fit="contain"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56 }}
          />
        </View>
      </View>
    );
  }

  const gearGrid = loading ? (
    <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={150} radius={theme.radius.md} style={{ flex: 1 }} />
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
    <FlatList
      data={gear}
      numColumns={3}
      scrollEnabled={false}
      keyExtractor={(row) => row.item.id}
      columnWrapperStyle={{ gap: theme.spacing.sm }}
      renderItem={({ item: row, index }) => {
        const subtitle = row.access === "plus" ? "Plus Member" : targetLine(row.item);
        return (
          <View style={{ flex: 1, marginBottom: theme.spacing.sm }}>
            <Appear delay={Math.min(index, 8) * 60} style={{ flex: 1 }}>
              <GearTile
                item={row.item}
                access={row.access}
                subtitle={subtitle}
                prompt={`${row.item.name} illustration: ${row.item.description}, cut-out on a plain background, gold outline`}
                onPress={row.access === "plus" ? openPaywall : undefined}
              />
            </Appear>
          </View>
        );
      }}
    />
  );

  const streakCard = (
    <View
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
        {streak > 0 ? (
          <Text
            style={{
              color: theme.colors.success,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            <CountUp
              value={streak}
              style={{
                color: theme.colors.success,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
              }}
            />
            {streak === 1 ? " CONSECUTIVE WEEK" : " CONSECUTIVE WEEKS"}
          </Text>
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            NO STREAK YET
          </Text>
        )}
        <Text numberOfLines={2} style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          {`${weekTotal <= limit ? "Inside Allowance" : "Over allowance this week"} • ${freeDays} Total Alcohol-Free ${freeDays === 1 ? "Day" : "Days"} Logged`}
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
      <Stagger step={70} style={{ gap: theme.spacing.xl }}>
        {header}
        {hero}
        <View style={{ gap: theme.spacing.md }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
            }}
          >
            UNLOCKED GEAR LOCKER
          </Text>
          {gearGrid}
        </View>
        {!loading && hasHistory ? streakCard : null}
      </Stagger>
    </ScrollView>
  );
}
