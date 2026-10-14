// Builds every static brand asset from the PNG masters. Run from anywhere:
//   node scripts/static/build.mjs [step ...]
// With no arguments every step runs; name steps (svg, print, raster, ...) to run only those.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOCKUPS } from './lib/config.mjs';
import { openRenderer } from './lib/render.mjs';
import { traceLockup } from './lib/trace.mjs';
import { buildColors } from './steps/colors.mjs';
import { buildIcons } from './steps/icons.mjs';
import { buildSvgs, makeSvgs } from './steps/logo-svg.mjs';
import { buildPrint } from './steps/print.mjs';
import { buildRaster } from './steps/raster.mjs';
import { buildSocial } from './steps/social.mjs';

async function traceAll() {
  const geoms = new Map();
  for (const lockup of LOCKUPS) geoms.set(lockup.id, await traceLockup(lockup));
  return geoms;
}

function printFidelity({ lockups }) {
  for (const [id, { clearSpaceR, fidelity }] of Object.entries(lockups)) {
    console.log(
      `  ${id}: R=${clearSpaceR}px, ${fidelity.alphaDiffPercent}% of pixels differ from the source alpha ` +
        `(${fidelity.alphaOffEdge} off-edge), ${fidelity.colourDiffPercent}% in flattened colour`,
    );
  }
}

const STEPS = [
  ['svg', buildSvgs],
  ['print', buildPrint],
  ['raster', buildRaster],
  ['icons', buildIcons],
  ['social', buildSocial],
  ['colors', buildColors],
];

async function main() {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((name) => !STEPS.some(([step]) => step === name));
  if (unknown.length > 0) throw new Error(`unknown step: ${unknown.join(', ')}`);
  const geoms = await traceAll();
  const ctx = {
    geoms,
    svgs: makeSvgs(geoms),
    tmp: mkdtempSync(join(tmpdir(), 'ixean-static-')),
    renderer: await openRenderer(),
  };
  try {
    for (const [name, step] of STEPS) {
      if (wanted.length > 0 && !wanted.includes(name)) continue;
      const started = Date.now();
      const count = await step(ctx);
      console.log(`${name}: ${count} files, ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }
    if (ctx.report) printFidelity(ctx.report);
  } finally {
    await ctx.renderer.close();
    rmSync(ctx.tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
