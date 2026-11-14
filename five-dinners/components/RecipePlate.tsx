import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import type { Diet } from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

const DIET_ICONS: Record<Diet, React.ComponentProps<typeof Ionicons>["name"]> = {
  vegetarian: "leaf-outline",
  fish: "fish-outline",
  meat: "restaurant-outline",
  pork: "restaurant-outline",
};

/**
 * A round plate for a dinner. With AI images switched on it is the generated picture; without,
 * it is a tinted plate with an icon for the kind of dinner, so a missing picture never reads as
 * a broken one.
 */
export function RecipePlate({
  prompt,
  diet,
  size,
}: {
  prompt: string;
  diet?: Diet;
  size: number;
}) {
  const theme = useTheme();
  if (aiImageUrl(prompt)) {
    return (
      <AiImage prompt={prompt} style={{ width: size, height: size, borderRadius: size / 2 }} />
    );
  }
  const tint = diet === "vegetarian" ? theme.colors.accent : theme.colors.primary;
  const rim = size >= 64;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {rim ? (
        <View
          style={{
            position: "absolute",
            width: size * 0.74,
            height: size * 0.74,
            borderRadius: size * 0.37,
            borderWidth: 1,
            borderColor: tint + "55",
          }}
        />
      ) : null}
      <Ionicons
        name={diet ? DIET_ICONS[diet] : "restaurant-outline"}
        size={Math.round(size * (rim ? 0.34 : 0.46))}
        color={tint}
      />
    </View>
  );
}
