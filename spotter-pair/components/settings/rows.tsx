// Rows and cards for the Settings screen: grouped cards with hairline dividers, a row that
// expands into choices, a switch row and a navigation row. Colors come from the theme only.
import { Ionicons } from "@expo/vector-icons";
import { Children, useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { haptic, PressScale, Skeleton } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** An uppercase, muted label above a card or a group of controls. */
export function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.colors.textMuted,
        fontSize: theme.font.size.caption,
        fontWeight: theme.font.weight.medium,
        letterSpacing: 1.1,
        paddingHorizontal: theme.spacing.xs,
      }}
    >
      {children}
    </Text>
  );
}

/** A hairline between rows. */
export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />;
}

/** A rounded, slightly lighter surface holding rows, with a hairline between each row. */
export function SettingsCard({ children, footer }: { children?: ReactNode; footer?: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </View>
      ))}
      {footer}
    </View>
  );
}

/** A row that opens something: a route, a link or an action. */
export function NavRow({
  title,
  onPress,
  icon,
  trailing,
  chevron = true,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  trailing?: ReactNode;
  chevron?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={theme.colors.primary} /> : null}
      <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
        {title}
      </Text>
      {trailing}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {body}
    </PressScale>
  );
}

/** A row with an on/off switch. Shows a placeholder block while its value loads. */
export function ToggleRow({
  title,
  value,
  onChange,
  loading,
}: {
  title: string;
  value: boolean;
  onChange: (next: boolean) => void;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
        {title}
      </Text>
      {loading ? (
        <Skeleton width={51} height={31} radius={16} />
      ) : (
        <Switch
          value={value}
          accessibilityLabel={title}
          onValueChange={(next) => {
            haptic("selection");
            onChange(next);
          }}
          trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.primary }}
          thumbColor={theme.colors.text}
          ios_backgroundColor={theme.colors.surfaceAlt}
        />
      )}
    </View>
  );
}

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A row that opens into a short list of choices; picking one saves it and closes the list. */
export function ChoiceRow({
  title,
  trailing,
  options,
  selected,
  onChoose,
}: {
  title: string;
  trailing?: ReactNode;
  options: Array<{ key: string; label: string }>;
  selected: string;
  onChoose: (key: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <PressScale
        onPress={() => setOpen((value) => !value)}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 52,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.md,
          }}
        >
          <Text style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.body }}>
            {title}
          </Text>
          {trailing}
          <Ionicons
            name={open ? "chevron-down" : "chevron-forward"}
            size={18}
            color={theme.colors.textMuted}
          />
        </View>
      </PressScale>
      {open ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          {options.map((option) => (
            <OptionChip
              key={option.key}
              label={option.label}
              selected={option.key === selected}
              onPress={() => {
                haptic("selection");
                setOpen(false);
                onChoose(option.key);
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
