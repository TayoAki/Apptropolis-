import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

const SUFFIX: Record<Offer["period"], string> = {
  week: "/week",
  month: "/month",
  year: "/year",
  lifetime: " once",
};

/** "$19.99/year" style line for an offer, in the store's own price format. */
export function priceLabel(offer: Offer): string {
  return `${offer.price}${SUFFIX[offer.period]}`;
}

/** "$1.67" for a yearly offer, the price per month; null when it can't be worked out. */
export function monthlyEquivalent(offer: Offer): string | null {
  if (offer.period !== "year") return null;
  const amount = Number(offer.price.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const symbol = offer.price.match(/^[^0-9]*/)?.[0]?.trim() ?? "";
  return `${symbol}${(amount / 12).toFixed(2)}`;
}

/**
 * The corner ribbon text: a savings badge ("Save 45%") and/or the free trial. Plans with neither
 * (such as a one-time purchase) get no ribbon.
 */
function ribbonText(offer: Offer): string | null {
  const parts = [
    /^save/i.test(offer.badge) ? offer.badge : "",
    offer.trialDays > 0 ? `${offer.trialDays}-day free trial` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ").toUpperCase() : null;
}

/**
 * One plan as a selectable card: a radio mark, then the name and price, with the savings badge
 * on its top edge. The chosen plan is shown by the filled mark and a heavier border, not by
 * color alone.
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
  const monthly = monthlyEquivalent(offer);
  const ribbon = ribbonText(offer);
  const price = priceLabel(offer);

  return (
    <PressScale
      onPress={onSelect}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${offer.label}, ${price}${ribbon ? `, ${ribbon.toLowerCase()}` : ""}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 68,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.surface : theme.colors.background,
      }}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={24}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {offer.label}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontVariant: ["tabular-nums"],
          }}
        >
          {price}
          {monthly ? (
            <Text style={{ color: theme.colors.textMuted }}>{` (${monthly}/mo)`}</Text>
          ) : null}
        </Text>
      </View>
      {ribbon ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -13,
            right: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.accent,
          }}
        >
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.bold,
              letterSpacing: 0.5,
            }}
          >
            {ribbon}
          </Text>
        </View>
      ) : null}
    </PressScale>
  );
}
