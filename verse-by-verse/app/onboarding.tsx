import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiImage } from "../components/AiImage";
import { hasArt } from "../components/Art";
import { Lottie } from "../components/lottie";
import {
  DrawCheck,
  PANEL_WIDTH,
  PreviewTabBar,
  SideActions,
  VerseStartCard,
} from "../components/onboarding/Parts";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  Appear,
  GrowBar,
  PressScale,
  Skeleton,
  StepTransition,
  haptic,
} from "../components/motion";
import { useAppState } from "../data/app-state";
import { useReminder } from "../data/reminders";
import { useCollection } from "../data/repo";
import { findBookmark, type Bookmark } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

const STEPS = 3;

const BADGER =
  "Badger mascot: a small grey-and-white badger with a brown muzzle peeking over the top-right corner of the first verse card";

// Five verses of John 1 (World English Bible, public domain): the starting list and the swipe practice.
const DEMO: Array<{ verse: number; text: string; note: boolean }> = [
  {
    verse: 1,
    text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    note: true,
  },
  { verse: 2, text: "He was in the beginning with God.", note: false },
  {
    verse: 3,
    text: "All things were made through him. Without him, nothing was made that has been made.",
    note: false,
  },
  { verse: 4, text: "In him was life, and the life was the light of men.", note: false },
  {
    verse: 5,
    text: "The light shines in the darkness, and the darkness didn't overcome it.",
    note: false,
  },
];

// Daily reminder times. The evening one is the default.
const TIMES = [
  { hour: 7, minute: 30, label: "Morning" },
  { hour: 12, minute: 30, label: "Midday" },
  { hour: 20, minute: 30, label: "Evening" },
];

function clock(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function Heading({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.text,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.headline,
          fontWeight: theme.font.weight.regular,
          lineHeight: theme.font.size.headline * 1.2,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.font.family,
          fontSize: theme.font.size.body,
          lineHeight: theme.font.size.body * 1.45,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setAnswer, completeOnboarding } = useAppState();
  const reminder = useReminder();
  const bookmarks = useCollection<Bookmark>("bookmarks");
  const serif = { fontFamily: theme.font.family };
  // The mascot peeks over the first card only once its picture exists; until then the card
  // sits in the list without the gap left for it.
  const hasBadger = hasArt(BADGER);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [verse, setVerse] = useState(0);
  const [timeIndex, setTimeIndex] = useState(2);
  const [enabling, setEnabling] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [turnedOn, setTurnedOn] = useState(false);

  const verseRef = useRef(0);
  const drag = useRef(new Animated.Value(0)).current;
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
    },
    [],
  );

  const barWidth = Math.min(300, width - theme.spacing.xl * 2);
  const time = TIMES[timeIndex] ?? TIMES[2]!;
  const current = DEMO[verse] ?? DEMO[0]!;
  const savedMark = bookmarks.loading
    ? undefined
    : findBookmark(bookmarks.items, { book: "John", chapter: 1, verse: current.verse });

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  /** Tapping a verse starts the reader there: saves the starting book and moves on. */
  function startAt(index: number) {
    haptic("selection");
    verseRef.current = index;
    setVerse(index);
    void setAnswer("startingbook", "John");
    go(1);
  }

  function chooseTime(index: number) {
    if (index === timeIndex || turnedOn) return;
    haptic("selection");
    setTimeIndex(index);
  }

  function turnVerse(dir: 1 | -1) {
    const target = verseRef.current + dir;
    if (target < 0 || target >= DEMO.length) {
      Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
      return;
    }
    haptic("selection");
    Animated.timing(drag, {
      toValue: dir * -460,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      verseRef.current = target;
      setVerse(target);
      drag.setValue(dir * 60);
      Animated.spring(drag, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }).start();
    });
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        const atEdge =
          (g.dy < 0 && verseRef.current === DEMO.length - 1) ||
          (g.dy > 0 && verseRef.current === 0);
        drag.setValue(atEdge ? g.dy * 0.3 : g.dy < 0 ? g.dy : g.dy * 0.35);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -60 || g.vy < -0.6) turnVerse(1);
        else if (g.dy > 60 || g.vy > 0.6) turnVerse(-1);
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start(),
    }),
  ).current;

  function toggleBookmark() {
    if (bookmarks.loading) return;
    if (savedMark) {
      haptic("light");
      void bookmarks.remove(savedMark.id);
      return;
    }
    haptic("success");
    void bookmarks.add({
      book: "John",
      chapter: 1,
      verse: current.verse,
      text: current.text,
      folder: "",
      createdAt: new Date().toISOString(),
    });
  }

  async function turnOnReminders() {
    if (enabling || turnedOn) return;
    setEnabling(true);
    let ok = false;
    try {
      ok = await reminder.enable({
        title: "Pick up where you left off",
        body: "Your verse is waiting, right where you stopped.",
        hour: time.hour,
        minute: time.minute,
      });
    } catch {
      ok = false;
    }
    setEnabling(false);
    if (ok) {
      haptic("success");
      setTurnedOn(true);
      finishTimer.current = setTimeout(() => void completeOnboarding(), 1200);
    } else {
      setDeclined(true);
    }
  }

  // There is nothing to go back to on the first step, so the button only appears after it.
  const backPill =
    step === 0 ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        onPress={() => go(step - 1)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          minHeight: 44,
          paddingRight: theme.spacing.sm,
          marginLeft: -theme.spacing.sm,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>Back</Text>
      </Pressable>
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <Stack.Screen options={{ title: "Welcome" }} />

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
          <View style={{ width: 104, alignItems: "flex-start" }}>{backPill}</View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Ionicons name="book-outline" size={32} color={theme.colors.primary} />
          </View>
          <View style={{ width: 104 }} />
        </View>
        <Appear style={{ alignItems: "center", gap: theme.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{
              ...serif,
              color: theme.colors.text,
              fontSize: theme.font.size.headline,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Verse by Verse
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            Step {step + 1} of {STEPS}
          </Text>
          <GrowBar
            progress={(step + 1) / STEPS}
            height={6}
            style={{ width: barWidth, marginTop: theme.spacing.xs }}
          />
        </Appear>
      </View>

      <StepTransition step={step} direction={direction} style={{ flex: 1 }}>
        {step === 0 ? (
          <FlatList
            data={DEMO}
            keyExtractor={(item) => String(item.verse)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
              gap: theme.spacing.lg,
            }}
            ListHeaderComponent={
              <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    ...serif,
                    color: theme.colors.text,
                    fontSize: theme.font.size.headline,
                    fontWeight: theme.font.weight.regular,
                    textAlign: "center",
                  }}
                >
                  Verse of the day
                </Text>
                <Text
                  style={{
                    ...serif,
                    color: theme.colors.textMuted,
                    fontSize: theme.font.size.body,
                    lineHeight: theme.font.size.body * 1.45,
                    textAlign: "center",
                  }}
                >
                  Pick a starting book. You can switch anywhere at any time.
                </Text>
              </View>
            }
            ListFooterComponent={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip setup"
                hitSlop={12}
                onPress={() => void completeOnboarding()}
                style={({ pressed }) => ({
                  alignSelf: "center",
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
                  Skip setup
                </Text>
              </Pressable>
            }
            renderItem={({ item, index }) => {
              const featured = index === 0;
              return (
                <Appear delay={Math.min(index, 8) * 50}>
                  <View style={{ marginTop: featured && hasBadger ? theme.spacing.xl * 2 : 0 }}>
                    <VerseStartCard
                      label={`John 1:${item.verse}`}
                      text={item.text}
                      featured={featured}
                      inset={featured ? PANEL_WIDTH + theme.spacing.md : undefined}
                      onPress={() => startAt(index)}
                    />
                    {featured ? <SideActions hasNote={item.note} /> : null}
                    {featured && hasBadger ? (
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          top: -64,
                          right: theme.spacing.md,
                          zIndex: 2,
                        }}
                      >
                        <AiImage
                          prompt={BADGER}
                          fit="contain"
                          style={{ width: 96, height: 96 }}
                        />
                      </View>
                    ) : null}
                  </View>
                </Appear>
              );
            }}
          />
        ) : (
          <ScrollView
            scrollEnabled={step !== 1}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.xl,
              paddingBottom: theme.spacing.lg,
              gap: theme.spacing.lg,
            }}
          >
            {step === 1 ? (
              <View style={{ gap: theme.spacing.lg }}>
                <Heading
                  title="Swipe to read"
                  body="Swipe up to move to the next verse. Tap the bookmark to save it. Try it on five verses."
                />
                <Appear>
                  <Animated.View
                    {...pan.panHandlers}
                    accessibilityRole="adjustable"
                    accessibilityLabel={`John 1:${current.verse}. ${current.text}`}
                    accessibilityActions={[
                      { name: "increment", label: "Next verse" },
                      { name: "decrement", label: "Previous verse" },
                    ]}
                    onAccessibilityAction={(event) =>
                      turnVerse(event.nativeEvent.actionName === "decrement" ? -1 : 1)
                    }
                    style={{
                      transform: [{ translateY: drag }],
                      flexDirection: "row",
                      gap: theme.spacing.md,
                      padding: theme.spacing.lg,
                      minHeight: 240,
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <View style={{ flex: 1, gap: theme.spacing.sm }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: 40,
                        }}
                      >
                        <Text
                          style={{
                            ...serif,
                            color: theme.colors.text,
                            fontSize: theme.font.size.title,
                            fontWeight: theme.font.weight.bold,
                          }}
                        >
                          John 1:{current.verse}
                        </Text>
                        {savedMark ? (
                          <View style={{ width: 40, height: 40, overflow: "hidden" }}>
                            <Lottie name="heart" size={40} />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          ...serif,
                          color: theme.colors.text,
                          fontSize: theme.font.size.body,
                          lineHeight: theme.font.size.body * 1.5,
                        }}
                      >
                        {current.text}
                      </Text>
                    </View>
                    <View style={{ width: 76, alignItems: "center", gap: theme.spacing.md }}>
                      {bookmarks.loading ? (
                        <Skeleton width={44} height={44} radius={22} />
                      ) : (
                        <Pressable
                          onPress={toggleBookmark}
                          accessibilityRole="button"
                          accessibilityLabel={
                            savedMark
                              ? `Remove bookmark for John 1:${current.verse}`
                              : `Bookmark John 1:${current.verse}`
                          }
                          accessibilityState={{ selected: Boolean(savedMark) }}
                          hitSlop={10}
                          style={({ pressed }) => ({
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: savedMark ? theme.colors.surfaceAlt : undefined,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons
                            name={savedMark ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={savedMark ? theme.colors.primary : theme.colors.textMuted}
                          />
                        </Pressable>
                      )}
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <Ionicons name="reader-outline" size={22} color={theme.colors.textMuted} />
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: theme.font.size.caption,
                            textAlign: "center",
                          }}
                        >
                          Full context
                        </Text>
                      </View>
                      {current.note ? (
                        <View style={{ alignItems: "center", gap: 2 }}>
                          <Ionicons
                            name="document-text-outline"
                            size={22}
                            color={theme.colors.textMuted}
                          />
                          <Text
                            style={{
                              color: theme.colors.textMuted,
                              fontSize: theme.font.size.caption,
                              textAlign: "center",
                            }}
                          >
                            Study note
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                </Appear>
                <View style={{ gap: theme.spacing.sm }}>
                  <GrowBar progress={(verse + 1) / DEMO.length} />
                  <Text
                    style={{
                      alignSelf: "center",
                      color: theme.colors.textMuted,
                      fontSize: theme.font.size.caption,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    Verse {verse + 1} of {DEMO.length}
                  </Text>
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={{ gap: theme.spacing.lg }}>
                <Heading
                  title="A gentle daily reminder?"
                  body="Choose a time and we will send one quiet reminder with a verse to pick up where you left off. No streaks, no pressure."
                />
                {turnedOn ? (
                  <View style={{ alignItems: "center" }}>
                    <View style={{ width: 96, height: 96, overflow: "hidden" }}>
                      <Lottie name="success" size={96} />
                    </View>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                  {TIMES.map((option, index) => {
                    const selected = index === timeIndex;
                    return (
                      <View key={option.label} style={{ flex: 1 }}>
                        <PressScale
                          onPress={() => chooseTime(index)}
                          scaleTo={0.94}
                          disabled={turnedOn}
                          accessibilityRole="button"
                          accessibilityLabel={`${option.label}, ${clock(option.hour, option.minute)}`}
                          accessibilityState={{ selected, disabled: turnedOn }}
                          style={{
                            minHeight: 60,
                            borderRadius: theme.radius.sm,
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                            borderWidth: 1,
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? theme.colors.onPrimary : theme.colors.text,
                              fontSize: theme.font.size.body,
                              fontWeight: theme.font.weight.bold,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
                            {clock(option.hour, option.minute)}
                          </Text>
                          <View
                            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                          >
                            {selected ? (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color={theme.colors.onPrimary}
                              />
                            ) : null}
                            <Text
                              style={{
                                color: selected ? theme.colors.onPrimary : theme.colors.textMuted,
                                fontSize: theme.font.size.caption,
                              }}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </PressScale>
                      </View>
                    );
                  })}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <DrawCheck key={`${time.hour}:${time.minute}`} size={52} />
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.bold,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      Every day at {clock(time.hour, time.minute)}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.font.size.caption,
                        lineHeight: theme.font.size.caption * 1.4,
                      }}
                    >
                      {declined
                        ? "Notifications are off for this app. Allow them later in your phone's Settings to get the reminder."
                        : "You can change the time or turn this off in Settings."}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </StepTransition>

      {step === 1 || step === 2 ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.sm,
          }}
        >
          {step === 1 ? (
            <>
              <PrimaryButton label="Continue" onPress={() => go(2)} />
              <PrimaryButton
                label="Skip for now"
                variant="quiet"
                onPress={() => void completeOnboarding()}
              />
            </>
          ) : null}
          {step === 2 ? (
            <>
              <PrimaryButton
                label={declined ? "Start reading" : enabling ? "Turning on…" : "Turn on reminders"}
                disabled={enabling || turnedOn}
                onPress={() => (declined ? void completeOnboarding() : void turnOnReminders())}
                accessibilityHint="Sets one daily reminder at the time you chose"
              />
              {!declined && !turnedOn ? (
                <PrimaryButton
                  label="Not now"
                  variant="quiet"
                  onPress={() => void completeOnboarding()}
                />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <PreviewTabBar bottomInset={insets.bottom} />
    </View>
  );
}
