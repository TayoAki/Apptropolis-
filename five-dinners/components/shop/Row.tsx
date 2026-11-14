import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { formatPrice, formatPriceDiff } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

/** Width of the price column, so estimates and "paid" boxes line up down the list. */
const PRICE_COLUMN = 76;

export function ShopRow({
  name,
  subtitle,
  ticked,
  covered,
  onToggle,
  showPrice,
  estimate,
  dateLabel,
  paid,
  onPaid,
}: {
  name: string;
  subtitle: string;
  ticked: boolean;
  /** Already in the cupboard: shown as done, and not something to tick. */
  covered?: boolean;
  onToggle: () => void;
  showPrice: boolean;
  estimate: number;
  dateLabel: string;
  paid: number;
  onPaid: (amount: number) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(paid > 0 ? formatPrice(paid) : "");
  // The last amount handed to onPaid. Submitting and then leaving the box both commit, and the
  // second must not save the same price again before the first has come back as `paid`.
  const saved = useRef(paid);

  useEffect(() => {
    saved.current = paid;
    setText(paid > 0 ? formatPrice(paid) : "");
  }, [paid]);

  function commit() {
    const n = parseFloat(text.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) {
      const rounded = Math.round(n * 100) / 100;
      setText(formatPrice(rounded));
      if (rounded !== saved.current) {
        saved.current = rounded;
        onPaid(rounded);
      }
    } else {
      setText(saved.current > 0 ? formatPrice(saved.current) : "");
    }
  }

  const diff = paid > 0 ? Math.round((paid - estimate) * 100) / 100 : 0;
  const meta = {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.caption + 1,
    fontFamily: theme.font.family,
    fontVariant: ["tabular-nums" as const],
  };
  const done = ticked || !!covered;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        minHeight: 60,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingRight: theme.spacing.md,
      }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: !!covered }}
        accessibilityLabel={`${name}, ${subtitle}`}
        disabled={covered}
        onPress={onToggle}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm + 2,
          minHeight: 60,
          paddingLeft: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name={done ? "checkmark-circle-outline" : "ellipse-outline"}
          size={28}
          color={covered ? theme.colors.accent : ticked ? theme.colors.text : theme.colors.textMuted}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body + 2,
              fontWeight: theme.font.weight.medium,
              fontFamily: theme.font.family,
            }}
          >
            {name}
          </Text>
          <Text style={meta}>{subtitle}</Text>
          {showPrice && ticked ? (
            <Text style={meta}>
              {`Estimate\u00A0${formatPrice(estimate)}${dateLabel ? ` · checked\u00A0${dateLabel.replace(/ /g, "\u00A0")}` : ""}`}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {showPrice ? (
        ticked ? (
          <View style={{ width: PRICE_COLUMN, alignItems: "flex-end", gap: 2 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder={formatPrice(estimate)}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={`What you paid for ${name}`}
              selectTextOnFocus
              style={{
                width: PRICE_COLUMN,
                height: 44,
                textAlign: "center",
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontFamily: theme.font.family,
                fontVariant: ["tabular-nums"],
                borderWidth: 1,
                borderColor: theme.colors.textMuted,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
              }}
            />
            <Text
              style={[
                meta,
                { fontSize: theme.font.size.caption, fontWeight: theme.font.weight.medium },
                paid > 0 && diff > 0 ? { color: theme.colors.warning } : null,
                paid > 0 && diff < 0 ? { color: theme.colors.success } : null,
              ]}
            >
              {paid > 0 ? (diff === 0 ? "±£0.00" : formatPriceDiff(diff)) : "Paid?"}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              textAlign: "right",
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
              fontFamily: theme.font.family,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatPrice(estimate)}
          </Text>
        )
      ) : null}
    </View>
  );
}
