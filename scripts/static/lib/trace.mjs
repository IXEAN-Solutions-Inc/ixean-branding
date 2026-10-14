import { join } from 'node:path';
import potrace from 'potrace';
import { ROOT } from './config.mjs';
import { magick } from './tools.mjs';

const { Potrace } = potrace;

// Method from docs/motion-showcase.md "Regenerating the paths".
const TRACE_PARAMS = { turdSize: 20, optTolerance: 0.4, alphaMax: 0.9, threshold: 128, blackOnWhite: true };
// Obsidian has G=18 and deep cyan has G=95 in the source PNGs; split halfway.
const ACCENT_GREEN_MIN = 56;
const SOLID_ALPHA = 128;
const RING_COUNT = 4;

function readRaster(path) {
  const [width, height] = magick(['identify', '-format', '%w %h', path]).toString().split(' ').map(Number);
  const rgba = magick([path, '-depth', '8', 'rgba:-']);
  return { width, height, rgba };
}

// Coverage (0-255) per class. PNG RGB is not premultiplied, so edge pixels keep their class colour.
function splitCoverage({ width, height, rgba }) {
  const dark = new Uint8Array(width * height);
  const accent = new Uint8Array(width * height);
  for (let i = 0; i < dark.length; i += 1) {
    const alpha = rgba[i * 4 + 3];
    if (alpha === 0) continue;
    if (rgba[i * 4 + 1] > ACCENT_GREEN_MIN) accent[i] = alpha;
    else dark[i] = alpha;
  }
  return { dark, accent };
}

function tracePath(coverage, width, height) {
  const bitmap = Buffer.from(coverage.map((value) => 255 - value));
  const png = magick(['-size', `${width}x${height}`, '-depth', '8', 'gray:-', 'png:-'], bitmap);
  return new Promise((resolve, reject) => {
    const tracer = new Potrace(TRACE_PARAMS);
    tracer.loadImage(png, (error) => {
      if (error) return reject(error);
      const match = /\sd="([^"]+)"/.exec(tracer.getPathTag());
      if (!match) return reject(new Error('potrace returned no path data'));
      return resolve(match[1]);
    });
  });
}

// Bounding box and farthest-point radius (about the box centre) of all pixels at least half covered.
function measureArtwork(dark, accent, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (dark[i] < SOLID_ALPHA && accent[i] < SOLID_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let farthest = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const i = y * width + x;
      if (dark[i] < SOLID_ALPHA && accent[i] < SOLID_ALPHA) continue;
      // pixel corner farthest from the centre, so the radius never under-reports
      const dx = Math.abs(x + 0.5 - cx) + 0.5;
      const dy = Math.abs(y + 0.5 - cy) + 0.5;
      farthest = Math.max(farthest, Math.hypot(dx, dy));
    }
  }
  return { box, farthest };
}

// Enclosed empty regions of the dark layer (ring holes and letter counters), largest first.
function findHoles(dark, width, height) {
  const solid = (i) => dark[i] >= SOLID_ALPHA;
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);

  function fill(start) {
    const region = { area: 0, minX: width, maxX: 0, minY: height, maxY: 0 };
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const i = stack[--top];
      const x = i % width;
      const y = (i - x) / width;
      region.area += 1;
      region.minX = Math.min(region.minX, x);
      region.maxX = Math.max(region.maxX, x);
      region.minY = Math.min(region.minY, y);
      region.maxY = Math.max(region.maxY, y);
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const next of neighbours) {
        if (next < 0 || seen[next] || solid(next)) continue;
        seen[next] = 1;
        stack[top++] = next;
      }
    }
    return region;
  }

  for (let x = 0; x < width; x += 1) {
    for (const i of [x, (height - 1) * width + x]) if (!seen[i] && !solid(i)) fill(i);
  }
  for (let y = 0; y < height; y += 1) {
    for (const i of [y * width, y * width + width - 1]) if (!seen[i] && !solid(i)) fill(i);
  }
  const holes = [];
  for (let i = 0; i < seen.length; i += 1) {
    if (!seen[i] && !solid(i)) holes.push(fill(i));
  }
  return holes.sort((a, b) => b.area - a.area);
}

// Outer diameter of a ring: dark run along the hole's centre row. Stems join above or below, not beside.
function ringOuterDiameter(hole, dark, width) {
  const row = ((hole.minY + hole.maxY) >> 1) * width;
  let left = hole.minX - 1;
  while (left >= 0 && dark[row + left] >= SOLID_ALPHA) left -= 1;
  let right = hole.maxX + 1;
  while (right < width && dark[row + right] >= SOLID_ALPHA) right += 1;
  return right - (left + 1);
}

const round1 = (value) => Math.round(value * 10) / 10;

export async function traceLockup(lockup) {
  const source = join(ROOT, lockup.source);
  const raster = readRaster(source);
  const { width, height } = raster;
  const { dark, accent } = splitCoverage(raster);
  const { box, farthest } = measureArtwork(dark, accent, width, height);
  const ringDiameters = findHoles(dark, width, height)
    .slice(0, RING_COUNT)
    .map((hole) => ringOuterDiameter(hole, dark, width));
  if (ringDiameters.length < RING_COUNT) throw new Error(`${lockup.id}: found fewer than ${RING_COUNT} ring holes`);
  const darkD = await tracePath(dark, width, height);
  const accentD = lockup.hasTagline ? await tracePath(accent, width, height) : null;
  return {
    id: lockup.id,
    source: lockup.source,
    canvas: { width, height },
    viewBox: box,
    darkD,
    accentD,
    ringDiameters,
    R: round1(ringDiameters.reduce((sum, d) => sum + d, 0) / ringDiameters.length),
    farthest: round1(farthest),
  };
}
