import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { LockInventory, LockState, StopIssue, StopRow, StopRows } from '~/core/models/data/tourModules.data';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { t } from '../inventory/inventoryText';
import type { MapLevel } from '../map/mapLevels.generator';
import type { StopCard, TourLocalState } from './tourSetup.generator';

/**
 * The Stops tab (Back Office design, Oct 13 2026): the page's local stop
 * order (useTourSetup: reorder, hide, add, remove, dwell time — saved by the
 * Save button through TourSetup::Save) joined with what the CMS knows about
 * each stop (Stops::Rows: record content, pin, lock, setup gaps). Pure.
 */
export const ST = CORE_STRINGS.tourModules.stops;

export const KIND_COLOR: Record<string, string> = { tour: '#171A21', building_starting_point: '#4A7212', elevator: '#92499E', amenity: '#0077AE', unit: '#D63F7D' };

export interface StopListItem {
  key: string;
  tourStopId: number | null;
  name: string;
  kind: string;
  kindLabel: string;
  sub: string;
  num: string;
  color: string;
  hidden: boolean;
  local: boolean;
  model: boolean;
  missing: boolean;
  issues: { key: StopIssue; label: string }[];
  row: StopRow | null;
  card: StopCard;
  building: string | null;
  levelId: string | null;
}

export interface StopGroup {
  key: string;
  title: string;
  sub: string;
  count: number;
  items: StopListItem[];
}

const issueLabel = (issue: StopIssue): string => i18n.t(ST.issue[issue]);

/** The page's stops with the CMS rows joined by tour_stop id (a stop added on this page has none yet). */
export const generateStopItems = (cards: StopCard[], state: TourLocalState, rows: StopRows | null): StopListItem[] => {
  const byId = new Map((rows?.stops ?? []).map((row) => [row.id, row]));
  let num = 0;
  return cards.map((card) => {
    const local = state.stops.find((stop) => stop.key === card.key);
    const tourStopId = card.key.startsWith('stop:') ? Number(card.key.slice(5)) : null;
    const row = tourStopId != null ? byId.get(tourStopId) ?? null : null;
    const issues: { key: StopIssue; label: string }[] = [];
    if (row) row.issues.forEach((issue) => issues.push({ key: issue, label: issueLabel(issue) }));
    else if (!card.plotted) issues.push({ key: 'no_pin', label: issueLabel('no_pin') });
    const hidden = !card.visible;
    if (!hidden) num += 1;
    return {
      key: card.key,
      tourStopId,
      name: card.name,
      kind: card.kind,
      kindLabel: card.kindLabel,
      sub: card.whereLabel,
      num: hidden ? '—' : String(num),
      color: KIND_COLOR[card.kind] ?? '#8A919E',
      hidden,
      local: card.local,
      model: row?.record?.model === true,
      missing: row?.missing === true,
      issues,
      row,
      card,
      building: row?.record?.building ?? card.whereLabel.split(' · ')[0] ?? null,
      levelId: card.viewParams.level
    };
  });
};

/** Grouped by building in the tour's building order; unplotted stops at the end. */
export const generateStopGroups = (items: StopListItem[], buildingOrder: string[], onlyIssues: boolean): StopGroup[] => {
  const filtered = onlyIssues ? items.filter((item) => item.issues.length > 0) : items;
  const order = [...buildingOrder];
  filtered.forEach((item) => {
    const building = item.card.plotted ? item.building ?? '' : '';
    if (building && !order.includes(building)) order.push(building);
  });
  const groups: StopGroup[] = order.filter(Boolean).map((building) => {
    const inside = filtered.filter((item) => item.card.plotted && item.building === building);
    return { key: building, title: building, sub: t(ST.group.sub, { count: inside.length }), count: inside.length, items: inside };
  });
  const rest = filtered.filter((item) => !item.card.plotted || !item.building || !order.includes(item.building));
  if (rest.length || groups.length === 0) groups.push({ key: 'unplaced', title: i18n.t(ST.group.unplaced), sub: t(ST.group.sub, { count: rest.length }), count: rest.length, items: rest });
  return groups.filter((group) => group.items.length > 0 || groups.length === 1);
};

export const generateRouteSummary = (items: StopListItem[]): string => {
  if (!items.length) return i18n.t(ST.summaryNone);
  const visible = items.filter((item) => !item.hidden).length;
  const issues = items.filter((item) => item.issues.length > 0).length;
  return t(ST.summary, { visible, hidden: items.length - visible, issues });
};

export const generateVariations = (map: PropertyMap, rows: StopRows | null): string[] => {
  const out: string[] = [];
  if (map.graph.settings.autoWayfinding) out.push(i18n.t(ST.autoWayfinding));
  void rows;
  return out;
};

export interface ContentDraft {
  name: string;
  description: string;
  instructions: string;
  videoLink: string;
  virtualTourUrl: string;
}

export const draftOf = (row: StopRow | null): ContentDraft => ({
  name: row?.name ?? '',
  description: row?.record?.description ?? '',
  instructions: row?.record?.instructions ?? '',
  videoLink: row?.record?.videoLink ?? '',
  virtualTourUrl: row?.record?.virtualTourUrl ?? ''
});

export const draftChanged = (draft: ContentDraft, row: StopRow | null): boolean => {
  const base = draftOf(row);
  return (Object.keys(base) as (keyof ContentDraft)[]).some((key) => draft[key] !== base[key]);
};

/** The fields the drawer may edit for a stop, from the row's `editable` list. */
export const editableFields = (row: StopRow | null): Set<string> => new Set(row?.record?.editable ?? []);

export const lockStateLabel = (lock: LockState | null): { label: string; variant: 'ok' | 'warn' | 'crit' | 'neutral' } => {
  if (!lock || !lock.provider) return { label: i18n.t(ST.lock.state.none), variant: 'neutral' };
  if (lock.provider === 'Manual') return { label: i18n.t(ST.lock.state.manual), variant: lock.manualCodePresent ? 'ok' : 'warn' };
  return { label: t(ST.lock.state.smart, { provider: lock.provider }), variant: lock.missing ? 'crit' : 'ok' };
};

export type LockChoice = 'smart' | 'manual' | 'none';

export const lockChoiceOf = (lock: LockState | null): LockChoice => {
  if (!lock || !lock.provider) return 'none';
  return lock.provider === 'Manual' ? 'manual' : 'smart';
};

/** The devices the drawer can assign: every imported device, the mapped ones labelled with where they are. */
export const generateLockChoices = (inventory: LockInventory | null, query: string, current: LockState | null) => {
  if (!inventory) return [];
  const q = query.trim().toLowerCase();
  return inventory.locks
    .filter((lock) => !q || `${lock.name} ${lock.vendorLabel}`.toLowerCase().includes(q))
    .map((lock) => ({
      key: lock.key,
      lock,
      name: lock.name,
      sub: `${lock.vendorLabel} · ${lock.health.label}${lock.mapped && lock.target ? ` · ${lock.target.parent?.name ?? lock.target.name}` : ''}`,
      current: !!current?.device && current.device.vendor === lock.vendor && current.device.deviceId === lock.deviceId
    }));
};

export interface RouteEndpointOption {
  key: string;
  label: string;
  group: string;
  levelId: string | null;
  building: string | null;
  /** The record's floor, sent as `from_floor` / `to_floor` so a unit on a stacked floorplate is not ambiguous. */
  floor: number | null;
}

/**
 * What the shortest-path test can route between: the same ids
 * `Wayfinding::RouteService` takes (`unit:5`, `amenity:7`, `elevator:3`,
 * `bsp:2`, `tour_start:<tour id>`), from the stops on the tour and the
 * graph's elevators and entry points, filtered by the chosen scope.
 */
export const generateRouteEndpoints = (map: PropertyMap, items: StopListItem[], levels: MapLevel[], scope: 'plate' | 'floors' | 'buildings', levelId: string | null): RouteEndpointOption[] => {
  const level = levels.find((row) => row.id === levelId) ?? null;
  // The level a building's floor sits on, so an entry point or the tour start can be scoped to a plate like a pin.
  const levelOfFloor = (building: string | null, floor: number | null): string | null => {
    if (floor == null) return null;
    const hit = levels.find((row) => row.kind === 'floorplate' && row.floors.includes(floor) && (row.building == null || building == null || row.building === building));
    return hit?.id ?? null;
  };
  const out: RouteEndpointOption[] = [];
  if (map.graph.tour && (map.graph.tour.xPlot > 0 || map.graph.tour.yPlot > 0)) {
    out.push({ key: `tour_start:${map.graph.tour.id}`, label: i18n.t(ST.kind.tour), group: i18n.t(ST.kind.tour), levelId: levelOfFloor(map.graph.tour.building, map.graph.tour.startingFloor), building: map.graph.tour.building, floor: null });
  }
  items
    .filter((item) => !item.hidden && item.card.plotted && (item.kind === 'unit' || item.kind === 'amenity'))
    .forEach((item) =>
      out.push({ key: `${item.kind}:${item.card.key.startsWith('stop:') ? item.row?.stopId ?? 0 : 0}`, label: item.name, group: item.kindLabel, levelId: item.levelId, building: item.building, floor: item.row?.record?.floor ?? null })
    );
  map.graph.elevators.forEach((elevator) => {
    const elevatorLevel = elevator.floorplateId != null ? `floorplate:${elevator.floorplateId}` : elevator.sitemapId != null ? `sitemap:${elevator.sitemapId}` : null;
    out.push({ key: `elevator:${elevator.id}`, label: elevator.name ?? i18n.t(ST.kind.elevator), group: i18n.t(ST.kind.elevator), levelId: elevatorLevel, building: elevator.building, floor: null });
  });
  map.graph.buildingStartingPoints.forEach((point) =>
    out.push({ key: `bsp:${point.id}`, label: point.name ?? i18n.t(ST.kind.building_starting_point), group: i18n.t(ST.kind.building_starting_point), levelId: levelOfFloor(point.building, point.floor), building: point.building, floor: point.floor })
  );
  const valid = out.filter((row) => !row.key.endsWith(':0'));
  // "This floor": the places on the previewed plate; a place whose level is unknown stays, one on another level goes.
  if (scope === 'plate' && level) return valid.filter((row) => row.levelId == null || row.levelId === level.id);
  if (scope === 'floors' && level) return valid.filter((row) => row.building == null || row.building === level.building || level.building == null);
  return valid;
};

export const stopEndpointKey = (item: StopListItem): string | null => {
  if (!item.row) return null;
  if (item.kind === 'unit' || item.kind === 'amenity') return `${item.kind}:${item.row.stopId}`;
  if (item.kind === 'elevator') return `elevator:${item.row.stopId}`;
  if (item.kind === 'building_starting_point') return `bsp:${item.row.stopId}`;
  return null;
};
