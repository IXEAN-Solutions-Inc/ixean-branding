# AGENTS.md

IXEAN logo source files and a single-file animated logo showcase. Read `README.md` first for the colour table, the file list, and the deploy command.

## Scope

- `*.png` and `IXEAN LOGOTYPES.psd` are the brand masters. Treat them as read-only. Never re-export, resize, recolour, or overwrite them.
- `motion/ixean-logo-motion.html` is the showcase and the only file normally edited. It is the source of truth: no template or generator for it is kept in the repo.
- `motion/ixean-paths.json` holds the traced vector paths. Change it only when the logo artwork itself changes (see "Regenerating the paths" in `README.md`).

This folder is the public repository https://github.com/IXEAN-Solutions-Inc/ixean-branding. The PSD is stored with Git LFS. Commit before a large rewrite.

## Brand rules

- Use only the four brand colours: obsidian `#121212`, white `#F4F6F8`, electric cyan `#00CFEF`, deep cyan `#1B5F6F`. Electric cyan belongs on dark backgrounds and deep cyan on light ones.
- Never redraw, restyle, re-space, or substitute a font for the mark, wordmark, or tagline. Every animation must end on a frame identical to the matching PNG lockup.
- Render logo paths with `fill-rule="evenodd"`. Without it the ring holes and letter counters fill in solid.

## How the showcase is built

- Plain JavaScript with the Web Animations API, inline SVG, inline CSS. No libraries and no build step. Keep it that way so the file opens offline and deploys as one file.
- Path data is inlined in the `PATHS` constant. `MARK`, `RINGS`, `BUS`, and `ROUTES` describe the brandmark geometry in the traced `viewBox="0 0 2822 1440"` coordinates: ring centres, the centre bar, and the centre-line routes used for masks and signal packets.
- Draw-on uses an SVG mask of thick centre-line strokes (`MASK_TRACE_W`, `MASK_RING_R`, `MASK_RING_W`) over the real filled path. Do not replace this with outline stroking: the final frame would no longer match the logo.
- Each demo is an `<article class="card" data-stage="...">` built by a function in `BUILDERS`. `data-replay` and `data-fullscreen` buttons are wired by stage. Replay must cancel the stage's running animations before starting again so animations never stack.
- Colours come only from CSS custom properties set on `:root[data-theme][data-logo]`:
  - logo: `--lf` fill, `--la` accent, `--lc` packet core, `--lp` pulse on a solid mark, `--le` fill edge, `--gk` glow strength
  - page: `--bg`, `--surface`, `--text`, `--muted`, `--line`, and similar
  Never put a hex colour in JavaScript or in animation keyframes. A colour change runs as an opacity fade between layers, so the theme toggle restyles running animations without restarting them.
- Loader panels carry fixed `.lp.dark` / `.lp.light` scopes and follow only the colour/mono toggle. The light hero (`.stage.hero`) always stays light.
- Respect `prefers-reduced-motion` through the `REDUCED` constant: show end states with a fade, and cancel idle loops.
- Theme and logo choices persist in `localStorage` (`ixean-theme`, `ixean-logo`). Keep every storage access inside `try/catch`.

## Verifying a change

There are no automated tests. Verify in a real browser with `npx -y chrome-devtools-axi`:

1. Open the file through a `file:///` URL and confirm the console has no errors.
2. Check all four combinations: dark/light theme with colour/mono logo.
3. Freeze animations to check specific frames:
   `document.getAnimations().forEach(a => { a.pause(); a.currentTime = T })`.
   Loader L4 runs on `requestAnimationFrame` and does not freeze this way.
4. Compare the Ignition end state (about 4.4 s) against the matching PNG. Ring holes and letter counters must be open, with no unrevealed slivers.
5. Resize to 375 px wide and confirm `document.documentElement.scrollWidth` is 375.
6. Click Replay several times and confirm the stage's animation count does not grow.

Report what was checked by eye and what was measured. Do not call a frame "pixel-identical" without a pixel diff.

## Deploying

Deploy only when asked. The live site is public at https://ixean-logo-motion.pages.dev (Cloudflare Pages project `ixean-logo-motion`), and every deploy is visible immediately. Use the command in `README.md`. It renames the HTML to `index.html` and adds the `X-Robots-Tag: noindex` header, and both steps are required.

Read the API token and account ID from environment variables. Never write either into a file, a command saved to disk, or chat output. If a token turns up in a file or a log, tell the user so they can revoke and replace it.

## Known weak spots

- Ignition: the expo-out ease puts most of the trace travel before 1.0 s, so the signal packets slow down before the bloom.
- Formation: the fly-in lands by about 0.6 s and reads short.
- Mid-animation frames can show a small seam where a trace meets a ring. End frames are exact.
- The nav hover demo has no tap handler, so touch screens never trigger it.
- At 375 px the lockup is about 230 px wide and the tagline is very small.
