import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { AvailabilityDay, SessionStop, VisitorAccess, VisitorBooking, VisitorProfile, VisitorRow, VisitorSession, VisitorsList, VisitorStatus } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import { formatWhen } from './tourLocks.generator';

/** The Visitors tab's view data from the rows the CMS derived (Visitors::Query / Visitors::Profile). Pure. */
export const V = CORE_STRINGS.tourModules.visitors;

/** The design's chips: an abandoned visit is counted under Completed by the CMS and labelled "Abandoned" on its row. */
export const VISITOR_STATUSES: ('all' | VisitorStatus)[] = ['all', 'upcoming', 'in_progress', 'completed', 'missed', 'cancelled'];
export const VISITOR_RANGES = ['all', 'today', 'next7', 'last7'] as const;
export const VISITOR_TYPES = ['all', 'self', 'guided', 'virtual', 'walkin'] as const;

export const STATUS_VARIANT: Record<VisitorStatus, PillVariant> = { upcoming: 'info', in_progress: 'ok', completed: 'neutral', abandoned: 'warn', missed: 'crit', cancelled: 'neutral' };

export const statusPill = (status: VisitorStatus): { label: string; variant: PillVariant } => ({
  label: i18n.t(V.status[status] ?? V.status.completed),
  variant: STATUS_VARIANT[status] ?? 'neutral'
});

export const idPill = (idCheck: VisitorRow['idCheck']): { label: string; variant: PillVariant } => ({
  label: idCheck.label,
  variant: idCheck.state === 'verified' ? 'ok' : idCheck.state === 'mismatch' ? 'crit' : idCheck.state === 'expired' ? 'warn' : 'neutral'
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

/** "Oct 22" / "Oct 22, 2025" in the property's zone, for dates that are not today-relative. */
export const dateLabel = (iso: string | null, timeZone: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  try {
    return date.toLocaleDateString('en-US', { timeZone: timeZone ?? undefined, month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
  } catch {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  list.rows.map((row) => {
    const visits = row.visits ?? row.tours;
    return {
      id: row.id,
      when: dayLabel(row.whenAt, list.timeZone, list.now),
      time: timeLabel(row.whenAt, list.timeZone),
      name: row.name,
      initials: row.initials,
      grey: row.removed,
      contact: [row.email, row.phone].filter(Boolean).join(' · '),
      type: visits > 1 ? `${row.typeLabel} · ${t(V.tours, { count: visits })}` : row.typeLabel,
      status: statusPill(row.status),
      flags: row.flags.map((flag) => ({ label: flag.label, variant: flag.variant })),
      id_check: idPill(row.idCheck),
      source: row.source
    };
  });

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

/** "App Guided Tour · last at Pool 10:42 · started 10:15": the last stop is the last recorded event, not a live position. */
export const generateOnSite = (list: VisitorsList): OnSiteCard[] =>
  list.onSite.map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    sub: [
      row.typeLabel,
      row.lastStop ? (row.lastStopAt ? t(V.lastAt, { stop: row.lastStop, time: timeLabel(row.lastStopAt, list.timeZone) }) : t(V.at, { stop: row.lastStop })) : i18n.t(V.noStopYet),
      t(V.startedAt, { time: timeLabel(row.startedAt, list.timeZone) })
    ]
      .filter(Boolean)
      .join(' · '),
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
  /** "Rescheduled from Oct 3 · 10:00 · by staff", oldest first. */
  changes: string[];
  /** "Yardi RentCafe · appointment 123". */
  crm: string[];
  cancelled: string | null;
  moveIn: string | null;
  bedrooms: string | null;
}

const slotText = (slot: { at: string | null; tourDate: string | null; tourTime: string | null }, tz: string): string =>
  slot.at ? `${dateLabel(slot.at, tz)} · ${timeLabel(slot.at, tz)}` : slot.tourDate ? `${slot.tourDate}${slot.tourTime ? ` ${slot.tourTime}` : ''}` : i18n.t(V.profile.unscheduledShort);

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
    unscheduled: !booking.bookedAt,
    changes: (booking.history ?? []).map((change) =>
      t(V.profile.rescheduledFrom, { from: slotText(change.from, profile.timeZone), when: formatWhen(change.at, profile.timeZone), by: i18n.t(change.by ? V.profile.byStaff : V.profile.byVisitor) })
    ),
    crm: (booking.crmPushes ?? []).map((push) => t(V.profile.crmBooked, { crm: push.label, id: push.id })),
    cancelled: booking.cancelledAt ? t(V.profile.cancelledAt, { when: formatWhen(booking.cancelledAt, profile.timeZone), by: i18n.t(booking.cancelledBy ? V.profile.byStaff : V.profile.byVisitor) }) : null,
    moveIn: booking.desiredMoveInDate,
    bedrooms: booking.desiredBedroom != null ? String(booking.desiredBedroom) : null
  }));

export interface SessionStopView {
  n: string;
  name: string;
  times: string;
  pin: string | null;
  instruction: string | null;
  notes: string[];
  photos: string[];
  events: number;
}

export interface SessionView {
  id: number;
  label: string;
  pill: { label: string; variant: PillVariant };
  line: string;
  lengthy: boolean;
  stops: SessionStopView[];
  events: string[];
  abandonedAt: string | null;
  accessIds: string[];
  verified: string | null;
}

/** "Arrived 10:42 · next stop 10:51": the app records arrivals only; the next stop's arrival bounds the time spent. */
const stopTimes = (stop: SessionStop, tz: string): string =>
  [stop.at ? t(V.profile.arrived, { time: timeLabel(stop.at, tz) }) : null, stop.nextAt ? t(V.profile.nextStop, { time: timeLabel(stop.nextAt, tz) }) : null].filter(Boolean).join(' · ');

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
      times: stopTimes(stop, tz),
      pin: stop.pin ? t(V.profile.pin, { pin: profile.codesVisible === false ? '••••' : stop.pin }) : null,
      instruction: stop.instruction ?? null,
      notes: stop.notes ?? (stop.note ? [stop.note] : []),
      photos: stop.photos ?? (stop.imageUrl ? [stop.imageUrl] : []),
      events: stop.events ?? 1
    })),
    events: session.lockEvents.map((event) => `${event.stopName ?? ''} · ${(event.event ?? '').replace(/_/g, ' ')} · ${formatWhen(event.at, tz)}`),
    abandonedAt: session.abandonedAtStop ? t(V.profile.abandonedAt, { stop: session.abandonedAtStop }) : null,
    accessIds: session.accessIds ?? [],
    verified: session.verifiedBy ? t(V.profile.verifiedBy, { by: session.verifiedBy }) : null
  };
};

export interface AccessRow {
  id: string;
  stop: string;
  provider: string;
  method: string;
  code: string;
  hasCode: boolean;
  window: string;
  pill: { label: string; variant: PillVariant };
  reason: string | null;
  issued: string;
}

const ACCESS_VARIANT: Record<string, PillVariant> = { issued: 'ok', active: 'ok', expired: 'neutral', failed: 'crit', revoked: 'warn', inactive: 'neutral', deleted: 'neutral' };

/**
 * The access-codes table of a visit. A code is shown only when the CMS sent
 * it (`codesVisible`, users who may edit the property) and the user chose to
 * reveal it; otherwise its presence is shown as dots. Latch and Zerv keys
 * live in the visitor's app and have no code to show.
 */
export const generateAccessRows = (rows: VisitorAccess[], timeZone: string, revealed: boolean): AccessRow[] =>
  rows.map((row) => ({
    id: row.id,
    stop: row.targetName ?? row.target?.name ?? i18n.t(V.profile.accessNoStop),
    provider: row.vendorLabel,
    method: row.methodLabel,
    code: row.codePresent ? (revealed && row.code ? row.code : '••••••') : i18n.t(V.profile.accessInApp),
    hasCode: row.codePresent,
    window: row.window ? `${timeLabel(row.window.from, timeZone)} – ${timeLabel(row.window.to, timeZone)}` : i18n.t(V.profile.accessNoWindow),
    pill: { label: i18n.t(V.profile.accessStatus[row.status as keyof typeof V.profile.accessStatus] ?? V.profile.accessStatus.issued), variant: ACCESS_VARIANT[row.status] ?? 'neutral' },
    reason: row.reason,
    issued: formatWhen(row.issuedAt, timeZone)
  }));

/** The ID-check sentence under the photos: provider and dates when verified or lapsed. */
export const idCheckText = (profile: VisitorProfile): string => {
  const check = profile.visitor.idCheck;
  const tz = profile.timeZone;
  if (check.state === 'verified') return t(V.profile.idVerifiedAt, { provider: check.provider ?? '', at: dateLabel(check.at ?? null, tz), until: dateLabel(check.validUntil ?? null, tz) });
  if (check.state === 'expired') return t(V.profile.idLapsed, { provider: check.provider ?? '', at: dateLabel(check.at ?? null, tz) });
  if (check.state === 'mismatch') return i18n.t(V.profile.idMismatch);
  return i18n.t(profile.visitor.verificationRequired === false ? V.profile.idOff : V.profile.idNever);
};

/** "Property code 482913 · expires 11:05" for the restricted-access code the legacy app asks for. */
export const propertyCodeText = (profile: VisitorProfile): string | null => {
  const code = profile.visitor.propertyCode;
  if (!code || code.status === 'none') return null;
  const value = code.code ?? '••••••';
  return code.status === 'active'
    ? t(V.profile.propertyCode, { code: value, time: timeLabel(code.expiresAt, profile.timeZone) })
    : t(V.profile.propertyCodeExpired, { code: value, when: formatWhen(code.expiresAt, profile.timeZone) });
};

export const feedbackText = (profile: VisitorProfile): string | null => {
  const feedback = profile.feedback;
  if (!feedback) return null;
  if (feedback.cancelled) return i18n.t(V.profile.feedbackDismissed);
  const rating = feedback.rating != null ? t(V.profile.feedbackRating, { rating: String(Math.round(feedback.rating * 10) / 10) }) : null;
  return [rating, feedback.comment ? `“${feedback.comment}”` : null].filter(Boolean).join(' · ') || i18n.t(V.profile.feedbackNoText);
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
