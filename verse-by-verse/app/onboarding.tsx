import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STARTING_PASSAGES, bookIdOf, useBooks } from "../components/bible";
import { useBookmarks } from "../components/bookmarks";
import { BookGrid } from "../components/PassagePicker";
import { Reader } from "../components/index/Reader";
import { SkeletonList, StepTransition, haptic } from "../components/motion";
import { ChoiceCard, StatusNote, StepProgress, TimeChoice } from "../components/onboarding/Parts";
import { notePaywallSource } from "../components/paywall/source";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  DEFAULT_SETUP_TIME,
  REMINDER_COPY,
  SETUP_TIMES,
  clockTime,
} from "../components/reminder";
import { track } from "../data/analytics";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { BIBLE_TOTALS, bookOf, fetchVerse, getVerse } from "../data/bible";
import { useReminder } from "../data/reminders";
import { formatReference, type VerseRef } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

// Setup has three steps, and the progress line counts exactly these:
// 1. choose where to start reading: one of four passages, or the start of any of the 66 books
//    (sets where the reader opens and which passage Search lists first);
// 2. read that first verse in the real reader (the first success: the place is kept from here on);
// 3. an optional daily reminder.
const STEP_NAMES = ["start_passage", "first_verse", "reminder"] as const;
const STEPS = STEP_NAMES.length;

/** The step someone had reached, saved so that leaving the app mid-setup resumes there. */
const STEP_KEY = "onboarding.step";
/** The reminder time they had picked, saved for the same reason. */
const TIME_KEY = "onboarding.reminderTime";
/** The "Pick any book" choice, beside the four starting passages. */
const ANY_BOOK = "__any_book";

function savedIndex(raw: string | undefined, count: number, fallback: number): number {
  const value = Number(raw);
  return raw !== undefined && Number.isInteger(value) && value >= 0 && value < count
    ? value
    : fallback;
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, completeOnboarding } = useAppState();
  const { isPremium } = usePurchases();
  const reminder = useReminder();
  const marks = useBookmarks();

  const [step, setStep] = useState(() => savedIndex(answers[STEP_KEY], STEPS, 0));
  const [direction, setDirection] = useState<1 | -1>(1);
  // The chosen starting passage (by book name), or ANY_BOOK with the book picked from the grid.
  // Coming back to this step shows the earlier answer.
  const earlier = answers.startingbook ? bookOf(answers.startingbook)?.name : undefined;
  const [choice, setChoice] = useState<string | null>(
    earlier ? (STARTING_PASSAGES.some((p) => p.book === earlier) ? earlier : ANY_BOOK) : null,
  );
  const [anyBook, setAnyBook] = useState<string | null>(
    earlier && !STARTING_PASSAGES.some((p) => p.book === earlier) ? earlier : null,
  );
  const [timeIndex, setTimeIndex] = useState(() =>
    savedIndex(answers[TIME_KEY], SETUP_TIMES.length, DEFAULT_SETUP_TIME),
  );
  const [working, setWorking] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const succeeded = useRef(false);
  // Where "Pick any book" sits in the first step's scroll, so choosing it can bring the books up.
  const startScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const anyBookAt = useRef({ section: 0, group: 0, card: 0 });
  const at = (part: keyof typeof anyBookAt.current) => (event: LayoutChangeEvent) => {
    anyBookAt.current[part] = event.nativeEvent.layout.y;
  };

  // The four passages are shown with their text, so their books load first.
  const passages = useBooks(STARTING_PASSAGES.map(bookIdOf));
  const start: VerseRef | undefined =
    choice === ANY_BOOK
      ? anyBook
        ? { book: anyBook, chapter: 1, verse: 1 }
        : undefined
      : STARTING_PASSAGES.find((p) => p.book === choice);
  const time = SETUP_TIMES[timeIndex] ?? SETUP_TIMES[DEFAULT_SETUP_TIME]!;
  const timeLabel = clockTime(time.hour, time.minute);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setProblem(null);
    setStep(next);
    void setAnswer(STEP_KEY, String(next));
  }

  /** Step 1: keep the chosen start, open the reader there, and move on to reading it. */
  async function begin() {
    if (!start || working) return;
    setWorking(true);
    setProblem(null);
    try {
      // Going back and continuing with the same book keeps the place already reached in it.
      const sameChoice = answers.startingbook === start.book && marks.place !== undefined;
      const verse = await fetchVerse(start);
      if (!verse) throw new Error(`No verse ${formatReference(start)}`);
      await setAnswer("startingbook", start.book);
      if (!sameChoice) await marks.keepPlace(verse);
      track("onboarding_step_completed", { step: STEP_NAMES[0] });
      go(1);
    } catch {
      setProblem("Couldn't save where to start. Check the phone's storage and try again.");
    } finally {
      setWorking(false);
    }
  }

  /** The first success: the person reads on from their first verse, or saves it. */
  function onRead(action: "read_on" | "save") {
    if (succeeded.current) return;
    succeeded.current = true;
    track("onboarding_first_success", { action });
  }

  function chooseTime(index: number) {
    if (index === timeIndex) return;
    haptic("selection");
    setTimeIndex(index);
    void setAnswer(TIME_KEY, String(index));
    const next = SETUP_TIMES[index];
    // Already on: move the reminder to the new time.
    if (next && reminder.enabled) void reminder.setTime(next.hour, next.minute).catch(() => undefined);
  }

  async function turnOnReminder() {
    if (working) return;
    setWorking(true);
    setProblem(null);
    try {
      const allowed = await reminder.enable({
        ...REMINDER_COPY,
        hour: time.hour,
        minute: time.minute,
      });
      if (allowed) haptic("success");
      setDeclined(!allowed);
    } catch {
      setProblem("The reminder couldn't be set. You can turn it on later in Settings.");
    } finally {
      setWorking(false);
    }
  }

  /** Leave setup for the reader. The app then shows the paywall once, over the reader. */
  function finish(completedStep?: (typeof STEP_NAMES)[number]) {
    if (completedStep) track("onboarding_step_completed", { step: completedStep });
    notePaywallSource("onboarding");
    void setAnswer(STEP_KEY, "0");
    void completeOnboarding();
  }

  const heading = {
    color: theme.colors.text,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.headline,
    fontWeight: theme.font.weight.bold,
    lineHeight: theme.font.size.headline * 1.2,
  } as const;
  const prose = {
    color: theme.colors.textMuted,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.body,
    lineHeight: theme.font.size.body * 1.45,
  } as const;
  const caption = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption,
    lineHeight: theme.font.size.caption * 1.4,
  } as const;

  const footer = {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: Math.max(insets.bottom, theme.spacing.md),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: "Getting started" }} />

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.md,
        }}
      >
        {/* Back is there from the second step on, and keeps every earlier answer. */}
        <View style={{ minHeight: 44, justifyContent: "center" }}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to the previous step"
              hitSlop={8}
              onPress={() => go(step - 1)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                minHeight: 44,
                paddingRight: theme.spacing.sm,
                marginLeft: -theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body }}>
                Back
              </Text>
            </Pressable>
          ) : null}
        </View>
        <StepProgress step={step + 1} total={STEPS} />
      </View>

      <StepTransition step={step} direction={direction} style={{ flex: 1 }}>
        {step === 0 ? (
          <>
            <ScrollView
              ref={startScroll}
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.xl,
                gap: theme.spacing.xl,
              }}
            >
              <View style={{ gap: theme.spacing.sm }}>
                <Text accessibilityRole="header" style={heading}>
                  Read the Bible one verse at a time
                </Text>
                <Text style={prose}>
                  Verse by Verse opens on a single verse and keeps your place when you leave.
                </Text>
              </View>

              <View onLayout={at("section")} style={{ gap: theme.spacing.md }}>
                <View style={{ gap: theme.spacing.xs }}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.font.family,
                      fontSize: theme.font.size.title,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    Where would you like to start?
                  </Text>
                  <Text style={caption}>
                    The reader opens at the passage you pick, and its book comes first in Search.
                    You can move to any passage later.
                  </Text>
                </View>

                {!passages.ready && !passages.failed ? (
                  <SkeletonList rows={4} />
                ) : (
                  <View
                    onLayout={at("group")}
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Starting passage"
                    style={{ gap: theme.spacing.md }}
                  >
                    {STARTING_PASSAGES.map((passage) => (
                      <ChoiceCard
                        key={passage.book}
                        title={formatReference(passage)}
                        text={getVerse(passage)?.text}
                        selected={choice === passage.book}
                        onPress={() => {
                          haptic("selection");
                          setProblem(null);
                          setChoice(passage.book);
                        }}
                      />
                    ))}
                    <View onLayout={at("card")} />
                    <ChoiceCard
                      title="Pick any book"
                      text={
                        anyBook
                          ? `Start at ${anyBook} 1:1.`
                          : `Start at chapter 1 of any of the ${BIBLE_TOTALS.books} books.`
                      }
                      selected={choice === ANY_BOOK}
                      onPress={() => {
                        haptic("selection");
                        setProblem(null);
                        setChoice(ANY_BOOK);
                        // Bring the book list up under the choice.
                        const { section, group, card } = anyBookAt.current;
                        setTimeout(
                          () => startScroll.current?.scrollTo({ y: section + group + card, animated: true }),
                          50,
                        );
                      }}
                    />
                    {choice === ANY_BOOK ? (
                      <BookGrid
                        selected={anyBook ?? undefined}
                        onPick={(picked) => {
                          setProblem(null);
                          setAnyBook(picked.name);
                        }}
                      />
                    ) : null}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={footer}>
              {problem ? <StatusNote tone="problem" title={problem} /> : null}
              <PrimaryButton
                label={
                  working
                    ? "Opening the reader…"
                    : start
                      ? `Start at ${formatReference(start)}`
                      : choice === ANY_BOOK
                        ? "Pick a book to start"
                        : "Pick a passage to start"
                }
                disabled={!start || working}
                onPress={() => void begin()}
              />
              <PrimaryButton
                label="Skip setup"
                variant="quiet"
                onPress={() => finish()}
                accessibilityHint="Opens the app at Genesis 1:1"
              />
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Reader
              paddingTop={theme.spacing.sm}
              hint="Tap a verse to read on. Your place is kept for next time."
              onAct={onRead}
              renderTop={() => (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text accessibilityRole="header" style={heading}>
                    Your first verse
                  </Text>
                  <Text style={prose}>
                    This is the reader itself, not a demo. What you read, save or open here stays
                    in the app.
                  </Text>
                </View>
              )}
            />
            <View style={footer}>
              <PrimaryButton
                label="Continue"
                onPress={() => {
                  track("onboarding_step_completed", { step: STEP_NAMES[1] });
                  go(2);
                }}
              />
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.xl,
                gap: theme.spacing.lg,
              }}
            >
              <View style={{ gap: theme.spacing.sm }}>
                <Text accessibilityRole="header" style={heading}>
                  Want a daily reminder?
                </Text>
                <Text style={prose}>
                  {`One notification a day, at the time you pick, to come back to where you left off${
                    marks.place ? ` (${formatReference(marks.place)} right now)` : ""
                  }. No streaks, no pressure.`}
                </Text>
              </View>

              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Reminder time"
                style={{ flexDirection: "row", gap: theme.spacing.sm }}
              >
                {SETUP_TIMES.map((option, index) => (
                  <TimeChoice
                    key={option.label}
                    time={clockTime(option.hour, option.minute)}
                    label={option.label}
                    selected={index === timeIndex}
                    onPress={() => chooseTime(index)}
                  />
                ))}
              </View>

              {reminder.enabled ? (
                <StatusNote
                  tone="done"
                  title={`Reminder set for ${clockTime(reminder.hour, reminder.minute)} every day`}
                  text="You can change the time or turn it off in Settings."
                />
              ) : declined ? (
                <StatusNote
                  tone="off"
                  title="Notifications are off for this app"
                  text="Nothing was scheduled. To get the reminder, allow notifications in your phone's Settings, then turn it on in the app's Settings."
                />
              ) : (
                <Text style={caption}>
                  Your phone will ask to allow notifications. You can change the time or turn the
                  reminder off in Settings.
                </Text>
              )}
              {problem ? <StatusNote tone="problem" title={problem} /> : null}
            </ScrollView>

            <View style={footer}>
              {reminder.enabled || declined ? (
                <PrimaryButton label="Finish setup" onPress={() => finish(STEP_NAMES[2])} />
              ) : (
                <>
                  <PrimaryButton
                    label={working ? "Turning on…" : `Turn on the ${timeLabel} reminder`}
                    disabled={working}
                    onPress={() => void turnOnReminder()}
                  />
                  <PrimaryButton
                    label="Not now"
                    variant="quiet"
                    onPress={() => finish(STEP_NAMES[2])}
                    accessibilityHint="Finishes setup without a reminder"
                  />
                </>
              )}
              {isPremium ? null : (
                <Text style={{ ...caption, textAlign: "center" }}>
                  Next you'll see what Premium adds. It's optional, and reading stays free.
                </Text>
              )}
            </View>
          </>
        ) : null}
      </StepTransition>
    </View>
  );
}
