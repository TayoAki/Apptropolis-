import { useEffect, useRef } from "react";
import { Animated, Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useReducedMotion } from "../motion";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One matched word: an accent tint warms in behind it, once, when it appears. A tint rather
 * than the solid accent, so the word (in the text color, bold) stays readable on every theme.
 */
function Pill({ children }: { children: string }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const lit = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      lit.setValue(1);
      return;
    }
    const animation = Animated.timing(lit, {
      toValue: 1,
      duration: 650,
      delay: 180,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, lit]);

  return (
    <Animated.Text
      style={{
        backgroundColor: lit.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.accent + "00", theme.colors.accent + "38"],
        }),
        color: theme.colors.text,
        fontWeight: theme.font.weight.bold,
      }}
    >
      {children}
    </Animated.Text>
  );
}

/**
 * Verse text with the search words lit up. With highlight off, or no terms, it is plain text.
 */
export function Highlighted({
  text,
  terms,
  highlight,
  style,
}: {
  text: string;
  terms: string[];
  highlight: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const words = [...new Set(terms.map((t) => t.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!highlight || words.length === 0) return <Text style={style}>{text}</Text>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  // With one capture group, odd positions are the matches.
  const parts = text.split(pattern);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Pill key={`${i}-${part}`}>{part}</Pill> : part,
      )}
    </Text>
  );
}
