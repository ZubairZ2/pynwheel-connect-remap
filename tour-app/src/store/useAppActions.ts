import { useMemo, useRef } from 'react';
import { useRepository } from '~/repositories/repositoryContext';
import { FeatureUnavailableError } from '~/repositories/tourRepository';
import { unlockOverBluetooth } from '~/services/iglooBle';
import { success, tap } from '~/services/native';
import { useApp } from './appContext';
import { bestMatchUnit, currentStop, markOf, selectedNodes, tourStopViews } from './selectors';

/**
 * The async flows of the app: they call the repository and dispatch plain
 * actions as they progress. Screens call these, never the repository.
 */
export const useAppActions = () => {
  const { state, dispatch, data } = useApp();
  const repository = useRepository();
  // Lock requests in flight, by stop: a second tap before the store re-renders must not start a second request.
  const lockRequests = useRef(new Set<string>());
  // The Bluetooth unlock running per stop, so the screen can cancel it (scan, connection or unlock).
  const bluetoothUnlocks = useRef(new Map<string, AbortController>());

  return useMemo(() => {
    const bundle = data.bundle;
    const content = data.content;
    const fill = (template: string, params: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
    const toast = (message: string) => dispatch({ type: 'toast', message });
    const mark = markOf(bundle);
    const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

    const runTour = async (mode: 'self' | 'ar') => {
      if (!bundle) return;
      const chosen = selectedNodes(state, bundle);
      const all = tourStopViews(bundle).map((v) => v.node);
      const nodes = chosen.length ? chosen : all;
      dispatch({ type: 'tourCalculating', mode });
      try {
        const result = await repository.getTourRoute(nodes);
        if (!result.ok) {
          dispatch({ type: 'tourFailed', message: result.error.message });
          return;
        }
        const order = result.tour.segments.map((s) => s.node);
        if (!order.length) {
          dispatch({ type: 'tourFailed', message: result.tour.route.warnings[0] ?? 'None of the chosen stops can be reached.' });
          return;
        }
        dispatch({ type: 'tourReady', tour: result.tour, order, mode });
        void success();
      } catch (error) {
        dispatch({ type: 'tourFailed', message: error instanceof Error ? error.message : 'The route could not be calculated.' });
      }
    };

    return {
      /** Sign in through the repository (the Pynwheel CMS credentials); the reducer moves to Home or to the property picker. */
      login: async () => {
        const email = state.email.trim();
        if (!email || !state.password) {
          dispatch({ type: 'loginFailed', message: 'Enter your email and password to continue.' });
          return;
        }
        if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
          dispatch({ type: 'loginFailed', message: 'That email address does not look right.' });
          return;
        }
        dispatch({ type: 'loginStart' });
        try {
          const session = await repository.login(email, state.password);
          dispatch({ type: 'loginSucceeded', user: { name: session.user.name, email: session.user.email }, propertyId: session.propertyId });
          void success();
        } catch (error) {
          dispatch({ type: 'loginFailed', message: messageOf(error, 'Sign-in failed. Please try again.') });
        }
      },

      signOut: async () => {
        dispatch({ type: 'signOut' });
        try {
          await repository.logout();
        } catch {
          /* the local session is gone either way */
        }
      },

      /** Switch to another property (only tourable ones can be chosen). */
      selectProperty: async (propertyId: number, tourable: boolean, name: string) => {
        if (!tourable) {
          toast(`${name} has no Self-Guided Tour yet, so it cannot be toured in the app.`);
          return;
        }
        try {
          await repository.selectProperty(propertyId);
          dispatch({ type: 'selectProperty', propertyId });
          void tap();
        } catch (error) {
          toast(messageOf(error, 'The property could not be selected.'));
        }
      },

      generateRoute: () => runTour('self'),
      launchArTour: () => runTour('ar'),

      nextStop: () => {
        if (!bundle) return;
        const names = state.tourOrder.map((n) => tourStopViews(bundle).find((v) => v.node === n)?.name ?? n);
        dispatch({ type: 'nextStop', propertyName: bundle.property.name, names, date: `Today${mark}` });
        void tap();
      },

      /**
       * A door code for a stop's smart lock, issued by the backend through the property's igloohome account (the
       * legacy app's lock screen "get pin" flow). One request per stop at a time; an answer that arrives after the
       * visitor switched property is dropped by the reducer.
       */
      requestLockPin: async (node: string) => {
        if (!bundle || lockRequests.current.has(node)) return;
        const propertyId = state.propertyId;
        lockRequests.current.add(node);
        dispatch({ type: 'lockPinStart', node });
        try {
          const pin = await repository.getStopLockPin(node);
          dispatch({ type: 'lockPinReady', node, propertyId, pin });
          void success();
        } catch (error) {
          dispatch({ type: 'lockPinFailed', node, propertyId, message: messageOf(error, 'The door code could not be issued. Please try again.') });
        } finally {
          lockRequests.current.delete(node);
        }
      },

      /**
       * The igloohome v1 flow of the legacy app's lock screen: the backend issues the Bluetooth guest key for the
       * stop (kept for the tour, 90 minutes), then the native igloohome SDK scans for the lock, connects with the
       * key and unlocks; each phase reaches the screen, every failure is a sentence with a retry. One attempt per
       * stop at a time; an answer for a property the visitor has left is dropped by the reducer.
       */
      unlockWithBluetooth: async (node: string) => {
        if (!bundle || lockRequests.current.has(node)) return;
        const propertyId = state.propertyId;
        const controller = new AbortController();
        lockRequests.current.add(node);
        bluetoothUnlocks.current.set(node, controller);
        try {
          let key = state.lockKeys[node] ?? null;
          const stale = key?.validUntil ? Date.parse(key.validUntil) <= Date.now() : false;
          if (!key || stale) {
            dispatch({ type: 'lockPhase', node, propertyId, status: 'loading' });
            key = await repository.getStopLockBluetoothKey(node);
            if (controller.signal.aborted) return;
            dispatch({ type: 'lockKeyReady', node, propertyId, key });
          }
          await unlockOverBluetooth({
            lockName: key.lockName,
            key: key.key,
            signal: controller.signal,
            onPhase: (phase) => dispatch({ type: 'lockPhase', node, propertyId, status: phase === 'preparing' ? 'loading' : phase })
          });
          dispatch({ type: 'lockUnlocked', node, propertyId });
          void success();
        } catch (error) {
          if (controller.signal.aborted) {
            dispatch({ type: 'lockPinDismiss' });
            return;
          }
          dispatch({ type: 'lockPinFailed', node, propertyId, message: messageOf(error, 'The lock could not be opened. Please try again.') });
        } finally {
          lockRequests.current.delete(node);
          if (bluetoothUnlocks.current.get(node) === controller) bluetoothUnlocks.current.delete(node);
        }
      },

      /** Stops the Bluetooth attempt for a stop (the plugin is reset) and clears its status. */
      cancelBluetoothUnlock: (node: string) => {
        bluetoothUnlocks.current.get(node)?.abort();
      },

      findRoute: async () => {
        const { from, to, fromFloor, toFloor, stepFree, avoidBlockers } = state.wayfinding;
        if (!from || !to) {
          toast('Choose where you are and where you want to go.');
          return;
        }
        dispatch({ type: 'wfCalculating' });
        try {
          const result = await repository.findRoute(from, to, { stepFree, avoidBlockers, fromFloor, toFloor });
          dispatch({ type: 'wfResult', result });
          if (result.ok) void success();
        } catch (error) {
          dispatch({ type: 'wfResult', result: { ok: false, from, to, error: { code: 'no_path', message: error instanceof Error ? error.message : 'The route could not be calculated.' }, warnings: [] } });
        }
      },

      openAiChat: (context: 'stop' | 'general') => {
        if (!bundle || !content) return;
        const stop = currentStop(state, bundle);
        const params = { stop: stop?.name ?? 'this stop', property: bundle.property.name };
        const greeting = fill(context === 'stop' ? content.concierge.greetingStop : content.concierge.greetingGeneral, params);
        dispatch({ type: 'openAiChat', context, greeting });
      },

      askAi: async (text?: string) => {
        if (!bundle) return;
        const question = (text ?? state.ai.input).trim();
        if (!question) return;
        dispatch({ type: 'aiAsk', question });
        const stop = currentStop(state, bundle);
        try {
          const answer = await repository.askConcierge(question, { stopName: stop?.name ?? null });
          dispatch({ type: 'aiReply', text: answer });
        } catch {
          dispatch({ type: 'aiReply', text: `I could not reach the concierge just now. Please try again.${mark}` });
        }
      },

      talkToHuman: () => {
        if (!content) return;
        dispatch({ type: 'aiHuman', text: content.concierge.humanReply });
      },

      openBook: () => {
        if (!bundle || !content) return;
        const unit = bundle.units.find((u) => u.showInStopsList && u.available)?.name ?? `No preference${mark}`;
        dispatch({ type: 'openBook', day: content.booking.days[0] ?? '', time: content.booking.times[2] ?? content.booking.times[0] ?? '', unit });
      },

      submitBooking: async () => {
        if (!content) return;
        dispatch({ type: 'bookSubmitting' });
        try {
          await repository.requestBooking({ day: state.book.day, time: state.book.time, unit: state.book.unit, name: content.visitor.name, phone: content.visitor.phone });
          dispatch({ type: 'bookDone' });
          void success();
        } catch (error) {
          dispatch({ type: 'toast', message: error instanceof FeatureUnavailableError ? error.message : `The request could not be sent. Please try again.${mark}` });
          dispatch({ type: 'setBook', field: 'day', value: state.book.day });
          dispatch({ type: 'closeOverlay', overlay: 'book' });
        }
      },

      openApply: (unitNode?: string) => {
        if (!bundle) return;
        const unit = unitNode ?? bestMatchUnit(state, bundle)?.node ?? null;
        if (!unit) return;
        dispatch({ type: 'openApply', unit });
      },

      submitApplication: async () => {
        if (!bundle || !state.applyUnit) return;
        const unit = bundle.units.find((u) => u.node === state.applyUnit);
        dispatch({ type: 'applySubmitting' });
        try {
          await repository.startApplication(state.applyUnit);
          dispatch({ type: 'applyDone', message: `Application started for ${unit?.name ?? 'your unit'} — check your email to finish.${mark}` });
          void success();
        } catch (error) {
          dispatch({ type: 'applyDone', message: error instanceof FeatureUnavailableError ? error.message : `The application could not be started. Please try again.${mark}` });
        }
      },

      shareSummary: () => {
        if (!content) return;
        toast(`Summary emailed to ${content.visitor.email}`);
      },

      listingTap: (name: string) => toast(`${name} has no Self-Guided Tour yet.`),

      toast
    };
  }, [state, dispatch, data, repository]);
};
