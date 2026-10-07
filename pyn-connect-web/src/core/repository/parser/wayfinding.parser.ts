import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type {
  BedroomMarkerColor,
  HallwayReview,
  HallwaySource,
  HallwaySpace,
  MapDoor,
  MapElevator,
  MapHallway,
  MapHallwayAttachment,
  MapHallwayEdge,
  MapLevelMeta,
  MapStartingPoint,
  MapTour,
  MapTourStop,
  MapWayfindingStop,
  MapWriteMeta,
  OcrBox,
  RouteLeg,
  RoutePoint,
  StopState,
  WayfindingGraph,
  WayfindingRoute
} from '~/core/models/data/propertyMap.data';

/**
 * The wayfinding graph (`GET /automate_plotting.json`) and the routing
 * algorithm's answer (`GET /automate_plotting/shortest_path.json`), from the
 * wire into models. Coordinates are kept as the pixels the CMS stores.
 */

type Source = Record<string, unknown>;

const camel = (value: unknown): Source => ModelDataConverter.toCamelCase<Source>(value ?? {});

const text = (value: unknown): string | null => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const num = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const count = (value: unknown): number => num(value) ?? 0;

const flag = (value: unknown): boolean => value === true;

const list = (value: unknown): Source[] => (Array.isArray(value) ? (value as Source[]) : []);

const numbers = (value: unknown): number[] =>
  (Array.isArray(value) ? value : []).map(Number).filter((n) => Number.isFinite(n));

const space = (value: unknown): HallwaySpace => (value === 'svg' ? 'svg' : 'raster');
const review = (value: unknown): HallwayReview => (value === 'pending' ? 'pending' : 'confirmed');
const sourceOf = (value: unknown): HallwaySource => (value === 'vector' || value === 'inferred' ? value : 'manual');
const pairs = (value: unknown): [number, number][] =>
  (Array.isArray(value) ? value : [])
    .map((pair) => (Array.isArray(pair) && pair.length === 2 ? [num(pair[0]), num(pair[1])] : null))
    .filter((pair): pair is [number, number] => !!pair && pair[0] != null && pair[1] != null);
const parentType = (value: unknown): 'Floorplate' | 'Sitemap' => (value === 'Sitemap' ? 'Sitemap' : 'Floorplate');

/** The write meta of `automate_plotting.json`: versions, the token, and whether saving is allowed here. */
export const parseWayfindingWriteMeta = (payload: unknown): MapWriteMeta => {
  const meta = camel((payload as { meta?: unknown } | null)?.meta);
  const versions: Record<string, number | null> = {};
  Object.entries((meta.versions ?? {}) as Record<string, unknown>).forEach(([key, value]) => {
    versions[key] = num(value);
  });
  return { versions, csrfToken: text(meta.csrfToken), writesEnabled: flag(meta.writesEnabled), canEditMap: flag(meta.canEditMap) };
};

const stopState = (value: unknown): StopState | null => {
  const source = (value ?? null) as Source | null;
  if (!source || num(source.id) == null) return null;
  return { id: count(source.id), sort: num(source.sort), visible: source.visible !== false };
};

export const parseWayfindingGraph = (payload: unknown): WayfindingGraph | null => {
  const data = (payload as { data?: unknown } | null)?.data;
  if (!data || typeof data !== 'object') return null;
  const source = camel(data);
  const settings = camel(source.settings);

  const floorToFloorplate: Record<number, number> = {};
  Object.entries((source.floorToFloorplate ?? {}) as Record<string, unknown>).forEach(([floor, plate]) => {
    const key = num(floor);
    const id = num(plate);
    if (key != null && id != null) floorToFloorplate[key] = id;
  });

  const ocr: Record<string, OcrBox[]> = {};
  Object.entries((source.ocr ?? {}) as Record<string, unknown>).forEach(([map, boxes]) => {
    ocr[map] = list(boxes)
      .map((box) => ({
        text: text(box.text) ?? '',
        left: count(box.left),
        top: count(box.top),
        width: count(box.width),
        height: count(box.height)
      }))
      .filter((box) => box.text);
  });

  const tour = (source.tour ?? null) as Source | null;

  return {
    settings: {
      autoWayfinding: flag(settings.autoWayfinding),
      selfTour: flag(settings.selfTour),
      isSitemap: flag(settings.isSitemap),
      enableSvgMode: flag(settings.enableSvgMode),
      defaultMapFloor: num(settings.defaultMapFloor),
      markerSize: num(settings.markerSize),
      availableUnitsColor: text(settings.availableUnitsColor),
      modelUnitsColor: text(settings.modelUnitsColor),
      amenitiesColor: text(settings.amenitiesColor)
    },
    buildings: (Array.isArray(source.buildings) ? source.buildings : [])
      .map((building) => text(building))
      .filter((building): building is string => !!building),
    floorToFloorplate,
    hallways: list(source.hallways).map(
      (row): MapHallway => ({
        id: count(row.id),
        xPlot: count(row.xPlot),
        yPlot: count(row.yPlot),
        nextPoints: numbers(row.nextPoints),
        selected: flag(row.selected),
        parentType: row.parentType === 'Sitemap' ? 'Sitemap' : 'Floorplate',
        parentId: count(row.parentId),
        source: sourceOf(row.source),
        reviewStatus: review(row.reviewStatus),
        confidence: num(row.confidence),
        space: space(row.space),
        detectionRunId: num(row.detectionRunId)
      })
    ),
    elevators: list(source.elevators).map(
      (row): MapElevator => ({
        id: count(row.id),
        name: text(row.name),
        description: text(row.description),
        xPlot: num(row.xPlot),
        yPlot: num(row.yPlot),
        floorplateId: num(row.floorplateId),
        sitemapId: num(row.sitemapId),
        coveringRange: text(row.coveringRange),
        floors: numbers(row.floors),
        building: text(row.building),
        directionalText: text(row.directionalText),
        duplicateOf: num(row.duplicateOf),
        lockProvider: text(row.lockProvider),
        kind: row.kind === 'stairs' || row.kind === 'ramp' ? row.kind : 'elevator',
        accessible: row.accessible !== false,
        floorPositions: Object.fromEntries(
          Object.entries((row.floorPositions ?? {}) as Record<string, unknown>).flatMap(([floor, at]) => {
            const point = (at ?? null) as Record<string, unknown> | null;
            const x = num(point?.x);
            const y = num(point?.y);
            return x != null && y != null ? [[floor, { x, y }]] : [];
          })
        ),
        image: text(row.image),
        gallery: list(row.gallery).map((photo) => ({ id: count(photo.id), name: text(photo.name), url: text(photo.url) })),
        banks: list(row.banks).map((bank) => ({
          id: count(bank.id),
          name: text(bank.name),
          position: text(bank.position),
          lockType: text(bank.lockType),
          lockName: text(bank.lockName)
        })),
        tourStop: stopState(row.tourStop)
      })
    ),
    buildingStartingPoints: list(source.buildingStartingPoints).map(
      (row): MapStartingPoint => ({
        id: count(row.id),
        name: text(row.name),
        building: text(row.building),
        floor: num(row.floor),
        xPlot: num(row.xPlot),
        yPlot: num(row.yPlot),
        status: text(row.status),
        directionalText: text(row.directionalText),
        lockProvider: text(row.lockProvider),
        tourStop: stopState(row.tourStop)
      })
    ),
    tour:
      tour && num(tour.id) != null
        ? ({
            id: count(tour.id),
            name: text(tour.name),
            xPlot: count(tour.xPlot),
            yPlot: count(tour.yPlot),
            startingFloor: num(tour.startingFloor),
            building: text(tour.building),
            buildingOrder: (Array.isArray(tour.buildingOrder) ? tour.buildingOrder : [])
              .map((building) => text(building))
              .filter((building): building is string => !!building),
            dottedLineColor: text(tour.dottedLineColor),
            enableAutoZoom: flag(tour.enableAutoZoom),
            tourSetupVersion: count(tour.tourSetupVersion)
          } satisfies MapTour)
        : null,
    tourStops: list(source.tourStops).map(
      (row): MapTourStop => ({
        id: count(row.id),
        stopType: text(row.stopType) ?? '',
        stopId: count(row.stopId),
        name: text(row.name),
        sort: num(row.sort),
        displayStop: row.displayStop !== false,
        latitude: num(row.latitude),
        longitude: num(row.longitude),
        durationMinutes: num(row.durationMinutes)
      })
    ),
    doors: list(source.doors).map(
      (row): MapDoor => ({
        id: count(row.id),
        name: text(row.name),
        floor: num(row.floor),
        xPlot: num(row.xPlot),
        yPlot: num(row.yPlot),
        attachedWithType: text(row.attachedWithType) ?? '',
        attachedWithId: count(row.attachedWithId),
        sort: num(row.sort),
        lockProvider: text(row.lockProvider),
        note: text(row.note)
      })
    ),
    bedroomMarkerColors: list(source.bedroomMarkerColors).map(
      (row): BedroomMarkerColor => ({
        bedroom: count(row.bedroom),
        availableUnitsColor: text(row.availableUnitsColor),
        availableUnitsOpacity: num(row.availableUnitsOpacity),
        modelUnitsColor: text(row.modelUnitsColor),
        modelUnitsOpacity: num(row.modelUnitsOpacity)
      })
    ),
    ocr,
    hallwayEdges: list(source.hallwayEdges).map(
      (row): MapHallwayEdge => ({
        id: count(row.id),
        from: count(row.from),
        to: count(row.to),
        parentType: parentType(row.parentType),
        parentId: count(row.parentId),
        kind: text(row.kind) ?? 'manual',
        points: pairs(row.points),
        reviewStatus: review(row.reviewStatus),
        autoGenerated: flag(row.autoGenerated),
        space: space(row.space)
      })
    ),
    hallwayAttachments: list(source.hallwayAttachments).map(
      (row): MapHallwayAttachment => ({
        id: count(row.id),
        attachableType: text(row.attachableType) ?? '',
        attachableId: count(row.attachableId),
        parentType: parentType(row.parentType),
        parentId: count(row.parentId),
        hallwayId: num(row.hallwayId),
        mode: row.mode === 'detached' ? 'detached' : 'explicit',
        anchorX: num(row.anchorX),
        anchorY: num(row.anchorY),
        space: space(row.space)
      })
    ),
    wayfindingStops: list(source.wayfindingStops).map(
      (row): MapWayfindingStop => ({
        id: count(row.id),
        kind: text(row.kind) ?? 'waypoint',
        name: text(row.name) ?? '',
        mapType: parentType(row.mapType),
        mapId: count(row.mapId),
        building: text(row.building),
        floor: num(row.floor),
        xPlot: num(row.xPlot),
        yPlot: num(row.yPlot),
        space: space(row.space),
        accessible: row.accessible !== false,
        lockProvider: text(row.lockProvider),
        note: text(row.note),
        radiusPx: num(row.radiusPx),
        hallwayId: num(row.hallwayId),
        status: text(row.status) ?? 'active',
        source: text(row.source) ?? 'manual'
      })
    ),
    levelsMeta: list(source.levels).map(
      (row): MapLevelMeta => ({
        kind: row.kind === 'sitemap' ? 'sitemap' : 'floorplate',
        id: count(row.id),
        wayfindingVersion: count(row.wayfindingVersion),
        svgToImageTransform: row.svgToImageTransform && typeof row.svgToImageTransform === 'object' ? (row.svgToImageTransform as Record<string, unknown>) : null,
        scaleFtPerPx: num(row.scaleFtPerPx),
        wayfindingSpace: space(row.wayfindingSpace)
      })
    ),
    suppressions: Object.fromEntries(Object.entries((source.suppressions ?? {}) as Record<string, unknown>).map(([key, value]) => [key, count(value)]))
  };
};

/**
 * One point as ShortestPath builds it. A hallway node has no `point_type`;
 * a stop carries its door (or its own position under the door keys when it
 * has none); the start, an entry/exit point and an elevator each use their
 * own key names (`return_x_y_values` in maps.js reads the same ones).
 */
const routePoint = (raw: unknown): RoutePoint | null => {
  const source = (raw ?? null) as Record<string, unknown> | null;
  if (!source) return null;
  const type = text(source.point_type);

  const pick = (x: unknown, y: unknown, kind: RoutePoint['kind'], id: unknown): RoutePoint | null => {
    const px = num(x);
    const py = num(y);
    return px == null || py == null ? null : { kind, x: px, y: py, id: num(id) };
  };

  switch (type) {
    case 'unit':
      return pick(source.door_x_plot, source.door_y_plot, 'unit', source.door_id);
    case 'amenity':
      return pick(source.door_x_plot, source.door_y_plot, 'amenity', source.door_id);
    case 'building_starting_point':
      return pick(source.building_starting_x_plot, source.building_starting_y_plot, 'start', null);
    case 'building_starting_exit_point':
      return pick(
        source.building_starting_exit_x_plot,
        source.building_starting_exit_y_plot,
        'exit',
        source.building_starting_exit_id
      );
    case 'elevator': {
      const point = pick(source.elevator_x_plot, source.elevator_y_plot, 'elevator', source.elevator_id);
      return point ? { ...point, floors: { min: num(source.min_floor), max: num(source.max_floor) } } : null;
    }
    default:
      return pick(source.x_plot, source.y_plot, 'hallway', source.id);
  }
};

/** `{ "0": point, "1": point, … }` in index order. */
const routePoints = (raw: unknown): RoutePoint[] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .map(([index, point]) => [Number(index), routePoint(point)] as const)
    .filter((entry): entry is readonly [number, RoutePoint] => Number.isFinite(entry[0]) && entry[1] != null)
    .sort((a, b) => a[0] - b[0])
    .map(([, point]) => point);
};

/**
 * `shortest_path` answers `{ path_object: <JSON text>, floor_ids: <JSON text>,
 * is_multiple_buildings }`. The path is a list of legs: `[floor, points]` for
 * one building, `[building, floor, points]` for several, and a single points
 * object for a sitemap. An algorithm failure is an empty list (the action
 * rescues to `[]`).
 */
export const parseWayfindingRoute = (payload: unknown): WayfindingRoute | null => {
  const source = (payload ?? null) as Record<string, unknown> | null;
  if (!source || !('path_object' in source)) return null;

  const decode = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  };

  const path = decode(source.path_object);
  const floorIds = numbers(decode(source.floor_ids));
  const multipleBuildings = flag(source.is_multiple_buildings);
  const legs: RouteLeg[] = [];

  if (Array.isArray(path)) {
    path.forEach((leg) => {
      if (!Array.isArray(leg)) return;
      if (leg.length === 2) legs.push({ building: null, floor: num(leg[0]), points: routePoints(leg[1]) });
      else if (leg.length >= 3)
        legs.push({ building: text(leg[0]), floor: num(leg[1]), points: routePoints(leg[2]) });
    });
    return { legs: legs.filter((leg) => leg.points.length), floorIds, multipleBuildings, sitemap: false };
  }

  const points = routePoints(path);
  return {
    legs: points.length ? [{ building: null, floor: null, points }] : [],
    floorIds,
    multipleBuildings,
    sitemap: true
  };
};
