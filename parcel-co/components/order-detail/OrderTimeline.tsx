import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import {
  dayDiff,
  formatDate,
  formatTime,
  ORDER_TIMELINE,
  orderProgress,
  type Order,
  type OrderStatus,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { useReducedMotion } from "../motion";

const NODE = 32;
const LINE = 3;

/** "today", "tomorrow", or the date, for an ISO date. */
export function dueText(iso: string): string {
  const diff = dayDiff(iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return formatDate(iso);
}

type NodeState = "done" | "current" | "todo";

interface Step {
  key: OrderStatus;
  label: string;
  detail: string;
  state: NodeState;
}

const LABELS: Record<OrderStatus, string> = {
  placed: "Order placed",
  packed: "Packed",
  shipped: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  returned: "Returned",
};

function detailFor(order: Order, key: OrderStatus, state: NodeState): string {
  const eta = order.estimatedDelivery;
  if (key === "placed") return `${formatDate(order.placedAt)} · ${formatTime(order.placedAt)}`;
  if (key === "packed")
    return state === "done" ? "Packed and labelled" : state === "current" ? "Packing now" : "Next up";
  if (key === "shipped")
    return state === "done"
      ? "Left the warehouse"
      : state === "current"
        ? "On its way to you"
        : "Waiting";
  if (key === "out_for_delivery")
    return state === "done"
      ? "With your courier"
      : state === "current"
        ? `Expected by ${formatTime(eta)}`
        : "Waiting";
  if (state === "done") return order.status === "returned" ? "Return started" : formatDate(eta);
  return `Expected ${dueText(eta)}`;
}

/** The delivery steps for an order, each marked done, current or to come. */
export function timelineSteps(order: Order): Step[] {
  const current = orderProgress(order.status);
  const finished = order.status === "delivered" || order.status === "returned";
  return ORDER_TIMELINE.map((key, index) => {
    const state: NodeState =
      index < current || (index === current && finished)
        ? "done"
        : index === current
          ? "current"
          : "todo";
    // A returned order ends on "Returned", not "Delivered".
    const label =
      key === "delivered" && order.status === "returned" ? LABELS.returned : LABELS[key];
    return { key, label, state, detail: detailFor(order, key, state) };
  });
}

/** A vertical timeline whose nodes light up one after another from the top. */
export function OrderTimeline({ order }: { order: Order }) {
  const reduced = useReducedMotion();
  const steps = timelineSteps(order);
  const fills = useRef(steps.map(() => new Animated.Value(0))).current;
  const litIndexes = steps.flatMap((step, index) => (step.state === "todo" ? [] : [index]));
  const litCount = litIndexes.length;

  useEffect(() => {
    if (reduced) {
      litIndexes.forEach((index) => fills[index]?.setValue(1));
      return;
    }
    const run = Animated.stagger(
      200,
      litIndexes.map((index) =>
        Animated.timing(fills[index]!, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    );
    run.start();
    return () => run.stop();
    // Re-run when more steps are reached (or Reduce Motion changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litCount, reduced]);

  return (
    <View accessibilityLabel="Delivery progress">
      {steps.map((step, index) => (
        <TimelineRow
          key={step.key}
          step={step}
          fill={fills[index]!}
          next={fills[index + 1] ?? null}
          last={index === steps.length - 1}
        />
      ))}
    </View>
  );
}

function TimelineRow({
  step,
  fill,
  next,
  last,
}: {
  step: Step;
  fill: Animated.Value;
  next: Animated.Value | null;
  last: boolean;
}) {
  const theme = useTheme();
  const isCurrent = step.state === "current";
  const lit = step.state !== "todo";
  // Every reached step is in the brand color; the current one is told apart by its dot, its
  // halo and its bold label, never by a status color.
  const color = theme.colors.primary;
  const scale = fill.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 1.12, 1] });

  return (
    <View
      accessible
      accessibilityLabel={`${step.label}, ${step.detail}`}
      style={{
        flexDirection: "row",
        gap: theme.spacing.md,
        paddingBottom: last ? 0 : theme.spacing.lg,
      }}
    >
      <View style={{ width: NODE, alignItems: "center" }}>
        {!last && next ? (
          <View
            style={{
              position: "absolute",
              top: NODE,
              bottom: 0,
              left: (NODE - LINE) / 2,
              width: LINE,
              borderRadius: LINE / 2,
              backgroundColor: theme.colors.border,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                width: "100%",
                height: next.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                backgroundColor: theme.colors.primary,
              }}
            />
          </View>
        ) : null}
        <View
          style={{
            width: NODE,
            height: NODE,
            borderRadius: NODE / 2,
            borderWidth: lit ? 2 : 1.5,
            borderColor: lit ? color : theme.colors.textMuted,
            backgroundColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {lit ? (
            <Animated.View
              style={{
                position: "absolute",
                left: -2,
                top: -2,
                right: -2,
                bottom: -2,
                borderRadius: NODE / 2,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
                opacity: fill,
                transform: [{ scale }],
              }}
            >
              {isCurrent ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.colors.onPrimary,
                  }}
                />
              ) : (
                <Ionicons name="checkmark" size={18} color={theme.colors.onPrimary} />
              )}
            </Animated.View>
          ) : null}
          {isCurrent ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: -7,
                top: -7,
                right: -7,
                bottom: -7,
                borderRadius: NODE / 2 + 7,
                borderWidth: 6,
                borderColor: color,
                opacity: 0.25,
              }}
            />
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1, paddingTop: 2, gap: 2 }}>
        <Text
          style={{
            color: lit ? theme.colors.text : theme.colors.textMuted,
            fontSize: theme.font.size.body,
            lineHeight: 21,
            fontWeight: isCurrent ? theme.font.weight.bold : theme.font.weight.medium,
          }}
        >
          {step.label}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            fontVariant: ["tabular-nums"],
          }}
        >
          {step.detail}
        </Text>
      </View>
    </View>
  );
}
