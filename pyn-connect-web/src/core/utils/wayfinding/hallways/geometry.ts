import type { Point, Segment } from './types';

/** Port of the POC's `graph/geometry.ts` and `graph/splitEdge.ts`. */

// Below this, two direction vectors are parallel rather than solved for a crossing.
const PARALLEL_EPS = 1e-9;

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const polylineLength = (points: Point[]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) total += distance(points[i], points[i + 1]);
  return total;
};

export interface SegmentIntersection {
  x: number;
  y: number;
  /** 0..1 along segment a. */
  t: number;
  /** 0..1 along segment b. */
  u: number;
}

/** A parametric line–line solve bounded to the two segments. */
export const segmentIntersection = (a: Segment, b: Segment): SegmentIntersection | null => {
  const dx1 = a.x2 - a.x1;
  const dy1 = a.y2 - a.y1;
  const dx2 = b.x2 - b.x1;
  const dy2 = b.y2 - b.y1;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < PARALLEL_EPS) return null;
  const dx3 = b.x1 - a.x1;
  const dy3 = b.y1 - a.y1;
  const t = (dx3 * dy2 - dy3 * dx2) / denom;
  const u = (dx3 * dy1 - dy3 * dx1) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x1 + t * dx1, y: a.y1 + t * dy1, t, u };
};

export interface PointProjection extends Point {
  t: number;
  distance: number;
}

/** The nearest point on a segment, clamped to its ends. */
export const projectPointOnSegment = (p: Point, s: Segment): PointProjection => {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = s.x1 + t * dx;
  const y = s.y1 + t * dy;
  return { x, y, t, distance: Math.hypot(p.x - x, p.y - y) };
};

export interface PolylineProjection extends PointProjection {
  segmentIndex: number;
}

/** The nearest point on a polyline, and the segment it lands on. */
export const projectPointOnPolyline = (p: Point, points: Point[]): PolylineProjection | null => {
  let best: PolylineProjection | null = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const projection = projectPointOnSegment(p, { x1: points[i].x, y1: points[i].y, x2: points[i + 1].x, y2: points[i + 1].y });
    if (!best || projection.distance < best.distance) best = { ...projection, segmentIndex: i };
  }
  return best;
};

export interface PolylineSplit {
  at: Point;
  before: Point[];
  after: Point[];
}

/** Splits a polyline at `t` along its `segmentIndex`-th segment; both halves include the split point. */
export const splitPolyline = (points: Point[], segmentIndex: number, t: number): PolylineSplit => {
  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  const at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  return { at, before: [...points.slice(0, segmentIndex + 1), at], after: [at, ...points.slice(segmentIndex + 1)] };
};

export const boxOfPoints = (points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
};

/** An undirected pair's key, the same whichever end comes first. */
export const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
