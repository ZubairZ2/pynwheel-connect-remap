import { plural } from '~/core/utils/connect/format';
import { BED_SWATCHES, BED_TIERS, STOP_ICONS } from '~/data/mock/core.mock';
import {
  allNodes,
  bedColorsFor,
  curInv,
  curTour,
  levels,
  nodeById,
  pinLevelOf
} from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

import { photoSrc } from './inventory.generator';

export const generateTsTabs = (state: DemoState) => {
  const tour = curTour(state);
  const inv = curInv(state);

  return [
    { id: 'stops', label: 'Tour Stops', n: tour.stops.length },
    { id: 'elevators', label: 'Elevators & Locks', n: inv.elevators.length },
    { id: 'routing', label: 'Routing', n: tour.edges.length }
  ].map((tab) => ({
    ...tab,
    count: String(tab.n),
    active: state.tsTab === tab.id,
    bg: state.tsTab === tab.id ? 'var(--bo-ink)' : '#fff',
    color: state.tsTab === tab.id ? '#fff' : 'var(--bo-muted)',
    border: state.tsTab === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)',
    badgeBg: state.tsTab === tab.id ? 'rgba(255,255,255,0.16)' : '#EEF0F4',
    badgeColor: state.tsTab === tab.id ? '#fff' : 'var(--bo-subtle)'
  }));
};

/** Inventory records that are not yet a tour stop. */
export const stopSourceOptions = (state: DemoState): string[] => {
  const inv = curInv(state);
  const taken = curTour(state).stops.map((s) => s.name);
  return [...inv.units.map((u) => u.name), ...inv.amenities.map((a) => a.name)].filter(
    (name) => taken.indexOf(name) < 0
  );
};

export const generateTourStops = (state: DemoState) => {
  const tour = curTour(state);
  const inv = curInv(state);
  const levelList = levels(state);

  const pool = [
    ...inv.units.map((u) => ({ kind: 'unit' as const, o: u })),
    ...inv.amenities.map((a) => ({ kind: 'amenity' as const, o: a }))
  ].map((x) => ({ ...x, placed: !!x.o.plotted && typeof x.o.px === 'number' }));

  return tour.stops.map((stop, index) => {
    const source = pool.find((x) => x.o.name === stop.name);
    const level =
      levelList.find((l) => l.id === (stop.level || (source ? pinLevelOf(source.o) : ''))) ?? levelList[0];
    const placed = !!source?.placed;

    return {
      ...stop,
      slotId: `ts-${state.propId}-${stop.id}`,
      posLabel: index + 1,
      img: photoSrc(stop.icon === 'wave' ? 'pool' : 'thumb'),
      sourceLabel: source
        ? source.kind === 'unit'
          ? 'From unit inventory'
          : 'From amenity inventory'
        : 'Custom stop',
      plotV: placed ? 'ok' : 'warn',
      plotLabel: placed ? 'Plotted' : 'Not Plotted',
      whereLabel: level ? `${level.building} · ${level.floor}` : '—',
      viewLabel: placed ? 'View on Plan' : 'Plot on Plan',
      sourceKind: source?.kind,
      sourceId: source?.o.id,
      placed,
      levelId: level?.id
    };
  });
};

export const generateElevators = (state: DemoState) =>
  curInv(state).elevators.map((elevator) => ({
    ...elevator,
    rangeLabel: `${elevator.floorFrom} → ${elevator.floorTo}`,
    lockLabel: elevator.lockGated ? `Gated · ${elevator.vendor}` : 'Open access',
    lockV: elevator.lockGated ? 'ok' : 'neutral',
    toggleBg: elevator.lockGated ? 'var(--bo-accent)' : '#CDD2DB',
    knob: elevator.lockGated ? '21px' : '3px',
    photoCount: plural(elevator.gallery.length, 'photo'),
    photos: elevator.gallery.map((key, index) => ({ src: photoSrc(key), pos: `#${index + 1}`, index }))
  }));

export const generateStartPointRows = (state: DemoState) => {
  const tour = curTour(state);
  const buildings = [...new Set(levels(state).map((l) => l.building))];

  return buildings.map((building) => {
    const id = tour.startPoints[building];
    const node = id ? nodeById(state, id) : undefined;
    return {
      building,
      name: node?.name ?? 'Not set',
      v: node ? 'ok' : 'crit',
      state: node ? 'Set' : 'Required'
    };
  });
};

export const generateStartPointsMissing = (state: DemoState): boolean => {
  const tour = curTour(state);
  return [...new Set(levels(state).map((l) => l.building))].some((b) => !tour.startPoints[b]);
};

export const generateVerticalLinks = (state: DemoState) => {
  const tour = curTour(state);
  const levelList = levels(state);

  return tour.edges
    .map(([a, b]) => {
      const nodeA = nodeById(state, a);
      const nodeB = nodeById(state, b);
      if (!nodeA || !nodeB) return null;
      const levelA = levelList.find((l) => l.id === (nodeA.level || levelList[0]?.id)) ?? levelList[0];
      const levelB = levelList.find((l) => l.id === (nodeB.level || levelList[0]?.id)) ?? levelList[0];
      if (levelA?.id === levelB?.id) return null;
      return {
        from: `${nodeA.name} · ${levelA?.floor}`,
        to: `${nodeB.name} · ${levelB?.floor}`,
        kind: levelA?.building !== levelB?.building ? 'Building transfer' : 'Elevator / stair'
      };
    })
    .filter((link): link is { from: string; to: string; kind: string } => !!link);
};

export const generateStopOptions = (state: DemoState) => {
  const levelList = levels(state);
  return curTour(state).stops.map((stop) => ({
    id: stop.id,
    name: `${stop.name} · ${
      (levelList.find((l) => l.id === (stop.level || levelList[0]?.id)) ?? levelList[0])?.floor ?? ''
    }`
  }));
};

export const generateBedLegend = (state: DemoState) => {
  const colors = bedColorsFor(state);
  return BED_TIERS.map((tier) => ({
    ...tier,
    color: colors[tier.id],
    swatches: BED_SWATCHES.map((swatch) => ({
      c: swatch,
      active: colors[tier.id] === swatch,
      ring: colors[tier.id] === swatch ? '2px solid var(--bo-ink)' : '1px solid var(--bo-line)'
    }))
  }));
};

/** Picks a stop icon from an amenity's category, as the design does. */
export const stopIconFor = (category: string | undefined, isUnit: boolean): string => {
  if (isUnit) return 'bed';
  if (/pool/i.test(category ?? '')) return 'wave';
  if (/fitness|yoga/i.test(category ?? '')) return 'dumbbell';
  return 'star';
};

export const STOP_ICON_OPTIONS = STOP_ICONS;

export const generateNodeCount = (state: DemoState): number => allNodes(state).length;
