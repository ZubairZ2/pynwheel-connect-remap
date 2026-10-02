import { distance, pairKey } from './geometry';
import { NO_OBSTACLES, type ObstacleIndex } from './obstacles';
import { SpatialIndex } from './spatialIndex';
import type { AutoConnectSummary, WayfindingEdge, WayfindingGraph, WayfindingNode } from './types';

/**
 * "Auto-Connect Paths" — the POC's `graph/autoConnect.ts`. Each node is
 * offered its `k` nearest neighbours within `maxDistance`; a candidate is
 * drawn only when it does not cut an obstacle, does not already exist, and —
 * the test that makes this safe on a graph that is already connected — the
 * network cannot already get between its two ends within
 * `redundancyRatio ×` the straight distance (one bounded Dijkstra per node).
 * Afterwards any node still touching nothing is joined to its nearest
 * neighbour that is not blocked, whatever the distance. New edges are
 * straight, `knn`, weighted by their length. Running it twice adds nothing.
 */

export interface AutoConnectOptions {
  k?: number;
  maxDistance?: number;
  obstacles?: ObstacleIndex;
  redundancyRatio?: number;
  skipRedundant?: boolean;
}

export const DEFAULT_K = 3;
export const DEFAULT_REDUNDANCY_RATIO = 3;

/** 8% of the diagonal (floor 60). */
export const computeAutoConnectDistance = (bboxDiagonal: number): number => Math.max(60, bboxDiagonal * 0.08);

export interface AutoConnectResult extends AutoConnectSummary {
  graph: WayfindingGraph;
  /** The edges this pass added. */
  added: WayfindingEdge[];
}

interface NodeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  node: WayfindingNode;
}

export const autoConnectNodes = (graph: WayfindingGraph, options: AutoConnectOptions = {}): AutoConnectResult => {
  const k = options.k ?? DEFAULT_K;
  const maxDistance = options.maxDistance ?? Infinity;
  const obstacles = options.obstacles ?? NO_OBSTACLES;
  const redundancyRatio = options.redundancyRatio ?? DEFAULT_REDUNDANCY_RATIO;
  const skipRedundant = options.skipRedundant ?? true;
  const nodes = graph.nodes;
  if (nodes.length < 2) {
    return { graph, added: [], addedEdgeCount: 0, rejectedByObstacle: 0, rejectedAsRedundant: 0, isolatedNodeIds: nodes.length === 1 && !graph.edges.length ? [nodes[0].id] : [] };
  }

  const tree = new SpatialIndex<NodeItem>(nodes.map((node) => ({ minX: node.x, minY: node.y, maxX: node.x, maxY: node.y, node })));
  const adjacency = buildWeightedAdjacency(graph);
  const existingPairs = new Set(graph.edges.map((e) => pairKey(e.fromNodeId, e.toNodeId)));
  const usedEdgeIds = new Set(graph.edges.map((e) => e.id));
  const accepted: WayfindingEdge[] = [];
  const acceptedPairs = new Set<string>();
  let rejectedByObstacle = 0;
  let rejectedAsRedundant = 0;

  for (const node of nodes) {
    const neighbours = nearestNeighbours(tree, node, k, maxDistance);
    if (!neighbours.length) continue;
    const cutoff = redundancyRatio * neighbours[neighbours.length - 1].distance;
    const reachable = skipRedundant ? boundedDijkstra(adjacency, node.id, cutoff) : null;
    for (const { node: other, distance: direct } of neighbours) {
      const key = pairKey(node.id, other.id);
      if (existingPairs.has(key) || acceptedPairs.has(key)) continue;
      if (obstacles.blocks(node, other)) {
        rejectedByObstacle += 1;
        continue;
      }
      if (reachable) {
        const route = reachable.get(other.id);
        if (route !== undefined && route <= redundancyRatio * direct) {
          rejectedAsRedundant += 1;
          continue;
        }
      }
      acceptedPairs.add(key);
      accepted.push(makeEdge(node, other, direct, usedEdgeIds));
    }
  }

  // Nothing is left stranded: a node touching no edge gets its nearest unblocked neighbour.
  const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const edge of [...graph.edges, ...accepted]) {
    degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
    degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
  }
  for (const node of nodes) {
    if ((degree.get(node.id) ?? 0) > 0) continue;
    const rescue = nearestUnblocked(nodes, node, obstacles);
    if (!rescue) continue;
    const key = pairKey(node.id, rescue.node.id);
    if (existingPairs.has(key) || acceptedPairs.has(key)) continue;
    acceptedPairs.add(key);
    accepted.push(makeEdge(node, rescue.node, rescue.distance, usedEdgeIds));
    degree.set(node.id, 1);
    degree.set(rescue.node.id, (degree.get(rescue.node.id) ?? 0) + 1);
  }

  return {
    graph: { nodes, edges: [...graph.edges, ...accepted] },
    added: accepted,
    addedEdgeCount: accepted.length,
    rejectedByObstacle,
    rejectedAsRedundant,
    isolatedNodeIds: nodes.filter((n) => (degree.get(n.id) ?? 0) === 0).map((n) => n.id)
  };
};

/**
 * k-NN for one new node (a click on empty plan, a bend's drop point), so it
 * routes like every other node. As the POC does, the whole pass runs with
 * that node first and only the edges touching it are kept — O(graph) per
 * new node, which the POC lists as a known limit.
 */
export const connectNodeToNearest = (graph: WayfindingGraph, nodeId: string, options: AutoConnectOptions = {}): AutoConnectResult => {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return { graph, added: [], addedEdgeCount: 0, rejectedByObstacle: 0, rejectedAsRedundant: 0, isolatedNodeIds: [] };
  const scoped = autoConnectNodes({ nodes: [node, ...graph.nodes.filter((n) => n.id !== nodeId)], edges: graph.edges }, options);
  const added = scoped.added.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
  const touched = added.length > 0 || graph.edges.some((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
  return {
    graph: { nodes: graph.nodes, edges: [...graph.edges, ...added] },
    added,
    addedEdgeCount: added.length,
    rejectedByObstacle: scoped.rejectedByObstacle,
    rejectedAsRedundant: scoped.rejectedAsRedundant,
    isolatedNodeIds: touched ? [] : [nodeId]
  };
};

export const findIsolatedNodeIds = (graph: WayfindingGraph): string[] => {
  const touched = new Set<string>();
  for (const edge of graph.edges) {
    touched.add(edge.fromNodeId);
    touched.add(edge.toNodeId);
  }
  return graph.nodes.filter((n) => !touched.has(n.id)).map((n) => n.id);
};

const makeEdge = (from: WayfindingNode, to: WayfindingNode, length: number, usedIds: Set<string>): WayfindingEdge => {
  let id = `knn_${from.id}_${to.id}`;
  let suffix = 2;
  while (usedIds.has(id)) id = `knn_${from.id}_${to.id}_${suffix++}`;
  usedIds.add(id);
  return {
    id,
    fromNodeId: from.id,
    toNodeId: to.id,
    pathPoints: [
      { x: from.x, y: from.y },
      { x: to.x, y: to.y }
    ],
    // Real distance, not hop count.
    length,
    kind: 'knn'
  };
};

interface Neighbour {
  node: WayfindingNode;
  distance: number;
}

const nearestNeighbours = (tree: SpatialIndex<NodeItem>, origin: WayfindingNode, k: number, maxDistance: number): Neighbour[] => {
  const box = Number.isFinite(maxDistance)
    ? { minX: origin.x - maxDistance, minY: origin.y - maxDistance, maxX: origin.x + maxDistance, maxY: origin.y + maxDistance }
    : { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity };
  return tree
    .search(box)
    .filter((item) => item.node.id !== origin.id)
    .map((item) => ({ node: item.node, distance: distance(origin, item.node) }))
    .filter((n) => n.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance || a.node.id.localeCompare(b.node.id))
    .slice(0, k);
};

const nearestUnblocked = (nodes: WayfindingNode[], origin: WayfindingNode, obstacles: ObstacleIndex): Neighbour | null => {
  const ordered = nodes
    .filter((n) => n.id !== origin.id)
    .map((node) => ({ node, distance: distance(origin, node) }))
    .sort((a, b) => a.distance - b.distance || a.node.id.localeCompare(b.node.id));
  for (const candidate of ordered) if (!obstacles.blocks(origin, candidate.node)) return candidate;
  return null;
};

const buildWeightedAdjacency = (graph: WayfindingGraph): Map<string, { to: string; w: number }[]> => {
  const adjacency = new Map<string, { to: string; w: number }[]>(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.fromNodeId)?.push({ to: edge.toNodeId, w: edge.length });
    adjacency.get(edge.toNodeId)?.push({ to: edge.fromNodeId, w: edge.length });
  }
  return adjacency;
};

/** Dijkstra that gives up past `cutoff`, so each node's search stays local. */
const boundedDijkstra = (adjacency: Map<string, { to: string; w: number }[]>, startId: string, cutoff: number): Map<string, number> => {
  const best = new Map<string, number>([[startId, 0]]);
  const frontier: { id: string; d: number }[] = [{ id: startId, d: 0 }];
  while (frontier.length) {
    const current = frontier.shift()!;
    if (current.d > (best.get(current.id) ?? Infinity)) continue;
    for (const neighbour of adjacency.get(current.id) ?? []) {
      const next = current.d + neighbour.w;
      if (next > cutoff) continue;
      if (next >= (best.get(neighbour.to) ?? Infinity)) continue;
      best.set(neighbour.to, next);
      const at = frontier.findIndex((entry) => entry.d > next);
      const item = { id: neighbour.to, d: next };
      if (at === -1) frontier.push(item);
      else frontier.splice(at, 0, item);
    }
  }
  return best;
};
