import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, type ComponentProps } from "react";
import { Animated, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { PressScale, haptic, useReducedMotion } from "../motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * A large tappable choice for an onboarding question: a leading icon or badge, a title and a hint,
 * and a check that marks the selected row. The row springs a little when it becomes selected and
 * takes the primary border, so the choice is clear without a second card around it.
 */
export function OptionRow({
  selected,
  title,
  hint,
  icon,
  badge,
  onPress,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  icon?: IconName;
  badge?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const bounce = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (wasSelected.current === selected) return;
    wasSelected.current = selected;
    if (!selected || reduced) return;
    bounce.setValue(0.94);
    const spring = Animated.spring(bounce, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 14,
    });
    spring.start();
    return () => spring.stop();
  }, [selected, reduced, bounce]);

  return (
    <PressScale
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      accessibilityState={{ checked: selected }}
      style={{
        minHeight: 64,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.primary,
        shadowOpacity: selected ? 0.35 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: selected ? 3 : 0,
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          transform: [{ scale: bounce }],
        }}
      >
        {badge ? (
          <View
            style={{
              minWidth: 44,
              height: 44,
              paddingHorizontal: theme.spacing.xs,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
                fontVariant: ["tabular-nums"],
              }}
            >
              {badge}
            </Text>
          </View>
        ) : icon ? (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name={icon} size={24} color={theme.colors.primary} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
          {hint ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
              {hint}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={selected ? theme.colors.primary : theme.colors.border}
        />
      </Animated.View>
    </PressScale>
  );
}
