import { autoConnectNodes, computeAutoConnectDistance } from './autoConnect';
import { bridgeComponentGaps, computeGapBridgeDistance } from './bridgeGaps';
import { buildWayfindingGraph, computeSnapTolerance, DEFAULT_SIMPLIFY_EPSILON } from './buildGraph';
import type { HallwayNode } from './editing';
import { pairKey, polylineLength } from './geometry';
import { inferCorridors } from './inferCorridors';
import { buildObstacleIndex, NO_OBSTACLES } from './obstacles';
import { computeMaxSnapDistance, snapStopsToGraph } from './snapStops';
import { detectSvgStructure } from './svg/detectLayers';
import { DEFAULT_FLATTEN_STEP } from './svg/pathData';
import { flattenShapes, rootShapes } from './svg/shapes';
import type { SvgEl } from './svg/svgTree';
import type { AutoConnectSummary, BBox, HallwayWarning, Point, StopCandidate, StopConnection, WayfindingEdge, WayfindingGraph } from './types';

/**
 * Detect Hallways for one floor SVG — the POC's `extractWayfinding` (Phases
 * 1–4) with corridor inference where the POC would report "no walkable
 * layer":
 *
 *   SVG tree ─► detectSvgStructure ─┬─ walkway layer ─► flatten ─► buildWayfindingGraph ─► bridgeComponentGaps
 *                                   └─ none ─► footprints − rooms ─► inferCorridors ─► buildWayfindingGraph ─► short bridges
 *            ─► snapStopsToGraph (the floor's plotted units, amenities and stops; may split edges)
 *            ─► autoConnectNodes (k-NN, obstacle + redundancy filters)
 *
 * Coordinates are the SVG's root user units. Traced nodes are confirmed;
 * inferred ones are proposals (`pending`, with a confidence) until touched.
 */

export type DetectFailure = 'no-hallway-layer' | 'no-corridor' | 'no-edges';

export interface DetectedHallways {
  ok: boolean;
  failure: DetectFailure | null;
  source: 'vector' | 'inferred' | null;
  nodes: HallwayNode[];
  edges: WayfindingEdge[];
  connections: StopConnection[];
  /** Outlines a synthesised link must not cross (for Auto-Connect and new points later). */
  obstacles: Point[][];
  bboxDiagonal: number;
  viewBox: BBox;
  bridgeCount: number;
  autoConnect: AutoConnectSummary | null;
  warnings: HallwayWarning[];
  /** Layer ids the result came from, for the review card. */
  layers: string[];
}

export interface DetectOptions {
  /** Run Auto-Connect over the result (the brief's "generate / auto-connect"). */
  autoConnect?: boolean;
  flattenStep?: number;
}

const diagonalOf = (points: Iterable<Point>, fallback: BBox): number => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return Math.hypot(fallback.maxX - fallback.minX, fallback.maxY - fallback.minY) || 1000;
  return Math.hypot(maxX - minX, maxY - minY) || 1000;
};

function* allPoints(lines: Point[][]): Generator<Point> {
  for (const line of lines) yield* line;
}

/** Removes connected pieces whose paths add up to less than `minLength`. */
export const dropShortComponents = (graph: WayfindingGraph, minLength: number): WayfindingGraph => {
  const parent = new Map<string, string>(graph.nodes.map((n) => [n.id, n.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  graph.edges.forEach((edge) => parent.set(find(edge.fromNodeId), find(edge.toNodeId)));
  const length = new Map<string, number>();
  graph.edges.forEach((edge) => {
    const root = find(edge.fromNodeId);
    length.set(root, (length.get(root) ?? 0) + edge.length);
  });
  const keep = (id: string) => (length.get(find(id)) ?? 0) >= minLength;
  return { nodes: graph.nodes.filter((n) => keep(n.id)), edges: graph.edges.filter((e) => keep(e.fromNodeId)) };
};

/**
 * Our graph keys one edge per pair of points (`a|b`), while the POC keeps a
 * second edge between the same pair when it is a genuinely different route
 * (both sides of a courtyard). Such an edge is split at its middle vertex —
 * same geometry, one more node.
 */
export const splitParallelEdges = (graph: WayfindingGraph): WayfindingGraph => {
  const seen = new Set<string>();
  const nodes = graph.nodes.slice();
  const edges: WayfindingEdge[] = [];
  const ids = new Set(nodes.map((n) => n.id));
  let counter = 0;
  for (const edge of graph.edges) {
    const key = pairKey(edge.fromNodeId, edge.toNodeId);
    if (!seen.has(key)) {
      seen.add(key);
      edges.push(edge);
      continue;
    }
    const points = edge.pathPoints;
    if (points.length < 3) {
      // A straight duplicate is the same route: drop it.
      continue;
    }
    const mid = Math.floor(points.length / 2);
    let id = `mid_${counter++}`;
    while (ids.has(id)) id = `mid_${counter++}`;
    ids.add(id);
    nodes.push({ id, x: points[mid].x, y: points[mid].y });
    const before = points.slice(0, mid + 1);
    const after = points.slice(mid);
    edges.push({ ...edge, id: `${edge.id}_p1`, toNodeId: id, pathPoints: before, length: polylineLength(before) });
    edges.push({ ...edge, id: `${edge.id}_p2`, fromNodeId: id, pathPoints: after, length: polylineLength(after) });
    seen.add(pairKey(edge.fromNodeId, id));
    seen.add(pairKey(id, edge.toNodeId));
  }
  return { nodes, edges };
};

/**
 * What a synthesised link must not cross on a floor SVG: its obstacle layers
 * when it has a walkway layer (the POC's rule), else the rooms and footprints
 * corridor inference reads.
 */
export const obstaclesOf = (root: SvgEl, flattenStep = DEFAULT_FLATTEN_STEP): Point[][] => {
  const structure = detectSvgStructure(root);
  if (structure.found) return flattenShapes(structure.obstacleShapes, flattenStep);
  return [...rootShapes(structure.roomShapes, flattenStep), ...rootShapes(structure.footprintShapes, flattenStep)].flatMap((shape) => shape.rings);
};

export const detectHallways = (root: SvgEl, stops: StopCandidate[], options: DetectOptions = {}): DetectedHallways => {
  const flattenStep = options.flattenStep ?? DEFAULT_FLATTEN_STEP;
  const structure = detectSvgStructure(root);
  const warnings = [...structure.warnings];
  const empty = (failure: DetectFailure, layers: string[] = []): DetectedHallways => ({
    ok: false,
    failure,
    source: null,
    nodes: [],
    edges: [],
    connections: [],
    obstacles: [],
    bboxDiagonal: diagonalOf([], structure.viewBox),
    viewBox: structure.viewBox,
    bridgeCount: 0,
    autoConnect: null,
    warnings,
    layers
  });

  let graph: WayfindingGraph;
  let source: 'vector' | 'inferred';
  let obstacles: Point[][];
  let snapTolerance: number;
  let diagonal: number;
  let bridgeCount = 0;
  let confidenceOf: (nodeId: string) => number | null = () => null;
  let layers: string[];

  if (structure.found) {
    source = 'vector';
    layers = structure.walkwayLayerIds;
    const subpaths = flattenShapes(structure.walkwayShapes, flattenStep);
    diagonal = diagonalOf([...allPoints(subpaths), ...stops.map((stop) => stop.anchor)], structure.viewBox);
    snapTolerance = computeSnapTolerance(diagonal);
    const built = buildWayfindingGraph(subpaths, { snapTolerance, simplifyEpsilon: DEFAULT_SIMPLIFY_EPSILON });
    const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: computeGapBridgeDistance(diagonal), snapTolerance });
    graph = bridged.graph;
    bridgeCount = bridged.bridgeCount;
    obstacles = flattenShapes(structure.obstacleShapes, flattenStep);
  } else {
    const footprints = rootShapes(structure.footprintShapes, flattenStep);
    const rooms = rootShapes(structure.roomShapes, flattenStep);
    const inferred = inferCorridors(footprints, rooms);
    if (inferred.reason === 'no-footprint') return empty('no-hallway-layer');
    layers = ['Footprints', 'Units'];
    if (!inferred.runs.length) return empty('no-corridor', layers);
    source = 'inferred';
    const subpaths = inferred.runs.map((run) => run.points);
    diagonal = diagonalOf([...allPoints(footprints.flatMap((shape) => shape.rings)), ...stops.map((stop) => stop.anchor)], structure.viewBox);
    // Runs meet exactly at their junction centres; the tolerance only has to absorb rounding.
    snapTolerance = Math.max(computeSnapTolerance(diagonal), inferred.cell * 0.75);
    const built = buildWayfindingGraph(subpaths, { snapTolerance, simplifyEpsilon: Math.max(DEFAULT_SIMPLIFY_EPSILON, inferred.cell * 1.1), detectCrossings: false, kind: 'inferred' });
    // Only small gaps (a door's constriction): a wide bridge would join separate buildings across the outside.
    const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: Math.max(inferred.cell * 6, diagonal * 0.01), snapTolerance });
    // Recesses between rooms and the outer wall (balcony notches) leave short islands; a corridor is longer than that.
    graph = dropShortComponents(bridged.graph, Math.max(inferred.cell * 10, diagonal * 0.03));
    bridgeCount = bridged.bridgeCount;
    obstacles = [...rooms, ...footprints].flatMap((shape) => shape.rings);
    // A node's confidence: the mean of the runs it ends.
    const byEnd = new Map<string, number[]>();
    const runAt = (p: Point) => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
    inferred.runs.forEach((run) => {
      for (const p of [run.points[0], run.points[run.points.length - 1]]) byEnd.set(runAt(p), [...(byEnd.get(runAt(p)) ?? []), run.confidence]);
    });
    const median = inferred.runs.map((run) => run.confidence).sort((a, b) => a - b)[Math.floor(inferred.runs.length / 2)] ?? 0.5;
    confidenceOf = (nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return median;
      const near = byEnd.get(runAt(node));
      return near?.length ? Math.round((near.reduce((sum, v) => sum + v, 0) / near.length) * 100) / 100 : median;
    };
  }

  if (!graph.edges.length) return empty('no-edges', layers);

  const snapped = snapStopsToGraph(stops, graph, { maxSnapDistance: computeMaxSnapDistance(diagonal), snapTolerance });
  graph = snapped.graph;

  const obstacleIndex = obstacles.length ? buildObstacleIndex(obstacles) : NO_OBSTACLES;
  let autoConnect: AutoConnectSummary | null = null;
  if (options.autoConnect !== false) {
    const connected = autoConnectNodes(graph, { maxDistance: computeAutoConnectDistance(diagonal), obstacles: obstacleIndex });
    graph = connected.graph;
    autoConnect = {
      addedEdgeCount: connected.addedEdgeCount,
      rejectedByObstacle: connected.rejectedByObstacle,
      rejectedAsRedundant: connected.rejectedAsRedundant,
      isolatedNodeIds: connected.isolatedNodeIds
    };
  }
  graph = splitParallelEdges(graph);

  const stopNodes = new Set(snapped.connections.map((c) => c.connectedNodeId).filter(Boolean));
  const nodes: HallwayNode[] = graph.nodes.map((node) => ({
    ...node,
    source,
    review: source === 'vector' ? 'confirmed' : 'pending',
    confidence: source === 'inferred' ? (stopNodes.has(node.id) ? null : confidenceOf(node.id)) : null
  }));
  // A stop's own joining point is where its polygon meets the corridor: not a guess about the corridor.
  nodes.forEach((node) => {
    if (source === 'inferred' && stopNodes.has(node.id)) {
      const neighbours = graph.edges.filter((e) => e.fromNodeId === node.id || e.toNodeId === node.id).map((e) => (e.fromNodeId === node.id ? e.toNodeId : e.fromNodeId));
      const values = neighbours.map((id) => confidenceOf(id)).filter((v): v is number => v != null);
      node.confidence = values.length ? Math.min(...values) : null;
    }
  });

  return {
    ok: true,
    failure: null,
    source,
    nodes,
    edges: graph.edges,
    connections: snapped.connections,
    obstacles,
    bboxDiagonal: diagonal,
    viewBox: structure.viewBox,
    bridgeCount,
    autoConnect,
    warnings,
    layers
  };
};
