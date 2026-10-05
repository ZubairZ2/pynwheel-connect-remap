import { useCallback, useEffect, useMemo } from 'react';
import { Button, ErrorBanner, LoadingState, Toast } from '~/components/ui';
import { useBackButton, useChrome, useFramed, useNativeSplash } from '~/hooks/useDevice';
import type { Route } from '~/models';
import { topOverlay, type Overlay } from '~/navigation/screens';
import { useRepository } from '~/repositories/repositoryContext';
import { RepositoryProvider } from '~/repositories/repositoryProvider';
import { AppProvider } from '~/store/AppProvider';
import { useApp } from '~/store/appContext';
import type { MapView } from '~/store/appState';
import { bestMatchUnit, currentSegment, currentStop, distanceLabel, tourStopViews, tourStopsInOrder } from '~/store/selectors';
import { useAppActions } from '~/store/useAppActions';
import type { SimulationState } from '~/wayfinding/simulation';
import { ArInitScreen, ArLiveScreen, ChooseStopsScreen, ScanQrScreen } from './screens/ArScreens';
import { BuildTourScreen } from './screens/BuildTourScreen';
import { GuidedScreen } from './screens/GuidedScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SplashScreen } from './screens/SplashScreen';
import { StopDetailScreen, UnlockUnitScreen } from './screens/StopScreens';
import { TourCompleteScreen, TourSummaryScreen } from './screens/SummaryScreens';
import { WayfindingScreen } from './screens/WayfindingScreen';
import { ApplySheet, BookSheet, HistorySheet, NotificationsSheet, SettingsSheet } from './screens/sheets/AccountSheets';
import { PlacePickerSheet } from './screens/sheets/PlacePickerSheet';
import { AddStopSheet, AiChatSheet, HelpSheet, ItinerarySheet, NoteSheet, VideoModal } from './screens/sheets/TourSheets';

const SPLASH_MS = 1700;
const AR_STEP_MS = 550;
const TOAST_MS = 2600;

const distanceOf = (route: Route | null): string => (route ? (route.lengthFt != null ? `${Math.round(route.lengthFt)} ft` : `${Math.round(route.lengthPx)} px`) : '—');
const minutesOf = (route: Route | null): number => (route?.durationS != null ? Math.max(1, Math.round(route.durationS / 60)) : 0);

const Shell = () => {
  const { state, dispatch, data, hydrated, reload } = useApp();
  const actions = useAppActions();
  const repository = useRepository();
  const framed = useFramed();
  useChrome(state.screen);
  useNativeSplash();

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
    if (['splash', 'onboarding', 'login', 'home'].includes(state.screen)) return false;
    dispatch({ type: 'back' });
    return true;
  }, [state.overlays, state.screen, state.wayfinding.sim, dispatch]);
  useBackButton(back);

  const bundle = data.bundle;
  const content = data.content;
  const stops = useMemo(() => (bundle ? tourStopViews(bundle) : []), [bundle]);
  const order = useMemo(() => (bundle ? tourStopsInOrder(state, bundle) : []), [state, bundle]);
  const stop = bundle ? currentStop(state, bundle) : null;
  const segment = currentSegment(state);
  const segmentRoute = segment?.route ?? null;

  // A stop added from the itinerary has no segment yet: recalculate the tour for the new order.
  useEffect(() => {
    if (!bundle || !state.tourOrder.length || state.guided.status === 'calculating') return;
    const missing = state.tourOrder.some((node) => !state.guided.tour?.segments.some((s) => s.node === node));
    if (!missing) return;
    let cancelled = false;
    repository
      .getTourRoute(state.tourOrder)
      .then((result) => {
        if (cancelled || !result.ok) return;
        dispatch({ type: 'tourUpdated', tour: result.tour, order: result.tour.segments.map((s) => s.node) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bundle, state.tourOrder, state.guided.tour, state.guided.status, repository, dispatch]);

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

  const renderScreen = () => {
    if (state.screen === 'splash' || !hydrated) return <SplashScreen />;
    if (state.screen === 'onboarding') {
      return <OnboardingScreen slides={content?.onboarding ?? []} index={state.onboardIndex} onNext={() => dispatch({ type: 'onboardNext', count: content?.onboarding.length ?? 3 })} onPrev={() => dispatch({ type: 'onboardPrev' })} onSkip={() => dispatch({ type: 'skipOnboard' })} />;
    }
    if (state.screen === 'login') {
      return <LoginScreen email={state.email} password={state.password} onEmail={(v) => dispatch({ type: 'setEmail', value: v })} onPassword={(v) => dispatch({ type: 'setPassword', value: v })} onLogin={() => dispatch({ type: 'login' })} />;
    }
    if (data.status === 'loading' || !bundle || !content) {
      if (data.status === 'error') {
        return (
          <div className="pw-screen pw-screen--center">
            <ErrorBanner title="The property could not be loaded" body={data.error} action={<Button variant="danger" height={36} block={false} onClick={reload}>Try again</Button>} />
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
    switch (state.screen) {
      case 'home':
        return (
          <HomeScreen
            firstName={content.firstName}
            property={bundle.property}
            tourHistory={state.tourHistory}
            agent={state.agent}
            resumable={state.guided.tour && state.tourOrder.length && stop ? { stopName: stop.name, index: state.stopIndex + 1, total: state.tourOrder.length } : null}
            onHelp={() => open('help')}
            onStartTour={() => dispatch({ type: 'startBuildTour' })}
            onResumeTour={() => dispatch({ type: 'navigate', screen: state.tourMode === 'ar' ? 'arLive' : 'guided' })}
            onBook={actions.openBook}
            onArMode={() => dispatch({ type: 'startArShortcut', nodes: stops.map((s) => s.node) })}
            onWayfinding={() => dispatch({ type: 'navigate', screen: 'wayfinding' })}
            onTab={goTab}
          />
        );
      case 'search':
        return (
          <SearchScreen
            query={state.searchQuery}
            onQuery={(v) => dispatch({ type: 'setSearchQuery', value: v })}
            nearby={content.nearbyProperties}
            hiRise={content.hiRiseListings}
            onNearby={(item) => (item.current ? dispatch({ type: 'navigate', screen: 'home' }) : actions.listingTap(item.name))}
            onListing={(item) => actions.listingTap(item.name)}
            onTab={goTab}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            visitor={content.visitor}
            propertyName={bundle.property.name}
            journey={state.journey}
            onHistory={() => open('history')}
            onNotifications={() => open('notifications')}
            onSettings={() => open('settings')}
            onSignOut={() => dispatch({ type: 'signOut' })}
            onTab={goTab}
          />
        );
      case 'buildTour':
        return (
          <BuildTourScreen stops={stops} distances={data.distances} selected={state.selected} calculating={state.guided.status === 'calculating'} error={state.guided.status === 'error' ? state.guided.error : null} onBack={() => dispatch({ type: 'navigate', screen: 'home' })} onToggle={(node) => dispatch({ type: 'toggleStop', node })} onGenerate={actions.generateRoute} />
        );
      case 'chooseStops':
        return (
          <ChooseStopsScreen stops={stops} distances={data.distances} selected={state.selected} calculating={state.guided.status === 'calculating'} error={state.guided.status === 'error' ? state.guided.error : null} onBack={() => dispatch({ type: 'navigate', screen: 'home' })} onToggle={(node) => dispatch({ type: 'toggleStop', node })} onLaunch={actions.launchArTour} />
        );
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
            bundle={bundle}
            propertyName={bundle.property.name}
            stop={stop}
            stopNumber={state.stopIndex + 1}
            stopTotal={state.tourOrder.length || 1}
            route={segmentRoute}
            routeStatus={segmentRoute ? 'ready' : state.guided.status === 'error' ? 'error' : 'calculating'}
            routeError={state.guided.error}
            distance={distanceOf(segmentRoute)}
            minutes={minutesOf(segmentRoute)}
            view={state.guided.view}
            sim={state.guided.sim}
            onView={onGuidedView}
            onSim={onGuidedSim}
            onBack={() => (state.tourMode === 'ar' ? dispatch({ type: 'navigate', screen: 'arLive' }) : dispatch({ type: 'leaveTour' }))}
            onItinerary={() => open('itinerary')}
            onArrive={() => dispatch({ type: 'arrive' })}
            onRetry={() => (state.tourMode === 'ar' ? actions.launchArTour() : actions.generateRoute())}
          />
        );
      case 'stopDetail':
        return stop ? (
          <StopDetailScreen stop={stop} isLast={isLast} onItinerary={() => open('itinerary')} onClose={() => dispatch({ type: 'exitStop' })} onVideo={() => open('video')} onNote={() => dispatch({ type: 'openNote', node: stop.node })} onAi={() => actions.openAiChat('stop')} onNext={actions.nextStop} />
        ) : null;
      case 'unlockUnit':
        return stop ? (
          <UnlockUnitScreen
            stop={stop}
            isLast={isLast}
            drag={state.unlockDrag}
            unlocked={!!state.unlocked[stop.node]}
            onDrag={(pct) => dispatch({ type: 'unlockDrag', pct })}
            onRelease={() => dispatch({ type: 'unlockRelease', node: stop.node })}
            onItinerary={() => open('itinerary')}
            onClose={() => dispatch({ type: 'exitStop' })}
            onNext={actions.nextStop}
          />
        ) : null;
      case 'tourComplete':
        return <TourCompleteScreen onSummary={() => dispatch({ type: 'navigate', screen: 'tourSummary' })} />;
      case 'tourSummary': {
        const best = bestMatchUnit(state, bundle);
        const minutes = state.guided.tour?.route.durationS != null ? Math.max(1, Math.round(state.guided.tour.route.durationS / 60)) : order.reduce((sum, s) => sum + s.duration, 0);
        return (
          <TourSummaryScreen
            propertyName={bundle.property.name}
            visited={order}
            notes={state.notes}
            minutes={minutes}
            unlocked={Object.values(state.unlocked).filter(Boolean).length}
            bestMatch={best}
            bestMatchPercent={content.bestMatch.percent}
            bestMatchReasons={content.bestMatch.reasons}
            onApplyBest={() => actions.openApply(best?.node)}
            onApply={() => actions.openApply()}
            onAi={() => actions.openAiChat('general')}
            onShare={actions.shareSummary}
            onHome={() => dispatch({ type: 'resetTour' })}
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
  const unitsForApply = bundle ? bundle.units.filter((u) => u.showInStopsList) : [];
  const best = bundle ? bestMatchUnit(state, bundle) : null;

  return (
    <div className={`pw-stage${framed ? ' pw-stage--framed' : ''}`}>
      <div className={framed ? 'pw-bezel' : 'pw-frame'}>
        <div className={`pw-device${framed ? ' pw-device--framed' : ''}`}>
          <div className="pw-island" />
          {renderScreen()}

          {bundle && content ? (
            <>
              <HelpSheet open={has('help')} items={content.help} expanded={state.helpExpanded} supportEmail={content.supportEmail} onToggle={(id) => dispatch({ type: 'toggleHelp', id })} onClose={() => close('help')} />
              <ItinerarySheet open={has('itinerary')} stops={order} stopIndex={state.stopIndex} onAdd={() => open('addStop')} onJump={(node) => dispatch({ type: 'jumpToStop', node })} onClose={() => close('itinerary')} />
              <AddStopSheet open={has('addStop')} stops={stops.filter((s) => !state.tourOrder.includes(s.node))} onAdd={(node) => dispatch({ type: 'addStop', node })} onClose={() => close('addStop')} />
              <NoteSheet open={has('note')} stopName={stop?.name ?? ''} draft={state.noteDraft} onChange={(v) => dispatch({ type: 'setNoteDraft', value: v })} onSave={() => stop && dispatch({ type: 'saveNote', node: stop.node })} onClose={() => close('note')} />
              <VideoModal open={has('video')} stopName={stop?.name ?? ''} onClose={() => close('video')} />
              <BookSheet
                open={has('book')}
                propertyName={bundle.property.name}
                visitor={content.visitor}
                days={content.booking.days}
                times={content.booking.times}
                units={unitsForApply.map((u) => u.name)}
                value={state.book}
                onChange={(field, value) => dispatch({ type: 'setBook', field, value })}
                onSubmit={actions.submitBooking}
                onClose={() => close('book')}
              />
              <AiChatSheet
                open={has('aiChat')}
                propertyName={bundle.property.name}
                messages={state.ai.messages}
                typing={state.ai.typing}
                input={state.ai.input}
                prompts={content.concierge.prompts}
                onInput={(v) => dispatch({ type: 'setAiInput', value: v })}
                onSend={(text) => void actions.askAi(text)}
                onHuman={actions.talkToHuman}
                onClose={() => close('aiChat')}
              />
              <ApplySheet open={has('apply')} units={unitsForApply} bestMatch={best?.node ?? null} selected={state.applyUnit} submitting={state.applySubmitting} onPick={(node) => dispatch({ type: 'pickApplyUnit', unit: node })} onSubmit={actions.submitApplication} onClose={() => close('apply')} />
              <NotificationsSheet open={has('notifications')} value={state.notifs} onToggle={(key) => dispatch({ type: 'toggleNotif', key })} onClose={() => close('notifications')} />
              <SettingsSheet open={has('settings')} email={content.visitor.email} version={content.appVersion} onClose={() => close('settings')} />
              <HistorySheet open={has('history')} history={state.tourHistory} onClose={() => close('history')} />
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

export const App = () => (
  <RepositoryProvider>
    <AppProvider>
      <Shell />
    </AppProvider>
  </RepositoryProvider>
);
