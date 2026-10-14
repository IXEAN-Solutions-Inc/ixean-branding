/*
 * Runs inside the showcase page (Playwright `page.evaluate`). It must stay self-contained: it is
 * serialized with `toString()`, so it cannot close over anything from this module.
 *
 * It builds one logo animation with the showcase's own builders, then reads the Web Animations
 * back out of the DOM so build.mjs can re-emit them as plain CSS @keyframes.
 *
 * Web Animations API: https://www.w3.org/TR/web-animations-1/
 * - Effect `easing` shapes the whole iteration, while CSS `animation-timing-function` shapes each
 *   keyframe interval. They only agree for two-keyframe effects, so every other eased effect is
 *   baked into dense linear keyframes (BAKE_STEPS) by sampling the live computed style.
 * CSS Animations Level 1: https://www.w3.org/TR/css-animations-1/#keyframes
 */
export function extractInPage({ kind, mode, idle, viewBox, size, title, label, prefix }) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BAKE_STEPS = 40;
  const BAKE_SKEW = 2;
  const DECIMALS = 3;
  const BRAND_WHITE = "#F4F6F8";
  const META_KEYS = ["offset", "computedOffset", "easing", "composite"];

  const round = (n) => String(+n.toFixed(DECIMALS));
  const kebab = (p) => p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

  /* Computed transforms come back as matrix(); fold them to the shortest equal form. */
  function normTransform(v) {
    const m = /^matrix\((.+)\)$/.exec(v);
    if (!m) return v;
    const [a, b, c, d, e, f] = m[1].split(",").map((s) => +s);
    const plain = (n, t) => Math.abs(n - t) < 1e-6;
    if (plain(a, 1) && plain(d, 1) && plain(b, 0) && plain(c, 0)) {
      if (plain(e, 0) && plain(f, 0)) return "none";
      return plain(f, 0) ? `translate(${round(e)}px)` : `translate(${round(e)}px,${round(f)}px)`;
    }
    if (plain(a, d) && plain(b, 0) && plain(c, 0) && plain(e, 0) && plain(f, 0)) return `scale(${round(a)})`;
    return `matrix(${[a, b, c, d, e, f].map(round).join(",")})`;
  }

  function norm(prop, v) {
    if (prop === "transform") return normTransform(v);
    if (prop === "opacity") return round(+v);
    if (prop === "strokeDashoffset") return v.replace(/px$/, "");
    return v;
  }

  const host = document.createElement("div");
  host.className = `lp ${mode}`;
  document.body.append(host);
  const tl = new Timeline();
  let svg;
  if (kind === "ignition") {
    buildIgnition(host, tl);
    svg = host.querySelector("svg");
  } else {
    svg = svgEl(LOADER_VB, loaderMarkup(kind, LOGO, uid("ld")), "ld");
    host.append(svg);
    animateLoader(kind, svg, tl);
  }

  if (kind === "ignition" && !idle) {
    tl.anims.filter((a) => a.effect.target.classList.contains("pulse")).forEach((a) => a.cancel());
    svg.querySelectorAll(".pulse").forEach((p) => p.parentNode.remove());
    svg.querySelector('clipPath[id$="-c"]').remove();
  }

  /* Resolve var(--x) to this variant's literal colour, and move paint to presentation attributes. */
  const vars = getComputedStyle(host);
  const resolve = (v) => v.replace(/var\((--[\w-]+)\)/g, (_, n) => vars.getPropertyValue(n).trim()).replace(/^#FFFFFF$/, BRAND_WHITE);
  svg.querySelectorAll("[style]").forEach((el) => {
    ["fill", "stroke", "stop-color"].forEach((p) => {
      const v = el.style.getPropertyValue(p);
      if (v) el.setAttribute(p, resolve(v));
    });
    el.removeAttribute("style");
  });

  const anims = svg.getAnimations({ subtree: true });
  anims.forEach((a) => a.pause());
  const recs = anims.map((a) => {
    const kfs = a.effect.getKeyframes();
    const props = [...new Set(kfs.flatMap((k) => Object.keys(k).filter((p) => !META_KEYS.includes(p))))];
    const el = a.effect.target;
    return { a, el, kfs, props, t: a.effect.getComputedTiming(), fillBox: getComputedStyle(el).transformBox === "fill-box" };
  });

  const seen = new Map();
  recs.forEach((r) => {
    const used = seen.get(r.el) ?? new Set();
    r.props.forEach((p) => { if (used.has(p)) throw new Error(`two animations drive ${p} on one element`); used.add(p); });
    seen.set(r.el, used);
  });

  const read = (r) => { const cs = getComputedStyle(r.el); return Object.fromEntries(r.props.map((p) => [p, norm(p, cs[p])])); };

  recs.forEach((r) => {
    const linear = r.t.easing === "linear";
    const twoStop = r.kfs.length === 2 && r.kfs[0].easing === "linear";
    if (linear || twoStop) {
      r.frames = r.kfs.map((k, i) => ({
        offset: k.computedOffset,
        easing: !linear && i === 0 ? r.t.easing : k.easing,
        decl: Object.fromEntries(r.props.filter((p) => p in k).map((p) => [p, norm(p, k[p])])),
      }));
      return;
    }
    r.frames = Array.from({ length: BAKE_STEPS + 1 }, (_, i) => {
      const offset = (i / BAKE_STEPS) ** BAKE_SKEW;
      r.a.currentTime = r.t.delay + offset * r.t.duration;
      return { offset, decl: read(r) };
    });
  });

  /* End state becomes the static state, so animation:none (reduced motion) shows the final logo. */
  const finite = recs.filter((r) => r.t.iterations !== Infinity);
  finite.forEach((r) => r.a.finish());
  const ends = finite.map(read);
  recs.forEach((r) => r.a.cancel());
  finite.forEach((r, i) => {
    const base = read(r);
    r.props.filter((p) => base[p] !== ends[i][p]).forEach((p) => r.el.style.setProperty(kebab(p), ends[i][p]));
  });

  const baseEls = [...svg.querySelectorAll(".base")];
  const hideEls = [...svg.querySelectorAll(".run, .rotor, .hs")];
  svg.querySelectorAll("*").forEach((el) => ["class", "aria-hidden", "focusable"].forEach((n) => el.removeAttribute(n)));
  baseEls.forEach((el) => el.setAttribute("class", "b"));
  hideEls.forEach((el) => el.setAttribute("class", "x"));

  const groups = new Map();
  recs.forEach((r) => {
    const g = groups.get(r.el) ?? { cls: `a${groups.size}`, fillBox: r.fillBox, list: [] };
    g.list.push({
      timing: {
        delay: r.t.delay,
        duration: r.t.duration,
        iterations: r.t.iterations === Infinity ? "infinite" : r.t.iterations,
        direction: r.t.direction,
      },
      frames: r.frames,
    });
    groups.set(r.el, g);
  });
  groups.forEach((g, el) => el.setAttribute("class", [el.getAttribute("class"), g.cls].filter(Boolean).join(" ")));

  ["preserveAspectRatio", "xmlns", "aria-hidden", "focusable"].forEach((n) => svg.removeAttribute(n));
  const [w, h] = size;
  svg.setAttribute("class", prefix);
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  const titleEl = document.createElementNS(SVG_NS, "title");
  titleEl.textContent = title;
  const styleEl = document.createElementNS(SVG_NS, "style");
  styleEl.textContent = "/*CSS*/";
  svg.prepend(styleEl);
  svg.prepend(titleEl);

  const markup = new XMLSerializer().serializeToString(svg);
  host.remove();
  return { markup, groups: [...groups.values()] };
}
