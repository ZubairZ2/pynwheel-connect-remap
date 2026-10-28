import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityDay, BookingSettings } from '~/repositories/tourRepository';
import { PynwheelApiTourRepository } from '~/repositories/pynwheelApi/pynwheelApiTourRepository';
import { initialAppState, type AppState } from './appState';
import { reducer } from './reducer';
import { dayLabelInZone } from './scenarios';
import { bookingRequestFor, profileOf, slotByLabel } from './views';
import { dayKeyInZone } from './zone';

/**
 * The owner's case (October 28, 2026): a phone in Asia/Karachi, where it is
 * already 02:36 on Oct 28, schedules a self-tour at John Pynwheel Demo 1411
 * (America/Denver), where it is still 15:36 on Oct 27. The Schedule screen's
 * week starts on the property's today, so the booked day, the confirmation
 * copy and `tour_date` must be the property's Oct 27, not the phone's Oct 28.
 */

const NOW = Date.parse('2026-10-28T02:36:00+05:00'); // Oct 27 15:36 in Denver
const TZ_BEFORE = process.env.TZ;

beforeAll(() => {
  process.env.TZ = 'Asia/Karachi';
});
afterAll(() => {
  if (TZ_BEFORE === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_BEFORE;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const settings: BookingSettings = {
  propertyId: 1411,
  timeZone: 'America/Denver',
  bookable: true,
  schedulerEnabled: true,
  gateError: null,
  tourTypes: { selfTour: true, guidedTour: true },
  slotIntervalMinutes: 15,
  onlyScheduledTour: true,
  gracePeriod: 10,
  lengthStayLimit: 45,
  window: { bufferMinutes: 0, minimumNoticeMinutes: 0, bookingHorizonDays: null },
  app: { afterHoursLabel: false, allowShorterTour: true, partySizeLimit: 6, askUnit: true, showTextBooking: true },
  form: { showDesiredBedroom: false, showDesiredMoveInDate: false, creditCardRequired: false },
  closures: [],
  linkUrl: null
};

const slot = (time: string, label: string) => ({ time, label, types: ['self_tour', 'guided_tour'], full: [] as string[] });
const day = (date: string, slots: ReturnType<typeof slot>[]): AvailabilityDay => ({ date, closed: false, beyondHorizon: false, closureLabel: null, slots });
const days: AvailabilityDay[] = [
  day('2026-10-27', [slot('15:30', '3:30 PM'), slot('15:45', '3:45 PM'), slot('16:00', '4:00 PM')]),
  day('2026-10-28', [slot('09:00', '9:00 AM'), slot('09:15', '9:15 AM'), slot('15:45', '3:45 PM')])
];

const visitor = (): AppState => ({ ...initialAppState(), signedIn: true, user: { name: 'Mary Ann Lee', firstName: 'Mary Ann', lastName: 'Lee', email: 'mary@example.test', phone: '+13035550100' }, propertyId: 1411, screen: 'home' });

/** The Schedule opened before the booking rules are known, then the rules arrive (the cold path through the reducer). */
const opened = (): AppState => {
  let state = reducer(visitor(), { type: 'selectProperty', propertyId: 1411, then: 'schedule' });
  state = reducer(state, { type: 'bookingLoading', propertyId: 1411 });
  return reducer(state, { type: 'bookingLoaded', propertyId: 1411, settings, days, now: Date.now() });
};

describe('the Schedule day is the property calendar day (October 28, 2026)', () => {
  it('the phone is on Oct 28 while the property is on Oct 27', () => {
    expect(new Date(NOW).getDate()).toBe(28);
    expect(dayKeyInZone(NOW, 'America/Denver')).toBe('2026-10-27');
  });

  it('opens on the property today with its first slot still ahead, whatever the phone day', () => {
    const state = opened();
    expect(state.screen).toBe('schedule');
    expect(state.schedule.date).toBe('2026-10-27');
    expect(state.schedule.time).toBe('3:45 PM');
  });

  it('opens on the property today when the rules were already loaded', () => {
    const loaded = reducer(reducer(visitor(), { type: 'bookingLoading', propertyId: 1411 }), { type: 'bookingLoaded', propertyId: 1411, settings, days, now: Date.now() });
    const state = reducer(loaded, { type: 'selectProperty', propertyId: 1411, then: 'schedule' });
    expect(state.schedule.date).toBe('2026-10-27');
    expect(state.schedule.time).toBe('3:45 PM');
  });

  it('keeps a day the visitor picked, and moves a day that has passed at the property to its today', () => {
    const picked = reducer(opened(), { type: 'setSchedule', patch: { date: '2026-10-28', time: '9:15 AM' } });
    const again = reducer(picked, { type: 'bookingLoaded', propertyId: 1411, settings, days, now: Date.now() });
    expect([again.schedule.date, again.schedule.time]).toEqual(['2026-10-28', '9:15 AM']);
    const stale = reducer({ ...opened(), schedule: { ...opened().schedule, date: '2026-10-26', time: '3:45 PM' } }, { type: 'bookingLoaded', propertyId: 1411, settings, days, now: Date.now() });
    expect([stale.schedule.date, stale.schedule.time]).toEqual(['2026-10-27', '3:45 PM']);
  });

  it('labels the confirmation relative to the property today', () => {
    expect(dayLabelInZone('2026-10-27', 'America/Denver', NOW)).toBe('Today, Oct 27');
    expect(dayLabelInZone('2026-10-28', 'America/Denver', NOW)).toBe('Tomorrow, Oct 28');
    expect(dayLabelInZone('2026-10-30', 'America/Denver', NOW)).toBe('Fri, Oct 30');
    // Without a property zone the phone's calendar still decides (demo data).
    expect(dayLabelInZone('2026-10-28', null, NOW)).toBe('Today, Oct 28');
  });

  it('posts the property day and the slot clock as tour_date / tour_time', async () => {
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) });
    const state = opened();
    const slotOf = slotByLabel(state.booking, state.schedule.date, state.schedule.time);
    expect(slotOf?.time).toBe('15:45');
    const request = bookingRequestFor(state.schedule, slotOf!, profileOf(state, null), settings);
    expect(request).toMatchObject({ date: '2026-10-27', time: '15:45', tourType: 'self_tour', firstName: 'Mary Ann', lastName: 'Lee', email: 'mary@example.test', phone: '+13035550100' });

    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/login')) return new Response(JSON.stringify({ success: true, access_token: 'tok-1', token_type: 'bearer', expires_at: null, user: { id: 7, name: 'QA', email: 'qa@example.com', role: 'super_admin' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ success: true, booking: { id: 25600, status: 'upcoming', tour_date: '2026-10-27', tour_time: '15:45', tour_time_label: '3:45 PM', booked_at: '2026-10-27T15:45:00-06:00', time_zone: 'America/Denver', tour_type: 'self_tour' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    const repo = new PynwheelApiTourRepository({ baseUrl: 'http://cms.test', timeoutMs: 2000, fetchImpl });
    await repo.login('qa@example.com', 'secret');
    await repo.selectProperty(1411);
    const result = await repo.requestBooking(request);
    expect(bodies.at(-1)).toMatchObject({ tour_date: '2026-10-27', tour_time: '15:45', tour_type: 'self_tour' });
    expect(result.date).toBe('2026-10-27');
  });
});
