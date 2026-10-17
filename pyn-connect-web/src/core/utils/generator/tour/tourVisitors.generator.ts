import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { AvailabilityDay, VisitorBooking, VisitorProfile, VisitorRow, VisitorSession, VisitorsList, VisitorStatus } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import { formatWhen } from './tourLocks.generator';

/** The Visitors tab's view data from the rows the CMS derived (Visitors::Query / Visitors::Profile). Pure. */
export const V = CORE_STRINGS.tourModules.visitors;

export const VISITOR_STATUSES: ('all' | VisitorStatus)[] = ['all', 'upcoming', 'in_progress', 'completed', 'missed', 'cancelled'];
export const VISITOR_RANGES = ['all', 'today', 'next7', 'last7'] as const;
export const VISITOR_TYPES = ['all', 'self', 'guided', 'virtual', 'walkin'] as const;

export const STATUS_VARIANT: Record<VisitorStatus, PillVariant> = { upcoming: 'info', in_progress: 'ok', completed: 'neutral', missed: 'crit', cancelled: 'neutral' };

export const statusPill = (status: VisitorStatus): { label: string; variant: PillVariant } => ({ label: i18n.t(V.status[status]), variant: STATUS_VARIANT[status] });

export const idPill = (idCheck: VisitorRow['idCheck']): { label: string; variant: PillVariant } => ({
  label: idCheck.label,
  variant: idCheck.state === 'verified' ? 'ok' : idCheck.state === 'mismatch' ? 'crit' : 'neutral'
});

const dateIn = (iso: string, timeZone: string | null): Date => {
  const date = new Date(iso);
  void timeZone;
  return date;
};

/** "Today", "Tomorrow", "Yesterday", or "Thu, Oct 22" in the property's zone. */
export const dayLabel = (iso: string, timeZone: string | null, now: string | null): string => {
  const date = dateIn(iso, timeZone);
  if (Number.isNaN(date.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = { timeZone: timeZone ?? undefined, weekday: 'short', month: 'short', day: 'numeric' };
  try {
    const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: timeZone ?? undefined });
    const today = now ? new Date(now) : new Date();
    const diff = Math.round((Date.parse(key(date)) - Date.parse(key(today))) / 86400000);
    if (diff === 0) return i18n.t(V.range.today);
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return date.toLocaleDateString('en-US', opts);
  } catch {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
};

export const timeLabel = (iso: string | null, timeZone: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleTimeString('en-US', { timeZone: timeZone ?? undefined, hour: 'numeric', minute: '2-digit' });
  } catch {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
};

export interface VisitorTableRow {
  id: number;
  when: string;
  time: string;
  name: string;
  initials: string;
  grey: boolean;
  contact: string;
  type: string;
  status: { label: string; variant: PillVariant };
  flags: { label: string; variant: PillVariant }[];
  id_check: { label: string; variant: PillVariant };
  source: string;
}

export const generateVisitorRows = (list: VisitorsList): VisitorTableRow[] =>
  list.rows.map((row) => ({
    id: row.id,
    when: dayLabel(row.whenAt, list.timeZone, list.now),
    time: timeLabel(row.whenAt, list.timeZone),
    name: row.name,
    initials: row.initials,
    grey: row.removed,
    contact: [row.email, row.phone].filter(Boolean).join(' · '),
    type: row.tours > 1 ? `${row.typeLabel} · ${t(V.tours, { count: row.tours })}` : row.typeLabel,
    status: statusPill(row.status),
    flags: row.flags.map((flag) => ({ label: flag.label, variant: flag.variant })),
    id_check: idPill(row.idCheck),
    source: row.source
  }));

export const generateStatusChips = (list: VisitorsList, active: string) =>
  VISITOR_STATUSES.map((status) => ({ id: status, label: i18n.t(V.status[status]), count: list.counts[status] ?? 0, on: status === active }));

export interface OnSiteCard {
  id: number;
  name: string;
  initials: string;
  sub: string;
  elapsed: string;
  lengthy: boolean;
}

export const generateOnSite = (list: VisitorsList): OnSiteCard[] =>
  list.onSite.map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    sub: [row.typeLabel, row.lastStop ? t(V.at, { stop: row.lastStop }) : null, t(V.startedAt, { time: timeLabel(row.startedAt, list.timeZone) })].filter(Boolean).join(' · '),
    elapsed: t(V.elapsed, { minutes: row.elapsedMinutes ?? 0 }),
    lengthy: row.lengthy
  }));

export interface BookingCard {
  id: number;
  when: string;
  pill: { label: string; variant: PillVariant };
  type: string;
  source: string;
  reminders: string;
  customized: boolean;
  upcoming: boolean;
  unscheduled: boolean;
}

export const generateBookingCards = (profile: VisitorProfile): BookingCard[] =>
  profile.bookings.map((booking) => ({
    id: booking.id,
    when: booking.bookedAt ? `${dayLabel(booking.bookedAt, profile.timeZone, null)} · ${timeLabel(booking.bookedAt, profile.timeZone)}` : i18n.t(V.profile.unscheduled),
    pill: statusPill(booking.status),
    type: booking.tourTypeLabel,
    source: t(V.profile.createdBy, { source: booking.source }),
    reminders: t(V.profile.reminders, { day: i18n.t(booking.reminders.dayBefore ? V.profile.sent : V.profile.pending), hour: i18n.t(booking.reminders.hourBefore ? V.profile.sent : V.profile.pending) }),
    customized: booking.customized,
    upcoming: booking.status === 'upcoming',
    unscheduled: !booking.bookedAt
  }));

export interface SessionView {
  id: number;
  label: string;
  pill: { label: string; variant: PillVariant };
  line: string;
  lengthy: boolean;
  stops: { n: string; name: string; times: string; pin: string | null; note: string | null; imageUrl: string | null }[];
  events: string[];
  abandonedAt: string | null;
}

export const generateSessionView = (session: VisitorSession, profile: VisitorProfile): SessionView => {
  const tz = profile.timeZone;
  const start = session.arrived ? timeLabel(session.arrived, tz) : '—';
  return {
    id: session.id,
    label: session.arrived ? `${dayLabel(session.arrived, tz, null)} · ${start}` : `#${session.id}`,
    pill: { label: i18n.t(V.profile.session[session.status]), variant: session.status === 'in_progress' ? 'ok' : session.status === 'abandoned' ? 'warn' : 'neutral' },
    line: t(V.profile.sessionLine, {
      day: session.arrived ? dayLabel(session.arrived, tz, null) : '—',
      start,
      end: session.left ? t(V.profile.ended, { time: timeLabel(session.left, tz) }) : '',
      minutes: session.elapsedMinutes ?? 0,
      site: i18n.t(session.onsite ? V.profile.onSite : V.profile.remote)
    }),
    lengthy: session.lengthy,
    stops: session.stops.map((stop, index) => ({
      n: String(index + 1),
      name: stop.name,
      times: stop.at ? t(V.profile.arrived, { time: timeLabel(stop.at, tz) }) : '',
      pin: stop.pin ? t(V.profile.pin, { pin: stop.pin }) : null,
      note: stop.note,
      imageUrl: stop.imageUrl
    })),
    events: session.lockEvents.map((event) => `${event.stopName ?? ''} · ${event.event ?? ''} · ${formatWhen(event.at, tz)}`),
    abandonedAt: session.abandonedAtStop ? t(V.profile.abandonedAt, { stop: session.abandonedAtStop }) : null
  };
};

export const selectableTypes = (settings: { selfTour: boolean; guidedTour: boolean } | null | undefined): ('self_tour' | 'guided_tour')[] => {
  const out: ('self_tour' | 'guided_tour')[] = [];
  if (settings?.selfTour) out.push('self_tour');
  if (settings?.guidedTour) out.push('guided_tour');
  return out;
};

/** The booking dialog's day strip and times for one tour type, from the availability the CMS answered. */
export const generateSlotPicker = (days: AvailabilityDay[], pickedDate: string | null, tourType: string) => ({
  days: days.map((day) => ({
    date: day.date,
    label: new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    open: !day.closed && day.slots.some((slot) => slot.types.includes(tourType)),
    on: day.date === pickedDate
  })),
  times: (days.find((day) => day.date === pickedDate)?.slots ?? []).map((slot) => ({ time: slot.time, label: slot.label, open: slot.types.includes(tourType), full: slot.full.includes(tourType) }))
});

export const typeLabelOf = (tourType: string): string => (tourType === 'guided_tour' ? i18n.t(V.type.guided) : i18n.t(V.type.self));

export const bookingSends = (crm: string | null, reschedule: boolean): { title: string; text: string }[] => [
  { title: i18n.t(V.booking.sends.visitor), text: i18n.t(reschedule ? V.booking.sends.visitorReschedule : V.booking.sends.visitorText) },
  { title: i18n.t(V.booking.sends.property), text: i18n.t(V.booking.sends.propertyText) },
  { title: i18n.t(V.booking.sends.crm), text: crm ? t(V.booking.sends.crmText, { crm }) : i18n.t(V.booking.sends.noCrm) },
  { title: i18n.t(V.booking.sends.reminders), text: i18n.t(V.booking.sends.remindersText) }
];

export const cancelSends = (crm: string | null): { title: string; text: string }[] => [
  { title: i18n.t(V.booking.sends.visitor), text: i18n.t(V.cancel.sends.visitor) },
  { title: i18n.t(V.booking.sends.property), text: i18n.t(V.cancel.sends.property) },
  { title: i18n.t(V.booking.sends.crm), text: crm ? t(V.cancel.sends.crm, { crm }) : i18n.t(V.booking.sends.noCrm) },
  { title: 'Access', text: i18n.t(V.cancel.sends.access) }
];

export const bookingSummary = (booking: VisitorBooking, timeZone: string): string =>
  booking.bookedAt ? `${dayLabel(booking.bookedAt, timeZone, null)} · ${timeLabel(booking.bookedAt, timeZone)}` : i18n.t(V.profile.unscheduled);
