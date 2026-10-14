import { join } from 'node:path';
import { DIRS, LOCKUPS, variantsOf } from '../lib/config.mjs';
import { canvasSvg, centeredBox, circleScale, fitScale } from '../lib/canvas.mjs';
import { toJpg, toOpaquePng } from '../lib/images.mjs';
import { writeOut } from '../lib/tools.mjs';

const lockupById = (id) => LOCKUPS.find((lockup) => lockup.id === id);
const variantOf = (lockupId, id) => variantsOf(lockupById(lockupId)).find((variant) => variant.id === id);

const AVATAR_SIZE = 1024;
const AVATAR_CIRCLE_RATIO = 0.8;
// Facebook cover must stay under 100 KB.
const FACEBOOK_MAX_BYTES = 100 * 1024;
// YouTube shows only the centre of the banner on every device: 1546 x 423 px.
const YOUTUBE_SAFE = { w: 1546, h: 423 };
const YOUTUBE_SAFE_FILL = 0.8;
const COVER_FILL = 0.5;

// Horizontal colour lockup centred in `max` (px box), on a solid brand background.
const BANNERS = [
  { file: 'og-image-1200x630-dark.png', width: 1200, height: 630, max: { w: 720, h: 315 }, theme: 'dark' },
  { file: 'og-image-1200x630-light.png', width: 1200, height: 630, max: { w: 720, h: 315 }, theme: 'light' },
  { file: 'linkedin-cover-1512x256.png', width: 1512, height: 256, max: { w: 1512 * COVER_FILL, h: 256 * COVER_FILL }, theme: 'dark' },
  { file: 'facebook-cover-851x315.jpg', width: 851, height: 315, max: { w: 851 * COVER_FILL, h: 315 * COVER_FILL }, theme: 'dark' },
  { file: 'x-header-1500x500.png', width: 1500, height: 500, max: { w: 1500 * COVER_FILL, h: 500 * COVER_FILL }, theme: 'dark' },
  {
    file: 'youtube-banner-2560x1440.png',
    width: 2560,
    height: 1440,
    max: { w: YOUTUBE_SAFE.w * YOUTUBE_SAFE_FILL, h: YOUTUBE_SAFE.h * YOUTUBE_SAFE_FILL },
    theme: 'dark',
  },
];

const HORIZONTAL_COLOUR = { light: 'color-on-light', dark: 'color-on-dark' };

export async function buildSocial(ctx) {
  const files = [];
  const write = (name, data) => {
    writeOut(join(DIRS.social, name), data);
    files.push({ name, bytes: data.length });
  };

  const mark = ctx.geoms.get('mark');
  for (const theme of ['dark', 'light']) {
    const variant = variantsOf(lockupById('mark')).find((candidate) => candidate.theme === theme);
    const canvas = { width: AVATAR_SIZE, height: AVATAR_SIZE };
    const scale = circleScale(mark, AVATAR_SIZE * AVATAR_CIRCLE_RATIO);
    const svg = canvasSvg({ ...canvas, bg: variant.bg, items: [{ geom: mark, variant, box: centeredBox(mark, canvas, scale) }] });
    write(`avatar-${AVATAR_SIZE}-${theme}.png`, toOpaquePng(await ctx.renderer.png(svg, AVATAR_SIZE, AVATAR_SIZE)));
  }

  const horizontal = ctx.geoms.get('horizontal');
  for (const banner of BANNERS) {
    const variant = variantOf('horizontal', HORIZONTAL_COLOUR[banner.theme]);
    const box = centeredBox(horizontal, banner, fitScale(horizontal, banner.max.w, banner.max.h));
    const svg = canvasSvg({ width: banner.width, height: banner.height, bg: variant.bg, items: [{ geom: horizontal, variant, box }] });
    const png = await ctx.renderer.png(svg, banner.width, banner.height);
    write(banner.file, banner.file.endsWith('.jpg') ? toJpg(png) : toOpaquePng(png));
  }

  const facebook = files.find((file) => file.name.startsWith('facebook-cover'));
  if (facebook.bytes >= FACEBOOK_MAX_BYTES) throw new Error(`${facebook.name} is ${facebook.bytes} bytes, limit ${FACEBOOK_MAX_BYTES}`);
  return files.length;
}
