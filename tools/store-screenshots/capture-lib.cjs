// Capture helpers for store screenshots: the real app's web build at an iPhone 6.9" screen's
// size (440 x 956 points at 3x). The status bar (54 pt) and home indicator (34 pt) are drawn by
// compose.cjs, so the app is captured at 440 x 868: the space a real iPhone gives the app between
// its safe areas. Text renders in Inter (close to iOS's system font) and serif text in Charter.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SCREEN = { width: 440, height: 956, statusBar: 54, homeIndicator: 34 };
const APP_VIEW = { width: SCREEN.width, height: SCREEN.height - SCREEN.statusBar - SCREEN.homeIndicator };

// Map the web build's system and serif font stacks to installed faces that read like iOS.
const FONT_CSS = [
  ["Inter", 100, "Inter Thin"], ["Inter", 300, "Inter Light"], ["Inter", 400, "Inter"],
  ["Inter", 500, "Inter Medium"], ["Inter", 600, "Inter SemiBold"], ["Inter", 700, "Inter Bold"],
  ["Inter", 800, "Inter ExtraBold"], ["Inter", 900, "Inter Black"],
]
  .flatMap(([, weight, face]) =>
    ["-apple-system", "BlinkMacSystemFont", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Helvetica", "Arial"].map(
      (family) => `@font-face{font-family:"${family}";font-weight:${weight};src:local("${face}");}`,
    ),
  )
  .concat(
    ["Georgia", "Times New Roman", "serif"].flatMap((family) => [
      `@font-face{font-family:"${family}";font-weight:400;src:local("Bitstream Charter"),local("Charter");}`,
      `@font-face{font-family:"${family}";font-weight:700;src:local("Bitstream Charter Bold"),local("Charter Bold");}`,
    ]),
  )
  .join("\n");

/** Serve a static web build with SPA fallback. Returns { url, close }. */
function serve(dir, port) {
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".lottie": "application/zip", ".wasm": "application/wasm" };
  const server = http.createServer((req, res) => {
    let f = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) f = fs.existsSync(f + ".html") ? f + ".html" : path.join(dir, "index.html");
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(port, () => resolve({ url: `http://localhost:${port}`, close: () => server.close() })),
  );
}

/**
 * A browser context sized like the app area of a 6.9" iPhone, at 3x. Options:
 * colorScheme ("light" | "dark"), clock (a Date for page.clock.install), storage (an object of
 * localStorage key -> string set before the app loads), timezone.
 */
async function phone({ colorScheme = "light", clock, storage, timezoneId = "America/Chicago" } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: APP_VIEW.width, height: APP_VIEW.height },
    deviceScaleFactor: 3,
    colorScheme,
    timezoneId,
    locale: "en-US",
    hasTouch: true,
  });
  await context.addInitScript(
    ({ css, storage }) => {
      if (storage) for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
      const add = () => {
        const style = document.createElement("style");
        style.textContent = css + "\n*{-webkit-font-smoothing:antialiased;} ::-webkit-scrollbar{display:none;}";
        document.head.appendChild(style);
      };
      if (document.head) add();
      else document.addEventListener("DOMContentLoaded", add);
    },
    { css: FONT_CSS, storage },
  );
  const page = await context.newPage();
  if (clock) await page.clock.install({ time: clock });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { browser, context, page, errors };
}

/** Screenshot the app area (440 x 868 pt at 3x = 1320 x 2604 px) after fonts and images settle. */
async function shoot(page, file) {
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(600);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: "disabled", caret: "hide" });
  return file;
}

module.exports = { SCREEN, APP_VIEW, FONT_CSS, serve, phone, shoot };
