import { Ionicons } from "@expo/vector-icons";
import type { ComponentRef, RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Outlook } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Mascot, PressScale } from "../motion";

const TITLES: Record<Outlook["tier"], string> = {
  sharp: "Game form: sharp",
  steady: "Game form: steady",
  flat: "Game form: recovering",
};

/** The mascot pose that matches each form tier. */
const POSES: Record<Outlook["tier"], string> = {
  sharp: "dash-game-day-sharp",
  steady: "dash-match-ready",
  flat: "dash-heavy-legs",
};

interface Props {
  form: number;
  outlook: Outlook;
  freeDays: number;
  /** The next game's day, e.g. "Saturday" or "today"; null when no game day is set. */
  nextGame: string | null;
  /** Wraps the card body only, so the shared image is the card itself. */
  cardRef: RefObject<ComponentRef<typeof View> | null>;
  onShare: () => void;
  sharing: boolean;
  /** What went wrong with the last share, when it did. */
  note?: string | null;
  /** Opens Settings, where game and training days are set. */
  onSetGameDays: () => void;
}

/** The form card people can share: the tier, the score and the week's alcohol-free days. */
export function GameFormCard({
  form,
  outlook,
  freeDays,
  nextGame,
  cardRef,
  onShare,
  sharing,
  note,
  onSetGameDays,
}: Props) {
  const theme = useTheme();
  const line = { color: theme.colors.textMuted, fontSize: theme.font.size.body };

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        ref={cardRef}
        collapsable={false}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {TITLES[outlook.tier]}
          </Text>
          <View style={{ gap: 2 }}>
            <Text style={[line, { fontVariant: ["tabular-nums"] }]}>
              <Text style={{ color: theme.colors.text, fontWeight: theme.font.weight.bold }}>
                {form}
              </Text>
              {" of 100 form rating"}
            </Text>
            <Text style={[line, { fontVariant: ["tabular-nums"] }]}>
              <Text style={{ color: theme.colors.text, fontWeight: theme.font.weight.bold }}>
                {freeDays}
              </Text>
              {` alcohol-free ${freeDays === 1 ? "day" : "days"} this week`}
            </Text>
            {nextGame ? <Text style={line}>{`Next game: ${nextGame}`}</Text> : null}
          </View>
        </View>
        <Mascot pose={POSES[outlook.tier]} size={112} />
      </View>
      {nextGame ? null : (
        <Pressable
          onPress={onSetGameDays}
          accessibilityRole="button"
          accessibilityLabel="Set your game and training days in Settings"
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {"No game days set. "}
            <Text
              style={{
                color: theme.colors.primary,
                fontWeight: theme.font.weight.bold,
                textDecorationLine: "underline",
              }}
            >
              Set them in Settings
            </Text>
            {" to see your next game here and on the chart."}
          </Text>
        </Pressable>
      )}

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />
      <PressScale
        onPress={onShare}
        haptic="light"
        scaleTo={0.98}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityLabel="Share game form card"
        accessibilityState={{ busy: sharing }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          minHeight: 52,
        }}
      >
        <Ionicons name="share-outline" size={20} color={theme.colors.accent} />
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {sharing ? "Opening share sheet…" : "Share game form card"}
        </Text>
      </PressScale>
      {note ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            textAlign: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}
