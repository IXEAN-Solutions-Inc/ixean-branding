# Brand asset standards

The research behind the files in `assets/`. Each rule names the source it came from. Read this before you add a format, change a size, or hand a file to a vendor.

Research date: 2026-10-15. Platform specs change; re-check the linked page before a large print run or a paid campaign.

For what was produced and what is still open, see [asset-requirements.md](asset-requirements.md).

## Static logo formats

| Format | Use it for | Source |
| --- | --- | --- |
| SVG | Websites, apps, Figma, Canva, PowerPoint. Scales without loss. | https://www.tbhcreative.com/blog/logo-file-type-formats-guide/ |
| Vector PDF | Print vendors and documents. Must be vector, not an embedded image. | same |
| EPS | Sign shops and print vendors that still ask for it. | same |
| PNG (transparent) | Slides, email, social posts, documents. Not for large banners. | same |
| JPG | Only where transparency is not supported. | same |

- Raster files for print need 300 ppi at the final printed size. Enlarging a small file makes the print soft. https://www.psprint.com/helpcenter/artwork/resolution/help/
- PDF/X-1a is the safest print PDF: CMYK only, transparency flattened, everything embedded. PDF/X-4 keeps live transparency and ICC colour and suits modern presses. Ask the printer which one they want. https://img.ly/blog/what-does-print-ready-pdf-mean-understanding-pdf-x-standards-for-professional-printing/

## Colour

- RGB and CMYK depend on the device. No single formula converts one to the other; conversion needs an ICC profile, and some RGB colours cannot be printed. https://en.wikipedia.org/wiki/CMYK_color_model
- The CMYK values in `assets/colors/` are therefore approximations from a named ICC profile. Before a print run, convert with the printer's own profile and check a printed proof.
- Pantone spot colours must be matched against a physical guide such as the Pantone Color Bridge. Online HEX-to-Pantone converters are approximations. https://www.pantone.com/products/graphics/color-bridge-guide-uncoated

## Web and app icons

| Asset | Spec | Source |
| --- | --- | --- |
| `favicon.ico` | 32×32 (16 and 48 embedded), at the site root | https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs |
| `icon.svg` | SVG favicon with a `prefers-color-scheme: dark` style | same |
| `apple-touch-icon.png` | 180×180, logo about 140 px, opaque | same |
| Manifest icons | 192 and 512, plus a 512 maskable icon with the logo inside the central 409 px | same |
| Maskable safe zone | A circle with a radius of 40% of the icon width | https://web.dev/articles/maskable-icon |
| Android adaptive icon | 108×108 dp layers, logo inside the 66×66 dp safe zone, plus a monochrome layer for themed icons | https://developer.android.com/develop/ui/views/launch/icon_design_adaptive |
| Google Play icon | 512×512 PNG, sRGB, 1024 KB or less, full square, opaque | https://developer.android.com/distribute/google-play/resources/icon-design-specifications |
| iOS app icon | 1024×1024 square, unmasked, layered in Icon Composer | https://developer.apple.com/design/human-interface-guidelines/app-icons |

## Social media

| Placement | Size | Source |
| --- | --- | --- |
| Open Graph (link previews) | 1200×630, 8 MB or less | https://developers.facebook.com/docs/sharing/webmasters/images/ |
| LinkedIn company logo / cover | 400×400 / 1512×256, 3 MB or less | https://www.linkedin.com/help/linkedin/answer/a563309 |
| Facebook profile / cover | 320×320 (shown as a circle) / 851×315 sRGB JPG under 100 KB | https://www.facebook.com/help/125379114252045 |
| YouTube banner | 2560×1440, logo inside the central safe area | https://support.google.com/youtube/answer/12950272 |
| X profile / header | 400×400 / 1500×500 | X help centre (blocked during research; values from its search listing) |

Instagram and TikTok publish no official size page. The 1024×1024 avatar is accepted by both.

## Animated logo formats

| Format | Use it for | Alpha | Source |
| --- | --- | --- | --- |
| MP4 (H.264, yuv420p, faststart) | Everywhere: PowerPoint, Keynote, Canva, social, YouTube, websites | No | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs |
| WebM (VP9 alpha) | Transparent overlays on websites in Chrome, Edge, and Firefox | Yes | https://jakearchibald.com/2024/video-with-transparency/ |
| HEVC with alpha | Transparent overlays in Safari | Yes | same |
| ProRes 4444 MOV | Video editors: Premiere, After Effects, Final Cut, DaVinci | Yes | https://support.apple.com/en-us/102207 |
| GIF | Google Slides, email, chat. 256 colours, 1-bit transparency | 1-bit | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types |
| Animated WebP | Small looping web images with full transparency | Yes | same |
| Animated SVG | Web and app loaders in `<img>` or inline. CSS animation runs in `<img>`, JavaScript does not. | Yes | https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image |
| Lottie / dotLottie | Native mobile and web apps | Yes | https://lottie.github.io/ and https://dotlottie.io/ |

Encoding rules:

- YouTube wants MP4, H.264 High, progressive, 4:2:0, with the index at the front (fast start). Frame rates 24 to 60. About 8 Mbps for 1080p and 35 to 45 Mbps for 4K. https://support.google.com/youtube/answer/1722171
- ffmpeg puts the index at the front only with `-movflags +faststart`. https://ffmpeg.org/ffmpeg-formats.html
- For a looping web animation, use `<video autoplay loop muted playsinline>` with a WebM source first and an MP4 source second. An MP4 is usually a fraction of the size of the same GIF. Video dimensions must be even. https://web.dev/articles/replace-gifs-with-videos
- Safari does not play VP9 alpha. Safari needs HEVC with alpha, which only Apple's encoder on macOS produces. https://jakearchibald.com/2024/video-with-transparency/
- Broadcast safe areas for 16:9: keep graphics 5% in from each edge. https://tech.ebu.ch/publications/r095

## Accessibility for animation

- Honour `prefers-reduced-motion: reduce`: remove or replace non-essential motion. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- WCAG 2.2.2: motion that starts on its own, runs longer than 5 seconds, and sits next to other content needs a way to pause, stop, or hide it. The loaders loop forever, so show them only while something is loading. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- WCAG 2.3.1: no more than three flashes in any one second. https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

## Where each tool stands

| Tool | Images | Animation | Source |
| --- | --- | --- | --- |
| Canva | PNG, SVG (3 MB or less), WebP | MP4, MOV, WebM, GIF. Transparency in video turns black; use GIF or animated WebP for a transparent overlay. | https://www.canva.dev/docs/apps/uploading-assets/ |
| PowerPoint | SVG (Microsoft 365 / 2019 and later), PNG | MP4 (H.264). macOS PowerPoint does not play WebM. | https://support.microsoft.com/en-us/office/video-and-audio-file-formats-supported-in-powerpoint-d8b12450-26db-4c7b-a5c1-593d3418fb59 |
| Google Slides | PNG, JPG, GIF. No SVG. | GIF, or MP4 uploaded to Google Drive or YouTube | https://developers.google.com/workspace/slides/api/guides/add-image and https://workspaceupdates.googleblog.com/2017/02/insert-videos-from-google-drive-in.html |
| Keynote | PNG, PDF | MP4, ProRes MOV | https://support.apple.com/guide/keynote/tan12af068f9/mac |
| Premiere, After Effects, Final Cut, DaVinci | PNG, PDF, SVG (AE) | ProRes 4444 MOV for transparency | https://support.apple.com/en-us/102207 |
| CapCut | PNG | MP4. Transparent video support is unreliable; test before relying on it. | No official page found |

## Logo usage rules: reference pattern

Other brand systems define clear space as a fraction of the logo, a minimum size in pixels and millimetres, and a list of forbidden changes:

- Spotify: clear space is half the icon height. Minimum full logo 70 px on screen, 20 mm in print. https://developer.spotify.com/documentation/design
- GitHub: do not rearrange, add effects, recolour, distort, or place the logo on a low-contrast background. https://brand.github.com/foundations/logo
- Atlassian: drops the strapline below a set width (280 px). https://atlassian.design/foundations/logos

IXEAN's own values are in [brand-guidelines.md](brand-guidelines.md).
