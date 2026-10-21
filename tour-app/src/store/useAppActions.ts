import { useMemo, useRef } from 'react';
import { CONCIERGE_GREETING_GUEST } from '~/content/appCopy';
import { ACCESS_MINUTES, DEMO, EXTEND_MINUTES, HOLD_HOURS, LEASING_EMAIL } from '~/content/demoFixtures';
import type { AccessMethod } from '~/models';
import { guidedSlots, guidedToursOffered } from './access';
import { levelOfStop } from './views';
import type { TourHistoryEntry } from '~/models';
import { ApiError } from '~/repositories/pynwheelApi/apiClient';
import { useRepository } from '~/repositories/repositoryContext';
import { FeatureUnavailableError } from '~/repositories/tourRepository';
import { BluetoothUnlockError, unlockOverBluetooth } from '~/services/iglooBle';
import { success, tap } from '~/services/native';
import { useApp } from './appContext';
import type { AppState, ScheduleDraft, TourPass, VerifyStep } from './appState';
import { dayKey } from './appState';
import { fmtTime, slotTime } from './scenarios';
import { bestMatchUnit, currentStop, markOf, selectedNodes, tourStopViews } from './selectors';
import { profileOf, slotByLabel, slotsForDay } from './views';

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
      const views = tourStopViews(bundle);
      const nameOf = (node: string) => views.find((v) => v.node === node)?.name.replace(/ \*$/, '') ?? node;
      const chosen = selectedNodes(state, bundle);
      const all = views.map((v) => v.node);
      const wanted = chosen.length ? chosen : all;
      // A stop the CMS has not plotted (or not joined to a path) cannot be routed to: it is left out and named, never faked.
      const unmapped = wanted.filter((node) => (views.find((v) => v.node === node)?.unit ?? views.find((v) => v.node === node)?.amenity)?.routable === false);
      const nodes = wanted.filter((node) => !unmapped.includes(node));
      if (!nodes.length) {
        dispatch({ type: 'tourFailed', message: unmapped.length ? `${unmapped.map(nameOf).join(', ')} ${unmapped.length === 1 ? 'is' : 'are'} not on the map yet, so no route can reach ${unmapped.length === 1 ? 'it' : 'them'}.` : 'Choose at least one stop.' });
        return;
      }
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
        // Stops the route could not reach (no path, no floor link) and stops not on the map are reported, not silently dropped.
        const leftOut = [...nodes.filter((node) => !order.includes(node)), ...unmapped];
        if (leftOut.length) toast(`${leftOut.length === 1 ? 'One stop was' : `${leftOut.length} stops were`} left out of the route: ${leftOut.map(nameOf).join(', ')}${result.tour.route.warnings[0] ? ` — ${result.tour.route.warnings[0]}` : ''}`);
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

    /**
     * The property's booking rules and the next week's slots, from the
     * repository (the CMS is authoritative). Kept for five minutes; `force`
     * reads them again (after a refused booking, or on Retry).
     */
    const loadBooking = async (force = false) => {
      const propertyId = repository.currentPropertyId() ?? state.propertyId;
      if (!propertyId) return;
      const fresh = state.booking.propertyId === propertyId && state.booking.status === 'ready' && Date.now() - state.booking.fetchedAt < 5 * 60000;
      if (fresh && !force) return;
      if (state.booking.status === 'loading' && state.booking.propertyId === propertyId && !force) return;
      dispatch({ type: 'bookingLoading', propertyId });
      try {
        const [settings, window] = await Promise.all([repository.getBookingSettings(), repository.getAvailability(dayKey(0), 7)]);
        dispatch({ type: 'bookingLoaded', propertyId, settings, days: window.days, now: Date.now() });
      } catch (error) {
        dispatch({ type: 'bookingFailed', message: messageOf(error, 'The booking calendar could not be loaded.') });
      }
    };

    const openSchedule = (patch: Partial<ScheduleDraft> = {}) => {
      const booked = state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled' ? state.scheduledTour : null;
      const profile = profileOf(state, content);
      const base: ScheduleDraft = booked
        ? { ...state.schedule, date: booked.date, time: booked.time, length: booked.length, unit: booked.unit, party: booked.party }
        : { ...state.schedule, date: state.schedule.date < dayKey(0) ? dayKey(0) : state.schedule.date };
      const draft = { ...base, ...patch };
      if (!draft.first) draft.first = profile.first;
      if (!draft.last) draft.last = profile.last;
      if (!draft.phone) draft.phone = profile.phone;
      if (!draft.unit) draft.unit = bundle?.units.find((u) => u.showInStopsList && u.available)?.name ?? 'No preference';
      if (!draft.time || !slotsForDay(state.booking, draft.date).includes(draft.time)) draft.time = slotsForDay(state.booking, draft.date)[0] ?? '';
      dispatch({ type: 'openSchedule', draft });
      void loadBooking();
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
      loadBooking,
      /** Books the self-tour through the repository: the CMS checks the slot, the visitor and the rules, and keeps the booking. */
      confirmSchedule: async () => {
        const d = state.schedule;
        if (state.booking.saving) return;
        const slot = slotByLabel(state.booking, d.date, d.time);
        if (!slot) {
          toast('Pick an available time');
          return;
        }
        if (slotTime(d.date, d.time) < Date.now()) {
          toast('That time has passed. Pick a later slot.');
          return;
        }
        const profile = profileOf(state, content);
        const first = (d.first || profile.first).trim();
        const last = (d.last || profile.last).trim();
        const phone = (d.phone || profile.phone).trim();
        const email = profile.email.trim();
        if (!first || !last || !phone || !email) {
          toast('Add your name, phone and email to book.');
          return;
        }
        dispatch({ type: 'bookingSaving' });
        try {
          const result = await repository.requestBooking({
            date: d.date,
            time: slot.time,
            tourType: 'self_tour',
            firstName: first,
            lastName: last,
            email,
            phone,
            desiredUnit: d.unit && d.unit !== 'No preference' ? d.unit : undefined,
            lengthMinutes: d.length,
            partySize: d.party,
            desiredBedroom: state.booking.settings?.form.showDesiredBedroom && d.bedroom ? d.bedroom : undefined,
            desiredMoveInDate: state.booking.settings?.form.showDesiredMoveInDate && d.moveIn ? d.moveIn : undefined
          });
          if (d.first && d.first !== profile.first) dispatch({ type: 'setProfileField', field: 'first', value: d.first });
          if (d.last && d.last !== profile.last) dispatch({ type: 'setProfileField', field: 'last', value: d.last });
          if (d.phone && d.phone !== profile.phone) dispatch({ type: 'setProfileField', field: 'phone', value: d.phone });
          dispatch({
            type: 'confirmSchedule',
            tour: { id: result.id, status: 'scheduled', date: result.date || d.date, time: result.timeLabel || d.time, length: d.length, unit: d.unit, party: d.party, source: 'app', createdAt: Date.now(), tourType: result.tourType, endTime: result.endTime }
          });
          toast(result.rescheduled ? 'Your earlier booking was moved to this time.' : 'Self-tour booked. The property has your details.');
          void success();
        } catch (error) {
          const message = messageOf(error, 'The booking could not be made. Please try again.');
          dispatch({ type: 'bookingSaveFailed', message });
          toast(message);
          // A refused slot means the calendar moved: read it again so the screen shows what is left.
          if (error instanceof ApiError && (error.code === 'slot_unavailable' || error.code === 'slot_full')) void loadBooking(true);
        }
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
        if (!bundle || state.guided.rerouting) return;
        const next = !state.guided.stepFree;
        dispatch({ type: 'guidedStepFree', on: next });
        if (!state.tourOrder.length) return;
        dispatch({ type: 'guidedRerouting', on: true });
        try {
          const startId = state.startPointId && state.startPointId !== 'start' ? state.startPointId : null;
          const result = await repository.getTourRoute(state.tourOrder, { stepFree: next, startId });
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
        } finally {
          dispatch({ type: 'guidedRerouting', on: false });
        }
      },

      /** "On map" from a stop: the guided map on the stop's own floor, centred on it. */
      locateStop: (node: string) => {
        if (!bundle) return;
        const at = levelOfStop(bundle, node);
        dispatch({ type: 'locateStop', node, view: at ? { level: at.level, floor: at.floor } : null });
      },

      /** The design's Demo · Method switch: demo data only; a real lock keeps the method the CMS configured. */
      setDemoMethod: (node: string, method: AccessMethod) => {
        if (!bundle?.demo) return;
        dispatch({ type: 'setDemoMethod', node, method });
      },

      /** "I've entered the code": the visitor's confirmation, recorded on the phone; the door's state is not claimed. */
      codeEntered: (node: string) => dispatch({ type: 'codeEntered', node }),

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
          dispatch({ type: 'lockPinFailed', node, propertyId, message: messageOf(error, 'The lock could not be opened. Please try again.'), code: error instanceof BluetoothUnlockError ? error.code : null });
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

      /** Call leasing: the property's own number from the CMS, dialled by the phone; nothing on a property without one. */
      callLeasing: () => {
        dispatch({ type: 'closeOverlay', overlay: 'call' });
        const phone = bundle?.property.phone ?? null;
        if (!phone) {
          toast('This property has no leasing phone number in Pynwheel yet.');
          return;
        }
        if (bundle?.demo) {
          toast(`Calling ${propertyName} leasing · ${phone}`);
          return;
        }
        const digits = phone.replace(/[^\d+]/g, '');
        try {
          window.open(`tel:${digits}`, '_self');
        } catch {
          /* the web view may refuse; the number is on screen */
        }
        toast(`Calling ${propertyName} leasing · ${phone}`);
      },
      emailLeasing: () => {
        const email = bundle?.property.email ?? null;
        if (email && !bundle?.demo) {
          try {
            window.open(`mailto:${email}`, '_self');
          } catch {
            /* the address is shown in the toast */
          }
          toast(`Opening email to ${email}`);
        } else toast(`Opening email to ${email ?? LEASING_EMAIL}${DEMO}`);
      },
      /** Report an issue: the CMS has no endpoint for reports yet, so the choice is kept on the phone and the toast says so. */
      reportIssue: (label: string) => {
        dispatch({ type: 'closeOverlay', overlay: 'report' });
        toast(`Noted: ${label}. Reports are not sent to the office in this build — call or chat for help now.`);
      },
      call911: () => {
        dispatch({ type: 'closeOverlay', overlay: 'sos' });
        toast(`Calling 911…${DEMO}`);
      },
      shareLocation: () => {
        dispatch({ type: 'closeOverlay', overlay: 'sos' });
        toast(`Live location shared with the leasing team${DEMO}`);
      },

      // ── booking a live tour: the property's agent-guided calendar, the same CMS rules and endpoint as the self-tour ──
      openBook: guarded('book a live tour', 'book', () => {
        if (!bundle || !content) return;
        const unit = bundle.units.find((u) => u.showInStopsList && u.available)?.name ?? 'No preference';
        // The first day with an agent-guided time still open, from the calendar already loaded (the sheet reloads it).
        const days = Object.keys(state.booking.days).sort();
        const day = days.find((key) => guidedSlots(state.booking, key).length > 0) ?? days[0] ?? dayKey(0);
        const time = guidedSlots(state.booking, day)[0]?.label ?? '';
        dispatch({ type: 'openBook', day, time, unit });
        void loadBooking();
      }),

      submitBooking: async () => {
        if (!content) return;
        if (!guidedToursOffered(state.booking.settings)) {
          toast('This property does not offer agent-guided tours.');
          return;
        }
        const slots = guidedSlots(state.booking, state.book.day);
        const slot = slots.find((s) => s.label === state.book.time) ?? slots[0] ?? null;
        if (!slot) {
          toast('Pick a day with an open guided-tour time.');
          return;
        }
        const profile = profileOf(state, content);
        if (!profile.first || !profile.email) {
          toast('Add your name and email in your profile to book.');
          return;
        }
        dispatch({ type: 'bookSubmitting' });
        try {
          const result = await repository.requestBooking({
            date: state.book.day,
            time: slot.time,
            tourType: 'guided_tour',
            firstName: profile.first,
            lastName: profile.last,
            email: profile.email,
            phone: profile.phone,
            desiredUnit: state.book.unit && state.book.unit !== 'No preference' ? state.book.unit.replace(/ \*$/, '') : undefined
          });
          dispatch({ type: 'setBook', field: 'time', value: slot.label });
          dispatch({ type: 'bookDone' });
          // The CMS keeps one upcoming booking per visitor: a self-tour booked earlier is moved to this time, and the card must say so.
          if (result.rescheduled) {
            toast('Your earlier booking was moved to this live tour.');
            if (state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled') {
              dispatch({ type: 'confirmSchedule', tour: { ...state.scheduledTour, id: result.id, date: result.date || state.book.day, time: result.timeLabel || slot.label, tourType: result.tourType, endTime: result.endTime, createdAt: Date.now() } });
            }
          }
          void success();
          // The calendar moved: the next read shows what is left.
          void loadBooking(true);
        } catch (error) {
          dispatch({ type: 'toast', message: error instanceof FeatureUnavailableError || error instanceof ApiError ? error.message : `The request could not be sent. Please try again.${mark}` });
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
      /** A reference photo the visitor took: kept on this phone for the tour, never uploaded. */
      addPhoto: (node: string, dataUrl: string | null) => {
        const stop = bundle ? tourStopViews(bundle).find((v) => v.node === node) : null;
        if (!dataUrl) {
          toast('That photo could not be read.');
          return;
        }
        dispatch({ type: 'addPhoto', node, dataUrl });
        toast(`Photo added to ${stop?.name ?? 'this stop'} · stays on this phone`);
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
