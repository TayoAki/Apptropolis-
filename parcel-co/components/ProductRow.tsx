import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { formatMoney, type Product } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage } from "./AiImage";
import { haptic } from "./motion";

/** A product in a list: picture, name, price, and quick save-to-wishlist and add-to-cart. */
export function ProductRow({
  product,
  onToggleWish,
  onAdd,
}: {
  product: Product;
  onToggleWish: () => void;
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <AiImage prompt={product.name} style={{ width: 64, height: 64, borderRadius: theme.radius.sm }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {product.name}
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
        >
          {product.description}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontVariant: ["tabular-nums"],
            marginTop: 4,
          }}
        >
          {formatMoney(product.price)}
          {product.cartQuantity > 0 ? `  ·  ${product.cartQuantity} in cart` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={product.isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          accessibilityState={{ selected: product.isWishlisted }}
          hitSlop={12}
          onPress={() => {
            haptic("selection");
            onToggleWish();
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name={product.isWishlisted ? "heart" : "heart-outline"}
            size={22}
            color={product.isWishlisted ? theme.colors.danger : theme.colors.textMuted}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add to cart"
          hitSlop={12}
          onPress={() => {
            haptic("light");
            onAdd();
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="bag-add-outline" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
