import { initials } from '~/core/utils/connect/format';
import {
  BEHAVIOR_DEFS,
  DAYS,
  DAY_KEYS,
  GDPR_STYLE,
  HOLD_STYLE,
  SLOT_TIMES,
  SYNC_STYLE,
  TYPE_LABEL,
  TYPE_STYLE
} from '~/data/mock/scheduling.mock';
import { curBooking } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

const propertyName = (state: DemoState, id: string) =>
  state.props.find((p) => p.id === id)?.name ?? '—';

export const generateSchedTabs = (active: string) =>
  [
    { id: 'calendar', label: 'Booking Calendar' },
    { id: 'types', label: 'Tour Types & Capacity' },
    { id: 'directory', label: 'Visitor Directory' },
    { id: 'widget', label: 'Scheduler Widget' }
  ].map((tab) => ({
    ...tab,
    active: active === tab.id,
    bg: active === tab.id ? 'var(--bo-ink)' : '#fff',
    color: active === tab.id ? '#fff' : 'var(--bo-muted)',
    border: active === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));

export const generateSchedStats = (state: DemoState) => [
  { label: 'Booked this week', value: String(state.bookings.filter((b) => b.sync !== 'cancelled').length), sub: 'across 5 properties' },
  { label: 'Self-guided', value: String(state.bookings.filter((b) => b.type === 'self' && b.sync !== 'cancelled').length), sub: 'app-led, no staff' },
  { label: 'Staff-led', value: String(state.bookings.filter((b) => (b.type === 'guided' || b.type === 'virtual') && b.sync !== 'cancelled').length), sub: 'in-person + virtual' },
  { label: 'CRM sync pending', value: String(state.bookings.filter((b) => b.sync === 'pending').length), sub: 'awaiting confirmation' }
];

export const generateAbandonedTours = (state: DemoState) =>
  state.abandoned.map((row) => ({
    ...row,
    property: propertyName(state, row.propId),
    isOpen: row.state === 'open',
    stateLabel:
      row.state === 'open' ? `Idle ${row.idle}` : row.state === 'recovered' ? 'Recovery sent' : 'Session closed',
    stateV: row.state === 'open' ? 'crit' : row.state === 'recovered' ? 'warn' : 'neutral',
    border: row.state === 'open' ? '#F9DCE0' : 'var(--bo-line)',
    bg: row.state === 'open' ? '#FDEDEF' : '#FBFBFC',
    dotColor: row.state === 'open' ? '#E03B45' : 'var(--bo-subtle)'
  }));

export const generateCalendarDays = (state: DemoState) =>
  DAYS.map((label, index) => {
    const slots = state.bookings.filter((b) => b.day === index);
    return {
      label: label.split(' ')[0],
      date: label.split(' ').slice(1).join(' '),
      isToday: index === 0,
      headColor: index === 0 ? 'var(--bo-ink)' : 'var(--bo-muted)',
      empty: slots.length === 0,
      slots: slots.map((booking) => {
        const style = TYPE_STYLE[booking.type];
        const selected = booking.id === state.bookingId;
        return {
          ...booking,
          property: propertyName(state, booking.propId),
          typeLabel: TYPE_LABEL[booking.type],
          c: style.c,
          b: style.b,
          sel: selected,
          outline: selected ? `2px solid ${style.c}` : `1px solid ${style.b}`,
          strike: booking.sync === 'cancelled' ? 'line-through' : 'none',
          op: booking.sync === 'cancelled' ? '0.55' : '1'
        };
      })
    };
  });

const EMPTY_BOOKING = {
  id: '',
  day: 0,
  time: '—',
  visitor: '—',
  email: '—',
  phone: '—',
  type: 'self' as const,
  propId: '',
  crm: '—',
  sync: 'pending' as const,
  hold: 'n/a' as const,
  r1: 'pending',
  r2: 'pending'
};

export const generateBookingView = (state: DemoState) => {
  const booking = curBooking(state) ?? EMPTY_BOOKING;

  const style = TYPE_STYLE[booking.type];
  const sync = SYNC_STYLE[booking.sync];
  const hold = HOLD_STYLE[booking.hold];

  return {
    ...booking,
    property: propertyName(state, booking.propId),
    typeLabel: TYPE_LABEL[booking.type],
    typeColor: style.c,
    typeBg: style.b,
    dayLabel: DAYS[booking.day],
    syncLabel: sync.label,
    syncV: sync.v,
    holdLabel: hold.label,
    holdV: hold.v,
    holdNote: hold.note,
    initials: initials(booking.visitor),
    isCancelled: booking.sync === 'cancelled'
  };
};

export const generateReminderSteps = (state: DemoState) => {
  const booking = curBooking(state);
  if (!booking) return [];

  return (
    [
      { key: 'day' as const, label: '1 day before', detail: `Email + SMS to ${booking.email}`, state: booking.r1 },
      { key: 'hour' as const, label: '1 hour before', detail: `Email + SMS to ${booking.phone}`, state: booking.r2 }
    ]
  ).map((step) => ({
    ...step,
    sent: step.state === 'sent',
    pillLabel: step.state === 'sent' ? 'Sent' : 'Pending',
    pillV: step.state === 'sent' ? 'ok' : 'warn',
    dot: step.state === 'sent' ? 'var(--bo-accent)' : '#CDD2DB',
    showSend: step.state !== 'sent'
  }));
};

export const generateTourTypeCards = (state: DemoState) =>
  state.tourTypes.map((type) => {
    const style = TYPE_STYLE[type.id];
    return {
      ...type,
      c: style.c,
      b: style.b,
      booked: state.bookings.filter((x) => x.type === type.id && x.sync !== 'cancelled').length,
      toggleBg: type.on ? 'var(--bo-accent)' : '#CDD2DB',
      knob: type.on ? '21px' : '3px',
      statusLabel: type.on ? 'Accepting bookings' : 'Paused',
      statusV: type.on ? 'ok' : 'neutral',
      op: type.on ? '1' : '0.6',
      expandCaret: type.expanded ? '–' : '+',
      behaviors: BEHAVIOR_DEFS.map((def) => ({
        key: def.key,
        label: def.label,
        desc: def.desc,
        bg: type.behavior[def.key] ? 'var(--bo-accent)' : '#CDD2DB',
        knob: type.behavior[def.key] ? '20px' : '3px'
      })),
      hourRows: DAY_KEYS.map((day) => {
        const hours = type.hours[day];
        return {
          day,
          on: hours.on,
          off: !hours.on,
          open: hours.open,
          close: hours.close,
          bg: hours.on ? 'var(--bo-accent)' : '#CDD2DB',
          knob: hours.on ? '17px' : '3px'
        };
      })
    };
  });

export const generateVisitorRows = (state: DemoState) => {
  const needle = state.vdQuery.trim().toLowerCase();

  return state.visitors
    .filter(
      (visitor) =>
        !needle ||
        `${visitor.name} ${visitor.email} ${propertyName(state, visitor.propId)}`
          .toLowerCase()
          .includes(needle)
    )
    .map((visitor) => {
      const gdpr = GDPR_STYLE[visitor.gdpr] ?? GDPR_STYLE.none;
      return {
        ...visitor,
        property: propertyName(state, visitor.propId),
        gdprLabel: gdpr.label,
        gdprV: gdpr.v,
        isActive: visitor.gdpr === 'none',
        isRequested: visitor.gdpr === 'requested',
        isRemoved: visitor.gdpr === 'removed'
      };
    });
};

export const generateWidgetSlotChips = (state: DemoState) =>
  SLOT_TIMES.map((time) => {
    const on = state.widgetSlots.includes(time);
    return {
      label: time,
      on,
      bg: on ? 'var(--bo-accent-soft)' : '#fff',
      border: on ? 'var(--bo-accent)' : 'var(--bo-line)',
      color: on ? 'var(--bo-accent)' : 'var(--bo-subtle)'
    };
  });

export const EMBED_CODE =
  '<iframe src="https://book.pynwheel.com/w/luxe-mile-high" width="100%" height="640" frameborder="0"></iframe>';
