import { distance, segmentIntersection } from './geometry';
import { SpatialIndex } from './spatialIndex';
import type { Point } from './types';

/**
 * Port of the POC's `graph/crossings.ts`. Two walkway strokes that cross
 * often share no drawn point — each was traced straight through — so the
 * proximity rule never sees the junction. This solves for the true
 * intersection, inserts it into both subpaths and marks it a junction. Only
 * crossings between different subpaths count.
 */

export type Subpath = Point[];

interface SegmentItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  subpathIndex: number;
  segmentIndex: number;
}

interface Insertion {
  segmentIndex: number;
  t: number;
  point: Point;
}

export interface CrossingResult {
  subpaths: Subpath[];
  /** `${subpath}:${point}` of every inserted or hit crossing. */
  junctionKeys: Set<string>;
  crossingCount: number;
}

export const insertSubpathCrossings = (subpaths: Subpath[], tolerance: number): CrossingResult => {
  const items: SegmentItem[] = [];
  for (let s = 0; s < subpaths.length; s += 1) {
    const points = subpaths[s];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      items.push({ minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y), subpathIndex: s, segmentIndex: i });
    }
  }
  if (!items.length) return { subpaths: subpaths.map((sp) => sp.slice()), junctionKeys: new Set(), crossingCount: 0 };

  const tree = new SpatialIndex(items);
  const insertions: Insertion[][] = subpaths.map(() => []);
  let crossingCount = 0;

  for (const item of items) {
    const aPoints = subpaths[item.subpathIndex];
    const a1 = aPoints[item.segmentIndex];
    const a2 = aPoints[item.segmentIndex + 1];
    const aLength = distance(a1, a2);
    if (aLength < 1e-9) continue;
    for (const other of tree.search(item)) {
      if (other.subpathIndex === item.subpathIndex) continue;
      // Each unordered pair once.
      if (other.subpathIndex < item.subpathIndex) continue;
      const bPoints = subpaths[other.subpathIndex];
      const b1 = bPoints[other.segmentIndex];
      const b2 = bPoints[other.segmentIndex + 1];
      const bLength = distance(b1, b2);
      if (bLength < 1e-9) continue;
      const hit = segmentIntersection({ x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y }, { x1: b1.x, y1: b1.y, x2: b2.x, y2: b2.y });
      if (!hit) continue;
      crossingCount += 1;
      const point = { x: hit.x, y: hit.y };
      // A crossing on (or within snapping distance of) a vertex needs no insertion: clustering merges them.
      if (hit.t * aLength > tolerance && (1 - hit.t) * aLength > tolerance) insertions[item.subpathIndex].push({ segmentIndex: item.segmentIndex, t: hit.t, point });
      if (hit.u * bLength > tolerance && (1 - hit.u) * bLength > tolerance) insertions[other.subpathIndex].push({ segmentIndex: other.segmentIndex, t: hit.u, point });
    }
  }

  const out: Subpath[] = [];
  const junctionKeys = new Set<string>();
  for (let s = 0; s < subpaths.length; s += 1) {
    const points = subpaths[s];
    const perSegment = new Map<number, Insertion[]>();
    for (const insertion of insertions[s]) {
      const list = perSegment.get(insertion.segmentIndex);
      if (list) list.push(insertion);
      else perSegment.set(insertion.segmentIndex, [insertion]);
    }
    if (!perSegment.size) {
      out.push(points.slice());
      continue;
    }
    const rebuilt: Point[] = [points[0]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const inserted = (perSegment.get(i) ?? []).slice().sort((p, q) => p.t - q.t);
      for (const insertion of inserted) {
        const last = rebuilt[rebuilt.length - 1];
        if (distance(last, insertion.point) <= 1e-9) {
          junctionKeys.add(`${s}:${rebuilt.length - 1}`);
          continue;
        }
        rebuilt.push(insertion.point);
        junctionKeys.add(`${s}:${rebuilt.length - 1}`);
      }
      rebuilt.push(points[i + 1]);
    }
    out.push(rebuilt);
  }
  return { subpaths: out, junctionKeys, crossingCount };
};
