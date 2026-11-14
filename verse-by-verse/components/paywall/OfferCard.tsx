import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { Offer } from "../../data/purchases";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

const PER: Record<Offer["period"], string> = {
  week: "per week",
  month: "per month",
  year: "per year",
  lifetime: "once",
};

const EVERY: Record<Offer["period"], string> = {
  week: "every week",
  month: "every month",
  year: "every year",
  lifetime: "",
};

/** "$19.99 per year" or "$39.99 once", in the store's own price format. */
export function priceLabel(offer: Offer): string {
  return `${offer.price} ${PER[offer.period]}`;
}

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/**
 * The whole deal for a plan in one or two plain sentences, shown above the purchase button:
 * the trial and what follows it, that it renews, and where to cancel. A one-time purchase says
 * that it does not renew.
 */
export function termsSentence(offer: Offer, store: string): string {
  if (offer.period === "lifetime")
    return `${offer.price} once. A one-time purchase that does not renew.`;
  const price = priceLabel(offer);
  const start = offer.trialDays > 0 ? `${days(offer.trialDays)} free, then ${price}.` : `${price}.`;
  return `${start} Renews automatically until canceled. Cancel any time in ${store} subscription settings.`;
}

/** What pressing the purchase button does, as its label. */
export function buyLabel(offer: Offer): string {
  if (offer.trialDays > 0) return `Start ${offer.trialDays}-day free trial`;
  if (offer.period === "lifetime") return `Buy once for ${offer.price}`;
  return `Subscribe for ${priceLabel(offer)}`;
}

/** The number in a price such as "$19.99", "19,99 €" or "1,299.00"; null when it isn't clear. */
function amountOf(price: string): number | null {
  const digits = price.replace(/[^0-9.,]/g, "");
  if (!/[0-9]/.test(digits)) return null;
  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");
  const mark = Math.max(lastDot, lastComma);
  // The last separator is the decimal point when one or two digits follow it.
  const decimal = mark >= 0 && digits.length - mark - 1 <= 2 ? mark : -1;
  const whole = (decimal >= 0 ? digits.slice(0, decimal) : digits).replace(/[.,]/g, "");
  const fraction = decimal >= 0 ? digits.slice(decimal + 1) : "";
  const amount = Number(fraction ? `${whole}.${fraction}` : whole);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/**
 * How much less a yearly plan costs than twelve months of the monthly plan, as a whole
 * percentage rounded down. Worked out from the prices on screen, never taken on trust; null
 * when there is nothing to compare or the prices can't be read.
 */
export function savingPercent(offer: Offer, offers: Offer[]): number | null {
  if (offer.period !== "year") return null;
  const monthly = offers.find((o) => o.period === "month");
  const yearCost = amountOf(offer.price);
  const monthCost = monthly ? amountOf(monthly.price) : null;
  if (!yearCost || !monthCost) return null;
  const percent = Math.floor((1 - yearCost / (monthCost * 12)) * 100);
  return percent >= 1 ? percent : null;
}

/** "$1.67" for a yearly "$19.99": the cost per month. Only for prices written like "$19.99". */
function perMonth(offer: Offer): string | null {
  if (offer.period !== "year") return null;
  const parts = /^(\D*)(\d+(?:\.\d{1,2})?)(\D*)$/.exec(offer.price.trim());
  if (!parts) return null;
  const amount = Number(parts[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `${parts[1]}${(amount / 12).toFixed(2)}${parts[3]}`;
}

/** The line under the price: the trial, and how the plan renews (or that it doesn't). */
function detailLine(offer: Offer): string {
  if (offer.period === "lifetime") return "One payment. Does not renew.";
  const monthly = perMonth(offer);
  const parts = [
    offer.trialDays > 0 ? `${days(offer.trialDays)} free first.` : "",
    `Renews ${EVERY[offer.period]}.`,
    monthly ? `About ${monthly} a month.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * One plan as a selectable card: a radio mark, then the name, the price that renews and how it
 * renews, with the saving and free trial on its top edge. The chosen plan is shown by the
 * filled mark and a heavier border, not by color alone.
 */
export function OfferCard({
  offer,
  offers,
  selected,
  disabled = false,
  onSelect,
}: {
  offer: Offer;
  /** Every plan on sale, to work out what the yearly plan saves. */
  offers: Offer[];
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const saving = savingPercent(offer, offers);
  const ribbon = [
    saving ? `Save ${saving}%` : "",
    offer.trialDays > 0 ? `${offer.trialDays}-day free trial` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const price = priceLabel(offer);
  const detail = detailLine(offer);

  return (
    <PressScale
      onPress={onSelect}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected, disabled }}
      accessibilityLabel={[
        offer.label,
        price,
        detail,
        saving ? `Costs ${saving}% less than a year on the monthly plan` : "",
      ]
        .filter(Boolean)
        .join(". ")}
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
            fontWeight: theme.font.weight.medium,
            fontVariant: ["tabular-nums"],
          }}
        >
          {price}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: theme.font.size.caption * 1.35,
            fontVariant: ["tabular-nums"],
          }}
        >
          {detail}
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
            {ribbon.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </PressScale>
  );
}
