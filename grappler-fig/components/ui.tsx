// The app's shared look, in one place: the display face and where it is used, the tab screens'
// header, icon and text buttons, the themed switch, the radio mark, viewfinder marks for real
// photo frames, and the initial tile shown where an opponent has no photo.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import {
  Platform,
  Pressable,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { PressScale } from "./motion";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The display face: a condensed bold from the phone's own fonts. It has one job on every screen:
 * screen titles, the round label and big figures. Everything else is the system sans.
 */
export const displayFace: TextStyle = Platform.select<TextStyle>({
  ios: { fontFamily: "AvenirNextCondensed-Bold" },
  android: { fontFamily: "sans-serif-condensed", fontWeight: "700" },
  default: { fontWeight: "700" },
}) as TextStyle;

/** A monospaced face for the round clock only, so its digits never shift. */
export const clockFace: TextStyle = Platform.select<TextStyle>({
  ios: { fontFamily: "Menlo-Bold" },
  android: { fontFamily: "monospace", fontWeight: "700" },
  default: { fontFamily: "monospace", fontWeight: "700" },
}) as TextStyle;

/** A token color with an alpha channel appended (tokens are always 6-digit hex). */
export function tint(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

/** A 44pt icon button. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = 24,
  disabled = false,
}: {
  icon: IconName;
  /** What it does, for VoiceOver and TalkBack. */
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.colors.text} />
    </Pressable>
  );
}

/** The header of each tab: the screen's name in the display face, then actions on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          displayFace,
          {
            flex: 1,
            color: theme.colors.text,
            fontSize: theme.font.size.headline,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          },
        ]}
      >
        {title}
      </Text>
      {right}
      <IconButton
        icon="settings-outline"
        label="Settings"
        onPress={() => router.push("/settings")}
      />
    </View>
  );
}

/** The training streak, shown beside the header's actions. */
export function StreakBadge({ days }: { days: number }) {
  const theme = useTheme();
  const lit = days > 0;
  return (
    <View
      accessible
      accessibilityLabel={`${days} day streak`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        minHeight: 32,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Ionicons
        name={lit ? "flame" : "flame-outline"}
        size={16}
        color={lit ? theme.colors.primary : theme.colors.textMuted}
      />
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.caption + 2,
          fontWeight: theme.font.weight.bold,
          fontVariant: ["tabular-nums"],
        }}
      >
        {`${days} ${days === 1 ? "day" : "days"}`}
      </Text>
    </View>
  );
}

/** A quiet action: a label in the primary color with a full-size touch target. */
export function TextButton({
  label,
  onPress,
  icon,
  tone = "primary",
  disabled = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: "primary" | "danger" | "plain";
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const color =
    tone === "danger"
      ? theme.colors.danger
      : tone === "plain"
        ? theme.colors.text
        : theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          opacity: pressed || disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={{ color, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A second-rank button: outlined, the same height and shape as the primary one. */
export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.textMuted,
        opacity: disabled ? 0.5 : 1,
        alignSelf: fullWidth ? "stretch" : "center",
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={theme.colors.text} /> : null}
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

/** The platform's switch in the app's colors: the thumb stays visible on and off, light and dark. */
export function AppSwitch({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  // react-native-web draws the on-state thumb from its own prop.
  const web =
    Platform.OS === "web"
      ? ({ activeThumbColor: theme.colors.onPrimary } as Record<string, string>)
      : {};
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      disabled={disabled}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.textMuted, true: theme.colors.primary }}
      thumbColor={value ? theme.colors.onPrimary : theme.colors.background}
      ios_backgroundColor={theme.colors.textMuted}
      {...web}
    />
  );
}

/** A radio mark: an outlined ring, filled with a check when selected (never color alone). */
export function RadioMark({ selected, size = 24 }: { selected: boolean; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: selected ? 0 : 2,
        borderColor: theme.colors.textMuted,
        backgroundColor: selected ? theme.colors.primary : "transparent",
      }}
    >
      {selected ? (
        <Ionicons name="checkmark" size={size * 0.7} color={theme.colors.onPrimary} />
      ) : null}
    </View>
  );
}

/**
 * Viewfinder marks in the four corners of a photo frame. The app's one decorative motif, kept for
 * the place it means something: a real frame that is being read or was read.
 */
export function FrameMarks({
  color,
  size = 14,
  inset = 8,
}: {
  color?: string;
  size?: number;
  inset?: number;
}) {
  const theme = useTheme();
  const arm: ViewStyle = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: color ?? theme.colors.primary,
  };
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <View style={[arm, { top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[arm, { top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View
        style={[arm, { bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2 }]}
      />
      <View
        style={[arm, { bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2 }]}
      />
    </View>
  );
}

/**
 * The tile for an opponent with no photo: their initial in the blue corner's color. (You train
 * in the red corner; the person you scout is in the blue one.)
 */
export function Monogram({
  name,
  size = 56,
  radius,
}: {
  name: string;
  size?: number;
  radius?: number;
}) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? theme.radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tint(theme.colors.accent, "26"),
      }}
    >
      <Text
        style={[
          displayFace,
          { color: theme.colors.accent, fontSize: Math.round(size * 0.5), lineHeight: size },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}
