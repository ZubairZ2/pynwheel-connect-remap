import { distance } from './geometry';
import { SpatialIndex } from './spatialIndex';
import type { Point } from './types';

/** Port of the POC's `graph/cluster.ts`: snap-merging by union-find over a spatial index. */

export class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_value, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    let node = x;
    while (this.parent[node] !== node) {
      this.parent[node] = this.parent[this.parent[node]];
      node = this.parent[node];
    }
    return node;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
  }
}

interface PointItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  index: number;
  x: number;
  y: number;
}

const toItems = (points: Point[], radius: number): PointItem[] =>
  points.map((p, index) => ({ minX: p.x - radius, minY: p.y - radius, maxX: p.x + radius, maxY: p.y + radius, index, x: p.x, y: p.y }));

export interface ClusterResult {
  /** `clusterOf[i]` is the cluster point i merged into. */
  clusterOf: number[];
  clusters: Point[];
}

/**
 * Collapses every group of candidate nodes within `tolerance` of each other
 * into one node at the group's centroid. Centroids, in a fixed order, so the
 * same input always gives the same nodes.
 */
export const clusterPoints = (points: Point[], tolerance: number): ClusterResult => {
  if (!points.length) return { clusterOf: [], clusters: [] };
  const items = toItems(points, tolerance);
  const tree = new SpatialIndex(items);
  const uf = new UnionFind(points.length);
  for (const item of items) {
    for (const candidate of tree.search(item)) {
      if (candidate.index === item.index) continue;
      if (distance(item, candidate) <= tolerance) uf.union(item.index, candidate.index);
    }
  }
  const rootToMembers = new Map<number, number[]>();
  for (let i = 0; i < points.length; i += 1) {
    const root = uf.find(i);
    const members = rootToMembers.get(root);
    if (members) members.push(i);
    else rootToMembers.set(root, [i]);
  }
  const sortedRoots = Array.from(rootToMembers.keys()).sort((a, b) => a - b);
  const clusters: Point[] = [];
  const rootToCluster = new Map<number, number>();
  for (const root of sortedRoots) {
    const members = rootToMembers.get(root)!;
    const cx = members.reduce((sum, i) => sum + points[i].x, 0) / members.length;
    const cy = members.reduce((sum, i) => sum + points[i].y, 0) / members.length;
    rootToCluster.set(root, clusters.length);
    clusters.push({ x: cx, y: cy });
  }
  return { clusterOf: points.map((_point, i) => rootToCluster.get(uf.find(i))!), clusters };
};

export interface NearbyEntry extends Point {
  index: number;
}

/** "Everything within `radius` of this point" over a fixed point set. */
export const buildPointIndex = (points: Point[]): { within: (p: Point, radius: number) => NearbyEntry[] } => {
  const tree = new SpatialIndex(toItems(points, 0));
  return {
    within: (p, radius) =>
      tree
        .search({ minX: p.x - radius, minY: p.y - radius, maxX: p.x + radius, maxY: p.y + radius })
        .filter((hit) => distance(hit, p) <= radius)
        .map((hit) => ({ x: hit.x, y: hit.y, index: hit.index }))
  };
};
