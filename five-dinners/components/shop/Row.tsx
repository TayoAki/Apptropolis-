import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { formatPrice, formatPriceDiff } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

export function ShopRow({
  name,
  subtitle,
  ticked,
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
  onToggle: () => void;
  showPrice: boolean;
  estimate: number;
  dateLabel: string;
  paid: number;
  onPaid: (amount: number) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(paid > 0 ? formatPrice(paid) : "");

  useEffect(() => {
    setText(paid > 0 ? formatPrice(paid) : "");
  }, [paid]);

  function commit() {
    const n = parseFloat(text.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) {
      const rounded = Math.round(n * 100) / 100;
      setText(formatPrice(rounded));
      if (rounded !== paid) onPaid(rounded);
    } else {
      setText(paid > 0 ? formatPrice(paid) : "");
    }
  }

  const diff = paid > 0 ? Math.round((paid - estimate) * 100) / 100 : 0;
  const chipBase = {
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
  };
  const chipText = {
    color: theme.colors.text,
    fontSize: theme.font.size.caption,
    fontWeight: theme.font.weight.medium,
    fontFamily: theme.font.family,
    fontVariant: ["tabular-nums" as const],
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingRight: theme.spacing.md,
      }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ticked }}
        accessibilityLabel={`${name}, ${subtitle}`}
        onPress={onToggle}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          minHeight: 56,
          paddingLeft: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name={ticked ? "checkmark-circle-outline" : "ellipse-outline"}
          size={28}
          color={ticked ? theme.colors.text : theme.colors.textMuted}
        />
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body + 1,
              fontWeight: theme.font.weight.medium,
              fontFamily: theme.font.family,
            }}
          >
            {name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontFamily: theme.font.family,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>

      {showPrice ? (
        ticked ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <View style={chipBase}>
              <Text style={chipText}>{`${formatPrice(estimate)}${dateLabel ? ` · ${dateLabel}` : ""}`}</Text>
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              onEndEditing={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              placeholder={formatPrice(estimate)}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={`What you paid for ${name}`}
              selectTextOnFocus
              style={{
                width: 72,
                height: 40,
                textAlign: "center",
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontFamily: theme.font.family,
                fontVariant: ["tabular-nums"],
                borderWidth: 1,
                borderColor: theme.colors.text,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
              }}
            />
            <View
              style={[
                chipBase,
                diff > 0 ? { backgroundColor: theme.colors.primary } : null,
              ]}
            >
              <Text
                style={[
                  chipText,
                  diff > 0
                    ? { color: theme.colors.onPrimary }
                    : diff < 0
                      ? { color: theme.colors.success }
                      : { color: theme.colors.textMuted },
                ]}
              >
                {paid > 0 ? (diff === 0 ? "±£0.00" : formatPriceDiff(diff)) : "–"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[chipBase, { paddingVertical: theme.spacing.sm }]}>
            <Text style={[chipText, { fontSize: theme.font.size.body }]}>{formatPrice(estimate)}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}
