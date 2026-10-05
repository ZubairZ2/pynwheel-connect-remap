import type { MapLevel, RouteLeg, RouteStep, TransitionLeg, WalkLeg } from '~/models';
import type { RoutingIndex } from './graphIndex';

/**
 * The steps a route reads out and the time it takes — a port of
 * `Wayfinding::Timing` so the app phrases a route exactly as the backend
 * will. Walking speed 4.4 ft/s where a level has a scale; an elevator ride
 * 30 + 8 s per floor; stairs 15 s per floor. Pixels are converted to feet
 * only when a `scaleFtPerPx` is stored; nothing is assumed.
 */

export const WALK_FT_PER_S = 4.4;

const floorsBetween = (leg: TransitionLeg): number => (leg.floorFrom == null || leg.floorTo == null ? 1 : Math.max(1, Math.abs(leg.floorTo - leg.floorFrom)));

const scaleOf = (leg: WalkLeg, index: RoutingIndex): number | null => {
  const scale = index.levels.get(leg.level)?.scaleFtPerPx;
  return scale != null && scale > 0 ? scale : null;
};

export const feetOf = (legs: RouteLeg[], index: RoutingIndex): number | null => {
  let total = 0;
  for (const leg of legs) {
    if (leg.kind !== 'walk') continue;
    const scale = scaleOf(leg, index);
    if (scale == null) return null;
    total += leg.lengthPx * scale;
  }
  return Math.round(total * 10) / 10;
};

export const durationOf = (legs: RouteLeg[], index: RoutingIndex): number | null => {
  let total = 0;
  for (const leg of legs) {
    switch (leg.kind) {
      case 'walk': {
        const scale = scaleOf(leg, index);
        if (scale == null) return null;
        total += (leg.lengthPx * scale) / WALK_FT_PER_S;
        break;
      }
      case 'elevator':
      case 'ramp':
        total += 30 + 8 * floorsBetween(leg);
        break;
      case 'stairs':
        total += 15 * floorsBetween(leg);
        break;
      case 'outdoor': {
        // The backend answers no duration for an outdoor walk (it has no scale).
        // The app estimates one: the drawn polyline on the site plan at the
        // site plan's scale, else the nominal edge length at the first level's scale.
        const level = leg.level ? index.levels.get(leg.level) : undefined;
        const scale = level?.scaleFtPerPx ?? index.graph.levels.find((l) => l.kind === 'floorplate')?.scaleFtPerPx ?? null;
        if (scale == null || scale <= 0) return null;
        total += (leg.lengthPx * scale) / WALK_FT_PER_S;
        break;
      }
    }
  }
  return Math.round(total);
};

export const nameOf = (index: RoutingIndex, nodeId: string | null | undefined): string => {
  if (!nodeId) return 'the destination';
  const node = index.instances.get(nodeId)?.[0]?.node;
  if (node?.name) return node.name;
  const kind = nodeId.split(':')[0];
  return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ');
};

export const placeOf = (level: MapLevel | undefined, floor: number | null): string => {
  if (level?.kind === 'sitemap') return 'the property map';
  if (floor != null) return `Floor ${floor}`;
  return level?.name ?? 'the floor';
};

export const stepsOf = (legs: RouteLeg[], index: RoutingIndex): RouteStep[] => {
  const out: RouteStep[] = [];
  legs.forEach((leg) => {
    switch (leg.kind) {
      case 'walk': {
        if (leg.points.length < 2 && legs.length > 1) return;
        const scale = scaleOf(leg, index);
        const distance = scale ? `${Math.round(leg.lengthPx * scale)} ft` : `${Math.round(leg.lengthPx)} px`;
        out.push({ kind: 'walk', leg: leg.index, title: `Walk to ${nameOf(index, leg.to)}`, sub: `${distance} on ${placeOf(index.levels.get(leg.level), leg.floor)}` });
        break;
      }
      case 'elevator':
      case 'stairs':
      case 'ramp': {
        const floors = floorsBetween(leg);
        const direction = leg.floorTo != null && leg.floorFrom != null && leg.floorTo < leg.floorFrom ? 'Down' : 'Up';
        const verb = leg.kind === 'stairs' ? 'Take the stairs' : leg.kind === 'ramp' ? 'Take the ramp' : `Take ${leg.name ?? 'the elevator'}`;
        out.push({ kind: leg.kind, leg: leg.index, title: `${verb} to Floor ${leg.floorTo ?? '?'}`, sub: `${direction} ${floors} ${floors === 1 ? 'floor' : 'floors'}` });
        break;
      }
      case 'outdoor': {
        const [outName, inName] = (leg.name ?? '|').split('|');
        out.push({ kind: 'outdoor', leg: leg.index, title: `Walk outside to ${nameOf(index, leg.to)}`, sub: `Leave by ${outName || 'the exit'}, enter by ${inName || 'the entrance'}` });
        break;
      }
    }
  });
  const last = legs[legs.length - 1];
  if (last) {
    const destination = index.instances.get(last.to)?.[0];
    const note = destination?.node.note;
    const walk = last.kind === 'walk' ? last : null;
    out.push({ kind: 'arrive', leg: last.index, title: `Arrive at ${nameOf(index, last.to)}`, sub: note || placeOf(walk ? index.levels.get(walk.level) : destination?.level, walk ? walk.floor : (destination?.floor ?? null)) });
  }
  return out;
};
