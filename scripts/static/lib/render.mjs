import { chromium } from 'playwright';

// sRGB output keeps screenshots independent of the host display profile.
const LAUNCH_ARGS = ['--force-color-profile=srgb', '--font-render-hinting=none'];

function page(svg, cssWidth, cssHeight) {
  return (
    '<!doctype html><meta charset="utf-8"><title>IXEAN</title>' +
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${cssWidth};height:${cssHeight}}</style>` +
    svg
  );
}

export async function openRenderer() {
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const tab = await browser.newPage({ deviceScaleFactor: 1 });
  return {
    // Transparent PNG of an SVG at exactly width x height pixels.
    async png(svg, width, height) {
      await tab.setViewportSize({ width, height });
      await tab.setContent(page(svg, `${width}px`, `${height}px`));
      return tab.screenshot({ type: 'png', omitBackground: true });
    },
    // Vector PDF whose single page is exactly width x height CSS pixels (0.75 pt each).
    async pdf(svg, width, height) {
      const html = page(svg, `${width}px`, `${height}px`).replace(
        '<style>',
        `<style>@page{size:${width}px ${height}px;margin:0}`,
      );
      await tab.setContent(html);
      return tab.pdf({ preferCSSPageSize: true, printBackground: true });
    },
    close: () => browser.close(),
  };
}
