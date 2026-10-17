'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_API } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { TourSetupController } from '~/core/hooks/useTourSetup';
import type { LockDeviceRow, LockInventory, LockTarget, StopRows, TourModuleMeta } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { levelById } from '~/core/utils/generator/map/mapLevels.generator';
import { L, targetParamId, targetParamType } from '~/core/utils/generator/tour/tourLocks.generator';
import {
  ST,
  draftChanged,
  draftOf,
  editableFields,
  generateLockChoices,
  generateRouteEndpoints,
  generateRouteSummary,
  generateStopGroups,
  generateStopItems,
  generateVariations,
  lockChoiceOf,
  type ContentDraft,
  type LockChoice,
  type StopListItem
} from '~/core/utils/generator/tour/tourStops.generator';
import { T, tourGraphs } from '~/core/utils/generator/tour/tourSetup.generator';
import { tourGet, tourPost } from '~/core/utils/tour/tourApi.client';
import { writeErrorText } from './useTourLocks';

const X = CORE_STRINGS.tourModules.common;
const E = CORE_STRINGS.tourModules.errors;

export type DrawerTab = 'content' | 'lock' | 'preview';
export type PathScope = 'plate' | 'floors' | 'buildings';
export type AddTab = 'all' | 'amenity' | 'unit';

/** `Wayfinding::RouteSerializer` as the `wayfinding-path` route hands it on (snake_case). */
export interface RouteStepJson {
  kind: string;
  leg: number;
  title: string;
  sub: string | null;
  dwell_s?: number;
}
export interface RouteLegJson {
  index: number;
  kind: string;
  level?: string;
  floor?: number | null;
  building?: string | null;
  points?: [number, number][];
  name?: string | null;
  floor_from?: number | null;
  floor_to?: number | null;
  length_px: number;
}
export interface RouteJson {
  success: boolean;
  length_px?: number;
  length_ft?: number | null;
  duration_s?: number | null;
  legs?: RouteLegJson[];
  steps?: RouteStepJson[];
  warnings?: string[];
  error?: { code: string; message: string; fix?: string | null } | null;
}

export interface PathResult {
  ok: boolean;
  head: string;
  sub: string | null;
  steps: RouteStepJson[];
  warnings: string[];
  legs: RouteLegJson[];
  /** The route service's error code when the route failed (`ambiguous_floor` opens the floor selects). */
  code: string | null;
}

interface PathState {
  scope: PathScope;
  from: string;
  to: string;
  stepFree: boolean;
  /** Floors the user picked after an `ambiguous_floor` answer; null leaves the endpoint's own floor (or none) in charge. */
  fromFloor: number | null;
  toFloor: number | null;
  loading: boolean;
  result: PathResult | null;
}

const failedPath = (head: string, sub: string | null = null, code: string | null = null, warnings: string[] = []): PathResult => ({ ok: false, head, sub, steps: [], warnings, legs: [], code });

export interface AddCandidate {
  id: string;
  kind: 'unit' | 'amenity';
  name: string;
  sub: string;
  plotted: boolean;
  levelId: string | null;
}

const TYPE_OF: Record<string, string> = { unit: 'Unit', amenity: 'Amenity', elevator: 'Elevator', building_starting_point: 'BuildingStartingPoint' };
const CONTENT_KEYS: Record<keyof ContentDraft, string> = { name: 'name', description: 'description', instructions: 'instructions', videoLink: 'video_link', virtualTourUrl: 'virtual_tour_url' };

/** The record a stop's lock sits on: its door when it has one (the CMS rows say), else the record itself. */
const stopTarget = (item: StopListItem | null): LockTarget | null => {
  if (!item?.row) return null;
  if (item.row.holder) return item.row.holder;
  if (!item.row.record) return null;
  return { type: TYPE_OF[item.row.record.kind], id: item.row.record.id, kind: item.row.record.kind, name: item.name, building: item.row.record.building, floor: item.row.record.floor, tourStopId: item.row.id };
};

/**
 * The Stops tab around the Tour Setup controller: the page's stop order
 * (local until Save) joined with the CMS rows (content, pin, lock, setup
 * gaps), the drawer (content saved to the record, the lock assigned through
 * the lock endpoints), the Add stops modal, the read-only route preview and
 * the shortest-path test against the saved graph.
 */
export const useTourStops = (propertyId: number, controller: TourSetupController, enabled = true, focusKey: string | null = null, openAddSignal = 0) => {
  const dispatch = useAppDispatch();
  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const { map, levels, stops: cards, state } = controller;
  const [rows, setRows] = useState<StopRows | null>(null);
  const [meta, setMeta] = useState<TourModuleMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(focusKey);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('content');
  const [draft, setDraftState] = useState<ContentDraft>(draftOf(null));
  const [savingContent, setSavingContent] = useState(false);
  const [inventory, setInventory] = useState<LockInventory | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [lockChoice, setLockChoice] = useState<LockChoice>('none');
  const [lockQuery, setLockQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [lockBusy, setLockBusy] = useState(false);
  /** A lock segment choice waiting for the "unmap the smart lock" confirmation. */
  const [lockConfirm, setLockConfirm] = useState<LockChoice | null>(null);
  const [add, setAdd] = useState<{ open: boolean; query: string; tab: AddTab; picked: string[] }>({ open: false, query: '', tab: 'all', picked: [] });
  const [drag, setDrag] = useState<{ key: string | null; over: string | null }>({ key: null, over: null });
  const [previewLevelId, setPreviewLevelId] = useState<string | null>(null);
  const [path, setPath] = useState<PathState>({ scope: 'plate', from: '', to: '', stepFree: false, fromFloor: null, toFloor: null, loading: false, result: null });

  /* ── the CMS rows ─────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setError(null);
    const result = await tourGet<StopRows>(propertyId, 'stops');
    if (result.ok) {
      setRows(result.data);
      setMeta(result.meta);
    } else {
      setError(result.error === 'unauthorized' ? i18n.t(E.unauthorized) : i18n.t(X.loadFailed));
    }
  }, [propertyId]);

  // Loaded with the tab, and again whenever the tour is re-read after a Save.
  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load, map]);

  const canEdit = !!meta?.canEdit && !!meta?.writesEnabled;
  const refuse = useCallback(() => toast(i18n.t(meta?.writesEnabled ? X.readOnly : X.writesOff)), [meta?.writesEnabled, toast]);

  const items = useMemo(() => generateStopItems(cards, state, rows), [cards, state, rows]);
  const buildingOrder = useMemo(() => rows?.tour?.buildingOrder ?? controller.buildings, [rows?.tour?.buildingOrder, controller.buildings]);
  const groups = useMemo(() => generateStopGroups(items, buildingOrder, onlyIssues), [items, buildingOrder, onlyIssues]);
  const summary = useMemo(() => generateRouteSummary(items), [items]);
  const variations = useMemo(() => generateVariations(map, rows), [map, rows]);
  const selected = useMemo(() => items.find((item) => item.key === selectedKey) ?? null, [items, selectedKey]);
  const issueCount = useMemo(() => items.filter((item) => item.issues.length > 0).length, [items]);

  // A stop removed from the page drops the selection.
  useEffect(() => {
    if (selectedKey && !items.some((item) => item.key === selectedKey)) setSelectedKey(null);
  }, [items, selectedKey]);

  // The drawer's fields restart from the row when another stop is picked. Every
  // load() makes new row objects (a lock write, Retry, a Save), so on a re-read
  // of the same stop the lock fields follow the row while the content fields
  // are only re-derived when the user has not typed in them.
  const selectedRow = selected?.row ?? null;
  const editedRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const keyChanged = lastKeyRef.current !== selectedKey;
    lastKeyRef.current = selectedKey;
    if (keyChanged) {
      editedRef.current = false;
      setLockQuery('');
      setLockConfirm(null);
    }
    if (keyChanged || !editedRef.current) setDraftState(draftOf(selectedRow));
    setLockChoice(lockChoiceOf(selectedRow?.lock ?? null));
    setManualCode(selectedRow?.lock?.manualCode ?? '');
  }, [selectedRow, selectedKey]);

  /* ── drawer: content ──────────────────────────────────────────────── */

  const dirty = useMemo(() => draftChanged(draft, selectedRow), [draft, selectedRow]);
  const editable = useMemo(() => editableFields(selectedRow), [selectedRow]);

  const setDraft = useCallback((patch: Partial<ContentDraft>) => {
    editedRef.current = true;
    setDraftState((current) => ({ ...current, ...patch }));
  }, []);

  const saveContent = useCallback(async () => {
    if (!selected?.row) return;
    if (!canEdit) return refuse();
    const base = draftOf(selected.row);
    const payload: Record<string, string> = {};
    (Object.keys(CONTENT_KEYS) as (keyof ContentDraft)[]).forEach((key) => {
      if (editable.has(CONTENT_KEYS[key]) && draft[key] !== base[key]) payload[CONTENT_KEYS[key]] = draft[key];
    });
    if (!Object.keys(payload).length) {
      toast(i18n.t(X.nothingToSave));
      return;
    }
    setSavingContent(true);
    const result = await tourPost<StopRows>(propertyId, `stops/${selected.row.id}`, payload);
    if (result.ok) {
      // The saved row is the new base: the drawer re-derives from it.
      editedRef.current = false;
      setRows(result.data);
      setMeta(result.meta);
      toast(i18n.t(ST.drawer.contentSaved));
    } else {
      toast(writeErrorText(result));
    }
    setSavingContent(false);
  }, [canEdit, draft, editable, propertyId, refuse, selected, toast]);

  /* ── drawer: lock ─────────────────────────────────────────────────── */

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    const result = await tourGet<LockInventory>(propertyId, 'locks');
    if (result.ok) setInventory(result.data);
    else setInventoryError(writeErrorText(result));
    setInventoryLoading(false);
  }, [propertyId]);

  useEffect(() => {
    // A failed read is remembered (`inventoryError`) and shown with a Retry
    // button; without that guard the effect would re-run the request forever.
    if (drawerTab === 'lock' && !inventory && !inventoryLoading && !inventoryError) void loadInventory();
  }, [drawerTab, inventory, inventoryError, inventoryLoading, loadInventory]);

  const target = useMemo(() => stopTarget(selected), [selected]);
  const lockChoices = useMemo(() => generateLockChoices(inventory, lockQuery, selectedRow?.lock ?? null), [inventory, lockQuery, selectedRow]);

  const lockWrite = useCallback(
    async (name: string, payload: unknown, success: string): Promise<boolean> => {
      setLockBusy(true);
      const result = await tourPost<LockInventory>(propertyId, name, payload);
      if (result.ok) {
        setInventory(result.data);
        setMeta(result.meta);
        await load();
        toast(success);
      } else {
        toast(writeErrorText(result));
      }
      setLockBusy(false);
      return result.ok;
    },
    [load, propertyId, toast]
  );

  const assignDevice = useCallback(
    (device: LockDeviceRow) => {
      if (!target) return;
      if (!canEdit) return refuse();
      void lockWrite('locks/map', { vendor: device.vendor, device_id: device.deviceId, target_type: targetParamType(target), target_id: targetParamId(target) }, i18n.t(L.toast.mapped));
    },
    [canEdit, lockWrite, refuse, target]
  );

  const unassign = useCallback(() => {
    const device = selectedRow?.lock?.device;
    if (!device) return;
    if (!canEdit) return refuse();
    void lockWrite('locks/unmap', { vendor: device.vendor, device_id: device.deviceId }, i18n.t(L.toast.unmapped));
  }, [canEdit, lockWrite, refuse, selectedRow]);

  const saveManual = useCallback(() => {
    if (!target) return;
    if (!canEdit) return refuse();
    const code = manualCode.trim();
    if (!/^[0-9#*]{1,10}$/.test(code)) {
      toast(i18n.t(ST.lock.codeInvalid));
      return;
    }
    void lockWrite('locks/manual_code', { target_type: targetParamType(target), target_id: targetParamId(target), code }, i18n.t(L.manual.saved));
  }, [canEdit, lockWrite, manualCode, refuse, target, toast]);

  const clearManual = useCallback(() => {
    if (!target) return;
    if (!canEdit) return refuse();
    void lockWrite('locks/manual_code', { target_type: targetParamType(target), target_id: targetParamId(target), code: '' }, i18n.t(L.manual.removed));
  }, [canEdit, lockWrite, refuse, target]);

  /** The lock segment: `none` drops whatever the stop has; the other two show their editor until something is assigned. */
  const applyLockChoice = useCallback(
    (choice: LockChoice) => {
      setLockChoice(choice);
      if (choice !== 'none' || !selectedRow?.lock) return;
      if (selectedRow.lock.device) unassign();
      else if (selectedRow.lock.provider === 'Manual') clearManual();
    },
    [clearManual, selectedRow, unassign]
  );

  /**
   * Leaving `smart` on a stop whose holder carries a device releases that
   * device (`none` unmaps it here; a saved manual code unmaps it in the
   * service), so those two choices wait for a confirmation first.
   */
  const chooseLock = useCallback(
    (choice: LockChoice) => {
      if (choice !== 'smart' && choice !== lockChoice && selectedRow?.lock?.device) {
        setLockConfirm(choice);
        return;
      }
      applyLockChoice(choice);
    },
    [applyLockChoice, lockChoice, selectedRow]
  );

  const confirmLockChoice = useCallback(() => {
    if (!lockConfirm) return;
    setLockConfirm(null);
    applyLockChoice(lockConfirm);
  }, [applyLockChoice, lockConfirm]);

  const cancelLockChoice = useCallback(() => setLockConfirm(null), []);

  /* ── list: selection, drag and drop ───────────────────────────────── */

  const select = useCallback((key: string | null) => {
    setSelectedKey(key);
    setDrawerTab('content');
  }, []);

  const shownOrder = useMemo(() => cards.map((card) => card.key), [cards]);
  const onDragStart = useCallback((key: string) => setDrag({ key, over: null }), []);
  const onDragOver = useCallback((key: string) => setDrag((current) => (current.over === key ? current : { ...current, over: key })), []);
  const onDrop = useCallback(
    (key: string) => {
      if (drag.key && drag.key !== key) controller.actions.moveStopTo(drag.key, shownOrder.indexOf(key));
      setDrag({ key: null, over: null });
    },
    [controller.actions, drag.key, shownOrder]
  );
  const onDragEnd = useCallback(() => setDrag({ key: null, over: null }), []);

  /* ── add stops ────────────────────────────────────────────────────── */

  const candidates = useMemo((): AddCandidate[] => {
    const taken = new Set(state.stops.filter((stop) => !stop.removed).map((stop) => `${stop.kind}:${stop.recordId}`));
    const floor = (value: number | null) => (value == null ? null : t(T.stops.floor, { floor: value }));
    const amenities = map.inventory.amenities
      .filter((amenity) => (amenity.ownerType == null || amenity.ownerType === 'Floorplate' || amenity.ownerType === 'Sitemap') && !taken.has(`amenity:${amenity.id}`))
      .map(
        (amenity): AddCandidate => ({
          id: `amenity:${amenity.id}`,
          kind: 'amenity',
          name: amenity.name,
          sub: [i18n.t(ST.kind.amenity), amenity.building ?? amenity.ownerBuilding, floor(amenity.floor)].filter(Boolean).join(' · '),
          plotted: amenity.plotted,
          levelId: null
        })
      );
    const units = map.inventory.units
      .filter((unit) => !taken.has(`unit:${unit.id}`))
      .map(
        (unit): AddCandidate => ({
          id: `unit:${unit.id}`,
          kind: 'unit',
          name: unit.displayName ?? unit.marketingName ?? `#${unit.id}`,
          sub: [i18n.t(ST.kind.unit), unit.building, floor(unit.floor)].filter(Boolean).join(' · '),
          plotted: unit.plotted,
          levelId: null
        })
      );
    return [...amenities, ...units];
  }, [map.inventory.amenities, map.inventory.units, state.stops]);

  const addShown = useMemo(() => {
    const q = add.query.trim().toLowerCase();
    return candidates.filter((row) => (add.tab === 'all' || row.kind === add.tab) && (!q || `${row.name} ${row.sub}`.toLowerCase().includes(q)));
  }, [add.query, add.tab, candidates]);

  const openAdd = useCallback(() => setAdd({ open: true, query: '', tab: 'all', picked: [] }), []);
  // The page header's Add Stop button opens the same modal.
  useEffect(() => {
    if (openAddSignal > 0) openAdd();
  }, [openAdd, openAddSignal]);
  const closeAdd = useCallback(() => setAdd((current) => ({ ...current, open: false })), []);
  const togglePick = useCallback((id: string) => setAdd((current) => ({ ...current, picked: current.picked.includes(id) ? current.picked.filter((row) => row !== id) : [...current.picked, id] })), []);
  const pickShown = useCallback(() => setAdd((current) => ({ ...current, picked: [...new Set([...current.picked, ...addShown.filter((row) => row.plotted).map((row) => row.id)])] })), [addShown]);
  const clearShown = useCallback(() => setAdd((current) => ({ ...current, picked: current.picked.filter((id) => !addShown.some((row) => row.id === id)) })), [addShown]);
  const submitAdd = useCallback(() => {
    const picked = add.picked.filter((id) => candidates.some((row) => row.id === id && row.plotted));
    if (!picked.length) return;
    const count = controller.actions.addStops(picked);
    toast(t(ST.add.added, { count }));
    setAdd({ open: false, query: '', tab: 'all', picked: [] });
  }, [add.picked, candidates, controller.actions, toast]);

  /* ── route preview and the shortest-path test ─────────────────────── */

  const graphs = useMemo(() => tourGraphs(map, levels), [map, levels]);
  const previewLevel = useMemo(
    () => levelById(levels, previewLevelId) ?? (selected?.levelId ? levelById(levels, selected.levelId) : null) ?? levels[0] ?? null,
    [levels, previewLevelId, selected?.levelId]
  );
  const previewGraph = previewLevel ? (graphs[previewLevel.id] ?? null) : null;

  /** Stop number by graph key: `unit:5` / `amenity:7` for pins, `e:3` / `b:2` for the graph's elevator and entry nodes. */
  const numByKey = useMemo(() => {
    const out = new Map<string, { num: string; key: string; color: string }>();
    items.forEach((item) => {
      if (item.hidden) return;
      const entry = { num: item.num, key: item.key, color: item.color };
      if (item.card.viewParams.pin) out.set(`${item.card.viewParams.pin.kind}:${item.card.viewParams.pin.id}`, entry);
      else if (item.row && item.kind === 'elevator') out.set(`e:${item.row.stopId}`, entry);
      else if (item.row && item.kind === 'building_starting_point') out.set(`b:${item.row.stopId}`, entry);
    });
    return out;
  }, [items]);

  const previewPins = useMemo(() => {
    if (!previewGraph) return [];
    const out: { key: string; x: number; y: number; num: string | null; color: string; stopKey: string | null; label: string }[] = [];
    previewGraph.pins.forEach((pin) => {
      const hit = numByKey.get(`${pin.ref.kind}:${pin.ref.id}`);
      if (hit) out.push({ key: pin.key, x: pin.xPct, y: pin.yPct, num: hit.num, color: hit.color, stopKey: hit.key, label: pin.label });
    });
    previewGraph.nodes
      .filter((node) => node.kind !== 'hallway')
      .forEach((node) => {
        const hit = numByKey.get(node.key);
        out.push({ key: node.key, x: node.xPct, y: node.yPct, num: hit?.num ?? null, color: hit?.color ?? '#0077AE', stopKey: hit?.key ?? null, label: node.label });
      });
    return out;
  }, [numByKey, previewGraph]);

  const endpoints = useMemo(() => generateRouteEndpoints(map, items, levels, path.scope, previewLevel?.id ?? null), [items, levels, map, path.scope, previewLevel?.id]);

  // The ends follow the list: a missing end takes the first two places.
  useEffect(() => {
    setPath((current) => {
      const keys = endpoints.map((row) => row.key);
      const from = keys.includes(current.from) ? current.from : (keys[0] ?? '');
      const to = keys.includes(current.to) && current.to !== from ? current.to : (keys.find((key) => key !== from) ?? '');
      return from === current.from && to === current.to ? current : { ...current, from, to };
    });
  }, [endpoints]);

  /** The floors the "From floor" / "To floor" selects offer after an `ambiguous_floor` answer: the previewed plate's. */
  const floorOptions = useMemo(() => previewLevel?.floors ?? [], [previewLevel]);
  const needsFloorPick = path.result?.code === 'ambiguous_floor' || path.fromFloor != null || path.toFloor != null;

  const findPath = useCallback(async () => {
    if (!path.from || !path.to || path.from === path.to) {
      setPath((current) => ({ ...current, result: failedPath(i18n.t(ST.path.pick)) }));
      return;
    }
    setPath((current) => ({ ...current, loading: true }));
    let result: PathResult;
    try {
      const query = new URLSearchParams({ from: path.from, to: path.to, step_free: path.stepFree ? '1' : '0' });
      // A place on a stacked floorplate needs its floor: the one the user picked
      // after an `ambiguous_floor` answer, else the record's own, else (on "This
      // floor", and only for a place on the previewed plate) the plate's lowest
      // floor. An elevator or entry point of another level sends none, so Rails
      // can answer `ambiguous_floor` and the selects below take over.
      const plateFallback = path.scope === 'plate' && previewLevel && previewLevel.floors.length ? previewLevel.floors[0] : null;
      const floorOf = (key: string, picked: number | null): number | null => {
        if (picked != null) return picked;
        const row = endpoints.find((item) => item.key === key);
        if (!row) return null;
        if (row.floor != null) return row.floor;
        return previewLevel && row.levelId === previewLevel.id ? plateFallback : null;
      };
      const floorA = floorOf(path.from, path.fromFloor);
      const floorB = floorOf(path.to, path.toFloor);
      if (floorA != null) query.set('from_floor', String(floorA));
      if (floorB != null) query.set('to_floor', String(floorB));
      const response = await fetch(`${APP_API.wayfindingPath(propertyId)}?${query.toString()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const body = (await response.json()) as { ok: boolean; route?: RouteJson; error?: string };
      const route = body.route;
      if (!route) {
        result = failedPath(body.error === 'unauthorized' ? i18n.t(E.unauthorized) : i18n.t(ST.path.failed));
      } else if (!route.success) {
        const code = route.error?.code ?? 'unknown';
        const known = (ST.path.error as Record<string, string>)[code];
        // Rails' own message says which place is ambiguous; the catalogue line is the fallback.
        const head = code === 'ambiguous_floor' && route.error?.message ? route.error.message : known ? i18n.t(known) : t(ST.path.error.default, { error: route.error?.message ?? code });
        result = failedPath(head, route.error?.fix ?? null, code, route.warnings ?? []);
      } else {
        const minutes = Math.max(1, Math.round((route.duration_s ?? 0) / 60));
        const head = route.length_ft != null ? t(ST.path.result, { ft: Math.round(route.length_ft), minutes }) : t(ST.path.resultPx, { px: Math.round(route.length_px ?? 0) });
        const legs = route.legs ?? [];
        result = { ok: true, head, sub: t(ST.path.legs, { legs: legs.length }), steps: route.steps ?? [], warnings: route.warnings ?? [], legs, code: null };
        const first = legs.find((leg) => leg.kind === 'walk' && leg.level);
        if (first?.level && first.level !== previewLevel?.id && levelById(levels, first.level)) setPreviewLevelId(first.level);
      }
    } catch {
      result = failedPath(i18n.t(ST.path.failed));
    }
    setPath((current) => ({ ...current, loading: false, result }));
  }, [endpoints, levels, path.from, path.fromFloor, path.scope, path.stepFree, path.to, path.toFloor, previewLevel, propertyId]);

  const routeLegsHere = useMemo(
    () => (path.result?.legs ?? []).filter((leg) => leg.kind === 'walk' && leg.level === previewLevel?.id && (leg.points?.length ?? 0) > 1),
    [path.result, previewLevel?.id]
  );

  const toggleVisible = useCallback((key: string) => controller.actions.toggleVisible(key), [controller.actions]);

  return {
    levels,
    toggleVisible,
    rows,
    meta,
    error,
    reload: load,
    canEdit,
    onlyIssues,
    setOnlyIssues,
    items,
    groups,
    summary,
    variations,
    issueCount,
    selected,
    select,
    drawerTab,
    setDrawerTab,
    draft,
    setDraft,
    dirty,
    editable,
    savingContent,
    saveContent,
    inventory,
    inventoryLoading,
    inventoryError,
    retryInventory: loadInventory,
    lockChoice,
    chooseLock,
    lockConfirm,
    confirmLockChoice,
    cancelLockChoice,
    lockQuery,
    setLockQuery,
    lockChoices,
    manualCode,
    setManualCode,
    lockBusy,
    assignDevice,
    unassign,
    saveManual,
    clearManual,
    target,
    drag,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    add,
    setAdd,
    candidates,
    addShown,
    openAdd,
    closeAdd,
    togglePick,
    pickShown,
    clearShown,
    submitAdd,
    previewLevel,
    previewGraph,
    previewPins,
    setPreviewLevelId,
    endpoints,
    path,
    setPath,
    floorOptions,
    needsFloorPick,
    findPath,
    routeLegsHere
  };
};

export type TourStopsController = ReturnType<typeof useTourStops>;
