import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { Lottie } from "../lottie";
import { PressScale, useReducedMotion } from "../motion";

const SOFT = Easing.inOut(Easing.sin);

/** "Yearly (covers you and your partner)" becomes "Yearly". */
function titleOf(label: string): string {
  return label.replace(/\s*\([^)]*\)/g, "").trim();
}

/** The text in brackets of a label, capitalised: "Covers you and your partner". */
function detailOf(label: string): string | null {
  const inside = /\(([^)]*)\)/.exec(label)?.[1]?.trim();
  return inside ? inside.charAt(0).toUpperCase() + inside.slice(1) : null;
}

/** "($2.50/mo)" for a yearly price, worked out from the store's own price string. */
function perMonthOf(offer: Offer): string | null {
  if (offer.period !== "year") return null;
  const symbol = offer.price.replace(/[0-9.,\s]/g, "");
  const digits = offer.price.replace(/[^0-9.,]/g, "");
  const normal =
    digits.includes(",") && !digits.includes(".")
      ? digits.replace(",", ".")
      : digits.replace(/,/g, "");
  const amount = Number(normal);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `(${symbol}${(amount / 12).toFixed(2)}/mo)`;
}

/**
 * One plan on the paywall. The selected plan springs up, glows softly along its border, shows a
 * one-time sparkle on its trial badge, and its price cross-fades when the selection moves.
 */
export function OfferCard({
  offer,
  selected,
  onSelect,
}: {
  offer: Offer;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const glow = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const priceFade = useRef(new Animated.Value(1)).current;
  const settled = useRef(false);

  // The molten glow along the selected plan's border: a slow, continuous breath.
  useEffect(() => {
    if (!selected) {
      glow.setValue(0);
      return;
    }
    if (reduced) {
      glow.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: SOFT, useNativeDriver: true }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 1600,
          easing: SOFT,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selected, reduced, glow]);

  // The spring when the selection moves onto this plan.
  useEffect(() => {
    if (reduced) {
      lift.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(lift, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [selected, reduced, lift]);

  // The price cross-fades to its new state each time the selection changes.
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    if (reduced) return;
    priceFade.setValue(0);
    Animated.timing(priceFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [selected, reduced, priceFade]);

  const title = titleOf(offer.label);
  const detail = detailOf(offer.label);
  const perMonth = perMonthOf(offer);
  const badge = [
    offer.badge,
    offer.trialDays > 0 ? `${offer.trialDays}-day free trial` : "",
  ]
    .filter(Boolean)
    .join(" • ")
    .toUpperCase();
  const priceLine = offer.period === "lifetime" ? offer.price : `${offer.price}/${offer.period}`;
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  return (
    <PressScale
      onPress={onSelect}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${priceLine}${badge ? `, ${badge.toLowerCase()}` : ""}`}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {selected ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: theme.radius.lg + 6,
              borderWidth: 6,
              borderColor: theme.colors.primary,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
            }}
          />
        ) : null}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            padding: theme.spacing.md,
            gap: theme.spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
                flexShrink: 1,
              }}
            >
              {title}
            </Text>
            {badge ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.radius.pill,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.colors.onPrimary : theme.colors.textMuted,
                    fontSize: theme.font.size.caption,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          {detail ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {detail}
            </Text>
          ) : null}
          <Animated.View
            style={{
              opacity: priceFade,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontVariant: ["tabular-nums"],
              }}
            >
              <Text style={{ fontWeight: theme.font.weight.bold }}>{offer.price}</Text>
              {offer.period === "lifetime" ? null : (
                <Text style={{ color: theme.colors.textMuted }}>{`/${offer.period}`}</Text>
              )}
            </Text>
            {perMonth ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {perMonth}
              </Text>
            ) : null}
          </Animated.View>
        </View>
        {selected && offer.trialDays > 0 ? (
          <View pointerEvents="none" style={{ position: "absolute", top: -22, right: -6 }}>
            <Lottie name="sparkle" size={56} loop={false} />
          </View>
        ) : null}
      </Animated.View>
    </PressScale>
  );
}
