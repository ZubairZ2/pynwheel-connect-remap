import type { PayloadAction } from '@reduxjs/toolkit';

import { PROP_LEVELS } from '~/data/mock/core.mock';

import type { DemoState, FormState, FormValue, ModalKind, PendingAction } from '../demo.state';

/** Selection, search, overlays, forms — everything the app shell owns. */
export const shellReducers = {
  selectOrg(state: DemoState, action: PayloadAction<string>) {
    state.orgId = action.payload;
  },

  selectProp(state: DemoState, action: PayloadAction<string>) {
    state.propId = action.payload;
    state.levelId = (PROP_LEVELS[action.payload] ?? [{ id: 'gen-1' }])[0].id;
    state.selectedNode = null;
    state.edgeFrom = null;
    state.selectedPin = null;
    state.plotTarget = null;
  },

  selectUnit(state: DemoState, action: PayloadAction<string | null>) {
    state.unitId = action.payload;
  },

  setOrgQuery(state: DemoState, action: PayloadAction<string>) {
    state.orgQuery = action.payload;
  },

  setPropQuery(state: DemoState, action: PayloadAction<string>) {
    state.propQuery = action.payload;
  },

  setGlobalQuery(state: DemoState, action: PayloadAction<string>) {
    state.globalQuery = action.payload;
  },

  setPropFilter(
    state: DemoState,
    action: PayloadAction<{ key: 'propFilterStatus' | 'propFilterOrg' | 'propFilterProduct'; value: string }>
  ) {
    state[action.payload.key] = action.payload.value;
  },

  setTab(
    state: DemoState,
    action: PayloadAction<{
      key: 'tcTab' | 'tsTab' | 'puTab' | 'brandTab' | 'contentTab' | 'schedTab' | 'integTab';
      value: string;
    }>
  ) {
    state[action.payload.key] = action.payload.value;
  },

  /* ---------- toast ---------- */

  showToast(state: DemoState, action: PayloadAction<string>) {
    state.toast = action.payload;
  },

  clearToast(state: DemoState) {
    state.toast = '';
  },

  /* ---------- confirm dialog ---------- */

  askConfirm(
    state: DemoState,
    action: PayloadAction<{
      title: string;
      msg: string;
      label: string;
      action: PendingAction;
      match?: string;
    }>
  ) {
    state.confirmOpen = true;
    state.confirmTitle = action.payload.title;
    state.confirmMsg = action.payload.msg;
    state.confirmLabel = action.payload.label;
    state.pending = action.payload.action;
    state.confirmMatch = action.payload.match ?? '';
    state.confirmInput = '';
  },

  closeConfirm(state: DemoState) {
    state.confirmOpen = false;
    state.confirmMatch = '';
    state.confirmInput = '';
    state.pending = null;
  },

  setConfirmInput(state: DemoState, action: PayloadAction<string>) {
    state.confirmInput = action.payload;
  },

  /* ---------- modals and their forms ---------- */

  openModal(
    state: DemoState,
    action: PayloadAction<{ kind: ModalKind; form?: FormState; editingId?: string | null }>
  ) {
    state.modal = action.payload.kind;
    state.form = action.payload.form ?? {};
    state.editingId = action.payload.editingId ?? null;
  },

  closeModal(state: DemoState) {
    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  setFormField(state: DemoState, action: PayloadAction<{ key: string; value: FormValue }>) {
    state.form[action.payload.key] = action.payload.value;
  },

  toggleFormFlag(state: DemoState, action: PayloadAction<string>) {
    state.form[action.payload] = !state.form[action.payload];
  },

  toggleFormCheck(state: DemoState, action: PayloadAction<{ key: string; id: string }>) {
    const current = (state.form[action.payload.key] as string[] | undefined) ?? [];
    const index = current.indexOf(action.payload.id);
    state.form[action.payload.key] =
      index < 0 ? [...current, action.payload.id] : current.filter((_, i) => i !== index);
  },

  /* ---------- assorted overlays ---------- */

  openInstructions(state: DemoState, action: PayloadAction<string>) {
    state.instrOpen = true;
    state.instrVendorId = action.payload;
  },

  closeInstructions(state: DemoState) {
    state.instrOpen = false;
    state.instrVendorId = '';
  },

  openTranscript(state: DemoState, action: PayloadAction<number>) {
    state.transcriptOpen = true;
    state.transcriptIdx = action.payload;
  },

  closeTranscript(state: DemoState) {
    state.transcriptOpen = false;
  },

  setHelpQuery(state: DemoState, action: PayloadAction<string>) {
    state.helpQuery = action.payload;
  },

  setDashProduct(state: DemoState, action: PayloadAction<string>) {
    state.dashProduct = action.payload;
  }
};
