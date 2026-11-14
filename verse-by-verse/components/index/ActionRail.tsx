import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The vertical rail on the verse card's right edge: bookmark, share, full context, and the
 * study note. Each control is labelled for screen readers.
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
        position: "absolute",
        top: "26%",
        right: theme.spacing.sm,
        width: 76,
        alignItems: "center",
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        shadowColor: theme.colors.text,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <RailButton
        icon={saved ? "bookmark" : "bookmark-outline"}
        color={saved ? theme.colors.accent : theme.colors.textMuted}
        label={saved ? "Remove bookmark" : "Save bookmark"}
        selected={saved}
        onPress={onSave}
      />
      <RailButton
        icon="share-outline"
        color={theme.colors.textMuted}
        label="Share verse"
        hint="Shares this verse as a card"
        onPress={onShare}
      />
      <RailButton
        icon="search-outline"
        color={wholeChapter ? theme.colors.primary : theme.colors.textMuted}
        label={wholeChapter ? "Show verses from here" : "Show the whole chapter"}
        caption="Full Context"
        selected={wholeChapter}
        onPress={onContext}
      />
      <View
        style={{
          height: 1,
          alignSelf: "stretch",
          marginVertical: theme.spacing.xs,
          backgroundColor: theme.colors.border,
        }}
      />
      <RailButton
        icon="document-text-outline"
        color={hasNote ? theme.colors.primary : theme.colors.textMuted}
        label={
          !hasNote
            ? "No study note for this verse"
            : noteOpen
              ? "Hide study note"
              : "Show study note"
        }
        caption={hasNote ? "Study Note Available" : "No study note"}
        italic
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
  italic = false,
  label,
  hint,
  selected = false,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  color: string;
  caption?: string;
  italic?: boolean;
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
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected }}
      style={{
        width: "100%",
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        paddingVertical: theme.spacing.xs,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
      {caption ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.caption,
            fontStyle: italic ? "italic" : "normal",
            textAlign: "center",
            lineHeight: theme.font.size.caption * 1.15,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </PressScale>
  );
}
