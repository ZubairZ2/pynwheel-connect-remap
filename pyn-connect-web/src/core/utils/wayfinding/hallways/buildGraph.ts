import { buildPointIndex, clusterPoints } from './cluster';
import { insertSubpathCrossings, type Subpath } from './crossings';
import { distance, polylineLength } from './geometry';
import { douglasPeucker } from './simplify';
import type { EdgeKind, GraphDiagnostics, Point, WayfindingEdge, WayfindingGraph, WayfindingNode } from './types';

/**
 * Phase 3 of the POC (`graph/buildGraph.ts`): flattened subpaths → a node /
 * edge graph. Nodes come from every subpath's ends, from an interior point
 * within the snap tolerance of a point on a different subpath (a T-junction
 * drawn as one stroke starting on another's vertex), and from true
 * crossings; candidates within the tolerance merge to their centroid. Each
 * edge keeps the polyline between its two nodes, simplified as a whole and
 * pinned to the merged node centres.
 */

/** The spec's default, used only when the map's scale is unknown. */
export const DEFAULT_SNAP_TOLERANCE = 4;
export const DEFAULT_SIMPLIFY_EPSILON = 1.5;
const HIGH_DEGREE_THRESHOLD = 6;

/** Deliberately small: a radius wide enough to close drawn gaps also merges unrelated junctions (the POC's sweep, §6.3). */
export const computeSnapTolerance = (bboxDiagonal: number): number => Math.max(1, bboxDiagonal * 0.0002);

export interface BuildGraphOptions {
  snapTolerance?: number;
  simplifyEpsilon?: number;
  detectCrossings?: boolean;
  /** The kind every edge gets (the POC's are all `traced`). */
  kind?: EdgeKind;
  /** Prefix of the node ids (`n0`, `n1`, …). */
  idPrefix?: string;
}

export interface BuildGraphResult {
  graph: WayfindingGraph;
  diagnostics: GraphDiagnostics;
}

export const buildWayfindingGraph = (rawSubpaths: Subpath[], options: BuildGraphOptions = {}): BuildGraphResult => {
  const snapTolerance = options.snapTolerance ?? DEFAULT_SNAP_TOLERANCE;
  const simplifyEpsilon = options.simplifyEpsilon ?? DEFAULT_SIMPLIFY_EPSILON;
  const kind = options.kind ?? 'traced';
  const prefix = options.idPrefix ?? 'n';

  const usable = rawSubpaths.filter((sp) => sp.length >= 2 && polylineLength(sp) > 1e-9);
  const crossing = options.detectCrossings === false ? { subpaths: usable, junctionKeys: new Set<string>(), crossingCount: 0 } : insertSubpathCrossings(usable, snapTolerance);
  const subpaths = crossing.subpaths;
  const proximity = findProximityJunctions(subpaths, snapTolerance);

  const nodeKeys = new Set<string>([...crossing.junctionKeys, ...proximity.junctionKeys]);
  for (let s = 0; s < subpaths.length; s += 1) {
    nodeKeys.add(`${s}:0`);
    nodeKeys.add(`${s}:${subpaths[s].length - 1}`);
  }

  // A fixed traversal order keeps node ids stable across runs on the same input.
  const candidatePoints: Point[] = [];
  const keyToCandidate = new Map<string, number>();
  for (let s = 0; s < subpaths.length; s += 1) {
    for (let i = 0; i < subpaths[s].length; i += 1) {
      const key = `${s}:${i}`;
      if (!nodeKeys.has(key)) continue;
      keyToCandidate.set(key, candidatePoints.length);
      candidatePoints.push(subpaths[s][i]);
    }
  }

  const { clusterOf, clusters } = clusterPoints(candidatePoints, snapTolerance);
  const nodes: WayfindingNode[] = clusters.map((c, i) => ({ id: `${prefix}${i}`, x: c.x, y: c.y }));
  const edges: WayfindingEdge[] = [];
  const edgesByPair = new Map<string, WayfindingEdge[]>();
  let droppedDuplicateEdgeCount = 0;

  const pushEdge = (fromCluster: number, toCluster: number, points: Point[]) => {
    if (fromCluster === toCluster) return; // a self-loop adds no reachability
    const from = nodes[fromCluster];
    const to = nodes[toCluster];
    // Simplify the whole run, then pin both ends to the merged centres so adjacent edges meet exactly.
    const simplified = douglasPeucker(points, simplifyEpsilon);
    const pathPoints = [{ x: from.x, y: from.y }, ...simplified.slice(1, -1), { x: to.x, y: to.y }];
    const key = from.id < to.id ? `${from.id}|${to.id}` : `${to.id}|${from.id}`;
    const existing = edgesByPair.get(key) ?? [];
    const length = polylineLength(pathPoints);
    // A second edge between the same pair is kept only when it is a genuinely different route.
    if (existing.some((edge) => Math.abs(edge.length - length) <= snapTolerance && sameMidpoint(edge, pathPoints, snapTolerance))) {
      droppedDuplicateEdgeCount += 1;
      return;
    }
    const edge: WayfindingEdge = { id: `e${edges.length}`, fromNodeId: from.id, toNodeId: to.id, pathPoints, length, kind };
    edges.push(edge);
    existing.push(edge);
    edgesByPair.set(key, existing);
  };

  for (let s = 0; s < subpaths.length; s += 1) {
    const points = subpaths[s];
    let runStart: number | null = null;
    let run: Point[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const candidate = keyToCandidate.get(`${s}:${i}`);
      run.push(points[i]);
      if (candidate === undefined) continue;
      const cluster = clusterOf[candidate];
      if (runStart !== null && run.length >= 2) pushEdge(runStart, cluster, run);
      runStart = cluster;
      run = [points[i]];
    }
  }

  const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
    degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
  }

  return {
    graph: { nodes, edges },
    diagnostics: {
      subpathCount: subpaths.length,
      // Reported for review, never discarded.
      isolatedNodeIds: nodes.filter((n) => (degree.get(n.id) ?? 0) === 0).map((n) => n.id),
      highDegreeNodeIds: nodes.filter((n) => (degree.get(n.id) ?? 0) > HIGH_DEGREE_THRESHOLD).map((n) => n.id),
      proximityJunctionCount: proximity.count,
      crossingJunctionCount: crossing.crossingCount,
      droppedDuplicateEdgeCount,
      bridgeCount: 0
    }
  };
};

const sameMidpoint = (edge: WayfindingEdge, pathPoints: Point[], tolerance: number): boolean =>
  distance(edge.pathPoints[Math.floor(edge.pathPoints.length / 2)], pathPoints[Math.floor(pathPoints.length / 2)]) <= tolerance;

/**
 * An interior point within the tolerance of a point on a *different*
 * subpath becomes a node. Same-subpath points are skipped, or a doubled-back
 * stroke would shatter into one-segment edges.
 */
const findProximityJunctions = (subpaths: Subpath[], tolerance: number): { junctionKeys: Set<string>; count: number } => {
  const flat: Point[] = [];
  const owner: { s: number; i: number }[] = [];
  for (let s = 0; s < subpaths.length; s += 1) {
    for (let i = 0; i < subpaths[s].length; i += 1) {
      flat.push(subpaths[s][i]);
      owner.push({ s, i });
    }
  }
  const index = buildPointIndex(flat);
  const junctionKeys = new Set<string>();
  let count = 0;
  for (let i = 0; i < flat.length; i += 1) {
    const self = owner[i];
    for (const hit of index.within(flat[i], tolerance)) {
      const other = owner[hit.index];
      if (other.s === self.s) continue;
      junctionKeys.add(`${self.s}:${self.i}`);
      junctionKeys.add(`${other.s}:${other.i}`);
      count += 1;
    }
  }
  return { junctionKeys, count: Math.floor(count / 2) };
};
