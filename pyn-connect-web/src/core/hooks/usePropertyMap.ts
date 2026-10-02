'use client';

import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_API } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { PropertyMap, RouteLeg, WayfindingRoute } from '~/core/models/data/propertyMap.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import {
  AP_PRESETS,
  apAnalyze,
  apDefault,
  apDraftProblem,
  apIsDefault,
  apSuggest,
  apUnitNo,
  type ApDir,
  type ApLevelInput,
  type ApRules,
  type ApTrim
} from '~/core/utils/map/autoPlotRules';
import { measureFloorSvg, type PlotTarget } from '~/core/utils/map/floorSvg';
import {
  activeSpace,
  generateMapLevels,
  levelById,
  levelSpaceDims,
  levelsOfBuilding,
  mapBuildings,
  planAssets,
  wayfindingSpace,
  type MapLevel
} from '~/core/utils/generator/map/mapLevels.generator';
import {
  generateAllGraphs,
  generatePinItems,
  generateRasterGraphs,
  generateWayfindingGraphs,
  svgDocOf,
  unitNumber,
  type LevelGraph,
  type PinItem
} from '~/core/utils/generator/map/mapNodes.generator';
import {
  generateAutoPlotMenu,
  generateBedLegend,
  generateBuildingPills,
  generateLevelTabs,
  generateMapHint,
  generatePlanInfo,
  generatePlotPanel,
  generatePolygons,
  generatePublishSummary,
  generateSelectedPin,
  generateSelectedPolygon,
  generateSelection,
  generateStartPointRows,
  generateTools,
  generateVerticalLinks,
  itemsOfLevel,
  levelForLeg
} from '~/core/utils/generator/map/mapPanels.generator';
import {
  NODE_ANCHOR_OFFSET,
  edgeKey,
  initialLocalMapState,
  nodeKey,
  parsePinKey,
  pinKey,
  toPercent,
  type ApScope,
  type ApStep,
  type AutoPlotState,
  type BedTier,
  type ConfirmState,
  type LocalMapState,
  type MapTool,
  type PinOverride,
  type PinRef,
  type PlanSpace,
  type RouteState
} from '~/core/utils/generator/map/mapState';
import { M, coordText, plural, t } from '~/core/utils/generator/map/mapText';
import { computeLocalRoute } from '~/core/utils/wayfinding/localRoute';
import { useMapWayfinding } from './useMapWayfinding';

/** How long each route point stays hidden before the animation reveals it. */
const REVEAL_MS = 300;

export interface RouteLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** The last revealed segment, drawn brighter. */
  head: boolean;
}

/**
 * All of the Map & Plotting screen's state. The stored map never changes here:
 * pins placed, dropped onto polygons or moved, junctions, connections,
 * starting points, plan files, marker colours, Auto Plot results and routes
 * live in `LocalMapState` until the page reloads, and no action sends
 * anything but reads (the floor SVGs, and the one that runs the CMS
 * algorithm).
 */
export interface MapInitial {
  levelId: string | null;
  /** A pin key (`unit:12`) to select, or to arm for plotting when `arm` is set. */
  pin: string | null;
  arm: boolean;
}

export const usePropertyMap = (map: PropertyMap, initial: MapInitial | null = null) => {
  const dispatch = useAppDispatch();
  const levels = useMemo(() => generateMapLevels(map), [map]);
  const buildings = useMemo(() => mapBuildings(map, levels), [map, levels]);
  const [state, setState] = useState<LocalMapState>(() => {
    const first = (initial?.levelId && levels.find((row) => row.id === initial.levelId)) || levels[0] || null;
    // A floor with both a floor SVG and an image shows the SVG: plotting drops onto its polygons (the design has no layer switch).
    const base = initialLocalMapState(first?.id ?? '', buildings.length > 1 ? (first?.building ?? buildings[0]) : null, 'svg');
    const pin = initial?.pin ? parsePinKey(initial.pin) : null;
    if (!pin) return base;
    return initial?.arm ? { ...base, tool: 'plot', plotTarget: pin } : { ...base, selectedPin: pin };
  });
  const planRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlot = useRef<'svg' | 'bg'>('svg');
  const loading = useRef(new Set<string>());

  const level = levelById(levels, state.levelId) ?? levels[0] ?? null;
  const space: PlanSpace = level ? activeSpace(level, state) : 'raster';
  const graphs = useMemo(() => generateAllGraphs(map, levels, state), [map, levels, state]);
  const rasterGraphs = useMemo(() => generateRasterGraphs(map, levels, state), [map, levels, state]);
  const wayfindingGraphs = useMemo(() => generateWayfindingGraphs(map, levels, state), [map, levels, state]);
  const graph: LevelGraph | null = level ? (graphs[level.id] ?? null) : null;
  const dims = graph?.dims ?? null;
  const svgDoc = svgDocOf(state, level);
  const assets = level ? planAssets(level, state.planOverrides[level.id]) : null;

  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const patch = useCallback((update: (current: LocalMapState) => Partial<LocalMapState>) => {
    setState((current) => ({ ...current, ...update(current) }));
  }, []);

  const askConfirm = useCallback((confirm: ConfirmState) => patch(() => ({ confirm })), [patch]);
  const closeConfirm = useCallback(() => patch(() => ({ confirm: null })), [patch]);

  /** Pointer position in the layer's own units (image pixels, or viewBox units). */
  const pointerPx = useCallback(
    (event: { clientX: number; clientY: number }): { x: number; y: number } | null => {
      const element = planRef.current;
      if (!element || !dims) return null;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const fx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const fy = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      return { x: Math.round(fx * dims.w), y: Math.round(fy * dims.h) };
    },
    [dims]
  );

  const pinItems = useMemo(() => generatePinItems(map, levels, state), [map, levels, state]);

  /** A level's floor SVG as text, for Detect Hallways: the copy this page already loaded, else a GET through the plan-svg route. */
  const svgDocsRef = useRef(state.svgDocs);
  svgDocsRef.current = state.svgDocs;
  const fetchSvgText = useCallback(
    async (target: MapLevel): Promise<string> => {
      const loaded = svgDocsRef.current[target.id];
      if (loaded?.status === 'ready') return loaded.doc.text;
      const own = planAssets(target, state.planOverrides[target.id]);
      if (!own.svg) throw new Error('no svg');
      const url = own.svg.local ? own.svg.url : APP_API.planSvg(map.inventory.property.id, { kind: target.kind, id: target.recordId });
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    },
    [map.inventory.property.id, state.planOverrides]
  );

  const wayfinding = useMapWayfinding({ map, levels, level, state, patch, graphs: wayfindingGraphs, toast, askConfirm, pointerPx, fetchSvgText });
  const itemOf = useCallback((ref: PinRef) => pinItems.find((item) => item.key === pinKey(ref)) ?? null, [pinItems]);
  const itemByKey = useCallback((key: string) => pinItems.find((item) => item.key === key) ?? null, [pinItems]);

  const nextUnplotted = useCallback(
    (skip: PinRef | null, levelId: string): PinRef | null => {
      const pool = pinItems.filter((item) => !item.placed && (!skip || item.key !== pinKey(skip)));
      const same = pool.find((item) => item.level?.id === levelId);
      const pick = same ?? pool[0];
      return pick ? pick.ref : null;
    },
    [pinItems]
  );

  /* ── floor SVGs ───────────────────────────────────────────────────── */

  const loadSvg = useCallback(
    async (target: MapLevel) => {
      const own = planAssets(target, state.planOverrides[target.id]);
      if (!own.svg || loading.current.has(target.id)) return;
      loading.current.add(target.id);
      patch((current) => ({ svgDocs: { ...current.svgDocs, [target.id]: { status: 'loading' } } }));
      try {
        const url = own.svg.local ? own.svg.url : APP_API.planSvg(map.inventory.property.id, { kind: target.kind, id: target.recordId });
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const text = await response.text();
        const doc = measureFloorSvg(text);
        patch((current) => ({ svgDocs: { ...current.svgDocs, [target.id]: { status: 'ready', doc } } }));
      } catch {
        patch((current) => ({ svgDocs: { ...current.svgDocs, [target.id]: { status: 'failed' } } }));
      } finally {
        loading.current.delete(target.id);
      }
    },
    [map.inventory.property.id, patch, state.planOverrides]
  );

  // The level in view loads its floor SVG; the Auto Plot wizard loads its scope's.
  const apScopeLevels = useCallback(
    (ap: AutoPlotState | null): MapLevel[] => {
      if (!ap) return [];
      if (ap.scope === 'all') return levels;
      if (ap.scope === 'building') return levelsOfBuilding(levels, ap.building).filter((row) => row.building === ap.building || ap.building == null);
      return levels.filter((row) => row.id === ap.levelId);
    },
    [levels]
  );

  useEffect(() => {
    const wanted = level ? [level, ...apScopeLevels(state.ap)] : apScopeLevels(state.ap);
    wanted.forEach((target) => {
      if (!state.svgDocs[target.id]) void loadSvg(target);
    });
  }, [level, state.ap, state.svgDocs, apScopeLevels, loadSvg]);

  /* ── buildings, levels, layers and tools ───────────────────────────── */

  const pickLevel = useCallback(
    (id: string) =>
      patch((current) => ({
        levelId: id,
        selectedNode: null,
        selectedEdge: null,
        selectedPin: null,
        chainFrom: null,
        selPoly: null,
        polyHover: null,
        plotUnSel: [],
        plotSel: current.levelId === id ? current.plotSel : [],
        plotFloor: current.levelId === id ? current.plotFloor : null,
        wfSel: null,
        wfSelEdge: null,
        wfFrom: null,
        selStop: null,
        stopTarget: null,
        wfPick: null,
        // A route across floors stays (its steps switch floors); one on a single floor belongs to that floor.
        wfRoute: current.wfRoute?.ok && current.wfRoute.multi ? current.wfRoute : null,
        wfAnim: current.wfAnim ? { ...current.wfAnim, playing: false } : null
      })),
    [patch]
  );

  const pickBuilding = useCallback(
    (name: string) => {
      const first = levelsOfBuilding(levels, name).find((row) => row.building === name) ?? levelsOfBuilding(levels, name)[0] ?? null;
      patch((current) => ({
        building: name,
        levelId: first ? first.id : current.levelId,
        plotSel: [],
        plotUnSel: [],
        plotFloor: null,
        selPoly: null,
        polyHover: null,
        selectedNode: null,
        selectedEdge: null,
        selectedPin: null,
        wfSel: null,
        wfSelEdge: null,
        wfFrom: null,
        selStop: null,
        stopTarget: null,
        wfPick: null
      }));
    },
    [levels, patch]
  );

  const pickLayer = useCallback((layer: PlanSpace) => patch(() => ({ layer, selPoly: null, polyHover: null, selectedNode: null, selectedEdge: null })), [patch]);

  const pickTool = useCallback(
    (tool: MapTool) =>
      patch((current) => {
        const next: Partial<LocalMapState> = { tool, selectedNode: null, selectedEdge: null, polyHover: null };
        if (tool !== 'edge') next.edgeFrom = null;
        next.plotTarget = tool === 'plot' ? (current.plotTarget ?? (current.plotSel.length ? null : nextUnplotted(null, current.levelId))) : null;
        if (tool !== 'plot') next.plotSel = current.plotSel;
        if (tool === 'hallway') {
          // The legacy editor chains from the map's `selected` hallway, or the selected node.
          const levelGraph = graphs[current.levelId];
          const selected = current.selectedNode && levelGraph?.nodes.some((node) => node.key === current.selectedNode) ? current.selectedNode : null;
          const stored = map.graph.hallways.find(
            (hallway) => hallway.selected && levelGraph?.nodes.some((node) => node.key === nodeKey('hallway', hallway.id))
          );
          next.chainFrom = selected ?? (stored ? nodeKey('hallway', stored.id) : (levelGraph?.nodes.filter((node) => node.kind === 'hallway' || node.kind === 'junction').at(-1)?.key ?? null));
          next.selectedNode = next.chainFrom;
        } else {
          next.chainFrom = null;
        }
        return next;
      }),
    [graphs, map.graph.hallways, nextUnplotted, patch]
  );

  const toggleManualPlot = useCallback(() => {
    const on = state.tool !== 'plot';
    pickTool(on ? 'plot' : 'select');
    if (on && !state.plotSel.length && space === 'svg') toast(i18n.t(M.toast.manualPlotOn));
  }, [pickTool, space, state.plotSel.length, state.tool, toast]);

  const toggleHallways = useCallback(() => pickTool(state.tool === 'hallway' ? 'select' : 'hallway'), [pickTool, state.tool]);
  const toggleGrid = useCallback(() => patch((current) => ({ gridOn: !current.gridOn })), [patch]);

  /* ── the To Plot / Plotted lists ──────────────────────────────────── */

  const togglePlotSel = useCallback(
    (key: string) =>
      patch((current) => ({
        plotSel: current.plotSel.includes(key) ? current.plotSel.filter((row) => row !== key) : [...current.plotSel, key],
        plotTarget: null
      })),
    [patch]
  );
  const setPlotSel = useCallback((keys: string[]) => patch(() => ({ plotSel: keys, plotTarget: null })), [patch]);
  const toggleUnSel = useCallback(
    (key: string) =>
      patch((current) => ({ plotUnSel: current.plotUnSel.includes(key) ? current.plotUnSel.filter((row) => row !== key) : [...current.plotUnSel, key] })),
    [patch]
  );
  const setUnSel = useCallback((keys: string[]) => patch(() => ({ plotUnSel: keys })), [patch]);
  const setPlotTab = useCallback((tab: 'todo' | 'done') => patch(() => ({ plotTab: tab })), [patch]);
  const setPlotQuery = useCallback((query: string) => patch(() => ({ plotQuery: query })), [patch]);

  /* ── placing pins ─────────────────────────────────────────────────── */

  const armPlot = useCallback(
    (ref: PinRef) => {
      const item = itemOf(ref);
      if (!item) return;
      patch((current) => ({
        tool: 'plot',
        plotTarget: ref,
        plotSel: [],
        selectedNode: null,
        selectedEdge: null,
        selectedPin: null,
        levelId: item.level ? item.level.id : current.levelId
      }));
      toast(t(M.toast.armed, { name: item.label }));
    },
    [itemOf, patch, toast]
  );

  const clearPlotTarget = useCallback(() => patch(() => ({ plotTarget: null, plotSel: [], tool: 'select', stopTarget: null })), [patch]);

  const placePin = useCallback(
    (px: { x: number; y: number }) => {
      const target = state.plotTarget;
      const item = target && itemOf(target);
      if (!target || !item || !level || !dims) return;
      const next = nextUnplotted(target, level.id);
      patch((current) => ({
        pinOverrides: { ...current.pinOverrides, [pinKey(target)]: { levelId: level.id, x: px.x, y: px.y, space, polygon: null } },
        selectedPin: target,
        plotTarget: next,
        tool: next ? 'plot' : 'select'
      }));
      const nextItem = next && itemOf(next);
      toast(
        `${t(M.toast.placed, { name: item.label, coord: coordText(toPercent(px.x, dims.w), toPercent(px.y, dims.h)) })} ${
          nextItem ? t(M.toast.next, { name: nextItem.label }) : i18n.t(M.toast.nothingLeft)
        }`
      );
    },
    [dims, itemOf, level, nextUnplotted, patch, space, state.plotTarget, toast]
  );

  /** Manual Plot: the ticked items (or the armed one) land on a polygon. */
  const dropOnPolygon = useCallback(
    (target: PlotTarget) => {
      if (!level) return;
      const keys = state.plotSel.length ? state.plotSel : state.plotTarget ? [pinKey(state.plotTarget)] : [];
      const items = keys.map(itemByKey).filter((item): item is PinItem => !!item);
      if (!items.length) {
        // Ticked stops sit on the floor image, not on a polygon: Wayfinding shows the image to place them on.
        const stop = keys.find((key) => key.startsWith('stop:'));
        const row = stop ? wayfinding.plate?.stops.find((candidate) => `stop:${candidate.key}` === stop) : null;
        if (row) wayfinding.actions.armStop(row.key, level.id, row.label);
        else toast(i18n.t(M.toast.nothingSelected));
        return;
      }
      const override: PinOverride = { levelId: level.id, x: target.cx, y: target.cy, space: 'svg', polygon: target.key };
      patch((current) => ({
        pinOverrides: { ...current.pinOverrides, ...Object.fromEntries(items.map((item) => [item.key, override])) },
        plotSel: [],
        plotTarget: null,
        selPoly: null,
        selectedPin: items.length === 1 ? items[0].ref : null
      }));
      toast(t(M.toast.dropped, { what: items.length === 1 ? items[0].label : plural(items.length, M.place.itemOne, M.place.itemMany), code: target.code }));
    },
    [itemByKey, level, patch, state.plotSel, state.plotTarget, toast, wayfinding.actions, wayfinding.plate?.stops]
  );

  const clickPolygon = useCallback(
    (target: PlotTarget) => {
      if (state.tool === 'plot' && (state.plotSel.length || state.plotTarget)) {
        dropOnPolygon(target);
        return;
      }
      patch((current) => ({ selPoly: current.selPoly === target.key ? null : target.key, selectedPin: null, selectedNode: null, selectedEdge: null }));
    },
    [dropOnPolygon, patch, state.plotSel.length, state.plotTarget, state.tool]
  );

  const hoverPolygon = useCallback((key: string | null) => patch((current) => (current.polyHover === key ? {} : { polyHover: key })), [patch]);
  const closeSelPoly = useCallback(() => patch(() => ({ selPoly: null })), [patch]);

  const unplotItems = useCallback(
    (keys: string[]) => {
      const stopKeys = keys.filter((key) => key.startsWith('stop:')).map((key) => key.slice('stop:'.length));
      const stops = (wayfinding.plate?.stops ?? []).filter((stop) => stopKeys.includes(stop.key) && stop.placed);
      const items = keys.map(itemByKey).filter((item): item is PinItem => !!item && item.placed);
      if (!items.length && !stops.length) return;
      if (stops.length) wayfinding.actions.unplotStops(stops.map((stop) => stop.key));
      patch((current) => ({
        pinOverrides: { ...current.pinOverrides, ...Object.fromEntries(items.map((item) => [item.key, null])) },
        plotUnSel: current.plotUnSel.filter((key) => !keys.includes(key)),
        selectedPin: current.selectedPin && keys.includes(pinKey(current.selectedPin)) ? null : current.selectedPin
      }));
      const names = [...items.map((item) => item.label), ...stops.map((stop) => stop.label)];
      toast(names.length === 1 ? t(M.toast.pinRemoved, { name: names[0] }) : t(M.toast.unplotted, { count: names.length }));
    },
    [itemByKey, patch, toast, wayfinding.actions, wayfinding.plate?.stops]
  );


  const unplotMany = useCallback(() => {
    const keys = state.plotUnSel;
    if (!keys.length) return;
    askConfirm({
      title: t(M.place.unplotTitle, { items: plural(keys.length, M.place.itemOne, M.place.itemMany) }),
      message: i18n.t(M.place.unplotBody),
      label: i18n.t(M.place.unplot),
      danger: true,
      onConfirm: () => {
        unplotItems(keys);
        patch(() => ({ confirm: null }));
      }
    });
  }, [askConfirm, patch, state.plotUnSel, unplotItems]);

  /* ── nodes and connections ────────────────────────────────────────── */

  const addJunction = useCallback(
    (px: { x: number; y: number }, chainFrom: string | null) => {
      if (!level) return;
      patch((current) => {
        const key = nodeKey('junction', current.nextJunction);
        const tempEdges = chainFrom ? [...current.tempEdges, { a: chainFrom, b: key }] : current.tempEdges;
        return {
          tempNodes: [...current.tempNodes, { key, levelId: level.id, x: px.x, y: px.y, label: `Node ${current.nextJunction}`, space }],
          tempEdges,
          nextJunction: current.nextJunction + 1,
          selectedNode: key,
          selectedEdge: null,
          chainFrom: chainFrom ? key : current.chainFrom
        };
      });
      if (chainFrom) toast(i18n.t(M.toast.hallwayAdded));
    },
    [level, patch, space, toast]
  );

  const connectNodes = useCallback(
    (a: string, b: string) => {
      const exists =
        state.tempEdges.some((edge) => edgeKey(edge.a, edge.b) === edgeKey(a, b)) ||
        Object.values(graphs).some((levelGraph) => levelGraph.edges.some((edge) => edge.key === edgeKey(a, b)));
      patch((current) => ({
        tempEdges: exists ? current.tempEdges : [...current.tempEdges, { a, b }],
        edgeFrom: null,
        selectedNode: b,
        selectedEdge: null
      }));
      toast(i18n.t(exists ? M.toast.alreadyConnected : M.toast.connected));
    },
    [graphs, patch, state.tempEdges, toast]
  );

  const capture = (event: ReactPointerEvent<Element>) => {
    try {
      (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(event.pointerId);
    } catch {
      /* best effort */
    }
  };

  const onNodeDown = useCallback(
    (key: string) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.tool === 'edge') {
        if (!state.edgeFrom) patch(() => ({ edgeFrom: key, selectedNode: key, selectedEdge: null, selectedPin: null }));
        else if (state.edgeFrom === key) patch(() => ({ edgeFrom: null }));
        else connectNodes(state.edgeFrom, key);
        return;
      }
      if (state.tool === 'move') {
        capture(event);
        patch(() => ({ dragging: { kind: 'node', key }, selectedNode: key, selectedEdge: null, selectedPin: null }));
        return;
      }
      if (state.tool === 'hallway') {
        patch(() => ({ chainFrom: key, selectedNode: key, selectedEdge: null, selectedPin: null }));
        return;
      }
      // A stop (elevator, entry / exit, tour start, access point) opens its popover: Move, Unplot.
      if (wayfinding.enabled && wayfinding.plate?.stops.some((stop) => stop.key === key)) {
        patch(() => ({ selStop: key, selectedNode: null, selectedEdge: null, selectedPin: null, selPoly: null }));
        return;
      }
      patch(() => ({ selectedNode: key, selectedEdge: null, selectedPin: null, selPoly: null, selStop: null }));
    },
    [connectNodes, patch, state.edgeFrom, state.tool, wayfinding.enabled, wayfinding.plate?.stops]
  );

  const onPinDown = useCallback(
    (ref: PinRef) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.tool === 'move') {
        capture(event);
        patch(() => ({ dragging: { kind: 'pin', ref }, selectedPin: ref, selectedNode: null, selectedEdge: null }));
        return;
      }
      patch(() => ({ selectedPin: ref, selectedNode: null, selectedEdge: null, selPoly: null }));
    },
    [patch, state.tool]
  );

  const onEdgeDown = useCallback(
    (key: string) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.tool !== 'select') return;
      patch(() => ({ selectedEdge: key, selectedNode: null, selectedPin: null }));
    },
    [patch, state.tool]
  );

  const onSurfaceDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if ((event.target as Element).closest('[data-node]')) return;
      const px = pointerPx(event);
      // Stops go on the level's Wayfinding layer (the floor image, or the SVG its hallways came from).
      if (state.stopTarget && px && level && space === (wayfindingSpace(level, state) ?? 'raster')) {
        wayfinding.actions.placeStops([state.stopTarget], px);
        return;
      }
      if (wayfinding.wayfind) {
        wayfinding.actions.onSurfaceDown(px);
        return;
      }
      const tickedStops = state.plotSel.filter((key) => key.startsWith('stop:')).map((key) => key.slice('stop:'.length));
      if (state.tool === 'plot' && tickedStops.length && px && level && space === (wayfindingSpace(level, state) ?? 'raster')) {
        wayfinding.actions.placeStops(tickedStops, px);
        return;
      }
      if (state.tool === 'plot' && state.plotTarget && px) {
        placePin(px);
        return;
      }
      if (state.tool === 'plot' && state.plotSel.length && px) {
        toast(i18n.t(space === 'svg' ? M.toast.clickPolygon : M.toast.armOne));
        return;
      }
      if (state.tool === 'junction' && px) {
        addJunction(px, null);
        return;
      }
      if (state.tool === 'hallway' && px) {
        addJunction(px, state.chainFrom);
        return;
      }
      patch(() => ({ selectedNode: null, selectedEdge: null, selectedPin: null, selPoly: null, selStop: null }));
    },
    [addJunction, patch, placePin, pointerPx, space, state.chainFrom, state.plotSel, state.plotTarget, state.stopTarget, state.tool, toast, wayfinding.actions, wayfinding.wayfind]
  );

  const onSurfaceMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragging = state.dragging;
      if (!dragging || !level) return;
      const px = pointerPx(event);
      if (!px) return;
      if (dragging.kind === 'bend') {
        // A press that travels less than the POC's click slop (4 px) is a click on the path, not a bend.
        const moved = dragging.moved || Math.hypot(event.clientX - dragging.client.x, event.clientY - dragging.client.y) > 4;
        patch((current) => (current.dragging?.kind === 'bend' ? { dragging: { ...current.dragging, drop: px, moved } } : {}));
        return;
      }
      if (dragging.kind === 'node' && !dragging.moved) patch((current) => (current.dragging?.kind === 'node' ? { dragging: { ...current.dragging, moved: true } } : {}));
      if (dragging.kind === 'pin') {
        patch((current) => ({
          pinOverrides: { ...current.pinOverrides, [pinKey(dragging.ref)]: { levelId: level.id, x: px.x, y: px.y, space, polygon: null } }
        }));
      } else if (dragging.key.startsWith('n:')) {
        patch((current) => ({
          tempStops: current.tempStops.map((stop) => (stop.key === dragging.key ? { ...stop, x: px.x, y: px.y } : stop))
        }));
      } else if (dragging.key.startsWith('j:')) {
        patch((current) => ({
          tempNodes: current.tempNodes.map((node) => (node.key === dragging.key ? { ...node, x: px.x, y: px.y } : node))
        }));
      } else {
        patch((current) => ({ nodeOverrides: { ...current.nodeOverrides, [dragging.key]: { x: px.x, y: px.y } } }));
      }
    },
    [level, patch, pointerPx, space, state.dragging]
  );

  const onSurfaceUp = useCallback(() => {
    const dragging = state.dragging;
    if (!dragging) return;
    patch(() => ({ dragging: null }));
    if (wayfinding.wayfind && dragging.kind === 'node') wayfinding.actions.onDragEnd(dragging);
    if (wayfinding.wayfind && dragging.kind === 'bend') wayfinding.actions.onBendEnd(dragging);
  }, [patch, state.dragging, wayfinding.actions, wayfinding.wayfind]);

  const renameSelected = useCallback(
    (label: string) =>
      patch((current) => ({
        tempNodes: current.tempNodes.map((node) => (node.key === current.selectedNode ? { ...node, label } : node))
      })),
    [patch]
  );

  const deleteSelected = useCallback(() => {
    patch((current) => {
      if (current.selectedNode) {
        const key = current.selectedNode;
        const temporary = key.startsWith('j:');
        const tempEdges = current.tempEdges.filter((edge) => edge.a !== key && edge.b !== key);
        return {
          tempNodes: temporary ? current.tempNodes.filter((node) => node.key !== key) : current.tempNodes,
          tempEdges,
          hiddenNodes: temporary ? current.hiddenNodes : [...current.hiddenNodes, key],
          selectedNode: null,
          chainFrom: current.chainFrom === key ? null : current.chainFrom,
          edgeFrom: current.edgeFrom === key ? null : current.edgeFrom
        };
      }
      if (current.selectedEdge) {
        const key = current.selectedEdge;
        const temporary = current.tempEdges.some((edge) => edgeKey(edge.a, edge.b) === key);
        return {
          tempEdges: temporary ? current.tempEdges.filter((edge) => edgeKey(edge.a, edge.b) !== key) : current.tempEdges,
          hiddenEdges: temporary ? current.hiddenEdges : [...current.hiddenEdges, key],
          selectedEdge: null
        };
      }
      return {};
    });
    toast(i18n.t(state.selectedEdge ? M.toast.edgeDeleted : M.toast.nodeDeleted));
  }, [patch, state.selectedEdge, toast]);

  const setStartPoint = useCallback(() => {
    const key = state.selectedNode;
    const node = key ? graph?.nodes.find((row) => row.key === key) : null;
    if (!key || !node || !level) return;
    const building = level.building ?? map.graph.buildings[0] ?? map.graph.tour?.building ?? map.inventory.property.name;
    patch((current) => ({ startOverrides: { ...current.startOverrides, [building]: key } }));
    toast(t(M.toast.startSet, { name: node.label, building }));
  }, [graph, level, map, patch, state.selectedNode, toast]);

  /* ── the selected pin ─────────────────────────────────────────────── */

  const removePin = useCallback(() => {
    const ref = state.selectedPin;
    const item = ref && itemOf(ref);
    if (!ref || !item) return;
    askConfirm({
      title: t(M.pin.removeTitle, { name: item.label }),
      message: t(M.pin.removeBody, { name: item.label }),
      label: i18n.t(M.pin.remove),
      danger: true,
      onConfirm: () => {
        patch((current) => ({ pinOverrides: { ...current.pinOverrides, [pinKey(ref)]: null }, selectedPin: null, confirm: null }));
        toast(t(M.toast.pinRemoved, { name: item.label }));
      }
    });
  }, [askConfirm, itemOf, patch, state.selectedPin, toast]);

  const movePinHere = useCallback(() => {
    const ref = state.selectedPin;
    const item = ref && itemOf(ref);
    if (!ref || !item || !level) return;
    const target = dims ? { x: Math.round(dims.w / 2), y: Math.round(dims.h / 2) } : { x: 0, y: 0 };
    patch((current) => ({ pinOverrides: { ...current.pinOverrides, [pinKey(ref)]: { levelId: level.id, space, polygon: null, ...target } } }));
    toast(t(M.toast.pinMoved, { name: item.label, level: `${level.sub} · ${level.label}` }));
  }, [dims, itemOf, level, patch, space, state.selectedPin, toast]);

  /* ── colours, plan files ──────────────────────────────────────────── */

  const setBedColor = useCallback(
    (tier: BedTier, color: string) => patch((current) => ({ bedColors: { ...current.bedColors, [tier]: color } })),
    [patch]
  );

  const openFilePicker = useCallback((slot: 'svg' | 'bg') => {
    pendingSlot.current = slot;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = slot === 'svg' ? '.svg,image/svg+xml' : 'image/png,image/jpeg,image/svg+xml';
    input.click();
  }, []);

  const applyLocalFile = useCallback(
    (file: File, slot: 'svg' | 'bg') => {
      if (!level) return;
      if (slot === 'svg' && !/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
        toast(i18n.t(M.toast.notSvg));
        patch(() => ({ svgDrag: false }));
        return;
      }
      const url = URL.createObjectURL(file);
      patch((current) => {
        const svgDocs = { ...current.svgDocs };
        if (slot === 'svg') delete svgDocs[level.id];
        return {
          planOverrides: {
            ...current.planOverrides,
            [level.id]: { ...current.planOverrides[level.id], removed: false, [slot]: { name: file.name, url } }
          },
          svgDocs,
          layer: slot === 'svg' ? 'svg' : current.layer,
          svgDrag: false
        };
      });
      toast(t(M.toast.fileLocal, { file: file.name, level: `${level.sub} · ${level.label}` }));
    },
    [level, patch, toast]
  );

  const onFilePicked = useCallback(
    (file: File | null) => {
      if (file) applyLocalFile(file, pendingSlot.current);
    },
    [applyLocalFile]
  );

  const clearPlan = useCallback(() => {
    if (!level) return;
    askConfirm({
      title: t(M.plan.removeTitle, { level: `${level.sub} · ${level.label}` }),
      message: i18n.t(M.plan.removeBody),
      label: i18n.t(M.plan.removePlan),
      danger: true,
      onConfirm: () => {
        patch((current) => {
          const svgDocs = { ...current.svgDocs };
          delete svgDocs[level.id];
          return { planOverrides: { ...current.planOverrides, [level.id]: { removed: true } }, svgDocs, confirm: null };
        });
        toast(i18n.t(M.toast.planRemoved));
      }
    });
  }, [askConfirm, level, patch, toast]);

  /* ── Auto Plot ────────────────────────────────────────────────────── */

  const apLevels = useCallback(
    (ap: AutoPlotState): ApLevelInput[] =>
      apScopeLevels(ap).map((row) => {
        const own = planAssets(row, state.planOverrides[row.id]);
        const doc = svgDocOf(state, row);
        const scope = itemsOfLevel(pinItems, row).filter((item) => !item.placed);
        return {
          id: row.id,
          name: `${row.sub} · ${row.label}`,
          building: row.building,
          floors: row.floors,
          hasSvg: !!own.svg,
          // Units match unit polygons; an amenities layer's shapes are plotted by hand.
          targets: own.svg ? (doc ? doc.targets.filter((target) => target.category !== 'amenity') : null) : [],
          units: scope
            .filter((item) => item.kind === 'unit')
            .map((item) => {
              const unit = map.inventory.units.find((candidate) => candidate.id === item.ref.id);
              return { key: item.key, name: item.label, number: unit ? unitNumber(unit) : item.label, floor: item.floor, building: item.building };
            }),
          amenities: scope.filter((item) => item.kind === 'amenity').map((item) => ({ key: item.key, name: item.label }))
        };
      }),
    [apScopeLevels, map.inventory.units, pinItems, state]
  );

  const apAnalysis = useMemo(() => (state.ap ? apAnalyze(apLevels(state.ap), state.ap.rules, state.ap.manual) : null), [apLevels, state.ap]);
  const apPreview = useMemo(() => (state.ap ? apAnalyze(apLevels(state.ap), state.ap.draft, {}, true) : null), [apLevels, state.ap]);
  const apCurrentMatched = useMemo(() => (state.ap ? apAnalyze(apLevels(state.ap), state.ap.rules, {}, true).matched : 0), [apLevels, state.ap]);
  const apSuggestion = useMemo(
    () => (state.ap && state.ap.step === 'analyze' && apAnalysis && apAnalysis.unmatched > 0 ? apSuggest(apLevels(state.ap), state.ap.rules) : null),
    [apAnalysis, apLevels, state.ap]
  );

  const patchAp = useCallback((update: (ap: AutoPlotState) => Partial<AutoPlotState>) => {
    setState((current) => (current.ap ? { ...current, ap: { ...current.ap, ...update(current.ap) } } : current));
  }, []);

  const openAutoPlot = useCallback(
    (scope: ApScope) => {
      if (!level) return;
      const own = planAssets(level, state.planOverrides[level.id]);
      if (scope === 'one' && !own.svg) {
        toast(t(M.toast.needSvg, { level: `${level.sub} · ${level.label}` }));
        patch(() => ({ apMenuOpen: false }));
        return;
      }
      const remembered = state.apPatterns[level.building ?? ''];
      const rules: ApRules = { ...apDefault('pms'), ...(remembered ?? {}) };
      patch(() => ({
        apMenuOpen: false,
        ap: { step: 'analyze', scope, levelId: level.id, building: level.building, rules, draft: { ...rules, replaces: rules.replaces.map((r) => ({ ...r })) }, manual: {}, remember: true, placed: 0, left: [] }
      }));
    },
    [level, patch, state.apPatterns, state.planOverrides, toast]
  );

  const apGo = useCallback(
    (step: ApStep) => patchAp((ap) => ({ step, draft: step === 'pattern' ? { ...ap.rules, replaces: ap.rules.replaces.map((r) => ({ ...r })) } : ap.draft })),
    [patchAp]
  );

  const apDraft = useCallback((update: Partial<ApRules>) => patchAp((ap) => ({ draft: { ...ap.draft, ...update } })), [patchAp]);

  const apSetDir = useCallback(
    (dir: ApDir) =>
      patchAp((ap) => {
        const pattern = String(ap.draft.pattern || '');
        const next = dir === 'svg' ? pattern.replace(/\{unit\}/g, '{id}') : pattern.replace(/\{id\}/g, '{unit}');
        return { draft: { ...ap.draft, dir, pattern: next || (dir === 'svg' ? '{id}' : '{unit}') } };
      }),
    [patchAp]
  );

  const apApply = useCallback(() => {
    const ap = state.ap;
    if (!ap) return;
    const problem = apDraftProblem(ap.draft);
    if (problem) {
      toast(i18n.t(M.autoPlot.problems[problem as keyof typeof M.autoPlot.problems]));
      return;
    }
    patchAp((current) => ({ rules: { ...current.draft, replaces: current.draft.replaces.map((r) => ({ ...r })) }, step: 'analyze' }));
    toast(i18n.t(M.toast.patternApplied));
  }, [patchAp, state.ap, toast]);

  const apUseSuggest = useCallback(() => {
    if (!apSuggestion) return;
    const rules = apSuggestion.rules;
    patchAp(() => ({ rules, draft: { ...rules } }));
    toast(t(M.toast.suggestionApplied, { count: apSuggestion.matched }));
  }, [apSuggestion, patchAp, toast]);

  const apSetManual = useCallback(
    (unitKey: string, targetKey: string) =>
      patchAp((ap) => {
        const manual = { ...ap.manual };
        if (targetKey) manual[unitKey] = targetKey;
        else delete manual[unitKey];
        return { manual };
      }),
    [patchAp]
  );

  const apRun = useCallback(() => {
    const ap = state.ap;
    if (!ap || !apAnalysis) return;
    const ok = apAnalysis.rows.filter((row) => row.ok && row.target);
    if (apAnalysis.loading) {
      toast(i18n.t(M.toast.svgStillLoading));
      return;
    }
    const overrides = Object.fromEntries(
      ok.map((row) => [row.key, { levelId: row.levelId, x: row.target!.cx, y: row.target!.cy, space: 'svg' as const, polygon: row.target!.key } satisfies PinOverride])
    );
    const left = apAnalysis.rows
      .filter((row) => !row.ok)
      .map((row) => ({
        name: row.name,
        where: row.levelName,
        reason:
          row.how === 'amenity'
            ? i18n.t(M.autoPlot.reasonAmenity)
            : row.how === 'nosvg'
              ? i18n.t(M.autoPlot.reasonNoSvg)
              : t(M.autoPlot.reasonNoPolygon, { key: row.pmsKey })
      }));
    const scopeName = apScopeName(ap);
    patch((current) => ({
      pinOverrides: { ...current.pinOverrides, ...overrides },
      ap: current.ap ? { ...current.ap, step: 'done', placed: ok.length, left } : null,
      apPatterns:
        ap.remember && !apIsDefault(ap.rules) && ap.building != null
          ? { ...current.apPatterns, [ap.building]: ap.rules }
          : current.apPatterns,
      autoPlotReport: { placed: ok.length, total: apAnalysis.rows.length, skipped: left }
    }));
    toast(t(M.toast.autoPlot, { placed: plural(ok.length, M.autoPlot.unitOne, M.autoPlot.unitMany), scope: scopeName }));
  }, [apAnalysis, patch, state.ap, toast]);

  const apScopeName = (ap: AutoPlotState): string => {
    const own = levelById(levels, ap.levelId) ?? level;
    if (ap.scope === 'all') return `${i18n.t(M.autoPlot.allPlates)} · ${map.inventory.property.name}`;
    if (ap.scope === 'building') return `${i18n.t(M.autoPlot.allPlates)} · ${ap.building ?? own?.sub ?? ''}`;
    return own ? `${own.sub} · ${own.label}` : '';
  };

  const apClose = useCallback(() => patch(() => ({ ap: null })), [patch]);
  const apFinishManual = useCallback(() => {
    patch(() => ({ ap: null, tool: 'plot', plotTab: 'todo', plotTarget: null }));
    toast(i18n.t(M.toast.manualPlotRest));
  }, [patch, toast]);

  /* ── routes ───────────────────────────────────────────────────────── */

  const startRoute = useCallback(
    (route: RouteState) => {
      const first = route.legs[0] && levelForLeg(levels, route.legs[0]);
      patch(() => ({ route, levelId: first ? first.id : state.levelId, layer: 'raster', selectedNode: null, selectedEdge: null }));
    },
    [levels, patch, state.levelId]
  );

  const runCmsRoute = useCallback(async () => {
    patch(() => ({ route: { source: 'cms', status: 'running', legs: [], revealed: 0 } }));
    try {
      const response = await fetch(APP_API.wayfindingRoute(map.inventory.property.id), {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const body = (await response.json()) as { ok: boolean; route?: WayfindingRoute; error?: string };
      if (response.status === 401) {
        patch(() => ({ route: { source: 'cms', status: 'unauthorized', legs: [], revealed: 0 } }));
        return;
      }
      if (!body.ok || !body.route) {
        patch(() => ({ route: { source: 'cms', status: 'failed', legs: [], revealed: 0 } }));
        return;
      }
      const legs = body.route.legs;
      startRoute({ source: 'cms', status: legs.length ? 'done' : 'empty', legs, revealed: 0 });
    } catch {
      patch(() => ({ route: { source: 'cms', status: 'failed', legs: [], revealed: 0 } }));
    }
  }, [map.inventory.property.id, patch, startRoute]);

  const runLocalRoute = useCallback(() => {
    const leg: RouteLeg | null = level ? computeLocalRoute(map, levels, rasterGraphs, level, state) : null;
    startRoute({ source: 'local', status: leg ? 'done' : 'empty', legs: leg ? [leg] : [], revealed: 0 });
  }, [level, levels, map, rasterGraphs, startRoute, state]);

  const clearRoute = useCallback(() => patch(() => ({ route: null })), [patch]);

  // Reveal the route point by point, following it onto the floor it walks on.
  useEffect(() => {
    const route = state.route;
    if (!route || route.status !== 'done') return undefined;
    const total = route.legs.reduce((sum, leg) => sum + leg.points.length, 0);
    if (route.revealed >= total) return undefined;
    const timer = window.setTimeout(() => {
      setState((current) => {
        if (!current.route || current.route !== route) return current;
        const revealed = route.revealed + 1;
        let index = revealed - 1;
        let levelId = current.levelId;
        for (const leg of route.legs) {
          if (index < leg.points.length) {
            const target = levelForLeg(levels, leg);
            if (target) levelId = target.id;
            break;
          }
          index -= leg.points.length;
        }
        return { ...current, route: { ...route, revealed }, levelId };
      });
    }, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [levels, state.route]);

  const routeLines = useMemo((): RouteLine[] => {
    const route = state.route;
    if (!route || !level || route.status !== 'done' || space !== 'raster') return [];
    const rasterDims = levelSpaceDims(level, state, 'raster');
    if (!rasterDims) return [];
    const lines: RouteLine[] = [];
    let remaining = route.revealed;
    const totalRevealed = route.revealed;
    let seen = 0;
    route.legs.forEach((leg) => {
      const onThisLevel = levelForLeg(levels, leg)?.id === level.id;
      const visible = Math.max(0, Math.min(leg.points.length, remaining));
      remaining -= leg.points.length;
      if (!onThisLevel) {
        seen += leg.points.length;
        return;
      }
      for (let i = 1; i < visible; i += 1) {
        const a = leg.points[i - 1];
        const b = leg.points[i];
        seen += 1;
        lines.push({
          x1: toPercent(a.x + NODE_ANCHOR_OFFSET, rasterDims.w),
          y1: toPercent(a.y + NODE_ANCHOR_OFFSET, rasterDims.h),
          x2: toPercent(b.x + NODE_ANCHOR_OFFSET, rasterDims.w),
          y2: toPercent(b.y + NODE_ANCHOR_OFFSET, rasterDims.h),
          head: seen + 1 === totalRevealed
        });
      }
      seen += 1;
    });
    return lines;
  }, [level, levels, space, state]);

  /* ── misc ─────────────────────────────────────────────────────────── */

  const onImageLoad = useCallback(
    (levelId: string, width: number, height: number) => {
      if (!width || !height) return;
      patch((current) => (current.measured[levelId] ? {} : { measured: { ...current.measured, [levelId]: { w: width, h: height } } }));
    },
    [patch]
  );

  const plotTargetItem = state.plotTarget ? itemOf(state.plotTarget) : null;
  const polygons = useMemo(() => generatePolygons(space === 'svg' ? svgDoc : null, graph, state), [graph, space, state, svgDoc]);
  const svgState = level ? state.svgDocs[level.id] ?? null : null;

  return {
    map,
    levels,
    level,
    space,
    graph,
    graphs,
    rasterGraphs,
    state,
    planRef,
    fileInputRef,
    svgDoc,
    svgStatus: assets?.svg ? (svgState?.status ?? 'loading') : null,
    polygons,
    selectedPolygon: level ? generateSelectedPolygon(level, polygons, state) : null,
    buildings: useMemo(() => generateBuildingPills(map, levels, state), [map, levels, state]),
    tabs: useMemo(
      () => generateLevelTabs(map, levels, pinItems, state, wayfinding.wayfind ? wayfinding.plates : null),
      [map, levels, pinItems, state, wayfinding.plates, wayfinding.wayfind]
    ),
    tools: generateTools(state),
    hint: generateMapHint(state, plotTargetItem?.label ?? null, space === 'svg'),
    cursor: state.stopTarget
      ? 'crosshair'
      : wayfinding.wayfind
        ? // Add Point, and no tool (a click on the plan adds a point, as in the POC).
          state.wfTool === 'node' || state.wfTool == null
          ? 'crosshair'
          : 'default'
        : state.tool === 'junction' || state.tool === 'hallway'
          ? 'copy'
          : state.tool === 'move'
            ? 'grab'
            : state.tool === 'plot'
              ? 'crosshair'
              : 'default',
    assets,
    planInfo: level && graph ? generatePlanInfo(level, graph, state) : null,
    plotPanel: useMemo(
      () => generatePlotPanel(map, levels, level, pinItems, graphs, state, wayfinding.enabled ? (wayfinding.plate?.stops ?? []) : null),
      [map, levels, level, pinItems, graphs, state, wayfinding.enabled, wayfinding.plate]
    ),
    wayfinding,
    autoPlotMenu: useMemo(() => generateAutoPlotMenu(map, levels, level, pinItems), [map, levels, level, pinItems]),
    ap: state.ap,
    apAnalysis,
    apPreview,
    apCurrentMatched,
    apSuggestion,
    apScopeName: state.ap ? apScopeName(state.ap) : '',
    apPresets: state.ap ? AP_PRESETS[state.ap.draft.dir] : [],
    apUnitNo,
    plotArmedLabel: state.stopTarget
      ? t(M.wayfinding.armedStop, { name: wayfinding.plate?.stops.find((stop) => stop.key === state.stopTarget)?.label ?? '' })
      : wayfinding.wayfind
        ? null
        : state.tool === 'plot'
        ? plotTargetItem
          ? t(M.plan.armed, { name: plotTargetItem.label })
          : state.plotSel.length
            ? t(M.plan.armedMany, { count: plural(state.plotSel.length, M.place.itemOne, M.place.itemMany), it: state.plotSel.length === 1 ? i18n.t(M.plan.it) : i18n.t(M.plan.them) })
            : i18n.t(space === 'svg' ? M.plan.manualOn : M.plan.manualOnImage)
        : null,
    selectedPin: generateSelectedPin(map, levels, state),
    selection: graph ? generateSelection(graph, state) : null,
    startPoints: useMemo(() => generateStartPointRows(map, levels, rasterGraphs, state), [map, levels, rasterGraphs, state]),
    verticalLinks: level ? generateVerticalLinks(levels, level, rasterGraphs, state) : [],
    bedLegend: generateBedLegend(map, state),
    publishSummary: useMemo(() => generatePublishSummary(map, levels, rasterGraphs, state), [map, levels, rasterGraphs, state]),
    routeLines,
    actions: {
      pickBuilding,
      pickLevel,
      pickLayer,
      pickTool,
      toggleManualPlot,
      toggleHallways,
      toggleGrid,
      togglePlotSel,
      setPlotSel,
      toggleUnSel,
      setUnSel,
      setPlotTab,
      setPlotQuery,
      clickPolygon,
      hoverPolygon,
      closeSelPoly,
      unplotItems,
      unplotMany,
      onSurfaceDown,
      onSurfaceMove,
      onSurfaceUp,
      onNodeDown,
      onPinDown,
      onEdgeDown,
      armPlot,
      clearPlotTarget,
      renameSelected,
      deleteSelected,
      setStartPoint,
      removePin,
      movePinHere,
      setBedColor,
      openAutoPlotMenu: () => patch((current) => ({ apMenuOpen: !current.apMenuOpen })),
      closeAutoPlotMenu: () => patch(() => ({ apMenuOpen: false })),
      openAutoPlot,
      apGo,
      apDraft,
      apSetDir,
      apInsertToken: (token: string) => patchAp((ap) => ({ draft: { ...ap.draft, pattern: `${ap.draft.pattern || ''}${token}` } })),
      apAddReplace: () => patchAp((ap) => ({ draft: { ...ap.draft, replaces: [...ap.draft.replaces, { find: '', repl: '' }] } })),
      apSetReplace: (index: number, key: 'find' | 'repl', value: string) =>
        patchAp((ap) => ({ draft: { ...ap.draft, replaces: ap.draft.replaces.map((row, position) => (position === index ? { ...row, [key]: value } : row)) } })),
      apDropReplace: (index: number) => patchAp((ap) => ({ draft: { ...ap.draft, replaces: ap.draft.replaces.filter((_row, position) => position !== index) } })),
      apSetTrim: (trim: ApTrim) => patchAp((ap) => ({ draft: { ...ap.draft, trim } })),
      apSetTrimN: (value: string) => {
        const digits = value.replace(/[^0-9]/g, '').slice(0, 2);
        patchAp((ap) => ({ draft: { ...ap.draft, trimN: digits, trim: ap.draft.trim === 'none' && digits ? 'keepLast' : ap.draft.trim } }));
      },
      apStepTrim: (delta: number) =>
        patchAp((ap) => {
          const n = Math.max(0, Math.min(20, (parseInt(ap.draft.trimN, 10) || 0) + delta));
          return { draft: { ...ap.draft, trimN: String(n), trim: ap.draft.trim === 'none' ? 'keepLast' : ap.draft.trim } };
        }),
      apToggleFlag: (flag: 'ignoreSep' | 'ignoreZeros' | 'ignoreCase') => patchAp((ap) => ({ draft: { ...ap.draft, [flag]: !ap.draft[flag] } })),
      apResetDraft: () => patchAp((ap) => ({ draft: { ...apDefault(ap.draft.dir), dir: ap.draft.dir } })),
      apApply,
      apUseSuggest,
      apSetManual,
      apToggleRemember: () => patchAp((ap) => ({ remember: !ap.remember })),
      apRun,
      apClose,
      apFinishManual,
      openFloorplateDialog: () => patch(() => ({ floorplateDialog: true })),
      closeFloorplateDialog: () => patch(() => ({ floorplateDialog: false })),
      uploadSvg: () => openFilePicker('svg'),
      uploadRaster: () => openFilePicker('bg'),
      onFilePicked,
      pickDropSlot: (slot: 'svg' | 'bg') => patch(() => ({ dropSlot: slot })),
      onPlanDragOver: (event: DragEvent) => {
        event.preventDefault();
        if (!state.svgDrag) patch(() => ({ svgDrag: true }));
      },
      onPlanDragLeave: (event: DragEvent) => {
        event.preventDefault();
        if (state.svgDrag) patch(() => ({ svgDrag: false }));
      },
      onPlanDrop: (event: DragEvent) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0] ?? null;
        if (!file) {
          patch(() => ({ svgDrag: false }));
          return;
        }
        applyLocalFile(file, /\.svg$/i.test(file.name) ? 'svg' : state.dropSlot);
      },
      clearPlan,
      retrySvg: () => {
        if (!level) return;
        patch((current) => {
          const svgDocs = { ...current.svgDocs };
          delete svgDocs[level.id];
          return { svgDocs };
        });
      },
      openPublish: () => patch(() => ({ publishOpen: true })),
      closePublish: () => patch(() => ({ publishOpen: false })),
      runCmsRoute,
      runLocalRoute,
      clearRoute,
      onImageLoad,
      closeConfirm,
      dismissAutoPlot: () => patch(() => ({ autoPlotReport: null }))
    }
  };
};

export type PropertyMapController = ReturnType<typeof usePropertyMap>;
