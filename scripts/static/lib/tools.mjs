import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';

const MAX_BUFFER = 1 << 30;
const IS_WINDOWS = process.platform === 'win32';

export const MAGICK = process.env.MAGICK || 'magick';
export const GS = process.env.GS || (IS_WINDOWS ? 'gswin64c' : 'gs');

function describeFailure(cmd, args, error) {
  const stderr = error.stderr ? error.stderr.toString().trim() : '';
  return new Error(`${cmd} ${args.slice(0, 6).join(' ')} failed: ${stderr || error.message}`);
}

export function run(cmd, args, input) {
  try {
    return execFileSync(cmd, args, { input, maxBuffer: MAX_BUFFER, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    throw describeFailure(cmd, args, error);
  }
}

export const magick = (args, input) => run(MAGICK, args, input);

export const gs = (args) => run(GS, ['-dBATCH', '-dNOPAUSE', '-dSAFER', '-dQUIET', ...args]);

// `magick compare` exits 1 when images differ; the metric is on stderr as "<raw> (<count>)".
// In this IM 7 Q16 build the raw figure is the pixel count times 65535, so the bracketed figure is the count.
export function compareAE(a, b, fuzz = '30%') {
  const result = spawnSync(MAGICK, ['compare', '-metric', 'AE', '-fuzz', fuzz, a, b, 'null:'], {
    encoding: 'utf8',
  });
  const match = /\(([\d.e+-]+)\)/.exec(result.stderr);
  if (!match) throw new Error(`magick compare failed: ${result.stderr}`);
  return Math.round(Number(match[1]));
}

// Ghostscript root (holds lib/ and iccprofiles/): GS_ROOT, else the PATH entry of the gs binary.
export function gsRoot() {
  if (process.env.GS_ROOT) return process.env.GS_ROOT;
  const names = IS_WINDOWS ? [`${GS}.exe`] : [GS];
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (names.some((name) => existsSync(join(dir, name)))) return dirname(dir);
  }
  throw new Error('Ghostscript not found on PATH; set GS_ROOT');
}

export function writeOut(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  return path;
}
