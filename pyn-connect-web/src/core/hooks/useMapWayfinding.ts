'use client';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo } from 'react';

import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { activeSpace, levelById, levelsOfBuilding, planAssets, stackFloor, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import type { LevelGraph } from '~/core/utils/generator/map/mapNodes.generator';
import {
  edgeKey,
  nodeKey,
  type ConfirmState,
  type LocalMapState,
  type MapMode,
  type PlotKind,
  type StopForm,
  type TempStop,
  type WfScope,
  type WfSnapshot,
  type WfTool
} from '~/core/utils/generator/map/mapState';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import {
  defaultStopName,
  effectiveScope,
  generateStopForm,
  generateWayfindingPanel,
  generateWfLayer,
  generateWfToolbar,
  newStopForm,
  stopFormErrors,
  wayfindingEnabled
} from '~/core/utils/generator/map/wayfinding.generator';
import { detectPaths, detectionSites } from '~/core/utils/wayfinding/detectPaths';
import { stopTypeOf } from '~/core/utils/wayfinding/stopTypes';
import { wayfindingPlate, type WfPlate } from '~/core/utils/wayfinding/wayfindingGraph';
import { computeWayfindingRoute, copyKey, defaultPair, parseCopyKey, routeGroups, sampleRoute, type WfRouteInput } from '~/core/utils/wayfinding/wayfindingRoute';

const W = M.wayfinding;

type Patch = (update: (current: LocalMapState) => Partial<LocalMapState>) => void;

interface Options {
  map: PropertyMap;
  levels: MapLevel[];
  level: MapLevel | null;
  state: LocalMapState;
  patch: Patch;
  rasterGraphs: Record<string, LevelGraph>;
  toast: (message: string) => void;
  askConfirm: (confirm: ConfirmState) => void;
  pointerPx: (event: { clientX: number; clientY: number }) => { x: number; y: number } | null;
}

const isPoint = (key: string | null): key is string => !!key && (key.startsWith('h:') || key.startsWith('j:'));

const snapshotOf = (state: LocalMapState): WfSnapshot => ({
  nodeOverrides: state.nodeOverrides,
  tempNodes: state.tempNodes,
  tempEdges: state.tempEdges,
  hiddenNodes: state.hiddenNodes,
  hiddenEdges: state.hiddenEdges,
  wfLinks: state.wfLinks,
  wfEdited: state.wfEdited,
  nextJunction: state.nextJunction
});

/** Clears what a graph change invalidates: the route and its animation. */
const STALE = { wfRoute: null, wfAnim: null } as const;

/**
 * The Wayfinding mode and the Additional Stops: everything the toggle, the
 * side panel, the toolbar, the canvas layer and the Add Additional Stop
 * dialog need, over the screen's one `LocalMapState`. Points, paths, links,
 * detected paths, stops and routes are page state only — no action here
 * sends a request.
 */
export const useMapWayfinding = ({ map, levels, level, state, patch, rasterGraphs, toast, askConfirm, pointerPx }: Options) => {
  const enabled = wayfindingEnabled(map);
  const wayfind = enabled && state.mode === 'wayfind';

  // Every floorplate's view while wayfinding (the cards, the route scopes);
  // only the one in view while plotting (its Additional Stops).
  const plates = useMemo((): Record<string, WfPlate> => {
    const wanted = wayfind ? levels : level ? [level] : [];
    return Object.fromEntries(wanted.map((row) => [row.id, wayfindingPlate(map, levels, row, rasterGraphs[row.id] ?? null, state)]));
  }, [level, levels, map, rasterGraphs, state, wayfind]);
  const plate = level ? (plates[level.id] ?? null) : null;
  const floor = stackFloor(level, state.wfFloor);

  const routeInput = useMemo(
    (): WfRouteInput | null =>
      level && wayfind ? { levels, plates, current: level, floor, scope: effectiveScope(map, levels, state.wfScope), stepFree: state.wfStepFree } : null,
    [floor, level, levels, map, plates, state.wfScope, state.wfStepFree, wayfind]
  );
  const groups = useMemo(() => (routeInput ? routeGroups(routeInput) : []), [routeInput]);
  const pair = useMemo((): [string, string] => (routeInput ? defaultPair(routeInput, groups, state.wfA, state.wfB) : ['', '']), [groups, routeInput, state.wfA, state.wfB]);

  /* ── mode ─────────────────────────────────────────────────────────── */

  const setMode = useCallback(
    (mode: MapMode) =>
      patch((current) => ({
        mode,
        tool: 'select',
        plotTarget: null,
        polyHover: null,
        selPoly: null,
        selectedNode: null,
        selectedEdge: null,
        selectedPin: null,
        wfSel: null,
        wfSelEdge: null,
        wfFrom: null,
        wfMenuOpen: false,
        apMenuOpen: false,
        wfPick: null,
        selStop: null,
        stopTarget: mode === current.mode ? current.stopTarget : null,
        wfAnim: current.wfAnim ? { ...current.wfAnim, playing: false } : null
      })),
    [patch]
  );

  /* ── graph edits ──────────────────────────────────────────────────── */

  const edited = (current: LocalMapState, levelId: string): Partial<LocalMapState> => ({
    wfEdited: { ...current.wfEdited, [levelId]: 'edited' },
    ...STALE
  });

  const toggleEdge = useCallback(
    (a: string, b: string): 'added' | 'removed' | null => {
      if (!level || a === b) return null;
      const key = edgeKey(a, b);
      const sameKey = (edge: { a: string; b: string }) => edgeKey(edge.a, edge.b) === key;
      if (state.tempEdges.some(sameKey)) {
        patch((current) => ({ tempEdges: current.tempEdges.filter((edge) => !sameKey(edge)), ...edited(current, level.id) }));
        return 'removed';
      }
      if (state.hiddenEdges.includes(key)) {
        patch((current) => ({ hiddenEdges: current.hiddenEdges.filter((row) => row !== key), ...edited(current, level.id) }));
        return 'added';
      }
      if (rasterGraphs[level.id]?.edges.some((edge) => edge.key === key && !edge.temporary)) {
        patch((current) => ({ hiddenEdges: [...current.hiddenEdges, key], ...edited(current, level.id) }));
        return 'removed';
      }
      patch((current) => ({ tempEdges: [...current.tempEdges, { a, b }], ...edited(current, level.id) }));
      return 'added';
    },
    [level, patch, rasterGraphs, state.hiddenEdges, state.tempEdges]
  );

  const removePoint = useCallback(
    (key: string) => {
      if (!level) return;
      patch((current) => ({
        tempNodes: key.startsWith('j:') ? current.tempNodes.filter((node) => node.key !== key) : current.tempNodes,
        tempEdges: current.tempEdges.filter((edge) => edge.a !== key && edge.b !== key),
        hiddenNodes: key.startsWith('h:') && !current.hiddenNodes.includes(key) ? [...current.hiddenNodes, key] : current.hiddenNodes,
        wfSel: current.wfSel === key ? null : current.wfSel,
        wfFrom: current.wfFrom === key ? null : current.wfFrom,
        ...edited(current, level.id)
      }));
    },
    [level, patch]
  );

  const removePath = useCallback(
    (key: string) => {
      if (!level) return;
      patch((current) => {
        const temporary = current.tempEdges.some((edge) => edgeKey(edge.a, edge.b) === key);
        return {
          tempEdges: temporary ? current.tempEdges.filter((edge) => edgeKey(edge.a, edge.b) !== key) : current.tempEdges,
          hiddenEdges: temporary || current.hiddenEdges.includes(key) ? current.hiddenEdges : [...current.hiddenEdges, key],
          wfSelEdge: current.wfSelEdge === key ? null : current.wfSelEdge,
          ...edited(current, level.id)
        };
      });
    },
    [level, patch]
  );

  const addPoint = useCallback(
    (px: { x: number; y: number }, chainFrom: string | null, split: string | null = null) => {
      if (!level) return;
      patch((current) => {
        const key = nodeKey('junction', current.nextJunction);
        let tempEdges = current.tempEdges;
        let hiddenEdges = current.hiddenEdges;
        if (split) {
          const [a, b] = split.split('|');
          const temporary = tempEdges.some((edge) => edgeKey(edge.a, edge.b) === split);
          tempEdges = temporary ? tempEdges.filter((edge) => edgeKey(edge.a, edge.b) !== split) : tempEdges;
          if (!temporary && !hiddenEdges.includes(split)) hiddenEdges = [...hiddenEdges, split];
          tempEdges = [...tempEdges, { a, b: key }, { a: key, b }];
          if (chainFrom && chainFrom !== a && chainFrom !== b) tempEdges = [...tempEdges, { a: chainFrom, b: key }];
        } else if (chainFrom) {
          tempEdges = [...tempEdges, { a: chainFrom, b: key }];
        }
        return {
          tempNodes: [...current.tempNodes, { key, levelId: level.id, x: px.x, y: px.y, label: t(W.pointLabel, { n: current.nextJunction }), space: 'raster' }],
          tempEdges,
          hiddenEdges,
          nextJunction: current.nextJunction + 1,
          wfSel: key,
          wfSelEdge: null,
          ...edited(current, level.id)
        };
      });
    },
    [level, patch]
  );

  const linkAnchor = useCallback(
    (anchorKey: string, point: string, name: string) => {
      if (!level) return;
      patch((current) => ({ wfLinks: { ...current.wfLinks, [`${level.id}|${anchorKey}`]: point }, wfFrom: null, wfSel: point, ...edited(current, level.id) }));
      toast(t(W.toast.linked, { name }));
    },
    [level, patch, toast]
  );

  const anchorName = useCallback((key: string) => plate?.anchors.find((anchor) => anchor.key === key)?.label ?? plate?.stops.find((stop) => stop.key === key)?.label ?? key, [plate]);

  /* ── pointer handlers (the canvas calls these in Wayfinding mode) ─── */

  const capture = (event: ReactPointerEvent<Element>) => {
    try {
      (event.currentTarget as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(event.pointerId);
    } catch {
      /* best effort */
    }
  };

  const onPointDown = useCallback(
    (key: string) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.stopTarget) return;
      const tool: WfTool = state.wfTool;
      if (tool === 'move') {
        capture(event);
        patch(() => ({ dragging: { kind: 'node', key }, wfSel: key, wfSelEdge: null, wfFrom: null, selStop: null }));
        return;
      }
      if (tool === 'erase') {
        removePoint(key);
        toast(i18n.t(W.toast.pointRemoved));
        return;
      }
      if (tool === 'connect') {
        const from = state.wfFrom;
        if (!from) {
          patch(() => ({ wfFrom: key, wfSel: key, wfSelEdge: null }));
          return;
        }
        if (from === key) {
          patch(() => ({ wfFrom: null, wfSel: null }));
          return;
        }
        if (isPoint(from)) {
          const outcome = toggleEdge(from, key);
          patch(() => ({ wfFrom: key, wfSel: key, wfSelEdge: null }));
          toast(i18n.t(outcome === 'removed' ? W.toast.unlinked : W.toast.connected));
          return;
        }
        linkAnchor(from, key, anchorName(from));
        return;
      }
      // Add Point: a click on a point links the chain to it; on the selected one, ends the chain.
      if (state.wfSel === key) {
        patch(() => ({ wfSel: null }));
        return;
      }
      if (isPoint(state.wfSel)) {
        const exists = !!rasterGraphs[level?.id ?? '']?.edges.some((edge) => edge.key === edgeKey(state.wfSel!, key));
        if (!exists) toggleEdge(state.wfSel, key);
      }
      patch(() => ({ wfSel: key, wfSelEdge: null }));
    },
    [anchorName, level?.id, linkAnchor, patch, rasterGraphs, removePoint, state.stopTarget, state.wfFrom, state.wfSel, state.wfTool, toast, toggleEdge]
  );

  const onPathDown = useCallback(
    (key: string) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.stopTarget) return;
      if (state.wfTool === 'erase') {
        removePath(key);
        toast(i18n.t(W.toast.pathRemoved));
        return;
      }
      if (state.wfTool === 'node') {
        const px = pointerPx(event);
        if (px) addPoint(px, isPoint(state.wfSel) ? state.wfSel : null, key);
        return;
      }
      patch(() => ({ wfSelEdge: key, wfSel: null, wfFrom: null, selStop: null }));
    },
    [addPoint, patch, pointerPx, removePath, state.stopTarget, state.wfSel, state.wfTool, toast]
  );

  /** A stop marker, unit or amenity pin clicked in Wayfinding mode: Connect / Add Point link it; Move drags a stop. */
  const onAnchorDown = useCallback(
    (key: string, draggable: boolean) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.stopTarget) return;
      const name = anchorName(key);
      const blocker = !!plate?.blockers.some((stop) => stop.key === key);
      if (state.wfTool === 'move') {
        if (draggable) {
          capture(event);
          patch(() => ({ dragging: { kind: 'node', key }, selStop: key, wfSel: null, wfSelEdge: null }));
        } else {
          patch(() => ({ selStop: null }));
        }
        return;
      }
      if (blocker || state.wfTool === 'erase') return;
      const point = state.wfTool === 'connect' ? state.wfFrom : state.wfSel;
      if (isPoint(point)) {
        linkAnchor(key, point, name);
        return;
      }
      if (state.wfTool === 'connect') {
        patch(() => ({ wfFrom: key, wfSel: null }));
        toast(t(W.toast.pickPoint, { name }));
        return;
      }
      toast(i18n.t(W.toast.selectPointFirst));
    },
    [anchorName, linkAnchor, patch, plate?.blockers, state.stopTarget, state.wfFrom, state.wfSel, state.wfTool, toast]
  );

  /** The empty plan clicked in Wayfinding mode (after the canvas has ruled out a pan). */
  const onSurfaceDown = useCallback(
    (px: { x: number; y: number } | null) => {
      if (state.wfTool === 'node' && px && plate?.hasImage) {
        addPoint(px, isPoint(state.wfSel) ? state.wfSel : null);
        return;
      }
      patch(() => ({ wfSel: null, wfSelEdge: null, wfFrom: null, selStop: null }));
    },
    [addPoint, patch, plate?.hasImage, state.wfSel, state.wfTool]
  );

  const onDragEnd = useCallback(
    (key: string) => {
      if (!level) return;
      if (isPoint(key)) patch((current) => edited(current, level.id));
      else patch(() => ({ ...STALE }));
    },
    [level, patch]
  );

  /* ── toolbar ──────────────────────────────────────────────────────── */

  const setTool = useCallback((tool: WfTool) => patch(() => ({ wfTool: tool, wfFrom: null })), [patch]);

  const deselect = useCallback(() => patch(() => ({ wfSel: null, wfSelEdge: null, wfFrom: null, selStop: null })), [patch]);

  const deleteSelected = useCallback(() => {
    if (state.wfSel) {
      removePoint(state.wfSel);
      toast(i18n.t(W.toast.pointRemoved));
    } else if (state.wfSelEdge) {
      removePath(state.wfSelEdge);
      toast(i18n.t(W.toast.pathRemoved));
    }
  }, [removePath, removePoint, state.wfSel, state.wfSelEdge, toast]);

  const clearPaths = useCallback(() => {
    if (!level || !plate?.points.length) return;
    const name = `${level.sub} · ${level.label}`;
    askConfirm({
      title: t(W.clear.title, { level: name }),
      message: i18n.t(W.clear.body),
      label: i18n.t(W.clear.confirm),
      danger: true,
      onConfirm: () => {
        const stored = plate.points.filter((point) => point.key.startsWith('h:')).map((point) => point.key);
        const temporary = new Set(plate.points.filter((point) => point.key.startsWith('j:')).map((point) => point.key));
        patch((current) => ({
          hiddenNodes: [...new Set([...current.hiddenNodes, ...stored])],
          tempNodes: current.tempNodes.filter((node) => !temporary.has(node.key)),
          tempEdges: current.tempEdges.filter((edge) => !temporary.has(edge.a) && !temporary.has(edge.b) && !stored.includes(edge.a) && !stored.includes(edge.b)),
          wfSel: null,
          wfSelEdge: null,
          wfFrom: null,
          confirm: null,
          ...edited(current, level.id)
        }));
        toast(t(W.toast.cleared, { level: name }));
      }
    });
  }, [askConfirm, level, patch, plate, toast]);

  /** Detect Paths over a scope; with more than one floorplate, those that already have paths are skipped. */
  const runDetect = useCallback(
    (scope: 'plate' | 'building' | 'all') => {
      if (!level) return;
      const list = scope === 'plate' ? [level] : scope === 'building' ? levelsOfBuilding(levels, level.building) : levels;
      const go = (overwrite: boolean) => {
        const current = state;
        const snapshot = snapshotOf(current);
        const skipped: string[] = [];
        const done: string[] = [];
        let points = 0;
        let paths = 0;
        let next = { ...snapshot };
        list.forEach((row) => {
          const name = `${scope === 'all' ? `${row.sub} · ` : ''}${row.label}`;
          const view = wayfindingPlate(map, levels, row, rasterGraphs[row.id] ?? null, current);
          if (!view.hasImage) {
            skipped.push(t(W.detect.skipNoImage, { level: name }));
            return;
          }
          if (!overwrite && view.points.length) {
            skipped.push(t(W.detect.skipHasPaths, { level: name }));
            return;
          }
          const result = view.dims ? detectPaths(detectionSites(view.anchors), view.dims) : null;
          if (!result) {
            skipped.push(t(W.detect.skipTooFew, { level: name }));
            return;
          }
          const stored = view.points.filter((point) => point.key.startsWith('h:')).map((point) => point.key);
          const gone = new Set([...view.points.filter((point) => point.key.startsWith('j:')).map((point) => point.key), ...stored]);
          const keys = result.points.map((_point, index) => nodeKey('junction', next.nextJunction + index));
          next = {
            ...next,
            hiddenNodes: [...new Set([...next.hiddenNodes, ...stored])],
            tempNodes: [
              ...next.tempNodes.filter((node) => !gone.has(node.key)),
              ...result.points.map((point, index) => ({ key: keys[index], levelId: row.id, x: point.x, y: point.y, label: t(W.pointLabel, { n: next.nextJunction + index }), space: 'raster' as const }))
            ],
            tempEdges: [...next.tempEdges.filter((edge) => !gone.has(edge.a) && !gone.has(edge.b)), ...result.paths.map(([a, b]) => ({ a: keys[a], b: keys[b] }))],
            wfLinks: Object.fromEntries(Object.entries(next.wfLinks).filter(([key]) => !key.startsWith(`${row.id}|`))),
            wfEdited: { ...next.wfEdited, [row.id]: 'detected' },
            nextJunction: next.nextJunction + result.points.length
          };
          done.push(row.id);
          points += result.points.length;
          paths += result.paths.length;
        });
        patch(() => ({
          ...next,
          wfMenuOpen: false,
          wfSel: null,
          wfSelEdge: null,
          wfFrom: null,
          wfTool: 'move',
          confirm: null,
          wfReview: { levelIds: done, points, paths, skipped, snapshot },
          ...STALE
        }));
        const skippedText = skipped.length ? ` · ${skipped.join(', ')}` : '';
        toast(done.length ? `${t(W.toast.detected, { plates: plural(done.length, M.autoPlot.plateOne, M.autoPlot.plateMany) })}${skippedText}` : `${i18n.t(W.toast.nothingDetected)}${skippedText}`);
      };
      if (scope === 'plate' && plate?.points.length) {
        patch(() => ({ wfMenuOpen: false }));
        askConfirm({
          title: t(W.detect.replaceTitle, { level: level.label }),
          message: i18n.t(W.detect.replaceBody),
          label: i18n.t(W.detect.replace),
          onConfirm: () => go(true)
        });
        return;
      }
      go(scope === 'plate');
    },
    [askConfirm, level, levels, map, patch, plate?.points.length, rasterGraphs, state, toast]
  );

  const undoDetect = useCallback(() => {
    patch((current) => (current.wfReview ? { ...current.wfReview.snapshot, wfReview: null, wfSel: null, wfSelEdge: null, wfFrom: null, ...STALE } : {}));
    toast(i18n.t(W.toast.undone));
  }, [patch, toast]);

  /* ── stacked floors ───────────────────────────────────────────────── */

  const setFloor = useCallback((value: number) => patch(() => ({ wfFloor: value, wfSel: null, wfFrom: null, wfSelEdge: null, selStop: null })), [patch]);

  /* ── shortest path ────────────────────────────────────────────────── */

  const setScope = useCallback((scope: WfScope) => patch(() => ({ wfScope: scope, wfA: '', wfB: '', wfPick: null, ...STALE })), [patch]);

  const findRoute = useCallback(() => {
    if (!routeInput) return;
    const route = computeWayfindingRoute(routeInput, groups, pair[0], pair[1]);
    patch(() => ({ wfA: pair[0], wfB: pair[1], wfRoute: route, wfAnim: null }));
  }, [groups, pair, patch, routeInput]);

  const useSample = useCallback(() => {
    if (!routeInput) return;
    const sample = sampleRoute(routeInput, groups);
    if (!sample) {
      const blocked = Object.values(plates).some((row) => row.blockers.length);
      toast(i18n.t(blocked ? W.toast.noSampleBlocked : W.toast.noSample));
      return;
    }
    patch(() => ({ wfA: sample.a, wfB: sample.b, wfRoute: sample.route, wfAnim: null }));
    toast(t(W.toast.sample, { text: sample.text }));
  }, [groups, patch, plates, routeInput, toast]);

  const swap = useCallback(() => patch(() => ({ wfA: pair[1], wfB: pair[0], ...STALE })), [pair, patch]);
  const toggleStepFree = useCallback(() => patch((current) => ({ wfStepFree: !current.wfStepFree, ...STALE })), [patch]);

  const openPick = useCallback(
    (which: 'A' | 'B') => (event: ReactMouseEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const card = element.closest('[data-wf-route]') ?? element;
      const rect = card.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const width = Math.max(300, rect.width);
      const left = Math.max(8, Math.min(vw - width - 8, rect.left));
      const below = vh - rect.bottom - 12;
      const above = rect.top - 12;
      const down = below >= 360 || below >= above;
      const room = Math.max(200, down ? below : above);
      patch((current) => ({
        wfPick:
          current.wfPick?.which === which
            ? null
            : {
                which,
                query: '',
                kind: 'all',
                index: 0,
                pos: { left, width, top: down ? rect.bottom + 6 : null, bottom: down ? null : vh - rect.top + 6, listH: Math.max(120, Math.min(340, room - 190)) }
              }
      }));
    },
    [patch]
  );

  const closePick = useCallback(() => patch((current) => (current.wfPick ? { wfPick: null } : {})), [patch]);

  // The picker floats over the page: a scroll or resize outside it closes it.
  useEffect(() => {
    if (!state.wfPick) return undefined;
    const close = (event: Event) => {
      if (event.type === 'scroll' && (event.target as Element | null)?.closest?.('[data-wf-pick]')) return;
      closePick();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [closePick, state.wfPick]);

  const choose = useCallback(
    (id: string) => patch((current) => (current.wfPick ? { [current.wfPick.which === 'A' ? 'wfA' : 'wfB']: id, wfPick: null, ...STALE } : {})),
    [patch]
  );

  const pickKey = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>, order: string[]) => {
      const pick = state.wfPick;
      if (!pick) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePick();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const index = Math.max(0, Math.min(order.length - 1, pick.index + (event.key === 'ArrowDown' ? 1 : -1)));
        patch((current) => (current.wfPick ? { wfPick: { ...current.wfPick, index } } : {}));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const id = order[Math.min(pick.index, order.length - 1)];
        if (id) choose(id);
      }
    },
    [choose, closePick, patch, state.wfPick]
  );

  /** Shows a floor of the route (a step's View, the animation's next leg). */
  const goCopy = useCallback(
    (ck: string, extra: (current: LocalMapState) => Partial<LocalMapState> = () => ({})) => {
      const { levelId, floor: value } = parseCopyKey(ck);
      const target = levelById(levels, levelId);
      if (!target) return;
      patch((current) => ({
        levelId: target.id,
        building: current.building && target.building ? target.building : current.building,
        wfFloor: value ?? current.wfFloor,
        wfSel: null,
        wfSelEdge: null,
        wfFrom: null,
        selStop: null,
        ...extra(current)
      }));
    },
    [levels, patch]
  );

  const viewStep = useCallback((ck: string) => goCopy(ck, (current) => ({ wfAnim: current.wfAnim ? { ...current.wfAnim, playing: false } : null })), [goCopy]);

  const animPlay = useCallback(() => {
    const route = state.wfRoute;
    if (!route || !route.ok) return;
    const anim = state.wfAnim;
    if (!anim || anim.finished) {
      goCopy(route.legs[0].ck, () => ({ wfAnim: { leg: 0, playing: true, finished: false, run: Date.now() } }));
      return;
    }
    if (!anim.playing) {
      goCopy(route.legs[anim.leg].ck, (current) => ({ wfAnim: current.wfAnim ? { ...current.wfAnim, playing: true } : null }));
      return;
    }
    patch(() => ({ wfAnim: { ...anim, playing: false } }));
  }, [goCopy, patch, state.wfAnim, state.wfRoute]);

  const animDone = useCallback(() => {
    const route = state.wfRoute;
    const anim = state.wfAnim;
    if (!route || !route.ok || !anim) return;
    if (anim.leg < route.legs.length - 1) {
      const leg = anim.leg + 1;
      goCopy(route.legs[leg].ck, (current) => ({ wfAnim: current.wfAnim ? { ...current.wfAnim, leg, run: Date.now() } : null }));
    } else {
      patch(() => ({ wfAnim: { ...anim, playing: false, finished: true } }));
    }
  }, [goCopy, patch, state.wfAnim, state.wfRoute]);

  /* ── stops ────────────────────────────────────────────────────────── */

  const openStopDialog = useCallback(
    (levelId: string | null = null) => patch(() => ({ stopDialog: newStopForm(levelById(levels, levelId) ?? level, levels), wfMenuOpen: false, plotShowOpen: false })),
    [level, levels, patch]
  );

  const editStop = useCallback(
    (key: string) => {
      const stop = state.tempStops.find((row) => row.key === key);
      if (!stop) return;
      patch(() => ({
        selStop: null,
        stopDialog: {
          editing: key,
          type: stop.type,
          name: stop.name,
          building: levelById(levels, stop.levelId)?.building ?? '',
          levelId: stop.levelId,
          floorOnly: stop.floorOnly != null ? String(stop.floorOnly) : '',
          floors: stop.floors,
          accessible: stop.accessible,
          lock: stop.lock,
          note: stop.note,
          place: false,
          submitted: false
        }
      }));
    },
    [levels, patch, state.tempStops]
  );

  const setStopForm = useCallback(
    (update: Partial<StopForm>) =>
      patch((current) => {
        if (!current.stopDialog) return {};
        const next = { ...current.stopDialog, ...update };
        if (update.building !== undefined && update.building !== current.stopDialog.building) {
          next.levelId = levels.find((row) => (row.building ?? '') === update.building)?.id ?? '';
          next.floorOnly = '';
        }
        if (update.levelId !== undefined && update.levelId !== current.stopDialog.levelId) next.floorOnly = '';
        return { stopDialog: next };
      }),
    [levels, patch]
  );

  const closeStopDialog = useCallback(() => patch(() => ({ stopDialog: null })), [patch]);

  /** Arms a stop for placement: the next click on the floor image puts it there. Stops sit on the image, as in the CMS. */
  const armStop = useCallback(
    (key: string, levelId: string, name: string) => {
      const target = levelById(levels, levelId);
      if (!target) return;
      if (!planAssets(target, state.planOverrides[target.id]).image) {
        toast(t(W.toast.noImageForStop, { name, level: `${target.sub} · ${target.label}` }));
        return;
      }
      patch((current) => {
        const onSvg = activeSpace(target, { ...current, mode: 'plot' }) === 'svg';
        return {
          stopTarget: key,
          selStop: null,
          levelId: target.id,
          mode: current.mode === 'plot' && onSvg && enabled ? 'wayfind' : current.mode,
          plotShow: { ...current.plotShow, stop: true },
          tool: 'select',
          plotSel: []
        };
      });
      toast(t(W.toast.placeStop, { name }));
    },
    [enabled, levels, patch, state.planOverrides, toast]
  );

  const saveStop = useCallback(() => {
    const form = state.stopDialog;
    if (!form) return;
    const errors = stopFormErrors(form, levels);
    if (Object.keys(errors).length) {
      patch(() => ({ stopDialog: { ...form, submitted: true } }));
      return;
    }
    const target = levelById(levels, form.levelId)!;
    const type = stopTypeOf(form.type);
    const name = defaultStopName(form, state);
    const record: Omit<TempStop, 'key' | 'x' | 'y'> = {
      type: form.type,
      name,
      building: target.building,
      levelId: target.id,
      floorOnly: form.floorOnly && target.floors.length > 1 ? Number(form.floorOnly) : null,
      floors: type.vertical ? form.floors.trim() : '',
      accessible: type.vertical ? form.accessible : false,
      lock: type.gate ? form.lock : false,
      note: form.note.trim()
    };
    if (form.editing) {
      const old = state.tempStops.find((stop) => stop.key === form.editing);
      const moved = !!old && old.levelId !== target.id;
      patch((current) => ({
        tempStops: current.tempStops.map((stop) => (stop.key === form.editing ? { ...stop, ...record, ...(moved ? { x: null, y: null } : {}) } : stop)),
        stopDialog: null,
        ...STALE
      }));
      toast(t(moved ? W.toast.stopUpdatedMoved : W.toast.stopUpdated, { name }));
      return;
    }
    const key = `n:${state.nextStop}`;
    patch((current) => ({
      tempStops: [...current.tempStops, { key, ...record, x: null, y: null }],
      nextStop: current.nextStop + 1,
      stopDialog: null,
      plotShow: { ...current.plotShow, stop: true },
      ...STALE
    }));
    if (form.place) armStop(key, target.id, name);
    else toast(t(W.toast.stopAdded, { name }));
  }, [armStop, levels, patch, state, toast]);

  /** Puts a stop at a point of the floor image (an armed stop, or ticked stops under Manual Plot). */
  const placeStops = useCallback(
    (keys: string[], px: { x: number; y: number }) => {
      if (!level || !keys.length) return;
      const step = Math.max(8, (plate?.dims?.w ?? 760) * 0.012);
      patch((current) => {
        const overrides = { ...current.nodeOverrides };
        let hidden = current.hiddenNodes;
        let tempStops = current.tempStops;
        keys.forEach((key, index) => {
          const at = { x: Math.round(px.x + index * step), y: Math.round(px.y) };
          if (key.startsWith('n:')) {
            tempStops = tempStops.map((stop) => (stop.key === key ? { ...stop, levelId: level.id, x: at.x, y: at.y } : stop));
          } else {
            overrides[key] = at;
            hidden = hidden.filter((row) => row !== key);
          }
        });
        return { nodeOverrides: overrides, hiddenNodes: hidden, tempStops, stopTarget: null, plotSel: current.plotSel.filter((row) => !keys.includes(row.replace(/^stop:/, ''))), ...STALE };
      });
      const names = keys.map(anchorName);
      toast(t(W.toast.stopPlaced, { what: names.length === 1 ? names[0] : plural(names.length, W.stopOne, W.stopMany), level: `${level.sub} · ${level.label}` }));
    },
    [anchorName, level, patch, plate?.dims?.w, toast]
  );

  /** Takes stops off the plan on this page: stored ones are hidden, added ones go back to To Plot. */
  const unplotStops = useCallback(
    (keys: string[]) => {
      if (!keys.length) return;
      patch((current) => ({
        hiddenNodes: [...new Set([...current.hiddenNodes, ...keys.filter((key) => !key.startsWith('n:'))])],
        tempStops: current.tempStops.map((stop) => (keys.includes(stop.key) ? { ...stop, x: null, y: null } : stop)),
        wfLinks: Object.fromEntries(Object.entries(current.wfLinks).filter(([key]) => !keys.includes(key.slice(key.indexOf('|') + 1)))),
        selStop: current.selStop && keys.includes(current.selStop) ? null : current.selStop,
        stopTarget: current.stopTarget && keys.includes(current.stopTarget) ? null : current.stopTarget,
        ...STALE
      }));
    },
    [patch]
  );

  const removeStop = useCallback(
    (key: string) => {
      const stop = state.tempStops.find((row) => row.key === key);
      if (!stop) return;
      askConfirm({
        title: t(M.stops.remove.title, { name: stop.name }),
        message: i18n.t(M.stops.remove.body),
        label: i18n.t(M.stops.remove.confirm),
        danger: true,
        onConfirm: () => {
          patch((current) => ({
            tempStops: current.tempStops.filter((row) => row.key !== key),
            wfLinks: Object.fromEntries(Object.entries(current.wfLinks).filter(([link]) => !link.endsWith(`|${key}`))),
            selStop: null,
            stopTarget: current.stopTarget === key ? null : current.stopTarget,
            plotSel: current.plotSel.filter((row) => row !== `stop:${key}`),
            plotUnSel: current.plotUnSel.filter((row) => row !== `stop:${key}`),
            confirm: null,
            ...STALE
          }));
          toast(t(M.stops.remove.done, { name: stop.name }));
        }
      });
    },
    [askConfirm, patch, state.tempStops, toast]
  );

  /* ── Plot on Map: Show and the stacked floor ───────────────────────── */

  const togglePlotShow = useCallback(
    (kind: PlotKind) =>
      patch((current) => {
        const kinds: PlotKind[] = enabled ? ['unit', 'amenity', 'stop'] : ['unit', 'amenity'];
        const next = { ...current.plotShow, [kind]: !current.plotShow[kind] };
        if (!kinds.some((row) => next[row])) return {};
        const keep = (key: string) => next[(key.startsWith('stop:') ? 'stop' : key.slice(0, key.indexOf(':'))) as PlotKind];
        return { plotShow: next, plotSel: current.plotSel.filter(keep), plotUnSel: current.plotUnSel.filter(keep) };
      }),
    [enabled, patch]
  );

  const setPlotFloor = useCallback(
    (value: string) => patch(() => ({ plotFloor: value === 'all' ? null : Number(value), plotSel: [], plotUnSel: [], selPoly: null, selStop: null })),
    [patch]
  );

  // Escape lets go of the selected point, path or stop, as the design does.
  useEffect(() => {
    if (!wayfind) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('.bo-modal')) return;
      if (state.wfSel || state.wfFrom || state.wfSelEdge || state.selStop) deselect();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deselect, state.selStop, state.wfFrom, state.wfSel, state.wfSelEdge, wayfind]);

  const toolbar = level && plate && wayfind ? generateWfToolbar(map, levels, level, plate, state) : null;
  const panel =
    level && plate && wayfind && routeInput ? generateWayfindingPanel(map, levels, level, plate, state, groups, pair, groups.reduce((sum, group) => sum + group.items.length, 0) >= 2) : null;
  const layer = level && plate && wayfind ? generateWfLayer(plate, level, state) : null;
  const stopForm = state.stopDialog ? generateStopForm(state.stopDialog, levels) : null;

  return {
    enabled,
    wayfind,
    plates,
    plate,
    floor,
    copy: level ? copyKey(level.id, floor) : '',
    toolbar,
    panel,
    layer,
    stopForm,
    actions: {
      setMode,
      setTool,
      toggleMenu: () => patch((current) => ({ wfMenuOpen: !current.wfMenuOpen })),
      closeMenu: () => patch((current) => (current.wfMenuOpen ? { wfMenuOpen: false } : {})),
      runDetect,
      undoDetect,
      dismissReview: () => patch(() => ({ wfReview: null })),
      clearPaths,
      deleteSelected,
      deselect,
      setFloor,
      setScope,
      findRoute,
      useSample,
      swap,
      toggleStepFree,
      openPick,
      closePick,
      setPickQuery: (query: string) => patch((current) => (current.wfPick ? { wfPick: { ...current.wfPick, query, index: 0 } } : {})),
      setPickKind: (kind: 'all' | 'unit' | 'amenity' | 'stop') => patch((current) => (current.wfPick ? { wfPick: { ...current.wfPick, kind, index: 0 } } : {})),
      setPickIndex: (index: number) => patch((current) => (current.wfPick && current.wfPick.index !== index ? { wfPick: { ...current.wfPick, index } } : {})),
      pickKey,
      choose,
      routeFix: () => {
        const route = state.wfRoute;
        if (!route || route.ok || !route.fix) return;
        if (route.fix.kind === 'detect') runDetect(route.fix.scope);
        else openStopDialog(route.fix.levelId);
      },
      viewStep,
      animPlay,
      animStop: () => patch(() => ({ wfAnim: null })),
      animDone,
      setAnimMode: (mode: 'point' | 'stop') => patch((current) => ({ wfAnimMode: mode, wfAnim: current.wfAnim ? { ...current.wfAnim, run: Date.now() } : null })),
      onPointDown,
      onPathDown,
      onAnchorDown,
      onSurfaceDown,
      onDragEnd,
      openStopDialog,
      editStop,
      setStopForm,
      saveStop,
      closeStopDialog,
      armStop,
      cancelStop: () => patch(() => ({ stopTarget: null })),
      placeStops,
      unplotStops,
      removeStop,
      selectStop: (key: string | null) => patch((current) => ({ selStop: current.selStop === key ? null : key, selPoly: null, selectedPin: null, selectedNode: null })),
      togglePlotShow,
      setPlotShowOpen: (open: boolean) => patch((current) => (current.plotShowOpen === open ? {} : { plotShowOpen: open })),
      setPlotFloor
    }
  };
};

export type MapWayfinding = ReturnType<typeof useMapWayfinding>;
