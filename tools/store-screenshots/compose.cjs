// Composes App Store screenshots from captures of the real app: a background, a two-line headline
// with one accent word, a line under it, the capture inside a plain phone frame (our own dark
// rim; no Apple bezel) with a drawn status bar and home indicator, and optionally one part of the
// screen shown bigger (a callout cut from the same capture). Writes both iPhone sizes, flattened
// to RGB (no alpha):
//   6.9/  1320 x 2868      6.5/  1284 x 2778
//
// Usage: node compose.cjs <spec.json> [only-file-prefix]
// spec.json: {
//   "out": "<dir>",                      // folder that gets 6.9/ and 6.5/
//   "theme": { "bgTop", "bgBottom", "text", "muted", "accent", "pill"?, "onPill"? },
//   "shots": [{
//     "file": "01-ask-before-you-buy",
//     "headline": ["Ask before", "you *buy*"],   // two lines; *word* takes the accent color
//     "sub": "One or two short lines.",
//     "capture": "<png from capture-lib shoot()>",
//     "pill": "Plus",                           // optional badge above the headline (Premium)
//     "callout": { "crop": [x, y, w, h], "scale": 1.3 }  // optional, in app points (440 x 868)
//   }]
// }
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { SCREEN, APP_VIEW } = require("./capture-lib.cjs");

const SIZES = [
  { slot: "6.9", width: 1320, height: 2868 },
  { slot: "6.5", width: 1284, height: 2778 },
];

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const accent = (line) => esc(line).replace(/\*([^*]+)\*/g, "<em>$1</em>");

function html(shot, theme, size, captureUrl) {
  const s = size.width / 1320;
  const screenW = 990 * s;
  const k = screenW / SCREEN.width; // px per app point
  const rim = 30 * s;
  const screenH = SCREEN.height * k;
  const phoneW = screenW + rim * 2;
  const phoneH = screenH + rim * 2;
  const phoneTop = size.height - phoneH - 40 * s;
  const headTop = 120 * s;
  const statusH = SCREEN.statusBar * k;
  const appH = APP_VIEW.height * k;
  const homeH = SCREEN.homeIndicator * k;
  let callout = "";
  if (shot.callout) {
    const [x, y, w, h] = shot.callout.crop;
    const scale = shot.callout.scale ?? 1.3;
    const cw = w * k * scale;
    const ch = h * k * scale;
    const cx = (size.width - phoneW) / 2 + rim + (x + w / 2) * k;
    const cy = phoneTop + rim + statusH + (y + h / 2) * k;
    const left = Math.min(Math.max(cx - cw / 2, 36 * s), size.width - cw - 36 * s);
    const top = cy - ch / 2;
    callout = `<div class="callout" style="left:${left}px;top:${top}px;width:${cw}px;height:${ch}px;
      background-image:url('${captureUrl}');background-size:${SCREEN.width * k * scale}px auto;
      background-position:${-x * k * scale}px ${-y * k * scale}px"></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  body{width:${size.width}px;height:${size.height}px;overflow:hidden;position:relative;
    background:linear-gradient(175deg,${theme.bgTop} 0%,${theme.bgBottom} 100%);
    font-family:"Inter Display","Inter",sans-serif;-webkit-font-smoothing:antialiased}
  .head{position:absolute;top:${headTop}px;left:${80 * s}px;right:${80 * s}px;text-align:center}
  .pill{display:inline-block;margin-bottom:${26 * s}px;padding:${12 * s}px ${30 * s}px;border-radius:999px;
    background:${theme.pill ?? theme.accent};color:${theme.onPill ?? "#fff"};font:700 ${36 * s}px/1 "Inter";letter-spacing:${1 * s}px}
  h1{margin:0;color:${theme.text};font-weight:800;font-size:${124 * s}px;line-height:1.04;letter-spacing:${-2.5 * s}px}
  h1 em{font-style:normal;color:${theme.accent}}
  h1,p{text-wrap:balance}
  p{margin:${30 * s}px auto 0;max-width:${1060 * s}px;color:${theme.muted};font:500 ${46 * s}px/1.3 "Inter"}
  .phone{position:absolute;left:${(size.width - phoneW) / 2}px;top:${phoneTop}px;width:${phoneW}px;height:${phoneH}px;
    box-sizing:border-box;padding:${rim}px;border-radius:${150 * s}px;background:#111214;
    box-shadow:0 ${50 * s}px ${110 * s}px rgba(0,0,0,.28),inset 0 0 0 ${4 * s}px #34353a}
  .screen{width:${screenW}px;height:${screenH}px;border-radius:${122 * s}px;overflow:hidden;background:#fff}
  .status{height:${statusH}px;display:flex;align-items:center;justify-content:space-between;
    padding:${8 * k}px ${34 * k}px 0 ${44 * k}px;box-sizing:border-box;font:600 ${17 * k}px/1 "Inter"}
  .icons{display:flex;gap:${6 * k}px;align-items:center}
  img.app{display:block;width:${screenW}px;height:${appH}px}
  .home{height:${homeH}px;display:flex;align-items:center;justify-content:center}
  .home i{display:block;width:${139 * k}px;height:${5 * k}px;border-radius:${3 * k}px}
  .callout{position:absolute;border-radius:${30 * s}px;background-repeat:no-repeat;
    box-shadow:0 ${30 * s}px ${80 * s}px rgba(0,0,0,.30),0 0 0 ${5 * s}px rgba(255,255,255,.9)}
  </style></head><body>
  <div class="head">
    ${shot.pill ? `<div class="pill">${esc(shot.pill)}</div>` : ""}
    <h1>${shot.headline.map(accent).join("<br>")}</h1>
    ${shot.sub ? `<p>${esc(shot.sub)}</p>` : ""}
  </div>
  <div class="phone"><div class="screen">
    <div class="status" id="status"><span>9:41</span><span class="icons">
      <svg width="${18 * k}" height="${12 * k}" viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
      <svg width="${16 * k}" height="${12 * k}" viewBox="0 0 16 12"><path fill="currentColor" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.6c.6 0 1.1.2 1.5.6L8 11.6 6.5 10c.4-.4.9-.6 1.5-.6z"/></svg>
      <svg width="${27 * k}" height="${13 * k}" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="currentColor" opacity=".45"/></svg>
    </span></div>
    <img class="app" id="app" src="${captureUrl}">
    <div class="home" id="home"><i id="bar"></i></div>
  </div></div>
  ${callout}
  <script>
  // The status bar and home strip take the colors at the top and bottom of the capture, so they
  // continue the app's own header and tab bar; icons go dark or light for contrast.
  window.ready = new Promise((resolve) => {
    const img = document.getElementById("app");
    const go = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
      const top = px(Math.round(c.width * 0.5), 2), bottom = px(Math.round(c.width * 0.02), c.height - 2);
      const lum = ([r, gg, b]) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const rgb = (p) => "rgb(" + p.slice(0, 3).join(",") + ")";
      const status = document.getElementById("status");
      status.style.background = rgb(top);
      status.style.color = lum(top) > 140 ? "#111" : "#fff";
      document.getElementById("home").style.background = rgb(bottom);
      document.getElementById("bar").style.background = lum(bottom) > 140 ? "#111" : "#fff";
      resolve();
    };
    img.complete ? go() : img.onload = go;
  });
  </script></body></html>`;
}

async function main() {
  const specPath = path.resolve(process.argv[2]);
  const only = process.argv[3];
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const base = path.dirname(specPath);
  const out = path.resolve(base, spec.out);
  const browser = await chromium.launch();
  const written = [];
  for (const size of SIZES) {
    fs.mkdirSync(path.join(out, size.slot), { recursive: true });
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    for (const shot of spec.shots) {
      if (only && !shot.file.startsWith(only)) continue;
      const capture = path.resolve(base, shot.capture);
      const dataUrl = "data:image/png;base64," + fs.readFileSync(capture).toString("base64");
      await page.setContent(html(shot, spec.theme, size, dataUrl), { waitUntil: "load" });
      await page.evaluate(() => window.ready);
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(out, size.slot, `${shot.file}.png`);
      await page.screenshot({ path: file, fullPage: false });
      written.push(file);
    }
    await page.close();
  }
  await browser.close();
  // Flatten to RGB: App Store Connect refuses images with an alpha channel.
  execFileSync("python3", ["-c", `
import sys
from PIL import Image
for f in sys.argv[1:]:
    Image.open(f).convert("RGB").save(f, optimize=True)
`, ...written]);
  console.log(written.map((f) => path.relative(process.cwd(), f)).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
