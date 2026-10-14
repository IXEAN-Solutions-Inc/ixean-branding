# Print files

Vector logo files for print. Each `ixean-{lockup}-{variant}` has three formats:

- `-rgb.pdf`: RGB vector PDF straight from the SVG, for screens and office printers.
- `-cmyk.pdf`: CMYK vector PDF flagged PDF/X-3:2002 by Ghostscript.
- `-cmyk.eps`: CMYK EPS from the CMYK conversion.

## Page and clear space

The PDF page is the artwork plus 1R of clear space on every side, where R is the
outer diameter of one mark ring (see `../trace-report.json` for R per lockup).
The page opens at 8 in on its long side; the files are vector, so scale freely.
The EPS bounding box is tight to the artwork because Ghostscript computes it from
the drawn content, so keep 1R of clear space when placing an EPS.

The `on-dark` variants are white or light artwork on a transparent page. They look
blank on a white viewer background.

## CMYK conversion

GPL Ghostscript 10.06.0 (2025-09-09) converted RGB to CMYK with `-sColorConversionStrategy=CMYK`:

- source: `Artifex Software sRGB ICC Profile` (`default_rgb.icc`)
- destination: `Artifex CMYK SWOP Profile` (`default_cmyk.icc`)

The CMYK values are an approximation. Proof with your printer and re-convert with their
profile if they ask for one. Pantone matches are not set; match against a physical guide.

## PDF/X

`-cmyk.pdf` carries Ghostscript's PDF/X-3:2002 markers: version key, output intent, trim
and bleed boxes, and no RGB. It has not been checked with a preflight tool (none was available).
The output intent names Ghostscript's generic profile and is not a press condition, so
replace it with the printer's profile before sending for press.
