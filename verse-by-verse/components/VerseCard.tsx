import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { formatReference, type VerseRef } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

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
  const spokenLabel = label ?? `${formatReference(reference)}. ${text}`;
  const cardStyle: ViewStyle = {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
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
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          lineHeight: theme.font.size.title * 1.5,
          fontFamily: theme.font.family,
        }}
      >
        {text}
      </Text>
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
      style={[cardStyle, style]}
    >
      {body}
    </PressScale>
  );
}
