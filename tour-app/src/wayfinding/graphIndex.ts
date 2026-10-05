import type { GraphNode, MapLevel, WayfindingGraph } from '~/models';

/**
 * The routing index: the wayfinding graph expanded into per-floor copies,
 * exactly as `Wayfinding::GraphBuilder` does in Rails.
 *
 *   - A level with one floor has one copy; a stacked level has one copy per
 *     floor. A node with a concrete `floor` stands on that copy only; a node
 *     with `floor: null` (a hallway, an elevator) stands on every copy.
 *   - Hallway paths join hallway copies; a stop joins the hallway it is
 *     attached to by a straight "link" edge (door → hallway point).
 *   - The copies of one elevator / stairs record are joined across floors
 *     with the backend's weights: `(50 + 10·Δfloors)·unit` for an elevator
 *     or ramp, `90·Δfloors·unit` for stairs, `unit` = the level's image
 *     diagonal ÷ √(760² + 470²). Step-free leaves out stairs and connectors
 *     marked not accessible.
 *   - Gates (entry / exit points, the tour start) of different buildings are
 *     joined by one `500·unit` outdoor edge, drawn along the outdoor link's
 *     polyline on the site plan when one exists.
 *   - With "avoid blockers" on, any path passing within a blocker's radius
 *     is left out.
 */

export const ICON_OFFSET = 8;
const REFERENCE_DIAGONAL = Math.hypot(760, 470);

export type EdgeKind = 'walk' | 'link' | 'elevator' | 'stairs' | 'ramp' | 'outdoor';

export interface CopyNode {
  key: string;
  node: GraphNode;
  level: MapLevel;
  floor: number | null;
  x: number;
  y: number;
  linked: boolean;
}

export interface CopyEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
  /** Centre-pixel points from `from` to `to`, in the from level's frame (or the sitemap's for an outdoor edge). */
  polyline: [number, number][] | null;
  name: string | null;
  level: string | null;
}

export interface RoutingIndex {
  graph: WayfindingGraph;
  levels: Map<string, MapLevel>;
  copies: Map<string, CopyNode>;
  adjacency: Map<string, CopyEdge[]>;
  /** node id → its copies, across every level and floor. */
  instances: Map<string, CopyNode[]>;
  verticalCount: number;
  hasStairs: boolean;
  hasBlockers: boolean;
  hasOutdoor: boolean;
  stepFree: boolean;
  avoidBlockers: boolean;
}

export interface IndexOptions {
  stepFree?: boolean;
  avoidBlockers?: boolean;
}

export const copyKey = (nodeId: string, level: string, floor: number | null): string => `${nodeId}@${level}@${floor ?? ''}`;

export const floorsOf = (level: MapLevel): (number | null)[] => (level.floors.length > 1 ? level.floors : [level.floors[0] ?? null]);

export const levelUnit = (level: MapLevel): number => (level.width > 0 && level.height > 0 ? Math.hypot(level.width, level.height) / REFERENCE_DIAGONAL : 1);

export const distance = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const polylineLength = (points: [number, number][]): number => points.reduce((sum, p, i) => (i ? sum + distance(points[i - 1], p) : 0), 0);

/** The centre of a node on a copy: stored coordinates, a per-floor override, and the legacy icon offset. */
export const centreOf = (node: GraphNode, floor: number | null): [number, number] => {
  const override = floor != null ? node.positions?.[String(floor)] : undefined;
  const x = override?.x ?? node.x;
  const y = override?.y ?? node.y;
  return node.anchor === 'icon_top_left' ? [x + ICON_OFFSET, y + ICON_OFFSET] : [x, y];
};

const segmentDistance = (p: [number, number], a: [number, number], b: [number, number]): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

const crossesBlocker = (polyline: [number, number][], blockers: { at: [number, number]; r: number }[]): boolean =>
  blockers.some((b) => polyline.some((p, i) => i > 0 && segmentDistance(b.at, polyline[i - 1], p) < b.r));

export const isGate = (node: GraphNode): boolean => node.kind === 'entry' || node.kind === 'tour_start' || (node.kind === 'stop' && (node.stopKind === 'entry' || node.stopKind === 'exit'));

export const buildRoutingIndex = (graph: WayfindingGraph, options: IndexOptions = {}): RoutingIndex => {
  const stepFree = options.stepFree === true;
  const avoidBlockers = options.avoidBlockers !== false;
  const levels = new Map(graph.levels.map((l) => [l.id, l]));
  const copies = new Map<string, CopyNode>();
  const adjacency = new Map<string, CopyEdge[]>();
  const instances = new Map<string, CopyNode[]>();

  const add = (edge: CopyEdge) => {
    adjacency.get(edge.from)?.push(edge);
  };
  const addBoth = (a: string, b: string, kind: EdgeKind, weight: number, polyline: [number, number][] | null, name: string | null, level: string | null) => {
    add({ from: a, to: b, kind, weight, polyline, name, level });
    add({ from: b, to: a, kind, weight, polyline: polyline ? [...polyline].reverse() : null, name, level });
  };

  // 1. Copies.
  graph.nodes.forEach((node) => {
    const level = levels.get(node.level);
    if (!level) return;
    floorsOf(level).forEach((floor) => {
      if (node.floor != null && floor != null && node.floor !== floor) return;
      const [x, y] = centreOf(node, floor);
      const copy: CopyNode = { key: copyKey(node.id, level.id, floor), node, level, floor, x, y, linked: false };
      copies.set(copy.key, copy);
      adjacency.set(copy.key, []);
      const list = instances.get(node.id) ?? [];
      list.push(copy);
      instances.set(node.id, list);
    });
  });

  // Blockers per (level, floor).
  const blockersOn = (level: string, floor: number | null) =>
    avoidBlockers
      ? [...copies.values()].filter((c) => c.node.kind === 'blocker' && c.level.id === level && c.floor === floor).map((c) => ({ at: [c.x, c.y] as [number, number], r: c.node.radiusPx ?? 30 }))
      : [];

  // 2. Hallway paths.
  graph.edges.forEach((edge) => {
    const level = levels.get(edge.level);
    if (!level) return;
    floorsOf(level).forEach((floor) => {
      const a = copyKey(edge.from, level.id, floor);
      const b = copyKey(edge.to, level.id, floor);
      if (!copies.has(a) || !copies.has(b)) return;
      const polyline = edge.polyline.length >= 2 ? edge.polyline : [[copies.get(a)!.x, copies.get(a)!.y] as [number, number], [copies.get(b)!.x, copies.get(b)!.y] as [number, number]];
      if (crossesBlocker(polyline, blockersOn(level.id, floor))) return;
      addBoth(a, b, 'walk', edge.lengthPx > 0 ? edge.lengthPx : polylineLength(polyline), polyline, null, level.id);
    });
  });

  // 3. Stop → hallway links.
  copies.forEach((copy) => {
    const node = copy.node;
    if (node.kind === 'hallway' || node.kind === 'blocker' || !node.attach || node.link === false) return;
    const hallway = copies.get(copyKey(node.attach, copy.level.id, copy.floor));
    if (!hallway) return;
    const polyline: [number, number][] = [
      [copy.x, copy.y],
      [hallway.x, hallway.y]
    ];
    if (crossesBlocker(polyline, blockersOn(copy.level.id, copy.floor))) return;
    addBoth(copy.key, hallway.key, 'link', distance(polyline[0], polyline[1]), polyline, null, copy.level.id);
  });

  // 4. Vertical connections between the copies of one record.
  let verticalCount = 0;
  let hasStairs = false;
  instances.forEach((list, nodeId) => {
    const first = list[0];
    if (!first || first.node.kind !== 'elevator') return;
    const vertical = first.node.vertical ?? 'elevator';
    if (vertical === 'stairs') hasStairs = true;
    const accessible = first.node.accessible !== false;
    if (stepFree && (vertical === 'stairs' || !accessible)) return;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.level.id === b.level.id && a.floor === b.floor) continue;
        const delta = a.floor != null && b.floor != null ? Math.max(1, Math.abs(a.floor - b.floor)) : 1;
        const unit = levelUnit(a.level);
        const weight = vertical === 'stairs' ? 90 * delta * unit : (50 + 10 * delta) * unit;
        addBoth(a.key, b.key, vertical, weight, null, first.node.name, null);
        verticalCount += 1;
      }
    }
    void nodeId;
  });

  // 5. Outdoor edges between the gates of different buildings. When the
  //    property draws outdoor paths between two buildings (`outdoorLinks`),
  //    only those pairs are joined; otherwise every gate pair is, as the
  //    backend does with its single nominal edge.
  let hasOutdoor = false;
  const gates = [...copies.values()].filter((c) => isGate(c.node) && c.node.building);
  const linkFor = (a: string, b: string) => graph.outdoorLinks.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
  const buildingOf = (nodeId: string) => graph.nodes.find((n) => n.id === nodeId)?.building ?? null;
  const drawnPairs = new Set(graph.outdoorLinks.map((l) => [buildingOf(l.from), buildingOf(l.to)].sort().join('|')));
  for (let i = 0; i < gates.length; i += 1) {
    for (let j = i + 1; j < gates.length; j += 1) {
      const a = gates[i];
      const b = gates[j];
      if (a.node.building === b.node.building) continue;
      const link = linkFor(a.node.id, b.node.id);
      if (!link && drawnPairs.has([a.node.building, b.node.building].sort().join('|'))) continue;
      const polyline = link ? (link.from === a.node.id ? link.polyline : [...link.polyline].reverse()) : null;
      const weight = 500 * levelUnit(a.level);
      const name = `${a.node.name ?? a.node.id}|${b.node.name ?? b.node.id}`;
      // Drawn links first so a tie resolves to the one with geometry.
      if (link) {
        adjacency.get(a.key)?.unshift({ from: a.key, to: b.key, kind: 'outdoor', weight, polyline, name, level: link.level });
        adjacency.get(b.key)?.unshift({ from: b.key, to: a.key, kind: 'outdoor', weight, polyline: polyline ? [...polyline].reverse() : null, name: `${b.node.name ?? b.node.id}|${a.node.name ?? a.node.id}`, level: link.level });
      } else {
        addBoth(a.key, b.key, 'outdoor', weight, null, name, null);
      }
      hasOutdoor = true;
    }
  }

  // 6. Linked = has at least one edge (a hallway counts as linked even alone, as the backend treats it).
  copies.forEach((copy) => {
    copy.linked = copy.node.kind === 'hallway' || (adjacency.get(copy.key)?.length ?? 0) > 0;
  });

  const hasBlockers = graph.nodes.some((n) => n.kind === 'blocker');
  return { graph, levels, copies, adjacency, instances, verticalCount, hasStairs, hasBlockers, hasOutdoor, stepFree, avoidBlockers };
};
