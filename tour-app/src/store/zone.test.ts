import { describe, expect, it } from 'vitest';
import { dayKeyInZone, dayOffsetInZone, parseClock, zoneOffsetMs, zonedSlotMs } from './zone';
import { autoTourScenario, tourDayLabel, tourStartMs } from './scenarios';
import type { ScheduledTour } from './appState';

// The owner's case (October 25, 2026): a Hazel (America/Vancouver) tour booked for Oct 25 10:00 AM from a phone in
// Asia/Karachi at 00:05 on Oct 25 PKT, which is 19:05 UTC on Oct 24 and 12:05 PDT on Oct 24.
const BOOKED = Date.UTC(2026, 9, 25, 17, 0); // Oct 25 10:00 PDT
const NOW = Date.UTC(2026, 9, 24, 19, 5);
const tour: ScheduledTour = { id: '25503', status: 'scheduled', date: '2026-10-25', time: '10:00 AM', length: 45, unit: 'No preference', party: 1, source: 'app', createdAt: NOW, bookingId: 25503, bookedAtMs: BOOKED, timeZone: 'America/Vancouver' };

describe('the property zone', () => {
  it('reads a wall clock in the property zone, across the DST change too', () => {
    expect(zonedSlotMs('2026-10-25', '10:00 AM', 'America/Vancouver')).toBe(BOOKED);
    expect(zonedSlotMs('2026-10-25', '10:00', 'America/Vancouver')).toBe(BOOKED);
    expect(zonedSlotMs('2026-11-01', '10:00 AM', 'America/Vancouver')).toBe(Date.UTC(2026, 10, 1, 18, 0)); // PST after the Nov 1 change
    expect(zonedSlotMs('2026-10-25', '10:00 AM', 'Asia/Karachi')).toBe(Date.UTC(2026, 9, 25, 5, 0));
    expect(zoneOffsetMs('America/Vancouver', BOOKED)).toBe(-7 * 3600000);
    expect(zoneOffsetMs('Asia/Karachi', BOOKED)).toBe(5 * 3600000);
    expect(parseClock('6:00 PM')).toEqual([18, 0]);
    expect(parseClock('12:15 AM')).toEqual([0, 15]);
    expect(parseClock('09:30:00')).toEqual([9, 30]);
    expect(parseClock('soon')).toBeNull();
  });

  it('names the day in the property zone', () => {
    expect(dayKeyInZone(NOW, 'America/Vancouver')).toBe('2026-10-24');
    expect(dayKeyInZone(NOW, 'Asia/Karachi')).toBe('2026-10-25');
    expect(dayKeyInZone(NOW, 'America/Vancouver', 1)).toBe('2026-10-25');
    expect(dayKeyInZone(Date.UTC(2026, 9, 31, 20, 0), 'America/Vancouver', 1)).toBe('2026-11-01');
    expect(dayOffsetInZone('2026-10-25', 'America/Vancouver', NOW)).toBe(1);
    expect(dayOffsetInZone('2026-10-25', 'Asia/Karachi', NOW)).toBe(0);
  });

  it('labels and times the booked tour as the CMS does, whatever the phone zone', () => {
    expect(tourStartMs(tour)).toBe(BOOKED);
    expect(tourDayLabel(tour, NOW)).toBe('Tomorrow, Oct 25');
    expect(tourDayLabel(tour, Date.UTC(2026, 9, 25, 15, 0))).toBe('Today, Oct 25');
    expect(tourDayLabel(tour, Date.UTC(2026, 9, 26, 15, 0))).toBe('Yesterday, Oct 25');
    // Without the CMS instant the wall clock is still read in the property's zone.
    expect(tourStartMs({ ...tour, bookedAtMs: null })).toBe(BOOKED);
  });

  it('opens Start Tour only inside the grace window, in the property zone', () => {
    expect(autoTourScenario(tour, NOW, 60)).toBe('upcoming');
    expect(autoTourScenario(tour, BOOKED - 61 * 60000, 60)).toBe('upcoming');
    expect(autoTourScenario(tour, BOOKED - 60 * 60000, 60)).toBe('today');
    expect(autoTourScenario(tour, BOOKED + 60 * 60000, 60)).toBe('today');
    expect(autoTourScenario(tour, BOOKED + 61 * 60000, 60)).toBe('missed');
    expect(autoTourScenario(tour, BOOKED + 11 * 60000)).toBe('missed');
    expect(autoTourScenario({ ...tour, status: 'checkedIn' }, BOOKED + 90 * 60000, 60)).toBe('today');
  });
});
