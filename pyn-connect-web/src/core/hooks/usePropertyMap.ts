'use client';

import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_API } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { PropertyMap, RouteLeg, WayfindingRoute } from '~/core/models/data/propertyMap.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { runLocalAutoPlot } from '~/core/utils/generator/map/autoPlot';
import { generateMapLevels, levelById, planAssets, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { generateAllGraphs, generatePinItems, type LevelGraph } from '~/core/utils/generator/map/mapNodes.generator';
import {
  generateBedLegend,
  generateLevelTabs,
  generateMapHint,
  generatePlanInfo,
  generatePlotSummary,
  generatePublishSummary,
  generateSelectedPin,
  generateSelection,
  generateStartPointRows,
  generateTools,
  generateVerticalLinks,
  levelForLeg
} from '~/core/utils/generator/map/mapPanels.generator';
import {
  NODE_ANCHOR_OFFSET,
  edgeKey,
  initialLocalMapState,
  nodeKey,
  pinKey,
  toPercent,
  type BedTier,
  type ConfirmState,
  type LocalMapState,
  type MapTool,
  type PinRef,
  type RouteState
} from '~/core/utils/generator/map/mapState';
import { M, coordText, plural, t } from '~/core/utils/generator/map/mapText';
import { computeLocalRoute } from '~/core/utils/wayfinding/localRoute';

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
 * pins placed or moved, junctions, connections, starting points, plan files,
 * marker colours and routes live in `LocalMapState` until the page reloads,
 * and no action sends anything but the one read that runs the CMS algorithm.
 */
export const usePropertyMap = (map: PropertyMap) => {
  const dispatch = useAppDispatch();
  const levels = useMemo(() => generateMapLevels(map), [map]);
  const [state, setState] = useState<LocalMapState>(() => initialLocalMapState(levels[0]?.id ?? ''));
  const planRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlot = useRef<'svg' | 'bg'>('svg');

  const level = levelById(levels, state.levelId) ?? levels[0] ?? null;
  const graphs = useMemo(() => generateAllGraphs(map, levels, state), [map, levels, state]);
  const graph: LevelGraph | null = level ? (graphs[level.id] ?? null) : null;
  const dims = graph?.dims ?? null;

  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const patch = useCallback((update: (current: LocalMapState) => Partial<LocalMapState>) => {
    setState((current) => ({ ...current, ...update(current) }));
  }, []);

  /** Pointer position in the level's pixels (its image's natural size). */
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
  const itemOf = useCallback((ref: PinRef) => pinItems.find((item) => item.key === pinKey(ref)) ?? null, [pinItems]);

  const nextUnplotted = useCallback(
    (skip: PinRef | null, levelId: string): PinRef | null => {
      const pool = pinItems.filter((item) => !item.placed && (!skip || item.key !== pinKey(skip)));
      const same = pool.find((item) => item.level?.id === levelId);
      const pick = same ?? pool[0];
      return pick ? pick.ref : null;
    },
    [pinItems]
  );

  /* ── levels and tools ─────────────────────────────────────────────── */

  const pickLevel = useCallback(
    (id: string) => patch(() => ({ levelId: id, selectedNode: null, selectedEdge: null, selectedPin: null, chainFrom: null })),
    [patch]
  );

  const pickTool = useCallback(
    (tool: MapTool) =>
      patch((current) => {
        const next: Partial<LocalMapState> = { tool, selectedNode: null, selectedEdge: null };
        if (tool !== 'edge') next.edgeFrom = null;
        next.plotTarget = tool === 'plot' ? (current.plotTarget ?? nextUnplotted(null, current.levelId)) : null;
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

  const toggleHallways = useCallback(() => pickTool(state.tool === 'hallway' ? 'select' : 'hallway'), [pickTool, state.tool]);
  const toggleGrid = useCallback(() => patch((current) => ({ gridOn: !current.gridOn })), [patch]);
  const toggleSvgLayer = useCallback(() => patch((current) => ({ svgLayer: !current.svgLayer })), [patch]);

  /* ── placing pins ─────────────────────────────────────────────────── */

  const armPlot = useCallback(
    (ref: PinRef) => {
      const item = itemOf(ref);
      if (!item) return;
      patch((current) => ({
        tool: 'plot',
        plotTarget: ref,
        selectedNode: null,
        selectedEdge: null,
        selectedPin: null,
        levelId: item.level ? item.level.id : current.levelId
      }));
      toast(t(M.toast.armed, { name: item.label }));
    },
    [itemOf, patch, toast]
  );

  const clearPlotTarget = useCallback(() => patch(() => ({ plotTarget: null, tool: 'select' })), [patch]);

  const placePin = useCallback(
    (px: { x: number; y: number }) => {
      const target = state.plotTarget;
      const item = target && itemOf(target);
      if (!target || !item || !level || !dims) return;
      const next = nextUnplotted(target, level.id);
      patch((current) => ({
        pinOverrides: { ...current.pinOverrides, [pinKey(target)]: { levelId: level.id, x: px.x, y: px.y } },
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
    [dims, itemOf, level, nextUnplotted, patch, state.plotTarget, toast]
  );

  /* ── nodes and connections ────────────────────────────────────────── */

  const addJunction = useCallback(
    (px: { x: number; y: number }, chainFrom: string | null) => {
      if (!level) return;
      patch((current) => {
        const key = nodeKey('junction', current.nextJunction);
        const tempEdges = chainFrom ? [...current.tempEdges, { a: chainFrom, b: key }] : current.tempEdges;
        return {
          tempNodes: [...current.tempNodes, { key, levelId: level.id, x: px.x, y: px.y, label: `Node ${current.nextJunction}` }],
          tempEdges,
          nextJunction: current.nextJunction + 1,
          selectedNode: key,
          selectedEdge: null,
          chainFrom: chainFrom ? key : current.chainFrom
        };
      });
      if (chainFrom) toast(i18n.t(M.toast.hallwayAdded));
    },
    [level, patch, toast]
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
      if (!exists) toast(i18n.t(M.toast.connected));
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
      patch(() => ({ selectedNode: key, selectedEdge: null, selectedPin: null }));
    },
    [connectNodes, patch, state.edgeFrom, state.tool]
  );

  const onPinDown = useCallback(
    (ref: PinRef) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.tool === 'move') {
        capture(event);
        patch(() => ({ dragging: { kind: 'pin', ref }, selectedPin: ref, selectedNode: null, selectedEdge: null }));
        return;
      }
      patch(() => ({ selectedPin: ref, selectedNode: null, selectedEdge: null }));
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
      if (state.tool === 'plot' && state.plotTarget && px) {
        placePin(px);
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
      patch(() => ({ selectedNode: null, selectedEdge: null, selectedPin: null }));
    },
    [addJunction, patch, placePin, pointerPx, state.chainFrom, state.plotTarget, state.tool]
  );

  const onSurfaceMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragging = state.dragging;
      if (!dragging || !level) return;
      const px = pointerPx(event);
      if (!px) return;
      if (dragging.kind === 'pin') {
        patch((current) => ({
          pinOverrides: { ...current.pinOverrides, [pinKey(dragging.ref)]: { levelId: level.id, x: px.x, y: px.y } }
        }));
      } else if (dragging.key.startsWith('j:')) {
        patch((current) => ({
          tempNodes: current.tempNodes.map((node) => (node.key === dragging.key ? { ...node, x: px.x, y: px.y } : node))
        }));
      } else {
        patch((current) => ({ nodeOverrides: { ...current.nodeOverrides, [dragging.key]: { x: px.x, y: px.y } } }));
      }
    },
    [level, patch, pointerPx, state.dragging]
  );

  const onSurfaceUp = useCallback(() => {
    if (state.dragging) patch(() => ({ dragging: null }));
  }, [patch, state.dragging]);

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

  const askConfirm = useCallback((confirm: ConfirmState) => patch(() => ({ confirm })), [patch]);
  const closeConfirm = useCallback(() => patch(() => ({ confirm: null })), [patch]);

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
    patch((current) => ({ pinOverrides: { ...current.pinOverrides, [pinKey(ref)]: { levelId: level.id, ...target } } }));
    toast(t(M.toast.pinMoved, { name: item.label, level: `${level.sub} · ${level.label}` }));
  }, [dims, itemOf, level, patch, state.selectedPin, toast]);

  /* ── colours, auto-plot, plan files ───────────────────────────────── */

  const setBedColor = useCallback(
    (tier: BedTier, color: string) => patch((current) => ({ bedColors: { ...current.bedColors, [tier]: color } })),
    [patch]
  );

  const autoPlot = useCallback(() => {
    const pool = pinItems.filter((item) => !item.placed);
    if (!pool.length) {
      toast(i18n.t(M.place.autoPlotNothing));
      return;
    }
    askConfirm({
      title: t(M.place.autoPlotTitle, { count: plural(pool.length, M.place.itemOne, M.place.itemMany) }),
      message: i18n.t(M.place.autoPlotBody),
      label: i18n.t(M.tools.autoPlot),
      onConfirm: () => {
        const result = runLocalAutoPlot(map, levels, state);
        patch((current) => ({
          pinOverrides: { ...current.pinOverrides, ...result.overrides },
          autoPlotReport: result.report,
          confirm: null
        }));
        toast(t(M.toast.autoPlot, { placed: result.report.placed, total: result.report.total }));
      }
    });
  }, [askConfirm, levels, map, patch, pinItems, state, toast]);

  const dismissAutoPlot = useCallback(() => patch(() => ({ autoPlotReport: null })), [patch]);

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
      const url = URL.createObjectURL(file);
      patch((current) => ({
        planOverrides: {
          ...current.planOverrides,
          [level.id]: { ...current.planOverrides[level.id], removed: false, [slot]: { name: file.name, url } }
        },
        svgDrag: false
      }));
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
        patch((current) => ({ planOverrides: { ...current.planOverrides, [level.id]: { removed: true } }, confirm: null }));
        toast(i18n.t(M.toast.planRemoved));
      }
    });
  }, [askConfirm, level, patch, toast]);

  /* ── routes ───────────────────────────────────────────────────────── */

  const startRoute = useCallback(
    (route: RouteState) => {
      const first = route.legs[0] && levelForLeg(levels, route.legs[0]);
      patch(() => ({ route, levelId: first ? first.id : state.levelId, selectedNode: null, selectedEdge: null }));
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
    const leg: RouteLeg | null = level ? computeLocalRoute(map, levels, graphs, level, state) : null;
    startRoute({ source: 'local', status: leg ? 'done' : 'empty', legs: leg ? [leg] : [], revealed: 0 });
  }, [graphs, level, levels, map, startRoute, state]);

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
    if (!route || !level || !dims || route.status !== 'done') return [];
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
          x1: toPercent(a.x + NODE_ANCHOR_OFFSET, dims.w),
          y1: toPercent(a.y + NODE_ANCHOR_OFFSET, dims.h),
          x2: toPercent(b.x + NODE_ANCHOR_OFFSET, dims.w),
          y2: toPercent(b.y + NODE_ANCHOR_OFFSET, dims.h),
          head: seen + 1 === totalRevealed
        });
      }
      seen += 1;
    });
    return lines;
  }, [dims, level, levels, state.route]);

  /* ── misc ─────────────────────────────────────────────────────────── */

  const onImageLoad = useCallback(
    (levelId: string, width: number, height: number) => {
      if (!width || !height) return;
      patch((current) => (current.measured[levelId] ? {} : { measured: { ...current.measured, [levelId]: { w: width, h: height } } }));
    },
    [patch]
  );

  const plotTargetItem = state.plotTarget ? itemOf(state.plotTarget) : null;
  const assets = level ? planAssets(level, state.planOverrides[level.id]) : null;

  return {
    map,
    levels,
    level,
    graph,
    graphs,
    state,
    planRef,
    fileInputRef,
    tabs: generateLevelTabs(levels, state),
    tools: generateTools(state),
    hint: generateMapHint(state, plotTargetItem?.label ?? null),
    cursor: state.tool === 'junction' || state.tool === 'hallway' ? 'copy' : state.tool === 'move' ? 'grab' : state.tool === 'plot' ? 'crosshair' : 'default',
    assets,
    planInfo: level && graph ? generatePlanInfo(level, graph, state) : null,
    plotSummary: useMemo(() => generatePlotSummary(map, levels, state), [map, levels, state]),
    plotArmedLabel: plotTargetItem && state.tool === 'plot' ? t(M.plan.armed, { name: plotTargetItem.label }) : null,
    selectedPin: generateSelectedPin(map, levels, state),
    selection: graph ? generateSelection(graph, state) : null,
    startPoints: useMemo(() => generateStartPointRows(map, levels, graphs, state), [map, levels, graphs, state]),
    verticalLinks: level ? generateVerticalLinks(levels, level, graphs, state) : [],
    bedLegend: generateBedLegend(map, state),
    publishSummary: useMemo(() => generatePublishSummary(map, levels, graphs, state), [map, levels, graphs, state]),
    routeLines,
    actions: {
      pickLevel,
      pickTool,
      toggleHallways,
      toggleGrid,
      toggleSvgLayer,
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
      autoPlot,
      dismissAutoPlot,
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
      openPublish: () => patch(() => ({ publishOpen: true })),
      closePublish: () => patch(() => ({ publishOpen: false })),
      runCmsRoute,
      runLocalRoute,
      clearRoute,
      onImageLoad,
      closeConfirm
    }
  };
};

export type PropertyMapController = ReturnType<typeof usePropertyMap>;
