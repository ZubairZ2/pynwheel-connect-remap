/**
 * PoC: walkable-area street network for Beans SVG maps.
 *
 * 1. Every leaf shape of the floor file (+ shared background) gets a role —
 *    walk area, walk stroke (a sidewalk drawn as a stroked centreline),
 *    block (buildings, water, lawns, rooms, walls) or ignore (labels, trees,
 *    parking stall paint, patterns) — from the nearest named ancestor layer
 *    when the file has Beans layer names, else from its effective fill colour.
 * 2. The shapes are painted in document order onto a cell grid (a painter's
 *    rasterisation, so what is drawn over a road carves it just as the eye sees).
 * 3. A small opening, a distance transform, Zhang–Suen thinning, clearance-
 *    relative spur pruning and junction tracing turn the walkable mask into
 *    centreline runs; the engine's own graph builder, gap bridging and stop
 *    snapping make the network.
 */
import { autoConnectNodes, computeAutoConnectDistance } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/autoConnect';
import { bridgeComponentGaps } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/bridgeGaps';
import { buildWayfindingGraph, computeSnapTolerance } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/buildGraph';
import { dropShortComponents } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/extract';
import { inferCorridors } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/inferCorridors';
import { detectSvgStructure } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/detectLayers';
import { rootShapes } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/shapes';
import { buildObstacleIndex, NO_OBSTACLES, type ObstacleIndex } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/obstacles';
import { computeMaxSnapDistance, snapStopsToGraph } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/snapStops';
import { baseId, normalizeId, viewBoxMap } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/detectLayers';
import { accumulatedMatrix, applyToPoint, IDENTITY, multiply } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/matrix';
import { parsePathToSubpaths } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/pathData';
import { localPolylines } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/shapes';
import { idOf, isHidden, type SvgEl } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/svg/svgTree';
import type { BBox, Matrix2D, Point, StopCandidate, StopConnection, WayfindingGraph } from '/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/core/utils/wayfinding/hallways/types';

export type Role = 'walk' | 'walkStroke' | 'block' | 'ignore';
export type RoleSource = 'layer' | 'colour';

export interface ClassifiedShape {
  role: Role;
  source: RoleSource;
  layer: string;
  rings: Point[][];
  closed: boolean[];
  /** half-width in root units for a walk stroke */
  halfWidth: number;
  fill: string | null;
  /** a building footprint (for the building mask / obstacle metric) */
  building: boolean;
  elementId: string;
}

const WALK = new Set(['road', 'roads', 'street', 'streets', 'drive', 'driveway', 'driveways', 'road parking', 'parking', 'parkings', 'parking lot', 'parking lots', 'lot', 'lots', 'walkway', 'walkways', 'sidewalk', 'sidewalks', 'path', 'paths', 'pathway', 'pathways', 'corridor', 'corridors', 'hallway', 'hallways', 'base', 'pool base', 'pool deck', 'deck', 'plaza', 'patio', 'internal road', 'internal roads', 'cover rd gaps', 'cover internal rd gaps', 'pavement', 'paving', 'courtyard', 'courtyards', 'breezeway', 'breezeways']);
const BLOCK = new Set(['building outline', 'building outlines', 'buildings outline', 'buildings outlines', 'building out line', 'outline', 'outlines', 'footprint', 'footprints', 'building footprint', 'building footprints', 'neighborhood', 'neighbourhood', 'external buildings', 'external building', 'buildings', 'building', 'wall', 'walls', 'obstacle', 'obstacles', 'pool', 'pools', 'water', 'lake', 'pond', 'fountain', 'pool area', 'green area', 'green areas', 'green', 'grass', 'lawn', 'landscape', 'planter', 'planters', 'garden', 'trash', 'dumpster', 'office outline', 'office outlines']);
const BUILDING = new Set(['building outline', 'building outlines', 'buildings outline', 'buildings outlines', 'building out line', 'outline', 'outlines', 'footprint', 'footprints', 'building footprint', 'building footprints', 'buildings', 'building', 'neighborhood', 'neighbourhood', 'external buildings', 'external building', 'office outline', 'office outlines']);
const IGNORE = new Set(['trees', 'tree', 'bg 1', 'north', 'legend', 'compass', 'st', 'stairs', 'stair', 'elevator', 'elevators', 'amenities', 'units', 'unit', 'amenity', 'arrow', 'arrows', 'road name', 'road names', 'building number', 'building numbers']);
const IGNORE_RX = /(name|number|label|sign|legend|north|compass|arrow|icon|text|logo|title)/;
const ROAD_SUFFIX = /( road| rd| street| st| ave| avenue| blvd| boulevard| way| drive| dr| lane| ln| loop| court| ct| pkwy| parkway| hwy| highway)$/;

const layerRole = (id: string): { role: Role; building: boolean } | null => {
  const base = baseId(id);
  const norm = normalizeId(id);
  if (!base) return null;
  if (IGNORE.has(base) || IGNORE_RX.test(norm)) return { role: 'ignore', building: false };
  if (WALK.has(base) || ROAD_SUFFIX.test(base)) return { role: 'walk', building: false };
  if (BLOCK.has(base) || base.startsWith('outline ') || base.endsWith(' outline') || base.endsWith(' outlines') || base.endsWith(' building') || base.endsWith(' buildings') || base.startsWith('building ') || base.startsWith('pool')) {
    return { role: 'block', building: BUILDING.has(base) || base.startsWith('outline ') || base.endsWith(' outline') || base.endsWith(' outlines') || base.endsWith(' building') || base.endsWith(' buildings') || base.startsWith('building ') };
  }
  return null;
};

const NAMED = { white: '#ffffff', black: '#000000', none: 'none', transparent: 'none' } as Record<string, string>;

const parseColour = (value: string | null): { h: number; s: number; l: number } | 'none' | 'pattern' | null => {
  if (value == null) return null;
  const v = value.trim().toLowerCase();
  if (!v || v === 'inherit' || v === 'currentcolor') return null;
  if (v.startsWith('url(')) return 'pattern';
  const named = NAMED[v] ?? v;
  if (named === 'none') return 'none';
  let r: number;
  let g: number;
  let b: number;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(named);
  const rgb = /^rgba?\(([^)]+)\)$/.exec(named);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) [r, g, b] = [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    else [r, g, b] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  } else if (rgb) {
    const parts = rgb[1].split(/[\s,]+/).map((p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
    [r, g, b] = parts as [number, number, number];
  } else return null;
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  // HSL saturation explodes next to white and black (a 1/255 difference reads as fully saturated): a near-neutral colour is neutral
  const s = d < 0.03 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
};

const inherited = (el: SvgEl, name: string): string | null => {
  let node: SvgEl | null = el;
  while (node) {
    const direct = node.attrs[name];
    if (direct != null) return direct;
    const style = node.attrs.style;
    if (style) {
      const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style);
      if (m) return m[1].trim();
    }
    node = node.parent;
  }
  return null;
};

const effectiveOpacity = (el: SvgEl): number => {
  let node: SvgEl | null = el;
  let o = 1;
  while (node) {
    for (const key of ['opacity', 'fill-opacity']) {
      const v = node.attrs[key];
      if (v != null && Number.isFinite(parseFloat(v))) o *= parseFloat(v);
    }
    node = node.parent;
  }
  return o;
};

const SKIP_TAGS = new Set(['defs', 'clippath', 'mask', 'pattern', 'filter', 'symbol', 'text', 'tspan', 'image', 'use', 'metadata', 'title', 'desc', 'style']);
const SHAPE_TAGS = new Set(['path', 'rect', 'polygon', 'polyline', 'line', 'circle', 'ellipse']);

/** Area of a ring (shoelace, absolute). */
const ringArea = (ring: Point[]): number => {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i += 1) a += ring[i].x * ring[i + 1].y - ring[i + 1].x * ring[i].y;
  return Math.abs(a) / 2;
};

const bboxArea = (rings: Point[][]): number => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) for (const p of ring) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return Number.isFinite(minX) ? (maxX - minX) * (maxY - minY) : 0;
};

const matrixScale = (m: Matrix2D): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

export interface ClassifyOptions {
  flattenStep?: number;
  /** maps this file's coordinates into the target frame (a background drawn under a floor file) */
  frame?: Matrix2D;
}

export interface ClassifyResult {
  shapes: ClassifiedShape[];
  viewBox: BBox;
  namedWalk: number;
  namedBlock: number;
  colourWalk: number;
  colourBlock: number;
  walkLayers: string[];
  blockLayers: string[];
}

const parseViewBox = (root: SvgEl): BBox => {
  const raw = root.attrs.viewBox ?? root.attrs.viewbox;
  if (raw) {
    const p = raw.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0 && p[3] > 0) return { minX: p[0], minY: p[1], maxX: p[0] + p[2], maxY: p[1] + p[3] };
  }
  const w = parseFloat(root.attrs.width ?? '');
  const h = parseFloat(root.attrs.height ?? '');
  return w > 0 && h > 0 ? { minX: 0, minY: 0, maxX: w, maxY: h } : { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
};

/** Roles for every visible leaf shape of one file, in document order. */
export const classifyShapes = (root: SvgEl, options: ClassifyOptions = {}): ClassifyResult => {
  const step = options.flattenStep ?? 4;
  const frame = options.frame ?? IDENTITY;
  const out: ClassifiedShape[] = [];
  const counts = { namedWalk: 0, namedBlock: 0, colourWalk: 0, colourBlock: 0 };
  const walkLayers = new Set<string>();
  const blockLayers = new Set<string>();

  const visit = (el: SvgEl, layerRoleAbove: { role: Role; building: boolean; layer: string } | null) => {
    if (isHidden(el) || SKIP_TAGS.has(el.tag)) return;
    let here = layerRoleAbove;
    const id = idOf(el);
    if (id && el !== root) {
      const r = layerRole(id);
      // the nearest named layer wins, but an outer walk/block layer is not undone by an unknown inner name
      if (r) here = { ...r, layer: id };
    }
    if (SHAPE_TAGS.has(el.tag)) {
      const shape = shapeOf(el, root, step, frame, here);
      if (shape) {
        out.push(shape);
        if (shape.role === 'walk' || shape.role === 'walkStroke') {
          if (shape.source === 'layer') { counts.namedWalk += 1; walkLayers.add(shape.layer); } else counts.colourWalk += 1;
        } else if (shape.role === 'block') {
          if (shape.source === 'layer') { counts.namedBlock += 1; blockLayers.add(shape.layer); } else counts.colourBlock += 1;
        }
      }
      return;
    }
    for (const child of el.children) visit(child, here);
  };
  visit(root, null);
  return { shapes: out, viewBox: parseViewBox(root), ...counts, walkLayers: [...walkLayers], blockLayers: [...blockLayers] };
};

const shapeOf = (el: SvgEl, root: SvgEl, step: number, frame: Matrix2D, layer: { role: Role; building: boolean; layer: string } | null): ClassifiedShape | null => {
  if (effectiveOpacity(el) < 0.5) return null;
  const matrix = multiply(frame, accumulatedMatrix(el, root));
  let rings: Point[][] = [];
  let closed: boolean[] = [];
  if (el.tag === 'path') {
    const d = el.attrs.d;
    if (!d || !d.trim()) return null;
    const parsed = parsePathToSubpaths(d, { flattenStep: step, matrix });
    rings = parsed.subpaths;
    closed = parsed.closed;
  } else {
    const local = localPolylines(el.tag, el.attrs);
    rings = local.polylines.map((pl) => pl.map((p) => applyToPoint(matrix, p)));
    closed = rings.map(() => local.closed);
  }
  if (!rings.length) return null;
  const fillRaw = inherited(el, 'fill');
  const fill = parseColour(fillRaw ?? 'black'); // SVG default fill is black
  const stroke = parseColour(inherited(el, 'stroke') ?? 'none');
  const sw = parseFloat(inherited(el, 'stroke-width') ?? '1');
  const strokeWidth = (Number.isFinite(sw) ? sw : 1) * matrixScale(matrix);
  const hasFill = fill !== 'none' && fill !== null;
  const hasStroke = stroke !== 'none' && stroke !== null;
  const base: Omit<ClassifiedShape, 'role' | 'source' | 'building'> = { layer: layer?.layer ?? '', rings, closed, halfWidth: Math.max(strokeWidth / 2, 1.5), fill: fillRaw, elementId: idOf(el) };

  if (layer) {
    if (layer.role === 'ignore') return { ...base, role: 'ignore', source: 'layer', building: false };
    if (layer.role === 'walk') {
      if (hasFill) {
        // white paint inside a road layer (lane dashes, a stall) is paint, not pavement
        if (fill !== 'pattern' && fill.l > 0.93 && fill.s < 0.15) return { ...base, role: 'ignore', source: 'layer', building: false };
        return { ...base, role: 'walk', source: 'layer', building: false };
      }
      if (hasStroke && strokeWidth >= 1.5) return { ...base, role: 'walkStroke', source: 'layer', building: false };
      return { ...base, role: 'ignore', source: 'layer', building: false };
    }
    if (layer.role === 'block') {
      if (hasFill) return { ...base, role: 'block', source: 'layer', building: layer.building };
      return { ...base, role: 'ignore', source: 'layer', building: false };
    }
  }
  // no named layer: the effective fill colour says what the shape is
  if (!hasFill || fill === 'pattern') return { ...base, role: 'ignore', source: 'colour', building: false };
  const { h, s, l } = fill;
  const area = bboxArea(rings);
  // a filled shape thinner than a wall (stall stripes, lane paint, outlined glyph strokes) is paint, not geometry
  const biggest = rings.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best), rings[0]);
  const perimeter = biggest.reduce((sum, q, i) => (i ? sum + Math.hypot(q.x - biggest[i - 1].x, q.y - biggest[i - 1].y) : 0), 0);
  const thickness = perimeter > 0 ? (2 * ringArea(biggest)) / perimeter : 0;
  if (thickness < 1.3 && ringArea(biggest) < 4000) return { ...base, role: 'ignore', source: 'colour', building: false };
  if (l < 0.22) return area < 600 ? { ...base, role: 'ignore', source: 'colour', building: false } : { ...base, role: 'block', source: 'colour', building: false };
  if (l > 0.93 && s < 0.15) return { ...base, role: 'ignore', source: 'colour', building: false };
  if (s <= 0.06 && l >= 0.3 && l <= 0.93) return { ...base, role: 'walk', source: 'colour', building: false };
  if (s <= 0.25 && l >= 0.65) return { ...base, role: 'walk', source: 'colour', building: false };
  const isBuildingish = s > 0.25 && l > 0.75 && h >= 15 && h <= 55; // beige rooms / footprints
  return { ...base, role: 'block', source: 'colour', building: isBuildingish };
};

/* ── raster ─────────────────────────────────────────────────────────── */

export interface Grid {
  w: number;
  h: number;
  cell: number;
  originX: number;
  originY: number;
}

const fillRings = (mask: Uint8Array, g: Grid, rings: Point[][], value: 0 | 1) => {
  const rows = new Map<number, number[]>();
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0; i < n; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      if (a.y === b.y) continue;
      const y0 = Math.min(a.y, b.y);
      const y1 = Math.max(a.y, b.y);
      const r0 = Math.max(0, Math.ceil((y0 - g.originY) / g.cell - 0.5));
      const r1 = Math.min(g.h - 1, Math.ceil((y1 - g.originY) / g.cell - 0.5) - 1);
      for (let r = r0; r <= r1; r += 1) {
        const y = g.originY + (r + 0.5) * g.cell;
        const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
        const list = rows.get(r);
        if (list) list.push(x);
        else rows.set(r, [x]);
      }
    }
  }
  rows.forEach((xs, r) => {
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - g.originX) / g.cell - 0.5));
      const c1 = Math.min(g.w - 1, Math.ceil((xs[k + 1] - g.originX) / g.cell - 0.5) - 1);
      for (let c = c0; c <= c1; c += 1) mask[r * g.w + c] = value;
    }
  });
};

const strokePolyline = (mask: Uint8Array, g: Grid, points: Point[], halfWidth: number, value: 0 | 1) => {
  const hw2 = halfWidth * halfWidth;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const minX = Math.min(a.x, b.x) - halfWidth;
    const maxX = Math.max(a.x, b.x) + halfWidth;
    const minY = Math.min(a.y, b.y) - halfWidth;
    const maxY = Math.max(a.y, b.y) + halfWidth;
    const c0 = Math.max(0, Math.floor((minX - g.originX) / g.cell));
    const c1 = Math.min(g.w - 1, Math.ceil((maxX - g.originX) / g.cell));
    const r0 = Math.max(0, Math.floor((minY - g.originY) / g.cell));
    const r1 = Math.min(g.h - 1, Math.ceil((maxY - g.originY) / g.cell));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-9;
    for (let r = r0; r <= r1; r += 1) {
      const y = g.originY + (r + 0.5) * g.cell;
      for (let c = c0; c <= c1; c += 1) {
        const x = g.originX + (c + 0.5) * g.cell;
        let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a.x + t * dx - x;
        const py = a.y + t * dy - y;
        if (px * px + py * py <= hw2) mask[r * g.w + c] = value;
      }
    }
  }
};

/** Chamfer (3-4) distance in cells to the nearest zero cell. */
export const distanceToOutside = (inside: Uint8Array, w: number, h: number): Float32Array => {
  const big = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i += 1) d[i] = inside[i] ? big : 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x === 0 || y === 0) v = Math.min(v, 3);
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) {
      v = Math.min(v, d[i - w] + 3);
      if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
    }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y -= 1) for (let x = w - 1; x >= 0; x -= 1) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x === w - 1 || y === h - 1) v = Math.min(v, 3);
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + 3);
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
      if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
    }
    d[i] = v;
  }
  for (let i = 0; i < d.length; i += 1) d[i] /= 3;
  return d;
};

const open = (mask: Uint8Array, w: number, h: number, r: number): Uint8Array => {
  const inner = distanceToOutside(mask, w, h);
  const core = new Uint8Array(w * h);
  for (let i = 0; i < core.length; i += 1) core[i] = inner[i] > r ? 1 : 0;
  const notCore = new Uint8Array(w * h);
  for (let i = 0; i < core.length; i += 1) notCore[i] = core[i] ? 0 : 1;
  const toCore = distanceToOutside(notCore, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i += 1) out[i] = mask[i] && (core[i] || toCore[i] <= r + 0.5) ? 1 : 0;
  return out;
};

const dropSmall = (mask: Uint8Array, w: number, h: number, minArea: number): number => {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const piece: number[] = [];
  let dropped = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    piece.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      piece.push(i);
      const x = i % w;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n < 0 || n >= mask.length || !mask[n] || seen[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (piece.length < minArea) {
      for (const i of piece) mask[i] = 0;
      dropped += 1;
    }
  }
  return dropped;
};

const thin = (mask: Uint8Array, w: number, h: number): number => {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const remove: number[] = [];
  let changed = true;
  let pass = 0;
  while (changed && pass < 600) {
    changed = false;
    for (const step of [0, 1]) {
      remove.length = 0;
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        if (!mask[y * w + x]) continue;
        const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1), p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let k = 0; k < 8; k += 1) if (!seq[k] && seq[k + 1]) a += 1;
        if (a !== 1) continue;
        if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
        remove.push(y * w + x);
      }
      if (remove.length) {
        changed = true;
        for (const i of remove) mask[i] = 0;
      }
    }
    pass += 1;
  }
  return pass;
};

const NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const;
const neighboursOf = (mask: Uint8Array, w: number, h: number, i: number): number[] => {
  const x = i % w;
  const y = (i - x) / w;
  const out: number[] = [];
  for (const [dx, dy] of NB) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const n = ny * w + nx;
    if (mask[n]) out.push(n);
  }
  return out;
};

const pruneSpurs = (mask: Uint8Array, w: number, h: number, limit: (junction: number) => number): number => {
  let total = 0;
  for (let round = 0; round < 4; round += 1) {
    let pruned = 0;
    for (let i = 0; i < mask.length; i += 1) {
      if (!mask[i] || neighboursOf(mask, w, h, i).length !== 1) continue;
      const branch = [i];
      let previous = -1;
      let current = i;
      let junction = -1;
      for (let guard = 0; guard < 10_000; guard += 1) {
        const next = neighboursOf(mask, w, h, current).filter((n) => n !== previous && !branch.includes(n));
        if (!next.length) break;
        const around = neighboursOf(mask, w, h, next[0]).length;
        if (around >= 3 || next.length > 1) {
          junction = next.length > 1 ? current : next[0];
          break;
        }
        previous = current;
        current = next[0];
        branch.push(current);
      }
      if (junction < 0) continue;
      if (branch.length <= limit(junction)) {
        for (const c of branch) if (c !== junction) mask[c] = 0;
        pruned += 1;
      }
    }
    total += pruned;
    if (!pruned) break;
  }
  return total;
};

const trace = (mask: Uint8Array, w: number, h: number) => {
  const degree = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) degree[i] = neighboursOf(mask, w, h, i).length;
  const isNode = (i: number) => mask[i] === 1 && degree[i] !== 2;
  const clusterOf = new Int32Array(w * h).fill(-1);
  const centres: { x: number; y: number; n: number }[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!isNode(start) || clusterOf[start] >= 0) continue;
    const id = centres.length;
    const centre = { x: 0, y: 0, n: 0 };
    const stack = [start];
    clusterOf[start] = id;
    while (stack.length) {
      const i = stack.pop()!;
      centre.x += i % w;
      centre.y += Math.floor(i / w);
      centre.n += 1;
      for (const n of neighboursOf(mask, w, h, i)) {
        if (!isNode(n) || clusterOf[n] >= 0) continue;
        clusterOf[n] = id;
        stack.push(n);
      }
    }
    centres.push(centre);
  }
  const visited = new Uint8Array(w * h);
  const runs: number[][] = [];
  const walk = (from: number, first: number): number[] => {
    const cells = [first];
    visited[first] = 1;
    let current = first;
    for (let guard = 0; guard < mask.length; guard += 1) {
      const around = neighboursOf(mask, w, h, current);
      const nodes = around.filter(isNode);
      const other = nodes.find((n) => clusterOf[n] !== from);
      const own = cells.length > 2 ? nodes.find((n) => clusterOf[n] === from) : undefined;
      const step = around.find((n) => !isNode(n) && !visited[n]);
      if (other !== undefined) {
        cells.push(other);
        return cells;
      }
      if (step === undefined) {
        if (own !== undefined) cells.push(own);
        return cells;
      }
      visited[step] = 1;
      current = step;
      cells.push(step);
    }
    return cells;
  };
  const push = (cells: number[]) => {
    const first = cells[0];
    const last = cells[cells.length - 1];
    if (cells.length >= 8 && clusterOf[first] >= 0 && clusterOf[first] === clusterOf[last]) {
      const half = Math.floor(cells.length / 2);
      runs.push(cells.slice(0, half + 1), cells.slice(half));
      return;
    }
    runs.push(cells);
  };
  for (let i = 0; i < mask.length; i += 1) {
    if (!isNode(i)) continue;
    for (const n of neighboursOf(mask, w, h, i)) {
      if (isNode(n) || visited[n]) continue;
      push([i, ...walk(clusterOf[i], n)]);
    }
  }
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i] || isNode(i) || visited[i]) continue;
    const loop = walk(-1, i);
    if (loop.length < 8) continue;
    const half = Math.floor(loop.length / 2);
    runs.push(loop.slice(0, half + 1), [...loop.slice(half), loop[0]]);
  }
  return { runs, centre: (cluster: number) => ({ x: centres[cluster].x / centres[cluster].n, y: centres[cluster].y / centres[cluster].n }), clusterOf };
};

/* ── the network ────────────────────────────────────────────────────── */

export interface StreetOptions {
  cell?: number;
  /** the opening radius in root units: slivers narrower than twice this vanish */
  minHalfWidth?: number;
  flattenStep?: number;
  autoConnect?: boolean;
  /** also infer corridors inside the building outlines (the existing engine's pass), kept only where wider than `indoorMinHalfWidth` */
  indoor?: boolean;
  indoorMinHalfWidth?: number;
  /** closing radius in root units (0 disables) */
  closeRadius?: number;
}

export interface StreetNetwork {
  ok: boolean;
  reason: 'no-walkable' | 'no-skeleton' | null;
  graph: WayfindingGraph;
  connections: StopConnection[];
  joined: number;
  grid: Grid;
  walk: Uint8Array;
  buildings: Uint8Array;
  clearance: Float32Array;
  /** how the roles were found */
  classification: { namedWalk: number; namedBlock: number; colourWalk: number; colourBlock: number; walkLayers: string[]; blockLayers: string[]; mode: 'layers' | 'colour' | 'mixed' };
  buildingRings: Point[][];
  stats: { walkCells: number; skeletonCells: number; thinPasses: number; spursPruned: number; piecesDropped: number; bridges: number; bridgesRejected: number; throughBuilding: number; indoorRuns: number; ms: Record<string, number> };
  viewBox: BBox;
  diagonal: number;
  warnings: string[];
}

export const buildStreetNetwork = (floor: SvgEl, background: SvgEl | null, stops: StopCandidate[], options: StreetOptions = {}): StreetNetwork => {
  const ms: Record<string, number> = {};
  let t = performance.now();
  const lap = (name: string) => {
    const now = performance.now();
    ms[name] = Math.round(now - t);
    t = now;
  };
  const own = classifyShapes(floor, { flattenStep: options.flattenStep });
  let shapes = own.shapes;
  let counts = { namedWalk: own.namedWalk, namedBlock: own.namedBlock, colourWalk: own.colourWalk, colourBlock: own.colourBlock, walkLayers: own.walkLayers, blockLayers: own.blockLayers };
  if (background) {
    const bg = classifyShapes(background, { flattenStep: options.flattenStep, frame: viewBoxMap(parseViewBox(background), own.viewBox) });
    // the background is drawn under the floor file
    shapes = [...bg.shapes, ...own.shapes];
    counts = { namedWalk: bg.namedWalk + own.namedWalk, namedBlock: bg.namedBlock + own.namedBlock, colourWalk: bg.colourWalk + own.colourWalk, colourBlock: bg.colourBlock + own.colourBlock, walkLayers: [...new Set([...bg.walkLayers, ...own.walkLayers])], blockLayers: [...new Set([...bg.blockLayers, ...own.blockLayers])] };
  }
  lap('classify');
  const viewBox = own.viewBox;
  const spanX = viewBox.maxX - viewBox.minX;
  const spanY = viewBox.maxY - viewBox.minY;
  const diagonal = Math.hypot(spanX, spanY);
  const cell = options.cell ?? Math.max(spanX, spanY) / 1400;
  const pad = 2;
  const grid: Grid = { cell, originX: viewBox.minX - pad * cell, originY: viewBox.minY - pad * cell, w: Math.ceil(spanX / cell) + 2 * pad, h: Math.ceil(spanY / cell) + 2 * pad };
  const walk = new Uint8Array(grid.w * grid.h);
  const buildings = new Uint8Array(grid.w * grid.h);
  const buildingRings: Point[][] = [];
  // Painter's order: a named walk layer that comes *before* the buildings in the file is still carved by them.
  for (const shape of shapes) {
    if (shape.role === 'walk') fillRings(walk, grid, shape.rings.filter((_, i) => shape.closed[i] || shape.rings[i].length >= 4), 1);
    else if (shape.role === 'walkStroke') for (const ring of shape.rings) strokePolyline(walk, grid, ring, shape.halfWidth, 1);
    else if (shape.role === 'block') {
      const rings = shape.rings.filter((_, i) => shape.closed[i] || shape.rings[i].length >= 4);
      fillRings(walk, grid, rings, 0);
      if (shape.building) {
        fillRings(buildings, grid, rings, 1);
        buildingRings.push(...rings.map((r) => [...r, r[0]]));
      }
    }
  }
  lap('paint');
  const named = counts.namedWalk > 0;
  const mode: StreetNetwork['classification']['mode'] = named && counts.colourWalk === 0 ? 'layers' : named ? 'mixed' : 'colour';
  const warnings: string[] = [];
  if (!named) warnings.push(counts.colourWalk ? 'walkable areas were inferred from fill colours (no named walkway, road or parking layer)' : 'no walkable area found: no named layer and no pavement-coloured shape');
  const empty = (reason: StreetNetwork['reason']): StreetNetwork => ({ ok: false, reason, graph: { nodes: [], edges: [] }, connections: [], joined: 0, grid, walk, buildings, clearance: new Float32Array(0), classification: { ...counts, mode }, buildingRings, stats: { walkCells: 0, skeletonCells: 0, thinPasses: 0, spursPruned: 0, piecesDropped: 0, bridges: 0, bridgesRejected: 0, throughBuilding: 0, indoorRuns: 0, ms }, viewBox, diagonal, warnings });
  let walkCells = 0;
  for (let i = 0; i < walk.length; i += 1) walkCells += walk[i];
  if (!walkCells) return empty('no-walkable');

  // Closing: a sidewalk drawn a curb's width from the road it serves is one walkable surface, not two strips
  // with a sliver between them (the sliver would seed a chain of tiny loops in the skeleton).
  const closeRadius = Math.max(1, Math.round((options.closeRadius ?? 2.5) / cell));
  const notWalk = new Uint8Array(walk.length);
  for (let i = 0; i < walk.length; i += 1) notWalk[i] = walk[i] ? 0 : 1;
  const toWalk = distanceToOutside(notWalk, grid.w, grid.h);
  const dilated = new Uint8Array(walk.length);
  for (let i = 0; i < walk.length; i += 1) dilated[i] = walk[i] || toWalk[i] <= closeRadius ? 1 : 0;
  const fromEdge = distanceToOutside(dilated, grid.w, grid.h);
  const closed = new Uint8Array(walk.length);
  for (let i = 0; i < walk.length; i += 1) closed[i] = walk[i] || (dilated[i] && fromEdge[i] > closeRadius) ? 1 : 0;
  // but never into a building: what a building covers stays blocked
  for (let i = 0; i < walk.length; i += 1) if (buildings[i]) closed[i] = 0;
  const minHalfWidth = options.minHalfWidth ?? 1.2;
  const radius = Math.max(1, Math.round(minHalfWidth / cell));
  const opened = open(closed, grid.w, grid.h, radius);
  const piecesDropped = dropSmall(opened, grid.w, grid.h, Math.max(40, (radius * 8) ** 2));
  const clearance = distanceToOutside(opened, grid.w, grid.h);
  lap('open');
  const skeleton = opened.slice();
  const thinPasses = thin(skeleton, grid.w, grid.h);
  lap('thin');
  const spursPruned = pruneSpurs(skeleton, grid.w, grid.h, (j) => Math.max(3, Math.ceil(clearance[j] * 1.6) + 2));
  let skeletonCells = 0;
  for (let i = 0; i < skeleton.length; i += 1) skeletonCells += skeleton[i];
  lap('prune');
  const { runs, centre, clusterOf } = trace(skeleton, grid.w, grid.h);
  const toPoint = (cx: number, cy: number): Point => ({ x: grid.originX + (cx + 0.5) * cell, y: grid.originY + (cy + 0.5) * cell });
  const subpaths: Point[][] = runs
    .filter((r) => r.length >= 2)
    .map((r) => r.map((i, k) => {
      const end = k === 0 || k === r.length - 1;
      if (end && clusterOf[i] >= 0) {
        const c = centre(clusterOf[i]);
        return toPoint(c.x, c.y);
      }
      return toPoint(i % grid.w, Math.floor(i / grid.w));
    }));
  if (!subpaths.length) return empty('no-skeleton');
  const snapTolerance = Math.max(computeSnapTolerance(diagonal), cell * 0.75);
  const builtOutdoor = buildWayfindingGraph(subpaths, { snapTolerance, simplifyEpsilon: Math.max(1.5, cell * 1.5), detectCrossings: false, kind: 'traced', idPrefix: 's' });
  let built = builtOutdoor;
  let indoorRuns = 0;
  if (options.indoor) {
    // The engine's indoor pass (footprints minus rooms), gated to corridors at least `indoorMinHalfWidth` wide: a
    // garden-style building's drawn margin between its units and its outline is narrower than any real corridor.
    const structure = detectSvgStructure(floor, background);
    const footprints = rootShapes(structure.footprintShapes, options.flattenStep ?? 4);
    const rooms = rootShapes(structure.roomShapes, options.flattenStep ?? 4);
    const inferred = inferCorridors(footprints, rooms, { minHalfWidth: options.indoorMinHalfWidth ?? Math.max(5, diagonal * 0.003) });
    indoorRuns = inferred.runs.length;
    if (inferred.runs.length) {
      const indoor = buildWayfindingGraph(inferred.runs.map((r) => r.points), { snapTolerance: Math.max(snapTolerance, inferred.cell * 0.75), simplifyEpsilon: Math.max(1.5, inferred.cell * 1.1), detectCrossings: false, kind: 'inferred', idPrefix: 'i' });
      built = { ...builtOutdoor, graph: { nodes: [...builtOutdoor.graph.nodes, ...indoor.graph.nodes], edges: [...builtOutdoor.graph.edges, ...indoor.graph.edges.map((e) => ({ ...e, id: `i_${e.id}` }))] } };
    }
  }
  // skeleton pieces split by a letter or a tree: short bridges only, never through a building
  const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: Math.max(cell * 8, diagonal * 0.012), snapTolerance });
  const obstacles: ObstacleIndex = buildingRings.length ? buildObstacleIndex(buildingRings) : NO_OBSTACLES;
  let bridgesRejected = 0;
  const edges = bridged.graph.edges.filter((e) => {
    if (e.kind !== 'bridge') return true;
    const blocked = obstacles.blocks(e.pathPoints[0], e.pathPoints[e.pathPoints.length - 1]);
    if (blocked) bridgesRejected += 1;
    return !blocked;
  });
  let graph: WayfindingGraph = dropShortComponents({ nodes: bridged.graph.nodes, edges }, Math.max(cell * 20, diagonal * 0.025));
  // Pieces still apart (a courtyard enclosed by its building, a sidewalk cut by a lawn): one more pass, wider, and a
  // join that passes through a building is kept as a proposal ('door_' bridge) rather than refused — a courtyard is
  // reached through a lobby, and the reviewer decides where.
  let throughBuilding = 0;
  const second = bridgeComponentGaps(graph, { maxGapDistance: Math.max(cell * 30, diagonal * 0.06), snapTolerance });
  graph = {
    nodes: second.graph.nodes,
    edges: second.graph.edges.map((e) => {
      if (e.kind !== 'bridge' || edges.some((prior) => prior.id === e.id)) return e;
      const crosses = obstacles.blocks(e.pathPoints[0], e.pathPoints[e.pathPoints.length - 1]);
      if (crosses) throughBuilding += 1;
      return crosses ? { ...e, id: `door_${e.id}` } : e;
    })
  };
  lap('graph');
  const snapped = snapStopsToGraph(stops, graph, { maxSnapDistance: computeMaxSnapDistance(diagonal), snapTolerance });
  graph = snapped.graph;
  if (options.autoConnect) {
    const connected = autoConnectNodes(graph, { maxDistance: computeAutoConnectDistance(diagonal), obstacles });
    graph = connected.graph;
  }
  lap('stops');
  return {
    ok: graph.edges.length > 0,
    reason: graph.edges.length ? null : 'no-skeleton',
    graph,
    connections: snapped.connections,
    joined: snapped.connections.filter((c) => c.connectedNodeId).length,
    grid, walk: opened, buildings, clearance,
    classification: { ...counts, mode },
    buildingRings,
    stats: { walkCells, skeletonCells, thinPasses, spursPruned, piecesDropped, bridges: bridged.bridgeCount - bridgesRejected + second.bridgeCount, bridgesRejected, throughBuilding, indoorRuns, ms },
    viewBox, diagonal, warnings
  };
};
