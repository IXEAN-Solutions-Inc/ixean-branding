// Deterministic frame capture for motion/ixean-logo-motion.html.
//
// The showcase file is never edited. Each capture loads it from file:///, injects a harness
// (isolation CSS, theme attributes, a manual rAF clock for loader L4), pauses every Web Animation of the
// target and steps them by assigning currentTime. Screenshots go through CDP Page.captureScreenshot
// (https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot), which accepts
// optimizeForSpeed; transparency uses Emulation.setDefaultBackgroundColorOverride with alpha 0.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "..", "..", "..");
export const SHOWCASE_URL = pathToFileURL(join(REPO_ROOT, "motion", "ixean-logo-motion.html")).href;

const IO_SETTLE_MS = 400;
/* The showcase LOADER_VB crops tight to the mark. This square leaves room for ping and rotor overshoot
   (mark centre 518,716; handshake pings reach 168 units from a ring centre). */
const LOADER_FRAME_VB = "-32 166 1100 1100";

export async function launchBrowser() {
  return chromium.launch({ headless: true });
}

/* Page-side harness. Runs in the browser, so it cannot use anything from this module.
   Replaces rAF and performance.now so loader L4 draws at exactly the frame time the harness sets; the real rAF
   stays reachable as __nativeRaf for waiting on paint. */
const MANUAL_CLOCK = () => {
  let now = 0;
  let nextId = 0;
  const pending = new Map();
  window.__nativeRaf = window.requestAnimationFrame.bind(window);
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { pending.set(++nextId, cb); return nextId; };
  window.cancelAnimationFrame = (id) => { pending.delete(id); };
  window.__stepClock = (t) => {
    now = t;
    const due = [...pending.values()];
    pending.clear();
    due.forEach((cb) => cb(t));
  };
};

function isolationCss(mode, bg) {
  const base = mode === "alpha" ? "transparent" : bg;
  return `
    html, body, body * { background: none !important; }
    html { background: ${base} !important; color-scheme: normal !important; }
    body { overflow: hidden !important; }
    .__cap-target {
      position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
      max-width: none !important; margin: 0 !important; border: 0 !important; padding: 0 !important;
      aspect-ratio: auto !important; z-index: 2147483647 !important;
    }
    .__cap-ancestor { border: 0 !important; padding: 0 !important; box-shadow: none !important; }
    .__cap-target .stage-meta, .__cap-target .progress { display: none !important; }
  `;
}

/* Hide every sibling along the path from the target to <body>, strip ancestor borders, mark the target. */
function isolate({ selector }) {
  const target = document.querySelector(selector);
  if (!target) throw new Error(`capture target not found: ${selector}`);
  for (let el = target; el !== document.body; el = el.parentElement) {
    if (el !== target) el.classList.add("__cap-ancestor");
    for (const sib of el.parentElement.children) {
      if (sib !== el && !["SCRIPT", "STYLE", "LINK"].includes(sib.tagName)) sib.style.display = "none";
    }
  }
  target.classList.add("__cap-target");
}

function targetSelector(spec) {
  if (spec.kind === "stage") return `[data-stage="${spec.anim}"] .stage`;
  const panel = spec.art === "dark" ? ".lp.dark" : ".lp.light";
  return `[data-loader="${spec.anim}"] ${panel} .tile.s96 svg`;
}

/* Collect the target's animations, drop the idle loop on stages, and freeze everything at t = 0. */
function freezeAnimations({ selector, kind }) {
  const target = document.querySelector(selector);
  if (kind === "stage") target.closest("[data-stage]").querySelector("[data-replay]").click();
  const anims = document.getAnimations().filter((a) => a.effect && a.effect.target && target.contains(a.effect.target));
  const kept = [];
  anims.forEach((a) => {
    if (kind === "stage" && a.effect.getTiming().iterations === Infinity) { a.cancel(); return; }
    a.pause();
    kept.push(a);
  });
  window.__capAnims = kept;
  return kept.length;
}

/* Loader svgs: detaching and reattaching discards cached paint state. Without it the L4 clip-path rect leaves
   anti-aliasing differences that depend on the previous frame. Stages skip it: removing a stage retriggers its
   IntersectionObserver, which would restart the cancelled idle loop. */
function seek({ t, repaint }) {
  window.__capAnims.forEach((a) => { a.currentTime = t; });
  if (window.__stepClock) window.__stepClock(t);
  if (!repaint) return;
  const target = document.querySelector(".__cap-target");
  const parent = target.parentNode;
  const next = target.nextSibling;
  target.remove();
  parent.insertBefore(target, next);
}

export async function openCapture(browser, spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: spec.dsf ?? 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.route("**/*", (route) => (route.request().url().startsWith("file:") ? route.continue() : route.abort()));
  if (spec.anim === "progress") await page.addInitScript(MANUAL_CLOCK);
  await page.goto(SHOWCASE_URL, { waitUntil: "load" });

  const bg = await page.evaluate(({ art }) => {
    const root = document.documentElement;
    root.dataset.theme = art;
    root.dataset.logo = "color";
    return getComputedStyle(root).getPropertyValue("--bg").trim();
  }, { art: spec.art });
  await page.addStyleTag({ content: isolationCss(spec.mode, bg) });

  const selector = targetSelector(spec);
  await page.evaluate(isolate, { selector });
  if (spec.kind === "loader") await page.evaluate(({ selector: s, vb }) => document.querySelector(s).setAttribute("viewBox", vb), { selector, vb: LOADER_FRAME_VB });
  await page.waitForTimeout(IO_SETTLE_MS);
  const animCount = await page.evaluate(freezeAnimations, { selector, kind: spec.kind });

  const cdp = await context.newCDPSession(page);
  if (spec.mode === "alpha") await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  /* CDP ignores deviceScaleFactor unless the clip carries it as scale. */
  const clip = { x: 0, y: 0, width: spec.width, height: spec.height, scale: spec.dsf ?? 1 };

  const frame = async (index) => {
    await page.evaluate(seek, { t: (index * 1000) / spec.fps, repaint: spec.kind === "loader" });
    await page.evaluate(() => {
      const raf = window.__nativeRaf ?? window.requestAnimationFrame.bind(window);
      return new Promise((r) => raf(() => raf(r)));
    });
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true, clip });
    return Buffer.from(data, "base64");
  };
  return { frame, animCount, close: () => context.close() };
}

export const frameName = (i) => `f${String(i).padStart(5, "0")}.png`;
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/* Writes frames 0..frames-1 to dir. Re-renders a middle frame at the end and throws if it differs. */
export async function captureSequence(browser, spec, dir, frames, onProgress = () => {}) {
  await mkdir(dir, { recursive: true });
  const cap = await openCapture(browser, spec);
  try {
    const probe = Math.floor(frames / 2);
    let probeHash = "";
    for (let i = 0; i < frames; i++) {
      const buf = await cap.frame(i);
      if (i === probe) probeHash = sha(buf);
      await writeFile(join(dir, frameName(i)), buf);
      if (i % 30 === 0) onProgress(i, frames);
    }
    const again = sha(await cap.frame(probe));
    if (again !== probeHash) throw new Error(`nondeterministic frame ${probe} in ${spec.anim}/${spec.art}/${spec.mode}`);
    return { animCount: cap.animCount };
  } finally {
    await cap.close();
  }
}
