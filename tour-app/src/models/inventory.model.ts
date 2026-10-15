import type { StopKind } from './graph.model';

/**
 * The things a visitor can choose to see: units, amenities and the
 * additional self-tour stops. Each one names the graph node it stands at
 * (`node`), which is what From / To and the tour builder route to.
 */

export type AmenityIcon = 'dumbbell' | 'wave' | 'star' | 'briefcase' | 'dog' | 'yoga' | 'leaf' | 'coffee';

/**
 * The smart lock a unit or amenity carries (its door's lock when the door
 * holds it), as the backend's stops list reports it. `supported` is true when
 * the backend can issue a door code for it: an igloohome API or Iglooworks
 * lock (PIN). igloohome v1, Latch and Zerv open over Bluetooth through native
 * SDKs this app does not have; Dwelo, EdgeState and Manual are other flows.
 */
export interface StopLock {
  provider: string;
  mode: 'v1' | 'igloohome' | 'iglooworks' | null;
  method: 'pin' | 'bluetooth' | null;
  deviceId: string | null;
  supported: boolean;
}

/** A door code the backend issued for a stop's lock: valid from the top of the property's current hour for three hours. */
export interface LockPin {
  pin: string;
  validFrom: string | null;
  validUntil: string | null;
  /** When the app received it (ms since the epoch). */
  issuedAt: number;
}

export interface Unit {
  id: number;
  /** `unit:ID` */
  node: string;
  name: string;
  building: string | null;
  floor: number | null;
  level: string | null;
  /** From the unit's floor plan; null when the backend has none. */
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  /** Monthly rent in dollars; null when not published. */
  rent: number | null;
  available: boolean;
  model: boolean;
  description: string | null;
  /** Footprint on the level, in level pixels. */
  polygon: [number, number][] | null;
  showInStopsList: boolean;
  /** Whether a route can reach it (plotted and joined to a path). */
  routable?: boolean;
  floorplanName?: string | null;
  /** The unit's smart lock, when the CMS assigned one. */
  lock?: StopLock | null;
}

export interface Amenity {
  id: number;
  /** `amenity:ID` */
  node: string;
  name: string;
  building: string | null;
  floor: number | null;
  level: string | null;
  icon: AmenityIcon;
  hours: string | null;
  description: string | null;
  /** Directional text the CMS Tour Setup holds for the stop. */
  instruction?: string | null;
  polygon: [number, number][] | null;
  showInStopsList: boolean;
  routable?: boolean;
  videoUrl?: string | null;
  lock?: StopLock | null;
}

/** An additional self-tour stop (entry, exit, elevator, stairs, ramp, door, blocker, leasing, restroom, mail, parking, waypoint). */
export interface TourStopPlace {
  id: number;
  /** The graph node id (`stop:7`, `elevator:1`, `bsp:1`, `door:4`). */
  node: string;
  kind: StopKind;
  name: string;
  building: string | null;
  floor: number | null;
  level: string | null;
  /** Whether a route may start or end here (gates and destinations) — connectors and blockers are not destinations. */
  destination: boolean;
  accessible: boolean;
  note: string | null;
}

export type PlaceKind = 'unit' | 'amenity' | 'stop';

/** One thing the From / To picker can choose; built from the inventory and the graph. */
export interface Place {
  /** The graph node id. */
  node: string;
  kind: PlaceKind;
  stopKind?: StopKind;
  name: string;
  /** "2 Bed · 2 Bath", "Amenity", "Elevator" */
  meta: string;
  building: string | null;
  /** Concrete floor when the place stands on one; null for a connector that serves several (then `floors` lists them). */
  floor: number | null;
  floors: number[];
  level: string | null;
  /** Whether the place is joined to a path; an unlinked place cannot be routed to. */
  linked: boolean;
  /** Whether the place may be an endpoint at all (blockers never are). */
  routable: boolean;
}
