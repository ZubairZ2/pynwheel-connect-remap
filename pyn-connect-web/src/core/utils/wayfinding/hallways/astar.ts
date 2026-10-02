import { distance } from './geometry';
import type { Point } from './types';

/**
 * The POC's routing core (`lib/routing/astar.ts`, `componentGap.ts`):
 * binary-heap A* with lazy deletion. The heuristic is the straight-line
 * distance to the goal, admissible because a polyline is never shorter than
 * the line between its ends. Across floorplates (elevator, stairs and
 * outdoor links between frames) a straight line means nothing, so a route
 * over several frames runs with the heuristic off — plain Dijkstra, still
 * exact.
 */

export class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (!this.items.length) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.items[l].priority < this.items[smallest].priority) smallest = l;
        if (r < this.items.length && this.items[r].priority < this.items[smallest].priority) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

export interface RouteNode extends Point {
  /** The coordinate frame the node lives in (a floorplate copy); the heuristic only applies within one. */
  frame: string;
}

export interface AdjacencyEntry<E> {
  to: string;
  w: number;
  edge: E;
}

export const astar = <E>(
  nodes: Map<string, RouteNode>,
  adjacency: Map<string, AdjacencyEntry<E>[]>,
  startId: string,
  goalId: string,
  options: { heuristic?: boolean } = {}
): { path: string[]; via: Map<string, AdjacencyEntry<E>>; cost: number } | null => {
  if (!nodes.has(startId) || !nodes.has(goalId)) return null;
  if (startId === goalId) return { path: [startId], via: new Map(), cost: 0 };
  const goal = nodes.get(goalId)!;
  const useHeuristic = options.heuristic !== false;
  const heuristic = (id: string) => {
    if (!useHeuristic) return 0;
    const node = nodes.get(id);
    return node && node.frame === goal.frame ? distance(node, goal) : 0;
  };
  const gScore = new Map<string, number>([[startId, 0]]);
  const cameFrom = new Map<string, string>();
  const via = new Map<string, AdjacencyEntry<E>>();
  const closed = new Set<string>();
  const heap = new MinHeap<string>();
  heap.push(heuristic(startId), startId);
  while (heap.size) {
    const current = heap.pop()!;
    if (current === goalId) {
      const path = [goalId];
      let node = goalId;
      while (cameFrom.has(node)) {
        node = cameFrom.get(node)!;
        path.push(node);
      }
      return { path: path.reverse(), via, cost: gScore.get(goalId) ?? 0 };
    }
    if (closed.has(current)) continue; // a stale heap entry (lazy deletion instead of decrease-key)
    closed.add(current);
    for (const neighbour of adjacency.get(current) ?? []) {
      if (closed.has(neighbour.to)) continue;
      const tentative = gScore.get(current)! + neighbour.w;
      if (tentative < (gScore.get(neighbour.to) ?? Infinity)) {
        gScore.set(neighbour.to, tentative);
        cameFrom.set(neighbour.to, current);
        via.set(neighbour.to, neighbour);
        heap.push(tentative + heuristic(neighbour.to), neighbour.to);
      }
    }
  }
  return null;
};

/** Every node reachable from `startId` (its connected component). */
export const reachableFrom = <E>(adjacency: Map<string, AdjacencyEntry<E>[]>, startId: string): Set<string> => {
  const seen = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.pop()!;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (seen.has(neighbour.to)) continue;
      seen.add(neighbour.to);
      queue.push(neighbour.to);
    }
  }
  return seen;
};

/** The nearest node pair across two node sets, both in `frame` (brute force: it only runs on an already-failed route). */
export const nearestCrossSetPair = (nodes: Map<string, RouteNode>, setA: Set<string>, setB: Set<string>, accept: (id: string) => boolean): { a: string; b: string; distance: number } | null => {
  let best: { a: string; b: string; distance: number } | null = null;
  for (const idA of setA) {
    const a = nodes.get(idA);
    if (!a || !accept(idA)) continue;
    for (const idB of setB) {
      const b = nodes.get(idB);
      if (!b || b.frame !== a.frame || !accept(idB)) continue;
      const d = distance(a, b);
      if (!best || d < best.distance) best = { a: idA, b: idB, distance: d };
    }
  }
  return best;
};

/** The POC's route-time bridge: 2% of the diagonal (floor 50), a last resort that warns. */
export const computeComponentBridgeDistance = (bboxDiagonal: number): number => Math.max(50, bboxDiagonal * 0.02);
