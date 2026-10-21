import { describe, expect, it } from 'vitest';
import type { AvailabilityDay, BookingSettings } from '~/repositories/tourRepository';
import { initialAppState, initialBooking } from './appState';
import { reducer } from './reducer';
import { afterSlots, dayNote, daySlots, isAfterHours, slotByLabel, slotsForDay, tourLengthOptions } from './views';

const NOW = new Date(2026, 9, 19, 9, 0, 0).getTime(); // Mon Oct 19 2026, 9:00 AM local
const key = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const settings = (patch: Partial<BookingSettings['app']> = {}, guided = true, length = 45): BookingSettings => ({
  propertyId: 1618,
  timeZone: 'America/Vancouver',
  bookable: true,
  schedulerEnabled: true,
  gateError: null,
  tourTypes: { selfTour: true, guidedTour: guided },
  slotIntervalMinutes: 60,
  onlyScheduledTour: true,
  gracePeriod: 45,
  lengthStayLimit: length,
  window: { bufferMinutes: 0, minimumNoticeMinutes: 0, bookingHorizonDays: null },
  app: { afterHoursLabel: true, allowShorterTour: true, partySizeLimit: 6, askUnit: true, showTextBooking: true, ...patch },
  form: { showDesiredBedroom: true, showDesiredMoveInDate: true, creditCardRequired: false },
  closures: [],
  linkUrl: null
});

const slot = (time: string, label: string, types = ['self_tour', 'guided_tour'], full: string[] = []) => ({ time, label, types, full });
const today: AvailabilityDay = {
  date: key(0),
  closed: false,
  beyondHorizon: false,
  closureLabel: null,
  slots: [slot('08:00', '8:00 AM'), slot('10:00', '10:00 AM'), slot('11:00', '11:00 AM', ['self_tour', 'guided_tour'], ['self_tour']), slot('18:00', '6:00 PM', ['self_tour']), slot('19:00', '7:00 PM', ['guided_tour'])]
};
const holiday: AvailabilityDay = { date: key(1), closed: true, beyondHorizon: false, closureLabel: 'Staff training', slots: [] };
const far: AvailabilityDay = { date: key(2), closed: true, beyondHorizon: true, closureLabel: null, slots: [] };

describe('the schedule slots from the CMS availability', () => {
  const booking = { ...initialBooking(), settings: settings(), days: { [key(0)]: today, [key(1)]: holiday, [key(2)]: far } };

  it('offers the self-tour slots that are still ahead and not full, after-hours apart', () => {
    expect(daySlots(booking, key(0), NOW)).toEqual(['10:00 AM']);
    expect(afterSlots(booking, key(0), NOW)).toEqual(['6:00 PM']);
    expect(slotsForDay(booking, key(0), NOW)).toEqual(['10:00 AM', '6:00 PM']);
    expect(slotByLabel(booking, key(0), '6:00 PM', NOW)?.time).toBe('18:00');
    expect(slotByLabel(booking, key(0), '8:00 AM', NOW)).toBeNull();
  });

  it('keeps every time in the day list when the property has no agent tours or turns the label off', () => {
    expect(afterSlots({ ...booking, settings: settings({}, false) }, key(0), NOW)).toEqual([]);
    expect(daySlots({ ...booking, settings: settings({ afterHoursLabel: false }) }, key(0), NOW)).toEqual(['10:00 AM', '6:00 PM']);
    expect(isAfterHours(null, slot('18:00', '6:00 PM', ['self_tour']))).toBe(false);
  });

  it('explains a closed day', () => {
    expect(dayNote(booking, key(1))).toBe('Closed · Staff training');
    expect(dayNote(booking, key(2))).toBe('Too far ahead to book yet');
    expect(dayNote(booking, key(5))).toBeNull();
  });

  it('offers up to three tour lengths ending at the length of tour', () => {
    expect(tourLengthOptions(settings())).toEqual([30, 45]);
    expect(tourLengthOptions(settings({}, true, 90))).toEqual([30, 45, 60, 90]);
    expect(tourLengthOptions(settings({ allowShorterTour: false }, true, 60))).toEqual([60]);
    expect(tourLengthOptions(null)).toEqual([30, 45]);
  });
});

describe('the booking reducer', () => {
  it('loads the rules and keeps or replaces the draft time', () => {
    const base = { ...initialAppState(), schedule: { date: key(0), time: '8:00 AM', length: 45, unit: '', party: 1, first: '', last: '', phone: '', bedroom: '', moveIn: '' } };
    const loading = reducer(base, { type: 'bookingLoading', propertyId: 1618 });
    expect(loading.booking.status).toBe('loading');
    const loaded = reducer(loading, { type: 'bookingLoaded', propertyId: 1618, settings: settings(), days: [today, holiday], now: NOW });
    expect(loaded.booking.status).toBe('ready');
    expect(Object.keys(loaded.booking.days)).toEqual([key(0), key(1)]);
    expect(loaded.schedule.time).toBe('10:00 AM');
    const kept = reducer({ ...loaded, schedule: { ...loaded.schedule, time: '6:00 PM' } }, { type: 'bookingLoaded', propertyId: 1618, settings: settings(), days: [today], now: NOW });
    expect(kept.schedule.time).toBe('6:00 PM');
    const closedToday = { ...today, slots: [] };
    const moved = reducer(base, { type: 'bookingLoaded', propertyId: 1618, settings: settings(), days: [closedToday, holiday, { ...today, date: key(3) }], now: NOW });
    expect(moved.schedule.date).toBe(key(3));
    expect(moved.schedule.time).toBe('8:00 AM');
    const failed = reducer(loaded, { type: 'bookingFailed', message: 'offline' });
    expect(failed.booking).toMatchObject({ status: 'error', error: 'offline', settings: settings() });
  });

  it('tracks a booking in flight and its refusal', () => {
    const saving = reducer(initialAppState(), { type: 'bookingSaving' });
    expect(saving.booking.saving).toBe(true);
    const refused = reducer(saving, { type: 'bookingSaveFailed', message: 'That time is full for App Guided Tour.' });
    expect(refused.booking).toMatchObject({ saving: false, saveError: 'That time is full for App Guided Tour.' });
  });
});
