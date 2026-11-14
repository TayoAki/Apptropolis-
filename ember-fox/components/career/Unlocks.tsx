import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import type { Sport, Unlock } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Picture } from "../Picture";
import { haptic } from "../motion";

export type Access = "unlocked" | "locked" | "plus";
type IconName = ComponentProps<typeof Ionicons>["name"];

const GEAR_ICONS: Record<Sport | "any", IconName> = {
  gym: "barbell-outline",
  running: "footsteps-outline",
  team: "football-outline",
  racquet: "tennisball-outline",
  any: "ribbon-outline",
};

/** The icon that stands in for an item's picture: a shirt for kits, the sport's icon for gear. */
function iconFor(item: Unlock): IconName {
  return item.kind === "kit" ? "shirt-outline" : GEAR_ICONS[item.sport];
}

/**
 * One gear or kit tile for the locker: a picture, its name, what it is and where it stands.
 * Unlocked tiles carry a check and the primary border; locked tiles a lock and what they need;
 * Plus tiles a lock and "Plus", and open the paywall.
 */
export function GearTile({
  item,
  access,
  status,
  prompt,
  onPress,
}: {
  item: Unlock;
  access: Access;
  /** The line under the name: "Unlocked", what it still needs, or "Plus". */
  status: string;
  /** A short description of the picture to draw for this item. */
  prompt: string;
  /** Plus tiles open the paywall. */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const unlocked = access === "unlocked";
  const statusColor = unlocked ? theme.colors.success : theme.colors.textMuted;

  const card = (
    <View
      accessible={!onPress}
      accessibilityLabel={`${item.name}. ${item.description} ${status}.`}
      style={{
        flex: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: unlocked ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Picture prompt={prompt} icon={iconFor(item)} size={48} muted={!unlocked} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {item.name}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
          {item.description}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
        <Ionicons
          name={unlocked ? "checkmark-circle" : "lock-closed"}
          size={14}
          color={statusColor}
        />
        <Text
          style={{
            flex: 1,
            color: statusColor,
            fontSize: theme.font.size.caption,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {status}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return card;
  return (
    <Pressable
      onPress={() => {
        haptic("light");
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.description} Part of ShotOClock Plus. See plans`}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      {card}
    </Pressable>
  );
}
