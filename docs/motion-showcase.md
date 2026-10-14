# Motion showcase internals

How `motion/ixean-logo-motion.html` draws and animates the logo. Read this before changing the showcase or regenerating `motion/ixean-paths.json`.

## How the logo is drawn

The PNGs were traced to vector paths with [potrace](https://www.npmjs.com/package/potrace) and stored in `motion/ixean-paths.json`. The traced artwork differs from the original PNG by 0.25% of pixels, all on anti-aliased edges. The JSON uses the original PNG's coordinates (`viewBox="0 0 2822 1440"`):

- `mark`: the brandmark as one compound path, including the four ring holes.
- `letters`: the five glyphs of IXEAN, left to right.
- `tagline`: the 17 glyphs of AUTONOMOUS SYSTEMS, left to right.

These paths must be filled with `fill-rule="evenodd"`. With the default rule, the ring holes and the counters of O and A fill in solid.

The draw-on effect does not stroke the logo outline. The real filled path sits under an SVG mask made of thick strokes that follow the centre line of each trace. Animating the mask strokes' `stroke-dashoffset` reveals the true fill shape, so the final frame is identical to the static logo.

The HTML has its own copy of the path data in its `PATHS` constant. If the logo artwork changes, regenerate `ixean-paths.json` and replace the `PATHS` value with the new JSON.

## Regenerating the paths

1. Export the horizontal combo mark at full size with obsidian artwork and a deep cyan tagline (`hori-combo mark obsidian deep cyan.png`).
2. Split it into two black-on-white bitmaps with ImageMagick: one for dark pixels (mark and wordmark), one for cyan pixels (tagline).
3. Trace each bitmap with the `potrace` npm package (`turdSize: 20`, `optTolerance: 0.4`, `alphaMax: 0.9`).
4. Split each traced path at every `M` command. Group each sub-path with any sub-path whose bounding box sits inside it, which attaches holes to their glyph. Sort the groups by x.
5. Render the result next to the source PNG and compare with `magick compare -metric AE -fuzz 30%`. Expect differences only on edges.

