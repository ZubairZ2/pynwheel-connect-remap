import type { PayloadAction } from '@reduxjs/toolkit';

import { plural } from '~/core/utils/connect/format';
import { CATEGORY_META, ILS_PARTNERS, PROD_LABEL } from '~/data/mock/core.mock';

import { curProp } from '../demo.selectors';
import type { DemoState } from '../demo.state';

type CategoryKey = 'crm' | 'feed' | 'idv';

const credentialFor = (key: CategoryKey, vendor: string): string => {
  const slug = vendor.replace(/[^A-Za-z]/g, '').slice(0, 3).toLowerCase() || 'int';
  return `${slug}${key === 'feed' ? '_feed_' : '_live_'}••••${Math.random().toString(36).slice(2, 6)}`;
};

/** Locks, lead-sync CRMs, availability feeds, ILS syndication, product enablement. */
export const integrationReducers = {
  /* ---------- smart locks ---------- */

  setLockVendor(state: DemoState, action: PayloadAction<string>) {
    const row = state.integ[state.propId];
    const prop = curProp(state);
    if (!row || !prop) return;
    const target = row.locks.find((l) => l.id === action.payload);
    if (!target) return;
    const turningOn = !target.on;

    row.locks.forEach((lock) => {
      if (lock.id === action.payload) {
        if (turningOn) {
          Object.assign(lock, {
            on: true,
            status: 'Connected',
            statusV: 'ok',
            cred: `${lock.id.slice(0, 2)}_live_••••${Math.random().toString(36).slice(2, 6)}`,
            locks: 0,
            mapped: 0,
            lastTest: 'Not yet tested',
            instructions: true
          });
        } else {
          Object.assign(lock, {
            on: false,
            status: 'Not Connected',
            statusV: 'neutral',
            cred: '—',
            locks: 0,
            mapped: 0,
            lastTest: '—',
            instructions: false
          });
        }
        return;
      }
      if (turningOn && lock.on) {
        Object.assign(lock, {
          on: false,
          status: 'Not Connected',
          statusV: 'neutral',
          cred: '—',
          locks: 0,
          mapped: 0,
          lastTest: '—',
          instructions: false
        });
      }
    });

    state.toast = turningOn
      ? `${target.name} is now the lock provider for ${prop.name}.`
      : `${target.name} disconnected from ${prop.name}.`;
  },

  setLockTestState(state: DemoState, action: PayloadAction<{ id: string; label: string }>) {
    const lock = state.integ[state.propId]?.locks.find((l) => l.id === action.payload.id);
    if (lock) lock.lastTest = action.payload.label;
  },

  finishLockTest(state: DemoState, action: PayloadAction<{ id: string; pass: boolean }>) {
    const lock = state.integ[state.propId]?.locks.find((l) => l.id === action.payload.id);
    if (!lock) return;
    lock.lastTest = action.payload.pass ? 'Passed just now' : 'Failed just now';
    state.toast = action.payload.pass
      ? `${lock.name}: connection healthy (${80 + Math.floor(Math.random() * 120)} ms).`
      : `${lock.name}: authentication failed (401).`;
  },

  importLocks(state: DemoState, action: PayloadAction<string>) {
    const prop = curProp(state);
    const lock = state.integ[state.propId]?.locks.find((l) => l.id === action.payload);
    if (!lock || !prop) return;
    lock.locks = Math.max(6, Math.round(prop.units / 4));
    state.toast = `Imported ${lock.locks} locks from ${lock.name}.`;
  },

  autoMapLocks(state: DemoState, action: PayloadAction<string>) {
    const lock = state.integ[state.propId]?.locks.find((l) => l.id === action.payload);
    if (!lock) return;
    if (!lock.locks) {
      state.toast = `Import locks from ${lock.name} before auto-mapping.`;
      return;
    }
    lock.mapped = lock.locks;
    state.toast = `Auto-mapped ${lock.locks} locks to units, amenities, and elevators.`;
  },

  /* ---------- CRM / feed / identity ---------- */

  connectVendor(state: DemoState, action: PayloadAction<{ key: CategoryKey; vendor: string }>) {
    const { key, vendor } = action.payload;
    const row = state.integ[state.propId];
    const prop = curProp(state);
    if (!row || !prop) return;

    row[key] = {
      ...row[key],
      vendor,
      connected: true,
      status: 'Connected',
      statusV: 'ok',
      key: credentialFor(key, vendor),
      lastTest: 'Not yet tested',
      metaValue: key === 'crm' ? '0 — first push pending' : key === 'feed' ? String(prop.units) : 'Configured'
    };
    state.toast = `${vendor} is now the ${CATEGORY_META[key].label} for ${prop.name}.`;
  },

  setVendorTestState(state: DemoState, action: PayloadAction<{ key: CategoryKey; label: string }>) {
    const row = state.integ[state.propId];
    if (row) row[action.payload.key].lastTest = action.payload.label;
  },

  finishVendorTest(state: DemoState, action: PayloadAction<{ key: CategoryKey; pass: boolean }>) {
    const row = state.integ[state.propId];
    if (!row) return;
    const connection = row[action.payload.key];
    connection.lastTest = action.payload.pass ? 'Passed just now' : 'Failed just now';
    state.toast = action.payload.pass
      ? `${connection.vendor}: connection healthy (${80 + Math.floor(Math.random() * 90)} ms).`
      : `${connection.vendor}: authentication failed (401).`;
  },

  revokeVendor(state: DemoState, action: PayloadAction<CategoryKey>) {
    const row = state.integ[state.propId];
    if (!row) return;
    row[action.payload] = {
      ...row[action.payload],
      connected: false,
      status: 'Not Connected',
      statusV: 'neutral',
      vendor: '',
      key: '—',
      metaValue: '—',
      lastTest: '—'
    };
    state.toast = `${CATEGORY_META[action.payload].label} disconnected.`;
  },

  runVendorAction(state: DemoState, action: PayloadAction<CategoryKey>) {
    const row = state.integ[state.propId];
    const prop = curProp(state);
    if (!row || !prop) return;
    const connection = row[action.payload];

    if (action.payload === 'crm') {
      const count = Math.round(prop.units * 1.7 + Math.random() * 40);
      connection.metaValue = String(count);
      state.toast = `Re-sent 30 days of leads to ${connection.vendor} · ${count} guest cards.`;
    } else if (action.payload === 'feed') {
      connection.metaValue = String(prop.units);
      connection.lastTest = 'Passed just now';
      state.toast = `Pulled ${prop.units} units from ${connection.vendor}.`;
    } else {
      state.toast = `Consent copy preview opened for ${connection.vendor}.`;
    }
  },

  toggleIls(state: DemoState, action: PayloadAction<{ propId?: string; partnerId: string }>) {
    const propId = action.payload.propId ?? state.propId;
    const row = state.integ[propId];
    if (!row) return;
    row.ils[action.payload.partnerId] = !row.ils[action.payload.partnerId];
    const on = row.ils[action.payload.partnerId];
    const name = ILS_PARTNERS.find((p) => p.id === action.payload.partnerId)?.name ?? 'Partner';
    const propName = state.props.find((p) => p.id === propId)?.name ?? '';
    state.toast = action.payload.propId
      ? `${name}${on ? ' syndication enabled' : ' syndication paused'} for ${propName}.`
      : on
        ? `Syndication to ${name} enabled.`
        : `Syndication to ${name} paused.`;
  },

  setAccessFilter(state: DemoState, action: PayloadAction<string>) {
    state.accessFilter = action.payload;
  },

  advanceIlsBulk(state: DemoState, action: PayloadAction<'template' | 'upload' | 'apply'>) {
    if (action.payload === 'template') {
      state.ilsStep = 1;
      state.toast = 'ils-syndication-template.csv downloaded.';
    } else if (action.payload === 'upload') {
      state.ilsStep = 2;
      state.ilsFile = 'ils-syndication-q3.csv';
      state.ilsMatched = 41;
      state.ilsUnmatched = 3;
      state.toast = 'Matched 41 properties · 3 rows need review.';
    } else {
      state.ilsStep = 3;
      state.toast = 'Syndication settings applied to 41 properties.';
    }
  },

  /* ---------- product enablement ---------- */

  toggleProduct(state: DemoState, action: PayloadAction<string>) {
    const enabled = state.prodEnabled[state.propId] ?? {};
    const wasOn = !!enabled[action.payload];
    enabled[action.payload] = !wasOn;
    state.prodEnabled[state.propId] = enabled;

    const expanded = state.prodExpanded[state.propId] ?? {};
    if (!wasOn) expanded[action.payload] = true;
    state.prodExpanded[state.propId] = expanded;

    state.toast = `${PROD_LABEL[action.payload]}${wasOn ? ' disabled' : ' enabled'} for ${
      curProp(state)?.name ?? 'this property'
    }.`;
  },

  toggleProductExpand(state: DemoState, action: PayloadAction<string>) {
    const expanded = state.prodExpanded[state.propId] ?? {};
    expanded[action.payload] = !expanded[action.payload];
    state.prodExpanded[state.propId] = expanded;
  },

  setProductSetting(
    state: DemoState,
    action: PayloadAction<{ product: string; key: string; value: string | boolean }>
  ) {
    const row = state.prodSettings[state.propId] as unknown as Record<string, Record<string, unknown>>;
    if (!row?.[action.payload.product]) return;
    row[action.payload.product][action.payload.key] = action.payload.value;
  },

  toggleProductFlag(state: DemoState, action: PayloadAction<{ product: string; key: string }>) {
    const row = state.prodSettings[state.propId] as unknown as Record<string, Record<string, unknown>>;
    if (!row?.[action.payload.product]) return;
    const current = row[action.payload.product][action.payload.key];
    row[action.payload.product][action.payload.key] = !current;
  },

  /* ---------- portfolio SVG optimizer ---------- */

  optimizePropSvg(state: DemoState, action: PayloadAction<string>) {
    const record = state.svgPropOpt[action.payload];
    if (!record) return;
    record.status = 'valid';
    record.sizeKb = Math.round(record.sizeKb * 0.42);
    record.last = 'Just now';
    state.toast = `Optimized floor SVGs for ${
      state.props.find((p) => p.id === action.payload)?.name ?? 'property'
    }.`;
  },

  optimizeAllSvg(state: DemoState) {
    let count = 0;
    Object.keys(state.svgPropOpt).forEach((id) => {
      const record = state.svgPropOpt[id];
      if (record.status !== 'needs') return;
      record.status = 'valid';
      record.sizeKb = Math.round(record.sizeKb * 0.42);
      record.last = 'Just now';
      count += 1;
    });
    state.toast = `Optimized SVGs for ${plural(count, 'property', 'properties')}.`;
  },

  /* ---------- builds ---------- */

  queueBuild(state: DemoState, action: PayloadAction<{ version: string }>) {
    const list = state.builds[state.propId] ?? [];
    list.unshift({
      version: action.payload.version,
      platform: 'iOS + Android',
      status: 'Queued',
      variant: 'info',
      by: 'Alex Morgan',
      when: 'just now'
    });
    state.builds[state.propId] = list;
    state.toast = 'Build queued.';
  },

  advanceBuild(
    state: DemoState,
    action: PayloadAction<{ propId: string; status: string; variant: string }>
  ) {
    const list = state.builds[action.payload.propId];
    if (!list?.length) return;
    list[0].status = action.payload.status;
    list[0].variant = action.payload.variant;
    state.toast = `Build ${action.payload.status.toLowerCase()}.`;
  }
};
