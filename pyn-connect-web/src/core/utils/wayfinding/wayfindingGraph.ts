import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import type { MapDoor, PropertyMap } from '~/core/models/data/propertyMap.data';
import { planAssets, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { labelOfUnit, mapAmenities, placementOfAmenity, placementOfUnit, type LevelGraph, type Placement } from '~/core/utils/generator/map/mapNodes.generator';
import { NODE_ANCHOR_OFFSET, distance, toPercent, type LocalMapState, type TempStop } from '~/core/utils/generator/map/mapState';
import { M } from '~/core/utils/generator/map/mapText';
import { stopTypeOf, type StopTypeId } from './stopTypes';

/**
 * The wayfinding view of one floorplate, built from what the CMS stores and
 * what the page changed:
 *
 *   - **points** are the hallway nodes (`hallways`, in the floor image's
 *     pixels) plus the points added on the page; **paths** are their links
 *     (`next_points`, stored one way and walked both ways) plus the page's;
 *   - **stops** are the records a self-tour route can start, end or change
 *     floor at: elevators (`elevators`, one position on every floor of
 *     `floorplate_covering_range`), the building entry / exit
 *     (`building_starting_points`), the tour's own start (`tours`), the
 *     floorplate's access points (`doors` attached to it), and the stops
 *     added on the page;
 *   - **anchors** are what a route can be asked to reach: the plotted units
 *     and amenities (at their door when they have one, as the CMS routes
 *     them) and the placed stops, blockers excepted.
 *
 * A stop joins the paths at its nearest point — the CMS's own rule
 * (`ShortestPath#get_unit_data`, `get_elevator_data`,
 * `get_starting_point_data`: the closest hallway, no distance limit) —
 * unless it was linked to a point by hand on this page. It counts as linked
 * when that point has at least one path.
 *
 * A floorplate whose `range` covers several floors is one layout shared by
 * the stack: its points and paths are the same on every floor, while a unit
 * belongs to its own floor (`units.floor`), an entry point to its `floor`,
 * an elevator to the floors it serves, and an access point or amenity
 * without a floor to all of them.
 */

export interface WfPoint {
  key: string;
  x: number;
  y: number;
  xPct: number;
  yPct: number;
  degree: number;
  temporary: boolean;
  moved: boolean;
}

export interface WfPath {
  key: string;
  a: string;
  b: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  temporary: boolean;
}

export type WfStopSource = 'elevator' | 'entry' | 'tourStart' | 'door' | 'temp';

/** A stop of the floorplate, stored or added on the page, placed or not. */
export interface WfStop {
  key: string;
  type: StopTypeId;
  source: WfStopSource;
  label: string;
  levelId: string;
  /** The floors of this floorplate it applies to; null = all of them. */
  floors: number[] | null;
  /** Its centre on the floor image (stored positions are an icon's top-left; the centre is +8 px, as the legacy map draws it). */
  x: number | null;
  y: number | null;
  xPct: number;
  yPct: number;
  placed: boolean;
  temporary: boolean;
  moved: boolean;
  building: string | null;
  /** Elevators and stairs: the floors they serve. */
  served: number[];
}

export type WfAnchorKind = 'unit' | 'amenity' | 'stop';

export interface WfAnchor {
  key: string;
  kind: WfAnchorKind;
  type: StopTypeId | null;
  label: string;
  meta: string;
  floors: number[] | null;
  /** Where the anchor joins the paths: its door, else its pin, else the stop's marker (image pixels); null when it has no place on the floor image. */
  x: number | null;
  y: number | null;
  /** Plotted only on the floor SVG, whose frame the floor image does not share. */
  svgOnly: boolean;
  attached: string | null;
  linked: boolean;
  /** Linked by hand on this page (Connect), rather than to the nearest point. */
  explicit: boolean;
  /** The door the anchor joins the paths from (`d:<id>`), when it has one. */
  door: string | null;
}

export interface WfPlate {
  level: MapLevel;
  dims: { w: number; h: number } | null;
  /** The floor image the CMS draws hallways on. */
  hasImage: boolean;
  points: WfPoint[];
  paths: WfPath[];
  stops: WfStop[];
  anchors: WfAnchor[];
  /** Placed blockers: routes avoid the area around them. */
  blockers: WfStop[];
}

export type WfProgressState = 'noplan' | 'none' | 'partial' | 'done';

export interface WfProgress {
  state: WfProgressState;
  pct: number;
  linked: number;
  total: number;
}

const iconCentre = (x: number | null, y: number | null): { x: number; y: number } | null =>
  x == null || y == null || (x <= 0 && y <= 0) ? null : { x: x + NODE_ANCHOR_OFFSET, y: y + NODE_ANCHOR_OFFSET };

/** "1-12", "Lobby–12", "1, 3, 5": the floors a vertical stop serves ("Lobby" / "Ground" read as 1, like the design). */
export const parseServedFloors = (text: string): number[] | null => {
  const value = text.trim();
  if (!value) return [];
  const floorOf = (part: string): number | null => {
    const token = part.trim();
    if (/^(lobby|ground|main|l|g)$/i.test(token)) return 1;
    return /^-?\d+$/.test(token) ? Number(token) : null;
  };
  const out: number[] = [];
  for (const piece of value.split(',')) {
    const part = piece.trim();
    if (!part) return null;
    const range = /^(-?\w+)\s*[-–]\s*(-?\w+)$/.exec(part);
    if (range) {
      const from = floorOf(range[1]);
      const to = floorOf(range[2]);
      if (from == null || to == null || to < from || to - from > 200) return null;
      for (let floor = from; floor <= to; floor += 1) out.push(floor);
      continue;
    }
    const one = floorOf(part);
    if (one == null) return null;
    out.push(one);
  }
  return [...new Set(out)].sort((a, b) => a - b);
};

/**
 * The stored unit / amenity raster pin, or the page's raster placement. An
 * SVG placement has no place on the floor image; the record's door (stored
 * on the image) still has, and is where the CMS routes to.
 */
const rasterOf = (placement: Placement, record: { xPlot: number | null; yPlot: number | null }): { x: number; y: number } | null => {
  if (placement.space === 'raster') return { x: placement.x, y: placement.y };
  if (!placement.moved && !placement.temporary && record.xPlot != null && record.yPlot != null && record.xPlot + record.yPlot > 0) {
    return { x: record.xPlot, y: record.yPlot };
  }
  return null;
};

const firstDoor = (doors: MapDoor[], type: 'Unit' | 'Amenity', id: number): MapDoor | null =>
  doors
    .filter((door) => door.attachedWithType === type && door.attachedWithId === id)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id)[0] ?? null;

/** A door's centre after the page's moves, or null when it has no position or was removed here. */
const doorCentre = (door: MapDoor | null, state: LocalMapState): { x: number; y: number } | null => {
  if (!door) return null;
  const key = `d:${door.id}`;
  if (state.hiddenNodes.includes(key)) return null;
  return state.nodeOverrides[key] ?? iconCentre(door.xPlot, door.yPlot);
};

const onFloor = (floors: number[] | null, floor: number | null): boolean => floor == null || floors == null || floors.includes(floor);

/**
 * The floors of this level a record applies to: some floors of a stack, or
 * null — a single floor, a record with no floor, or one serving every floor
 * of the stack (an elevator that covers the whole range is a shared stop).
 */
const floorsOn = (level: MapLevel, floors: (number | null)[]): number[] | null => {
  if (level.floors.length <= 1) return null;
  const own = [...new Set(floors.filter((floor): floor is number => floor != null && level.floors.includes(floor)))];
  return own.length && own.length < level.floors.length ? own : null;
};

export const tempStopsOf = (state: LocalMapState, level: MapLevel): TempStop[] => state.tempStops.filter((stop) => stop.levelId === level.id);

/**
 * A record named for another floorplate's building is that building's: the
 * CMS routes each building with its own elevators and its own entry / exit
 * (`Elevator.fetch_elevator_according_to_building`,
 * `building_starting_points.building`). A building the floorplates do not
 * name (the units' own building names) says nothing about the floorplate.
 */
const belongsElsewhere = (building: string | null, level: MapLevel, levels: MapLevel[]): boolean =>
  !!building && !!level.building && building !== level.building && levels.some((row) => row.building === building);

/**
 * Every stop of a level: stored elevators, entry / exit points, the tour
 * start and access points (positioned from the raster graph, so the page's
 * moves and removals apply), and the stops added on the page.
 */
export const levelStops = (map: PropertyMap, levels: MapLevel[], level: MapLevel, graph: LevelGraph | null, state: LocalMapState): WfStop[] => {
  const { graph: stored } = map;
  const dims = graph?.dims ?? null;
  const pct = (value: number | null, dim: number | undefined) => (value == null || !dim ? 0 : toPercent(value, dim));
  const nodeAt = (key: string) => graph?.nodes.find((node) => node.key === key) ?? null;
  const parentType = level.kind === 'floorplate' ? 'Floorplate' : 'Sitemap';
  const out: WfStop[] = [];

  const push = (stop: Omit<WfStop, 'xPct' | 'yPct' | 'placed' | 'x' | 'y' | 'moved'>, at: { x: number; y: number } | null, moved: boolean) =>
    out.push({ ...stop, x: at?.x ?? null, y: at?.y ?? null, xPct: pct(at?.x ?? null, dims?.w), yPct: pct(at?.y ?? null, dims?.h), placed: !!at, moved });

  stored.elevators
    .filter((elevator) =>
      level.kind === 'sitemap'
        ? elevator.sitemapId === level.recordId || (elevator.floorplateId == null && elevator.sitemapId == null)
        : (elevator.floors.some((floor) => level.floors.includes(floor)) || elevator.floorplateId === level.recordId) && !belongsElsewhere(elevator.building, level, levels)
    )
    .forEach((elevator) => {
      const key = `e:${elevator.id}`;
      const node = nodeAt(key);
      push(
        {
          key,
          type: 'elevator',
          source: 'elevator',
          label: elevator.name ?? i18n.t(M.selection.elevator),
          levelId: level.id,
          floors: floorsOn(level, elevator.floors),
          temporary: false,
          building: elevator.building,
          served: elevator.floors
        },
        node ? { x: node.x, y: node.y } : null,
        !!node?.moved
      );
    });

  stored.buildingStartingPoints
    .filter((point) => (level.kind === 'sitemap' || level.floors.includes(point.floor ?? 1)) && !belongsElsewhere(point.building, level, levels))
    .forEach((point) => {
      const key = `b:${point.id}`;
      const node = nodeAt(key);
      push(
        {
          key,
          type: 'entry',
          source: 'entry',
          label: point.name ?? i18n.t(M.selection.startingPoint),
          levelId: level.id,
          floors: floorsOn(level, [point.floor ?? 1]),
          temporary: false,
          building: point.building,
          served: []
        },
        node ? { x: node.x, y: node.y } : null,
        !!node?.moved
      );
    });

  const tour = stored.tour;
  if (tour) {
    const allFloors = levels.flatMap((row) => row.floors);
    const startFloor = tour.startingFloor ?? (allFloors.length ? Math.min(...allFloors) : null);
    const here =
      (level.kind === 'sitemap' || (startFloor != null ? level.floors.includes(startFloor) : levels[0]?.id === level.id)) && !belongsElsewhere(tour.building, level, levels);
    if (here) {
      const key = 's:tour';
      const node = nodeAt(key);
      push(
        {
          key,
          type: 'entry',
          source: 'tourStart',
          label: i18n.t(M.starts.tourStart),
          levelId: level.id,
          floors: floorsOn(level, [startFloor]),
          temporary: false,
          building: tour.building,
          served: []
        },
        node ? { x: node.x, y: node.y } : null,
        !!node?.moved
      );
    }
  }

  stored.doors
    .filter((door) => door.attachedWithType === parentType && door.attachedWithId === level.recordId)
    .forEach((door) => {
      const key = `d:${door.id}`;
      const node = nodeAt(key);
      push(
        {
          key,
          type: 'door',
          source: 'door',
          label: door.name ?? i18n.t(M.selection.door),
          levelId: level.id,
          floors: floorsOn(level, [door.floor]),
          temporary: false,
          building: level.building,
          served: []
        },
        node ? { x: node.x, y: node.y } : null,
        !!node?.moved
      );
    });

  tempStopsOf(state, level).forEach((stop) => {
    const type = stopTypeOf(stop.type);
    push(
      {
        key: stop.key,
        type: stop.type,
        source: 'temp',
        label: stop.name,
        levelId: level.id,
        floors: stop.floorOnly != null ? [stop.floorOnly] : null,
        temporary: true,
        building: stop.building,
        served: type.vertical ? (parseServedFloors(stop.floors) ?? []) : []
      },
      stop.x != null && stop.y != null ? { x: stop.x, y: stop.y } : null,
      false
    );
  });

  return out;
};

const unitMeta = (unit: InventoryUnit): string =>
  `${i18n.t(M.place.unit)}${unit.floor != null ? ` · ${i18n.t(M.level.floor).replace('{floor}', String(unit.floor))}` : ''}`;

const amenityMeta = (amenity: InventoryAmenity): string => `${i18n.t(M.place.amenity)}${amenity.category ? ` · ${amenity.category}` : ''}`;

/** The wayfinding view of a level (see the module comment). Pure; recomputed from the stored map and the page's state. */
export const wayfindingPlate = (map: PropertyMap, levels: MapLevel[], level: MapLevel, graph: LevelGraph | null, state: LocalMapState): WfPlate => {
  const dims = graph?.dims ?? null;
  const hasImage = !!planAssets(level, state.planOverrides[level.id]).image;
  const pointNodes = (graph?.nodes ?? []).filter((node) => node.kind === 'hallway' || node.kind === 'junction');
  const pointKeys = new Set(pointNodes.map((node) => node.key));
  const pathEdges = (graph?.edges ?? []).filter((edge) => pointKeys.has(edge.a) && pointKeys.has(edge.b));
  const degree = new Map<string, number>();
  pathEdges.forEach((edge) => {
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
    degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
  });
  const points: WfPoint[] = pointNodes.map((node) => ({
    key: node.key,
    x: node.x,
    y: node.y,
    xPct: node.xPct,
    yPct: node.yPct,
    degree: degree.get(node.key) ?? 0,
    temporary: node.temporary,
    moved: node.moved
  }));
  const paths: WfPath[] = pathEdges.map((edge) => ({ key: edge.key, a: edge.a, b: edge.b, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, temporary: edge.temporary }));
  const byKey = new Map(points.map((point) => [point.key, point]));

  const attach = (key: string, x: number | null, y: number | null): Pick<WfAnchor, 'attached' | 'linked' | 'explicit'> => {
    if (x == null || y == null || !points.length) return { attached: null, linked: false, explicit: false };
    const chosen = state.wfLinks[`${level.id}|${key}`];
    if (chosen && byKey.has(chosen)) return { attached: chosen, linked: (byKey.get(chosen)?.degree ?? 0) > 0, explicit: true };
    let best: WfPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    points.forEach((point) => {
      const d = distance(point.x, point.y, x, y);
      if (d < bestDistance) {
        bestDistance = d;
        best = point;
      }
    });
    const nearest = best as WfPoint | null;
    return { attached: nearest?.key ?? null, linked: !!nearest && nearest.degree > 0, explicit: false };
  };

  const anchors: WfAnchor[] = [];
  map.inventory.units.forEach((unit) => {
    const placement = placementOfUnit(levels, state, unit);
    if (!placement || placement.level?.id !== level.id) return;
    const pin = rasterOf(placement, unit);
    const doorRecord = firstDoor(map.graph.doors, 'Unit', unit.id);
    const door = doorCentre(doorRecord, state);
    const at = door ?? pin;
    const key = `unit:${unit.id}`;
    anchors.push({
      key,
      kind: 'unit',
      type: null,
      label: labelOfUnit(unit),
      meta: unitMeta(unit),
      floors: unit.floor != null && level.floors.length > 1 ? [unit.floor] : null,
      x: at?.x ?? null,
      y: at?.y ?? null,
      svgOnly: !at,
      door: door && doorRecord ? `d:${doorRecord.id}` : null,
      ...attach(key, at?.x ?? null, at?.y ?? null)
    });
  });
  mapAmenities(map).forEach((amenity) => {
    const placement = placementOfAmenity(levels, state, amenity);
    if (!placement || placement.level?.id !== level.id) return;
    const pin = rasterOf(placement, amenity);
    const doorRecord = firstDoor(map.graph.doors, 'Amenity', amenity.id);
    const door = doorCentre(doorRecord, state);
    const at = door ?? pin;
    const key = `amenity:${amenity.id}`;
    anchors.push({
      key,
      kind: 'amenity',
      type: null,
      label: amenity.name,
      meta: amenityMeta(amenity),
      floors: amenity.floor != null && level.floors.length > 1 ? [amenity.floor] : null,
      x: at?.x ?? null,
      y: at?.y ?? null,
      svgOnly: !at,
      door: door && doorRecord ? `d:${doorRecord.id}` : null,
      ...attach(key, at?.x ?? null, at?.y ?? null)
    });
  });

  const stops = levelStops(map, levels, level, graph, state);
  stops
    .filter((stop) => stop.placed && !stopTypeOf(stop.type).block)
    .forEach((stop) =>
      anchors.push({
        key: stop.key,
        kind: 'stop',
        type: stop.type,
        label: stop.label,
        meta: i18n.t(stopTypeOf(stop.type).label),
        floors: stop.floors,
        x: stop.x,
        y: stop.y,
        svgOnly: false,
        door: null,
        ...attach(stop.key, stop.x, stop.y)
      })
    );

  return {
    level,
    dims,
    hasImage,
    points,
    paths,
    stops,
    anchors,
    blockers: stops.filter((stop) => stop.placed && stopTypeOf(stop.type).block)
  };
};

/** The anchors of one floor of the plate (all of them on a single floor, or with `floor` null). */
export const anchorsOnFloor = (plate: WfPlate, floor: number | null): WfAnchor[] => plate.anchors.filter((anchor) => onFloor(anchor.floors, floor));

export const stopsOnFloor = (plate: WfPlate, floor: number | null): WfStop[] => plate.stops.filter((stop) => onFloor(stop.floors, floor));

/**
 * Wayfinding progress, as the design's floorplate cards and floor buttons
 * show it: "No plan" without a floor image, "Not started" without points,
 * "Complete" when every anchor on the floor is linked, else "Incomplete".
 */
export const plateProgress = (plate: WfPlate, floor: number | null): WfProgress => {
  if (!plate.hasImage) return { state: 'noplan', pct: 0, linked: 0, total: 0 };
  const anchors = anchorsOnFloor(plate, floor);
  const linked = anchors.filter((anchor) => anchor.linked).length;
  if (!plate.points.length) return { state: 'none', pct: 0, linked, total: anchors.length };
  if (linked === anchors.length) return { state: 'done', pct: 100, linked, total: anchors.length };
  return { state: 'partial', pct: Math.max(8, Math.round((linked / anchors.length) * 100)), linked, total: anchors.length };
};

/** The distance around a blocker that routes keep clear of: the design's 30 units of its 760-unit plan, scaled to this floor image. */
export const blockerRadius = (dims: { w: number; h: number } | null): number => (dims ? (Math.max(dims.w, dims.h) * 30) / 760 : 30);

/** The shortest distance from a point to a segment. */
export const segmentDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
