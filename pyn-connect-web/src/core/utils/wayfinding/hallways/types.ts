/**
 * The hallway engine's types: the POC (`sample_pyn_wheel_map`,
 * `lib/wayfinding/types.ts`) ported for Map & Plotting. Coordinates are
 * always the floor SVG's root user units (its viewBox space), or — when a
 * graph comes from the floor image's stored hallways — the image's pixels;
 * the engine never mixes the two.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A 2D affine transform, with SVGMatrix's component names. */
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface HallwayWarning {
  code: string;
  message: string;
}

/* ── Phase 1: SVG structure ─────────────────────────────────────────── */

/** One drawable element of a layer, with the transform that takes its own coordinates to the root's. */
export interface WalkableShape {
  elementId: string;
  tagName: string;
  /** Raw `d`, for `<path>` only. */
  d: string | null;
  /** Explicit polylines, for line / polyline / polygon / rect / circle / ellipse. */
  polylines: Point[][] | null;
  matrix: Matrix2D;
}

/** A shape whose outline is closed (a room, a footprint) or open (a wall line), already in root space. */
export interface RootShape {
  rings: Point[][];
  closed: boolean;
}

export interface SvgStructureReport {
  /** A labelled walkway layer was found (the POC's `found`). */
  found: boolean;
  walkwayElementType: 'path' | 'group' | 'none';
  walkwayLayerIds: string[];
  walkwayShapes: WalkableShape[];
  /** Building / wall outlines an auto-generated connection must not cut. */
  obstacleShapes: WalkableShape[];
  /** The layers corridor inference reads (none in the POC: its Phase 1B was never built). */
  footprintShapes: WalkableShape[];
  roomShapes: WalkableShape[];
  viewBox: BBox;
  warnings: HallwayWarning[];
}

/* ── Phase 3: the graph ─────────────────────────────────────────────── */

export interface WayfindingNode extends Point {
  id: string;
}

/**
 * - `traced`   — followed from the SVG's own walkway art;
 * - `inferred` — the centreline of a corridor inferred from the floor's footprint and rooms;
 * - `bridge`   — closes a gap in either;
 * - `knn`      — added by Auto-Connect Paths;
 * - `manual`   — drawn on the page;
 * - `stored`   — a hallway link the CMS holds (`hallways.next_points`).
 */
export type EdgeKind = 'traced' | 'inferred' | 'bridge' | 'knn' | 'manual' | 'stored';

export interface WayfindingEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** The full polyline, both end nodes included. */
  pathPoints: Point[];
  /** Length along `pathPoints`: the routing weight. */
  length: number;
  kind?: EdgeKind;
}

export interface WayfindingGraph {
  nodes: WayfindingNode[];
  edges: WayfindingEdge[];
}

export interface GraphDiagnostics {
  subpathCount: number;
  isolatedNodeIds: string[];
  highDegreeNodeIds: string[];
  proximityJunctionCount: number;
  crossingJunctionCount: number;
  droppedDuplicateEdgeCount: number;
  bridgeCount: number;
}

export interface AutoConnectSummary {
  addedEdgeCount: number;
  rejectedByObstacle: number;
  rejectedAsRedundant: number;
  isolatedNodeIds: string[];
}

/* ── Phase 4: stops ─────────────────────────────────────────────────── */

export interface StopCandidate {
  groupId: string;
  label: string;
  anchor: Point;
}

export type ConnectionMethod = 'existing_node' | 'edge_split' | 'unconnected';

export interface StopConnection extends StopCandidate {
  connectedNodeId: string | null;
  snapDistance: number | null;
  connectionMethod: ConnectionMethod;
}

/* ── records ────────────────────────────────────────────────────────── */

/** Where a node came from: drawn walkway art, an inferred corridor, the CMS, or the page. */
export type ExtractionSource = 'vector' | 'inferred' | 'stored' | 'manual';

export type ReviewStatus = 'pending' | 'confirmed';
