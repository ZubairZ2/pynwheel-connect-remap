import type { PropertyInventory } from './propertyInventory.data';

/**
 * The Map & Plotting data of one real property: its inventory (the floor
 * plates that are the maps, and the unit and amenity pins on them) plus the
 * wayfinding graph the legacy Auto Wayfinding page works from
 * (`GET /automate_plotting.json?community_id=`).
 *
 * Every coordinate is exactly what the CMS stores: natural pixels of the
 * floor image the record is plotted on (`floorplates.image`, or the
 * sitemap's image), never a percentage. The parser is the only place the
 * snake_case spelling appears.
 */

/** Whether a record is a tour stop, and if so whether the stop is shown (routed through). */
export interface StopState {
  id: number;
  sort: number | null;
  visible: boolean;
}

/** One node of the pathway graph (`hallways`), on a floorplate or the sitemap. */
export interface MapHallway {
  id: number;
  xPlot: number;
  yPlot: number;
  /** Ids of the hallways this one connects to. Stored one way; the graph is undirected. */
  nextPoints: number[];
  /** The node the legacy editor chains the next click from (one per map). */
  selected: boolean;
  parentType: 'Floorplate' | 'Sitemap';
  parentId: number;
}

/** A vertical connection: one position, shown on every floor in its range. */
export interface MapElevator {
  id: number;
  name: string | null;
  xPlot: number | null;
  yPlot: number | null;
  floorplateId: number | null;
  sitemapId: number | null;
  /** `floorplate_covering_range` as stored ("1-7", "1,3"). */
  coveringRange: string | null;
  floors: number[];
  building: string | null;
  directionalText: string | null;
  duplicateOf: number | null;
  lockProvider: string | null;
  image: string | null;
  tourStop: StopState | null;
}

/** The designated entry/exit of one building (`building_starting_points`). */
export interface MapStartingPoint {
  id: number;
  name: string | null;
  building: string | null;
  floor: number | null;
  xPlot: number | null;
  yPlot: number | null;
  status: string | null;
  directionalText: string | null;
  lockProvider: string | null;
  tourStop: StopState | null;
}

/** The property's tour, which carries the tour's own starting point. */
export interface MapTour {
  id: number;
  name: string | null;
  /** The starting point's pixel position; 0/0 when none is set. */
  xPlot: number;
  yPlot: number;
  startingFloor: number | null;
  building: string | null;
  buildingOrder: string[];
  dottedLineColor: string | null;
  enableAutoZoom: boolean;
}

export type TourStopType = 'unit' | 'amenity' | 'elevator' | 'building_starting_point';

export interface MapTourStop {
  id: number;
  stopType: TourStopType | string;
  stopId: number;
  name: string | null;
  sort: number | null;
  displayStop: boolean;
  latitude: number | null;
  longitude: number | null;
}

/** A unit door, an amenity door, or an access point (`doors`). */
export interface MapDoor {
  id: number;
  name: string | null;
  floor: number | null;
  xPlot: number | null;
  yPlot: number | null;
  attachedWithType: 'Unit' | 'Amenity' | 'Floorplate' | 'Sitemap' | string;
  attachedWithId: number;
  sort: number | null;
  lockProvider: string | null;
}

export interface BedroomMarkerColor {
  bedroom: number;
  availableUnitsColor: string | null;
  availableUnitsOpacity: number | null;
  modelUnitsColor: string | null;
  modelUnitsOpacity: number | null;
}

/** One Textract text box the CMS stored on a map (normalised 0..1 geometry). */
export interface OcrBox {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WayfindingSettings {
  autoWayfinding: boolean;
  selfTour: boolean;
  isSitemap: boolean;
  enableSvgMode: boolean;
  defaultMapFloor: number | null;
  /** `design.property_map_size_integer`: the legacy marker's size. */
  markerSize: number | null;
  availableUnitsColor: string | null;
  modelUnitsColor: string | null;
  amenitiesColor: string | null;
}

export interface WayfindingGraph {
  settings: WayfindingSettings;
  /** Distinct unit/amenity buildings, in the tour's building order. */
  buildings: string[];
  /** floor → floorplate id, as the legacy page keys its maps. */
  floorToFloorplate: Record<number, number>;
  hallways: MapHallway[];
  elevators: MapElevator[];
  buildingStartingPoints: MapStartingPoint[];
  tour: MapTour | null;
  /** All tour stops in sort order (visible or not). */
  tourStops: MapTourStop[];
  doors: MapDoor[];
  bedroomMarkerColors: BedroomMarkerColor[];
  /** "Floorplate:507" / "Sitemap:12" → stored OCR text boxes. */
  ocr: Record<string, OcrBox[]>;
}

export interface PropertyMap {
  inventory: PropertyInventory;
  graph: WayfindingGraph;
}

/**
 * One point of a route the CMS algorithm returned
 * (`GET /automate_plotting/shortest_path`). `x`/`y` are the stored pixels of
 * the record the point stands for: a hallway node, a stop's door (or the
 * stop itself when it has no door), an elevator, or the entry point.
 */
export interface RoutePoint {
  kind: 'hallway' | 'unit' | 'amenity' | 'elevator' | 'start' | 'exit';
  x: number;
  y: number;
  /** The record's id (hallway, door/stop, elevator); null for the tour start. */
  id: number | null;
  /** The elevator's floor range, when the point is one. */
  floors?: { min: number | null; max: number | null };
}

/** The points walked on one floor (and building) before the route changes level. */
export interface RouteLeg {
  building: string | null;
  floor: number | null;
  points: RoutePoint[];
}

export interface WayfindingRoute {
  legs: RouteLeg[];
  floorIds: number[];
  multipleBuildings: boolean;
  sitemap: boolean;
}
