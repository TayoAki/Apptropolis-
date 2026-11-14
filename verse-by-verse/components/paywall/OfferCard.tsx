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

/** One plan as a selectable card: name and price centered, with the savings ribbon on its corner. */
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
  const serif = { fontFamily: theme.font.family };
  const monthly = monthlyEquivalent(offer);
  const ribbon = ribbonText(offer);
  const price = priceLabel(offer);

  return (
    <PressScale
      onPress={onSelect}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${offer.label}, ${price}${ribbon ? `, ${ribbon.toLowerCase()}` : ""}`}
      style={{
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        backgroundColor: selected ? theme.colors.surface : theme.colors.background,
      }}
    >
      <Text
        style={{
          ...serif,
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          textAlign: "center",
        }}
      >
        {offer.label}
      </Text>
      <Text
        style={{
          ...serif,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontVariant: ["tabular-nums"],
          textAlign: "center",
        }}
      >
        {price}
        {monthly ? (
          <Text style={{ color: theme.colors.textMuted }}>{` (${monthly}/mo)`}</Text>
        ) : null}
      </Text>
      {ribbon ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -12,
            right: -6,
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
