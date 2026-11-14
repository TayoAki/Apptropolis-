import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { Text, View } from "react-native";
import type { Outlook } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Mascot, PressScale } from "../motion";
import type { View as RNView } from "react-native";

const TITLES: Record<Outlook["tier"], string> = {
  sharp: "Game Day Sharp",
  steady: "Game Day Steady",
  flat: "Game Day Recovering",
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
  dryDays: number;
  /** The next game's day name, e.g. "Saturday". */
  gameLabel: string;
  /** Wraps the card body only, so the shared image is the card itself. */
  cardRef: RefObject<RNView | null>;
  onShare: () => void;
  sharing: boolean;
}

export function GameFormCard({
  form,
  outlook,
  dryDays,
  gameLabel,
  cardRef,
  onShare,
  sharing,
}: Props) {
  const theme = useTheme();
  const pose = POSES[outlook.tier];

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        overflow: "hidden",
      }}
    >
      <View
        ref={cardRef}
        collapsable={false}
        style={{
          minHeight: 190,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1,
          }}
        >
          GAME FORM
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            fontWeight: theme.font.weight.bold,
            paddingRight: 130,
          }}
        >
          {TITLES[outlook.tier]}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            paddingRight: 130,
            fontVariant: ["tabular-nums"],
          }}
        >
          {`Form Index: ${form} • ${dryDays} ${dryDays === 1 ? "Day" : "Days"} Dry •`}
          {"\n"}
          {`${gameLabel} Ready`}
        </Text>

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: theme.spacing.sm,
            bottom: theme.spacing.sm,
          }}
        >
          <Mascot pose={pose} size={128} />
        </View>
      </View>

      <PressScale
        onPress={onShare}
        haptic="light"
        scaleTo={0.98}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityLabel="Share Game Form card"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          minHeight: 56,
          backgroundColor: theme.colors.accent,
        }}
      >
        <Ionicons name="logo-instagram" size={22} color={theme.colors.background} />
        <Text
          style={{
            color: theme.colors.background,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Share Game Form Card
        </Text>
      </PressScale>
    </View>
  );
}
