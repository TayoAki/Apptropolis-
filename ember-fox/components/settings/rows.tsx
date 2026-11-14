import { Ionicons } from "@expo/vector-icons";
import { Children, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemeColors } from "../../theme/types";
import { haptic, PressScale } from "../motion";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export type ColorKey = keyof ThemeColors;

/** A 32pt rounded tile holding a row's leading glyph. */
export function IconTile({ name, tint = "accent" }: { name: IconName; tint?: ColorKey }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: theme.radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Ionicons name={name} size={18} color={theme.colors[tint]} />
    </View>
  );
}

/** An uppercase section header, a rounded card of rows, and an optional footer caption. */
export function SettingsSection({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        }}
      >
        {items.map((item, index) => (
          <View key={index}>
            {index > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  marginLeft: 56,
                  backgroundColor: theme.colors.border,
                }}
              />
            ) : null}
            {item}
          </View>
        ))}
      </View>
      {typeof footer === "string" ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            paddingHorizontal: theme.spacing.sm,
          }}
        >
          {footer}
        </Text>
      ) : (
        footer
      )}
    </View>
  );
}

/**
 * One settings row: icon tile, label and optional subtitle, a value, and a chevron when it
 * opens something. Children (e.g. a chip picker) appear below the row when it is open.
 */
export function SettingsRow({
  icon,
  tint,
  label,
  labelTint = "text",
  strong,
  value,
  valueTint = "textMuted",
  subtitle,
  onPress,
  open,
  chevron,
  trailing,
  accessibilityLabel,
  children,
}: {
  icon?: IconName;
  tint?: ColorKey;
  label: string;
  labelTint?: ColorKey;
  strong?: boolean;
  value?: string;
  valueTint?: ColorKey;
  subtitle?: string;
  onPress?: () => void;
  /** Whether the row's inline panel is showing (turns the chevron down). */
  open?: boolean;
  chevron?: boolean;
  trailing?: ReactNode;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const showChevron = chevron ?? Boolean(onPress);

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 56,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {icon ? <IconTile name={icon} tint={tint} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors[labelTint],
            fontSize: theme.font.size.body,
            fontWeight: strong ? theme.font.weight.bold : theme.font.weight.medium,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors[valueTint],
            fontSize: theme.font.size.body,
            fontVariant: ["tabular-nums"],
            flexShrink: 1,
            maxWidth: "45%",
            textAlign: "right",
          }}
        >
          {value}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
          style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
        />
      ) : null}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <PressScale
          onPress={onPress}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={open === undefined ? undefined : { expanded: open }}
        >
          {content}
        </PressScale>
      ) : (
        content
      )}
      {children}
    </View>
  );
}

/** A row of choices; the chosen one is filled with the primary color. */
export function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
      }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={String(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            hitSlop={6}
            onPress={() => {
              if (selected) return;
              haptic("selection");
              onChange(option.id);
            }}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: selected ? theme.colors.onPrimary : theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Minus and plus buttons around a value, for numbers such as body weight. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (n: number) => string;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  const move = (next: number) => {
    haptic("selection");
    onChange(next);
  };
  const button = (icon: "remove" | "add", target: number, disabled: boolean, what: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={what}
      disabled={disabled}
      hitSlop={8}
      onPress={() => move(target)}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
    </Pressable>
  );
  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
      }}
    >
      {button("remove", Math.max(min, value - step), value <= min, `Decrease ${label}`)}
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          fontVariant: ["tabular-nums"],
        }}
      >
        {format(value)}
      </Text>
      {button("add", Math.min(max, value + step), value >= max, `Increase ${label}`)}
    </View>
  );
}
