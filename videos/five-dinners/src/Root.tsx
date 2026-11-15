import { Composition } from "remotion";
import { DURATION_S, FPS } from "./brand";
import { Film } from "./Film";
import { ScreenCheck } from "./ScreenCheck";

export function Root() {
  return (
    <>
      <Composition id="FiveDinnersVertical" component={Film} width={1080} height={1920} fps={FPS} durationInFrames={DURATION_S * FPS} defaultProps={{ layout: "vertical" as const }} />
      <Composition id="FiveDinnersLandscape" component={Film} width={1920} height={1080} fps={FPS} durationInFrames={DURATION_S * FPS} defaultProps={{ layout: "landscape" as const }} />
      {/* The four recreated screens at 1 px per point, to compare against the app's captures. */}
      <Composition id="ScreenCheck" component={ScreenCheck} width={440 * 4 + 60} height={956} fps={FPS} durationInFrames={1} />
    </>
  );
}
