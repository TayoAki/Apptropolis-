import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { formatReference, type VerseRef } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";
import { useReadingType } from "./reading";

/**
 * A verse as a card: its reference, the text, and optional actions below (children).
 * With onPress the whole card is a button; without it, a plain card.
 */
export function VerseCard({
  reference,
  text,
  onPress,
  children,
  style,
  label,
}: {
  reference: VerseRef;
  text: string;
  onPress?: () => void;
  /** Actions or details shown under the text, e.g. a row of icon buttons. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Spoken label; defaults to the reference and text. */
  label?: string;
}) {
  const theme = useTheme();
  const type = useReadingType();
  const spokenLabel = label ?? `${formatReference(reference)}. ${text}`;
  const cardStyle: ViewStyle = {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  };
  const body = (
    <>
      <Text
        style={{
          color: theme.colors.primary,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.bold,
          letterSpacing: 0.5,
        }}
      >
        {formatReference(reference).toUpperCase()}
      </Text>
      <Text style={{ ...type.verse(theme.font.size.title), color: theme.colors.text }}>{text}</Text>
      {children}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spokenLabel} style={[cardStyle, style]}>
        {body}
      </View>
    );
  }

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      accessibilityHint="Reads from this verse"
      style={[cardStyle, style]}
    >
      {body}
    </PressScale>
  );
}
