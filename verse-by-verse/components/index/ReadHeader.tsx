import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { formatReference, type Verse } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { haptic, PressScale } from "../motion";

/**
 * The top row of the Read screen: the verse pill (e.g. "John 1:1" with a caret), which opens a
 * row of verses to jump to, and the "Read Chapter N" action on the right.
 */
export function ReadHeader({
  current,
  verses,
  onPick,
  onReadChapter,
}: {
  current: Verse;
  verses: Verse[];
  onPick: (verse: Verse) => void;
  onReadChapter: () => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = formatReference(current);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <PressScale
          onPress={() => {
            haptic("selection");
            setOpen((value) => !value);
          }}
          scaleTo={0.95}
          hitSlop={8}
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
            backgroundColor: theme.colors.background,
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
            {label}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.colors.text}
          />
        </PressScale>

        <PressScale
          onPress={onReadChapter}
          scaleTo={0.95}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Read ${current.book} chapter ${current.chapter} from the start`}
          style={{ alignItems: "center", minHeight: 44, gap: 2 }}
        >
          <AiImage
            prompt="a small brown line drawing of an open book with the number 1 on its left page, plain cream background, no other text"
            fit="contain"
            style={{ width: 28, height: 28 }}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.caption,
            }}
          >
            {`Read Chapter ${current.chapter}`}
          </Text>
        </PressScale>
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
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.colors.onPrimary : theme.colors.text,
                    fontFamily: theme.font.family,
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
