import { readFileSync, writeFileSync } from 'node:fs';
import { readSvgTree } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/tests/e2e/helpers/svgTree';
import { detectHallways } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/extract';
import { elementCentres } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/elementCentre';
import { baseId } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/detectLayers';
import { accumulatedMatrix, applyToPoint } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/matrix';
import { parsePathToSubpaths } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/pathData';
import { localPolylines } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/shapes';
import { descendants, idOf, isHiddenInTree, type SvgEl } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/svgTree';
import type { Point, StopCandidate, StopConnection, WayfindingGraph } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/types';
import { buildStreetNetwork, classifyShapes, distanceToOutside, type Grid, type StreetNetwork } from './streetNetwork';

const S = process.env.SCRATCH!;
const A = `${S}/assets`;

interface Case { name: string; floor: string; background: string | null; stops: { kind: 'db'; file: string; floor?: number; floorplate?: number } | { kind: 'units-layer' } | { kind: 'colour-rooms' } | { kind: 'none' }; }

const CASES: Case[] = [
  { name: '8005_f1', floor: '8005_4606_f1.svg', background: '8005_bg.svg', stops: { kind: 'db', file: 'stops_8005.json', floor: 1 } },
  { name: '8005_f3', floor: '8005_4604_f3.svg', background: '8005_bg.svg', stops: { kind: 'db', file: 'stops_8005.json', floor: 3 } },
  { name: '1412_3638', floor: '1412_3638.svg', background: null, stops: { kind: 'colour-rooms' } },
  { name: '1412_3659', floor: '1412_3659.svg', background: null, stops: { kind: 'units-layer' } },
  { name: '1412_1865', floor: '1412_1865.svg', background: null, stops: { kind: 'units-layer' } },
  { name: '1411_1867', floor: '1411_1867.svg', background: null, stops: { kind: 'db', file: 'stops_1411_1867.json' } },
  { name: '7860_4439', floor: '7860_4439.svg', background: null, stops: { kind: 'db', file: 'stops_7860.json' } },
  { name: '7955_4544', floor: '7955_4544.svg', background: '7955_bg.svg', stops: { kind: 'units-layer' } },
  { name: '7954_4530', floor: '7954_4530.svg', background: '7954_bg.svg', stops: { kind: 'units-layer' } }
];

const only = process.argv.slice(2);

const centroid = (ring: Point[]): Point => {
  let x = 0, y = 0;
  for (const p of ring) { x += p.x; y += p.y; }
  return { x: x / ring.length, y: y / ring.length };
};

const unitsLayerStops = (root: SvgEl): StopCandidate[] => {
  const out: StopCandidate[] = [];
  const layers = descendants(root).filter((el) => ['units', 'unit'].includes(baseId(idOf(el))) && !isHiddenInTree(el));
  for (const layer of layers) for (const el of descendants(layer)) {
    if (isHiddenInTree(el)) continue;
    if (!['polygon', 'path', 'rect'].includes(el.tag)) continue;
    const m = accumulatedMatrix(el, root);
    let ring: Point[] | null = null;
    if (el.tag === 'path') { const p = parsePathToSubpaths(el.attrs.d ?? '', { flattenStep: 4, matrix: m }); ring = p.subpaths[0] ?? null; }
    else { const l = localPolylines(el.tag, el.attrs); ring = l.polylines[0]?.map((q) => applyToPoint(m, q)) ?? null; }
    if (!ring || ring.length < 3) continue;
    const label = el.parent && idOf(el.parent) && el.parent.tag === 'g' && el.parent.children.length <= 3 ? idOf(el.parent) : idOf(el) || `unit ${out.length + 1}`;
    out.push({ groupId: `svg:${out.length}`, label, anchor: centroid(ring) });
  }
  return out;
};

const colourRoomStops = (root: SvgEl): StopCandidate[] => {
  const c = classifyShapes(root);
  const out: StopCandidate[] = [];
  for (const s of c.shapes) {
    if (!(s.role === 'block' && s.source === 'colour' && s.building)) continue;
    const ring = s.rings[0];
    if (!ring || ring.length < 4) continue;
    let a = 0;
    for (let i = 0; i < ring.length - 1; i += 1) a += ring[i].x * ring[i + 1].y - ring[i + 1].x * ring[i].y;
    a = Math.abs(a) / 2;
    if (a < 300 || a > 12000) continue;
    out.push({ groupId: `room:${out.length}`, label: `room ${out.length + 1}`, anchor: centroid(ring) });
  }
  // one per place: drop duplicates drawn twice (Figma shadow copies)
  const seen = new Set<string>();
  return out.filter((s) => { const k = `${Math.round(s.anchor.x / 3)},${Math.round(s.anchor.y / 3)}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

const dbStops = (root: SvgEl, spec: { file: string; floor?: number; floorplate?: number }): StopCandidate[] => {
  const rows = JSON.parse(readFileSync(`${S}/out/${spec.file}`, 'utf8')) as { id: number; name: string; floor: number; pointer: string | null; selector: string | null; floorplate_id: number | null }[];
  const centre = elementCentres(root);
  const out: StopCandidate[] = [];
  let missing = 0;
  for (const r of rows) {
    if (spec.floor != null && r.floor !== spec.floor) continue;
    if (spec.floorplate != null && r.floorplate_id !== spec.floorplate) continue;
    const at = r.pointer ? centre(r.pointer, r.selector || null) : null;
    if (!at) { missing += 1; continue; }
    out.push({ groupId: `unit:${r.id}`, label: r.name, anchor: at });
  }
  if (missing) console.log(`  (${missing} units whose pointer is not in this file)`);
  return out;
};

/* ── metrics ─────────────────────────────────────────────────────────── */

const cellAt = (g: Grid, p: Point): number | null => {
  const c = Math.floor((p.x - g.originX) / g.cell);
  const r = Math.floor((p.y - g.originY) / g.cell);
  if (c < 0 || r < 0 || c >= g.w || r >= g.h) return null;
  return r * g.w + c;
};

const samples = (points: Point[], step: number): Point[] => {
  const out: Point[] = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k += 1) { const t = k / n; out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }); }
  }
  if (points.length) out.push(points[points.length - 1]);
  return out;
};

const components = (graph: WayfindingGraph): number => {
  const parent = new Map(graph.nodes.map((n) => [n.id, n.id]));
  const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  for (const e of graph.edges) parent.set(find(e.fromNodeId), find(e.toNodeId));
  const roots = new Set(graph.nodes.filter((n) => graph.edges.some((e) => e.fromNodeId === n.id || e.toNodeId === n.id)).map((n) => find(n.id)));
  return roots.size;
};

interface Metrics {
  nodes: number; edges: number; lengthUnits: number; components: number;
  edgeSamplesInWalk: number; edgeSamplesInBuilding: number; edgeSamplesOffWalk: number;
  /** mean clearance ratio of on-walk samples: 1 = on the medial axis */
  centring: number | null;
  coverage12: number; coverageClearance: number;
  joined: number; stops: number; linksThroughOtherBuilding: number; doorBridges: number;
  routes: { from: string; to: string; ok: boolean; length: number; points: number; inWalk: number; inBuilding: number }[];
}

const evaluate = (graph: WayfindingGraph, connections: StopConnection[], ref: StreetNetwork, stops: StopCandidate[]): Metrics => {
  const g = ref.grid;
  const walk = ref.walk;
  const bld = ref.buildings;
  const clear = ref.clearance;
  let inWalk = 0, inBld = 0, total = 0, length = 0;
  let centringSum = 0, centringN = 0;
  const netMask = new Uint8Array(g.w * g.h);
  const win = Math.round(10 / g.cell);
  for (const e of graph.edges) {
    length += e.length;
    for (const p of samples(e.pathPoints, 2)) {
      total += 1;
      const i = cellAt(g, p);
      if (i == null) continue;
      netMask[i] = 1;
      if (walk[i]) {
        inWalk += 1;
        // local maximum of the clearance within 10 units: the medial axis has the ratio 1
        const c = i % g.w, r = Math.floor(i / g.w);
        let max = 0;
        for (let dr = -win; dr <= win; dr += 1) for (let dc = -win; dc <= win; dc += 1) {
          const cc = c + dc, rr = r + dr;
          if (cc < 0 || rr < 0 || cc >= g.w || rr >= g.h) continue;
          max = Math.max(max, clear[rr * g.w + cc]);
        }
        if (max > 0) { centringSum += clear[i] / max; centringN += 1; }
      }
      if (bld[i]) inBld += 1;
    }
  }
  // coverage: distance from every walkable cell to the network
  const notNet = new Uint8Array(g.w * g.h);
  for (let i = 0; i < notNet.length; i += 1) notNet[i] = netMask[i] ? 0 : 1;
  const dist = distanceToOutside(notNet, g.w, g.h);
  let walkN = 0, cov12 = 0, covClear = 0;
  const limit12 = 12 / g.cell;
  for (let i = 0; i < walk.length; i += 1) {
    if (!walk[i]) continue;
    walkN += 1;
    if (dist[i] <= limit12) cov12 += 1;
    if (dist[i] <= clear[i] * 1.25 + 2 / g.cell) covClear += 1;
  }
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  // a link from a stop to the network may leave through the stop's own building; crossing *another* building is wrong
  const inside = (p: Point, ring: Point[]): boolean => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const crosses = (p: Point, q: Point, ring: Point[]): boolean => {
    for (let i = 0; i + 1 < ring.length; i += 1) {
      const a = ring[i], b = ring[i + 1];
      const d = (q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x);
      if (Math.abs(d) < 1e-9) continue;
      const t = ((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)) / d;
      const u = ((a.x - p.x) * (q.y - p.y) - (a.y - p.y) * (q.x - p.x)) / d;
      if (t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1) return true;
    }
    return false;
  };
  let linksThrough = 0;
  for (const c of connections) {
    if (!c.connectedNodeId) continue;
    const n = nodeById.get(c.connectedNodeId)!;
    const own = ref.buildingRings.filter((r) => inside(c.anchor, r));
    if (ref.buildingRings.some((r) => !own.includes(r) && crosses(c.anchor, n, r))) linksThrough += 1;
  }
  const doorBridges = graph.edges.filter((e) => e.id.startsWith('door_')).length;
  // routes
  const adj = new Map<string, { to: string; w: number; pts: Point[] }[]>();
  for (const e of graph.edges) {
    if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, []);
    if (!adj.has(e.toNodeId)) adj.set(e.toNodeId, []);
    adj.get(e.fromNodeId)!.push({ to: e.toNodeId, w: e.length, pts: e.pathPoints });
    adj.get(e.toNodeId)!.push({ to: e.fromNodeId, w: e.length, pts: [...e.pathPoints].reverse() });
  }
  const dijkstra = (from: string, to: string): { cost: number; pts: Point[] } | null => {
    const dist = new Map<string, number>([[from, 0]]);
    const prev = new Map<string, { id: string; pts: Point[] }>();
    const open = new Set<string>([from]);
    while (open.size) {
      let cur = '';
      let best = Infinity;
      for (const id of open) { const d = dist.get(id)!; if (d < best) { best = d; cur = id; } }
      open.delete(cur);
      if (cur === to) break;
      for (const n of adj.get(cur) ?? []) {
        const nd = best + n.w;
        if (nd < (dist.get(n.to) ?? Infinity)) { dist.set(n.to, nd); prev.set(n.to, { id: cur, pts: n.pts }); open.add(n.to); }
      }
    }
    if (!dist.has(to)) return null;
    const pts: Point[] = [];
    let cur = to;
    while (cur !== from) { const p = prev.get(cur)!; pts.unshift(...p.pts.slice(1)); cur = p.id; }
    const start = nodeById.get(from)!;
    return { cost: dist.get(to)!, pts: [start, ...pts] };
  };
  const connected = connections.filter((c) => c.connectedNodeId);
  const sorted = [...connected].sort((a, b) => a.anchor.x - b.anchor.x || a.anchor.y - b.anchor.y);
  const pairs: [StopConnection, StopConnection][] = [];
  if (sorted.length >= 2) {
    pairs.push([sorted[0], sorted[sorted.length - 1]]);
    if (sorted.length >= 4) pairs.push([sorted[Math.floor(sorted.length / 3)], sorted[Math.floor((2 * sorted.length) / 3)]]);
    const byY = [...connected].sort((a, b) => a.anchor.y - b.anchor.y);
    pairs.push([byY[0], byY[byY.length - 1]]);
  }
  const routes = pairs.map(([a, b]) => {
    const r = dijkstra(a.connectedNodeId!, b.connectedNodeId!);
    if (!r) return { from: a.label, to: b.label, ok: false, length: 0, points: 0, inWalk: 0, inBuilding: 0 };
    const pts = samples(r.pts, 2);
    let w = 0, bb = 0;
    for (const p of pts) { const i = cellAt(g, p); if (i == null) continue; if (walk[i]) w += 1; if (bld[i]) bb += 1; }
    return { from: a.label, to: b.label, ok: true, length: Math.round(r.cost), points: r.pts.length, inWalk: Math.round((100 * w) / pts.length), inBuilding: Math.round((100 * bb) / pts.length) };
  });
  return {
    nodes: graph.nodes.length, edges: graph.edges.length, lengthUnits: Math.round(length), components: components(graph),
    edgeSamplesInWalk: total ? Math.round((100 * inWalk) / total) : 0, edgeSamplesInBuilding: total ? Math.round((100 * inBld) / total) : 0, edgeSamplesOffWalk: total ? Math.round((100 * (total - inWalk)) / total) : 0,
    centring: centringN ? Math.round((100 * centringSum) / centringN) / 100 : null,
    coverage12: walkN ? Math.round((100 * cov12) / walkN) : 0, coverageClearance: walkN ? Math.round((100 * covClear) / walkN) : 0,
    joined: connected.length, stops: stops.length, linksThroughOtherBuilding: linksThrough, doorBridges, routes
  };
};

/* ── overlay ─────────────────────────────────────────────────────────── */

const overlay = (graph: WayfindingGraph, connections: StopConnection[], ref: StreetNetwork, routes: Point[][], label: string): string => {
  const vb = ref.viewBox;
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const colour = (kind?: string) => (kind === 'bridge' ? '#f59e0b' : kind === 'inferred' ? '#a855f7' : kind === 'knn' ? '#10b981' : '#1d4ed8');
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.minX} ${vb.minY} ${vb.maxX - vb.minX} ${vb.maxY - vb.minY}">`);
  for (const e of graph.edges) parts.push(`<polyline fill="none" stroke="${colour(e.kind)}" stroke-width="2.2" stroke-linejoin="round" stroke-opacity="0.95" points="${e.pathPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>`);
  for (const n of graph.nodes) parts.push(`<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="1.6" fill="#fff" stroke="#1d4ed8" stroke-width="0.8"/>`);
  for (const c of connections) {
    if (!c.connectedNodeId) { parts.push(`<circle cx="${c.anchor.x.toFixed(1)}" cy="${c.anchor.y.toFixed(1)}" r="3" fill="#ef4444"/>`); continue; }
    const n = nodeById.get(c.connectedNodeId)!;
    parts.push(`<line x1="${c.anchor.x.toFixed(1)}" y1="${c.anchor.y.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="#059669" stroke-width="1" stroke-dasharray="3 2"/>`);
    parts.push(`<circle cx="${c.anchor.x.toFixed(1)}" cy="${c.anchor.y.toFixed(1)}" r="2.2" fill="#059669"/>`);
  }
  for (const r of routes) parts.push(`<polyline fill="none" stroke="#db2777" stroke-width="4" stroke-opacity="0.85" stroke-linejoin="round" points="${r.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>`);
  parts.push(`<rect x="${vb.minX + 8}" y="${vb.minY + 8}" width="${Math.min(520, 12 + label.length * 7.2)}" height="24" rx="4" fill="#111827" fill-opacity="0.8"/><text x="${vb.minX + 16}" y="${vb.minY + 25}" font-family="Helvetica, Arial" font-size="13" fill="#fff">${label}</text>`);
  parts.push('</svg>');
  return parts.join('\n');
};

/* ── run ─────────────────────────────────────────────────────────────── */

for (const c of CASES) {
  if (only.length && !only.includes(c.name)) continue;
  console.log(`\n=== ${c.name}`);
  const floor = readSvgTree(readFileSync(`${A}/${c.floor}`, 'utf8'));
  const background = c.background ? readSvgTree(readFileSync(`${A}/${c.background}`, 'utf8')) : null;
  const stops = c.stops.kind === 'db' ? dbStops(floor, c.stops) : c.stops.kind === 'units-layer' ? unitsLayerStops(floor) : c.stops.kind === 'colour-rooms' ? colourRoomStops(floor) : [];
  console.log(`  stops: ${stops.length} (${c.stops.kind})`);

  // baseline: the engine as shipped before October 25, 2026 (no street pass; the indoor gate at its old default)
  const vb = floor.attrs.viewBox?.split(/[\s,]+/).map(Number) ?? [0, 0, 1412, 932];
  const legacyGate = Math.max(1.5, Math.hypot(vb[2], vb[3]) * 0.0015);
  let t0 = performance.now();
  const base = detectHallways(floor, stops, { background, streets: false, indoorMinHalfWidth: legacyGate });
  const baseMs = Math.round(performance.now() - t0);
  // proposed: the engine as integrated (inferStreets + the gated indoor pass), evaluated against the PoC's masks
  t0 = performance.now();
  const next = detectHallways(floor, stops, { background });
  const pocMs = Math.round(performance.now() - t0);
  const masks = buildStreetNetwork(floor, background, [], { indoor: false });
  const poc = { ...masks, ok: next.ok, reason: next.ok ? null : (next.failure as never), graph: { nodes: next.nodes, edges: next.edges }, connections: next.connections, joined: next.joined, classification: { ...masks.classification, mode: next.streetsMode ?? masks.classification.mode } };
  console.log(`  baseline: ok=${base.ok} failure=${base.failure} source=${base.source} nodes=${base.nodes.length} edges=${base.edges.length} layers=${base.layers.join('/')} ${baseMs}ms`);
  console.log(`  engine: source=${next.source} failure=${next.failure} doorBridges=${next.doorBridgeCount} components=${next.components}\n  poc: ok=${poc.ok} reason=${poc.reason} mode=${poc.classification.mode} walkLayers=${poc.classification.walkLayers.join('/')} blockLayers=${poc.classification.blockLayers.join('/')} colourWalk=${poc.classification.colourWalk} colourBlock=${poc.classification.colourBlock} nodes=${poc.graph.nodes.length} edges=${poc.graph.edges.length} ${pocMs}ms ${JSON.stringify(poc.stats.ms)} walkCells=${poc.stats.walkCells} thinPasses=${poc.stats.thinPasses} spurs=${poc.stats.spursPruned} bridges=${poc.stats.bridges}/${poc.stats.bridgesRejected}rej indoorRuns=${poc.stats.indoorRuns}`);
  if (poc.warnings.length) console.log(`  poc warnings: ${poc.warnings.join('; ')}`);
  const mBase = base.ok ? evaluate({ nodes: base.nodes, edges: base.edges }, base.connections, poc, stops) : null;
  const mPoc = poc.ok ? evaluate(poc.graph, poc.connections, poc, stops) : null;
  const show = (m: Metrics | null) => (m ? `nodes=${m.nodes} edges=${m.edges} len=${m.lengthUnits} comps=${m.components} onWalk=${m.edgeSamplesInWalk}% inBuilding=${m.edgeSamplesInBuilding}% centring=${m.centring} cov12=${m.coverage12}% covClear=${m.coverageClearance}% joined=${m.joined}/${m.stops} linksThroughOther=${m.linksThroughOtherBuilding} doorBridges=${m.doorBridges} routes=${JSON.stringify(m.routes)}` : 'n/a');
  console.log(`  BASE: ${show(mBase)}`);
  console.log(`  POC : ${show(mPoc)}`);
  writeFileSync(`${S}/out/${c.name}.json`, JSON.stringify({ case: c, stops: stops.length, baseline: { ok: base.ok, failure: base.failure, source: base.source, layers: base.layers, warnings: base.warnings, ms: baseMs, metrics: mBase }, proposed: { ok: next.ok, failure: next.failure, source: next.source, streetsMode: next.streetsMode, layers: next.layers, doorBridges: next.doorBridgeCount, components: next.components, warnings: next.warnings, stats: masks.stats, ms: pocMs, metrics: mPoc } }, null, 2));
  // overlays (routes drawn for the PoC only, from its own metrics run)
  const routePts: Point[][] = [];
  writeFileSync(`${S}/render/${c.name}_base_overlay.svg`, overlay({ nodes: base.nodes, edges: base.edges }, base.connections, poc, [], `${c.name} · Detect Hallways as shipped (Oct 10) · ${base.ok ? `${base.nodes.length} points / ${base.edges.length} paths (${base.source})` : `nothing: ${base.failure}`}`));
  writeFileSync(`${S}/render/${c.name}_poc_overlay.svg`, overlay(poc.graph, poc.connections, poc, routePts, `${c.name} · Detect Hallways with the street pass · ${next.ok ? `${next.nodes.length} points / ${next.edges.length} paths (${next.source}, ${next.streetsMode})` : `nothing: ${next.failure}`}`));
  // the walkable mask as an image for the report
  const g = poc.grid;
  const rows: string[] = [];
  for (let r = 0; r < g.h; r += 2) {
    let run: string[] = [];
    let start = -1;
    for (let cI = 0; cI <= g.w; cI += 1) {
      const on = cI < g.w && poc.walk[r * g.w + cI];
      if (on && start < 0) start = cI;
      if (!on && start >= 0) { run.push(`M${(g.originX + start * g.cell).toFixed(1)} ${(g.originY + r * g.cell).toFixed(1)}h${((cI - start) * g.cell).toFixed(1)}`); start = -1; }
    }
    rows.push(run.join(''));
  }
  writeFileSync(`${S}/render/${c.name}_walk_mask.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${poc.viewBox.minX} ${poc.viewBox.minY} ${poc.viewBox.maxX - poc.viewBox.minX} ${poc.viewBox.maxY - poc.viewBox.minY}"><path d="${rows.join('')}" stroke="#22c55e" stroke-opacity="0.45" stroke-width="${2 * g.cell}" fill="none"/></svg>`);
}
