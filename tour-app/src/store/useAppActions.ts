import { useMemo, useRef } from 'react';
import { acquireFix, requestPermission, type Fix, type LocationAccess } from '~/services/location';
import { PROXIMITIES } from '~/repositories/tourRepository';
import { CONCIERGE_GREETING_GUEST } from '~/content/appCopy';
import { ACCESS_MINUTES, DEMO, EXTEND_MINUTES, HOLD_HOURS, LEASING_EMAIL } from '~/content/demoFixtures';
import type { AccessMethod } from '~/models';
import { guidedSlots, guidedToursOffered } from './access';
import { levelOfStop } from './views';
import type { TourHistoryEntry } from '~/models';
import { ApiError, isRetryable } from '~/repositories/pynwheelApi/apiClient';
import { useRepository } from '~/repositories/repositoryContext';
import { FeatureUnavailableError, type VisitorBooking } from '~/repositories/tourRepository';
import { BluetoothUnlockError, unlockOverBluetooth } from '~/services/iglooBle';
import { success, tap } from '~/services/native';
import { uuid, visitQueue, type VisitEventKind } from '~/services/visitQueue';
import { useApp } from './appContext';
import type { AppState, ScheduleDraft, ScheduledTour, TourPass, VerifyStep, VisitState } from './appState';
import type { CheckinRefusal } from './appState';
import { fmtTime } from './scenarios';
import { dayKeyInZone, zonedSlotMs } from './zone';
import { bestMatchUnit, currentStop, markOf, selectedNodes, tourStopViews } from './selectors';
import { bookingRequestFor, profileOf, propertyZone, scheduleDay, slotByLabel, slotsForDay } from './views';
import { accessEndsAtMs, syncVisit, visitRecording } from './visitSync';

/** A photo larger than this (as a data URL) is not uploaded; a note with the caption goes instead. */
const MAX_PHOTO_CHARS = 4 * 1024 * 1024;
const MAX_NOTE_CHARS = 2000;

/** The CMS booking id behind a `BookingResult.id` (the dummy provider's `bk-…` ids are not one). */
const bookingIdOf = (id: string): number | null => (/^\d+$/.test(id) ? Number(id) : null);

/** The CMS booking as the Home card shows it (the booking's own time; the app's length / party defaults). */
export const tourFromBooking = (b: VisitorBooking, now: number): ScheduledTour => ({
  id: String(b.id),
  status: b.status === 'cancelled' ? 'cancelled' : b.status === 'completed' ? 'past' : b.status === 'missed' ? 'missed' : 'scheduled',
  date: b.date ?? dayKeyInZone(now, b.timeZone),
  time: b.timeLabel ?? '',
  length: 45,
  unit: 'No preference',
  party: 1,
  source: b.createdBy === 'tour_app' ? 'app' : 'website',
  createdAt: now,
  tourType: b.tourType ?? undefined,
  endTime: b.endTime,
  bookingId: b.id,
  visitorId: null,
  bookedAtMs: b.bookedAt ? Date.parse(b.bookedAt) || null : null,
  timeZone: b.timeZone
});

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
    const session = repository.currentSession();
    const isVisitor = state.user?.kind === 'visitor' || session?.kind === 'visitor';

    // ── visit recording (the CMS's Visitors) ──
    // Only a real property on the real provider, with the server feature on and no forced demo scenario, is ever recorded.
    const recordingAllowed = repository.source === 'pynwheel-api' && !!bundle && !bundle.demo && state.capabilities.visits && state.demo.tour === 'auto' && state.demo.location === 'auto';
    const sync = (visit: VisitState | null = state.visit) => syncVisit({ repository, dispatch }, visit);
    /** Appends a lifecycle event to the outbox and tries to send it; nothing happens without a recorded visit. */
    const record = (kind: VisitEventKind, stopId: string | null, payload?: Record<string, unknown>) => {
      const visit = state.visit;
      if (!recordingAllowed || !visitRecording(visit) || visit.propertyId !== state.propertyId) return;
      if (kind !== 'heartbeat' && !stopId) return;
      void visitQueue
        .append({ clientVisitId: visit.clientVisitId, propertyId: visit.propertyId, kind, stopId, ...(payload ? { payload } : {}) })
        .then(() => sync(visit))
        .catch(() => undefined);
    };
    const lockProviderOf = (node: string): string => (bundle ? (tourStopViews(bundle).find((v) => v.node === node)?.lock?.provider ?? 'unknown') : 'unknown');
    const currentNode = (): string | null => state.tourOrder[state.stopIndex] ?? null;
    /** The visitor's bookings the CMS holds: the next one at the chosen property becomes the Home card. */
    const adoptBookings = (bookings: VisitorBooking[], propertyId: number | null) => {
      if (propertyId == null) return;
      const now = Date.now();
      const next = bookings.find((b) => b.propertyId === propertyId && b.status === 'upcoming') ?? null;
      if (next) dispatch({ type: 'adoptBooking', tour: tourFromBooking(next, now) });
    };

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
      // The booking is completed only when the CMS linked this visit to it (checked in inside its window): a virtual
      // tour, a demo tour or a phone-only tour never completes a booking the CMS still holds as upcoming (October 25, 2026).
      const bookingCompleted = !state.virtualTour && visitRecording(state.visit) && state.visit.bookingId != null && state.scheduledTour?.bookingId === state.visit.bookingId;
      dispatch({ type: 'finishTour', entry, pass, bookingCompleted });
      void success();
      // The CMS's visit ends once the outbox is through; the sync retries later if the phone is offline now.
      if (visitRecording(state.visit)) {
        const end = { endedAt: new Date(now).toISOString(), reason: 'completed' as const, abandonedAtStop: null };
        dispatch({ type: 'visitEnding', clientVisitId: state.visit.clientVisitId, end });
        void sync({ ...state.visit, status: 'ended', end });
      }
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
        // The rules first: the week of slots starts on the property's today, which is not always the phone's (October 25, 2026).
        const settings = await repository.getBookingSettings();
        const window = await repository.getAvailability(dayKeyInZone(Date.now(), settings.timeZone), 7);
        dispatch({ type: 'bookingLoaded', propertyId, settings, days: window.days, now: Date.now() });
      } catch (error) {
        dispatch({ type: 'bookingFailed', message: messageOf(error, 'The booking calendar could not be loaded.') });
      }
    };

    const openSchedule = (patch: Partial<ScheduleDraft> = {}) => {
      const booked = state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled' && state.scheduledTour.status !== 'missed' ? state.scheduledTour : null;
      const profile = profileOf(state, content);
      // The day is the property's calendar day (October 28, 2026): its today until the visitor picks one, and
      // unknown ('') until the property's rules are loaded, when `bookingLoaded` anchors it.
      const base: ScheduleDraft = booked
        ? { ...state.schedule, date: booked.date, time: booked.time, length: booked.length, unit: booked.unit, party: booked.party }
        : { ...state.schedule, date: scheduleDay(state.schedule.date, propertyZone(state)) };
      const draft = { ...base, ...patch };
      if (!draft.first) draft.first = profile.first;
      if (!draft.last) draft.last = profile.last;
      if (!draft.phone) draft.phone = profile.phone;
      if (!draft.unit) draft.unit = bundle?.units.find((u) => u.showInStopsList && u.available)?.name ?? 'No preference';
      if (!draft.time || !slotsForDay(state.booking, draft.date).includes(draft.time)) draft.time = slotsForDay(state.booking, draft.date)[0] ?? '';
      dispatch({ type: 'openSchedule', draft });
      void loadBooking();
    };

    /** The phone-only check-in of the design: a simulated window, marked as such. */
    /** The reading sent with a recorded check-in: asks the phone when it was never asked, waits for a fix when it may. */
    const fixForCheckIn = async (): Promise<Fix | null> => {
      let access = state.location.access;
      if (access === 'prompt') {
        dispatch({ type: 'locLocating' });
        access = await requestPermission();
        dispatch({ type: 'locAccess', access });
      }
      if (access !== 'granted' && access !== 'coarse') {
        dispatch({ type: 'locFailed', reason: access === 'prompt' || access === 'unavailable' ? 'unavailable' : access });
        return null;
      }
      dispatch({ type: 'locLocating' });
      const result = await acquireFix();
      if (result.ok) {
        dispatch({ type: 'locFix', fix: result.fix });
        return result.fix;
      }
      dispatch({ type: 'locFailed', reason: result.failure.reason });
      return result.failure.bestEffort ?? null;
    };

    const refusalOf = (error: ApiError): CheckinRefusal => {
      const details = (error.details ?? {}) as { proximity?: unknown; distance_m?: unknown };
      return {
        code: error.code === 'outside_property' ? 'outside_property' : 'location_unverified',
        message: error.message,
        proximity: PROXIMITIES.find((p) => p === details.proximity) ?? null,
        distanceM: typeof details.distance_m === 'number' ? details.distance_m : null
      };
    };

    /** A phone clock more than five minutes off the server's is worth a word: the server clamps what the app reports. */
    const warnClockSkew = (serverTime: string | null) => {
      const server = serverTime ? Date.parse(serverTime) : NaN;
      if (!Number.isFinite(server)) return;
      const minutes = Math.round(Math.abs(server - Date.now()) / 60000);
      if (minutes > 5) toast(`Your phone's clock is about ${minutes} min off. Tour times follow the property's clock.`);
    };

    const checkInLocally = (now: number, visit: VisitState | null = null) => {
      dispatch({ type: 'checkIn', now, accessMs: ACCESS_MINUTES * 60000, visit });
      dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: false });
      toast(`Checked in. Door access is active for ${ACCESS_MINUTES} min${DEMO}`);
      void success();
    };

    /**
     * Check-in. On a real property with visit recording on, the CMS records the
     * visit (`POST /visits`) and its access window is the one shown; the CMS's
     * refusal (outside the booking's window, not at the property, …) keeps the
     * visitor where they are with the reason. Offline, the check-in is kept on
     * the phone with its `clientVisitId` and sent as soon as the phone is back.
     * A staff session tours on behalf of the booking's visitor; without one the
     * check-in stays on the phone as before.
     */
    const checkIn = async () => {
      const now = Date.now();
      const booked = state.scheduledTour && state.scheduledTour.status !== 'past' && state.scheduledTour.status !== 'cancelled' ? state.scheduledTour : null;
      const tourUserId = isVisitor ? null : (booked?.visitorId ?? null);
      if (!recordingAllowed || state.propertyId == null || (!isVisitor && tourUserId == null)) {
        checkInLocally(now);
        return;
      }
      // A visit left unfinished (the app died before the end was sent) is given one last chance, then forgotten.
      if (state.visit && state.visit.propertyId === state.propertyId && state.visit.end) await sync(state.visit).catch(() => undefined);
      const visit: VisitState = {
        clientVisitId: uuid(),
        propertyId: state.propertyId,
        id: null,
        status: 'active',
        tourType: booked?.tourType === 'guided_tour' ? 'guided_tour' : 'self_tour',
        startedAt: new Date(now).toISOString(),
        bookingId: booked?.bookingId ?? null,
        tourUserId,
        end: null
      };
      // The phone's reading goes with the check-in; the server judges it. A reading too coarse to be sure is still sent
      // with its accuracy (the server may still place it inside, or say what it needs); a refusal keeps the visitor here.
      const fix = await fixForCheckIn();
      try {
        const record = await repository.startVisit({
          clientVisitId: visit.clientVisitId, bookingId: visit.bookingId, tourType: visit.tourType, startedAt: visit.startedAt, tourUserId,
          ...(fix ? { latitude: fix.lat, longitude: fix.lng, accuracyM: fix.accuracyM, fixAt: fix.fixAt } : {})
        });
        const endsAt = accessEndsAtMs(record.accessEndsAt);
        const accessMs = endsAt != null && endsAt > now ? endsAt - now : ACCESS_MINUTES * 60000;
        dispatch({ type: 'checkIn', now, accessMs, visit: { ...visit, id: record.id, proximity: record.proximity } });
        dispatch({ type: 'verificationRequired', propertyId: visit.propertyId, required: record.verificationRequired });
        dispatch({ type: 'goTourStart', startPointId: state.startPointId, virtual: false });
        const minutes = Math.max(1, Math.round(accessMs / 60000));
        toast(record.verificationRequired ? `Checked in. Door access is active for ${minutes} min once your ID is verified.` : `Checked in. Door access is active for ${minutes} min.`);
        warnClockSkew(record.serverTime);
        void success();
      } catch (error) {
        if (error instanceof ApiError && (error.code === 'outside_property' || error.code === 'location_unverified')) {
          dispatch({ type: 'checkinRefused', refusal: refusalOf(error) });
          return;
        }
        if (error instanceof ApiError && error.status === 404 && error.code === 'disabled') {
          // The server switched visit recording off: back to the phone-only check-in, and the UI stops asking.
          dispatch({ type: 'setCapabilities', capabilities: { ...state.capabilities, visits: false } });
          checkInLocally(now);
          return;
        }
        if (isRetryable(error)) {
          // Offline: the check-in is kept with its id and sent when the phone is back.
          checkInLocally(now, visit);
          return;
        }
        toast(messageOf(error, 'The check-in was refused. Please try again.'));
      }
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
          const signedIn = await repository.login(email, state.password);
          dispatch({ type: 'setCapabilities', capabilities: signedIn.capabilities });
          dispatch({ type: 'loginSucceeded', user: { name: signedIn.user.name, email: signedIn.user.email, kind: 'staff' }, propertyId: signedIn.propertyId });
          void success();
        } catch (error) {
          dispatch({ type: 'loginFailed', message: messageOf(error, 'Sign-in failed. Please try again.') });
        }
      },

      // ── the visitor sign-in: a phone number, a one-time code, and for a new visitor their name and email ──
      signInWithPhone: () => dispatch({ type: 'authStep', step: 'phone' }),
      staffSignIn: () => dispatch({ type: 'authStep', step: 'email' }),
      setPhone: (value: string) => dispatch({ type: 'setPhone', value }),
      setOtpCode: (value: string) => dispatch({ type: 'setOtpCode', value }),
      setOtpProfile: (field: 'first' | 'last' | 'email', value: string) => dispatch({ type: 'setOtpProfile', field, value }),
      /** Sends (or resends) the code; the server always answers the same way for a valid number, and says when another may be asked for. */
      sendCode: async () => {
        const phone = state.phoneAuth.phone.trim();
        if (phone.replace(/\D/g, '').length < 7) {
          dispatch({ type: 'loginFailed', message: 'Enter your mobile number to continue.' });
          return;
        }
        if (state.phoneAuth.resendAt != null && state.phoneAuth.resendAt > Date.now()) return;
        dispatch({ type: 'loginStart' });
        try {
          const sent = await repository.requestVisitorCode(phone, 'US');
          dispatch({ type: 'otpSent', resendAt: Date.now() + Math.max(0, sent.resendAfterS) * 1000, debugCode: sent.debugCode ?? null });
          toast(`Code sent to ${phone}`);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404 && error.code === 'disabled') dispatch({ type: 'setCapabilities', capabilities: { ...state.capabilities, visitorAuth: false } });
          dispatch({ type: 'loginFailed', message: messageOf(error, 'The code could not be sent. Please try again.') });
        }
      },
      /** Proves the code; a new visitor is asked for their name and email first (`profile_required`), then the same code is sent again with them. */
      verifyCode: async () => {
        const { phone, code, first, last, email } = state.phoneAuth;
        if (!/^\d{6}$/.test(code)) {
          dispatch({ type: 'loginFailed', message: 'Enter the 6-digit code from the text message.' });
          return;
        }
        const withProfile = state.authStep === 'profile';
        if (withProfile && (!first.trim() || !last.trim() || !/^[^\s@]+@[^\s@]+$/.test(email.trim()))) {
          dispatch({ type: 'loginFailed', message: 'Add your first name, last name and email to finish signing in.' });
          return;
        }
        dispatch({ type: 'loginStart' });
        try {
          const { session: signedIn, bookings } = await repository.verifyVisitorCode({ phone: phone.trim(), code, countryCode: 'US', ...(withProfile ? { firstName: first, lastName: last, email } : {}), propertyId: state.propertyId });
          dispatch({ type: 'setCapabilities', capabilities: signedIn.capabilities });
          dispatch({ type: 'loginSucceeded', user: { name: signedIn.user.name, firstName: signedIn.user.firstName, lastName: signedIn.user.lastName, email: signedIn.user.email, phone: signedIn.visitor?.phone ?? phone, kind: 'visitor' }, propertyId: signedIn.propertyId });
          adoptBookings(bookings, signedIn.propertyId);
          void success();
        } catch (error) {
          if (error instanceof ApiError && error.code === 'profile_required') {
            dispatch({ type: 'otpProfileRequired' });
            return;
          }
          dispatch({ type: 'loginFailed', message: messageOf(error, 'The code could not be checked. Please try again.') });
        }
      },
      /** The "Does everything look good?" edits: a visitor's go to their CMS profile (`PUT /visitor/me`); a staff user's stay on the phone as before. */
      saveProfile: async () => {
        if (!isVisitor || !state.editingProfile) {
          dispatch({ type: 'editProfile', on: false });
          return;
        }
        const e = state.profileEdits;
        if (e.first === undefined && e.last === undefined && e.email === undefined) {
          dispatch({ type: 'editProfile', on: false });
          return;
        }
        const profile = profileOf(state, content);
        if (!profile.first.trim() || !profile.last.trim() || !/^[^\s@]+@[^\s@]+$/.test(profile.email.trim())) {
          toast('Your first name, last name and email are needed.');
          return;
        }
        try {
          const updated = await repository.updateVisitorProfile({ firstName: profile.first, lastName: profile.last, email: profile.email });
          dispatch({ type: 'setUser', user: { name: updated.user.name, firstName: updated.user.firstName, lastName: updated.user.lastName, email: updated.user.email, phone: updated.visitor?.phone ?? state.user?.phone, kind: 'visitor' } });
          toast('Profile updated.');
        } catch (error) {
          toast(messageOf(error, 'Your profile could not be updated. Please try again.'));
        }
      },

      confirmProfile: () => {
        const pending = state.pendingAfterAuth;
        dispatch({ type: 'confirmProfile' });
        if (pending === 'tour') toast(`Signed in. Your tours are on Home.`);
      },

      signOut: async () => {
        dispatch({ type: 'signOut' });
        void visitQueue.clear();
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
      scheduleSecondVisit: () => openSchedule({ date: dayKeyInZone(Date.now(), propertyZone(state), 1) }),
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
        if (zonedSlotMs(d.date, d.time, state.booking.settings?.timeZone) < Date.now()) {
          toast('That time has passed. Pick a later slot.');
          return;
        }
        const profile = profileOf(state, content);
        // The property's calendar day and the slot's clock: the CMS reads both in the property's zone.
        const request = bookingRequestFor(d, slot, profile, state.booking.settings);
        if (!request.firstName || !request.lastName || !request.phone || !request.email) {
          toast('Add your name, phone and email to book.');
          return;
        }
        dispatch({ type: 'bookingSaving' });
        try {
          const result = await repository.requestBooking(request);
          if (d.first && d.first !== profile.first) dispatch({ type: 'setProfileField', field: 'first', value: d.first });
          if (d.last && d.last !== profile.last) dispatch({ type: 'setProfileField', field: 'last', value: d.last });
          if (d.phone && d.phone !== profile.phone) dispatch({ type: 'setProfileField', field: 'phone', value: d.phone });
          dispatch({
            type: 'confirmSchedule',
            tour: {
              id: result.id, status: 'scheduled', date: result.date || d.date, time: result.timeLabel || d.time, length: d.length, unit: d.unit, party: d.party, source: 'app', createdAt: Date.now(),
              tourType: result.tourType, endTime: result.endTime, bookingId: bookingIdOf(result.id), visitorId: result.visitorId,
              bookedAtMs: result.bookedAt ? Date.parse(result.bookedAt) || null : null, timeZone: result.timeZone ?? state.booking.settings?.timeZone ?? null
            }
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
      /** Cancels the tour: in the CMS when the booking is the CMS's (an error keeps it), on the phone alone otherwise. */
      cancelTour: async () => {
        const tour = state.scheduledTour;
        const bookingId = tour?.bookingId ?? null;
        if (tour && bookingId != null && repository.source === 'pynwheel-api') {
          try {
            await repository.cancelBooking(bookingId);
          } catch (error) {
            toast(messageOf(error, 'The tour could not be cancelled. Please try again.'));
            return;
          }
        }
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
          void checkIn();
        } else dispatch({ type: 'verifyFinish' });
      },

      // ── location (October 28, 2026: the phone's own reading through services/location.ts; the server judges it) ──
      locAsk: (sheet: 'ask' | 'pick' | 'manage' = 'ask') => dispatch({ type: 'locAsk', sheet }),
      locAllow: () => {
        const then = state.location.sheet;
        dispatch({ type: 'locLocating' });
        void (async () => {
          const access: LocationAccess = await requestPermission();
          dispatch({ type: 'locAccess', access });
          if (access !== 'granted' && access !== 'coarse') {
            dispatch({ type: 'locFailed', reason: access === 'prompt' || access === 'unavailable' ? 'unavailable' : access });
            return;
          }
          const result = await acquireFix();
          if (!result.ok) {
            dispatch({ type: 'locFailed', reason: result.failure.reason });
            return;
          }
          dispatch({ type: 'locFix', fix: result.fix });
          if (then === 'pick') {
            dispatch({ type: 'guestFound', via: 'near' });
            toast(`${propertyName} found`);
          }
        })();
      },
      locRefresh: () => {
        dispatch({ type: 'locLocating' });
        void acquireFix().then((result) => {
          if (result.ok) {
            dispatch({ type: 'locFix', fix: result.fix });
            toast('Location updated');
          } else dispatch({ type: 'locFailed', reason: result.failure.reason });
        });
      },
      locDeny: () => dispatch({ type: 'locDeny' }),
      locOpenSettings: () => toast('Open Settings · Pynwheel · Location · While Using the App'),
      atProperty: () => {
        if (state.location.perm === 'on') {
          dispatch({ type: 'guestFound', via: 'near' });
          toast(`${propertyName} found${DEMO}`);
        } else dispatch({ type: 'locAsk', sheet: 'pick' });
      },
      openQr: (mode: 'property' | 'checkin' = 'property') => dispatch({ type: 'qrOpen', mode }),
      // A code found on site names the property; it never stands in for the location the server checks at check-in.
      qrFound: () => {
        dispatch({ type: 'closeOverlay', overlay: 'qr' });
        dispatch({ type: 'guestFound', via: 'qr' });
        toast(`${propertyName} found${DEMO}`);
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

      /** "I've entered the code": the visitor's confirmation (the CMS logs it as the door opened with the code); the door's state is not claimed. */
      codeEntered: (node: string) => {
        dispatch({ type: 'codeEntered', node });
        record('unlocked', node, { provider: lockProviderOf(node), method: 'pin' });
      },

      arrive: () => {
        const node = currentNode();
        dispatch({ type: 'arrive', now: Date.now() });
        if (node) record('arrived', node, state.lockPins[node] ? { code: state.lockPins[node].pin } : undefined);
      },

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
        const recorded = visitRecording(state.visit);
        toast(`${stop?.name ?? 'Stop'} skipped${reason === 'lock' ? (recorded ? ' — the leasing team is told' : ` — we let the leasing team know${DEMO}`) : ''}`);
        record('skipped', node, { reason });
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
        if (recordingAllowed && state.visit?.status === 'active' && state.visit.id == null && state.visit.propertyId === state.propertyId) {
          // Checked in on the phone while offline: the property has not confirmed the visit yet, and no door opens before it does.
          toast('Confirming your check-in with the property… try the door again in a moment.');
          void sync(state.visit);
          return;
        }
        const propertyId = state.propertyId;
        lockRequests.current.add(node);
        dispatch({ type: 'lockPinStart', node });
        try {
          const pin = await repository.getStopLockPin(node, state.visit?.id ?? null);
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
            key = await repository.getStopLockBluetoothKey(node, state.visit?.id ?? null);
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
          record('unlocked', node, { provider: lockProviderOf(node), method: 'bluetooth' });
          void success();
        } catch (error) {
          if (controller.signal.aborted) {
            dispatch({ type: 'lockPinDismiss' });
            return;
          }
          const code = error instanceof BluetoothUnlockError ? error.code : error instanceof ApiError ? error.code : 'unknown';
          // A key the CMS refused is not a door that failed; only the lock's own failure is logged against it.
          if (!(error instanceof ApiError)) record('unlock_failed', node, { provider: lockProviderOf(node), method: 'bluetooth', error_code: code });
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
      /** Report an issue: logged on the CMS's visit when one is recorded (the office sees it in Visitors); kept on the phone otherwise, and the toast says which. */
      reportIssue: (label: string) => {
        dispatch({ type: 'closeOverlay', overlay: 'report' });
        const node = currentNode();
        if (visitRecording(state.visit) && node) {
          record('issue', node, { category: label, text: label });
          toast(`Reported to the leasing team: ${label}. Call or chat for help right now.`);
          return;
        }
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
        const day = days.find((key) => guidedSlots(state.booking, key).length > 0) ?? days[0] ?? dayKeyInZone(Date.now(), propertyZone(state));
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
              dispatch({ type: 'confirmSchedule', tour: { ...state.scheduledTour, id: result.id, date: result.date || state.book.day, time: result.timeLabel || slot.label, tourType: result.tourType, endTime: result.endTime, createdAt: Date.now(), bookingId: bookingIdOf(result.id), visitorId: result.visitorId } });
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

      // ── stop extras ──
      /** Saves the note draft for the stop; on a recorded visit the CMS gets it too. */
      saveNote: (node: string) => {
        const text = state.noteDraft.trim();
        dispatch({ type: 'saveNote', node });
        if (text) record('note', node, { text: text.slice(0, MAX_NOTE_CHARS) });
      },
      toggleFavourite: (node: string) => {
        const on = !state.favourites[node];
        dispatch({ type: 'toggleFavourite', node });
        toast(on ? 'Saved to favourites' : 'Removed from favourites');
      },
      /** A reference photo the visitor took: kept on this phone for the tour; on a recorded visit a copy goes to the CMS (a note with the caption when it is too large). */
      addPhoto: (node: string, dataUrl: string | null) => {
        const stop = bundle ? tourStopViews(bundle).find((v) => v.node === node) : null;
        if (!dataUrl) {
          toast('That photo could not be read.');
          return;
        }
        dispatch({ type: 'addPhoto', node, dataUrl });
        const stopName = stop?.name.replace(/ \*$/, '') ?? 'this stop';
        const recorded = visitRecording(state.visit);
        if (recorded) {
          const caption = `Photo at ${stopName}`;
          if (dataUrl.startsWith('data:image/') && dataUrl.length <= MAX_PHOTO_CHARS) record('photo', node, { image: dataUrl, caption });
          else record('note', node, { text: caption });
        }
        toast(recorded ? `Photo added to ${stopName}` : `Photo added to ${stopName} · stays on this phone`);
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
