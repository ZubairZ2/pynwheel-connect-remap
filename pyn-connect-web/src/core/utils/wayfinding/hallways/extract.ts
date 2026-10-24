import { autoConnectNodes, computeAutoConnectDistance } from './autoConnect';
import { bridgeComponentGaps, computeGapBridgeDistance } from './bridgeGaps';
import { buildWayfindingGraph, computeSnapTolerance, DEFAULT_SIMPLIFY_EPSILON } from './buildGraph';
import type { HallwayNode } from './editing';
import { pairKey, polylineLength } from './geometry';
import { inferCorridors } from './inferCorridors';
import { inferStreets, type StreetsMode, type StreetsResult } from './inferStreets';
import { buildObstacleIndex, NO_OBSTACLES, type ObstacleIndex } from './obstacles';
import { computeMaxSnapDistance, snapStopsToGraph } from './snapStops';
import { detectSvgStructure } from './svg/detectLayers';
import { DEFAULT_FLATTEN_STEP } from './svg/pathData';
import { flattenShapes, rootShapes } from './svg/shapes';
import type { SvgEl } from './svg/svgTree';
import type { AutoConnectSummary, BBox, HallwayWarning, Point, RootShape, StopCandidate, StopConnection, SvgStructureReport, WayfindingEdge, WayfindingGraph } from './types';

/**
 * - `no-layers`         — nothing in the file is named and nothing is pavement-coloured: a flattened export with nothing to read;
 * - `no-hallway-layer`  — named layers, but no road, parking, walkway or deck among them, no pavement-coloured shape, and no footprints (or building outlines) to infer corridors in;
 * - `no-corridor`       — footprints and rooms, but no corridor between the rooms and no street outside;
 * - `no-edges`          — walkable geometry that gave no usable segment.
 */
export type DetectFailure = 'no-layers' | 'no-hallway-layer' | 'no-corridor' | 'no-edges';

/**
 * - `streets`           — the centrelines of the walkable area (roads, parking, sidewalks, decks);
 * - `streets+inferred`  — streets outside, with corridors inferred inside the building outlines;
 * - `vector`            — a drawn walkway layer traced as it is (no walkable area could be rasterised);
 * - `inferred`          — corridors inferred inside the footprints only;
 * - `both`              — a traced walkway layer joined with inferred corridors.
 */
export type DetectSource = 'streets' | 'streets+inferred' | 'vector' | 'inferred' | 'both';

export interface DetectedHallways {
  ok: boolean;
  failure: DetectFailure | null;
  source: DetectSource | null;
  nodes: HallwayNode[];
  edges: WayfindingEdge[];
  connections: StopConnection[];
  /** How many of the stops joined a path. */
  joined: number;
  /** Outlines a synthesised link must not cross (for Auto-Connect and new points later). */
  obstacles: Point[][];
  bboxDiagonal: number;
  viewBox: BBox;
  bridgeCount: number;
  /** Bridges that pass through a building to reach an enclosed piece (a courtyard through its lobby): proposals to review. */
  doorBridgeCount: number;
  autoConnect: AutoConnectSummary | null;
  warnings: HallwayWarning[];
  /** Layer ids the result came from, for the review card. */
  layers: string[];
  /** The walkways or footprints were read from the shared background map. */
  fromBackground: boolean;
  /** How many named layers the file (and background) had: what the `no-layers` diagnosis saw. */
  namedLayers: number;
  /** How the walkable area was recognised: named layers, fill colours (a flattened export), or both; null when no street pass ran. */
  streetsMode: StreetsMode | null;
  /** Connected pieces of the network. */
  components: number;
}

export interface DetectOptions {
  /** Run Auto-Connect over the result (the brief's "generate / auto-connect"). */
  autoConnect?: boolean;
  flattenStep?: number;
  /** The property's shared background map, whose walkways and outlines fill in what the floor file lacks (a Beans property). */
  background?: SvgEl | null;
  /**
   * The narrowest corridor half-width (root units) the indoor pass keeps. A
   * garden-style building's drawn margin between its units and its outline is
   * 2–4 units wide and is not a corridor; real corridors in these exports are
   * 10 units and wider. Default: 0.3% of the viewBox diagonal, at least 5.
   */
  indoorMinHalfWidth?: number;
  /** Skip the street pass (the engine as it was before October 25, 2026). */
  streets?: boolean;
  /** Cell size of the street raster, in root units. */
  streetCell?: number;
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

/** Union-find roots of the nodes that touch an edge: how many pieces the network is in. */
export const countComponents = (graph: WayfindingGraph): number => {
  const parent = new Map<string, string>(graph.nodes.map((n) => [n.id, n.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const touched = new Set<string>();
  graph.edges.forEach((edge) => {
    parent.set(find(edge.fromNodeId), find(edge.toNodeId));
    touched.add(edge.fromNodeId);
    touched.add(edge.toNodeId);
  });
  return new Set([...touched].map(find)).size;
};

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
 * when it has a walkway layer (the POC's rule), plus the rooms and footprints
 * corridor inference reads — the shared background's outlines included.
 */
export const obstaclesOf = (root: SvgEl, background: SvgEl | null = null, flattenStep = DEFAULT_FLATTEN_STEP): Point[][] => {
  const structure = detectSvgStructure(root, background);
  const outlines = flattenShapes(structure.obstacleShapes, flattenStep);
  if (structure.found && !structure.roomShapes.length) return outlines;
  return [...outlines, ...rootShapes(structure.roomShapes, flattenStep), ...rootShapes(structure.footprintShapes, flattenStep)].flatMap((shape) => ('rings' in shape ? shape.rings : [shape]));
};

/** A traced (confirmed) graph from the walkway shapes, bridged across the drawn gaps — the engine's reading of a drawn centreline, kept as the fallback. */
const traceWalkways = (structure: SvgStructureReport, stops: StopCandidate[], flattenStep: number) => {
  const subpaths = flattenShapes(structure.walkwayShapes, flattenStep);
  const diagonal = diagonalOf([...allPoints(subpaths), ...stops.map((stop) => stop.anchor)], structure.viewBox);
  const snapTolerance = computeSnapTolerance(diagonal);
  const built = buildWayfindingGraph(subpaths, { snapTolerance, simplifyEpsilon: DEFAULT_SIMPLIFY_EPSILON, idPrefix: 'n' });
  const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: computeGapBridgeDistance(diagonal), snapTolerance });
  return { graph: bridged.graph, bridgeCount: bridged.bridgeCount, diagonal, snapTolerance };
};

/** The street centrelines as a graph: the runs joined, small breaks bridged (never through a building), crumbs dropped. */
const streetGraph = (streets: StreetsResult, diagonal: number, obstacles: ObstacleIndex) => {
  const cell = streets.grid.cell;
  const snapTolerance = Math.max(computeSnapTolerance(diagonal), cell * 0.75);
  const built = buildWayfindingGraph(streets.runs, { snapTolerance, simplifyEpsilon: Math.max(DEFAULT_SIMPLIFY_EPSILON, cell * 1.5), detectCrossings: false, kind: 'traced', idPrefix: 's' });
  const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: Math.max(cell * 8, diagonal * 0.012), snapTolerance });
  let rejected = 0;
  const edges = bridged.graph.edges.filter((edge) => {
    if (edge.kind !== 'bridge') return true;
    const blocked = obstacles.blocks(edge.pathPoints[0], edge.pathPoints[edge.pathPoints.length - 1]);
    if (blocked) rejected += 1;
    return !blocked;
  });
  const graph = dropShortComponents({ nodes: bridged.graph.nodes, edges }, Math.max(cell * 20, diagonal * 0.025));
  return { graph, bridgeCount: bridged.bridgeCount - rejected, snapTolerance };
};

/** Corridors inferred inside the footprints, as pending proposals with a confidence per run. */
const inferInside = (footprints: RootShape[], rooms: RootShape[], structure: SvgStructureReport, stops: StopCandidate[], minHalfWidth: number) => {
  const inferred = inferCorridors(footprints, rooms, { minHalfWidth });
  if (inferred.reason === 'no-footprint' || !inferred.runs.length) return { inferred, graph: null, bridgeCount: 0, diagonal: 0, snapTolerance: 0, confidenceOf: (() => null) as (nodeId: string) => number | null };
  const subpaths = inferred.runs.map((run) => run.points);
  const diagonal = diagonalOf([...allPoints(footprints.flatMap((shape) => shape.rings)), ...stops.map((stop) => stop.anchor)], structure.viewBox);
  // Runs meet exactly at their junction centres; the tolerance only has to absorb rounding.
  const snapTolerance = Math.max(computeSnapTolerance(diagonal), inferred.cell * 0.75);
  const built = buildWayfindingGraph(subpaths, { snapTolerance, simplifyEpsilon: Math.max(DEFAULT_SIMPLIFY_EPSILON, inferred.cell * 1.1), detectCrossings: false, kind: 'inferred', idPrefix: 'i' });
  // Only small gaps (a door's constriction): a wide bridge would join separate buildings across the outside.
  const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: Math.max(inferred.cell * 6, diagonal * 0.01), snapTolerance });
  // Recesses between rooms and the outer wall (balcony notches) leave short islands; a corridor is longer than that.
  const graph = dropShortComponents(bridged.graph, Math.max(inferred.cell * 10, diagonal * 0.03));
  // A node's confidence: the mean of the runs it ends.
  const byEnd = new Map<string, number[]>();
  const runAt = (p: Point) => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
  inferred.runs.forEach((run) => {
    for (const p of [run.points[0], run.points[run.points.length - 1]]) byEnd.set(runAt(p), [...(byEnd.get(runAt(p)) ?? []), run.confidence]);
  });
  const median = inferred.runs.map((run) => run.confidence).sort((a, b) => a - b)[Math.floor(inferred.runs.length / 2)] ?? 0.5;
  const confidenceOf = (nodeId: string): number | null => {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return median;
    const near = byEnd.get(runAt(node));
    return near?.length ? Math.round((near.reduce((sum, v) => sum + v, 0) / near.length) * 100) / 100 : median;
  };
  return { inferred, graph: graph.edges.length ? graph : null, bridgeCount: bridged.bridgeCount, diagonal, snapTolerance, confidenceOf };
};

/** The confidence a colour-inferred street point carries: the pavement was recognised by its fill, not by a layer's name. */
const COLOUR_STREET_CONFIDENCE = 0.6;

/**
 * Detect Hallways for one floor SVG. Two passes, joined:
 *
 *   SVG tree (+ background) ─┬─ inferStreets: walkable area (roads, parking, sidewalks, decks) ─► medial axis ─► runs ─► graph ─┐
 *                            ├─ detectSvgStructure ─► footprints − rooms ─► inferCorridors (corridors wider than a wall) ─► graph ─┤─► union ─► bridge the doorways
 *                            └─ (no walkable area rasterised) walkway layer traced as drawn, as before                              ┘
 *            ─► snapStopsToGraph (the floor's plotted units, amenities and stops; may split edges)
 *            ─► autoConnectNodes (k-NN, obstacle + redundancy filters)
 *
 * Coordinates are the SVG's root user units. Street points found from named
 * layers are confirmed; those found from fill colours alone, inferred
 * corridors and bridges through a building are proposals (`pending`, with a
 * confidence) until touched. The same file gives the same result every run.
 */
export const detectHallways = (root: SvgEl, stops: StopCandidate[], options: DetectOptions = {}): DetectedHallways => {
  const flattenStep = options.flattenStep ?? DEFAULT_FLATTEN_STEP;
  const structure = detectSvgStructure(root, options.background ?? null);
  const warnings = [...structure.warnings.filter((warning) => warning.code !== 'no-walkable-layer')];
  const viewDiagonal = diagonalOf([], structure.viewBox);
  const streets = options.streets === false ? null : inferStreets(root, options.background ?? null, { cell: options.streetCell, flattenStep: Math.min(flattenStep, 4) });
  const fromBackground = structure.fromBackground.walkways || structure.fromBackground.footprints || (!!options.background && !!streets && streets.walkLayers.length > 0);
  const empty = (failure: DetectFailure, layers: string[] = []): DetectedHallways => ({
    ok: false,
    failure,
    source: null,
    nodes: [],
    edges: [],
    connections: [],
    joined: 0,
    obstacles: [],
    bboxDiagonal: viewDiagonal,
    viewBox: structure.viewBox,
    bridgeCount: 0,
    doorBridgeCount: 0,
    autoConnect: null,
    warnings,
    layers,
    fromBackground,
    namedLayers: structure.namedLayers,
    streetsMode: streets?.mode ?? null,
    components: 0
  });

  const footprints = rootShapes(structure.footprintShapes, flattenStep);
  const rooms = rootShapes(structure.roomShapes, flattenStep);
  const buildingRings = streets?.buildingRings ?? [];
  const buildingIndex = buildingRings.length ? buildObstacleIndex(buildingRings) : NO_OBSTACLES;

  // Outside: the street network; failing that, the drawn walkway layer as before.
  const outdoor = streets?.runs.length ? streetGraph(streets, viewDiagonal, buildingIndex) : null;
  const vector = !outdoor && structure.found ? traceWalkways(structure, stops, flattenStep) : null;
  if (streets && !streets.runs.length) {
    if (streets.reason === 'no-walkable') warnings.push({ code: 'no-walkable-area', message: streets.mode === 'colour' ? 'No road, parking, walkway or deck layer, and no pavement-coloured shape.' : 'No walkable area could be read from the named layers.' });
  } else if (streets?.mode === 'colour') {
    warnings.push({ code: 'streets-from-colour', message: 'The walkable areas were recognised by their fill colours: the file has no named road, parking or walkway layer.' });
  }
  // Inside: corridors between the rooms of each footprint, where they are wider than a drawn wall margin.
  const indoorMinHalfWidth = options.indoorMinHalfWidth ?? Math.max(5, viewDiagonal * 0.003);
  const inside = footprints.length ? inferInside(footprints, rooms, structure, stops, indoorMinHalfWidth) : null;
  const footprintLayer = structure.footprintSource === 'outlines' ? 'Building outlines' : 'Footprints';

  if (!outdoor && !vector && !inside?.graph) {
    if (structure.namedLayers === 0 && !(streets && streets.colourWalk > 0)) return empty('no-layers');
    if (!inside || inside.inferred.reason === 'no-footprint') return empty('no-hallway-layer');
    return empty('no-corridor', [footprintLayer, 'Units']);
  }

  const diagonal = Math.max(viewDiagonal, outdoor ? viewDiagonal : vector?.diagonal ?? 0, inside?.diagonal ?? 0);
  const snapTolerance = outdoor?.snapTolerance ?? vector?.snapTolerance ?? inside?.snapTolerance ?? computeSnapTolerance(diagonal);
  const pieces: { graph: WayfindingGraph; prefix: string }[] = [];
  if (outdoor) pieces.push({ graph: outdoor.graph, prefix: '' });
  if (vector) pieces.push({ graph: vector.graph, prefix: '' });
  if (inside?.graph) pieces.push({ graph: inside.graph, prefix: 'i_' });
  const inferredIds = new Set((inside?.graph?.nodes ?? []).map((node) => node.id));
  const colourStreetIds = new Set(streets?.mode === 'colour' && outdoor ? outdoor.graph.nodes.map((node) => node.id) : []);
  let graph: WayfindingGraph = { nodes: pieces.flatMap((piece) => piece.graph.nodes), edges: pieces.flatMap((piece) => piece.graph.edges.map((edge) => (piece.prefix ? { ...edge, id: `${piece.prefix}${edge.id}` } : edge))) };
  let bridgeCount = (outdoor?.bridgeCount ?? 0) + (vector?.bridgeCount ?? 0) + (inside?.bridgeCount ?? 0);
  // Where a corridor ends at a doorway, or a courtyard is enclosed by its building, join the piece to the nearest
  // other one: a join that passes through a building is kept as a proposal (`door_…`), the reviewer decides where.
  let doorBridgeCount = 0;
  if (pieces.length > 1 || countComponents(graph) > 1) {
    const before = new Set(graph.edges.map((edge) => edge.id));
    const joined = bridgeComponentGaps(graph, { maxGapDistance: Math.max(computeGapBridgeDistance(diagonal), diagonal * 0.06), snapTolerance });
    graph = {
      nodes: joined.graph.nodes,
      edges: joined.graph.edges.map((edge) => {
        if (edge.kind !== 'bridge' || before.has(edge.id)) return edge;
        bridgeCount += 1;
        if (!buildingIndex.blocks(edge.pathPoints[0], edge.pathPoints[edge.pathPoints.length - 1])) return edge;
        doorBridgeCount += 1;
        return { ...edge, id: `door_${edge.id}` };
      })
    };
  }
  const source: DetectSource = outdoor ? (inside?.graph ? 'streets+inferred' : 'streets') : vector ? (inside?.graph ? 'both' : 'vector') : 'inferred';
  const layers = [...(streets && outdoor ? streets.walkLayers : vector ? structure.walkwayLayerIds : []), ...(inside?.graph ? [footprintLayer, 'Units'] : [])];
  if (!graph.edges.length) return empty('no-edges', layers);

  const obstacles = [...flattenShapes(structure.obstacleShapes, flattenStep), ...(inside ? [...rooms, ...footprints].flatMap((shape) => shape.rings) : []), ...buildingRings];
  const confidenceOf = inside?.confidenceOf ?? (() => null);

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

  // A node is a proposal when it came from the corridor inference, from a colour-recognised street, from a bridge
  // through a building, or was made on an inferred edge (a stop split, a bridge end).
  const inferredEdgeEnds = new Set(graph.edges.filter((edge) => edge.kind === 'inferred' || edge.id.startsWith('door_')).flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
  const confirmedIds = new Set([...(outdoor && streets?.mode !== 'colour' ? outdoor.graph.nodes : []), ...(vector?.graph.nodes ?? [])].map((node) => node.id));
  // In colour mode nothing is confirmed: a junction or bridge end made on a colour-recognised street is as much a proposal as the street.
  const isInferred = (id: string) => inferredIds.has(id) || colourStreetIds.has(id) || (!confirmedIds.has(id) && (inferredEdgeEnds.has(id) || (outdoor != null && streets?.mode === 'colour')));
  const stopNodes = new Set(snapped.connections.map((c) => c.connectedNodeId).filter(Boolean));
  const nodes: HallwayNode[] = graph.nodes.map((node) => {
    const inferred = isInferred(node.id);
    const confidence = inferred ? (stopNodes.has(node.id) ? null : colourStreetIds.has(node.id) ? COLOUR_STREET_CONFIDENCE : confidenceOf(node.id)) : null;
    return { ...node, source: inferred ? 'inferred' : 'vector', review: inferred ? 'pending' : 'confirmed', confidence };
  });
  // A stop's own joining point is where its polygon meets the corridor: not a guess about the corridor.
  nodes.forEach((node) => {
    if (node.source === 'inferred' && stopNodes.has(node.id)) {
      const neighbours = graph.edges.filter((e) => e.fromNodeId === node.id || e.toNodeId === node.id).map((e) => (e.fromNodeId === node.id ? e.toNodeId : e.fromNodeId));
      const values = neighbours.map((id) => (colourStreetIds.has(id) ? COLOUR_STREET_CONFIDENCE : confidenceOf(id))).filter((v): v is number => v != null);
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
    joined: snapped.connections.filter((connection) => connection.connectedNodeId).length,
    obstacles,
    bboxDiagonal: diagonal,
    viewBox: structure.viewBox,
    bridgeCount,
    doorBridgeCount,
    autoConnect,
    warnings,
    layers,
    fromBackground,
    namedLayers: structure.namedLayers,
    streetsMode: streets?.mode ?? null,
    components: countComponents(graph)
  };
};
