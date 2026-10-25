import { readFileSync } from 'node:fs';
import { readSvgTree } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/tests/e2e/helpers/svgTree';
import { inferStreets } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/inferStreets';
const S = process.env.SCRATCH!;
const floor = readSvgTree(readFileSync(`${S}/assets/8005_4606_f1.svg`, 'utf8'));
const bg = readSvgTree(readFileSync(`${S}/assets/8005_bg.svg`, 'utf8'));
const streets = inferStreets(floor, bg);
const g = streets.grid;
const at = (x: number, y: number) => { const c = Math.floor((x - g.originX) / g.cell); const r = Math.floor((y - g.originY) / g.cell); return c < 0 || r < 0 || c >= g.w || r >= g.h ? -1 : r * g.w + c; };
const legs = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { points: [number, number][]; length_px: number; from: string; to: string }[];
for (const leg of legs) {
  const pts = leg.points;
  let total = 0, walk = 0, bld = 0;
  // sample every 2 units along the polyline; the first and last segments are the stop links (through the unit's own building)
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.ceil(len / 2));
    const isLink = i === 0 || i === pts.length - 2;
    for (let k = 0; k <= n; k += 1) {
      const t = k / n; const x = ax + t * (bx - ax), y = ay + t * (by - ay);
      const idx = at(x, y); if (idx < 0 || isLink) continue;
      total += 1; if (streets.walk[idx]) walk += 1; if (streets.buildings[idx]) bld += 1;
    }
  }
  console.log(`${leg.from} -> ${leg.to}: length ${leg.length_px} px, ${pts.length} points; network part: ${total} samples, ${Math.round((100 * walk) / total)}% on pavement, ${Math.round((100 * bld) / total)}% inside a building`);
}
