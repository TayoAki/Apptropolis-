import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatReference, type Verse, type VerseRef } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, PressScale } from "../motion";
import { PassagePicker } from "../PassagePicker";

/**
 * The top row of the Read screen: the verse pill (e.g. "John 1:1" with a caret), which opens a
 * picker for any verse, chapter or book; "Chapter", which opens the whole chapter; and Settings. The pill
 * gives way first when the row is tight: a long reference shrinks a little rather than pushing
 * the buttons off the screen.
 */
export function ReadHeader({
  current,
  onPick,
  onReadChapter,
  onSettings,
}: {
  current: Verse;
  onPick: (ref: VerseRef) => void;
  onReadChapter: () => void;
  onSettings: () => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = formatReference(current);
  // Long references ("1 Thessalonians 5:23") step down in size so they fit beside the buttons;
  // adjustsFontSizeToFit does the rest on a phone, but not on the web.
  const labelSize =
    label.length > 18
      ? theme.font.size.caption + 2
      : label.length > 15
        ? theme.font.size.body
        : label.length > 12
          ? theme.font.size.body + 2
          : theme.font.size.title;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <PressScale
            onPress={() => {
              haptic("selection");
              setOpen((value) => !value);
            }}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={`Choose a passage. Now reading ${label}`}
            accessibilityState={{ expanded: open }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              minHeight: 44,
              paddingLeft: theme.spacing.lg,
              paddingRight: theme.spacing.md,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{
                flexShrink: 1,
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: labelSize,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {label}
            </Text>
            <Ionicons
              name={open ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.textMuted}
            />
          </PressScale>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <PressScale
            onPress={onReadChapter}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={`Read all of ${current.book} chapter ${current.chapter}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xs + 2,
              minHeight: 44,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary + "1F",
            }}
          >
            <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Chapter
            </Text>
          </PressScale>

          <Pressable
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={4}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              marginRight: -theme.spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      {open ? (
        <PassagePicker
          current={current}
          onPick={(ref) => {
            haptic("selection");
            setOpen(false);
            onPick(ref);
          }}
        />
      ) : null}
    </View>
  );
}
