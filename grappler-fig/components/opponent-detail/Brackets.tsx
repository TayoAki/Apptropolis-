// Four corner brackets framing a positioned parent. Decorative: it never takes touches.
import { View } from "react-native";

export function Brackets({
  color,
  size = 10,
  inset = 3,
  thickness = 2,
}: {
  color: string;
  /** Length of each bracket arm (pt). */
  size?: number;
  /** Distance from the parent's edges (pt). */
  inset?: number;
  thickness?: number;
}) {
  const arm = { position: "absolute" as const, width: size, height: size, borderColor: color };
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <View
        style={[
          arm,
          { top: inset, left: inset, borderTopWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        style={[
          arm,
          { top: inset, right: inset, borderTopWidth: thickness, borderRightWidth: thickness },
        ]}
      />
      <View
        style={[
          arm,
          { bottom: inset, left: inset, borderBottomWidth: thickness, borderLeftWidth: thickness },
        ]}
      />
      <View
        style={[
          arm,
          { bottom: inset, right: inset, borderBottomWidth: thickness, borderRightWidth: thickness },
        ]}
      />
    </View>
  );
}
