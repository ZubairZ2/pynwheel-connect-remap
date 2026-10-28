'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_API, APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { generateMapLevels } from '~/core/utils/generator/map/mapLevels.generator';
import { parsePinKey, type PinRef } from '~/core/utils/generator/map/mapState';
import {
  T,
  buildTourSetupPayload,
  tourSetupUnsavedCount,
  generateStopCards,
  generateTourSummary,
  initialTourState,
  dwellTimeProblem,
  stopEndpoints,
  stopSourceOptions,
  tourGraphs,
  tourStartPointRows,
  type LocalStop,
  type TourDialog,
  type TourLocalState,
  type TourTab
} from '~/core/utils/generator/tour/tourSetup.generator';
import { computeStopRoute } from '~/core/utils/wayfinding/stopRoute';
import { tourGet, tourPost } from '~/core/utils/tour/tourApi.client';
import { writeErrorText } from '~/core/hooks/tour/useTourLocks';
import type { TourPublication } from '~/core/models/data/tourModules.data';

/**
 * All of the Tour Setup screen's state. The stored tour never changes here:
 * reordering, hiding, adding or removing stops, talking points and the route
 * preview live in `TourLocalState` until Save (`TourSetup::Save`); the
 * publish action is its own request.
 */
export const useTourSetup = (map: PropertyMap, initialTab: TourTab = 'overview') => {
  const dispatch = useAppDispatch();
  const levels = useMemo(() => generateMapLevels(map), [map]);
  const graphs = useMemo(() => tourGraphs(map, levels), [map, levels]);
  const [state, setState] = useState<TourLocalState>(() => initialTourState(map, initialTab));
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // After a save the page re-reads the tour; the local state restarts from it once it arrives.
  const resetOnNextMap = useRef(false);
  useEffect(() => {
    if (!resetOnNextMap.current) return;
    resetOnNextMap.current = false;
    setState((current) => initialTourState(map, current.tab));
  }, [map]);

  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const patch = useCallback((update: (current: TourLocalState) => Partial<TourLocalState>) => {
    setState((current) => ({ ...current, ...update(current) }));
  }, []);

  /* ── publish (October 25, 2026) ───────────────────────────────────── */

  // When the tour was last published from Connect and whether the saved configuration moved since; read with the
  // page and again after every save (the map changes then).
  const propertyId = map.inventory.property.id;
  const [publication, setPublication] = useState<TourPublication | null>(null);
  const [publishing, setPublishing] = useState(false);
  const loadPublication = useCallback(async () => {
    const result = await tourGet<TourPublication>(propertyId, 'tour/publication');
    if (result.ok) setPublication(result.data);
  }, [propertyId]);
  useEffect(() => {
    void loadPublication();
  }, [loadPublication, map]);

  const stops = useMemo(() => generateStopCards(map, levels, state), [map, levels, state]);
  const summary = useMemo(() => generateTourSummary(map, state), [map, state]);
  const sources = useMemo(() => stopSourceOptions(map, state), [map, state]);
  const endpoints = useMemo(() => stopEndpoints(map, levels, graphs, state), [map, levels, graphs, state]);
  const startPoints = useMemo(() => tourStartPointRows(map, levels, graphs), [map, levels, graphs]);

  /** The property's building names (the graph's and the levels'), for the stops' route scopes. */
  const buildings = useMemo(() => {
    const names = new Set<string>();
    map.graph.buildings.forEach((name) => names.add(name));
    levels.forEach((level) => {
      if (level.building) names.add(level.building);
    });
    return [...names];
  }, [levels, map.graph.buildings]);

  /* ── stops ────────────────────────────────────────────────────────── */

  const moveStop = useCallback(
    (key: string, direction: -1 | 1) =>
      patch((current) => {
        const shown = current.stops.filter((stop) => !stop.removed);
        const index = shown.findIndex((stop) => stop.key === key);
        const other = index + direction;
        if (index < 0 || other < 0 || other >= shown.length) return {};
        const order = [...shown];
        [order[index], order[other]] = [order[other], order[index]];
        const hidden = current.stops.filter((stop) => stop.removed);
        return { stops: [...order, ...hidden] };
      }),
    [patch]
  );

  /** Drops a stop at a position among the shown stops (drag and drop on the Stops tab). */
  const moveStopTo = useCallback(
    (key: string, toIndex: number) =>
      patch((current) => {
        const shown = current.stops.filter((stop) => !stop.removed);
        const index = shown.findIndex((stop) => stop.key === key);
        if (index < 0) return {};
        const order = [...shown];
        const [moved] = order.splice(index, 1);
        order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, moved);
        if (order.every((stop, i) => stop.key === shown[i].key)) return {};
        const hidden = current.stops.filter((stop) => stop.removed);
        return { stops: [...order, ...hidden] };
      }),
    [patch]
  );

  /** Adds several units or amenities as stops at once (the Add stops modal); each is local until Save. */
  const addStops = useCallback(
    (ids: string[]): number => {
      const refs = ids.map(parsePinKey).filter((ref): ref is PinRef => ref != null);
      if (!refs.length) return 0;
      patch((current) => {
        const taken = new Set(current.stops.filter((stop) => !stop.removed).map((stop) => `${stop.kind}:${stop.recordId}`));
        const fresh = refs.filter((ref) => !taken.has(`${ref.kind}:${ref.id}`));
        return {
          stops: [
            ...current.stops,
            ...fresh.map(
              (ref, index): LocalStop => ({
                key: `local:${current.nextLocal + index}`,
                kind: ref.kind,
                recordId: ref.id,
                sort: null,
                visible: true,
                talkingPoint: '',
                duration: '',
                removed: false,
                local: true
              })
            )
          ],
          nextLocal: current.nextLocal + fresh.length
        };
      });
      return refs.length;
    },
    [patch]
  );

  const setTalkingPoint = useCallback(
    (key: string, value: string) => patch((current) => ({ stops: current.stops.map((stop) => (stop.key === key ? { ...stop, talkingPoint: value } : stop)) })),
    [patch]
  );

  const toggleVisible = useCallback(
    (key: string) => {
      patch((current) => ({ stops: current.stops.map((stop) => (stop.key === key ? { ...stop, visible: !stop.visible } : stop)) }));
      const stop = state.stops.find((row) => row.key === key);
      if (stop) toast(i18n.t(stop.visible ? T.toast.hidden : T.toast.shown));
    },
    [patch, state.stops, toast]
  );

  const removeStop = useCallback(
    (key: string) => {
      const card = stops.find((row) => row.key === key);
      if (!card) return;
      patch(() => ({
        confirm: {
          title: t(T.confirm.removeStopTitle, { name: card.name }),
          message: i18n.t(T.confirm.removeStopBody),
          label: i18n.t(T.confirm.removeStop),
          onConfirm: () => {
            patch((current) => ({ stops: current.stops.map((stop) => (stop.key === key ? { ...stop, removed: true } : stop)), confirm: null }));
            toast(t(T.toast.stopRemoved, { name: card.name }));
          }
        }
      }));
    },
    [patch, stops, toast]
  );

  const openAddStop = useCallback(() => {
    if (!sources.length) {
      toast(i18n.t(T.toast.nothingToPromote));
      return;
    }
    patch(() => ({ dialog: { kind: 'addStop', source: sources[0].id, duration: '3', talkingPoint: '' } }));
  }, [patch, sources, toast]);

  const openEditStop = useCallback(
    (key: string) => {
      const stop = state.stops.find((row) => row.key === key);
      if (!stop) return;
      patch(() => ({ dialog: { kind: 'editStop', key, duration: stop.duration, talkingPoint: stop.talkingPoint } }));
    },
    [patch, state.stops]
  );

  const setDialog = useCallback((update: Partial<Exclude<TourDialog, null>>) => {
    setState((current) => (current.dialog ? { ...current, dialog: { ...current.dialog, ...update } as TourDialog } : current));
  }, []);

  const closeDialog = useCallback(() => patch(() => ({ dialog: null })), [patch]);

  // The dwell time rule, for the field's message and the Save button; null when the open dialog has no dwell time or it is fine.
  const dialogProblem = state.dialog && (state.dialog.kind === 'addStop' || state.dialog.kind === 'editStop') ? dwellTimeProblem(state.dialog.duration) : null;

  const saveDialog = useCallback(() => {
    const dialog = state.dialog;
    if (!dialog) return;
    // Checked on this page only: an invalid dwell time never leaves the dialog (nothing is sent anyway).
    if ((dialog.kind === 'addStop' || dialog.kind === 'editStop') && dwellTimeProblem(dialog.duration)) return;
    if (dialog.kind === 'addStop') {
      const ref = parsePinKey(dialog.source);
      if (!ref) {
        toast(i18n.t(T.toast.pickSource));
        return;
      }
      const label = sources.find((option) => option.id === dialog.source)?.label ?? dialog.source;
      patch((current) => ({
        stops: [
          ...current.stops,
          {
            key: `local:${current.nextLocal}`,
            kind: ref.kind,
            recordId: ref.id,
            sort: null,
            visible: true,
            talkingPoint: dialog.talkingPoint,
            duration: dialog.duration,
            removed: false,
            local: true
          } satisfies LocalStop
        ],
        nextLocal: current.nextLocal + 1,
        dialog: null
      }));
      toast(t(T.toast.stopAdded, { name: label.replace(/^[^·]+· /, '') }));
      return;
    }
    patch((current) => ({
      stops: current.stops.map((stop) => (stop.key === dialog.key ? { ...stop, talkingPoint: dialog.talkingPoint, duration: dialog.duration } : stop)),
      dialog: null
    }));
    toast(i18n.t(T.toast.stopUpdated));
  }, [patch, sources, state.dialog, toast]);

  /* ── save ─────────────────────────────────────────────────────────── */

  const canSave = map.write.canEditMap && map.write.writesEnabled;
  const unsaved = useMemo(() => tourSetupUnsavedCount(map, state), [map, state]);

  /**
   * Saves the tour setup: the stops added, removed, hidden or shown, their
   * order and dwell times, as `TourSetup::Save` applies them in one
   * transaction. Talking points stay on the page (no column holds them yet, gap T2).
   */
  const save = useCallback(async () => {
    if (saving) return;
    if (!canSave) {
      toast(i18n.t(map.write.writesEnabled ? T.save.notAllowed : T.save.disabled));
      return;
    }
    const payload = buildTourSetupPayload(map, state);
    if (!tourSetupUnsavedCount(map, state)) {
      toast(i18n.t(T.save.nothing));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(APP_API.tourSetupSave(map.inventory.property.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      const body = (await response.json()) as { ok: true } | { ok: false; error: string; message: string | null };
      if (!body.ok) {
        switch (body.error) {
          case 'stale':
            toast(i18n.t(T.save.stale));
            break;
          case 'invalid':
            toast(t(T.save.invalid, { message: body.message ?? '' }));
            break;
          case 'forbidden':
            toast(i18n.t(T.save.forbidden));
            break;
          case 'disabled':
            toast(i18n.t(T.save.disabled));
            break;
          case 'unauthorized':
            toast(i18n.t(T.save.unauthorized));
            window.setTimeout(() => window.location.assign(APP_ROUTES.signIn), 1200);
            break;
          default:
            toast(i18n.t(T.save.failed));
        }
        return;
      }
      resetOnNextMap.current = true;
      toast(i18n.t(T.save.saved));
      router.refresh();
    } catch {
      toast(i18n.t(T.save.failed));
    } finally {
      setSaving(false);
    }
  }, [canSave, map, router, saving, state, toast]);

  /* ── routing ──────────────────────────────────────────────────────── */

  const computeRoute = useCallback(() => {
    const from = state.routeFrom || endpoints[0]?.key || '';
    const to = state.routeTo || endpoints[1]?.key || '';
    const a = endpoints.find((row) => row.key === from);
    const b = endpoints.find((row) => row.key === to);
    if (!a || !b || a.key === b.key) {
      patch(() => ({ routeFrom: from, routeTo: to, routeResult: { text: i18n.t(T.routing.chooseTwo), tone: 'crit' } }));
      return;
    }
    const result = computeStopRoute(map, levels, graphs, a, b);
    if (result.status !== 'ok') {
      patch(() => ({ routeFrom: from, routeTo: to, routeResult: { text: i18n.t(result.status === 'offGraph' ? T.routing.offGraph : T.routing.noPath), tone: 'crit' } }));
      return;
    }
    const parts = [t(T.routing.hops, { count: result.hops }), t(T.routing.length, { px: result.px.toLocaleString('en-US') })];
    if (result.floorChanges) parts.push(t(result.floorChanges === 1 ? T.routing.floorChangeOne : T.routing.floorChangeMany, { count: result.floorChanges }));
    if (result.buildingChanges) parts.push(t(result.buildingChanges === 1 ? T.routing.buildingChangeOne : T.routing.buildingChangeMany, { count: result.buildingChanges }));
    if (result.elevators.length) parts.push(t(T.routing.via, { names: result.elevators.join(', ') }));
    const warn = startPoints.missing ? `  ${i18n.t(T.routing.missingStart)}` : '';
    patch(() => ({
      routeFrom: from,
      routeTo: to,
      routeResult: { text: `${a.label} → ${b.label} · ${result.legs.join(' → ')} · ${parts.join(' · ')}${warn}`, tone: startPoints.missing ? 'warn' : 'ok' }
    }));
  }, [endpoints, graphs, levels, map, patch, startPoints.missing, state.routeFrom, state.routeTo]);

  return {
    map,
    levels,
    state,
    summary,
    stops,
    sources,
    endpoints,
    startPoints,
    buildings,
    hasStops: stops.length > 0,
    dialogProblem,
    unsaved,
    canSave,
    saving,
    publication,
    publishing,
    actions: {
      save,
      setTab: (tab: TourTab) => patch(() => ({ tab })),
      moveStop,
      moveStopTo,
      addStops,
      setTalkingPoint,
      toggleVisible,
      removeStop,
      openAddStop,
      openEditStop,
      setDialog,
      closeDialog,
      saveDialog,
      setRouteFrom: (key: string) => patch(() => ({ routeFrom: key })),
      setRouteTo: (key: string) => patch(() => ({ routeTo: key })),
      computeRoute,
      openPublish: () => {
        if (!stops.length) {
          toast(i18n.t(T.toast.publishNeedsStop));
          return;
        }
        void loadPublication();
        patch(() => ({ publishOpen: true }));
      },
      closePublish: () => patch(() => ({ publishOpen: false })),
      /** Records the saved configuration as the published one (`POST connect/tour/publish`); unsaved edits must be saved first. */
      publish: async () => {
        if (!canSave) {
          toast(i18n.t(map.write.writesEnabled ? T.save.notAllowed : T.save.disabled));
          return;
        }
        if (unsaved > 0) {
          toast(i18n.t(T.publish.saveFirst));
          return;
        }
        setPublishing(true);
        const result = await tourPost<TourPublication>(propertyId, 'tour/publish');
        if (result.ok) {
          setPublication(result.data);
          toast(i18n.t(result.data.alreadyPublished ? T.publish.already : T.publish.done));
          patch(() => ({ publishOpen: false }));
        } else {
          toast(result.error === 'invalid' && result.message ? result.message : writeErrorText(result));
        }
        setPublishing(false);
      },
      closeConfirm: () => patch(() => ({ confirm: null }))
    }
  };
};

export type TourSetupController = ReturnType<typeof useTourSetup>;
