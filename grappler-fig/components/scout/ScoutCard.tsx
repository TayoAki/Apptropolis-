// Scouting cards for the Scout tab: an opponent's photo under a reticle, their stance, the weakness
// the AI read and how sure it is, plus saved game plans you can run as a callout round.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import type { OpponentScout, Stance } from "../../data/schema";
import { formatDay } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { PrimaryButton } from "../button";
import { Card } from "../card";
import { GrowBar, haptic, useReducedMotion } from "../motion";

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
  if (stance === "orthodox") return "ORTHODOX";
  if (stance === "southpaw") return "SOUTHPAW";
  return "STANCE UNCLEAR";
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

/** Viewfinder corner brackets. A negative inset draws them just outside the box. */
export function Corners({
  color,
  size = 12,
  inset = 0,
}: {
  color: string;
  size?: number;
  inset?: number;
}) {
  const edge = { position: "absolute" as const, width: size, height: size, borderColor: color };
  return (
    <>
      <View
        pointerEvents="none"
        style={[edge, { top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2 }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2 }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2 }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2 }]}
      />
    </>
  );
}

/** One opponent: photo under a reticle, stance, weakness and how sure the read is. Lifts on press. */
export function ScoutCard({ item, onPress }: { item: ScoutRecord; onPress: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const lift = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  const weakness = weaknessOf(item);
  const label = stanceLabel(item.stance);
  const stanceWord = item.stance === "unclear" ? "balanced" : item.stance;
  const confidence = item.confidence;
  const southpaw = item.stance === "southpaw";

  function spring(up: number, scale: number) {
    if (reduced) return;
    Animated.parallel([
      Animated.spring(lift, { toValue: up, useNativeDriver: true, speed: 36, bounciness: 10 }),
      Animated.spring(press, { toValue: scale, useNativeDriver: true, speed: 36, bounciness: 6 }),
    ]).start();
  }

  return (
    <Pressable
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      onPressIn={() => spring(-6, 0.97)}
      onPressOut={() => spring(0, 1)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${label.toLowerCase()}. Weakness: ${weakness}`}
    >
      <Animated.View
        style={{
          transform: [{ translateY: lift }, { scale: press }],
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.background,
          shadowOpacity: 0.6,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        }}
      >
        <Corners color={theme.colors.textMuted} size={10} inset={6} />
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <View
            style={{
              width: 96,
              height: 112,
              borderRadius: theme.radius.md,
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            {item.photoUri ? (
              <Image
                source={{ uri: item.photoUri }}
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AiImage
                prompt={`black and white photo of a boxer in a ${stanceWord} fighting stance, gritty studio texture, whole body in frame`}
                style={{ width: 96, height: 112, borderRadius: theme.radius.md }}
              />
            )}
            <Reticle width={96} height={112} color={theme.colors.primary} />
          </View>

          <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: "center" }}>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {item.name}
            </Text>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: southpaw ? theme.colors.primary : theme.colors.textMuted,
              }}
            >
              <Text
                style={{
                  color: southpaw ? theme.colors.primary : theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.medium,
                  letterSpacing: 1,
                }}
              >
                {label}
              </Text>
            </View>
            <View
              style={{
                padding: theme.spacing.sm,
                gap: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: theme.font.size.body,
                  lineHeight: 22,
                }}
              >
                <Text style={{ color: theme.colors.textMuted }}>Weakness: </Text>
                {weakness}
                {confidence !== undefined ? (
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    {`  (${Math.round(confidence)}% confidence)`}
                  </Text>
                ) : null}
              </Text>
              {confidence !== undefined ? (
                <GrowBar progress={confidence / 100} height={4} />
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** A saved game plan with its callouts. Locked plans offer Go Pro instead. */
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
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {item.name}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          {formatDay(item.createdAt)}
        </Text>
      </View>

      {readable ? (
        <>
          <Text
            numberOfLines={3}
            style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}
          >
            {planText(item.gamePlan)}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
            {callouts.map((call, index) => (
              <View
                key={`${index}-${call}`}
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 4,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  {call}
                </Text>
              </View>
            ))}
          </View>
          <PrimaryButton
            label="Run this round"
            icon="play-circle-outline"
            onPress={onRun}
            accessibilityLabel={`Run the game plan for ${item.name} as a round`}
          />
        </>
      ) : (
        <Pressable
          onPress={onUnlock}
          accessibilityRole="button"
          accessibilityLabel="Unlock game plans with Go Pro"
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="lock-closed" size={18} color={theme.colors.primary} />
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
            Game plans and callout rounds are part of Go Pro.
          </Text>
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            Unlock
          </Text>
        </Pressable>
      )}
    </Card>
  );
}
