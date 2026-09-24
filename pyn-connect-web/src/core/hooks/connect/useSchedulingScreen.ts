'use client';

import { useMemo } from 'react';

import { DAYS, SLOT_TIMES, TYPE_LABEL } from '~/data/mock/scheduling.mock';
import { demoActions } from '~/core/store/demo/demo.slice';
import { curBooking, curProp } from '~/core/store/demo/demo.selectors';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import {
  EMBED_CODE,
  generateAbandonedTours,
  generateBookingView,
  generateCalendarDays,
  generateReminderSteps,
  generateSchedStats,
  generateSchedTabs,
  generateTourTypeCards,
  generateVisitorRows,
  generateWidgetSlotChips
} from '~/core/utils/generator/connect/scheduling.generator';

export const useSchedulingScreen = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const demo = useAppSelector((s) => s.demo);
  const booking = curBooking(demo);

  const schedTabs = useMemo(
    () =>
      generateSchedTabs(demo.schedTab).map((tab) => ({
        ...tab,
        go: () => dispatch(demoActions.setTab({ key: 'schedTab', value: tab.id }))
      })),
    [demo.schedTab, dispatch]
  );

  const calendarDays = useMemo(
    () =>
      generateCalendarDays(demo).map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          pick: () => dispatch(demoActions.pickBooking(slot.id))
        }))
      })),
    [demo, dispatch]
  );

  const abandonedTours = useMemo(
    () =>
      generateAbandonedTours(demo).map((row) => ({
        ...row,
        go: () => actions.openProp(row.propId),
        recover: () => dispatch(demoActions.recoverAbandoned(row.visitor)),
        close: () =>
          actions.confirm({
            title: `Close ${row.visitor}'s session?`,
            msg: 'The tour session is ended, any active lock grants are revoked, and the unit is released back to the availability pool.',
            label: 'Close Session',
            action: { type: demoActions.closeAbandoned.type, payload: row.visitor }
          })
      })),
    [demo, dispatch, actions]
  );

  const tourTypeCards = useMemo(
    () =>
      generateTourTypeCards(demo).map((card) => ({
        ...card,
        toggle: () =>
          card.on
            ? actions.confirm({
                title: `Stop accepting ${card.label} bookings?`,
                msg: `The scheduler widget stops offering ${card.label.toLowerCase()} tours. Existing appointments are kept.`,
                label: 'Turn Off',
                action: { type: demoActions.toggleTourType.type, payload: card.id }
              })
            : dispatch(demoActions.toggleTourType(card.id)),
        toggleExpand: () => dispatch(demoActions.toggleTypeExpand(card.id)),
        behaviors: card.behaviors.map((behavior) => ({
          ...behavior,
          toggle: () => dispatch(demoActions.toggleBehavior({ id: card.id, key: behavior.key }))
        })),
        hourRows: card.hourRows.map((row) => ({
          ...row,
          toggle: () => dispatch(demoActions.toggleHourDay({ id: card.id, day: row.day })),
          onOpen: (event: React.ChangeEvent<HTMLInputElement>) =>
            dispatch(demoActions.setHour({ id: card.id, day: row.day, field: 'open', value: event.target.value })),
          onClose: (event: React.ChangeEvent<HTMLInputElement>) =>
            dispatch(demoActions.setHour({ id: card.id, day: row.day, field: 'close', value: event.target.value }))
        })),
        dailyUp: () => dispatch(demoActions.bumpCap({ id: card.id, field: 'dailyCap', delta: 1 })),
        dailyDown: () => dispatch(demoActions.bumpCap({ id: card.id, field: 'dailyCap', delta: -1 })),
        slotUp: () => dispatch(demoActions.bumpCap({ id: card.id, field: 'slotCap', delta: 1 })),
        slotDown: () => dispatch(demoActions.bumpCap({ id: card.id, field: 'slotCap', delta: -1 }))
      })),
    [demo, dispatch, actions]
  );

  const visitorRows = useMemo(
    () =>
      generateVisitorRows(demo).map((visitor) => ({
        ...visitor,
        requestRemoval: () => dispatch(demoActions.requestRemoval(visitor.id)),
        processRemoval: () =>
          actions.confirm({
            title: `Remove ${visitor.name}'s personal data?`,
            msg: 'Contact details and tour history are permanently erased across the CRM sync and the visitor record is anonymized. This cannot be undone.',
            label: 'Remove Data',
            action: { type: demoActions.processRemoval.type, payload: visitor.id }
          })
      })),
    [demo, dispatch, actions]
  );

  const reminderSteps = generateReminderSteps(demo).map((step) => ({
    ...step,
    send: () => dispatch(demoActions.sendReminder(step.key))
  }));

  return {
    schedTabs,
    isSchedCal: demo.schedTab === 'calendar',
    isSchedTypes: demo.schedTab === 'types',
    isSchedDirectory: demo.schedTab === 'directory',
    isSchedWidget: demo.schedTab === 'widget',
    schedStats: generateSchedStats(demo),
    calendarDays,
    abandonedTours,
    abandonedCount: demo.abandoned.filter((a) => a.state === 'open').length,
    abandonedAllClear: demo.abandoned.filter((a) => a.state === 'open').length === 0,
    booking: generateBookingView(demo),
    reminderSteps,
    resyncBooking: () => dispatch(demoActions.resyncBooking()),
    cancelBooking: () =>
      actions.confirm({
        title: `Cancel ${booking?.visitor}'s tour?`,
        msg: `The appointment is cancelled in ${booking?.crm}, the $50 card hold is refunded by Stripe, and any pending reminders are stopped.`,
        label: 'Cancel Booking',
        action: { type: demoActions.cancelBooking.type }
      }),
    addBooking: () =>
      dispatch(
        demoActions.openModal({
          kind: 'booking',
          form: {
            visitor: '',
            email: '',
            phone: '',
            bprop: curProp(demo)?.name ?? '',
            bday: DAYS[0],
            btime: SLOT_TIMES[2],
            btype: TYPE_LABEL.self
          }
        })
      ),
    tourTypeCards,
    vdQuery: demo.vdQuery,
    onVdQuery: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.setVdQuery(event.target.value)),
    vdRemovalCount: demo.visitors.filter((v) => v.gdpr === 'requested').length,
    visitorRows,
    vdEmpty: visitorRows.length === 0,
    widgetSlotChips: generateWidgetSlotChips(demo).map((chip) => ({
      ...chip,
      pick: () => dispatch(demoActions.toggleSlot(chip.label))
    })),
    widgetSlotCount: demo.widgetSlots.length,
    widgetCap: demo.widgetCap,
    onWidgetCap: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(demoActions.setWidgetCap(parseInt(event.target.value, 10) || 0)),
    widgetMsg: demo.widgetMsg,
    onWidgetMsg: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      dispatch(demoActions.setWidgetMsg(event.target.value)),
    embedCode: EMBED_CODE
  };
};
