import type { Point, RootShape } from './types';

/**
 * Corridor inference — the fallback for a floor SVG with no walkway layer
 * (every floor file in the CMS today). The POC planned this as "Phase 1B"
 * (rasterise → skeletonise → confidence-scored, pending review) and never
 * built it; this does it from the file's vector shapes rather than its
 * pixels:
 *
 *   1. the walkable area is the building footprints minus the rooms drawn
 *      inside them (units, amenities, stairs and elevators, garages), filled
 *      onto a grid of square cells over the footprints;
 *   2. a morphological opening (erode, then dilate, by the narrowest corridor
 *      half-width) removes the wall-thickness slivers between rooms and the
 *      footprint's edge, and pieces too small to be a corridor are dropped;
 *   3. Zhang–Suen thinning reduces what is left to its one-cell centreline,
 *      short spurs (the bulge at a corridor's end or corner) are pruned, and
 *      the skeleton is traced into polylines between its junctions and ends
 *      — the subpaths the POC's graph builder takes from a walkway layer.
 *
 * Each traced run carries how wide the corridor is along it, from which its
 * confidence comes. Pure; coordinates in, coordinates out.
 */

export interface InferOptions {
  /** Cell size in root units; derived from the footprints' extent when not given. */
  cell?: number;
  /** The narrowest corridor half-width kept, in root units. */
  minHalfWidth?: number;
}

export interface InferredRun {
  points: Point[];
  /** 0..1 — how consistently wide the corridor is along the run. */
  confidence: number;
  /** Mean corridor half-width along the run, in root units. */
  halfWidth: number;
}

export interface InferResult {
  runs: InferredRun[];
  cell: number;
  /** Why nothing was inferred, when nothing was. */
  reason: 'no-footprint' | 'no-corridor' | null;
  /** Grid size, for diagnostics. */
  grid: { w: number; h: number };
}

const MAX_CELLS = 900_000;
const LONG_SIDE_CELLS = 900;

/** Fills each shape's closed rings (even-odd within a shape) into `mask` with `value`, sampling at cell centres. */
const fillShapes = (mask: Uint8Array, w: number, h: number, minX: number, minY: number, cell: number, shapes: RootShape[], value: 0 | 1) => {
  for (const shape of shapes) {
    if (!shape.closed) continue;
    const rows = new Map<number, number[]>();
    for (const ring of shape.rings) {
      for (let i = 0; i < ring.length - 1; i += 1) {
        const a = ring[i];
        const b = ring[i + 1];
        if (a.y === b.y) continue;
        const y0 = Math.min(a.y, b.y);
        const y1 = Math.max(a.y, b.y);
        const r0 = Math.max(0, Math.ceil((y0 - minY) / cell - 0.5));
        const r1 = Math.min(h - 1, Math.ceil((y1 - minY) / cell - 0.5) - 1);
        for (let r = r0; r <= r1; r += 1) {
          const y = minY + (r + 0.5) * cell;
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
        const c0 = Math.max(0, Math.ceil((xs[k] - minX) / cell - 0.5));
        const c1 = Math.min(w - 1, Math.ceil((xs[k + 1] - minX) / cell - 0.5) - 1);
        for (let c = c0; c <= c1; c += 1) mask[r * w + c] = value;
      }
    });
  }
};

/** Chamfer (3-4) distance, in cells, from every cell to the nearest cell outside `inside`. */
const distanceToOutside = (inside: Uint8Array, w: number, h: number): Float32Array => {
  const big = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i += 1) d[i] = inside[i] ? big : 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      // Beyond the grid counts as outside.
      if (x === 0 || y === 0) v = Math.min(v, 3);
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = w - 1; x >= 0; x -= 1) {
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
  }
  for (let i = 0; i < d.length; i += 1) d[i] /= 3;
  return d;
};

/** Opening by radius r (cells): erode to the cells at least r inside, then grow those back by r. */
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

/** Drops 4-connected pieces smaller than `minArea` cells. */
const dropSmall = (mask: Uint8Array, w: number, h: number, minArea: number): void => {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const piece: number[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    piece.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      piece.push(i);
      const x = i % w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const n of neighbours) {
        if (n < 0 || n >= mask.length || !mask[n] || seen[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (piece.length < minArea) for (const i of piece) mask[i] = 0;
  }
};

/** Zhang–Suen thinning, in place. */
const thin = (mask: Uint8Array, w: number, h: number): void => {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const remove: number[] = [];
  let changed = true;
  let pass = 0;
  while (changed && pass < 400) {
    changed = false;
    for (const step of [0, 1]) {
      remove.length = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (!mask[y * w + x]) continue;
          const p2 = at(x, y - 1);
          const p3 = at(x + 1, y - 1);
          const p4 = at(x + 1, y);
          const p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1);
          const p7 = at(x - 1, y + 1);
          const p8 = at(x - 1, y);
          const p9 = at(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k += 1) if (!seq[k] && seq[k + 1]) a += 1;
          if (a !== 1) continue;
          if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          remove.push(y * w + x);
        }
      }
      if (remove.length) {
        changed = true;
        for (const i of remove) mask[i] = 0;
      }
    }
    pass += 1;
  }
};

const NEIGHBOURS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const;

const neighboursOf = (mask: Uint8Array, w: number, h: number, i: number): number[] => {
  const x = i % w;
  const y = (i - x) / w;
  const out: number[] = [];
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const n = ny * w + nx;
    if (mask[n]) out.push(n);
  }
  return out;
};

/** Removes branches from an end to a junction shorter than `limit(junction)` cells; repeated, since pruning exposes new ends. */
const pruneSpurs = (mask: Uint8Array, w: number, h: number, limit: (junction: number) => number): void => {
  for (let round = 0; round < 3; round += 1) {
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
      if (junction < 0) continue; // an isolated line: not a spur
      if (branch.length <= limit(junction)) {
        for (const cellIndex of branch) if (cellIndex !== junction) mask[cellIndex] = 0;
        pruned += 1;
      }
    }
    if (!pruned) break;
  }
};

interface Traced {
  cells: number[];
}

/** The skeleton as runs between node clusters (cells whose neighbour count is not 2), plus closed loops split in two. */
const trace = (mask: Uint8Array, w: number, h: number): { runs: Traced[]; nodeCentre: (cluster: number) => { x: number; y: number }; clusterOf: Int32Array } => {
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
  const runs: Traced[] = [];
  /** Walks from a cell next to cluster `from` until it meets another cluster (or comes back to its own with nowhere else to go). */
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
    // A run back to its own junction (a ring with one way in) would be a self-loop: split it at its middle.
    if (cells.length >= 8 && clusterOf[first] >= 0 && clusterOf[first] === clusterOf[last]) {
      const half = Math.floor(cells.length / 2);
      runs.push({ cells: cells.slice(0, half + 1) }, { cells: cells.slice(half) });
      return;
    }
    runs.push({ cells });
  };
  for (let i = 0; i < mask.length; i += 1) {
    if (!isNode(i)) continue;
    for (const n of neighboursOf(mask, w, h, i)) {
      if (isNode(n) || visited[n]) continue;
      push([i, ...walk(clusterOf[i], n)]);
    }
  }
  // Loops with no junction at all: split in two so neither half is a self-loop.
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i] || isNode(i) || visited[i]) continue;
    const loop = walk(-1, i);
    if (loop.length < 8) continue;
    const half = Math.floor(loop.length / 2);
    runs.push({ cells: loop.slice(0, half + 1) }, { cells: [...loop.slice(half), loop[0]] });
  }
  return { runs, nodeCentre: (cluster) => ({ x: centres[cluster].x / centres[cluster].n, y: centres[cluster].y / centres[cluster].n }), clusterOf };
};

export const inferCorridors = (footprints: RootShape[], rooms: RootShape[], options: InferOptions = {}): InferResult => {
  const areas = footprints.filter((shape) => shape.closed && shape.rings.length);
  if (!areas.length) return { runs: [], cell: 0, reason: 'no-footprint', grid: { w: 0, h: 0 } };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of areas)
    for (const ring of shape.rings)
      for (const p of ring) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (!(spanX > 0 && spanY > 0)) return { runs: [], cell: 0, reason: 'no-footprint', grid: { w: 0, h: 0 } };
  let cell = options.cell ?? Math.max(spanX, spanY) / LONG_SIDE_CELLS;
  if ((spanX / cell) * (spanY / cell) > MAX_CELLS) cell = Math.sqrt((spanX * spanY) / MAX_CELLS);
  const pad = 2;
  const originX = minX - pad * cell;
  const originY = minY - pad * cell;
  const w = Math.ceil(spanX / cell) + pad * 2;
  const h = Math.ceil(spanY / cell) + pad * 2;
  const diagonal = Math.hypot(spanX, spanY);
  const minHalfWidth = options.minHalfWidth ?? Math.max(1.5, diagonal * 0.0015);

  const walk = new Uint8Array(w * h);
  fillShapes(walk, w, h, originX, originY, cell, areas, 1);
  fillShapes(walk, w, h, originX, originY, cell, rooms, 0);

  const radius = Math.max(1, Math.round(minHalfWidth / cell));
  const opened = open(walk, w, h, radius);
  dropSmall(opened, w, h, Math.max(12, (radius * 4) ** 2));
  const clearance = distanceToOutside(opened, w, h);
  const skeleton = opened.slice();
  thin(skeleton, w, h);
  pruneSpurs(skeleton, w, h, (junction) => Math.max(3, Math.ceil(clearance[junction] * 1.6) + 1));

  const { runs, nodeCentre, clusterOf } = trace(skeleton, w, h);
  const toPoint = (cx: number, cy: number): Point => ({ x: originX + (cx + 0.5) * cell, y: originY + (cy + 0.5) * cell });
  const out: InferredRun[] = [];
  for (const run of runs) {
    if (run.cells.length < 2) continue;
    const points = run.cells.map((i, k) => {
      const isEnd = k === 0 || k === run.cells.length - 1;
      if (isEnd && clusterOf[i] >= 0) {
        const centre = nodeCentre(clusterOf[i]);
        return toPoint(centre.x, centre.y);
      }
      return toPoint(i % w, Math.floor(i / w));
    });
    const widths = run.cells.map((i) => clearance[i]);
    const mean = widths.reduce((sum, v) => sum + v, 0) / widths.length;
    const wide = widths.filter((v) => v >= radius * 1.5).length / widths.length;
    const sd = Math.sqrt(widths.reduce((sum, v) => sum + (v - mean) ** 2, 0) / widths.length);
    const steady = mean > 0 ? Math.max(0, 1 - sd / mean) : 0;
    out.push({ points, confidence: Math.round((0.4 + 0.35 * wide + 0.25 * steady) * 100) / 100, halfWidth: mean * cell });
  }
  return { runs: out, cell, reason: out.length ? null : 'no-corridor', grid: { w, h } };
};
