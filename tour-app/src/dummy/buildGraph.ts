/**
 * Turns the dummy property definition (`floorplans.dummy.ts`) into the
 * objects the app consumes: the wayfinding graph in the Tour App API's
 * shape, the map levels with their vector plans, and the inventory (units,
 * amenities, additional stops). This is the only place that knows the
 * definition format; everything downstream sees the models in `~/models`.
 */

import type {
  Amenity,
  Building,
  FloorGeometry,
  FloorShape,
  Gate,
  GraphEdge,
  GraphNode,
  MapLevel,
  OutdoorLink,
  Property,
  TourInfo,
  TourStopPlace,
  Unit,
  VerticalConnection,
  WayfindingGraph
} from '~/models';
import heroImage from '~/assets/images/site-plan.png';
import { LEVELS, OUTDOOR_LINKS, PROPERTY_ADDRESS, PROPERTY_CITY, PROPERTY_NAME, TOUR_STOPS, TOWER_A, TOWER_B, type LevelDef, type PlaceDef, type RoomDef } from './floorplans.dummy';

const rect = (r: RoomDef): [number, number][] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.h],
  [r.x, r.y + r.h]
];

const distance = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

const polylineLength = (points: [number, number][]): number => points.reduce((sum, p, i) => (i ? sum + distance(points[i - 1], p) : 0), 0);

const geometryOf = (def: LevelDef): FloorGeometry | null => {
  if (def.kind === 'sitemap') {
    return {
      viewBox: [0, 0, def.width, def.height],
      shapes: def.labels.map((label, i) => ({ id: `label:${i}`, kind: 'label', points: [], text: label.text, at: label.at }))
    };
  }
  const shapes: FloorShape[] = [{ id: 'outline', kind: 'outline', points: rect({ x: 100, y: 30, w: 820, h: 580 }) }];
  def.corridors.forEach((c, i) => shapes.push({ id: `corridor:${i}`, kind: 'corridor', points: rect(c) }));
  def.places.forEach((p) => {
    if (!p.room) return;
    const kind: FloorShape['kind'] = p.kind === 'elevator' ? 'core' : p.amenity?.icon === 'wave' ? 'water' : p.amenity?.icon === 'dog' || p.amenity?.icon === 'leaf' ? 'outdoor' : 'room';
    shapes.push({ id: `room:${p.node}`, kind, points: rect(p.room), ref: p.node });
  });
  def.labels.forEach((label, i) => shapes.push({ id: `label:${i}`, kind: 'label', points: [], text: label.text, at: label.at }));
  return { viewBox: [0, 0, def.width, def.height], shapes };
};

const levelOf = (def: LevelDef): MapLevel => ({
  id: def.id,
  kind: def.kind,
  name: def.name,
  building: def.building,
  floors: def.floors,
  image: def.kind === 'sitemap' ? heroImage : null,
  svg: geometryOf(def),
  width: def.width,
  height: def.height,
  space: 'raster',
  scaleFtPerPx: def.scaleFtPerPx,
  version: 1
});

const nodeKindOf = (p: PlaceDef): GraphNode['kind'] => {
  switch (p.kind) {
    case 'unit':
      return 'unit';
    case 'amenity':
      return 'amenity';
    case 'elevator':
      return 'elevator';
    case 'entry':
      return 'entry';
    case 'tour_start':
      return 'tour_start';
    case 'blocker':
      return 'blocker';
    default:
      return 'stop';
  }
};

const nodesOf = (def: LevelDef): GraphNode[] => {
  const hallways: GraphNode[] = def.hallways.map((h) => ({
    id: `hallway:${h.id}`,
    kind: 'hallway',
    level: def.id,
    floor: def.floors.length === 1 ? def.floors[0] : null,
    building: def.building,
    name: null,
    x: h.x,
    y: h.y,
    anchor: 'point'
  }));
  const places: GraphNode[] = def.places.map((p) => {
    const node: GraphNode = {
      id: p.node,
      kind: nodeKindOf(p),
      level: def.id,
      floor: p.floor ?? (def.floors.length === 1 ? def.floors[0] : null),
      building: def.building,
      name: p.name,
      x: p.at[0],
      y: p.at[1],
      anchor: p.room ? 'door' : 'point'
    };
    if (node.kind !== 'hallway' && node.kind !== 'blocker') {
      node.attach = p.attach != null ? `hallway:${p.attach}` : null;
      node.link = p.attach != null;
    }
    if (p.stopKind) node.stopKind = p.stopKind;
    if (p.kind === 'elevator') {
      node.vertical = p.vertical ?? 'elevator';
      node.accessible = p.accessible ?? node.vertical !== 'stairs';
      node.floorsServed = p.floorsServed ?? def.floors;
    }
    if (p.note) node.note = p.note;
    if (p.radiusPx) node.radiusPx = p.radiusPx;
    return node;
  });
  return [...hallways, ...places];
};

const edgesOf = (def: LevelDef): GraphEdge[] => {
  const at = new Map(def.hallways.map((h) => [h.id, [h.x, h.y] as [number, number]]));
  return def.edges.map(([from, to, interior]) => {
    const a = at.get(from);
    const b = at.get(to);
    if (!a || !b) throw new Error(`Dummy edge ${from}-${to} names a hallway ${def.id} does not have`);
    const polyline: [number, number][] = [a, ...(interior ?? []), b];
    return { from: `hallway:${from}`, to: `hallway:${to}`, kind: 'walk', pathKind: 'manual', level: def.id, lengthPx: Math.round(polylineLength(polyline) * 10) / 10, polyline };
  });
};

const floorLabel = (floor: number | null, level: LevelDef | undefined): string => {
  if (floor === 15) return 'Rooftop *';
  if (floor != null) return `Floor ${floor} *`;
  return level?.name ?? '';
};

export interface DummyProperty {
  property: Property;
  buildings: Building[];
  levels: MapLevel[];
  graph: WayfindingGraph;
  units: Unit[];
  amenities: Amenity[];
  stops: TourStopPlace[];
  /** Where the AR screen pins each place: node → { top, left }. */
  arPins: Record<string, { top: string; left: string }>;
  /** A short floor label per place node ("Floor 1 *", "Rooftop *"). */
  floorLabels: Record<string, string>;
  demo: boolean;
}

export const buildDummyProperty = (): DummyProperty => {
  const levels = LEVELS.map(levelOf);
  const nodes = LEVELS.flatMap(nodesOf);
  const edges = LEVELS.flatMap(edgesOf);

  const verticalById = new Map<string, VerticalConnection>();
  nodes
    .filter((n) => n.kind === 'elevator')
    .forEach((n) => {
      const existing = verticalById.get(n.id);
      if (existing) {
        existing.levels.push(n.level);
      } else {
        verticalById.set(n.id, { id: n.id, kind: n.vertical ?? 'elevator', floors: n.floorsServed ?? [], accessible: n.accessible !== false, levels: [n.level] });
      }
    });

  const gates: Gate[] = nodes
    .filter((n) => n.kind === 'entry' || n.kind === 'tour_start' || (n.kind === 'stop' && (n.stopKind === 'entry' || n.stopKind === 'exit')))
    .map((n) => ({ id: n.id, building: n.building, kind: n.kind === 'entry' ? 'entry' : n.kind === 'tour_start' ? 'tour_start' : n.stopKind === 'exit' ? 'exit' : 'entry' }));

  const outdoorLinks: OutdoorLink[] = OUTDOOR_LINKS.map((l) => ({ from: l.from, to: l.to, level: 'sitemap:1', polyline: l.polyline }));

  const placeDefs = new Map<string, { def: PlaceDef; level: LevelDef }>();
  LEVELS.forEach((level) => level.places.forEach((def) => placeDefs.set(def.node, { def, level })));

  const tour: TourInfo = {
    id: 1,
    start: 'tour_start:1',
    startingFloor: 1,
    building: TOWER_A,
    buildingOrder: [TOWER_A, TOWER_B],
    version: 1,
    stops: TOUR_STOPS.map((stop, i) => {
      const entry = placeDefs.get(stop.node);
      return {
        tourStopId: 100 + i,
        node: stop.node,
        stopType: stop.node.split(':')[0],
        name: entry?.def.name ?? stop.node,
        sort: i + 1,
        visible: true,
        durationMinutes: stop.durationMinutes,
        onMap: !!entry
      };
    })
  };

  const graph: WayfindingGraph = {
    version: 'wf-dummy-1',
    communityId: 1,
    isSitemap: true,
    autoWayfinding: true,
    scale: { unit: 'px', ftPerPx: null },
    levels,
    buildings: [TOWER_A, TOWER_B],
    nodes,
    edges,
    verticalConnections: [...verticalById.values()],
    gates,
    outdoorLinks,
    tour
  };

  const units: Unit[] = [];
  const amenities: Amenity[] = [];
  const stops: TourStopPlace[] = [];
  const arPins: Record<string, { top: string; left: string }> = {};
  const floorLabels: Record<string, string> = {};
  const seenStops = new Set<string>();

  LEVELS.forEach((level) => {
    level.places.forEach((p) => {
      const floor = p.floor ?? (level.floors.length === 1 ? level.floors[0] : null);
      floorLabels[p.node] = floorLabel(floor, level);
      if (p.arPin) arPins[p.node] = p.arPin;
      const id = Number(p.node.split(':')[1]);
      if (p.kind === 'unit' && p.unit) {
        units.push({
          id,
          node: p.node,
          name: p.name,
          building: level.building,
          floor,
          level: level.id,
          bedrooms: p.unit.bedrooms,
          bathrooms: p.unit.bathrooms,
          sqft: p.unit.sqft,
          rent: p.unit.rent,
          available: p.unit.available,
          model: p.unit.model,
          description: p.unit.description,
          polygon: p.room ? rect(p.room) : null,
          showInStopsList: p.showInStopsList ?? false
        });
      } else if (p.kind === 'amenity' && p.amenity) {
        amenities.push({
          id,
          node: p.node,
          name: p.name,
          building: level.building,
          floor,
          level: level.id,
          icon: p.amenity.icon,
          hours: p.amenity.hours,
          description: p.amenity.description,
          polygon: p.room ? rect(p.room) : null,
          showInStopsList: p.showInStopsList ?? false
        });
      } else if (p.kind !== 'unit' && p.kind !== 'amenity' && p.kind !== 'tour_start') {
        if (seenStops.has(p.node)) return;
        seenStops.add(p.node);
        const kind = p.stopKind ?? (p.kind === 'elevator' ? (p.vertical ?? 'elevator') : p.kind === 'entry' ? 'entry' : 'waypoint');
        const destination = !['blocker', 'elevator', 'stairs', 'ramp'].includes(kind);
        stops.push({
          id,
          node: p.node,
          kind,
          name: p.name,
          building: level.building,
          floor: p.kind === 'elevator' ? null : floor,
          level: level.id,
          destination,
          accessible: p.accessible ?? kind !== 'stairs',
          note: p.note ?? null
        });
      }
    });
  });

  const property: Property = {
    id: 1,
    name: PROPERTY_NAME,
    address: PROPERTY_ADDRESS,
    city: PROPERTY_CITY,
    heroImage,
    isSitemap: true,
    autoWayfinding: true,
    floorsCount: 15,
    unitsCount: units.length,
    amenitiesCount: amenities.length,
    tourEnabled: true
  };

  const buildings: Building[] = [TOWER_A, TOWER_B].map((name) => ({ name, levels: levels.filter((l) => l.building === name).map((l) => l.id) }));

  return { property, buildings, levels, graph, units, amenities, stops, arPins, floorLabels, demo: true };
};
