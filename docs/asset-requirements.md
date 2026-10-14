# Asset requirements checklist

Every deliverable that the [asset standards](asset-standards.md) call for, and whether this repository has it. Last checked 2026-10-15.

✅ done · ⚠️ done with a limit · ⬜ open

## Static logo

| Requirement | Status | Where |
| --- | --- | --- |
| SVG for every lockup and colour variant, tight `viewBox`, text as outlines | ✅ 14 files. Traced from each master PNG; every lockup differs from its PNG by under 0.34% of pixels, all on anti-aliased edges. | `assets/logo/svg/` |
| Vector PDF, RGB | ✅ with 1R clear space | `assets/logo/print/*-rgb.pdf` |
| Vector PDF, CMYK, print-ready | ⚠️ Marked PDF/X-3 by Ghostscript using its generic SWOP profile. Not checked with a preflight tool. Ask the printer for their profile before a large run. | `assets/logo/print/*-cmyk.pdf` |
| EPS, CMYK | ⚠️ Vector. Bounding box is tight, so add clear space in layout. | `assets/logo/print/*-cmyk.eps` |
| Transparent PNG at 512, 1024, 2048, 4096 px | ✅ rendered from the vectors, not enlarged from the masters | `assets/logo/png/` |
| JPG on a solid brand background | ✅ colour variants, 2048 px | `assets/logo/jpg/` |
| Mono (one-colour) PNG and vector files | ✅ PNG, SVG, PDF, EPS. JPG and web sets carry the colour variants only. | `assets/logo/` |
| Native Adobe Illustrator `.ai` file | ⬜ No Illustrator on the build machine. The PDFs open and edit in Illustrator. | — |

## Colour

| Requirement | Status | Where |
| --- | --- | --- |
| HEX and RGB | ✅ | `assets/colors/colors.md` |
| CMYK with the ICC profile named | ⚠️ Approximate, from Ghostscript's generic SWOP profile. Confirm with the printer's profile and a printed proof. | `assets/colors/colors.md` |
| Pantone spot colours | ⬜ Must be matched against a physical Pantone guide. Not guessed. | — |
| Design tokens: CSS, SCSS, JSON (W3C format), Tailwind | ✅ | `assets/colors/` |
| Adobe swatch file | ✅ `.ase`, RGB. Not yet opened in an Adobe app to confirm. | `assets/colors/palette.ase` |

## Web

| Requirement | Status | Where |
| --- | --- | --- |
| Optimized logo files: SVG, WebP, AVIF, PNG at 320, 640, 1280 px | ✅ | `assets/web/` |
| `favicon.ico` (16, 32, 48) and `icon.svg` with dark-mode colours | ✅ | `assets/app-icons/` |
| `apple-touch-icon.png` 180 | ✅ | `assets/app-icons/` |
| Manifest icons 192 and 512 plus a maskable 512 | ✅ with an example `site.webmanifest` | `assets/app-icons/` |
| Open Graph image 1200×630 | ✅ dark and light | `assets/social/` |

## Apps

| Requirement | Status | Where |
| --- | --- | --- |
| iOS app icon 1024, opaque, plus background and foreground layers for Icon Composer | ✅ dark only | `assets/app-icons/ios-1024*.png` |
| Android adaptive icon: foreground, background, monochrome, 108 dp, 66 dp safe zone | ✅ SVG and VectorDrawable | `assets/app-icons/android/` |
| Google Play icon 512, opaque, under 1 MB | ✅ 15 KB | `assets/app-icons/play-store-512.png` |
| Light-theme app icons | ⬜ Not needed unless an app ships a light icon | — |

## Social

| Requirement | Status | Where |
| --- | --- | --- |
| Profile avatar 1024, circle-safe | ✅ dark and light | `assets/social/` |
| LinkedIn cover 1512×256 | ✅ The tagline is about 9 px tall here: readable, but small. | `assets/social/` |
| Facebook cover 851×315, under 100 KB | ✅ 20 KB | `assets/social/` |
| X header 1500×500 | ✅ | `assets/social/` |
| YouTube banner 2560×1440, logo in the safe area | ✅ | `assets/social/` |

## Motion

| Requirement | Status | Where |
| --- | --- | --- |
| MP4 H.264 High, yuv420p, fast start, 1920×1080 60 fps: reveal, assemble, outro | ✅ dark and light background. 8-bit video decodes obsidian as 17,17,17 instead of 18,18,18; the difference is not visible. | `assets/motion/video/` |
| MP4 square 1080×1080 and vertical 1080×1920 for social | ✅ reveal, logo inside the 5% safe area | `assets/motion/video/` |
| MP4 4K 3840×2160 60 fps | ✅ reveal | release download |
| ProRes 4444 MOV with transparency for video editors | ✅ 1080p 30 fps for all three, 4K 30 fps for the reveal | release download |
| 4K PNG sequence with transparency | ✅ reveal, on-dark art | release download |
| WebM VP9 with transparency for websites | ✅ all animations and loaders | `assets/motion/alpha/` |
| HEVC with transparency for Safari | ⬜ Only Apple's encoder on macOS can make it. Build on a Mac with `hevc_videotoolbox -alpha_quality 0.75 -tag:v hvc1`. | — |
| Loaders as seamless MP4 and WebM loops | ✅ 4 loaders, first frame equals the frame after the last | `assets/motion/video/`, `assets/motion/alpha/` |
| GIF for Google Slides, email, chat | ✅ reveal and loaders, all under 200 KB | `assets/motion/gif/` |
| Animated WebP with transparency | ✅ reveal and loaders | `assets/motion/webp/` |
| Animated SVG for web and apps, reduced-motion fallback built in | ⚠️ Reveal and 3 loaders. The progress loader is drawn by JavaScript and has no SVG version; use its WebM or MP4. | `assets/motion/svg/` |
| Poster frame for every video | ✅ end frame; first frame for loaders | `assets/motion/poster/` |
| Lottie JSON / dotLottie for native apps | ⬜ Needs the animation rebuilt in After Effects with Bodymovin or a Lottie editor. No direct export exists from the showcase. | — |
| Section transition (scanline wipe) as video | ⬜ Its frames include showcase UI text ("01 Presentation") and a panel, not only the logo. Needs a logo-only version in the showcase before export. | — |
| Flash safety (WCAG 2.3.1) | ⚠️ Every MP4 passes a frame-by-frame proxy: whole-frame mean luminance never swings by 0.10 or more, and the largest single-frame step is 0.055. The proxy is not a certified analysis; run PEAT or a Harding test before broadcast use. | `scripts/motion/verify.mjs` |
| Reduced-motion fallback | ✅ animated SVGs fall back to the static logo; poster frames for video | `assets/motion/svg/`, `assets/motion/poster/` |

## Guidance

| Requirement | Status | Where |
| --- | --- | --- |
| Clear space, minimum sizes, misuse rules | ✅ | [brand-guidelines.md](brand-guidelines.md) |
| Which file to use in which tool | ✅ | [for-marketing.md](for-marketing.md) |
| Sizes, tokens, and code snippets for developers | ✅ | [for-developers.md](for-developers.md) |
| Guidelines as a PDF for vendors | ⬜ Export `brand-guidelines.md` to PDF when a vendor asks for one. | — |
