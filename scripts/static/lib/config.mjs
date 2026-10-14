import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const ASSETS = join(ROOT, 'assets');
export const DIRS = {
  svg: join(ASSETS, 'logo', 'svg'),
  print: join(ASSETS, 'logo', 'print'),
  png: join(ASSETS, 'logo', 'png'),
  jpg: join(ASSETS, 'logo', 'jpg'),
  logo: join(ASSETS, 'logo'),
  web: join(ASSETS, 'web'),
  icons: join(ASSETS, 'app-icons'),
  social: join(ASSETS, 'social'),
  colors: join(ASSETS, 'colors'),
};

// README.md brand colours; the only four colours any output may use.
export const COLORS = {
  obsidian: '#121212',
  white: '#F4F6F8',
  electricCyan: '#00CFEF',
  deepCyan: '#1B5F6F',
};

// Source PNG per lockup. `axis` is the dimension named in output sizes: the
// portrait mark is sized by height, every other lockup by width.
export const LOCKUPS = [
  { id: 'mark', source: 'brandmark obsidian.png', hasTagline: false, axis: 'h' },
  { id: 'horizontal', source: 'hori-combo mark obsidian deep cyan.png', hasTagline: true, axis: 'w' },
  { id: 'horizontal-no-tagline', source: 'hori-combo mark no slogan obsidian.png', hasTagline: false, axis: 'w' },
  { id: 'vertical', source: 'vertical stacked obsidian deep cyan.png', hasTagline: true, axis: 'w' },
  { id: 'vertical-no-tagline', source: 'vert-stacked-no slogan obsidian.png', hasTagline: false, axis: 'w' },
];

const ON_LIGHT = { theme: 'light', fill: COLORS.obsidian, bg: COLORS.white };
const ON_DARK = { theme: 'dark', fill: COLORS.white, bg: COLORS.obsidian };

// `primary` marks the colour variant of each lockup: the one used for JPG,
// web, and social outputs.
export function variantsOf(lockup) {
  if (!lockup.hasTagline) {
    return [
      { id: 'on-light', ...ON_LIGHT, accent: ON_LIGHT.fill, primary: true },
      { id: 'on-dark', ...ON_DARK, accent: ON_DARK.fill, primary: true },
    ];
  }
  return [
    { id: 'color-on-light', ...ON_LIGHT, accent: COLORS.deepCyan, primary: true },
    { id: 'mono-on-light', ...ON_LIGHT, accent: ON_LIGHT.fill, primary: false },
    { id: 'color-on-dark', ...ON_DARK, accent: COLORS.electricCyan, primary: true },
    { id: 'mono-on-dark', ...ON_DARK, accent: ON_DARK.fill, primary: false },
  ];
}

export const ALL_VARIANTS = LOCKUPS.flatMap((lockup) =>
  variantsOf(lockup).map((variant) => ({ lockup, variant, key: `${lockup.id}-${variant.id}` })),
);

export const PNG_SIZES = [512, 1024, 2048, 4096];
export const WEB_SIZES = [320, 640, 1280];
export const JPG_SIZE = 2048;
