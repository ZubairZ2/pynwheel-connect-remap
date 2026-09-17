import { plural } from '~/core/utils/connect/format';
import { bedTierOf } from '~/data/mock/core.mock';
import {
  allNodes,
  bedColorsFor,
  curInv,
  curLevel,
  curTour,
  invItem,
  levels,
  lvAssets,
  nodeById,
  pinLevelOf
} from '~/core/store/demo/demo.selectors';
import type { DemoState, PinRef } from '~/core/store/demo/demo.state';

export const TOOL_DEFS = [
  { id: 'select', label: 'Select', icon: 'cursor' },
  { id: 'plot', label: 'Place Pin', icon: 'pin' },
  { id: 'junction', label: 'Junction', icon: 'node' },
  { id: 'edge', label: 'Connect', icon: 'edge' },
  { id: 'move', label: 'Move', icon: 'move' }
];

/** Units and amenities with their placement state, the map editor's working set. */
export const invItems = (state: DemoState) => {
  const inv = curInv(state);
  return [
    ...inv.units.map((u) => ({ kind: 'unit' as const, o: u })),
    ...inv.amenities.map((a) => ({ kind: 'amenity' as const, o: a }))
  ].map((x) => ({ ...x, placed: !!x.o.plotted && typeof x.o.px === 'number' }));
};

const bedsOfUnit = (state: DemoState, unitId: string): number => {
  const inv = curInv(state);
  const unit = inv.units.find((u) => u.id === unitId);
  return inv.floorplans.find((f) => f.id === unit?.fpId)?.beds ?? 0;
};

/** The plot target only counts while the item is still unplotted. */
export const activePlotTarget = (state: DemoState): PinRef | null => {
  if (!state.plotTarget) return null;
  const item = invItem(state, state.plotTarget.kind, state.plotTarget.id);
  return item && !item.plotted ? state.plotTarget : null;
};

export const activeSelectedPin = (state: DemoState): PinRef | null => {
  if (!state.selectedPin) return null;
  return invItem(state, state.selectedPin.kind, state.selectedPin.id) ? state.selectedPin : null;
};

export const generateMapTools = (state: DemoState) =>
  TOOL_DEFS.map((tool) => ({
    ...tool,
    active: state.mapTool === tool.id,
    bg: state.mapTool === tool.id ? 'var(--bo-accent-soft)' : '#fff',
    border: state.mapTool === tool.id ? 'var(--bo-accent)' : 'var(--bo-line)',
    color: state.mapTool === tool.id ? 'var(--bo-accent)' : 'var(--bo-muted)'
  }));

export const generateMapHint = (state: DemoState): string => {
  const target = activePlotTarget(state);

  if (state.mapTool === 'plot') {
    return target
      ? `Click the plan to place ${invItem(state, target.kind, target.id)?.name ?? ''}`
      : 'Pick an unplotted unit or amenity from the list on the right';
  }
  if (state.mapTool === 'junction') return 'Click the map to drop a node on this floor';
  if (state.mapTool === 'edge') {
    return state.edgeFrom ? 'Now click the second node' : 'Click two nodes to connect — across floors makes a vertical link';
  }
  if (state.mapTool === 'move') return 'Drag any pin or node to reposition';
  return 'Click a pin or node to select';
};

export const generateInvPins = (state: DemoState) => {
  const level = curLevel(state);
  const colors = bedColorsFor(state);
  const selected = activeSelectedPin(state);

  return invItems(state)
    .filter((x) => x.o.plotted && pinLevelOf(x.o) === level?.id && typeof x.o.px === 'number')
    .map((x) => {
      const isUnit = x.kind === 'unit';
      const isSelected = !!selected && selected.kind === x.kind && selected.id === x.o.id;
      return {
        pinId: `${x.kind}:${x.o.id}`,
        kind: x.kind,
        id: x.o.id,
        label: x.o.name,
        top: `${x.o.py}%`,
        left: `${x.o.px}%`,
        fill: isUnit ? colors[bedTierOf(bedsOfUnit(state, x.o.id))] : '#0077AE',
        icon: isUnit ? 'bed' : 'star',
        size: isSelected ? '26px' : '22px',
        ring: isSelected ? '3px solid #7B3A87' : '2px solid #fff',
        z: isSelected ? 6 : 3
      };
    });
};

export const generatePlotQueue = (state: DemoState) => {
  const target = activePlotTarget(state);
  const colors = bedColorsFor(state);
  const levelList = levels(state);

  return invItems(state)
    .filter((x) => !x.placed)
    .map((x) => {
      const on = !!target && target.kind === x.kind && target.id === x.o.id;
      const level = levelList.find((l) => l.id === pinLevelOf(x.o));
      return {
        kind: x.kind,
        id: x.o.id,
        name: x.o.name,
        kindLabel: x.kind === 'unit' ? 'Unit' : 'Amenity',
        where: level ? `${level.building} · ${level.floor}` : 'No matching level',
        dot: x.kind === 'unit' ? colors[bedTierOf(bedsOfUnit(state, x.o.id))] : '#0077AE',
        on,
        border: on ? 'var(--bo-accent)' : 'var(--bo-line)',
        bg: on ? 'var(--bo-accent-soft)' : '#fff'
      };
    });
};

export const generateSelPin = (state: DemoState) => {
  const selected = activeSelectedPin(state);
  if (!selected) return { name: '—', meta: '', coord: '', color: '#0077AE', onThisFloor: false };

  const item = invItem(state, selected.kind, selected.id);
  if (!item) return { name: '—', meta: '', coord: '', color: '#0077AE', onThisFloor: false };

  const level = levels(state).find((l) => l.id === pinLevelOf(item)) ?? levels(state)[0];
  const colors = bedColorsFor(state);
  const beds = selected.kind === 'unit' ? bedsOfUnit(state, selected.id) : null;
  const unit = 'floor' in item ? item : undefined;
  const amenity = 'category' in item ? item : undefined;

  return {
    name: item.name,
    meta: `${
      selected.kind === 'unit'
        ? `${beds === 0 ? 'Studio' : `${beds} Bed`} · ${unit?.floor ?? ''}`
        : `Amenity · ${amenity?.category ?? ''}`
    } · ${level?.building} · ${level?.floor}`,
    coord: `${Math.round(item.px ?? 0)}%, ${Math.round(item.py ?? 0)}%`,
    color: selected.kind === 'unit' ? colors[bedTierOf(beds ?? 0)] : '#0077AE',
    onThisFloor: pinLevelOf(item) === curLevel(state)?.id
  };
};

export const generateMapNodes = (state: DemoState) => {
  const tour = curTour(state);
  const level = curLevel(state);
  const levelList = levels(state);
  const colors = bedColorsFor(state);
  const starts = Object.values(tour.startPoints);

  return allNodes(state)
    .filter((n) => (n.level || levelList[0]?.id) === level?.id)
    .map((node) => {
      const isStart = starts.indexOf(node.id) >= 0;
      const fill =
        node.kind === 'stop'
          ? node.type === 'unit'
            ? colors[bedTierOf(node.beds ?? 0)]
            : '#0077AE'
          : '#171A21';

      return {
        nodeId: node.id,
        top: `${node.y}%`,
        left: `${node.x}%`,
        label: node.name,
        size: node.kind === 'stop' ? '18px' : '13px',
        fill: isStart ? '#4A7212' : fill,
        ring:
          state.selectedNode === node.id
            ? '3px solid #7B3A87'
            : state.edgeFrom === node.id
              ? '3px solid #4A7212'
              : isStart
                ? '3px solid #fff'
                : '2px solid #fff',
        z: state.selectedNode === node.id ? 5 : 2
      };
    });
};

export const generateEdgeLines = (state: DemoState) => {
  const tour = curTour(state);
  const level = curLevel(state);
  const levelList = levels(state);

  return tour.edges.map(([a, b]) => {
    const nodeA = nodeById(state, a);
    const nodeB = nodeById(state, b);
    if (!nodeA || !nodeB) return { x1: 0, y1: 0, x2: 0, y2: 0, color: 'transparent' };
    const levelA = nodeA.level || levelList[0]?.id;
    const levelB = nodeB.level || levelList[0]?.id;
    if (levelA !== level?.id || levelB !== level?.id) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, color: 'transparent' };
    }
    return { x1: nodeA.x, y1: nodeA.y, x2: nodeB.x, y2: nodeB.y, color: '#0077AE' };
  });
};

export const generateMapLevels = (state: DemoState) => {
  const current = curLevel(state);
  return levels(state).map((level) => ({
    ...level,
    label: level.floor,
    sub: level.building,
    active: level.id === current?.id,
    bg: level.id === current?.id ? 'var(--bo-ink)' : '#fff',
    color: level.id === current?.id ? '#fff' : 'var(--bo-muted)',
    subColor: level.id === current?.id ? 'rgba(255,255,255,0.62)' : 'var(--bo-subtle)',
    border: level.id === current?.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));
};

/**
 * A deterministic stand-in floor plan.
 *
 * The design has no real SVG to parse, so it hashes the property and level ids
 * into a stable room layout; the port keeps that so a floor always looks the
 * same between visits.
 */
export const planSurface = (state: DemoState) => {
  const level = curLevel(state);
  const assets = lvAssets(state, level);
  if (!assets.has) {
    return { has: false, isSvg: false, rects: [], corridor: null, shell: null };
  }

  let hash = 2166136261;
  const seed = `${state.propId}|${level.id}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash ^ seed.charCodeAt(i)) >>> 0;
    hash = (hash * 16777619) >>> 0;
  }
  const random = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 4294967296;
  };

  const cols = 4 + Math.floor(random() * 3);
  const pad = 7;
  const top = 9 + random() * 5;
  const corridor = 10 + random() * 4;
  const bandA = 22 + random() * 8;
  const bandB = 22 + random() * 8;
  const width = (100 - pad * 2) / cols;
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (let c = 0; c < cols; c += 1) {
    const jitterA = random() * 5 - 2.5;
    const jitterB = random() * 5 - 2.5;
    rects.push({ x: pad + c * width + 0.9, y: top, w: width - 1.8, h: bandA + jitterA });
    rects.push({ x: pad + c * width + 0.9, y: top + bandA + corridor, w: width - 1.8, h: bandB + jitterB });
  }

  return {
    has: true,
    isSvg: !!assets.svg,
    rects,
    corridor: { x: pad, y: top + bandA, w: 100 - pad * 2, h: corridor },
    shell: { x: pad - 2, y: top - 3, w: 100 - (pad - 2) * 2, h: bandA + corridor + bandB + 6 }
  };
};

export const generatePlanView = (state: DemoState) => {
  const level = curLevel(state);
  const assets = lvAssets(state, level);
  const surface = planSurface(state);
  const opt = state.svgOpt[level?.id ?? ''];

  return {
    curLevelLabel: `${level?.building} · ${level?.floor}`,
    curPlanKindLabel: assets.svg
      ? assets.bg
        ? 'SVG + background'
        : 'Floor SVG'
      : assets.bg
        ? 'Background only'
        : 'No site plan',
    curPlanFile: [assets.svg, assets.bg].filter(Boolean).join(' + ') || 'No site plan uploaded',
    hasPlan: assets.has,
    planRects: surface.rects,
    planCorridor: surface.corridor ?? { x: 0, y: 0, w: 0, h: 0 },
    planShell: surface.shell ?? { x: 0, y: 0, w: 0, h: 0 },
    planBg: surface.isSvg ? '#FFFFFF' : '#E8E2D6',
    planRoomFill: surface.isSvg ? '#F4F5F7' : 'rgba(255,255,255,0.62)',
    planRoomStroke: surface.isSvg ? '#CDCDCD' : 'rgba(23,26,33,0.35)',
    planCorridorFill: surface.isSvg ? '#E8F4FB' : 'rgba(0,119,174,0.18)',
    planAerialOpacity: assets.bg ? (assets.svg ? 0.35 : 0.55) : 0,
    planEmptyLabel: `No site plan for ${level?.building} · ${level?.floor}`,
    planOptRun: !!opt,
    planOptStatusV: opt?.valid ? 'ok' : 'warn',
    planOptStatusLabel: opt?.valid ? 'Valid' : 'Needs Attention',
    planOptSize: opt ? `${opt.beforeKb} KB → ${opt.afterKb} KB` : '',
    planOptNodes: opt ? `${opt.nodesBefore.toLocaleString()} → ${opt.nodesAfter.toLocaleString()}` : '',
    planOptPaths: opt ? opt.pathsAfter.toLocaleString() : '',
    planOptNote: opt
      ? opt.valid
        ? 'Geometry parses cleanly and is ready for the kiosk map.'
        : 'Some paths use unsupported filters — review before publishing.'
      : ''
  };
};

export const generateSelection = (state: DemoState) => {
  const node = nodeById(state, state.selectedNode);
  const levelList = levels(state);
  if (!node) return { hasSelection: false, selLabel: '', selMeta: '' };

  const level = levelList.find((l) => l.id === (node.level || levelList[0]?.id)) ?? levelList[0];
  return {
    hasSelection: true,
    selLabel: node.name,
    selMeta: `${
      node.kind === 'stop' ? `Tour stop · ${node.floorLabel}` : 'Pathway junction'
    } · ${level?.building} · ${Math.round(node.x)}%, ${Math.round(node.y)}%`
  };
};

export const generateLevelNodeCount = (state: DemoState): string => {
  const level = curLevel(state);
  const levelList = levels(state);
  const nodes = allNodes(state).filter((n) => (n.level || levelList[0]?.id) === level?.id).length;
  const pins = invItems(state).filter(
    (x) => x.o.plotted && typeof x.o.px === 'number' && pinLevelOf(x.o) === level?.id
  ).length;
  return `${plural(nodes + pins, 'pin')} on this floor`;
};

export const generateAutoPlotReport = (state: DemoState) => {
  const report = state.autoPlotReport;
  if (!report) return { placed: '0', skippedCount: '0', rows: [], hasSkipped: false, headline: '' };

  return {
    placed: String(report.placed),
    skippedCount: String(report.skipped.length),
    hasSkipped: report.skipped.length > 0,
    rows: report.skipped,
    headline: `Auto-Plot placed ${plural(report.placed, 'pin')} from PMS floor and building data`
  };
};

export const generatePlotSummary = (state: DemoState) => {
  const items = invItems(state);
  const target = activePlotTarget(state);
  const unplaced = items.filter((x) => !x.placed);

  return {
    plotArmed: !!target,
    plotArmedLabel: target
      ? `${invItem(state, target.kind, target.id)?.name ?? ''} — click the plan to drop its pin`
      : '',
    plotQueueEmpty: unplaced.length === 0,
    plotQueueLabel: `${plural(unplaced.length, 'item')} left to place`,
    plotDoneLabel: `${items.length - unplaced.length} of ${items.length} plotted`
  };
};
