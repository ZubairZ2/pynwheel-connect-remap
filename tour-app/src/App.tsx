import { useCallback, useEffect, useMemo, useState } from 'react';
import sitePlan from '~/assets/images/site-plan.png';
import { Button, ErrorBanner, LoadingState, Toast } from '~/components/ui';
import { CONCIERGE_PROMPTS, CONCIERGE_PROMPTS_AMENITY, CONCIERGE_PROMPTS_UNIT, HELP_ITEMS, ONBOARDING_SLIDES, SUPPORT_EMAIL, APP_VERSION } from '~/content/appCopy';
import { ACCESS_MINUTES, BEST_MATCH_REASONS, DEMO, DEMO_LISTINGS, type DemoListing } from '~/content/demoFixtures';
import { useBackButton, useChrome, useFramed, useNativeSplash } from '~/hooks/useDevice';
import type { Property, Route } from '~/models';
import { topOverlay, type Overlay } from '~/navigation/screens';
import { useRepository } from '~/repositories/repositoryContext';
import { RepositoryProvider, createTourRepository } from '~/repositories/repositoryProvider';
import type { TourRepository } from '~/repositories/tourRepository';
import { bluetoothUnlockAvailable } from '~/services/iglooBle';
import { AppProvider } from '~/store/AppProvider';
import { useApp } from '~/store/appContext';
import type { MapView } from '~/store/appState';
import { checkinModel, extraTours, isVerified, locationModel, tourCard, effectiveTour } from '~/store/scenarios';
import { bestMatchUnit, currentSegment, currentStop, distanceLabel, markOf, tourStopViews, tourStopsInOrder } from '~/store/selectors';
import { useAppActions } from '~/store/useAppActions';
import { profileOf, startPoints } from '~/store/views';
import type { SimulationState } from '~/wayfinding/simulation';
import { ArInitScreen, ArLiveScreen, ChooseStopsScreen, ScanQrScreen } from './screens/ArScreens';
import { BuildTourScreen } from './screens/BuildTourScreen';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { GuidedScreen } from './screens/GuidedScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { ExploreScreen, SearchScreen } from './screens/SearchScreen';
import { SplashScreen } from './screens/SplashScreen';
import { StopScreen } from './screens/StopScreen';
import { TourCompleteScreen, TourSummaryScreen } from './screens/SummaryScreens';
import { TourReturnScreen, TourStartScreen } from './screens/TourStartScreens';
import { VerifyScreen } from './screens/VerifyScreen';
import { WayfindingScreen } from './screens/WayfindingScreen';
import { ApplySheet, BookSheet, HistorySheet, NotificationsSheet, SettingsSheet } from './screens/sheets/AccountSheets';
import { CallSheet, ChatOptionsSheet, CheckinSheet, GallerySheet, GuestGateSheet, LinkSheet, LocationSheet, PanoSheet, PassesSheet, QrSheet, ReportSheet, SafetyBar, SavedSheet, SkipSheet, SosSheet, UpcomingSheet, upcomingItems } from './screens/sheets/FlowSheets';
import { PlacePickerSheet } from './screens/sheets/PlacePickerSheet';
import { AddStopSheet, AiChatSheet, HelpSheet, ItinerarySheet, NoteSheet, VideoModal } from './screens/sheets/TourSheets';

const SPLASH_MS = 1700;
const AR_STEP_MS = 550;
const TOAST_MS = 2600;

const distanceOf = (route: Route | null): string => (route ? (route.lengthFt != null ? `${Math.round(route.lengthFt)} ft` : `${Math.round(route.lengthPx)} px`) : '—');
const minutesOf = (route: Route | null): number => (route?.durationS != null ? Math.max(1, Math.round(route.durationS / 60)) : 0);

/** The demo community a guest "finds" (by location, QR or link): the design's Luxe Mile High, clearly marked. */
const GUEST_PROPERTY: Property = { id: 0, name: `${DEMO_LISTINGS[0].name}${DEMO}`, address: `${DEMO_LISTINGS[0].address}${DEMO}`, city: 'Denver', heroImage: sitePlan, isSitemap: true, autoWayfinding: false, floorsCount: 0, unitsCount: 0, amenitiesCount: 0, tourEnabled: true };

const Shell = () => {
  const { state, dispatch, data, hydrated, reload, reloadProperties } = useApp();
  const actions = useAppActions();
  const repository = useRepository();
  const framed = useFramed();
  useChrome(state.screen);
  useNativeSplash();

  // A one-second clock for the countdowns (the tour card, the access window, the narration player).
  const [now, setNow] = useState(() => Date.now());
  const ticking = ['home', 'stop', 'guided', 'tourReturn', 'getStarted', 'profile'].includes(state.screen) || state.overlays.includes('passes') || state.overlays.includes('checkin') || state.overlays.includes('upcoming');
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  // Splash → onboarding or home, once the session is restored.
  useEffect(() => {
    if (state.screen !== 'splash' || !hydrated) return;
    const id = window.setTimeout(() => dispatch({ type: 'splashDone' }), SPLASH_MS);
    return () => window.clearTimeout(id);
  }, [state.screen, hydrated, dispatch]);

  // Initializing AR: one step every 550 ms.
  useEffect(() => {
    if (state.screen !== 'arInit' || state.arInitStep >= 5) return;
    const id = window.setInterval(() => dispatch({ type: 'arInitTick' }), AR_STEP_MS);
    return () => window.clearInterval(id);
  }, [state.screen, state.arInitStep, dispatch]);

  // Toasts clear themselves.
  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(() => dispatch({ type: 'toast', message: null }), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [state.toast, dispatch]);

  // The tour link check (local): "checking…" for a moment, then the property.
  useEffect(() => {
    if (state.linkStep !== 'checking') return;
    const id = window.setTimeout(() => dispatch({ type: 'linkStep', step: 'found' }), 1200);
    return () => window.clearTimeout(id);
  }, [state.linkStep, dispatch]);

  // Android Back: close the top overlay, else the screen's back, else let the app exit from a root.
  const back = useCallback((): boolean => {
    if (topOverlay(state.overlays)) {
      dispatch({ type: 'closeTopOverlay' });
      return true;
    }
    if (state.wayfinding.sim.status === 'playing' && state.screen === 'wayfinding') {
      dispatch({ type: 'wfSim', sim: { ...state.wayfinding.sim, status: 'paused' } });
      return true;
    }
    if (state.screen === 'getStarted' && state.authStep === 'confirm') {
      dispatch({ type: 'authBack' });
      return true;
    }
    if (['splash', 'onboarding', 'getStarted', 'home'].includes(state.screen)) return false;
    if (state.screen === 'search' && state.signedIn && state.propertyId == null) return false;
    dispatch({ type: 'back' });
    return true;
  }, [state.overlays, state.screen, state.wayfinding.sim, state.authStep, state.signedIn, state.propertyId, dispatch]);
  useBackButton(back);

  const bundle = data.bundle;
  const content = data.content;
  const stops = useMemo(() => (bundle ? tourStopViews(bundle) : []), [bundle]);
  const order = useMemo(() => (bundle ? tourStopsInOrder(state, bundle) : []), [state, bundle]);
  const stop = bundle ? currentStop(state, bundle) : null;
  const segment = currentSegment(state);
  const segmentRoute = segment?.route ?? null;
  const mark = markOf(bundle);

  // A stop added from the itinerary has no segment yet: recalculate the tour for the new order.
  useEffect(() => {
    if (!bundle || !state.tourOrder.length || state.guided.status === 'calculating') return;
    const missing = state.tourOrder.some((node) => !state.guided.tour?.segments.some((s) => s.node === node));
    if (!missing) return;
    let cancelled = false;
    repository
      .getTourRoute(state.tourOrder, { stepFree: state.guided.stepFree })
      .then((result) => {
        if (cancelled || !result.ok) return;
        dispatch({ type: 'tourUpdated', tour: result.tour, order: result.tour.segments.map((s) => s.node) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bundle, state.tourOrder, state.guided.tour, state.guided.status, state.guided.stepFree, repository, dispatch]);

  const distances = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(data.distances).forEach(([node, d]) => {
      out[node] = distanceLabel(d, true);
    });
    state.guided.tour?.segments.forEach((s) => {
      const up = s.route.legs.some((l) => (l.kind === 'elevator' || l.kind === 'stairs') && (l.floorTo ?? 0) > (l.floorFrom ?? 0));
      const down = s.route.legs.some((l) => (l.kind === 'elevator' || l.kind === 'stairs') && (l.floorTo ?? 0) < (l.floorFrom ?? 0));
      out[s.node] = `${distanceOf(s.route)} ${up ? '↑' : down ? '↓' : '→'}`;
    });
    return out;
  }, [state.guided.tour, data.distances]);

  const onGuidedView = useCallback((view: MapView) => dispatch({ type: 'guidedView', view }), [dispatch]);
  const onGuidedSim = useCallback((sim: SimulationState) => dispatch({ type: 'guidedSim', sim }), [dispatch]);
  const onWfView = useCallback((view: MapView) => dispatch({ type: 'wfView', view }), [dispatch]);
  const onWfSim = useCallback((sim: SimulationState) => dispatch({ type: 'wfSim', sim }), [dispatch]);
  const goTab = (tab: 'home' | 'search' | 'profile') => dispatch({ type: 'navigate', screen: tab });
  const open = (overlay: Overlay) => dispatch({ type: 'openOverlay', overlay });
  const close = (overlay: Overlay) => dispatch({ type: 'closeOverlay', overlay });
  const has = (overlay: Overlay) => state.overlays.includes(overlay);

  // The current stop's smart-lock state: its door code, and the request in flight or failed for it.
  const lockOf = (node: string) => {
    const request = state.lockRequest?.node === node ? state.lockRequest : null;
    return {
      lockPin: state.lockPins[node] ?? null,
      lockBusy: request?.status === 'loading',
      lockError: request?.status === 'error' ? request.error : null,
      onRequestPin: () => void actions.requestLockPin(node),
      lockBluetooth: {
        available: bluetoothUnlockAvailable(),
        phase: request && request.status !== 'error' ? request.status : null,
        unlocked: !!state.unlocked[node],
        onUnlock: () => void actions.unlockWithBluetooth(node),
        onCancel: () => actions.cancelBluetoothUnlock(node)
      }
    };
  };

  // ── derived views of the design refresh ──
  const property: Property | null = bundle?.property ?? (state.guest && state.guestProperty ? GUEST_PROPERTY : null);
  const propertyName = property?.name ?? GUEST_PROPERTY.name;
  const propertyAddress = property?.address ?? GUEST_PROPERTY.address;
  const profile = profileOf(state, content);
  const verified = isVerified(state);
  // The "last tour" card's note: the doors opened on the tour in progress, else what the latest pass recorded.
  const unlockedCount = Object.values(state.unlocked).filter(Boolean).length;
  const doorsNote = unlockedCount || !state.tourPasses[0] ? `${unlockedCount} ${unlockedCount === 1 ? 'door' : 'doors'} unlocked` : state.tourPasses[0].doors;
  const card = state.guest ? null : tourCard(state, now, `${propertyName} · ${doorsNote}`);
  const loc = locationModel(state, propertyName.replace(/ \*$/, ''), propertyAddress.replace(/ \*$/, ''));
  const extras = extraTours(state);
  const ciExtra = state.checkinFor ? (extras.find((x) => x.id === state.checkinFor) ?? null) : null;
  const ci = checkinModel(state, now, propertyName.replace(/ \*$/, ''), propertyAddress, ciExtra);
  // The list shows the tour the Home card shows (the booked one, or the demo scenario's placeholder) plus the Multiple-scenario extras.
  const upcoming = upcomingItems(effectiveTour(state, now).tour, state.checkedIn, propertyName, property?.heroImage ?? sitePlan, extras, now);
  const points = bundle ? startPoints(bundle, state.demo.startingPoints) : [];
  const startPoint = points.find((s) => s.id === state.startPointId) ?? points[0] ?? null;
  const inPerson = state.checkedIn && !state.virtualTour;
  const accessLeft = state.accessEndsAt != null ? state.accessEndsAt - now : ACCESS_MINUTES * 60000;
  const showSafety = inPerson && ['guided', 'stop', 'tourReturn'].includes(state.screen);
  const helpItems = content?.help ?? HELP_ITEMS;
  const unitsForApply = bundle ? bundle.units.filter((u) => u.showInStopsList) : [];
  const best = bundle ? bestMatchUnit(state, bundle) : null;
  const exploreDemo = state.exploreId ? (DEMO_LISTINGS.find((d) => d.id === state.exploreId) ?? null) : null;
  const exploreReal = state.exploreId && !exploreDemo ? (data.properties.find((p) => String(p.id) === state.exploreId) ?? null) : null;

  const onCheckinOption = (action: Parameters<typeof actions.openCheckinFor>[0] extends string ? never : string) => {
    switch (action) {
      case 'qr':
        actions.openQr('checkin');
        break;
      case 'late':
        actions.runningLate();
        break;
      case 'reschedule':
        actions.openSchedule();
        break;
      case 'cancel':
        actions.cancelTour();
        break;
      case 'call':
        dispatch({ type: 'closeOverlay', overlay: 'checkin' });
        open('call');
        break;
      case 'verify':
        actions.openVerify(ci.scenario === 'verify' || ci.scenario === 'uncertain' ? 'start' : null);
        break;
      case 'startPoint':
        actions.goTourStart();
        break;
      case 'endTour':
        actions.endTour();
        break;
      case 'calendar':
        actions.addToCalendar();
        break;
      default:
        close('checkin');
    }
  };

  const onCheckinPrimary = () => {
    switch (ci.primaryAction) {
      case 'start':
        actions.checkIn();
        break;
      case 'verify':
        actions.openVerify('start');
        break;
      case 'resume':
        close('checkin');
        actions.resumeTour();
        break;
      case 'chat':
        close('checkin');
        actions.openAiChat('general');
        break;
      case 'calendar':
        actions.addToCalendar();
        break;
      default:
        close('checkin');
    }
  };

  const onTourPrimary = () => {
    if (!card) return;
    switch (card.action) {
      case 'checkin':
      case 'view':
      case 'continue':
        actions.openCheckin();
        break;
      case 'reschedule':
        actions.openSchedule();
        break;
      case 'book':
        goTab('search');
        break;
      default:
        actions.openCheckin();
    }
  };

  const onFind = (option: 'here' | 'qr' | 'book' | 'booked' | 'link') => {
    if (option === 'here') actions.atProperty();
    else if (option === 'qr') actions.openQr('property');
    else if (option === 'book') goTab('search');
    else if (option === 'booked') dispatch({ type: 'guestGate', why: 'see your scheduled tour', pending: 'tour' });
    else actions.openLink();
  };

  const renderScreen = () => {
    if (state.screen === 'splash' || !hydrated) return <SplashScreen />;
    if (state.screen === 'onboarding') {
      return <OnboardingScreen slides={content?.onboarding ?? ONBOARDING_SLIDES} index={state.onboardIndex} onNext={() => dispatch({ type: 'onboardNext', count: ONBOARDING_SLIDES.length })} onPrev={() => dispatch({ type: 'onboardPrev' })} onSkip={() => dispatch({ type: 'skipOnboard' })} />;
    }
    if (state.screen === 'getStarted' || (!state.signedIn && !state.guest)) {
      return (
        <GetStartedScreen
          step={state.signedIn ? state.authStep : 'email'}
          guest={state.guest}
          email={state.email}
          password={state.password}
          busy={state.auth.status === 'busy'}
          error={state.auth.status === 'error' ? state.auth.error : null}
          onEmail={(v) => dispatch({ type: 'setEmail', value: v })}
          onPassword={(v) => dispatch({ type: 'setPassword', value: v })}
          onLogin={() => void actions.login()}
          onBack={() => dispatch({ type: 'authBack' })}
          onGuest={actions.continueAsGuest}
          profile={profile}
          editing={state.editingProfile}
          tourCard={card}
          propertyLine={`${propertyName} · ${propertyAddress}`}
          onEdit={(on) => dispatch({ type: 'editProfile', on })}
          onField={(field, value) => dispatch({ type: 'setProfileField', field, value })}
          onConfirm={actions.confirmProfile}
          mark={DEMO}
        />
      );
    }
    // The property picker works before a property is chosen and while one fails to load; a guest browses the demo listings.
    // A member without a property lives on Properties until they pick one; Explore (opened from that list) must stay reachable.
    if (state.screen === 'search' || (!state.guest && state.propertyId == null && state.screen !== 'explore')) {
      return (
        <SearchScreen
          status={state.guest ? 'ready' : data.propertiesStatus}
          guest={state.guest}
          onRetry={reloadProperties}
          query={state.searchQuery}
          onQuery={(v) => dispatch({ type: 'setSearchQuery', value: v })}
          beds={state.searchBeds}
          price={state.searchPrice}
          onBeds={(v) => dispatch({ type: 'setSearchBeds', value: v })}
          onPrice={(v) => dispatch({ type: 'setSearchPrice', value: v })}
          properties={data.properties.map((p) => ({ ...p, current: p.id === state.propertyId }))}
          onProperty={(item) => (item.current ? dispatch({ type: 'navigate', screen: 'home' }) : dispatch({ type: 'openExplore', id: String(item.id) }))}
          onDemoListing={(item) => dispatch({ type: 'openExplore', id: item.id })}
          onBack={() => (state.propertyId != null || state.guest ? goTab('home') : undefined)}
          onTab={goTab}
        />
      );
    }
    if (state.screen === 'explore') {
      const d: DemoListing | null = exploreDemo;
      const name = d?.name ?? exploreReal?.name ?? propertyName;
      const address = d?.address ?? exploreReal?.address ?? '';
      const tourable = d ? true : (exploreReal?.tourable ?? false);
      return (
        <ExploreScreen
          name={name}
          address={address}
          img={d?.img ?? sitePlan}
          demo={d}
          tourable={tourable}
          current={!!exploreReal && exploreReal.id === state.propertyId}
          accessMinutes={ACCESS_MINUTES}
          onBack={() => goTab('search')}
          onSchedule={() => {
            if (state.guest || !exploreReal) {
              dispatch({ type: 'guestGate', why: 'schedule a self-tour', pending: 'schedule' });
              return;
            }
            if (exploreReal.id === state.propertyId) actions.openSchedule();
            else {
              // Switch to that property first; `selectProperty` opens Schedule when this is pending.
              dispatch({ type: 'pendingAfterAuth', pending: 'schedule' });
              void actions.selectProperty(exploreReal.id, exploreReal.tourable, exploreReal.name);
            }
          }}
          onLive={() => (state.guest ? dispatch({ type: 'guestGate', why: 'book a live tour', pending: 'book' }) : exploreReal && exploreReal.id !== state.propertyId ? void actions.selectProperty(exploreReal.id, exploreReal.tourable, exploreReal.name) : actions.openBook())}
        />
      );
    }
    if (state.screen === 'profile') {
      return (
        <ProfileScreen
          guest={state.guest}
          profile={profile}
          propertyName={bundle?.property.name ?? null}
          verified={verified}
          verifiedLabel={verified ? `Verified · expires ${new Date(now + 365 * 86400000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'Not verified'}
          savedCount={stops.filter((s) => s.kind === 'unit' && state.favourites[s.node]).length + 2}
          passesCount={state.tourPasses.length + (inPerson && state.accessEndsAt != null && state.accessEndsAt > now ? 1 : 0)}
          journey={{ ...state.journey, verified }}
          onBack={() => goTab('home')}
          onVerify={() => actions.openVerify(null)}
          onSaved={() => open('saved')}
          onPasses={() => open('passes')}
          onHistory={() => open('history')}
          onNotifications={() => open('notifications')}
          onSettings={() => open('settings')}
          onSignOut={() => void actions.signOut()}
          onGuestSignIn={actions.guestSignIn}
          onFindProperty={() => goTab('search')}
          onVirtualTour={actions.startVirtualTour}
          onHelp={() => open('help')}
          onTab={goTab}
        />
      );
    }
    if (state.guest && state.screen === 'home') {
      return (
        <HomeScreen
          firstName={profile.first}
          guest
          guestProperty={state.guestProperty}
          property={state.guestProperty ? GUEST_PROPERTY : null}
          propertyInitials="LMH"
          location={loc}
          locating={state.location.locating}
          tourCard={null}
          verified={verified}
          tourSource="the app"
          upcomingCount={0}
          moreUpcoming={null}
          agent={null}
          resumable={null}
          showDirections={false}
          tourEnabled
          onHelp={() => open('help')}
          onLocationAsk={() => actions.locAsk('ask')}
          onLocationManage={() => actions.locAsk('manage')}
          onNearby={(n) => dispatch({ type: 'openExplore', id: n.id })}
          onSeeAll={() => goTab('search')}
          onGuestSignIn={actions.guestSignIn}
          onFind={onFind}
          onChangeGuestProperty={() => dispatch({ type: 'guestChangeProperty' })}
          onTourPrimary={() => undefined}
          onDirections={actions.getDirections}
          onCall={() => open('call')}
          onChat={() => open('chatOptions')}
          onVerify={() => undefined}
          onStartTour={actions.startSelfTour}
          onResumeTour={() => undefined}
          onBook={actions.openBook}
          onUpcoming={() => dispatch({ type: 'guestGate', why: 'see your tours', pending: 'upcoming' })}
          onHistory={() => dispatch({ type: 'guestGate', why: 'see your tour history', pending: 'history' })}
          onWayfinding={() => undefined}
          onArMode={() => undefined}
          onChangeProperty={() => goTab('search')}
          onTab={goTab}
        />
      );
    }
    if (state.guest) {
      // A guest cannot reach the tour screens without an account: back to Home.
      return (
        <div className="pw-screen pw-screen--center">
          <ErrorBanner
            title="Sign in to continue"
            body="This part of the app needs a Pynwheel account and a property."
            action={
              <Button variant="ghost" height={36} block={false} onClick={() => goTab('home')}>
                Back to Home
              </Button>
            }
          />
        </div>
      );
    }
    if (data.status !== 'ready' || !bundle || !content) {
      if (data.status === 'error') {
        return (
          <div className="pw-screen pw-screen--center">
            <ErrorBanner
              title="The property could not be loaded"
              body={data.error}
              action={
                <div className="pw-stack">
                  <Button variant="danger" height={36} block={false} onClick={reload}>
                    Try again
                  </Button>
                  <Button variant="ghost" height={36} block={false} onClick={() => dispatch({ type: 'navigate', screen: 'search' })}>
                    Choose another property
                  </Button>
                </div>
              }
            />
          </div>
        );
      }
      return (
        <div className="pw-screen pw-screen--center">
          <LoadingState label="Loading your property…" />
        </div>
      );
    }
    const isLast = state.stopIndex + 1 >= state.tourOrder.length;
    const previous = state.stopIndex > 0 ? order[state.stopIndex - 1] : null;
    switch (state.screen) {
      case 'home':
        return (
          <HomeScreen
            firstName={profile.first || content.firstName}
            guest={false}
            guestProperty={null}
            property={bundle.property}
            propertyInitials={bundle.property.name
              .replace(/ \*$/, '')
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w[0])
              .join('')
              .slice(0, 3)
              .toUpperCase()}
            location={loc}
            locating={state.location.locating}
            tourCard={card}
            verified={verified}
            tourSource={state.scheduledTour?.unit || 'No preference'}
            upcomingCount={upcoming.length}
            moreUpcoming={upcoming.length > 1 ? `+${upcoming.length - 1} more ${upcoming.length - 1 === 1 ? 'tour' : 'tours'}` : null}
            agent={state.agent}
            resumable={state.guided.tour && state.tourOrder.length && stop && !card ? { stopName: stop.name, index: state.stopIndex + 1, total: state.tourOrder.length } : null}
            showDirections={!!card && !state.checkedIn && card.scenario === 'today' && loc.perm === 'on' && !loc.atProperty}
            tourEnabled={bundle.property.tourEnabled}
            onHelp={() => open('help')}
            onLocationAsk={() => actions.locAsk('ask')}
            onLocationManage={() => actions.locAsk('manage')}
            onNearby={(n) => dispatch({ type: 'openExplore', id: n.id })}
            onSeeAll={() => goTab('search')}
            onGuestSignIn={actions.guestSignIn}
            onFind={onFind}
            onChangeGuestProperty={() => dispatch({ type: 'guestChangeProperty' })}
            onTourPrimary={onTourPrimary}
            onDirections={actions.getDirections}
            onCall={() => open('call')}
            onChat={() => open('chatOptions')}
            onVerify={() => actions.openVerify(null)}
            onStartTour={actions.startSelfTour}
            onResumeTour={() => dispatch({ type: 'navigate', screen: state.tourMode === 'ar' ? 'arLive' : 'guided' })}
            onBook={actions.openBook}
            onUpcoming={() => open('upcoming')}
            onHistory={() => open('history')}
            onWayfinding={() => dispatch({ type: 'navigate', screen: 'wayfinding' })}
            onArMode={() => dispatch({ type: 'startArShortcut', nodes: stops.map((s) => s.node) })}
            onChangeProperty={() => goTab('search')}
            onTab={goTab}
          />
        );
      case 'schedule':
        return (
          <ScheduleScreen
            propertyName={bundle.property.name}
            propertyAddress={bundle.property.address}
            draft={state.schedule}
            done={state.scheduleDone}
            unitOptions={bundle.units.filter((u) => u.showInStopsList && u.available).map((u) => u.name)}
            verified={verified}
            onChange={actions.setSchedule}
            onConfirm={actions.confirmSchedule}
            onBack={() => goTab('home')}
            onVerify={() => actions.openVerify(null)}
            onCalendar={actions.addToCalendar}
            onDirections={actions.getDirections}
            onHome={() => goTab('home')}
          />
        );
      case 'verify':
        return (
          <VerifyScreen
            propertyName={bundle.property.name}
            flow={state.verify}
            requireCard={state.requireCard}
            showCardDemo={bundle.demo}
            onBack={actions.verifyBack}
            onConsent={() => dispatch({ type: 'verifyConsent' })}
            onNext={actions.verifyNext}
            onCapture={actions.simulateCapture}
            onCard={(field, value) => dispatch({ type: 'verifyCard', field, value })}
            onSaveCard={actions.saveCard}
            onToggleRequireCard={() => dispatch({ type: 'toggleRequireCard' })}
            onFinish={actions.verifyFinish}
          />
        );
      case 'tourStart': {
        const all = stops;
        const minutes = all.reduce((a, s) => a + s.duration, 0);
        return (
          <TourStartScreen
            virtual={state.virtualTour}
            startPoints={points}
            startPointId={state.startPointId}
            stats={state.virtualTour ? [{ v: String(all.length), l: 'stops' }, { v: `~${Math.round(minutes * 0.6)} min`, l: 'to explore' }, { v: 'Anytime', l: 'no booking' }] : [{ v: String(all.length), l: 'stops' }, { v: `~${minutes} min`, l: 'full tour' }, { v: `${ACCESS_MINUTES} min`, l: 'door access' }]}
            onPick={actions.setStartPoint}
            onGo={actions.continueToBuild}
            onBack={() => goTab('home')}
            onCall={() => open('call')}
            onChat={() => actions.openAiChat('general')}
          />
        );
      }
      case 'tourReturn':
        return startPoint ? <TourReturnScreen startPoint={startPoint} onFinish={actions.finishTour} onBack={() => dispatch({ type: 'navigate', screen: 'guided' })} onHelp={() => actions.openAiChat('general')} /> : null;
      case 'buildTour':
        return (
          <BuildTourScreen
            bundle={bundle}
            stops={stops}
            distances={data.distances}
            selected={state.selected}
            layout={state.demo.buildLayout}
            view={state.build}
            mapView={state.guided.view}
            startNode={bundle.graph.tour?.start ?? null}
            virtual={state.virtualTour}
            calculating={state.guided.status === 'calculating'}
            error={state.guided.status === 'error' ? state.guided.error : null}
            mark={mark}
            onView={(patch) => dispatch({ type: 'buildView', patch })}
            onMapView={onGuidedView}
            onBack={() => dispatch({ type: 'back' })}
            onToggle={(node) => dispatch({ type: 'toggleStop', node })}
            onGenerate={actions.generateRoute}
          />
        );
      case 'chooseStops':
        return <ChooseStopsScreen stops={stops} distances={data.distances} selected={state.selected} calculating={state.guided.status === 'calculating'} error={state.guided.status === 'error' ? state.guided.error : null} onBack={() => dispatch({ type: 'navigate', screen: 'home' })} onToggle={(node) => dispatch({ type: 'toggleStop', node })} onLaunch={actions.launchArTour} />;
      case 'scanQr':
        return <ScanQrScreen propertyName={bundle.property.name} onBack={() => dispatch({ type: 'navigate', screen: 'home' })} onScan={() => dispatch({ type: 'enterAr' })} />;
      case 'arInit':
        return <ArInitScreen labels={content.arInitLabels} step={state.arInitStep} propertyName={bundle.property.name} onContinue={() => dispatch({ type: 'goChooseStops' })} />;
      case 'arLive':
        return <ArLiveScreen property={bundle.property} stops={order} distances={distances} onBack={() => dispatch({ type: 'navigate', screen: 'home' })} onPin={(node) => dispatch({ type: 'jumpToStop', node })} onBegin={() => dispatch({ type: 'beginGuided' })} />;
      case 'guided':
        return (
          <GuidedScreen
            mode={state.tourMode}
            virtual={state.virtualTour}
            bundle={bundle}
            propertyName={bundle.property.name}
            stop={stop}
            previousName={previous?.name ?? startPoint?.name.replace(/ \*$/, '') ?? null}
            stopNumber={state.stopIndex + 1}
            stopTotal={state.tourOrder.length || 1}
            route={segmentRoute}
            routeStatus={segmentRoute ? 'ready' : state.guided.status === 'error' ? 'error' : 'calculating'}
            routeError={state.guided.error}
            distance={distanceOf(segmentRoute)}
            minutes={minutesOf(segmentRoute)}
            view={state.guided.view}
            sim={state.guided.sim}
            stepFree={state.guided.stepFree}
            audioOn={state.audioOn}
            expanded={state.build.expanded}
            onExpand={() => dispatch({ type: 'buildView', patch: { expanded: !state.build.expanded } })}
            onView={onGuidedView}
            onSim={onGuidedSim}
            onStepFree={() => void actions.toggleStepFree()}
            onAudio={() => dispatch({ type: 'toggleAudio' })}
            onBack={() => (state.tourMode === 'ar' ? dispatch({ type: 'navigate', screen: 'arLive' }) : dispatch({ type: 'leaveTour' }))}
            onItinerary={() => open('itinerary')}
            onArrive={actions.arrive}
            onSkip={() => dispatch({ type: 'openSkip' })}
            onRetry={() => (state.tourMode === 'ar' ? actions.launchArTour() : actions.generateRoute())}
          />
        );
      case 'stop':
        return stop ? (
          <StopScreen
            stop={stop}
            {...lockOf(stop.node)}
            stopNumber={state.stopIndex + 1}
            stopTotal={state.tourOrder.length || 1}
            isLast={isLast}
            virtual={state.virtualTour}
            demo={bundle.demo}
            mark={mark}
            unlocked={!!state.unlocked[stop.node]}
            reaction={state.reactions[stop.node] ?? null}
            favourite={!!state.favourites[stop.node]}
            photos={state.photos[stop.node] ?? 0}
            note={state.notes[stop.node] ?? ''}
            leaseTerm={state.leaseTerm}
            held={!!state.holds[stop.node]}
            compared={!!state.compare[stop.node]}
            narration={state.narration}
            now={now}
            onBack={() => dispatch({ type: 'exitStop' })}
            onItinerary={() => open('itinerary')}
            onFavourite={() => actions.toggleFavourite(stop.node)}
            onReaction={(r) => dispatch({ type: 'setReaction', node: stop.node, reaction: r })}
            onDemoUnlock={() => actions.demoUnlock(stop.node)}
            onVideo={() => open('video')}
            onPano={() => open('pano')}
            onNote={() => dispatch({ type: 'openNote', node: stop.node })}
            onPhoto={() => actions.addPhoto(stop.node)}
            onGallery={() => open('gallery')}
            onAi={() => actions.openAiChat('stop')}
            onLeaseTerm={(term) => dispatch({ type: 'setLeaseTerm', term })}
            onHold={() => actions.holdUnit(stop.node)}
            onCompare={() => dispatch({ type: 'toggleCompare', node: stop.node })}
            onNarration={(next) => dispatch({ type: 'narration', ...next })}
            onNext={actions.nextStop}
            onSkip={() => dispatch({ type: 'openSkip' })}
          />
        ) : null;
      case 'tourComplete': {
        const minutes = state.guided.tour?.route.durationS != null ? Math.max(1, Math.round(state.guided.tour.route.durationS / 60)) : order.reduce((sum, s) => sum + s.duration, 0);
        return (
          <TourCompleteScreen
            propertyName={bundle.property.name}
            stops={order.filter((s) => !state.skipped[s.node]).length}
            minutes={minutes}
            inPerson={state.tourPasses.length > 0 && !state.virtualTour}
            survey={state.survey}
            surveyUnits={(order.filter((s) => s.kind === 'unit').length ? order.filter((s) => s.kind === 'unit') : stops.filter((s) => s.kind === 'unit')).map((s) => ({ id: s.node, label: s.name }))}
            onSurvey={(patch) => dispatch({ type: 'setSurvey', patch })}
            onCall={() => open('call')}
            onEmail={actions.emailLeasing}
            onSummary={() => dispatch({ type: 'navigate', screen: 'tourSummary' })}
            onHome={() => dispatch({ type: 'resetTour' })}
          />
        );
      }
      case 'tourSummary': {
        const minutes = state.guided.tour?.route.durationS != null ? Math.max(1, Math.round(state.guided.tour.route.durationS / 60)) : order.reduce((sum, s) => sum + s.duration, 0);
        return (
          <TourSummaryScreen
            propertyName={bundle.property.name}
            visited={order}
            skipped={state.skipped}
            notes={state.notes}
            reactions={state.reactions}
            photos={state.photos}
            visitedAt={state.visitedAt}
            favourites={state.favourites}
            compare={state.compare}
            holds={state.holds}
            minutes={minutes}
            unlocked={Object.values(state.unlocked).filter(Boolean).length}
            bestMatch={best}
            bestMatchPercent={content.bestMatch.percent}
            bestMatchReasons={content.bestMatch.reasons.length ? content.bestMatch.reasons : BEST_MATCH_REASONS.map((r) => `${r}${DEMO}`)}
            units={unitsForApply}
            followup={state.journey.followup}
            agent={state.agent}
            onApplyBest={() => actions.openApply(best?.node)}
            onApply={(node) => actions.openApply(node)}
            onHold={actions.holdUnit}
            onAi={() => actions.openAiChat('general')}
            onShare={actions.shareSummary}
            onSend={actions.sendShare}
            onSister={actions.tourSister}
            onSecondVisit={actions.scheduleSecondVisit}
            onCall={() => open('call')}
            onHome={() => dispatch({ type: 'resetTour' })}
            mark={mark}
          />
        );
      }
      case 'wayfinding':
        return (
          <WayfindingScreen
            bundle={bundle}
            places={data.places}
            wf={state.wayfinding}
            onBack={() => dispatch({ type: 'navigate', screen: 'home' })}
            onPick={(which) => dispatch({ type: 'wfOpenPicker', which })}
            onSwap={() => dispatch({ type: 'wfSwap' })}
            onToggleStepFree={() => dispatch({ type: 'wfToggleStepFree' })}
            onToggleAvoidBlockers={() => dispatch({ type: 'wfToggleAvoidBlockers' })}
            onFind={actions.findRoute}
            onClear={() => dispatch({ type: 'wfClear' })}
            onView={onWfView}
            onSim={onWfSim}
          />
        );
      default:
        return null;
    }
  };

  const pickerWhich = state.wayfinding.picker;
  const stopPrompts = stop ? (stop.kind === 'unit' ? CONCIERGE_PROMPTS_UNIT : CONCIERGE_PROMPTS_AMENITY) : (content?.concierge.prompts ?? CONCIERGE_PROMPTS);
  const nextStopName = order[state.stopIndex + 1]?.name ?? (state.virtualTour ? 'the end of your tour' : 'your starting point');

  return (
    <div className={`pw-stage${framed ? ' pw-stage--framed' : ''}`}>
      <div className={framed ? 'pw-bezel' : 'pw-frame'}>
        <div className={`pw-device${framed ? ' pw-device--framed' : ''}${showSafety ? ' pw-device--safety' : ''}`}>
          <div className="pw-island" />
          {renderScreen()}
          {showSafety ? <SafetyBar remainingMs={accessLeft} onLeasing={() => open('call')} onSos={() => open('sos')} onReport={() => open('report')} /> : null}

          {/* Sheets that work with or without a property */}
          <HelpSheet open={has('help')} items={helpItems} expanded={state.helpExpanded} supportEmail={content?.supportEmail ?? SUPPORT_EMAIL} onToggle={(id) => dispatch({ type: 'toggleHelp', id })} onClose={() => close('help')} />
          <SettingsSheet open={has('settings')} email={profile.email || 'Not signed in'} version={content?.appVersion ?? APP_VERSION} demo={state.demo} onDemo={(patch) => dispatch({ type: 'setDemo', patch })} onResetDemo={() => dispatch({ type: 'resetDemo' })} onClose={() => close('settings')} />
          <LocationSheet
            open={has('location')}
            sheet={state.location.sheet}
            model={loc}
            onAllow={actions.locAllow}
            onDeny={actions.locDeny}
            onOpenSettings={() => {
              dispatch({ type: 'locClose' });
              actions.locOpenSettings();
            }}
            onPrimary={(action) => {
              dispatch({ type: 'locClose' });
              if (action === 'refresh') actions.locRefresh();
              else if (action === 'qr') actions.openQr('property');
              else actions.locOpenSettings();
            }}
            onQr={() => actions.openQr('property')}
            onSearch={() => {
              dispatch({ type: 'locClose' });
              goTab('search');
            }}
            onClose={() => dispatch({ type: 'locClose' })}
          />
          <QrSheet open={has('qr')} propertyName={propertyName} propertyAddress={propertyAddress} onFound={actions.qrFound} onUseLocation={() => {
            close('qr');
            actions.atProperty();
          }} onClose={() => close('qr')} />
          <LinkSheet
            open={has('link')}
            step={state.linkStep}
            propertyName={propertyName}
            propertyAddress={propertyAddress}
            onCheck={(value) => {
              const v = value.trim().toLowerCase();
              if (!v) return 'Paste your tour link first.';
              if (!v.includes('pynwheel')) return "This isn't a Pynwheel tour link. Check the listing or email, or search for the property instead.";
              dispatch({ type: 'linkStep', step: 'checking' });
              return null;
            }}
            onContinue={actions.linkFound}
            onSearch={() => {
              close('link');
              goTab('search');
            }}
            onReset={() => dispatch({ type: 'linkStep', step: 'enter' })}
            onClose={() => close('link')}
          />
          <GuestGateSheet open={has('guestGate')} why={state.guestGateWhy ?? 'continue'} onSignIn={actions.guestSignIn} onVirtual={null} onClose={() => { close('guestGate'); dispatch({ type: 'pendingAfterAuth', pending: null }); }} />
          <CallSheet open={has('call')} propertyName={propertyName.replace(/ \*$/, '')} onCall={actions.callLeasing} onClose={() => close('call')} />
          <ChatOptionsSheet open={has('chatOptions')} agentOnline={state.demo.agentOnline} onAi={() => actions.openAiChat('general')} onAgent={actions.chatWithAgent} onClose={() => close('chatOptions')} />
          <AiChatSheet
            open={has('aiChat')}
            propertyName={propertyName.replace(/ \*$/, '')}
            mode={state.ai.mode}
            agentOnline={state.demo.agentOnline}
            messages={state.ai.messages}
            typing={state.ai.typing}
            listening={state.ai.listening}
            input={state.ai.input}
            prompts={state.ai.context === 'stop' ? stopPrompts : (content?.concierge.prompts ?? CONCIERGE_PROMPTS)}
            onInput={(v) => dispatch({ type: 'setAiInput', value: v })}
            onSend={(text) => void actions.askAi(text)}
            onMic={actions.toggleMic}
            onAgent={actions.chatWithAgent}
            onBackToAi={actions.chatBackToAi}
            onCallOffice={() => {
              close('aiChat');
              open('call');
            }}
            onClose={() => close('aiChat')}
          />

          {bundle && content ? (
            <>
              <ItinerarySheet open={has('itinerary')} stops={order} stopIndex={state.stopIndex} skipped={state.skipped} onAdd={() => open('addStop')} onJump={(node) => dispatch({ type: 'jumpToStop', node })} onClose={() => close('itinerary')} />
              <AddStopSheet open={has('addStop')} stops={stops.filter((s) => !state.tourOrder.includes(s.node))} onAdd={(node) => dispatch({ type: 'addStop', node })} onClose={() => close('addStop')} />
              <NoteSheet open={has('note')} stopName={stop?.name ?? ''} draft={state.noteDraft} onChange={(v) => dispatch({ type: 'setNoteDraft', value: v })} onSave={() => stop && dispatch({ type: 'saveNote', node: stop.node })} onClose={() => close('note')} />
              <VideoModal open={has('video')} stopName={stop?.name ?? ''} videoUrl={stop?.amenity?.videoUrl ?? null} onClose={() => close('video')} />
              <PanoSheet open={has('pano')} stopName={stop?.name ?? ''} onClose={() => close('pano')} />
              <GallerySheet open={has('gallery')} stopName={stop?.name ?? ''} count={stop ? (state.photos[stop.node] ?? 0) : 0} onClose={() => close('gallery')} />
              <SkipSheet open={has('skip')} stopName={stop?.name ?? 'this stop'} nextName={nextStopName} reason={state.skipReason} onReason={(reason) => dispatch({ type: 'setSkipReason', reason })} onConfirm={actions.skipStop} onCall={() => {
                close('skip');
                open('call');
              }} onClose={() => close('skip')} />
              <SosSheet open={has('sos')} onCall911={actions.call911} onCallLeasing={actions.callLeasing} onShareLocation={actions.shareLocation} onClose={() => close('sos')} />
              <ReportSheet open={has('report')} propertyName={bundle.property.name} onReport={actions.reportIssue} onClose={() => close('report')} />
              <CheckinSheet open={has('checkin')} model={ci} onPrimary={onCheckinPrimary} onOption={onCheckinOption} onWarn={(a) => (a === 'qr' ? actions.openQr('checkin') : a === 'retry' ? (close('checkin'), actions.locRefresh()) : (close('checkin'), actions.locOpenSettings()))} onVirtual={actions.startVirtualTour} onClose={() => close('checkin')} />
              <UpcomingSheet
                open={has('upcoming')}
                items={upcoming}
                onPrimary={(id) => actions.openCheckinFor(id === 'main' ? null : id)}
                onVirtual={() => {
                  close('upcoming');
                  actions.startVirtualTour();
                }}
                onCall={() => open('call')}
                onChat={() => open('chatOptions')}
                onBook={() => {
                  close('upcoming');
                  actions.openSchedule();
                }}
                onClose={() => close('upcoming')}
              />
              <BookSheet
                open={has('book')}
                propertyName={bundle.property.name}
                visitor={{ ...content.visitor, name: `${profile.first} ${profile.last}`.trim() || content.visitor.name, phone: profile.phone || content.visitor.phone }}
                days={content.booking.days}
                times={content.booking.times}
                units={unitsForApply.map((u) => u.name)}
                value={state.book}
                onChange={(field, value) => dispatch({ type: 'setBook', field, value })}
                onSubmit={actions.submitBooking}
                onClose={() => close('book')}
              />
              <ApplySheet open={has('apply')} step={state.applyStep} units={unitsForApply} bestMatch={best?.node ?? null} selected={state.applyUnit} submitting={state.applySubmitting} profile={profile} verified={verified} mark={mark} onPick={(node) => dispatch({ type: 'pickApplyUnit', unit: node })} onStartHold={actions.applyStartHold} onEsign={actions.submitApplication} onBack={actions.applyBack} onClose={() => close('apply')} />
              <NotificationsSheet open={has('notifications')} value={state.notifs} onToggle={(key) => dispatch({ type: 'toggleNotif', key })} onClose={() => close('notifications')} />
              <HistorySheet open={has('history')} history={state.tourHistory} onClose={() => close('history')} />
              <SavedSheet open={has('saved')} saved={stops.filter((s) => s.kind === 'unit' && state.favourites[s.node])} propertyName={bundle.property.name} mark={mark} onClose={() => close('saved')} />
              <PassesSheet open={has('passes')} passes={state.tourPasses} active={inPerson && state.accessEndsAt != null && state.accessEndsAt > now ? { property: bundle.property.name, start: state.passStart ?? now, end: state.accessEndsAt } : null} now={now} onClose={() => close('passes')} />
              <PlacePickerSheet
                open={has('placePicker')}
                which={pickerWhich}
                bundle={bundle}
                places={data.places}
                current={pickerWhich === 'from' ? state.wayfinding.from : state.wayfinding.to}
                currentFloor={pickerWhich === 'from' ? state.wayfinding.fromFloor : state.wayfinding.toFloor}
                onPick={(node, floor) => dispatch({ type: 'wfSetEndpoint', which: pickerWhich, node, floor })}
                onClose={() => close('placePicker')}
              />
            </>
          ) : null}
          <Toast message={state.toast} />
        </div>
      </div>
    </div>
  );
};

/** A build without a usable data source configuration says so instead of showing a blank screen. */
const ConfigurationError = ({ message }: { message: string }) => (
  <div className="pw-stage">
    <div className="pw-frame">
      <div className="pw-device">
        <div className="pw-screen pw-screen--center">
          <ErrorBanner title="The app is not configured" body={message} />
        </div>
      </div>
    </div>
  </div>
);

export const App = () => {
  // One provider instance for the life of the app: a second instance would start without the
  // restored session and its first requests would look like an expired sign-in.
  const created = useMemo((): { repository: TourRepository } | { error: string } => {
    try {
      return { repository: createTourRepository() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown configuration error.' };
    }
  }, []);
  if ('error' in created) return <ConfigurationError message={created.error} />;
  return (
    <RepositoryProvider repository={created.repository}>
      <AppProvider>
        <Shell />
      </AppProvider>
    </RepositoryProvider>
  );
};
