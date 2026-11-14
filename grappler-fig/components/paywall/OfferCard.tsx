// One plan on the paywall, as a radio row: the name and what it costs on the left of the price,
// a badge when the plan has one. The chosen plan has a filled radio, a heavier edge and a tint.
import { Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { RadioMark, tint } from "../ui";

/** "/ year", or "pay once" for a lifetime offer. */
export function periodLabel(offer: Pick<Offer, "period">): string {
  return offer.period === "lifetime" ? "pay once" : `/ ${offer.period}`;
}

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
  const trial = offer.trialDays > 0;
  // A lifetime plan's "Pay once" already shows beside its price.
  const badge = offer.period !== "lifetime" ? offer.badge : "";
  return (
    <PressScale
      onPress={onSelect}
      haptic="selection"
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityLabel={`${offer.label}, ${offer.price} ${periodLabel(offer)}${
        trial ? `, ${offer.trialDays}-day free trial` : ""
      }${badge ? `, ${badge}` : ""}`}
      accessibilityState={{ checked: selected, selected }}
      style={{
        minHeight: 76,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? tint(theme.colors.primary, "14") : theme.colors.surface,
      }}
    >
      <RadioMark selected={selected} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body + 2,
              fontWeight: theme.font.weight.bold,
              lineHeight: 24,
            }}
          >
            {offer.label}
          </Text>
          {badge ? (
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {trial ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption + 2,
              lineHeight: 20,
            }}
          >
            {`${offer.trialDays}-day free trial`}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
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
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
          {periodLabel(offer)}
        </Text>
      </View>
    </PressScale>
  );
}
