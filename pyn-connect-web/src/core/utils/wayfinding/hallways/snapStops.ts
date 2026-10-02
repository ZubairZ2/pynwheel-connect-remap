import { edgeItem, splitEdgeAt } from './bridgeGaps';
import { distance, projectPointOnPolyline } from './geometry';
import { SpatialIndex } from './spatialIndex';
import type { Point, StopCandidate, StopConnection, WayfindingEdge, WayfindingGraph, WayfindingNode } from './types';

/**
 * Phase 4b of the POC (`stops/snapStops.ts`): each stop joins the network at
 * the nearest point *on an edge* within range — an existing node when the
 * projection lands on one, else a new node split into that edge, so a stop
 * mid-corridor gets no detour to whichever node happens to be nearest; then
 * an isolated node in range; else it stays unconnected. Never force-snapped
 * to a distant node, never dropped.
 */

/** 5% of the diagonal (floor 50): a flat 50 stranded six real stops on the POC's Floor_3. */
export const computeMaxSnapDistance = (bboxDiagonal: number): number => Math.max(50, bboxDiagonal * 0.05);

export interface SnapStopsOptions {
  maxSnapDistance: number;
  snapTolerance: number;
}

export const snapStopsToGraph = (candidates: StopCandidate[], graph: WayfindingGraph, { maxSnapDistance, snapTolerance }: SnapStopsOptions): { graph: WayfindingGraph; connections: StopConnection[] } => {
  const nodes: WayfindingNode[] = graph.nodes.map((n) => ({ ...n }));
  const edgesById = new Map<string, WayfindingEdge>(graph.edges.map((e) => [e.id, { ...e }]));
  const usedIds = new Set<string>([...nodes.map((n) => n.id), ...edgesById.keys()]);
  const uniqueId = (base: string): string => {
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}_${suffix++}`;
    usedIds.add(id);
    return id;
  };
  let tree = new SpatialIndex(Array.from(edgesById.values()).map(edgeItem));
  const connections: StopConnection[] = [];

  for (const candidate of candidates) {
    const anchor = candidate.anchor;
    const hit = nearestEdgeProjection(anchor, tree, edgesById, maxSnapDistance);
    if (!hit) {
      const node = nearestNode(anchor, nodes, maxSnapDistance);
      connections.push(
        node
          ? { ...candidate, connectedNodeId: node.node.id, snapDistance: node.distance, connectionMethod: 'existing_node' }
          : { ...candidate, connectedNodeId: null, snapDistance: null, connectionMethod: 'unconnected' }
      );
      continue;
    }
    const edge = edgesById.get(hit.edgeId)!;
    const from = nodes.find((n) => n.id === edge.fromNodeId);
    const to = nodes.find((n) => n.id === edge.toNodeId);
    const projection = { x: hit.x, y: hit.y };
    if (from && distance(projection, from) <= snapTolerance) {
      connections.push({ ...candidate, connectedNodeId: from.id, snapDistance: distance(anchor, from), connectionMethod: 'existing_node' });
      continue;
    }
    if (to && distance(projection, to) <= snapTolerance) {
      connections.push({ ...candidate, connectedNodeId: to.id, snapDistance: distance(anchor, to), connectionMethod: 'existing_node' });
      continue;
    }
    const newNodeId = uniqueId(`stop_${candidate.groupId.replace(/[^A-Za-z0-9_-]+/g, '_')}`);
    const split = splitEdgeAt(edge, hit.segmentIndex, hit.t, newNodeId, uniqueId);
    nodes.push({ id: newNodeId, x: split.at.x, y: split.at.y });
    edgesById.delete(edge.id);
    edgesById.set(split.edges[0].id, split.edges[0]);
    edgesById.set(split.edges[1].id, split.edges[1]);
    tree = new SpatialIndex(Array.from(edgesById.values()).map(edgeItem));
    connections.push({ ...candidate, connectedNodeId: newNodeId, snapDistance: hit.distance, connectionMethod: 'edge_split' });
  }
  return { graph: { nodes, edges: Array.from(edgesById.values()) }, connections };
};

interface EdgeHit extends Point {
  edgeId: string;
  segmentIndex: number;
  t: number;
  distance: number;
}

const nearestEdgeProjection = (anchor: Point, tree: SpatialIndex<ReturnType<typeof edgeItem>>, edgesById: Map<string, WayfindingEdge>, maxDistance: number): EdgeHit | null => {
  let best: EdgeHit | null = null;
  for (const item of tree.search({ minX: anchor.x - maxDistance, minY: anchor.y - maxDistance, maxX: anchor.x + maxDistance, maxY: anchor.y + maxDistance })) {
    const edge = edgesById.get(item.edgeId);
    if (!edge) continue;
    const projection = projectPointOnPolyline(anchor, edge.pathPoints);
    if (!projection || projection.distance > maxDistance) continue;
    if (!best || projection.distance < best.distance) best = { edgeId: edge.id, segmentIndex: projection.segmentIndex, t: projection.t, x: projection.x, y: projection.y, distance: projection.distance };
  }
  return best;
};

const nearestNode = (anchor: Point, nodes: WayfindingNode[], maxDistance: number): { node: WayfindingNode; distance: number } | null => {
  let best: { node: WayfindingNode; distance: number } | null = null;
  for (const node of nodes) {
    const d = distance(anchor, node);
    if (d > maxDistance) continue;
    if (!best || d < best.distance) best = { node, distance: d };
  }
  return best;
};
