import { describe, expect, it } from 'vitest';

import type { VisitorAccess, VisitorProfile, VisitorSession, VisitorsList } from '~/core/models/data/tourModules.data';
import { feedbackText, generateAccessRows, generateBookingCards, generateOnSite, generateSessionView, generateStatusChips, generateVisitorRows, idCheckText, idPill, propertyCodeText, statusPill } from './tourVisitors.generator';

const TZ = 'America/Denver';

const row = (over: Partial<VisitorsList['rows'][number]> = {}): VisitorsList['rows'][number] => ({
  id: 1,
  name: 'Lee, Ann',
  initials: 'AL',
  email: 'ann@example.test',
  phone: '+13035550101',
  removed: false,
  whenAt: '2026-10-20T16:00:00Z',
  status: 'completed',
  type: 'self',
  typeLabel: 'App Guided Tour',
  tours: 1,
  visits: 1,
  flags: [],
  idCheck: { state: 'never', label: 'Never verified' },
  source: 'Booking form',
  sms: true,
  ...over
});

const list = (over: Partial<VisitorsList> = {}): VisitorsList => ({
  rows: [row()],
  counts: { all: 3, upcoming: 1, in_progress: 0, completed: 2, abandoned: 1, missed: 0, cancelled: 0 },
  pagination: { page: 1, per: 25, total: 3, pages: 1 },
  onSite: [],
  comingToday: 0,
  timeZone: TZ,
  now: '2026-10-21T15:00:00Z',
  stayLimitMinutes: 45,
  filters: { status: 'all', type: 'all', range: 'all', q: '' },
  ...over
});

const session = (over: Partial<VisitorSession> = {}): VisitorSession => ({
  id: 9,
  status: 'completed',
  arrived: '2026-10-20T16:02:00Z',
  left: '2026-10-20T16:40:00Z',
  elapsedMinutes: 38,
  lengthy: false,
  onsite: true,
  tourType: 'self_tour',
  tourStatus: 'self_tour',
  verifiedBy: 'check_point_id',
  idMismatch: false,
  abandonedAtStop: null,
  lockAccessTime: null,
  stops: [
    { id: 1, tourStopId: 11, name: 'Lobby', stopType: 'starting_point', at: '2026-10-20T16:03:00Z', nextAt: '2026-10-20T16:10:00Z', events: 1, pin: null, note: null, imageUrl: null },
    { id: 2, tourStopId: 12, name: 'Pool', stopType: 'amenity', at: '2026-10-20T16:10:00Z', nextAt: null, events: 3, pin: '4821', pins: ['4821'], note: 'Loved it', notes: ['Loved it'], photos: ['https://img/1.jpg', 'https://img/2.jpg'], imageUrl: 'https://img/1.jpg' }
  ],
  lockEvents: [{ event: 'app_unlock', at: '2026-10-20T16:11:00Z', stopName: 'Pool', stopType: 'amenity' }],
  accessIds: ['latch-1'],
  ...over
});

const profile = (over: Partial<VisitorProfile> = {}): VisitorProfile => ({
  visitor: { ...row(), firstName: 'Ann', lastName: 'Lee', desiredBedroom: 2, selfieUrl: null, idCardUrl: null, idMismatch: false, verificationType: 'check_point_id', verificationRequired: true, createdAt: '2026-10-01T00:00:00Z' },
  bookings: [],
  sessions: [session()],
  access: [],
  feedback: null,
  crmPushes: [],
  timeline: [],
  chat: { available: false },
  canResetStops: false,
  codesVisible: true,
  timeZone: TZ,
  ...over
});

describe('visitor rows and chips', () => {
  it('labels an abandoned row as Abandoned (warn) while the chips stay the design’s six', () => {
    expect(statusPill('abandoned')).toEqual({ label: 'Abandoned', variant: 'warn' });
    const chips = generateStatusChips(list(), 'completed');
    expect(chips.map((chip) => chip.id)).toEqual(['all', 'upcoming', 'in_progress', 'completed', 'missed', 'cancelled']);
    expect(chips.find((chip) => chip.id === 'completed')?.count).toBe(2);
  });

  it('shows the visit count on the type and keeps the removed visitor grey', () => {
    const rows = generateVisitorRows(list({ rows: [row({ visits: 3, tours: 3, removed: true, initials: '—' })] }));
    expect(rows[0].type).toBe('App Guided Tour · 3 tours');
    expect(rows[0].grey).toBe(true);
  });

  it('marks a lapsed verification as a warning, never as verified', () => {
    expect(idPill({ state: 'expired', label: 'Verification lapsed' }).variant).toBe('warn');
    expect(idPill({ state: 'verified', label: 'Verified' }).variant).toBe('ok');
  });

  it('describes the on-site visitor by the last recorded stop and its time, not a live position', () => {
    const cards = generateOnSite(
      list({ onSite: [{ id: 1, name: 'Ann Lee', initials: 'AL', type: 'self', typeLabel: 'App Guided Tour', startedAt: '2026-10-21T14:30:00Z', elapsedMinutes: 30, lengthy: false, lastStop: 'Pool', lastStopAt: '2026-10-21T14:52:00Z', onsite: true, historyId: 5 }] })
    );
    expect(cards[0].sub).toContain('last at Pool');
    expect(cards[0].sub).toContain('started');
    const none = generateOnSite(list({ onSite: [{ id: 1, name: 'Ann Lee', initials: 'AL', type: 'walkin', typeLabel: 'Walk-in', startedAt: '2026-10-21T14:30:00Z', elapsedMinutes: 2, lengthy: false, lastStop: null, onsite: true, historyId: 5 }] }));
    expect(none[0].sub).toContain('no stop reported yet');
  });
});

describe('the profile', () => {
  it('groups a session’s stops with their photos, notes, pin and the next arrival', () => {
    const view = generateSessionView(session(), profile());
    expect(view.stops).toHaveLength(2);
    expect(view.stops[0].times).toContain('Arrived');
    expect(view.stops[0].times).toContain('next stop');
    expect(view.stops[1].photos).toHaveLength(2);
    expect(view.stops[1].notes).toEqual(['Loved it']);
    expect(view.stops[1].pin).toBe('Code 4821');
    expect(view.events[0]).toContain('app unlock');
    expect(view.verified).toBe('ID verified by check_point_id');
    expect(view.accessIds).toEqual(['latch-1']);
  });

  it('masks the stop pin when the CMS did not send codes', () => {
    const view = generateSessionView(session(), profile({ codesVisible: false }));
    expect(view.stops[1].pin).toBe('Code ••••');
  });

  it('lists a booking’s slot changes, CRM appointments and cancellation', () => {
    const cards = generateBookingCards(
      profile({
        bookings: [
          {
            id: 3,
            status: 'cancelled',
            tourDate: '2026-10-22',
            tourTime: '10:00',
            bookedAt: '2026-10-22T16:00:00Z',
            propertyTourType: 'scheduled_tour',
            tourType: 'guided',
            tourTypeLabel: 'Person Guided Tour',
            source: 'Staff',
            createdBy: 'Staff',
            createdAt: '2026-10-19T12:00:00Z',
            completedAt: null,
            customized: false,
            stopsList: [],
            reminders: { dayBefore: true, hourBefore: false, missed: false },
            desiredBedroom: 1,
            desiredMoveInDate: '2026-12-01',
            cancelledAt: '2026-10-20T09:00:00Z',
            cancelledBy: '2181',
            crm: { funnel: 'f-1' },
            history: [{ from: { tourDate: '2026-10-21', tourTime: '09:00', at: '2026-10-21T15:00:00Z' }, to: { tourDate: '2026-10-22', tourTime: '10:00', at: '2026-10-22T16:00:00Z' }, at: '2026-10-19T13:00:00Z', by: null }],
            crmPushes: [{ provider: 'funnel', label: 'Funnel', id: 'f-1' }]
          }
        ]
      })
    );
    expect(cards[0].changes[0]).toContain('Rescheduled from');
    expect(cards[0].changes[0]).toContain('through the booking form');
    expect(cards[0].crm).toEqual(['Booked in Funnel · appointment f-1']);
    expect(cards[0].cancelled).toContain('by staff');
    expect(cards[0].reminders).toBe('Day before · Sent · Hour before · Pending');
    expect(cards[0].moveIn).toBe('2026-12-01');
  });

  it('says exactly what the ID check is, with the provider and dates', () => {
    const verified = profile();
    verified.visitor.idCheck = { state: 'verified', label: 'Verified', at: '2026-10-10T12:00:00Z', provider: 'CheckpointID', validUntil: '2026-11-09T12:00:00Z' };
    expect(idCheckText(verified)).toContain('Verified with CheckpointID on Oct 10');
    expect(idCheckText(verified)).toContain('valid until Nov 9');
    const lapsed = profile();
    lapsed.visitor.idCheck = { state: 'expired', label: 'Verification lapsed', at: '2026-08-01T12:00:00Z', provider: 'Authenteq', validUntil: '2026-08-31T12:00:00Z' };
    expect(idCheckText(lapsed)).toContain('lapsed');
    const off = profile();
    off.visitor.verificationRequired = false;
    expect(idCheckText(off)).toBe('ID verification is off for this property');
  });

  it('shows the property code only with its expiry, and masks it when not sent', () => {
    const active = profile();
    active.visitor.propertyCode = { enabled: true, status: 'active', code: '482913', generatedAt: '2026-10-21T14:30:00Z', expiresAt: '2026-10-21T15:15:00Z' };
    expect(propertyCodeText(active)).toContain('Property code 482913 · expires');
    const masked = profile({ codesVisible: false });
    masked.visitor.propertyCode = { enabled: true, status: 'active', code: null, generatedAt: '2026-10-21T14:30:00Z', expiresAt: '2026-10-21T15:15:00Z' };
    expect(propertyCodeText(masked)).toContain('••••••');
    const none = profile();
    none.visitor.propertyCode = { enabled: false, status: 'none', code: null, generatedAt: null, expiresAt: null };
    expect(propertyCodeText(none)).toBeNull();
  });

  it('renders feedback from the stored rating and comment only', () => {
    expect(feedbackText(profile())).toBeNull();
    expect(feedbackText(profile({ feedback: { rating: 4.5, comment: 'Great', cancelled: false, at: '2026-10-20T17:00:00Z' } }))).toBe('4.5 / 5 · “Great”');
    expect(feedbackText(profile({ feedback: { rating: null, comment: null, cancelled: true, at: '2026-10-20T17:00:00Z' } }))).toContain('dismissed');
  });
});

describe('access codes', () => {
  const access: VisitorAccess[] = [
    { id: 'latch-1', vendor: 'Latch', vendorLabel: 'Latch', method: 'latch_key', methodLabel: 'Latch key', target: null, targetName: 'Pool door', status: 'expired', reason: null, window: { from: '2026-10-20T16:00:00Z', to: '2026-10-20T17:00:00Z' }, issuedAt: '2026-10-20T16:01:00Z', codePresent: false, code: null },
    { id: 'igloohome-2', vendor: 'Igloohome', vendorLabel: 'Igloohome', method: 'hourly_pin', methodLabel: 'Hourly PIN', target: null, targetName: 'Unit 101', status: 'issued', reason: null, window: null, issuedAt: '2026-10-20T16:02:00Z', codePresent: true, code: '7731' },
    { id: 'zerv-3', vendor: 'Zerv', vendorLabel: 'Pynwheel Access (Zerv)', method: 'mobile_key', methodLabel: 'Mobile key', target: null, targetName: null, status: 'failed', reason: 'device offline', window: null, issuedAt: '2026-10-20T16:02:30Z', codePresent: false, code: null }
  ];

  it('masks codes until revealed and never invents a window', () => {
    const masked = generateAccessRows(access, TZ, false);
    expect(masked[0].code).toBe('Key in the app');
    expect(masked[1].code).toBe('••••••');
    expect(masked[1].hasCode).toBe(true);
    expect(masked[1].window).toBe('Not recorded');
    expect(masked[0].window).toMatch(/–/);
    expect(masked[2].pill).toEqual({ label: 'Failed', variant: 'crit' });
    expect(masked[2].stop).toBe('Property-wide');
    expect(masked[2].reason).toBe('device offline');
    const revealed = generateAccessRows(access, TZ, true);
    expect(revealed[1].code).toBe('7731');
  });

  it('keeps a code masked when the CMS withheld it even if revealed', () => {
    const withheld = generateAccessRows([{ ...access[1], code: null }], TZ, true);
    expect(withheld[0].code).toBe('••••••');
  });
});
