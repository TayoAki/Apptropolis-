// A still of the four recreated screens side by side, in their filmed end states, for checking
// against five-dinners/store/screenshots/captures/*.png. Not part of the film.
import { AbsoluteFill } from "remotion";
import "./fonts";
import { CookScreen, ShopScreen, WeekScreen } from "./ui/screens";

export function ScreenCheck() {
  return (
    <AbsoluteFill style={{ background: "#888", flexDirection: "row", gap: 20 }}>
      <WeekScreen week={1} />
      <ShopScreen onions={1} spinach={1} />
      <CookScreen cooked={1} bars={1} />
      <WeekScreen week={2} />
    </AbsoluteFill>
  );
}
