import type { RouteLeg } from '~/core/models/data/propertyMap.data';

/**
 * The Map & Plotting screen's local state: what the user changes on the page
 * on top of the stored map. Nothing here is ever sent to the CMS; it lives
 * until the page reloads. Every coordinate is in the level's own pixel space
 * (the natural size of the floor image), the same unit the CMS stores, so a
 * temporary pin and a stored pin are directly comparable.
 */

export type MapTool = 'select' | 'plot' | 'junction' | 'edge' | 'move' | 'hallway';

export type PinKind = 'unit' | 'amenity';

export interface PinRef {
  kind: PinKind;
  id: number;
}

export const pinKey = (ref: PinRef): string => `${ref.kind}:${ref.id}`;

export const parsePinKey = (key: string): PinRef | null => {
  const [kind, id] = key.split(':');
  return (kind === 'unit' || kind === 'amenity') && /^\d+$/.test(id ?? '') ? { kind, id: Number(id) } : null;
};

/**
 * Node keys: `h:<id>` a stored hallway, `j:<n>` a temporary junction,
 * `e:<id>` an elevator, `b:<id>` a building entry/exit point, `s:tour` the
 * tour's starting point, `d:<id>` a door.
 */
export type NodeKind = 'hallway' | 'junction' | 'elevator' | 'startingPoint' | 'tourStart' | 'door';

export const nodeKey = (kind: NodeKind, id: number | string): string => {
  switch (kind) {
    case 'hallway':
      return `h:${id}`;
    case 'junction':
      return `j:${id}`;
    case 'elevator':
      return `e:${id}`;
    case 'startingPoint':
      return `b:${id}`;
    case 'tourStart':
      return 's:tour';
    default:
      return `d:${id}`;
  }
};

export const nodeKindOf = (key: string): NodeKind => {
  switch (key[0]) {
    case 'h':
      return 'hallway';
    case 'j':
      return 'junction';
    case 'e':
      return 'elevator';
    case 'b':
      return 'startingPoint';
    case 's':
      return 'tourStart';
    default:
      return 'door';
  }
};

export const nodeId = (key: string): number => Number(key.slice(2));

/** An undirected edge's key, the same whichever end comes first. */
export const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const edgeEnds = (key: string): [string, string] => key.split('|') as [string, string];

/**
 * The legacy map draws hallway nodes, doors, elevators and entry points as a
 * 16px icon whose stored x/y is its top-left corner, and draws the route
 * lines between them from x+8, y+8 (maps.js `return_x_y_values`). A node's
 * centre is therefore the stored point plus this offset. Unit and amenity
 * pins are stored as the point itself.
 */
export const NODE_ANCHOR_OFFSET = 8;

export interface TempNode {
  key: string;
  levelId: string;
  x: number;
  y: number;
  label: string;
}

export interface TempEdge {
  a: string;
  b: string;
}

/** A pin's temporary position; null marks a stored pin removed on this page. */
export interface PinOverride {
  levelId: string;
  x: number;
  y: number;
}

export interface LocalFile {
  name: string;
  url: string;
}

export interface PlanOverride {
  svg?: LocalFile | null;
  bg?: LocalFile | null;
  /** "Remove Plan" hides the stored files on this page. */
  removed?: boolean;
}

export type BedTier = 'studio' | 'b1' | 'b2' | 'b3';

export const BED_TIERS: { id: BedTier; beds: number }[] = [
  { id: 'studio', beds: 0 },
  { id: 'b1', beds: 1 },
  { id: 'b2', beds: 2 },
  { id: 'b3', beds: 3 }
];

/** The design's default tier colours, and the swatches it offers. */
export const DEFAULT_BED_COLORS: Record<BedTier, string> = {
  studio: '#8A92A3',
  b1: '#EC4E8C',
  b2: '#0077AE',
  b3: '#4A7212'
};

export const BED_SWATCHES = ['#0077AE', '#EC4E8C', '#4A7212', '#8A6A00', '#C62534', '#7B3A87', '#8A92A3', '#171A21'];

export const AMENITY_COLOR = '#0077AE';

export const bedTierOf = (beds: number | null): BedTier => {
  const count = beds ?? 0;
  if (count >= 3) return 'b3';
  if (count === 2) return 'b2';
  if (count === 1) return 'b1';
  return 'studio';
};

export interface AutoPlotReport {
  placed: number;
  total: number;
  skipped: { name: string; reason: string }[];
}

export interface RouteState {
  source: 'cms' | 'local';
  status: 'running' | 'done' | 'failed' | 'empty' | 'unauthorized';
  legs: RouteLeg[];
  /** How many points of the route, counted across legs, are drawn so far. */
  revealed: number;
}

export interface ConfirmState {
  title: string;
  message: string;
  label: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface LocalMapState {
  levelId: string;
  tool: MapTool;
  gridOn: boolean;
  /** Show the floor SVG rather than the raster where both are stored. */
  svgLayer: boolean;
  selectedPin: PinRef | null;
  selectedNode: string | null;
  selectedEdge: string | null;
  edgeFrom: string | null;
  plotTarget: PinRef | null;
  pinOverrides: Record<string, PinOverride | null>;
  nodeOverrides: Record<string, { x: number; y: number }>;
  tempNodes: TempNode[];
  tempEdges: TempEdge[];
  hiddenNodes: string[];
  hiddenEdges: string[];
  /** Hallway plotting: the node the next click links from. */
  chainFrom: string | null;
  dragging: { kind: 'pin'; ref: PinRef } | { kind: 'node'; key: string } | null;
  bedColors: Partial<Record<BedTier, string>>;
  autoPlotReport: AutoPlotReport | null;
  /** building → node key chosen as its starting point on this page. */
  startOverrides: Record<string, string>;
  planOverrides: Record<string, PlanOverride>;
  dropSlot: 'svg' | 'bg';
  svgDrag: boolean;
  /** Natural size of a level's image once the browser has loaded it (a fallback for missing stored dimensions). */
  measured: Record<string, { w: number; h: number }>;
  route: RouteState | null;
  publishOpen: boolean;
  confirm: ConfirmState | null;
  nextJunction: number;
}

export const initialLocalMapState = (levelId: string): LocalMapState => ({
  levelId,
  tool: 'select',
  gridOn: false,
  svgLayer: false,
  selectedPin: null,
  selectedNode: null,
  selectedEdge: null,
  edgeFrom: null,
  plotTarget: null,
  pinOverrides: {},
  nodeOverrides: {},
  tempNodes: [],
  tempEdges: [],
  hiddenNodes: [],
  hiddenEdges: [],
  chainFrom: null,
  dragging: null,
  bedColors: {},
  autoPlotReport: null,
  startOverrides: {},
  planOverrides: {},
  dropSlot: 'svg',
  svgDrag: false,
  measured: {},
  route: null,
  publishOpen: false,
  confirm: null,
  nextJunction: 1
});

/** Pixel → percent of the level's image, clamped to the surface. */
export const toPercent = (px: number, dim: number): number => (dim > 0 ? Math.max(0, Math.min(100, (px / dim) * 100)) : 0);

export const distance = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
