'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { AutoMatchProposal, LockDeviceRow, LockInventory, LockProvider, LockTarget, TourModuleMeta, TourResult } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import {
  L,
  generateConnectCards,
  generateIssuedRows,
  generateLaunchOnlyChips,
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
import { accountDraftOf, accountPayload, accountProblems, generateAccountForm, importSummary, instructionText, type AccountDraft } from '~/core/utils/generator/tour/lockAccounts.generator';
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
  | { kind: 'account'; vendor: string; draft: AccountDraft; problems: Record<string, string>; submitted: boolean; busy: boolean; error: string | null }
  | { kind: 'removeAuth'; vendor: string; busy: boolean }
  | { kind: 'unavailable'; vendor: string; title: string }
  | { kind: 'instructions'; vendor: string; unit: string; amenity: string; uploading: 'unit' | 'amenity' | null; busy: boolean }
  | { kind: 'devices'; vendor: string; name: string; deviceId: string; file: { name: string; text: string } | null; fileError: string | null; result: string | null; busy: boolean }
  | null;

/** A field error the CMS answered on an account write: `{field, code, message}` under the error's `fields`. */
const fieldProblemsOf = (result: Extract<TourResult<unknown>, { ok: false }>): Record<string, string> => {
  const first = (result.errors?.[0] ?? null) as { fields?: { field?: string; message?: string }[] } | null;
  const problems: Record<string, string> = {};
  for (const entry of first?.fields ?? []) if (entry.field) problems[entry.field] = entry.message ?? '';
  return problems;
};

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CSV_MAX_BYTES = 1024 * 1024;

const readFile = (file: File, as: 'dataUrl' | 'text'): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ''));
    if (as === 'dataUrl') reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

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
  const connectCards = useMemo(() => (inventory ? generateConnectCards(inventory) : []), [inventory]);
  const launchOnly = useMemo(() => (inventory ? generateLaunchOnlyChips(inventory) : []), [inventory]);
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

  const saveManual = useCallback(async (override?: string) => {
    if (dialog?.kind !== 'manual' || dialog.busy) return;
    const code = (override ?? dialog.code).trim();
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

  const sync = useCallback(
    async (vendor: string) => {
      if (!canEdit) return refuse();
      setBusy(`sync:${vendor}`);
      await apply('locks/sync', { vendor }, (data) => data.sync?.message ?? i18n.t(CORE_STRINGS.tourModules.common.saved));
      setBusy(null);
    },
    [apply, canEdit, refuse]
  );

  const openPurge = useCallback(
    (vendor: string, label: string, count: number) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'purge', vendor, label, count, input: '', busy: false });
    },
    [canEdit, refuse]
  );

  /* ── provider accounts ───────────────────────────────────────────── */

  const providerOf = useCallback((vendor: string): LockProvider | null => inventory?.providers.find((p) => p.vendor === vendor) ?? null, [inventory]);

  const openAccount = useCallback(
    (vendor: string) => {
      const provider = providerOf(vendor);
      if (!provider) {
        const card = connectCards.find((c) => c.vendor === vendor);
        if (card && !card.available) setDialog({ kind: 'unavailable', vendor, title: card.title });
        return;
      }
      if (!canEdit) return refuse();
      setDialog({ kind: 'account', vendor, draft: accountDraftOf(provider), problems: {}, submitted: false, busy: false, error: null });
    },
    [canEdit, connectCards, providerOf, refuse]
  );

  const setAccountField = useCallback((key: string, value: string) => {
    setDialog((current) => {
      if (current?.kind !== 'account') return current;
      const draft = { ...current.draft, [key]: value };
      const provider = inventory?.providers.find((p) => p.vendor === current.vendor);
      const problems = current.submitted && provider ? accountProblems(generateAccountForm(provider, draft), draft) : current.problems;
      return { ...current, draft, problems, error: null };
    });
  }, [inventory]);

  const saveAccount = useCallback(
    async (thenTest = false) => {
      if (dialog?.kind !== 'account' || dialog.busy) return;
      const provider = providerOf(dialog.vendor);
      if (!provider) return;
      const form = generateAccountForm(provider, dialog.draft);
      const problems = accountProblems(form, dialog.draft);
      if (Object.keys(problems).length) {
        setDialog({ ...dialog, problems, submitted: true, error: i18n.t(L.account.fixFields) });
        return;
      }
      setDialog({ ...dialog, busy: true, submitted: true, problems: {}, error: null });
      const result = await tourPost<LockInventory>(propertyId, 'locks/account', { vendor: dialog.vendor, fields: accountPayload(form, dialog.draft) });
      if (!result.ok) {
        const serverProblems = fieldProblemsOf(result);
        setDialog({ ...dialog, busy: false, submitted: true, problems: serverProblems, error: Object.keys(serverProblems).length ? i18n.t(L.account.fixFields) : writeErrorText(result) });
        return;
      }
      setInventory(result.data);
      setMeta(result.meta);
      toast(result.data.account?.created ? t(L.account.created, { provider: provider.label }) : i18n.t(L.account.saved));
      setDialog(null);
      if (thenTest) await test(dialog.vendor);
    },
    [dialog, propertyId, providerOf, test, toast]
  );

  const openRemoveAuth = useCallback(
    (vendor: string) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'removeAuth', vendor, busy: false });
    },
    [canEdit, refuse]
  );

  const removeAuthorization = useCallback(async () => {
    if (dialog?.kind !== 'removeAuth' || dialog.busy) return;
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/account/remove_authorization', { vendor: dialog.vendor }, i18n.t(L.account.removeAuthDone));
    setDialog(data ? null : { ...dialog, busy: false });
  }, [apply, dialog]);

  const openInstructions = useCallback(
    (vendor: string) => {
      if (!canEdit) return refuse();
      const provider = providerOf(vendor);
      if (!provider) return;
      setDialog({ kind: 'instructions', vendor, unit: instructionText(provider.details?.instructions.unit), amenity: instructionText(provider.details?.instructions.amenity), uploading: null, busy: false });
    },
    [canEdit, providerOf, refuse]
  );

  const saveInstructions = useCallback(async () => {
    if (dialog?.kind !== 'instructions' || dialog.busy) return;
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/instructions', { vendor: dialog.vendor, unit: dialog.unit, amenity: dialog.amenity }, i18n.t(L.account.instructions.saved));
    setDialog(data ? null : { ...dialog, busy: false });
  }, [apply, dialog]);

  /** One instruction image, uploaded as soon as it is chosen (as the legacy page does). */
  const uploadInstructionImage = useCallback(
    async (kind: 'unit' | 'amenity', file: File) => {
      if (dialog?.kind !== 'instructions' || dialog.busy || dialog.uploading) return;
      if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) return toast(i18n.t(L.account.instructions.badType));
      if (file.size > IMAGE_MAX_BYTES) return toast(i18n.t(L.account.instructions.tooLarge));
      setDialog({ ...dialog, uploading: kind });
      let dataUrl = '';
      try {
        dataUrl = await readFile(file, 'dataUrl');
      } catch {
        setDialog({ ...dialog, uploading: null });
        return toast(i18n.t(E.failed));
      }
      const data = await apply('locks/instruction_image', { vendor: dialog.vendor, kind, image: dataUrl }, i18n.t(L.account.instructions.uploaded));
      setDialog((current) => (current?.kind === 'instructions' ? { ...current, uploading: null } : current));
      return data;
    },
    [apply, dialog, toast]
  );

  const openDevices = useCallback(
    (vendor: string) => {
      if (!canEdit) return refuse();
      setDialog({ kind: 'devices', vendor, name: '', deviceId: '', file: null, fileError: null, result: null, busy: false });
    },
    [canEdit, refuse]
  );

  const addDevice = useCallback(async () => {
    if (dialog?.kind !== 'devices' || dialog.busy) return;
    const name = dialog.name.trim();
    const deviceId = dialog.deviceId.trim();
    if (!name || !deviceId) return;
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/devices', { device_name: name, device_id: deviceId }, t(L.account.devices.added, { name }));
    setDialog((current) => (current?.kind === 'devices' ? { ...current, busy: false, name: data ? '' : current.name, deviceId: data ? '' : current.deviceId } : current));
  }, [apply, dialog]);

  const pickCsv = useCallback(
    async (file: File) => {
      if (dialog?.kind !== 'devices' || dialog.busy) return;
      if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') return setDialog({ ...dialog, file: null, fileError: i18n.t(L.account.devices.csvNotCsv) });
      if (file.size > CSV_MAX_BYTES) return setDialog({ ...dialog, file: null, fileError: i18n.t(L.account.devices.csvTooLarge) });
      try {
        const text = await readFile(file, 'text');
        setDialog({ ...dialog, file: { name: file.name, text }, fileError: null, result: null });
      } catch {
        setDialog({ ...dialog, file: null, fileError: i18n.t(E.failed) });
      }
    },
    [dialog]
  );

  const importCsv = useCallback(async () => {
    if (dialog?.kind !== 'devices' || dialog.busy || !dialog.file) return;
    setDialog({ ...dialog, busy: true });
    const data = await apply('locks/import_csv', { csv: dialog.file.text }, (result) => importSummary(result.imported));
    setDialog((current) => (current?.kind === 'devices' ? { ...current, busy: false, file: data ? null : current.file, result: data ? importSummary(data.imported) : current.result } : current));
  }, [apply, dialog]);

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
    connectCards,
    launchOnly,
    mapTargets,
    actions: {
      openMap, mapTo, unmap, bulkUnmap, openManual, saveManual, openAutoMatch, toggleProposal, applyAutoMatch, sync, test, openPurge, purge, setEnabled,
      openAccount, setAccountField, saveAccount, openRemoveAuth, removeAuthorization, openInstructions, saveInstructions, uploadInstructionImage, openDevices, addDevice, pickCsv, importCsv,
      closeDialog: () => setDialog(null)
    }
  };
};

export type TourLocksController = ReturnType<typeof useTourLocks>;
