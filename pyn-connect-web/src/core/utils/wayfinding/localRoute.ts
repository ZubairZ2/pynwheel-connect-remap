import type { PropertyMap, RouteLeg, RoutePoint } from '~/core/models/data/propertyMap.data';
import type { MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import type { LevelGraph } from '~/core/utils/generator/map/mapNodes.generator';
import { NODE_ANCHOR_OFFSET, distance, nodeId, type LocalMapState } from '~/core/utils/generator/map/mapState';

/**
 * A local preview of the CMS routing algorithm for one level (ShortestPath's
 * per-floor pass), over the stored pathway graph plus the page's temporary
 * junctions, connections and moved nodes:
 *
 *   - every tour stop, the start and each elevator attach to their nearest
 *     pathway node (Euclidean distance in image pixels), as in
 *     `get_unit_data` / `get_starting_point_data` / `get_elevator_data`;
 *   - a stop is its door when it has one on this level, else its pin;
 *   - the route walks the level's visible stops in tour-stop order
 *     (`shortest_paths_with_sorting_in_floor`), Dijkstra between each pair;
 *   - the source is the tour's starting point on its floor, else an
 *     elevator serving this floor; after the last stop it goes to the
 *     nearest elevator that serves a floor with further stops, else back to
 *     the starting point (the CMS's traverse back).
 *
 * The CMS reduces stops with several doors to the first one and runs the
 * whole property floor by floor; this previews the current floor only.
 */

interface Node {
  key: string;
  x: number;
  y: number;
}

interface Attached {
  label: string;
  x: number;
  y: number;
  nearest: string | null;
  kind: RoutePoint['kind'];
  id: number | null;
}

const nearestNode = (nodes: Node[], x: number, y: number): string | null => {
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  nodes.forEach((node) => {
    const d = distance(node.x, node.y, x, y);
    if (d < bestDistance) {
      bestDistance = d;
      best = node.key;
    }
  });
  return best;
};

/** Dijkstra over an undirected weighted graph; the node keys on the path, source first. */
const shortestPath = (adjacency: Map<string, Map<string, number>>, from: string, to: string): string[] | null => {
  if (from === to) return [from];
  const dist = new Map<string, number>();
  const previous = new Map<string, string>();
  const unvisited = new Set(adjacency.keys());
  dist.set(from, 0);

  while (unvisited.size) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    unvisited.forEach((key) => {
      const d = dist.get(key) ?? Number.POSITIVE_INFINITY;
      if (d < currentDistance) {
        currentDistance = d;
        current = key;
      }
    });
    if (current == null || currentDistance === Number.POSITIVE_INFINITY) break;
    if (current === to) break;
    unvisited.delete(current);
    adjacency.get(current)?.forEach((weight, neighbour) => {
      const candidate = currentDistance + weight;
      if (candidate < (dist.get(neighbour) ?? Number.POSITIVE_INFINITY)) {
        dist.set(neighbour, candidate);
        previous.set(neighbour, current!);
      }
    });
  }

  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) {
    const prev = previous.get(path[0]);
    if (!prev) return null;
    path.unshift(prev);
  }
  return path;
};

/** A node's route point, in the CMS's stored coordinates (icon top-left, which the canvas offsets like the legacy page). */
const stored = (x: number, y: number) => ({ x: x - NODE_ANCHOR_OFFSET, y: y - NODE_ANCHOR_OFFSET });

export const computeLocalRoute = (
  map: PropertyMap,
  levels: MapLevel[],
  graphs: Record<string, LevelGraph>,
  level: MapLevel,
  state: LocalMapState
): RouteLeg | null => {
  const graph = graphs[level.id];
  if (!graph) return null;

  const pathNodes: Node[] = graph.nodes
    .filter((node) => node.kind === 'hallway' || node.kind === 'junction')
    .map((node) => ({ key: node.key, x: node.x, y: node.y }));
  if (!pathNodes.length) return null;

  const adjacency = new Map<string, Map<string, number>>();
  pathNodes.forEach((node) => adjacency.set(node.key, new Map()));
  const byKey = new Map(pathNodes.map((node) => [node.key, node]));
  graph.edges.forEach((edge) => {
    const a = byKey.get(edge.a);
    const b = byKey.get(edge.b);
    if (!a || !b) return;
    const weight = distance(a.x, a.y, b.x, b.y);
    adjacency.get(a.key)!.set(b.key, weight);
    adjacency.get(b.key)!.set(a.key, weight);
  });

  // The level's visible stops, in tour order; a door stands in for its stop.
  const doors = graph.nodes.filter((node) => node.kind === 'door');
  const doorOf = (kind: 'Unit' | 'Amenity', id: number) =>
    doors.find((door) => {
      const record = map.graph.doors.find((row) => row.id === nodeId(door.key));
      return record?.attachedWithType === kind && record.attachedWithId === id;
    });
  const stops: Attached[] = map.graph.tourStops
    .filter((stop) => stop.displayStop && (stop.stopType === 'unit' || stop.stopType === 'amenity'))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .flatMap((stop): Attached[] => {
      const pin = graph.pins.find((row) => row.kind === stop.stopType && row.ref.id === stop.stopId);
      if (!pin || pin.svgSpace) return [];
      const door = doorOf(stop.stopType === 'unit' ? 'Unit' : 'Amenity', stop.stopId);
      const x = door ? door.x : pin.x;
      const y = door ? door.y : pin.y;
      return [
        {
          label: pin.label,
          x,
          y,
          nearest: nearestNode(pathNodes, x, y),
          kind: stop.stopType === 'unit' ? 'unit' : 'amenity',
          id: door ? nodeId(door.key) : stop.stopId
        }
      ];
    });

  const elevators: Attached[] = graph.nodes
    .filter((node) => node.kind === 'elevator')
    .map((node) => ({ label: node.label, x: node.x, y: node.y, nearest: nearestNode(pathNodes, node.x, node.y), kind: 'elevator', id: nodeId(node.key) }));

  const tourStart = graph.nodes.find((node) => node.kind === 'tourStart');
  const start: Attached | null = tourStart
    ? { label: tourStart.label, x: tourStart.x, y: tourStart.y, nearest: nearestNode(pathNodes, tourStart.x, tourStart.y), kind: 'start', id: null }
    : (elevators[0] ?? null);
  if (!start || !stops.length) return null;

  const maxFloor = level.floors.length ? Math.max(...level.floors) : null;
  const stopsAbove =
    maxFloor != null &&
    map.graph.tourStops.some((stop) => {
      if (!stop.displayStop || (stop.stopType !== 'unit' && stop.stopType !== 'amenity')) return false;
      return Object.values(graphs).some(
        (other) =>
          other.level.id !== level.id &&
          other.level.floors.some((floor) => floor > maxFloor) &&
          other.pins.some((pin) => pin.kind === stop.stopType && pin.ref.id === stop.stopId)
      );
    });

  const points: RoutePoint[] = [];
  const pushAttached = (attached: Attached) => points.push({ kind: attached.kind, id: attached.id, ...(attached.kind === 'unit' || attached.kind === 'amenity' ? { x: attached.x, y: attached.y } : stored(attached.x, attached.y)) });
  const pushNodes = (keys: string[], skipFirst: boolean) =>
    keys.forEach((key, index) => {
      if (skipFirst && index === 0) return;
      const node = byKey.get(key)!;
      points.push({ kind: 'hallway', id: key.startsWith('h:') ? nodeId(key) : null, ...stored(node.x, node.y) });
    });

  let cursor = start.nearest;
  if (!cursor) return null;
  pushAttached(start);
  pushNodes([cursor], false);

  const visit = (target: Attached): boolean => {
    if (!target.nearest) return false;
    const path = shortestPath(adjacency, cursor!, target.nearest);
    if (!path) return false;
    pushNodes(path, true);
    pushAttached(target);
    pushNodes([target.nearest], false);
    cursor = target.nearest;
    return true;
  };

  stops.forEach((stop) => visit(stop));

  if (stopsAbove) {
    const next = elevators
      .filter((elevator) => (graph.nodes.find((node) => node.kind === 'elevator' && nodeId(node.key) === elevator.id)?.floors ?? []).some((floor) => maxFloor == null || floor > maxFloor))
      .sort((a, b) => distance(a.x, a.y, byKey.get(cursor!)!.x, byKey.get(cursor!)!.y) - distance(b.x, b.y, byKey.get(cursor!)!.x, byKey.get(cursor!)!.y))[0];
    if (next) visit(next);
  } else if (start.kind === 'start') {
    visit(start);
  }

  return { building: level.building, floor: level.floors[0] ?? null, points };
};
