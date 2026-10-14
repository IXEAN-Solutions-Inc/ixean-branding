import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { GS, MAGICK, gs, gsRoot, run } from './tools.mjs';

// RGB to CMYK goes through Ghostscript's bundled profiles: colours are read as
// default_rgb.icc and converted to default_cmyk.icc (Artifex SWOP-style).
const CMYK_PROFILE = 'default_cmyk.icc';
const RGB_PROFILE = 'default_rgb.icc';
const PDFX_STOCK = 'PDFX_def.ps';
// Not named pdfx_def.ps: Ghostscript resolves that name to its stock copy on Windows.
const PDFX_FILE = 'ixean_pdfx.ps';
const PDFX_VERSION = 3;

const forward = (path) => path.replace(/\\/g, '/');

export function profiles() {
  const root = gsRoot();
  const cmyk = forward(join(root, 'iccprofiles', CMYK_PROFILE));
  const rgb = forward(join(root, 'iccprofiles', RGB_PROFILE));
  const describe = (path, extra) =>
    run(MAGICK, ['-size', '1x1', 'xc:black', ...extra, '-profile', path, '-format', '%[icc:description]', 'info:']).toString();
  return {
    root: forward(root),
    cmyk,
    rgb,
    cmykName: describe(cmyk, ['-colorspace', 'CMYK']),
    rgbName: describe(rgb, []),
    version: run(GS, ['-v']).toString().split('\n')[0],
  };
}

function cmykArgs(icc) {
  return [
    `--permit-file-read=${icc}`,
    '-sColorConversionStrategy=CMYK',
    '-sProcessColorModel=DeviceCMYK',
    `-sOutputICCProfile=${icc}`,
  ];
}

// Ghostscript's stock PDF/X-3 prefix with title and output intent filled in.
// The intent names the generic bundled profile; it is not a press characterisation.
function pdfxDefinition(root, icc, title) {
  const stock = readFileSync(join(root, 'lib', PDFX_STOCK), 'utf8');
  const literal = (text) => text.replace(/[\\()]/g, '\\$&');
  const replacements = [
    ['(ISO Coated sb.icc)', `(${literal(icc)})`],
    ['/Title (Title)', `/Title (${literal(title)})`],
    ['(Commercial and specialty printing)', '(Ghostscript default CMYK, not a press condition)'],
    ['(CGATS TR001)', '(Custom)'],
  ];
  return replacements.reduce((text, [from, to]) => {
    if (!text.includes(from)) throw new Error(`${PDFX_STOCK} no longer contains ${from}`);
    return text.split(from).join(to);
  }, stock);
}

export function toCmykPdf(input, output, { icc, root, tmp, title, pdfx }) {
  const args = ['-sDEVICE=pdfwrite', `-dCompatibilityLevel=${pdfx ? '1.3' : '1.4'}`, ...cmykArgs(icc)];
  const extra = [];
  if (pdfx) {
    const definition = join(tmp, PDFX_FILE);
    writeFileSync(definition, pdfxDefinition(root, icc, title));
    args.push(`-dPDFX=${PDFX_VERSION}`);
    extra.push(definition);
  }
  gs([...args, `-sOutputFile=${output}`, ...extra, input]);
}

export function toEps(input, output, { icc }) {
  gs(['-sDEVICE=eps2write', ...cmykArgs(icc), `-sOutputFile=${output}`, input]);
}

// Converted fill colours of `hexes`, in order, as CMYK fractions (0-1).
export function cmykOf(hexes, { icc, tmp }) {
  const channel = (hex, at) => (parseInt(hex.slice(at, at + 2), 16) / 255).toFixed(6);
  const body = hexes
    .map((hex, i) => `${channel(hex, 1)} ${channel(hex, 3)} ${channel(hex, 5)} setrgbcolor ${i * 10} 0 10 10 rectfill`)
    .join('\n');
  const source = join(tmp, 'swatches.ps');
  const output = join(tmp, 'swatches.pdf');
  writeFileSync(source, `%!PS\n<</PageSize [${hexes.length * 10} 10]>> setpagedevice\n${body}\nshowpage\n`);
  gs(['-sDEVICE=pdfwrite', '-dCompressPages=false', ...cmykArgs(icc), `-sOutputFile=${output}`, source]);
  const pattern = /([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) k\b/g;
  const found = [...readFileSync(output, 'latin1').matchAll(pattern)].map((m) => m.slice(1, 5).map(Number));
  if (found.length !== hexes.length) throw new Error(`expected ${hexes.length} CMYK swatches, found ${found.length}`);
  return found;
}

// Overwrites timestamps, ids and uuids with constants of identical length, so
// xref offsets stay valid and rebuilds are byte-identical.
export function stabilize(buffer) {
  const same = (fixed) => (match) => fixed.slice(0, match.length).padEnd(match.length, ' ');
  const text = buffer
    .toString('latin1')
    .replace(/D:\d{14}[+\-Z][\d']*/g, same("D:20240101000000+00'00'"))
    .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+\-]\d\d:\d\d/g, same('2024-01-01T00:00:00+00:00'))
    .replace(/uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, same('uuid:00000000-0000-4000-8000-000000000000'))
    .replace(/(\/ID\s*\[)<([0-9A-Fa-f]+)><([0-9A-Fa-f]+)>/g, (m, head, a, b) => `${head}<${'0'.repeat(a.length)}><${'0'.repeat(b.length)}>`);
  return Buffer.from(text, 'latin1');
}

function inflatedStreams(text) {
  const streams = [];
  for (const match of text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'));
    } catch {
      // not a Flate stream (plain text content or binary data): nothing to add
    }
  }
  return streams;
}

// A vector file has no image XObjects, no inline images, no Do operators, and draws filled paths.
// EPS output starts with a long interpreter prolog whose error strings mention images; only the page counts.
export function vectorReport(buffer) {
  const full = buffer.toString('latin1');
  const prologEnd = full.indexOf('%%EndProlog');
  const raw = prologEnd < 0 ? full : full.slice(prologEnd);
  const content = [raw, ...inflatedStreams(raw)].join('\n');
  return {
    imageObjects: (raw.match(/\/Subtype\s*\/Image/g) || []).length,
    inlineImages: (content.match(/^BI\b/gm) || []).length,
    doOperators: (content.match(/^\/\S+ Do\b/gm) || []).length,
    paths: (content.match(/-?[\d.]+ -?[\d.]+ m\b/g) || []).length,
  };
}
