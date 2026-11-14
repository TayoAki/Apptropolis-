// The round clock for the Train screen: a monospaced countdown whose digits drop in as they change.
import { useLayoutEffect, useRef } from "react";
import { Animated, Easing, Platform, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useReducedMotion } from "../motion";

/** A monospaced face, so every digit takes the same width and the countdown never shifts. */
const CLOCK_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

/** One digit of the round clock. It drops in from above when its value changes. */
function FlipDigit({ char, size }: { char: string; size: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const drop = useRef(new Animated.Value(1)).current;
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reduced) {
      drop.setValue(1);
      return;
    }
    drop.setValue(0);
    const animation = Animated.timing(drop, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [char, reduced, drop]);

  const lift = size * 0.42;
  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-lift, 0] });
  const opacity = drop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  return (
    <View
      style={{
        width: size * 0.6,
        height: size * 1.1,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.Text
        style={{
          fontFamily: CLOCK_FONT,
          fontSize: size,
          lineHeight: size * 1.1,
          fontWeight: theme.font.weight.bold,
          color: theme.colors.text,
          transform: [{ translateY }],
          opacity,
        }}
      >
        {char}
      </Animated.Text>
    </View>
  );
}

/** A countdown such as "02:41", each digit flipping down as it changes. */
export function FlipClock({ value, size = 104 }: { value: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={`${value} left in this phase`}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
    >
      {Array.from(value).map((char, index) =>
        char === ":" ? (
          <Text
            key={index}
            style={{
              width: size * 0.3,
              textAlign: "center",
              fontFamily: CLOCK_FONT,
              fontSize: size,
              lineHeight: size * 1.1,
              fontWeight: theme.font.weight.bold,
              color: theme.colors.text,
            }}
          >
            :
          </Text>
        ) : (
          <FlipDigit key={index} char={char} size={size} />
        ),
      )}
    </View>
  );
}
