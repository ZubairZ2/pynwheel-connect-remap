import type { MapLevel } from './property.model';

/**
 * The wayfinding graph: what a route is computed over. Mirrors the backend's
 * `GraphSerializer` payload key for key (camelCased), so the dummy provider
 * and the future API provider produce the same object.
 */

/** Every kind of node the graph holds. `stop` covers the additional self-tour stops (`wayfinding_stops`). */
export type NodeKind = 'hallway' | 'unit' | 'amenity' | 'door' | 'elevator' | 'entry' | 'tour_start' | 'stop' | 'blocker';

/** The self-tour stop types of the Map & Plotting "Add Additional Stop" dialog. */
export type StopKind = 'entry' | 'exit' | 'elevator' | 'stairs' | 'ramp' | 'door' | 'blocker' | 'leasing' | 'restroom' | 'mail' | 'parking' | 'waypoint';

export type VerticalKind = 'elevator' | 'stairs' | 'ramp';

/** What the stored coordinates anchor: a legacy icon's top-left, a door, or the point itself. */
export type NodeAnchor = 'icon_top_left' | 'door' | 'point';

export interface GraphNode {
  /** Typed id: `hallway:12`, `unit:101`, `amenity:3`, `elevator:1`, `bsp:1`, `tour_start:1`, `stop:7`, `door:4`. */
  id: string;
  kind: NodeKind;
  /** The level this instance stands on. A record on several levels (an elevator) appears once per level. */
  level: string;
  /** Concrete whenever it can be; null only on a stacked level for a node that stands on every floor of it. */
  floor: number | null;
  building: string | null;
  name: string | null;
  x: number;
  y: number;
  anchor: NodeAnchor;
  /** The hallway node this stop joins the paths at, when it is linked. */
  attach?: string | null;
  /** Whether the stop is joined to a path at all; an unlinked stop cannot be routed to. */
  link?: boolean;
  /** For `stop` nodes: the stop type. */
  stopKind?: StopKind;
  /** For `elevator` nodes (elevators, stairs and ramps are all `elevator` records): what kind of vertical connection it is. */
  vertical?: VerticalKind;
  accessible?: boolean;
  floorsServed?: number[];
  /** Per-floor position overrides on a stacked level, `{ "3": { x, y } }`. */
  positions?: Record<string, { x: number; y: number }>;
  /** A visitor instruction read out on arrival. */
  note?: string | null;
  /** For `blocker` nodes: the radius every path must keep clear. */
  radiusPx?: number | null;
  lockProvider?: string | null;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'walk';
  /** manual | traced | inferred | bridge | knn — how the path was made; routing treats them alike. */
  pathKind: string;
  level: string;
  lengthPx: number;
  /** Centre-pixel points from `from` to `to`, both ends included. */
  polyline: [number, number][];
}

export interface VerticalConnection {
  id: string;
  kind: VerticalKind;
  floors: number[];
  accessible: boolean;
  /** The levels the connection has an instance on. */
  levels: string[];
}

export interface Gate {
  id: string;
  building: string | null;
  kind: 'entry' | 'exit' | 'tour_start' | 'stop';
}

/**
 * Frontend extension (the backend emits none yet): where an outdoor walk
 * between two gates is drawn on the sitemap. Without one, the route still
 * exists as the backend's single outdoor edge, drawn as a straight line.
 */
export interface OutdoorLink {
  from: string;
  to: string;
  level: string;
  polyline: [number, number][];
}

export interface TourStopRef {
  tourStopId: number;
  /** The graph node the stop stands at, null when the record is not on the map. */
  node: string | null;
  stopType: string;
  name: string;
  sort: number;
  visible: boolean;
  durationMinutes: number | null;
  onMap: boolean;
}

export interface TourInfo {
  id: number;
  /** The tour's own starting point node (`tour_start:ID`). */
  start: string | null;
  startingFloor: number | null;
  building: string | null;
  buildingOrder: string[];
  version: number;
  stops: TourStopRef[];
}

export interface WayfindingGraph {
  /** The ETag / cache key of the whole graph. */
  version: string;
  communityId: number;
  isSitemap: boolean;
  autoWayfinding: boolean;
  scale: { unit: 'px'; ftPerPx: number | null };
  levels: MapLevel[];
  buildings: string[];
  /** Unique by (id, level). */
  nodes: GraphNode[];
  edges: GraphEdge[];
  verticalConnections: VerticalConnection[];
  gates: Gate[];
  outdoorLinks: OutdoorLink[];
  tour: TourInfo | null;
}
