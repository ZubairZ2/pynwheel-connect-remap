import type { Point } from './types';

/**
 * Douglas–Peucker (the POC's `graph/simplify.ts`): drops the points curve
 * flattening leaves on near-straight runs without changing the drawn shape.
 * Iterative — a flattened walkway subpath can be thousands of points and the
 * recursive form overflows the stack on an already-straight run.
 */
export const douglasPeucker = (points: Point[], epsilon: number): Point[] => {
  if (points.length <= 2 || epsilon <= 0) return points.slice();
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;
    let maxDistance = -1;
    let maxIndex = first;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > maxDistance) {
        maxDistance = d;
        maxIndex = i;
      }
    }
    if (maxDistance > epsilon) {
      keep[maxIndex] = true;
      stack.push([first, maxIndex], [maxIndex, last]);
    }
  }
  return points.filter((_point, index) => keep[index]);
};

const perpendicularDistance = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
