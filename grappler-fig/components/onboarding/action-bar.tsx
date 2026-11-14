// The onboarding footer: one primary action, an optional way past the step, and a caption.
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PrimaryButton } from "../button";
import { SecondaryButton, TextButton, type IconName } from "../ui";

export function ActionBar({
  label,
  onPress,
  icon,
  caption,
  busy = false,
  disabled = false,
  quiet = false,
  secondary,
  bottomInset = 0,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  caption?: string;
  /** Work is in progress: the button shows it and can't be pressed again. */
  busy?: boolean;
  disabled?: boolean;
  /** Draw the action as a second-rank button (stopping a round is not the way forward). */
  quiet?: boolean;
  /** A visible way past an optional step, e.g. "Not now". */
  secondary?: { label: string; onPress: () => void };
  /** The phone's bottom safe-area inset. */
  bottomInset?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        gap: theme.spacing.xs,
        paddingTop: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: bottomInset + theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
      }}
    >
      {quiet ? (
        <SecondaryButton label={label} icon={icon} onPress={onPress} disabled={disabled} />
      ) : (
        <PrimaryButton label={label} icon={icon} onPress={onPress} busy={busy} disabled={disabled} />
      )}
      {secondary ? (
        <TextButton label={secondary.label} tone="plain" onPress={secondary.onPress} />
      ) : null}
      {caption ? (
        <Text
          style={{
            textAlign: "center",
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption + 2,
            lineHeight: 20,
            paddingTop: theme.spacing.xs,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
