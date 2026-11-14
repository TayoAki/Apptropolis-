import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { Theme } from "../theme/types";
import { useTheme } from "../theme/ThemeProvider";
import { Appear, haptic, PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The app's type system has two faces with fixed jobs. The serif names a place: screen titles,
 * section headings and navigation-bar titles. The system sans does everything else (labels,
 * body, buttons, prices and order numbers, which need lining tabular figures).
 */
export const DISPLAY_FONT: string =
  Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia, 'Times New Roman', serif",
  }) ?? "serif";

/**
 * Space to the right of a navigation bar's own button. The native bars add their own margin;
 * the web bar sets the button flush against the edge.
 */
export const HEADER_EDGE = Platform.OS === "web" ? 16 : 0;

/** The title style for a navigation bar (Checkout, Order, Settings). */
export function navTitleStyle(theme: Theme) {
  return {
    fontFamily: DISPLAY_FONT,
    fontWeight: theme.font.weight.regular,
    fontSize: theme.font.size.title,
    color: theme.colors.text,
  };
}

/** The one big title at the top of a screen, in the display face. */
export function ScreenTitle({
  children,
  align = "left",
  numberOfLines,
  style,
}: {
  children: ReactNode;
  align?: "left" | "center";
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={numberOfLines}
      style={[
        {
          color: theme.colors.text,
          fontFamily: DISPLAY_FONT,
          fontSize: theme.font.size.headline,
          fontWeight: theme.font.weight.regular,
          lineHeight: 34,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** A raised card on the screen's background. */
export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A section heading in the display face, with an optional text action on the right. `flush`
 * drops the built-in space above it, for a heading inside a column that already has a gap.
 */
export function SectionTitle({
  title,
  actionLabel,
  onAction,
  flush = false,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  flush?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.md,
        marginTop: flush ? 0 : theme.spacing.lg,
        marginBottom: theme.spacing.sm,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          flex: 1,
          color: theme.colors.text,
          fontFamily: DISPLAY_FONT,
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.regular,
          lineHeight: 28,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          onPress={onAction}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The main call to action on a screen. Springs when pressed and taps the phone lightly. When
 * disabled it turns neutral instead of fading, so its label stays readable.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const ink = disabled ? theme.colors.textMuted : theme.colors.onPrimary;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.94}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        {
          minHeight: 50,
          borderRadius: theme.radius.pill,
          backgroundColor: disabled ? theme.colors.surfaceAlt : theme.colors.primary,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={ink} /> : null}
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

/** The quieter partner of PrimaryButton: an outlined pill for the second action in a pair. */
export function SecondaryButton({
  label,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        minHeight: 50,
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={theme.colors.primary} /> : null}
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: theme.colors.primary,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {label}
      </Text>
    </PressScale>
  );
}

/** A selectable pill, such as a return reason or an option in a question. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ink = selected ? theme.colors.onPrimary : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={ink} /> : null}
      <Text
        style={{
          flexShrink: 1,
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A short message about a problem or a blocked feature, inside a card or under a control: an
 * icon in the status color and the words in the normal text color, so it is never color alone.
 */
export function InlineNotice({
  tone = "warning",
  icon,
  children,
  live = false,
  style,
}: {
  tone?: "warning" | "danger" | "success";
  icon?: IconName;
  children: ReactNode;
  /** Announce the message to screen readers when it appears (errors). */
  live?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const glyph: IconName =
    icon ??
    (tone === "danger"
      ? "alert-circle-outline"
      : tone === "success"
        ? "checkmark-circle-outline"
        : "information-circle-outline");
  return (
    <View
      accessibilityRole={live ? "alert" : undefined}
      accessibilityLiveRegion={live ? "polite" : undefined}
      style={[{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }, style]}
    >
      <Ionicons name={glyph} size={20} color={theme.colors[tone]} style={{ marginTop: 1 }} />
      <Text
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          lineHeight: 22,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** What a list or screen shows when there is nothing yet, with the next action. */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <Appear>
      <View
        style={{
          alignItems: "center",
          padding: theme.spacing.xl,
          gap: theme.spacing.sm,
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: theme.spacing.xs,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          <Ionicons name={icon} size={32} color={theme.colors.primary} />
        </View>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: DISPLAY_FONT,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.regular,
            lineHeight: 28,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.font.size.body,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
        {actionLabel && onAction ? (
          <View style={{ alignSelf: "stretch", marginTop: theme.spacing.md }}>
            <PrimaryButton label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
      </View>
    </Appear>
  );
}

/**
 * True once `loading` has lasted longer than `after` milliseconds. The data layer never reports
 * a failed request (the screen would shimmer forever), so a long wait is treated as a problem
 * the person can see and retry. If the data still arrives, this goes back to false.
 */
export function useStalled(loading: boolean, after = 10_000): boolean {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!loading) {
      setStalled(false);
      return;
    }
    const timer = setTimeout(() => setStalled(true), after);
    return () => clearTimeout(timer);
  }, [loading, after]);
  return stalled;
}

/**
 * Wraps a screen so it can be loaded again: `onRetry` remounts the screen, which makes its data
 * hooks ask for their data afresh.
 */
export function withRetry<P extends object>(
  Screen: ComponentType<P & { onRetry: () => void }>,
): ComponentType<P> {
  return function Retryable(props: P) {
    const [attempt, setAttempt] = useState(0);
    return <Screen key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
  };
}

/** What a screen shows when its data hasn't arrived after a long wait. */
export function LoadProblem({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Still loading"
      body="This is taking longer than it should. Check your connection, then try again."
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}
