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
import { parsePinKey } from '~/core/utils/generator/map/mapState';
import {
  T,
  buildTourSetupPayload,
  tourSetupUnsavedCount,
  generateElevatorCards,
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

/**
 * All of the Tour Setup screen's state. The stored tour never changes here:
 * reordering, hiding, adding or removing stops, talking points, elevator
 * gating, photos and banks, and the route preview live in `TourLocalState`
 * until the page reloads. No action sends a request.
 */
export const useTourSetup = (map: PropertyMap) => {
  const dispatch = useAppDispatch();
  const levels = useMemo(() => generateMapLevels(map), [map]);
  const graphs = useMemo(() => tourGraphs(map, levels), [map, levels]);
  const [state, setState] = useState<TourLocalState>(() => initialTourState(map));
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // After a save the page re-reads the tour; the local state restarts from it once it arrives.
  const resetOnNextMap = useRef(false);
  useEffect(() => {
    if (!resetOnNextMap.current) return;
    resetOnNextMap.current = false;
    setState(initialTourState(map));
  }, [map]);

  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const patch = useCallback((update: (current: TourLocalState) => Partial<TourLocalState>) => {
    setState((current) => ({ ...current, ...update(current) }));
  }, []);

  const stops = useMemo(() => generateStopCards(map, levels, state), [map, levels, state]);
  const elevators = useMemo(() => generateElevatorCards(map, levels, state), [map, levels, state]);
  const summary = useMemo(() => generateTourSummary(map, state), [map, state]);
  const sources = useMemo(() => stopSourceOptions(map, state), [map, state]);
  const endpoints = useMemo(() => stopEndpoints(map, levels, graphs, state), [map, levels, graphs, state]);
  const startPoints = useMemo(() => tourStartPointRows(map, levels, graphs), [map, levels, graphs]);

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
    if (dialog.kind === 'editStop') {
      patch((current) => ({
        stops: current.stops.map((stop) => (stop.key === dialog.key ? { ...stop, talkingPoint: dialog.talkingPoint, duration: dialog.duration } : stop)),
        dialog: null
      }));
      toast(i18n.t(T.toast.stopUpdated));
      return;
    }
    if (!dialog.name.trim()) {
      toast(i18n.t(T.toast.bankName));
      return;
    }
    patch((current) => ({
      localElevators: [
        ...current.localElevators,
        { key: `local-elevator:${current.nextLocal}`, name: dialog.name.trim(), building: dialog.building, from: dialog.from, to: dialog.to, gated: dialog.gated }
      ],
      nextLocal: current.nextLocal + 1,
      dialog: null
    }));
    toast(t(T.toast.bankAdded, { name: dialog.name.trim() }));
  }, [patch, sources, state.dialog, toast]);

  /* ── elevators ────────────────────────────────────────────────────── */

  const toggleGated = useCallback(
    (key: string) => {
      const card = elevators.find((row) => row.key === key);
      if (!card) return;
      if (card.local) patch((current) => ({ localElevators: current.localElevators.map((row) => (row.key === key ? { ...row, gated: !row.gated } : row)) }));
      else patch((current) => ({ gated: { ...current.gated, [Number(key)]: !card.gated } }));
      toast(i18n.t(card.gated ? T.toast.ungated : T.toast.gated));
    },
    [elevators, patch, toast]
  );

  const addPhoto = useCallback(
    (key: string, file: File) => {
      const url = URL.createObjectURL(file);
      patch((current) => ({ photos: { ...current.photos, [key]: [...(current.photos[key] ?? []), { name: file.name, url }] } }));
      toast(t(T.toast.photoAdded, { file: file.name }));
    },
    [patch, toast]
  );

  const removePhoto = useCallback(
    (key: string, photoKey: string) => {
      patch(() => ({
        confirm: {
          title: i18n.t(T.confirm.removePhotoTitle),
          message: i18n.t(T.confirm.removePhotoBody),
          label: i18n.t(T.confirm.removePhoto),
          onConfirm: () => {
            patch((current) => {
              if (photoKey.startsWith('local:')) {
                const url = photoKey.slice(6);
                return { photos: { ...current.photos, [key]: (current.photos[key] ?? []).filter((photo) => photo.url !== url) }, confirm: null };
              }
              const order = (current.photoOrder[key] ?? elevators.find((row) => row.key === key)?.photos.filter((photo) => !photo.local).map((photo) => photo.key) ?? []).filter(
                (row) => row !== photoKey
              );
              return { photoOrder: { ...current.photoOrder, [key]: order }, confirm: null };
            });
            toast(i18n.t(T.toast.photoRemoved));
          }
        }
      }));
    },
    [elevators, patch, toast]
  );

  const movePhoto = useCallback(
    (key: string, photoKey: string, direction: -1 | 1) =>
      patch((current) => {
        const card = elevators.find((row) => row.key === key);
        if (!card) return {};
        const stored = card.photos.filter((photo) => !photo.local).map((photo) => photo.key);
        const index = stored.indexOf(photoKey);
        const other = index + direction;
        if (index < 0 || other < 0 || other >= stored.length) return {};
        const order = [...stored];
        [order[index], order[other]] = [order[other], order[index]];
        return { photoOrder: { ...current.photoOrder, [key]: order } };
      }),
    [elevators, patch]
  );

  const removeElevator = useCallback(
    (key: string) => {
      const card = elevators.find((row) => row.key === key);
      if (!card) return;
      patch(() => ({
        confirm: {
          title: t(T.confirm.removeElevatorTitle, { name: card.name }),
          message: i18n.t(T.confirm.removeElevatorBody),
          label: i18n.t(T.confirm.removeElevator),
          onConfirm: () => {
            patch((current) =>
              card.local
                ? { localElevators: current.localElevators.filter((row) => row.key !== key), confirm: null }
                : { removedElevators: [...current.removedElevators, Number(key)], confirm: null }
            );
            toast(t(T.toast.elevatorRemoved, { name: card.name }));
          }
        }
      }));
    },
    [elevators, patch, toast]
  );

  const openAddElevator = useCallback(
    () => patch(() => ({ dialog: { kind: 'addElevator', name: '', building: buildings[0] ?? '', from: '', to: '', gated: true } })),
    [buildings, patch]
  );

  /* ── save ─────────────────────────────────────────────────────────── */

  const canSave = map.write.canEditMap && map.write.writesEnabled;
  const unsaved = useMemo(() => tourSetupUnsavedCount(map, state), [map, state]);

  /**
   * Saves the tour setup: the stops added, removed, hidden or shown, their
   * order and dwell times, and the elevators deleted, as `TourSetup::Save`
   * applies them in one transaction. Talking points, gating and photos stay
   * on the page (no column holds them yet, gaps T2 / T4).
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
    elevators,
    sources,
    endpoints,
    startPoints,
    buildings,
    hasStops: stops.length > 0,
    dialogProblem,
    unsaved,
    canSave,
    saving,
    actions: {
      save,
      setTab: (tab: TourTab) => patch(() => ({ tab })),
      moveStop,
      setTalkingPoint,
      toggleVisible,
      removeStop,
      openAddStop,
      openEditStop,
      setDialog,
      closeDialog,
      saveDialog,
      toggleGated,
      addPhoto,
      removePhoto,
      movePhoto,
      removeElevator,
      openAddElevator,
      setRouteFrom: (key: string) => patch(() => ({ routeFrom: key })),
      setRouteTo: (key: string) => patch(() => ({ routeTo: key })),
      computeRoute,
      openPublish: () => {
        if (!stops.length) {
          toast(i18n.t(T.toast.publishNeedsStop));
          return;
        }
        patch(() => ({ publishOpen: true }));
      },
      closePublish: () => patch(() => ({ publishOpen: false })),
      closeConfirm: () => patch(() => ({ confirm: null }))
    }
  };
};

export type TourSetupController = ReturnType<typeof useTourSetup>;
