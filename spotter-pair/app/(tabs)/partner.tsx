import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, PARTNER_PHOTO } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Celebrate, Lottie } from "../../components/lottie";
import {
  Appear,
  GrowBar,
  PressScale,
  Skeleton,
  SkeletonList,
  Stagger,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { WeekRing } from "../../components/partner/WeekRing";
import { openPaywallFrom } from "../../components/paywall/open";
import { Rocco } from "../../components/Rocco";
import { useShareImage } from "../../components/share";
import { appInfo } from "../../data/app-info";
import { useAppState } from "../../data/app-state";
import { useToday } from "../../data/clock";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  addDays,
  count,
  parseDayKey,
  sharedWeek,
  startOfWeek,
  timeAgo,
  weekStats,
  type PartnerUpdate,
  type Workout,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

type IconName = ComponentProps<typeof Ionicons>["name"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The project has no picture for the person using the phone, so their avatar is the drawn fallback. */
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

/** A week's score: the pair's shared one once a partner is linked, the person's own before. */
interface Summary {
  paired: boolean;
  due: number;
  yours: number;
  partnerDone: number;
  percent: number;
}

/**
 * The week containing `asOf`. Until an update from a partner has arrived there is no partner
 * to count, so the score is the person's own sessions done out of those due.
 */
function summarize(
  workouts: Workout[],
  updates: PartnerUpdate[],
  asOf: Date,
  paired: boolean,
): Summary {
  if (paired) return { paired, ...sharedWeek(workouts, updates, asOf) };
  const mine = weekStats(workouts, asOf);
  return {
    paired,
    due: mine.due,
    yours: mine.completed,
    partnerDone: 0,
    percent: mine.percent,
  };
}

function headline(s: Summary): string {
  if (!s.due) return "Nothing due yet";
  if (s.percent >= 100) return s.paired ? "Both showed up" : "You showed up";
  if (s.percent >= 75) return s.paired ? "On track together" : "On track";
  if (s.percent >= 40) return s.paired ? "Catching up together" : "Catching up";
  return "Time to show up";
}

function owedLine(s: Summary): string {
  if (!s.due) return "Nothing is owed until a session is due.";
  const you = s.yours < s.due;
  if (!s.paired) return you ? "You owe the stake this week." : "Nothing owed. Every session done.";
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
        fontWeight: theme.font.weight.medium,
        letterSpacing: 1.1,
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
  selected,
  locked = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Given for chips that are one choice of several (the stakes): the chip is then a radio. */
  selected?: boolean;
  locked?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.94}
      hitSlop={8}
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      aria-checked={selected}
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
        name={selected ? "checkmark-circle" : icon}
        size={16}
        color={selected ? theme.colors.onPrimary : theme.colors.primary}
      />
      <Text
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.text,
          fontSize: theme.font.size.caption,
          fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
      {locked ? <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} /> : null}
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
          <Avatar prompt={PARTNER_PHOTO} name={partnerName} size={size} />
        ) : cheer ? (
          <Avatar prompt={YOUR_PHOTO} size={size} />
        ) : (
          <Rocco pose={MASCOT_CALM} size={size} />
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
        numberOfLines={3}
        style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}
      >
        {text}
      </Text>
      <Text
        style={{
          minWidth: 72,
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
  const { isPremium } = usePurchases();
  // Re-render when the calendar day changes, so the week on screen is the current one.
  useToday();
  const workouts = useCollection<Workout>("workouts");
  const updates = useCollection<PartnerUpdate>("partner_updates");
  const { ref, share, sharing } = useShareImage();

  // The partner's name, as typed in Settings ("partner_name"). Until it's known, the screen
  // speaks of "your partner".
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

  // A partner is linked once an update from them has arrived on this phone. Nothing in this
  // version delivers one (linking needs a sync service), so until then the screen is the
  // person's own week plus the ways to show it to a partner.
  const partnerUpdates = updates.items.filter((u) => u.from === "partner");
  const paired = partnerUpdates.length > 0;
  const lastPartner = partnerUpdates.reduce<string | null>(
    (latest, u) => (latest === null || u.createdAt > latest ? u.createdAt : latest),
    null,
  );
  const partnerActive =
    lastPartner !== null && now.getTime() - new Date(lastPartner).getTime() < 2 * 86_400_000;
  const partnerStatus =
    lastPartner === null
      ? "Not linked yet"
      : partnerActive
        ? "Active today"
        : `Last update ${timeAgo(lastPartner)}`;

  const today = summarize(workouts.items, updates.items, now, paired);
  const { due, yours, partnerDone, percent } = today;
  const shared = yours + partnerDone;
  if (!loading && baseline.current === null) baseline.current = shared;
  const celebrate =
    percent >= 100 && baseline.current !== null && shared > baseline.current ? shared : 0;
  const stakes = updates.items
    .filter((u) => u.type === "stake")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const stake = stakes[0];
  const [stakeTitle = "", stakeDetail = ""] = stake ? stake.message.split("\n") : [];

  const activity = [...updates.items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  // Every earlier week that had a session due, newest first, back to the plan's first week.
  const firstDate = workouts.items
    .filter((w) => !w.deleted)
    .reduce<string | null>((first, w) => (first === null || w.date < first ? w.date : first), null);
  const firstMonday = firstDate ? startOfWeek(parseDayKey(firstDate)) : startOfWeek(now);
  const history: Array<{ monday: Date; summary: Summary }> = [];
  for (let weeksAgo = 1; weeksAgo <= 104; weeksAgo++) {
    const monday = addDays(startOfWeek(now), -7 * weeksAgo);
    if (monday.getTime() < firstMonday.getTime()) break;
    const summary = summarize(workouts.items, updates.items, addDays(monday, 6), paired);
    if (summary.due > 0) history.push({ monday, summary });
  }

  const pose = percent >= 75 ? MASCOT_HAPPY : MASCOT_CALM;
  // While the card is being made (or the week is loading) the share button goes neutral, not faded.
  const shareOff = sharing || loading;
  const shareInk = shareOff ? theme.colors.textMuted : theme.colors.onPrimary;
  // The words that go with the scorecard: completion counts and the stake, never a weight.
  const stakeLine = stakeTitle ? ` Stake: ${stakeTitle.replace(/[.!?]+$/, "")}.` : "";
  const shareMessage = !due
    ? `Spotter Pair: my training week starts now.${stakeLine}`
    : paired
      ? `Spotter Pair week ${weekNumber(now)}: ${percent}% shared on track. ${yours} of ${due} for me, ${partnerDone} of ${due} for my partner.${stakeLine}`
      : `Spotter Pair week ${weekNumber(now)}: ${yours} of ${count(due, "workout")} done (${percent}%).${stakeLine}`;

  /** Tells a partner about the app through the share sheet. Nothing is linked by it. */
  async function invite() {
    haptic("light");
    await Share.share({
      message: `Train with me on ${appInfo.name}. I'll send you my scorecard each week: send me yours.`,
    }).catch(() => undefined);
  }

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
      setCheerNote("That didn't send. Tap it again.");
    }
  }

  /** Saves a stake. Resolves false (and says so on screen) when it didn't save. */
  async function setStake(title: string, detail: string): Promise<boolean> {
    setStakeNote(null);
    try {
      await updates.add({
        type: "stake",
        from: "you",
        message: `${title}\n${detail}`,
        createdAt: new Date().toISOString(),
        weekScore: percent,
      });
      haptic("success");
      setSaved(true);
      return true;
    } catch {
      setStakeNote("The stake didn't save. Try again.");
      return false;
    }
  }

  function pickStake(preset: { title: string; detail: string }) {
    if (preset.title === stakeTitle) {
      haptic("selection");
      return;
    }
    void setStake(preset.title, preset.detail);
  }

  async function saveCustom() {
    const title = draft.replace(/\s+/g, " ").trim();
    if (!title) return;
    // The words stay in the box until they are saved, so a failed save loses nothing.
    if (await setStake(title, "Whoever finishes below 100% owes it this week.")) {
      setDraft("");
      setComposing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Stagger step={70} style={{ gap: theme.spacing.lg }}>
          {/* Header: the one-line title beside the mascot. */}
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
              minimumFontScale={0.8}
              accessibilityRole="header"
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: theme.font.size.display,
                fontWeight: theme.font.weight.bold,
                lineHeight: 38,
              }}
            >
              Partner Sync
            </Text>
            <Rocco pose={pose} size={96} />
          </View>

          {/* The partner row: avatar with a live dot, name, status, and Manage. */}
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
                <Avatar prompt={paired ? PARTNER_PHOTO : undefined} name={partnerName} size={56} />
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
                    backgroundColor: partnerActive ? theme.colors.success : theme.colors.textMuted,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
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
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Manage partner settings"
              hitSlop={12}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
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
          </View>

          {/* Before a partner is linked: what that means here, and the two things that do work. */}
          {paired ? null : (
            <View
              style={{
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>
                Two phones can't be linked in this version, so nothing here is sent for you. Your
                partner sees your week when you share your scorecard, at the bottom of this screen.
              </Text>
              <Button
                label="Invite a partner"
                icon="person-add-outline"
                variant="secondary"
                onPress={() => void invite()}
              />
            </View>
          )}

          {/* The accountability card (also the card that gets shared as an image). */}
          <View
            ref={ref}
            collapsable={false}
            style={{
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
                letterSpacing: 1.1,
              }}
            >
              {`WEEK ${weekNumber(now)} ACCOUNTABILITY`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
              {loading ? (
                <Skeleton width={124} height={124} radius={62} />
              ) : (
                <WeekRing
                  percent={percent}
                  label={paired ? "Shared score for this week" : "Your score for this week"}
                />
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
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.title,
                        fontWeight: theme.font.weight.bold,
                        lineHeight: 28,
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
              <Skeleton height={40} />
            ) : (
              <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
                {[
                  { who: "You", value: `${yours}/${due} workouts` },
                  {
                    who: firstName,
                    value: paired ? `${partnerDone}/${due} workouts` : "Not linked",
                  },
                ].map((side) => (
                  <View
                    key={side.who}
                    accessible
                    accessibilityLabel={`${side.who}: ${side.value.replace("/", " of ")}`}
                    style={{ flex: 1, gap: 2 }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                    >
                      {side.who}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {side.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {`Spotter Pair · ${weekRange(startOfWeek(now))}`}
            </Text>
          </View>

          {/* The stake: the one card outlined in the brand color, with a flame in the corner. */}
          <View
            style={{
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
              paddingRight: theme.spacing.xl + theme.spacing.xl,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.surface,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: theme.spacing.md,
                right: theme.spacing.md,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primary + "1F",
              }}
            >
              <Ionicons name="flame" size={22} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
                letterSpacing: 1.1,
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
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                    lineHeight: 28,
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
                    color: theme.colors.text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                    lineHeight: 28,
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
              <View style={{ width: 56, height: 56, alignSelf: "flex-end", overflow: "hidden" }}>
                <Lottie name="success" size={56} />
              </View>
            ) : null}
          </View>

          {/* Change the stake: preset bets, plus a custom one with Pro. */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionLabel>{stake ? "CHANGE THE STAKE" : "PICK A STAKE"}</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -theme.spacing.lg }}
              contentContainerStyle={{
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
              }}
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
                label={isPremium ? "Write your own" : "Write your own (Pro)"}
                icon="create-outline"
                locked={!isPremium}
                selected={composing && isPremium}
                onPress={() =>
                  isPremium ? setComposing((open) => !open) : openPaywallFrom("custom_stake")
                }
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
                  onSubmitEditing={() => void saveCustom()}
                  style={{
                    minHeight: 48,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radius.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.textMuted,
                    backgroundColor: theme.colors.background,
                  }}
                />
                <Button
                  label="Set this stake"
                  onPress={() => void saveCustom()}
                  disabled={!draft.trim()}
                />
              </View>
            ) : null}
            {stakeNote ? (
              <Text style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
                {stakeNote}
              </Text>
            ) : null}
          </View>

          {/* Quick fire: one-tap cheers, with a burst that floats up from the row. They need a
              linked partner to receive them, so the row is only here once there is one. */}
          {paired ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionLabel>SEND QUICK FIRE</SectionLabel>
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -theme.spacing.lg }}
                  contentContainerStyle={{
                    gap: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.lg,
                  }}
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
          ) : null}

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
              <View>
                {activity.map((item, index) => (
                  <Appear key={item.id} delay={Math.min(index, 8) * 50}>
                    {index > 0 ? (
                      <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                    ) : null}
                    <ActivityRow update={item} partnerName={partnerName} />
                  </Appear>
                ))}
              </View>
            )}
          </View>

          {/* Score history: this week for everyone, past weeks with Pro. */}
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
                  <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} />
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    Past weeks with Pro
                  </Text>
                </View>
              ) : null}
            </View>
            {loading ? (
              <Skeleton height={64} />
            ) : (
              <ScoreRow
                title="This week"
                detail={
                  !due
                    ? "No sessions due yet"
                    : paired
                      ? `${shared} of ${due * 2} sessions shared`
                      : `${yours} of ${count(due, "session")} done`
                }
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
                onPress={() => openPaywallFrom("score_history")}
                accessibilityRole="button"
                accessibilityLabel="See every past week's score with Spotter Pair Pro"
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
                <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Past weeks
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                    Pro keeps every earlier week's score here, not only this week's.
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
                title: paired ? "Our Spotter Pair week" : "My Spotter Pair week",
              })
            }
            haptic="light"
            disabled={shareOff}
            accessibilityRole="button"
            accessibilityLabel="Share weekly scorecard"
            accessibilityState={{ disabled: shareOff, busy: sharing }}
            aria-busy={sharing}
            style={{
              minHeight: 64,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.radius.pill,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.md,
              borderWidth: 1,
              borderColor: shareOff ? theme.colors.border : theme.colors.primary,
              backgroundColor: shareOff ? theme.colors.surfaceAlt : theme.colors.primary,
            }}
          >
            <Ionicons name="share-outline" size={22} color={shareInk} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: shareInk,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {sharing ? "Making your card…" : "Share weekly scorecard"}
              </Text>
              <Text style={{ color: shareInk, fontSize: theme.font.size.caption }}>
                Stories or text
              </Text>
            </View>
          </PressScale>
        </Stagger>
      </ScrollView>
      <Celebrate trigger={celebrate} />
    </View>
  );
}
