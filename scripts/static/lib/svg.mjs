import { optimize } from 'svgo';

const NS = 'http://www.w3.org/2000/svg';
const TITLE = 'IXEAN';
const FLOAT_PRECISION = 2;

const SVGO_CONFIG = {
  multipass: true,
  floatPrecision: FLOAT_PRECISION,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { removeUnknownsAndDefaults: { keepRoleAttr: true } } },
    },
  ],
};

export const formatViewBox = ({ x, y, w, h }) => `${x} ${y} ${w} ${h}`;

// Logo geometry as bare <path> elements. `fill-rule="evenodd"` keeps ring holes and counters open.
export function logoPaths(geom, variant) {
  const path = (d, fill) => `<path fill="${fill}" fill-rule="evenodd" d="${d}"/>`;
  return path(geom.darkD, variant.fill) + (geom.accentD ? path(geom.accentD, variant.accent) : '');
}

export function logoSvg(geom, variant, viewBox = geom.viewBox, attrs = '') {
  return (
    `<svg xmlns="${NS}" viewBox="${formatViewBox(viewBox)}" role="img"${attrs}>` +
    `<title>${TITLE}</title>${logoPaths(geom, variant)}</svg>`
  );
}

export function minify(svg) {
  return optimize(svg, SVGO_CONFIG).data;
}
