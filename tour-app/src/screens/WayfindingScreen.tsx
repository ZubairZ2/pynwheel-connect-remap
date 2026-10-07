import { useCallback, useMemo } from 'react';
import { ScreenHeader } from '~/components/chrome';
import { Icon, type IconName } from '~/components/Icon';
import { Button, Checkbox, ErrorBanner, IconButton } from '~/components/ui';
import { useSimulationPlayer } from '~/hooks/useSimulationPlayer';
import { FloorPills } from '~/map/FloorPills';
import { MapView } from '~/map/MapView';
import { symbolOfStopKind } from '~/map/mapSymbols';
import type { Place, RouteStep } from '~/models';
import type { PropertyBundle } from '~/repositories/tourRepository';
import type { MapView as MapViewState, WayfindingState } from '~/store/appState';
import { placeByNode } from '~/store/selectors';
import { describeLength, summarizeRoute } from '~/wayfinding/routeService';
import type { SimulationMode, SimulationState } from '~/wayfinding/simulation';
import { LightShell } from './shared';

interface Props {
  bundle: PropertyBundle;
  places: Place[];
  wf: WayfindingState;
  onBack: () => void;
  onPick: (which: 'from' | 'to') => void;
  onSwap: () => void;
  onToggleStepFree: () => void;
  onToggleAvoidBlockers: () => void;
  onFind: () => void;
  onClear: () => void;
  onView: (view: MapViewState) => void;
  onSim: (sim: SimulationState) => void;
}

const STEP_ICON: Record<RouteStep['kind'], IconName> = { walk: 'walk', elevator: 'elevator', stairs: 'stairs', ramp: 'ramp', outdoor: 'outdoor', arrive: 'flag' };

export const floorNameOf = (bundle: PropertyBundle, level: string | null, floor: number | null): string => {
  const l = bundle.levels.find((x) => x.id === level);
  if (!l) return '';
  if (l.kind === 'sitemap') return 'Property map';
  const name = bundle.demo && floor === 15 ? 'Rooftop' : floor != null ? `Floor ${floor}` : l.name.replace(/ \*$/, '');
  return l.building ? `${l.building.replace(/ \*$/, '')} · ${name}` : name;
};

/**
 * Find Shortest Path: From → To → the route, its steps and Play Route, on
 * the map. The same panel language as the Map & Plotting design's "Test
 * shortest path", in the mobile app's cards.
 */
export const WayfindingScreen = ({ bundle, places, wf, onBack, onPick, onSwap, onToggleStepFree, onToggleAvoidBlockers, onFind, onClear, onView, onSim }: Props) => {
  const route = wf.result?.ok ? wf.result.route : null;
  const failure = wf.result && !wf.result.ok ? wf.result : null;
  const onStage = useCallback((stage: MapViewState) => onView(stage), [onView]);
  const player = useSimulationPlayer(route, wf.sim, onSim, onStage, bundle.levels);

  const from = placeByNode(places, wf.from);
  const to = placeByNode(places, wf.to);
  const level = useMemo(() => bundle.levels.find((l) => l.id === wf.view?.level) ?? bundle.levels.find((l) => l.id === from?.level) ?? bundle.levels[0], [bundle.levels, wf.view, from]);
  const floor = wf.view?.level === level.id ? wf.view.floor : (level.floors[0] ?? null);
  const activeStep = player.position?.step ?? -1;
  const status =
    wf.sim.status === 'idle'
      ? null
      : wf.sim.status === 'finished'
        ? 'Arrived · route complete'
        : `${wf.sim.status === 'playing' ? 'Playing' : 'Paused'} · step ${activeStep + 1} of ${route?.steps.length ?? 0} · ${route?.steps[activeStep]?.title ?? ''}`;

  const endpointLabel = (place: Place | null, floorOf: number | null) => {
    if (!place) return { label: 'Choose…', group: '' };
    const floorText = place.floor != null ? place.floor : floorOf;
    return { label: place.name, group: `${place.meta} · ${floorNameOf(bundle, place.level, floorText)}` };
  };
  const a = endpointLabel(from, wf.fromFloor);
  const b = endpointLabel(to, wf.toFloor);

  const viewLeg = (step: RouteStep) => {
    if (!route) return;
    const leg = route.legs[step.leg];
    const stage = leg?.kind === 'walk' ? { level: leg.level, floor: leg.floor } : leg?.kind === 'outdoor' && leg.level ? { level: leg.level, floor: null } : null;
    const next = route.legs[step.leg + 1];
    const target = stage ?? (next?.kind === 'walk' ? { level: next.level, floor: next.floor } : null);
    if (target) onView(target);
    if (wf.sim.status !== 'idle') player.controls.seekToLeg(step.leg);
  };

  return (
    <LightShell>
      <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Find Shortest Path" />
      <div className="pw-wf">
        <div className="pw-wf__map">
          <MapView
            level={level}
            floor={floor}
            nodes={bundle.graph.nodes}
            edges={bundle.graph.edges}
            units={bundle.units}
            amenities={bundle.amenities}
            route={route}
            walker={player.position}
            highlight={{ from: wf.from, to: wf.to }}
            showNetwork={!route}
            fitTo={route ? 'route' : 'all'}
            fitKey={wf.view ? `${wf.view.level}@${wf.view.floor ?? ''}` : ''}
            followWalker={wf.sim.status === 'playing'}
          >
            <div className="pw-map__chip">
              <Icon name="layers" size={14} color="var(--pw-primary)" />
              {floorNameOf(bundle, level.id, floor) || level.name}
            </div>
          </MapView>
        </div>
        <FloorPills levels={bundle.levels} value={{ level: level.id, floor }} onChange={onView} stages={route ? route.stages : null} compact />

        <div className="pw-wf__ends">
          <div className="pw-wf__endcol">
            <button type="button" className="pw-wf__end" onClick={() => onPick('from')}>
              <span className="pw-wf__dot pw-wf__dot--from" />
              <span className="pw-wf__endtext">
                <span className="pw-wf__endlabel">From</span>
                <span className="pw-wf__endname">{a.label}</span>
                <span className="pw-wf__endgroup">{a.group}</span>
              </span>
              <Icon name="chevronDown" size={12} color="var(--pw-text-muted)" strokeWidth={2.6} />
            </button>
            <button type="button" className="pw-wf__end pw-wf__end--last" onClick={() => onPick('to')}>
              <span className="pw-wf__dot pw-wf__dot--to" />
              <span className="pw-wf__endtext">
                <span className="pw-wf__endlabel">To</span>
                <span className="pw-wf__endname">{b.label}</span>
                <span className="pw-wf__endgroup">{b.group}</span>
              </span>
              <Icon name="chevronDown" size={12} color="var(--pw-text-muted)" strokeWidth={2.6} />
            </button>
          </div>
          <button type="button" className="pw-wf__swap" onClick={onSwap} aria-label="Swap start and destination" title="Swap start and destination">
            <Icon name="swap" size={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className="pw-wf__options">
          <Checkbox on={wf.stepFree} onChange={onToggleStepFree}>
            Step-free route <span>· elevators, no stairs</span>
          </Checkbox>
          <Checkbox on={wf.avoidBlockers} onChange={onToggleAvoidBlockers}>
            Avoid blockers <span>· closed corridors</span>
          </Checkbox>
        </div>

        <div className="pw-wf__find">
          <Button height={48} busy={wf.status === 'calculating'} disabled={!wf.from || !wf.to} onClick={onFind}>
            Find Shortest Path
          </Button>
          {wf.from || wf.to || wf.result ? (
            <Button variant="ghost" height={36} block={false} onClick={onClear} style={{ fontSize: 13 }}>
              Reset
            </Button>
          ) : null}
        </div>

        {failure ? <ErrorBanner title="No route" body={failure.error.message} /> : null}

        {route ? (
          <div className="pw-wf__result">
            <div className="pw-wf__resulthead">
              <div className="pw-wf__resulttext">{describeLength(route)}</div>
              <div className="pw-wf__resultsub">
                {summarizeRoute(route)}
                {route.stages.length > 1 ? ' · tap a step to view that floor' : ' · shortest path in green'}
              </div>
            </div>
            <div className="pw-wf__play">
              <div className="pw-wf__modes" role="radiogroup" aria-label="Animation">
                {(
                  [
                    ['point', 'Point by point', 'Moves through every hallway point on the path'],
                    ['stop', 'Stop by stop', 'Glides between stops and pauses at each one']
                  ] as [SimulationMode, string, string][]
                ).map(([mode, label, sub]) => (
                  <button key={mode} type="button" role="radio" aria-checked={wf.sim.mode === mode} className={`pw-wf__mode${wf.sim.mode === mode ? ' pw-wf__mode--on' : ''}`} onClick={() => player.controls.setMode(mode)}>
                    <span className="pw-wf__modebox">
                      <Icon name="check" size={9} color="#fff" strokeWidth={3.6} />
                    </span>
                    <span>
                      <b>{label}</b>
                      <i>{sub}</i>
                    </span>
                  </button>
                ))}
              </div>
              <div className="pw-play">
                <button type="button" className="pw-play__main" onClick={player.controls.toggle} aria-label={player.label}>
                  <Icon name={wf.sim.status === 'playing' ? 'pause' : 'play'} size={12} color="#fff" />
                  {player.label}
                </button>
                <button type="button" className="pw-play__sq" onClick={player.controls.prev} aria-label="Previous point" disabled={wf.sim.status === 'idle'}>
                  <Icon name="prev" size={12} />
                </button>
                <button type="button" className="pw-play__sq" onClick={player.controls.next} aria-label="Next point" disabled={wf.sim.status === 'idle'}>
                  <Icon name="next" size={12} />
                </button>
                <button type="button" className="pw-play__sq pw-play__sq--stop" onClick={player.controls.stop} aria-label="Stop the animation" disabled={wf.sim.status === 'idle'}>
                  <Icon name="stop" size={12} />
                </button>
              </div>
              <div className="pw-play__bar" aria-hidden>
                <span style={{ width: `${Math.round((player.position?.progress ?? 0) * 100)}%` }} />
              </div>
              {status ? <div className="pw-wf__status">{status}</div> : null}
            </div>
            <ol className="pw-wf__steps">
              {route.steps.map((step, i) => {
                const symbol = step.kind === 'arrive' ? { color: '#C62534', soft: '#FBE1E4' } : step.kind === 'outdoor' ? { color: '#5B6270', soft: '#EEF0F4' } : { color: '#0077AE', soft: '#E6F2F9' };
                const active = i === activeStep;
                return (
                  <li key={`${i}-${step.title}`} className={`pw-wf__step${active ? ' pw-wf__step--now' : ''}`}>
                    <button type="button" onClick={() => viewLeg(step)}>
                      <span className="pw-wf__stepicon" style={{ background: symbol.soft, color: symbol.color }}>
                        <Icon name={STEP_ICON[step.kind]} size={11} strokeWidth={2.4} />
                      </span>
                      <span className="pw-wf__steptext">
                        <span className="pw-wf__steptitle">{step.title}</span>
                        <span className="pw-wf__stepsub">{step.sub}</span>
                      </span>
                      {active ? <span className="pw-wf__steptag pw-wf__steptag--now">Now</span> : route.stages.length > 1 && step.kind !== 'arrive' ? <span className="pw-wf__steptag">View</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
            {route.warnings.length ? <div className="pw-wf__warnings">{route.warnings.join(' ')}</div> : null}
          </div>
        ) : null}

        {!route && !failure && wf.status !== 'calculating' ? (
          <div className="pw-wf__hint">
            <Icon name="route" size={16} color="var(--pw-text-subtle)" />
            Choose a start and a destination — units, amenities and stops on any floor of either tower — and we&rsquo;ll find the shortest path, elevators and all.
          </div>
        ) : null}
      </div>
    </LightShell>
  );
};

export const placeSymbol = (place: Place) => symbolOfStopKind(place.stopKind, place.kind);
