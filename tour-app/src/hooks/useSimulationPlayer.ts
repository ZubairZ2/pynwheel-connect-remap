import { useEffect, useMemo, useRef } from 'react';
import type { MapLevel, Route } from '~/models';
import type { MapView } from '~/store/appState';
import { advance, buildSimulation, play, positionOf, seekToLeg, setMode, stepBy, stop, type Simulation, type SimulationMode, type SimulationState, type WalkerPosition } from '~/wayfinding/simulation';

/**
 * Drives a route simulation from requestAnimationFrame. The state lives in
 * the app store (so it persists and survives a screen change); this hook
 * advances it while playing, reports the walker's position, and moves the
 * displayed floor with the walker.
 *
 * The loop owns the authoritative state in a ref and advances from it on
 * every frame, publishing to the store as it goes — never from the last
 * rendered state, so a slow re-render (a big floor plan) delays the picture
 * but never the walker. A change that did not come from the loop (the
 * controls, hydration) is adopted on the next render.
 */
export const useSimulationPlayer = (route: Route | null, state: SimulationState, onChange: (next: SimulationState) => void, onStage?: (view: MapView) => void, levels: MapLevel[] = []) => {
  const sim: Simulation | null = useMemo(() => (route ? buildSimulation(route, levels) : null), [route, levels]);
  const current = useRef(state);
  const emitted = useRef<SimulationState | null>(null);
  if (state !== emitted.current) current.current = state;
  const lastStage = useRef<string>('');

  useEffect(() => {
    if (!sim || state.status !== 'playing') return;
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
      const next = advance(sim, current.current, dt);
      if (next !== current.current) {
        current.current = next;
        emitted.current = next;
        onChange(next);
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
    };
  }, [sim, state.status, state.run, onChange]);

  const position: WalkerPosition | null = useMemo(() => (sim && state.status !== 'idle' ? positionOf(sim, state) : null), [sim, state]);

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
      emitted.current = next;
      onChange(next);
    };
    return {
      toggle: () => emit(play(current.current)),
      stop: () => emit(stop(current.current)),
      next: () => sim && emit(stepBy(sim, current.current, 1)),
      prev: () => sim && emit(stepBy(sim, current.current, -1)),
      setMode: (mode: SimulationMode) => emit(setMode(current.current, mode)),
      seekToLeg: (leg: number) => sim && emit(seekToLeg(sim, current.current, leg))
    };
  }, [sim, onChange]);

  const label = state.status === 'idle' ? 'Play Route' : state.status === 'finished' ? 'Replay' : state.status === 'playing' ? 'Pause' : 'Resume';

  return { sim, position, controls, label };
};
