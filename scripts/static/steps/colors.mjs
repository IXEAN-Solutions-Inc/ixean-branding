import { join } from 'node:path';
import { readAse, writeAse } from '../lib/ase.mjs';
import { COLORS, DIRS } from '../lib/config.mjs';
import { cmykOf, profiles } from '../lib/ghostscript.mjs';
import { writeOut } from '../lib/tools.mjs';

// Names and uses from README.md "Brand colours".
const SWATCHES = [
  { id: 'obsidian', label: 'Obsidian', hex: COLORS.obsidian, use: 'Mark and wordmark on light backgrounds; dark background' },
  { id: 'white', label: 'White', hex: COLORS.white, use: 'Mark and wordmark on dark backgrounds; light background' },
  { id: 'electric-cyan', label: 'Electric Cyan', hex: COLORS.electricCyan, use: 'Tagline and accents on dark backgrounds only' },
  { id: 'deep-cyan', label: 'Deep Cyan', hex: COLORS.deepCyan, use: 'Tagline and accents on light backgrounds only' },
];

const PREFIX = 'ixean';
const PANTONE = 'TBD — match with physical guide';

const rgbOf = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

const css = () =>
  `:root {\n${SWATCHES.map((s) => `  --${PREFIX}-${s.id}: ${s.hex};`).join('\n')}\n}\n`;

// W3C Design Tokens format: `$type` on the group, `$value` and `$description` on each token.
function tokensJson() {
  const color = { $type: 'color' };
  for (const s of SWATCHES) color[s.id] = { $value: s.hex, $description: s.use };
  return `${JSON.stringify({ color }, null, 2)}\n`;
}

function scss() {
  const vars = SWATCHES.map((s) => `$${PREFIX}-${s.id}: ${s.hex};`).join('\n');
  const map = SWATCHES.map((s) => `  '${s.id}': $${PREFIX}-${s.id},`).join('\n');
  return `${vars}\n\n$${PREFIX}-colors: (\n${map}\n);\n`;
}

// CommonJS so it loads from tailwind.config.js in both CJS and ESM-less projects:
//   presets: [require('./tailwind.preset.js')]
function tailwindPreset() {
  const entries = SWATCHES.map((s) => `          '${s.id}': '${s.hex}',`).join('\n');
  return (
    "/** @type {Partial<import('tailwindcss').Config>} */\n" +
    `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        ${PREFIX}: {\n${entries}\n        },\n      },\n    },\n  },\n};\n`
  );
}

function colorsMd(cmyk, icc) {
  const percent = (values) => values.map((v) => Math.round(v * 100)).join(' / ');
  const rows = SWATCHES.map(
    (s, i) => `| ${s.label} | \`${s.hex}\` | ${rgbOf(s.hex).join(', ')} | ${percent(cmyk[i])} | ${PANTONE} | ${s.use} |`,
  );
  return `# IXEAN brand colours

| Name | HEX | RGB | CMYK % (C / M / Y / K, approx) | Pantone | Use |
| --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

These four colours are the only colours the logo files use.

## CMYK

CMYK values are approximate. ${icc.version} converted the RGB values with
\`-sColorConversionStrategy=CMYK\`, reading RGB as \`${icc.rgbName}\` (\`default_rgb.icc\`)
and writing \`${icc.cmykName}\` (\`default_cmyk.icc\`). The print PDFs in
\`../logo/print/\` use the same conversion. Proof with your printer, and re-convert with
their profile if they supply one.

## Pantone

No Pantone match has been made. Match each colour against a physical guide before specifying one.

## Files

- \`tokens.css\`: CSS custom properties, \`--${PREFIX}-{name}\`.
- \`tokens.json\`: design tokens in the W3C Design Tokens format.
- \`tokens.scss\`: Sass variables and the \`$${PREFIX}-colors\` map.
- \`tailwind.preset.js\`: Tailwind preset adding colours under \`${PREFIX}\`, for example \`bg-${PREFIX}-obsidian\`.
- \`palette.ase\`: Adobe Swatch Exchange file with the four RGB swatches.
`;
}

export async function buildColors(ctx) {
  const icc = profiles();
  const cmyk = cmykOf(SWATCHES.map((s) => s.hex), { icc: icc.cmyk, tmp: ctx.tmp });
  const ase = writeAse('IXEAN', SWATCHES.map((s) => ({ name: s.label, hex: s.hex })));
  const parsed = readAse(ase);
  const expected = SWATCHES.map((s) => `${s.label}=${s.hex.toUpperCase()}`);
  if (parsed.map((c) => `${c.name}=${c.hex}`).join() !== expected.join()) throw new Error('palette.ase does not round-trip');

  const files = {
    'tokens.css': css(),
    'tokens.json': tokensJson(),
    'tokens.scss': scss(),
    'tailwind.preset.js': tailwindPreset(),
    'palette.ase': ase,
    'colors.md': colorsMd(cmyk, icc),
  };
  for (const [name, data] of Object.entries(files)) writeOut(join(DIRS.colors, name), data);
  return Object.keys(files).length;
}
