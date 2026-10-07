import { useCallback, useMemo } from 'react';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton, LoadingState } from '~/components/ui';
import { useSimulationPlayer } from '~/hooks/useSimulationPlayer';
import { FloorPills } from '~/map/FloorPills';
import { MapView } from '~/map/MapView';
import type { Route } from '~/models';
import type { PropertyBundle } from '~/repositories/tourRepository';
import type { MapView as MapViewState } from '~/store/appState';
import type { TourStopView } from '~/store/selectors';
import type { SimulationState } from '~/wayfinding/simulation';
import { ArBackground } from './ArScreens';
import { DarkShell, LightShell } from './shared';

interface Props {
  mode: 'self' | 'ar';
  bundle: PropertyBundle;
  propertyName: string;
  stop: TourStopView | null;
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
  onView: (view: MapViewState) => void;
  onSim: (sim: SimulationState) => void;
  onBack: () => void;
  onItinerary: () => void;
  onArrive: () => void;
  onRetry: () => void;
}

/**
 * "Walk To {stop}": the self-guided screen draws the real map with the
 * calculated route to the current stop (the AR screen shows it small over
 * the camera photo). Play Route animates the walk; the direction card reads
 * the step the walker is on.
 */
export const GuidedScreen = (props: Props) => {
  const { mode, bundle, stop, stopNumber, stopTotal, route, routeStatus, routeError, distance, minutes, view, sim, onView, onSim, onBack, onItinerary, onArrive, onRetry, propertyName } = props;
  const onStage = useCallback((stage: MapViewState) => onView(stage), [onView]);
  const player = useSimulationPlayer(route, sim, onSim, onStage, bundle.levels);
  const level = useMemo(() => bundle.levels.find((l) => l.id === view?.level) ?? bundle.levels.find((l) => l.id === route?.stages[0]?.level) ?? bundle.levels[0], [bundle.levels, view, route]);
  const floor = view?.floor ?? level.floors[0] ?? null;
  const step = route ? (route.steps[player.position?.step ?? 0] ?? route.steps[0]) : null;
  const multi = (route?.stages.length ?? 0) > 1;

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
      <MapView
        level={level}
        floor={floor}
        nodes={bundle.graph.nodes}
        edges={bundle.graph.edges}
        units={bundle.units}
        amenities={bundle.amenities}
        route={route}
        walker={player.position}
        highlight={{ to: stop?.node ?? null, current: stop?.node ?? null }}
        fitTo="route"
        fitKey={`${stopNumber}`}
        followWalker={sim.status === 'playing'}
      >
        {chip ? (
          <div className="pw-map__chip">
            <Icon name="pin" size={14} color="var(--pw-primary)" />
            Follow the highlighted path
          </div>
        ) : null}
      </MapView>
    </div>
  );

  const player_controls = route ? (
    <div className="pw-play pw-play--compact">
      <button type="button" className="pw-play__main" onClick={player.controls.toggle} aria-label={player.label}>
        <Icon name={sim.status === 'playing' ? 'pause' : 'play'} size={12} color="#fff" />
        {player.label}
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.prev} aria-label="Previous point" disabled={sim.status === 'idle'}>
        <Icon name="prev" size={12} />
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.next} aria-label="Next point" disabled={sim.status === 'idle'}>
        <Icon name="next" size={12} />
      </button>
      <button type="button" className="pw-play__sq" onClick={player.controls.stop} aria-label="Stop" disabled={sim.status === 'idle'}>
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
                <Icon name={sim.status === 'playing' ? 'pause' : 'play'} size={14} color="#fff" />
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
          <Button onClick={onArrive}>I&rsquo;ve Arrived</Button>
        </div>
      }
    >
      <ScreenHeader layout="center" left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Self-Guided Tour" right={<IconButton icon="list" label="Itinerary" onClick={onItinerary} />} />
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
        {map(280, true)}
        {multi && route ? <FloorPills levels={bundle.levels} value={view} onChange={onView} stages={route.stages} compact /> : null}
        {player_controls}
        <div className="pw-guided__direction">
          <span className="pw-guided__diricon">
            <Icon name={step?.kind === 'elevator' ? 'elevator' : step?.kind === 'stairs' ? 'stairs' : step?.kind === 'outdoor' ? 'outdoor' : step?.kind === 'arrive' ? 'flag' : 'chevronRight'} size={20} />
          </span>
          <div className="pw-guided__dirtext">
            <div className="pw-guided__dirname">{step?.title ?? stop?.name ?? '…'}</div>
            <div className="pw-guided__dirsub">{step?.sub ?? (routeStatus === 'calculating' ? 'Calculating the best path…' : 'Head down the main corridor, then turn right.')}</div>
          </div>
        </div>
      </div>
    </LightShell>
  );
};
