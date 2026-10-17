import { mapEditorRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { LockInventory, VisitorsList } from '~/core/models/data/tourModules.data';
import { i18n } from '~/resources/i18n';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import type { StopListItem } from './tourStops.generator';
import { T, type ElevatorCard, type StopCard, type TourSummary, type TourTab } from './tourSetup.generator';

/**
 * The Tours page's Overview and Settings (Back Office design, Oct 13, 2026 —
 * Tour Module): the overview's checklist, KPIs and attention list come from
 * the real tour (stops with their CMS rows, elevators, start points, the lock
 * inventory, today's visitors); the Settings rail lists the booking sections
 * (real, in BookingPanels) next to the route group and the groups Connect has
 * no page for yet.
 */

const C = CORE_STRINGS.tours;
const O = CORE_STRINGS.tourModules.overview;

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

export const generateTourChecklist = (args: { propId: string; stops: StopCard[]; elevators: ElevatorCard[]; startPointsMissing: boolean; locks: LockInventory | null }): TourChecklist => {
  const { propId, stops, elevators, startPointsMissing, locks } = args;
  const unplotted = stops.filter((stop) => !stop.plotted).length;
  const gated = elevators.filter((elevator) => elevator.gated).length;
  const lockCount = locks ? locks.counts.mapped + locks.counts.manual : stops.filter((stop) => stop.lockLabel).length + gated;
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
      done: lockCount > 0 && (locks?.counts.withoutLock ?? 0) === 0,
      state: lockCount ? t(K.locksDone, { count: lockCount }) : i18n.t(K.locksTodo),
      cta: { label: i18n.t(O.openLocks), tab: 'locks' }
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
  value: string | number;
  tone: 'ink' | 'warn' | 'ok';
}

/** The six numbers of the overview: the local route, the stops' setup gaps, today's visitors and the locks. */
export const generateTourKpis = (summary: TourSummary, items: StopListItem[], visitors: VisitorsList | null, locks: LockInventory | null): TourKpi[] => {
  const attention = items.filter((item) => item.issues.length > 0).length;
  const withoutLock = locks?.counts.withoutLock ?? null;
  return [
    { id: 'stops', label: i18n.t(C.kpis.stops), value: summary.stops, tone: 'ink' },
    { id: 'hidden', label: i18n.t(C.kpis.hidden), value: summary.stops - summary.visible, tone: 'ink' },
    { id: 'attention', label: i18n.t(O.attention), value: attention, tone: attention ? 'warn' : 'ok' },
    { id: 'onsite', label: i18n.t(O.onSite), value: visitors ? visitors.onSite.length : '—', tone: 'ink' },
    { id: 'coming', label: i18n.t(O.comingToday), value: visitors ? visitors.comingToday : '—', tone: 'ink' },
    { id: 'unmapped', label: i18n.t(O.unmapped), value: withoutLock ?? '—', tone: withoutLock ? 'warn' : withoutLock === 0 ? 'ok' : 'ink' }
  ];
};

/** Stops with a setup gap (no pin, no photo, no directions, a locked door without a lock), in route order. */
export const generateTourAttention = (items: StopListItem[]): StopListItem[] => items.filter((item) => item.issues.length > 0);

/* ── settings ────────────────────────────────────────────────────────── */

export type TourSettingRow = { label: string; kind: 'toggle'; on: boolean } | { label: string; kind: 'value'; value: string };

export interface TourSettingsGroup {
  id: 'navigation' | 'access' | 'experience' | 'messages';
  title: string;
  sub: string;
  /** Real rows come from the CMS; unavailable groups have no page in Connect yet. */
  source: 'real' | 'unavailable';
  rows: TourSettingRow[];
}

export const generateTourSettingsGroups = (map: PropertyMap): TourSettingsGroup[] => {
  const S = C.settings;
  const settings = map.graph.settings;
  const tour = map.graph.tour;
  const notSet = i18n.t(S.notSet);
  const group = (id: TourSettingsGroup['id'], title: string, sub: string, source: TourSettingsGroup['source'], rows: TourSettingRow[] = []): TourSettingsGroup => ({ id, title, sub, source, rows });
  return [
    group('navigation', i18n.t(S.navigation), i18n.t(S.navigationSub), 'real', [
      { label: i18n.t(S.autoWayfinding), kind: 'toggle', on: settings.autoWayfinding },
      { label: i18n.t(S.selfTour), kind: 'toggle', on: settings.selfTour },
      { label: i18n.t(S.svgMode), kind: 'toggle', on: settings.enableSvgMode },
      { label: i18n.t(S.autoZoom), kind: 'toggle', on: tour?.enableAutoZoom ?? false },
      { label: i18n.t(S.defaultFloor), kind: 'value', value: settings.defaultMapFloor == null ? notSet : String(settings.defaultMapFloor) },
      { label: i18n.t(S.routeColor), kind: 'value', value: tour?.dottedLineColor ?? notSet }
    ]),
    group('access', i18n.t(S.access), i18n.t(S.accessSub), 'unavailable'),
    group('experience', i18n.t(S.experience), i18n.t(S.experienceSub), 'unavailable'),
    group('messages', i18n.t(S.messages), i18n.t(S.messagesSub), 'unavailable')
  ];
};
