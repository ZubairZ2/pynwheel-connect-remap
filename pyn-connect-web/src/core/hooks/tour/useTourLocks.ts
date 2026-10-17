'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { AutoMatchProposal, LockDeviceRow, LockInventory, LockTarget, TourModuleMeta, TourResult } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import {
  L,
  generateIssuedRows,
  generateLockFilters,
  generateLockRows,
  generateMapTargets,
  generateProviderCards,
  generateWithoutLock,
  targetParamId,
  targetParamType,
  type LockFilter,
  type LocksSub
} from '~/core/utils/generator/tour/tourLocks.generator';
import { firstFieldError, tourGet, tourPost } from '~/core/utils/tour/tourApi.client';

const E = CORE_STRINGS.tourModules.errors;

/** The toast for a failed Tour module write, by the outcome vocabulary. */
export const writeErrorText = (result: Extract<TourResult<unknown>, { ok: false }>): string => {
  switch (result.error) {
    case 'unauthorized':
      return i18n.t(E.unauthorized);
    case 'forbidden':
      return i18n.t(E.forbidden);
    case 'csrf':
      return i18n.t(E.csrf);
    case 'disabled':
      return i18n.t(E.disabled);
    case 'missing':
      return result.message ?? i18n.t(E.missing);
    case 'stale':
      return i18n.t(E.stale);
    case 'invalid':
      return t(E.invalid, { message: result.message ?? firstFieldError(result.errors) ?? result.code ?? '' });
    default:
      return result.message ?? i18n.t(E.failed);
  }
};

export type LocksDialog =
  | { kind: 'map'; device: LockDeviceRow; query: string; busy: boolean }
  | { kind: 'manual'; target: LockTarget; code: string; busy: boolean }
  | { kind: 'autoMatch'; proposals: AutoMatchProposal[]; picked: string[]; loading: boolean; busy: boolean }
  | { kind: 'purge'; vendor: string; label: string; count: number; input: string; busy: boolean }
  | { kind: 'disable'; busy: boolean }
  | null;

/**
 * The Locks tab: the inventory read on mount and replaced by every write's
 * answer, the sub-tab, the filter, the selection and the open dialog.
 */
export const useTourLocks = (propertyId: number, enabled = true) => {
  const dispatch = useAppDispatch();
  const toast = useCallback((message: string) => dispatch(demoActions.showToast(message)), [dispatch]);
  const [inventory, setInventory] = useState<LockInventory | null>(null);
  const [meta, setMeta] = useState<TourModuleMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<LocksSub>('providers');
  const [filter, setFilter] = useState<LockFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<LocksDialog>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ vendor: string; ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await tourGet<LockInventory>(propertyId, 'locks');
    if (result.ok) {
      setInventory(result.data);
      setMeta(result.meta);
    } else {
      setError(result.error === 'unauthorized' ? i18n.t(E.unauthorized) : i18n.t(CORE_STRINGS.tourModules.common.loadFailed));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const apply = useCallback(
    async (path: string, payload: unknown, success: string | ((data: LockInventory) => string)): Promise<LockInventory | null> => {
      const result = await tourPost<LockInventory>(propertyId, path, payload);
      if (!result.ok) {
        toast(writeErrorText(result));
        return null;
      }
      setInventory(result.data);
      setMeta(result.meta);
      toast(typeof success === 'function' ? success(result.data) : success);
      return result.data;
    },
    [propertyId, toast]
  );

  const canEdit = !!meta?.canEdit && !!meta?.writesEnabled;

  const refuse = useCallback(() => {
    toast(i18n.t(meta?.writesEnabled ? CORE_STRINGS.tourModules.common.readOnly : CORE_STRINGS.tourModules.common.writesOff));
  }, [meta?.writesEnabled, toast]);

  const timeZone = meta?.timeZone ?? null;
  const providers = useMemo(() => (inventory ? generateProviderCards(inventory, timeZone) : { connected: [], available: [] }), [inventory, timeZone]);
  const rows = useMemo(() => (inventory ? generateLockRows(inventory, filter, timeZone) : []), [inventory, filter, timeZone]);
  const filters = useMemo(() => (inventory ? generateLockFilters(inventory, filter) : []), [inventory, filter]);
  const withoutLock = useMemo(() => (inventory ? generateWithoutLock(inventory) : []), [inventory]);
  const issued = useMemo(() => (inventory ? generateIssuedRows(inventory.issued, timeZone) : []), [inventory, timeZone]);
  const mapTargets = useMemo(
    () => (inventory && dialog?.kind === 'map' ? generateMapTargets(inventory, dialog.device, dialog.query) : []),
    [inventory, dialog]
  );

  /* ── actions ──────────────────────────────────────────────────────── */

  const openMap = useCallback(
    (device: LockDeviceRow) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'map', device, query: '', busy: false });
    },
    [canEdit, refuse]
  );

  const mapTo = useCallback(
    async (target: LockTarget) => {
      if (dialog?.kind !== 'map' || dialog.busy) return;
      setDialog({ ...dialog, busy: true });
      const data = await apply('locks/map', { vendor: dialog.device.vendor, device_id: dialog.device.deviceId, target_type: targetParamType(target), target_id: targetParamId(target) }, i18n.t(L.toast.mapped));
      setDialog(data ? null : { ...dialog, busy: false });
    },
    [apply, dialog]
  );

  const unmap = useCallback(
    async (device: LockDeviceRow) => {
      if (!canEdit) return refuse();
      setBusy(device.key);
      await apply('locks/unmap', { vendor: device.vendor, device_id: device.deviceId }, i18n.t(L.toast.unmapped));
      setBusy(null);
    },
    [apply, canEdit, refuse]
  );

  const bulkUnmap = useCallback(async () => {
    if (!canEdit || !inventory) return refuse();
    const devices = inventory.locks.filter((lock) => selected.includes(lock.key) && lock.mapped);
    setBusy('bulk');
    let last: LockInventory | null = null;
    for (const device of devices) {
      const result = await tourPost<LockInventory>(propertyId, 'locks/unmap', { vendor: device.vendor, device_id: device.deviceId });
      if (!result.ok) {
        toast(writeErrorText(result));
        break;
      }
      last = result.data;
      setMeta(result.meta);
    }
    if (last) {
      setInventory(last);
      toast(t(L.toast.bulkUnmapped, { count: devices.length }));
    }
    setSelected([]);
    setBusy(null);
  }, [canEdit, inventory, propertyId, refuse, selected, toast]);

  const openManual = useCallback(
    (target: LockTarget, code = '') => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'manual', target, code, busy: false });
    },
    [canEdit, refuse]
  );

  const saveManual = useCallback(async () => {
    if (dialog?.kind !== 'manual' || dialog.busy) return;
    const code = dialog.code.trim();
    if (code && !/^[0-9#*]{1,10}$/.test(code)) {
      toast(i18n.t(L.manual.invalid));
      return;
    }
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/manual_code', { target_type: targetParamType(dialog.target), target_id: targetParamId(dialog.target), code }, i18n.t(code ? L.manual.saved : L.manual.removed));
    setDialog(data ? null : { ...dialog, busy: false });
  }, [apply, dialog, toast]);

  const openAutoMatch = useCallback(async () => {
    if (!canEdit) return refuse();
    setDialog({ kind: 'autoMatch', proposals: [], picked: [], loading: true, busy: false });
    const result = await tourGet<{ proposals: AutoMatchProposal[] }>(propertyId, 'locks/auto_match');
    if (!result.ok) {
      toast(writeErrorText(result));
      setDialog(null);
      return;
    }
    setDialog({ kind: 'autoMatch', proposals: result.data.proposals, picked: result.data.proposals.map((p) => `${p.vendor}:${p.deviceId}`), loading: false, busy: false });
  }, [canEdit, propertyId, refuse, toast]);

  const toggleProposal = useCallback((key: string) => {
    setDialog((current) => {
      if (current?.kind !== 'autoMatch') return current;
      const picked = current.picked.includes(key) ? current.picked.filter((k) => k !== key) : [...current.picked, key];
      return { ...current, picked };
    });
  }, []);

  const applyAutoMatch = useCallback(async () => {
    if (dialog?.kind !== 'autoMatch' || dialog.busy) return;
    const pairs = dialog.proposals
      .filter((p) => dialog.picked.includes(`${p.vendor}:${p.deviceId}`))
      .map((p) => ({ vendor: p.vendor, device_id: p.deviceId, target_type: targetParamType(p.target), target_id: targetParamId(p.target) }));
    if (!pairs.length) {
      setDialog(null);
      return;
    }
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/auto_match', { pairs }, t(L.autoMatch.applied, { count: pairs.length }));
    setDialog(data ? null : { ...dialog, busy: false });
  }, [apply, dialog]);

  const sync = useCallback(
    async (vendor: string) => {
      if (!canEdit) return refuse();
      setBusy(`sync:${vendor}`);
      await apply('locks/sync', { vendor }, (data) => data.sync?.message ?? i18n.t(CORE_STRINGS.tourModules.common.saved));
      setBusy(null);
    },
    [apply, canEdit, refuse]
  );

  const test = useCallback(
    async (vendor: string) => {
      if (!canEdit) return refuse();
      setBusy(`test:${vendor}`);
      const result = await tourPost<{ test: { vendor: string; status: string; message: string } }>(propertyId, 'locks/test', { vendor });
      if (!result.ok) {
        setTestResult({ vendor, ok: false, message: writeErrorText(result) });
      } else {
        setTestResult({ vendor, ok: result.data.test.status === 'ok', message: result.data.test.message });
      }
      setBusy(null);
    },
    [canEdit, propertyId, refuse]
  );

  const openPurge = useCallback(
    (vendor: string, label: string, count: number) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'purge', vendor, label, count, input: '', busy: false });
    },
    [canEdit, refuse]
  );

  const purge = useCallback(async () => {
    if (dialog?.kind !== 'purge' || dialog.busy || dialog.input.trim().toUpperCase() !== 'DELETE') return;
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/purge', { vendor: dialog.vendor }, (result) => t(L.toast.purged, { count: result.purged?.count ?? 0 }));
    setDialog(data ? null : { ...dialog, busy: false });
  }, [apply, dialog]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (!canEdit) return refuse();
      if (!value && dialog?.kind !== 'disable') {
        setDialog({ kind: 'disable', busy: false });
        return;
      }
      setBusy('enabled');
      const data = await apply('locks/enabled', { enabled: value }, i18n.t(value ? L.toast.enabled : L.toast.disabled));
      if (data) setDialog(null);
      setBusy(null);
    },
    [apply, canEdit, dialog, refuse]
  );

  return {
    inventory,
    meta,
    loading,
    error,
    reload: load,
    sub,
    setSub,
    filter,
    setFilter,
    selected,
    setSelected,
    toggleSelected: (key: string) => setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key])),
    dialog,
    setDialog,
    busy,
    testResult,
    clearTest: () => setTestResult(null),
    canEdit,
    providers,
    rows,
    filters,
    withoutLock,
    issued,
    mapTargets,
    actions: { openMap, mapTo, unmap, bulkUnmap, openManual, saveManual, openAutoMatch, toggleProposal, applyAutoMatch, sync, test, openPurge, purge, setEnabled, closeDialog: () => setDialog(null) }
  };
};

export type TourLocksController = ReturnType<typeof useTourLocks>;
