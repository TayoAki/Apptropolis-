// One analyzed frame of an opponent: a black-and-white fight photo with red targeting marks,
// a dark fade at the foot and an uppercase caption.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { Appear } from "../motion";

const BRACKET = 16;
const INSET = 8;

/** A theme color with an alpha channel appended (8-digit hex, from the theme's own hex). */
function withAlpha(hex: string, alpha: number): string {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function FrameCard({
  label,
  prompt,
  uri,
  width,
  height,
  index,
}: {
  label: string;
  /** A black-and-white picture to draw when there is no saved photo of the frame. */
  prompt?: string;
  /** The saved photo of the opponent, when there is one. */
  uri?: string | null;
  width: number;
  height: number;
  index: number;
}) {
  const { colors, spacing, radius, font } = useTheme();
  const l = INSET;
  const t = INSET;
  const r = width - INSET;
  const b = height - INSET;
  const cx = width / 2;
  const cy = height / 2;
  const stroke = colors.primary;

  return (
    <Appear
      delay={Math.min(index, 8) * 60}
      distance={10}
      style={{
        width,
        height,
        borderRadius: radius.md,
        overflow: "hidden",
        backgroundColor: colors.surfaceAlt,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          accessibilityLabel={label}
          style={{ width, height }}
        />
      ) : (
        <AiImage prompt={prompt ?? label} fit="cover" style={{ width, height, borderRadius: 0 }} />
      )}
      <LinearGradient
        colors={[withAlpha(colors.background, 0), withAlpha(colors.background, 0.92)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.55 }}
      />
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Path
          d={`M ${l} ${t + BRACKET} L ${l} ${t} L ${l + BRACKET} ${t}`}
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path
          d={`M ${r - BRACKET} ${t} L ${r} ${t} L ${r} ${t + BRACKET}`}
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path
          d={`M ${l} ${b - BRACKET} L ${l} ${b} L ${l + BRACKET} ${b}`}
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Path
          d={`M ${r - BRACKET} ${b} L ${r} ${b} L ${r} ${b - BRACKET}`}
          stroke={stroke}
          strokeWidth={2}
          fill="none"
        />
        <Circle cx={cx} cy={cy} r={12} stroke={stroke} strokeWidth={1.5} fill="none" />
        <Line x1={cx - 18} y1={cy} x2={cx - 6} y2={cy} stroke={stroke} strokeWidth={1.5} />
        <Line x1={cx + 6} y1={cy} x2={cx + 18} y2={cy} stroke={stroke} strokeWidth={1.5} />
        <Line x1={cx} y1={cy - 18} x2={cx} y2={cy - 6} stroke={stroke} strokeWidth={1.5} />
        <Line x1={cx} y1={cy + 6} x2={cx} y2={cy + 18} stroke={stroke} strokeWidth={1.5} />
      </Svg>
      <Text
        accessibilityRole="text"
        numberOfLines={1}
        style={{
          position: "absolute",
          left: spacing.sm,
          right: spacing.sm,
          bottom: spacing.sm,
          color: colors.text,
          fontSize: font.size.body,
          fontWeight: font.weight.bold,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          position: "absolute",
          right: spacing.sm,
          top: spacing.sm,
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Ionicons name="videocam-outline" size={14} color={colors.text} />
      </View>
    </Appear>
  );
}
