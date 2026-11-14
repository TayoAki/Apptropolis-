// One plan on the paywall, as a metal panel: the name and free trial on the left, the badge and
// price on the right. The chosen plan glows with a red edge.
import { Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { MetalPanel } from "./Frame";

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
    <MetalPanel
      selected={selected}
      onPress={onSelect}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityLabel={`${offer.label}, ${offer.price} ${periodLabel(offer)}${
        trial ? `, ${offer.trialDays}-day free trial` : ""
      }${badge ? `, ${badge}` : ""}`}
      accessibilityState={{ checked: selected }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {offer.label}
          </Text>
          {trial ? (
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              {`${offer.trialDays}-day free trial`}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {badge ? (
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {offer.price}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {periodLabel(offer)}
            </Text>
          </View>
        </View>
      </View>
    </MetalPanel>
  );
}
