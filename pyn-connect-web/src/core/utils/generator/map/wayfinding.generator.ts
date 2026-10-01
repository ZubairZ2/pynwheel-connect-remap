import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import type { PillVariant } from '../listing.types';
import { STOP_TYPES, stopTypeOf, AMENITY_GLYPH, END_GLYPH, OUTDOOR_GLYPH, UNIT_GLYPH, WALK_GLYPH, type StopTypeId } from '~/core/utils/wayfinding/stopTypes';
import { anchorsOnFloor, blockerRadius, parseServedFloors, plateProgress, stopsOnFloor, type WfAnchor, type WfPlate, type WfProgress } from '~/core/utils/wayfinding/wayfindingGraph';
import { copyKey, type WfRouteGroup, type WfRouteResult, type WfStepKind } from '~/core/utils/wayfinding/wayfindingRoute';
import { levelsOfBuilding, mapBuildings, stackFloor, type MapLevel } from './mapLevels.generator';
import { edgeKey, toPercent, type LocalMapState, type StopForm, type WfScope, type WfTool } from './mapState';
import { M, plural, t } from './mapText';

/** Descriptors for the Wayfinding mode: the toolbar, the side panel, the canvas layer and the Add Additional Stop dialog. Pure. */

const W = M.wayfinding;

/** The property routes self-tour visitors, as the CMS's Auto Wayfinding menu requires (`communities.self_tour && auto_wayfinding`). */
export const wayfindingEnabled = (map: PropertyMap): boolean => map.graph.settings.selfTour && map.graph.settings.autoWayfinding;

export const WF_TOOLS: { id: WfTool; label: string; tip: string; hint: string; d: string }[] = [
  { id: 'move', label: W.tools.move, tip: W.tools.moveTip, hint: W.tools.moveHint, d: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20' },
  { id: 'connect', label: W.tools.connect, tip: W.tools.connectTip, hint: W.tools.connectHint, d: 'M8 18a2 2 0 1 1-4 0a2 2 0 1 1 4 0zM20 6a2 2 0 1 1-4 0a2 2 0 1 1 4 0zM7.5 16.5l9-9' },
  { id: 'node', label: W.tools.node, tip: W.tools.nodeTip, hint: W.tools.nodeHint, d: 'M12 5v14M5 12h14' },
  { id: 'erase', label: W.tools.erase, tip: W.tools.eraseTip, hint: W.tools.eraseHint, d: 'M20 20H9l-5-5a1.5 1.5 0 0 1 0-2l9-9a1.5 1.5 0 0 1 2 0l5 5a1.5 1.5 0 0 1 0 2l-9 9M9 9l6 6' }
];

const PROGRESS_LABEL: Record<WfProgress['state'], string> = { done: W.status.done, partial: W.status.partial, none: W.status.none, noplan: W.status.noplan };
const PROGRESS_PILL: Record<WfProgress['state'], PillVariant> = { done: 'ok', partial: 'warn', none: 'warn', noplan: 'neutral' };
const PROGRESS_DOT: Record<WfProgress['state'], string> = { done: '#4A7212', partial: '#E0A800', none: '#CDD2DB', noplan: '#CDD2DB' };

/** The floorplate's progress across every floor of its stack (each floor counted on its own). */
export const levelWayfindingProgress = (plate: WfPlate): WfProgress => {
  const level = plate.level;
  if (level.floors.length <= 1) return plateProgress(plate, null);
  const floors = level.floors.map((floor) => plateProgress(plate, floor));
  const first = floors[0];
  if (first.state === 'noplan' || first.state === 'none') return first;
  const linked = floors.reduce((sum, row) => sum + row.linked, 0);
  const total = floors.reduce((sum, row) => sum + row.total, 0);
  if (floors.every((row) => row.state === 'done')) return { state: 'done', pct: 100, linked, total };
  return { state: 'partial', pct: total ? Math.max(8, Math.round((linked / total) * 100)) : 8, linked, total };
};

export interface WfTabProgress {
  state: 'done' | 'partial' | 'none' | 'nosvg';
  pct: number;
  progress: string;
}

/** A floorplate card's wayfinding line, in the same classes the plotting progress uses. */
export const wayfindingTab = (plate: WfPlate): WfTabProgress => {
  const progress = levelWayfindingProgress(plate);
  return {
    state: progress.state === 'noplan' ? 'nosvg' : progress.state,
    pct: progress.pct,
    progress: i18n.t(PROGRESS_LABEL[progress.state])
  };
};

/* ── toolbar ─────────────────────────────────────────────────────────── */

export interface WfToolbar {
  title: string;
  sub: string;
  detectMenu: { scope: 'plate' | 'building' | 'all'; label: string; sub: string }[];
  tools: { id: WfTool; label: string; tip: string; d: string; active: boolean }[];
  canClear: boolean;
  clearTip: string;
  noPlan: boolean;
}

export const generateWfToolbar = (map: PropertyMap, levels: MapLevel[], level: MapLevel, plate: WfPlate, state: LocalMapState): WfToolbar => {
  const building = level.building ?? level.sub;
  const inBuilding = levelsOfBuilding(levels, level.building);
  const buildings = mapBuildings(map, levels);
  const detectMenu: WfToolbar['detectMenu'] = [
    { scope: 'plate', label: i18n.t(W.detect.plate), sub: `${level.sub} · ${level.label}` },
    { scope: 'building', label: t(W.detect.building, { building }), sub: plural(inBuilding.length, M.autoPlot.plateOne, M.autoPlot.plateMany) }
  ];
  if (buildings.length > 1) {
    detectMenu.push({
      scope: 'all',
      label: i18n.t(W.detect.all),
      sub: `${plural(levels.length, M.autoPlot.plateOne, M.autoPlot.plateMany)} · ${plural(buildings.length, W.buildingOne, W.buildingMany)}`
    });
  }
  return {
    title: `${level.sub} · ${level.label}`,
    sub: `${plural(plate.points.length, W.pointOne, W.pointMany)} · ${plural(plate.paths.length, W.pathOne, W.pathMany)}`,
    detectMenu,
    tools: WF_TOOLS.map((tool) => ({ id: tool.id, label: i18n.t(tool.label), tip: i18n.t(tool.tip), d: tool.d, active: state.wfTool === tool.id })),
    canClear: plate.points.length > 0,
    clearTip: i18n.t(plate.points.length ? W.clear.tip : W.clear.tipEmpty),
    noPlan: !plate.hasImage
  };
};

/* ── the side panel ──────────────────────────────────────────────────── */

export interface WfFloorButton {
  floor: number;
  label: string;
  tip: string;
  dot: string;
  active: boolean;
}

export interface WfPickerItem {
  id: string;
  label: string;
  meta: string;
  d: string;
  iconBg: string;
  iconColor: string;
  active: boolean;
  chosen: boolean;
}

export interface WfPicker {
  title: string;
  count: string;
  query: string;
  kinds: { id: 'all' | 'unit' | 'amenity' | 'stop'; label: string; active: boolean }[];
  groups: { label: string; items: WfPickerItem[] }[];
  /** The ids in list order (for ↑ ↓ Enter). */
  order: string[];
  empty: string | null;
  pos: NonNullable<LocalMapState['wfPick']>['pos'];
}

export interface WfRouteView {
  ok: boolean;
  title: string;
  sub: string;
  error: string;
  fixLabel: string | null;
  steps: { key: string; kind: WfStepKind; title: string; sub: string; d: string; iconBg: string; iconColor: string; ck: string; clickable: boolean; tag: string; tagColor: string; active: boolean; here: boolean }[];
  anim: { playLabel: string; playing: boolean; idle: boolean; status: string | null; mode: 'point' | 'stop' };
}

export interface WayfindingPanel {
  scopeLabel: string;
  status: { label: string; variant: PillVariant };
  noPlan: boolean;
  stacked: null | {
    count: number;
    doneLabel: string;
    nextIncomplete: number | null;
    floors: WfFloorButton[];
    cols: number;
    unitExample: string;
  };
  counts: { points: string; paths: string; linked: string };
  hint: string;
  selection: null | { kind: 'point' | 'path'; title: string; meta: string };
  review: null | { title: string; body: string; skipped: string[] };
  scopes: { id: WfScope; label: string; tip: string; active: boolean }[];
  scope: WfScope;
  sample: string | null;
  canRoute: boolean;
  noRouteText: string;
  from: { label: string; group: string };
  to: { label: string; group: string };
  multiScope: boolean;
  stepFree: boolean;
  route: WfRouteView | null;
  unlinked: null | { head: string; rows: { key: string; name: string; meta: string }[] };
  picker: WfPicker | null;
}

const STEP_COLORS: Record<WfStepKind, [string, string]> = {
  walk: ['#E6F2F9', '#0077AE'],
  elevator: ['#E6F2F9', '#0077AE'],
  stairs: ['#E6F2F9', '#0077AE'],
  outdoor: ['#EEF0F4', '#5B6270'],
  end: ['#FBE1E4', '#C62534']
};

const STEP_GLYPH: Record<WfStepKind, string> = {
  walk: WALK_GLYPH,
  elevator: stopTypeOf('elevator').d,
  stairs: stopTypeOf('stairs').d,
  outdoor: OUTDOOR_GLYPH,
  end: END_GLYPH
};

/** The scope tabs: This Floor, Floors and — with more than one building — Buildings. */
export const effectiveScope = (map: PropertyMap, levels: MapLevel[], scope: WfScope): WfScope => (scope === 'buildings' && mapBuildings(map, levels).length < 2 ? 'floors' : scope);

const anchorIcon = (anchor: WfAnchor): { d: string; bg: string; color: string; kind: 'unit' | 'amenity' | 'stop' } => {
  if (anchor.kind === 'stop' && anchor.type) {
    const type = stopTypeOf(anchor.type);
    return { d: type.d, bg: type.color, color: '#fff', kind: 'stop' };
  }
  if (anchor.kind === 'amenity') return { d: AMENITY_GLYPH, bg: '#FDEBC8', color: '#8A5A00', kind: 'amenity' };
  return { d: UNIT_GLYPH, bg: '#E6F2F9', color: '#0077AE', kind: 'unit' };
};

export const generateWayfindingPanel = (
  map: PropertyMap,
  levels: MapLevel[],
  level: MapLevel,
  plate: WfPlate,
  state: LocalMapState,
  groups: WfRouteGroup[],
  pair: [string, string],
  sampleAvailable: boolean
): WayfindingPanel => {
  const floor = stackFloor(level, state.wfFloor);
  const progress = plateProgress(plate, floor);
  const anchors = anchorsOnFloor(plate, floor);
  const scope = effectiveScope(map, levels, state.wfScope);

  let stacked: WayfindingPanel['stacked'] = null;
  if (level.floors.length > 1 && floor != null) {
    const rows = level.floors.map((value) => ({ floor: value, progress: plateProgress(plate, value) }));
    const done = rows.filter((row) => row.progress.state === 'done').length;
    const incomplete = rows.filter((row) => row.progress.state !== 'done');
    const at = level.floors.indexOf(floor);
    const next = incomplete.find((row) => level.floors.indexOf(row.floor) > at) ?? incomplete.find((row) => row.floor !== floor);
    const n = level.floors.length;
    const firstUnit = anchors.find((anchor) => anchor.kind === 'unit');
    stacked = {
      count: n,
      doneLabel: t(W.stack.done, { done, count: n }),
      nextIncomplete: next?.floor ?? null,
      floors: rows.map((row) => ({
        floor: row.floor,
        label: String(row.floor),
        tip:
          row.progress.state === 'partial'
            ? t(W.stack.linkedTip, { linked: row.progress.linked, total: row.progress.total })
            : i18n.t(PROGRESS_LABEL[row.progress.state]),
        dot: PROGRESS_DOT[row.progress.state],
        active: row.floor === floor
      })),
      cols: n <= 6 ? n : Math.min(6, Math.ceil(n / Math.ceil(n / 6))),
      unitExample: firstUnit ? t(W.stack.unitExample, { name: firstUnit.label, floor }) : t(W.stack.unitsOn, { floor })
    };
  }

  const tool = WF_TOOLS.find((row) => row.id === state.wfTool) ?? WF_TOOLS[0];
  const hint = !plate.hasImage
    ? i18n.t(W.noPlan)
    : plate.points.length || state.wfTool === 'node'
      ? i18n.t(tool.hint)
      : i18n.t(W.noPaths);

  let selection: WayfindingPanel['selection'] = null;
  const selectedPoint = state.wfSel ? plate.points.find((point) => point.key === state.wfSel) : null;
  if (selectedPoint) {
    const linkedHere = anchors.filter((anchor) => anchor.attached === selectedPoint.key);
    selection = {
      kind: 'point',
      title: linkedHere.length ? linkedHere.map((anchor) => anchor.label).slice(0, 3).join(', ') : i18n.t(W.selection.point),
      meta: `${linkedHere.length ? `${i18n.t(W.selection.linkedStop)} · ` : ''}${plural(selectedPoint.degree, W.selection.connectionOne, W.selection.connectionMany)}${selectedPoint.degree ? '' : ` ${i18n.t(W.selection.isolated)}`}${selectedPoint.temporary ? ` · ${i18n.t(M.selection.temporary)}` : selectedPoint.moved ? ` · ${i18n.t(W.selection.moved)}` : ''}`
    };
  } else if (state.wfSelEdge) {
    const path = plate.paths.find((row) => row.key === state.wfSelEdge);
    if (path) selection = { kind: 'path', title: i18n.t(W.selection.path), meta: i18n.t(path.temporary ? M.selection.temporary : M.selection.stored) };
  }

  const review = state.wfReview
    ? {
        title: state.wfReview.levelIds.length
          ? t(W.review.title, { plates: plural(state.wfReview.levelIds.length, M.autoPlot.plateOne, M.autoPlot.plateMany) })
          : i18n.t(W.review.nothing),
        body: state.wfReview.levelIds.length
          ? t(W.review.body, { points: plural(state.wfReview.points, W.pointOne, W.pointMany), paths: plural(state.wfReview.paths, W.pathOne, W.pathMany) })
          : i18n.t(W.review.nothingBody),
        skipped: state.wfReview.skipped
      }
    : null;

  const multiBuilding = mapBuildings(map, levels).length > 1;
  const scopes = (
    [
      { id: 'plate', label: W.scope.plate, tip: t(W.scope.plateTip, { floor: level.label }) },
      { id: 'floors', label: W.scope.floors, tip: t(W.scope.floorsTip, { building: level.sub }) },
      ...(multiBuilding ? [{ id: 'buildings', label: W.scope.buildings, tip: i18n.t(W.scope.buildingsTip) }] : [])
    ] as { id: WfScope; label: string; tip: string }[]
  ).map((row) => ({ id: row.id, label: i18n.t(row.label), tip: row.tip, active: row.id === scope }));

  const flat = groups.flatMap((group) => group.items);
  const current = (id: string) => {
    const item = flat.find((row) => row.id === id);
    return item ? { label: item.label, group: item.group } : { label: i18n.t(W.route.choose), group: '' };
  };
  const count = flat.length;

  const route = state.wfRoute ? routeView(state, state.wfRoute, level, floor) : null;

  const unlinkedRows = anchors.filter((anchor) => !anchor.linked);
  const unlinked =
    plate.points.length > 0 && unlinkedRows.length
      ? {
          head: `${i18n.t(W.unlinked.head)}${floor != null ? ` ${t(W.unlinked.onFloor, { floor })}` : ''} · ${unlinkedRows.length}`,
          rows: unlinkedRows.map((anchor) => ({
            key: anchor.key,
            name: anchor.label,
            meta: anchor.svgOnly ? i18n.t(W.unlinked.svgOnly) : anchor.attached ? `${anchor.meta} · ${i18n.t(W.unlinked.isolated)}` : anchor.meta
          }))
        }
      : null;

  return {
    scopeLabel: `${level.sub} · ${level.rangeLabel}`,
    status: { label: i18n.t(PROGRESS_LABEL[progress.state]), variant: PROGRESS_PILL[progress.state] },
    noPlan: !plate.hasImage,
    stacked,
    counts: { points: String(plate.points.length), paths: String(plate.paths.length), linked: `${progress.linked}/${progress.total}` },
    hint,
    selection,
    review,
    scopes,
    scope,
    sample: sampleAvailable && count >= 2 ? i18n.t(scope === 'plate' ? W.sample.plate : scope === 'floors' ? W.sample.floors : W.sample.buildings) : null,
    canRoute: count >= 2,
    noRouteText: i18n.t(scope === 'plate' ? W.route.needTwoPlate : W.route.needTwoScope),
    from: current(pair[0]),
    to: current(pair[1]),
    multiScope: scope !== 'plate',
    stepFree: state.wfStepFree,
    route,
    unlinked,
    picker: state.wfPick ? generatePicker(state, groups, pair) : null
  };
};

const routeView = (state: LocalMapState, result: WfRouteResult, level: MapLevel, floor: number | null): WfRouteView => {
  const here = copyKey(level.id, floor);
  const anim = state.wfAnim;
  if (!result.ok) {
    return {
      ok: false,
      title: i18n.t(W.route.noRoute),
      sub: '',
      error: result.error,
      fixLabel: result.fix?.label ?? null,
      steps: [],
      anim: { playLabel: '', playing: false, idle: true, status: null, mode: state.wfAnimMode }
    };
  }
  const activeStep = !anim
    ? -1
    : anim.finished
      ? result.steps.length - 1
      : (() => {
          const walk = result.steps.findIndex((step) => step.legIndex === anim.leg && step.kind === 'walk');
          return walk >= 0 ? walk : result.steps.findIndex((step) => step.legIndex === anim.leg);
        })();
  const steps = result.steps.map((step, index) => {
    const onMap = step.ck === here;
    const clickable = result.multi && !onMap && step.kind !== 'end';
    const active = index === activeStep;
    const [iconBg, iconColor] = STEP_COLORS[step.kind];
    return {
      key: `${index}-${step.kind}`,
      kind: step.kind,
      title: step.title,
      sub: step.sub,
      d: STEP_GLYPH[step.kind],
      iconBg,
      iconColor,
      ck: step.ck,
      clickable,
      active,
      here: result.multi && onMap && step.kind === 'walk',
      tag: active ? i18n.t(W.route.now) : result.multi && onMap && step.kind === 'walk' ? i18n.t(W.route.onMap) : clickable && step.kind === 'walk' ? i18n.t(W.route.view) : '',
      tagColor: active ? '#8A5A00' : result.multi && onMap ? '#4A7212' : 'var(--bo-accent)'
    };
  });
  const points = result.legs.reduce((sum, leg) => sum + leg.points.length, 0);
  return {
    ok: true,
    title: t(W.route.length, { px: result.px.toLocaleString('en-US'), points: plural(points, W.pointOne, W.pointMany) }),
    sub: `${result.summary} · ${i18n.t(result.multi ? W.route.clickStep : W.route.inGreen)}`,
    error: '',
    fixLabel: null,
    steps,
    anim: {
      playLabel: i18n.t(!anim ? W.anim.play : anim.finished ? W.anim.replay : anim.playing ? W.anim.pause : W.anim.resume),
      playing: !!anim && anim.playing && !anim.finished,
      idle: !anim,
      status: !anim
        ? null
        : anim.finished
          ? i18n.t(W.anim.arrived)
          : t(W.anim.status, {
              state: i18n.t(anim.playing ? W.anim.playing : W.anim.paused),
              step: activeStep + 1,
              total: result.steps.length,
              title: result.steps[activeStep]?.title ?? ''
            }),
      mode: state.wfAnimMode
    }
  };
};

const generatePicker = (state: LocalMapState, groups: WfRouteGroup[], pair: [string, string]): WfPicker | null => {
  const pick = state.wfPick;
  if (!pick) return null;
  const tokens = pick.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const chosen = pick.which === 'A' ? pair[0] : pair[1];
  const all = groups.flatMap((group) =>
    group.items.map((item) => {
      const icon = anchorIcon(item.anchor);
      const meta = item.anchor.meta;
      return { item, icon, meta, hay: `${item.label} ${meta} ${group.label}`.toLowerCase() };
    })
  );
  const hits = all.filter((row) => (pick.kind === 'all' || row.icon.kind === pick.kind) && tokens.every((token) => row.hay.includes(token)));
  const index = Math.min(pick.index, Math.max(0, hits.length - 1));
  const out: WfPicker['groups'] = [];
  hits.forEach((row, position) => {
    let group = out.find((entry) => entry.label === row.item.group);
    if (!group) {
      group = { label: row.item.group, items: [] };
      out.push(group);
    }
    group.items.push({
      id: row.item.id,
      label: row.item.label,
      meta: row.meta,
      d: row.icon.d,
      iconBg: row.icon.bg,
      iconColor: row.icon.color,
      active: position === index,
      chosen: row.item.id === chosen
    });
  });
  return {
    title: i18n.t(pick.which === 'A' ? W.picker.start : W.picker.end),
    count: t(W.picker.count, { shown: hits.length, total: all.length }),
    query: pick.query,
    kinds: (
      [
        ['all', W.picker.all],
        ['unit', W.picker.units],
        ['amenity', W.picker.amenities],
        ['stop', W.picker.stops]
      ] as const
    ).map(([id, label]) => ({ id, label: i18n.t(label), active: pick.kind === id })),
    groups: out,
    order: hits.map((row) => row.item.id),
    empty: hits.length ? null : pick.query.trim() ? t(W.picker.noMatch, { query: pick.query.trim() }) : i18n.t(W.picker.noneOfType),
    pos: pick.pos
  };
};

/* ── the canvas layer ────────────────────────────────────────────────── */

export interface WfLayerPoint {
  key: string;
  xPct: number;
  yPct: number;
  selected: boolean;
  from: boolean;
  onRoute: boolean;
  lonely: boolean;
  temporary: boolean;
}

export interface WfLayerPath {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onRoute: boolean;
  selected: boolean;
  temporary: boolean;
}

export interface WfLayerStop {
  key: string;
  name: string;
  type: StopTypeId;
  xPct: number;
  yPct: number;
  selected: boolean;
  temporary: boolean;
  blocker: boolean;
}

export interface WfLayerLink {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  linked: boolean;
  explicit: boolean;
}

export interface WfLayer {
  points: WfLayerPoint[];
  paths: WfLayerPath[];
  stops: WfLayerStop[];
  links: WfLayerLink[];
  blockers: { key: string; xPct: number; yPct: number; rPctW: number; rPctH: number }[];
  /** The route's walk on this floor (percent of the plan), when there is one. */
  route: { x: number; y: number; stop: boolean; name: string }[] | null;
  /** Where the Deselect badge floats (percent), when a point is selected. */
  badge: { xPct: number; yPct: number } | null;
  dimmed: boolean;
  /** The unit and amenity pins of the floor in view (a stack's other floors share the image, not the units). */
  pins: Set<string>;
  /** Their doors (stored on the floor image), where the CMS routes to and the links start. */
  doors: { key: string; xPct: number; yPct: number }[];
}

/** The plan's wayfinding layer for the floor in view (on a stack: the shared paths plus that floor's stops and links). */
export const generateWfLayer = (plate: WfPlate, level: MapLevel, state: LocalMapState): WfLayer => {
  const floor = stackFloor(level, state.wfFloor);
  const dims = plate.dims;
  const pct = (value: number, dim: number | undefined) => (dim ? toPercent(value, dim) : 0);
  const here = copyKey(level.id, floor);
  const route = state.wfRoute && state.wfRoute.ok ? state.wfRoute : null;
  const leg = route?.legs.find((row) => row.ck === here) ?? null;
  const onRoutePoints = new Set(leg?.pointKeys ?? []);
  const onRouteEdges = new Set<string>();
  if (leg) for (let i = 1; i < leg.pointKeys.length; i += 1) onRouteEdges.add(edgeKey(leg.pointKeys[i - 1], leg.pointKeys[i]));
  const points = new Map(plate.points.map((point) => [point.key, point]));

  const anchors = anchorsOnFloor(plate, floor);
  const links: WfLayerLink[] = anchors.flatMap((anchor) => {
    const point = anchor.attached ? points.get(anchor.attached) : null;
    if (!point || anchor.x == null || anchor.y == null) return [];
    return [{ key: anchor.key, x1: pct(anchor.x, dims?.w), y1: pct(anchor.y, dims?.h), x2: point.xPct, y2: point.yPct, linked: anchor.linked, explicit: anchor.explicit }];
  });

  const fromStop = state.wfFrom && !points.has(state.wfFrom) ? state.wfFrom : null;
  const stops = stopsOnFloor(plate, floor)
    .filter((stop) => stop.placed)
    .map((stop) => {
      const type = stopTypeOf(stop.type);
      return {
        key: stop.key,
        name: stop.label,
        type: stop.type,
        xPct: stop.xPct,
        yPct: stop.yPct,
        selected: fromStop === stop.key || state.stopTarget === stop.key,
        temporary: stop.temporary,
        blocker: !!type.block
      };
    });

  const radius = blockerRadius(dims);
  const selected = state.wfSel ? points.get(state.wfSel) : state.wfFrom ? points.get(state.wfFrom) : null;
  return {
    points: plate.points.map((point) => ({
      key: point.key,
      xPct: point.xPct,
      yPct: point.yPct,
      selected: state.wfSel === point.key,
      from: state.wfFrom === point.key,
      onRoute: onRoutePoints.has(point.key),
      lonely: point.degree === 0,
      temporary: point.temporary
    })),
    paths: plate.paths.map((path) => ({
      key: path.key,
      x1: path.x1,
      y1: path.y1,
      x2: path.x2,
      y2: path.y2,
      onRoute: onRouteEdges.has(path.key),
      selected: state.wfSelEdge === path.key,
      temporary: path.temporary
    })),
    stops,
    links,
    blockers: stops
      .filter((stop) => stop.blocker)
      .map((stop) => ({ key: stop.key, xPct: stop.xPct, yPct: stop.yPct, rPctW: dims ? (radius / dims.w) * 100 : 4, rPctH: dims ? (radius / dims.h) * 100 : 4 })),
    route: leg && dims ? leg.points.map((point) => ({ x: pct(point.x, dims.w), y: pct(point.y, dims.h), stop: point.stop, name: point.name })) : null,
    badge: selected && !state.dragging ? { xPct: selected.xPct, yPct: selected.yPct } : null,
    dimmed: !!leg,
    pins: new Set(anchors.filter((anchor) => anchor.kind !== 'stop').map((anchor) => anchor.key)),
    doors: anchors
      .filter((anchor) => anchor.door && anchor.x != null && anchor.y != null)
      .map((anchor) => ({ key: anchor.door!, xPct: pct(anchor.x!, dims?.w), yPct: pct(anchor.y!, dims?.h) }))
  };
};

/* ── Add Additional Stop ─────────────────────────────────────────────── */

export const STOP_NAME_MAX = 80;
export const STOP_NOTE_MAX = 500;

export interface StopFormView {
  title: string;
  saveLabel: string;
  types: { id: StopTypeId; label: string; color: string; d: string; active: boolean }[];
  hint: string;
  namePlaceholder: string;
  buildings: { id: string; label: string }[];
  plates: { id: string; label: string }[];
  stack: null | { label: string; options: { id: string; label: string }[] };
  vertical: boolean;
  gate: boolean;
  block: boolean;
  errors: Partial<Record<'type' | 'name' | 'building' | 'levelId' | 'floorOnly' | 'floors' | 'note', string>>;
  valid: boolean;
}

/** A building's key in the dialog's select ("" for floorplates with no building). */
const buildingKey = (level: MapLevel): string => level.building ?? '';

/** The dialog's checks: a type, a floorplate in the chosen building, a name and instruction that fit, served floors that read as floors. */
export const stopFormErrors = (form: StopForm, levels: MapLevel[]): StopFormView['errors'] => {
  const errors: StopFormView['errors'] = {};
  if (!STOP_TYPES.some((type) => type.id === form.type)) errors.type = i18n.t(M.stops.errors.type);
  const level = levels.find((row) => row.id === form.levelId);
  if (!levels.some((row) => buildingKey(row) === form.building)) errors.building = i18n.t(M.stops.errors.building);
  if (!level) errors.levelId = i18n.t(M.stops.errors.level);
  else if (buildingKey(level) !== form.building) errors.levelId = i18n.t(M.stops.errors.levelBuilding);
  if (form.name.trim().length > STOP_NAME_MAX) errors.name = t(M.stops.errors.nameLong, { max: STOP_NAME_MAX });
  if (level && form.floorOnly && !(level.floors.length > 1 && level.floors.includes(Number(form.floorOnly)))) errors.floorOnly = i18n.t(M.stops.errors.floorOnly);
  if (stopTypeOf(form.type).vertical && form.floors.trim() && parseServedFloors(form.floors) == null) errors.floors = i18n.t(M.stops.errors.floors);
  if (form.note.trim().length > STOP_NOTE_MAX) errors.note = t(M.stops.errors.noteLong, { max: STOP_NOTE_MAX });
  return errors;
};

/** The name a stop gets when none is typed: its type, numbered after the stops of that type already added ("Elevator 2"), as the design does. */
export const defaultStopName = (form: StopForm, state: LocalMapState): string => {
  const typed = form.name.trim();
  if (typed) return typed;
  const same = state.tempStops.filter((stop) => stop.type === form.type && stop.key !== form.editing).length;
  return `${i18n.t(stopTypeOf(form.type).label)}${same ? ` ${same + 1}` : ''}`;
};

export const generateStopForm = (form: StopForm, levels: MapLevel[]): StopFormView => {
  const type = stopTypeOf(form.type);
  const errors = stopFormErrors(form, levels);
  const names: string[] = [];
  levels.forEach((level) => {
    const key = buildingKey(level);
    if (!names.includes(key)) names.push(key);
  });
  const level = levels.find((row) => row.id === form.levelId) ?? null;
  return {
    title: i18n.t(form.editing ? M.stops.dialog.editTitle : M.stops.dialog.title),
    saveLabel: i18n.t(form.editing ? M.stops.dialog.save : form.place ? M.stops.dialog.addPlace : M.stops.dialog.add),
    types: STOP_TYPES.map((row) => ({ id: row.id, label: i18n.t(row.label), color: row.color, d: row.d, active: row.id === form.type })),
    hint: i18n.t(type.hint),
    namePlaceholder: t(M.stops.dialog.namePlaceholder, { example: i18n.t(type.example) }),
    buildings: names.map((name) => ({ id: name, label: name || i18n.t(M.level.allBuildings) })),
    plates: levels.filter((row) => buildingKey(row) === form.building).map((row) => ({ id: row.id, label: row.label })),
    stack:
      level && level.floors.length > 1
        ? {
            label: t(M.stops.dialog.stackShared, { count: level.floors.length, range: `${level.floors[0]}–${level.floors[level.floors.length - 1]}` }),
            options: [
              { id: '', label: t(M.stops.dialog.stackAll, { count: level.floors.length }) },
              ...level.floors.map((floor) => ({ id: String(floor), label: t(M.stops.dialog.stackOne, { floor }) }))
            ]
          }
        : null,
    vertical: !!type.vertical,
    gate: !!type.gate,
    block: !!type.block,
    errors: form.submitted ? errors : {},
    valid: Object.keys(errors).length === 0
  };
};

/** The dialog opened on a level (the one in view, or the one a route fix names). */
export const newStopForm = (level: MapLevel | null, levels: MapLevel[]): StopForm => {
  const target = level ?? levels[0] ?? null;
  return {
    editing: null,
    type: 'entry',
    name: '',
    building: target ? buildingKey(target) : '',
    levelId: target?.id ?? '',
    floorOnly: '',
    floors: '',
    accessible: true,
    lock: false,
    note: '',
    place: true,
    submitted: false
  };
};
