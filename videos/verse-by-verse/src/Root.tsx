import { Composition } from "remotion";
import { DURATION_S, FPS } from "./brand";
import { Film } from "./Film";

export function Root() {
  return (
    <>
      <Composition id="VerseFilmVertical" component={Film} width={1080} height={1920} fps={FPS} durationInFrames={DURATION_S * FPS} defaultProps={{ layout: "vertical" as const }} />
      <Composition id="VerseFilmLandscape" component={Film} width={1920} height={1080} fps={FPS} durationInFrames={DURATION_S * FPS} defaultProps={{ layout: "landscape" as const }} />
    </>
  );
}
