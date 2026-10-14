import { join } from 'node:path';
import { ROOT } from './config.mjs';
import { compareAE, magick, writeOut } from './tools.mjs';

const EDGE_BAND_PX = 3;
const FUZZ = '30%';

const geometry = ({ x, y, w, h }) => `${w}x${h}+${x}+${y}`;
const percent = (count, total) => Math.round((count / total) * 100000) / 1000;

// Count of differing pixels that sit farther than EDGE_BAND_PX from any source edge.
function offEdgeCount(srcAlpha, renderAlpha, tmp) {
  const band = EDGE_BAND_PX;
  magick([srcAlpha, renderAlpha, '-compose', 'Difference', '-composite', '-threshold', FUZZ, join(tmp, 'diff.png')]);
  magick([
    srcAlpha, '-threshold', '50%',
    '(', '+clone', '-morphology', 'Dilate', `Disk:${band}`, ')',
    '(', '-clone', '0', '-morphology', 'Erode', `Disk:${band}`, ')',
    '-delete', '0', '-compose', 'Difference', '-composite', join(tmp, 'band.png'),
  ]);
  const out = magick([
    join(tmp, 'diff.png'), '(', join(tmp, 'band.png'), '-negate', ')',
    '-compose', 'Multiply', '-composite', '-format', '%[fx:round(mean*w*h)]', 'info:',
  ]);
  return Number(out.toString());
}

// Renders the shipped SVG at source scale and diffs it against the source PNG crop.
// Alpha is compared per spec; the flattened-on-white colour compare also checks the dark/cyan split.
export async function checkFidelity({ lockup, geom, svg, renderer, tmp }) {
  const { w, h } = geom.viewBox;
  const source = join(ROOT, lockup.source);
  const crop = geometry(geom.viewBox);
  const rendered = writeOut(join(tmp, 'render.png'), await renderer.png(svg, w, h));

  magick([source, '-crop', crop, '+repage', '-alpha', 'extract', join(tmp, 'src-alpha.png')]);
  magick([rendered, '-alpha', 'extract', join(tmp, 'render-alpha.png')]);
  const alphaDiff = compareAE(join(tmp, 'src-alpha.png'), join(tmp, 'render-alpha.png'), FUZZ);
  const offEdge = offEdgeCount(join(tmp, 'src-alpha.png'), join(tmp, 'render-alpha.png'), tmp);

  const flatten = ['-background', 'white', '-alpha', 'remove', '-alpha', 'off'];
  magick([source, '-crop', crop, '+repage', ...flatten, join(tmp, 'src-flat.png')]);
  magick([rendered, ...flatten, join(tmp, 'render-flat.png')]);
  const colourDiff = compareAE(join(tmp, 'src-flat.png'), join(tmp, 'render-flat.png'), FUZZ);

  const pixels = w * h;
  return {
    pixels,
    alphaDiffering: alphaDiff,
    alphaDiffPercent: percent(alphaDiff, pixels),
    alphaOffEdge: offEdge,
    colourDiffering: colourDiff,
    colourDiffPercent: percent(colourDiff, pixels),
  };
}
