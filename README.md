# IXEAN logos

Source files for the IXEAN logo, plus an animated logo showcase built from them.

Live showcase: https://ixean-logo-motion.pages.dev
Repository: https://github.com/IXEAN-Solutions-Inc/ixean-branding

## Contents

```
ixean-logos/
├── IXEAN LOGOTYPES.psd          master Photoshop file
├── brandmark *.png              mark only
├── hori-combo mark *.png        mark + wordmark side by side
├── vertical stacked *.png       mark above wordmark
├── vert-stacked-no slogan *.png
├── hori-combo mark no slogan *.png
└── motion/
    ├── ixean-logo-motion.html   the animation showcase (single file)
    └── ixean-paths.json         vector paths traced from the PNGs
```

PNG names end with the colour variant: `obsidian`, `white`, `obsidian deep cyan`, or `white electric cyan`. "No slogan" variants drop the "AUTONOMOUS SYSTEMS" tagline.

## Brand colours

Measured from the PNGs.

| Name | Hex | Use |
| --- | --- | --- |
| Obsidian | `#121212` | Mark and wordmark on light backgrounds; dark background |
| White | `#F4F6F8` | Mark and wordmark on dark backgrounds; light background |
| Electric cyan | `#00CFEF` | Tagline and accents on dark |
| Deep cyan | `#1B5F6F` | Tagline and accents on light |

The four logo variants are these colours in combination:

| Variant | Background | Mark + wordmark | Tagline |
| --- | --- | --- | --- |
| Dark, colour | Obsidian | White | Electric cyan |
| Dark, mono | Obsidian | White | White |
| Light, colour | White | Obsidian | Deep cyan |
| Light, mono | White | Obsidian | Obsidian |

## The motion showcase

`motion/ixean-logo-motion.html` is one self-contained file: inline SVG, CSS, and plain JavaScript using the Web Animations API. It has no dependencies and no build step. The only external request is IBM Plex from Google Fonts, and the page falls back to system fonts without it.

Open it locally:

```bash
start motion/ixean-logo-motion.html      # Windows
open motion/ixean-logo-motion.html       # macOS
```

It contains:

| Section | Animation | Length |
| --- | --- | --- |
| Presentation | Ignition: rings draw, traces etch to the centre bar, wordmark and tagline reveal | 4.5 s, then an idle pulse every 4 s |
| | Formation: rings fly in from the corners into the vertical lockup | 3.6 s |
| | Dispersal: outro, rings lift off to the corners and fade | 3.4 s |
| | Scanline wipe: section transition | 1.8 s |
| Website | Nav lockup: signal pulse and spinning rotor arcs on hover or focus | 220 ms spin-down |
| | Light hero: Ignition on a white page | 4.5 s |
| | Scroll assembly: the mark builds as the page scrolls | scroll-driven |
| Loaders | L1 circuit loop, L2 rotor spin, L3 handshake, L4 percentage fill | 1.2–3.7 s loops |

The bar at the top switches the theme (dark or light) and the logo variant (colour or mono). The page starts in the system theme and stores the choice in `localStorage` under `ixean-theme` and `ixean-logo`. Presentation stages have a Fullscreen button for use in slides or screen sharing. With `prefers-reduced-motion: reduce` set, every animation jumps to its end state with a fade.

### How the logo is drawn

The PNGs were traced to vector paths with [potrace](https://www.npmjs.com/package/potrace) and stored in `motion/ixean-paths.json`. The traced artwork differs from the original PNG by 0.25% of pixels, all on anti-aliased edges. The JSON uses the original PNG's coordinates (`viewBox="0 0 2822 1440"`):

- `mark`: the brandmark as one compound path, including the four ring holes.
- `letters`: the five glyphs of IXEAN, left to right.
- `tagline`: the 17 glyphs of AUTONOMOUS SYSTEMS, left to right.

These paths must be filled with `fill-rule="evenodd"`. With the default rule, the ring holes and the counters of O and A fill in solid.

The draw-on effect does not stroke the logo outline. The real filled path sits under an SVG mask made of thick strokes that follow the centre line of each trace. Animating the mask strokes' `stroke-dashoffset` reveals the true fill shape, so the final frame is identical to the static logo.

The HTML has its own copy of the path data in its `PATHS` constant. If the logo artwork changes, regenerate `ixean-paths.json` and replace the `PATHS` value with the new JSON.

### Regenerating the paths

1. Export the horizontal combo mark at full size with obsidian artwork and a deep cyan tagline (`hori-combo mark obsidian deep cyan.png`).
2. Split it into two black-on-white bitmaps with ImageMagick: one for dark pixels (mark and wordmark), one for cyan pixels (tagline).
3. Trace each bitmap with the `potrace` npm package (`turdSize: 20`, `optTolerance: 0.4`, `alphaMax: 0.9`).
4. Split each traced path at every `M` command. Group each sub-path with any sub-path whose bounding box sits inside it, which attaches holes to their glyph. Sort the groups by x.
5. Render the result next to the source PNG and compare with `magick compare -metric AE -fuzz 30%`. Expect differences only on edges.

## Deploying

The showcase is hosted on Cloudflare Pages, project `ixean-logo-motion`, in the account owned by swe@ixean.tech. The site is public but sends `X-Robots-Tag: noindex`, so search engines do not list it ahead of the main website.

You need a Cloudflare API token with **Cloudflare Pages: Edit** on that account. Set it and the account ID in your environment; never commit either.

```bash
export CLOUDFLARE_API_TOKEN=...      # Pages: Edit
export CLOUDFLARE_ACCOUNT_ID=...     # from the dashboard URL

DIST=$(mktemp -d)
cp motion/ixean-logo-motion.html "$DIST/index.html"
printf '/*\n  X-Robots-Tag: noindex\n' > "$DIST/_headers"
npx -y wrangler@4 pages deploy "$DIST" --project-name ixean-logo-motion --branch main
```

Check the result:

```bash
curl -sI https://ixean-logo-motion.pages.dev | grep -iE '^(HTTP|x-robots-tag)'
```

Expect `HTTP/1.1 200 OK` and `x-robots-tag: noindex`.
