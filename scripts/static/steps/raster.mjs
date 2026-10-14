import { join } from 'node:path';
import { ALL_VARIANTS, DIRS, JPG_SIZE, PNG_SIZES, WEB_SIZES } from '../lib/config.mjs';
import { canvasSvg, paddedCanvas, sizeFor } from '../lib/canvas.mjs';
import { optimizePng, toAvif, toJpg, toRgbaPng, toWebp } from '../lib/images.mjs';
import { writeOut } from '../lib/tools.mjs';

// Transparent PNG + JPG renders from the SVGs, plus the web-optimised set.
export async function buildRaster(ctx) {
  let count = 0;
  const write = (path, data) => {
    writeOut(path, data);
    count += 1;
  };

  for (const { lockup, variant, key } of ALL_VARIANTS) {
    const geom = ctx.geoms.get(lockup.id);
    const svg = ctx.svgs.get(key);
    const render = (size) => {
      const { width, height } = sizeFor(geom, lockup.axis, size);
      return ctx.renderer.png(svg, width, height);
    };

    for (const size of PNG_SIZES) {
      write(join(DIRS.png, `ixean-${key}-${size}${lockup.axis}.png`), toRgbaPng(await render(size)));
    }
    if (!variant.primary) continue;

    const page = paddedCanvas(geom, lockup.axis, JPG_SIZE);
    const jpgSvg = canvasSvg({ ...page, bg: variant.bg, items: [{ geom, variant, box: page.box }] });
    write(
      join(DIRS.jpg, `ixean-${key}-${JPG_SIZE}${lockup.axis}.jpg`),
      toJpg(await ctx.renderer.png(jpgSvg, page.width, page.height)),
    );

    write(join(DIRS.web, `ixean-${key}.svg`), svg);
    for (const size of WEB_SIZES) {
      const png = await render(size);
      const stem = join(DIRS.web, `ixean-${key}-${size}${lockup.axis}`);
      write(`${stem}.png`, optimizePng(png));
      write(`${stem}.webp`, toWebp(png));
      write(`${stem}.avif`, toAvif(png));
    }
  }
  return count;
}
