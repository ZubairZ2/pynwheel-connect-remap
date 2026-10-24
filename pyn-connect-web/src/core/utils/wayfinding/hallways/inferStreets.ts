import { distanceToOutside, dropSmall, open, pruneSpurs, thin, trace } from './inferCorridors';
import { baseId, normalizeId, viewBoxMap } from './svg/detectLayers';
import { accumulatedMatrix, applyToPoint, IDENTITY, multiply } from './svg/matrix';
import { parsePathToSubpaths } from './svg/pathData';
import { localPolylines } from './svg/shapes';
import { idOf, isHidden, type SvgEl } from './svg/svgTree';
import type { BBox, Matrix2D, Point } from './types';

/**
 * The outdoor pass of Detect Hallways: the centrelines of everything a
 * visitor walks on *between* the buildings — roads, drives, parking lots,
 * sidewalks, pool decks — read from the walkable area the map draws rather
 * than from a drawn centreline, so a street is covered along its middle
 * whether or not the export drew a sidewalk beside it.
 *
 *   1. Every visible leaf shape of the floor file (and of the property's
 *      shared background map, drawn under it) gets a role: walk area, walk
 *      stroke (a sidewalk drawn as a stroked centreline), block (buildings,
 *      water, lawns, rooms, walls) or ignore (labels, trees, parking stall
 *      paint, pattern fills). The role comes from the nearest named ancestor
 *      layer when the export has Beans layer names (`Road`, `Parking`,
 *      `Walkways`, `Path`, `Building_outline`, `Green_area` …) and, in a
 *      flattened export with no names at all, from the shape's effective
 *      fill colour (neutral and light-warm greys are pavement; beige, brown,
 *      green, blue and dark fills are not).
 *   2. The shapes are painted onto a cell grid in document order — a
 *      painter's rasterisation, so what the file draws over a road (a lawn
 *      island, a building) carves it exactly as the eye sees it.
 *   3. A closing joins a sidewalk to the road a curb's width away, an
 *      opening drops slivers, a distance transform gives every cell its
 *      clearance, Zhang–Suen thinning leaves the one-cell medial axis, spurs
 *      shorter than the local clearance (parking bays, label notches) are
 *      pruned and the skeleton is traced into runs between its junctions.
 *
 * The runs are the subpaths the graph builder takes from a walkway layer;
 * they lie on the medial axis of the pavement by construction. Pure:
 * coordinates in (root user units), coordinates out.
 */

export type StreetRole = 'walk' | 'walkStroke' | 'block' | 'ignore';
export type StreetRoleSource = 'layer' | 'colour';

export interface StreetShape {
  role: StreetRole;
  source: StreetRoleSource;
  layer: string;
  rings: Point[][];
  closed: boolean[];
  /** Half-width in root units, for a walk stroke. */
  halfWidth: number;
  /** A building footprint (what a link must not cut and what the indoor pass works inside). */
  building: boolean;
}

/** Layers whose shapes are pavement: roads and drives, parking, walkways and sidewalks, pool decks and plazas. */
const WALK = new Set([
  'road', 'roads', 'street', 'streets', 'drive', 'driveway', 'driveways', 'internal road', 'internal roads', 'road parking', 'parking', 'parkings', 'parking lot', 'parking lots', 'lot', 'lots',
  'walkway', 'walkways', 'sidewalk', 'sidewalks', 'path', 'paths', 'pathway', 'pathways', 'corridor', 'corridors', 'hallway', 'hallways', 'breezeway', 'breezeways',
  'base', 'pool base', 'pool deck', 'deck', 'plaza', 'patio', 'courtyard', 'courtyards', 'pavement', 'paving', 'cover rd gaps', 'cover internal rd gaps'
]);
/** Layers whose shapes are not walked on. */
const BLOCK = new Set([
  'building outline', 'building outlines', 'buildings outline', 'buildings outlines', 'building out line', 'outline', 'outlines', 'footprint', 'footprints', 'building footprint', 'building footprints',
  'neighborhood', 'neighbourhood', 'external buildings', 'external building', 'buildings', 'building', 'office outline', 'office outlines', 'wall', 'walls', 'obstacle', 'obstacles',
  'pool', 'pools', 'pool area', 'water', 'lake', 'pond', 'fountain', 'green area', 'green areas', 'green', 'grass', 'lawn', 'landscape', 'planter', 'planters', 'garden', 'trash', 'dumpster'
]);
/** Of the blocking layers, the buildings. */
const BUILDING = new Set([
  'building outline', 'building outlines', 'buildings outline', 'buildings outlines', 'building out line', 'outline', 'outlines', 'footprint', 'footprints', 'building footprint', 'building footprints',
  'neighborhood', 'neighbourhood', 'external buildings', 'external building', 'buildings', 'building', 'office outline', 'office outlines'
]);
/** Decoration and annotation, and the rooms layers (units and amenities are stops, and sit inside the buildings anyway). */
const IGNORE = new Set(['trees', 'tree', 'bg 1', 'north', 'legend', 'compass', 'st', 'stairs', 'stair', 'elevator', 'elevators', 'amenities', 'amenity', 'units', 'unit', 'arrow', 'arrows']);
const IGNORE_RX = /(name|number|label|sign|legend|north|compass|arrow|icon|text|logo|title)/;
/** A street named for itself (`W YAMATO ROAD`, `Serenity Loop`). */
const STREET_SUFFIX = /( road| rd| street| st| ave| avenue| blvd| boulevard| way| drive| dr| lane| ln| loop| court| ct| pkwy| parkway| hwy| highway)$/;

const isBuildingName = (base: string) =>
  BUILDING.has(base) || base.startsWith('outline ') || base.endsWith(' outline') || base.endsWith(' outlines') || base.endsWith(' building') || base.endsWith(' buildings') || base.startsWith('building ');

const layerRole = (id: string): { role: StreetRole; building: boolean } | null => {
  const base = baseId(id);
  if (!base) return null;
  if (IGNORE.has(base) || IGNORE_RX.test(normalizeId(id))) return { role: 'ignore', building: false };
  if (WALK.has(base) || STREET_SUFFIX.test(base)) return { role: 'walk', building: false };
  if (BLOCK.has(base) || isBuildingName(base) || base.startsWith('pool')) return { role: 'block', building: isBuildingName(base) };
  return null;
};

/* ── colours ────────────────────────────────────────────────────────── */

const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000', none: 'none', transparent: 'none' };

type Colour = { h: number; s: number; l: number } | 'none' | 'pattern' | null;

/** HSL of a fill value; 'pattern' for a `url(#…)` paint, 'none' for no paint, null when unreadable. */
export const parseColour = (value: string | null | undefined): Colour => {
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
    if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
    [r, g, b] = parts as [number, number, number];
  } else return null;
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  // Saturation explodes next to white and black (a 1/255 difference reads as fully saturated): a near-neutral colour is neutral.
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

/** The nearest `name` attribute (or `style` property) up the tree: SVG paint inherits. */
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

const ringArea = (ring: Point[]): number => {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i += 1) a += ring[i].x * ring[i + 1].y - ring[i + 1].x * ring[i].y;
  return Math.abs(a) / 2;
};

const ringLength = (ring: Point[]): number => {
  let l = 0;
  for (let i = 1; i < ring.length; i += 1) l += Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y);
  return l;
};

const matrixScale = (m: Matrix2D): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

export const parseViewBoxOf = (root: SvgEl): BBox => {
  const raw = root.attrs.viewBox ?? root.attrs.viewbox;
  if (raw) {
    const p = raw.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every((n) => Number.isFinite(n)) && p[2] > 0 && p[3] > 0) return { minX: p[0], minY: p[1], maxX: p[0] + p[2], maxY: p[1] + p[3] };
  }
  const w = parseFloat(root.attrs.width ?? '');
  const h = parseFloat(root.attrs.height ?? '');
  return w > 0 && h > 0 ? { minX: 0, minY: 0, maxX: w, maxY: h } : { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
};

export interface ClassifiedFile {
  shapes: StreetShape[];
  viewBox: BBox;
  namedWalk: number;
  namedBlock: number;
  colourWalk: number;
  colourBlock: number;
  walkLayers: string[];
  blockLayers: string[];
}

interface LayerContext {
  role: StreetRole;
  building: boolean;
  layer: string;
}

/** Roles for every visible leaf shape of one file, in document order; `frame` maps the file into another's viewBox. */
export const classifyStreetShapes = (root: SvgEl, options: { flattenStep?: number; frame?: Matrix2D } = {}): ClassifiedFile => {
  const step = options.flattenStep ?? 4;
  const frame = options.frame ?? IDENTITY;
  const shapes: StreetShape[] = [];
  const counts = { namedWalk: 0, namedBlock: 0, colourWalk: 0, colourBlock: 0 };
  const walkLayers = new Set<string>();
  const blockLayers = new Set<string>();
  const visit = (el: SvgEl, above: LayerContext | null) => {
    if (isHidden(el) || SKIP_TAGS.has(el.tag)) return;
    let here = above;
    const id = idOf(el);
    if (id && el !== root) {
      // The nearest named layer wins; an unknown inner name (`Vector 12`, `Group 137`) keeps the outer layer's role.
      const r = layerRole(id);
      if (r) here = { ...r, layer: id };
    }
    if (SHAPE_TAGS.has(el.tag)) {
      const shape = shapeOf(el, root, step, frame, here);
      if (!shape) return;
      shapes.push(shape);
      if (shape.role === 'walk' || shape.role === 'walkStroke') {
        if (shape.source === 'layer') {
          counts.namedWalk += 1;
          walkLayers.add(shape.layer);
        } else counts.colourWalk += 1;
      } else if (shape.role === 'block') {
        if (shape.source === 'layer') {
          counts.namedBlock += 1;
          blockLayers.add(shape.layer);
        } else counts.colourBlock += 1;
      }
      return;
    }
    for (const child of el.children) visit(child, here);
  };
  visit(root, null);
  return { shapes, viewBox: parseViewBoxOf(root), ...counts, walkLayers: [...walkLayers], blockLayers: [...blockLayers] };
};

const shapeOf = (el: SvgEl, root: SvgEl, step: number, frame: Matrix2D, layer: LayerContext | null): StreetShape | null => {
  if (effectiveOpacity(el) < 0.5) return null; // a shadow, a ghost
  const matrix = multiply(frame, accumulatedMatrix(el, root));
  let rings: Point[][];
  let closed: boolean[];
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
  const fill = parseColour(inherited(el, 'fill') ?? 'black'); // the SVG default paint is black
  const stroke = parseColour(inherited(el, 'stroke') ?? 'none');
  const sw = parseFloat(inherited(el, 'stroke-width') ?? '1');
  const strokeWidth = (Number.isFinite(sw) ? sw : 1) * matrixScale(matrix);
  // A fill paints an area; an open line (a drawn road or sidewalk centreline, with the SVG default black fill) has none.
  const areaRings = rings.filter((ring, i) => closed[i] || ring.length >= 4);
  const paintedArea = areaRings.reduce((sum, ring) => sum + ringArea(ring), 0);
  const hasFill = fill !== 'none' && fill !== null && paintedArea > 1e-6;
  const hasStroke = stroke !== 'none' && stroke !== null;
  const base = { layer: layer?.layer ?? '', rings, closed, halfWidth: Math.max(strokeWidth / 2, 1.5) };
  const as = (role: StreetRole, source: StreetRoleSource, building = false): StreetShape => ({ ...base, role, source, building });

  if (layer) {
    if (layer.role === 'ignore') return as('ignore', 'layer');
    if (layer.role === 'walk') {
      if (hasFill) {
        // White paint inside a road layer — lane dashes, a stall, a crossing — is paint, not pavement.
        if (fill !== 'pattern' && fill.l > 0.93 && fill.s < 0.15) return as('ignore', 'layer');
        return as('walk', 'layer');
      }
      // A stroked centreline (a sidewalk drawn 3–16 units wide) is walked along; hairline stall stripes are not.
      return hasStroke && strokeWidth >= 1.5 ? as('walkStroke', 'layer') : as('ignore', 'layer');
    }
    // block: the filled shape is the area; its stroked outline twin is paint
    return hasFill ? as('block', 'layer', layer.building) : as('ignore', 'layer');
  }

  // No named layer: the effective fill colour says what the shape is.
  if (!hasFill || fill === 'pattern') return as('ignore', 'colour');
  const { h, s, l } = fill as { h: number; s: number; l: number };
  const biggest = rings.reduce((best, r) => (ringArea(r) > ringArea(best) ? r : best), rings[0]);
  const area = ringArea(biggest);
  // A filled shape thinner than a wall (a stall stripe, lane paint, an outlined glyph) is paint, not geometry.
  const perimeter = ringLength(biggest);
  if (perimeter > 0 && (2 * area) / perimeter < 1.3 && area < 4000) return as('ignore', 'colour');
  if (l < 0.22) return area < 600 ? as('ignore', 'colour') : as('block', 'colour');
  if (l > 0.93 && s < 0.15) return as('ignore', 'colour');
  if (s <= 0.06 && l >= 0.3 && l <= 0.93) return as('walk', 'colour'); // neutral grey: road, lot, floor slab
  if (s <= 0.25 && l >= 0.65) return as('walk', 'colour'); // light warm grey: sidewalk, walkway
  const beigeRoom = s > 0.25 && l > 0.75 && h >= 15 && h <= 55; // the export's unit and footprint fills
  return as('block', 'colour', beigeRoom);
};

/* ── raster ─────────────────────────────────────────────────────────── */

export interface StreetGrid {
  w: number;
  h: number;
  cell: number;
  originX: number;
  originY: number;
}

const fillRings = (mask: Uint8Array, g: StreetGrid, rings: Point[][], value: 0 | 1) => {
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

const strokePolyline = (mask: Uint8Array, g: StreetGrid, points: Point[], halfWidth: number, value: 0 | 1) => {
  const hw2 = halfWidth * halfWidth;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const c0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - halfWidth - g.originX) / g.cell));
    const c1 = Math.min(g.w - 1, Math.ceil((Math.max(a.x, b.x) + halfWidth - g.originX) / g.cell));
    const r0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - halfWidth - g.originY) / g.cell));
    const r1 = Math.min(g.h - 1, Math.ceil((Math.max(a.y, b.y) + halfWidth - g.originY) / g.cell));
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

/* ── the pass ───────────────────────────────────────────────────────── */

export interface InferStreetsOptions {
  /** Cell size in root units; the viewBox's long side over 1400 when not given. */
  cell?: number;
  /** Closing radius in root units: a sidewalk this far from its road is the same surface. 0 disables. */
  closeRadius?: number;
  /** The opening radius in root units: slivers narrower than twice this vanish. */
  minHalfWidth?: number;
  flattenStep?: number;
}

export type StreetsMode = 'layers' | 'colour' | 'mixed';

export interface StreetsResult {
  /** Centreline runs in root units, between junctions and ends. */
  runs: Point[][];
  /** Why nothing came out, when nothing did. */
  reason: 'no-walkable' | 'no-skeleton' | null;
  /** How the roles were found: named layers, fill colours (a flattened export), or both. */
  mode: StreetsMode;
  walkLayers: string[];
  blockLayers: string[];
  colourWalk: number;
  colourBlock: number;
  /** The building footprints, as rings in root units (a synthesised link must not cut them). */
  buildingRings: Point[][];
  grid: StreetGrid;
  /** The walkable mask after cleaning (1 = pavement), for diagnostics and tests. */
  walk: Uint8Array;
  /** The buildings mask. */
  buildings: Uint8Array;
  /** Distance from each walkable cell to the nearest non-walkable one, in cells. */
  clearance: Float32Array;
  viewBox: BBox;
  stats: { walkCells: number; skeletonCells: number; thinPasses: number; spursPruned: number; piecesDropped: number; ms: Record<string, number> };
}

const LONG_SIDE_CELLS = 1400;
const MAX_CELLS = 2_600_000;

export const inferStreets = (floor: SvgEl, background: SvgEl | null, options: InferStreetsOptions = {}): StreetsResult => {
  const ms: Record<string, number> = {};
  let mark = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const lap = (name: string) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    ms[name] = Math.round(now - mark);
    mark = now;
  };
  const own = classifyStreetShapes(floor, { flattenStep: options.flattenStep });
  let shapes = own.shapes;
  const layers = { walk: new Set(own.walkLayers), block: new Set(own.blockLayers) };
  let colourWalk = own.colourWalk;
  let colourBlock = own.colourBlock;
  let namedWalk = own.namedWalk;
  if (background) {
    // The background is drawn under the floor file, mapped into the floor's frame through the two viewBoxes.
    const bg = classifyStreetShapes(background, { flattenStep: options.flattenStep, frame: viewBoxMap(parseViewBoxOf(background), own.viewBox) });
    shapes = [...bg.shapes, ...own.shapes];
    bg.walkLayers.forEach((l) => layers.walk.add(l));
    bg.blockLayers.forEach((l) => layers.block.add(l));
    colourWalk += bg.colourWalk;
    colourBlock += bg.colourBlock;
    namedWalk += bg.namedWalk;
  }
  lap('classify');

  const viewBox = own.viewBox;
  const spanX = viewBox.maxX - viewBox.minX;
  const spanY = viewBox.maxY - viewBox.minY;
  let cell = options.cell ?? Math.max(spanX, spanY) / LONG_SIDE_CELLS;
  if ((spanX / cell) * (spanY / cell) > MAX_CELLS) cell = Math.sqrt((spanX * spanY) / MAX_CELLS);
  const pad = 2;
  const grid: StreetGrid = { cell, originX: viewBox.minX - pad * cell, originY: viewBox.minY - pad * cell, w: Math.ceil(spanX / cell) + 2 * pad, h: Math.ceil(spanY / cell) + 2 * pad };
  const walk = new Uint8Array(grid.w * grid.h);
  const buildings = new Uint8Array(grid.w * grid.h);
  const buildingRings: Point[][] = [];
  for (const shape of shapes) {
    const areaRings = shape.rings.filter((ring, i) => shape.closed[i] || ring.length >= 4);
    if (shape.role === 'walk') fillRings(walk, grid, areaRings, 1);
    else if (shape.role === 'walkStroke') for (const ring of shape.rings) strokePolyline(walk, grid, ring, shape.halfWidth, 1);
    else if (shape.role === 'block') {
      fillRings(walk, grid, areaRings, 0);
      if (shape.building) {
        fillRings(buildings, grid, areaRings, 1);
        buildingRings.push(...areaRings.map((r) => [...r, r[0]]));
      }
    }
  }
  lap('paint');
  const mode: StreetsMode = namedWalk && !colourWalk ? 'layers' : namedWalk ? 'mixed' : 'colour';
  const base = { mode, walkLayers: [...layers.walk], blockLayers: [...layers.block], colourWalk, colourBlock, buildingRings, grid, buildings, viewBox };
  let walkCells = 0;
  for (let i = 0; i < walk.length; i += 1) walkCells += walk[i];
  if (!walkCells) return { ...base, runs: [], reason: 'no-walkable', walk, clearance: new Float32Array(0), stats: { walkCells: 0, skeletonCells: 0, thinPasses: 0, spursPruned: 0, piecesDropped: 0, ms } };

  // Closing: a sidewalk a curb's width from the road it serves is one surface, not two strips with a sliver between
  // them (the sliver would seed a chain of tiny loops in the skeleton) — but never into a building.
  const closeRadius = Math.round((options.closeRadius ?? 2.5) / cell);
  let surface = walk;
  if (closeRadius >= 1) {
    const notWalk = new Uint8Array(walk.length);
    for (let i = 0; i < walk.length; i += 1) notWalk[i] = walk[i] ? 0 : 1;
    const toWalk = distanceToOutside(notWalk, grid.w, grid.h);
    const dilated = new Uint8Array(walk.length);
    for (let i = 0; i < walk.length; i += 1) dilated[i] = walk[i] || toWalk[i] <= closeRadius ? 1 : 0;
    const fromEdge = distanceToOutside(dilated, grid.w, grid.h);
    surface = new Uint8Array(walk.length);
    for (let i = 0; i < walk.length; i += 1) surface[i] = !buildings[i] && (walk[i] || (dilated[i] && fromEdge[i] > closeRadius)) ? 1 : 0;
  }
  const radius = Math.max(1, Math.round((options.minHalfWidth ?? 1.2) / cell));
  const opened = open(surface, grid.w, grid.h, radius);
  const piecesDropped = dropSmall(opened, grid.w, grid.h, Math.max(40, (radius * 8) ** 2));
  const clearance = distanceToOutside(opened, grid.w, grid.h);
  lap('clean');
  const skeleton = opened.slice();
  const thinPasses = thin(skeleton, grid.w, grid.h);
  lap('thin');
  // A spur shorter than the clearance around its junction is the skeleton reaching into a bay or a notch, not a way.
  const spursPruned = pruneSpurs(skeleton, grid.w, grid.h, (j) => Math.max(3, Math.ceil(clearance[j] * 1.6) + 2));
  let skeletonCells = 0;
  for (let i = 0; i < skeleton.length; i += 1) skeletonCells += skeleton[i];
  lap('prune');
  const traced = trace(skeleton, grid.w, grid.h);
  const toPoint = (cx: number, cy: number): Point => ({ x: grid.originX + (cx + 0.5) * cell, y: grid.originY + (cy + 0.5) * cell });
  const runs: Point[][] = traced.runs
    .filter((run) => run.cells.length >= 2)
    .map((run) =>
      run.cells.map((i, k) => {
        const end = k === 0 || k === run.cells.length - 1;
        if (end && traced.clusterOf[i] >= 0) {
          const c = traced.nodeCentre(traced.clusterOf[i]);
          return toPoint(c.x, c.y);
        }
        return toPoint(i % grid.w, Math.floor(i / grid.w));
      })
    );
  lap('trace');
  return { ...base, runs, reason: runs.length ? null : 'no-skeleton', walk: opened, clearance, stats: { walkCells, skeletonCells, thinPasses, spursPruned, piecesDropped, ms } };
};
