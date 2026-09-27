import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import type { LevelGraph } from '~/core/utils/generator/map/mapNodes.generator';
import { distance, nodeId, nodeKindOf } from '~/core/utils/generator/map/mapState';

/**
 * A route between two tour stops across floors and buildings, over the
 * stored pathway graph the Tour Setup "Route Preview" asks for. It works
 * the way the CMS's ShortestPath does per floor — every stop, elevator and
 * entry point attaches to its nearest hallway node, Dijkstra runs over the
 * hallway links — and joins floors the way the CMS hops them: an elevator
 * serving both floors is the same place on each (a zero-length link). Pure;
 * nothing is sent anywhere.
 */

export interface StopEndpoint {
  key: string;
  label: string;
  levelId: string;
  /** Raster pixels on that level (a door when the stop has one, else the pin). */
  x: number;
  y: number;
}

export interface StopRouteResult {
  status: 'ok' | 'sameStop' | 'noStart' | 'noPath' | 'offGraph';
  /** Level labels walked, in order, without repeats. */
  legs: string[];
  hops: number;
  /** Length in map pixels along the pathway graph (the CMS stores no real-world scale). */
  px: number;
  floorChanges: number;
  buildingChanges: number;
  /** Elevators the route rides. */
  elevators: string[];
}

interface GraphNode {
  key: string;
  levelId: string;
  x: number;
  y: number;
  label: string;
  kind: 'hallway' | 'elevator' | 'stop';
}

const scoped = (levelId: string, key: string): string => `${levelId}|${key}`;

const shortestPath = (adjacency: Map<string, Map<string, number>>, from: string, to: string): { path: string[]; cost: number } | null => {
  const dist = new Map<string, number>();
  const previous = new Map<string, string>();
  const unvisited = new Set(adjacency.keys());
  dist.set(from, 0);
  while (unvisited.size) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    unvisited.forEach((key) => {
      const d = dist.get(key) ?? Number.POSITIVE_INFINITY;
      if (d < best) {
        best = d;
        current = key;
      }
    });
    if (current == null || best === Number.POSITIVE_INFINITY) break;
    if (current === to) break;
    unvisited.delete(current);
    adjacency.get(current)?.forEach((weight, neighbour) => {
      const candidate = best + weight;
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
  return { path, cost: dist.get(to) ?? 0 };
};

export const computeStopRoute = (
  map: PropertyMap,
  levels: MapLevel[],
  graphs: Record<string, LevelGraph>,
  from: StopEndpoint,
  to: StopEndpoint
): StopRouteResult => {
  const empty = (status: StopRouteResult['status']): StopRouteResult => ({ status, legs: [], hops: 0, px: 0, floorChanges: 0, buildingChanges: 0, elevators: [] });
  if (from.key === to.key) return empty('sameStop');

  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, Map<string, number>>();
  const link = (a: string, b: string, weight: number) => {
    if (!adjacency.has(a)) adjacency.set(a, new Map());
    if (!adjacency.has(b)) adjacency.set(b, new Map());
    adjacency.get(a)!.set(b, Math.min(weight, adjacency.get(a)!.get(b) ?? Number.POSITIVE_INFINITY));
    adjacency.get(b)!.set(a, Math.min(weight, adjacency.get(b)!.get(a) ?? Number.POSITIVE_INFINITY));
  };

  levels.forEach((level) => {
    const graph = graphs[level.id];
    if (!graph) return;
    graph.nodes
      .filter((node) => node.kind === 'hallway' || node.kind === 'junction')
      .forEach((node) => {
        const key = scoped(level.id, node.key);
        nodes.set(key, { key, levelId: level.id, x: node.x, y: node.y, label: node.label, kind: 'hallway' });
        if (!adjacency.has(key)) adjacency.set(key, new Map());
      });
    graph.edges.forEach((edge) => {
      const a = scoped(level.id, edge.a);
      const b = scoped(level.id, edge.b);
      if (nodes.has(a) && nodes.has(b)) link(a, b, distance(nodes.get(a)!.x, nodes.get(a)!.y, nodes.get(b)!.x, nodes.get(b)!.y));
    });
  });

  const nearestHallway = (levelId: string, x: number, y: number): string | null => {
    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    nodes.forEach((node) => {
      if (node.levelId !== levelId || node.kind !== 'hallway') return;
      const d = distance(node.x, node.y, x, y);
      if (d < bestDistance) {
        bestDistance = d;
        best = node.key;
      }
    });
    return best;
  };

  // Elevators: one place on every floor they serve, tied to that floor's graph.
  const elevatorNames = new Map<string, string>();
  const elevatorsByRecord = new Map<number, string[]>();
  levels.forEach((level) => {
    const graph = graphs[level.id];
    if (!graph) return;
    graph.nodes
      .filter((node) => node.kind === 'elevator')
      .forEach((node) => {
        const key = scoped(level.id, node.key);
        nodes.set(key, { key, levelId: level.id, x: node.x, y: node.y, label: node.label, kind: 'elevator' });
        elevatorNames.set(key, node.label);
        const near = nearestHallway(level.id, node.x, node.y);
        if (near) link(key, near, distance(node.x, node.y, nodes.get(near)!.x, nodes.get(near)!.y));
        else if (!adjacency.has(key)) adjacency.set(key, new Map());
        const id = nodeId(node.key);
        elevatorsByRecord.set(id, [...(elevatorsByRecord.get(id) ?? []), key]);
      });
  });
  elevatorsByRecord.forEach((keys) => {
    for (let i = 0; i < keys.length; i += 1) for (let j = i + 1; j < keys.length; j += 1) link(keys[i], keys[j], 0);
  });

  const attach = (endpoint: StopEndpoint): string | null => {
    const key = scoped(endpoint.levelId, `stop:${endpoint.key}`);
    nodes.set(key, { key, levelId: endpoint.levelId, x: endpoint.x, y: endpoint.y, label: endpoint.label, kind: 'stop' });
    const near = nearestHallway(endpoint.levelId, endpoint.x, endpoint.y);
    if (!near) return null;
    link(key, near, distance(endpoint.x, endpoint.y, nodes.get(near)!.x, nodes.get(near)!.y));
    return key;
  };
  const source = attach(from);
  const target = attach(to);
  if (!source || !target) return empty('offGraph');

  const found = shortestPath(adjacency, source, target);
  if (!found) return empty('noPath');

  const legs: string[] = [];
  const elevators: string[] = [];
  let floorChanges = 0;
  let buildingChanges = 0;
  let previousLevel: string | null = null;
  found.path.forEach((key) => {
    const node = nodes.get(key)!;
    if (node.levelId !== previousLevel) {
      const level = levels.find((row) => row.id === node.levelId);
      if (level) legs.push(`${level.sub} · ${level.label}`);
      if (previousLevel) {
        floorChanges += 1;
        const before = levels.find((row) => row.id === previousLevel);
        if (before && level && before.building !== level.building) buildingChanges += 1;
      }
      previousLevel = node.levelId;
    }
    if (node.kind === 'elevator' && nodeKindOf(key.split('|')[1] ?? '') === 'elevator') {
      const name = elevatorNames.get(key);
      if (name && !elevators.includes(name)) elevators.push(name);
    }
  });

  return { status: 'ok', legs, hops: found.path.length - 1, px: Math.round(found.cost), floorChanges, buildingChanges, elevators };
};
