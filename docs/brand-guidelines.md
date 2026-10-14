# IXEAN logo guidelines

The rules for placing the IXEAN logo. They apply to every file in `assets/`.

## The lockups

| Lockup | Files | Use it when |
| --- | --- | --- |
| Horizontal | `ixean-horizontal-*` | Default. Website headers, documents, slides, banners. |
| Horizontal, no tagline | `ixean-horizontal-no-tagline-*` | The horizontal lockup is too small for the tagline to read. |
| Vertical | `ixean-vertical-*` | Square or tall spaces: posters, title slides, merchandise. |
| Vertical, no tagline | `ixean-vertical-no-tagline-*` | The vertical lockup is too small for the tagline to read. |
| Mark | `ixean-mark-*` | Avatars, app icons, favicons, watermarks, and loaders. |

## Colour variants

| Variant | Artwork | Tagline | Place it on |
| --- | --- | --- | --- |
| `color-on-light` | Obsidian `#121212` | Deep cyan `#1B5F6F` | White or a light, plain background |
| `mono-on-light` | Obsidian | Obsidian | Light backgrounds where one colour is required (fax, stamps, one-colour print) |
| `color-on-dark` | White `#F4F6F8` | Electric cyan `#00CFEF` | Obsidian or a dark, plain background |
| `mono-on-dark` | White | White | Dark backgrounds where one colour is required (embossing, etching, single-colour reverse print) |

Lockups without a tagline and the mark have only `on-light` (obsidian) and `on-dark` (white).

Electric cyan is for dark backgrounds only. Deep cyan is for light backgrounds only. Swapping them makes the tagline fail contrast.

The full colour specification, with CMYK, is in [`assets/colors/colors.md`](../assets/colors/colors.md).

## Clear space

The unit of clear space is **R**, the outer diameter of one ring in the mark.

Keep at least **1R** of empty space on every side of the logo. Nothing goes inside that space: no text, no edge of the page, no other logo, no busy photo detail.

The print PDFs and the JPG files already include 1R of space. The SVG, PNG, and EPS files are cropped tight to the artwork, so add the space yourself in layout.

## Minimum size

Below these sizes the tagline or the ring holes stop reading. Switch to the next lockup down instead of shrinking further.

| Lockup | Screen, width | Print, width |
| --- | --- | --- |
| Horizontal | 240 px | 50 mm |
| Horizontal, no tagline | 120 px | 25 mm |
| Vertical | 160 px | 35 mm |
| Vertical, no tagline | 80 px | 18 mm |
| Mark | 16 px tall (favicon only), 24 px tall elsewhere | 6 mm tall |

At these sizes the tagline letters are about 6 px tall on screen and 1.5 mm tall in print.

## Do not

- Stretch, squash, rotate, or skew the logo. Scale it proportionally only.
- Redraw, re-space, or retype the wordmark or tagline. Always use the supplied files.
- Change the colours, add gradients, or use colours other than the four brand colours.
- Add shadows, outlines, glows, or bevels. The motion files already contain the approved glow.
- Rearrange the mark, wordmark, and tagline into a new layout.
- Place the logo on a busy photo or a background with low contrast. Use a plain area or a solid brand colour behind it.
- Put electric cyan on a light background or deep cyan on a dark one.
- Crop any part of the logo.

## Motion

- Ignition and Formation end on the static logo. Do not cut either video before its end frame.
- Use the reveal (Ignition) to open a video or presentation and the outro (Dispersal) to close it. Use each one once per piece.
- Loaders loop forever. Show them only while something is loading, and remove them when it finishes. A loop that runs longer than 5 seconds next to other content must have a way to stop (WCAG 2.2.2).
- On websites and apps, respect the reduced-motion setting: show the static logo instead. The animated SVG files do this automatically.
- An animation must not flash more than three times in a second (WCAG 2.3.1). The supplied videos pass an automated brightness check; re-check any edit that adds flashes or fast cuts.
