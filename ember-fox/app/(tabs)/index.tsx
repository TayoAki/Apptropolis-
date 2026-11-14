import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlcoholFreeButton } from "../../components/index/AlcoholFreeButton";
import { BacPanel } from "../../components/index/BacPanel";
import { DrinkLogRow } from "../../components/index/DrinkLogRow";
import { DrinkTiles } from "../../components/index/DrinkTiles";
import { FORM_POSE, FormHero, formHeadline } from "../../components/index/FormHero";
import { WeekProgress } from "../../components/index/WeekProgress";
import { Appear, Skeleton, SkeletonList, Stagger } from "../../components/motion";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAthlete } from "../../components/useAthlete";
import { WEEKDAYS, dayKey } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

function LoadingBlocks() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Skeleton height={230} radius={theme.radius.lg} />
      <Skeleton height={104} radius={theme.radius.lg} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: theme.spacing.md,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={72} radius={theme.radius.md} />
        ))}
      </View>
      <Skeleton height={56} radius={theme.radius.md} />
      <Skeleton height={150} radius={theme.radius.lg} />
    </View>
  );
}

export default function TonightScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const athlete = useAthlete();
  const { drinks, now, today, outlook, stats } = athlete;

  const todays = drinks.items
    .filter((d) => dayKey(d.logged_at) === today)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const dateLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const headline = formHeadline(outlook.tier, {
    nextGame: athlete.nextGame,
    today,
    noun: athlete.sportNoun,
    now,
  });

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
      <ScreenHeader title="Tonight" subtitle={`${dateLabel} · ${athlete.sportLabel}`} />

      {athlete.loading ? (
        <LoadingBlocks />
      ) : (
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          <FormHero
            form={stats.form}
            outlook={outlook}
            pose={FORM_POSE[outlook.tier]}
            headline={headline}
          />

          <WeekProgress
            total={athlete.weekTotal}
            limit={athlete.limit}
            resetDay={WEEKDAYS[athlete.startsOn]}
          />

          <View style={{ gap: theme.spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Log a drink
            </Text>
            <DrinkTiles onLog={(label, amount) => void athlete.logDrink(label, amount)} />
          </View>

          <AlcoholFreeButton
            marked={athlete.markedAlcoholFree}
            drinksToday={athlete.todayTotal}
            onChange={(next) => void athlete.setAlcoholFree(next)}
          />

          <BacPanel bac={athlete.bac} profile={athlete.profile} now={now} />

          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Logged today
          </Text>
        </Stagger>
      )}
    </View>
  );

  return (
    <FlatList
      data={athlete.loading ? [] : todays}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <Appear delay={Math.min(index, 8) * 50}>
          <DrinkLogRow drink={item} onDelete={() => void athlete.removeDrink(item.id)} />
        </Appear>
      )}
      ListEmptyComponent={
        athlete.loading ? (
          <SkeletonList rows={2} />
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              paddingVertical: theme.spacing.sm,
            }}
          >
            Nothing logged today. Drinks you log show up here, and you can remove one if you
            tapped by mistake.
          </Text>
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
