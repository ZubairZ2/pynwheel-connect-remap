import type { PayloadAction } from '@reduxjs/toolkit';

import { plural, uid } from '~/core/utils/connect/format';
import { isProdStage } from '~/data/mock/core.mock';

import { curInv, curLevel, curProp, levels, nextUnplotted, nodeById } from '../demo.selectors';
import type { AutoPlotReport, DemoState, PinRef, SvgOptResult } from '../demo.state';

const PUBLISH_KEY = 'pynwheel_published_tours';

const collectionOf = (kind: PinRef['kind']) => (kind === 'unit' ? 'units' : 'amenities');

/** Map & Plotting: pins, junctions, edges, site-plan assets, routing, publish. */
export const mapReducers = {
  pickLevel(state: DemoState, action: PayloadAction<string>) {
    state.levelId = action.payload;
    state.selectedNode = null;
    state.edgeFrom = null;
    state.selectedPin = null;
  },

  toggleGrid(state: DemoState) {
    state.gridOn = !state.gridOn;
  },

  pickTool(state: DemoState, action: PayloadAction<string>) {
    state.mapTool = action.payload;
    state.edgeFrom = null;
    state.selectedNode = null;
    state.plotTarget =
      action.payload === 'plot' ? state.plotTarget ?? nextUnplotted(state, '') : null;
  },

  setDropSlot(state: DemoState, action: PayloadAction<string>) {
    state.dropSlot = action.payload;
  },

  setSvgDrag(state: DemoState, action: PayloadAction<boolean>) {
    state.svgDrag = action.payload;
  },

  setBedColor(state: DemoState, action: PayloadAction<{ tier: string; color: string }>) {
    const row = state.bedColors[state.propId] ?? {};
    row[action.payload.tier] = action.payload.color;
    state.bedColors[state.propId] = row;
  },

  /* ---------- site-plan assets ---------- */

  applyPlanUpload(
    state: DemoState,
    action: PayloadAction<{ levelId: string; slot: 'svg' | 'bg'; file?: string }>
  ) {
    const level = levels(state).find((l) => l.id === action.payload.levelId) ?? curLevel(state);
    if (!level) return;
    const slug = `${level.building}-${level.floor}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const file =
      action.payload.file ?? `${slug}${action.payload.slot === 'svg' ? '-floor.svg' : '-background.png'}`;

    state.svgDrag = false;
    state.levelId = level.id;
    if (action.payload.slot === 'svg') state.lvSvg[level.id] = file;
    else state.lvBg[level.id] = file;

    state.toast = `${file} uploaded as the ${
      action.payload.slot === 'svg' ? 'floor SVG' : 'background image'
    } for ${level.building} · ${level.floor}.`;
  },

  removePlanAsset(state: DemoState, action: PayloadAction<{ levelId: string; slot: 'svg' | 'bg' }>) {
    const level = levels(state).find((l) => l.id === action.payload.levelId) ?? curLevel(state);
    if (!level) return;
    if (action.payload.slot === 'svg') state.lvSvg[level.id] = '';
    else state.lvBg[level.id] = '';
    state.toast = `${action.payload.slot === 'svg' ? 'Floor SVG' : 'Background image'} removed from ${level.floor}.`;
  },

  clearPlan(state: DemoState) {
    const level = curLevel(state);
    if (!level) return;
    state.lvSvg[level.id] = '';
    state.lvBg[level.id] = '';
    state.toast = 'Site plan removed.';
  },

  optimizeSvg(state: DemoState, action: PayloadAction<string>) {
    const seed = [...String(action.payload)].reduce((total, c) => total + c.charCodeAt(0), 0);
    const beforeKb = 140 + (seed % 210);
    const nodesBefore = 900 + (seed % 1800);
    const afterKb = Math.round(beforeKb * (0.34 + (seed % 12) / 100));
    const nodesAfter = Math.round(nodesBefore * (0.52 + (seed % 16) / 100));
    const result: SvgOptResult = {
      beforeKb,
      afterKb,
      nodesBefore,
      nodesAfter,
      valid: seed % 7 !== 0,
      pathsAfter: Math.round(nodesAfter * 0.22)
    };
    state.svgOpt[action.payload] = result;
    state.toast = `SVG optimized — ${beforeKb} KB → ${afterKb} KB.`;
  },

  /* ---------- pins ---------- */

  armPlot(state: DemoState, action: PayloadAction<PinRef & { levelId?: string }>) {
    state.plotTarget = { kind: action.payload.kind, id: action.payload.id };
    state.mapTool = 'plot';
    state.selectedPin = null;
    state.selectedNode = null;
    if (action.payload.levelId) state.levelId = action.payload.levelId;
  },

  clearPlotTarget(state: DemoState) {
    state.plotTarget = null;
    state.mapTool = 'select';
  },

  selectPin(state: DemoState, action: PayloadAction<PinRef | null>) {
    state.selectedPin = action.payload;
    state.selectedNode = null;
  },

  startPinDrag(state: DemoState, action: PayloadAction<PinRef>) {
    state.dragPin = action.payload;
    state.selectedPin = action.payload;
    state.selectedNode = null;
  },

  placePin(state: DemoState, action: PayloadAction<{ x: number; y: number }>) {
    const target = state.plotTarget;
    if (!target) return;
    const inv = state.inv[state.propId];
    if (!inv) return;
    const item = inv[collectionOf(target.kind)].find((o) => o.id === target.id);
    if (!item) return;

    item.plotted = true;
    item.px = action.payload.x;
    item.py = action.payload.y;
    item.plevel = state.levelId;

    const next = nextUnplotted(state, target.id);
    state.selectedPin = { kind: target.kind, id: target.id };
    state.plotTarget = next;
    state.mapTool = next ? 'plot' : 'select';

    const nextName = next
      ? curInv(state)[collectionOf(next.kind)].find((o) => o.id === next.id)?.name
      : undefined;
    state.toast = `${item.name} placed at ${Math.round(action.payload.x)}%, ${Math.round(
      action.payload.y
    )}%${next ? ` · next: ${nextName ?? ''}` : ' · nothing left to plot on this floor'}`;
  },

  dragPinTo(state: DemoState, action: PayloadAction<{ x: number; y: number }>) {
    const dragging = state.dragPin;
    if (!dragging) return;
    const item = state.inv[state.propId]?.[collectionOf(dragging.kind)].find((o) => o.id === dragging.id);
    if (!item) return;
    item.px = action.payload.x;
    item.py = action.payload.y;
  },

  endDrag(state: DemoState) {
    state.draggingId = null;
    state.dragPin = null;
  },

  removePin(state: DemoState) {
    const selected = state.selectedPin;
    if (!selected) return;
    const item = state.inv[state.propId]?.[collectionOf(selected.kind)].find((o) => o.id === selected.id);
    if (!item) return;
    item.plotted = false;
    item.px = undefined;
    item.py = undefined;
    state.selectedPin = null;
    state.toast = `${item.name} removed from the plan.`;
  },

  movePinToThisFloor(state: DemoState) {
    const selected = state.selectedPin;
    if (!selected) return;
    const level = curLevel(state);
    const item = state.inv[state.propId]?.[collectionOf(selected.kind)].find((o) => o.id === selected.id);
    if (!item || !level) return;
    item.plevel = level.id;
    state.toast = `${item.name} moved to ${level.building} · ${level.floor}.`;
  },

  runAutoPlot(state: DemoState, action: PayloadAction<AutoPlotReport & { placements: Array<PinRef & { lv: string; x: number; y: number }> }>) {
    const inv = state.inv[state.propId];
    if (!inv) return;
    action.payload.placements.forEach((placement) => {
      const item = inv[collectionOf(placement.kind)].find((o) => o.id === placement.id);
      if (!item) return;
      item.plotted = true;
      item.px = placement.x;
      item.py = placement.y;
      item.plevel = placement.lv;
    });
    state.autoPlotReport = {
      placed: action.payload.placed,
      skipped: action.payload.skipped,
      when: 'just now'
    };
    state.toast = `Auto-Plot placed ${action.payload.placed} of ${
      action.payload.placed + action.payload.skipped.length
    } pins${action.payload.skipped.length ? ` · ${action.payload.skipped.length} could not be placed.` : '.'}`;
  },

  dismissAutoPlot(state: DemoState) {
    state.autoPlotReport = null;
  },

  /* ---------- graph nodes ---------- */

  addJunction(state: DemoState, action: PayloadAction<{ x: number; y: number }>) {
    const tour = state.tours[state.propId];
    if (!tour) return;
    const junction = {
      id: uid('j'),
      x: action.payload.x,
      y: action.payload.y,
      level: state.levelId,
      label: 'Node'
    };
    tour.junctions.push(junction);
    tour.published = false;
    state.selectedNode = junction.id;
  },

  selectNode(state: DemoState, action: PayloadAction<string | null>) {
    state.selectedNode = action.payload;
  },

  startNodeDrag(state: DemoState, action: PayloadAction<string>) {
    state.draggingId = action.payload;
    state.selectedNode = action.payload;
    state.selectedPin = null;
  },

  dragNodeTo(state: DemoState, action: PayloadAction<{ x: number; y: number }>) {
    const id = state.draggingId;
    const tour = state.tours[state.propId];
    if (!id || !tour) return;
    const stop = tour.stops.find((n) => n.id === id);
    if (stop) {
      stop.x = action.payload.x;
      stop.y = action.payload.y;
    }
    const junction = tour.junctions.find((n) => n.id === id);
    if (junction) {
      junction.x = action.payload.x;
      junction.y = action.payload.y;
    }
    tour.published = false;
  },

  startEdge(state: DemoState, action: PayloadAction<string | null>) {
    state.edgeFrom = action.payload;
    if (action.payload) state.selectedNode = action.payload;
  },

  connectNodes(state: DemoState, action: PayloadAction<{ from: string; to: string }>) {
    const tour = state.tours[state.propId];
    if (!tour) return;
    const { from, to } = action.payload;
    const exists = tour.edges.some((e) => (e[0] === from && e[1] === to) || (e[0] === to && e[1] === from));
    if (!exists) tour.edges.push([from, to]);
    tour.published = false;
    state.edgeFrom = null;
    state.selectedNode = to;
    state.toast = 'Connected.';
  },

  renameSelectedNode(state: DemoState, action: PayloadAction<string>) {
    const id = state.selectedNode;
    const tour = state.tours[state.propId];
    if (!id || !tour) return;
    const stop = tour.stops.find((n) => n.id === id);
    if (stop) stop.name = action.payload;
    const junction = tour.junctions.find((n) => n.id === id);
    if (junction) junction.label = action.payload;
    tour.published = false;
  },

  deleteSelectedNode(state: DemoState) {
    const id = state.selectedNode;
    const tour = state.tours[state.propId];
    if (!id || !tour) return;
    tour.stops = tour.stops.filter((n) => n.id !== id);
    tour.junctions = tour.junctions.filter((n) => n.id !== id);
    tour.edges = tour.edges.filter((e) => e[0] !== id && e[1] !== id);
    tour.published = false;
    state.selectedNode = null;
    state.toast = 'Node deleted.';
  },

  setStartPoint(state: DemoState) {
    const id = state.selectedNode;
    const tour = state.tours[state.propId];
    if (!id || !tour) return;
    const node = nodeById(state, id);
    const level = levels(state).find((l) => l.id === node?.level) ?? curLevel(state);
    if (!level) return;
    tour.startPoints[level.building] = id;
    tour.published = false;
    state.toast = `${node?.name ?? 'Node'} set as the starting point for ${level.building}.`;
  },

  /* ---------- routing ---------- */

  setRouteEnd(state: DemoState, action: PayloadAction<{ key: 'routeFrom' | 'routeTo'; value: string }>) {
    state[action.payload.key] = action.payload.value;
  },

  setRouteResult(state: DemoState, action: PayloadAction<{ text: string; color: string }>) {
    state.routeResult = action.payload.text;
    state.routeColor = action.payload.color;
  },

  /* ---------- publish ---------- */

  publishTour(state: DemoState, action: PayloadAction<{ pins: number }>) {
    const tour = state.tours[state.propId];
    const prop = curProp(state);
    if (!tour || !prop) return;

    tour.published = true;
    tour.publishedAt = new Date().toISOString();
    if (!isProdStage(prop.stage)) prop.stage = 'production';

    try {
      const raw = localStorage.getItem(PUBLISH_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[prop.id] = {
        propertyId: prop.id,
        propertyName: prop.name,
        city: prop.city,
        publishedAt: Date.now(),
        stops: tour.stops.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          icon: s.icon,
          floorLabel: s.floorLabel,
          distance: s.distance,
          duration: s.duration,
          top: `${Math.round(s.y)}%`,
          left: `${Math.round(s.x)}%`
        })),
        edges: tour.edges
      };
      localStorage.setItem(PUBLISH_KEY, JSON.stringify(all));
    } catch {
      /* private mode / storage disabled — the demo works without it */
    }

    state.toast = `Published! ${plural(tour.stops.length, 'stop')} and ${plural(
      action.payload.pins,
      'pin'
    )} live on the touch app.`;
  }
};
