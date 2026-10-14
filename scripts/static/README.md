# Static asset build

`build.mjs` generates the static brand assets under `assets/` from the PNG masters in the repository root. The masters are only read, never changed. The build is deterministic: running it twice gives byte-identical files.

## Run

From the repository root:

```bash
cd scripts/static && npm install && cd ../..
node scripts/static/build.mjs
```

Pass step names to run only those: `node scripts/static/build.mjs raster icons`. The steps are `svg`, `print`, `raster`, `icons`, `social`, and `colors`. A full run takes about a minute.

## Prerequisites

- Node 20 or later.
- Playwright's Chromium: `npx playwright install chromium` (the lockfile pins Playwright 1.63.0).
- ImageMagick 7 with WebP and AVIF support (`magick`).
- Ghostscript 10 (`gswin64c` on Windows, `gs` elsewhere), with its `lib/` and `iccprofiles/` folders.

Set `MAGICK`, `GS`, or `GS_ROOT` if the tools are not on `PATH`.

## What it does

1. Traces each of the five lockups from its own PNG with potrace, following "Regenerating the paths" in `docs/motion-showcase.md`. The no-tagline PNGs use different wordmark spacing, so they are not derived from the tagline ones.
2. Writes a minified SVG per lockup and variant, then renders each SVG at source scale and compares it with the source PNG (`magick compare -metric AE -fuzz 30%`). The results, the clear-space unit R, and the viewBoxes go to `assets/logo/trace-report.json`.
3. Renders PDF, PNG, JPG, web, icon, and social files through Chromium, and CMYK PDF and EPS files through Ghostscript.
4. Writes the colour tokens and the Adobe Swatch Exchange palette.

Output folders: `assets/logo/{svg,print,png,jpg}`, `assets/web`, `assets/app-icons`, `assets/social`, `assets/colors`.

## Conventions

- R is the outer diameter of one mark ring, measured on the source PNG. It is the clear-space unit for the print page and JPG padding.
- The mark is portrait, so its PNG, JPG, and web files are sized by height (`-512h`); every other lockup is sized by width (`-512w`).
- Android resource names use underscores because Android does not allow hyphens in them.
