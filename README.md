# IXEAN brand assets

The IXEAN logo in every format the team needs: vector, print, web, app icons, social, and animated.

- **Download everything:** [ixean-brand-kit.zip](https://github.com/IXEAN-Solutions-Inc/ixean-branding/releases/latest/download/ixean-brand-kit.zip) (no GitHub account needed). Video masters for editors are on the [release page](https://github.com/IXEAN-Solutions-Inc/ixean-branding/releases/latest).
- **See the animations live:** https://ixean-logo-motion.pages.dev

## Start here

| You are | Read |
| --- | --- |
| Marketing, sales, design, events | [Which logo file to use](docs/for-marketing.md) |
| A developer | [Using the logo in code](docs/for-developers.md) |
| Anyone placing the logo | [Logo guidelines](docs/brand-guidelines.md): clear space, minimum size, what not to do |

## Brand colours

| Name | HEX | RGB | Use |
| --- | --- | --- | --- |
| Obsidian | `#121212` | 18, 18, 18 | Logo on light backgrounds; dark background |
| White | `#F4F6F8` | 244, 246, 248 | Logo on dark backgrounds; light background |
| Electric cyan | `#00CFEF` | 0, 207, 239 | Tagline and accents on dark backgrounds only |
| Deep cyan | `#1B5F6F` | 27, 95, 111 | Tagline and accents on light backgrounds only |

CMYK values, tokens, and swatch files: [`assets/colors/`](assets/colors/colors.md).

## What is in the repository

```
assets/
├── logo/
│   ├── svg/        vector logos for web, apps, Canva, PowerPoint
│   ├── print/      vector PDF (RGB, CMYK) and EPS for print vendors
│   ├── png/        transparent PNG at 512, 1024, 2048, 4096 px
│   └── jpg/        logo on a solid brand background
├── web/            optimized SVG, AVIF, WebP, PNG at 320, 640, 1280 px
├── app-icons/      favicon, apple-touch icon, PWA, iOS, Android, Google Play
├── social/         avatars, link-preview images, LinkedIn, Facebook, X, YouTube banners
├── colors/         CSS, SCSS, JSON, Tailwind tokens, Adobe swatches
└── motion/
    ├── video/      MP4 (H.264): 16:9, square, vertical, loaders
    ├── alpha/      WebM with transparency for websites
    ├── gif/        GIF for Google Slides, email, chat
    ├── webp/       animated WebP with transparency
    ├── svg/        animated SVG for websites and apps
    └── poster/     still frames for each video
docs/               guides, standards, and the requirements checklist
motion/             the animated showcase (source of every animation)
scripts/            builds that regenerate everything in assets/
*.png, *.psd        original logo masters (do not edit)
```

ProRes 4444 video with transparency (for Premiere, After Effects, Final Cut, DaVinci), 4K video, and a 4K PNG sequence are too large for the repository. They are attached to each [release](https://github.com/IXEAN-Solutions-Inc/ixean-branding/releases/latest).

## Logo masters

The original files in the repository root are the source of truth. The PNG names end with the colour variant (`obsidian`, `white`, `obsidian deep cyan`, `white electric cyan`). "No slogan" variants drop the "AUTONOMOUS SYSTEMS" tagline. `IXEAN LOGOTYPES.psd` is the Photoshop master.

## For maintainers

- [docs/asset-standards.md](docs/asset-standards.md): the researched standards behind every format and size
- [docs/asset-requirements.md](docs/asset-requirements.md): what is done and what is still open
- [scripts/README.md](scripts/README.md): rebuilding the assets
- [docs/motion-showcase.md](docs/motion-showcase.md): how the animated showcase works
- [docs/deploying.md](docs/deploying.md): deploying the showcase site
- [docs/releasing.md](docs/releasing.md): publishing a brand-kit release
