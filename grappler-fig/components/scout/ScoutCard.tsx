// Scouting cards for the Scout tab: an opponent's frame (or their initial when there is no
// photo), their stance, the opening the read found and how sure it is, plus saved game plans
// with their callouts.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import type { OpponentScout, Stance } from "../../data/schema";
import { formatDay } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "../AiImage";
import { PrimaryButton } from "../button";
import { Card } from "../card";
import { GrowBar } from "../motion";
import { FrameMarks, Monogram, TextButton } from "../ui";

/** A scouting report, with the read's confidence, weakness and free-sample flag stored alongside. */
export type ScoutRecord = OpponentScout & {
  confidence?: number;
  weakness?: string;
  sample?: boolean;
};

/** The first sentence of a text. */
export function firstSentence(text: string): string {
  const cut = text.indexOf(". ");
  return cut > 0 ? text.slice(0, cut + 1) : text;
}

/** The weakness the AI read, or the start of its notes for older reports. */
export function weaknessOf(item: ScoutRecord): string {
  return item.weakness?.trim() || firstSentence(item.tendencies);
}

export function stanceLabel(stance: Stance): string {
  if (stance === "orthodox") return "Orthodox";
  if (stance === "southpaw") return "Southpaw";
  return "Stance unclear";
}

/** The game plan without its callout list. */
export function planText(gamePlan: string): string {
  const cut = gamePlan.toLowerCase().indexOf("callouts:");
  return (cut > 0 ? gamePlan.slice(0, cut) : gamePlan).trim();
}

/** The punch callouts at the end of a game plan ("Callouts: jab, cross, ..."), up to seven. */
export function parseCallouts(gamePlan: string): string[] {
  const at = gamePlan.toLowerCase().indexOf("callouts:");
  if (at < 0) return [];
  return gamePlan
    .slice(at + "callouts:".length)
    .split(",")
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 7);
}

/** Crosshair over a photo: the line through the middle and a ring on the chest. */
export function Reticle({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const ring = Math.min(width, height) * 0.16;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={cy} x2={width} y2={cy} stroke={color} strokeWidth={1.2} opacity={0.85} />
        <Line x1={cx} y1={0} x2={cx} y2={height} stroke={color} strokeWidth={1.2} opacity={0.85} />
        <Circle cx={cx} cy={cy} r={ring} stroke={color} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}

/**
 * The picture for a report: the frame that was read, under viewfinder marks. With no photo it is
 * the opponent's initial (or a drawn stance picture when the app has an image service).
 */
export function ScoutAvatar({
  item,
  width,
  height,
}: {
  item: Pick<OpponentScout, "name" | "photoUri" | "stance">;
  width: number;
  height: number;
}) {
  const theme = useTheme();
  const box = {
    width,
    height,
    borderRadius: theme.radius.sm,
    overflow: "hidden" as const,
    backgroundColor: theme.colors.surfaceAlt,
  };
  if (item.photoUri) {
    return (
      <View style={box}>
        <Image
          source={{ uri: item.photoUri }}
          accessibilityLabel={`Frame of ${item.name}`}
          contentFit="cover"
          style={{ width, height }}
        />
        <Reticle width={width} height={height} color={theme.colors.primary} />
        <FrameMarks size={10} inset={6} />
      </View>
    );
  }
  const stanceWord = item.stance === "unclear" ? "balanced" : item.stance;
  const prompt = `black and white photo of a boxer in a ${stanceWord} fighting stance, gritty studio texture, whole body in frame`;
  if (aiImageUrl(prompt)) {
    return (
      <View style={box}>
        <AiImage prompt={prompt} style={{ width, height }} />
      </View>
    );
  }
  return <Monogram name={item.name} size={Math.min(width, height)} />;
}

/** One opponent: picture, stance, the opening to attack and how sure the read is. */
export function ScoutCard({ item, onPress }: { item: ScoutRecord; onPress: () => void }) {
  const theme = useTheme();
  const weakness = weaknessOf(item);
  const stance = stanceLabel(item.stance);
  const confidence = item.confidence;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${item.name}, ${stance.toLowerCase()}. Opening: ${weakness}${
        confidence !== undefined ? ` ${Math.round(confidence)} percent confidence.` : ""
      } Open report`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <ScoutAvatar item={item} width={56} height={item.photoUri ? 72 : 56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body + 2,
              fontWeight: theme.font.weight.bold,
              lineHeight: 24,
            }}
          >
            {item.name}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              lineHeight: 20,
            }}
          >
            {`${stance} · ${formatDay(item.createdAt)}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
      <Text
        numberOfLines={3}
        style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}
      >
        <Text style={{ color: theme.colors.textMuted }}>Opening: </Text>
        {weakness}
      </Text>
      {confidence !== undefined ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <GrowBar progress={confidence / 100} height={6} style={{ flex: 1 }} />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              fontVariant: ["tabular-nums"],
            }}
          >
            {`${Math.round(confidence)}% confidence`}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

/** A saved game plan with its callouts. Locked plans offer Pro instead. */
export function PlanRow({
  item,
  readable,
  onRun,
  onUnlock,
}: {
  item: ScoutRecord;
  readable: boolean;
  onRun: () => void;
  onUnlock: () => void;
}) {
  const theme = useTheme();
  const callouts = parseCallouts(item.gamePlan);

  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.body + 2,
            fontWeight: theme.font.weight.bold,
            lineHeight: 24,
          }}
        >
          {item.name}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
          {formatDay(item.createdAt)}
        </Text>
      </View>

      {readable ? (
        <>
          <Text
            numberOfLines={4}
            style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}
          >
            {planText(item.gamePlan)}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              lineHeight: 20,
            }}
          >
            {callouts.map((call) => call.charAt(0).toUpperCase() + call.slice(1)).join(" · ")}
          </Text>
          <PrimaryButton
            label="Run this round"
            icon="play"
            onPress={onRun}
            accessibilityLabel={`Run the game plan for ${item.name} as a round`}
          />
        </>
      ) : (
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
            Game plans and callout rounds are part of Pro.
          </Text>
          <TextButton
            label="Unlock game plans"
            icon="lock-closed"
            onPress={onUnlock}
            accessibilityLabel="Unlock game plans with Pro"
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      )}
    </Card>
  );
}
