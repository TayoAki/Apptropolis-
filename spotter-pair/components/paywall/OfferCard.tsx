import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

/** "Yearly (anything in brackets)" becomes "Yearly". */
function titleOf(label: string): string {
  return label.replace(/\s*\([^)]*\)/g, "").trim();
}

/** "per year", "per month", "per week"; a one-time purchase has no period. */
export function periodText(offer: Offer): string {
  return offer.period === "lifetime" ? "once" : `per ${offer.period}`;
}

/**
 * One plan on the paywall, as a tile: its name, the price that renews (the largest text), and
 * the trial length. The picked plan has a primary border and a filled radio, so the choice is
 * not shown by color alone.
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
  const title = titleOf(offer.label);
  const trial = offer.trialDays > 0 ? `${offer.trialDays} days free first` : "No free trial";
  const renews = offer.period === "lifetime" ? "Does not renew" : trial;

  return (
    <PressScale
      onPress={onSelect}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${title}: ${offer.price} ${periodText(offer)}. ${renews}.${
        offer.badge ? ` ${offer.badge}.` : ""
      }`}
      style={{
        // Tall enough for the plan with a badge, so two tiles side by side match.
        minHeight: 124,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        // One border width in both states, so nothing shifts when the selection moves.
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={20}
          color={selected ? theme.colors.primary : theme.colors.textMuted}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
      </View>
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
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
        {` ${periodText(offer)}`}
      </Text>
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.caption }}>{renews}</Text>
      {offer.badge ? (
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
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
            {offer.badge}
          </Text>
        </View>
      ) : null}
    </PressScale>
  );
}
