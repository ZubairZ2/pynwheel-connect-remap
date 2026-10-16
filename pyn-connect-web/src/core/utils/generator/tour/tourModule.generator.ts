import { mapEditorRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import type { Variant } from '~/core/models/data/connect/common.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { i18n } from '~/resources/i18n';
import { DAYS, DAY_KEYS, DEF_HOURS, SEED_BOOKINGS, SYNC_STYLE, TOUR_TYPES, TYPE_LABEL } from '~/data/mock/scheduling.mock';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import { T, type ElevatorCard, type StopCard, type TourSummary, type TourTab } from './tourSetup.generator';

/**
 * The Tours page's module tabs (Back Office design, Oct 13, 2026 — Tour
 * Module): the overview's checklist, KPIs and attention list come from the
 * real tour (stops, elevators, start points, graph settings); Visitors and
 * the scheduling settings are the demo data set and say so.
 */

const C = CORE_STRINGS.tours;

export interface TourHeadPill {
  id: string;
  label: string;
  variant: PillVariant;
}

export const generateTourHeadPills = (summary: TourSummary, stops: StopCard[], elevators: ElevatorCard[], unsaved: number): TourHeadPill[] => {
  const locks = stops.filter((stop) => stop.lockLabel).length + elevators.filter((elevator) => elevator.gated).length;
  const pills: TourHeadPill[] = [
    { id: 'stops', label: t(summary.stops === 1 ? T.header.stopOne : T.header.stopMany, { count: summary.stops }), variant: summary.stops ? 'ok' : 'neutral' },
    { id: 'locks', label: i18n.t(locks ? C.locksOn : C.locksOff), variant: locks ? 'info' : 'neutral' }
  ];
  if (unsaved > 0) pills.push({ id: 'unsaved', label: t(C.publishPending, { count: unsaved }), variant: 'warn' });
  return pills;
};

/* ── overview ───────────────────────────────────────────────────────── */

export interface TourChecklistStep {
  id: string;
  num: number;
  title: string;
  state: string;
  done: boolean;
  cta: { label: string; tab?: TourTab; href?: string; action?: 'addStop' | 'publish' } | null;
}

export interface TourChecklist {
  steps: TourChecklistStep[];
  done: number;
  total: number;
  progress: string;
}

export const generateTourChecklist = (args: { propId: string; stops: StopCard[]; elevators: ElevatorCard[]; startPointsMissing: boolean }): TourChecklist => {
  const { propId, stops, elevators, startPointsMissing } = args;
  const unplotted = stops.filter((stop) => !stop.plotted).length;
  const gated = elevators.filter((elevator) => elevator.gated).length;
  const locks = stops.filter((stop) => stop.lockLabel).length + gated;
  const K = C.checklist;
  const mapHref = mapEditorRoute(propId);

  const steps: TourChecklistStep[] = [
    {
      id: 'route',
      num: 1,
      title: i18n.t(K.route),
      done: stops.length > 0,
      state: stops.length ? t(K.routeDone, { count: t(stops.length === 1 ? T.header.stopOne : T.header.stopMany, { count: stops.length }) }) : i18n.t(K.routeTodo),
      cta: stops.length ? { label: i18n.t(K.openStops), tab: 'stops' } : { label: i18n.t(K.addStops), action: 'addStop' }
    },
    {
      id: 'plot',
      num: 2,
      title: i18n.t(K.plot),
      done: stops.length > 0 && unplotted === 0,
      state: stops.length > 0 && unplotted === 0 ? i18n.t(K.plotDone) : t(K.plotTodo, { count: unplotted }),
      cta: { label: i18n.t(K.openMap), href: mapHref }
    },
    {
      id: 'starts',
      num: 3,
      title: i18n.t(K.starts),
      done: !startPointsMissing,
      state: i18n.t(startPointsMissing ? K.startsTodo : K.startsDone),
      cta: { label: i18n.t(K.openMap), href: mapHref }
    },
    {
      id: 'elevators',
      num: 4,
      title: i18n.t(K.elevators),
      done: gated > 0,
      state: gated ? t(K.elevatorsDone, { count: gated }) : i18n.t(K.elevatorsTodo),
      cta: { label: i18n.t(K.openElevators), tab: 'elevators' }
    },
    {
      id: 'locks',
      num: 5,
      title: i18n.t(K.locks),
      done: locks > 0,
      state: locks ? t(K.locksDone, { count: locks }) : i18n.t(K.locksTodo),
      cta: { label: i18n.t(K.openElevators), tab: 'elevators' }
    },
    {
      id: 'publish',
      num: 6,
      title: i18n.t(K.publish),
      done: false,
      state: i18n.t(K.publishTodo),
      cta: { label: i18n.t(K.openPublish), action: 'publish' }
    }
  ];
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, progress: t(K.progress, { done, total: steps.length }) };
};

export interface TourKpi {
  id: string;
  label: string;
  value: number;
  tone: 'ink' | 'warn' | 'ok';
}

export const generateTourKpis = (summary: TourSummary, stops: StopCard[], elevators: ElevatorCard[]): TourKpi[] => {
  const unplotted = stops.filter((stop) => !stop.plotted).length;
  const unlocked = elevators.filter((elevator) => !elevator.gated).length;
  return [
    { id: 'stops', label: i18n.t(C.kpis.stops), value: summary.stops, tone: 'ink' },
    { id: 'hidden', label: i18n.t(C.kpis.hidden), value: summary.stops - summary.visible, tone: 'ink' },
    { id: 'attention', label: i18n.t(C.kpis.attention), value: unplotted, tone: unplotted ? 'warn' : 'ok' },
    { id: 'unmapped', label: i18n.t(C.kpis.unmapped), value: unlocked, tone: unlocked ? 'warn' : 'ok' }
  ];
};

/** Stops the tour cannot route to: not plotted on any plan. */
export const generateTourAttention = (stops: StopCard[]): StopCard[] => stops.filter((stop) => !stop.plotted);

/* ── visitors (demo) ─────────────────────────────────────────────────── */

export interface DemoVisitorRow {
  id: string;
  when: string;
  visitor: string;
  email: string;
  type: string;
  status: string;
  statusVariant: Variant;
  crm: string;
}

export const generateDemoVisitorRows = (): DemoVisitorRow[] =>
  SEED_BOOKINGS.map((booking) => {
    const sync = SYNC_STYLE[booking.sync] ?? SYNC_STYLE.pending;
    return {
      id: booking.id,
      when: `${DAYS[booking.day] ?? ''} · ${booking.time}`,
      visitor: booking.visitor,
      email: booking.email,
      type: TYPE_LABEL[booking.type],
      status: sync.label,
      statusVariant: sync.v,
      crm: booking.crm
    };
  });

/* ── settings ────────────────────────────────────────────────────────── */

export type TourSettingRow = { label: string; kind: 'toggle'; on: boolean } | { label: string; kind: 'value'; value: string };

export interface TourSettingsGroup {
  id: 'navigation' | 'scheduling' | 'booking' | 'access' | 'experience' | 'messages';
  title: string;
  sub: string;
  /** Real rows come from the CMS; demo rows are the demo data set; unavailable groups have neither. */
  source: 'real' | 'demo' | 'unavailable';
  rows: TourSettingRow[];
  hours: { day: string; label: string }[];
  tourTypes: { id: string; label: string; note: string; on: boolean; caps: string }[];
}

export const generateTourSettingsGroups = (map: PropertyMap): TourSettingsGroup[] => {
  const S = C.settings;
  const settings = map.graph.settings;
  const tour = map.graph.tour;
  const notSet = i18n.t(S.notSet);
  const group = (id: TourSettingsGroup['id'], title: string, sub: string, source: TourSettingsGroup['source'], rows: TourSettingRow[] = []): TourSettingsGroup => ({
    id,
    title,
    sub,
    source,
    rows,
    hours: [],
    tourTypes: []
  });

  const scheduling = group('scheduling', i18n.t(S.scheduling), i18n.t(S.schedulingSub), 'demo');
  scheduling.hours = DAY_KEYS.map((day) => {
    const hours = DEF_HOURS[day];
    return { day, label: hours.on ? `${hours.open} – ${hours.close}` : i18n.t(S.closed) };
  });
  scheduling.tourTypes = TOUR_TYPES.map((type) => ({
    id: type.id,
    label: type.label,
    note: type.note,
    on: type.on,
    caps: `${type.dailyCap} / day · ${type.slotCap} / slot`
  }));

  return [
    group('navigation', i18n.t(S.navigation), i18n.t(S.navigationSub), 'real', [
      { label: i18n.t(S.autoWayfinding), kind: 'toggle', on: settings.autoWayfinding },
      { label: i18n.t(S.selfTour), kind: 'toggle', on: settings.selfTour },
      { label: i18n.t(S.svgMode), kind: 'toggle', on: settings.enableSvgMode },
      { label: i18n.t(S.autoZoom), kind: 'toggle', on: tour?.enableAutoZoom ?? false },
      { label: i18n.t(S.defaultFloor), kind: 'value', value: settings.defaultMapFloor == null ? notSet : String(settings.defaultMapFloor) },
      { label: i18n.t(S.routeColor), kind: 'value', value: tour?.dottedLineColor ?? notSet }
    ]),
    scheduling,
    group('booking', i18n.t(S.booking), i18n.t(S.bookingSub), 'unavailable'),
    group('access', i18n.t(S.access), i18n.t(S.accessSub), 'unavailable'),
    group('experience', i18n.t(S.experience), i18n.t(S.experienceSub), 'unavailable'),
    group('messages', i18n.t(S.messages), i18n.t(S.messagesSub), 'unavailable')
  ];
};
