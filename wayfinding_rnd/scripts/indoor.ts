import { readFileSync } from 'node:fs';
import { readSvgTree } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/tests/e2e/helpers/svgTree';
import { detectSvgStructure } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/detectLayers';
import { rootShapes } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/shapes';
import { inferCorridors } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/inferCorridors';
const A = `${process.env.SCRATCH}/assets`;
for (const [name, floorFile, bgFile] of [['8005_f1', '8005_4606_f1.svg', '8005_bg.svg'], ['1412_1865', '1412_1865.svg', null], ['1411_1867', '1411_1867.svg', null]] as const) {
  const floor = readSvgTree(readFileSync(`${A}/${floorFile}`, 'utf8'));
  const bg = bgFile ? readSvgTree(readFileSync(`${A}/${bgFile}`, 'utf8')) : null;
  const s = detectSvgStructure(floor, bg);
  const footprints = rootShapes(s.footprintShapes, 8);
  const rooms = rootShapes(s.roomShapes, 8);
  for (const minHalfWidth of [undefined, 3, 4, 5, 6]) {
    const r = inferCorridors(footprints, rooms, { minHalfWidth });
    const total = r.runs.reduce((sum, run) => sum + run.points.reduce((l, p, i) => (i ? l + Math.hypot(p.x - run.points[i - 1].x, p.y - run.points[i - 1].y) : 0), 0), 0);
    const widths = r.runs.map((run) => run.halfWidth).sort((a, b) => a - b);
    console.log(name, 'minHalfWidth', minHalfWidth ?? 'default', 'runs', r.runs.length, 'length', Math.round(total), 'halfWidth median', widths[Math.floor(widths.length / 2)]?.toFixed(1), 'reason', r.reason);
  }
}
