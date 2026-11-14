import { View } from "react-native";
import { Mascot } from "./motion";

/** The mascot's poses, by what they show. */
export const DASH_POSE = {
  sharp: "dash-game-day-sharp",
  steady: "dash-match-ready",
  flat: "dash-heavy-legs",
} as const;

/**
 * The mascot as decoration. It is hidden from screen readers because its built-in label is the
 * pose's file name ("dash-match-ready", "dash-game-day-sharp"), which would be read out as a
 * claim about the person. What the pose stands for is always said in the text beside it.
 */
export function Dash({ pose, size }: { pose: keyof typeof DASH_POSE; size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Mascot pose={DASH_POSE[pose]} size={size} />
    </View>
  );
}
