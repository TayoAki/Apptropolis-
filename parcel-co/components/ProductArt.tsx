// Pictures for products, order lines and paywall benefits. When the project has a picture for
// the description (an added image, or one drawn through the image endpoint) it is shown as usual.
// When it doesn't, the tile is a kraft-paper swatch with an icon for the kind of thing it is, so
// a missing picture never looks like a broken one.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View, type ImageStyle } from "react-native";
import { appImages } from "../data/images";
import type { Product } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

export type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICON: Record<string, IconName> = {
  // Style
  tops: "shirt-outline",
  knitwear: "shirt-outline",
  bottoms: "shirt-outline",
  outerwear: "shirt-outline",
  bags: "bag-handle-outline",
  accessories: "glasses-outline",
  shoes: "footsteps-outline",
  // Glow
  serums: "water-outline",
  moisturizers: "flower-outline",
  cleansers: "sparkles-outline",
  sunscreen: "sunny-outline",
  toners: "color-fill-outline",
  masks: "happy-outline",
  "eye care": "eye-outline",
  lips: "rose-outline",
  // Home
  candles: "flame-outline",
  kitchen: "restaurant-outline",
  tableware: "restaurant-outline",
  bedding: "bed-outline",
  decor: "leaf-outline",
  bath: "water-outline",
  // Pantry
  oils: "flask-outline",
  coffee: "cafe-outline",
  tea: "leaf-outline",
  staples: "basket-outline",
  "dairy-free": "pint-outline",
  snacks: "ice-cream-outline",
  condiments: "flame-outline",
};

const MODE_ICON: Record<Product["mode"], IconName> = {
  style: "shirt-outline",
  glow: "sparkles-outline",
  home: "home-outline",
  pantry: "basket-outline",
};

/** The icon that stands for a whole shop mode. */
export function modeIcon(mode: Product["mode"]): IconName {
  return MODE_ICON[mode] ?? "cube-outline";
}

/** The icon for a product's category (or its shop mode); a parcel when the product is unknown. */
export function productIcon(product?: Pick<Product, "category" | "mode"> | null): IconName {
  if (!product) return "cube-outline";
  return CATEGORY_ICON[product.category] ?? MODE_ICON[product.mode] ?? "cube-outline";
}

/** The vessel or form each category is drawn in, for its picture. */
const CATEGORY_VESSEL: Record<string, string> = {
  serums: "glass dropper bottle",
  oils: "glass oil bottle",
  toners: "spray mist bottle",
  moisturizers: "cream jar",
  masks: "cream jar",
  "eye care": "small cream jar",
  cleansers: "squeeze tube",
  sunscreen: "squeeze tube",
  candles: "glass candle in a ceramic vessel",
  bags: "canvas tote bag",
  tops: "folded shirt",
  knitwear: "folded sweater",
  bottoms: "pair of trousers",
  tableware: "stoneware plate",
  kitchen: "ceramic kitchen piece",
  coffee: "bag of coffee beans",
  tea: "tin of loose tea",
};

/**
 * The picture description for a product. Every screen uses this one description, so a product
 * has the same picture on Home, in the shop, at checkout and on its order.
 */
export function productPicture(product: Pick<Product, "name" | "category">): string {
  const vessel = CATEGORY_VESSEL[product.category];
  const subject = vessel ? `${vessel} for ${product.name}` : product.name;
  return `${subject}, soft watercolor illustration, centered on a plain background`;
}

/** True when the project has a real picture for this description. */
export function hasPicture(prompt: string): boolean {
  return Boolean(appImages[prompt] ?? aiImageUrl(prompt));
}

/**
 * A picture by description, or an intentional icon tile when there is none. `style` sets the
 * size and corner radius, exactly as it does for AiImage.
 */
export function ProductArt({
  prompt,
  icon,
  fit = "cover",
  label,
  style,
}: {
  prompt: string;
  icon: IconName;
  fit?: "cover" | "contain";
  /** What a screen reader says for the tile; defaults to the description. */
  label?: string;
  style?: ImageStyle;
}) {
  const theme = useTheme();
  if (hasPicture(prompt)) return <AiImage prompt={prompt} fit={fit} style={style} />;

  const height = typeof style?.height === "number" ? style.height : 160;
  const width = typeof style?.width === "number" ? style.width : height;
  const side = Math.min(width, height);
  // Small tiles show the icon alone; large ones set it on a paper disc.
  const disc = side >= 96 ? Math.round(Math.min(side * 0.52, 84)) : 0;
  const glyph = disc ? Math.round(disc * 0.48) : Math.round(Math.max(20, side * 0.42));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? prompt}
      style={[
        {
          height: 160,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: theme.colors.surfaceAlt,
        },
        style as object,
      ]}
    >
      {disc ? (
        <View
          style={{
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name={icon} size={glyph} color={theme.colors.primary} />
        </View>
      ) : (
        <Ionicons name={icon} size={glyph} color={theme.colors.primary} />
      )}
    </View>
  );
}

/**
 * A product's picture. Pass the product when it is known; an order line whose product is no
 * longer in the catalog passes its name alone and gets the parcel icon.
 */
export function ProductImage({
  product,
  name,
  fit = "cover",
  style,
}: {
  product?: Pick<Product, "name" | "category" | "mode"> | null;
  /** The item's name when there is no product record for it. */
  name?: string;
  fit?: "cover" | "contain";
  style?: ImageStyle;
}) {
  const title = product?.name ?? name ?? "Product";
  return (
    <ProductArt
      prompt={product ? productPicture(product) : title}
      icon={productIcon(product)}
      label={title}
      fit={fit}
      style={style}
    />
  );
}
