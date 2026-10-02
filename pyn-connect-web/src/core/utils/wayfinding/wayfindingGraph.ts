import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import type { MapDoor, PropertyMap } from '~/core/models/data/propertyMap.data';
import { wayfindingSpace, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { labelOfUnit, mapAmenities, placementOfAmenity, placementOfUnit, type LevelGraph, type Placement } from '~/core/utils/generator/map/mapNodes.generator';
import { NODE_ANCHOR_OFFSET, distance, toPercent, type LocalMapState, type PlanSpace, type TempStop } from '~/core/utils/generator/map/mapState';
import { M } from '~/core/utils/generator/map/mapText';
import type { EdgeKind, ExtractionSource, ReviewStatus } from './hallways/types';
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
 * unless it was linked to a point by hand on this page, or its bridge was
 * removed by hand (then it joins nothing until linked again). It counts as
 * linked when that point has at least one path.
 *
 * A floorplate whose `range` covers several floors is one layout shared by
 * the stack: its points and paths are the same on every floor, while a unit
 * belongs to its own floor (`units.floor`), an entry point to its `floor`,
 * an elevator to the floors it serves, and an access point or amenity
 * without a floor to all of them.
 *
 * Everything is in the level's Wayfinding layer (`wayfindingSpace`): the
 * floor image's pixels, or — for a floor whose hallways were detected from
 * its SVG, or one with only an SVG — the SVG's viewBox units, where the
 * units plotted on polygons sit and the image-only records (stored
 * elevators, entries, doors) have no place.
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
  source: ExtractionSource;
  review: ReviewStatus;
  confidence: number | null;
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
  /** The polyline from `a` to `b`, both ends included, in the layer's units. */
  points: { x: number; y: number }[];
  /** Its length along the polyline: the routing weight. */
  length: number;
  kind: EdgeKind;
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
  /**
   * Where the anchor joins the paths (the bridge and a route meet it here):
   * on the floor image its door, else its pin, else the stop's marker; on
   * the floor SVG the edge of its polygon facing the point it joins. Null
   * when it has no place on the layer.
   */
  x: number | null;
  y: number | null;
  /** Where its marker is drawn: the join point on the SVG; its pin (or door) on the image; the stop's marker. */
  pin: { x: number; y: number } | null;
  /** Plotted only on the other layer (the floor SVG while Wayfinding is on the image, or the reverse), whose frame this one does not share. */
  offLayer: boolean;
  attached: string | null;
  linked: boolean;
  /** Linked by hand on this page (Connect), rather than to the nearest point. */
  explicit: boolean;
  /** Its bridge was removed by hand on this page: it joins nothing until Connect links it again. */
  detached: boolean;
  /** The door the anchor joins the paths from (`d:<id>`), when it has one. */
  door: string | null;
  /** On the floor SVG: the polygon it is plotted on (`PlotTarget.key`), when known. */
  polygon: string | null;
}

export interface WfPlate {
  level: MapLevel;
  dims: { w: number; h: number } | null;
  /** The layer Wayfinding works on; null when the level has no plan at all. */
  space: PlanSpace | null;
  /** A plan to draw paths on (the floor image, or the floor SVG). */
  hasPlan: boolean;
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
 * Where a unit / amenity sits on the layer: on the floor image its stored
 * raster pin or the page's raster placement (an SVG placement has no place
 * there; the record's door, stored on the image, still has); on the floor
 * SVG its pointer or the page's polygon drop.
 */
const placeIn = (
  space: PlanSpace,
  placement: Placement,
  record: { xPlot: number | null; yPlot: number | null },
  centreOf: (polygon: string) => { x: number; y: number } | null
): { x: number; y: number } | null => {
  // On the SVG the polygon is the placement (the canvas fills it by element id); its centre beats a stored pointer's x/y, which can sit elsewhere.
  if (placement.space === space && space === 'svg' && placement.polygon) return centreOf(placement.polygon) ?? { x: placement.x, y: placement.y };
  if (placement.space === space) return { x: placement.x, y: placement.y };
  if (space === 'raster' && !placement.moved && !placement.temporary && record.xPlot != null && record.yPlot != null && record.xPlot + record.yPlot > 0) {
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
 * Where a polygon meets its bridge: the point of its box's outline on the
 * way from the centre towards `toward` (the hallway point it joins), so the
 * marker sits at the polygon's edge and the label in the middle stays
 * readable. Its bottom edge when there is nothing to face.
 */
export const polygonEdge = (box: { x: number; y: number; w: number; h: number }, centre: { x: number; y: number }, toward: { x: number; y: number } | null): { x: number; y: number } => {
  const aim = toward ?? { x: box.x + box.w / 2, y: box.y + box.h + 1 };
  const dx = aim.x - centre.x;
  const dy = aim.y - centre.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return { x: box.x + box.w / 2, y: box.y + box.h };
  const tx = dx > 0 ? (box.x + box.w - centre.x) / dx : dx < 0 ? (box.x - centre.x) / dx : Number.POSITIVE_INFINITY;
  const ty = dy > 0 ? (box.y + box.h - centre.y) / dy : dy < 0 ? (box.y - centre.y) / dy : Number.POSITIVE_INFINITY;
  const k = Math.min(tx, ty, 1);
  if (!Number.isFinite(k) || k <= 0) return { x: box.x + box.w / 2, y: box.y + box.h };
  return { x: centre.x + dx * k, y: centre.y + dy * k };
};

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

  const space = graph?.space ?? 'raster';
  tempStopsOf(state, level).forEach((stop) => {
    const type = stopTypeOf(stop.type);
    const here = (stop.space ?? 'raster') === space;
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
      here && stop.x != null && stop.y != null ? { x: stop.x, y: stop.y } : null,
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
  const space = wayfindingSpace(level, state);
  const layer: PlanSpace = graph?.space ?? space ?? 'raster';
  const doc = state.svgDocs[level.id];
  const targets = doc?.status === 'ready' ? new Map(doc.doc.targets.map((target) => [target.key, target])) : null;
  const centreOf = (polygon: string) => {
    const target = targets?.get(polygon);
    return target ? { x: target.cx, y: target.cy } : null;
  };
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
    moved: node.moved,
    source: node.source,
    review: node.review,
    confidence: node.confidence
  }));
  const byKey = new Map(points.map((point) => [point.key, point]));
  const paths: WfPath[] = pathEdges.map((edge) => {
    const a = byKey.get(edge.a)!;
    const b = byKey.get(edge.b)!;
    const line = [{ x: a.x, y: a.y }, ...edge.points, { x: b.x, y: b.y }];
    let length = 0;
    for (let i = 1; i < line.length; i += 1) length += distance(line[i - 1].x, line[i - 1].y, line[i].x, line[i].y);
    return { key: edge.key, a: edge.a, b: edge.b, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, temporary: edge.temporary, points: line, length, kind: edge.kind };
  });

  const attach = (key: string, x: number | null, y: number | null): Pick<WfAnchor, 'attached' | 'linked' | 'explicit' | 'detached'> => {
    if (x == null || y == null || !points.length) return { attached: null, linked: false, explicit: false, detached: false };
    const chosen = state.wfLinks[`${level.id}|${key}`];
    // A bridge removed by hand: the anchor joins nothing until Connect links it again.
    if (chosen === null) return { attached: null, linked: false, explicit: true, detached: true };
    if (chosen && byKey.has(chosen)) return { attached: chosen, linked: (byKey.get(chosen)?.degree ?? 0) > 0, explicit: true, detached: false };
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
    return { attached: nearest?.key ?? null, linked: !!nearest && nearest.degree > 0, explicit: false, detached: false };
  };

  /**
   * A plotted unit or amenity as an anchor. It attaches by its centre (its
   * door or pin on the image, its polygon's centre on the SVG — the CMS's
   * nearest-point rule); on the SVG the bridge, the route and the marker
   * then meet it at the polygon's edge facing that point.
   */
  const placeAnchor = (
    key: string,
    kind: 'unit' | 'amenity',
    label: string,
    meta: string,
    floors: number[] | null,
    pin: { x: number; y: number } | null,
    doorRecord: MapDoor | null,
    polygon: string | null
  ) => {
    const door = layer === 'raster' ? doorCentre(doorRecord, state) : null;
    const centre = door ?? pin;
    const joined = attach(key, centre?.x ?? null, centre?.y ?? null);
    const target = layer === 'svg' && polygon ? targets?.get(polygon) : null;
    const point = joined.attached ? byKey.get(joined.attached) : null;
    const at = centre && target ? polygonEdge(target.bbox, centre, point ? { x: point.x, y: point.y } : null) : centre;
    anchors.push({
      key,
      kind,
      type: null,
      label,
      meta,
      floors,
      x: at?.x ?? null,
      y: at?.y ?? null,
      pin: layer === 'svg' ? at : (pin ?? door),
      offLayer: !at,
      door: door && doorRecord ? `d:${doorRecord.id}` : null,
      polygon,
      ...joined
    });
  };

  const anchors: WfAnchor[] = [];
  map.inventory.units.forEach((unit) => {
    const placement = placementOfUnit(levels, state, unit);
    if (!placement || placement.level?.id !== level.id) return;
    placeAnchor(
      `unit:${unit.id}`,
      'unit',
      labelOfUnit(unit),
      unitMeta(unit),
      unit.floor != null && level.floors.length > 1 ? [unit.floor] : null,
      placeIn(layer, placement, unit, centreOf),
      firstDoor(map.graph.doors, 'Unit', unit.id),
      placement.space === 'svg' ? placement.polygon : null
    );
  });
  mapAmenities(map).forEach((amenity) => {
    const placement = placementOfAmenity(levels, state, amenity);
    if (!placement || placement.level?.id !== level.id) return;
    placeAnchor(
      `amenity:${amenity.id}`,
      'amenity',
      amenity.name,
      amenityMeta(amenity),
      amenity.floor != null && level.floors.length > 1 ? [amenity.floor] : null,
      placeIn(layer, placement, amenity, centreOf),
      firstDoor(map.graph.doors, 'Amenity', amenity.id),
      placement.space === 'svg' ? placement.polygon : null
    );
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
        pin: stop.x != null && stop.y != null ? { x: stop.x, y: stop.y } : null,
        offLayer: false,
        door: null,
        polygon: null,
        ...attach(stop.key, stop.x, stop.y)
      })
    );

  return {
    level,
    dims,
    space,
    hasPlan: !!space,
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
  if (!plate.hasPlan) return { state: 'noplan', pct: 0, linked: 0, total: 0 };
  const anchors = anchorsOnFloor(plate, floor);
  const linked = anchors.filter((anchor) => anchor.linked).length;
  if (!plate.points.length) return { state: 'none', pct: 0, linked, total: anchors.length };
  if (linked === anchors.length) return { state: 'done', pct: 100, linked, total: anchors.length };
  return { state: 'partial', pct: Math.max(8, Math.round((linked / anchors.length) * 100)), linked, total: anchors.length };
};

/** The distance around a blocker that routes keep clear of: the design's 30 units of its 760-unit plan, scaled to this floor image. */
export const blockerRadius = (dims: { w: number; h: number } | null): number => (dims ? (Math.max(dims.w, dims.h) * 30) / 760 : 30);

/** The shortest distance from a point to a polyline. */
export const polylineDistance = (p: { x: number; y: number }, line: { x: number; y: number }[]): number => {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < line.length; i += 1) best = Math.min(best, segmentDistance(p, line[i - 1], line[i]));
  return line.length === 1 ? Math.hypot(p.x - line[0].x, p.y - line[0].y) : best;
};

/** The shortest distance from a point to a segment. */
export const segmentDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
