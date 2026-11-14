import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { appImages } from "../data/images";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

/** The partner's picture. Every screen uses this one description, so the partner looks the same everywhere. */
export const PARTNER_PHOTO =
  "close-up portrait of a friendly smiling person in a gym t-shirt, plain studio background";

/**
 * A round picture of a person. When the project has no image for `prompt`, it draws a tinted
 * circle with the person's initial (or a person glyph when there is no name) instead of an empty
 * image box. The name is always written beside an avatar, so it is hidden from screen readers.
 */
export function Avatar({
  prompt,
  name,
  size = 56,
}: {
  /** The description of the picture (see data/images.ts). */
  prompt?: string;
  /** Whose avatar it is; the first letter is the fallback. */
  name?: string;
  size?: number;
}) {
  const theme = useTheme();
  const hasImage = Boolean(prompt && (appImages[prompt] ?? aiImageUrl(prompt)));
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}
    >
      {hasImage ? (
        <AiImage prompt={prompt} style={{ width: size, height: size }} />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary + "1F",
          }}
        >
          {initial ? (
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: Math.round(size * 0.42),
                fontWeight: theme.font.weight.bold,
              }}
            >
              {initial}
            </Text>
          ) : (
            <Ionicons name="person" size={Math.round(size * 0.5)} color={theme.colors.primary} />
          )}
        </View>
      )}
    </View>
  );
}
