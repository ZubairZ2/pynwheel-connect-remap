import { i18n } from '~/resources/i18n';
import { levelsOfBuilding, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { distance } from '~/core/utils/generator/map/mapState';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import { stopTypeOf, type StopTypeId } from './stopTypes';
import { anchorsOnFloor, blockerRadius, segmentDistance, stopsOnFloor, type WfAnchor, type WfPlate } from './wayfindingGraph';

/**
 * "Test shortest path": a route between two anchors (a unit, an amenity or
 * a stop) over the wayfinding graph of the floors in scope, the way the
 * CMS's ShortestPath walks it — every anchor joins the hallways at its
 * point (the nearest one, unless linked by hand), Dijkstra over the hallway
 * links weighted by their length on the floor image — and the way floors
 * and buildings join:
 *
 *   - an elevator is one record shown on every floor it serves
 *     (`floorplate_covering_range`), so its copies on two floors are linked;
 *     a stop added on the page as an Elevator or Stairs joins the stops of
 *     the same type and name on other floors (and a stored elevator of that
 *     name), as the design's "joins this floorplate to the same elevator on
 *     other floors" says;
 *   - each floor of a stacked floorplate is its own copy of the shared
 *     hallways, so a route between two floors of one stack rides the
 *     elevator between them;
 *   - across buildings the route leaves by an entry / exit point (the
 *     CMS's `building_starting_points`, the tour start, or an Entry / Exit
 *     stop added here) and enters by one of the other building.
 *
 * Blockers added on the page cut the hallway links that pass near them;
 * "Step-free" leaves stairs out. The CMS stores no real-world scale, so
 * lengths are the floor image's pixels. Pure; nothing is sent.
 */

export type WfScopeId = 'plate' | 'floors' | 'buildings';

/** One floor of one level: a single floorplate, or one floor of a stacked one. */
export interface WfCopy {
  ck: string;
  level: MapLevel;
  floor: number | null;
}

export interface WfEndpoint {
  /** `${copy}|${anchor key}`. */
  id: string;
  ck: string;
  levelId: string;
  floor: number | null;
  anchor: WfAnchor;
  label: string;
  group: string;
}

export interface WfRouteGroup {
  label: string;
  ck: string;
  items: WfEndpoint[];
}

export type WfStepKind = 'walk' | 'elevator' | 'stairs' | 'outdoor' | 'end';

export interface WfRouteStep {
  kind: WfStepKind;
  ck: string;
  legIndex: number;
  title: string;
  sub: string;
}

export interface WfRouteLeg {
  ck: string;
  levelId: string;
  floor: number | null;
  /** The route's points on this floor, in the floor image's pixels, in walking order. */
  points: { x: number; y: number; stop: boolean; name: string }[];
  /** The hallway points walked (keys on the level), for highlighting their paths. */
  pointKeys: string[];
  px: number;
  from: string;
  to: string;
}

export type WfRouteFix = { kind: 'detect'; scope: 'plate' | 'building' | 'all'; label: string } | { kind: 'stop'; levelId: string; label: string };

export type WfRouteResult =
  | { ok: true; a: string; b: string; legs: WfRouteLeg[]; steps: WfRouteStep[]; px: number; multi: boolean; summary: string }
  | { ok: false; a: string; b: string; error: string; fix: WfRouteFix | null };

export interface WfRouteInput {
  levels: MapLevel[];
  plates: Record<string, WfPlate>;
  current: MapLevel;
  /** The floor in view on a stacked floorplate. */
  floor: number | null;
  scope: WfScopeId;
  stepFree: boolean;
}

const R = M.wayfinding.route;

export const copyKey = (levelId: string, floor: number | null): string => `${levelId}@${floor ?? ''}`;

export const parseCopyKey = (ck: string): { levelId: string; floor: number | null } => {
  const at = ck.lastIndexOf('@');
  const floor = ck.slice(at + 1);
  return { levelId: ck.slice(0, at), floor: floor === '' ? null : Number(floor) };
};

export const copiesOf = (level: MapLevel): WfCopy[] =>
  level.floors.length > 1 ? level.floors.map((floor) => ({ ck: copyKey(level.id, floor), level, floor })) : [{ ck: copyKey(level.id, null), level, floor: null }];

/** "Floor 5", "Tower A · Floor 5", or the level's own name on a single floor. */
export const copyName = (copy: WfCopy, withBuilding: boolean): string =>
  `${withBuilding ? `${copy.level.sub} · ` : ''}${copy.floor != null ? t(M.level.floor, { floor: copy.floor }) : copy.level.label}`;

/** The floor a copy stands on, for counting floors between two elevator stops. */
const floorNumber = (copy: WfCopy): number | null => copy.floor ?? (copy.level.floors.length === 1 ? copy.level.floors[0] : null);

/** The levels a scope routes over. A "Buildings" scope with one building is the "Floors" scope. */
export const scopeLevels = (levels: MapLevel[], current: MapLevel, scope: WfScopeId): MapLevel[] => {
  if (scope === 'buildings') return levels;
  if (scope === 'floors') return levelsOfBuilding(levels, current.building);
  return [current];
};

export const scopeCopies = (input: Pick<WfRouteInput, 'levels' | 'current' | 'floor' | 'scope'>): WfCopy[] => {
  const out: WfCopy[] = [];
  scopeLevels(input.levels, input.current, input.scope).forEach((level) =>
    copiesOf(level).forEach((copy) => {
      if (input.scope === 'plate' && copy.floor !== input.floor) return;
      out.push(copy);
    })
  );
  return out;
};

/** What can be picked as From / To in the scope: every anchor of every floor, grouped by floor. */
export const routeGroups = (input: WfRouteInput): WfRouteGroup[] => {
  const withBuilding = input.scope !== 'plate';
  const groups: WfRouteGroup[] = [];
  scopeCopies(input).forEach((copy) => {
    const plate = input.plates[copy.level.id];
    if (!plate || !plate.hasImage) return;
    const label = `${copyName(copy, withBuilding)}${copy.floor != null ? ` ${t(R.shares, { range: copy.level.rangeLabel })}` : ''}`;
    const items = anchorsOnFloor(plate, copy.floor).map(
      (anchor): WfEndpoint => ({ id: `${copy.ck}|${anchor.key}`, ck: copy.ck, levelId: copy.level.id, floor: copy.floor, anchor, label: anchor.label, group: label })
    );
    if (items.length) groups.push({ label, ck: copy.ck, items });
  });
  return groups;
};

const isConnector = (anchor: WfAnchor) => anchor.type === 'elevator' || anchor.type === 'stairs' || anchor.type === 'entry' || anchor.type === 'exit';

/** The From / To shown: the picked ones while they are in scope, else an entry (or the first anchor) here and a destination elsewhere. */
export const defaultPair = (input: WfRouteInput, groups: WfRouteGroup[], a: string, b: string): [string, string] => {
  const flat = groups.flatMap((group) => group.items);
  const has = (id: string) => !!id && flat.some((item) => item.id === id);
  const here = copyKey(input.current.id, input.floor);
  let from = has(a) ? a : '';
  if (!from) {
    const local = flat.filter((item) => item.ck === here);
    from = (local.find((item) => item.anchor.type === 'entry') ?? local[0] ?? flat[0])?.id ?? '';
  }
  let to = has(b) ? b : '';
  if (!to) {
    const start = flat.find((item) => item.id === from);
    const buildingOf = (item: WfEndpoint) => input.levels.find((level) => level.id === item.levelId)?.building ?? null;
    const others = flat.filter((item) => item.ck !== start?.ck);
    const otherBuilding = others.filter((item) => start && buildingOf(item) !== buildingOf(start));
    const pick =
      input.scope === 'plate'
        ? (flat.find((item) => item.id !== from && !isConnector(item.anchor)) ?? flat.find((item) => item.id !== from))
        : ((input.scope === 'buildings' ? (otherBuilding.find((item) => !isConnector(item.anchor)) ?? otherBuilding[0]) : undefined) ??
          others.find((item) => !isConnector(item.anchor)) ??
          others[0] ??
          flat.find((item) => item.id !== from));
    to = pick?.id ?? '';
  }
  return [from, to];
};

type Edge = { to: string; w: number; type: 'walk' | 'link' | 'elevator' | 'stairs' | 'outdoor'; name: string };

/** Dijkstra with a binary heap; the node keys on the path, source first, and its length. */
const dijkstra = (adjacency: Map<string, Edge[]>, from: string, to: string): { path: string[]; via: Map<string, Edge>; cost: number } | null => {
  const dist = new Map<string, number>([[from, 0]]);
  const via = new Map<string, Edge>();
  const previous = new Map<string, string>();
  const heap: [number, string][] = [[0, from]];
  const push = (item: [number, string]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = (): [number, string] | undefined => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length && last) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const done = new Set<string>();
  while (heap.length) {
    const [d, node] = pop()!;
    if (done.has(node)) continue;
    done.add(node);
    if (node === to) break;
    (adjacency.get(node) ?? []).forEach((edge) => {
      const next = d + edge.w;
      if (next < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, next);
        previous.set(edge.to, node);
        via.set(edge.to, edge);
        push([next, edge.to]);
      }
    });
  }
  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) {
    const prev = previous.get(path[0]);
    if (prev == null) return null;
    path.unshift(prev);
  }
  return { path, via, cost: dist.get(to) ?? 0 };
};

interface Built {
  adjacency: Map<string, Edge[]>;
  position: Map<string, { x: number; y: number; stop: boolean; name: string; ck: string; point: string | null }>;
  verticals: number;
  /** Stairs links left out for a step-free route. */
  skippedStairs: number;
}

/** The scope's graph: one copy of each floor's points and paths, the anchors joined to their points, and the links between floors and buildings. */
const buildGraph = (input: WfRouteInput, copies: WfCopy[], blockers: boolean): Built => {
  const adjacency = new Map<string, Edge[]>();
  const position: Built['position'] = new Map();
  const add = (a: string, b: string, w: number, type: Edge['type'], name = '') => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ to: b, w, type, name });
    adjacency.get(b)!.push({ to: a, w, type, name });
  };
  const dims = input.plates[input.current.id]?.dims;
  // The design weighs a floor change against walking in its 760 × 470 plan; the same weights scaled to this floor image.
  const unit = dims ? Math.hypot(dims.w, dims.h) / Math.hypot(760, 470) : 1;
  const vertical: Map<string, { key: string; copy: WfCopy; type: StopTypeId; name: string }[]> = new Map();
  const gates: { key: string; copy: WfCopy; building: string | null; name: string }[] = [];

  copies.forEach((copy) => {
    const plate = input.plates[copy.level.id];
    if (!plate || !plate.hasImage) return;
    const radius = blockerRadius(plate.dims);
    const cuts = blockers ? plate.blockers.filter((stop) => stop.x != null && stop.y != null && (copy.floor == null || stop.floors == null || stop.floors.includes(copy.floor))) : [];
    const pointKey = (key: string) => `${copy.ck}~${key}`;
    const byKey = new Map(plate.points.map((point) => [point.key, point]));
    plate.points.forEach((point) => {
      const key = pointKey(point.key);
      if (!adjacency.has(key)) adjacency.set(key, []);
      position.set(key, { x: point.x, y: point.y, stop: false, name: '', ck: copy.ck, point: point.key });
    });
    plate.paths.forEach((path) => {
      const a = byKey.get(path.a);
      const b = byKey.get(path.b);
      if (!a || !b) return;
      if (cuts.some((stop) => segmentDistance({ x: stop.x!, y: stop.y! }, a, b) < radius)) return;
      add(pointKey(a.key), pointKey(b.key), distance(a.x, a.y, b.x, b.y), 'walk');
    });
    anchorsOnFloor(plate, copy.floor).forEach((anchor) => {
      if (anchor.x == null || anchor.y == null) return;
      const key = `${copy.ck}|${anchor.key}`;
      position.set(key, { x: anchor.x, y: anchor.y, stop: true, name: anchor.label, ck: copy.ck, point: null });
      if (!adjacency.has(key)) adjacency.set(key, []);
      const point = anchor.attached ? byKey.get(anchor.attached) : null;
      if (point) add(key, pointKey(point.key), distance(anchor.x, anchor.y, point.x, point.y), 'link');
      if (anchor.type && stopTypeOf(anchor.type).vertical) {
        const stop = stopsOnFloor(plate, copy.floor).find((row) => row.key === anchor.key);
        const served = stop?.served ?? [];
        const own = floorNumber(copy);
        if (stop?.source === 'temp' && served.length && own != null && !served.includes(own)) return;
        const group = stop?.source === 'elevator' ? anchor.key : `${anchor.type}|${anchor.label.trim().toLowerCase()}`;
        vertical.set(group, [...(vertical.get(group) ?? []), { key, copy, type: anchor.type, name: anchor.label }]);
      }
      if (anchor.type === 'entry' || anchor.type === 'exit') {
        const stop = plate.stops.find((row) => row.key === anchor.key);
        gates.push({ key, copy, building: copy.level.building ?? stop?.building ?? null, name: anchor.label });
      }
    });
  });

  // A stop added as an Elevator named like a stored elevator rides with it.
  vertical.forEach((members, group) => {
    if (!group.startsWith('elevator|')) return;
    const name = group.slice('elevator|'.length);
    const stored = [...vertical.entries()].find(([key, rows]) => key.startsWith('e:') && rows[0]?.name.trim().toLowerCase() === name);
    if (stored) {
      stored[1].push(...members);
      vertical.delete(group);
    }
  });

  let verticals = 0;
  let skippedStairs = 0;
  vertical.forEach((members) => {
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        if (a.copy.ck === b.copy.ck) continue;
        if (a.type === 'stairs' && input.stepFree) {
          skippedStairs += 1;
          continue;
        }
        const fa = floorNumber(a.copy);
        const fb = floorNumber(b.copy);
        const floors = fa != null && fb != null ? Math.max(1, Math.abs(fa - fb)) : 1;
        add(a.key, b.key, (a.type === 'stairs' ? 90 * floors : 50 + 10 * floors) * unit, a.type === 'stairs' ? 'stairs' : 'elevator', a.name);
        verticals += 1;
      }
    }
  });

  if (input.scope === 'buildings') {
    for (let i = 0; i < gates.length; i += 1) {
      for (let j = i + 1; j < gates.length; j += 1) {
        const a = gates[i];
        const b = gates[j];
        if (!a.building || !b.building || a.building === b.building) continue;
        add(a.key, b.key, 500 * unit, 'outdoor', `${a.name}|${b.name}`);
      }
    }
  }

  return { adjacency, position, verticals, skippedStairs };
};

/** Finds the route, or says why there is none (the design's messages, on the real data). */
export const computeWayfindingRoute = (input: WfRouteInput, groups: WfRouteGroup[], a: string, b: string, options: { noBlockers?: boolean } = {}): WfRouteResult => {
  const fail = (error: string, fix: WfRouteFix | null = null): WfRouteResult => ({ ok: false, a, b, error, fix });
  if (!a || !b || a === b) return fail(i18n.t(R.pickTwo));
  const flat = groups.flatMap((group) => group.items);
  const from = flat.find((item) => item.id === a);
  const to = flat.find((item) => item.id === b);
  if (!from || !to) return fail(i18n.t(R.pickTwo));

  const withBuilding = input.scope === 'buildings';
  const copies = scopeCopies(input);
  const copyOf = (ck: string) => copies.find((copy) => copy.ck === ck)!;
  const name = (ck: string) => copyName(copyOf(ck), withBuilding);
  const levelName = (level: MapLevel) => `${level.sub} · ${level.label}`;

  const noPlan = [from, to].map((item) => input.levels.find((level) => level.id === item.levelId)).find((level) => level && !input.plates[level.id]?.hasImage);
  if (noPlan) return fail(t(R.noPlan, { level: levelName(noPlan) }));

  const inScope = scopeLevels(input.levels, input.current, input.scope);
  const missing = inScope.filter((level) => input.plates[level.id]?.hasImage && !input.plates[level.id]?.points.length);
  const fixDetect: WfRouteFix | null = missing.length
    ? {
        kind: 'detect',
        scope: input.scope === 'plate' ? 'plate' : input.scope === 'floors' ? 'building' : 'all',
        label:
          input.scope === 'plate'
            ? i18n.t(R.fixDetectPlate)
            : input.scope === 'floors'
              ? t(R.fixDetectBuilding, { building: input.current.sub })
              : i18n.t(R.fixDetectAll)
      }
    : null;
  const startMissing = missing.find((level) => level.id === from.levelId);
  const endMissing = missing.find((level) => level.id === to.levelId);
  if (startMissing || endMissing) {
    return fail(t(startMissing ? R.noPathsStart : R.noPathsEnd, { level: levelName((startMissing ?? endMissing)!) }), fixDetect);
  }

  for (const item of [from, to]) {
    if (item.anchor.svgOnly) return fail(t(R.svgOnly, { name: item.label }));
    if (!item.anchor.linked) return fail(t(R.notLinked, { name: item.label, floor: name(item.ck) }));
  }

  const built = buildGraph(input, copies, !options.noBlockers);
  const found = dijkstra(built.adjacency, a, b);
  if (!found) {
    const anyBlocker = copies.some((copy) => input.plates[copy.level.id]?.blockers.length);
    if (!options.noBlockers && anyBlocker) {
      const open = computeWayfindingRoute(input, groups, a, b, { noBlockers: true });
      if (open.ok) {
        const walked = new Set(open.legs.map((leg) => leg.ck));
        const hit = copies
          .filter((copy) => walked.has(copy.ck))
          .flatMap((copy) =>
            (input.plates[copy.level.id]?.blockers ?? [])
              .filter((stop) => copy.floor == null || stop.floors == null || stop.floors.includes(copy.floor))
              .map((stop) => `${stop.label} on ${name(copy.ck)}`)
          );
        return fail(t(R.blocked, { where: hit.length ? ` (${[...new Set(hit)].join(', ')})` : '' }));
      }
    }
    if (from.ck !== to.ck && missing.length) {
      const names = missing.map(levelName);
      return fail(t(R.missingPaths, { levels: `${names.slice(0, 4).join(', ')}${names.length > 4 ? t(R.andMore, { count: names.length - 4 }) : ''}` }), fixDetect);
    }
    const buildingA = input.levels.find((level) => level.id === from.levelId)?.building ?? null;
    const buildingB = input.levels.find((level) => level.id === to.levelId)?.building ?? null;
    if (input.scope === 'buildings' && buildingA && buildingB && buildingA !== buildingB) {
      return fail(t(R.noBuildingLink, { a: buildingA, b: buildingB }), { kind: 'stop', levelId: to.levelId, label: i18n.t(R.fixEntry) });
    }
    if (from.ck !== to.ck && input.stepFree && built.skippedStairs) return fail(i18n.t(R.noStepFree));
    if (from.ck !== to.ck && !built.verticals) return fail(i18n.t(R.noVertical), { kind: 'stop', levelId: to.levelId, label: i18n.t(R.fixVertical) });
    if (from.ck !== to.ck && input.stepFree) return fail(i18n.t(R.noStepFree));
    return fail(i18n.t(anyBlocker ? R.noPathBlocker : R.noPath));
  }

  // Legs: the walk on each floor between floor changes.
  const legs: WfRouteLeg[] = [];
  const transitions: { type: Edge['type']; name: string; from: string; to: string }[] = [];
  const start = built.position.get(found.path[0])!;
  let leg: WfRouteLeg = { ck: start.ck, levelId: parseCopyKey(start.ck).levelId, floor: parseCopyKey(start.ck).floor, points: [start], pointKeys: [], px: 0, from: start.name, to: '' };
  for (let i = 1; i < found.path.length; i += 1) {
    const key = found.path[i];
    const edge = found.via.get(key)!;
    const at = built.position.get(key)!;
    if (edge.type === 'walk' || edge.type === 'link') {
      const previous = leg.points[leg.points.length - 1];
      leg.px += distance(previous.x, previous.y, at.x, at.y);
      leg.points.push(at);
      if (at.point) leg.pointKeys.push(at.point);
      continue;
    }
    leg.to = built.position.get(found.path[i - 1])!.name || leg.to;
    legs.push(leg);
    transitions.push({ type: edge.type, name: edge.name, from: leg.ck, to: at.ck });
    leg = { ck: at.ck, levelId: parseCopyKey(at.ck).levelId, floor: parseCopyKey(at.ck).floor, points: [at], pointKeys: [], px: 0, from: at.name, to: '' };
  }
  leg.to = built.position.get(found.path[found.path.length - 1])!.name;
  legs.push(leg);

  const steps: WfRouteStep[] = [];
  legs.forEach((row, index) => {
    if (row.points.length > 1 || legs.length === 1) {
      steps.push({
        kind: 'walk',
        ck: row.ck,
        legIndex: index,
        title: t(R.stepWalk, { floor: name(row.ck) }),
        sub: t(R.stepWalkSub, { from: row.from || i18n.t(R.hallway), to: row.to || i18n.t(R.hallway), px: Math.round(row.px).toLocaleString('en-US') })
      });
    }
    const next = transitions[index];
    if (!next) return;
    const a1 = copyOf(next.from);
    const b1 = copyOf(next.to);
    if (next.type === 'outdoor') {
      const [out, into] = next.name.split('|');
      steps.push({ kind: 'outdoor', ck: next.to, legIndex: index + 1, title: t(R.stepOutdoor, { building: b1.level.sub }), sub: t(R.stepOutdoorSub, { from: out, to: into }) });
      return;
    }
    const fa = floorNumber(a1);
    const fb = floorNumber(b1);
    const floors = fa != null && fb != null ? Math.max(1, Math.abs(fa - fb)) : 1;
    const up = fa != null && fb != null ? fb > fa : true;
    steps.push({
      kind: next.type === 'stairs' ? 'stairs' : 'elevator',
      ck: next.to,
      legIndex: index + 1,
      title: t(R.stepRide, { name: next.name, floor: copyName(b1, false) }),
      sub: `${i18n.t(up ? R.up : R.down)} ${plural(floors, R.floorOne, R.floorMany)}`
    });
  });
  steps.push({ kind: 'end', ck: to.ck, legIndex: legs.length - 1, title: t(R.stepArrive, { name: to.label }), sub: name(to.ck) });

  const floorCount = new Set(legs.map((row) => row.ck)).size;
  const lifts = transitions.filter((row) => row.type === 'elevator').length;
  const stairs = transitions.filter((row) => row.type === 'stairs').length;
  const outdoors = transitions.filter((row) => row.type === 'outdoor').length;
  const summary = [
    plural(floorCount, R.floorOne, R.floorMany),
    lifts ? plural(lifts, R.liftOne, R.liftMany) : null,
    stairs ? plural(stairs, R.stairOne, R.stairMany) : null,
    outdoors ? plural(outdoors, R.outdoorOne, R.outdoorMany) : null
  ]
    .filter(Boolean)
    .join(' · ');

  return { ok: true, a, b, legs, steps, px: Math.round(legs.reduce((sum, row) => sum + row.px, 0)), multi: floorCount > 1, summary };
};

/**
 * "Try a sample route": a From and a To that do route, from the loaded
 * data — an entry or elevator to a unit on this floor, an entry or elevator
 * to a unit on another floor of the building, or a unit to a unit in another
 * building — tried in order until one works (at most 40 tries).
 */
export const sampleRoute = (input: WfRouteInput, groups: WfRouteGroup[]): { a: string; b: string; text: string; route: WfRouteResult } | null => {
  const flat = groups.flatMap((group) => group.items).filter((item) => item.anchor.linked);
  if (flat.length < 2) return null;
  const buildingOf = (item: WfEndpoint) => input.levels.find((level) => level.id === item.levelId)?.building ?? null;
  const lobby = (item: WfEndpoint) => /lobby/i.test(input.levels.find((level) => level.id === item.levelId)?.label ?? '');
  const middleOut = <T,>(rows: T[]): T[] => {
    const out: T[] = [];
    const m = Math.floor(rows.length / 2);
    for (let k = 0; k < rows.length; k += 1) {
      const i = m + (k % 2 ? -(k + 1) / 2 : k / 2);
      if (i >= 0 && i < rows.length) out.push(rows[i]);
    }
    return out;
  };
  const places = flat.filter((item) => item.anchor.kind !== 'stop');
  const here = input.current.building;
  let starts: WfEndpoint[] = [];
  let ends: WfEndpoint[] = [];
  if (input.scope === 'plate') {
    starts = [...flat.filter((item) => item.anchor.type === 'entry'), ...flat.filter((item) => item.anchor.type === 'elevator')];
    ends = [...places].reverse();
  } else if (input.scope === 'floors') {
    starts = [...flat.filter((item) => item.anchor.type === 'entry'), ...flat.filter((item) => item.anchor.type === 'elevator')];
    ends = middleOut(places.filter((item) => !lobby(item)));
  } else {
    starts = middleOut(places.filter((item) => buildingOf(item) === here));
    ends = middleOut(places.filter((item) => buildingOf(item) !== here));
  }
  if (!starts.length) starts = flat.slice(0, 1);
  if (!ends.length) ends = flat.filter((item) => item.anchor.kind === 'stop' && item.id !== starts[0]?.id);
  const began = Date.now();
  let tries = 0;
  for (const start of starts.slice(0, 4)) {
    for (const end of ends) {
      if (start.id === end.id) continue;
      tries += 1;
      if (tries > 40 || Date.now() - began > 900) return null;
      const route = computeWayfindingRoute(input, groups, start.id, end.id);
      if (route.ok && (input.scope === 'plate' || route.multi)) {
        const label = (item: WfEndpoint) =>
          input.scope === 'plate' ? item.label : `${item.label} (${copyName({ ck: item.ck, level: input.levels.find((level) => level.id === item.levelId)!, floor: item.floor }, input.scope === 'buildings')})`;
        return { a: start.id, b: end.id, text: `${label(start)} → ${label(end)}`, route };
      }
    }
  }
  return null;
};
