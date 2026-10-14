// ffmpeg / ImageMagick wrappers. Every encoder reads a numbered PNG sequence (f%05d.png) captured at `fps`.
import { spawn } from "node:child_process";
import { link, mkdir, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const STDERR_TAIL = 1500;
const BSDTAR = join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe");

export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}\n${err.slice(-STDERR_TAIL)}`));
    });
  });
}

const ffmpeg = (args) => run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
const input = (dir, fps) => ["-framerate", String(fps), "-i", join(dir, "f%05d.png")];

/* Frames are sRGB; convert with the BT.709 matrix and tag the stream so players decode the same colours. */
const BT709 = "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+bicubic";
const BT709_FRAME = "setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv";
const BT709_TAGS = ["-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709", "-color_range", "tv"];

/* Keep every `step`-th frame so decimation is exact and loops stay seamless. */
const decimate = (step, outFps) => `select='not(mod(n\\,${step}))',setpts=N/${outFps}/TB`;

/* H.264 High, 8-bit 4:2:0, CRF 18, faststart. https://trac.ffmpeg.org/wiki/Encode/H.264 */
export function encodeMp4(dir, fps, out) {
  return ffmpeg([
    ...input(dir, fps), "-vf", `${BT709},format=yuv420p,${BT709_FRAME}`,
    "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18", "-x264-params", "aq-mode=3",
    "-pix_fmt", "yuv420p", ...BT709_TAGS, "-r", String(fps), "-movflags", "+faststart", out,
  ]);
}

/* VP9 with alpha. auto-alt-ref 0 is required for alpha. https://trac.ffmpeg.org/wiki/Encode/VP9 */
export function encodeWebmAlpha(dir, fps, out) {
  return ffmpeg([
    ...input(dir, fps), "-vf", `format=rgba,${BT709},format=yuva420p,${BT709_FRAME}`,
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-auto-alt-ref", "0",
    "-row-mt", "1", "-cpu-used", "2", ...BT709_TAGS, "-r", String(fps), out,
  ]);
}

/* ProRes 4444 with 16-bit alpha, Apple vendor tag, from frames captured at `fps` (step 1) or decimated. */
export function encodeProres(dir, fps, out, { step = 1 } = {}) {
  const outFps = fps / step;
  const filters = [step > 1 ? decimate(step, outFps) : null, `format=rgba,${BT709},format=yuva444p10le,${BT709_FRAME}`].filter(Boolean);
  return ffmpeg([
    ...input(dir, fps), "-vf", filters.join(","),
    "-c:v", "prores_ks", "-profile:v", "4", "-vendor", "apl0", "-alpha_bits", "16", "-pix_fmt", "yuva444p10le",
    ...BT709_TAGS, "-r", String(outFps), out,
  ]);
}

/* GIF matted on the brand background (frames are already solid). Global palette from full stats keeps the
   flat brand colours exact. Loops forever. https://ffmpeg.org/ffmpeg-filters.html#palettegen */
export function encodeGif(dir, fps, out, { width, outFps }) {
  const vf = `${decimate(fps / outFps, outFps)},scale=${width}:-1:flags=lanczos,split[a][b];`
    + `[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
  return ffmpeg([...input(dir, fps), "-filter_complex", vf, "-loop", "0", out]);
}

/* Animated WebP with alpha. Colour is premultiplied around the downscale so transparent black does not
   bleed into edges. https://ffmpeg.org/ffmpeg-codecs.html#libwebp */
export function encodeWebp(dir, fps, out, { width, outFps, quality }) {
  const vf = `${decimate(fps / outFps, outFps)},format=gbrap,premultiply=inplace=1,scale=${width}:-1:flags=lanczos,`
    + `unpremultiply=inplace=1,format=rgba`;
  return ffmpeg([
    ...input(dir, fps), "-vf", vf, "-c:v", "libwebp_anim", "-lossless", "0", "-quality", String(quality),
    "-compression_level", "6", "-loop", "0", out,
  ]);
}

/* Lossless recompress of one PNG (the capture uses fast, large PNGs). */
export function optimizePng(src, out) {
  return run("magick", [src, "-strip", "-define", "png:compression-level=9", out]);
}

/* Zip the whole sequence under release names. Windows bsdtar writes zip with -a. */
export async function zipSequence(dir, prefix, out) {
  const staging = join(dir, "seq");
  await mkdir(staging, { recursive: true });
  const frames = (await readdir(dir)).filter((f) => /^f\d{5}\.png$/.test(f)).sort();
  await Promise.all(frames.map((f, i) => link(join(dir, f), join(staging, `${prefix}-${String(i).padStart(5, "0")}.png`))));
  const names = (await readdir(staging)).sort();
  await run(BSDTAR, ["-a", "-cf", out, "-C", staging, ...names]);
  return basename(out);
}
