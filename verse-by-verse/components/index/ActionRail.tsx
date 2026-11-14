import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Width of the rail, wide enough for a two-word caption on two lines. */
export const RAIL_WIDTH = 72;

/**
 * The vertical rail on the verse card's right edge: bookmark, share, full context, and the
 * study note. It sits beside the verse (never over it), each control is at least 44pt, and an
 * active control changes its icon to the filled one as well as its color.
 */
export function ActionRail({
  saved,
  hasNote,
  noteOpen,
  wholeChapter,
  onSave,
  onShare,
  onContext,
  onNote,
}: {
  saved: boolean;
  hasNote: boolean;
  noteOpen: boolean;
  wholeChapter: boolean;
  onSave: () => void;
  onShare: () => void;
  onContext: () => void;
  onNote: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: RAIL_WIDTH,
        justifyContent: "center",
        paddingVertical: theme.spacing.sm,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
      }}
    >
      <RailButton
        icon={saved ? "bookmark" : "bookmark-outline"}
        color={saved ? theme.colors.accent : theme.colors.text}
        caption={saved ? "Saved" : "Save"}
        label={saved ? "Remove bookmark" : "Save bookmark"}
        selected={saved}
        onPress={onSave}
      />
      <RailButton
        icon="share-outline"
        color={theme.colors.text}
        caption="Share"
        label="Share verse"
        hint="Shares this verse as a card"
        onPress={onShare}
      />
      <RailButton
        icon={wholeChapter ? "reader" : "reader-outline"}
        color={wholeChapter ? theme.colors.primary : theme.colors.text}
        caption="Full context"
        label={wholeChapter ? "Show verses from here" : "Show the whole chapter"}
        selected={wholeChapter}
        onPress={onContext}
      />
      <RailButton
        icon={noteOpen ? "document-text" : "document-text-outline"}
        color={!hasNote ? theme.colors.textMuted : noteOpen ? theme.colors.primary : theme.colors.text}
        caption={hasNote ? "Study note" : "No note"}
        label={
          !hasNote
            ? "No study note for this verse"
            : noteOpen
              ? "Hide study note"
              : "Show study note"
        }
        selected={noteOpen}
        disabled={!hasNote}
        onPress={onNote}
      />
    </View>
  );
}

function RailButton({
  icon,
  color,
  caption,
  label,
  hint,
  selected = false,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  color: string;
  caption: string;
  label: string;
  hint?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected }}
      style={{
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.xs,
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          lineHeight: theme.font.size.caption + 3,
          fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
          textAlign: "center",
        }}
      >
        {caption}
      </Text>
    </PressScale>
  );
}
