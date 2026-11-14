import { Ionicons } from "@expo/vector-icons";
import { type ComponentRef, type Ref } from "react";
import { Text, View } from "react-native";
import type { StudyNote, Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Flourish } from "../Flourish";
import { Appear } from "../motion";
import { useReadingType } from "../reading";
import { ActionRail } from "./ActionRail";

/**
 * The verse as a large card: serif text, an ornamental divider and the attribution, with the
 * action rail in its own column on the right. The verse column (not the rail) is what gets
 * shared as an image. An open study note appears below, labelled as commentary.
 */
export function VerseHero({
  verse,
  shareRef,
  saved,
  note,
  noteOpen,
  wholeChapter,
  onSave,
  onShare,
  onContext,
  onNote,
}: {
  verse: Verse;
  shareRef: Ref<ComponentRef<typeof View>>;
  saved: boolean;
  note: StudyNote | undefined;
  noteOpen: boolean;
  wholeChapter: boolean;
  onSave: () => void;
  onShare: () => void;
  onContext: () => void;
  onNote: () => void;
}) {
  const theme = useTheme();
  const type = useReadingType();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View
          ref={shareRef}
          collapsable={false}
          style={{
            flex: 1,
            minWidth: 0,
            justifyContent: "center",
            paddingVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.lg,
            borderRadius: theme.radius.md - 1,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            accessibilityLabel={`${verse.book} ${verse.chapter}:${verse.verse}. ${verse.text}`}
            style={{
              ...type.display(theme.font.size.headline),
              color: theme.colors.text,
              textAlign: "center",
            }}
          >
            {verse.text}
          </Text>
          <Flourish width={160} />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.font.family,
              fontStyle: "italic",
              fontSize: theme.font.size.body,
              textAlign: "center",
            }}
          >
            World English Bible
          </Text>
        </View>
        <ActionRail
          saved={saved}
          hasNote={note !== undefined}
          noteOpen={noteOpen}
          wholeChapter={wholeChapter}
          onSave={onSave}
          onShare={onShare}
          onContext={onContext}
          onNote={onNote}
        />
      </View>
      {noteOpen && note ? <NoteBlock note={note} /> : null}
    </View>
  );
}

function NoteBlock({ note }: { note: StudyNote }) {
  const theme = useTheme();
  return (
    <Appear>
      <View
        accessible
        accessibilityLabel={`Commentary: ${note.title}. ${note.body}`}
        style={{
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {note.title}
        </Text>
        {/* The label follows the title, as a tag on the note rather than a kicker above it. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Commentary, not Scripture
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.body,
            lineHeight: theme.font.size.body * 1.5,
          }}
        >
          {note.body}
        </Text>
      </View>
    </Appear>
  );
}
