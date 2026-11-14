import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AiImage } from "../AiImage";
import {
  formatPackSize,
  formatPrice,
  formatPriceDiff,
  type BasketDiff,
  type Recipe,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

export interface Candidate {
  recipe: Recipe;
  /** Basket total after the swap minus the total now, in £. */
  delta: number;
}

export interface SwapInfo {
  fromName: string;
  diff: BasketDiff;
}

export function DinnerRow({
  day,
  recipe,
  servings,
  cost,
  note,
  cooked,
  open,
  swap,
  candidates,
  lockedCount,
  onToggle,
  onPick,
  onUndo,
  onUnlock,
}: {
  day: string;
  recipe: Recipe;
  servings: number;
  cost: number;
  note: string;
  cooked: boolean;
  open: boolean;
  swap?: SwapInfo;
  candidates: Candidate[];
  lockedCount: number;
  onToggle: () => void;
  onPick: (recipeId: string) => void;
  onUndo: () => void;
  onUnlock: () => void;
}) {
  const theme = useTheme();
  const text = {
    fontFamily: theme.font.family,
    color: theme.colors.text,
    fontSize: theme.font.size.body,
  } as const;
  const muted = { ...text, color: theme.colors.textMuted, fontSize: theme.font.size.caption + 1 };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        overflow: "hidden",
        minHeight: 76,
      }}
    >
      <View
        style={{
          width: 30,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            width: 60,
            textAlign: "center",
            transform: [{ rotate: "-90deg" }],
            color: theme.colors.textMuted,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            letterSpacing: 1,
          }}
        >
          {day}
        </Text>
      </View>

      <View style={{ flex: 1, padding: theme.spacing.sm, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Link href={`/recipe/${recipe.id}`} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open recipe: ${recipe.name}`}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AiImage
                prompt={`${recipe.name}, home-cooked dinner on a plate, overhead photo`}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...text, fontWeight: theme.font.weight.medium }}>{recipe.name}</Text>
                {swap ? (
                  <Text style={{ ...muted, textDecorationLine: "line-through" }}>
                    {swap.fromName}
                  </Text>
                ) : null}
                <Text style={{ ...muted, fontVariant: ["tabular-nums"] }}>
                  {recipe.minutes} min · {formatPrice(cost)} · {servings} servings
                  {note ? ` · ${note}` : ""}
                </Text>
              </View>
              {cooked ? (
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              ) : null}
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? `Close swap options for ${recipe.name}` : `Swap ${recipe.name}`}
            hitSlop={8}
            onPress={onToggle}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: theme.spacing.md,
              justifyContent: "center",
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: theme.colors.accent,
              backgroundColor: open ? theme.colors.surfaceAlt : theme.colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                ...text,
                fontSize: theme.font.size.caption + 1,
                color: theme.colors.accent,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {open ? "Close" : "Swap"}
            </Text>
          </Pressable>
        </View>

        {swap && !open ? (
          <View style={{ gap: 2 }}>
            <Text style={{ ...text, fontWeight: theme.font.weight.bold }}>Basket change</Text>
            {swap.diff.removed.map((r) => (
              <ChangeLine
                key={`r${r.pack.key}`}
                sign="−"
                label={`${r.packs > 1 ? `${r.packs} × ` : ""}${r.pack.name} ${formatPackSize(r.pack)}`}
                price={formatPrice(r.pack.price * r.packs)}
              />
            ))}
            {swap.diff.added.map((a) => (
              <ChangeLine
                key={`a${a.pack.key}`}
                sign="+"
                label={`${a.packs > 1 ? `${a.packs} × ` : ""}${a.pack.name} ${formatPackSize(a.pack)}`}
                price={formatPrice(a.pack.price * a.packs)}
              />
            ))}
            {swap.diff.added.length + swap.diff.removed.length === 0 ? (
              <Text style={muted}>Same packs, so the shop doesn't change.</Text>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
                marginTop: theme.spacing.xs,
                paddingTop: theme.spacing.xs,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo swap"
                hitSlop={12}
                onPress={onUndo}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ ...muted, textDecorationLine: "underline" }}>Undo swap</Text>
              </Pressable>
              <Text
                style={{
                  ...text,
                  fontWeight: theme.font.weight.bold,
                  fontVariant: ["tabular-nums"],
                  color: swap.diff.delta <= 0 ? theme.colors.success : theme.colors.warning,
                }}
              >
                {formatPriceDiff(swap.diff.delta)}
              </Text>
            </View>
          </View>
        ) : null}

        {open ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ ...muted, fontWeight: theme.font.weight.medium }}>
              Swap for one of these (cheapest first), with the change to your basket:
            </Text>
            {candidates.length === 0 ? (
              <Text style={muted}>No other dinners fit your exclusions.</Text>
            ) : null}
            {candidates.map((c) => (
              <Pressable
                key={c.recipe.id}
                accessibilityRole="button"
                accessibilityLabel={`Swap to ${c.recipe.name}, basket ${formatPriceDiff(c.delta)}`}
                onPress={() => onPick(c.recipe.id)}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderTopColor: theme.colors.border,
                  borderTopWidth: 1,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ ...text, fontWeight: theme.font.weight.medium }}>
                    {c.recipe.name}
                  </Text>
                  <Text style={muted}>
                    {c.recipe.minutes} min · {c.recipe.blurb}
                  </Text>
                </View>
                <Text
                  style={{
                    ...text,
                    fontVariant: ["tabular-nums"],
                    fontWeight: theme.font.weight.bold,
                    color: c.delta <= 0 ? theme.colors.success : theme.colors.warning,
                  }}
                >
                  {formatPriceDiff(c.delta)}
                </Text>
              </Pressable>
            ))}
            {lockedCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unlock ${lockedCount} more recipes`}
                onPress={onUnlock}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  borderTopColor: theme.colors.border,
                  borderTopWidth: 1,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="lock-closed" size={16} color={theme.colors.warning} />
                <Text style={{ ...text, flex: 1 }}>
                  {lockedCount} more tested recipes in the full library
                </Text>
                <Text style={{ ...text, color: theme.colors.primary, textDecorationLine: "underline" }}>
                  Unlock
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  function ChangeLine({ sign, label, price }: { sign: string; label: string; price: string }) {
    return (
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Text
          style={{
            ...text,
            width: 14,
            color: sign === "−" ? theme.colors.success : theme.colors.warning,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {sign}
        </Text>
        <Text style={{ ...text, flex: 1, fontSize: theme.font.size.caption + 1 }}>{label}</Text>
        <Text style={{ ...text, fontSize: theme.font.size.caption + 1, fontVariant: ["tabular-nums"] }}>
          {price}
        </Text>
      </View>
    );
  }
}
