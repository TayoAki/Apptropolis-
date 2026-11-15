import { Image } from "expo-image";
import { View } from "react-native";

/** Penny's pictures are bundled with the app (assets/penny), so she never needs the network. */
const PENNY = {
  neutral: require("../assets/penny/penny-neutral.png"),
  happy: require("../assets/penny/penny-happy.png"),
  "half-full": require("../assets/penny/penny-half-full.png"),
} as const;

/**
 * Penny, the paper grocery bag. She is decoration: the words next to her carry the meaning, so
 * she is hidden from screen readers and drawn on a clear background.
 */
export function Penny({
  mood,
  width,
  height = width,
}: {
  mood: "neutral" | "happy" | "half-full";
  width: number;
  height?: number;
}) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ pointerEvents: "none" }}
    >
      <Image
        source={PENNY[mood]}
        contentFit="contain"
        accessible={false}
        style={{ width, height, backgroundColor: "transparent" }}
      />
    </View>
  );
}
