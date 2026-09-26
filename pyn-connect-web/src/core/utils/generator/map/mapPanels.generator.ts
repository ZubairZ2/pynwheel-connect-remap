import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { PillVariant } from '../listing.types';
import { levelById, levelDims, planAssets, type MapLevel } from './mapLevels.generator';
import { bedColorsOf, generatePinItems, pinPlacement, type LevelGraph, type LevelNode, type PinItem } from './mapNodes.generator';
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
  type MapTool
} from './mapState';
import { M, bedsLabel, coordText, plural, t } from './mapText';

/** Descriptors for the panels beside the canvas. Pure: props in, view data out. */

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

export const generateMapHint = (state: LocalMapState, plotTargetName: string | null): string => {
  switch (state.tool) {
    case 'plot':
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
      return i18n.t(M.hints.select);
  }
};

export interface LevelTabDescriptor {
  id: string;
  label: string;
  sub: string;
  active: boolean;
}

export const generateLevelTabs = (levels: MapLevel[], state: LocalMapState): LevelTabDescriptor[] =>
  levels.map((level) => ({ id: level.id, label: level.label, sub: level.sub, active: level.id === state.levelId }));

export interface PlanInfo {
  levelLabel: string;
  kindLabel: string;
  fileLabel: string;
  countLabel: string;
  has: boolean;
  hasBoth: boolean;
  local: boolean;
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
    local: !!(assets.svg?.local || assets.image?.local)
  };
};

export interface QueueItem extends PinItem {
  where: string;
  kindLabel: string;
  armed: boolean;
}

export interface PlotSummary {
  placed: number;
  total: number;
  doneLabel: string;
  queueLabel: string;
  queue: QueueItem[];
}

export const generatePlotSummary = (map: PropertyMap, levels: MapLevel[], state: LocalMapState): PlotSummary => {
  const items = generatePinItems(map, levels, state);
  const placed = items.filter((item) => item.placed).length;
  const queue = items
    .filter((item) => !item.placed)
    .map(
      (item): QueueItem => ({
        ...item,
        where: item.level ? `${item.level.sub} · ${item.level.label}` : i18n.t(M.place.noLevel),
        kindLabel: i18n.t(item.kind === 'unit' ? M.place.unit : M.place.amenity),
        armed: !!state.plotTarget && pinKey(state.plotTarget) === item.key
      })
    );

  return {
    placed,
    total: items.length,
    doneLabel: t(M.place.done, { placed, total: items.length }),
    queueLabel: t(M.place.queue, { count: queue.length }),
    queue
  };
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
  const dims = level ? levelDims(level, state) : null;
  const svgDims = level?.svgWidth && level.svgHeight ? { w: level.svgWidth, h: level.svgHeight } : dims;
  const space = placement?.space === 'svg' ? svgDims : dims;
  const coord = placement && space ? coordText(toPercent(placement.x, space.w), toPercent(placement.y, space.h)) : '—';
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
      ? placement.space === 'svg' && unit?.svgPointer
        ? t(M.pin.svgPointer, { element: unit.svgPointer.elementId ?? unit.svgPointer.tag ?? 'SVG' })
        : t(M.pin.at, { coord })
      : '',
    color: item.kind === 'unit' ? item.color : AMENITY_COLOR,
    onThisLevel: level?.id === state.levelId,
    temporary: !!placement?.temporary,
    moved: !!placement?.moved
  , tourStop: item.tourStop };
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
export const generateVerticalLinks = (levels: MapLevel[], level: MapLevel, graphs: Record<string, LegacyLevelGraph>, state: LocalMapState): VerticalLinkRow[] => {
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

type LegacyLevelGraph = LevelGraph;

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
}

export const generatePublishSummary = (map: PropertyMap, levels: MapLevel[], graphs: Record<string, LevelGraph>, state: LocalMapState): PublishSummary => {
  const items = generatePinItems(map, levels, state);
  const stops = map.graph.tourStops.filter((stop) => stop.displayStop).length;
  const pins = items.filter((item) => item.placed && !item.temporary).length;
  const nodes = Object.values(graphs).reduce((sum, graph) => sum + graph.nodes.filter((node) => node.kind === 'hallway').length, 0);
  const unplotted = items.filter((item) => !item.placed).length;
  return {
    body: t(M.publish.body, {
      stops: plural(stops, M.publish.stopOne, M.publish.stopMany),
      pins: plural(pins, M.publish.pinOne, M.publish.pinMany),
      nodes: plural(nodes, M.publish.nodeOne, M.publish.nodeMany),
      property: map.inventory.property.name
    }),
    unplotted: unplotted ? t(M.publish.unplotted, { count: unplotted }) : null
  };
};

/** The level a route leg belongs to: its floor's floorplate, or the property map. */
export const levelForLeg = (levels: MapLevel[], leg: { floor: number | null }): MapLevel | null => {
  if (levels.length === 1 && levels[0].kind === 'sitemap') return levels[0];
  if (leg.floor == null) return levelById(levels, levels[0]?.id ?? null);
  return levels.find((level) => level.floors.includes(leg.floor!)) ?? null;
};

export { NODE_ANCHOR_OFFSET, nodeKindOf };
