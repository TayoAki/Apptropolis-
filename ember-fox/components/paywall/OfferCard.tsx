import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, useReducedMotion } from "../motion";

const PERIOD: Record<Offer["period"], string> = {
  week: "/week",
  month: "/month",
  year: "/year",
  lifetime: "",
};

/**
 * The yearly price spread over twelve months, keeping the currency sign ("$2.50" for "$29.99"),
 * or null when the price can't be read.
 */
export function monthlyEquivalent(offer: Offer): string | null {
  if (offer.period !== "year") return null;
  const match = /^(\D*?)(\d[\d.,]*)(\D*)$/.exec(offer.price.trim());
  if (!match) return null;
  const prefix = match[1] ?? "";
  const digits = match[2] ?? "";
  const suffix = match[3] ?? "";
  const normal = digits.includes(".") ? digits.replace(/,/g, "") : digits.replace(",", ".");
  const value = Number(normal);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `${prefix}${(value / 12).toFixed(2)}${suffix}`;
}

/** One selectable plan: price per period, the free trial, the badge and a radio mark. */
export function OfferCard({
  offer,
  selected,
  onSelect,
  shimmer = false,
  disabled = false,
}: {
  offer: Offer;
  selected: boolean;
  onSelect: () => void;
  /** Plays one soft amber border shimmer when the card appears (for the best-value plan). */
  shimmer?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer || reduced) return;
    const run = Animated.sequence([
      Animated.delay(350),
      Animated.timing(glow, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [shimmer, reduced, glow]);

  const period = PERIOD[offer.period];
  const equivalent = monthlyEquivalent(offer);
  const trial = offer.trialDays > 0 ? `${offer.trialDays}-day free trial` : null;
  const label = [offer.label, `${offer.price}${period}`, trial, offer.badge || null]
    .filter(Boolean)
    .join(", ");

  return (
    <PressScale
      onPress={onSelect}
      haptic="selection"
      scaleTo={0.98}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 76,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: theme.radius.lg,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          opacity: glow,
        }}
      />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {offer.label}
        </Text>
        <Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
              fontVariant: ["tabular-nums"],
            }}
          >
            {offer.price}
          </Text>
          {period ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body }}>
              {period}
            </Text>
          ) : null}
        </Text>
        {equivalent ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            ({equivalent}/mo)
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: theme.spacing.xs }}>
        {offer.badge ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {offer.badge}
            </Text>
          </View>
        ) : null}
        {trial ? (
          <Text
            style={{
              color: theme.colors.success,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {trial}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
    </PressScale>
  );
}
