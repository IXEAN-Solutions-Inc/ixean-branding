# Animated SVG logos

Standalone animated SVGs of the IXEAN logo. Each file is self-contained: CSS animation only, no script, no external references, no fonts, transparent background. Place them on your own background.

Use the `on-dark` files on dark backgrounds (obsidian `#121212`) and the `on-light` files on light ones (white `#F4F6F8`). Colours are the brand palette: electric cyan `#00CFEF` on dark, deep cyan `#1B5F6F` on light.

| File | What it does |
| --- | --- |
| `ixean-ignition-on-dark.svg`, `...-on-light.svg` | Ignition reveal, 4.5 s, plays once and holds the final logo. |
| `ixean-ignition-loop-on-dark.svg`, `...-on-light.svg` | Same reveal, then a telemetry pulse runs the circuit every 4 s, forever. |
| `ixean-loader-circuit-on-dark.svg`, `...-on-light.svg` | Circuit loop, 2.4 s. A packet travels across the bus and back. |
| `ixean-loader-rotor-on-dark.svg`, `...-on-light.svg` | Rotor spin, 1.2 s. Counter-rotating rotor arcs on the four nodes. |
| `ixean-loader-handshake-on-dark.svg`, `...-on-light.svg` | Handshake, 3 s. Nodes ping clockwise, then the traces link to the bus. |

The `viewBox` is the visible extent of the animation over every frame plus a few units of margin, so no effect (bloom, pings, scan line) is clipped. Default sizes: ignition 1000 x 453.4, circuit and rotor loaders 56 x 96, handshake 59.2 x 100.8 (a wider frame for its pings, at the same mark scale). Set your own size with CSS; the aspect ratio is fixed by the `viewBox`.

## Usage

`<img>`:

```html
<img src="/ixean-ignition-on-dark.svg" alt="IXEAN Autonomous Systems" width="600">
```

CSS background:

```css
.hero {
  background: #121212 url("/ixean-ignition-on-dark.svg") center / contain no-repeat;
}
```

Inline: paste the file contents into the page. Each file prefixes its own classes and keyframe names (`ix-ig-d`, `ix-circuit-l`, ...), so different files can share a page. Do not inline the same file twice.

```html
<div role="status" aria-live="polite">
  <!-- contents of ixean-loader-circuit-on-dark.svg -->
</div>
```

An animation starts when the file loads. To replay an `<img>` ignition, reload the image (change the `src` with a query string) or remount the element.

## Reduced motion

Every file honours `prefers-reduced-motion: reduce` by switching animation off:

- Ignition files show the final logo.
- Loaders show the solid brandmark with no moving parts.

Tested in Chromium only, with the OS-level setting forced via `--force-prefers-reduced-motion` and the file loaded through `<img>`. DevTools emulation does not reach SVG images, so test with the real OS setting. Other browsers are untested.

## Accessibility

Each file carries a `<title>`, `role="img"` and an `aria-label` (the loaders say "Loading"). When you use a file through `<img>`, supply your own `alt`.

The loaders loop forever, which fails WCAG 2.2.2 (Pause, Stop, Hide) if they stay on screen for more than five seconds. Show them only while something is loading and remove them when it finishes. The ignition-loop pulse has the same constraint: use it only where the user can stop it, or use the plain ignition file.

## Regenerating

The files are generated from `motion/ixean-logo-motion.html`. Do not edit them by hand.

```bash
cd scripts/animated-svg
npm install
node build.mjs
node verify.mjs               # defaults to assets/motion/svg
```

`verify.mjs` renders every file in a browser, compares frames with the showcase, checks that no frame is clipped by the `viewBox`, and writes screenshots to a temp folder (pass a second argument to choose one). Set `CHROMIUM_PATH` only to override the Chromium that Playwright finds.
