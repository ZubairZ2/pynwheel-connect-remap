import type { Amenity, AmenityIcon, Building, GraphNode, MapLevel, Property, PropertyListing, Route, RouteLeg, RouteStage, RouteStep, TourRoute, TourStopPlace, Unit, WayfindingGraph } from '~/models';
import type { StopKind } from '~/models';
import type { PropertyBundle, StopDistance } from '../tourRepository';
import type { ApiDistancesResponse, ApiGraph, ApiLeg, ApiLevel, ApiMapResponse, ApiNode, ApiPropertyDetail, ApiPropertySummary, ApiRoute, ApiRouteStep, ApiStop, ApiStopsResponse, ApiTourRouteResponse } from './apiTypes';

/**
 * snake_case API JSON → the camelCase models the screens consume. The only
 * place that knows the API's field names. Every optional field is read
 * defensively: a missing value becomes null or an empty list, never a crash.
 */

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
/** Text fields of the CMS may hold HTML (`directional_text`); the app shows text only. */
export const stripHtml = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const text = v
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
};

const points = (v: unknown): [number, number][] => list<unknown>(v).filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number').map((p) => [p[0], p[1]]);

export const parseLevel = (l: ApiLevel): MapLevel => ({
  id: l.id,
  kind: l.kind === 'sitemap' ? 'sitemap' : 'floorplate',
  name: str(l.name, l.kind === 'sitemap' ? 'Property map' : 'Floor'),
  building: strOrNull(l.building),
  floors: list<number>(l.floors),
  image: strOrNull(l.image),
  svg: null, // the floor SVG is a file (`svgPath`), not inline geometry
  svgUrl: strOrNull(l.svg),
  svgPath: strOrNull(l.svg_path),
  svgTransform: l.svg_transform && ['a', 'b', 'c', 'd', 'e', 'f'].every((k) => typeof (l.svg_transform as Record<string, unknown>)[k] === 'number') ? l.svg_transform : null,
  svgSize: l.svg_size && typeof l.svg_size.width === 'number' && typeof l.svg_size.height === 'number' ? { width: l.svg_size.width, height: l.svg_size.height } : null,
  width: num(l.width, 0),
  height: num(l.height, 0),
  space: l.space === 'svg' ? 'svg' : 'raster',
  scaleFtPerPx: numOrNull(l.scale_ft_per_px),
  version: num(l.version, 0)
});

const parseNode = (n: ApiNode): GraphNode => ({
  id: n.id,
  kind: n.kind as GraphNode['kind'],
  level: n.level,
  floor: numOrNull(n.floor),
  building: strOrNull(n.building),
  name: strOrNull(n.name),
  x: num(n.x),
  y: num(n.y),
  anchor: n.anchor === 'icon_top_left' || n.anchor === 'door' ? n.anchor : 'point',
  attach: n.attach ?? null,
  link: n.link == null ? undefined : n.link === 'explicit' || n.link === 'nearest',
  stopKind: n.kind === 'hallway' || n.kind === 'unit' || n.kind === 'amenity' || n.kind === 'door' || n.kind === 'elevator' || n.kind === 'tour_start' ? undefined : (n.kind as StopKind),
  vertical: (n.vertical as GraphNode['vertical']) ?? undefined,
  accessible: n.accessible ?? undefined,
  floorsServed: n.floors_served ?? undefined,
  positions: n.positions ?? undefined,
  note: n.note ?? null,
  radiusPx: n.radius_px ?? null,
  lockProvider: n.lock_provider ?? null
});

export const parseGraph = (g: ApiGraph): WayfindingGraph => ({
  version: g.version,
  communityId: g.community_id,
  isSitemap: !!g.is_sitemap,
  autoWayfinding: !!g.auto_wayfinding,
  scale: { unit: 'px', ftPerPx: numOrNull(g.scale?.ft_per_px) },
  levels: list<ApiLevel>(g.levels).map(parseLevel),
  buildings: list<string>(g.buildings),
  nodes: list<ApiNode>(g.nodes).map(parseNode),
  edges: list<ApiGraph['edges'][number]>(g.edges).map((e) => ({ from: e.from, to: e.to, kind: 'walk', pathKind: str(e.path_kind, 'manual'), level: e.level, lengthPx: num(e.length_px), polyline: points(e.polyline) })),
  verticalConnections: list<ApiGraph['vertical_connections'][number]>(g.vertical_connections).map((v) => ({ id: v.id, kind: (v.kind as 'elevator' | 'stairs' | 'ramp') ?? 'elevator', floors: list<number>(v.floors), accessible: v.accessible !== false, levels: list<string>(v.levels) })),
  gates: list<ApiGraph['gates'][number]>(g.gates).map((x) => ({ id: x.id, building: strOrNull(x.building), kind: (x.kind as 'entry' | 'exit' | 'tour_start' | 'stop') ?? 'entry' })),
  outdoorLinks: [],
  tour: g.tour
    ? {
        id: g.tour.id,
        start: strOrNull(g.tour.start),
        startingFloor: numOrNull(g.tour.starting_floor),
        building: strOrNull(g.tour.building),
        buildingOrder: list<string>(g.tour.building_order),
        version: num(g.tour.version, 0),
        stops: list<NonNullable<ApiGraph['tour']>['stops'][number]>(g.tour.stops).map((s) => ({ tourStopId: s.tour_stop_id, node: strOrNull(s.node), stopType: str(s.stop_type), name: str(s.name), sort: num(s.sort, 1 << 30), visible: s.visible !== false, durationMinutes: numOrNull(s.duration_minutes), onMap: !!s.on_map }))
      }
    : null
});

const ICON_RULES: [RegExp, AmenityIcon][] = [
  [/gym|fitness|workout|weight|cardio/i, 'dumbbell'],
  [/pool|swim|spa|hot tub|water/i, 'wave'],
  [/yoga|wellness|meditat/i, 'yoga'],
  [/dog|pet|bark/i, 'dog'],
  [/garden|park|court|roof|terrace|patio|outdoor|lawn|green/i, 'leaf'],
  [/cafe|coffee|lounge|club|kitchen|dining|bar|game/i, 'coffee'],
  [/office|leasing|business|work|conference|study|mail|package/i, 'briefcase']
];

export const amenityIcon = (name: string, type: string | null): AmenityIcon => {
  const hay = `${type ?? ''} ${name}`;
  return ICON_RULES.find(([re]) => re.test(hay))?.[1] ?? 'star';
};

/** "Tower A · Floor 2", "Floor 2", "Property map". */
export const floorLabelOf = (levels: MapLevel[], levelId: string | null, floor: number | null): string => {
  const level = levels.find((l) => l.id === levelId);
  if (!level) return floor != null ? `Floor ${floor}` : '';
  if (level.kind === 'sitemap') return 'Property map';
  const name = floor != null ? `Floor ${floor}` : level.name;
  return level.building ? `${level.building} · ${name}` : name;
};

export interface ParsedProperty {
  bundle: PropertyBundle;
}

export const parseBundle = (detail: ApiPropertyDetail, graph: ApiGraph, stops: ApiStopsResponse, heroImage: string, map?: ApiMapResponse | null): PropertyBundle => {
  const wayfinding = parseGraph(graph);
  // The map endpoint carries what the graph payload (the Rails shape) does not: the SVG path and calibration per level.
  if (map && Array.isArray(map.levels)) {
    const extras = new Map(map.levels.map((l) => [l.id, parseLevel(l)]));
    wayfinding.levels = wayfinding.levels.map((l) => {
      const extra = extras.get(l.id);
      return extra ? { ...l, svgPath: extra.svgPath, svgTransform: extra.svgTransform, svgSize: extra.svgSize } : l;
    });
  }
  const levels = wayfinding.levels;
  const nodeById = new Map(wayfinding.nodes.map((n) => [n.id, n]));
  const floorLabels: Record<string, string> = {};
  const units: Unit[] = [];
  const amenities: Amenity[] = [];
  list<ApiStopsResponse['groups'][number]>(stops.groups).forEach((group) =>
    list<ApiStop>(group.stops).forEach((s) => {
      const node = nodeById.get(s.id);
      const level = s.level_id ?? node?.level ?? null;
      const floor = s.floor ?? node?.floor ?? null;
      floorLabels[s.id] = floorLabelOf(levels, level, floor);
      if (s.type === 'unit') {
        units.push({
          id: s.record_id,
          node: s.id,
          name: s.name,
          building: strOrNull(s.building),
          floor,
          level,
          bedrooms: numOrNull(s.unit?.bedrooms),
          bathrooms: numOrNull(s.unit?.bathrooms),
          sqft: numOrNull(s.unit?.square_feet),
          rent: numOrNull(s.unit?.rent),
          available: s.unit?.available !== false,
          model: !!s.unit?.model,
          description: stripHtml(s.description) ?? stripHtml(s.instruction),
          polygon: null,
          showInStopsList: true,
          routable: !!s.routable,
          floorplanName: strOrNull(s.unit?.floorplan_name)
        });
      } else {
        amenities.push({
          id: s.record_id,
          node: s.id,
          name: s.name,
          building: strOrNull(s.building),
          floor,
          level,
          icon: amenityIcon(s.name, s.amenity?.amenity_type ?? null),
          hours: null,
          description: stripHtml(s.description),
          instruction: stripHtml(s.instruction),
          polygon: null,
          showInStopsList: true,
          routable: !!s.routable,
          videoUrl: strOrNull(s.amenity?.video_url)
        });
      }
    })
  );
  // Additional stops and connectors come from the graph: entries, exits, elevators, stairs, doors, leasing, restrooms …
  const places: TourStopPlace[] = wayfinding.nodes
    .filter((n) => !['hallway', 'unit', 'amenity'].includes(n.kind))
    .filter((n, i, all) => all.findIndex((m) => m.id === n.id) === i)
    .map((n) => {
      const kind: StopKind = n.kind === 'elevator' ? ((n.vertical as StopKind) ?? 'elevator') : n.kind === 'tour_start' ? 'entry' : (n.kind as StopKind);
      floorLabels[n.id] = floorLabelOf(levels, n.level, n.floor);
      return {
        id: Number(n.id.split(':')[1]) || 0,
        node: n.id,
        kind,
        name: n.name ?? (n.kind === 'tour_start' ? 'Tour start' : kind),
        building: n.building,
        floor: n.floor,
        level: n.level,
        destination: !['elevator', 'stairs', 'ramp', 'blocker'].includes(kind),
        accessible: n.accessible !== false,
        note: stripHtml(n.note)
      };
    });
  const buildings: Building[] = wayfinding.buildings.map((name) => ({ name, levels: levels.filter((l) => l.building === name).map((l) => l.id) }));
  if (!buildings.length && levels.length) buildings.push({ name: detail.name, levels: levels.map((l) => l.id) });
  const property: Property = {
    id: detail.id,
    name: detail.name,
    address: [detail.address, detail.city, detail.state].filter(Boolean).join(', '),
    city: str(detail.city),
    heroImage: levels.find((l) => l.image)?.image ?? heroImage,
    isSitemap: !!detail.is_sitemap,
    autoWayfinding: !!detail.auto_wayfinding,
    floorsCount: new Set(levels.flatMap((l) => l.floors)).size || levels.length,
    unitsCount: num(detail.units_count),
    amenitiesCount: num(detail.amenities_count),
    tourEnabled: !!detail.tour_enabled
  };
  return { property, buildings, levels, graph: wayfinding, units, amenities, stops: places, arPins: {}, floorLabels, demo: false };
};

export const parseListing = (p: ApiPropertySummary, currentId: number | null): PropertyListing => ({
  id: p.id,
  name: p.name,
  address: [p.address, p.city, p.state].filter(Boolean).join(', ') || (p.company ?? ''),
  current: p.id === currentId,
  tourable: !!p.tour_enabled
});

const parseLeg = (l: ApiLeg): RouteLeg =>
  l.kind === 'walk'
    ? { index: l.index, kind: 'walk', level: str(l.level), floor: numOrNull(l.floor), building: strOrNull(l.building), from: l.from, to: l.to, lengthPx: num(l.length_px), points: points(l.points), nodes: list<string>(l.nodes) }
    : { index: l.index, kind: l.kind, via: str(l.via), name: strOrNull(l.name), floorFrom: numOrNull(l.floor_from), floorTo: numOrNull(l.floor_to), from: l.from, to: l.to, lengthPx: num(l.length_px) };

const parseStep = (s: ApiRouteStep): RouteStep => ({
  kind: s.type,
  leg: num(s.leg),
  title: str(s.title),
  sub: s.instruction && s.type === 'arrive' ? `${s.description} · ${stripHtml(s.instruction) ?? ''}`.replace(/ · $/, '') : str(s.description),
  dwellS: s.dwell_s ?? undefined
});

export const parseRoute = (r: ApiRoute): Route => ({
  from: r.start?.id ?? '',
  to: r.destination?.id ?? '',
  stepFree: !!r.step_free,
  avoidBlockers: r.avoid_blockers !== false,
  lengthPx: num(r.total_distance),
  lengthFt: numOrNull(r.total_distance_ft),
  durationS: numOrNull(r.duration_s),
  legs: list<ApiLeg>(r.legs).map(parseLeg),
  steps: list<ApiRouteStep>(r.steps).map(parseStep),
  warnings: list<string>(r.warnings),
  stages: list<ApiRoute['stages'][number]>(r.stages).map((s): RouteStage => ({ level: s.level_id, floor: numOrNull(s.floor), building: strOrNull(s.building), leg: num(s.leg) }))
});

export const parseTourRoute = (body: ApiTourRouteResponse): TourRoute => ({
  route: parseRoute(body.route),
  segments: list<ApiTourRouteResponse['segments'][number]>(body.segments).map((s) => ({ node: s.stop_id, from: s.from_stop_id, route: parseRoute(s.route) }))
});

export const parseDistances = (body: ApiDistancesResponse): Record<string, StopDistance> => {
  const out: Record<string, StopDistance> = {};
  Object.entries(body.distances ?? {}).forEach(([node, d]) => {
    out[node] = d.reachable ? { lengthPx: num(d.distance), lengthFt: numOrNull(d.distance_ft), durationS: numOrNull(d.duration_s), direction: d.direction ?? 'level', unreachable: null } : { lengthPx: 0, lengthFt: null, durationS: null, direction: 'level', unreachable: d.error?.message ?? 'No path connects the tour start to this stop.' };
  });
  return out;
};
