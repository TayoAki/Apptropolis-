// Bracket corners for onboarding panels: the viewfinder marks on option cards and the call to action.
import { View } from "react-native";

export function Corners({
  color,
  size = 12,
  inset = 8,
  thickness = 2,
}: {
  /** A theme color, e.g. theme.colors.textMuted. */
  color: string;
  size?: number;
  /** Distance from the panel's edges. */
  inset?: number;
  thickness?: number;
}) {
  const edge = {
    position: "absolute" as const,
    width: size,
    height: size,
    borderColor: color,
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={[edge, { top: inset, left: inset, borderTopWidth: thickness, borderLeftWidth: thickness }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { top: inset, right: inset, borderTopWidth: thickness, borderRightWidth: thickness }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { bottom: inset, left: inset, borderBottomWidth: thickness, borderLeftWidth: thickness }]}
      />
      <View
        pointerEvents="none"
        style={[edge, { bottom: inset, right: inset, borderBottomWidth: thickness, borderRightWidth: thickness }]}
      />
    </>
  );
}
