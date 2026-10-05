/**
 * A route as the backend's `RouteSerializer` answers it
 * (`…/wayfinding/route.json`): ordered legs (one per floor walked, with the
 * centre-pixel points along each path's polyline) and the transitions
 * between them, plus the steps `Wayfinding::Timing` phrases. The dummy
 * router produces the same object, so Play Route and the guided screens
 * will not change when the real API is connected.
 */

export type TransitionKind = 'elevator' | 'stairs' | 'ramp' | 'outdoor';

export interface WalkLeg {
  index: number;
  kind: 'walk';
  level: string;
  floor: number | null;
  building: string | null;
  from: string;
  to: string;
  lengthPx: number;
  points: [number, number][];
  nodes: string[];
}

export interface TransitionLeg {
  index: number;
  kind: TransitionKind;
  /** The connector ridden (`elevator:1`) or the gate entered. */
  via: string;
  name: string | null;
  floorFrom: number | null;
  floorTo: number | null;
  from: string;
  to: string;
  lengthPx: number;
  /** Where the transition is drawn, when it has geometry (an outdoor walk on the sitemap). */
  level?: string | null;
  points?: [number, number][];
}

export type RouteLeg = WalkLeg | TransitionLeg;

export type StepKind = 'walk' | 'elevator' | 'stairs' | 'ramp' | 'outdoor' | 'arrive';

export interface RouteStep {
  kind: StepKind;
  /** The leg the step belongs to. */
  leg: number;
  title: string;
  sub: string;
  /** Seconds to stay at an `arrive` step of a tour (from the stop's duration). */
  dwellS?: number;
}

export interface Route {
  from: string;
  to: string;
  stepFree: boolean;
  avoidBlockers: boolean;
  lengthPx: number;
  /** Null when a level on the way has no stored scale. */
  lengthFt: number | null;
  durationS: number | null;
  legs: RouteLeg[];
  steps: RouteStep[];
  warnings: string[];
  /** The levels the route visits, in order, each with its floor. */
  stages: RouteStage[];
}

export interface RouteStage {
  level: string;
  floor: number | null;
  building: string | null;
  /** First leg index on this stage. */
  leg: number;
}

export type RouteErrorCode =
  | 'unknown_endpoint'
  | 'same_endpoint'
  | 'ambiguous_floor'
  | 'not_linked'
  | 'no_path'
  | 'blocked'
  | 'no_step_free'
  | 'no_vertical_link'
  | 'no_building_link'
  | 'no_start';

export interface RouteError {
  code: RouteErrorCode;
  message: string;
}

export interface RouteSuccess {
  ok: true;
  route: Route;
}

export interface RouteFailure {
  ok: false;
  from: string | null;
  to: string | null;
  error: RouteError;
  warnings: string[];
}

export type RouteResult = RouteSuccess | RouteFailure;

export type TourRouteResult = { ok: true; tour: TourRoute } | RouteFailure;

export interface RouteOptions {
  stepFree?: boolean;
  avoidBlockers?: boolean;
  fromFloor?: number | null;
  toFloor?: number | null;
}

/** A tour's route: the chain start → every chosen stop → start, with each stop's own segment. */
export interface TourRoute {
  route: Route;
  /** One entry per stop visited, in order: the segment that reaches it. */
  segments: TourSegment[];
}

export interface TourSegment {
  /** The stop reached by this segment (its graph node). */
  node: string;
  from: string;
  route: Route;
}
