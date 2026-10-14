// WCAG 2.3.1 Three Flashes or Below Threshold, approximated on whole-frame mean relative luminance.
// https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
// A general flash is a pair of opposing relative-luminance changes of 10% or more of the maximum (1.0);
// more than three per second fails. The frame mean is a conservative proxy: it can only under-report a
// bright region, but the logo art covers a small part of the frame, so a region-level swing is bounded by it.
import { spawn } from "node:child_process";

export const FLASH_DELTA = 0.1;
export const FLASH_LIMIT_PER_SECOND = 3;
const SAMPLE_SIZE = 64;
const SRGB_LUT = Float64Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/* Mean relative luminance per frame, from a video downscaled by area averaging to SAMPLE_SIZE squared. */
export function frameLuminances(file) {
  const bytesPerFrame = SAMPLE_SIZE * SAMPLE_SIZE * 3;
  const args = ["-v", "error", "-i", file, "-vf", `scale=${SAMPLE_SIZE}:${SAMPLE_SIZE}:flags=area,format=rgb24`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"];
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) { reject(new Error(`ffmpeg ${code}: ${err}`)); return; }
      const raw = Buffer.concat(chunks);
      const frames = Math.floor(raw.length / bytesPerFrame);
      const out = new Float64Array(frames);
      for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (let p = f * bytesPerFrame; p < (f + 1) * bytesPerFrame; p += 3) {
          sum += 0.2126 * SRGB_LUT[raw[p]] + 0.7152 * SRGB_LUT[raw[p + 1]] + 0.0722 * SRGB_LUT[raw[p + 2]];
        }
        out[f] = sum / (SAMPLE_SIZE * SAMPLE_SIZE);
      }
      resolve(out);
    });
  });
}

/* Frame indices where the luminance has moved by FLASH_DELTA or more since the previous extreme. */
export function findSwings(series, delta = FLASH_DELTA) {
  const swings = [];
  let direction = 0;
  let extreme = series[0];
  for (let i = 1; i < series.length; i++) {
    const v = series[i];
    if (direction === 0 && Math.abs(v - extreme) >= delta) { direction = Math.sign(v - extreme); swings.push(i); extreme = v; continue; }
    if (direction > 0) {
      if (v > extreme) extreme = v;
      else if (extreme - v >= delta) { direction = -1; swings.push(i); extreme = v; }
    } else if (direction < 0) {
      if (v < extreme) extreme = v;
      else if (v - extreme >= delta) { direction = 1; swings.push(i); extreme = v; }
    }
  }
  return swings;
}

/* `loops` repeats the series once so a window that straddles the loop point is checked too. */
export function analyzeFlashes(series, fps, { loops = false } = {}) {
  const data = loops ? Float64Array.from([...series, ...series]) : series;
  const swings = findSwings(data);
  let worstWindow = 0;
  for (let i = 0; i < swings.length; i++) {
    const inWindow = swings.filter((s) => s >= swings[i] && s < swings[i] + fps).length;
    worstWindow = Math.max(worstWindow, inWindow);
  }
  let maxStep = 0;
  for (let i = 1; i < data.length; i++) maxStep = Math.max(maxStep, Math.abs(data[i] - data[i - 1]));
  return {
    frames: series.length,
    min: Math.min(...series),
    max: Math.max(...series),
    range: Math.max(...series) - Math.min(...series),
    maxStep,
    swings: swings.length,
    worstWindow,
    flagged: worstWindow > FLASH_LIMIT_PER_SECOND,
  };
}
