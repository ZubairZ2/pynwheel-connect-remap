import communityPhoto from '~/assets/images/community-pool.jpg';
import sitePlan from '~/assets/images/site-plan.png';
import { DEMO, LEASE_TERM_FACTORS } from '~/content/demoFixtures';
import type { Unit } from '~/models';
import type { AppContent, AvailabilitySlot, BookingSettings, PropertyBundle } from '~/repositories/tourRepository';
import type { AppState, BookingState } from './appState';
import { dayKey } from './appState';
import { slotTime } from './scenarios';
import { availabilityText } from './access';
import { markOf, unitLabel, unitPrice, type TourStopView } from './selectors';

/**
 * Derived views for the design refresh's screens: the schedule's slots, the
 * tour's starting points (the property's gates), the visitor's profile, the
 * unit facts the Stop screen shows and the Build Your Tour grouping. Pure
 * functions of the state and the loaded data.
 */

/**
 * The self-tour slots of a day, from the booking rules the CMS answered: a
 * slot the self-guided type is open at and not full for, and not already
 * passed today. "After hours" are the self-only times when the property also
 * offers agent-guided tours and the app option labels them so.
 */
export const bookableSlots = (booking: Pick<BookingState, 'days'>, date: string, now = Date.now()): AvailabilitySlot[] =>
  (booking.days[date]?.slots ?? []).filter((s) => s.types.includes('self_tour') && !s.full.includes('self_tour') && (date !== dayKey(0, new Date(now)) || slotTime(date, s.label) > now));

export const isAfterHours = (settings: BookingSettings | null, slot: AvailabilitySlot): boolean => !!settings && settings.app.afterHoursLabel && settings.tourTypes.guidedTour && !slot.types.includes('guided_tour');

export const daySlots = (booking: Pick<BookingState, 'days' | 'settings'>, date: string, now = Date.now()): string[] =>
  bookableSlots(booking, date, now)
    .filter((s) => !isAfterHours(booking.settings, s))
    .map((s) => s.label);
export const afterSlots = (booking: Pick<BookingState, 'days' | 'settings'>, date: string, now = Date.now()): string[] =>
  bookableSlots(booking, date, now)
    .filter((s) => isAfterHours(booking.settings, s))
    .map((s) => s.label);
export const slotsForDay = (booking: Pick<BookingState, 'days' | 'settings'>, date: string, now = Date.now()): string[] => [...daySlots(booking, date, now), ...afterSlots(booking, date, now)];

/** The slot behind a label of a day, for the booking's `HH:MM`. */
export const slotByLabel = (booking: Pick<BookingState, 'days'>, date: string, label: string, now = Date.now()): AvailabilitySlot | null => bookableSlots(booking, date, now).find((s) => s.label === label) ?? null;

/** Why a day has no times: closed, a closure, beyond the horizon, or simply nothing left. */
export const dayNote = (booking: Pick<BookingState, 'days'>, date: string): string | null => {
  const day = booking.days[date];
  if (!day) return null;
  if (day.closureLabel) return `Closed · ${day.closureLabel}`;
  if (day.beyondHorizon) return 'Too far ahead to book yet';
  if (day.closed) return 'Closed';
  return null;
};

/** The tour lengths the Schedule screen offers: up to three, ending at the length of tour, or just that length. */
export const tourLengthOptions = (settings: BookingSettings | null): number[] => {
  const limit = settings?.lengthStayLimit ?? 45;
  if (settings && !settings.app.allowShorterTour) return [limit];
  return [...new Set([30, 45, 60].filter((n) => n < limit).concat(limit))].sort((a, b) => a - b);
};

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

/** The signed-in user with the visitor's local edits over it; a visitor session's phone comes from the visitor record. */
export const profileOf = (state: Pick<AppState, 'user' | 'profileEdits' | 'guest'>, content: AppContent | null): Profile => {
  const name = (state.user?.name ?? content?.visitor.name ?? '').replace(/ \*$/, '').trim();
  const [first = '', ...rest] = name.split(/\s+/);
  const p = {
    first: state.profileEdits.first ?? first,
    last: state.profileEdits.last ?? rest.join(' '),
    email: state.profileEdits.email ?? state.user?.email ?? content?.visitor.email.replace(/ \*$/, '') ?? '',
    phone: state.profileEdits.phone ?? state.user?.phone ?? (content?.visitor.phone ?? '')
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
  /**
   * Rent per lease term: the property's published lease pricing on real
   * data (`unit.leaseTerms`, empty when the CMS publishes none); the demo
   * factors over the rent only on demo data, where the labels carry `*`.
   */
  terms: { months: number; rent: number }[];
  /** True when `terms` are demo factors, not published pricing. */
  termsDemo: boolean;
}

export const unitFacts = (unit: Unit, mark = ''): UnitFacts => {
  const published = unit.leaseTerms ?? [];
  const demoTerms = mark && unit.rent != null ? ([3, 6, 9, 12] as const).map((m) => ({ months: m, rent: Math.round(unit.rent! * LEASE_TERM_FACTORS[m]) })) : [];
  const terms = published.length ? published : demoTerms;
  const availability = availabilityText(unit);
  return {
    price: unitPrice(unit, mark),
    rent: unit.rent,
    beds: unitLabel(unit, mark),
    sqft: unit.sqft != null ? `${unit.sqft.toLocaleString('en-US')} sq ft` : null,
    avail: availability ?? 'Availability not published',
    availShort: availability == null ? '—' : unit.available ? (unit.availableDate && Date.parse(unit.availableDate) > Date.now() ? unit.availableDate.slice(5, 10).replace('-', '/') : 'Now') : 'Leased',
    terms,
    termsDemo: !published.length && demoTerms.length > 0
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
