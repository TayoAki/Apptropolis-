import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { formatReference, type Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, PressScale } from "../motion";

/**
 * The top row of the Read screen: the verse pill (e.g. "John 1:1" with a caret), which opens a
 * row of verses to jump to; "Chapter N", which opens the whole chapter; and Settings.
 */
export function ReadHeader({
  current,
  verses,
  onPick,
  onReadChapter,
  onSettings,
}: {
  current: Verse;
  verses: Verse[];
  onPick: (verse: Verse) => void;
  onReadChapter: () => void;
  onSettings: () => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = formatReference(current);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View style={{ flexShrink: 1 }}>
          <PressScale
            onPress={() => {
              haptic("selection");
              setOpen((value) => !value);
            }}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={`Choose a verse. Now reading ${label}`}
            accessibilityState={{ expanded: open }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              minHeight: 44,
              paddingHorizontal: theme.spacing.lg,
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
                fontSize: theme.font.size.title,
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

        <View style={{ flex: 1 }} />

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
            {`Chapter ${current.chapter}`}
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

      {open ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
        >
          {verses.map((verse) => {
            const selected = verse.id === current.id;
            return (
              <PressScale
                key={verse.id}
                onPress={() => {
                  haptic("selection");
                  setOpen(false);
                  onPick(verse);
                }}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={`Read ${formatReference(verse)}`}
                accessibilityState={{ selected }}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                }}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
                ) : null}
                <Text
                  style={{
                    color: selected ? theme.colors.onPrimary : theme.colors.text,
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  {formatReference(verse)}
                </Text>
              </PressScale>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
