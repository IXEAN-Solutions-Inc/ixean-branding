import { formatViewBox, logoPaths } from './svg.mjs';

const NS = 'http://www.w3.org/2000/svg';
const num = (value) => Number(value.toFixed(3));

// One SVG canvas with an optional solid background and logos nested at `box` positions.
// Each item is { geom, variant, box: { x, y, w, h } }; the box must match the logo's aspect ratio.
export function canvasSvg({ width, height, bg = null, items }) {
  const background = bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : '';
  const placed = items.map(
    ({ geom, variant, box }) =>
      `<svg x="${num(box.x)}" y="${num(box.y)}" width="${num(box.w)}" height="${num(box.h)}" ` +
      `viewBox="${formatViewBox(geom.viewBox)}">${logoPaths(geom, variant)}</svg>`,
  );
  return `<svg xmlns="${NS}" viewBox="0 0 ${width} ${height}">${background}${placed.join('')}</svg>`;
}

// Pixel size of a lockup scaled so `size` is its width (axis "w") or height (axis "h").
export function sizeFor(geom, axis, size) {
  const { w, h } = geom.viewBox;
  return axis === 'w'
    ? { width: size, height: Math.round((size * h) / w) }
    : { width: Math.round((size * w) / h), height: size };
}

// Canvas of `size` px along `axis` holding the lockup with 1R clear space on every side.
export function paddedCanvas(geom, axis, size) {
  const { w, h } = geom.viewBox;
  const pad = geom.R;
  const scale = size / ((axis === 'w' ? w : h) + 2 * pad);
  const width = axis === 'w' ? size : Math.round((w + 2 * pad) * scale);
  const height = axis === 'h' ? size : Math.round((h + 2 * pad) * scale);
  return { width, height, box: { x: pad * scale, y: pad * scale, w: w * scale, h: h * scale } };
}

export function centeredBox(geom, canvas, scale) {
  const w = geom.viewBox.w * scale;
  const h = geom.viewBox.h * scale;
  return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
}

// Largest scale at which the lockup fits inside maxW x maxH.
export const fitScale = (geom, maxW, maxH) => Math.min(maxW / geom.viewBox.w, maxH / geom.viewBox.h);

// Scale at which every artwork pixel lies inside a circle of this diameter about the box centre.
export const circleScale = (geom, diameter) => diameter / 2 / geom.farthest;
