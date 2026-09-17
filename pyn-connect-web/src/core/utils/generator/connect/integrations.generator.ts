import { plural } from '~/core/utils/connect/format';
import {
  ACCESS_LOG,
  CATEGORY_META,
  ILS_PARTNERS,
  LATCH_KEYS,
  SEED_INTEG,
  VENDOR_DEFS
} from '~/data/mock/core.mock';
import type { PropertyIntegrations } from '~/core/models/data/connect/inventory.data';
import type { DemoState } from '~/core/store/demo/demo.state';

export type CategoryKey = 'crm' | 'feed' | 'idv';

const rowFor = (state: DemoState): PropertyIntegrations => state.integ[state.propId] ?? SEED_INTEG.wharf;

export const generateIntegTabs = (active: string) =>
  [
    { id: 'integrations', label: 'Property Integrations' },
    { id: 'access', label: 'Access Log' }
  ].map((tab) => ({
    ...tab,
    active: active === tab.id,
    bg: active === tab.id ? 'var(--bo-ink)' : '#fff',
    color: active === tab.id ? '#fff' : 'var(--bo-muted)',
    border: active === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));

/* ---------------- smart locks ---------------- */

export const generateLockVendors = (state: DemoState) => {
  const row = rowFor(state);
  const keys = LATCH_KEYS[state.propId] ?? [];

  return row.locks.map((lock) => ({
    ...lock,
    notOn: !lock.on,
    isLatch: lock.id === 'latch',
    mappedLabel: lock.locks ? `${lock.mapped} of ${lock.locks} mapped` : 'No locks imported',
    cardBorder: lock.on ? 'var(--bo-accent)' : 'var(--bo-line)',
    cardBg: lock.on ? '#fff' : '#FBFBFC',
    hasExtra: lock.id === 'latch' && lock.on,
    extraLabel: `${plural(keys.length, 'time-boxed key grant')} · ${
      keys.filter((k) => k.state === 'Active').length
    } active now`
  }));
};

export const generateLockSummary = (state: DemoState) => {
  const row = rowFor(state);
  const keys = LATCH_KEYS[state.propId] ?? [];
  const imported = row.locks.filter((l) => l.on).reduce((sum, l) => sum + l.locks, 0);

  return {
    lockConnectedCount: row.locks.filter((l) => l.on).length,
    lockTotalLabel: `${plural(imported, 'lock')} imported`,
    latchActive: !!row.locks.find((l) => l.id === 'latch')?.on,
    latchKeys: keys,
    latchHasKeys: keys.length > 0,
    latchActiveCount: plural(keys.filter((k) => k.state === 'Active').length, 'active key')
  };
};

/* ---------------- CRM / feed / identity ---------------- */

export const generateVendorCategories = (state: DemoState) => {
  const row = rowFor(state);

  return (['crm', 'feed', 'idv'] as CategoryKey[]).map((key) => {
    const meta = CATEGORY_META[key];
    const connection = row[key];
    const defs = VENDOR_DEFS[key];

    return {
      key,
      label: meta.label,
      sub: meta.sub,
      icon: meta.icon,
      summary: `${connection.connected ? `${connection.vendor} connected` : 'None connected'} · ${plural(
        defs.length,
        'provider'
      )} available`,
      activePill: connection.connected ? connection.vendor : 'None connected',
      activeV: connection.connected ? connection.statusV : 'neutral',
      cols: defs.length > 4 ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
      vendors: defs.map((vendor) => {
        const on = connection.connected && connection.vendor === vendor.name;
        return {
          name: vendor.name,
          note: vendor.note,
          on,
          notOn: !on,
          status: on ? connection.status : 'Not Connected',
          statusV: on ? connection.statusV : 'neutral',
          cred: on ? connection.key : '—',
          lastTest: on ? connection.lastTest : '—',
          metaLabel: meta.metaLabel,
          metaValue: on ? connection.metaValue : '—',
          actionLabel: meta.actionLabel,
          cardBorder: on ? 'var(--bo-accent)' : 'var(--bo-line)',
          cardBg: on ? '#fff' : '#FBFBFC'
        };
      })
    };
  });
};

/* ---------------- ILS syndication ---------------- */

export const generateIlsPartners = (state: DemoState) => {
  const row = rowFor(state);
  return ILS_PARTNERS.map((partner) => {
    const on = !!row.ils[partner.id];
    return {
      ...partner,
      on,
      statusLabel: on ? 'Syndicating' : 'Paused',
      statusV: on ? 'ok' : 'neutral',
      toggleBg: on ? 'var(--bo-accent)' : '#CDD2DB',
      knob: on ? '21px' : '3px'
    };
  });
};

/* ---------------- access log ---------------- */

export const generateAccessLog = (state: DemoState) =>
  ACCESS_LOG.filter((e) => state.accessFilter === 'all' || e.property === state.accessFilter);

export const generateAccessFilterOptions = (state: DemoState) => [
  { id: 'all', name: 'All properties' },
  ...state.props.map((p) => ({ id: p.name, name: p.name }))
];

/* ---------------- lock instructions dialog ---------------- */

export const generateInstrVendor = (state: DemoState) => {
  const lock = rowFor(state).locks.find((l) => l.id === state.instrVendorId);
  return { name: lock?.name ?? '—', note: lock?.note ?? '' };
};

export const INSTR_STEPS = [
  { n: '1', title: 'Scan the QR at the entry door', body: 'Shown on the printed placard and in the confirmation text.' },
  { n: '2', title: 'Verify identity', body: 'ID scan and selfie match, handled by the identity provider.' },
  { n: '3', title: 'Tap Unlock in the app', body: 'The key is valid only inside the booked tour window.' }
];
