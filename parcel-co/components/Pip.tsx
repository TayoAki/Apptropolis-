// Pip, the cardboard-box mascot. This wraps the platform's <Mascot> so a screen reader either
// skips a decorative Pip or hears "Pip", never the pose's file name ("pip-delivering").
import { View } from "react-native";
import { Mascot } from "./motion";

export function Pip({
  pose,
  size,
  label,
}: {
  /** One of the poses in data/images.ts: pip-neutral, pip-delivering, pip-celebrating. */
  pose: string;
  size: number;
  /** What a screen reader says. Leave it out when the words beside Pip already say it. */
  label?: string;
}) {
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
    >
      <Mascot pose={pose} size={size} />
    </View>
  );
}
