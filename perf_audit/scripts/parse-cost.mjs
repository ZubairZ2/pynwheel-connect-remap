// Client-side cost of reading a floor SVG the way the map does: DOMParser, mount a copy, getBBox+getCTM
// on every plottable shape (measureFloorSvg), then parse + import again for the layer (SvgPlanLayer).
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');
const S = process.env.PERF_SCRATCH ?? '<scratchpad with session.json and assets/>';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
for (const f of readdirSync(`${S}/assets`).filter((n) => n.endsWith('.svg')).sort()) {
  const text = readFileSync(`${S}/assets/${f}`, 'utf8');
  const r = await page.evaluate((text) => {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
      const t1 = performance.now();
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
      const svg = document.importNode(parsed.documentElement, true);
      host.appendChild(svg); document.body.appendChild(host);
      const t2 = performance.now();
      const shapes = svg.querySelectorAll('polygon[id],path[id],rect[id],circle[id],ellipse[id],polyline[id]');
      let n = 0; shapes.forEach((s) => { try { s.getBBox(); s.getCTM(); n++; } catch {} });
      const t3 = performance.now();
      document.body.removeChild(host);
      const p2 = new DOMParser().parseFromString(text, 'image/svg+xml'); const root2 = document.importNode(p2.documentElement, true);
      const host2 = document.createElement('div'); host2.appendChild(root2); document.body.appendChild(host2);
      const t4 = performance.now();
      document.body.removeChild(host2);
      runs.push({ parse: t1 - t0, mount: t2 - t1, bbox: t3 - t2, layerParseMount: t4 - t3, shapes: n, elements: svg.querySelectorAll('*').length });
    }
    const best = runs.reduce((a, b) => (a.parse + a.mount + a.bbox + a.layerParseMount < b.parse + b.mount + b.bbox + b.layerParseMount ? a : b));
    return { ...best, total: best.parse + best.mount + best.bbox + best.layerParseMount };
  }, text);
  console.log(`${f.padEnd(26)} ${String(text.length).padStart(8)} bytes  parse=${r.parse.toFixed(0)}ms mount=${r.mount.toFixed(0)}ms bbox=${r.bbox.toFixed(0)}ms(${r.shapes} shapes) layer=${r.layerParseMount.toFixed(0)}ms  total=${r.total.toFixed(0)}ms  elements=${r.elements}`);
}
await browser.close();
