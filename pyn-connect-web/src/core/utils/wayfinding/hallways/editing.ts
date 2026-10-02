import { distance, pairKey, polylineLength, projectPointOnPolyline, splitPolyline } from './geometry';
import type { EdgeKind, ExtractionSource, Point, ReviewStatus, WayfindingEdge, WayfindingNode } from './types';

/**
 * The POC's editing operations (`lib/wayfinding/editing.ts`), pure:
 * `(graph, …) → graph`. A node carries where it came from and whether it is
 * reviewed; an edge its polyline (both ends included, always equal to its
 * nodes' positions) and kind.
 */

export interface HallwayNode extends WayfindingNode {
  source: ExtractionSource;
  review: ReviewStatus;
  /** Inferred nodes only. */
  confidence: number | null;
}

export interface GraphState {
  nodes: HallwayNode[];
  edges: WayfindingEdge[];
}

/** Touching a node confirms it: it stops being a proposal. */
const confirmed = (node: HallwayNode): HallwayNode => ({ ...node, review: 'confirmed' });

const reendpoint = (edge: WayfindingEdge, nodeId: string, at: Point): WayfindingEdge => {
  if (edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId) return edge;
  const pathPoints = edge.pathPoints.slice();
  if (edge.fromNodeId === nodeId) pathPoints[0] = { ...at };
  if (edge.toNodeId === nodeId) pathPoints[pathPoints.length - 1] = { ...at };
  return { ...edge, pathPoints, length: polylineLength(pathPoints) };
};

const uniqueNodeId = (nodes: { id: string }[], base: string): string => {
  const taken = new Set(nodes.map((n) => n.id));
  let i = 1;
  let id = `${base}_${i}`;
  while (taken.has(id)) id = `${base}_${++i}`;
  return id;
};

const uniqueEdgeId = (edges: { id: string }[], base: string): string => {
  const taken = new Set(edges.map((e) => e.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
};

const newNode = (id: string, at: Point): HallwayNode => ({ id, x: at.x, y: at.y, source: 'manual', review: 'confirmed', confidence: null });

/** Drag a node; every edge touching it follows. */
export const moveNode = (state: GraphState, nodeId: string, to: Point): GraphState => ({
  nodes: state.nodes.map((node) => (node.id === nodeId ? { ...confirmed(node), x: to.x, y: to.y } : node)),
  edges: state.edges.map((edge) => reendpoint(edge, nodeId, to))
});

/**
 * Delete a node and re-link its former neighbours **as a chain** (n0–n1,
 * n1–n2, …), not a clique: exactly the connectivity it provided, one edge
 * per neighbour. Each new edge is the two old polylines joined end to end
 * and inherits the first leg's kind.
 */
export const deleteNode = (state: GraphState, nodeId: string): GraphState => {
  const touching = state.edges.filter((e) => e.fromNodeId === nodeId || e.toNodeId === nodeId);
  const remaining = state.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId);
  // Points ordered from the neighbour towards the deleted node.
  const legs = new Map<string, Point[]>();
  const legKind = new Map<string, EdgeKind>();
  for (const edge of touching) {
    const neighbour = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
    if (neighbour === nodeId || legs.has(neighbour)) continue;
    legs.set(neighbour, edge.toNodeId === nodeId ? edge.pathPoints.slice() : edge.pathPoints.slice().reverse());
    legKind.set(neighbour, edge.kind ?? 'traced');
  }
  const neighbourIds = Array.from(legs.keys());
  const rebuilt = [...remaining];
  const existingPairs = new Set(remaining.map((e) => pairKey(e.fromNodeId, e.toNodeId)));
  for (let i = 0; i < neighbourIds.length - 1; i += 1) {
    const a = neighbourIds[i];
    const b = neighbourIds[i + 1];
    if (existingPairs.has(pairKey(a, b))) continue;
    const pathPoints = [...legs.get(a)!, ...legs.get(b)!.slice().reverse().slice(1)];
    existingPairs.add(pairKey(a, b));
    rebuilt.push({ id: uniqueEdgeId(rebuilt, `rejoin_${a}_${b}`), fromNodeId: a, toNodeId: b, pathPoints, length: polylineLength(pathPoints), kind: legKind.get(a) ?? 'traced' });
  }
  return { nodes: state.nodes.filter((n) => n.id !== nodeId), edges: rebuilt };
};

/** A node at a clicked point, joined to its nearest node by a straight `manual` edge (the caller then auto-connects it). */
export const addNode = (state: GraphState, at: Point): { state: GraphState; nodeId: string } => {
  const nodeId = uniqueNodeId(state.nodes, 'manual');
  let nearest: HallwayNode | null = null;
  let nearestDistance = Infinity;
  for (const other of state.nodes) {
    const d = distance(at, other);
    if (d < nearestDistance) {
      nearest = other;
      nearestDistance = d;
    }
  }
  const edges = state.edges.slice();
  if (nearest) {
    const pathPoints = [
      { x: at.x, y: at.y },
      { x: nearest.x, y: nearest.y }
    ];
    edges.push({ id: uniqueEdgeId(edges, `manual_${nodeId}_${nearest.id}`), fromNodeId: nodeId, toNodeId: nearest.id, pathPoints, length: polylineLength(pathPoints), kind: 'manual' });
  }
  return { state: { nodes: [...state.nodes, newNode(nodeId, at)], edges }, nodeId };
};

/** Delete one path. Nothing is rejoined: the user asked for that link to go. */
export const deleteEdge = (state: GraphState, edgeId: string): GraphState => ({ nodes: state.nodes, edges: state.edges.filter((e) => e.id !== edgeId) });

/**
 * Drag-to-bend: the path is split where it was grabbed, a new `bend` node
 * goes where it was released, and the split point of each half moves there;
 * the rest of each half keeps its drawn geometry and both keep the kind.
 */
export const rerouteEdge = (state: GraphState, edgeId: string, grab: Point, drop: Point): (GraphState & { nodeId: string }) | null => {
  const edge = state.edges.find((e) => e.id === edgeId);
  if (!edge || edge.pathPoints.length < 2) return null;
  const projection = projectPointOnPolyline(grab, edge.pathPoints);
  if (!projection) return null;
  const nodeId = uniqueNodeId(state.nodes, 'bend');
  const { before, after } = splitPolyline(edge.pathPoints, projection.segmentIndex, projection.t);
  const beforePoints = [...before.slice(0, -1), { x: drop.x, y: drop.y }];
  const afterPoints = [{ x: drop.x, y: drop.y }, ...after.slice(1)];
  const remaining = state.edges.filter((e) => e.id !== edgeId);
  const kind: EdgeKind = edge.kind ?? 'traced';
  return {
    nodes: [...state.nodes, newNode(nodeId, drop)],
    edges: [
      ...remaining,
      { ...edge, id: uniqueEdgeId(remaining, `${edge.id}_a`), fromNodeId: edge.fromNodeId, toNodeId: nodeId, pathPoints: beforePoints, length: polylineLength(beforePoints), kind },
      { ...edge, id: uniqueEdgeId(remaining, `${edge.id}_b`), fromNodeId: nodeId, toNodeId: edge.toNodeId, pathPoints: afterPoints, length: polylineLength(afterPoints), kind }
    ],
    nodeId
  };
};

/** Bulk-accept proposals, but only above a confidence: a blanket "confirm all" would defeat the review it exists for. */
export const confirmNodesAboveConfidence = (state: GraphState, threshold: number): GraphState => ({
  nodes: state.nodes.map((n) => (n.review === 'pending' && n.confidence !== null && n.confidence > threshold ? { ...n, review: 'confirmed' } : n)),
  edges: state.edges
});

export const pendingReviewNodeIds = (nodes: HallwayNode[]): string[] => nodes.filter((n) => n.review === 'pending').map((n) => n.id);
