import { Ionicons } from "@expo/vector-icons";
import { Children, Fragment, type ComponentProps, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** An uppercase section label, the grouped card(s) under it, and an optional note. */
export function SettingsSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.colors.textMuted,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.medium,
          letterSpacing: 0.8,
          paddingHorizontal: theme.spacing.sm,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {children}
      {note ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.caption,
            lineHeight: theme.font.size.caption * 1.4,
            paddingHorizontal: theme.spacing.sm,
          }}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** A rounded card. Rows inside it are separated by hairlines aligned to their labels. */
export function SettingsCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View
              style={{ height: 1, marginLeft: theme.spacing.lg + 28 + theme.spacing.md, backgroundColor: theme.colors.border }}
            />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One settings row: an icon, a label (and optional subtitle), and what sits on the right
 * (a value, a control, an accessory, a chevron). With onPress the row is a button. `wide` gives
 * the right side the remaining width (for sliders and swatches). `children` show below the row
 * (an expanded explanation). The label never breaks inside a word: the right side is sized to
 * its content and the label column takes what is left.
 */
export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  control,
  accessory,
  chevron,
  expanded,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  wide,
  children,
}: {
  icon?: IconName;
  label: string;
  subtitle?: string;
  value?: string;
  control?: ReactNode;
  accessory?: ReactNode;
  chevron?: boolean;
  expanded?: boolean;
  onPress?: () => void;
  /** Spoken label for a pressable row; defaults to the label, value and subtitle. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const rowStyle = {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  };

  const main = (
    <>
      <View style={{ width: 28, alignItems: "center" }}>
        {icon ? <Ionicons name={icon} size={22} color={theme.colors.text} /> : null}
      </View>
      <View style={wide ? { flexShrink: 0 } : { flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>{label}</Text>
        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              lineHeight: theme.font.size.caption * 1.35,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          flexGrow: wide ? 1 : 0,
          flexShrink: wide ? 1 : 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: theme.spacing.sm,
        }}
      >
        {control}
        {value ? (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.body,
              textAlign: "right",
            }}
          >
            {value}
          </Text>
        ) : null}
        {accessory}
        {onPress && chevron ? (
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={18}
            color={theme.colors.textMuted}
          />
        ) : null}
      </View>
    </>
  );

  return (
    <View>
      {onPress ? (
        <PressScale
          onPress={onPress}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ?? [label, value, subtitle].filter(Boolean).join(", ")
          }
          accessibilityHint={accessibilityHint}
          accessibilityState={{ expanded }}
          style={rowStyle}
        >
          {main}
        </PressScale>
      ) : (
        <View accessible={!control && !accessory} style={rowStyle}>
          {main}
        </View>
      )}
      {children ? (
        <View
          style={{
            paddingLeft: theme.spacing.lg + 28 + theme.spacing.md,
            paddingRight: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
