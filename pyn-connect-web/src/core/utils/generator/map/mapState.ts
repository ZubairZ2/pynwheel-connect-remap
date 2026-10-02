import type { RouteLeg } from '~/core/models/data/propertyMap.data';
import type { ApRules } from '~/core/utils/map/autoPlotRules';
import type { FloorSvgDoc } from '~/core/utils/map/floorSvg';
import type { EdgeKind, ExtractionSource, ReviewStatus } from '~/core/utils/wayfinding/hallways/types';
import type { StopTypeId } from '~/core/utils/wayfinding/stopTypes';
import type { WfRouteResult } from '~/core/utils/wayfinding/wayfindingRoute';

/**
 * The Map & Plotting screen's local state: what the user changes on the page
 * on top of the stored map. Nothing here is ever sent to the CMS; it lives
 * until the page reloads. Every coordinate is in the level's own space —
 * the natural pixels of the floor image (`raster`, what the CMS stores for
 * pins, hallways and elevators) or the floor SVG's viewBox units (`svg`,
 * what it stores for `pointer_data`) — so a temporary placement and a
 * stored one are directly comparable.
 */

/** The coordinate space of a placement: the floor image's pixels, or the floor SVG's viewBox. */
export type PlanSpace = 'raster' | 'svg';

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
  space: PlanSpace;
  /** Where the point came from: traced from a walkway layer, an inferred corridor, or drawn here (the default). */
  source?: ExtractionSource;
  /** Inferred points are proposals until touched or confirmed. */
  review?: ReviewStatus;
  confidence?: number | null;
}

export interface TempEdge {
  a: string;
  b: string;
  /** The drawn polyline between the two points, ends excluded, from `a` towards `b` (none = a straight line). */
  points?: { x: number; y: number }[];
  /** What made the path (Detect Hallways' traced / inferred / bridge, Auto-Connect's knn, a hand-drawn manual one). */
  kind?: EdgeKind;
}

/**
 * A pin's temporary position; null marks a stored pin removed on this page.
 * `polygon` names the SVG shape it was dropped onto (Manual Plot / Auto
 * Plot), when it was.
 */
export interface PinOverride {
  levelId: string;
  x: number;
  y: number;
  space: PlanSpace;
  polygon: string | null;
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

/** A level's floor SVG on this page: being fetched, unreadable, or parsed. */
export type SvgDocState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; doc: FloorSvgDoc };

/** The two modes of the screen: plotting units, amenities and stops, or the self-tour's wayfinding paths. */
export type MapMode = 'plot' | 'wayfind';

/** What the Plot on Map panel lists ("Show"). */
export type PlotKind = 'unit' | 'amenity' | 'stop';

/**
 * The wayfinding tools: drag points, link points and stops, drop points,
 * remove points and paths. None selected is the POC's own editing: drag a
 * point, double-click it to delete it, click the plan to add one, drag a
 * path to bend it, double-click a path to delete it, Ctrl/Cmd+Z to undo.
 */
export type WfTool = 'move' | 'connect' | 'node' | 'erase';

/** How far "Test shortest path" may route: within the floor, across a building's floors, across buildings. */
export type WfScope = 'plate' | 'floors' | 'buildings';

/**
 * An Additional Stop added on this page (the design's "Add Additional
 * Stop"). It lives in the floor image's pixels like every stored stop, and
 * is gone on reload; nothing is sent.
 */
export interface TempStop {
  /** `n:<n>`, the stop's key on the map. */
  key: string;
  type: StopTypeId;
  name: string;
  building: string | null;
  levelId: string;
  /** On a stacked floorplate: the one floor it applies to (null = every floor of the stack). */
  floorOnly: number | null;
  /** Elevator / stairs: the floors it serves, as typed ("1-12", "Lobby–12"). */
  floors: string;
  accessible: boolean;
  lock: boolean;
  note: string;
  /** Raster pixels once placed (viewBox units with `space: 'svg'`); null while it waits in To Plot. */
  x: number | null;
  y: number | null;
  /** The layer it was placed on (absent: the floor image, as every stored stop). */
  space?: PlanSpace;
}

/** The Add Additional Stop dialog's fields while it is open. */
export interface StopForm {
  /** The temporary stop being edited, or null for a new one. */
  editing: string | null;
  type: StopTypeId;
  name: string;
  building: string;
  levelId: string;
  /** '' = every floor of the stack. */
  floorOnly: string;
  floors: string;
  accessible: boolean;
  lock: boolean;
  note: string;
  place: boolean;
  /** Set by the first Save attempt, so the field errors show from then on. */
  submitted: boolean;
}

/** The From / To picker of "Test shortest path" while it is open. */
export interface WfPickState {
  which: 'A' | 'B';
  query: string;
  kind: 'all' | 'unit' | 'amenity' | 'stop';
  index: number;
  /** Fixed position beside the card, so the scrolling panel never clips it. */
  pos: { left: number; width: number; top: number | null; bottom: number | null; listH: number };
}

export interface WfAnimState {
  leg: number;
  playing: boolean;
  finished: boolean;
  /** Changes on every (re)start, so the animation restarts from the leg's first point. */
  run: number;
}

/** The graph fields one local edit changes: what Ctrl/Cmd+Z and Detect Hallways' Undo restore. */
export interface WfSnapshot {
  nodeOverrides: Record<string, { x: number; y: number }>;
  tempNodes: TempNode[];
  tempEdges: TempEdge[];
  hiddenNodes: string[];
  hiddenEdges: string[];
  wfLinks: Record<string, string | null>;
  wfEdited: Record<string, 'detected' | 'edited'>;
  wfSvg: Record<string, true>;
  nextJunction: number;
}

/** How far back Ctrl/Cmd+Z goes (the POC's `UNDO_LIMIT`). */
export const WF_UNDO_LIMIT = 50;

/** One floorplate's outcome in a Detect Hallways run. */
export type WfDetectStatus = 'queued' | 'running' | 'detected' | 'existing' | 'noSvg' | 'invalidSvg' | 'noHallway' | 'failed';

export interface WfDetectRow {
  levelId: string;
  name: string;
  status: WfDetectStatus;
  points: number;
  paths: number;
  /** Traced from a walkway layer, or inferred from the footprints and rooms. */
  source: 'vector' | 'inferred' | null;
  /** Why it was skipped or found nothing, in a few words. */
  note: string;
}

/** A Detect Hallways run: progress while it runs, the result card after. */
export interface WfDetectRun {
  scope: 'plate' | 'building' | 'all';
  rows: WfDetectRow[];
  running: boolean;
  stopped: boolean;
  /** The graph before the run, for its Undo. */
  snapshot: WfSnapshot;
  /** `wfUndo.length` before the run: its Undo also drops the run's entry. */
  undoDepth: number;
}

export type ApScope = 'one' | 'building' | 'all';
export type ApStep = 'analyze' | 'pattern' | 'confirm' | 'done';

/** The Auto Plot wizard while it is open. */
export interface AutoPlotState {
  step: ApStep;
  scope: ApScope;
  levelId: string;
  building: string | null;
  rules: ApRules;
  draft: ApRules;
  /** unit key → polygon key picked by hand in the Analyze table. */
  manual: Record<string, string>;
  remember: boolean;
  placed: number;
  left: { name: string; where: string; reason: string }[];
}

export interface LocalMapState {
  levelId: string;
  /** The building the floorplate tabs are filtered to; null shows every level. */
  building: string | null;
  /** The layer shown when the level has both a floor SVG and a floor image. */
  layer: PlanSpace;
  tool: MapTool;
  gridOn: boolean;
  selectedPin: PinRef | null;
  selectedNode: string | null;
  selectedEdge: string | null;
  edgeFrom: string | null;
  plotTarget: PinRef | null;
  /** Items ticked in the To Plot list, dropped together on the next polygon click. */
  plotSel: string[];
  /** Items ticked in the Plotted list, for "Unplot N items". */
  plotUnSel: string[];
  plotTab: 'todo' | 'done';
  plotQuery: string;
  /** The polygon whose popover is open. */
  selPoly: string | null;
  polyHover: string | null;
  pinOverrides: Record<string, PinOverride | null>;
  nodeOverrides: Record<string, { x: number; y: number }>;
  tempNodes: TempNode[];
  tempEdges: TempEdge[];
  hiddenNodes: string[];
  hiddenEdges: string[];
  /** Hallway plotting: the node the next click links from. */
  chainFrom: string | null;
  /**
   * A drag in progress: a pin, a point or stop (with the graph before it,
   * so a real move can be undone), or a path being bent (where it was
   * grabbed and where the pointer is, in the layer's units).
   */
  dragging:
    | { kind: 'pin'; ref: PinRef }
    | { kind: 'node'; key: string; before?: WfSnapshot; moved?: boolean }
    | { kind: 'bend'; key: string; grab: { x: number; y: number }; drop: { x: number; y: number }; client: { x: number; y: number }; moved: boolean }
    | null;
  bedColors: Partial<Record<BedTier, string>>;
  autoPlotReport: AutoPlotReport | null;
  /** building → node key chosen as its starting point on this page. */
  startOverrides: Record<string, string>;
  planOverrides: Record<string, PlanOverride>;
  dropSlot: 'svg' | 'bg';
  svgDrag: boolean;
  /** Natural size of a level's image once the browser has loaded it (a fallback for missing stored dimensions). */
  measured: Record<string, { w: number; h: number }>;
  /** Each level's floor SVG, once asked for. */
  svgDocs: Record<string, SvgDocState>;
  ap: AutoPlotState | null;
  apMenuOpen: boolean;
  /** Rules remembered on this page per building ("Use these rules next time"). */
  apPatterns: Record<string, ApRules>;
  route: RouteState | null;
  publishOpen: boolean;
  floorplateDialog: boolean;
  confirm: ConfirmState | null;
  nextJunction: number;

  /* ── Plotting / Wayfinding ──────────────────────────────────────── */
  mode: MapMode;
  plotShow: Record<PlotKind, boolean>;
  plotShowOpen: boolean;
  /** Plot on Map on a stacked floorplate: the one floor listed (null = all floors, shared stops only). */
  plotFloor: number | null;
  /** A stop armed for placement: the next click on the floor image puts it there. */
  stopTarget: string | null;
  /** The stop marker whose popover is open. */
  selStop: string | null;
  tempStops: TempStop[];
  nextStop: number;
  stopDialog: StopForm | null;
  /** The active tool; null = none (the POC's default editing). */
  wfTool: WfTool | null;
  /** The selected hallway point. */
  wfSel: string | null;
  /** The selected path (an edge key). */
  wfSelEdge: string | null;
  /** The selected bridge: the key of the unit, amenity or stop it joins the paths from. */
  wfSelLink: string | null;
  /** Connect: the point or stop the next click links from. */
  wfFrom: string | null;
  /** Wayfinding on a stacked floorplate: the floor in view. */
  wfFloor: number | null;
  wfMenuOpen: boolean;
  /**
   * `${levelId}|${stop key}` → the point a unit, amenity or stop was linked
   * to by hand (else it attaches to the nearest point, as the CMS does), or
   * null when its bridge was removed by hand: it joins nothing until Connect
   * links it again.
   */
  wfLinks: Record<string, string | null>;
  /** Levels whose paths were detected or edited on this page. */
  wfEdited: Record<string, 'detected' | 'edited'>;
  /** Levels whose Wayfinding works on the floor SVG because hallways were detected from it here (an SVG-only level always does). */
  wfSvg: Record<string, true>;
  /** Local graph edits, newest last, for Ctrl/Cmd+Z. */
  wfUndo: WfSnapshot[];
  wfDetect: WfDetectRun | null;
  wfScope: WfScope;
  wfA: string;
  wfB: string;
  wfStepFree: boolean;
  wfRoute: WfRouteResult | null;
  wfPick: WfPickState | null;
  wfAnim: WfAnimState | null;
  wfAnimMode: 'point' | 'stop';
}

export const initialLocalMapState = (levelId: string, building: string | null, layer: PlanSpace): LocalMapState => ({
  levelId,
  building,
  layer,
  tool: 'select',
  gridOn: false,
  selectedPin: null,
  selectedNode: null,
  selectedEdge: null,
  edgeFrom: null,
  plotTarget: null,
  plotSel: [],
  plotUnSel: [],
  plotTab: 'todo',
  plotQuery: '',
  selPoly: null,
  polyHover: null,
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
  svgDocs: {},
  ap: null,
  apMenuOpen: false,
  apPatterns: {},
  route: null,
  publishOpen: false,
  floorplateDialog: false,
  confirm: null,
  nextJunction: 1,
  mode: 'plot',
  plotShow: { unit: true, amenity: false, stop: false },
  plotShowOpen: false,
  plotFloor: null,
  stopTarget: null,
  selStop: null,
  tempStops: [],
  nextStop: 1,
  stopDialog: null,
  wfTool: null,
  wfSel: null,
  wfSelEdge: null,
  wfSelLink: null,
  wfFrom: null,
  wfFloor: null,
  wfMenuOpen: false,
  wfLinks: {},
  wfEdited: {},
  wfSvg: {},
  wfUndo: [],
  wfDetect: null,
  wfScope: 'plate',
  wfA: '',
  wfB: '',
  wfStepFree: false,
  wfRoute: null,
  wfPick: null,
  wfAnim: null,
  wfAnimMode: 'point'
});

/** Pixel → percent of the level's image, clamped to the surface. */
export const toPercent = (px: number, dim: number): number => (dim > 0 ? Math.max(0, Math.min(100, (px / dim) * 100)) : 0);

export const distance = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
