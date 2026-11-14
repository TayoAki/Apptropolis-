import { View } from "react-native";
import { AiImage } from "./AiImage";

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
      <AiImage
        name={`penny-${mood}`}
        style={{ width, height, resizeMode: "contain", backgroundColor: "transparent" }}
      />
    </View>
  );
}
