import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { appImages } from "../data/images";
import { useTheme } from "../theme/ThemeProvider";
import { AiImage, aiImageUrl } from "./AiImage";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Whether the project has a real picture for this name or description. */
export function hasPicture(name?: string, prompt?: string): boolean {
  if (name && appImages[name]) return true;
  if (prompt && (appImages[prompt] || aiImageUrl(prompt))) return true;
  return false;
}

/**
 * A square picture tile. The project's pictures are drawn on their own dark background, so a
 * real picture is framed in a rounded tile (cropped in by `zoom`) instead of floating as a
 * rectangle. Where the project has no picture, the tile is a tint of the theme with an icon, so
 * a missing image never reads as broken.
 */
export function Picture({
  name,
  prompt,
  icon,
  size,
  radius,
  zoom = 1,
  muted = false,
}: {
  name?: string;
  prompt?: string;
  /** The icon shown when there is no picture. */
  icon: IconName;
  size: number;
  radius?: number;
  /** How far to crop into a real picture (1 shows its full height). */
  zoom?: number;
  /** A quieter tile, for items that aren't available yet. */
  muted?: boolean;
}) {
  const theme = useTheme();
  const corner = radius ?? theme.radius.sm;
  if (hasPicture(name, prompt)) {
    const inner = size * zoom;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: corner,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AiImage name={name} prompt={prompt} style={{ width: inner, height: inner }} />
      </View>
    );
  }
  const color = muted ? theme.colors.textMuted : theme.colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: corner,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: muted ? theme.colors.surfaceAlt : theme.colors.primary + "1F",
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}
