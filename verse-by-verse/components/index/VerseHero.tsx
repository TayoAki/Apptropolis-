import { type ComponentRef } from "react";
import { Text, View } from "react-native";
import type { StudyNote, Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { Appear } from "../motion";
import { ActionRail } from "./ActionRail";

/**
 * The verse as a large card: serif text, an ornamental divider and the attribution, with the
 * action rail along its right edge. The card (not the rail) is what gets shared as an image.
 * An open study note appears below, labelled as commentary.
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
  shareRef: import("react").Ref<ComponentRef<typeof View>>;
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
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ position: "relative" }}>
        <View
          ref={shareRef}
          collapsable={false}
          style={{
            paddingVertical: theme.spacing.xl,
            paddingLeft: theme.spacing.lg,
            paddingRight: 92,
            gap: theme.spacing.lg,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.text,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            accessibilityLabel={`${verse.book} ${verse.chapter}:${verse.verse}. ${verse.text}`}
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.headline,
              lineHeight: theme.font.size.headline * 1.35,
              textAlign: "center",
            }}
          >
            {verse.text}
          </Text>
          <AiImage
            prompt="a thin ornamental flourish divider in brown ink, centered line with small scrolls at the middle, plain transparent background, no text"
            fit="contain"
            style={{ width: 180, height: 24, alignSelf: "center" }}
          />
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
            color: theme.colors.primary,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 0.5,
          }}
        >
          COMMENTARY, NOT SCRIPTURE
        </Text>
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
        <Text
          style={{
            color: theme.colors.textMuted,
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
