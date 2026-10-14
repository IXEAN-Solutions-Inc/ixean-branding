import { magick } from './tools.mjs';

// `-quality 99` is PNG zlib level 9 with adaptive row filtering (tens of KB smaller than level 9 alone).
const PNG_QUALITY = '99';
const JPG_QUALITY = '92';
const AVIF_QUALITY = '85';

// Lossless, metadata-free PNG. Pixel values stay sRGB; the colour chunks are dropped.
// ImageMagick picks a palette when 256 colours or fewer exist, which is smallest for web delivery.
export const optimizePng = (png) => magick(['png:-', '-strip', '-quality', PNG_QUALITY, 'png:-'], png);

// Same, but always 8-bit RGBA so delivery PNGs share one pixel format.
export const toRgbaPng = (png) => magick(['png:-', '-strip', '-quality', PNG_QUALITY, 'png32:-'], png);

// Flat logo art compresses smaller as lossless WebP than as lossy WebP and stays exact.
export const toWebp = (png) =>
  magick(['png:-', '-strip', '-define', 'webp:lossless=true', '-define', 'webp:method=6', 'webp:-'], png);

export const toAvif = (png) => magick(['png:-', '-strip', '-quality', AVIF_QUALITY, 'avif:-'], png);

// Opaque input expected; 4:4:4 keeps cyan edges free of chroma bleed.
export const toJpg = (png) =>
  magick(['png:-', '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-colorspace', 'sRGB',
    '-sampling-factor', '4:4:4', '-quality', JPG_QUALITY, '-strip', 'jpg:-'], png);

// Opaque 24-bit RGB PNG with no alpha channel and no palette, as app stores expect.
export const toOpaquePng = (png) =>
  magick(['png:-', '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-strip',
    '-quality', PNG_QUALITY, 'png24:-'], png);
