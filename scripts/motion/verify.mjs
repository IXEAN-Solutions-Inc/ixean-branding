// Usage: node verify.mjs
// Checks the rendered outputs: ffprobe table, alpha survival, WCAG flash proxy, loader loop seams,
// fresh-session frame determinism, ignition end frame vs the static logo, and folder sizes.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";
import { REPO_ROOT, launchBrowser, openCapture } from "./lib/capture.mjs";
import { run } from "./lib/encode.mjs";
import { analyzeFlashes, frameLuminances } from "./lib/flash.mjs";
import { DIRS } from "./lib/jobs.mjs";

const WORK = join(tmpdir(), "ixean-motion-checks");
const LOOP_PERIOD_FRAMES = { circuit: 144, rotor: 72, handshake: 180, progress: 222 };
const FPS = 60;
const FRAME_FUZZ = "30%";
const HORI_VIEWBOX = { x: -342, y: -267, w: 3508, h: 1973 };
const STATIC_PNG = { dark: "hori-combo mark white electric cyan.png", light: "hori-combo mark obsidian deep cyan.png" };

const rel = (p) => relative(REPO_ROOT, p).replaceAll("\\", "/");
const heading = (t) => console.log(`\n== ${t}`);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

async function files(dir) {
  try { return (await readdir(dir)).sort().map((f) => join(dir, f)); } catch { return []; }
}

async function folderBytes(dir) {
  let total = 0;
  for (const f of await files(dir)) total += (await stat(f)).size;
  return total;
}

async function probeMedia(file) {
  const json = JSON.parse(await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_streams", "-show_format", "-of", "json", file]));
  const s = json.streams[0];
  return `${s.codec_name}${s.profile ? "/" + s.profile : ""} ${s.pix_fmt} ${s.width}x${s.height} ${s.r_frame_rate} ${Number(json.format.duration).toFixed(2)}s${s.tags?.alpha_mode ? " alpha_mode=" + s.tags.alpha_mode : ""}`;
}

async function probeAnimated(file) {
  const ident = (await run("magick", ["identify", "-format", "%w %h %T\n", file])).trim().split("\n");
  const [w, h] = ident[0].split(" ");
  const delayCs = ident.reduce((sum, l) => sum + Number(l.split(" ")[2]), 0);
  const bytes = await readFile(file);
  let loop = "n/a";
  if (extname(file) === ".gif") { const i = bytes.indexOf("NETSCAPE2.0"); loop = i < 0 ? "none" : String(bytes.readUInt16LE(i + 14)); }
  if (extname(file) === ".webp") { const i = bytes.indexOf("ANIM"); loop = i < 0 ? "none" : String(bytes.readUInt16LE(i + 12)); }
  const ms = extname(file) === ".webp" ? "" : ` ${(delayCs / 100).toFixed(2)}s`;
  return `${w}x${h} frames=${ident.length}${ms} loop=${loop} (0 = forever)`;
}

async function probeAll() {
  heading("ffprobe / identify");
  const dirs = [DIRS.video, DIRS.alpha, DIRS.gif, DIRS.webp, DIRS.poster, DIRS.masters];
  for (const dir of dirs) {
    for (const f of await files(dir)) {
      const ext = extname(f);
      let info;
      if ([".mp4", ".webm", ".mov"].includes(ext)) info = await probeMedia(f);
      else if ([".gif", ".webp"].includes(ext)) info = await probeAnimated(f);
      else if (ext === ".png") info = (await run("magick", ["identify", "-format", "%wx%h %[channels]", f])).trim();
      else info = `${(await run("C:/Windows/System32/tar.exe", ["-tf", f])).trim().split("\n").length} entries`;
      console.log(`${rel(f)}\n    ${info}`);
    }
  }
}

/* Decode a frame with the decoder that understands alpha, then read corner and peak alpha. */
async function alphaOf(file, decoder, name) {
  const png = join(WORK, `${name}.png`);
  const args = ["-y", "-v", "error", ...(decoder ? ["-c:v", decoder] : []), "-i", file, "-vf", "select=eq(n\\,40)", "-frames:v", "1", png];
  await run("ffmpeg", args);
  const out = await run("magick", [png, "-format", "corner_a=%[fx:p{4,4}.a] max_a=%[fx:maxima.a] opaque=%[opaque]", "info:"]);
  return out.trim();
}

async function checkAlpha() {
  heading("alpha survives (frame 40 decoded; corner_a must be 0, max_a > 0)");
  const targets = [
    [join(DIRS.alpha, "ixean-ignition-on-dark-1920x1080-60.webm"), "libvpx-vp9"],
    [join(DIRS.alpha, "ixean-ignition-on-light-1920x1080-60.webm"), "libvpx-vp9"],
    [join(DIRS.alpha, "ixean-loader-circuit-on-dark-512x512-60.webm"), "libvpx-vp9"],
    [join(DIRS.masters, "ixean-ignition-on-dark-1920x1080-30.mov"), null],
    [join(DIRS.masters, "ixean-ignition-on-light-3840x2160-30.mov"), null],
  ];
  for (const [file, decoder] of targets) {
    try { console.log(`${rel(file)}\n    ${await alphaOf(file, decoder, `alpha-${sha(Buffer.from(file)).slice(0, 8)}`)}`); } catch (err) { console.log(`${rel(file)}\n    FAIL ${err.message.split("\n")[0]}`); }
  }
  const webp = join(DIRS.webp, "ixean-ignition-on-dark-640x360-30.webp");
  console.log(`${rel(webp)}\n    ${(await run("magick", [`${webp}[20]`, "-format", "channels=%[channels] corner_a=%[fx:p{2,2}.a] max_a=%[fx:maxima.a]", "info:"])).trim()}`);
}

async function checkFlashes() {
  heading(`WCAG 2.3.1 flash proxy (frame-mean luminance; swing >= 0.10, flag if > 3 per ${FPS}-frame window)`);
  console.log("file | frames | lum min..max | range | max frame step | swings | worst/1s | verdict");
  for (const f of await files(DIRS.video)) {
    if (extname(f) !== ".mp4") continue;
    const looped = f.includes("loader");
    const r = analyzeFlashes(await frameLuminances(f), FPS, { loops: looped });
    console.log(`${rel(f).replace("assets/motion/video/", "")} | ${r.frames} | ${r.min.toFixed(3)}..${r.max.toFixed(3)} | ${r.range.toFixed(3)} | ${r.maxStep.toFixed(4)} | ${r.swings} | ${r.worstWindow} | ${r.flagged ? "FLAG" : "pass"}${looped ? " (loop wrap)" : ""}`);
  }
}

async function checkLoops(browser) {
  heading("loader loop seam: AE(frame 0, frame N) must be 0; neighbour step shown for scale");
  for (const [key, period] of Object.entries(LOOP_PERIOD_FRAMES)) {
    for (const art of ["dark", "light"]) {
      for (const mode of ["solid", "alpha"]) {
        const spec = { kind: "loader", anim: key, art, mode, width: 512, height: 512, dsf: 1, fps: FPS };
        const cap = await openCapture(browser, spec);
        const at = async (i) => { const p = join(WORK, `loop-${key}-${art}-${mode}-${i}.png`); await writeFile(p, await cap.frame(i)); return p; };
        const [first, second, last, wrap] = [await at(0), await at(1), await at(period - 1), await at(period)];
        await cap.close();
        const seam = await aeOf(first, wrap);
        console.log(`loader-${key} ${art} ${mode}: AE(first, frame ${period}) = ${seam}  [AE(first,second) = ${await aeOf(first, second)}, AE(last,first) = ${await aeOf(last, first)}]`);
      }
    }
  }
}

/* magick compare exits 1 when images differ and prints "scaled (count)" on stderr; return the pixel count. */
function aeOf(a, b, fuzz = "0%") {
  return new Promise((resolve) => {
    const c = spawn("magick", ["compare", "-metric", "AE", "-fuzz", fuzz, a, b, "null:"], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    c.stderr.on("data", (d) => { err += d; });
    c.on("close", () => resolve(Number(/\((\d+)\)/.exec(err)?.[1] ?? Number.NaN)));
  });
}

async function checkDeterminism(browser) {
  heading("frame determinism: same frame from two fresh page loads, byte-identical PNG");
  const specs = [
    { kind: "stage", anim: "ignition", art: "dark", mode: "solid", width: 1920, height: 1080, dsf: 1, fps: FPS, index: 150 },
    { kind: "stage", anim: "dispersal", art: "light", mode: "alpha", width: 1920, height: 1080, dsf: 1, fps: FPS, index: 100 },
    { kind: "loader", anim: "progress", art: "dark", mode: "solid", width: 512, height: 512, dsf: 1, fps: FPS, index: 90 },
    { kind: "loader", anim: "handshake", art: "light", mode: "solid", width: 512, height: 512, dsf: 1, fps: FPS, index: 70 },
  ];
  for (const spec of specs) {
    const hashes = [];
    for (let run = 0; run < 2; run++) {
      const cap = await openCapture(browser, spec);
      hashes.push(sha(await cap.frame(spec.index)));
      await cap.close();
    }
    console.log(`${spec.anim} ${spec.art} ${spec.mode} frame ${spec.index}: ${hashes[0] === hashes[1] ? "identical" : "DIFFERENT"} ${hashes[0].slice(0, 16)}`);
  }
}

/* The static PNG shares the traced path coordinates, so an affine map onto the 16:9 stage is exact. */
async function checkEndFrame() {
  heading(`ignition end frame vs static PNG lockup (AE with -fuzz ${FRAME_FUZZ}; edge anti-aliasing only expected)`);
  for (const art of ["dark", "light"]) {
    const poster = join(DIRS.poster, `ixean-ignition-on-${art}-1920x1080.png`);
    const bg = (await run("magick", [poster, "-format", "%[pixel:p{4,4}]", "info:"])).trim();
    const s = 1920 / HORI_VIEWBOX.w;
    const ox = -HORI_VIEWBOX.x * s;
    const oy = -HORI_VIEWBOX.y * s;
    const staticPath = join(WORK, `static-${art}.png`);
    await run("magick", ["-size", "1920x1080", `xc:${bg}`, "(", join(REPO_ROOT, STATIC_PNG[art]), "-background", bg, "-alpha", "remove", "-alpha", "off",
      "-virtual-pixel", "background", "-distort", "Affine", `0,0 ${ox},${oy} 2822,0 ${ox + 2822 * s},${oy} 0,1440 ${ox},${oy + 1440 * s}`, ")", "-compose", "over", "-composite", "-crop", "1920x1080+0+0", "+repage", staticPath]);
    const ae = await aeOf(poster, staticPath, FRAME_FUZZ);
    const total = 1920 * 1080;
    console.log(`${art}: AE=${ae} of ${total} px (${((Number(ae) / total) * 100).toFixed(3)}%)  poster=${rel(poster)}`);
    const crop = join(WORK, `endframe-${art}-sidebyside.png`);
    await run("magick", ["(", poster, "-crop", "1560x800+180+140", "+repage", ")", "(", staticPath, "-crop", "1560x800+180+140", "+repage", ")", "-append", "-resize", "60%", crop]);
    console.log(`  eyeball: ${crop.replaceAll("\\", "/")} (top animation end frame, bottom static PNG)`);
  }
}

async function reportSizes() {
  heading("bytes per folder");
  for (const dir of Object.values(DIRS)) {
    const list = await files(dir);
    console.log(`${rel(dir)}: ${list.length} files, ${(await folderBytes(dir)).toLocaleString("en-US")} bytes`);
  }
}

await rm(WORK, { recursive: true, force: true });
await mkdir(WORK, { recursive: true });
const browser = await launchBrowser();
try {
  await probeAll();
  await checkAlpha();
  await checkFlashes();
  await checkLoops(browser);
  await checkDeterminism(browser);
  await checkEndFrame();
  await reportSizes();
} finally {
  await browser.close();
}
