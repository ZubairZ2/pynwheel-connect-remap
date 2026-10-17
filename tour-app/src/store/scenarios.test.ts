import { describe, expect, it } from 'vitest';
import { initialAppState, type ScheduledTour } from './appState';
import { autoTourScenario, checkinModel, dayLabel, dayOffset, fmtCountdown, locationModel, resolveTourScenario, slotTime, tourCard } from './scenarios';

const NOW = new Date(2026, 9, 17, 14, 0, 0).getTime(); // Sat Oct 17 2026, 2:00 PM local

const key = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const booked = (patch: Partial<ScheduledTour> = {}): ScheduledTour => ({ id: 't1', status: 'scheduled', date: key(0), time: '6:00 PM', length: 45, unit: 'Unit 204', party: 1, source: 'app', createdAt: NOW, ...patch });

describe('day helpers', () => {
  it('labels today, tomorrow and other days', () => {
    expect(dayLabel(key(0), new Date(NOW))).toBe('Today, Oct 17');
    expect(dayLabel(key(1), new Date(NOW))).toBe('Tomorrow, Oct 18');
    expect(dayLabel(key(3), new Date(NOW))).toBe('Tue, Oct 20');
    expect(dayOffset(key(-1), new Date(NOW))).toBe(-1);
  });
  it('turns a slot into a local time and a countdown', () => {
    expect(slotTime(key(0), '6:00 PM') - NOW).toBe(4 * 3600000);
    expect(fmtCountdown(4 * 3600000)).toBe('Starts in 4:00:00');
    expect(fmtCountdown(0)).toBe('Check-in open');
    expect(fmtCountdown(3 * 86400000)).toBe('In 3 days');
  });
});

describe('tour scenario (the confirmTourScenario tweak)', () => {
  it('derives the scenario from the local booking when the demo switch is auto', () => {
    expect(autoTourScenario(null, NOW)).toBe('none');
    expect(autoTourScenario(booked(), NOW)).toBe('today');
    expect(autoTourScenario(booked({ date: key(2) }), NOW)).toBe('upcoming');
    expect(autoTourScenario(booked({ status: 'pending' }), NOW)).toBe('pending');
    expect(autoTourScenario(booked({ status: 'cancelled' }), NOW)).toBe('cancelled');
    expect(autoTourScenario(booked({ status: 'past' }), NOW)).toBe('past');
    expect(autoTourScenario(booked({ date: key(-1), time: '2:00 PM' }), NOW)).toBe('missed');
    expect(autoTourScenario(booked({ status: 'checkedIn' }), NOW)).toBe('today');
  });
  it('lets the demo switch force every variant, with a placeholder tour when nothing was booked', () => {
    const s = initialAppState();
    for (const scenario of ['today', 'upcoming', 'pending', 'past', 'missed', 'cancelled'] as const) {
      const state = { ...s, demo: { ...s.demo, tour: scenario } };
      expect(resolveTourScenario(state, NOW)).toBe(scenario);
      const card = tourCard(state, NOW, 'Luxe Mile High');
      expect(card?.scenario).toBe(scenario);
      expect(card?.cta.length).toBeGreaterThan(0);
    }
    expect(tourCard({ ...s, demo: { ...s.demo, tour: 'none' } }, NOW, 'x')).toBeNull();
    expect(tourCard(s, NOW, 'x')).toBeNull();
  });
  it('shows the checked-in countdown once the visitor has checked in', () => {
    const s = { ...initialAppState(), scheduledTour: booked({ status: 'checkedIn' }), checkedIn: true, accessEndsAt: NOW + 10 * 60000 };
    const card = tourCard(s, NOW, 'x');
    expect(card?.cta).toBe('Continue Tour');
    expect(card?.countdown).toBe('Checked in · 10:00 left');
    expect(card?.tone).toBe('live');
  });
});

describe('location scenario (the locationScenario tweak)', () => {
  it('follows the permission the visitor gave in auto mode', () => {
    const s = initialAppState();
    expect(locationModel(s, 'Luxe', '3401 Blake St, Denver').perm).toBe('ask');
    expect(locationModel({ ...s, location: { ...s.location, perm: 'off' } }, 'Luxe', '3401 Blake St').offTitle).toBe('Location is off');
    const on = locationModel({ ...s, location: { ...s.location, perm: 'on' } }, 'Luxe', '3401 Blake St, Denver');
    expect(on.perm).toBe('on');
    expect(on.atProperty).toBe(false);
    expect(on.line).toBe('0.3 mi from Luxe *');
    expect(locationModel({ ...s, location: { ...s.location, perm: 'on' }, checkedIn: true }, 'Luxe', 'a').atProperty).toBe(true);
  });
  it('forces every variant from the demo switch', () => {
    const s = initialAppState();
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'denied' } }, 'L', 'a').perm).toBe('off');
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'atProperty' } }, 'L', 'a').line).toBe("You're at L *");
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'nearby' } }, 'L', 'a').atProperty).toBe(false);
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'approximate' } }, 'L', '3401 Blake St, Denver').primaryAction).toBe('qr');
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'offline' } }, 'L', 'a').lineSub).toBe('· Offline');
    expect(locationModel({ ...s, demo: { ...s.demo, location: 'preciseOff' } }, 'L', 'a').primaryAction).toBe('settings');
  });
});

describe('check-in sheet', () => {
  const base = { ...initialAppState(), scheduledTour: booked() };
  it('is ready at the property when verified, asks for the ID otherwise', () => {
    const at = { ...base, demo: { ...base.demo, location: 'atProperty' as const } };
    expect(checkinModel(at, NOW, 'L', 'a', null).scenario).toBe('verify');
    expect(checkinModel({ ...at, verified: true }, NOW, 'L', 'a', null).scenario).toBe('ready');
    expect(checkinModel({ ...at, demo: { ...at.demo, idVerified: true } }, NOW, 'L', 'a', null).scenario).toBe('ready');
  });
  it('explains when the visitor is away, offline or checked in', () => {
    expect(checkinModel({ ...base, demo: { ...base.demo, location: 'nearby' } }, NOW, 'L', 'a', null).scenario).toBe('away');
    expect(checkinModel({ ...base, demo: { ...base.demo, location: 'offline' } }, NOW, 'L', 'a', null).warn?.action).toBe('retry');
    expect(checkinModel({ ...base, checkedIn: true, accessEndsAt: NOW + 60000 }, NOW, 'L', 'a', null).scenario).toBe('active');
    expect(checkinModel({ ...base, scheduledTour: booked({ status: 'pending' }) }, NOW, 'L', 'a', null).steps?.length).toBe(4);
    expect(checkinModel({ ...base, scheduledTour: booked({ date: key(2) }) }, NOW, 'L', 'a', null).scenario).toBe('early');
  });
});
