import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatMoney, type Product, type ShopMode } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, Skeleton } from "../motion";
import { ProductArt, ProductImage, modeIcon } from "../ProductArt";

/**
 * One mood on the onboarding grid. The mood's name is the heading; a featured product's picture,
 * name and price sit under it. Without a product (the catalog hasn't loaded) it shows the mood's
 * icon and its one-line description instead.
 */
export function ModeCard({
  mode,
  label,
  caption,
  product,
  selected,
  imageHeight,
  onPress,
}: {
  mode: ShopMode;
  label: string;
  caption: string;
  product?: Product;
  selected: boolean;
  imageHeight: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface }}>
      <PressScale
        onPress={onPress}
        haptic="selection"
        scaleTo={0.97}
        accessibilityRole="radio"
        accessibilityLabel={
          product
            ? `${label}. ${caption}. Featured: ${product.name}, ${formatMoney(product.price)}`
            : `${label}. ${caption}`
        }
        accessibilityState={{ checked: selected, selected }}
        style={{
          borderRadius: theme.radius.lg,
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: imageHeight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {product ? (
            <ProductImage
              product={product}
              fit="contain"
              style={{ width: "100%", height: imageHeight, borderRadius: 0 }}
            />
          ) : (
            <ProductArt
              prompt={label}
              icon={modeIcon(mode)}
              label={label}
              style={{ width: "100%", height: imageHeight, borderRadius: 0 }}
            />
          )}
          {selected ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                position: "absolute",
                top: theme.spacing.sm,
                right: theme.spacing.sm,
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primary,
              }}
            >
              <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
            </View>
          ) : null}
        </View>

        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
            gap: 2,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              lineHeight: 17,
              paddingBottom: product ? 0 : theme.spacing.xs,
            }}
          >
            {product ? product.name : caption}
          </Text>
        </View>

        {product ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatMoney(product.price)}
            </Text>
          </View>
        ) : null}
      </PressScale>
    </View>
  );
}

/** A loading card shaped like ModeCard. */
export function ModeCardSkeleton({ imageHeight }: { imageHeight: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      <Skeleton width="100%" height={imageHeight} radius={0} />
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <Skeleton width="40%" height={10} />
        <Skeleton width="85%" height={14} />
      </View>
      <View style={{ height: 40, backgroundColor: theme.colors.surfaceAlt }} />
    </View>
  );
}
