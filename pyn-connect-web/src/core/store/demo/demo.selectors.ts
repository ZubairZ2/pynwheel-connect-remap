import type { Level, Org, Prop } from '~/core/models/data/connect/account.data';
import type { Inventory, Tour } from '~/core/models/data/connect/inventory.data';
import { DEFAULT_BED_COLORS, PROP_LEVELS } from '~/data/mock/core.mock';

import type { DemoState, PinRef } from './demo.state';

export const EMPTY_INVENTORY: Inventory = { floorplans: [], units: [], amenities: [], elevators: [] };

export const emptyTour = (): Tour => ({
  stops: [],
  junctions: [],
  edges: [],
  startPoints: {},
  published: false,
  publishedAt: null
});

export const curOrg = (s: DemoState): Org => s.orgs.find((o) => o.id === s.orgId) ?? s.orgs[0];
export const curProp = (s: DemoState): Prop => s.props.find((p) => p.id === s.propId) ?? s.props[0];
export const curTour = (s: DemoState): Tour => s.tours[s.propId] ?? emptyTour();
export const curInv = (s: DemoState): Inventory => s.inv[s.propId] ?? EMPTY_INVENTORY;

export const propCount = (s: DemoState, orgId: string): number =>
  s.props.filter((p) => p.orgId === orgId).length;

/**
 * Levels for the selected property: the seeded floorplates, plus anything the
 * user added, minus anything deleted, with per-level edits applied.
 */
export const levels = (s: DemoState): Level[] => {
  const base = PROP_LEVELS[s.propId] ?? [
    { id: 'gen-1', building: 'Main', floor: 'Floor 1', plan: 'None' as const, file: '' }
  ];
  const hidden = s.hiddenLevels[s.propId] ?? [];
  return [...base, ...(s.extraLevels[s.propId] ?? [])]
    .filter((l) => hidden.indexOf(l.id) < 0)
    .map((l) => ({ ...l, ...(s.levelEdits[l.id] ?? {}) }));
};

export const curLevel = (s: DemoState): Level => {
  const list = levels(s);
  return list.find((l) => l.id === s.levelId) ?? list[0];
};

export interface LevelAssets {
  svg: string;
  bg: string;
  has: boolean;
}

export const lvAssets = (s: DemoState, lv: Level | undefined): LevelAssets => {
  if (!lv) return { svg: '', bg: '', has: false };
  const svg = s.lvSvg[lv.id] !== undefined ? s.lvSvg[lv.id] : lv.plan === 'SVG' ? lv.file : '';
  const bg = s.lvBg[lv.id] !== undefined ? s.lvBg[lv.id] : lv.plan === 'Raster' ? lv.file : '';
  return { svg, bg, has: !!(svg || bg) };
};

export const lvAssetsOf = (s: DemoState, lvId: string): LevelAssets =>
  lvAssets(s, levels(s).find((l) => l.id === lvId));

export const bedColorsFor = (s: DemoState): Record<string, string> => ({
  ...DEFAULT_BED_COLORS,
  ...(s.bedColors[s.propId] ?? {})
});

export const invItem = (s: DemoState, kind: PinRef['kind'], id: string) => {
  const inv = curInv(s);
  return (kind === 'unit' ? inv.units : inv.amenities).find((x) => x.id === id);
};

export const pinLevelOf = (item: { plevel?: string; level: string }): string => item.plevel ?? item.level;

/** Stops and junctions of the current tour in one list, as the map editor needs. */
export const allNodes = (s: DemoState) => {
  const t = curTour(s);
  return [
    ...t.stops.map((stop) => ({ ...stop, kind: 'stop' as const, label: stop.name })),
    ...t.junctions.map((j) => ({ ...j, kind: 'junction' as const, name: j.label }))
  ];
};

export const nodeById = (s: DemoState, id: string | null) =>
  id ? allNodes(s).find((n) => n.id === id) : undefined;

/** The next thing waiting to be plotted, preferring the level on screen. */
export const nextUnplotted = (s: DemoState, skipId: string): PinRef | null => {
  const inv = curInv(s);
  const pool = [
    ...inv.units.map((u) => ({ kind: 'unit' as const, o: u })),
    ...inv.amenities.map((a) => ({ kind: 'amenity' as const, o: a }))
  ].filter((x) => !x.o.plotted && x.o.id !== skipId);

  const same = pool.find((x) => pinLevelOf(x.o) === s.levelId);
  const pick = same ?? pool[0];
  return pick ? { kind: pick.kind, id: pick.o.id } : null;
};

export const curFees = (s: DemoState) => s.fees[s.propId] ?? { published: false, draftDirty: false, fees: [] };
export const curPcalc = (s: DemoState) => s.pcalc[s.propId] ?? { published: false, draftDirty: false, cats: [] };
export const curCfg = (s: DemoState) => s.brochureCfg[s.propId] ?? s.brochureCfg.wharf;
export const curTheme = (s: DemoState) => s.themes[s.propId] ?? s.themes.wharf;
export const curResident = (s: DemoState) => {
  const list = s.residents[s.propId] ?? [];
  return list.find((r) => r.id === s.residentId) ?? list[0];
};
export const curBooking = (s: DemoState) =>
  s.bookings.find((b) => b.id === s.bookingId) ?? s.bookings[0];
