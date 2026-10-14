# Motion renders

Turns the animations in `motion/ixean-logo-motion.html` into video, alpha, GIF, WebP and poster files. The showcase file is never modified.

## Run

```bash
cd scripts/motion
npm install            # once; browsers are not downloaded
node render.mjs                         # everything
node render.mjs --only ignition         # one animation: ignition, formation, dispersal, loader-circuit, loader-rotor, loader-handshake, loader-progress
node render.mjs --concurrency 2         # default 4 parallel captures
node verify.mjs                         # probes, alpha, flash, loop seam, determinism, end frame, sizes
```

`render.mjs` writes frames to the OS temp folder, encodes, then deletes them. Pass `--keep-frames` to keep them.

## Prerequisites

- Node 24, `ffmpeg` and `ffprobe` (with libx264, libvpx-vp9, prores_ks, libwebp_anim), ImageMagick 7 (`magick`) on `PATH`.
- Playwright's Chromium headless shell. `playwright` is pinned to 1.63.0 because that matches the installed browser build (revision 1243). If you bump it, run `npx playwright install chromium-headless-shell`.
- Windows `tar.exe` (bsdtar) for the PNG-sequence zip.

## Outputs

Names are `ixean-{animation}-on-{dark|light}-{WxH}-{fps}.{ext}`, and posters are `ixean-{animation}-on-{dark|light}-{WxH}.png`. Loader animations are `loader-circuit`, `loader-rotor`, `loader-handshake` and `loader-progress`. `on-dark` is for dark backgrounds (white and electric cyan art, `#121212` background in solid files) and `on-light` is for light backgrounds (obsidian and deep cyan art, `#F4F6F8` background in solid files). The same naming applies in `alpha/`, `webp/`, `gif/`, `poster/` and `dist/motion-masters/`.

| Folder | Contents |
| --- | --- |
| `assets/motion/video/` | H.264 MP4, 60 fps. 1920x1080 ignition, formation, dispersal; 1080x1080 and 1080x1920 ignition; 512x512 loaders |
| `assets/motion/alpha/` | VP9 WebM with alpha: 1920x1080 ignition, formation, dispersal; 512x512 loaders |
| `assets/motion/gif/` | Matted on the brand background, loops forever: ignition 480 px wide at 30 fps, loaders 320 px at 20 fps |
| `assets/motion/webp/` | Animated WebP with alpha: ignition 640 px, loaders 256 px, 30 fps |
| `assets/motion/poster/` | PNG end frame of each video (first frame for loaders) |
| `dist/motion-masters/` | ProRes 4444 alpha (1080p 30 fps all three, 4K 30 fps ignition), 4K 60 fps ignition MP4, 4K ignition PNG sequence zip. `dist/` is gitignored, release only |

The transition (scanline wipe) is not rendered: its frames carry UI text ("01 Presentation", "02 Website") and a panel, not logo-only art.

## How capture works

1. Chromium loads the showcase from `file:///` with `reducedMotion: no-preference`. Network requests (Google Fonts) are aborted.
2. The page gets `data-theme` set to `dark` or `light`. Every sibling along the path to the target stage (or loader tile) is hidden, ancestor borders are removed, and the target is pinned `position: fixed` to the full viewport. The page background is the theme `--bg` for solid runs and transparent for alpha runs (`Emulation.setDefaultBackgroundColorOverride`).
3. For a stage, the harness clicks its Replay button, cancels the infinite idle pulse, and pauses every Web Animation on the stage. Loaders are paused the same way.
4. Frame `n` sets `currentTime = n * 1000 / fps` on each animation, waits two animation frames, and takes a CDP screenshot (the clip carries `scale = deviceScaleFactor`, so 4K is a 2x scale of a 1920x1080 viewport).
5. Loader L4 (fill) runs on `requestAnimationFrame` and `performance.now`. For that loader only, an init script replaces both with a manual clock that the harness advances to exactly `n * 1000 / fps`.
6. After every capture the middle frame is rendered again and compared byte for byte with the first render. A mismatch fails the job.

Loader frame counts are one exact loop period at 60 fps: circuit 144, rotor 72, handshake 180, fill 222 (2.8 s fill plus 0.9 s hold). Frame `N` equals frame 0, so the loop is seamless. The loader frames use a 1100-unit square viewBox set by the harness, so ping and rotor overshoot is not clipped; the showcase's own loader viewBox crops tighter.
