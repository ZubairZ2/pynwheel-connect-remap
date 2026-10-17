import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton, LoadingState } from '~/components/ui';
import { useSimulationPlayer } from '~/hooks/useSimulationPlayer';
import { floorOptions } from '~/map/FloorPills';
import { MapView } from '~/map/MapView';
import { usePrefetchRouteLevels } from '~/map/useLevelBase';
import type { Route, RouteStep } from '~/models';
import type { PropertyBundle } from '~/repositories/tourRepository';
import type { MapView as MapViewState } from '~/store/appState';
import type { TourStopView } from '~/store/selectors';
import type { SimulationState } from '~/wayfinding/simulation';
import { ArBackground } from './ArScreens';
import { DarkShell, LightShell } from './shared';

interface Props {
  mode: 'self' | 'ar';
  virtual: boolean;
  bundle: PropertyBundle;
  propertyName: string;
  stop: TourStopView | null;
  previousName: string | null;
  stopNumber: number;
  stopTotal: number;
  /** The route that reaches the current stop (null while it is being calculated or when it failed). */
  route: Route | null;
  routeStatus: 'idle' | 'calculating' | 'ready' | 'error';
  routeError: string | null;
  distance: string;
  minutes: number;
  view: MapViewState | null;
  sim: SimulationState;
  stepFree: boolean;
  audioOn: boolean;
  expanded: boolean;
  onExpand: () => void;
  onView: (view: MapViewState) => void;
  onSim: (sim: SimulationState) => void;
  onStepFree: () => void;
  onAudio: () => void;
  onBack: () => void;
  onItinerary: () => void;
  onArrive: () => void;
  onSkip: () => void;
  onRetry: () => void;
}

const stepIcon = (kind: RouteStep['kind'] | undefined) => (kind === 'elevator' ? 'elevator' : kind === 'stairs' ? 'stairs' : kind === 'ramp' ? 'ramp' : kind === 'outdoor' ? 'outdoor' : kind === 'arrive' ? 'pin' : 'walk');

/** Reads a direction aloud where the web view offers speech synthesis (the design's audio guide); silent elsewhere. */
const speak = (text: string) => {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/ \*/g, ''));
    u.rate = 1;
    synth.speak(u);
  } catch {
    /* no speech on this device */
  }
};

/**
 * Guided Navigation: the real map with the calculated route to the current
 * stop, the design's Directions list built from the route's own steps (done
 * / current / next, a "I'm on Floor 3 →" checkpoint on every floor change
 * that moves the walker on), Avoid stairs (a real step-free recalculation),
 * Play Route, the audio guide, I've Arrived and Skip. The AR variant keeps
 * the photo background with the small map.
 */
export const GuidedScreen = (p: Props) => {
  const { mode, bundle, stop, stopNumber, stopTotal, route, routeStatus, routeError, distance, minutes, view, sim, onView, onSim, onBack, onItinerary, onArrive, onRetry, propertyName } = p;
  const onStage = useCallback((stage: MapViewState) => onView(stage), [onView]);
  const player = useSimulationPlayer(route, sim, onSim, onStage, bundle.levels);
  const playing = player.live.status === 'playing';
  const level = useMemo(() => bundle.levels.find((l) => l.id === view?.level) ?? bundle.levels.find((l) => l.id === route?.stages[0]?.level) ?? bundle.levels[0], [bundle.levels, view, route]);
  const floor = view?.floor ?? level.floors[0] ?? null;
  usePrefetchRouteLevels(route, bundle.levels, level.id);
  const stepIndex = player.position?.step ?? 0;
  const step = route ? (route.steps[stepIndex] ?? route.steps[0]) : null;
  const stages = route?.stages ?? [];
  const multi = stages.length > 1;
  const stageIndex = Math.max(
    0,
    stages.findIndex((s) => s.level === level.id && (s.floor ?? null) === (floor ?? null))
  );
  const options = floorOptions(bundle.levels);
  const stageLabel = (s: { level: string; floor: number | null; building: string | null }) => {
    const o = options.find((x) => x.level === s.level && (x.floor ?? null) === (s.floor ?? null));
    return o ? `${o.building ? `${o.building} · ` : ''}${o.label}` : level.name.replace(/ \*$/, '');
  };
  const changesFloor = !!route?.legs.some((l) => l.kind === 'elevator' || l.kind === 'stairs' || l.kind === 'ramp');

  // The audio guide reads the current direction when it changes.
  const spoken = useRef<string>('');
  useEffect(() => {
    if (!p.audioOn || !step) return;
    const text = `${step.title}. ${step.sub}`;
    if (spoken.current === text) return;
    spoken.current = text;
    speak(text);
  }, [p.audioOn, step]);
  useEffect(
    () => () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* nothing to stop */
      }
    },
    []
  );

  const map = (height: number, chip: boolean) => (
    <div className={`pw-guided__map${mode === 'ar' ? ' pw-guided__map--ar' : ''}`} style={{ height }}>
      {routeStatus === 'calculating' ? (
        <LoadingState label="Calculating your route…" veil />
      ) : routeStatus === 'error' ? (
        <div className="pw-guided__maperror">
          <div>{routeError ?? 'The route could not be calculated.'}</div>
          <Button variant="secondary" height={36} block={false} onClick={onRetry} style={{ fontSize: 13 }}>
            Try again
          </Button>
        </div>
      ) : null}
      <MapView level={level} floor={floor} nodes={bundle.graph.nodes} edges={bundle.graph.edges} units={bundle.units} amenities={bundle.amenities} route={route} walker={player.position} highlight={{ to: stop?.node ?? null, current: stop?.node ?? null }} fitTo="route" fitKey={`${stopNumber}`} followWalker={playing}>
        {chip ? (
          <div className="pw-guided__zone" onPointerDown={(e) => e.stopPropagation()}>
            {multi ? (
              <>
                <button type="button" aria-label="Previous area" disabled={stageIndex <= 0} onClick={() => onView({ level: stages[stageIndex - 1].level, floor: stages[stageIndex - 1].floor })}>
                  <Icon name="back" size={13} strokeWidth={2.6} />
                </button>
                <span>
                  <b>{stageLabel(stages[stageIndex] ?? stages[0])}</b>
                  <i>
                    {stageIndex === 0 ? 'Start' : stageIndex === stages.length - 1 ? 'Arrival' : 'On the way'} · {stageIndex + 1}/{stages.length}
                  </i>
                </span>
                <button type="button" aria-label="Next area" disabled={stageIndex >= stages.length - 1} onClick={() => onView({ level: stages[stageIndex + 1].level, floor: stages[stageIndex + 1].floor })}>
                  <Icon name="chevronRight" size={13} strokeWidth={2.6} />
                </button>
              </>
            ) : (
              <span className="pw-guided__zonesingle">
                <Icon name="layers" size={12} strokeWidth={2.2} />
                {stageLabel({ level: level.id, floor, building: level.building })}
              </span>
            )}
          </div>
        ) : null}
        {chip && mode === 'self' ? (
          <button type="button" className="pw-guided__size" aria-label={p.expanded ? 'Smaller map' : 'Bigger map'} onPointerDown={(e) => e.stopPropagation()} onClick={p.onExpand}>
            <Icon name={p.expanded ? 'shrink' : 'expand'} size={13} strokeWidth={2.4} />
          </button>
        ) : null}
      </MapView>
    </div>
  );

  const playerControls = route ? (
    <div className="pw-play pw-play--compact">
      <button type="button" className="pw-play__main" onClick={player.controls.toggle} aria-label={player.label}>
        <Icon name={playing ? 'pause' : 'play'} size={12} color="#fff" />
        {player.label}
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.prev} aria-label="Previous point" disabled={player.live.status === 'idle'}>
        <Icon name="prev" size={12} />
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.next} aria-label="Next point" disabled={player.live.status === 'idle'}>
        <Icon name="next" size={12} />
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.stop} aria-label="Stop" disabled={player.live.status === 'idle'}>
        <Icon name="stop" size={12} />
      </button>
      <div className="pw-play__bar" aria-hidden>
        <span style={{ width: `${Math.round((player.position?.progress ?? 0) * 100)}%` }} />
      </div>
    </div>
  ) : null;

  if (mode === 'ar') {
    return (
      <DarkShell className="pw-guidedar" background={<ArBackground strong />}>
        <div className="pw-arlive__top">
          <IconButton icon="back" label="Back" tone="dark" onClick={onBack} />
          <span className="pw-arlive__badge">
            <i />
            AR Live · {propertyName}
          </span>
          <IconButton icon="list" label="Itinerary" tone="dark" onClick={onItinerary} />
        </div>
        <div className="pw-guidedar__hint">Follow the blue path · Tap when you reach the stop</div>
        <div className="pw-guidedar__bottom">
          <span className="pw-guidedar__stop">
            Stop {stopNumber} of {stopTotal}
          </span>
          <div className="pw-guidedar__title">Walk To {stop?.name ?? '…'}</div>
          {map(120, false)}
          <div className="pw-guidedar__info">
            <div>
              <div className="pw-guidedar__name">{stop?.name ?? '…'}</div>
              <div className="pw-guidedar__meta">
                {minutes ? `${minutes} min · ` : ''}
                {distance}
              </div>
            </div>
            {route ? (
              <button type="button" className="pw-guidedar__play" onClick={player.controls.toggle} aria-label={player.label}>
                <Icon name={playing ? 'pause' : 'play'} size={14} color="#fff" />
              </button>
            ) : null}
          </div>
          <Button onClick={onArrive}>I&rsquo;ve Arrived</Button>
        </div>
      </DarkShell>
    );
  }

  return (
    <LightShell
      footer={
        <div className="pw-guided__foot">
          <div className="pw-guided__footrow">
            <button type="button" className="pw-guided__audio" aria-label={p.audioOn ? 'Pause guide' : 'Play guide'} onClick={p.onAudio}>
              <span>
                <Icon name={p.audioOn ? 'pause' : 'play'} size={10} color="#fff" />
              </span>
              {p.audioOn ? 'Pause guide' : 'Play guide'}
            </button>
            <Button onClick={onArrive} block={false} style={{ flex: 1 }}>
              I&rsquo;ve Arrived
            </Button>
          </div>
          <button type="button" className="pw-guided__skip" onClick={p.onSkip}>
            Can&rsquo;t get there? Skip this stop
          </button>
        </div>
      }
    >
      <ScreenHeader layout="center" left={<IconButton icon="back" label="Back" onClick={onBack} />} title={p.virtual ? 'Virtual Tour' : 'Self-Guided Tour'} right={<IconButton icon="list" label="Itinerary" onClick={onItinerary} />} />
      <div className="pw-guided">
        <div className="pw-guided__row">
          <span className="pw-guided__stop">
            Stop {stopNumber} of {stopTotal}
          </span>
          <span className="pw-guided__meta">
            {minutes ? `${minutes} min walk · ` : ''}
            {distance}
          </span>
        </div>
        <div className="pw-guided__title">Walk To {stop?.name ?? '…'}</div>
        {map(p.expanded ? 420 : 250, true)}
        {playerControls}
        <div className="pw-guided__dir">
          <div className="pw-guided__dirhead">
            <div>
              <div className="pw-guided__dirtitle">Directions</div>
              <div className="pw-guided__dirfrom">
                From {p.previousName ?? 'your starting point'} to {stop?.name ?? '…'}
              </div>
            </div>
            {changesFloor || p.stepFree ? (
              <button type="button" className={`pw-guided__stepfree${p.stepFree ? ' pw-guided__stepfree--on' : ''}`} onClick={p.onStepFree} aria-pressed={p.stepFree}>
                <Icon name="elevator" size={12} strokeWidth={2.2} />
                Avoid stairs
              </button>
            ) : null}
          </div>
          {route ? (
            route.steps.map((s, i) => {
              const done = i < stepIndex;
              const on = i === stepIndex;
              const transit = on && (s.kind === 'elevator' || s.kind === 'stairs' || s.kind === 'ramp' || s.kind === 'outdoor');
              const nextLeg = route.legs[s.leg + 1];
              const reachLabel = s.kind === 'outdoor' ? "I'm inside →" : nextLeg && nextLeg.kind === 'walk' && nextLeg.floor != null ? `I'm on Floor ${nextLeg.floor} →` : 'Done →';
              return (
                <div key={`${s.leg}-${i}`} className={`pw-guided__step${done ? ' pw-guided__step--done' : ''}${on && multi ? ' pw-guided__step--on' : ''}`}>
                  <span className={`pw-guided__stepicon pw-guided__stepicon--${done ? 'done' : s.kind === 'arrive' ? 'arrive' : 'go'}`}>{done ? <Icon name="check" size={13} strokeWidth={3} /> : <Icon name={stepIcon(s.kind)} size={14} />}</span>
                  <span className="pw-guided__steptext">
                    <span className="pw-guided__steptitle">{s.title}</span>
                    <span className="pw-guided__stepsub">{s.sub}</span>
                  </span>
                  {transit ? (
                    <button type="button" className="pw-guided__reach" onClick={() => player.controls.seekToLeg(Math.min(route.legs.length - 1, s.leg + 1))}>
                      {reachLabel}
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="pw-guided__step">
              <span className="pw-guided__stepicon pw-guided__stepicon--go">
                <Icon name="walk" size={14} />
              </span>
              <span className="pw-guided__steptext">
                <span className="pw-guided__steptitle">{stop?.name ?? '…'}</span>
                <span className="pw-guided__stepsub">{routeStatus === 'calculating' ? 'Calculating the best path…' : 'Directions appear once the route is ready.'}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </LightShell>
  );
};
