import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { appImages } from "../data/images";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Whether a picture exists for this description (added to the project, or generated on demand). */
export function hasArt(prompt: string): boolean {
  return Boolean(appImages[prompt] ?? aiImageUrl(prompt));
}

/**
 * A round tinted tile with an icon: what the app shows where an illustration belongs but none
 * has been drawn yet, so the spot reads as designed rather than as a missing image.
 */
export function Emblem({
  icon,
  size = 72,
  style,
}: {
  icon: IconName;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primary + "1F",
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.44)} color={theme.colors.primary} />
    </View>
  );
}

/**
 * An illustration in a small rounded frame, like a plate in a book. The app's drawings are ink
 * on cream paper, so the frame keeps them looking deliberate on every theme, dark ones included.
 * Without a picture for `prompt` it shows the Emblem instead.
 */
export function Plate({
  prompt,
  icon,
  size = 72,
}: {
  prompt: string;
  /** The icon for the Emblem shown when there is no picture. */
  icon: IconName;
  size?: number;
}) {
  const theme = useTheme();
  if (!hasArt(prompt)) return <Emblem icon={icon} size={size} />;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      <AiImage prompt={prompt} fit="cover" style={{ width: size - 2, height: size - 2 }} />
    </View>
  );
}
