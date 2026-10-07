import type { MapLevel, Route, RouteLeg } from '~/models';

/**
 * Play Route: the simulation of walking a calculated route.
 *
 * The route's ordered legs are flattened into frames — one per hallway
 * point of every walk leg, one per transition (an elevator ride, the
 * stairs, an outdoor walk) and one for the arrival — so the walker moves
 * through exactly the path the router found, changing floor where the
 * route changes floor. Two modes, as the Map & Plotting design offers:
 *
 *   - point by point: moves through every hallway point at a steady speed;
 *   - stop by stop: glides along each leg and pauses at the end of it.
 *
 * The state is a plain object advanced by `advance(state, dtMs)` so the
 * screen can drive it from requestAnimationFrame, persist it and restore it.
 */

export type SimulationMode = 'point' | 'stop';
export type SimulationStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface SimulationFrame {
  kind: 'point' | 'transition' | 'arrive';
  /** Index into `route.legs`. */
  leg: number;
  /** Index into `route.steps` (the step the walker is on). */
  step: number;
  level: string | null;
  floor: number | null;
  x: number | null;
  y: number | null;
  /** Distance from the previous frame in level pixels (0 for a transition). */
  distance: number;
  /** Where the transition goes (for the hold label). */
  label: string;
}

export interface Simulation {
  frames: SimulationFrame[];
  totalDistance: number;
  /** Cumulative distance at each frame. */
  cumulative: number[];
  /** Walking speed per level id (px/s), from the level sizes given to `buildSimulation`. */
  speeds: Record<string, number>;
}

export interface SimulationState {
  status: SimulationStatus;
  mode: SimulationMode;
  /** The frame the walker has reached. */
  frame: number;
  /** Progress 0..1 from `frame` to `frame + 1`. */
  t: number;
  /** Milliseconds left of a hold (a transition, or a pause at a stop). */
  holdMs: number;
  /** A counter bumped on every (re)start so the view can reset its animation. */
  run: number;
}

/**
 * Playback speed. The walker's speed is a distance per second in the
 * design's 760×470 reference frame, scaled to each level by the level's
 * diagonal (the same `unit` the routing engine weighs floor changes with), so
 * a 3300 px plan and a 760 px plan are crossed in the same time and a short
 * segment takes proportionally less time than a long one. Tune here only.
 */
export const PLAYBACK_SPEED_DESIGN_PX_PER_S = 45;
/** Guard rails on the per-level speed, in that level's pixels per second. */
export const PLAYBACK_MIN_PX_PER_S = 30;
export const PLAYBACK_MAX_PX_PER_S = 140;
/** @deprecated kept for callers that read the old constant; the effective speed is per level now. */
export const POINT_SPEED_PX_PER_S = PLAYBACK_SPEED_DESIGN_PX_PER_S;
export const STOP_LEG_MS = 4000;
export const STOP_PAUSE_MS = 900;
export const TRANSITION_HOLD_MS = 2200;
export const ARRIVE_HOLD_MS = 600;

const DESIGN_DIAGONAL = Math.hypot(760, 470);

/** Pixels per second on a level, from its size (the floor image's; for an SVG-only plate the SVG's recorded size). */
export const speedForLevel = (level: (Pick<MapLevel, 'width' | 'height'> & { svgSize?: { width: number; height: number } | null }) | null | undefined): number => {
  const size = level && level.width > 0 && level.height > 0 ? { width: level.width, height: level.height } : level?.svgSize && level.svgSize.width > 0 && level.svgSize.height > 0 ? level.svgSize : null;
  const diagonal = size ? Math.hypot(size.width, size.height) : DESIGN_DIAGONAL;
  const unit = diagonal / DESIGN_DIAGONAL;
  return Math.max(PLAYBACK_MIN_PX_PER_S, Math.min(PLAYBACK_MAX_PX_PER_S, PLAYBACK_SPEED_DESIGN_PX_PER_S * unit));
};

const stepIndexOf = (route: Route, legIndex: number, prefer: 'walk' | 'any'): number => {
  const byLeg = route.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.leg === legIndex);
  if (!byLeg.length) {
    // A leg without a step of its own (a one-point walk at a gate) belongs to the next step.
    const following = route.steps.findIndex((s) => s.leg > legIndex);
    return following >= 0 ? following : Math.max(0, route.steps.length - 1);
  }
  if (prefer === 'walk') {
    const walk = byLeg.find(({ s }) => s.kind === 'walk');
    if (walk) return walk.i;
  }
  return byLeg[0].i;
};

export const buildSimulation = (route: Route, levels: (Pick<MapLevel, 'id' | 'width' | 'height'> & { svgSize?: { width: number; height: number } | null })[] = []): Simulation => {
  const frames: SimulationFrame[] = [];
  const speeds: Record<string, number> = {};
  levels.forEach((l) => {
    speeds[l.id] = speedForLevel(l);
  });
  let previous: [number, number] | null = null;
  route.legs.forEach((leg: RouteLeg) => {
    if (leg.kind === 'walk') {
      const step = stepIndexOf(route, leg.index, 'walk');
      leg.points.forEach((p, i) => {
        const distance = i === 0 || !previous ? 0 : Math.hypot(p[0] - previous[0], p[1] - previous[1]);
        frames.push({ kind: 'point', leg: leg.index, step, level: leg.level, floor: leg.floor, x: p[0], y: p[1], distance, label: '' });
        previous = p;
      });
    } else {
      const step = stepIndexOf(route, leg.index, 'any');
      const label = route.steps[step]?.title ?? (leg.kind === 'outdoor' ? 'Walking outside' : `Taking ${leg.name ?? 'the ' + leg.kind}`);
      if (leg.kind === 'outdoor' && leg.points && leg.level) {
        // An outdoor walk is animated along its polyline on the site plan.
        let last: [number, number] | null = null;
        leg.points.forEach((p, i) => {
          const distance = i === 0 || !last ? 0 : Math.hypot(p[0] - last[0], p[1] - last[1]);
          frames.push({ kind: i === 0 ? 'transition' : 'point', leg: leg.index, step, level: leg.level ?? null, floor: null, x: p[0], y: p[1], distance, label });
          last = p;
        });
      } else {
        frames.push({ kind: 'transition', leg: leg.index, step, level: null, floor: leg.floorTo, x: null, y: null, distance: 0, label });
      }
      previous = null;
    }
  });
  const last = frames[frames.length - 1];
  const arriveStep = Math.max(0, route.steps.length - 1);
  frames.push({ kind: 'arrive', leg: last?.leg ?? 0, step: arriveStep, level: last?.level ?? null, floor: last?.floor ?? null, x: last?.x ?? null, y: last?.y ?? null, distance: 0, label: route.steps[arriveStep]?.title ?? 'Arrived' });
  const cumulative: number[] = [];
  let total = 0;
  frames.forEach((f) => {
    total += f.distance;
    cumulative.push(total);
  });
  return { frames, totalDistance: total, cumulative, speeds };
};

export const initialSimulationState = (mode: SimulationMode = 'point'): SimulationState => ({ status: 'idle', mode, frame: 0, t: 0, holdMs: 0, run: 0 });

const isLegEnd = (sim: Simulation, frame: number): boolean => {
  const current = sim.frames[frame];
  const next = sim.frames[frame + 1];
  return !!current && !!next && current.leg !== next.leg;
};

/** Milliseconds the walker needs from `frame` to `frame + 1`. */
const segmentMs = (sim: Simulation, state: SimulationState, frame: number): number => {
  const next = sim.frames[frame + 1];
  if (!next) return 0;
  if (next.kind === 'transition' && next.x == null) return 0;
  if (state.mode === 'point') {
    const speed = (next.level && sim.speeds[next.level]) || speedForLevel(null);
    return Math.max(60, (next.distance / speed) * 1000);
  }
  // Stop by stop: every leg takes the same time regardless of its length.
  const legFrames = sim.frames.filter((f) => f.leg === next.leg && f.kind === 'point');
  const legDistance = legFrames.reduce((sum, f) => sum + f.distance, 0) || 1;
  return Math.max(30, (next.distance / legDistance) * STOP_LEG_MS);
};

export const play = (state: SimulationState): SimulationState => {
  if (state.status === 'finished') return { ...initialSimulationState(state.mode), status: 'playing', run: state.run + 1 };
  if (state.status === 'playing') return { ...state, status: 'paused' };
  return { ...state, status: 'playing', run: state.status === 'idle' ? state.run + 1 : state.run };
};

export const stop = (state: SimulationState): SimulationState => ({ ...initialSimulationState(state.mode), run: state.run });

export const setMode = (state: SimulationState, mode: SimulationMode): SimulationState => ({ ...state, mode });

/** Jump to the next or previous frame (a point, a transition or the arrival) and pause there. */
export const stepBy = (sim: Simulation, state: SimulationState, delta: 1 | -1): SimulationState => {
  const last = sim.frames.length - 1;
  const frame = Math.max(0, Math.min(last, state.frame + delta));
  return { ...state, frame, t: 0, holdMs: 0, status: frame >= last ? 'finished' : 'paused' };
};

/** Jump to the first frame of a leg (tapping a step in the list) and pause there. */
export const seekToLeg = (sim: Simulation, state: SimulationState, leg: number): SimulationState => {
  const frame = Math.max(
    0,
    sim.frames.findIndex((f) => f.leg === leg)
  );
  return { ...state, frame, t: 0, holdMs: 0, status: 'paused' };
};

export const advance = (sim: Simulation, state: SimulationState, dtMs: number): SimulationState => {
  if (state.status !== 'playing') return state;
  let { frame, t, holdMs } = state;
  let remaining = dtMs;
  const last = sim.frames.length - 1;
  while (remaining > 0) {
    if (frame >= last) return { ...state, frame: last, t: 0, holdMs: 0, status: 'finished' };
    if (holdMs > 0) {
      const used = Math.min(holdMs, remaining);
      holdMs -= used;
      remaining -= used;
      continue;
    }
    const next = sim.frames[frame + 1];
    const ms = segmentMs(sim, state, frame);
    if (ms <= 0) {
      // A transition with no geometry: hold on it, then continue from it.
      frame += 1;
      t = 0;
      holdMs = next.kind === 'transition' ? TRANSITION_HOLD_MS : 0;
      continue;
    }
    const left = (1 - t) * ms;
    if (remaining >= left) {
      remaining -= left;
      frame += 1;
      t = 0;
      if (next.kind === 'transition') holdMs = TRANSITION_HOLD_MS;
      else if (state.mode === 'stop' && isLegEnd(sim, frame)) holdMs = STOP_PAUSE_MS;
      else if (next.kind === 'arrive') holdMs = ARRIVE_HOLD_MS;
    } else {
      t += remaining / ms;
      remaining = 0;
    }
  }
  return { ...state, frame, t, holdMs, status: frame >= last ? 'finished' : 'playing' };
};

export interface WalkerPosition {
  level: string | null;
  floor: number | null;
  x: number | null;
  y: number | null;
  /** The frame the walker is at or leaving. */
  frame: SimulationFrame;
  /** The step index in `route.steps` to highlight. */
  step: number;
  /** Progress 0..1 along the whole route by distance. */
  progress: number;
  /** True while the walker is held on a transition (riding the elevator, taking the stairs). */
  inTransition: boolean;
}

export const positionOf = (sim: Simulation, state: SimulationState): WalkerPosition => {
  const frame = sim.frames[Math.min(state.frame, sim.frames.length - 1)];
  const next = sim.frames[state.frame + 1];
  const inTransition = state.holdMs > 0 && frame.kind === 'transition';
  let x = frame.x;
  let y = frame.y;
  let level = frame.level;
  let floor = frame.floor;
  if (next && next.kind !== 'transition' && frame.x != null && frame.y != null && next.x != null && next.y != null && next.level === frame.level && state.t > 0) {
    x = frame.x + (next.x - frame.x) * state.t;
    y = frame.y + (next.y - frame.y) * state.t;
  }
  if (frame.kind === 'transition' && frame.x == null && next) {
    // While riding, show the destination floor so the map changes with the route.
    level = next.level;
    floor = next.floor;
    x = next.x;
    y = next.y;
  }
  const covered = (sim.cumulative[state.frame] ?? 0) + (next ? next.distance * state.t : 0);
  const progress = sim.totalDistance > 0 ? Math.min(1, covered / sim.totalDistance) : state.status === 'finished' ? 1 : 0;
  const step = state.status === 'finished' ? sim.frames[sim.frames.length - 1].step : frame.kind === 'transition' && !inTransition && next ? next.step : frame.step;
  return { level, floor, x, y, frame, step, progress: state.status === 'finished' ? 1 : progress, inTransition };
};
