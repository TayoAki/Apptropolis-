import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../../components/AiImage";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Celebrate, Lottie } from "../../components/lottie";
import {
  Appear,
  GrowBar,
  Mascot,
  PressScale,
  Skeleton,
  SkeletonList,
  Stagger,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { WeekRing } from "../../components/partner/WeekRing";
import { useShareImage } from "../../components/share";
import { useAppState } from "../../data/app-state";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  addDays,
  dayKey,
  startOfWeek,
  timeAgo,
  weekDays,
  weekStats,
  type PartnerUpdate,
  type Workout,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PARTNER_PHOTO =
  "circular headshot of a smiling man with short hair, plain dark studio background, head and shoulders";
const YOUR_PHOTO =
  "circular headshot of a smiling woman with a ponytail, plain dark studio background, head and shoulders";
const MASCOT_CALM = "rocco-neutral-ready";
const MASCOT_HAPPY = "rocco-fist-bump-spotter";

/** Stakes are non-cash bets, stored as a partner update of type "stake" (title, newline, detail). */
const STAKES: Array<{ title: string; detail: string; icon: IconName }> = [
  {
    title: "Sunday cold brew & bagels",
    detail: "Whoever finishes below 100% buys the coffee on Sunday morning.",
    icon: "cafe-outline",
  },
  {
    title: "Loser picks the next playlist",
    detail: "The one who falls short chooses the music for the next session.",
    icon: "musical-notes-outline",
  },
  {
    title: "Dinner is on the loser",
    detail: "Whoever is short this week cooks dinner on Friday.",
    icon: "restaurant-outline",
  },
];

/** Quick cheers sent to the partner. Only the label and the time are shared. */
const CHEERS: Array<{ label: string; icon: IconName }> = [
  { label: "Beast mode", icon: "flame-outline" },
  { label: "Don't skip legs", icon: "eye-outline" },
  { label: "You owe me coffee", icon: "cafe-outline" },
  { label: "Locked in", icon: "barbell-outline" },
];

interface Summary {
  due: number;
  yours: number;
  partnerDone: number;
  percent: number;
}

/**
 * A week's shared score as of `asOf`. The partner's completions come from their updates, capped
 * at the sessions due (the two partners share one schedule). A past week is scored as of its Sunday.
 */
function summarize(workouts: Workout[], updates: PartnerUpdate[], asOf: Date): Summary {
  const mine = weekStats(workouts, asOf);
  const days = new Set(weekDays(asOf));
  const partnerDone = Math.min(
    updates.filter(
      (u) =>
        u.from === "partner" && u.type === "completion" && days.has(dayKey(new Date(u.createdAt))),
    ).length,
    mine.due,
  );
  return {
    due: mine.due,
    yours: mine.completed,
    partnerDone,
    percent: mine.due
      ? Math.round(((mine.completed + partnerDone) / (2 * mine.due)) * 100)
      : 0,
  };
}

function weekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

function weekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${MONTHS[monday.getMonth()]} ${monday.getDate()} – ${MONTHS[sunday.getMonth()]} ${sunday.getDate()}`;
}

function headline(s: Summary): string {
  if (!s.due) return "No sessions due yet";
  if (s.percent >= 100) return "Both showed up";
  if (s.percent >= 75) return "Shared On-Track";
  if (s.percent >= 40) return "Catching up together";
  return "Time to show up";
}

function owedLine(s: Summary): string {
  if (!s.due) return "Nothing is owed until a session is due.";
  const you = s.yours < s.due;
  const them = s.partnerDone < s.due;
  if (you && them) return "You both owe it this week.";
  if (you) return "You owe it this week.";
  if (them) return "Your partner owes it this week.";
  return "Nobody owes it. You both showed up.";
}

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.colors.textMuted,
        fontSize: theme.font.size.caption,
        fontWeight: theme.font.weight.bold,
        letterSpacing: 0.8,
      }}
    >
      {children}
    </Text>
  );
}

function Chip({
  label,
  icon,
  onPress,
  selected = false,
  locked = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  selected?: boolean;
  locked?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.94}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? theme.colors.onPrimary : theme.colors.primary}
      />
      <Text
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.text,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
      {locked ? <Ionicons name="lock-closed" size={13} color={theme.colors.accent} /> : null}
    </PressScale>
  );
}

/** A cheer that bubbles up from the chip row and floats off the top, then is removed. */
function CheerBurst({
  icon,
  left,
  drift,
  onDone,
}: {
  icon: IconName;
  left: string;
  drift: number;
  onDone: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (reduced) {
      done.current();
      return;
    }
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => run.stop();
  }, [progress, reduced]);

  const translateY = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, -18, -150] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const scale = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.4, 1.25, 0.9] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 0,
        left: left as `${number}%`,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Ionicons name={icon} size={28} color={theme.colors.primary} />
    </Animated.View>
  );
}

function ActivityRow({ update, partnerName }: { update: PartnerUpdate; partnerName: string }) {
  const theme = useTheme();
  const fromPartner = update.from === "partner";
  const cheer = update.type === "cheer";
  const text =
    update.type === "stake"
      ? `New stake: ${update.message.split("\n")[0]}`
      : cheer
        ? fromPartner
          ? `${partnerName || "Your partner"} sent "${update.message}"`
          : `You sent "${update.message}"`
        : update.message;
  const size = 44;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      <View style={{ width: size, height: size }}>
        {fromPartner ? (
          <AiImage prompt={PARTNER_PHOTO} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : cheer ? (
          <AiImage prompt={YOUR_PHOTO} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Mascot pose={MASCOT_CALM} size={size} />
        )}
        {fromPartner ? (
          <View
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 2,
              borderColor: theme.colors.background,
              backgroundColor: theme.colors.success,
            }}
          />
        ) : cheer ? (
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: theme.colors.background,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="heart" size={10} color={theme.colors.onPrimary} />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}
      >
        {text}
      </Text>
      <Text
        style={{
          minWidth: 64,
          textAlign: "right",
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontVariant: ["tabular-nums"],
        }}
      >
        {timeAgo(update.createdAt)}
      </Text>
    </View>
  );
}

function ScoreRow({ title, detail, percent }: { title: string; detail: string; percent: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs, paddingVertical: theme.spacing.sm }}>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`${percent}%`}
        </Text>
      </View>
      <GrowBar progress={percent / 100} height={8} />
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
        {detail}
      </Text>
    </View>
  );
}

export default function PartnerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers } = useAppState();
  const { isPremium, openPaywall } = usePurchases();
  const workouts = useCollection<Workout>("workouts");
  const updates = useCollection<PartnerUpdate>("partner_updates");
  const { ref, share, sharing } = useShareImage();

  // The partner's name, as entered during onboarding ("partner_name"). Until it's known, the
  // screen speaks of "your partner".
  const partnerName = (answers.partner_name ?? "").trim();
  const firstName = partnerName || "Partner";

  const [saved, setSaved] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cheerNote, setCheerNote] = useState<string | null>(null);
  const [stakeNote, setStakeNote] = useState<string | null>(null);
  const [bursts, setBursts] = useState<
    Array<{ id: number; icon: IconName; left: string; drift: number }>
  >([]);
  const burstId = useRef(0);
  // The shared total when the screen first loads, so opening a finished week doesn't celebrate.
  const baseline = useRef<number | null>(null);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2400);
    return () => clearTimeout(timer);
  }, [saved]);

  const loading = workouts.loading || updates.loading;
  const now = new Date();
  const today = summarize(workouts.items, updates.items, now);
  const { due, yours, partnerDone, percent } = today;
  const shared = yours + partnerDone;
  if (!loading && baseline.current === null) baseline.current = shared;
  const celebrate =
    percent >= 100 && baseline.current !== null && shared > baseline.current ? shared : 0;

  const partnerUpdates = updates.items.filter((u) => u.from === "partner");
  const lastPartner = partnerUpdates.reduce<string | null>(
    (latest, u) => (latest === null || u.createdAt > latest ? u.createdAt : latest),
    null,
  );
  const partnerActive =
    lastPartner !== null && now.getTime() - new Date(lastPartner).getTime() < 2 * 86_400_000;
  const partnerStatus =
    lastPartner === null
      ? "Waiting for them to join"
      : partnerActive
        ? "Active today"
        : `Last update ${timeAgo(lastPartner)}`;
  const pairedLabel = partnerName
    ? `PAIRED WITH ${partnerName.toUpperCase()}`
    : lastPartner === null
      ? "INVITE YOUR PARTNER"
      : "PAIRED WITH YOUR PARTNER";

  const stakes = updates.items
    .filter((u) => u.type === "stake")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const stake = stakes[0];
  const [stakeTitle = "", stakeDetail = ""] = stake ? stake.message.split("\n") : [];

  const activity = [...updates.items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const history = [1, 2, 3]
    .map((weeksAgo) => {
      const monday = addDays(startOfWeek(now), -7 * weeksAgo);
      return {
        monday,
        summary: summarize(workouts.items, updates.items, addDays(monday, 6)),
      };
    })
    .filter((row) => row.summary.due > 0);

  const pose = percent >= 75 ? MASCOT_HAPPY : MASCOT_CALM;
  const shareMessage = due
    ? `Spotter Pair week ${weekNumber(now)}: ${percent}% shared on track. ${yours} of ${due} for me, ${partnerDone} of ${due} for my partner.`
    : "Spotter Pair: our training week starts today.";

  function launch(icon: IconName) {
    const id = ++burstId.current;
    const left = `${8 + ((id * 37) % 70)}%`;
    const drift = id % 2 === 0 ? 14 : -14;
    setBursts((list) => [...list.slice(-4), { id, icon, left, drift }]);
  }

  function finish(id: number) {
    setBursts((list) => list.filter((b) => b.id !== id));
  }

  async function sendCheer(label: string, icon: IconName) {
    haptic("light");
    launch(icon);
    setCheerNote(null);
    try {
      await updates.add({
        type: "cheer",
        from: "you",
        message: label,
        createdAt: new Date().toISOString(),
        weekScore: percent,
      });
    } catch {
      setCheerNote("That didn't send. Check your connection and tap again.");
    }
  }

  async function setStake(title: string, detail: string) {
    haptic("success");
    setSaved(true);
    setStakeNote(null);
    try {
      await updates.add({
        type: "stake",
        from: "you",
        message: `${title}\n${detail}`,
        createdAt: new Date().toISOString(),
        weekScore: percent,
      });
    } catch {
      setSaved(false);
      setStakeNote("The stake didn't save. Check your connection and try again.");
    }
  }

  function pickStake(preset: { title: string; detail: string }) {
    if (preset.title === stakeTitle) {
      haptic("selection");
      return;
    }
    void setStake(preset.title, preset.detail);
  }

  function saveCustom() {
    const title = draft.replace(/\s+/g, " ").trim();
    if (!title) return;
    setDraft("");
    setComposing(false);
    void setStake(title, "Whoever finishes below 100% owes it this week.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          {/* Header: eyebrow row, then the one-line title beside the mascot. */}
          <View style={{ gap: theme.spacing.xs }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1.2,
                }}
              >
                SPOTTER PAIR
              </Text>
              <Text
                style={{
                  color: theme.colors.primary,
                  opacity: 0.6,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 1.2,
                }}
              >
                PARTNERS
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.md,
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityRole="header"
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontSize: theme.font.size.headline + 6,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                Partner Sync
              </Text>
              <Mascot pose={pose} size={96} />
            </View>
          </View>

          {/* The partner row: avatar with a live dot, name, status, and Manage. */}
          <View style={{ gap: theme.spacing.sm }}>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 0.8,
                }}
              >
                {pairedLabel}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.md,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                <View style={{ width: 56, height: 56 }}>
                  <AiImage prompt={PARTNER_PHOTO} style={{ width: 56, height: 56, borderRadius: 28 }} />
                  <View
                    style={{
                      position: "absolute",
                      right: -1,
                      bottom: -1,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: theme.colors.background,
                      backgroundColor: partnerActive ? theme.colors.success : theme.colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.title,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {partnerName || "Your partner"}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                    {partnerStatus}
                  </Text>
                </View>
              </View>
              <Link href="/settings" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Manage pairing"
                  hitSlop={12}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Manage
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* The shared accountability card (also the card that gets shared as an image). */}
          <View
            ref={ref}
            collapsable={false}
            style={{
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.16,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 0.8,
              }}
            >
              {`WEEK ${weekNumber(now)} ACCOUNTABILITY`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
              {loading ? (
                <Skeleton width={136} height={136} radius={68} />
              ) : (
                <WeekRing percent={percent} />
              )}
              <View style={{ flex: 1, gap: theme.spacing.sm }}>
                {loading ? (
                  <>
                    <Skeleton width="95%" height={28} />
                    <Skeleton width="70%" height={14} />
                  </>
                ) : (
                  <>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.headline,
                        fontWeight: theme.font.weight.bold,
                      }}
                    >
                      {headline(today)}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                      {owedLine(today)}
                    </Text>
                  </>
                )}
              </View>
            </View>
            {loading ? (
              <Skeleton height={16} />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.medium,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {`You: ${yours}/${due} workouts • ${firstName}: ${partnerDone}/${due} workouts`}
              </Text>
            )}
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {`Spotter Pair · ${weekRange(startOfWeek(now))}`}
            </Text>
          </View>

          {/* The stake: a glowing amber card with a flame in the corner. */}
          <View
            style={{
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
              paddingRight: theme.spacing.xl + theme.spacing.md,
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            }}
          >
            <View style={{ position: "absolute", top: theme.spacing.lg, right: theme.spacing.lg }}>
              <Ionicons name="flame" size={26} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 0.8,
              }}
            >
              THE STAKE
            </Text>
            {loading ? (
              <>
                <Skeleton width="85%" height={24} />
                <Skeleton width="100%" height={14} />
              </>
            ) : stake ? (
              <>
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {stakeTitle}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                  {stakeDetail}
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  No stake yet
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
                  Pick one below. A stake is a bet for coffee or dinner, never money.
                </Text>
              </>
            )}
            {saved ? (
              <Lottie name="success" size={56} style={{ alignSelf: "flex-end" }} />
            ) : null}
          </View>

          {/* Change the stake: preset bets, plus a custom one with Premium. */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionLabel>{stake ? "CHANGE THE STAKE" : "PICK A STAKE"}</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.lg }}
            >
              {STAKES.map((preset) => (
                <Chip
                  key={preset.title}
                  label={preset.title}
                  icon={preset.icon}
                  selected={preset.title === stakeTitle}
                  onPress={() => pickStake(preset)}
                />
              ))}
              <Chip
                label={isPremium ? "Write your own" : "Write your own, Premium"}
                icon="create-outline"
                locked={!isPremium}
                selected={composing && isPremium}
                onPress={() => (isPremium ? setComposing((open) => !open) : openPaywall())}
              />
            </ScrollView>
            {composing && isPremium ? (
              <View
                style={{
                  gap: theme.spacing.sm,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="e.g. Loser buys lunch on Friday"
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel="Your stake"
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={saveCustom}
                  style={{
                    minHeight: 48,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    paddingHorizontal: theme.spacing.sm,
                  }}
                />
                <Button label="Set this stake" onPress={saveCustom} disabled={!draft.trim()} />
              </View>
            ) : null}
            {stakeNote ? (
              <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
                {stakeNote}
              </Text>
            ) : null}
          </View>

          {/* Quick fire: one-tap cheers, with a burst that floats up from the row. */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionLabel>SEND QUICK FIRE</SectionLabel>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.lg }}
              >
                {CHEERS.map((cheer) => (
                  <Chip
                    key={cheer.label}
                    label={cheer.label}
                    icon={cheer.icon}
                    onPress={() => void sendCheer(cheer.label, cheer.icon)}
                  />
                ))}
              </ScrollView>
              <View
                pointerEvents="none"
                style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44 }}
              >
                {bursts.map((burst) => (
                  <CheerBurst
                    key={burst.id}
                    icon={burst.icon}
                    left={burst.left}
                    drift={burst.drift}
                    onDone={() => finish(burst.id)}
                  />
                ))}
              </View>
            </View>
            {cheerNote ? (
              <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
                {cheerNote}
              </Text>
            ) : null}
          </View>

          {/* Recent activity: real avatars with status badges, timestamps on the right. */}
          <View style={{ gap: theme.spacing.xs }}>
            <SectionLabel>RECENT ACTIVITY</SectionLabel>
            {loading ? (
              <SkeletonList rows={3} />
            ) : activity.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="Nothing shared yet"
                body="Finish a workout and it shows up here for your partner. Your sets stay private."
                actionLabel="Go to today's workout"
                onAction={() => router.navigate("/")}
              />
            ) : (
              <FlatList
                data={activity}
                keyExtractor={(update) => update.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                )}
                renderItem={({ item, index }) => (
                  <Appear delay={Math.min(index, 8) * 50}>
                    <ActivityRow update={item} partnerName={partnerName} />
                  </Appear>
                )}
              />
            )}
          </View>

          {/* Score history: this week for everyone, past weeks with Premium. */}
          <View style={{ gap: theme.spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionLabel>SCORE HISTORY</SectionLabel>
              {!isPremium ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                  <Ionicons name="lock-closed" size={13} color={theme.colors.accent} />
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Premium
                  </Text>
                </View>
              ) : null}
            </View>
            {loading ? (
              <Skeleton height={64} />
            ) : (
              <ScoreRow
                title="This week"
                detail={due ? `${shared} of ${due * 2} sessions shared` : "No sessions due yet"}
                percent={percent}
              />
            )}
            {isPremium ? (
              history.map((row) => (
                <ScoreRow
                  key={row.monday.toISOString()}
                  title={`Week ${weekNumber(row.monday)}`}
                  detail={weekRange(row.monday)}
                  percent={row.summary.percent}
                />
              ))
            ) : (
              <PressScale
                onPress={openPaywall}
                accessibilityRole="button"
                accessibilityLabel="Unlock past weeks and scorecards with Premium"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Ionicons name="lock-closed" size={20} color={theme.colors.accent} />
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Past weeks and scorecards
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                    Premium shows every week you've scored, with the scorecards you shared.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </PressScale>
            )}
          </View>

          {/* The primary action: a full-width orange scorecard share, last on the screen. */}
          <PressScale
            onPress={() =>
              void share({
                message: shareMessage,
                title: "Our Spotter Pair week",
              })
            }
            haptic="light"
            disabled={sharing || loading}
            accessibilityRole="button"
            accessibilityLabel="Share weekly scorecard"
            accessibilityState={{ disabled: sharing || loading }}
            style={{
              height: 80,
              borderRadius: theme.radius.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.md,
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
              opacity: sharing || loading ? 0.6 : 1,
            }}
          >
            <Ionicons name="share-outline" size={26} color={theme.colors.onPrimary} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.title,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {sharing ? "Making your card" : "Share Weekly Scorecard"}
              </Text>
              <Text style={{ color: theme.colors.onPrimary, fontSize: theme.font.size.caption }}>
                Stories / Text
              </Text>
            </View>
          </PressScale>
        </Stagger>
      </ScrollView>
      <Celebrate trigger={celebrate} />
    </View>
  );
}
