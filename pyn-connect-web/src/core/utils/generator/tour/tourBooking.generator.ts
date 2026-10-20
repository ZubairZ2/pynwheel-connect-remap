import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { BookingSettings, HourRange, HoursLane } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';

/**
 * The Settings tab's scheduling and booking sections (Back Office design,
 * Oct 20 2026): the booking rules, the visiting hours and closures, the
 * booking form, the booking link and button, as `Scheduling::Settings`
 * stores and validates them. Drafts are what the forms edit; payloads carry
 * only what changed. Pure.
 */
export const B = CORE_STRINGS.tourModules.booking;

export type BookingSection = 'rules' | 'hours' | 'form' | 'link' | 'crm';
export type BookingGroup = 'scheduling' | 'booking';
export const BOOKING_SECTIONS: { id: BookingSection; group: BookingGroup }[] = [
  { id: 'rules', group: 'scheduling' },
  { id: 'hours', group: 'scheduling' },
  { id: 'form', group: 'booking' },
  { id: 'link', group: 'booking' },
  { id: 'crm', group: 'booking' }
];
/** The design's rail groups (`SET_GROUPS`): one rail entry per group, pills for its sections. */
export const BOOKING_GROUPS: { id: BookingGroup; sections: BookingSection[] }[] = [
  { id: 'scheduling', sections: ['rules', 'hours'] },
  { id: 'booking', sections: ['form', 'link', 'crm'] }
];
export const isBookingSection = (value: string | undefined | null): value is BookingSection => !!value && BOOKING_SECTIONS.some((section) => section.id === value);
/** `?section=` of the Settings tab, or undefined. */
export const bookingSectionOf = (value: string | undefined | null): BookingSection | undefined => (isBookingSection(value) ? value : undefined);
export const groupOfSection = (section: BookingSection): BookingGroup => BOOKING_SECTIONS.find((row) => row.id === section)?.group ?? 'scheduling';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS = DAYS.slice(0, 5);
export const INTERVALS = [15, 30, 60, 120];
export const BUFFERS = [0, 5, 10, 15, 30];
export const NOTICES = [0, 60, 120, 240, 1440];
export const HORIZONS = [0, 7, 14, 30, 60, 90];
export const LANES: HoursLane[] = ['self', 'guided'];
/** The axis ticks of the hours track (6 AM – 9 PM), as fractions of the 6:00 – 22:00 bar. */
/** Stepper bounds, as `Scheduling::Settings` validates them. */
export const BOUNDS = { capacity: [1, 10], grace: [10, 60], stay: [1, 600], party: [1, 10], fontSize: [8, 40], px: [10, 1000] } as const;
export const HOUR_TICKS = [6, 9, 12, 15, 18, 21].map((hour) => ({ hour, left: ((hour - 6) / 16) * 100 }));

const str = (value: number | null | undefined): string => (value == null ? '' : String(value));
const int = (value: string): number | null => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

/* ── rules ─────────────────────────────────────────────────────────── */

/**
 * The rules draft. The virtual tour type stays in the CMS (the legacy page
 * hides it too) and the scheduler switch is its own write (`scheduler_enabled`),
 * so neither is part of a rules save.
 */
export interface RulesDraft {
  allowSelfTour: boolean;
  allowGuidedTour: boolean;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  /** 0 = no horizon (the CMS stores null). */
  bookingHorizonDays: number;
  doLimitMaxTour: boolean;
  limitMaxTour: string;
  maxSelf: string;
  maxGuided: string;
  onlyScheduledTour: boolean;
  gracePeriod: string;
  lengthStayLimit: string;
}

export const rulesDraftOf = (s: BookingSettings): RulesDraft => ({
  allowSelfTour: s.tourTypes?.selfTour ?? false,
  allowGuidedTour: s.tourTypes?.guidedTour ?? false,
  slotIntervalMinutes: s.slotIntervalMinutes || 30,
  bufferMinutes: s.window?.bufferMinutes ?? 0,
  minimumNoticeMinutes: s.window?.minimumNoticeMinutes ?? 0,
  bookingHorizonDays: s.window?.bookingHorizonDays ?? 0,
  doLimitMaxTour: s.capacity?.enabled ?? false,
  limitMaxTour: str(s.capacity?.limitMaxTour),
  maxSelf: str(s.capacity?.maxSelfTourUsers),
  maxGuided: str(s.capacity?.maxGuidedTourUsers),
  onlyScheduledTour: s.onlyScheduledTour,
  gracePeriod: str(s.gracePeriod),
  lengthStayLimit: str(s.lengthStayLimit)
});

const RULE_PARAMS: [keyof RulesDraft, string][] = [
  ['allowSelfTour', 'allow_self_tour'],
  ['allowGuidedTour', 'allow_guided_tour'],
  ['slotIntervalMinutes', 'slot_interval_minutes'],
  ['bufferMinutes', 'buffer_minutes'],
  ['minimumNoticeMinutes', 'minimum_notice_minutes'],
  ['bookingHorizonDays', 'booking_horizon_days'],
  ['doLimitMaxTour', 'do_limit_max_tour'],
  ['limitMaxTour', 'limit_max_tour'],
  ['maxSelf', 'max_self_tour_users'],
  ['maxGuided', 'max_guided_tour_users'],
  ['onlyScheduledTour', 'only_scheduled_tour'],
  ['gracePeriod', 'grace_period'],
  ['lengthStayLimit', 'length_stay_limit']
];

/** The design's four rules cards, each saved on its own (one `PUT booking/rules` with that card's changed keys). */
export type RulesCard = 'types' | 'slots' | 'capacity' | 'behaviour';
export const RULE_CARDS: Record<RulesCard, (keyof RulesDraft)[]> = {
  types: ['allowSelfTour', 'allowGuidedTour'],
  slots: ['slotIntervalMinutes', 'bufferMinutes', 'minimumNoticeMinutes', 'bookingHorizonDays'],
  capacity: ['doLimitMaxTour', 'maxSelf', 'maxGuided', 'limitMaxTour'],
  behaviour: ['onlyScheduledTour', 'gracePeriod', 'lengthStayLimit']
};
const ALL_RULE_KEYS = RULE_PARAMS.map(([key]) => key);

/** The changed rules (of one card, or all), by the CMS parameter names. */
export const rulesPayload = (draft: RulesDraft, base: RulesDraft, keys: (keyof RulesDraft)[] = ALL_RULE_KEYS): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  RULE_PARAMS.forEach(([key, param]) => {
    if (!keys.includes(key) || draft[key] === base[key]) return;
    out[param] = key === 'bookingHorizonDays' && draft[key] === 0 ? '' : draft[key];
  });
  return out;
};

/** The draft with one card's keys restored from the stored settings. */
export const rulesDiscard = (draft: RulesDraft, base: RulesDraft, keys: (keyof RulesDraft)[]): RulesDraft => {
  const next = { ...draft } as Record<string, unknown>;
  keys.forEach((key) => {
    next[key] = base[key];
  });
  return next as unknown as RulesDraft;
};

/** The rules the CMS would refuse, checked before sending (same bounds as `Scheduling::Settings#update_rules!`). */
export const rulesProblems = (draft: RulesDraft, base: RulesDraft, keys: (keyof RulesDraft)[] = ALL_RULE_KEYS): Record<string, string> => {
  const out: Record<string, string> = {};
  const changed = (key: keyof RulesDraft) => keys.includes(key) && draft[key] !== base[key];
  if (draft.doLimitMaxTour && changed('limitMaxTour') && (int(draft.limitMaxTour) ?? 0) < 1) out.limitMaxTour = i18n.t(B.cap.total);
  (['maxSelf', 'maxGuided'] as const).forEach((key) => {
    if (changed(key) && draft[key].trim() !== '' && (int(draft[key]) ?? 0) < 1) out[key] = i18n.t(B.cap.sub);
  });
  if (changed('gracePeriod') && (draft.onlyScheduledTour || draft.gracePeriod.trim() !== '')) {
    const grace = int(draft.gracePeriod);
    if (grace == null || grace < 10 || grace > 60) out.gracePeriod = i18n.t(B.behaviour.graceSub);
  }
  if (changed('lengthStayLimit')) {
    const stay = int(draft.lengthStayLimit);
    if (stay == null || stay < 1 || stay > 600) out.lengthStayLimit = i18n.t(B.behaviour.staySub);
  }
  return out;
};

export const rulesChanged = (draft: RulesDraft, base: RulesDraft, keys?: (keyof RulesDraft)[]): boolean => Object.keys(rulesPayload(draft, base, keys)).length > 0;

/* ── hours ─────────────────────────────────────────────────────────── */

export type HoursDraft = Record<HoursLane, Record<string, HourRange[]>>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const hoursDraftOf = (s: BookingSettings): HoursDraft => {
  const lane = (rows: Record<string, HourRange[]> | undefined): Record<string, HourRange[]> =>
    Object.fromEntries(DAYS.map((day) => [day, (rows?.[day] ?? []).map((range) => ({ open: range.open, close: range.close }))]));
  return { self: lane(s.hours?.self), guided: lane(s.hours?.guided) };
};

/** `lane.day` → the first problem of that day, as the CMS would report it. */
export const hoursErrors = (draft: HoursDraft): Record<string, string> => {
  const out: Record<string, string> = {};
  LANES.forEach((lane) => {
    DAYS.forEach((day) => {
      const ranges = draft[lane][day] ?? [];
      const key = `${lane}.${day}`;
      for (const range of ranges) {
        if (!HHMM.test(range.open) || !HHMM.test(range.close)) {
          out[key] = i18n.t(B.hours.error.format);
          return;
        }
        if (range.open >= range.close) {
          out[key] = i18n.t(B.hours.error.order);
          return;
        }
      }
      const sorted = [...ranges].sort((a, b) => a.open.localeCompare(b.open));
      for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].open < sorted[i - 1].close) {
          out[key] = i18n.t(B.hours.error.overlap);
          return;
        }
      }
    });
  });
  return out;
};

const normalizeLane = (lane: Record<string, HourRange[]>): string =>
  JSON.stringify(DAYS.map((day) => [...(lane[day] ?? [])].map((range) => `${range.open}-${range.close}`).sort()));

const normalizeHours = (draft: HoursDraft): string => JSON.stringify(LANES.map((lane) => normalizeLane(draft[lane])));

export const hoursChanged = (draft: HoursDraft, s: BookingSettings): boolean => normalizeHours(draft) !== normalizeHours(hoursDraftOf(s));

/** The lanes whose draft differs from the stored hours (`update_hours!` recreates every lane it receives). */
export const changedLanes = (draft: HoursDraft, s: BookingSettings): HoursLane[] => {
  const base = hoursDraftOf(s);
  return LANES.filter((lane) => normalizeLane(draft[lane]) !== normalizeLane(base[lane]));
};

/** Every day of the changed lane(s) only, as `update_hours!` replaces a lane whole. */
export const hoursPayload = (draft: HoursDraft, s: BookingSettings): { hours: Partial<Record<HoursLane, Record<string, { open: string; close: string }[]>>> } => ({
  hours: Object.fromEntries(
    changedLanes(draft, s).map((lane) => [lane, Object.fromEntries(DAYS.map((day) => [day, (draft[lane][day] ?? []).map((range) => ({ open: range.open, close: range.close }))]))])
  )
});

export const timeLabel = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const hoursLabel = (ranges: HourRange[]): string => (ranges.length ? ranges.map((range) => `${timeLabel(range.open)} – ${timeLabel(range.close)}`).join(' · ') : i18n.t(B.hours.closed));

const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? 0 : h * 60 + m;
};

/** The day's bars on a 6:00 – 22:00 track, in percent. */
export const hoursBars = (ranges: HourRange[]): { left: number; width: number }[] => {
  const start = 6 * 60;
  const span = 16 * 60;
  return ranges
    .map((range) => {
      const a = Math.max(start, minutesOf(range.open));
      const b = Math.min(start + span, minutesOf(range.close));
      return { left: ((a - start) / span) * 100, width: Math.max(0, ((b - a) / span) * 100) };
    })
    .filter((bar) => bar.width > 0);
};

/** The weekdays with at least one range in either lane (the app's "N days open this week"). */
export const openDaysCount = (draft: HoursDraft): number => DAYS.filter((day) => (draft.self[day]?.length ?? 0) + (draft.guided[day]?.length ?? 0) > 0).length;

/* ── closures ──────────────────────────────────────────────────────── */

export interface ClosureDraft {
  key: string;
  date: string;
  label: string;
  closedAllDay: boolean;
  startTime: string;
  endTime: string;
}

export const closuresDraftOf = (s: BookingSettings): ClosureDraft[] =>
  (s.closures ?? []).map((closure, index) => ({
    key: `${closure.id ?? 'c'}-${index}`,
    date: closure.date,
    label: closure.label ?? '',
    closedAllDay: closure.closedAllDay,
    startTime: closure.startTime ?? '09:00',
    endTime: closure.endTime ?? '12:00'
  }));

const normalizeClosures = (rows: ClosureDraft[]): string =>
  JSON.stringify([...rows].map((row) => [row.date, row.label.trim(), row.closedAllDay, row.closedAllDay ? '' : row.startTime, row.closedAllDay ? '' : row.endTime]).sort());

export const closuresChanged = (draft: ClosureDraft[], s: BookingSettings): boolean => normalizeClosures(draft) !== normalizeClosures(closuresDraftOf(s));

/** The first problem of a closure row, keyed by its `key`, as the CMS would report it. */
export const closuresErrors = (rows: ClosureDraft[]): Record<string, string> => {
  const out: Record<string, string> = {};
  const seen = new Set<string>();
  rows.forEach((row) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) out[row.key] = i18n.t(B.closures.error.date);
    else if (row.label.trim().length > 60) out[row.key] = i18n.t(B.closures.error.label);
    else if (!row.closedAllDay && (!HHMM.test(row.startTime) || !HHMM.test(row.endTime))) out[row.key] = i18n.t(B.hours.error.format);
    else if (!row.closedAllDay && row.startTime >= row.endTime) out[row.key] = i18n.t(B.hours.error.order);
    const id = `${row.date}|${row.closedAllDay ? '' : row.startTime}`;
    if (seen.has(id)) out[row.key] = i18n.t(B.closures.error.duplicate);
    seen.add(id);
  });
  return out;
};

export const closuresPayload = (rows: ClosureDraft[]): { closures: { date: string; label: string; closed_all_day: boolean; start_time?: string; end_time?: string }[] } => ({
  closures: rows.map((row) => ({
    date: row.date,
    label: row.label.trim(),
    closed_all_day: row.closedAllDay,
    ...(row.closedAllDay ? {} : { start_time: row.startTime, end_time: row.endTime })
  }))
});

export const closureLabel = (row: { date: string; closedAllDay: boolean; startTime: string | null; endTime: string | null }): string => {
  const date = new Date(`${row.date}T12:00:00`);
  const day = Number.isNaN(date.getTime()) ? row.date : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return row.closedAllDay ? `${day} · ${i18n.t(B.closures.allDay)}` : `${day} · ${timeLabel(row.startTime ?? '')} – ${timeLabel(row.endTime ?? '')}`;
};

/* ── form ──────────────────────────────────────────────────────────── */

export interface ButtonDraft {
  text: string;
  color: string;
  textColor: string;
  /** '' = no icon. */
  icon: string;
  width: string;
  height: string;
  font: string;
  /** Digits only; sent as `${n}px`. */
  fontSize: string;
}

export interface AppDraft {
  afterHoursLabel: boolean;
  allowShorterTour: boolean;
  partySizeLimit: string;
  askUnit: boolean;
  showTextBooking: boolean;
}

export interface FormDraft {
  creditCardRequired: boolean;
  idVerificationFee: boolean;
  visualIdVerification: boolean;
  showDesiredBedroom: boolean;
  showDesiredMoveInDate: boolean;
  marketingSourceRequired: boolean;
  app: AppDraft;
  button: ButtonDraft;
}

export type FormPart = 'fields' | 'app' | 'button';

/** The design's font list; a stored font outside it is kept as an extra option. */
export const BUTTON_FONTS = ['Open Sans Regular', 'Manrope', 'Lato', 'Montserrat', 'Georgia'];
export const BUTTON_ICONS = ['calendar', 'pin', 'clock', 'arrow', 'home'];
/** The design's inline icons (`ICON_D`), 24-unit stroke paths. */
export const ICON_PATHS: Record<string, string> = {
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  home: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6'
};
export const fontOptions = (stored: string): string[] => (stored && !BUTTON_FONTS.includes(stored) ? [...BUTTON_FONTS, stored] : BUTTON_FONTS);

export const formDraftOf = (s: BookingSettings): FormDraft => ({
  creditCardRequired: s.form?.creditCardRequired ?? false,
  idVerificationFee: s.form?.idVerificationFee ?? false,
  visualIdVerification: s.form?.visualIdVerification ?? false,
  showDesiredBedroom: s.form?.showDesiredBedroom ?? false,
  showDesiredMoveInDate: s.form?.showDesiredMoveInDate ?? false,
  marketingSourceRequired: s.form?.marketingSourceRequired ?? false,
  app: {
    afterHoursLabel: s.app?.afterHoursLabel ?? true,
    allowShorterTour: s.app?.allowShorterTour ?? true,
    partySizeLimit: str(s.app?.partySizeLimit ?? 6),
    askUnit: s.app?.askUnit ?? true,
    showTextBooking: s.app?.showTextBooking ?? true
  },
  button: {
    text: s.button?.text ?? 'Schedule a Visit',
    color: s.button?.color ?? '#20a345',
    textColor: s.button?.textColor ?? '#ffffff',
    icon: s.button?.icon ?? '',
    width: str(s.button?.width ?? 130),
    height: str(s.button?.height ?? 35),
    font: s.button?.font ?? 'Open Sans Regular',
    fontSize: (s.button?.fontSize ?? '14px').replace(/[^0-9]/g, '') || '14'
  }
});

const FORM_PARAMS: [keyof Omit<FormDraft, 'button' | 'app'>, string][] = [
  ['creditCardRequired', 'credit_card_required'],
  ['idVerificationFee', 'id_verification_fee'],
  ['visualIdVerification', 'visual_id_verification'],
  ['showDesiredBedroom', 'show_desired_bedroom'],
  ['showDesiredMoveInDate', 'show_desired_move_in_date'],
  ['marketingSourceRequired', 'marketing_source_required']
];
const APP_PARAMS: [keyof AppDraft, string][] = [
  ['afterHoursLabel', 'after_hours_label'],
  ['allowShorterTour', 'allow_shorter_tour'],
  ['partySizeLimit', 'party_size_limit'],
  ['askUnit', 'ask_unit'],
  ['showTextBooking', 'show_text_booking']
];
const BUTTON_PARAMS: [keyof ButtonDraft, string][] = [
  ['text', 'text'],
  ['color', 'color'],
  ['textColor', 'text_color'],
  ['icon', 'icon'],
  ['width', 'width'],
  ['height', 'height'],
  ['font', 'font'],
  ['fontSize', 'font_size']
];

/** The changed form settings; `part` limits the payload to the fields (with the app options) or to the button. */
export const formPayload = (draft: FormDraft, base: FormDraft, part: FormPart | 'all' = 'all'): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (part === 'all' || part === 'fields') {
    FORM_PARAMS.forEach(([key, param]) => {
      if (draft[key] !== base[key]) out[param] = draft[key];
    });
  }
  if (part === 'all' || part === 'app') {
    const app: Record<string, unknown> = {};
    APP_PARAMS.forEach(([key, param]) => {
      if (draft.app[key] !== base.app[key]) app[param] = draft.app[key];
    });
    if (Object.keys(app).length) out.app = app;
  }
  if (part === 'all' || part === 'button') {
    const button: Record<string, unknown> = {};
    BUTTON_PARAMS.forEach(([key, param]) => {
      if (draft.button[key] === base.button[key]) return;
      if (key === 'fontSize') button[param] = `${draft.button.fontSize}px`;
      else if (key === 'icon') button[param] = draft.button.icon || 'none';
      else button[param] = draft.button[key];
    });
    if (Object.keys(button).length) out.button = button;
  }
  return out;
};

export const formChanged = (draft: FormDraft, base: FormDraft, part: FormPart | 'all' = 'all'): boolean => Object.keys(formPayload(draft, base, part)).length > 0;

/** The form problems the CMS would refuse, checked before sending (`Scheduling::Settings#update_form!`). */
/** The draft with one part restored from the stored settings. */
export const formDiscard = (draft: FormDraft, base: FormDraft, part: FormPart): FormDraft => {
  if (part === 'button') return { ...draft, button: base.button };
  if (part === 'app') return { ...draft, app: base.app };
  return { ...base, app: draft.app, button: draft.button };
};

export const formProblems = (draft: FormDraft, base: FormDraft, part: FormPart): Record<string, string> => {
  const out: Record<string, string> = {};
  if (part === 'fields') return out;
  if (part === 'app') {
    const party = int(draft.app.partySizeLimit);
    if (draft.app.partySizeLimit !== base.app.partySizeLimit && (party == null || party < 1 || party > 10)) out.partySizeLimit = i18n.t(B.form.app.partySub);
  } else {
    const b = draft.button;
    if (b.text !== base.button.text && (!b.text.trim() || b.text.trim().length > 50)) out.text = i18n.t(B.button.textError);
    if (b.color !== base.button.color && !/^#[0-9a-fA-F]{6}$/.test(b.color)) out.color = i18n.t(B.button.colorError);
    if (b.textColor !== base.button.textColor && !/^#[0-9a-fA-F]{6}$/.test(b.textColor)) out.textColor = i18n.t(B.button.colorError);
    const size = int(b.fontSize);
    if (b.fontSize !== base.button.fontSize && (size == null || size < 8 || size > 40)) out.fontSize = i18n.t(B.button.sizeError);
    (['width', 'height'] as const).forEach((key) => {
      const value = int(b[key]);
      if (b[key] !== base.button[key] && (value == null || value < 10 || value > 1000)) out[key] = i18n.t(B.button.pxError);
    });
  }
  return out;
};

/* ── state of the widget, gates, link ───────────────────────────────── */

export interface WidgetState {
  label: string;
  variant: PillVariant;
  pill: string;
  sub: string;
}

export const widgetState = (s: BookingSettings): WidgetState => {
  if (s.salesforce) return { label: i18n.t(B.widget.sf), variant: 'neutral', pill: i18n.t(B.widget.pill.sf), sub: i18n.t(B.widget.sfSub) };
  if (s.widgetLive) {
    const types = [s.tourTypes?.selfTour ? i18n.t(B.types.self) : null, s.tourTypes?.guidedTour ? i18n.t(B.types.guided) : null].filter(Boolean).join(' and ');
    return { label: i18n.t(B.widget.live), variant: 'ok', pill: i18n.t(B.widget.pill.live), sub: t(B.widget.liveSub, { types, interval: s.slotIntervalMinutes }) };
  }
  const failing = s.gates.find((gate) => !gate.ok);
  return { label: i18n.t(B.widget.notLive), variant: 'crit', pill: i18n.t(B.widget.pill.notLive), sub: t(B.widget.notLiveSub, { error: failing?.error ?? '' }) };
};

export interface GateRow {
  key: string;
  label: string;
  ok: boolean;
  text: string;
  fix: string | null;
}

export const generateGateRows = (s: BookingSettings): GateRow[] =>
  s.gates.map((gate) => ({
    key: gate.key,
    label: gate.label,
    ok: gate.ok,
    text: gate.ok ? i18n.t(B.gate.pass) : t(B.gate.fail, { error: gate.error }),
    fix: gate.ok ? null : ((B.gate.fix as Record<string, string>)[gate.key] ? i18n.t((B.gate.fix as Record<string, string>)[gate.key]) : null)
  }));

/** The booking button as the embed renders it. */
export const buttonStyle = (button: ButtonDraft): Record<string, string | number> => ({
  background: /^#[0-9a-fA-F]{6}$/.test(button.color) ? button.color : '#20a345',
  color: /^#[0-9a-fA-F]{6}$/.test(button.textColor) ? button.textColor : '#fff',
  width: int(button.width) ?? 130,
  height: int(button.height) ?? 35,
  fontFamily: button.font || 'Open Sans Regular',
  fontSize: int(button.fontSize) ? `${button.fontSize}px` : '14px',
  border: 'none',
  borderRadius: 4,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6
});

/** The label of a slot length / buffer / notice / horizon option. */
export const minutesLabel = (minutes: number): string => {
  if (minutes === 0) return i18n.t(B.slots.opt.none);
  if (minutes % 60 !== 0) return t(B.slots.opt.min, { n: minutes });
  return minutes === 60 ? i18n.t(B.slots.opt.hour) : t(B.slots.opt.hours, { n: minutes / 60 });
};
export const daysLabel = (days: number): string => (days === 0 ? i18n.t(B.slots.opt.none) : t(B.slots.opt.days, { n: days }));

export const wherePlaces = (): { title: string; sub: string }[] => [
  { title: i18n.t(B.link.where.button), sub: i18n.t(B.link.where.buttonSub) },
  { title: i18n.t(B.link.where.direct), sub: i18n.t(B.link.where.directSub) },
  { title: i18n.t(B.link.where.map), sub: i18n.t(B.link.where.mapSub) },
  { title: i18n.t(B.link.where.app), sub: i18n.t(B.link.where.appSub) }
];
