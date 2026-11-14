import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatMoney, type Product } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { PressScale, Skeleton } from "../motion";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One mood on the onboarding grid: a featured product's picture, name and price. */
export function ModeCard({
  label,
  caption,
  product,
  selected,
  imageHeight,
  onPress,
}: {
  label: string;
  caption: string;
  product?: Product;
  selected: boolean;
  imageHeight: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.text,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
      <PressScale
        onPress={onPress}
        haptic="selection"
        scaleTo={0.97}
        accessibilityRole="radio"
        accessibilityLabel={`${label}. ${product ? product.name : caption}`}
        accessibilityState={{ checked: selected }}
        style={{
          borderRadius: theme.radius.lg,
          borderWidth: selected ? 2 : 1,
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
            <AiImage
              prompt={`${product.name}, ${product.category}, soft watercolor product illustration on a plain background`}
              fit="contain"
              style={{ width: "100%", height: imageHeight, borderRadius: 0 }}
            />
          ) : (
            <Ionicons name="bag-handle-outline" size={32} color={theme.colors.textMuted} />
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
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {product ? product.name : caption}
          </Text>
          {product ? (
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
            >
              {capitalize(product.category)}
            </Text>
          ) : null}
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
