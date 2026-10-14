/*
 * Verifies the built SVGs in a real browser and writes screenshots for review.
 *
 * Per file:
 *  - frame fidelity: the SVG inlined in a page, paused at several times, against the showcase
 *    building the same animation and paused at the same times (pixel diff, count of pixels off)
 *  - direct-load frames, <img> load after the full duration, reduced-motion render
 *  - ignition: end frame against the PNG lockup, 1:1
 *  - loaders: frame at t=0 against the frame one and two periods later
 *
 * Usage: node verify.mjs [svgDir] [screenshotDir]
 * Defaults: assets/motion/svg, and a folder under the OS temp directory for screenshots.
 */
import { launchChromium } from "./launch.mjs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SVG_DIR = path.resolve(process.argv[2] ?? path.join(here, "../../assets/motion/svg"));
const SHOTS = path.resolve(process.argv[3] ?? path.join(tmpdir(), "ixean-animated-svg-verify"));
const SHOWCASE = pathToFileURL(path.resolve(here, "../../motion/ixean-logo-motion.html")).href;
const LOGOS = path.resolve(here, "../..");

const BG = { dark: "#121212", light: "#F4F6F8" };
const PNG = { dark: "hori-combo mark white electric cyan.png", light: "hori-combo mark obsidian deep cyan.png" };
const FUZZ = "10%";
const WAIT_PAD_MS = 600;
const IGNITION_MS = 4500;
const IGNITION_FRAMES = [0, 700, 1500, 2250, 3000, 3800, IGNITION_MS];
const LOOP_MS = { circuit: 2400, rotor: 1200, handshake: 3000 };
const LOOP_FRACTIONS = [0, 0.2, 0.4, 0.6, 0.8];
const SCALE = { ignition: 0.5, loader: 0.6 };
const CLIP_PAD = 500;
const CLIP_SCALE = 0.5;
const CLIP_STEPS = { ignition: 180, loader: 60 };
const IDLE_MS = 4000;
const MASTER = { w: 2822, h: 1440 };

let normalBrowser;
let reducedBrowser;
const sh = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });
const pct = (n, w, h) => `${((n / (w * h)) * 100).toFixed(3)}%`;

/* magick compare prints "<scaled> (<pixel count>)" on stderr and exits 1 when it is not zero. */
function diffPixels(a, b) {
  const r = sh("magick", ["compare", "-metric", "AE", "-fuzz", FUZZ, a, b, "null:"]);
  const n = Number.parseFloat(/\(([\d.e+-]+)\)/.exec(r.stderr)?.[1]);
  if (Number.isNaN(n)) throw new Error(`compare failed: ${r.stderr}`);
  return n;
}

function parse(file, svgText) {
  const m = /^ixean-(ignition-loop|ignition|loader-(circuit|rotor|handshake))-on-(dark|light)\.svg$/.exec(file);
  const vb = /viewBox="([^"]+)"/.exec(svgText)[1].split(" ").map(Number);
  return { kind: m[1].startsWith("loader") ? "loader" : "ignition", loop: m[2], mode: m[3], withIdle: m[1] === "ignition-loop", vb };
}

/* Render box that keeps the file's viewBox, at the scale used for comparisons. */
function frameBox(info) {
  const [, , w, h] = info.vb;
  const s = SCALE[info.kind];
  return { w: w * s, h: h * s, vb: info.vb.join(" ") };
}

/* Pause and set the time, then let two frames pass so a pending pause cannot move the hold time. */
const seek = (page, t) => page.evaluate(async (ms) => {
  document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, t);
const seekShowcase = (page, t) => page.evaluate(async (ms) => {
  window.__tl.anims.forEach((a) => { a.pause(); a.currentTime = ms; });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, t);

/* The SVG inlined and sized like the showcase host, so only the animation can differ. */
async function inlinePage(browser, file, info, box) {
  const svg = await readFile(path.join(SVG_DIR, file), "utf8");
  const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
  await page.setContent(`<!doctype html><body style="margin:0;background:${BG[info.mode]}">${svg}</body>`);
  await page.evaluate(({ w, h }) => {
    document.querySelector("svg").style.cssText = `display:block;width:${w}px;height:${h}px`;
  }, box);
  return page;
}

async function showcasePage(browser, info, box) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(SHOWCASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ mode, kind, loopKind, box }) => {
    const host = document.createElement("div");
    host.className = `lp ${mode}`;
    host.style.cssText = `position:fixed;left:0;top:0;z-index:99999;padding:0;display:block;width:${box.w}px;height:${box.h}px`;
    document.body.append(host);
    const tl = new Timeline();
    let svg;
    if (kind === "ignition") {
      buildIgnition(host, tl);
      svg = host.querySelector("svg");
    } else {
      svg = svgEl(LOADER_VB, loaderMarkup(loopKind, LOGO, uid("ld")), "ld");
      host.append(svg);
      animateLoader(loopKind, svg, tl);
    }
    svg.setAttribute("viewBox", box.vb);
    svg.style.cssText = `display:block;width:${box.w}px;height:${box.h}px;position:static`;
    window.__tl = tl;
  }, { mode: info.mode, kind: info.kind, loopKind: info.loop, box });
  return page;
}

async function frameFidelity(browser, file, info, times, report) {
  const box = frameBox(info);
  const mine = await inlinePage(browser, file, info, box);
  const ref = await showcasePage(browser, info, box);
  const clip = { x: 0, y: 0, width: box.w, height: box.h };
  const parts = [];
  for (const t of times) {
    await seek(mine, t);
    await seek(mine, t);
    await seekShowcase(ref, t);
    await seekShowcase(ref, t);
    const a = path.join(SHOTS, `${file}.inline.${t}.png`);
    const b = path.join(SHOTS, `${file}.showcase.${t}.png`);
    await mine.screenshot({ path: a, clip });
    await ref.screenshot({ path: b, clip });
    parts.push(`${t}ms:${diffPixels(a, b)}`);
  }
  await Promise.all([mine.close(), ref.close()]);
  report.push(`${file} inline vs showcase, px off of ${box.w * box.h} (fuzz ${FUZZ}): ${parts.join(" ")}`);
}

async function directFrames(browser, file, info, times) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 520 } });
  await page.goto(pathToFileURL(path.join(SVG_DIR, file)).href);
  await page.evaluate((bg) => { document.documentElement.style.background = bg; }, BG[info.mode]);
  const out = {};
  for (const [name, t] of Object.entries(times)) {
    await seek(page, t);
    await seek(page, t);
    out[name] = path.join(SHOTS, `${file}.${name}.png`);
    await page.screenshot({ path: out[name] });
  }
  await page.close();
  return out;
}

/* Emulated reduced motion does not reach SVG images, so reduced runs use a browser started with Chromium's force flag. */
async function imgShot(file, info, { reduced, waitMs, omitBackground = false, width }) {
  const ctx = await (reduced ? reducedBrowser : normalBrowser).newContext({ viewport: { width: 2400, height: 1000 } });
  const page = await ctx.newPage();
  const tag = `${reduced ? "reduced" : "img"}${omitBackground ? ".alpha" : ""}`;
  const html = path.join(SHOTS, `${file}.${tag}.html`);
  const bg = omitBackground ? "transparent" : BG[info.mode];
  await writeFile(html, `<!doctype html><body style="margin:0;background:${bg}"><img src="${pathToFileURL(path.join(SVG_DIR, file)).href}" style="display:block;width:${width}px"></body>`);
  await page.goto(pathToFileURL(html).href);
  await page.waitForTimeout(waitMs);
  const p = path.join(SHOTS, `${file}.${tag}.png`);
  await page.screenshot({ path: p, clip: await page.locator("img").boundingBox(), omitBackground });
  await ctx.close();
  return p;
}

/* Place the 1:1 render on the master canvas and compare with the transparent PNG lockup. */
async function pngCompare(file, info, report) {
  const [vx, vy, vw] = info.vb;
  const alpha = await imgShot(file, info, { reduced: true, waitMs: WAIT_PAD_MS, omitBackground: true, width: vw });
  const base = path.join(SHOTS, `${file}.master`);
  const canvas = (src, at, out) => sh("magick", ["-size", `${MASTER.w}x${MASTER.h}`, `canvas:${BG[info.mode]}`, src, "-geometry", at, "-composite", out]);
  canvas(alpha, `+${vx}+${vy}`, `${base}.svg.png`);
  canvas(path.join(LOGOS, PNG[info.mode]), "+0+0", `${base}.png.png`);
  const n = diffPixels(`${base}.svg.png`, `${base}.png.png`);
  report.push(`${file} end frame vs ${PNG[info.mode]} (1:1): ${n} px off of ${MASTER.w * MASTER.h} (${pct(n, MASTER.w, MASTER.h)})`);
}

/* Frame times that cover every phase of the file's animation. */
function clipTimes(info) {
  const span = info.kind === "ignition" ? IGNITION_MS + (info.withIdle ? IDLE_MS : 0) : LOOP_MS[info.loop];
  return Array.from({ length: CLIP_STEPS[info.kind] + 1 }, (_, i) => (i / CLIP_STEPS[info.kind]) * span);
}

/*
 * Render with the viewBox widened by CLIP_PAD on every side, overlay all sampled frames and find
 * where any pixel is visible. Content outside the real viewBox would be clipped in use.
 */
async function clipCheck(browser, file, info, report) {
  const [x, y, w, h] = info.vb;
  const s = CLIP_SCALE;
  const wide = [x - CLIP_PAD, y - CLIP_PAD, w + 2 * CLIP_PAD, h + 2 * CLIP_PAD];
  const [pw, ph] = [Math.ceil(wide[2] * s), Math.ceil(wide[3] * s)];
  const svg = await readFile(path.join(SVG_DIR, file), "utf8");
  const page = await browser.newPage({ viewport: { width: pw, height: ph } });
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${svg}</body>`);
  await page.evaluate(({ vb, pw, ph }) => {
    const el = document.querySelector("svg");
    el.setAttribute("viewBox", vb);
    el.style.cssText = `display:block;width:${pw}px;height:${ph}px`;
  }, { vb: wide.join(" "), pw, ph });
  const dir = path.join(SHOTS, `clip-${file}`);
  await mkdir(dir, { recursive: true });
  const frames = [];
  for (const [i, t] of clipTimes(info).entries()) {
    await seek(page, t);
    await seek(page, t);
    frames.push(path.join(dir, `${i}.png`));
    await page.screenshot({ path: frames[i], omitBackground: true });
  }
  await page.close();
  const merged = path.join(dir, "all.png");
  sh("magick", [...frames, "-evaluate-sequence", "max", merged]);
  const trim = sh("magick", [merged, "-alpha", "extract", "-threshold", "0", "-format", "%@", "info:"]).stdout;
  const [, tw, th, tx, ty] = /(\d+)x(\d+)\+(\d+)\+(\d+)/.exec(trim).map(Number);
  const ext = [wide[0] + tx / s, wide[1] + ty / s, wide[0] + (tx + tw) / s, wide[1] + (ty + th) / s];
  const room = [ext[0] - x, ext[1] - y, x + w - ext[2], y + h - ext[3]].map((n) => Math.round(n));
  const verdict = room.some((n) => n < 0) ? "CLIPPED" : "no clipping";
  report.push(`${file} visible extent x ${ext[0].toFixed(0)}..${ext[2].toFixed(0)} y ${ext[1].toFixed(0)}..${ext[3].toFixed(0)}; room left/top/right/bottom ${room.join("/")} units: ${verdict}`);
}

async function verifyIgnition(browser, file, info, report) {
  await frameFidelity(browser, file, info, IGNITION_FRAMES, report);
  const frames = await directFrames(browser, file, info, { t0: 0, mid: IGNITION_MS / 2, end: IGNITION_MS });
  const { w: width } = frameBox(info);
  const img = await imgShot(file, info, { reduced: false, waitMs: IGNITION_MS + WAIT_PAD_MS, width });
  const reduced = await imgShot(file, info, { reduced: true, waitMs: WAIT_PAD_MS, width });
  const endRef = path.join(SHOTS, `${file}.showcase.${IGNITION_MS}.png`);
  report.push(`${file} <img> after ${IGNITION_MS + WAIT_PAD_MS}ms vs showcase end: ${diffPixels(img, endRef)} px off`);
  report.push(`${file} reduced-motion <img> vs showcase end: ${diffPixels(reduced, endRef)} px off; vs img-end ${diffPixels(reduced, img)}; direct t0 vs end ${diffPixels(frames.t0, frames.end)} px`);
  if (!info.withIdle) await pngCompare(file, info, report);
}

async function verifyLoader(browser, file, info, report) {
  const T = LOOP_MS[info.loop];
  await frameFidelity(browser, file, info, LOOP_FRACTIONS.map((f) => f * T), report);
  const frames = await directFrames(browser, file, info, { t0: 0, mid: T / 4, period: T, period2: T * 2 });
  await imgShot(file, info, { reduced: false, waitMs: T + WAIT_PAD_MS, width: frameBox(info).w });
  await imgShot(file, info, { reduced: true, waitMs: WAIT_PAD_MS, width: frameBox(info).w });
  report.push(`${file} loop ${T}ms: t0 vs 1 period ${diffPixels(frames.t0, frames.period)} px, vs 2 periods ${diffPixels(frames.t0, frames.period2)} px, vs quarter ${diffPixels(frames.t0, frames.mid)} px`);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  normalBrowser = await launchChromium();
  reducedBrowser = await launchChromium(["--force-prefers-reduced-motion"]);
  const report = [];
  const files = (await readdir(SVG_DIR)).filter((f) => f.endsWith(".svg")).sort();
  for (const file of files) {
    const info = parse(file, await readFile(path.join(SVG_DIR, file), "utf8"));
    report.push(`${file}: ${(await stat(path.join(SVG_DIR, file))).size} bytes, viewBox ${info.vb.join(" ")}`);
    if (info.mode === "dark") await clipCheck(normalBrowser, file, info, report);
    if (info.kind === "ignition") await verifyIgnition(normalBrowser, file, info, report);
    else await verifyLoader(normalBrowser, file, info, report);
  }
  await Promise.all([normalBrowser.close(), reducedBrowser.close()]);
  console.log(report.join("\n"));
  if (report.some((l) => l.includes("CLIPPED"))) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
