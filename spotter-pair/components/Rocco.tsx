import type { ComponentProps } from "react";
import { View } from "react-native";
import { Mascot } from "./motion";

/**
 * Rocco, the app's mascot. The platform's Mascot reads its pose's file name out loud
 * ("rocco-neutral-ready"), so this wrapper hides it from screen readers: Rocco sets the mood and
 * never carries information the text beside him doesn't.
 */
export function Rocco({ style, ...props }: ComponentProps<typeof Mascot>) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      <Mascot {...props} />
    </View>
  );
}
