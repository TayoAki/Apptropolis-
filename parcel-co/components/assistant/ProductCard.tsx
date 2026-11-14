import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatMoney, type Product } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";
import { ProductImage } from "../ProductArt";

/** A product Pip suggests in the chat, with a quick add-to-cart button. */
export function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <ProductImage
        product={product}
        style={{ width: 64, height: 64, borderRadius: theme.radius.sm }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            lineHeight: 21,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {product.name}
        </Text>
        <Text
          style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}
        >
          {product.description}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
            fontVariant: ["tabular-nums"],
            marginTop: 2,
          }}
        >
          {formatMoney(product.price)}
          {product.cartQuantity > 0 ? `  ·  ${product.cartQuantity} in cart` : ""}
        </Text>
      </View>
      <PressScale
        onPress={onAdd}
        scaleTo={0.9}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Add ${product.name} to cart`}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </PressScale>
    </View>
  );
}
