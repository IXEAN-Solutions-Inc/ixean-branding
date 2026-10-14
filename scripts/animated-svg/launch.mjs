import { chromium } from "playwright";

/* Set CHROMIUM_PATH to a Chromium binary when the one Playwright expects is not installed. */
export function launchChromium(args = []) {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args });
}
