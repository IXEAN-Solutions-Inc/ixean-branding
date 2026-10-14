import { join } from 'node:path';
import { COLORS, DIRS, LOCKUPS, variantsOf } from '../lib/config.mjs';
import { canvasSvg, centeredBox, circleScale } from '../lib/canvas.mjs';
import { toOpaquePng, toRgbaPng } from '../lib/images.mjs';
import { formatViewBox } from '../lib/svg.mjs';
import { magick, writeOut } from '../lib/tools.mjs';

const MARK = LOCKUPS.find((lockup) => lockup.id === 'mark');
// Dark icons are primary: white mark on an obsidian tile.
const DARK = variantsOf(MARK).find((variant) => variant.theme === 'dark');

const FAVICON_SIZES = [16, 32, 48];
const FAVICON_MARK_FRACTION = 0.875;
const APPLE_SIZE = 180;
const APPLE_MARK_HEIGHT = 140;
const SAFE_CIRCLE_RATIO = 0.8;
const PWA_SIZES = [192, 512];
const MASKABLE_SIZE = 512;
const PLAY_STORE_SIZE = 512;
const IOS_SIZE = 1024;
const ANDROID_CANVAS_DP = 108;
const ANDROID_SAFE_DP = 66;
const MANIFEST_NAME = 'IXEAN';

const xmlEscape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// Opaque square tile with the mark centred, scaled by `scale` (px per source px).
function tile(geom, size, scale, bg = COLORS.obsidian) {
  const box = centeredBox(geom, { width: size, height: size }, scale);
  return canvasSvg({ width: size, height: size, bg, items: [{ geom, variant: DARK, box }] });
}

const heightScale = (geom, markHeight) => markHeight / geom.viewBox.h;
const safeCircleScale = (geom, size) => circleScale(geom, Math.floor(size * SAFE_CIRCLE_RATIO));

// Square, transparent icon.svg that follows the browser's light/dark scheme.
// Built by hand around the minified path: svgo would inline the style rules and drop the dark-scheme fallback.
function adaptiveIconSvg(geom, minifiedLogo) {
  const { x, y, w, h } = geom.viewBox;
  const side = Math.round(h / FAVICON_MARK_FRACTION);
  const viewBox = { x: x + w / 2 - side / 2, y: y + h / 2 - side / 2, w: side, h: side };
  const style =
    `path{fill:${COLORS.obsidian}}` +
    `@media (prefers-color-scheme:dark){path{fill:${COLORS.white}}}`;
  const d = /\sd="([^"]+)"/.exec(minifiedLogo)[1];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatViewBox(viewBox)}" role="img">` +
    `<title>IXEAN</title><style>${style}</style>` +
    `<path fill="${COLORS.obsidian}" fill-rule="evenodd" d="${d}"/></svg>\n`
  );
}

// Android layer on the 108dp canvas, mark inside the 66dp safe circle.
function androidLayer(geom, fill) {
  const scale = ANDROID_SAFE_DP / 2 / geom.farthest;
  const { x, y, w, h } = geom.viewBox;
  const half = ANDROID_CANVAS_DP / 2;
  const tx = Number((half - scale * (x + w / 2)).toFixed(4));
  const ty = Number((half - scale * (y + h / 2)).toFixed(4));
  const s = Number(scale.toFixed(6));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANDROID_CANVAS_DP}" height="${ANDROID_CANVAS_DP}" ` +
    `viewBox="0 0 ${ANDROID_CANVAS_DP} ${ANDROID_CANVAS_DP}"><g transform="translate(${tx} ${ty}) scale(${s})">` +
    `<path fill="${fill}" fill-rule="evenodd" d="${geom.darkD}"/></g></svg>\n`;
  const body =
    `  <group\n      android:translateX="${tx}"\n      android:translateY="${ty}"\n` +
    `      android:scaleX="${s}"\n      android:scaleY="${s}">\n` +
    `    <path\n        android:pathData="${xmlEscape(geom.darkD)}"\n` +
    `        android:fillColor="${fill}"\n        android:fillType="evenOdd" />\n  </group>\n`;
  return { svg, xml: vectorDrawable(body) };
}

function vectorDrawable(body) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n' +
    `    android:width="${ANDROID_CANVAS_DP}dp"\n    android:height="${ANDROID_CANVAS_DP}dp"\n` +
    `    android:viewportWidth="${ANDROID_CANVAS_DP}"\n    android:viewportHeight="${ANDROID_CANVAS_DP}">\n` +
    `${body}</vector>\n`
  );
}

function androidBackground() {
  const side = ANDROID_CANVAS_DP;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">` +
    `<rect width="${side}" height="${side}" fill="${COLORS.obsidian}"/></svg>\n`;
  const body =
    `  <path\n      android:pathData="M0,0h${side}v${side}h-${side}z"\n` +
    `      android:fillColor="${COLORS.obsidian}" />\n`;
  return { svg, xml: vectorDrawable(body) };
}

const ADAPTIVE_ICON_XML =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
  '    <background android:drawable="@drawable/ic_launcher_background" />\n' +
  '    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
  '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n' +
  '</adaptive-icon>\n';

function webManifest() {
  const icon = (src, sizes, purpose) => ({ src, sizes, type: 'image/png', purpose });
  return `${JSON.stringify(
    {
      name: MANIFEST_NAME,
      short_name: MANIFEST_NAME,
      start_url: '/',
      display: 'standalone',
      theme_color: COLORS.obsidian,
      background_color: COLORS.obsidian,
      icons: [
        icon('icon-192.png', '192x192', 'any'),
        icon('icon-512.png', '512x512', 'any'),
        icon('icon-maskable-512.png', '512x512', 'maskable'),
      ],
    },
    null,
    2,
  )}\n`;
}

export async function buildIcons(ctx) {
  const geom = ctx.geoms.get('mark');
  const out = (name) => join(DIRS.icons, name);
  const files = [];
  const write = (name, data) => {
    writeOut(out(name), data);
    files.push(name);
  };
  const opaque = async (size, scale) => toOpaquePng(await ctx.renderer.png(tile(geom, size, scale), size, size));

  const faviconPaths = [];
  for (const size of FAVICON_SIZES) {
    const path = join(ctx.tmp, `favicon-${size}.png`);
    writeOut(path, await ctx.renderer.png(tile(geom, size, heightScale(geom, size * FAVICON_MARK_FRACTION)), size, size));
    faviconPaths.push(path);
  }
  write('favicon.ico', magick([...faviconPaths, 'ico:-']));

  write('icon.svg', adaptiveIconSvg(geom, ctx.svgs.get('mark-on-light')));
  write('apple-touch-icon.png', await opaque(APPLE_SIZE, heightScale(geom, APPLE_MARK_HEIGHT)));
  for (const size of PWA_SIZES) {
    write(`icon-${size}.png`, await opaque(size, heightScale(geom, (size * APPLE_MARK_HEIGHT) / APPLE_SIZE)));
  }
  write(`icon-maskable-${MASKABLE_SIZE}.png`, await opaque(MASKABLE_SIZE, safeCircleScale(geom, MASKABLE_SIZE)));
  write('site.webmanifest', webManifest());
  write(`play-store-${PLAY_STORE_SIZE}.png`, await opaque(PLAY_STORE_SIZE, safeCircleScale(geom, PLAY_STORE_SIZE)));

  const iosScale = safeCircleScale(geom, IOS_SIZE);
  write(`ios-${IOS_SIZE}.png`, await opaque(IOS_SIZE, iosScale));
  const background = canvasSvg({ width: IOS_SIZE, height: IOS_SIZE, bg: COLORS.obsidian, items: [] });
  write(`ios-${IOS_SIZE}-background.png`, toOpaquePng(await ctx.renderer.png(background, IOS_SIZE, IOS_SIZE)));
  const box = centeredBox(geom, { width: IOS_SIZE, height: IOS_SIZE }, iosScale);
  const foreground = canvasSvg({ width: IOS_SIZE, height: IOS_SIZE, items: [{ geom, variant: DARK, box }] });
  write(`ios-${IOS_SIZE}-foreground.png`, toRgbaPng(await ctx.renderer.png(foreground, IOS_SIZE, IOS_SIZE)));

  const layers = {
    ic_launcher_foreground: androidLayer(geom, COLORS.white),
    ic_launcher_background: androidBackground(),
    ic_launcher_monochrome: androidLayer(geom, COLORS.white),
  };
  for (const [name, layer] of Object.entries(layers)) {
    write(`android/${name}.svg`, layer.svg);
    write(`android/${name}.xml`, layer.xml);
  }
  write('android/ic_launcher.xml', ADAPTIVE_ICON_XML);
  return files.length;
}
