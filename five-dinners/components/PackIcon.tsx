import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const PACK_ICONS: Record<string, IconName> = {
  oil: "water-outline",
  coconut: "water-outline",
  soy: "water-outline",
  eggs: "egg-outline",
  salmon: "fish-outline",
  tuna: "fish-outline",
  mince: "restaurant-outline",
  chickenThigh: "restaurant-outline",
  chickenBreast: "restaurant-outline",
  sausages: "restaurant-outline",
  bacon: "restaurant-outline",
  carrots: "leaf-outline",
  spinach: "leaf-outline",
  broccoli: "leaf-outline",
  courgette: "leaf-outline",
  peppers: "leaf-outline",
  ginger: "leaf-outline",
  onion: "nutrition-outline",
  garlic: "nutrition-outline",
  tomatoes: "nutrition-outline",
  rice: "bag-outline",
  penne: "bag-outline",
  spaghetti: "bag-outline",
  lentils: "bag-outline",
  noodles: "bag-outline",
  stock: "cube-outline",
  cumin: "flame-outline",
  paprika: "flame-outline",
  curry: "flame-outline",
};

/**
 * The small square picture for a pack. Pass a prompt to use a generated picture when AI images
 * are switched on; otherwise (and always without a prompt) it is an icon on a tinted tile.
 */
export function PackIcon({
  packKey,
  size = 36,
  prompt,
}: {
  packKey: string;
  size?: number;
  prompt?: string;
}) {
  const theme = useTheme();
  if (prompt && aiImageUrl(prompt)) {
    return (
      <AiImage
        prompt={prompt}
        style={{ width: size, height: size, borderRadius: theme.radius.sm, resizeMode: "contain" }}
      />
    );
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.primary + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={PACK_ICONS[packKey] ?? "basket-outline"}
        size={Math.round(size * 0.56)}
        color={theme.colors.primary}
      />
    </View>
  );
}
