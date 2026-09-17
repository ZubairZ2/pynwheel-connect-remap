import type { PayloadAction } from '@reduxjs/toolkit';

import type { TourBehavior, TourTypeKey } from '~/core/models/data/connect/scheduling.data';
import { uid } from '~/core/utils/connect/format';
import { DAYS, TYPE_LABEL } from '~/data/mock/scheduling.mock';

import { curBooking } from '../demo.selectors';
import type { DemoState } from '../demo.state';

/** Tour Scheduling: bookings, tour types, visitor directory, widget, abandoned tours. */
export const schedulingReducers = {
  pickBooking(state: DemoState, action: PayloadAction<string>) {
    state.bookingId = action.payload;
  },

  saveBooking(state: DemoState, action: PayloadAction<{ propId: string; crm: string }>) {
    const form = state.form as Record<string, string>;
    if (!(form.visitor ?? '').trim()) {
      state.toast = 'Enter the visitor name.';
      return;
    }
    const type =
      (Object.keys(TYPE_LABEL) as TourTypeKey[]).find((k) => TYPE_LABEL[k] === form.btype) ?? 'self';
    const id = uid('b');

    state.bookings.push({
      id,
      day: Math.max(0, DAYS.indexOf(form.bday)),
      time: form.btime,
      visitor: form.visitor,
      email: form.email || '—',
      phone: form.phone || '—',
      type,
      propId: action.payload.propId,
      crm: action.payload.crm,
      sync: 'pending',
      hold: type === 'virtual' ? 'n/a' : 'held',
      r1: 'pending',
      r2: 'pending'
    });

    state.bookingId = id;
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.visitor} booked · ${form.bday} at ${form.btime} · pushing to ${action.payload.crm}.`;
  },

  resyncBooking(state: DemoState) {
    const booking = curBooking(state);
    if (!booking) return;
    booking.sync = 'updated';
    state.toast = `Re-sent booking to ${booking.crm} — record updated.`;
  },

  sendReminder(state: DemoState, action: PayloadAction<'day' | 'hour'>) {
    const booking = curBooking(state);
    if (!booking) return;
    if (action.payload === 'day') booking.r1 = 'sent';
    else booking.r2 = 'sent';
    state.toast = `${action.payload === 'day' ? '1-day' : '1-hour'} reminder sent to ${booking.visitor}.`;
  },

  cancelBooking(state: DemoState) {
    const booking = curBooking(state);
    if (!booking) return;
    booking.sync = 'cancelled';
    if (booking.hold !== 'n/a') booking.hold = 'refunded';
    state.toast = `${booking.visitor}'s tour cancelled.`;
  },

  /* ---------- tour types ---------- */

  toggleTypeExpand(state: DemoState, action: PayloadAction<string>) {
    const type = state.tourTypes.find((t) => t.id === action.payload);
    if (type) type.expanded = !type.expanded;
  },

  toggleTourType(state: DemoState, action: PayloadAction<string>) {
    const type = state.tourTypes.find((t) => t.id === action.payload);
    if (!type) return;
    type.on = !type.on;
    state.toast = type.on
      ? `${type.label} bookings enabled.`
      : `${type.label} bookings turned off — the widget stops offering this type.`;
  },

  toggleBehavior(state: DemoState, action: PayloadAction<{ id: string; key: keyof TourBehavior }>) {
    const type = state.tourTypes.find((t) => t.id === action.payload.id);
    if (type) type.behavior[action.payload.key] = !type.behavior[action.payload.key];
  },

  toggleHourDay(state: DemoState, action: PayloadAction<{ id: string; day: string }>) {
    const type = state.tourTypes.find((t) => t.id === action.payload.id);
    if (type) type.hours[action.payload.day].on = !type.hours[action.payload.day].on;
  },

  setHour(
    state: DemoState,
    action: PayloadAction<{ id: string; day: string; field: 'open' | 'close'; value: string }>
  ) {
    const type = state.tourTypes.find((t) => t.id === action.payload.id);
    if (type) type.hours[action.payload.day][action.payload.field] = action.payload.value;
  },

  bumpCap(
    state: DemoState,
    action: PayloadAction<{ id: string; field: 'dailyCap' | 'slotCap'; delta: number }>
  ) {
    const type = state.tourTypes.find((t) => t.id === action.payload.id);
    if (type) type[action.payload.field] = Math.max(0, type[action.payload.field] + action.payload.delta);
  },

  /* ---------- visitor directory ---------- */

  setVdQuery(state: DemoState, action: PayloadAction<string>) {
    state.vdQuery = action.payload;
  },

  requestRemoval(state: DemoState, action: PayloadAction<string>) {
    const visitor = state.visitors.find((v) => v.id === action.payload);
    if (!visitor) return;
    visitor.gdpr = 'requested';
    state.toast = `Data-removal request logged for ${visitor.name}.`;
  },

  processRemoval(state: DemoState, action: PayloadAction<string>) {
    const visitor = state.visitors.find((v) => v.id === action.payload);
    if (!visitor) return;
    visitor.gdpr = 'removed';
    visitor.email = '[removed]';
    visitor.phone = '[removed]';
    state.toast = `${visitor.name}'s data removed.`;
  },

  /* ---------- booking widget ---------- */

  toggleSlot(state: DemoState, action: PayloadAction<string>) {
    state.widgetSlots = state.widgetSlots.includes(action.payload)
      ? state.widgetSlots.filter((slot) => slot !== action.payload)
      : [...state.widgetSlots, action.payload];
  },

  setWidgetCap(state: DemoState, action: PayloadAction<number>) {
    state.widgetCap = action.payload;
  },

  setWidgetMsg(state: DemoState, action: PayloadAction<string>) {
    state.widgetMsg = action.payload;
  },

  /* ---------- abandoned tours ---------- */

  recoverAbandoned(state: DemoState, action: PayloadAction<string>) {
    const row = state.abandoned.find((a) => a.visitor === action.payload);
    if (row) row.state = 'recovered';
    state.toast = `Recovery text sent to ${action.payload} with a link to resume the tour.`;
  },

  closeAbandoned(state: DemoState, action: PayloadAction<string>) {
    const row = state.abandoned.find((a) => a.visitor === action.payload);
    if (row) row.state = 'closed';
    state.toast = `${action.payload}'s session closed.`;
  },

  /* ---------- units & floor plans listing ---------- */

  setPuQuery(state: DemoState, action: PayloadAction<string>) {
    state.puQuery = action.payload;
  },

  setPuSort(state: DemoState, action: PayloadAction<string>) {
    state.puSortDir = state.puSort === action.payload ? -state.puSortDir : 1;
    state.puSort = action.payload;
  }
};
