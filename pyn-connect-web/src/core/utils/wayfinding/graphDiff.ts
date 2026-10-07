import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { wayfindingSpace, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { NODE_ANCHOR_OFFSET, type LocalMapState, type PlanSpace, type TempStop } from '~/core/utils/generator/map/mapState';
import { stopTypeOf } from './stopTypes';

/**
 * `LocalMapState` → the payload `Wayfinding::GraphSave` applies, for one
 * level and one coordinate space. The page keeps its changes as overrides
 * over the stored map (`tempNodes`, `tempEdges`, `nodeOverrides`,
 * `hiddenNodes`, `hiddenEdges`, `wfLinks`, `wfPlaces`, `tempStops`,
 * `pinOverrides`); this turns them into the save's operations, in the
 * backend's storage units:
 *
 *   - raster hallway nodes and the legacy icon records (elevators, entry
 *     points, doors, the tour start) are stored as the icon's top-left, and
 *     the page works with centres, so `NODE_ANCHOR_OFFSET` comes off;
 *   - unit / amenity pins are the pin point itself; `wayfinding_stops` are
 *     the marker's centre; SVG-space rows are the viewBox point.
 *
 * A level edited on both layers (stored raster points moved, detected SVG
 * points added) yields one payload per space, saved one after the other.
 * Pure; nothing is sent from here.
 */

export type GraphRef = number | string;

export interface GraphSavePayload {
  request_id: string;
  level: { kind: 'floorplate' | 'sitemap'; id: number };
  base_version: number;
  space: PlanSpace;
  origin: 'edit' | 'detect';
  nodes: { add: { temp_key: string; x: number; y: number; source?: string; review?: string; confidence?: number | null }[]; move: { id: number; x: number; y: number }[]; confirm: number[]; delete: number[] };
  edges: { add: { a: GraphRef; b: GraphRef; kind: string; points: [number, number][] }[]; reshape: never[]; delete: { a: number; b: number }[] };
  links: { set: { attachable_type: string; attachable_id: GraphRef; hallway: GraphRef; anchor?: { x: number; y: number } }[]; detach: { attachable_type: string; attachable_id: GraphRef }[]; clear: never[] };
  pins: {
    units: PinOp[];
    amenities: PinOp[];
    elevators: IconOp[];
    building_starting_points: IconOp[];
    doors: IconOp[];
    tour_start?: { x: number; y: number; floor?: number | null };
  };
  stops: { create: StopCreate[]; update: never[]; delete: never[] };
}

interface PinOp {
  id: number;
  x?: number;
  y?: number;
  pointer?: { x_plot: number; y_plot: number; tag: string | null; id: string | null; selector: string | null };
  unplot?: true;
  space?: PlanSpace;
}

interface IconOp {
  id: number;
  x?: number;
  y?: number;
  unplot?: true;
}

interface StopCreate {
  temp_key: string;
  kind: string;
  name: string;
  x: number | null;
  y: number | null;
  floor: number | null;
  building: string | null;
  note: string;
  floors: string;
  accessible: boolean;
  lock_provider: string;
}

/** The Rails type of what a page key stands for, and its id (a temp key for a page stop). */
const attachableOf = (key: string, map: PropertyMap): { type: string; id: GraphRef } | null => {
  const [prefix, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  switch (prefix) {
    case 'unit':
      return { type: 'Unit', id: Number(rest) };
    case 'amenity':
      return { type: 'Amenity', id: Number(rest) };
    case 'e':
      return { type: 'Elevator', id: Number(rest) };
    case 'b':
      return { type: 'BuildingStartingPoint', id: Number(rest) };
    case 'd':
      return { type: 'Door', id: Number(rest) };
    case 's':
      return map.graph.tour ? { type: 'Tour', id: map.graph.tour.id } : null;
    case 'n':
      return { type: 'WayfindingStop', id: key };
    default:
      return null;
  }
};

/** The stored record kinds whose coordinates are an icon's top-left. */
const ICON_STOP_KINDS = new Set(['entry', 'elevator', 'stairs', 'ramp', 'door']);

const hallwayRef = (key: string): GraphRef | null => (key.startsWith('h:') ? Number(key.slice(2)) : key.startsWith('j:') ? key : null);

const round = (value: number): number => Math.round(value * 100) / 100;

/** Which space a stored or page point lives in. */
const spaceOfNode = (key: string, state: LocalMapState): PlanSpace | null => {
  if (key.startsWith('j:')) return state.tempNodes.find((node) => node.key === key)?.space ?? null;
  return 'raster';
};

/** Builds the payload(s) for `level`: one per space that has changes; empty when the level has none. */
/**
 * Whether a save carries unit and amenity pins (Manual Plot / Auto Plot).
 * Off since October 5, 2026: a pin saved to the CMS cannot be removed from the
 * plan yet, so plotting stays page state until that is handled. The Rails side
 * keeps accepting `pins.units` / `pins.amenities`; flip this to send them again.
 */
export const PLOTTING_SAVE = false;

export const buildGraphSavePayloads = (map: PropertyMap, levels: MapLevel[], level: MapLevel, state: LocalMapState, baseVersion: number, requestId: string): GraphSavePayload[] => {
  const spaces: PlanSpace[] = ['raster', 'svg'];
  const payloads: GraphSavePayload[] = [];
  spaces.forEach((space, index) => {
    const payload = buildFor(map, levels, level, state, space, baseVersion, index === 0 ? requestId : `${requestId}-svg`);
    if (payload && hasOperations(payload)) payloads.push(payload);
  });
  return payloads;
};

export const hasOperations = (payload: GraphSavePayload): boolean =>
  payload.nodes.add.length + payload.nodes.move.length + payload.nodes.confirm.length + payload.nodes.delete.length + payload.edges.add.length + payload.edges.delete.length +
    payload.links.set.length + payload.links.detach.length + payload.pins.units.length + payload.pins.amenities.length + payload.pins.elevators.length +
    payload.pins.building_starting_points.length + payload.pins.doors.length + payload.stops.create.length >
    0 || !!payload.pins.tour_start;

/** How many saved-to-be operations the level holds across both spaces (for the Save button). */
export const unsavedCount = (map: PropertyMap, levels: MapLevel[], level: MapLevel, state: LocalMapState): number =>
  buildGraphSavePayloads(map, levels, level, state, 0, 'count').reduce(
    (sum, payload) =>
      sum +
      payload.nodes.add.length + payload.nodes.move.length + payload.nodes.confirm.length + payload.nodes.delete.length +
      payload.edges.add.length + payload.edges.delete.length + payload.links.set.length + payload.links.detach.length +
      payload.pins.units.length + payload.pins.amenities.length + payload.pins.elevators.length + payload.pins.building_starting_points.length + payload.pins.doors.length +
      (payload.pins.tour_start ? 1 : 0) + payload.stops.create.length,
    0
  );

const buildFor = (map: PropertyMap, levels: MapLevel[], level: MapLevel, state: LocalMapState, space: PlanSpace, baseVersion: number, requestId: string): GraphSavePayload | null => {
  const offset = space === 'raster' ? NODE_ANCHOR_OFFSET : 0;
  const parentType = level.kind === 'floorplate' ? 'Floorplate' : 'Sitemap';
  const storedIds = new Set(map.graph.hallways.filter((row) => row.parentType === parentType && row.parentId === level.recordId).map((row) => row.id));
  const onLevelStored = (key: string) => key.startsWith('h:') && storedIds.has(Number(key.slice(2)));
  const tempOnLevel = state.tempNodes.filter((node) => node.levelId === level.id && node.space === space);
  const tempKeys = new Set(tempOnLevel.map((node) => node.key));
  const onLevel = (key: string) => tempKeys.has(key) || (space === 'raster' && onLevelStored(key));

  const payload: GraphSavePayload = {
    request_id: requestId,
    level: { kind: level.kind, id: level.recordId },
    base_version: baseVersion,
    space,
    origin: 'edit',
    nodes: { add: [], move: [], confirm: [], delete: [] },
    edges: { add: [], reshape: [], delete: [] },
    links: { set: [], detach: [], clear: [] },
    pins: { units: [], amenities: [], elevators: [], building_starting_points: [], doors: [] },
    stops: { create: [], update: [], delete: [] }
  };

  // Nodes.
  tempOnLevel.forEach((node) =>
    payload.nodes.add.push({ temp_key: node.key, x: round(node.x - offset), y: round(node.y - offset), source: node.source ?? 'manual', review: node.review ?? 'confirmed', confidence: node.confidence ?? null })
  );
  if (space === 'raster') {
    Object.entries(state.nodeOverrides).forEach(([key, at]) => {
      if (onLevelStored(key) && !state.hiddenNodes.includes(key)) payload.nodes.move.push({ id: Number(key.slice(2)), x: round(at.x - offset), y: round(at.y - offset) });
    });
    state.hiddenNodes.forEach((key) => {
      if (onLevelStored(key)) payload.nodes.delete.push(Number(key.slice(2)));
    });
  }

  // Paths.
  state.tempEdges.forEach((edge) => {
    if (!onLevel(edge.a) || !onLevel(edge.b)) return;
    if (spaceOfNode(edge.a, state) !== space && spaceOfNode(edge.b, state) !== space) return;
    const a = hallwayRef(edge.a);
    const b = hallwayRef(edge.b);
    if (a == null || b == null) return;
    payload.edges.add.push({ a, b, kind: edge.kind ?? 'manual', points: (edge.points ?? []).map((point) => [round(point.x - offset), round(point.y - offset)]) });
  });
  if (space === 'raster') {
    state.hiddenEdges.forEach((key) => {
      const [a, b] = key.split('|');
      if (onLevelStored(a) && onLevelStored(b)) payload.edges.delete.push({ a: Number(a.slice(2)), b: Number(b.slice(2)) });
    });
  }

  // Bridges (links) and the page-only places of items plotted on the other layer.
  Object.entries(state.wfLinks).forEach(([compound, point]) => {
    const separator = compound.indexOf('|');
    if (compound.slice(0, separator) !== level.id) return;
    const anchorKey = compound.slice(separator + 1);
    const attachable = attachableOf(anchorKey, map);
    if (!attachable) return;
    if (point === null) {
      if (space === 'raster') payload.links.detach.push({ attachable_type: attachable.type, attachable_id: attachable.id });
      return;
    }
    if (spaceOfNode(point, state) !== space) return;
    const hallway = hallwayRef(point);
    if (hallway == null) return;
    const placed = state.wfPlaces[compound];
    payload.links.set.push({
      attachable_type: attachable.type,
      attachable_id: attachable.id,
      hallway,
      ...(placed && placed.space === space ? { anchor: { x: round(placed.x - offset), y: round(placed.y - offset) } } : {})
    });
  });

  // Pins: units and amenities placed, moved or removed on this level (only while PLOTTING_SAVE); the legacy icon records moved or unplotted.
  if (PLOTTING_SAVE) Object.entries(state.pinOverrides).forEach(([key, override]) => {
    const kind = key.startsWith('unit:') ? 'units' : key.startsWith('amenity:') ? 'amenities' : null;
    if (!kind) return;
    const id = Number(key.slice(key.indexOf(':') + 1));
    if (override === null) {
      // Removed on the page: unplot it from the level it was stored on, in that level's layer.
      const storedLevel = kind === 'units' ? storedUnitLevel(map, levels, id) : storedAmenityLevel(map, levels, id);
      if (storedLevel?.id !== level.id) return;
      const record = kind === 'units' ? map.inventory.units.find((row) => row.id === id) : map.inventory.amenities.find((row) => row.id === id);
      const storedSpace: PlanSpace = record && (record.xPlot ?? 0) + (record.yPlot ?? 0) > 0 ? 'raster' : 'svg';
      if (storedSpace === space) payload.pins[kind].push({ id, unplot: true, space });
      return;
    }
    if (override.levelId !== level.id || override.space !== space) return;
    if (space === 'svg') {
      const target = state.svgDocs[level.id];
      const found = target?.status === 'ready' && override.polygon ? target.doc.targets.find((row) => row.key === override.polygon) : null;
      payload.pins[kind].push({
        id,
        pointer: { x_plot: round(override.x), y_plot: round(override.y), tag: null, id: found?.rawId ?? override.polygon, selector: found?.selector ?? null }
      });
    } else {
      payload.pins[kind].push({ id, x: Math.round(override.x), y: Math.round(override.y) });
    }
  });
  if (space === 'raster') {
    const iconLevelOf = (key: string): string | null => {
      const id = Number(key.slice(2));
      if (key.startsWith('e:')) {
        const elevator = map.graph.elevators.find((row) => row.id === id);
        return elevator && (elevator.floorplateId === level.recordId || elevator.floors.some((floor) => level.floors.includes(floor))) ? level.id : null;
      }
      if (key.startsWith('b:')) {
        const point = map.graph.buildingStartingPoints.find((row) => row.id === id);
        return point && (level.kind === 'sitemap' || level.floors.includes(point.floor ?? 1)) ? level.id : null;
      }
      if (key.startsWith('d:')) {
        const door = map.graph.doors.find((row) => row.id === id);
        if (!door) return null;
        if (door.attachedWithType === parentType && door.attachedWithId === level.recordId) return level.id;
        if (door.attachedWithType === 'Unit') return storedUnitLevel(map, levels, door.attachedWithId)?.id ?? null;
        if (door.attachedWithType === 'Amenity') return storedAmenityLevel(map, levels, door.attachedWithId)?.id ?? null;
        return null;
      }
      return null;
    };
    const group = (key: string): 'elevators' | 'building_starting_points' | 'doors' | null => (key.startsWith('e:') ? 'elevators' : key.startsWith('b:') ? 'building_starting_points' : key.startsWith('d:') ? 'doors' : null);
    Object.entries(state.nodeOverrides).forEach(([key, at]) => {
      if (key === 's:tour') {
        if (tourStartLevel(map, levels)?.id === level.id) payload.pins.tour_start = { x: Math.round(at.x - offset), y: Math.round(at.y - offset) };
        return;
      }
      const kind = group(key);
      if (!kind || iconLevelOf(key) !== level.id || state.hiddenNodes.includes(key)) return;
      payload.pins[kind].push({ id: Number(key.slice(2)), x: Math.round(at.x - offset), y: Math.round(at.y - offset) });
    });
    state.hiddenNodes.forEach((key) => {
      const kind = group(key);
      if (!kind || iconLevelOf(key) !== level.id) return;
      payload.pins[kind].push({ id: Number(key.slice(2)), unplot: true });
    });
  }

  // Additional stops added on the page.
  state.tempStops
    .filter((stop) => stop.levelId === level.id && (stop.space ?? 'raster') === space)
    .forEach((stop) => payload.stops.create.push(stopCreate(stop, offset)));

  return payload;
};

const stopCreate = (stop: TempStop, offset: number): StopCreate => {
  const type = stopTypeOf(stop.type);
  const icon = ICON_STOP_KINDS.has(stop.type);
  return {
    temp_key: stop.key,
    kind: stop.type,
    name: stop.name,
    x: stop.x == null ? null : round(stop.x - (icon ? offset : 0)),
    y: stop.y == null ? null : round(stop.y - (icon ? offset : 0)),
    floor: stop.floorOnly,
    building: stop.building,
    note: stop.note,
    floors: type.vertical ? stop.floors : '',
    accessible: type.vertical ? stop.accessible : true,
    lock_provider: type.gate && stop.lock ? 'Manual' : ''
  };
};

const storedUnitLevel = (map: PropertyMap, levels: MapLevel[], id: number): MapLevel | null => {
  const unit = map.inventory.units.find((row) => row.id === id);
  if (!unit) return null;
  return unit.floorplateId != null ? (levels.find((row) => row.kind === 'floorplate' && row.recordId === unit.floorplateId) ?? null) : (levels.find((row) => row.kind === 'sitemap') ?? null);
};

const storedAmenityLevel = (map: PropertyMap, levels: MapLevel[], id: number): MapLevel | null => {
  const amenity = map.inventory.amenities.find((row) => row.id === id);
  if (!amenity) return null;
  if (amenity.ownerType === 'Floorplate') return levels.find((row) => row.kind === 'floorplate' && row.recordId === amenity.ownerId) ?? null;
  if (amenity.ownerType === 'Sitemap') return levels.find((row) => row.kind === 'sitemap') ?? null;
  return null;
};

const tourStartLevel = (map: PropertyMap, levels: MapLevel[]): MapLevel | null => {
  const tour = map.graph.tour;
  if (!tour) return null;
  const allFloors = levels.flatMap((row) => row.floors);
  const startFloor = tour.startingFloor ?? (allFloors.length ? Math.min(...allFloors) : null);
  return levels.find((row) => row.kind === 'sitemap' || (startFloor != null && row.floors.includes(startFloor))) ?? levels[0] ?? null;
};

/** The level's state once its saves landed: the saved overrides go, the stored map (reloaded) carries them. */
export const clearSavedLevel = (state: LocalMapState, level: MapLevel, map: PropertyMap, levels: MapLevel[]): Partial<LocalMapState> => {
  const parentType = level.kind === 'floorplate' ? 'Floorplate' : 'Sitemap';
  const storedIds = new Set(map.graph.hallways.filter((row) => row.parentType === parentType && row.parentId === level.recordId).map((row) => row.id));
  const onLevelStored = (key: string) => key.startsWith('h:') && storedIds.has(Number(key.slice(2)));
  const tempKeys = new Set(state.tempNodes.filter((node) => node.levelId === level.id).map((node) => node.key));
  const iconOnLevel = (key: string) => key === 's:tour' || key.startsWith('e:') || key.startsWith('b:') || key.startsWith('d:');
  const pinOnLevel = (key: string, override: LocalMapState['pinOverrides'][string]) => {
    if (override) return override.levelId === level.id;
    const id = Number(key.slice(key.indexOf(':') + 1));
    const stored = key.startsWith('unit:') ? storedUnitLevel(map, levels, id) : storedAmenityLevel(map, levels, id);
    return stored?.id === level.id;
  };
  return {
    tempNodes: state.tempNodes.filter((node) => node.levelId !== level.id),
    tempEdges: state.tempEdges.filter((edge) => !tempKeys.has(edge.a) && !tempKeys.has(edge.b) && !onLevelStored(edge.a) && !onLevelStored(edge.b)),
    nodeOverrides: Object.fromEntries(Object.entries(state.nodeOverrides).filter(([key]) => !onLevelStored(key) && !iconOnLevel(key))),
    hiddenNodes: state.hiddenNodes.filter((key) => !onLevelStored(key) && !iconOnLevel(key)),
    hiddenEdges: state.hiddenEdges.filter((key) => {
      const [a, b] = key.split('|');
      return !(onLevelStored(a) && onLevelStored(b));
    }),
    wfLinks: Object.fromEntries(Object.entries(state.wfLinks).filter(([key]) => !key.startsWith(`${level.id}|`))),
    wfPlaces: Object.fromEntries(Object.entries(state.wfPlaces).filter(([key]) => !key.startsWith(`${level.id}|`))),
    tempStops: state.tempStops.filter((stop) => stop.levelId !== level.id),
    // Unit / amenity pins are not saved while PLOTTING_SAVE is off, so a save must leave them on the page.
    pinOverrides: PLOTTING_SAVE ? Object.fromEntries(Object.entries(state.pinOverrides).filter(([key, override]) => !pinOnLevel(key, override))) : state.pinOverrides,
    wfEdited: Object.fromEntries(Object.entries(state.wfEdited).filter(([key]) => key !== level.id)),
    wfUndo: [],
    wfDetect: null,
    wfSel: null,
    wfSelEdge: null,
    wfSelLink: null,
    wfFrom: null,
    wfRoute: null,
    wfAnim: null
  };
};

/** The layer the level's save goes to by default (for the Save button's label). */
export const saveSpaceOf = (level: MapLevel, state: LocalMapState): PlanSpace => wayfindingSpace(level, state) ?? 'raster';
