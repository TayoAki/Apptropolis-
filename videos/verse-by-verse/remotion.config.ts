import { Config } from "@remotion/cli/config";

// Render with Playwright's headless shell when Remotion's own can't be downloaded:
//   --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-linux/chrome-headless-shell
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
