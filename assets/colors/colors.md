# IXEAN brand colours

| Name | HEX | RGB | CMYK % (C / M / Y / K, approx) | Pantone | Use |
| --- | --- | --- | --- | --- | --- |
| Obsidian | `#121212` | 18, 18, 18 | 71 / 67 / 67 / 82 | TBD — match with physical guide | Mark and wordmark on light backgrounds; dark background |
| White | `#F4F6F8` | 244, 246, 248 | 2 / 2 / 1 / 0 | TBD — match with physical guide | Mark and wordmark on dark backgrounds; light background |
| Electric Cyan | `#00CFEF` | 0, 207, 239 | 63 / 0 / 7 / 0 | TBD — match with physical guide | Tagline and accents on dark backgrounds only |
| Deep Cyan | `#1B5F6F` | 27, 95, 111 | 88 / 51 / 44 / 20 | TBD — match with physical guide | Tagline and accents on light backgrounds only |

These four colours are the only colours the logo files use.

## CMYK

CMYK values are approximate. GPL Ghostscript 10.06.0 (2025-09-09) converted the RGB values with
`-sColorConversionStrategy=CMYK`, reading RGB as `Artifex Software sRGB ICC Profile` (`default_rgb.icc`)
and writing `Artifex CMYK SWOP Profile` (`default_cmyk.icc`). The print PDFs in
`../logo/print/` use the same conversion. Proof with your printer, and re-convert with
their profile if they supply one.

## Pantone

No Pantone match has been made. Match each colour against a physical guide before specifying one.

## Files

- `tokens.css`: CSS custom properties, `--ixean-{name}`.
- `tokens.json`: design tokens in the W3C Design Tokens format.
- `tokens.scss`: Sass variables and the `$ixean-colors` map.
- `tailwind.preset.js`: Tailwind preset adding colours under `ixean`, for example `bg-ixean-obsidian`.
- `palette.ase`: Adobe Swatch Exchange file with the four RGB swatches.
