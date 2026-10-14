# Build scripts

Every file under `assets/` is generated from the masters in the repository root and from `motion/ixean-logo-motion.html`. Do not edit generated files by hand. Change the source or the script, then rebuild.

| Script | Builds | Details |
| --- | --- | --- |
| `static/build.mjs` | `assets/logo/`, `assets/web/`, `assets/app-icons/`, `assets/social/`, `assets/colors/` | [static/README.md](static/README.md) |
| `motion/render.mjs` | `assets/motion/{video,alpha,gif,webp,poster}/` and `dist/motion-masters/` | [motion/README.md](motion/README.md) |
| `animated-svg/build.mjs` | `assets/motion/svg/` | [../assets/motion/svg/README.md](../assets/motion/svg/README.md) |

Each folder is its own npm package. Run `npm install` inside a folder before its first run.

## Prerequisites

- Node 20 or later
- Playwright's Chromium (all three packages pin Playwright 1.63.0): `npx playwright@1.63.0 install chromium chromium-headless-shell`
- ImageMagick 7 with WebP and AVIF support
- Ghostscript 10 (static build only)
- ffmpeg and ffprobe with libx264, libvpx-vp9, prores_ks and libwebp_anim (motion only)

## Rebuild everything

```bash
for d in static motion animated-svg; do (cd scripts/$d && npm ci); done
node scripts/static/build.mjs
(cd scripts/motion && node render.mjs && node verify.mjs)
(cd scripts/animated-svg && node build.mjs && node verify.mjs)
```

The static build takes about a minute and the motion render about six minutes.

## Releasing

`dist/` is not committed. It holds the large video masters, which are attached to a GitHub release instead. See [../docs/releasing.md](../docs/releasing.md).
