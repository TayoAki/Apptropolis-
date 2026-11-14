// Shop controls: the Style/Glow/Home/Pantry switch (also on Home), the in-stock filter chip, the
// wishlist heart and the per-card cart control (Add to cart, or an outlined "N in cart" tag).
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { SHOP_MODES, type ShopMode } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Lottie } from "../lottie";
import { PressScale, haptic, useReducedMotion } from "../motion";

/** The four shop modes as one segmented control; a pill glides under the chosen one. */
export function ModeSwitch({
  value,
  onChange,
}: {
  value: ShopMode;
  onChange: (mode: ShopMode) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const slots = useRef<Partial<Record<ShopMode, { x: number; width: number }>>>({});
  const placed = useRef(false);

  const glide = (key: ShopMode, animate: boolean) => {
    const slot = slots.current[key];
    if (!slot) return;
    if (!animate || reduced || !placed.current) {
      placed.current = true;
      x.setValue(slot.x);
      w.setValue(slot.width);
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: slot.x, useNativeDriver: false, speed: 16, bounciness: 6 }),
      Animated.spring(w, { toValue: slot.width, useNativeDriver: false, speed: 16, bounciness: 4 }),
    ]).start();
  };

  useEffect(() => {
    glide(value, true);
    // glide reads refs and animated values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: x,
          width: w,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      />
      {SHOP_MODES.map((mode) => {
        const selected = mode.key === value;
        return (
          <Pressable
            key={mode.key}
            accessibilityRole="tab"
            accessibilityLabel={mode.label}
            accessibilityState={{ selected }}
            hitSlop={4}
            onLayout={(event) => {
              const { x: slotX, width } = event.nativeEvent.layout;
              slots.current[mode.key] = { x: slotX, width };
              if (mode.key === value) glide(mode.key, false);
            }}
            onPress={() => {
              if (selected) return;
              haptic("selection");
              onChange(mode.key);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed && !selected ? 0.6 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.onPrimary : theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: selected ? theme.font.weight.bold : theme.font.weight.medium,
              }}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Outlined toggle: limits the list to products that can be bought now. Checked when on. */
export function InStockChip({
  selected,
  onPress,
}: {
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ink = selected ? theme.colors.primary : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="In stock only"
      accessibilityState={{ checked: selected }}
      hitSlop={6}
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      style={({ pressed }) => ({
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? theme.colors.primary : theme.colors.textMuted,
        backgroundColor: selected ? theme.colors.primary + "1F" : theme.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={selected ? "checkmark" : "pricetag-outline"} size={16} color={ink} />
      <Text
        style={{
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.medium,
        }}
      >
        In stock
      </Text>
    </Pressable>
  );
}

/** The heart: filled in the brand color when saved; a small heart burst plays on saving. */
export function WishlistButton({
  saved,
  name,
  onToggle,
}: {
  saved: boolean;
  name: string;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [burst, setBurst] = useState(0);
  const [playing, setPlaying] = useState(false);

  function press() {
    haptic("selection");
    if (!saved) {
      setBurst((n) => n + 1);
      setPlaying(true);
    }
    if (!reduced) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: saved ? 0.8 : 1.25,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
      ]).start();
    }
    onToggle();
  }

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      accessibilityState={{ selected: saved }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={saved ? "heart" : "heart-outline"}
          size={24}
          color={saved ? theme.colors.primary : theme.colors.textMuted}
        />
      </Animated.View>
      {playing ? (
        <View pointerEvents="none" style={{ position: "absolute", left: -6, top: -6 }}>
          <Lottie
            key={burst}
            name="heart"
            size={56}
            color={theme.colors.primary}
            onFinish={() => setPlaying(false)}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One cart control per card: a filled "Add to cart" pill when the product isn't in the cart,
 * and an outlined "N in cart" tag once it is (tapping the tag opens the cart).
 */
export function CartPill({
  name,
  quantity,
  onAdd,
  onOpenCart,
}: {
  name: string;
  quantity: number;
  onAdd: () => void;
  onOpenCart: () => void;
}) {
  const theme = useTheme();

  if (quantity > 0) {
    return (
      <Pressable
        onPress={onOpenCart}
        accessibilityRole="button"
        accessibilityLabel={`${quantity} of ${name} in cart. Review cart`}
        hitSlop={4}
        style={({ pressed }) => ({
          minHeight: 40,
          flexDirection: "row",
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          borderWidth: 1.5,
          borderColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.medium,
            fontVariant: ["tabular-nums"],
          }}
        >
          {quantity} in cart
        </Text>
      </Pressable>
    );
  }

  return (
    <PressScale
      onPress={onAdd}
      scaleTo={0.94}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`Add ${name} to cart`}
      style={{
        minHeight: 40,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.body,
          fontWeight: theme.font.weight.medium,
        }}
      >
        Add to cart
      </Text>
    </PressScale>
  );
}
