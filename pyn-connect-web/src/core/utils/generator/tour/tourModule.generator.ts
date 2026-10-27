import { mapEditorRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { LockInventory, VisitorsList, TourPublication } from '~/core/models/data/tourModules.data';
import { i18n } from '~/resources/i18n';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import { bookingSectionOf, type BookingSection } from './tourBooking.generator';
import type { StopListItem } from './tourStops.generator';
import { T, type StopCard, type TourSummary, type TourTab } from './tourSetup.generator';

/**
 * The Tours page's Overview and Settings (Back Office design, Oct 27, 2026 —
 * Tour Module): the overview's checklist, KPIs and attention list come from
 * the real tour (stops with their CMS rows, gated elevators, start points,
 * the lock inventory, today's visitors); the Settings rail is the design's
 * `SET_GROUPS`: the two booking groups (real, in BookingPanels) and the three
 * groups whose sections Connect shows as stored (Route & navigation) or has
 * no page for yet.
 */

const C = CORE_STRINGS.tours;
const O = CORE_STRINGS.tourModules.overview;

export interface TourHeadPill {
  id: string;
  label: string;
  variant: PillVariant;
}

export const generateTourHeadPills = (summary: TourSummary, stops: StopCard[], unsaved: number): TourHeadPill[] => {
  const locks = stops.filter((stop) => stop.lockLabel).length + summary.gatedElevators;
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

/** The design's checklist: route, pins, start points, locks, publish (the former "Gate the elevators" step went with the Elevators tab). */
export const generateTourChecklist = (args: { propId: string; stops: StopCard[]; gatedElevators: number; startPointsMissing: boolean; locks: LockInventory | null; items: StopListItem[]; publication?: TourPublication | null }): TourChecklist => {
  const { propId, stops, gatedElevators, startPointsMissing, locks, items } = args;
  const unplotted = stops.filter((stop) => !stop.plotted).length;
  const lockCount = locks ? locks.counts.mapped + locks.counts.manual : stops.filter((stop) => stop.lockLabel).length + gatedElevators;
  // Locked stops on this tour without a device or code (the rows' `no_lock` issue), not the property-wide holders.
  const noLock = items.filter((item) => item.issues.some((issue) => issue.key === 'no_lock')).length;
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
      id: 'locks',
      num: 4,
      title: i18n.t(K.locks),
      done: lockCount > 0 && noLock === 0,
      state: lockCount ? t(K.locksDone, { count: lockCount }) : i18n.t(K.locksTodo),
      cta: { label: i18n.t(O.openLocks), tab: 'locks' }
    },
    {
      id: 'publish',
      num: 5,
      title: i18n.t(K.publish),
      // October 25, 2026: published from Connect and unchanged since.
      done: !!args.publication?.everPublished && !args.publication.changedSincePublish,
      state: i18n.t(!args.publication?.everPublished ? K.publishTodo : args.publication.changedSincePublish ? K.publishStale : K.publishDone),
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

/** The six numbers of the overview: the local route, the stops' setup gaps, today's visitors and the locked stops without a lock. */
export const generateTourKpis = (summary: TourSummary, items: StopListItem[], visitors: VisitorsList | null, rowsLoaded: boolean): TourKpi[] => {
  const attention = items.filter((item) => item.issues.length > 0).length;
  const withoutLock = rowsLoaded ? items.filter((item) => item.issues.some((issue) => issue.key === 'no_lock')).length : null;
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

export type TourSettingsGroupId = 'access' | 'experience' | 'messages';
export type TourSettingsSectionId = 'checks' | 'tour_access' | 'welcome' | 'navigation' | 'stop_options' | 'after' | 'concierge' | 'messages';

export interface TourSettingsSection {
  id: TourSettingsSectionId;
  title: string;
  intro: string;
  /** Real rows come from the CMS (shown as stored); unavailable sections have no page in Connect yet. */
  source: 'real' | 'unavailable';
  rows: TourSettingRow[];
}

export interface TourSettingsGroup {
  id: TourSettingsGroupId;
  title: string;
  sub: string;
  sections: TourSettingsSection[];
}

/** The design's `SET_GROUPS` after the two booking groups: Route & navigation is a section of Tour experience. */
export const TOUR_SETTINGS_GROUPS: { id: TourSettingsGroupId; sections: TourSettingsSectionId[] }[] = [
  { id: 'access', sections: ['checks', 'tour_access'] },
  { id: 'experience', sections: ['welcome', 'navigation', 'stop_options', 'after', 'concierge'] },
  { id: 'messages', sections: ['messages'] }
];

export const isTourSettingsSection = (value: string | undefined | null): value is TourSettingsSectionId => !!value && TOUR_SETTINGS_GROUPS.some((group) => (group.sections as string[]).includes(value));
export const tourSettingsGroupOf = (section: TourSettingsSectionId): TourSettingsGroupId => TOUR_SETTINGS_GROUPS.find((group) => group.sections.includes(section))?.id ?? 'experience';

/** A section of the Settings tab: a booking section (BookingPanels) or one of the design's other sections. */
export type SettingsSection = BookingSection | TourSettingsSectionId;
/** `?section=` of the Settings tab, or undefined (pure: the server page reads it too). */
export const settingsSectionOf = (value: string | undefined | null): SettingsSection | undefined => bookingSectionOf(value) ?? (isTourSettingsSection(value) ? value : undefined);

export const generateTourSettingsGroups = (map: PropertyMap): TourSettingsGroup[] => {
  const S = C.settings;
  const settings = map.graph.settings;
  const tour = map.graph.tour;
  const notSet = i18n.t(S.notSet);
  const sectionText: Record<TourSettingsSectionId, { title: string; intro: string }> = {
    checks: { title: i18n.t(S.sections.checks), intro: i18n.t(S.sections.checksSub) },
    tour_access: { title: i18n.t(S.sections.tourAccess), intro: i18n.t(S.sections.tourAccessSub) },
    welcome: { title: i18n.t(S.sections.welcome), intro: i18n.t(S.sections.welcomeSub) },
    navigation: { title: i18n.t(S.navigation), intro: i18n.t(S.sections.navigationSub) },
    stop_options: { title: i18n.t(S.sections.stopOptions), intro: i18n.t(S.sections.stopOptionsSub) },
    after: { title: i18n.t(S.sections.after), intro: i18n.t(S.sections.afterSub) },
    concierge: { title: i18n.t(S.sections.concierge), intro: i18n.t(S.sections.conciergeSub) },
    messages: { title: i18n.t(S.messages), intro: i18n.t(S.sections.messagesSub) }
  };
  const navigationRows: TourSettingRow[] = [
    { label: i18n.t(S.autoWayfinding), kind: 'toggle', on: settings.autoWayfinding },
    { label: i18n.t(S.selfTour), kind: 'toggle', on: settings.selfTour },
    { label: i18n.t(S.svgMode), kind: 'toggle', on: settings.enableSvgMode },
    { label: i18n.t(S.autoZoom), kind: 'toggle', on: tour?.enableAutoZoom ?? false },
    { label: i18n.t(S.defaultFloor), kind: 'value', value: settings.defaultMapFloor == null ? notSet : String(settings.defaultMapFloor) },
    { label: i18n.t(S.routeColor), kind: 'value', value: tour?.dottedLineColor ?? notSet }
  ];
  const section = (id: TourSettingsSectionId): TourSettingsSection => ({
    id,
    ...sectionText[id],
    source: id === 'navigation' ? 'real' : 'unavailable',
    rows: id === 'navigation' ? navigationRows : []
  });
  const groupText: Record<TourSettingsGroupId, { title: string; sub: string }> = {
    access: { title: i18n.t(S.access), sub: i18n.t(S.accessSub) },
    experience: { title: i18n.t(S.experience), sub: i18n.t(S.experienceSub) },
    messages: { title: i18n.t(S.messages), sub: i18n.t(S.messagesSub) }
  };
  return TOUR_SETTINGS_GROUPS.map((group) => ({ id: group.id, ...groupText[group.id], sections: group.sections.map(section) }));
};
