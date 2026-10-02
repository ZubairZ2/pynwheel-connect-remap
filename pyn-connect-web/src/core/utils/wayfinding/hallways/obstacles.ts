import { segmentIntersection } from './geometry';
import { SpatialIndex } from './spatialIndex';
import type { Point } from './types';

/**
 * Port of the POC's `graph/obstacles.ts`: what a synthesised connection
 * (Auto-Connect, a new point's links) must not cut through. Only ever
 * applied to synthesised edges — a drawn path clipping an outline is a
 * breezeway, not a mistake. A hit at the connection's own end is a door or a
 * wall-hugging path, not a crossing.
 */
export interface ObstacleIndex {
  blocks(a: Point, b: Point): boolean;
  segmentCount: number;
}

interface ObstacleSegment {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const NO_OBSTACLES: ObstacleIndex = { blocks: () => false, segmentCount: 0 };

export const buildObstacleIndex = (outlines: Point[][]): ObstacleIndex => {
  const segments: ObstacleSegment[] = [];
  for (const outline of outlines) {
    for (let i = 0; i < outline.length - 1; i += 1) {
      const a = outline[i];
      const b = outline[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-9) continue;
      segments.push({ minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y), x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  if (!segments.length) return NO_OBSTACLES;
  const tree = new SpatialIndex(segments);
  return {
    segmentCount: segments.length,
    blocks(a, b) {
      const probe = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      for (const segment of tree.search({ minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) })) {
        const hit = segmentIntersection(probe, segment);
        if (!hit) continue;
        if (hit.t <= 1e-6 || hit.t >= 1 - 1e-6) continue;
        return true;
      }
      return false;
    }
  };
};
