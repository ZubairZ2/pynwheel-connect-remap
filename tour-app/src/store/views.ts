import communityPhoto from '~/assets/images/community-pool.jpg';
import sitePlan from '~/assets/images/site-plan.png';
import { AFTER_HOURS_SLOTS, DAY_SLOTS, DEMO, LEASE_TERM_FACTORS } from '~/content/demoFixtures';
import type { Unit } from '~/models';
import type { AppContent, PropertyBundle } from '~/repositories/tourRepository';
import type { AppState } from './appState';
import { dayKey } from './appState';
import { slotTime } from './scenarios';
import { markOf, unitLabel, unitPrice, type TourStopView } from './selectors';

/**
 * Derived views for the design refresh's screens: the schedule's slots, the
 * tour's starting points (the property's gates), the visitor's profile, the
 * unit facts the Stop screen shows and the Build Your Tour grouping. Pure
 * functions of the state and the loaded data.
 */

/** The self-tour slots of a day; today's slots that have passed are left out. */
export const daySlots = (date: string, now = Date.now()): string[] => DAY_SLOTS.filter((t) => date !== dayKey(0, new Date(now)) || slotTime(date, t) > now);
export const afterSlots = (date: string, now = Date.now()): string[] => AFTER_HOURS_SLOTS.filter((t) => date !== dayKey(0, new Date(now)) || slotTime(date, t) > now);
export const slotsForDay = (date: string, now = Date.now()): string[] => [...daySlots(date, now), ...afterSlots(date, now)];

export interface StartPoint {
  id: string;
  name: string;
  where: string;
  hint: string;
  img: string;
}

/** Where a tour starts: the tour's start gate, and with the Multiple scenario every entry gate of the property. */
export const startPoints = (bundle: PropertyBundle, scenario: 'one' | 'multiple'): StartPoint[] => {
  const mark = markOf(bundle);
  const nodes = new Map(bundle.graph.nodes.map((n) => [n.id, n]));
  const label = (id: string, fallback: string) => (nodes.get(id)?.name ?? fallback).replace(/ \*$/, '') + mark;
  const whereOf = (id: string) => {
    const n = nodes.get(id);
    const building = n?.building ? `${n.building.replace(/ \*$/, '')} · ` : '';
    const level = bundle.levels.find((l) => l.id === n?.level);
    const floor = n?.floor != null ? `Floor ${n.floor}` : level?.kind === 'sitemap' ? 'Property grounds' : (level?.name.replace(/ \*$/, '') ?? 'Entrance');
    return `${building}${floor}${mark}`;
  };
  const start = bundle.graph.tour?.start ?? null;
  const gates = bundle.graph.gates.filter((g) => g.kind === 'tour_start' || g.kind === 'entry');
  const ids = [...new Set([...(start ? [start] : []), ...gates.map((g) => g.id)])];
  const list = ids.map((id, i) => ({
    id,
    name: label(id, i === 0 ? 'Main Entrance' : 'Entrance'),
    where: whereOf(id),
    hint: i === 0 ? 'Look for the Pynwheel sign next to the front desk. Your phone confirms when you are here.' : 'Tap Start when you are in front of the door.',
    img: i % 2 === 0 ? sitePlan : communityPhoto
  }));
  if (!list.length) list.push({ id: 'start', name: `Main Entrance${mark}`, where: `Entrance${mark}`, hint: 'Your tour starts and finishes here.', img: sitePlan });
  return scenario === 'multiple' ? list : list.slice(0, 1);
};

export interface Profile {
  first: string;
  last: string;
  email: string;
  phone: string;
  initial: string;
}

/** The signed-in user with the visitor's local edits over it. */
export const profileOf = (state: Pick<AppState, 'user' | 'profileEdits' | 'guest'>, content: AppContent | null): Profile => {
  const name = (state.user?.name ?? content?.visitor.name ?? '').replace(/ \*$/, '').trim();
  const [first = '', ...rest] = name.split(/\s+/);
  const p = {
    first: state.profileEdits.first ?? first,
    last: state.profileEdits.last ?? rest.join(' '),
    email: state.profileEdits.email ?? state.user?.email ?? content?.visitor.email.replace(/ \*$/, '') ?? '',
    phone: state.profileEdits.phone ?? (content?.visitor.phone ?? '')
  };
  return { ...p, initial: (p.first || 'G').charAt(0).toUpperCase() };
};

export interface UnitFacts {
  price: string;
  rent: number | null;
  beds: string;
  sqft: string | null;
  avail: string;
  availShort: string;
  /** Rent per lease term (demo factors over the published rent). */
  terms: Record<3 | 6 | 9 | 12, number> | null;
}

export const unitFacts = (unit: Unit, mark = ''): UnitFacts => {
  const terms = unit.rent != null ? { 3: Math.round(unit.rent * LEASE_TERM_FACTORS[3]), 6: Math.round(unit.rent * LEASE_TERM_FACTORS[6]), 9: Math.round(unit.rent * LEASE_TERM_FACTORS[9]), 12: unit.rent } : null;
  return {
    price: unitPrice(unit, mark),
    rent: unit.rent,
    beds: unitLabel(unit, mark),
    sqft: unit.sqft != null ? `${unit.sqft.toLocaleString('en-US')} sq ft` : null,
    avail: unit.available ? 'Available now' : 'Leased',
    availShort: unit.available ? 'Now' : 'Leased',
    terms
  };
};

export const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

/** Stops grouped by the level label the data gives them ("Tower A · Floor 2"), in building / floor order. */
export interface StopGroup {
  label: string;
  items: TourStopView[];
}

export const groupStops = (stops: TourStopView[]): StopGroup[] => {
  const groups = new Map<string, TourStopView[]>();
  stops.forEach((s) => {
    const key = s.floor || (s.kind === 'unit' ? 'Units' : 'Amenities');
    groups.set(key, [...(groups.get(key) ?? []), s]);
  });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
};

/** The level and floor a stop stands on, for the Build map. */
export const levelOfStop = (bundle: PropertyBundle, node: string): { level: string; floor: number | null } | null => {
  const n = bundle.graph.nodes.find((x) => x.id === node);
  return n ? { level: n.level, floor: n.floor } : null;
};

/** The demo marker for text the design shows but the backend does not provide. */
export const demoMark = (bundle: PropertyBundle | null): string => (bundle?.demo ? DEMO : DEMO);
