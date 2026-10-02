'use client';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { activeSpace, levelById, planAssets, stackFloor, wayfindingSpace, type MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { generateLevelGraph, type LevelGraph } from '~/core/utils/generator/map/mapNodes.generator';
import {
  edgeKey,
  nodeKey,
  WF_UNDO_LIMIT,
  type ConfirmState,
  type LocalMapState,
  type MapMode,
  type PlotKind,
  type StopForm,
  type TempStop,
  type WfDetectRow,
  type WfScope,
  type WfSnapshot,
  type WfTool
} from '~/core/utils/generator/map/mapState';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import {
  defaultStopName,
  detectScopeLevels,
  effectiveScope,
  generateStopForm,
  generateWayfindingPanel,
  generateWfLayer,
  generateWfToolbar,
  newStopForm,
  REVIEW_THRESHOLD,
  stopFormErrors,
  wayfindingEnabled
} from '~/core/utils/generator/map/wayfinding.generator';
import { detectionPatch, graphPatch, plateGraph, snapshotOf } from '~/core/utils/wayfinding/hallwayEdits';
import { autoConnectNodes, computeAutoConnectDistance, connectNodeToNearest } from '~/core/utils/wayfinding/hallways/autoConnect';
import { addNode, confirmNodesAboveConfidence, deleteEdge, deleteNode, rerouteEdge, type GraphState } from '~/core/utils/wayfinding/hallways/editing';
import type { DetectFailure } from '~/core/utils/wayfinding/hallways/extract';
import { buildObstacleIndex, NO_OBSTACLES, type ObstacleIndex } from '~/core/utils/wayfinding/hallways/obstacles';
import type { Point, StopCandidate } from '~/core/utils/wayfinding/hallways/types';
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
  /** Every level's graph on its Wayfinding layer (`generateWayfindingGraphs`). */
  graphs: Record<string, LevelGraph>;
  toast: (message: string) => void;
  askConfirm: (confirm: ConfirmState) => void;
  pointerPx: (event: { clientX: number; clientY: number }) => { x: number; y: number } | null;
  /** The text of a level's floor SVG (a GET through the plan-svg route, or the copy already loaded). */
  fetchSvgText: (level: MapLevel) => Promise<string>;
}

const isPoint = (key: string | null): key is string => !!key && (key.startsWith('h:') || key.startsWith('j:'));

/** Clears what a graph change invalidates: the route and its animation. */
const STALE = { wfRoute: null, wfAnim: null } as const;

const pushUndo = (current: LocalMapState): WfSnapshot[] => [...current.wfUndo, snapshotOf(current)].slice(-WF_UNDO_LIMIT);

/** Lets the browser paint between two floorplates of a Detect Hallways run. */
const nextFrame = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const FAILURE_NOTE: Record<DetectFailure, string> = { 'no-hallway-layer': W.detect.noteNoLayer, 'no-corridor': W.detect.noteNoCorridor, 'no-edges': W.detect.noteNoEdges };

/** The SVG-reading half of the engine, loaded the first time it is needed. */
const loadEngine = () => import('~/core/utils/wayfinding/hallways/floorEngine');

/**
 * The Wayfinding mode and the Additional Stops: everything the toggle, the
 * side panel, the toolbar, the canvas layer and the Add Additional Stop
 * dialog need, over the screen's one `LocalMapState`. Points, paths, links,
 * detected paths, stops and routes are page state only — no action here
 * sends a request.
 */
export const useMapWayfinding = ({ map, levels, level, state, patch, graphs, toast, askConfirm, pointerPx, fetchSvgText }: Options) => {
  const enabled = wayfindingEnabled(map);
  const wayfind = enabled && state.mode === 'wayfind';
  // The async Detect Hallways run reads the latest state between floorplates.
  const stateRef = useRef(state);
  stateRef.current = state;
  const stopRun = useRef(false);
  /** Outlines a synthesised link must not cross, per level (rooms, walls, footprints of its SVG). */
  const obstacles = useRef(new Map<string, { text: string; index: ObstacleIndex }>());

  // Every floorplate's view while wayfinding (the cards, the route scopes);
  // only the one in view while plotting (its Additional Stops).
  const plates = useMemo((): Record<string, WfPlate> => {
    const wanted = wayfind ? levels : level ? [level] : [];
    return Object.fromEntries(wanted.map((row) => [row.id, wayfindingPlate(map, levels, row, graphs[row.id] ?? null, state)]));
  }, [level, levels, map, graphs, state, wayfind]);
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

  /** Every local graph edit goes through here: it marks the level edited, records the graph for Ctrl/Cmd+Z, and drops the stale route. */
  const edited = (current: LocalMapState, levelId: string): Partial<LocalMapState> => ({
    wfEdited: { ...current.wfEdited, [levelId]: 'edited' },
    wfUndo: pushUndo(current),
    ...STALE
  });

  /** The level's obstacles from its floor SVG (read once per file, in the background); none on the floor image, whose frame the SVG does not share. */
  const obstaclesFor = useCallback((target: MapLevel, view: WfPlate | null): ObstacleIndex => {
    if (view?.space !== 'svg') return NO_OBSTACLES;
    return obstacles.current.get(target.id)?.index ?? NO_OBSTACLES;
  }, []);

  // The floor in view on its SVG: read its obstacles once, so a new point or a bend never links through a room or a wall.
  const viewDoc = level ? state.svgDocs[level.id] : undefined;
  const viewText = viewDoc?.status === 'ready' ? viewDoc.doc.text : null;
  const viewOnSvg = !!level && wayfind && wayfindingSpace(level, state) === 'svg';
  useEffect(() => {
    if (!level || !viewOnSvg || !viewText) return undefined;
    if (obstacles.current.get(level.id)?.text === viewText) return undefined;
    let cancelled = false;
    void loadEngine().then(({ obstaclesOf, parseSvgTree }) => {
      if (cancelled) return;
      const parsed = parseSvgTree(viewText);
      obstacles.current.set(level.id, { text: viewText, index: parsed.ok ? buildObstacleIndex(obstaclesOf(parsed.root)) : NO_OBSTACLES });
    });
    return () => {
      cancelled = true;
    };
  }, [level, viewOnSvg, viewText]);

  /** Auto-Connect's options on a floorplate: its k-NN range (8% of the plan's diagonal) and its obstacles. */
  const connectOptions = useCallback(
    (view: WfPlate) => {
      const dims = view.dims;
      return { maxDistance: computeAutoConnectDistance(dims ? Math.hypot(dims.w, dims.h) : 1000), obstacles: obstaclesFor(view.level, view) };
    },
    [obstaclesFor]
  );

  /**
   * Runs one of the POC's graph operations on the floorplate in view and
   * records the difference as local overrides (undoable). Returns the new
   * graph, or null when the operation did nothing.
   */
  const applyOp = useCallback(
    (op: (graph: GraphState) => GraphState | null, select: (after: GraphState, keyOf: (id: string) => string) => Partial<LocalMapState> = () => ({ wfSel: null, wfSelEdge: null })): GraphState | null => {
      if (!level || !plate?.space) return null;
      const space = plate.space;
      const before = plateGraph(plate);
      const after = op(before);
      if (!after) return null;
      patch((current) => {
        const { patch: changes, keyOf } = graphPatch(current, level, space, before, after, (n) => t(W.pointLabel, { n }));
        return { ...changes, ...edited(current, level.id), ...select(after, (id) => keyOf.get(id) ?? id) };
      });
      return after;
    },
    [level, patch, plate]
  );

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
      if (graphs[level.id]?.edges.some((edge) => edge.key === key && !edge.temporary)) {
        patch((current) => ({ hiddenEdges: [...current.hiddenEdges, key], ...edited(current, level.id) }));
        return 'removed';
      }
      patch((current) => ({ tempEdges: [...current.tempEdges, { a, b, kind: 'manual' }], ...edited(current, level.id) }));
      return 'added';
    },
    [graphs, level, patch, state.hiddenEdges, state.tempEdges]
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
      if (!level || !plate?.space) return;
      const space = plate.space;
      patch((current) => {
        const key = nodeKey('junction', current.nextJunction);
        let tempEdges = current.tempEdges;
        let hiddenEdges = current.hiddenEdges;
        if (split) {
          const [a, b] = split.split('|');
          const temporary = tempEdges.some((edge) => edgeKey(edge.a, edge.b) === split);
          const kind = tempEdges.find((edge) => edgeKey(edge.a, edge.b) === split)?.kind ?? (temporary ? 'manual' : 'stored');
          tempEdges = temporary ? tempEdges.filter((edge) => edgeKey(edge.a, edge.b) !== split) : tempEdges;
          if (!temporary && !hiddenEdges.includes(split)) hiddenEdges = [...hiddenEdges, split];
          tempEdges = [...tempEdges, { a, b: key, kind }, { a: key, b, kind }];
          if (chainFrom && chainFrom !== a && chainFrom !== b) tempEdges = [...tempEdges, { a: chainFrom, b: key, kind: 'manual' }];
        } else if (chainFrom) {
          tempEdges = [...tempEdges, { a: chainFrom, b: key, kind: 'manual' }];
        }
        return {
          tempNodes: [...current.tempNodes, { key, levelId: level.id, x: px.x, y: px.y, label: t(W.pointLabel, { n: current.nextJunction }), space }],
          tempEdges,
          hiddenEdges,
          nextJunction: current.nextJunction + 1,
          wfSel: key,
          wfSelEdge: null,
          ...edited(current, level.id)
        };
      });
    },
    [level, patch, plate?.space]
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
      const tool: WfTool | null = state.wfTool;
      // Move, or no tool (the POC's default): drag the point; the graph before the drag is kept for Ctrl/Cmd+Z.
      if (tool === 'move' || tool == null) {
        capture(event);
        patch((current) => ({ dragging: { kind: 'node', key, before: snapshotOf(current), moved: false }, wfSel: key, wfSelEdge: null, wfFrom: null, selStop: null }));
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
        const exists = !!graphs[level?.id ?? '']?.edges.some((edge) => edge.key === edgeKey(state.wfSel!, key));
        if (!exists) toggleEdge(state.wfSel, key);
      }
      patch(() => ({ wfSel: key, wfSelEdge: null }));
    },
    [anchorName, graphs, level?.id, linkAnchor, patch, removePoint, state.stopTarget, state.wfFrom, state.wfSel, state.wfTool, toast, toggleEdge]
  );

  /** No tool: a double-click deletes the point and re-joins its neighbours as a chain (the POC's `deleteNode`). */
  const onPointDoubleClick = useCallback(
    (key: string) => {
      if (state.wfTool != null || state.stopTarget) return;
      const after = applyOp((graph) => (graph.nodes.some((node) => node.id === key) ? deleteNode(graph, key) : null));
      if (after) toast(i18n.t(W.toast.pointDeleted));
    },
    [applyOp, state.stopTarget, state.wfTool, toast]
  );

  /** No tool: a double-click deletes only that path (the POC's `deleteEdge`). */
  const onPathDoubleClick = useCallback(
    (key: string) => {
      if (state.wfTool != null || state.stopTarget) return;
      const after = applyOp((graph) => (graph.edges.some((edge) => edge.id === key) ? deleteEdge(graph, key) : null));
      if (after) toast(i18n.t(W.toast.pathDeleted));
    },
    [applyOp, state.stopTarget, state.wfTool, toast]
  );

  /** No tool: a click on empty plan adds a point joined to its nearest point, then auto-connected like any other (the POC's `addNode` + `connectNodeToNearest`). */
  const addConnectedPoint = useCallback(
    (px: Point) => {
      if (!plate?.space) return;
      const options = connectOptions(plate);
      let links = 0;
      const after = applyOp(
        (graph) => {
          const { state: withNode, nodeId } = addNode(graph, px);
          const connected = connectNodeToNearest(withNode, nodeId, options);
          links = connected.graph.edges.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId).length;
          return { nodes: withNode.nodes, edges: connected.graph.edges };
        },
        () => ({ wfSel: null, wfSelEdge: null })
      );
      if (after) toast(t(W.toast.pointAdded, { count: links }));
    },
    [applyOp, connectOptions, plate, toast]
  );

  /** The end of a path drag: the path is split at the grab point, a new point goes where it was let go, and that point is auto-connected (the POC's `rerouteEdge`). */
  const onBendEnd = useCallback(
    (bend: { key: string; grab: Point; drop: Point; moved: boolean }) => {
      if (!plate?.space) return;
      if (!bend.moved) {
        patch(() => ({ wfSelEdge: bend.key, wfSel: null, wfFrom: null, selStop: null }));
        return;
      }
      const options = connectOptions(plate);
      const after = applyOp((graph) => {
        const rerouted = rerouteEdge(graph, bend.key, bend.grab, bend.drop);
        if (!rerouted) return null;
        const connected = connectNodeToNearest({ nodes: rerouted.nodes, edges: rerouted.edges }, rerouted.nodeId, options);
        return { nodes: rerouted.nodes, edges: connected.graph.edges };
      });
      if (after) toast(i18n.t(W.toast.pathBent));
    },
    [applyOp, connectOptions, patch, plate, toast]
  );

  const onPathDown = useCallback(
    (key: string) => (event: ReactPointerEvent<Element>) => {
      event.stopPropagation();
      if (state.stopTarget) return;
      // No tool: a press on a path may become a bend; a press that does not travel selects it.
      if (state.wfTool == null) {
        const px = pointerPx(event);
        if (!px) return;
        capture(event);
        patch(() => ({ dragging: { kind: 'bend', key, grab: px, drop: px, client: { x: event.clientX, y: event.clientY }, moved: false }, wfSelEdge: key, wfSel: null, wfFrom: null, selStop: null }));
        return;
      }
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
      if (state.wfTool === 'node' && px && plate?.hasPlan) {
        addPoint(px, isPoint(state.wfSel) ? state.wfSel : null);
        return;
      }
      if (state.wfTool == null && px && plate?.hasPlan && !state.wfDetect?.running) {
        addConnectedPoint(px);
        return;
      }
      patch(() => ({ wfSel: null, wfSelEdge: null, wfFrom: null, selStop: null }));
    },
    [addConnectedPoint, addPoint, patch, plate?.hasPlan, state.wfDetect?.running, state.wfSel, state.wfTool]
  );

  /** A point or stop drag ended: a point that moved is an undoable edit, and touching an inferred point confirms it. */
  const onDragEnd = useCallback(
    (drag: { key: string; before?: WfSnapshot; moved?: boolean }) => {
      if (!level) return;
      if (!isPoint(drag.key)) {
        patch(() => ({ ...STALE }));
        return;
      }
      if (!drag.moved) return;
      patch((current) => ({
        wfEdited: { ...current.wfEdited, [level.id]: 'edited' },
        wfUndo: drag.before ? [...current.wfUndo, drag.before].slice(-WF_UNDO_LIMIT) : current.wfUndo,
        tempNodes: current.tempNodes.map((node) => (node.key === drag.key && node.review === 'pending' ? { ...node, review: 'confirmed' } : node)),
        ...STALE
      }));
    },
    [level, patch]
  );

  /** Ctrl/Cmd+Z: the graph before the last local edit. Page state that is not the graph (floor, dialogs, search, filters) is left alone. */
  const undo = useCallback(() => {
    const current = stateRef.current;
    if (!current.wfUndo.length || current.wfDetect?.running) {
      if (!current.wfDetect?.running) toast(i18n.t(W.toast.nothingToUndo));
      return;
    }
    patch((now) => {
      if (!now.wfUndo.length) return {};
      const previous = now.wfUndo[now.wfUndo.length - 1];
      const rest = now.wfUndo.slice(0, -1);
      return {
        ...previous,
        wfUndo: rest,
        wfDetect: now.wfDetect && rest.length <= now.wfDetect.undoDepth ? null : now.wfDetect,
        wfSel: null,
        wfSelEdge: null,
        wfFrom: null,
        dragging: null,
        ...STALE
      };
    });
    toast(i18n.t(W.toast.undoneEdit));
  }, [patch, toast]);

  /** Auto-Connect Paths on the floorplate in view (the POC's `autoConnectNodes`). */
  const autoConnect = useCallback(() => {
    if (!plate || plate.points.length < 2) return;
    const options = connectOptions(plate);
    const result = autoConnectNodes(plateGraph(plate), options);
    if (!result.addedEdgeCount) {
      toast(t(W.toast.autoConnectNone, { obstacle: result.rejectedByObstacle, redundant: result.rejectedAsRedundant }));
      return;
    }
    applyOp((graph) => ({ nodes: graph.nodes, edges: result.graph.edges }));
    toast(t(W.toast.autoConnected, { added: result.addedEdgeCount, obstacle: result.rejectedByObstacle, redundant: result.rejectedAsRedundant }));
  }, [applyOp, connectOptions, plate, toast]);

  /** "Confirm N above 0.9": only confident inferred points (the POC's `confirmNodesAboveConfidence`). */
  const confirmPending = useCallback(() => {
    if (!plate) return;
    const count = plate.points.filter((point) => point.review === 'pending' && point.confidence != null && point.confidence > REVIEW_THRESHOLD).length;
    if (!count) return;
    applyOp((graph) => confirmNodesAboveConfidence(graph, REVIEW_THRESHOLD));
    toast(t(W.toast.confirmed, { count }));
  }, [applyOp, plate, toast]);

  /* ── toolbar ──────────────────────────────────────────────────────── */

  /** A tool button toggles: clicking the active tool turns it off, back to the default editing gestures. */
  const setTool = useCallback((tool: WfTool) => patch((current) => ({ wfTool: current.wfTool === tool ? null : tool, wfFrom: null })), [patch]);

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

  /**
   * Detect Hallways for one floorplate, against the latest page state: skip
   * it when it already has paths (unless replacing), or has no floor SVG;
   * read its SVG; run the engine with the floor's plotted units, amenities
   * and stops as the stops to join; add the result as page points and paths.
   */
  const detectOne = useCallback(
    async (target: MapLevel, replace: boolean): Promise<Omit<WfDetectRow, 'levelId' | 'name'>> => {
      const empty = { points: 0, paths: 0, source: null } as const;
      const now = stateRef.current;
      const current = wayfindingPlate(map, levels, target, generateLevelGraph(map, levels, target, now, wayfindingSpace(target, now) ?? 'raster'), now);
      if (!replace && current.points.length) {
        const stored = current.points.filter((point) => point.key.startsWith('h:')).length;
        return { ...empty, status: 'existing', note: stored ? t(W.detect.noteStored, { count: stored }) : i18n.t(W.detect.notePage) };
      }
      if (!planAssets(target, now.planOverrides[target.id]).svg) return { ...empty, status: 'noSvg', note: i18n.t(W.detect.noteNoSvg) };
      let text: string;
      try {
        text = await fetchSvgText(target);
      } catch {
        return { ...empty, status: 'failed', note: i18n.t(W.detect.noteFetch) };
      }
      const { detectHallways, elementCentres, parseSvgTree } = await loadEngine();
      const parsed = parseSvgTree(text);
      if (!parsed.ok) return { ...empty, status: 'invalidSvg', note: i18n.t(parsed.reason === 'empty' ? W.detect.noteEmpty : W.detect.noteInvalid) };

      // The stops to join are where the floor's units, amenities and placed stops sit on the SVG.
      const later = stateRef.current;
      const onSvg = { ...later, wfSvg: { ...later.wfSvg, [target.id]: true as const } };
      const svgView = wayfindingPlate(map, levels, target, generateLevelGraph(map, levels, target, onSvg, 'svg'), onSvg);
      // A unit or amenity on the SVG is its polygon: aim at the polygon's centre, not the pointer's stored x/y.
      const centre = elementCentres(parsed.root);
      const polygonOf = (key: string): { x: number; y: number } | null => {
        const [kind, raw] = key.split(':');
        const id = Number(raw);
        const override = later.pinOverrides[key];
        if (override) return override.space === 'svg' && override.polygon ? centre(override.polygon, override.polygon) : null;
        const record = kind === 'unit' ? map.inventory.units.find((row) => row.id === id) : kind === 'amenity' ? map.inventory.amenities.find((row) => row.id === id) : null;
        return record?.svgPointer ? centre(record.svgPointer.elementId, record.svgPointer.selector) : null;
      };
      const seen = new Set<string>();
      const stops: StopCandidate[] = [];
      svgView.anchors.forEach((anchor) => {
        if (anchor.x == null || anchor.y == null || seen.has(anchor.key)) return;
        seen.add(anchor.key);
        const at = anchor.kind === 'stop' ? null : polygonOf(anchor.key);
        stops.push({ groupId: anchor.key, label: anchor.label, anchor: at ?? { x: anchor.x, y: anchor.y } });
      });
      const result = detectHallways(parsed.root, stops);
      if (!result.ok) return { ...empty, status: 'noHallway', note: i18n.t(FAILURE_NOTE[result.failure ?? 'no-corridor']) };
      obstacles.current.set(target.id, { text, index: result.obstacles.length ? buildObstacleIndex(result.obstacles) : NO_OBSTACLES });
      patch((state) => {
        const view = wayfindingPlate(map, levels, target, generateLevelGraph(map, levels, target, state, wayfindingSpace(target, state) ?? 'raster'), state);
        return detectionPatch(state, target, view, result, (n) => t(W.pointLabel, { n }));
      });
      return { status: 'detected', points: result.nodes.length, paths: result.edges.length, source: result.source, note: '' };
    },
    [fetchSvgText, levels, map, patch]
  );

  const setRow = useCallback(
    (levelId: string, update: Partial<WfDetectRow>) =>
      patch((current) => (current.wfDetect ? { wfDetect: { ...current.wfDetect, rows: current.wfDetect.rows.map((row) => (row.levelId === levelId ? { ...row, ...update } : row)) } } : {})),
    [patch]
  );

  /**
   * Detect Hallways over a scope, one floorplate after another with the
   * progress shown as it goes. With more than one floorplate, those that
   * already have paths are skipped and never overwritten; this floorplate
   * alone asks before replacing its paths. One Undo (or Ctrl/Cmd+Z) takes
   * the whole run back. Nothing is sent but the floor SVGs' GETs.
   */
  const runDetect = useCallback(
    (scope: 'plate' | 'building' | 'all') => {
      if (!level) return;
      if (stateRef.current.wfDetect?.running) {
        toast(i18n.t(W.toast.detectBusy));
        return;
      }
      const list = detectScopeLevels(levels, level, scope);
      const go = async (replace: boolean) => {
        stopRun.current = false;
        patch((current) => ({
          wfMenuOpen: false,
          confirm: null,
          wfSel: null,
          wfSelEdge: null,
          wfFrom: null,
          dragging: null,
          wfDetect: {
            scope,
            rows: list.map((row) => ({ levelId: row.id, name: `${row.sub} · ${row.label}`, status: 'queued', points: 0, paths: 0, source: null, note: '' })),
            running: true,
            stopped: false,
            snapshot: snapshotOf(current),
            undoDepth: current.wfUndo.length
          },
          wfUndo: pushUndo(current),
          ...STALE
        }));
        for (const row of list) {
          if (stopRun.current) break;
          setRow(row.id, { status: 'running', note: i18n.t(W.detect.noteLoading) });
          await nextFrame();
          let outcome: Omit<WfDetectRow, 'levelId' | 'name'>;
          try {
            outcome = await detectOne(row, replace && row.id === level.id);
          } catch {
            outcome = { status: 'failed', points: 0, paths: 0, source: null, note: i18n.t(W.detect.noteInvalid) };
          }
          setRow(row.id, outcome);
          await nextFrame();
        }
        const stopped = stopRun.current;
        patch((current) => {
          if (!current.wfDetect) return {};
          const rows = current.wfDetect.rows.map((row) => (row.status === 'queued' || row.status === 'running' ? { ...row, status: 'queued' as const, note: i18n.t(W.detect.noteStopped) } : row));
          const detected = rows.filter((row) => row.status === 'detected').length;
          // A run that changed nothing leaves nothing to undo.
          return {
            wfDetect: { ...current.wfDetect, rows, running: false, stopped },
            wfUndo: detected ? current.wfUndo : current.wfUndo.slice(0, current.wfDetect.undoDepth),
            wfTool: detected ? null : current.wfTool
          };
        });
        toast(i18n.t(stopped ? W.toast.detectStopped : W.toast.detectFinished));
      };
      // Replacing only means something when there is an SVG to read the new paths from.
      if (scope === 'plate' && plate?.points.length && planAssets(level, state.planOverrides[level.id]).svg) {
        patch(() => ({ wfMenuOpen: false }));
        askConfirm({
          title: t(W.detect.replaceTitle, { level: level.label }),
          message: i18n.t(W.detect.replaceBody),
          label: i18n.t(W.detect.replace),
          onConfirm: () => void go(true)
        });
        return;
      }
      void go(false);
    },
    [askConfirm, detectOne, level, levels, patch, plate?.points.length, setRow, state.planOverrides, toast]
  );

  const stopDetect = useCallback(() => {
    stopRun.current = true;
  }, []);

  /** The run card's Undo: the graph as it was before the run, and the run's entry off the undo stack. */
  const undoDetect = useCallback(() => {
    patch((current) =>
      current.wfDetect && !current.wfDetect.running
        ? { ...current.wfDetect.snapshot, wfUndo: current.wfUndo.slice(0, current.wfDetect.undoDepth), wfDetect: null, wfSel: null, wfSelEdge: null, wfFrom: null, ...STALE }
        : {}
    );
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

  /**
   * Arms a stop for placement: the next click on the plan puts it there.
   * Stops sit on the floorplate's Wayfinding layer — the floor image, as in
   * the CMS, or the floor SVG its hallways were detected from.
   */
  const armStop = useCallback(
    (key: string, levelId: string, name: string) => {
      const target = levelById(levels, levelId);
      if (!target) return;
      const layer = wayfindingSpace(target, state);
      if (!layer) {
        toast(t(W.toast.noImageForStop, { name, level: `${target.sub} · ${target.label}` }));
        return;
      }
      patch((current) => {
        const shown = activeSpace(target, { ...current, mode: 'plot' });
        return {
          stopTarget: key,
          selStop: null,
          levelId: target.id,
          mode: current.mode === 'plot' && shown !== layer && enabled ? 'wayfind' : current.mode,
          plotShow: { ...current.plotShow, stop: true },
          tool: 'select',
          plotSel: []
        };
      });
      toast(t(W.toast.placeStop, { name }));
    },
    [enabled, levels, patch, state, toast]
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

  /** Puts a stop at a point of the Wayfinding layer (an armed stop, or ticked stops under Manual Plot). */
  const placeStops = useCallback(
    (keys: string[], px: { x: number; y: number }) => {
      if (!level || !keys.length) return;
      const layer = wayfindingSpace(level, state) ?? 'raster';
      const step = Math.max(8, (plate?.dims?.w ?? 760) * 0.012);
      patch((current) => {
        const overrides = { ...current.nodeOverrides };
        let hidden = current.hiddenNodes;
        let tempStops = current.tempStops;
        keys.forEach((key, index) => {
          const at = { x: Math.round(px.x + index * step), y: Math.round(px.y) };
          if (key.startsWith('n:')) {
            tempStops = tempStops.map((stop) => (stop.key === key ? { ...stop, levelId: level.id, x: at.x, y: at.y, space: layer } : stop));
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
    [anchorName, level, patch, plate?.dims?.w, state, toast]
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

  // Escape lets go of the selected point, path or stop, as the design does; Ctrl/Cmd+Z undoes the last graph edit (the POC's shortcut), never while typing.
  useEffect(() => {
    if (!wayfind) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('.bo-modal, [role="alertdialog"]')) return;
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
        if (typing) return;
        event.preventDefault();
        undo();
        return;
      }
      if (event.key !== 'Escape') return;
      if (state.wfSel || state.wfFrom || state.wfSelEdge || state.selStop) deselect();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deselect, state.selStop, state.wfFrom, state.wfSel, state.wfSelEdge, undo, wayfind]);

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
      dismissReview: () => patch((current) => (current.wfDetect?.running ? {} : { wfDetect: null })),
      stopDetect,
      undo,
      autoConnect,
      confirmPending,
      onPointDoubleClick,
      onPathDoubleClick,
      onBendEnd,
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
