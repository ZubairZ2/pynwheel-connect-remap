import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { IssuedCode, LockDeviceRow, LockInventory, LockProvider, LockTarget, LockTargetOption } from '~/core/models/data/tourModules.data';
import { t } from '../inventory/inventoryText';
import type { PillVariant } from '../listing.types';
import { accessLabel, accountSummary, healthLabel } from './lockAccounts.generator';

/**
 * The Locks tab's view data from the inventory the CMS answered
 * (Locks::Inventory): provider cards, the inventory table under its filter,
 * the stops without a lock, the issued codes. Pure.
 */
export const L = CORE_STRINGS.tourModules.locks;
const X = CORE_STRINGS.tourModules.common;

export type LockFilter = 'all' | 'unmapped' | 'mapped' | 'manual' | 'health';
export const LOCK_FILTERS: LockFilter[] = ['all', 'unmapped', 'mapped', 'manual', 'health'];

export type LocksSub = 'providers' | 'inventory' | 'issued';
export const LOCK_SUBS: LocksSub[] = ['providers', 'inventory', 'issued'];

const KIND_LABEL: Record<string, string> = {
  unit: CORE_STRINGS.tourModules.stops.kind.unit,
  amenity: CORE_STRINGS.tourModules.stops.kind.amenity,
  door: CORE_STRINGS.tourModules.stops.kind.unit,
  access_point: CORE_STRINGS.tourModules.stops.kind.building_starting_point,
  elevator: CORE_STRINGS.tourModules.stops.kind.elevator,
  building_starting_point: CORE_STRINGS.tourModules.stops.kind.building_starting_point,
  tour: CORE_STRINGS.tourModules.stops.kind.tour
};

/** "1-1508 (door 1) · Unit 1508" / "Gym · Amenity · Building A". */
export const targetLabel = (target: LockTarget | null): string => {
  if (!target) return i18n.t(L.table.unmapped);
  if (target.parent && (target.parent.type === 'Unit' || target.parent.type === 'Amenity')) return `${target.parent.name} · ${target.name}`;
  return target.name;
};

export const targetWhere = (target: LockTarget | null): string => {
  if (!target) return '';
  const kind = target.kind === 'door' && target.parent ? (target.parent.type === 'Unit' ? 'unit' : 'amenity') : target.kind;
  const parts = [i18n.t(KIND_LABEL[kind] ?? KIND_LABEL.unit)];
  if (target.building) parts.push(target.building);
  if (target.floor != null) parts.push(t(CORE_STRINGS.tourSetup.stops.floor, { floor: target.floor }));
  return parts.join(' · ');
};

export const formatWhen = (iso: string | null | undefined, timeZone?: string | null): string => {
  if (!iso) return i18n.t(X.never);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString('en-US', { timeZone: timeZone ?? undefined, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
};

export interface ProviderCard {
  vendor: string;
  label: string;
  pill: { label: string; variant: PillVariant };
  note: string;
  configured: boolean;
  enabled: boolean;
  mode: string | null;
  /** The account values the CMS stores, never a secret (lockAccounts.generator#accountSummary). */
  account: { label: string; value: string }[];
  counts: string;
  /** How a visitor opens the lock, and which app does it, from the CMS's access facts. */
  cred: string;
  /** Where health comes from, from the CMS's `healthSource`. */
  health: string;
  lastChanged: string;
  supports: LockProvider['supports'];
  instructions: { unit: string | null; amenity: string | null } | null;
  noApi: boolean;
  provider: LockProvider;
}

export const generateProviderCards = (inventory: LockInventory, timeZone?: string | null): { connected: ProviderCard[]; available: ProviderCard[] } => {
  const cards = inventory.providers.map((provider): ProviderCard => {
    const pill = !provider.configured
      ? { label: i18n.t(L.provider.notConfigured), variant: 'neutral' as PillVariant }
      : provider.status === 'needs_authorization'
        ? { label: i18n.t(L.provider.needsAuth), variant: 'warn' as PillVariant }
        : { label: i18n.t(L.provider.connected), variant: 'ok' as PillVariant };
    const account = accountSummary(provider);
    return {
      vendor: provider.vendor,
      label: provider.label,
      pill,
      note: provider.enabled ? '' : i18n.t(L.provider.notEnabled),
      configured: provider.configured,
      enabled: provider.enabled,
      mode: provider.mode,
      account,
      counts: provider.lockCount ? t(L.provider.counts, { count: provider.lockCount, mapped: provider.mappedCount }) : i18n.t(L.provider.noLocks),
      cred: accessLabel(provider),
      health: healthLabel(provider),
      lastChanged: provider.lastChangedAt ? t(L.provider.lastChanged, { when: formatWhen(provider.lastChangedAt, timeZone) }) : i18n.t(L.provider.noLocks),
      supports: provider.supports,
      instructions: provider.instructions,
      noApi: provider.vendor === 'Igloohome' && provider.mode === 'v1',
      provider
    };
  });
  return { connected: cards.filter((card) => card.configured || card.enabled), available: cards.filter((card) => !card.configured && !card.enabled) };
};

export interface LockTableRow {
  key: string;
  kind: 'device' | 'manual';
  vendor: string;
  name: string;
  sub: string;
  provider: string;
  opens: string;
  opensWhere: string;
  opensVariant: 'ink' | 'warn';
  mapped: boolean;
  stale: boolean;
  lastChanged: string;
  health: { label: string; variant: PillVariant };
  deviceId: string | null;
  target: LockTarget | null;
  mapLabel: string;
  selectable: boolean;
}

export const generateLockRows = (inventory: LockInventory, filter: LockFilter, timeZone?: string | null): LockTableRow[] => {
  const manual: LockTableRow[] = inventory.manualCodes.map((row) => ({
    key: `manual:${row.target.type}:${row.target.id}`,
    kind: 'manual',
    vendor: 'Manual',
    name: targetLabel(row.target),
    sub: row.codePresent ? i18n.t(L.table.manualVid) : i18n.t(L.withoutLock.noCode),
    provider: i18n.t(L.table.manualProvider),
    opens: targetLabel(row.target),
    opensWhere: targetWhere(row.target),
    opensVariant: 'ink',
    mapped: true,
    stale: false,
    lastChanged: '—',
    health: { label: i18n.t(L.table.keypad), variant: 'neutral' },
    deviceId: null,
    target: row.target,
    mapLabel: i18n.t(L.table.edit),
    selectable: false
  }));
  const devices: LockTableRow[] = inventory.locks.map((lock) => ({
    key: lock.key,
    kind: 'device',
    vendor: lock.vendor,
    name: lock.name,
    sub: t(L.deviceId, { id: lock.deviceId }),
    provider: lock.vendorLabel,
    opens: lock.stale ? i18n.t(L.table.stale) : targetLabel(lock.target),
    opensWhere: lock.stale ? '' : targetWhere(lock.target),
    opensVariant: lock.mapped ? 'ink' : 'warn',
    mapped: lock.mapped,
    stale: lock.stale,
    lastChanged: formatWhen(lock.updatedAt, timeZone),
    health: { label: lock.health.label, variant: lock.health.state === 'active' ? 'ok' : lock.health.state === 'inactive' ? 'crit' : 'neutral' },
    deviceId: lock.deviceId,
    target: lock.target,
    mapLabel: i18n.t(lock.mapped ? L.table.change : L.table.map),
    selectable: true
  }));
  switch (filter) {
    case 'unmapped':
      return devices.filter((row) => !row.mapped);
    case 'mapped':
      return [...devices.filter((row) => row.mapped), ...manual];
    case 'manual':
      return manual;
    case 'health':
      return devices.filter((row) => row.health.variant === 'crit');
    default:
      return [...devices, ...manual];
  }
};

export const generateLockFilters = (inventory: LockInventory, active: LockFilter): { id: LockFilter; label: string; count: number; on: boolean }[] =>
  LOCK_FILTERS.map((id) => ({
    id,
    label: i18n.t(L.filters[id]),
    count: id === 'all' ? inventory.counts.all : id === 'unmapped' ? inventory.counts.unmapped : id === 'mapped' ? inventory.counts.mapped : id === 'manual' ? inventory.counts.manual : inventory.counts.health,
    on: id === active
  }));

export interface WithoutLockRow {
  key: string;
  target: LockTarget;
  name: string;
  where: string;
  reason: string;
  targetType: string;
}

export const generateWithoutLock = (inventory: LockInventory): WithoutLockRow[] =>
  inventory.lockedWithoutLock.map((row) => ({
    key: `${row.target.type}:${row.target.id}`,
    target: row.target,
    name: targetLabel(row.target),
    where: targetWhere(row.target),
    reason: row.reason === 'no_code' ? i18n.t(L.withoutLock.noCode) : t(L.withoutLock.noDevice, { provider: row.provider }),
    targetType: targetParamType(row.target)
  }));

/** The `target_type` the Rails endpoint takes for a target (a door of a unit is mapped through the unit). */
export const targetParamType = (target: LockTarget): string => {
  if (target.kind === 'door' && target.parent) return target.parent.type === 'Unit' ? 'unit' : 'amenity';
  return target.kind;
};

export const targetParamId = (target: LockTarget): number => (target.kind === 'door' && target.parent ? target.parent.id : target.id);

export interface MapTargetRow {
  key: string;
  option: LockTargetOption;
  name: string;
  sub: string;
  current: boolean;
  taken: string | null;
  doorNote: string | null;
}

/** The map dialog's choices for one device: every target, with what it holds today. */
export const generateMapTargets = (inventory: LockInventory, device: LockDeviceRow | null, query: string): MapTargetRow[] => {
  const q = query.trim().toLowerCase();
  return inventory.targets
    .filter((option) => !q || `${option.target.name} ${option.target.building ?? ''} ${option.holder?.name ?? ''}`.toLowerCase().includes(q))
    .map((option) => {
      const holderKey = option.holder ? `${option.holder.type}:${option.holder.id}` : `${option.target.type}:${option.target.id}`;
      const deviceKey = device?.target ? `${device.target.type}:${device.target.id}` : null;
      const current = !!deviceKey && deviceKey === holderKey;
      let taken: string | null = null;
      if (!current && option.lock.device) taken = t(L.mapDialog.taken, { name: option.lock.device.name });
      else if (!current && option.lock.manualCodePresent) taken = i18n.t(L.mapDialog.manual);
      return {
        key: `${option.target.type}:${option.target.id}`,
        option,
        name: option.target.name,
        sub: targetWhere(option.target),
        current,
        taken,
        doorNote: option.holder ? t(L.mapDialog.onDoor, { door: option.holder.name }) : null
      };
    });
};

export interface IssuedRow {
  key: string;
  visitor: string;
  visitorId: number | null;
  stop: string;
  provider: string;
  when: string;
  window: string;
  pill: { label: string; variant: PillVariant };
}

const ISSUED_VARIANT: Record<string, PillVariant> = { issued: 'ok', active: 'ok', success: 'ok', failed: 'crit', error: 'crit', expired: 'neutral', revoked: 'warn', deleted: 'neutral' };

export const generateIssuedRows = (issued: IssuedCode[], timeZone?: string | null): IssuedRow[] =>
  issued.map((code, index) => ({
    key: `${code.vendor}:${index}:${code.issuedAt}`,
    visitor: code.visitor?.name ?? '—',
    visitorId: code.visitor?.id ?? null,
    stop: code.target ? targetLabel(code.target) : '—',
    provider: code.vendorLabel,
    when: formatWhen(code.issuedAt, timeZone),
    window: code.window ? `${formatWhen(code.window.from, timeZone)} – ${formatWhen(code.window.to, timeZone)}` : '—',
    pill: { label: code.status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), variant: ISSUED_VARIANT[code.status] ?? 'neutral' }
  }));
