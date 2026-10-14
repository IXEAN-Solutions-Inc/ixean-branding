import { join } from 'node:path';
import { ALL_VARIANTS, DIRS, LOCKUPS, variantsOf } from '../lib/config.mjs';
import { checkFidelity } from '../lib/fidelity.mjs';
import { logoSvg, minify } from '../lib/svg.mjs';
import { writeOut } from '../lib/tools.mjs';

// Fidelity is measured on the light colour variant: it matches the source PNG colours.
const FIDELITY_VARIANT = (lockup) => variantsOf(lockup).find((variant) => variant.theme === 'light' && variant.primary);

// Minified logo SVG for every lockup and variant, keyed `{lockup}-{variant}`.
export function makeSvgs(geoms) {
  return new Map(
    ALL_VARIANTS.map(({ lockup, variant, key }) => [key, minify(logoSvg(geoms.get(lockup.id), variant))]),
  );
}

export async function buildSvgs(ctx) {
  for (const [key, svg] of ctx.svgs) writeOut(join(DIRS.svg, `ixean-${key}.svg`), svg);

  const lockups = {};
  for (const lockup of LOCKUPS) {
    const geom = ctx.geoms.get(lockup.id);
    const variant = FIDELITY_VARIANT(lockup);
    const fidelity = await checkFidelity({
      lockup,
      geom,
      svg: ctx.svgs.get(`${lockup.id}-${variant.id}`),
      renderer: ctx.renderer,
      tmp: ctx.tmp,
    });
    lockups[lockup.id] = {
      source: geom.source,
      canvas: geom.canvas,
      viewBox: geom.viewBox,
      clearSpaceR: geom.R,
      ringOuterDiameters: geom.ringDiameters,
      farthestRadius: geom.farthest,
      fidelity,
    };
  }
  ctx.report = { clearSpaceUnit: 'R = outer diameter of one mark ring, in source-PNG pixels', lockups };
  writeOut(join(DIRS.logo, 'trace-report.json'), `${JSON.stringify(ctx.report, null, 2)}\n`);
  return ALL_VARIANTS.length;
}
