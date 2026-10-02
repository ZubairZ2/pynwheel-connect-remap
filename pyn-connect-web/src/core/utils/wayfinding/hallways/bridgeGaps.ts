import { boxOfPoints, distance, polylineLength, projectPointOnPolyline, splitPolyline } from './geometry';
import { SpatialIndex } from './spatialIndex';
import type { Point, WayfindingEdge, WayfindingGraph } from './types';

/**
 * Port of the POC's `graph/bridgeGaps.ts` — its most important finding:
 * real walkway art stops 10–30 units short of itself throughout a file, and
 * no snap tolerance closes that without merging unrelated junctions. A
 * narrow global pass does: only loose ends (degree 1) are extended, each to
 * the nearest point on an edge of a *different* piece within the cap,
 * shortest gap first, never between pieces already joined; a join that
 * lands mid-edge splits it. Every join is a straight `bridge` edge.
 */

/** 5.5% of the diagonal (floor 20): where every real export saturated in the POC's sweep. */
export const computeGapBridgeDistance = (bboxDiagonal: number): number => Math.max(20, bboxDiagonal * 0.055);

class StringUnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    let root = x;
    while (this.parent.has(root) && this.parent.get(root) !== root) root = this.parent.get(root)!;
    let node = x;
    while (this.parent.has(node) && this.parent.get(node) !== root) {
      const next = this.parent.get(node)!;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

interface EdgeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  edgeId: string;
}

export const edgeItem = (edge: WayfindingEdge): EdgeItem => ({ ...boxOfPoints(edge.pathPoints), edgeId: edge.id });

/** Replaces one edge with two meeting at a new node (the POC's `splitEdgeAt`). */
export const splitEdgeAt = (
  edge: WayfindingEdge,
  segmentIndex: number,
  t: number,
  newNodeId: string,
  idFor: (suffix: string) => string
): { at: Point; edges: [WayfindingEdge, WayfindingEdge] } => {
  const { at, before, after } = splitPolyline(edge.pathPoints, segmentIndex, t);
  return {
    at,
    edges: [
      { ...edge, id: idFor(`${edge.id}a`), fromNodeId: edge.fromNodeId, toNodeId: newNodeId, pathPoints: before, length: polylineLength(before) },
      { ...edge, id: idFor(`${edge.id}b`), fromNodeId: newNodeId, toNodeId: edge.toNodeId, pathPoints: after, length: polylineLength(after) }
    ]
  };
};

export interface BridgeGapsOptions {
  maxGapDistance: number;
  /** A target this close to an edge's end joins that node instead of splitting. */
  snapTolerance: number;
}

export interface BridgeGapsResult {
  graph: WayfindingGraph;
  bridgeCount: number;
}

/** Each round strictly reduces the pieces; this is a safety valve. */
const MAX_ROUNDS = 8;

export const bridgeComponentGaps = (graph: WayfindingGraph, options: BridgeGapsOptions): BridgeGapsResult => {
  let current = graph;
  let bridgeCount = 0;
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const result = bridgeRound(current, options);
    current = result.graph;
    bridgeCount += result.bridgeCount;
    if (!result.bridgeCount) break;
  }
  return { graph: current, bridgeCount };
};

const bridgeRound = (graph: WayfindingGraph, { maxGapDistance, snapTolerance }: BridgeGapsOptions): BridgeGapsResult => {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgesById = new Map(graph.edges.map((e) => [e.id, { ...e }]));
  const usedIds = new Set<string>([...nodeById.keys(), ...edgesById.keys()]);
  const uniqueId = (base: string): string => {
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}_${suffix++}`;
    usedIds.add(id);
    return id;
  };

  const components = new StringUnionFind();
  const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const edge of edgesById.values()) {
    components.union(edge.fromNodeId, edge.toNodeId);
    degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
    degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
  }
  const looseEnds = nodes.filter((n) => (degree.get(n.id) ?? 0) === 1);
  const tree = new SpatialIndex(Array.from(edgesById.values()).map(edgeItem));

  interface Candidate {
    nodeId: string;
    edgeId: string;
    segmentIndex: number;
    t: number;
    at: Point;
    distance: number;
  }
  const candidates: Candidate[] = [];
  for (const node of looseEnds) {
    let best: Candidate | null = null;
    for (const item of tree.search({ minX: node.x - maxGapDistance, minY: node.y - maxGapDistance, maxX: node.x + maxGapDistance, maxY: node.y + maxGapDistance })) {
      const edge = edgesById.get(item.edgeId);
      if (!edge) continue;
      if (components.find(edge.fromNodeId) === components.find(node.id)) continue;
      const projection = projectPointOnPolyline(node, edge.pathPoints);
      if (!projection || projection.distance > maxGapDistance) continue;
      if (!best || projection.distance < best.distance) {
        best = { nodeId: node.id, edgeId: edge.id, segmentIndex: projection.segmentIndex, t: projection.t, at: { x: projection.x, y: projection.y }, distance: projection.distance };
      }
    }
    if (best) candidates.push(best);
  }
  // Shortest gaps first: each join is the minimum one available.
  candidates.sort((a, b) => a.distance - b.distance || a.nodeId.localeCompare(b.nodeId));

  let bridgeCount = 0;
  for (const candidate of candidates) {
    const edge = edgesById.get(candidate.edgeId);
    const node = nodeById.get(candidate.nodeId);
    if (!edge || !node) continue; // its target was split by an earlier join this round
    if (components.find(edge.fromNodeId) === components.find(node.id)) continue;
    const from = nodeById.get(edge.fromNodeId);
    const to = nodeById.get(edge.toNodeId);
    let targetId: string;
    if (from && distance(candidate.at, from) <= snapTolerance) targetId = from.id;
    else if (to && distance(candidate.at, to) <= snapTolerance) targetId = to.id;
    else {
      targetId = uniqueId(`gap_${candidate.nodeId}`);
      const split = splitEdgeAt(edge, candidate.segmentIndex, candidate.t, targetId, uniqueId);
      const created = { id: targetId, x: split.at.x, y: split.at.y };
      nodes.push(created);
      nodeById.set(targetId, created);
      components.union(targetId, edge.fromNodeId);
      edgesById.delete(edge.id);
      edgesById.set(split.edges[0].id, split.edges[0]);
      edgesById.set(split.edges[1].id, split.edges[1]);
    }
    const target = nodeById.get(targetId)!;
    const pathPoints = [
      { x: node.x, y: node.y },
      { x: target.x, y: target.y }
    ];
    const bridgeId = uniqueId(`bridge_${node.id}_${targetId}`);
    edgesById.set(bridgeId, { id: bridgeId, fromNodeId: node.id, toNodeId: targetId, pathPoints, length: polylineLength(pathPoints), kind: 'bridge' });
    components.union(node.id, targetId);
    bridgeCount += 1;
  }
  return { graph: { nodes, edges: Array.from(edgesById.values()) }, bridgeCount };
};
