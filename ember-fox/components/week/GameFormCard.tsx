import { Ionicons } from "@expo/vector-icons";
import type { ComponentRef, RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Outlook } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Dash } from "../Dash";
import { PressScale } from "../motion";

interface Props {
  form: number;
  /** The card's title, from formMessage: the tier on a clear day, the plain state otherwise. */
  title: string;
  /** A line under the figures (what alcohol does, or what brings the rating back); may be null. */
  caution: string | null;
  /** The tier whose mascot pose to show. */
  pose: Outlook["tier"];
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

/**
 * The form card people can share: its title, the score and the week's alcohol-free days. The
 * title never claims readiness when drinks are logged or the week is over its limit, and
 * "Next game" stays a plain fact beside it.
 */
export function GameFormCard({
  form,
  title,
  caution,
  pose,
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
            {title}
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
          {caution ? (
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.caption,
                lineHeight: 18,
              }}
            >
              {caution}
            </Text>
          ) : null}
        </View>
        <Dash pose={pose} size={112} />
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
