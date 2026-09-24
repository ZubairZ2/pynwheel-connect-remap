'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import {
  brandingRoute,
  contentRoute,
  mapEditorRoute,
  orgGroupsRoute,
  orgRegionsRoute,
  orgRoute,
  propPricingRoute,
  propRoute,
  propUnitsRoute,
  tourContentRoute,
  tourSetupRoute,
  unitRoute,
  CONNECT_ROUTES
} from '~/config/app/connectRoutes';
import { plural } from '~/core/utils/connect/format';
import { demoActions } from '~/core/store/demo/demo.slice';
import {
  allNodes,
  curInv,
  curLevel,
  curProp,
  curTour,
  invItem,
  levels,
  lvAssets,
  nodeById,
  pinLevelOf
} from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector, useAppStore } from '~/core/store/hooks';
import type { DemoState, PendingAction, PinRef } from '~/core/store/demo/demo.state';

export interface ConfirmRequest {
  title: string;
  msg: string;
  label: string;
  action: PendingAction;
  match?: string;
}

/**
 * The orchestration layer for the ported screens (react-architecture.md §7).
 *
 * Generators stay pure, so anything that needs to *read* state before deciding
 * what to dispatch — routing a tour, auto-plotting pins, a delayed connection
 * test — lives here rather than in a generator or a component.
 */
export const useConnectActions = () => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const propId = useAppSelector((s) => s.demo.propId);
  const orgId = useAppSelector((s) => s.demo.orgId);

  return useMemo(() => {
    const read = (): DemoState => store.getState().demo;
    const toast = (message: string) => dispatch(demoActions.showToast(message));

    const confirm = (request: ConfirmRequest) => dispatch(demoActions.askConfirm(request));

    /**
     * Runs the action a confirm dialog was armed with. A pending action is a
     * plain object so the store stays serialisable; the few flows that need to
     * read state first register here instead of in the slice.
     */
    const localHandlers: Record<string, (payload?: unknown) => void> = {};

    const doConfirm = () => {
      const state = read();
      if (state.confirmMatch && state.confirmInput.trim() !== state.confirmMatch) return;
      const pending = state.pending;
      dispatch(demoActions.closeConfirm());
      if (!pending) return;
      const local = localHandlers[pending.type];
      if (local) local(pending.payload);
      else dispatch({ type: pending.type, payload: pending.payload });
    };

    /* ---------------- navigation ---------------- */

    const go = (href: string) => router.push(href);

    const openOrg = (id: string) => {
      dispatch(demoActions.selectOrg(id));
      router.push(orgRoute(id));
    };

    const openProp = (id: string) => {
      dispatch(demoActions.selectProp(id));
      router.push(propRoute(id));
    };

    const openUnit = (id: string) => {
      dispatch(demoActions.selectUnit(id));
      router.push(unitRoute(read().propId, id));
    };

    /* ---------------- map editor ---------------- */

    /** Jumps into the editor with an item armed for plotting. */
    const plotItem = (ref: PinRef, mode: 'plot' | 'select') => {
      const state = read();
      const item = invItem(state, ref.kind, ref.id);
      if (!item) return;
      const level = levels(state).find((l) => l.id === pinLevelOf(item)) ?? levels(state)[0];
      if (mode === 'plot') {
        dispatch(demoActions.armPlot({ ...ref, levelId: level?.id }));
        toast(`${item.name} is armed — click the ${level?.floor ?? 'floor'} plan to place its pin.`);
      } else {
        dispatch(demoActions.pickLevel(level?.id ?? state.levelId));
        dispatch(demoActions.selectPin(ref));
        toast(`${item.name} selected on the ${level?.floor ?? 'floor'} plan.`);
      }
      router.push(mapEditorRoute(state.propId));
    };

    const autoPlot = () => {
      const state = read();
      const inv = curInv(state);
      const pool = [
        ...inv.units.filter((u) => !u.plotted).map((u) => ({ kind: 'unit' as const, o: u })),
        ...inv.amenities.filter((a) => !a.plotted).map((a) => ({ kind: 'amenity' as const, o: a }))
      ];
      if (!pool.length) {
        toast('Every unit and amenity is already plotted.');
        return;
      }
      confirm({
        title: `Auto-plot ${plural(pool.length, 'item')} from PMS data?`,
        msg: 'Pynwheel places a pin for every record whose floor and building match a level with a site plan. Records without a matching plan are reported back and stay unplotted.',
        label: 'Auto-Plot',
        action: { type: 'connect/runAutoPlot' }
      });
    };

    /** Resolves the auto-plot placements, then hands them to the reducer. */
    const runAutoPlot = () => {
      const state = read();
      const inv = curInv(state);
      const list = levels(state);
      const pool = [
        ...inv.units.filter((u) => !u.plotted).map((u) => ({ kind: 'unit' as const, o: u })),
        ...inv.amenities.filter((a) => !a.plotted).map((a) => ({ kind: 'amenity' as const, o: a }))
      ];

      const placements: Array<PinRef & { lv: string; x: number; y: number }> = [];
      const skipped: Array<{ name: string; reason: string }> = [];
      const perLevel: Record<string, number> = {};

      pool.forEach((entry) => {
        const level = list.find((l) => l.id === pinLevelOf(entry.o));
        if (!level) {
          skipped.push({
            name: entry.o.name,
            reason: `PMS floor "${'floor' in entry.o ? entry.o.floor : '—'}" has no matching level`
          });
          return;
        }
        if (!lvAssets(state, level).has) {
          skipped.push({
            name: entry.o.name,
            reason: `No site plan uploaded for ${level.building} · ${level.floor}`
          });
          return;
        }
        const index = (perLevel[level.id] = (perLevel[level.id] ?? 0) + 1) - 1;
        placements.push({
          kind: entry.kind,
          id: entry.o.id,
          lv: level.id,
          x: 18 + (index % 4) * 22,
          y: 26 + Math.floor(index / 4) * 20
        });
      });

      dispatch(
        demoActions.runAutoPlot({
          placed: placements.length,
          skipped,
          when: 'just now',
          placements
        })
      );
    };

    localHandlers['connect/runAutoPlot'] = runAutoPlot;

    /** Breadth-first route across the pathway graph, including vertical links. */
    const computeRoute = () => {
      const state = read();
      const tour = curTour(state);
      const list = levels(state);
      let from = state.routeFrom || tour.stops[0]?.id || '';
      let to = state.routeTo || tour.stops[1]?.id || '';

      if (!from || !to || from === to) {
        dispatch(demoActions.setRouteResult({ text: 'Choose two different stops.', color: '#C62534' }));
        return;
      }

      const adjacency: Record<string, string[]> = {};
      allNodes(state).forEach((n) => {
        adjacency[n.id] = [];
      });
      tour.edges.forEach(([a, b]) => {
        if (adjacency[a] && adjacency[b]) {
          adjacency[a].push(b);
          adjacency[b].push(a);
        }
      });

      const queue: string[][] = [[from]];
      const seen: Record<string, boolean> = { [from]: true };
      let path: string[] | null = null;

      while (queue.length) {
        const current = queue.shift() as string[];
        const last = current[current.length - 1];
        if (last === to) {
          path = current;
          break;
        }
        (adjacency[last] ?? []).forEach((next) => {
          if (!seen[next]) {
            seen[next] = true;
            queue.push([...current, next]);
          }
        });
      }

      if (!path) {
        dispatch(
          demoActions.setRouteResult({
            text: 'No path — connect these stops with edges, including a vertical link between floors.',
            color: '#C62534'
          })
        );
        return;
      }

      const levelOf = (nodeLevel: string | undefined) =>
        list.find((l) => l.id === nodeLevel) ?? list[0];

      let distance = 0;
      let floorChanges = 0;
      let buildingChanges = 0;

      for (let i = 1; i < path.length; i += 1) {
        const a = nodeById(state, path[i - 1]);
        const b = nodeById(state, path[i]);
        if (!a || !b) continue;
        const la = levelOf(a.level);
        const lb = levelOf(b.level);
        if (la?.id !== lb?.id) {
          floorChanges += 1;
          if (la?.building !== lb?.building) buildingChanges += 1;
        } else {
          distance += Math.hypot(a.x - b.x, a.y - b.y);
        }
      }

      const labels = path.map((id) => {
        const node = nodeById(state, id);
        return `${node?.name ?? ''} (${levelOf(node?.level)?.floor ?? ''})`;
      });
      const parts = [`${path.length - 1} hops`, `~${Math.round(distance * 6)} ft`];
      if (floorChanges) parts.push(plural(floorChanges, 'floor change'));
      if (buildingChanges) parts.push(plural(buildingChanges, 'building transfer'));

      const missing = [...new Set(list.map((l) => l.building))].filter((b) => !tour.startPoints[b]);
      const warning = missing.length ? `  ⚠ No starting point set for ${missing.join(', ')}` : '';

      dispatch(
        demoActions.setRouteResult({
          text: `${labels.join(' → ')}  ·  ${parts.join(' · ')}${warning}`,
          color: missing.length ? '#8A6A00' : '#4A7212'
        })
      );
    };

    const publishTour = () => {
      const state = read();
      const tour = curTour(state);
      const inv = curInv(state);
      const prop = curProp(state);
      if (!tour.stops.length) {
        toast('Add at least one stop before publishing.');
        return;
      }
      const pins = [...inv.units.filter((u) => u.plotted), ...inv.amenities.filter((a) => a.plotted)].length;
      const unplotted =
        inv.units.filter((u) => !u.plotted).length + inv.amenities.filter((a) => !a.plotted).length;

      confirm({
        title: 'Publish tour to Touch App?',
        msg: `This pushes ${plural(tour.stops.length, 'stop')}, ${plural(
          pins,
          'plotted pin'
        )}, and the pathway graph for ${prop?.name ?? 'this property'} live to the on-site touch app.${
          unplotted
            ? ` ${plural(unplotted, 'unit or amenity')} is still unplotted and will not appear on the map.`
            : ''
        }`,
        label: 'Publish Now',
        action: { type: demoActions.publishTour.type, payload: { pins } }
      });
    };

    /* ---------------- connection tests (delayed) ---------------- */

    const lockTest = (vendorId: string) => {
      const lock = read().integ[read().propId]?.locks.find((l) => l.id === vendorId);
      dispatch(demoActions.setLockTestState({ id: vendorId, label: 'Testing…' }));
      window.setTimeout(() => {
        dispatch(demoActions.finishLockTest({ id: vendorId, pass: lock?.statusV !== 'crit' }));
      }, 900);
    };

    const vendorTest = (key: 'crm' | 'feed' | 'idv') => {
      const connection = read().integ[read().propId]?.[key];
      dispatch(demoActions.setVendorTestState({ key, label: 'Testing…' }));
      window.setTimeout(() => {
        dispatch(demoActions.finishVendorTest({ key, pass: connection?.statusV !== 'crit' }));
      }, 850);
    };

    const triggerBuild = () => {
      const id = read().propId;
      dispatch(demoActions.queueBuild({ version: 'v5.2.0 (118)' }));
      window.setTimeout(
        () => dispatch(demoActions.advanceBuild({ propId: id, status: 'Building', variant: 'warn' })),
        1400
      );
      window.setTimeout(
        () => dispatch(demoActions.advanceBuild({ propId: id, status: 'In Review', variant: 'warn' })),
        3000
      );
    };

    /* ---------------- optimize the current floor's SVG ---------------- */

    const optimizeSvg = (levelId: string) => {
      const state = read();
      const level = levels(state).find((l) => l.id === levelId) ?? curLevel(state);
      if (!level) return;
      if (!lvAssets(state, level).svg) {
        toast('Upload a floor SVG first, then optimize it.');
        return;
      }
      dispatch(demoActions.optimizeSvg(levelId));
    };

    localHandlers['connect/triggerBuild'] = triggerBuild;
    localHandlers['connect/openOrgPms'] = (payload) =>
      dispatch(
        demoActions.openModal({
          kind: 'orgPms',
          form: { pmsProvider: String(payload ?? ''), pmsUser: '', pmsKey: '' },
          editingId: read().orgId
        })
      );

    return {
      dispatch,
      read,
      toast,
      confirm,
      doConfirm,
      go,
      router,
      routes: CONNECT_ROUTES,
      openOrg,
      openProp,
      openUnit,
      goRegions: () => router.push(orgRegionsRoute(orgId)),
      goGroups: () => router.push(orgGroupsRoute(orgId)),
      backToOrg: () => router.push(orgRoute(orgId)),
      goBranding: () => router.push(brandingRoute(propId)),
      goContent: () => router.push(contentRoute(propId)),
      goPropPricing: () => router.push(propPricingRoute(propId)),
      goPropUnits: () => router.push(propUnitsRoute(propId)),
      goMapEditor: () => router.push(mapEditorRoute(propId)),
      goInventory: (tab: string) => {
        dispatch(demoActions.setTab({ key: 'tcTab', value: tab }));
        router.push(tourContentRoute(propId));
      },
      goTourSetup: () => router.push(tourSetupRoute(propId)),
      plotItem,
      autoPlot,
      runAutoPlot,
      computeRoute,
      publishTour,
      lockTest,
      vendorTest,
      triggerBuild,
      optimizeSvg
    };
  }, [dispatch, store, router, propId, orgId]);
};

export type ConnectActions = ReturnType<typeof useConnectActions>;
