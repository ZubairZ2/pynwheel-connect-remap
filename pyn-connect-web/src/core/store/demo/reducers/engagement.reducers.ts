import type { PayloadAction } from '@reduxjs/toolkit';

import type { FeeUnitKey, PcFee } from '~/core/models/data/connect/fee.data';
import { plural, uid } from '~/core/utils/connect/format';
import { SEED_FEES, SEED_PCALC } from '~/data/mock/fees.mock';

import { curFees, curPcalc, curResident } from '../demo.selectors';
import type { DemoState } from '../demo.state';

const markDirty = (state: DemoState) => {
  const set = state.pcalc[state.propId];
  if (set) set.draftDirty = true;
};

/** Resident Access, the two fee editors, Live Chat, Analytics scope, AI Services. */
export const engagementReducers = {
  /* ---------- resident access ---------- */

  pickResident(state: DemoState, action: PayloadAction<string>) {
    state.residentId = action.payload;
  },

  setGrant(state: DemoState, action: PayloadAction<{ target: string; on: boolean }>) {
    const resident = curResident(state);
    if (!resident) return;
    resident.grants[action.payload.target] = action.payload.on;
    resident.log.unshift({
      what: action.payload.target,
      when: 'just now',
      result: action.payload.on ? 'Access granted' : 'Access revoked',
      v: action.payload.on ? 'ok' : 'warn'
    });
    state.toast = action.payload.on
      ? `${action.payload.target} access granted to ${resident.name} — their phone is now a key.`
      : `${action.payload.target} access revoked for ${resident.name}.`;
  },

  revokeAllGrants(state: DemoState) {
    const resident = curResident(state);
    if (!resident) return;
    Object.keys(resident.grants).forEach((key) => {
      resident.grants[key] = false;
    });
    resident.log.unshift({ what: 'All targets', when: 'just now', result: 'All access revoked', v: 'crit' });
    state.toast = `All access revoked for ${resident.name}.`;
  },

  /* ---------- simple fee estimator ---------- */

  setFeeAmount(state: DemoState, action: PayloadAction<{ id: string; value: number }>) {
    const set = state.fees[state.propId];
    if (!set) return;
    const fee = set.fees.find((f) => f.id === action.payload.id);
    if (fee) fee.amount = action.payload.value;
    set.draftDirty = true;
  },

  setFeeUnit(state: DemoState, action: PayloadAction<{ id: string; value: FeeUnitKey }>) {
    const set = state.fees[state.propId];
    if (!set) return;
    const fee = set.fees.find((f) => f.id === action.payload.id);
    if (fee) fee.unit = action.payload.value;
    set.draftDirty = true;
  },

  toggleFee(state: DemoState, action: PayloadAction<string>) {
    const set = state.fees[state.propId];
    if (!set) return;
    const fee = set.fees.find((f) => f.id === action.payload);
    if (fee) fee.on = !fee.on;
    set.draftDirty = true;
  },

  saveFee(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.label ?? '').trim()) {
      state.toast = 'Enter a fee label.';
      return;
    }
    const set = state.fees[state.propId];
    if (set) {
      set.fees.push({
        id: uid('f'),
        label: form.label,
        amount: parseInt(form.amount, 10) || 0,
        unit: (form.funit as FeeUnitKey) ?? 'flat',
        on: true
      });
      set.draftDirty = true;
    }
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.label} added to the draft — publish to push it live.`;
  },

  removeFee(state: DemoState, action: PayloadAction<string>) {
    const set = state.fees[state.propId];
    if (!set) return;
    const fee = set.fees.find((f) => f.id === action.payload);
    set.fees = set.fees.filter((f) => f.id !== action.payload);
    set.draftDirty = true;
    state.toast = `${fee?.label ?? 'Fee'} deleted from the draft.`;
  },

  publishFees(state: DemoState) {
    const set = state.fees[state.propId];
    if (!set) return;
    set.published = true;
    set.draftDirty = false;
    state.toast = 'Move-in cost estimator published.';
  },

  discardFees(state: DemoState) {
    state.fees[state.propId] = JSON.parse(JSON.stringify(SEED_FEES[state.propId] ?? curFees(state)));
    state.toast = 'Draft discarded.';
  },

  bumpCalc(
    state: DemoState,
    action: PayloadAction<{ field: 'calcApplicants' | 'calcPets' | 'calcVehicles'; delta: number }>
  ) {
    state[action.payload.field] = Math.max(0, state[action.payload.field] + action.payload.delta);
  },

  /* ---------- pricing calculator builder ---------- */

  pcAddCategory(state: DemoState) {
    const set = state.pcalc[state.propId];
    if (!set) return;
    set.cats.push({ id: uid('cat'), name: 'New Category', fees: [] });
    markDirty(state);
    state.toast = 'Category added.';
  },

  pcRenameCategory(state: DemoState, action: PayloadAction<{ id: string; value: string }>) {
    const category = state.pcalc[state.propId]?.cats.find((c) => c.id === action.payload.id);
    if (category) category.name = action.payload.value;
    markDirty(state);
  },

  pcRemoveCategory(state: DemoState, action: PayloadAction<string>) {
    const set = state.pcalc[state.propId];
    if (!set) return;
    const category = set.cats.find((c) => c.id === action.payload);
    set.cats = set.cats.filter((c) => c.id !== action.payload);
    markDirty(state);
    state.toast = `${category?.name ?? 'Category'} deleted.`;
  },

  pcSaveFee(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.flabel ?? '').trim()) {
      state.toast = 'Enter a fee label.';
      return;
    }
    const record: Omit<PcFee, 'id'> = {
      label: form.flabel.trim(),
      logic: form.flogic as PcFee['logic'],
      base: parseInt(form.fbase, 10) || 0,
      max: parseInt(form.fmax, 10) || 0,
      freq: form.ffreq as PcFee['freq'],
      mult: form.fmult as PcFee['mult'],
      qtyEnabled: !!state.form.fqtyEnabled,
      qtyMin: parseInt(form.fqtyMin, 10) || 0,
      qtyMax: parseInt(form.fqtyMax, 10) || 0,
      visible: !!state.form.fvisible,
      displayText: form.fdisplay || '',
      preText: form.fpre || '',
      postText: form.fpost || ''
    };

    const set = state.pcalc[state.propId];
    const category = set?.cats.find((c) => c.id === form._catId) ?? set?.cats[0];
    if (category) {
      if (state.editingId) {
        const index = category.fees.findIndex((f) => f.id === state.editingId);
        if (index >= 0) category.fees[index] = { ...category.fees[index], ...record };
      } else {
        category.fees.push({ id: uid('p'), ...record });
      }
    }

    markDirty(state);
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = state.editingId ? `${record.label} updated.` : `${record.label} added to the draft.`;
  },

  pcRemoveFee(state: DemoState, action: PayloadAction<{ catId: string; feeId: string }>) {
    const category = state.pcalc[state.propId]?.cats.find((c) => c.id === action.payload.catId);
    if (!category) return;
    const fee = category.fees.find((f) => f.id === action.payload.feeId);
    category.fees = category.fees.filter((f) => f.id !== action.payload.feeId);
    markDirty(state);
    state.toast = `${fee?.label ?? 'Fee'} deleted.`;
  },

  pcToggleFeeVisibility(state: DemoState, action: PayloadAction<{ catId: string; feeId: string }>) {
    const fee = state.pcalc[state.propId]?.cats
      .find((c) => c.id === action.payload.catId)
      ?.fees.find((f) => f.id === action.payload.feeId);
    if (fee) fee.visible = !fee.visible;
    markDirty(state);
  },

  pcDragStart(state: DemoState, action: PayloadAction<{ catId: string; feeId: string } | null>) {
    state.pcDragFrom = action.payload;
  },

  pcMoveFee(state: DemoState, action: PayloadAction<{ targetCat: string; beforeFeeId: string | null }>) {
    const from = state.pcDragFrom;
    const set = state.pcalc[state.propId];
    if (!from || !set) return;

    let moved: PcFee | undefined;
    set.cats.forEach((category) => {
      const index = category.fees.findIndex((f) => f.id === from.feeId);
      if (index >= 0) moved = category.fees.splice(index, 1)[0];
    });
    if (!moved) return;

    const target = set.cats.find((c) => c.id === action.payload.targetCat);
    if (!target) return;

    if (action.payload.beforeFeeId) {
      const index = target.fees.findIndex((f) => f.id === action.payload.beforeFeeId);
      target.fees.splice(index < 0 ? target.fees.length : index, 0, moved);
    } else {
      target.fees.push(moved);
    }

    markDirty(state);
    state.pcDragFrom = null;
  },

  pcPublish(state: DemoState) {
    const set = state.pcalc[state.propId];
    if (!set) return;
    set.published = true;
    set.draftDirty = false;
    state.toast = 'Pricing calculator published.';
  },

  pcSaveDraft(state: DemoState) {
    markDirty(state);
    state.toast = 'Draft saved.';
  },

  pcDiscard(state: DemoState) {
    state.pcalc[state.propId] = JSON.parse(JSON.stringify(SEED_PCALC[state.propId] ?? curPcalc(state)));
    state.toast = 'Draft discarded.';
  },

  /* ---------- live chat ---------- */

  setChatPropFilter(state: DemoState, action: PayloadAction<string>) {
    state.chatPropFilter = action.payload;
  },

  toggleRotation(state: DemoState, action: PayloadAction<string>) {
    const staff = state.chatStaff.find((s) => s.id === action.payload);
    if (!staff) return;
    staff.inRotation = !staff.inRotation;
    state.toast = staff.inRotation
      ? `${staff.name} added to the chat rotation.`
      : `${staff.name} removed from the chat rotation.`;
  },

  assignConvo(state: DemoState, action: PayloadAction<string>) {
    const convo = state.convos.find((c) => c.id === action.payload);
    if (!convo) return;
    const available = state.chatStaff.find(
      (s) => s.propId === convo.propId && s.online && s.inRotation
    );
    if (!available) {
      state.toast = 'No staff online and in rotation at this property.';
      return;
    }
    convo.staff = available.name;
    convo.state = 'active';
    state.toast = `Conversation assigned to ${available.name}.`;
  },

  openThread(state: DemoState, action: PayloadAction<string>) {
    state.threadId = action.payload;
    state.threadDraft = '';
    const convo = state.convos.find((c) => c.id === action.payload);
    if (convo) convo.unread = 0;
  },

  closeThread(state: DemoState) {
    state.threadId = null;
    state.threadDraft = '';
  },

  setThreadDraft(state: DemoState, action: PayloadAction<string>) {
    state.threadDraft = action.payload;
  },

  sendThread(state: DemoState) {
    const id = state.threadId;
    const text = state.threadDraft.trim();
    if (!id || !text) return;
    const convo = state.convos.find((c) => c.id === id);
    if (!convo) return;
    const staff = convo.staff === '—' ? 'Alex Morgan' : convo.staff;

    state.threads[id] = [...(state.threads[id] ?? []), { who: 'staff', name: staff, text, when: 'just now' }];
    convo.last = text;
    convo.when = 'just now';
    convo.staff = staff;
    if (convo.state === 'closed') convo.state = 'active';
    state.threadDraft = '';
    state.toast = `Reply sent to ${convo.visitor}.`;
  },

  closeConvo(state: DemoState) {
    const convo = state.convos.find((c) => c.id === state.threadId);
    if (!convo) return;
    convo.state = 'closed';
    state.threadId = null;
    state.toast = `Conversation with ${convo.visitor} closed.`;
  },

  /* ---------- analytics + reports ---------- */

  setDateRange(state: DemoState, action: PayloadAction<string>) {
    state.dateRange = action.payload;
  },

  setScope(state: DemoState, action: PayloadAction<{ scope: string; id?: string }>) {
    state.scope = action.payload.scope;
    state.scopeId = action.payload.id ?? '';
  },

  setScopeId(state: DemoState, action: PayloadAction<string>) {
    state.scopeId = action.payload;
  },

  startReport(state: DemoState, action: PayloadAction<string>) {
    state.reportJobs[action.payload] = { state: 'generating', rows: 0 };
  },

  finishReport(state: DemoState, action: PayloadAction<{ id: string; name: string; rows: number }>) {
    state.reportJobs[action.payload.id] = { state: 'ready', rows: action.payload.rows };
    state.reportRuns[action.payload.id] = { when: 'Ran just now', by: 'Alex Morgan' };
    state.toast = `${action.payload.name} ready · ${plural(action.payload.rows, 'row')}.`;
  },

  /* ---------- AI services ---------- */

  toggleAi(state: DemoState, action: PayloadAction<string>) {
    state.aiOn[action.payload] = !state.aiOn[action.payload];
  },

  clearTranscript(state: DemoState) {
    state.transcriptOpen = false;
    state.toast = 'Transcript marked reviewed — removed from the queue.';
  }
};
