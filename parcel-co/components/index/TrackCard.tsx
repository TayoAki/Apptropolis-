import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  ORDER_TIMELINE,
  formatTime,
  orderProgress,
  relativeDay,
  statusLabel,
  type Order,
  type OrderStatus,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Lottie } from "../lottie";
import { haptic, useReducedMotion } from "../motion";
import { Pip } from "../Pip";
import { PrimaryButton, SecondaryButton, Surface } from "../ui";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Height of one timeline node; the connector line runs through its middle. */
const NODE = 44;

const SHORT_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  returned: "Returned",
};

type NodeState = "done" | "finished" | "current" | "next";

/** Pip's pose for the moment: waiting, on the road, or celebrating at the door. */
function poseFor(status: OrderStatus): string {
  if (status === "delivered") return "pip-celebrating";
  if (status === "shipped" || status === "out_for_delivery") return "pip-delivering";
  return "pip-neutral";
}

function detailFor(order: Order): string {
  const speed = order.deliverySpeed === "express" ? "Express" : "Standard";
  switch (order.status) {
    case "placed":
      return `${speed} delivery · Pip confirms once it's packed`;
    case "packed":
      return `${speed} delivery · Packed and waiting for pickup`;
    case "shipped":
      return `${speed} delivery · On its way to your door`;
    case "out_for_delivery":
      return `${speed} delivery · Your courier is on the route`;
    case "delivered":
      return "Delivered · Tell Pip if anything is wrong";
    case "returned":
      return "Return received · Refund in 5 to 7 business days";
  }
}

/** One milestone pin. It pops when it becomes done or current. */
function StepNode({ state }: { state: NodeState }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced || state === "next") return;
    pop.setValue(0.55);
    Animated.spring(pop, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 14,
    }).start();
  }, [state, reduced, pop]);

  // Done steps are filled with a check, the current one is a ringed dot, later ones are hollow.
  const size = state === "current" ? 14 : state === "next" ? 26 : 30;
  const fill =
    state === "next"
      ? theme.colors.surface
      : state === "finished"
        ? theme.colors.success
        : theme.colors.primary;

  return (
    <Animated.View
      style={{
        width: NODE,
        height: NODE,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pop }],
      }}
    >
      {state === "current" ? (
        <View
          style={{
            position: "absolute",
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
          }}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: fill,
          borderWidth: state === "next" ? 1.5 : 0,
          borderColor: theme.colors.textMuted,
        }}
      >
        {state === "done" || state === "finished" ? (
          <Ionicons name="checkmark" size={18} color={theme.colors.onPrimary} />
        ) : null}
      </View>
    </Animated.View>
  );
}

/** The milestone track: a dotted line, a solid progress stroke, and a pin per step. */
function Timeline({ status }: { status: OrderStatus }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const count = ORDER_TIMELINE.length;
  const active = Math.max(0, orderProgress(status));
  const finished = status === "delivered" || status === "returned";
  const [width, setWidth] = useState(0);

  const fraction = count > 1 ? active / (count - 1) : 0;
  const progress = useRef(new Animated.Value(reduced ? fraction : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(fraction);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: fraction,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fraction, reduced, progress]);

  // Length between the first and the last pin's centres.
  const span = (width * (count - 1)) / count;
  const startX = width / (2 * count);
  const line = `M ${startX} ${NODE / 2} L ${startX + span} ${NODE / 2}`;
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [span, 0] });

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg
          width={width}
          height={NODE}
          viewBox={`0 0 ${width} ${NODE}`}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Path
            d={line}
            stroke={theme.colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={[1, 7]}
            fill="none"
          />
          <AnimatedPath
            d={line}
            stroke={theme.colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={[span, span]}
            strokeDashoffset={dashOffset}
            fill="none"
          />
        </Svg>
      ) : null}
      <View style={{ flexDirection: "row" }}>
        {ORDER_TIMELINE.map((step, index) => {
          const state: NodeState =
            index < active
              ? "done"
              : index === active
                ? finished
                  ? "finished"
                  : "current"
                : "next";
          const isActive = index === active;
          return (
            <View key={step} style={{ flex: 1, alignItems: "center", gap: theme.spacing.sm }}>
              <StepNode state={state} />
              <Text
                numberOfLines={2}
                style={{
                  minHeight: 32,
                  lineHeight: 16,
                  textAlign: "center",
                  color: index <= active ? theme.colors.text : theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontWeight: isActive ? theme.font.weight.bold : theme.font.weight.regular,
                }}
              >
                {SHORT_LABEL[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The latest order: Pip, its status and a live timeline, with Track live and Ask Pip. When the
 * status moves on, Pip squashes, leaps up and lands on the new milestone with a soft tap.
 */
export function TrackCard({
  order,
  onTrack,
  onAsk,
}: {
  order: Order;
  onTrack: () => void;
  onAsk: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const active = orderProgress(order.status);
  const finished = order.status === "delivered" || order.status === "returned";
  const estimate = order.estimatedDelivery;
  const headline = `${statusLabel(order.status)} · ${
    finished ? relativeDay(estimate) : `${relativeDay(estimate)} by ${formatTime(estimate)}`
  }`;
  const tone = order.status === "returned" ? theme.colors.warning : theme.colors.success;

  const hop = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const lastActive = useRef(active);

  useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    if (reduced) return;
    Animated.sequence([
      Animated.timing(squash, {
        toValue: 0.9,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(squash, {
          toValue: 1,
          speed: 12,
          bounciness: 14,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(hop, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(hop, {
            toValue: 0,
            speed: 16,
            bounciness: 10,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => haptic("medium"));
  }, [active, reduced, squash, hop]);

  const lift = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <Surface style={{ padding: theme.spacing.lg, gap: theme.spacing.md, borderRadius: theme.radius.lg }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
              fontVariant: ["tabular-nums"],
            }}
          >
            Order #{order.orderNumber}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            {order.status === "delivered" ? (
              <Lottie name="success" size={28} />
            ) : (
              <View
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone }}
              />
            )}
            <Text
              style={{
                flexShrink: 1,
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                lineHeight: 22,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {headline}
            </Text>
          </View>
          <Text
            style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}
          >
            {detailFor(order)}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ translateY: lift }, { scaleY: squash }] }}>
          <Pip pose={poseFor(order.status)} size={112} />
        </Animated.View>
      </View>

      <Timeline status={order.status} />

      <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Track live" onPress={onTrack} />
        </View>
        <View style={{ flex: 1 }}>
          <SecondaryButton
            label="Ask Pip"
            icon="chatbubble-ellipses-outline"
            accessibilityLabel="Ask Pip about this order"
            onPress={onAsk}
          />
        </View>
      </View>
    </Surface>
  );
}
