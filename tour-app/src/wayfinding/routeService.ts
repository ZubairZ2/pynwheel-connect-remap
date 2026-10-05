import type { Route, RouteError, RouteErrorCode, RouteFailure, RouteLeg, RouteOptions, RouteResult, RouteStage, TourRouteResult, TourSegment, TransitionLeg, WalkLeg, WayfindingGraph } from '~/models';
import { buildRoutingIndex, type CopyNode, type RoutingIndex } from './graphIndex';
import { dijkstra, type PathFound } from './shortestPath';
import { durationOf, feetOf, stepsOf } from './timing';

/**
 * Routes over the wayfinding graph: from one place to another, or a whole
 * tour (start → chosen stops in tour order → start). A port of
 * `Wayfinding::RouteService`: the same resolution rules, the same error
 * taxonomy and messages, the same legs (one per floor walked, with the
 * centre-pixel points along each path) and transitions between them.
 *
 * The real backend will compute this server-side (`…/wayfinding/route.json`);
 * the app keeps this engine so routing works offline and so the dummy
 * graph is exercised by a real algorithm rather than a drawn route.
 */

export const ROUTE_ERRORS: Record<RouteErrorCode, string> = {
  unknown_endpoint: 'That place is not on the map.',
  same_endpoint: 'Pick two different places.',
  ambiguous_floor: 'Say which floor to start on.',
  not_linked: '{name} is not connected to a path on {where}.',
  no_path: 'No path connects those two places.',
  blocked: 'Every path between those places is cut by a blocker{where}.',
  no_step_free: 'No step-free route: every way between those floors uses stairs.',
  no_vertical_link: 'Nothing links those floors. Add an elevator or stairs that serves both.',
  no_building_link: 'Nothing links building {a} to building {b}. Add an entry or exit point to each.',
  no_start: 'The tour has no starting point on the map.'
};

const message = (code: RouteErrorCode, params: Record<string, string> = {}): string =>
  ROUTE_ERRORS[code].replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');

const failure = (code: RouteErrorCode, from: string | null, to: string | null, params: Record<string, string> = {}, warnings: string[] = []): RouteFailure => ({
  ok: false,
  from,
  to,
  error: { code, message: message(code, params) } satisfies RouteError,
  warnings
});

type Resolved = { copy: CopyNode } | { problem: 'unknown' | 'ambiguous' };

/** "unit:101" (+ an optional floor) → the copy the route starts or ends at. */
const resolve = (index: RoutingIndex, ref: string, floor: number | null | undefined): Resolved => {
  const instances = index.instances.get(ref) ?? [];
  if (!instances.length) return { problem: 'unknown' };
  if (instances.length === 1) return { copy: instances[0] };
  if (floor != null) {
    const match = instances.find((c) => c.floor === floor || (c.level.floors.length === 1 && c.level.floors[0] === floor));
    return match ? { copy: match } : { problem: 'unknown' };
  }
  const own = instances.filter((c) => c.node.floor != null && c.floor === c.node.floor);
  if (own.length === 1) return { copy: own[0] };
  return { problem: 'ambiguous' };
};

const placeName = (copy: CopyNode): string => {
  const name = copy.level.kind === 'sitemap' ? 'the property map' : copy.level.name;
  return copy.floor != null ? `Floor ${copy.floor} (${name})` : name;
};

const stagesOf = (legs: RouteLeg[]): RouteStage[] => {
  const stages: RouteStage[] = [];
  legs.forEach((leg) => {
    if (leg.kind === 'walk') {
      const last = stages[stages.length - 1];
      if (!last || last.level !== leg.level || last.floor !== leg.floor) stages.push({ level: leg.level, floor: leg.floor, building: leg.building, leg: leg.index });
    } else if (leg.kind === 'outdoor' && leg.level) {
      stages.push({ level: leg.level, floor: null, building: null, leg: leg.index });
    }
  });
  return stages;
};

const legsFromPath = (index: RoutingIndex, found: PathFound, from: string, to: string, options: RouteOptions): Route => {
  const { path, via } = found;
  const legs: RouteLeg[] = [];
  const start = index.copies.get(path[0])!;
  const newLeg = (copy: CopyNode): WalkLeg => ({
    index: legs.length,
    kind: 'walk',
    level: copy.level.id,
    floor: copy.floor ?? copy.level.floors[0] ?? null,
    building: copy.node.building,
    from: copy.node.id,
    to: copy.node.id,
    lengthPx: 0,
    points: [[copy.x, copy.y]],
    nodes: [copy.node.id]
  });
  let leg = newLeg(start);
  for (let i = 1; i < path.length; i += 1) {
    const key = path[i];
    const edge = via.get(key)!;
    const copy = index.copies.get(key)!;
    if (edge.kind === 'walk' || edge.kind === 'link') {
      const line = edge.polyline ?? [[index.copies.get(edge.from)!.x, index.copies.get(edge.from)!.y] as [number, number], [copy.x, copy.y] as [number, number]];
      line.slice(1).forEach((p) => leg.points.push(p));
      leg.lengthPx += edge.weight;
      leg.nodes.push(copy.node.id);
      leg.to = copy.node.id;
      continue;
    }
    legs.push(leg);
    const previous = index.copies.get(edge.from)!;
    const transition: TransitionLeg = {
      index: legs.length,
      kind: edge.kind,
      via: copy.node.id,
      name: edge.name,
      floorFrom: previous.floor ?? previous.level.floors[0] ?? null,
      floorTo: copy.floor ?? copy.level.floors[0] ?? null,
      from: leg.to,
      to: copy.node.id,
      // An outdoor walk's length: the drawn polyline on the site plan, else the backend's nominal 500·unit edge weight.
      lengthPx:
        edge.kind === 'outdoor'
          ? edge.polyline
            ? Math.round(edge.polyline.reduce((sum, p, j) => (j ? sum + Math.hypot(p[0] - edge.polyline![j - 1][0], p[1] - edge.polyline![j - 1][1]) : 0), 0) * 10) / 10
            : Math.round(edge.weight * 10) / 10
          : 0,
      level: edge.kind === 'outdoor' ? edge.level : null,
      points: edge.kind === 'outdoor' && edge.polyline ? edge.polyline : undefined
    };
    legs.push(transition);
    leg = newLeg(copy);
  }
  legs.push(leg);
  const walkLength = legs.reduce((sum, l) => (l.kind === 'walk' ? sum + l.lengthPx : sum), 0);
  legs.forEach((l) => {
    if (l.kind === 'walk') l.lengthPx = Math.round(l.lengthPx * 10) / 10;
  });
  return {
    from,
    to,
    stepFree: options.stepFree === true,
    avoidBlockers: options.avoidBlockers !== false,
    lengthPx: Math.round(walkLength * 10) / 10,
    lengthFt: feetOf(legs, index),
    durationS: durationOf(legs, index),
    legs,
    steps: stepsOf(legs, index),
    warnings: [],
    stages: stagesOf(legs)
  };
};

const diagnose = (index: RoutingIndex, a: CopyNode, b: CopyNode, from: string, to: string, graph: WayfindingGraph): RouteFailure => {
  if (index.avoidBlockers && index.hasBlockers) {
    const open = buildRoutingIndex(graph, { stepFree: index.stepFree, avoidBlockers: false });
    const ra = open.copies.get(a.key);
    const rb = open.copies.get(b.key);
    if (ra && rb && dijkstra(open, ra.key, rb.key)) return failure('blocked', from, to, { where: '' });
  }
  const sameFloor = a.level.id === b.level.id && a.floor === b.floor;
  if (!sameFloor) {
    const ba = a.node.building;
    const bb = b.node.building;
    if (ba && bb && ba !== bb && !index.hasOutdoor) return failure('no_building_link', from, to, { a: ba, b: bb });
    if (index.stepFree && index.verticalCount === 0 && index.hasStairs) return failure('no_step_free', from, to);
    if (index.verticalCount === 0) return failure('no_vertical_link', from, to);
    if (index.stepFree) return failure('no_step_free', from, to);
  }
  return failure('no_path', from, to);
};

const routeBetween = (index: RoutingIndex, a: CopyNode, b: CopyNode, from: string, to: string, options: RouteOptions, graph: WayfindingGraph): RouteResult => {
  for (const [copy, label] of [
    [a, from],
    [b, to]
  ] as const) {
    if (copy.node.kind === 'hallway' || copy.linked) continue;
    return failure('not_linked', from, to, { name: copy.node.name ?? label, where: placeName(copy) });
  }
  const found = dijkstra(index, a.key, b.key);
  if (!found) return diagnose(index, a, b, from, to, graph);
  return { ok: true, route: legsFromPath(index, found, from, to, options) };
};

export class RouteService {
  private readonly index: RoutingIndex;

  constructor(
    private readonly graph: WayfindingGraph,
    private readonly options: RouteOptions = {}
  ) {
    this.index = buildRoutingIndex(graph, { stepFree: options.stepFree, avoidBlockers: options.avoidBlockers });
  }

  /** A route between two places; `from` / `to` are graph node ids (`unit:101`). */
  find(from: string, to: string, floors: { fromFloor?: number | null; toFloor?: number | null } = {}): RouteResult {
    const a = resolve(this.index, from, floors.fromFloor ?? this.options.fromFloor);
    const b = resolve(this.index, to, floors.toFloor ?? this.options.toFloor);
    if (('problem' in a && a.problem === 'unknown') || ('problem' in b && b.problem === 'unknown')) return failure('unknown_endpoint', from, to);
    if ('problem' in a || 'problem' in b) return failure('ambiguous_floor', from, to);
    if (a.copy.key === b.copy.key) return failure('same_endpoint', from, to);
    return routeBetween(this.index, a.copy, b.copy, from, to, this.options, this.graph);
  }

  /**
   * The whole tour: start → every chosen stop in tour order → start. Stops
   * are ordered by building order, floor and sort as the backend does; a
   * stop that cannot be reached is skipped with a warning, never a failure.
   */
  tour(stopNodes: string[] | null = null): TourRouteResult {
    const tour = this.graph.tour;
    const start = tour?.start;
    if (!tour || !start || !this.index.instances.has(start)) return failure('no_start', null, null);
    const buildingIndex = new Map(this.graph.buildings.map((b, i) => [b, i]));
    const chosen = stopNodes ? new Set(stopNodes) : null;
    const rows = tour.stops
      .filter((s) => s.visible && s.node && (!chosen || chosen.has(s.node)))
      .map((s) => {
        const copy = resolve(this.index, s.node!, null);
        if (!('copy' in copy)) return null;
        const node = copy.copy.node;
        return { stop: s, copy: copy.copy, building: buildingIndex.get(node.building ?? '') ?? 0, floor: copy.copy.floor ?? 0, sort: s.sort };
      })
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((x, y) => x.building - y.building || x.floor - y.floor || x.sort - y.sort || x.stop.tourStopId - y.stop.tourStopId);

    const startCopy = resolve(this.index, start, tour.startingFloor);
    if (!('copy' in startCopy)) return failure('no_start', null, null);
    const sequence: { copy: CopyNode; stop: (typeof rows)[number]['stop'] | null }[] = [{ copy: startCopy.copy, stop: null }, ...rows.map((r) => ({ copy: r.copy, stop: r.stop })), { copy: startCopy.copy, stop: null }];

    const legs: RouteLeg[] = [];
    const steps: Route['steps'] = [];
    const warnings: string[] = [];
    const segments: TourSegment[] = [];
    let length = 0;
    let duration = 0;
    let durationKnown = true;
    let feet = 0;
    let feetKnown = true;
    for (let i = 0; i + 1 < sequence.length; i += 1) {
      const fromCopy = sequence[i].copy;
      const toCopy = sequence[i + 1].copy;
      const partial = routeBetween(this.index, fromCopy, toCopy, fromCopy.node.id, toCopy.node.id, this.options, this.graph);
      if (!partial.ok) {
        warnings.push(`${partial.error.message} (${fromCopy.node.name ?? fromCopy.node.id} → ${toCopy.node.name ?? toCopy.node.id})`);
        continue;
      }
      const route = partial.route;
      const offset = legs.length;
      route.legs.forEach((leg) => legs.push({ ...leg, index: leg.index + offset }));
      route.steps.forEach((step) => steps.push({ ...step, leg: step.leg + offset }));
      length += route.lengthPx;
      if (route.durationS == null) durationKnown = false;
      else duration += route.durationS;
      if (route.lengthFt == null) feetKnown = false;
      else feet += route.lengthFt;
      const stop = sequence[i + 1].stop;
      if (stop) {
        const dwell = (stop.durationMinutes ?? 0) * 60;
        const last = steps[steps.length - 1];
        if (last && last.kind === 'arrive') last.dwellS = dwell;
        duration += dwell;
        segments.push({ node: toCopy.node.id, from: fromCopy.node.id, route });
      }
    }
    if (!legs.length) return failure('no_path', start, start, {}, warnings);
    const route: Route = {
      from: start,
      to: start,
      stepFree: this.options.stepFree === true,
      avoidBlockers: this.options.avoidBlockers !== false,
      lengthPx: Math.round(length * 10) / 10,
      lengthFt: feetKnown ? Math.round(feet * 10) / 10 : null,
      durationS: durationKnown ? Math.round(duration) : null,
      legs,
      steps,
      warnings,
      stages: stagesOf(legs)
    };
    return { ok: true, tour: { route, segments } };
  }
}

/** A short human summary of a route: "2 floors · 1 elevator ride · 1 outdoor walk". */
export const summarizeRoute = (route: Route): string => {
  const floors = new Set(route.stages.filter((s) => s.floor != null).map((s) => `${s.level}@${s.floor}`)).size;
  const rides = route.legs.filter((l) => l.kind === 'elevator' || l.kind === 'ramp').length;
  const stairs = route.legs.filter((l) => l.kind === 'stairs').length;
  const outdoor = route.legs.filter((l) => l.kind === 'outdoor').length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [plural(Math.max(1, floors), 'floor', 'floors')];
  if (rides) parts.push(plural(rides, 'elevator ride', 'elevator rides'));
  if (stairs) parts.push(plural(stairs, 'flight of stairs', 'flights of stairs'));
  if (outdoor) parts.push(plural(outdoor, 'outdoor walk', 'outdoor walks'));
  return parts.join(' · ');
};

/** "240 ft · about 2 min" or "797 px" when no scale exists. */
export const describeLength = (route: Route): string => {
  const length = route.lengthFt != null ? `${Math.round(route.lengthFt)} ft` : `${Math.round(route.lengthPx)} px`;
  if (route.durationS == null) return length;
  const time = route.durationS < 60 ? `${route.durationS} sec` : `${Math.max(1, Math.round(route.durationS / 60))} min`;
  return `${length} · about ${time}`;
};
