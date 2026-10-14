import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_VARIANTS, DIRS } from '../lib/config.mjs';
import { profiles, stabilize, toCmykPdf, toEps, vectorReport } from '../lib/ghostscript.mjs';
import { logoSvg } from '../lib/svg.mjs';
import { writeOut } from '../lib/tools.mjs';

// 768 CSS px = 576 pt = 8 in on the long side. Vector files scale freely; this
// only fixes the size a layout tool opens them at.
const PAGE_LONG_PX = 768;

// One clear-space unit R (outer diameter of one mark ring) on every side of the artwork.
function pageGeometry(geom) {
  const { x, y, w, h } = geom.viewBox;
  const pad = geom.R;
  const viewBox = { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad };
  const scale = PAGE_LONG_PX / Math.max(viewBox.w, viewBox.h);
  return { viewBox, width: Math.round(viewBox.w * scale), height: Math.round(viewBox.h * scale) };
}

function assertVector(name, buffer) {
  const report = vectorReport(buffer);
  if (report.imageObjects || report.inlineImages || report.doOperators || report.paths === 0) {
    throw new Error(`${name} is not pure vector: ${JSON.stringify(report)}`);
  }
  return report;
}

function readmeText(icc) {
  return `# Print files

Vector logo files for print. Each \`ixean-{lockup}-{variant}\` has three formats:

- \`-rgb.pdf\`: RGB vector PDF straight from the SVG, for screens and office printers.
- \`-cmyk.pdf\`: CMYK vector PDF flagged PDF/X-3:2002 by Ghostscript.
- \`-cmyk.eps\`: CMYK EPS from the CMYK conversion.

## Page and clear space

The PDF page is the artwork plus 1R of clear space on every side, where R is the
outer diameter of one mark ring (see \`../trace-report.json\` for R per lockup).
The page opens at ${PAGE_LONG_PX / 96} in on its long side; the files are vector, so scale freely.
The EPS bounding box is tight to the artwork because Ghostscript computes it from
the drawn content, so keep 1R of clear space when placing an EPS.

The \`on-dark\` variants are white or light artwork on a transparent page. They look
blank on a white viewer background.

## CMYK conversion

${icc.version} converted RGB to CMYK with \`-sColorConversionStrategy=CMYK\`:

- source: \`${icc.rgbName}\` (\`default_rgb.icc\`)
- destination: \`${icc.cmykName}\` (\`default_cmyk.icc\`)

The CMYK values are an approximation. Proof with your printer and re-convert with their
profile if they ask for one. Pantone matches are not set; match against a physical guide.

## PDF/X

\`-cmyk.pdf\` carries Ghostscript's PDF/X-3:2002 markers: version key, output intent, trim
and bleed boxes, and no RGB. It has not been checked with a preflight tool (none was available).
The output intent names Ghostscript's generic profile and is not a press condition, so
replace it with the printer's profile before sending for press.
`;
}

export async function buildPrint(ctx) {
  const icc = profiles();
  const results = [];
  for (const { lockup, variant, key } of ALL_VARIANTS) {
    const geom = ctx.geoms.get(lockup.id);
    const { viewBox, width, height } = pageGeometry(geom);
    const base = join(DIRS.print, `ixean-${key}`);
    const tmpBase = join(ctx.tmp, `print-${key}`);

    const rgb = stabilize(await ctx.renderer.pdf(logoSvg(geom, variant, viewBox), width, height));
    const rgbSource = writeOut(`${tmpBase}-rgb.pdf`, rgb);
    writeOut(`${base}-rgb.pdf`, rgb);

    const options = { icc: icc.cmyk, root: icc.root, tmp: ctx.tmp, title: `IXEAN logo ${key}` };
    toCmykPdf(rgbSource, `${tmpBase}-cmyk.pdf`, { ...options, pdfx: true });
    toEps(rgbSource, `${tmpBase}-cmyk.eps`, options);

    for (const [suffix, ext] of [['rgb', 'pdf'], ['cmyk', 'pdf'], ['cmyk', 'eps']]) {
      const path = `${base}-${suffix}.${ext}`;
      const data = suffix === 'rgb' ? rgb : stabilize(readFileSync(`${tmpBase}-${suffix}.${ext}`));
      results.push({ file: `ixean-${key}-${suffix}.${ext}`, ...assertVector(path, data) });
      if (suffix !== 'rgb') writeOut(path, data);
    }
  }
  writeOut(join(DIRS.print, 'README.md'), readmeText(icc));
  ctx.print = { icc, vector: results };
  return results.length + 1;
}
