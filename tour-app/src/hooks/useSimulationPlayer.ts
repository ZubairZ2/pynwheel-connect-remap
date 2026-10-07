import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLevel, Route } from '~/models';
import type { MapView } from '~/store/appState';
import { advance, buildSimulation, play, positionOf, seekToLeg, setMode, stepBy, stop, type Simulation, type SimulationMode, type SimulationState, type WalkerPosition } from '~/wayfinding/simulation';

/**
 * Drives a route simulation from requestAnimationFrame.
 *
 * Two copies of the state exist on purpose:
 *
 *   - the **live** state, advanced every animation frame and held in this
 *     hook (a ref for the loop, a local React state for the picture), so a
 *     frame re-renders the screen that owns the map and nothing else;
 *   - the **store** state (`state` / `onChange`), which persists across
 *     screens and relaunches. The loop publishes to it when the status
 *     changes (play, pause, finish, stop, seek) and otherwise at most every
 *     `PUBLISH_MS`, never per frame: publishing per frame re-rendered the
 *     whole application 60 times a second, which is what made Play Route
 *     stutter on large plans.
 *
 * The loop owns the authoritative state in a ref and advances from it, never
 * from the last rendered state, so a slow re-render (a big floor plan) delays
 * the picture but never the walker. A change that did not come from this hook
 * (hydration, another screen's controls) is adopted on the next render.
 */
export const PUBLISH_MS = 500;

export const useSimulationPlayer = (route: Route | null, state: SimulationState, onChange: (next: SimulationState) => void, onStage?: (view: MapView) => void, levels: MapLevel[] = []) => {
  const sim: Simulation | null = useMemo(() => (route ? buildSimulation(route, levels) : null), [route, levels]);
  const current = useRef(state);
  const emitted = useRef<SimulationState | null>(null);
  const [live, setLive] = useState<SimulationState>(state);
  if (state !== emitted.current && state !== current.current) {
    // An external change (hydration, a reset from the store): adopt it.
    current.current = state;
    if (live !== state) setLive(state);
  }
  const lastStage = useRef<string>('');
  const lastPublish = useRef(0);

  const publish = useCallback(
    (next: SimulationState, force: boolean) => {
      const now = performance.now();
      if (!force && now - lastPublish.current < PUBLISH_MS) return;
      lastPublish.current = now;
      emitted.current = next;
      onChange(next);
    },
    [onChange]
  );

  useEffect(() => {
    if (!sim || current.current.status !== 'playing') return;
    // requestAnimationFrame for smoothness, with a timer behind it so a
    // throttled frame rate (a hidden web view) still advances in real time.
    let raf = 0;
    let timer = 0;
    let stopped = false;
    let last = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      const dt = Math.min(1000, Math.max(0, now - last));
      last = now;
      const previous = current.current;
      const next = advance(sim, previous, dt);
      if (next !== previous) {
        current.current = next;
        setLive(next);
        publish(next, next.status !== previous.status);
      }
      if (next.status === 'playing') schedule();
    };
    const schedule = () => {
      raf = requestAnimationFrame(tick);
      timer = window.setTimeout(() => tick(performance.now()), 200);
    };
    schedule();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      // Leaving while playing: the store keeps where the walker was.
      if (current.current !== emitted.current) publish(current.current, true);
    };
  }, [sim, live.status, live.run, publish]);

  const position: WalkerPosition | null = useMemo(() => (sim && live.status !== 'idle' ? positionOf(sim, live) : null), [sim, live]);

  // Follow the walker from floor to floor.
  useEffect(() => {
    if (!position || !onStage || !position.level) return;
    const key = `${position.level}@${position.floor ?? ''}`;
    if (lastStage.current === key) return;
    lastStage.current = key;
    onStage({ level: position.level, floor: position.floor });
  }, [position, onStage]);

  const controls = useMemo(() => {
    const emit = (next: SimulationState) => {
      current.current = next;
      setLive(next);
      publish(next, true);
    };
    return {
      toggle: () => emit(play(current.current)),
      stop: () => emit(stop(current.current)),
      next: () => sim && emit(stepBy(sim, current.current, 1)),
      prev: () => sim && emit(stepBy(sim, current.current, -1)),
      setMode: (mode: SimulationMode) => emit(setMode(current.current, mode)),
      seekToLeg: (leg: number) => sim && emit(seekToLeg(sim, current.current, leg))
    };
  }, [sim, publish]);

  const label = live.status === 'idle' ? 'Play Route' : live.status === 'finished' ? 'Replay' : live.status === 'playing' ? 'Pause' : 'Resume';

  return { sim, position, controls, label, live };
};
