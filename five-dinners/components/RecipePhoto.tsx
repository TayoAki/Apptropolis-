import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { View, type DimensionValue } from "react-native";
import { recipeImage } from "../data/recipe-images";
import type { Diet } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

const DIET_ICONS: Record<Diet, React.ComponentProps<typeof Ionicons>["name"]> = {
  vegetarian: "leaf-outline",
  fish: "fish-outline",
  meat: "restaurant-outline",
  pork: "restaurant-outline",
};

/**
 * A recipe's picture, cropped to fill the box. A recipe without one gets a tinted tile with the
 * icon for its kind of dinner, so a missing picture never reads as a broken one.
 */
export function RecipePhoto({
  recipeId,
  diet,
  width,
  height,
  aspectRatio,
  radius = 0,
}: {
  recipeId: string;
  diet?: Diet;
  width: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const source = recipeImage(recipeId);
  const box = { width, height, aspectRatio, borderRadius: radius };
  if (source) {
    return (
      <Image
        source={source}
        contentFit="cover"
        accessible={false}
        style={{ ...box, backgroundColor: theme.colors.surfaceAlt }}
      />
    );
  }
  const tint = diet === "vegetarian" ? theme.colors.accent : theme.colors.primary;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ ...box, backgroundColor: tint + "1F", alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={diet ? DIET_ICONS[diet] : "restaurant-outline"} size={28} color={tint} />
    </View>
  );
}
