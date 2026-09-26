import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { levelDims, levelForAmenity, levelForUnit, type MapLevel } from './mapLevels.generator';
import {
  AMENITY_COLOR,
  DEFAULT_BED_COLORS,
  NODE_ANCHOR_OFFSET,
  bedTierOf,
  edgeKey,
  nodeKey,
  pinKey,
  toPercent,
  type BedTier,
  type LocalMapState,
  type NodeKind,
  type PinKind,
  type PinRef
} from './mapState';
import { M, bedsLabel } from './mapText';

/**
 * What one level draws, from the stored records and the page's local state.
 * Positions are the level's pixels (`x`/`y`, centre of the marker) and their
 * percentage of the level's image (`xPct`/`yPct`), which is what the canvas
 * lays out with.
 */

export interface LevelPin {
  ref: PinRef;
  key: string;
  kind: PinKind;
  label: string;
  x: number;
  y: number;
  xPct: number;
  yPct: number;
  color: string;
  /** Placed on this page (a temporary pin), or a stored pin moved on this page. */
  temporary: boolean;
  moved: boolean;
  tourStop: boolean;
  /** Positioned by the SVG pointer, in the floor SVG's user units rather than the raster's pixels. */
  svgSpace: boolean;
  beds: number | null;
}

export interface LevelNode {
  key: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  xPct: number;
  yPct: number;
  temporary: boolean;
  moved: boolean;
  /** A stored node's centre as the CMS holds it (for the "moved" note). */
  stored: { x: number; y: number } | null;
  isStart: boolean;
  /** The floors an elevator serves. */
  floors: number[];
  building: string | null;
}

export interface LevelEdge {
  key: string;
  a: string;
  b: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  temporary: boolean;
}

export interface LevelGraph {
  level: MapLevel;
  dims: { w: number; h: number } | null;
  pins: LevelPin[];
  nodes: LevelNode[];
  edges: LevelEdge[];
}

/** Every unit or amenity that can be placed on a map, with where it is now. */
export interface PinItem {
  ref: PinRef;
  key: string;
  kind: PinKind;
  label: string;
  /** Where the item is plotted, else where its floor says it belongs. */
  level: MapLevel | null;
  placed: boolean;
  temporary: boolean;
  beds: number | null;
  category: string | null;
  floor: number | null;
  building: string | null;
  tourStop: boolean;
  color: string;
}

export const bedColorsOf = (map: PropertyMap, state: LocalMapState): Record<BedTier, string> => {
  const colors = { ...DEFAULT_BED_COLORS };
  // The CMS has a per-bedroom colour table; where a row exists it is the real
  // marker colour, and the design's palette fills the rest.
  map.graph.bedroomMarkerColors.forEach((row) => {
    if (row.availableUnitsColor) colors[bedTierOf(row.bedroom)] = row.availableUnitsColor;
  });
  return { ...colors, ...state.bedColors };
};

export const unitLabel = (unit: InventoryUnit): string =>
  unit.displayName ?? unit.marketingName ?? unit.providerUnitId ?? `#${unit.id}`;

export const unitBeds = (map: PropertyMap, unit: InventoryUnit): number | null =>
  unit.floorplanId != null ? (map.inventory.floorplans.find((plan) => plan.id === unit.floorplanId)?.bedrooms ?? null) : null;

/** Amenities that belong on a map: unplaced, or plotted on a floorplate or the sitemap (not interior images). */
export const mapAmenities = (map: PropertyMap): InventoryAmenity[] =>
  map.inventory.amenities.filter((amenity) => amenity.ownerType == null || amenity.ownerType === 'Floorplate' || amenity.ownerType === 'Sitemap');

interface Placement {
  level: MapLevel | null;
  x: number;
  y: number;
  space: 'raster' | 'svg';
  temporary: boolean;
  moved: boolean;
}

/** A stored pin's own position: raster pixels, else the SVG pointer. */
const storedPlacement = (
  levels: MapLevel[],
  record: { xPlot: number | null; yPlot: number | null; svgPointer: { xPlot: number; yPlot: number } | null },
  level: MapLevel | null
): Omit<Placement, 'temporary' | 'moved'> | null => {
  if (!level) return null;
  if (record.xPlot != null && record.yPlot != null) return { level, x: record.xPlot, y: record.yPlot, space: 'raster' };
  if (record.svgPointer) return { level, x: record.svgPointer.xPlot, y: record.svgPointer.yPlot, space: 'svg' };
  return null;
};

const withOverride = (
  levels: MapLevel[],
  state: LocalMapState,
  ref: PinRef,
  stored: Omit<Placement, 'temporary' | 'moved'> | null
): Placement | null => {
  const override = state.pinOverrides[pinKey(ref)];
  if (override === null) return null;
  if (override) {
    const level = levels.find((row) => row.id === override.levelId) ?? null;
    return { level, x: override.x, y: override.y, space: 'raster', temporary: !stored, moved: !!stored };
  }
  return stored ? { ...stored, temporary: false, moved: false } : null;
};

/** Where a unit is right now: the page's override first, else the CMS (its floorplate, or the sitemap). */
export const placementOfUnit = (levels: MapLevel[], state: LocalMapState, unit: InventoryUnit): Placement | null => {
  const level =
    unit.floorplateId != null
      ? (levels.find((row) => row.kind === 'floorplate' && row.recordId === unit.floorplateId) ?? null)
      : (levels.find((row) => row.kind === 'sitemap') ?? null);
  return withOverride(levels, state, { kind: 'unit', id: unit.id }, storedPlacement(levels, unit, level));
};

export const placementOfAmenity = (levels: MapLevel[], state: LocalMapState, amenity: InventoryAmenity): Placement | null => {
  const level =
    amenity.ownerType === 'Floorplate'
      ? (levels.find((row) => row.kind === 'floorplate' && row.recordId === amenity.ownerId) ?? null)
      : amenity.ownerType === 'Sitemap'
        ? (levels.find((row) => row.kind === 'sitemap') ?? null)
        : null;
  return withOverride(levels, state, { kind: 'amenity', id: amenity.id }, storedPlacement(levels, amenity, level));
};

/** Where a pin is right now, looked up by reference. Null when unplotted. */
export const pinPlacement = (map: PropertyMap, levels: MapLevel[], state: LocalMapState, ref: PinRef): Placement | null => {
  if (ref.kind === 'unit') {
    const unit = map.inventory.units.find((row) => row.id === ref.id);
    return unit ? placementOfUnit(levels, state, unit) : null;
  }
  const amenity = map.inventory.amenities.find((row) => row.id === ref.id);
  return amenity ? placementOfAmenity(levels, state, amenity) : null;
};

export const generatePinItems = (map: PropertyMap, levels: MapLevel[], state: LocalMapState): PinItem[] => {
  const colors = bedColorsOf(map, state);
  const stopIds = new Set(
    map.graph.tourStops.filter((stop) => stop.displayStop).map((stop) => `${stop.stopType}:${stop.stopId}`)
  );

  const units = map.inventory.units.map((unit): PinItem => {
    const ref = { kind: 'unit' as const, id: unit.id };
    const placement = placementOfUnit(levels, state, unit);
    const beds = unitBeds(map, unit);
    return {
      ref,
      key: pinKey(ref),
      kind: 'unit',
      label: unitLabel(unit),
      level: placement?.level ?? levelForUnit(levels, unit),
      placed: !!placement,
      temporary: !!placement?.temporary,
      beds,
      category: null,
      floor: unit.floor,
      building: unit.building,
      tourStop: stopIds.has(`unit:${unit.id}`),
      color: colors[bedTierOf(beds)]
    };
  });

  const amenities = mapAmenities(map).map((amenity): PinItem => {
    const ref = { kind: 'amenity' as const, id: amenity.id };
    const placement = placementOfAmenity(levels, state, amenity);
    return {
      ref,
      key: pinKey(ref),
      kind: 'amenity',
      label: amenity.name,
      level: placement?.level ?? levelForAmenity(levels, amenity),
      placed: !!placement,
      temporary: !!placement?.temporary,
      beds: null,
      category: amenity.category,
      floor: amenity.floor,
      building: amenity.building,
      tourStop: stopIds.has(`amenity:${amenity.id}`),
      color: AMENITY_COLOR
    };
  });

  return [...units, ...amenities];
};

const pct = (value: number, dim: number | undefined): number => (dim ? toPercent(value, dim) : 0);

/** The stored centre of a legacy icon node (its x/y is the icon's top-left). */
const iconCentre = (x: number | null, y: number | null): { x: number; y: number } | null =>
  x == null || y == null || (x <= 0 && y <= 0) ? null : { x: x + NODE_ANCHOR_OFFSET, y: y + NODE_ANCHOR_OFFSET };

/**
 * The level's nodes: its stored hallways, the elevators serving one of its
 * floors (the legacy `fetch_elevators(floor)`), the building entry/exit
 * points on its floors, the tour's starting point on the starting floor, the
 * doors of the units and amenities plotted on it, and the page's temporary
 * junctions. Hidden nodes are left out; moved ones carry their stored centre.
 */
export const generateLevelGraph = (map: PropertyMap, levels: MapLevel[], level: MapLevel, state: LocalMapState): LevelGraph => {
  const { graph, inventory } = map;
  const dims = levelDims(level, state);
  const svgDims = level.svgWidth && level.svgHeight ? { w: level.svgWidth, h: level.svgHeight } : dims;
  const hidden = new Set(state.hiddenNodes);
  const hiddenEdges = new Set(state.hiddenEdges);
  const colors = bedColorsOf(map, state);
  const stopIds = new Set(graph.tourStops.filter((stop) => stop.displayStop).map((stop) => `${stop.stopType}:${stop.stopId}`));
  const startKeys = new Set(Object.values(state.startOverrides));
  const nodes: LevelNode[] = [];

  const place = (key: string, kind: NodeKind, label: string, stored: { x: number; y: number } | null, extra: Partial<LevelNode> = {}) => {
    if (hidden.has(key)) return;
    const override = state.nodeOverrides[key];
    const at = override ?? stored;
    if (!at) return;
    nodes.push({
      key,
      kind,
      label,
      x: at.x,
      y: at.y,
      xPct: pct(at.x, dims?.w),
      yPct: pct(at.y, dims?.h),
      temporary: kind === 'junction',
      moved: !!override && !!stored,
      stored,
      isStart: startKeys.has(key),
      floors: [],
      building: null,
      ...extra
    });
  };

  const parentType = level.kind === 'floorplate' ? 'Floorplate' : 'Sitemap';
  graph.hallways
    .filter((hallway) => hallway.parentType === parentType && hallway.parentId === level.recordId)
    .forEach((hallway) =>
      place(nodeKey('hallway', hallway.id), 'hallway', `#${hallway.id}`, iconCentre(hallway.xPlot, hallway.yPlot))
    );

  state.tempNodes
    .filter((node) => node.levelId === level.id)
    .forEach((node) => place(node.key, 'junction', node.label, { x: node.x, y: node.y }));

  graph.elevators
    .filter((elevator) =>
      level.kind === 'sitemap'
        ? elevator.sitemapId === level.recordId || (elevator.floorplateId == null && elevator.sitemapId == null)
        : elevator.floors.some((floor) => level.floors.includes(floor)) || elevator.floorplateId === level.recordId
    )
    .forEach((elevator) =>
      place(nodeKey('elevator', elevator.id), 'elevator', elevator.name ?? i18n.t(M.selection.elevator), iconCentre(elevator.xPlot, elevator.yPlot), {
        floors: elevator.floors,
        building: elevator.building
      })
    );

  graph.buildingStartingPoints
    .filter((point) => level.kind === 'sitemap' || level.floors.includes(point.floor ?? 1))
    .forEach((point) =>
      place(
        nodeKey('startingPoint', point.id),
        'startingPoint',
        point.name ?? `${point.building ?? ''} ${i18n.t(M.selection.startingPoint)}`.trim(),
        iconCentre(point.xPlot, point.yPlot),
        { building: point.building, isStart: true }
      )
    );

  const tour = graph.tour;
  if (tour && tour.xPlot + tour.yPlot > 0) {
    const startFloor = tour.startingFloor ?? Math.min(...levels.flatMap((row) => row.floors), Number.POSITIVE_INFINITY);
    const onThisLevel = level.kind === 'sitemap' || level.floors.includes(startFloor) || (levels[0]?.id === level.id && !Number.isFinite(startFloor));
    if (onThisLevel) {
      place(nodeKey('tourStart', 'tour'), 'tourStart', tour.name ?? i18n.t(M.starts.tourStart), iconCentre(tour.xPlot, tour.yPlot), {
        building: tour.building,
        isStart: true
      });
    }
  }

  // Pins: units plotted on this floorplate (or on the sitemap), amenities it owns, and temporary placements.
  const pins: LevelPin[] = [];
  const pushPin = (ref: PinRef, placement: Placement | null, label: string, beds: number | null, color: string, tourStop: boolean) => {
    if (!placement || placement.level?.id !== level.id) return;
    const space = placement.space === 'svg' ? svgDims : dims;
    pins.push({
      ref,
      key: pinKey(ref),
      kind: ref.kind,
      label,
      x: placement.x,
      y: placement.y,
      xPct: pct(placement.x, space?.w),
      yPct: pct(placement.y, space?.h),
      color,
      temporary: placement.temporary,
      moved: placement.moved,
      tourStop,
      svgSpace: placement.space === 'svg',
      beds
    });
  };
  inventory.units.forEach((unit) => {
    const beds = unitBeds(map, unit);
    pushPin({ kind: 'unit', id: unit.id }, placementOfUnit(levels, state, unit), unitLabel(unit), beds, colors[bedTierOf(beds)], stopIds.has(`unit:${unit.id}`));
  });
  mapAmenities(map).forEach((amenity) =>
    pushPin({ kind: 'amenity', id: amenity.id }, placementOfAmenity(levels, state, amenity), amenity.name, null, AMENITY_COLOR, stopIds.has(`amenity:${amenity.id}`))
  );

  // Doors of the pins on this level, and the map's access points.
  const pinIds = { Unit: new Set(pins.filter((pin) => pin.kind === 'unit').map((pin) => pin.ref.id)), Amenity: new Set(pins.filter((pin) => pin.kind === 'amenity').map((pin) => pin.ref.id)) };
  graph.doors
    .filter((door) => {
      if (door.attachedWithType === 'Unit') return pinIds.Unit.has(door.attachedWithId);
      if (door.attachedWithType === 'Amenity') return pinIds.Amenity.has(door.attachedWithId);
      return door.attachedWithType === parentType && door.attachedWithId === level.recordId;
    })
    .forEach((door) => place(nodeKey('door', door.id), 'door', door.name ?? i18n.t(M.selection.door), iconCentre(door.xPlot, door.yPlot)));

  const byKey = new Map(nodes.map((node) => [node.key, node]));
  const edges: LevelEdge[] = [];
  const pushEdge = (a: string, b: string, temporary: boolean) => {
    const na = byKey.get(a);
    const nb = byKey.get(b);
    if (!na || !nb) return;
    const key = edgeKey(a, b);
    if (hiddenEdges.has(key) || edges.some((edge) => edge.key === key)) return;
    edges.push({ key, a, b, x1: na.xPct, y1: na.yPct, x2: nb.xPct, y2: nb.yPct, temporary });
  };
  graph.hallways.forEach((hallway) =>
    hallway.nextPoints.forEach((next) => pushEdge(nodeKey('hallway', hallway.id), nodeKey('hallway', next), false))
  );
  state.tempEdges.forEach((edge) => pushEdge(edge.a, edge.b, true));

  return { level, dims, pins, nodes, edges };
};

/** Every level's graph, keyed by level id (cross-floor panels read this). */
export const generateAllGraphs = (map: PropertyMap, levels: MapLevel[], state: LocalMapState): Record<string, LevelGraph> =>
  Object.fromEntries(levels.map((level) => [level.id, generateLevelGraph(map, levels, level, state)]));

export const pinMeta = (map: PropertyMap, item: PinItem): string =>
  item.kind === 'unit'
    ? `${bedsLabel(item.beds)}${item.floor != null ? ` · ${i18n.t(M.level.floor).replace('{floor}', String(item.floor))}` : ''}`
    : `${i18n.t(M.place.amenity)}${item.category ? ` · ${item.category}` : ''}`;

export { unitLabel as labelOfUnit };
export type { PropertyMap };
