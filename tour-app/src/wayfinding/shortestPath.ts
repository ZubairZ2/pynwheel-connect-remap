import type { CopyEdge, RoutingIndex } from './graphIndex';

/** A small binary heap for Dijkstra, as `Wayfinding::RouteService::MinHeap`. */
class MinHeap {
  private items: [number, string][] = [];

  get empty(): boolean {
    return this.items.length === 0;
  }

  push(priority: number, value: string): void {
    const a = this.items;
    a.push([priority, value]);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): [number, string] | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < a.length && a[l][0] < a[smallest][0]) smallest = l;
        if (r < a.length && a[r][0] < a[smallest][0]) smallest = r;
        if (smallest === i) break;
        [a[smallest], a[i]] = [a[i], a[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

export interface PathFound {
  /** Copy keys from source to target, both included. */
  path: string[];
  /** The edge that reached each copy on the path (keyed by the copy reached). */
  via: Map<string, CopyEdge>;
  length: number;
}

/** Dijkstra over the per-floor copies. Returns null when the target is unreachable. */
export const dijkstra = (index: RoutingIndex, source: string, target: string): PathFound | null => {
  const dist = new Map<string, number>([[source, 0]]);
  const prev = new Map<string, string>();
  const via = new Map<string, CopyEdge>();
  const heap = new MinHeap();
  heap.push(0, source);
  while (!heap.empty) {
    const popped = heap.pop();
    if (!popped) break;
    const [d, u] = popped;
    if (d > (dist.get(u) ?? Infinity)) continue;
    if (u === target) break;
    for (const edge of index.adjacency.get(u) ?? []) {
      const alt = d + edge.weight;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
        via.set(edge.to, edge);
        heap.push(alt, edge.to);
      }
    }
  }
  const total = dist.get(target);
  if (total == null || !Number.isFinite(total)) return null;
  const path = [target];
  while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
  return { path, via, length: total };
};
