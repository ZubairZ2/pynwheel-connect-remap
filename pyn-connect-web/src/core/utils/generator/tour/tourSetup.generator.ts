import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import type { MapElevator, MapStartingPoint, PropertyMap } from '~/core/models/data/propertyMap.data';
import type { PillVariant } from '../listing.types';
import { layoutText, plainText, t } from '../inventory/inventoryText';
import { generateMapLevels, levelForAmenity, levelForFloor, levelForUnit, type MapLevel } from '../map/mapLevels.generator';
import { generateRasterGraphs, type LevelGraph } from '../map/mapNodes.generator';
import { generateStartPointRows, type StartPointRow } from '../map/mapPanels.generator';
import { initialLocalMapState, pinKey, type PinRef } from '../map/mapState';
import type { StopEndpoint } from '~/core/utils/wayfinding/stopRoute';

/**
 * Tour Setup on real data: the property's tour stops (`tour_stops` of the
 * community tour, in their sort order), its elevators (with their galleries
 * and Latch banks) and the routing inputs (the pathway graph, the building
 * starting points), as the plotting design's three tabs show them. Every
 * edit the tabs offer lives in `TourLocalState` until the page reloads.
 */

export const T = CORE_STRINGS.tourSetup;

export type StopKind = 'unit' | 'amenity' | 'elevator' | 'building_starting_point';

export interface LocalStop {
  /** `stop:<tour_stop id>` for a stored stop, `local:<n>` for one added on this page. */
  key: string;
  kind: StopKind;
  recordId: number;
  sort: number | null;
  visible: boolean;
  /** The AI Concierge talking point: the stop's directional text / description as stored, editable here. */
  talkingPoint: string;
  duration: string;
  removed: boolean;
  local: boolean;
}

export interface LocalElevator {
  key: string;
  name: string;
  building: string;
  from: string;
  to: string;
  gated: boolean;
}

export interface LocalPhoto {
  name: string;
  url: string;
}

export type TourTab = 'stops' | 'elevators' | 'routing';

export interface TourConfirm {
  title: string;
  message: string;
  label: string;
  onConfirm: () => void;
}

export type TourDialog =
  | { kind: 'addStop'; source: string; duration: string; talkingPoint: string }
  | { kind: 'editStop'; key: string; duration: string; talkingPoint: string }
  | { kind: 'addElevator'; name: string; building: string; from: string; to: string; gated: boolean }
  | null;

export interface TourLocalState {
  tab: TourTab;
  stops: LocalStop[];
  /** Elevator id → gated on this page (overrides the stored lock provider). */
  gated: Record<number, boolean>;
  /** Elevator id (or local key) → photos added on this page. */
  photos: Record<string, LocalPhoto[]>;
  /** Elevator id → the stored photos' order on this page. */
  photoOrder: Record<string, string[]>;
  removedElevators: number[];
  localElevators: LocalElevator[];
  routeFrom: string;
  routeTo: string;
  routeResult: { text: string; tone: 'muted' | 'ok' | 'warn' | 'crit' } | null;
  dialog: TourDialog;
  confirm: TourConfirm | null;
  publishOpen: boolean;
  nextLocal: number;
}

const stopKey = (id: number): string => `stop:${id}`;

/** The stops of the community tour, in sort order, each with its stored talking point. */
export const initialTourState = (map: PropertyMap): TourLocalState => ({
  tab: 'stops',
  stops: [...map.graph.tourStops]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id)
    .map((stop) => ({
      key: stopKey(stop.id),
      kind: stop.stopType as StopKind,
      recordId: stop.stopId,
      sort: stop.sort,
      visible: stop.displayStop,
      talkingPoint: storedTalkingPoint(map, stop.stopType as StopKind, stop.stopId),
      duration: '',
      removed: false,
      local: false
    }))
    .filter((stop) => stopRecord(map, stop.kind, stop.recordId) != null),
  gated: {},
  photos: {},
  photoOrder: {},
  removedElevators: [],
  localElevators: [],
  routeFrom: '',
  routeTo: '',
  routeResult: null,
  dialog: null,
  confirm: null,
  publishOpen: false,
  nextLocal: 1
});

type StopRecord =
  | { kind: 'unit'; record: InventoryUnit }
  | { kind: 'amenity'; record: InventoryAmenity }
  | { kind: 'elevator'; record: MapElevator }
  | { kind: 'building_starting_point'; record: MapStartingPoint };

export const stopRecord = (map: PropertyMap, kind: StopKind, id: number): StopRecord | null => {
  switch (kind) {
    case 'unit': {
      const record = map.inventory.units.find((row) => row.id === id);
      return record ? { kind, record } : null;
    }
    case 'amenity': {
      const record = map.inventory.amenities.find((row) => row.id === id);
      return record ? { kind, record } : null;
    }
    case 'elevator': {
      const record = map.graph.elevators.find((row) => row.id === id);
      return record ? { kind, record } : null;
    }
    default: {
      const record = map.graph.buildingStartingPoints.find((row) => row.id === id);
      return record ? { kind: 'building_starting_point', record } : null;
    }
  }
};

/**
 * What the tour app reads out at the stop (TourStop#stop_directional_text):
 * a unit's `stop_description`, else the record's directional text, else its
 * description. HTML as stored, shown as text.
 */
const storedTalkingPoint = (map: PropertyMap, kind: StopKind, id: number): string => {
  const found = stopRecord(map, kind, id);
  if (!found) return '';
  switch (found.kind) {
    case 'unit':
      return plainText(found.record.stopDescription ?? found.record.description);
    case 'amenity':
      return plainText(found.record.directionalText ?? found.record.description);
    case 'elevator':
      return plainText(found.record.directionalText ?? found.record.description);
    default:
      return plainText(found.record.directionalText);
  }
};

const positioned = (x: number | null, y: number | null): boolean => (x ?? 0) > 0 || (y ?? 0) > 0;

export interface StopCard {
  key: string;
  name: string;
  kind: StopKind;
  kindLabel: string;
  icon: string;
  image: string | null;
  plotted: boolean;
  plotVariant: PillVariant;
  plotLabel: string;
  viewLabel: string;
  /** The map screen to open, with the record selected (or armed when unplotted). */
  viewParams: { level: string | null; pin: PinRef | null; arm: boolean };
  floorLabel: string;
  whereLabel: string;
  sourceLabel: string;
  distance: string;
  duration: string;
  nodeLabel: string;
  talkingPoint: string;
  visible: boolean;
  local: boolean;
  lockLabel: string | null;
  position: number;
  first: boolean;
  last: boolean;
}

const floorText = (floor: number | null): string => (floor == null ? '—' : t(T.stops.floor, { floor }));

export const generateStopCards = (map: PropertyMap, levels: MapLevel[], state: TourLocalState): StopCard[] => {
  const shown = state.stops.filter((stop) => !stop.removed);
  return shown.map((stop, index): StopCard => {
    const found = stopRecord(map, stop.kind, stop.recordId);
    const base = {
      key: stop.key,
      kind: stop.kind,
      duration: stop.duration || '—',
      distance: '—',
      nodeLabel: t(T.stops.node, { index: index + 1 }),
      talkingPoint: stop.talkingPoint,
      visible: stop.visible,
      local: stop.local,
      position: index + 1,
      first: index === 0,
      last: index === shown.length - 1
    };
    if (!found) {
      return {
        ...base,
        name: `#${stop.recordId}`,
        kindLabel: i18n.t(T.stops.kinds[stop.kind]),
        icon: 'pin',
        image: null,
        plotted: false,
        plotVariant: 'warn',
        plotLabel: i18n.t(T.stops.missing),
        viewLabel: i18n.t(T.stops.viewOnPlan),
        viewParams: { level: null, pin: null, arm: false },
        floorLabel: '—',
        whereLabel: '—',
        sourceLabel: i18n.t(T.stops.sources.missing),
        lockLabel: null
      };
    }
    switch (found.kind) {
      case 'unit': {
        const unit = found.record;
        const plan = unit.floorplanId != null ? map.inventory.floorplans.find((row) => row.id === unit.floorplanId) : null;
        const level = levelForUnit(levels, unit);
        return {
          ...base,
          name: unit.displayName ?? unit.marketingName ?? `#${unit.id}`,
          kindLabel: i18n.t(T.stops.kinds.unit),
          icon: 'bed',
          image: unit.image?.url ?? plan?.image?.url ?? null,
          plotted: unit.plotted,
          plotVariant: unit.plotted ? 'ok' : 'warn',
          plotLabel: i18n.t(unit.plotted ? T.stops.plotted : T.stops.notPlotted),
          viewLabel: i18n.t(unit.plotted ? T.stops.viewOnPlan : T.stops.plotOnPlan),
          viewParams: { level: level?.id ?? null, pin: { kind: 'unit', id: unit.id }, arm: !unit.plotted },
          floorLabel: layoutText(plan),
          whereLabel: `${unit.building ?? level?.sub ?? '—'} · ${floorText(unit.floor)}`,
          sourceLabel: i18n.t(T.stops.sources.unit),
          lockLabel: unit.lockProvider
        };
      }
      case 'amenity': {
        const amenity = found.record;
        const level = levelForAmenity(levels, amenity);
        return {
          ...base,
          name: amenity.name,
          kindLabel: i18n.t(T.stops.kinds.amenity),
          icon: stopIcon(amenity.category),
          image: amenity.image?.url ?? null,
          plotted: amenity.plotted,
          plotVariant: amenity.plotted ? 'ok' : 'warn',
          plotLabel: i18n.t(amenity.plotted ? T.stops.plotted : T.stops.notPlotted),
          viewLabel: i18n.t(amenity.plotted ? T.stops.viewOnPlan : T.stops.plotOnPlan),
          viewParams: { level: level?.id ?? null, pin: { kind: 'amenity', id: amenity.id }, arm: !amenity.plotted },
          floorLabel: amenity.category ?? i18n.t(T.stops.kinds.amenity),
          whereLabel: `${amenity.building ?? amenity.ownerBuilding ?? level?.sub ?? '—'} · ${amenity.floor != null ? floorText(amenity.floor) : (level?.label ?? '—')}`,
          sourceLabel: i18n.t(T.stops.sources.amenity),
          lockLabel: amenity.lockProvider
        };
      }
      case 'elevator': {
        const elevator = found.record;
        const level = elevatorLevel(levels, elevator);
        const plotted = positioned(elevator.xPlot, elevator.yPlot);
        return {
          ...base,
          name: elevator.name ?? i18n.t(T.stops.kinds.elevator),
          kindLabel: i18n.t(T.stops.kinds.elevator),
          icon: 'node',
          image: elevator.image,
          plotted,
          plotVariant: plotted ? 'ok' : 'warn',
          plotLabel: i18n.t(plotted ? T.stops.plotted : T.stops.notPlotted),
          viewLabel: i18n.t(T.stops.viewOnPlan),
          viewParams: { level: level?.id ?? null, pin: null, arm: false },
          floorLabel: floorsText(elevator),
          whereLabel: `${elevator.building ?? level?.sub ?? '—'} · ${level?.label ?? '—'}`,
          sourceLabel: i18n.t(T.stops.sources.elevator),
          lockLabel: elevator.lockProvider
        };
      }
      default: {
        const point = found.record;
        const level = levelForFloor(levels, point.floor, point.building);
        const plotted = positioned(point.xPlot, point.yPlot);
        return {
          ...base,
          name: point.name ?? i18n.t(T.stops.kinds.building_starting_point),
          kindLabel: i18n.t(T.stops.kinds.building_starting_point),
          icon: 'pin',
          image: null,
          plotted,
          plotVariant: plotted ? 'ok' : 'warn',
          plotLabel: i18n.t(plotted ? T.stops.plotted : T.stops.notPlotted),
          viewLabel: i18n.t(T.stops.viewOnPlan),
          viewParams: { level: level?.id ?? null, pin: null, arm: false },
          floorLabel: floorText(point.floor),
          whereLabel: `${point.building ?? '—'} · ${floorText(point.floor)}`,
          sourceLabel: i18n.t(T.stops.sources.building_starting_point),
          lockLabel: point.lockProvider
        };
      }
    }
  });
};

/** The design picks an icon from the amenity's category. */
const stopIcon = (category: string | null): string => {
  if (/pool/i.test(category ?? '')) return 'wave';
  if (/fitness|yoga|gym/i.test(category ?? '')) return 'dumbbell';
  return 'star';
};

const floorsText = (elevator: MapElevator): string => {
  if (elevator.floors.length > 1) return t(T.stops.floorsRange, { from: Math.min(...elevator.floors), to: Math.max(...elevator.floors) });
  if (elevator.floors.length === 1) return floorText(elevator.floors[0]);
  return elevator.coveringRange ?? '—';
};

/** The level an elevator is drawn on first: its floorplate, else the lowest floor it serves. */
export const elevatorLevel = (levels: MapLevel[], elevator: MapElevator): MapLevel | null => {
  if (elevator.floorplateId != null) {
    const own = levels.find((level) => level.kind === 'floorplate' && level.recordId === elevator.floorplateId);
    if (own) return own;
  }
  if (elevator.sitemapId != null) return levels.find((level) => level.kind === 'sitemap') ?? null;
  const lowest = elevator.floors.length ? Math.min(...elevator.floors) : null;
  return levelForFloor(levels, lowest, elevator.building);
};

/** Units and amenities that are not a stop yet (the design: "still available to promote"). */
export interface StopSourceOption {
  id: string;
  label: string;
}

export const stopSourceOptions = (map: PropertyMap, state: TourLocalState): StopSourceOption[] => {
  const taken = new Set(state.stops.filter((stop) => !stop.removed).map((stop) => `${stop.kind}:${stop.recordId}`));
  const units = map.inventory.units
    .filter((unit) => !taken.has(`unit:${unit.id}`))
    .map((unit) => ({ id: pinKey({ kind: 'unit', id: unit.id }), label: `${i18n.t(T.stops.kinds.unit)} · ${unit.displayName ?? unit.marketingName ?? unit.id}` }));
  const amenities = map.inventory.amenities
    .filter((amenity) => (amenity.ownerType == null || amenity.ownerType === 'Floorplate' || amenity.ownerType === 'Sitemap') && !taken.has(`amenity:${amenity.id}`))
    .map((amenity) => ({ id: pinKey({ kind: 'amenity', id: amenity.id }), label: `${i18n.t(T.stops.kinds.amenity)} · ${amenity.name}` }));
  return [...amenities, ...units];
};

export interface ElevatorCard {
  key: string;
  name: string;
  building: string;
  rangeLabel: string;
  gated: boolean;
  lockLabel: string;
  lockVariant: PillVariant;
  photos: { key: string; src: string | null; name: string; local: boolean; position: string }[];
  photoCount: string;
  banks: { key: string; label: string }[];
  directionalText: string | null;
  description: string | null;
  stopLabel: string | null;
  local: boolean;
}

export const generateElevatorCards = (map: PropertyMap, levels: MapLevel[], state: TourLocalState): ElevatorCard[] => {
  const stored = map.graph.elevators
    .filter((elevator) => !state.removedElevators.includes(elevator.id))
    .map((elevator): ElevatorCard => {
      const level = elevatorLevel(levels, elevator);
      const gated = state.gated[elevator.id] ?? !!elevator.lockProvider;
      const storedPhotos = [
        ...(elevator.image ? [{ key: `image:${elevator.id}`, src: elevator.image, name: i18n.t(T.elevators.mainImage), local: false }] : []),
        ...elevator.gallery.map((photo) => ({ key: `gallery:${photo.id}`, src: photo.url, name: photo.name ?? i18n.t(T.elevators.photo), local: false }))
      ];
      const order = state.photoOrder[String(elevator.id)];
      const ordered = order ? [...storedPhotos].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)) : storedPhotos;
      const photos = [...ordered, ...(state.photos[String(elevator.id)] ?? []).map((photo) => ({ key: `local:${photo.url}`, src: photo.url, name: photo.name, local: true }))].map(
        (photo, index) => ({ ...photo, position: `#${index + 1}` })
      );
      return {
        key: String(elevator.id),
        name: elevator.name ?? i18n.t(T.stops.kinds.elevator),
        building: elevator.building ?? level?.sub ?? i18n.t(T.elevators.noBuilding),
        rangeLabel: floorsText(elevator),
        gated,
        lockLabel: gated ? t(T.elevators.gated, { vendor: elevator.lockProvider ?? i18n.t(T.elevators.smartLock) }) : i18n.t(T.elevators.openAccess),
        lockVariant: gated ? 'ok' : 'neutral',
        photos,
        photoCount: t(photos.length === 1 ? T.elevators.photoOne : T.elevators.photoMany, { count: photos.length }),
        banks: elevator.banks.map((bank) => ({
          key: String(bank.id),
          label: [bank.name, bank.position, bank.lockName ? `${bank.lockType ?? ''} ${bank.lockName}`.trim() : null].filter(Boolean).join(' · ')
        })),
        directionalText: elevator.directionalText ? plainText(elevator.directionalText) : null,
        description: elevator.description ? plainText(elevator.description) : null,
        stopLabel: elevator.tourStop ? i18n.t(elevator.tourStop.visible ? T.elevators.onTour : T.elevators.hiddenStop) : null,
        local: false
      };
    });
  const local = state.localElevators.map(
    (elevator): ElevatorCard => ({
      key: elevator.key,
      name: elevator.name,
      building: elevator.building || i18n.t(T.elevators.noBuilding),
      rangeLabel: `${elevator.from || '—'} → ${elevator.to || '—'}`,
      gated: elevator.gated,
      lockLabel: elevator.gated ? t(T.elevators.gated, { vendor: i18n.t(T.elevators.smartLock) }) : i18n.t(T.elevators.openAccess),
      lockVariant: elevator.gated ? 'ok' : 'neutral',
      photos: (state.photos[elevator.key] ?? []).map((photo, index) => ({ key: `local:${photo.url}`, src: photo.url, name: photo.name, local: true, position: `#${index + 1}` })),
      photoCount: t((state.photos[elevator.key] ?? []).length === 1 ? T.elevators.photoOne : T.elevators.photoMany, { count: (state.photos[elevator.key] ?? []).length }),
      banks: [],
      directionalText: null,
      description: null,
      stopLabel: i18n.t(T.elevators.localOnly),
      local: true
    })
  );
  return [...stored, ...local];
};

/** Where a stop stands for routing: its door when it has one on its level, else its pin, in raster pixels. */
export const stopEndpoints = (map: PropertyMap, levels: MapLevel[], graphs: Record<string, LevelGraph>, state: TourLocalState): StopEndpoint[] => {
  const cards = generateStopCards(map, levels, state);
  const endpoints: StopEndpoint[] = [];
  state.stops
    .filter((stop) => !stop.removed && stop.visible)
    .forEach((stop) => {
      const card = cards.find((row) => row.key === stop.key);
      const found = stopRecord(map, stop.kind, stop.recordId);
      if (!card || !found) return;
      const levelId = card.viewParams.level;
      if (!levelId) return;
      const graph = graphs[levelId];
      if (!graph) return;
      const label = `${card.name} (${levels.find((row) => row.id === levelId)?.label ?? ''})`;
      if (found.kind === 'unit' || found.kind === 'amenity') {
        const door = graph.nodes.find((node) => node.kind === 'door' && map.graph.doors.some((row) => row.id === Number(node.key.slice(2)) && row.attachedWithType === (found.kind === 'unit' ? 'Unit' : 'Amenity') && row.attachedWithId === found.record.id));
        const pin = graph.pins.find((row) => row.kind === found.kind && row.ref.id === found.record.id);
        const at = door ?? pin;
        if (!at) return;
        endpoints.push({ key: stop.key, label, levelId, x: at.x, y: at.y });
      } else if (found.kind === 'elevator') {
        const node = graph.nodes.find((row) => row.key === `e:${found.record.id}`);
        if (node) endpoints.push({ key: stop.key, label, levelId, x: node.x, y: node.y });
      } else {
        const node = graph.nodes.find((row) => row.key === `b:${found.record.id}`);
        if (node) endpoints.push({ key: stop.key, label, levelId, x: node.x, y: node.y });
      }
    });
  return endpoints;
};

export interface TourSummary {
  stops: number;
  visible: number;
  elevators: number;
  connections: number;
  subtitle: string;
  poolLabel: string;
}

export const generateTourSummary = (map: PropertyMap, state: TourLocalState): TourSummary => {
  const stops = state.stops.filter((stop) => !stop.removed);
  const visible = stops.filter((stop) => stop.visible).length;
  const connections = map.graph.hallways.reduce((sum, hallway) => sum + hallway.nextPoints.length, 0);
  const elevators = map.graph.elevators.filter((elevator) => !state.removedElevators.includes(elevator.id)).length + state.localElevators.length;
  const pool = stopSourceOptions(map, state).length;
  return {
    stops: stops.length,
    visible,
    elevators,
    connections,
    subtitle: stops.length
      ? t(T.header.subtitle, { count: t(stops.length === 1 ? T.header.stopOne : T.header.stopMany, { count: stops.length }), hidden: stops.length - visible ? t(T.header.hidden, { count: stops.length - visible }) : i18n.t(T.header.allVisible) })
      : i18n.t(T.header.noStops),
    poolLabel: t(pool === 1 ? T.stops.poolOne : T.stops.poolMany, { count: pool })
  };
};

/** The graphs the routing tab works from: the stored pathway graph, without any map-screen edits. */
export const tourGraphs = (map: PropertyMap, levels: MapLevel[]): Record<string, LevelGraph> =>
  generateRasterGraphs(map, levels, initialLocalMapState(levels[0]?.id ?? '', null, 'raster'));

export const tourStartPointRows = (map: PropertyMap, levels: MapLevel[], graphs: Record<string, LevelGraph>): { rows: StartPointRow[]; missing: boolean } =>
  generateStartPointRows(map, levels, graphs, initialLocalMapState(levels[0]?.id ?? '', null, 'raster'));

export { generateMapLevels };
