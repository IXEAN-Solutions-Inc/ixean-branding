# Using the logo in code

Copy the files you need into your project. Do not hotlink from GitHub: raw GitHub URLs are rate-limited and are not a CDN.

All file names are lowercase kebab-case: `ixean-{lockup}-{variant}[-{size}].{ext}`. `on-dark` art is for dark backgrounds and `on-light` art is for light ones.

## Colours

| Token | HEX | Use |
| --- | --- | --- |
| `obsidian` | `#121212` | Logo on light; dark surfaces |
| `white` | `#F4F6F8` | Logo on dark; light surfaces |
| `electric-cyan` | `#00CFEF` | Accent on dark backgrounds only |
| `deep-cyan` | `#1B5F6F` | Accent on light backgrounds only |

Ready-made files in `assets/colors/`:

- `tokens.css`: `--ixean-obsidian`, `--ixean-white`, `--ixean-electric-cyan`, `--ixean-deep-cyan`
- `tokens.scss`: the same as Sass variables plus an `$ixean-colors` map
- `tokens.json`: W3C Design Tokens format, for Style Dictionary or Figma Tokens
- `tailwind.preset.js`: adds `ixean-*` colours, for example `bg-ixean-obsidian text-ixean-white`

```js
// tailwind.config.js
module.exports = { presets: [require("./tailwind.preset.js")] };
```

## Logo in a page

Prefer SVG. It is the smallest file and stays sharp at every size. Raster fallbacks are in `assets/web/` at 320, 640 and 1280 px wide (1×, 2× and 4× of a 320 px slot), as AVIF, WebP, and PNG.

```html
<!-- Header logo, 160 px wide on screen -->
<img src="/brand/ixean-horizontal-color-on-dark.svg" alt="IXEAN" width="160" height="62">
```

Set `width` and `height` from the SVG's `viewBox` ratio so the layout does not shift while it loads. If a raster image is required:

```html
<picture>
  <source type="image/avif" srcset="/brand/ixean-horizontal-color-on-dark-320w.avif 1x, /brand/ixean-horizontal-color-on-dark-640w.avif 2x">
  <source type="image/webp" srcset="/brand/ixean-horizontal-color-on-dark-320w.webp 1x, /brand/ixean-horizontal-color-on-dark-640w.webp 2x">
  <img src="/brand/ixean-horizontal-color-on-dark-320w.png" alt="IXEAN" width="320" height="123">
</picture>
```

Switch lockup by width, not by scaling: below 240 px use `horizontal-no-tagline`, below 120 px use the mark. Full rules: [brand-guidelines.md](brand-guidelines.md).

## Favicon and app manifest

Copy `assets/app-icons/` to the site root, then add:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:image" content="https://example.com/og-image-1200x630-dark.png">
```

`icon.svg` switches between obsidian and white with the browser's colour scheme. `site.webmanifest` is an example: change `name`, `start_url`, and the colours to match the app.

## Mobile apps

- **iOS:** `ios-1024.png` is the flat, opaque app icon. For Icon Composer, use `ios-1024-background.png` and `ios-1024-foreground.png` as layers.
- **Android:** copy `assets/app-icons/android/*.xml` into `res/drawable/` (foreground, background, monochrome) and `ic_launcher.xml` into `res/mipmap-anydpi-v26/`. The `.svg` copies are for design tools.
- **Google Play listing:** `play-store-512.png`.

## Animated logo on the web

**Animated SVG** (`assets/motion/svg/`) is the lightest option and needs no JavaScript. It plays in `<img>`, as a CSS background, or inline, and shows the static logo when the user has reduced motion turned on.

```html
<img src="/brand/ixean-ignition-on-dark.svg" alt="IXEAN" width="500" height="227">
```

**Transparent video** for larger hero animations: list the WebM first and an MP4 fallback second. Safari does not play WebM transparency, so the MP4 on a matching solid background is what Safari users see.

```html
<video autoplay muted playsinline poster="/brand/ixean-ignition-on-dark-1920x1080.png" width="1920" height="1080">
  <source src="/brand/ixean-ignition-on-dark-1920x1080-60.webm" type="video/webm">
  <source src="/brand/ixean-ignition-on-dark-1920x1080-60.mp4" type="video/mp4">
</video>
```

Respect reduced motion for video yourself:

```css
@media (prefers-reduced-motion: reduce) {
  .brand-video { display: none; }
  .brand-poster { display: block; }
}
```

## Loaders

Four loops: `circuit`, `rotor`, `handshake` (animated SVG, WebM, MP4, GIF, WebP) and `progress` (WebM, MP4, GIF, WebP only).

```html
<img src="/brand/ixean-loader-rotor-on-dark.svg" alt="Loading" role="status" width="56" height="96">
```

Show a loader only while something is loading, and remove it when the work finishes. A loop that runs for more than 5 seconds next to other content must give the user a way to stop it (WCAG 2.2.2).

## Rebuilding the files

Every generated file can be rebuilt from the masters. See [`scripts/README.md`](../scripts/README.md).
