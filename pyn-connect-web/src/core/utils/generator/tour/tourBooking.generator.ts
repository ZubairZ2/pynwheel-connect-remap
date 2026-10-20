import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { BookingSettings, HourRange, HoursLane } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';

/**
 * The Settings tab's scheduling and booking sections (Back Office design,
 * Oct 13 2026): the booking rules, the visiting hours, the booking form and
 * the booking link, as `Scheduling::Settings` stores and validates them.
 * Drafts are what the forms edit; payloads carry only what changed. Pure.
 */
export const B = CORE_STRINGS.tourModules.booking;

export type BookingSection = 'rules' | 'hours' | 'form' | 'link' | 'crm';
export const BOOKING_SECTIONS: { id: BookingSection; group: 'scheduling' | 'booking' }[] = [
  { id: 'rules', group: 'scheduling' },
  { id: 'hours', group: 'scheduling' },
  { id: 'form', group: 'booking' },
  { id: 'link', group: 'booking' },
  { id: 'crm', group: 'booking' }
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS = DAYS.slice(0, 5);
export const INTERVALS = [15, 30, 60, 120];
export const LANES: HoursLane[] = ['self', 'guided'];

const str = (value: number | null | undefined): string => (value == null ? '' : String(value));
const int = (value: string): number | null => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

/* ── rules ─────────────────────────────────────────────────────────── */

export interface RulesDraft {
  allowSelfTour: boolean;
  allowGuidedTour: boolean;
  allowVirtualTour: boolean;
  slotIntervalMinutes: number;
  doLimitMaxTour: boolean;
  limitMaxTour: string;
  maxSelf: string;
  maxGuided: string;
  maxVirtual: string;
  onlyScheduledTour: boolean;
  gracePeriod: string;
  lengthStayLimit: string;
  schedulerEnabled: boolean;
}

export const rulesDraftOf = (s: BookingSettings): RulesDraft => ({
  allowSelfTour: s.tourTypes?.selfTour ?? false,
  allowGuidedTour: s.tourTypes?.guidedTour ?? false,
  allowVirtualTour: s.tourTypes?.virtualTour ?? false,
  slotIntervalMinutes: s.slotIntervalMinutes || 30,
  doLimitMaxTour: s.capacity?.enabled ?? false,
  limitMaxTour: str(s.capacity?.limitMaxTour),
  maxSelf: str(s.capacity?.maxSelfTourUsers),
  maxGuided: str(s.capacity?.maxGuidedTourUsers),
  maxVirtual: str(s.capacity?.maxVirtualTourUsers),
  onlyScheduledTour: s.onlyScheduledTour,
  gracePeriod: str(s.gracePeriod),
  lengthStayLimit: str(s.lengthStayLimit),
  schedulerEnabled: s.schedulerEnabled
});

const RULE_PARAMS: [keyof RulesDraft, string][] = [
  ['allowSelfTour', 'allow_self_tour'],
  ['allowGuidedTour', 'allow_guided_tour'],
  ['allowVirtualTour', 'allow_virtual_tour'],
  ['slotIntervalMinutes', 'slot_interval_minutes'],
  ['doLimitMaxTour', 'do_limit_max_tour'],
  ['limitMaxTour', 'limit_max_tour'],
  ['maxSelf', 'max_self_tour_users'],
  ['maxGuided', 'max_guided_tour_users'],
  ['maxVirtual', 'max_virtual_tour_users'],
  ['onlyScheduledTour', 'only_scheduled_tour'],
  ['gracePeriod', 'grace_period'],
  ['lengthStayLimit', 'length_stay_limit'],
  ['schedulerEnabled', 'scheduler_enabled']
];

/** The changed rules, by the CMS parameter names. */
export const rulesPayload = (draft: RulesDraft, base: RulesDraft): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  RULE_PARAMS.forEach(([key, param]) => {
    if (draft[key] !== base[key]) out[param] = draft[key];
  });
  return out;
};

/** The rules the CMS would refuse, checked before sending (same bounds as `Scheduling::Settings#update_rules!`). */
export const rulesProblems = (draft: RulesDraft, base: RulesDraft): Record<string, string> => {
  const out: Record<string, string> = {};
  const changed = (key: keyof RulesDraft) => draft[key] !== base[key];
  if (draft.doLimitMaxTour && changed('limitMaxTour') && (int(draft.limitMaxTour) ?? 0) < 1) out.limitMaxTour = i18n.t(B.cap.total);
  (['maxSelf', 'maxGuided', 'maxVirtual'] as const).forEach((key) => {
    if (changed(key) && draft[key].trim() !== '' && (int(draft[key]) ?? 0) < 1) out[key] = i18n.t(B.cap.sub);
  });
  if (changed('gracePeriod')) {
    const grace = int(draft.gracePeriod);
    if (grace == null || grace < 10 || grace > 60) out.gracePeriod = i18n.t(B.behaviour.graceSub);
  }
  if (changed('lengthStayLimit')) {
    const stay = int(draft.lengthStayLimit);
    if (stay == null || stay < 1 || stay > 600) out.lengthStayLimit = i18n.t(B.behaviour.staySub);
  }
  return out;
};

export const rulesChanged = (draft: RulesDraft, base: RulesDraft): boolean => Object.keys(rulesPayload(draft, base)).length > 0;

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

/* ── form ──────────────────────────────────────────────────────────── */

export interface ButtonDraft {
  text: string;
  color: string;
  width: string;
  height: string;
  font: string;
  fontSize: string;
}

export interface FormDraft {
  creditCardRequired: boolean;
  idVerificationFee: boolean;
  visualIdVerification: boolean;
  showDesiredBedroom: boolean;
  showDesiredMoveInDate: boolean;
  marketingSourceRequired: boolean;
  button: ButtonDraft;
}

export const formDraftOf = (s: BookingSettings): FormDraft => ({
  creditCardRequired: s.form?.creditCardRequired ?? false,
  idVerificationFee: s.form?.idVerificationFee ?? false,
  visualIdVerification: s.form?.visualIdVerification ?? false,
  showDesiredBedroom: s.form?.showDesiredBedroom ?? false,
  showDesiredMoveInDate: s.form?.showDesiredMoveInDate ?? false,
  marketingSourceRequired: s.form?.marketingSourceRequired ?? false,
  button: {
    text: s.button?.text ?? 'Schedule a Tour',
    color: s.button?.color ?? '#0077ae',
    width: str(s.button?.width ?? 180),
    height: str(s.button?.height ?? 44),
    font: s.button?.font ?? 'Arial',
    fontSize: s.button?.fontSize ?? '14px'
  }
});

const FORM_PARAMS: [keyof Omit<FormDraft, 'button'>, string][] = [
  ['creditCardRequired', 'credit_card_required'],
  ['idVerificationFee', 'id_verification_fee'],
  ['visualIdVerification', 'visual_id_verification'],
  ['showDesiredBedroom', 'show_desired_bedroom'],
  ['showDesiredMoveInDate', 'show_desired_move_in_date'],
  ['marketingSourceRequired', 'marketing_source_required']
];
const BUTTON_PARAMS: [keyof ButtonDraft, string][] = [
  ['text', 'text'],
  ['color', 'color'],
  ['width', 'width'],
  ['height', 'height'],
  ['font', 'font'],
  ['fontSize', 'font_size']
];

export const formPayload = (draft: FormDraft, base: FormDraft): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  FORM_PARAMS.forEach(([key, param]) => {
    if (draft[key] !== base[key]) out[param] = draft[key];
  });
  const button: Record<string, unknown> = {};
  BUTTON_PARAMS.forEach(([key, param]) => {
    if (draft.button[key] !== base.button[key]) button[param] = draft.button[key];
  });
  if (Object.keys(button).length) out.button = button;
  return out;
};

export const formChanged = (draft: FormDraft, base: FormDraft): boolean => Object.keys(formPayload(draft, base)).length > 0;

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
  background: /^#[0-9a-fA-F]{6}$/.test(button.color) ? button.color : '#0077ae',
  color: '#fff',
  width: int(button.width) ?? 180,
  height: int(button.height) ?? 44,
  fontFamily: button.font || 'Arial',
  fontSize: /^\d{1,2}px$/.test(button.fontSize) ? button.fontSize : '14px',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export const wherePlaces = (): { title: string; sub: string }[] => [
  { title: i18n.t(B.link.where.button), sub: i18n.t(B.link.where.buttonSub) },
  { title: i18n.t(B.link.where.direct), sub: i18n.t(B.link.where.directSub) },
  { title: i18n.t(B.link.where.map), sub: i18n.t(B.link.where.mapSub) },
  { title: i18n.t(B.link.where.app), sub: i18n.t(B.link.where.appSub) }
];
