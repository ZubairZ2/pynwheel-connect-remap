import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { PillVariant } from '../listing.types';
import { activeSpace, levelById, levelSpaceDims, levelsOfBuilding, mapBuildings, planAssets, type MapLevel } from './mapLevels.generator';
import { bedColorsOf, generatePinItems, itemsByPolygon, pinPlacement, type LevelGraph, type LevelNode, type PinItem } from './mapNodes.generator';
import { toViewBoxPercent, type FloorSvgDoc } from '~/core/utils/map/floorSvg';
import {
  AMENITY_COLOR,
  BED_SWATCHES,
  BED_TIERS,
  NODE_ANCHOR_OFFSET,
  edgeEnds,
  nodeKindOf,
  pinKey,
  toPercent,
  type BedTier,
  type LocalMapState,
  type MapTool,
  type PlotKind
} from './mapState';
import { M, bedsLabel, coordText, plural, t } from './mapText';
import { stopTypeOf } from '~/core/utils/wayfinding/stopTypes';
import type { WfPlate, WfStop } from '~/core/utils/wayfinding/wayfindingGraph';
import { wayfindingTab } from './wayfinding.generator';

/** Descriptors for the toolbar, tabs and panels beside the canvas. Pure: props in, view data out. */

export interface ToolDescriptor {
  id: MapTool;
  label: string;
  icon: string;
  active: boolean;
}

export const generateTools = (state: LocalMapState): ToolDescriptor[] =>
  (
    [
      ['select', M.tools.select, 'cursor'],
      ['plot', M.tools.plot, 'pin'],
      ['junction', M.tools.junction, 'node'],
      ['edge', M.tools.edge, 'edge'],
      ['move', M.tools.move, 'move']
    ] as const
  ).map(([id, label, icon]) => ({ id, label: i18n.t(label), icon, active: state.tool === id }));

export const generateMapHint = (state: LocalMapState, plotTargetName: string | null, onSvg: boolean): string => {
  switch (state.tool) {
    case 'plot':
      if (onSvg) return state.plotSel.length ? t(M.hints.plotPolygon, { count: state.plotSel.length }) : i18n.t(M.hints.plotPickPolygon);
      return plotTargetName ? t(M.hints.plotArmed, { name: plotTargetName }) : i18n.t(M.hints.plotPick);
    case 'junction':
      return i18n.t(M.hints.junction);
    case 'edge':
      return i18n.t(state.edgeFrom ? M.hints.edgeSecond : M.hints.edgeFirst);
    case 'move':
      return i18n.t(M.hints.move);
    case 'hallway':
      return i18n.t(M.hints.hallway);
    default:
      return i18n.t(onSvg ? M.hints.selectSvg : M.hints.select);
  }
};

/** Where an item belongs for the tabs' counts: the level it is plotted on, else its floor's. */
export const itemsOfLevel = (items: PinItem[], level: MapLevel): PinItem[] => items.filter((item) => item.level?.id === level.id);

export interface BuildingPill {
  name: string;
  count: string;
  active: boolean;
}

export const generateBuildingPills = (map: PropertyMap, levels: MapLevel[], state: LocalMapState): BuildingPill[] => {
  const names = mapBuildings(map, levels);
  if (names.length === 0) return [];
  // The count is what the pill shows: the building's floorplates, plus the ones no building claims.
  // A one-building property still shows its pill (as the design's Building row
  // does), selected: every floorplate is that building's.
  return names.map((name) => ({
    name,
    count: String(levelsOfBuilding(levels, name).length),
    active: names.length === 1 || state.building === name
  }));
};

export type LevelProgressState = 'done' | 'partial' | 'none' | 'empty' | 'nosvg';

export interface LevelTabDescriptor {
  id: string;
  label: string;
  sub: string;
  active: boolean;
  /** 0–100, the share of the level's items that are plotted. */
  pct: number;
  progress: string;
  state: LevelProgressState;
}

/**
 * The floorplate tabs of the building in view, each with its plotting
 * progress: "Done", "3/4", "0/4", "No units", or "No SVG" when the
 * floorplate has no floor SVG to plot onto (as the design flags it).
 */
export const generateLevelTabs = (
  map: PropertyMap,
  levels: MapLevel[],
  items: PinItem[],
  state: LocalMapState,
  plates: Record<string, WfPlate> | null = null
): LevelTabDescriptor[] =>
  levelsOfBuilding(levels, state.building).map((level) => {
    // Wayfinding: the card shows the floorplate's path progress instead (Complete / Incomplete / Not started).
    const plate = state.mode === 'wayfind' ? plates?.[level.id] : null;
    if (plate) {
      const wf = wayfindingTab(plate);
      return { id: level.id, label: level.label, sub: level.stackLabel, active: level.id === state.levelId, pct: wf.pct, progress: wf.progress, state: wf.state };
    }
    const scope = itemsOfLevel(items, level);
    const done = scope.filter((item) => item.placed).length;
    const total = scope.length;
    const assets = planAssets(level, state.planOverrides[level.id]);
    // The card's SVG state comes first, as in the plotting design: a floorplate
    // without a floor SVG reads "No SVG" (with its plotted count when it has a
    // background image to plot on), "No plan" when it has no file at all.
    const progressState: LevelProgressState = !assets.svg ? 'nosvg' : !total ? 'empty' : done === total ? 'done' : done ? 'partial' : 'none';
    const progress = {
      done: i18n.t(M.level.done),
      partial: `${done}/${total}`,
      none: `0/${total}`,
      empty: i18n.t(M.level.noUnits),
      nosvg: i18n.t(assets.image ? M.level.noSvg : M.level.noPlan)
    }[progressState];
    return {
      id: level.id,
      label: level.label,
      sub: level.stackLabel,
      active: level.id === state.levelId,
      pct: total ? Math.round((done / total) * 100) : 0,
      progress: progressState === 'nosvg' && assets.image ? `${progress} · ${done}/${total}` : progress,
      state: progressState
    };
  });

export interface PlanInfo {
  levelLabel: string;
  kindLabel: string;
  fileLabel: string;
  countLabel: string;
  has: boolean;
  hasBoth: boolean;
  local: boolean;
  /** Whether the shown layer is the floor SVG. */
  onSvg: boolean;
}

export const generatePlanInfo = (level: MapLevel, graph: LevelGraph, state: LocalMapState): PlanInfo => {
  const assets = planAssets(level, state.planOverrides[level.id]);
  const kindLabel = assets.svg
    ? i18n.t(assets.image ? M.plan.svgAndBackground : M.plan.svgOnly)
    : i18n.t(assets.image ? M.plan.backgroundOnly : M.plan.none);
  const files = [assets.svg?.name, assets.image?.name].filter((name): name is string => !!name);
  const counts = `${plural(graph.pins.length, M.plan.pinOne, M.plan.pinMany)} · ${plural(graph.nodes.filter((node) => node.kind === 'hallway' || node.kind === 'junction').length, M.publish.nodeOne, M.publish.nodeMany)}`;

  return {
    levelLabel: `${level.sub} · ${level.label}`,
    kindLabel,
    fileLabel: files.length ? files.join(' + ') : i18n.t(M.plan.noPlan),
    countLabel: t(M.plan.onThisFloor, { count: counts }),
    has: assets.has,
    hasBoth: !!(assets.svg && assets.image),
    local: !!(assets.svg?.local || assets.image?.local),
    onSvg: activeSpace(level, state) === 'svg'
  };
};

/** One row of the Plot on Map lists: a unit, an amenity or an Additional Stop. */
export interface PlotListItem {
  key: string;
  kind: PlotKind;
  label: string;
  meta: string;
  ticked: boolean;
  placed: boolean;
  temporary: boolean;
}

export interface PlotShowOption {
  kind: PlotKind;
  label: string;
  desc: string;
  on: boolean;
  badge: string;
  badgeTone: 'none' | 'pending' | 'done';
}

export interface PlotPanel {
  scopeLabel: string;
  doneLabel: string;
  placed: number;
  total: number;
  todo: PlotListItem[];
  done: PlotListItem[];
  todoTotal: number;
  doneTotal: number;
  todoEmptyLabel: string;
  doneEmptyLabel: string;
  allTodoTicked: boolean;
  allDoneTicked: boolean;
  selCountLabel: string;
  unSelLabel: string;
  unplotManyLabel: string;
  hint: string;
  show: PlotShowOption[];
  showSummary: string;
  /** "3 to plot", or "5 hidden to plot" when only hidden types have something left. */
  showPending: string | null;
  /** A stacked floorplate's floor filter: "All 10 floors · shared stops only", then each floor. */
  floorOptions: { id: string; label: string }[] | null;
  floorValue: string;
  /** Additional Stops are listed (self-tour wayfinding), so Add Stop is offered. */
  showAddStop: boolean;
  emptyAddStop: boolean;
}

const kindLabelOf = (item: PinItem): string => i18n.t(item.kind === 'unit' ? M.place.unit : M.place.amenity);

const floorOf = (item: PinItem): string => (item.floor != null ? t(M.level.floor, { floor: item.floor }) : '—');

/** The Plot on Map lists shown on a stacked floorplate: one floor, or every floor (then only stops shared by the stack). */
export const plotFloorOf = (level: MapLevel | null, state: LocalMapState): number | null =>
  level && level.floors.length > 1 && state.plotFloor != null && level.floors.includes(state.plotFloor) ? state.plotFloor : null;

interface PlotRow {
  key: string;
  kind: PlotKind;
  label: string;
  placed: boolean;
  temporary: boolean;
  todoMeta: string;
  doneMeta: string;
  /** What "Search name or floor" matches on. */
  search: string;
}

/**
 * The design's "Plot on Map" panel for the level in view: the units and
 * amenities whose floor (or plotted position) is this floorplate and — when
 * the property routes self-tour visitors — its Additional Stops, filtered by
 * "Show", by the floor of a stacked floorplate and by "Search name or
 * floor", split into To Plot and Plotted.
 */
export const generatePlotPanel = (
  map: PropertyMap,
  levels: MapLevel[],
  level: MapLevel | null,
  items: PinItem[],
  graphs: Record<string, LevelGraph>,
  state: LocalMapState,
  stops: WfStop[] | null
): PlotPanel => {
  const floor = plotFloorOf(level, state);
  const scope = level ? itemsOfLevel(items, level).filter((item) => floor == null || item.floor === floor) : [];
  const stopScope = level && stops ? stops.filter((stop) => (floor == null ? stop.floors == null : stop.floors == null || stop.floors.includes(floor))) : [];
  const graph = level ? graphs[level.id] : null;

  const rows: PlotRow[] = [
    ...scope.map((item): PlotRow => {
      const here = item.level?.id === level?.id;
      const pin = graph?.pins.find((row) => row.key === item.key) ?? null;
      const where = here
        ? pin?.polygon
          ? t(M.place.polygon, { code: pin.polygon })
          : i18n.t(item.space === 'svg' ? M.place.onSvg : M.place.onImage)
        : item.level
          ? `${item.level.sub} · ${item.level.label}`
          : '—';
      return {
        key: item.key,
        kind: item.kind,
        label: item.label,
        placed: item.placed,
        temporary: item.temporary,
        todoMeta: `${kindLabelOf(item)} · ${floorOf(item)}`,
        doneMeta: `${where} · ${floorOf(item)}`,
        search: `${item.label} ${item.floor ?? ''} ${floorOf(item)} ${item.building ?? ''}`.toLowerCase()
      };
    }),
    ...stopScope.map((stop): PlotRow => {
      const type = i18n.t(stopTypeOf(stop.type).label);
      const where = stop.floors?.length === 1 ? t(M.level.floor, { floor: stop.floors[0] }) : (level?.rangeLabel ?? '');
      return {
        key: `stop:${stop.key}`,
        kind: 'stop',
        label: stop.label,
        placed: stop.placed,
        temporary: stop.temporary,
        todoMeta: `${type}${stop.temporary ? ` · ${i18n.t(M.selection.temporary)}` : ''} · ${where}`,
        doneMeta: `${type} · ${i18n.t(M.place.onPlan)}`,
        search: `${stop.label} ${type} ${where}`.toLowerCase()
      };
    })
  ];

  const kinds: PlotKind[] = stops ? ['unit', 'amenity', 'stop'] : ['unit', 'amenity'];
  const shown = (kind: PlotKind) => state.plotShow[kind] && kinds.includes(kind);
  const visible = rows.filter((row) => shown(row.kind));
  const query = state.plotQuery.trim().toLowerCase();
  const matches = (row: PlotRow) => !query || row.search.includes(query);
  const todo = visible.filter((row) => !row.placed);
  const done = visible.filter((row) => row.placed);
  const toItem = (row: PlotRow, meta: string, ticked: boolean): PlotListItem => ({ key: row.key, kind: row.kind, label: row.label, meta, ticked, placed: row.placed, temporary: row.temporary });
  const todoItems = todo.filter(matches).map((row) => toItem(row, row.todoMeta, state.plotSel.includes(row.key)));
  const doneItems = done.filter(matches).map((row) => toItem(row, row.doneMeta, state.plotUnSel.includes(row.key)));

  const SHOW: Record<PlotKind, { label: string; desc: string }> = {
    unit: { label: M.show.units, desc: M.show.unitsDesc },
    amenity: { label: M.show.amenities, desc: M.show.amenitiesDesc },
    stop: { label: M.show.stops, desc: M.show.stopsDesc }
  };
  const show = kinds.map((kind): PlotShowOption => {
    const all = rows.filter((row) => row.kind === kind);
    const pending = all.filter((row) => !row.placed).length;
    return {
      kind,
      label: i18n.t(SHOW[kind].label),
      desc: i18n.t(SHOW[kind].desc),
      on: shown(kind),
      badge: !all.length ? i18n.t(M.show.noneHere) : pending ? t(M.show.toPlot, { count: pending }) : i18n.t(M.show.allPlotted),
      badgeTone: !all.length ? 'none' : pending ? 'pending' : 'done'
    };
  });
  const pendingOn = show.filter((row) => row.on).reduce((sum, row) => sum + rows.filter((item) => item.kind === row.kind && !item.placed).length, 0);
  const pendingOff = show.filter((row) => !row.on).reduce((sum, row) => sum + rows.filter((item) => item.kind === row.kind && !item.placed).length, 0);
  const onRows = show.filter((row) => row.on);

  const selCount = state.plotSel.length;
  const unCount = state.plotUnSel.length;
  const allTodoKeys = todoItems.map((item) => item.key);
  const allDoneKeys = doneItems.map((item) => item.key);
  const onSvg = level ? activeSpace(level, state) === 'svg' : false;
  const unitsDone = scope.filter((item) => item.placed).length;

  return {
    scopeLabel: level ? `${level.sub} · ${level.rangeLabel}` : (state.building ?? i18n.t(M.level.allBuildings)),
    doneLabel: t(M.place.done, { placed: unitsDone, total: scope.length }),
    placed: unitsDone,
    total: scope.length,
    todo: todoItems,
    done: doneItems,
    todoTotal: todo.length,
    doneTotal: done.length,
    todoEmptyLabel: query
      ? t(M.place.noMatch, { query: state.plotQuery.trim() })
      : visible.length
        ? i18n.t(M.place.allPlotted)
        : rows.length
          ? i18n.t(M.place.nothingForTypes)
          : i18n.t(M.place.noneInRange),
    doneEmptyLabel: query ? t(M.place.noMatch, { query: state.plotQuery.trim() }) : i18n.t(M.place.nothingPlotted),
    allTodoTicked: allTodoKeys.length > 0 && allTodoKeys.every((key) => state.plotSel.includes(key)),
    allDoneTicked: allDoneKeys.length > 0 && allDoneKeys.every((key) => state.plotUnSel.includes(key)),
    selCountLabel: selCount ? t(M.place.selected, { count: selCount }) : t(M.place.selectAll, { count: todoItems.length }),
    unSelLabel: unCount ? t(M.place.selected, { count: unCount }) : t(M.place.selectAll, { count: doneItems.length }),
    unplotManyLabel: t(M.place.unplotMany, { items: plural(unCount, M.place.itemOne, M.place.itemMany) }),
    hint: !selCount ? '' : state.tool === 'plot' ? i18n.t(onSvg ? M.place.hintDrop : M.place.hintDropImage) : i18n.t(M.place.hintTurnOn),
    show,
    showSummary: onRows.length === show.length && show.length > 1 ? t(M.show.allTypes, { count: show.length }) : onRows.map((row) => row.label).join(', '),
    showPending: pendingOn + pendingOff > 0 ? (pendingOff && !pendingOn ? t(M.show.hiddenToPlot, { count: pendingOff }) : t(M.show.toPlot, { count: pendingOn })) : null,
    floorOptions:
      level && level.floors.length > 1
        ? [{ id: 'all', label: t(M.show.allFloors, { count: level.floors.length }) }, ...level.floors.map((value) => ({ id: String(value), label: t(M.level.floor, { floor: value }) }))]
        : null,
    floorValue: floor == null ? 'all' : String(floor),
    showAddStop: !!stops && shown('stop'),
    emptyAddStop: !!stops && shown('stop') && !query
  };
};

export interface PolygonDescriptor {
  key: string;
  /** The polygon's name on the map: the SVG's own printed text, else its group's name (`PlotTarget.code`). */
  code: string;
  /** The SVG prints no text for this polygon, so the canvas prints its code when it is active (the design's label). */
  showCode: boolean;
  /** Centre, as a percentage of the SVG's viewBox. */
  left: number;
  top: number;
  bbox: { x: number; y: number; w: number; h: number };
  filled: boolean;
  hover: boolean;
  selected: boolean;
  /** What is plotted here ("B-B101 +1"), empty when it only repeats the polygon's own text. */
  assigned: string;
  items: { key: string; name: string; meta: string }[];
}

/** "652" and "652", "A-107" and "a 107": the same name, for deciding whether an assigned label repeats the polygon's text. */
const sameName = (a: string, b: string): boolean => a.replace(/[^a-z0-9]/gi, '').toLowerCase() === b.replace(/[^a-z0-9]/gi, '').toLowerCase();

/**
 * The level's polygons as the canvas draws them: filled when something sits
 * on them, highlighted under the pointer while Manual Plot is on, outlined
 * when their popover is open.
 */
export const generatePolygons = (doc: FloorSvgDoc | null, graph: LevelGraph | null, state: LocalMapState): PolygonDescriptor[] => {
  if (!doc || !graph) return [];
  const byPolygon = itemsByPolygon(graph.pins);
  const plotOn = state.tool === 'plot';
  return doc.targets.map((target) => {
    const pins = byPolygon[target.key] ?? [];
    const { xPct, yPct } = toViewBoxPercent(doc.viewBox, target.cx, target.cy);
    const assigned = pins.length ? `${pins[0].label}${pins.length > 1 ? ` +${pins.length - 1}` : ''}` : '';
    return {
      key: target.key,
      code: target.code,
      showCode: target.label == null,
      left: xPct,
      top: yPct,
      bbox: target.bbox,
      filled: pins.length > 0,
      hover: plotOn && state.polyHover === target.key,
      selected: state.selPoly === target.key,
      // The legacy map prints nothing for a plotted room beyond the SVG's own
      // number; the assigned name is shown only when it says something else.
      assigned: pins.length === 1 && target.label != null && sameName(pins[0].label, target.label) ? '' : assigned,
      items: pins.map((pin) => ({ key: pin.key, name: pin.label, meta: `${i18n.t(pin.kind === 'unit' ? M.place.unit : M.place.amenity)}${pin.temporary ? ` · ${i18n.t(M.selection.temporary)}` : ''}` }))
    };
  });
};

export interface SelectedPolygon {
  code: string;
  title: string;
  sub: string;
  items: { key: string; name: string; meta: string }[];
  left: number;
  top: number;
  /** Whether the popover opens below (upper half) or above the polygon. */
  below: boolean;
}

export const generateSelectedPolygon = (level: MapLevel, polygons: PolygonDescriptor[], state: LocalMapState): SelectedPolygon | null => {
  const polygon = polygons.find((row) => row.key === state.selPoly);
  if (!polygon) return null;
  return {
    code: polygon.code,
    title: t(M.place.polygon, { code: polygon.code }),
    sub: `${level.sub} · ${level.scopeLabel}`,
    items: polygon.items,
    left: Math.max(20, Math.min(80, polygon.left)),
    top: polygon.top,
    below: polygon.top < 50
  };
};

export interface AutoPlotMenuItem {
  scope: 'one' | 'building' | 'all';
  label: string;
  sub: string;
}

export const generateAutoPlotMenu = (map: PropertyMap, levels: MapLevel[], level: MapLevel | null, items: PinItem[]): AutoPlotMenuItem[] => {
  if (!level) return [];
  const count = (scope: MapLevel[]) => scope.reduce((sum, row) => sum + itemsOfLevel(items, row).filter((item) => item.kind === 'unit' && !item.placed).length, 0);
  const building = level.building ?? level.sub;
  const inBuilding = levelsOfBuilding(levels, level.building).filter((row) => row.building === level.building);
  const buildings = mapBuildings(map, levels);
  const menu: AutoPlotMenuItem[] = [
    {
      scope: 'one',
      label: i18n.t(M.autoPlot.scopeOne),
      sub: `${building} · ${level.label} · ${plural(count([level]), M.autoPlot.unitOne, M.autoPlot.unitMany)} ${i18n.t(M.autoPlot.toPlot)}`
    },
    {
      scope: 'building',
      label: t(M.autoPlot.scopeBuilding, { building }),
      sub: `${plural(inBuilding.length, M.autoPlot.plateOne, M.autoPlot.plateMany)} · ${plural(count(inBuilding), M.autoPlot.unitOne, M.autoPlot.unitMany)} ${i18n.t(M.autoPlot.toPlot)}`
    }
  ];
  if (buildings.length > 1) {
    menu.push({
      scope: 'all',
      label: i18n.t(M.autoPlot.scopeAll),
      sub: `${plural(levels.length, M.autoPlot.plateOne, M.autoPlot.plateMany)} · ${plural(count(levels), M.autoPlot.unitOne, M.autoPlot.unitMany)} ${i18n.t(M.autoPlot.toPlot)}`
    });
  }
  return menu;
};

export interface SelectedPinDescriptor {
  name: string;
  meta: string;
  coordLabel: string;
  color: string;
  onThisLevel: boolean;
  temporary: boolean;
  moved: boolean;
  tourStop: boolean;
}

export const generateSelectedPin = (map: PropertyMap, levels: MapLevel[], state: LocalMapState): SelectedPinDescriptor | null => {
  if (!state.selectedPin) return null;
  const item = generatePinItems(map, levels, state).find((row) => row.key === pinKey(state.selectedPin!));
  if (!item) return null;
  const placement = pinPlacement(map, levels, state, item.ref);
  const level = placement?.level ?? item.level;
  const dims = level && placement ? levelSpaceDims(level, state, placement.space) : null;
  const coord = placement && dims ? coordText(toPercent(placement.x, dims.w), toPercent(placement.y, dims.h)) : '—';
  const unit = item.kind === 'unit' ? map.inventory.units.find((row) => row.id === item.ref.id) : null;

  const metaParts = [
    item.kind === 'unit'
      ? t(M.pin.unitMeta, { layout: bedsLabel(item.beds), floor: item.floor ?? '—' })
      : t(M.pin.amenityMeta, { category: item.category ?? '—' }),
    level ? `${level.sub} · ${level.label}` : i18n.t(M.place.noLevel)
  ];
  if (item.tourStop) metaParts.push(i18n.t(M.pin.tourStop));

  return {
    name: item.label,
    meta: metaParts.join(' · '),
    coordLabel: placement
      ? placement.polygon
        ? t(M.pin.onPolygon, { code: placement.polygon })
        : placement.space === 'svg' && unit?.svgPointer
          ? t(M.pin.svgPointer, { element: unit.svgPointer.elementId ?? unit.svgPointer.tag ?? 'SVG' })
          : t(M.pin.at, { coord })
      : '',
    color: item.kind === 'unit' ? item.color : AMENITY_COLOR,
    onThisLevel: level?.id === state.levelId,
    temporary: !!placement?.temporary,
    moved: !!placement?.moved,
    tourStop: item.tourStop
  };
};

export interface SelectionDescriptor {
  kind: 'node' | 'edge';
  key: string;
  label: string;
  /** The node's kind or the edge's ends, and where it is. */
  meta: string;
  /** Stored / temporary / moved. */
  state: string;
  editable: boolean;
  temporary: boolean;
  canSetStart: boolean;
  deleteLabel: string;
  chainFrom: boolean;
}

const kindLabel = (node: LevelNode): string => {
  switch (node.kind) {
    case 'hallway':
      return i18n.t(M.selection.hallway);
    case 'junction':
      return i18n.t(M.selection.junction);
    case 'elevator':
      return i18n.t(M.selection.elevator);
    case 'startingPoint':
      return i18n.t(M.selection.startingPoint);
    case 'tourStart':
      return i18n.t(M.selection.tourStart);
    default:
      return i18n.t(M.selection.door);
  }
};

export const generateSelection = (graph: LevelGraph, state: LocalMapState): SelectionDescriptor | null => {
  const level = graph.level;
  if (state.selectedNode) {
    const node = graph.nodes.find((row) => row.key === state.selectedNode);
    if (!node) return null;
    const links = graph.edges.filter((edge) => edge.a === node.key || edge.b === node.key).length;
    const where = `${level.sub} · ${level.label} · ${coordText(node.xPct, node.yPct)}`;
    const stateLabel = node.temporary
      ? i18n.t(M.selection.temporary)
      : node.moved && node.stored && graph.dims
        ? t(M.selection.moved, { coord: coordText(toPercent(node.stored.x, graph.dims.w), toPercent(node.stored.y, graph.dims.h)) })
        : i18n.t(M.selection.stored);
    return {
      kind: 'node',
      key: node.key,
      label: node.label,
      meta: `${kindLabel(node)} · ${where} · ${t(M.selection.links, { count: links })}`,
      state: stateLabel,
      editable: node.temporary,
      temporary: node.temporary,
      canSetStart: node.kind !== 'door',
      deleteLabel: i18n.t(M.selection.deleteNode),
      chainFrom: state.chainFrom === node.key
    };
  }
  if (state.selectedEdge) {
    const edge = graph.edges.find((row) => row.key === state.selectedEdge);
    if (!edge) return null;
    const [a, b] = edgeEnds(edge.key);
    const labelOf = (key: string) => graph.nodes.find((node) => node.key === key)?.label ?? key;
    return {
      kind: 'edge',
      key: edge.key,
      label: t(M.selection.edgeMeta, { from: labelOf(a), to: labelOf(b) }),
      meta: `${i18n.t(M.selection.edge)} · ${level.sub} · ${level.label}`,
      state: i18n.t(edge.temporary ? M.selection.temporary : M.selection.stored),
      editable: false,
      temporary: edge.temporary,
      canSetStart: false,
      deleteLabel: i18n.t(M.selection.deleteEdge),
      chainFrom: false
    };
  }
  return null;
};

export interface StartPointRow {
  building: string;
  name: string;
  state: string;
  variant: PillVariant;
}

/**
 * One row per building (the tour's building order), from the stored
 * `building_starting_points`, overridden by a node chosen on this page, and
 * the tour's own starting point.
 */
export const generateStartPointRows = (
  map: PropertyMap,
  levels: MapLevel[],
  graphs: Record<string, LevelGraph>,
  state: LocalMapState
): { rows: StartPointRow[]; missing: boolean } => {
  const { graph } = map;
  const nodeLabel = (key: string): string | null => {
    for (const levelGraph of Object.values(graphs)) {
      const node = levelGraph.nodes.find((row) => row.key === key);
      if (node) return `${node.label} · ${levelGraph.level.label}`;
    }
    return null;
  };
  const buildings = graph.buildings.length ? graph.buildings : [graph.tour?.building ?? map.inventory.property.name];

  const rows = buildings.map((building): StartPointRow => {
    const override = state.startOverrides[building];
    const overrideLabel = override ? nodeLabel(override) : null;
    if (overrideLabel) return { building, name: overrideLabel, state: i18n.t(M.starts.local), variant: 'info' };
    const point = graph.buildingStartingPoints.find((row) => row.building === building);
    if (point) {
      const level = point.floor != null ? levels.find((row) => row.floors.includes(point.floor!)) : null;
      return {
        building,
        name: `${point.name ?? i18n.t(M.selection.startingPoint)}${level ? ` · ${level.label}` : ''}`,
        state: i18n.t(M.starts.set),
        variant: point.tourStop && !point.tourStop.visible ? 'warn' : 'ok'
      };
    }
    return { building, name: i18n.t(M.starts.notSet), state: i18n.t(M.starts.required), variant: 'crit' };
  });

  const tour = graph.tour;
  const hasStart = !!tour && tour.xPlot + tour.yPlot > 0;
  const startLevel = tour?.startingFloor != null ? levels.find((row) => row.floors.includes(tour.startingFloor!)) : null;
  rows.unshift({
    building: i18n.t(M.starts.tourStart),
    name: hasStart
      ? `${tour?.name ?? i18n.t(M.selection.tourStart)}${startLevel ? ` · ${startLevel.label}` : ''}${tour?.building ? ` · ${tour.building}` : ''}`
      : i18n.t(M.starts.tourStartUnset),
    state: i18n.t(hasStart ? M.starts.set : M.starts.required),
    variant: hasStart ? 'ok' : 'crit'
  });

  return { rows, missing: rows.some((row) => row.variant === 'crit') };
};

export interface VerticalLinkRow {
  from: string;
  to: string;
  kind: string;
  temporary: boolean;
}

/**
 * Links that leave the level: each elevator on it that serves other floors,
 * and each temporary connection drawn to a node on another level.
 */
export const generateVerticalLinks = (levels: MapLevel[], level: MapLevel, graphs: Record<string, LevelGraph>, state: LocalMapState): VerticalLinkRow[] => {
  const here = graphs[level.id];
  if (!here) return [];
  const rows: VerticalLinkRow[] = [];

  here.nodes
    .filter((node) => node.kind === 'elevator' && node.floors.length > 1)
    .forEach((node) => {
      const others = node.floors.filter((floor) => !level.floors.includes(floor));
      if (!others.length) return;
      const range = others.length === 1 ? t(M.vertical.floor, { floor: others[0] }) : t(M.vertical.floorsRange, { floors: `${Math.min(...others)}–${Math.max(...others)}` });
      rows.push({
        from: `${node.label} · ${level.label}`,
        to: range,
        kind: node.building && level.building && node.building !== level.building ? i18n.t(M.vertical.buildingTransfer) : i18n.t(M.vertical.elevator),
        temporary: false
      });
    });

  state.tempEdges.forEach((edge) => {
    const find = (key: string) => {
      for (const levelGraph of Object.values(graphs)) {
        const node = levelGraph.nodes.find((row) => row.key === key);
        if (node) return { node, level: levelGraph.level };
      }
      return null;
    };
    const a = find(edge.a);
    const b = find(edge.b);
    if (!a || !b || a.level.id === b.level.id) return;
    if (a.level.id !== level.id && b.level.id !== level.id) return;
    const [near, far] = a.level.id === level.id ? [a, b] : [b, a];
    rows.push({
      from: `${near.node.label} · ${near.level.label}`,
      to: `${far.node.label} · ${far.level.label}`,
      kind: `${i18n.t(M.vertical.temporary)} · ${i18n.t(near.level.building !== far.level.building && near.level.building && far.level.building ? M.vertical.buildingTransfer : M.vertical.elevator)}`,
      temporary: true
    });
  });

  return rows;
};

export interface BedLegendRow {
  id: BedTier;
  label: string;
  color: string;
  swatches: { color: string; active: boolean }[];
}

export const generateBedLegend = (map: PropertyMap, state: LocalMapState): BedLegendRow[] => {
  const colors = bedColorsOf(map, state);
  const labels: Record<BedTier, string> = {
    studio: i18n.t(M.legend.studio),
    b1: i18n.t(M.legend.oneBed),
    b2: i18n.t(M.legend.twoBed),
    b3: i18n.t(M.legend.threeBed)
  };
  return BED_TIERS.map((tier) => ({
    id: tier.id,
    label: labels[tier.id],
    color: colors[tier.id],
    swatches: BED_SWATCHES.map((color) => ({ color, active: colors[tier.id].toLowerCase() === color.toLowerCase() }))
  }));
};

export interface PublishSummary {
  body: string;
  unplotted: string | null;
  /** Temporary placements and edits on this page, which no publish would carry. */
  local: string | null;
}

export const generatePublishSummary = (map: PropertyMap, levels: MapLevel[], graphs: Record<string, LevelGraph>, state: LocalMapState): PublishSummary => {
  const items = generatePinItems(map, levels, state);
  const stops = map.graph.tourStops.filter((stop) => stop.displayStop).length;
  const pins = items.filter((item) => item.placed && !item.temporary).length;
  const nodes = Object.values(graphs).reduce((sum, graph) => sum + graph.nodes.filter((node) => node.kind === 'hallway').length, 0);
  const unplotted = items.filter((item) => !item.placed).length;
  const temporary = items.filter((item) => item.temporary).length + state.tempNodes.length + state.tempEdges.length;
  return {
    body: t(M.publish.body, {
      stops: plural(stops, M.publish.stopOne, M.publish.stopMany),
      pins: plural(pins, M.publish.pinOne, M.publish.pinMany),
      nodes: plural(nodes, M.publish.nodeOne, M.publish.nodeMany),
      property: map.inventory.property.name
    }),
    unplotted: unplotted ? t(M.publish.unplotted, { count: unplotted }) : null,
    local: temporary ? t(M.publish.local, { count: temporary }) : null
  };
};

/** The level a route leg belongs to: its floor's floorplate, or the property map. */
export const levelForLeg = (levels: MapLevel[], leg: { floor: number | null }): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (leg.floor == null) return levelById(levels, levels[0]?.id ?? null);
  return levels.find((level) => level.floors.includes(leg.floor!)) ?? null;
};

export { NODE_ANCHOR_OFFSET, nodeKindOf };
