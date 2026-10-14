/*
 * Builds the standalone animated SVGs in assets/motion/svg/ from the motion showcase.
 *
 * Loads motion/ixean-logo-motion.html in Chromium, builds each logo animation with the showcase's
 * own builders, reads the Web Animations back (extract.mjs) and writes them out as CSS @keyframes
 * inside a self-contained SVG: no script, no external references, no fonts.
 *
 * Usage: node build.mjs [outDir]
 */
import { launchChromium } from "./launch.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { extractInPage } from "./extract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOWCASE = path.resolve(here, "../../motion/ixean-logo-motion.html");
const OUT_DIR = path.resolve(process.argv[2] ?? path.join(here, "../../assets/motion/svg"));

/*
 * Frames are the visible extent over every animation frame, measured by clipCheck in verify.mjs,
 * plus a few units of margin. Ignition spans x 102-2564, y 167-1275 in the 2822x1440 master (bloom
 * to the left, pings top and bottom, the wordmark scan line to the right).
 */
const IGNITION_VB = "88 156 2492 1130";
const IGNITION_SIZE = [1000, 453.4];
/* The showcase loader frame, which hugs the mark. L3 pings reach past it, so it gets a wider frame at the same scale. */
const LOADER_VB = "240 240 560 960";
const LOADER_SIZE = [56, 96];
const LOADER_PING_VB = "224 216 592 1008";
const LOADER_PING_SIZE = [59.2, 100.8];

const LOADERS = [
  { kind: "circuit", name: "circuit loop", viewBox: LOADER_VB, size: LOADER_SIZE },
  { kind: "rotor", name: "rotor spin", viewBox: LOADER_VB, size: LOADER_SIZE },
  { kind: "handshake", name: "handshake", viewBox: LOADER_PING_VB, size: LOADER_PING_SIZE },
];
const MODES = [
  { suffix: "on-dark", mode: "dark" },
  { suffix: "on-light", mode: "light" },
];

function variants() {
  const list = [];
  for (const { suffix, mode } of MODES) {
    const ignition = { kind: "ignition", mode, viewBox: IGNITION_VB, size: IGNITION_SIZE, label: "IXEAN Autonomous Systems" };
    list.push({
      ...ignition, idle: false, file: `ixean-ignition-${suffix}.svg`, prefix: `ix-ig-${mode[0]}`,
      title: "IXEAN logo, ignition reveal",
    });
    list.push({
      ...ignition, idle: true, file: `ixean-ignition-loop-${suffix}.svg`, prefix: `ix-igl-${mode[0]}`,
      title: "IXEAN logo, ignition reveal with idle pulse",
    });
    for (const { kind, name, viewBox, size } of LOADERS) {
      list.push({
        kind, mode, idle: true, viewBox, size, file: `ixean-loader-${kind}-${suffix}.svg`,
        prefix: `ix-${kind}-${mode[0]}`, title: `IXEAN loader, ${name}`, label: "Loading",
      });
    }
  }
  return list;
}

const cssNum = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(3)));
const percent = (offset) => `${cssNum(offset * 100)}%`;

function keyframesCss(frames) {
  const body = frames.map((f, i) => {
    const decls = Object.entries(f.decl).map(([p, v]) => `${p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${v}`);
    if (f.easing && i < frames.length - 1) decls.push(`animation-timing-function:${f.easing.replace(/, /g, ",")}`);
    return `${percent(f.offset)}{${decls.join(";")}}`;
  });
  return body.join("");
}

function staticRules(p, kind) {
  if (kind === "ignition") return "";
  return `.${p} .b{opacity:1}.${p} .x{display:none}`;
}

function buildCss(prefix, kind, groups) {
  const names = new Map();
  const frameBlocks = [];
  const nameFor = (frames) => {
    const body = keyframesCss(frames);
    if (!names.has(body)) {
      names.set(body, `${prefix}-k${names.size + 1}`);
      frameBlocks.push(`@keyframes ${names.get(body)}{${body}}`);
    }
    return names.get(body);
  };
  const rules = groups.map((g) => {
    const anims = g.list.map(({ timing: t, frames }) => (
      `${nameFor(frames)} ${cssNum(t.duration)}ms linear ${cssNum(t.delay)}ms ${t.iterations} ${t.direction} both`
    ));
    const box = g.fillBox ? "transform-box:fill-box;transform-origin:center;" : "";
    return `.${prefix} .${g.cls}{${box}animation:${anims.join(",")}}`;
  });
  const reduced = `@media (prefers-reduced-motion:reduce){.${prefix},.${prefix} *{animation:none!important}${staticRules(prefix, kind)}}`;
  return [...frameBlocks, ...rules, reduced].join("");
}

function assemble(v, { markup, groups }) {
  const css = buildCss(v.prefix, v.kind, groups);
  return markup
    .replace(/\b(?:ig|ld)\d+-/g, `${v.prefix}-`)
    .replace("/*CSS*/", css)
    .concat("\n");
}

async function main() {
  const browser = await launchChromium();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(pathToFileURL(SHOWCASE).href, { waitUntil: "domcontentloaded" });
  await mkdir(OUT_DIR, { recursive: true });
  for (const v of variants()) {
    const extracted = await page.evaluate(extractInPage, v);
    const svg = assemble(v, extracted);
    await writeFile(path.join(OUT_DIR, v.file), svg);
    console.log(`${v.file}\t${Buffer.byteLength(svg)} bytes`);
  }
  await browser.close();
  if (consoleErrors.length) throw new Error(`showcase page errors: ${consoleErrors.join("; ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
