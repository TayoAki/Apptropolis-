// Fonts load before any frame renders, so frame 0 never shows a fallback face.
import { continueRender, delayRender, staticFile } from "remotion";

const faces: Array<[string, string, FontFaceDescriptors]> = [
  ["Gelasio", "fonts/Gelasio-Variable.woff2", { weight: "400 700", style: "normal" }],
  ["Gelasio", "fonts/Gelasio-Italic.woff2", { weight: "400", style: "italic" }],
  ["Inter", "fonts/Inter-Regular.otf", { weight: "400" }],
  ["Inter", "fonts/Inter-Medium.otf", { weight: "500" }],
  ["Inter", "fonts/Inter-SemiBold.otf", { weight: "600" }],
  ["Inter", "fonts/Inter-Bold.otf", { weight: "700" }],
  ["Ionicons", "fonts/Ionicons.ttf", { weight: "400" }],
];

const handle = delayRender("Loading fonts");
Promise.all(
  faces.map(([family, file, desc]) => new FontFace(family, `url(${staticFile(file)})`, desc).load()),
)
  .then((loaded) => {
    loaded.forEach((face) => document.fonts.add(face));
    continueRender(handle);
  })
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
