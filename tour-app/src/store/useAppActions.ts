import { useMemo, useRef } from 'react';
import { CONCIERGE_GREETING_GUEST } from '~/content/appCopy';
import { ACCESS_MINUTES, DEMO, EXTEND_MINUTES, HOLD_HOURS, LEASING_EMAIL, LEASING_PHONE } from '~/content/demoFixtures';
import type { TourHistoryEntry } from '~/models';
import { useRepository } from '~/repositories/repositoryContext';
import { FeatureUnavailableError } from '~/repositories/tourRepository';
import { unlockOverBluetooth } from '~/services/iglooBle';
import { success, tap } from '~/services/native';
import { useApp } from './appContext';
import type { AppState, ScheduleDraft, TourPass, VerifyStep } from './appState';
import { dayKey } from './appState';
import { fmtTime, slotTime } from './scenarios';
import { bestMatchUnit, currentStop, markOf, selectedNodes, tourStopViews } from './selectors';
import { slotsForDay } from './views';

/**
 * The async flows of the app: they call the repository and dispatch plain
 * actions as they progress. Screens call these, never the repository.
 *
 * The design refresh's UI-only flows (the local self-tour schedule, the
 * simulated identity check and check-in, the location permission, the
 * guest gate …) live here too: they are timers and toasts over local state,
 * never a request, and every message says what did or did not happen.
 */
export const useAppActions = () => {
  const { state, dispatch, data } = useApp();
  const repository = useRepository();
  // Lock requests in flight, by stop: a second tap before the store re-renders must not start a second request.
  const lockRequests = useRef(new Set<string>());
  // The Bluetooth unlock running per stop, so the screen can cancel it (scan, connection or unlock).
  const bluetoothUnlocks = useRef(new Map<string, AbortController>());
  // Timers of the simulated flows (location, ID check, voice input), cleared when a new one starts.
  const timers = useRef<Record<string, number>>({});

  return useMemo(() => {
    const bundle = data.bundle;
    const content = data.content;
    const fill = (template: string, params: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
    const toast = (message: string) => dispatch({ type: 'toast', message });
    const mark = markOf(bundle);
    const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
    const later = (key: string, ms: number, fn: () => void) => {
      if (timers.current[key]) window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(fn, ms);
    };
    const propertyName = bundle?.property.name ?? 'the property';

    /** A guest is asked to sign in before anything that needs an account; the action resumes after sign-in. */
    const guarded = (why: string, pending: AppState['pendingAfterAuth'], run: () => void) => () => {
      if (state.guest) dispatch({ type: 'guestGate', why, pending });
      else run();
    };

    const runTour = async (mode: 'self' | 'ar', stepFree = state.guided.stepFree) => {
      if (!bundle) return;
      const chosen = selectedNodes(state, bundle);
      const all = tourStopViews(bundle).map((v) => v.node);
      const nodes = chosen.length ? chosen : all;
      dispatch({ type: 'tourCalculating', mode });
      try {
        // The entry gate chosen on Before You Start (a real graph node: `bsp:<id>` or the tour start); the
        // dummy fallback id 'start' is not a node and is left out.
        const startId = state.startPointId && state.startPointId !== 'start' ? state.startPointId : null;
        const result = await repository.getTourRoute(nodes, { stepFree, startId });
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
        // A typed error (the API's own message, a malformed answer) is readable; a programming error is not.
        dispatch({ type: 'tourFailed', message: error instanceof TypeError || error instanceof RangeError ? 'The route could not be calculated.' : messageOf(error, 'The route could not be calculated.') });
      }
    };

    /** The record a finished tour leaves: the history entry and, after an in-person tour, the access pass. */
    const finish = () => {
      if (!bundle) return;
      const views = tourStopViews(bundle);
      const names = state.tourOrder.map((n) => views.find((v) => v.node === n)?.name ?? n);
      const now = Date.now();
      const entry: TourHistoryEntry = { id: `h-${now}`, property: bundle.property.name, date: `Today${mark}`, tags: names };
      const doors = Object.values(state.unlocked).filter(Boolean).length;
      const pass: TourPass | null =
        state.checkedIn && !state.virtualTour
          ? { id: `p-${now}`, property: bundle.property.name, date: 'Today', window: `${fmtTime(state.passStart ?? now - 20 * 60000)} – ${fmtTime(now)}`, doors: `${doors} ${doors === 1 ? 'door' : 'doors'} unlocked` }
          : null;
      dispatch({ type: 'finishTour', entry, pass });
      void success();
    };

    const openSchedule = (patch: Partial<ScheduleDraft> = {}) => {
      const booked = state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled' ? state.scheduledTour : null;
      const base: ScheduleDraft = booked
        ? { date: booked.date, time: booked.time, length: booked.length, unit: booked.unit, party: booked.party }
        : { ...state.schedule, date: state.schedule.date < dayKey(0) ? dayKey(0) : state.schedule.date };
      const draft = { ...base, ...patch };
      if (!draft.unit) draft.unit = bundle?.units.find((u) => u.showInStopsList && u.available)?.name ?? 'No preference';
      if (!draft.time || !slotsForDay(draft.date).includes(draft.time)) draft.time = slotsForDay(draft.date)[0] ?? '';
      dispatch({ type: 'openSchedule', draft });
    };

    const checkIn = () => {
      const now = Date.now();
      dispatch({ type: 'checkIn', now, accessMs: ACCESS_MINUTES * 60000 });
      dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: false });
      toast(`Checked in. Door access is active for ${ACCESS_MINUTES} min${DEMO}`);
      void success();
    };

    return {
      /** Sign in through the repository (the Pynwheel CMS credentials); the reducer moves to the profile confirmation. */
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

      confirmProfile: () => {
        const pending = state.pendingAfterAuth;
        dispatch({ type: 'confirmProfile' });
        if (pending === 'tour') toast(`Signed in. Your tours are on Home.`);
      },

      signOut: async () => {
        dispatch({ type: 'signOut' });
        try {
          await repository.logout();
        } catch {
          /* the local session is gone either way */
        }
      },

      /** Back from the "Does everything look good?" confirmation abandons the sign-in: the token is logged out too. */
      authBack: () => {
        const live = state.authStep === 'confirm' && state.signedIn;
        dispatch({ type: 'authBack' });
        if (live) void repository.logout().catch(() => undefined);
      },

      /** Guest mode never coexists with a live session: a signed-in visitor who chooses it is logged out first. */
      continueAsGuest: () => {
        const live = state.signedIn;
        dispatch({ type: 'continueAsGuest' });
        if (live) void repository.logout().catch(() => undefined);
      },
      guestSignIn: () => dispatch({ type: 'guestSignIn' }),

      /** Switch to another property (only tourable ones can be chosen); `then` opens Schedule on it once the switch succeeded. */
      selectProperty: async (propertyId: number, tourable: boolean, name: string, then: 'schedule' | null = null) => {
        if (!tourable) {
          toast(`${name} has no Self-Guided Tour yet, so it cannot be toured in the app.`);
          return false;
        }
        try {
          await repository.selectProperty(propertyId);
          dispatch({ type: 'selectProperty', propertyId, then });
          void tap();
          return true;
        } catch (error) {
          toast(messageOf(error, 'The property could not be selected.'));
          return false;
        }
      },

      /** Start Self-Tour: a guest is asked to sign in; a member schedules the self-tour (the booking is local demo data). */
      startSelfTour: guarded('schedule a self-tour', 'schedule', () => openSchedule()),
      openSchedule,
      scheduleSecondVisit: () => openSchedule({ date: dayKey(1) }),
      setSchedule: (patch: Partial<ScheduleDraft>) => dispatch({ type: 'setSchedule', patch }),
      confirmSchedule: () => {
        const d = state.schedule;
        if (!slotsForDay(d.date).includes(d.time)) {
          toast('Pick an available time');
          return;
        }
        if (slotTime(d.date, d.time) < Date.now()) {
          toast('That time has passed. Pick a later slot.');
          return;
        }
        dispatch({ type: 'confirmSchedule', tour: { id: `s-${Date.now()}`, status: 'scheduled', date: d.date, time: d.time, length: d.length, unit: d.unit, party: d.party, source: 'app', createdAt: Date.now() } });
        void success();
      },
      cancelTour: () => {
        dispatch({ type: 'cancelTour' });
        toast('Tour cancelled. You can book a new time any time.');
      },

      /** The tour card's primary action, from the card's model. */
      openCheckin: guarded('see your tours', 'tour', () => dispatch({ type: 'openCheckin', for: null })),
      openCheckinFor: (id: string | null) => dispatch({ type: 'openCheckin', for: id }),
      checkIn,
      resumeTour: () => {
        if (state.tourOrder.length && state.guided.tour) dispatch({ type: 'navigate', screen: state.screen === 'guided' ? 'guided' : 'guided' });
        else dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: false });
      },
      startVirtualTour: guarded('take a virtual tour', 'tour', () => {
        if (!bundle) {
          toast('Choose a property first.');
          return;
        }
        dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: true });
      }),
      goTourStart: () => dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: state.virtualTour }),
      setStartPoint: (id: string) => dispatch({ type: 'setStartPoint', id }),
      continueToBuild: () => {
        const all = bundle ? tourStopViews(bundle).map((v) => v.node) : null;
        dispatch({ type: 'continueToBuild', selectAll: all });
      },
      extendAccess: () => {
        dispatch({ type: 'extendAccess', ms: EXTEND_MINUTES * 60000 });
        toast(`Access extended by ${EXTEND_MINUTES} min${DEMO}`);
      },
      endTour: () => finish(),
      runningLate: () => {
        dispatch({ type: 'closeOverlay', overlay: 'checkin' });
        toast(`We've let the leasing team know you're running late${DEMO}`);
      },
      addToCalendar: () => {
        dispatch({ type: 'closeOverlay', overlay: 'checkin' });
        toast(`Added to your calendar${DEMO}`);
      },
      getDirections: () => toast(`Opening Maps to ${bundle?.property.address ?? 'the property'}${DEMO}`),

      // ── identity check (simulated) ──
      openVerify: (then: 'start' | null = null) => dispatch({ type: 'openVerify', then }),
      verifyNext: () => {
        if (!state.verify.consent) {
          toast('Please agree to the self-tour terms');
          return;
        }
        dispatch({ type: 'verifyStep', step: 'scan' });
      },
      simulateCapture: (next: VerifyStep) => {
        if (state.verify.scanning) return;
        dispatch({ type: 'verifyScanning', on: true });
        later('verify', 1200, () => {
          if (next === 'done') dispatch({ type: 'verified' });
          else dispatch({ type: 'verifyStep', step: next });
        });
      },
      saveCard: () => dispatch({ type: 'verified' }),
      verifyBack: () => {
        const order: VerifyStep[] = ['intro', 'scan', 'selfie', 'card', 'done'];
        const st = state.verify.step;
        if (st === 'intro' || st === 'done') {
          dispatch({ type: 'navigate', screen: 'home' });
          return;
        }
        let i = order.indexOf(st) - 1;
        if (order[i] === 'card' && !state.requireCard) i -= 1;
        dispatch({ type: 'verifyStep', step: order[Math.max(0, i)] });
      },
      verifyFinish: () => {
        if (state.verify.then === 'start') {
          dispatch({ type: 'verifyFinish' });
          checkIn();
        } else dispatch({ type: 'verifyFinish' });
      },

      // ── location (simulated: the app has no geolocation plugin in this phase) ──
      locAsk: (sheet: 'ask' | 'pick' | 'manage' = 'ask') => dispatch({ type: 'locAsk', sheet }),
      locAllow: () => {
        const then = state.location.sheet;
        dispatch({ type: 'locLocating' });
        later('loc', 1500, () => {
          dispatch({ type: 'locLocated' });
          if (then === 'pick') {
            dispatch({ type: 'guestFound', via: 'near' });
            toast(`${propertyName} found${DEMO}`);
          }
        });
      },
      locRefresh: () => {
        dispatch({ type: 'locLocating' });
        later('loc', 1500, () => {
          dispatch({ type: 'locLocated' });
          toast(`Location updated${DEMO}`);
        });
      },
      locDeny: () => dispatch({ type: 'locDeny' }),
      locOpenSettings: () => toast(`Opening Settings · Pynwheel · Location${DEMO}`),
      atProperty: () => {
        if (state.location.perm === 'on') {
          dispatch({ type: 'guestFound', via: 'near' });
          toast(`${propertyName} found${DEMO}`);
        } else dispatch({ type: 'locAsk', sheet: 'pick' });
      },
      openQr: (mode: 'property' | 'checkin' = 'property') => dispatch({ type: 'qrOpen', mode }),
      qrFound: () => {
        const mode = state.qrMode;
        dispatch({ type: 'closeOverlay', overlay: 'qr' });
        if (mode === 'checkin') checkIn();
        else {
          dispatch({ type: 'guestFound', via: 'qr' });
          toast(`${propertyName} found${DEMO}`);
        }
      },
      openLink: () => dispatch({ type: 'linkStep', step: 'enter' }),
      linkFound: () => {
        dispatch({ type: 'closeOverlay', overlay: 'link' });
        dispatch({ type: 'guestFound', via: 'link' });
        toast(`${propertyName} found${DEMO}`);
      },

      // ── the tour ──
      generateRoute: () => runTour('self'),
      launchArTour: () => runTour('ar'),
      /** Avoid stairs: the real tour route is recalculated step-free (and back). */
      toggleStepFree: async () => {
        if (!bundle) return;
        const next = !state.guided.stepFree;
        dispatch({ type: 'guidedStepFree', on: next });
        if (!state.tourOrder.length) return;
        try {
          const result = await repository.getTourRoute(state.tourOrder, { stepFree: next });
          // Only a route that still reaches every stop replaces the current one: a shorter list would drop
          // stops (and the visitor's place in the tour) silently.
          const reachesAll = result.ok && result.tour.segments.length === state.tourOrder.length && state.tourOrder.every((node) => result.tour.segments.some((s) => s.node === node));
          if (result.ok && reachesAll) dispatch({ type: 'tourUpdated', tour: result.tour, order: result.tour.segments.map((s) => s.node) });
          else {
            dispatch({ type: 'guidedStepFree', on: !next });
            toast(result.ok ? 'No step-free route reaches every stop.' : result.error.message);
          }
        } catch (error) {
          dispatch({ type: 'guidedStepFree', on: !next });
          toast(messageOf(error, 'The route could not be recalculated.'));
        }
      },

      arrive: () => dispatch({ type: 'arrive', now: Date.now() }),

      nextStop: () => {
        if (!bundle) return;
        const last = state.stopIndex + 1 >= state.tourOrder.length;
        if (last && (state.virtualTour || state.tourMode === 'ar')) finish();
        else dispatch({ type: 'nextStop' });
        void tap();
      },

      finishTour: finish,

      skipStop: () => {
        if (!bundle || !state.skipReason) return;
        const node = state.tourOrder[state.stopIndex];
        const stop = currentStop(state, bundle);
        const reason = state.skipReason;
        const last = state.stopIndex + 1 >= state.tourOrder.length;
        toast(`${stop?.name ?? 'Stop'} skipped${reason === 'lock' ? ` — we let the leasing team know${DEMO}` : ''}`);
        if (last && (state.virtualTour || state.tourMode === 'ar')) {
          dispatch({ type: 'skipStop', node, reason });
          finish();
        } else dispatch({ type: 'skipStop', node, reason });
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
            if (controller.signal.aborted) {
              // Cancelled while the key was being fetched: clear the "Getting your key…" status,
              // or the stop stays loading with a Cancel button that no longer does anything.
              dispatch({ type: 'lockPinDismiss' });
              return;
            }
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

      /** The demo slider / "code entered" of a stop without a smart lock in the CMS: nothing is sent anywhere. */
      demoUnlock: (node: string) => {
        dispatch({ type: 'demoUnlock', node });
        void success();
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

      // ── the concierge and the leasing team ──
      openAiChat: (context: 'stop' | 'general') => {
        if (!bundle || !content) {
          dispatch({ type: 'openAiChat', context: 'general', greeting: CONCIERGE_GREETING_GUEST });
          return;
        }
        const stop = currentStop(state, bundle);
        const params = { stop: stop?.name ?? 'this stop', property: bundle.property.name };
        const greeting = fill(context === 'stop' ? content.concierge.greetingStop : content.concierge.greetingGeneral, params);
        dispatch({ type: 'openAiChat', context, greeting });
      },
      chatWithAgent: () => {
        const first = (state.profileEdits.first ?? state.user?.name.split(' ')[0] ?? '').trim();
        const greet = `Hi${first ? ` ${first}` : ''}, this is Maya from the ${propertyName} leasing team. I can see your chat so far. How can I help?${DEMO}`;
        if (state.overlays.includes('aiChat')) dispatch({ type: 'aiMode', mode: 'agent', text: greet });
        else dispatch({ type: 'openAiChat', context: 'general', greeting: greet, mode: 'agent' });
      },
      chatBackToAi: () => dispatch({ type: 'aiMode', mode: 'ai', text: "You're back with the AI assistant. What else can I help with?" }),
      toggleMic: () => {
        if (state.ai.listening) {
          if (timers.current.mic) window.clearTimeout(timers.current.mic);
          dispatch({ type: 'aiListening', on: false });
          return;
        }
        dispatch({ type: 'aiListening', on: true });
        const stop = bundle ? currentStop(state, bundle) : null;
        const sample = state.ai.context === 'stop' ? (stop?.kind === 'unit' ? 'What is the total move-in cost?' : 'Is it included in rent?') : 'Is parking included?';
        later('mic', 1600, () => dispatch({ type: 'aiListening', on: false, input: sample }));
      },

      askAi: async (text?: string) => {
        const question = (text ?? state.ai.input).trim();
        if (!question) return;
        dispatch({ type: 'aiAsk', question });
        if (!bundle) {
          later('guestAi', 700, () => dispatch({ type: 'aiReply', text: CONCIERGE_GREETING_GUEST }));
          return;
        }
        if (state.ai.mode === 'agent') {
          later('agent', 850, () => dispatch({ type: 'aiReply', text: `Thanks! Give me a moment and I'll check that for you.${DEMO}` }));
          return;
        }
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

      callLeasing: () => {
        dispatch({ type: 'closeOverlay', overlay: 'call' });
        toast(`Calling ${propertyName} leasing · ${LEASING_PHONE}${DEMO}`);
      },
      emailLeasing: () => toast(`Opening email to ${LEASING_EMAIL}${DEMO}`),
      reportIssue: (label: string) => {
        dispatch({ type: 'closeOverlay', overlay: 'report' });
        toast(`Thanks. The leasing team has been notified.${DEMO}`);
        void label;
      },
      call911: () => {
        dispatch({ type: 'closeOverlay', overlay: 'sos' });
        toast(`Calling 911…${DEMO}`);
      },
      shareLocation: () => {
        dispatch({ type: 'closeOverlay', overlay: 'sos' });
        toast(`Live location shared with the leasing team${DEMO}`);
      },

      // ── booking a live tour (the repository decides whether the backend offers it) ──
      openBook: guarded('book a live tour', 'book', () => {
        if (!bundle || !content) return;
        const unit = bundle.units.find((u) => u.showInStopsList && u.available)?.name ?? `No preference${mark}`;
        dispatch({ type: 'openBook', day: content.booking.days[0] ?? '', time: content.booking.times[2] ?? content.booking.times[0] ?? '', unit });
      }),

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

      // ── applying ──
      openApply: (unitNode?: string) => {
        if (!bundle) return;
        const unit = unitNode ?? bestMatchUnit(state, bundle)?.node ?? null;
        if (!unit) return;
        dispatch({ type: 'openApply', unit });
      },
      /** Step one of the design's apply sheet: the unit is held locally while the application starts. */
      applyStartHold: () => dispatch({ type: 'applyStep', step: 'hold' }),
      applyBack: () => dispatch({ type: 'applyStep', step: 'details' }),
      submitApplication: async () => {
        if (!bundle || !state.applyUnit) return;
        const unit = bundle.units.find((u) => u.node === state.applyUnit);
        dispatch({ type: 'applySubmitting' });
        try {
          await repository.startApplication(state.applyUnit);
          dispatch({ type: 'applyDone', message: `Application started for ${unit?.name ?? 'your unit'} — check your email to finish.${mark}` });
          void success();
        } catch (error) {
          dispatch({ type: 'applyFailed', message: error instanceof FeatureUnavailableError ? error.message : `The application could not be started. Please try again.${mark}` });
        }
      },
      holdUnit: (node: string) => {
        const unit = bundle?.units.find((u) => u.node === node);
        dispatch({ type: 'holdUnit', node });
        toast(`${unit?.name ?? 'Unit'} is held for ${HOLD_HOURS} hours${DEMO}`);
      },

      // ── stop extras (local) ──
      toggleFavourite: (node: string) => {
        const on = !state.favourites[node];
        dispatch({ type: 'toggleFavourite', node });
        toast(on ? 'Saved to favourites' : 'Removed from favourites');
      },
      addPhoto: (node: string) => {
        const stop = bundle ? tourStopViews(bundle).find((v) => v.node === node) : null;
        dispatch({ type: 'addPhoto', node });
        toast(`Photo added to ${stop?.name ?? 'this stop'}${DEMO}`);
      },

      // ── the summary ──
      shareSummary: () => {
        const email = state.profileEdits.email ?? state.user?.email ?? content?.visitor.email ?? 'you';
        toast(`Summary emailed to ${email}${DEMO}`);
      },
      sendShare: (name: string, contact: string) => toast(`Summary sent to ${name.trim() || contact.trim()}${DEMO}`),
      tourSister: (name: string) => toast(`${name} added. Leasing will text you open self-tour times.${DEMO}`),

      listingTap: (name: string) => toast(`${name} has no Self-Guided Tour yet.`),

      toast
    };
  }, [state, dispatch, data, repository]);
};
