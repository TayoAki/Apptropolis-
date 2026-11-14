// The platform's <Lottie> inside a box of exactly its size. On the web the animation's own
// element can stretch across a row and squeeze the text beside it to one letter per line; the
// box keeps it to `size` by `size` on every platform.
import { View } from "react-native";
import { Lottie, type LottieName } from "./lottie";

export function LottieBox({
  name,
  size,
  color,
  onFinish,
}: {
  name: LottieName;
  size: number;
  color?: string;
  onFinish?: () => void;
}) {
  return (
    <View style={{ width: size, height: size, flexShrink: 0, overflow: "hidden" }}>
      <Lottie name={name} size={size} color={color} onFinish={onFinish} />
    </View>
  );
}
