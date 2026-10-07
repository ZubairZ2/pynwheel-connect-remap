import { describe, expect, it } from 'vitest';
import { buildDummyProperty } from '~/dummy';
import { RouteService } from './routeService';
import { advance, buildSimulation, initialSimulationState, play, positionOf, seekToLeg, stepBy, stop } from './simulation';

const { graph } = buildDummyProperty();

const routeTo = (to: string) => {
  const result = new RouteService(graph).find('bsp:1', to);
  if (!result.ok) throw new Error(result.error.message);
  return result.route;
};

describe('Play Route simulation', () => {
  it('flattens a cross-floor route into points, a transition and the arrival', () => {
    const route = routeTo('unit:304');
    const sim = buildSimulation(route);
    const kinds = sim.frames.map((f) => f.kind);
    expect(kinds[0]).toBe('point');
    expect(kinds).toContain('transition');
    expect(kinds[kinds.length - 1]).toBe('arrive');
    expect(sim.totalDistance).toBeCloseTo(route.lengthPx, 0);
    const transition = sim.frames.findIndex((f) => f.kind === 'transition');
    expect(sim.frames[transition - 1].level).toBe('floorplate:101');
    expect(sim.frames[transition + 1].level).toBe('floorplate:102');
    expect(sim.frames[transition + 1].floor).toBe(3);
  });

  it('plays to the end, changing floor at the transition, and finishes', () => {
    const route = routeTo('unit:304');
    const sim = buildSimulation(route);
    let state = play(initialSimulationState('point'));
    expect(state.status).toBe('playing');
    const floorsSeen = new Set<number | null>();
    for (let i = 0; i < 2000 && state.status !== 'finished'; i += 1) {
      state = advance(sim, state, 50);
      floorsSeen.add(positionOf(sim, state).floor);
    }
    expect(state.status).toBe('finished');
    expect(floorsSeen.has(1)).toBe(true);
    expect(floorsSeen.has(3)).toBe(true);
    expect(positionOf(sim, state).progress).toBe(1);
  });

  it('pauses, resumes, steps and replays', () => {
    const route = routeTo('amenity:1');
    const sim = buildSimulation(route);
    let state = play(initialSimulationState('stop'));
    state = advance(sim, state, 300);
    const before = positionOf(sim, state).progress;
    expect(before).toBeGreaterThan(0);
    state = play(state);
    expect(state.status).toBe('paused');
    expect(advance(sim, state, 500)).toEqual(state);
    state = play(state);
    expect(state.status).toBe('playing');
    state = stepBy(sim, state, 1);
    expect(state.status).toBe('paused');
    expect(state.t).toBe(0);
    state = stepBy(sim, state, -1);
    expect(state.frame).toBeGreaterThanOrEqual(0);
    state = seekToLeg(sim, state, 0);
    expect(state.frame).toBe(0);
    state = { ...state, status: 'finished', frame: sim.frames.length - 1 };
    const replay = play(state);
    expect(replay.status).toBe('playing');
    expect(replay.frame).toBe(0);
    expect(replay.run).toBe(state.run + 1);
    expect(stop(replay).status).toBe('idle');
  });

  it('animates an outdoor walk along the site plan polyline', () => {
    const route = routeTo('amenity:6');
    const sim = buildSimulation(route);
    expect(sim.frames.some((f) => f.level === 'sitemap:1' && f.x != null)).toBe(true);
    let state = play(initialSimulationState('point'));
    const levels = new Set<string | null>();
    for (let i = 0; i < 4000 && state.status !== 'finished'; i += 1) {
      state = advance(sim, state, 40);
      levels.add(positionOf(sim, state).level);
    }
    expect(state.status).toBe('finished');
    expect(levels.has('sitemap:1')).toBe(true);
    expect(levels.has('floorplate:201')).toBe(true);
  });
});

import { PLAYBACK_MAX_PX_PER_S, PLAYBACK_MIN_PX_PER_S, PLAYBACK_SPEED_DESIGN_PX_PER_S, speedForLevel } from './simulation';

describe('playback speed', () => {
  it('is distance-aware and scales with the level size, within guard rails', () => {
    expect(speedForLevel({ width: 760, height: 470 })).toBeCloseTo(PLAYBACK_SPEED_DESIGN_PX_PER_S, 5);
    const hazel = speedForLevel({ width: 1412, height: 932 });
    expect(hazel).toBeGreaterThan(PLAYBACK_SPEED_DESIGN_PX_PER_S);
    expect(hazel).toBeLessThanOrEqual(PLAYBACK_MAX_PX_PER_S);
    expect(speedForLevel({ width: 3300, height: 2550 })).toBe(PLAYBACK_MAX_PX_PER_S);
    expect(speedForLevel({ width: 10, height: 10 })).toBe(PLAYBACK_MIN_PX_PER_S);
    expect(speedForLevel(null)).toBeCloseTo(PLAYBACK_SPEED_DESIGN_PX_PER_S, 5);
    expect(speedForLevel({ width: 0, height: 0, svgSize: { width: 1412, height: 912 } })).toBeCloseTo(speedForLevel({ width: 1412, height: 912 }), 5);
    // A 1,032 px walk on Hazel's plan takes well over 10 seconds, not 4.7 as before.
    expect(1032 / hazel).toBeGreaterThan(10);
  });
});
