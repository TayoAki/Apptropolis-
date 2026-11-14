// The round clock for the Train screen. Every digit sits in its own fixed-width cell and the
// colon is drawn as two dots, so nothing overlaps or shifts whatever font the phone has. The
// digits don't animate: mid-round the clock has to be exact at a glance.
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { clockFace } from "../ui";

/** A digit's cell and the colon's cell, as a share of the font size. */
const DIGIT_CELL = 0.62;
const COLON_CELL = 0.3;

/** The widest the clock is drawn at this size: four digits and the colon. */
export function clockWidth(size: number): number {
  return size * (DIGIT_CELL * 4 + COLON_CELL);
}

/** The largest clock size that fits a given width. */
export function clockSizeFor(width: number, max = 128): number {
  return Math.max(56, Math.min(max, Math.floor(width / (DIGIT_CELL * 4 + COLON_CELL))));
}

/** "2 minutes 41 seconds" */
function spoken(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    minutes ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "",
    `${seconds} ${seconds === 1 ? "second" : "seconds"}`,
  ];
  return parts.filter(Boolean).join(" ");
}

/** A countdown such as "02:41". `dim` is for the rest between rounds. */
export function RoundClock({
  seconds,
  size = 104,
  dim = false,
}: {
  seconds: number;
  size?: number;
  dim?: boolean;
}) {
  const theme = useTheme();
  const total = Math.max(0, Math.round(seconds));
  const digits = `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}`;
  const color = dim ? theme.colors.textMuted : theme.colors.text;
  const height = Math.round(size * 1.08);
  const dot = Math.round(size * 0.13);

  const digit = (char: string, key: number) => (
    <View
      key={key}
      style={{ width: size * DIGIT_CELL, height, alignItems: "center", justifyContent: "center" }}
    >
      <Text
        allowFontScaling={false}
        style={[
          clockFace,
          {
            color,
            fontSize: size,
            lineHeight: height,
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
            textAlign: "center",
          },
        ]}
      >
        {char}
      </Text>
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${spoken(total)} left`}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height }}
    >
      {digit(digits[0]!, 0)}
      {digit(digits[1]!, 1)}
      <View
        style={{
          width: size * COLON_CELL,
          height,
          alignItems: "center",
          justifyContent: "center",
          gap: Math.round(size * 0.16),
        }}
      >
        <View style={{ width: dot, height: dot, borderRadius: dot / 4, backgroundColor: color }} />
        <View style={{ width: dot, height: dot, borderRadius: dot / 4, backgroundColor: color }} />
      </View>
      {digit(digits[2]!, 2)}
      {digit(digits[3]!, 3)}
    </View>
  );
}
