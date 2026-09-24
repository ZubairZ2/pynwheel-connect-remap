import type { Variant } from './common.data';

export type AvailKey = 'available' | 'almost' | 'sold';
export type SourceKind = 'pms' | 'manual';

export interface Floorplan {
  id: string;
  name: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
  deposit: number;
  status: AvailKey;
  tourUrl: string;
  terms: Record<number, number>;
  gallery: string[];
  src: { rent: SourceKind; deposit: SourceKind; sqft: SourceKind };
}

export interface Unit {
  id: string;
  name: string;
  fpId: string;
  price: number;
  sqft: number;
  floor: string;
  building: string;
  avail: AvailKey;
  level: string;
  plotted: boolean;
  px?: number;
  py?: number;
  plevel?: string;
  gallery: string[];
  src: { price: SourceKind; sqft: SourceKind; avail: SourceKind };
}

export interface Amenity {
  id: string;
  name: string;
  category: string;
  level: string;
  gallery: string[];
  plotted?: boolean;
  px?: number;
  py?: number;
  plevel?: string;
}

export interface Elevator {
  id: string;
  name: string;
  floorFrom: string;
  floorTo: string;
  building: string;
  gallery: string[];
  lockGated: boolean;
  vendor: string;
}

export interface Inventory {
  floorplans: Floorplan[];
  units: Unit[];
  amenities: Amenity[];
  elevators: Elevator[];
}

/* ---------- Tour graph ---------- */

export interface TourStop {
  id: string;
  name: string;
  type: 'unit' | 'amenity';
  icon: string;
  level: string;
  beds?: number;
  floorLabel: string;
  distance: number;
  duration: number;
  talkingPoint: string;
  x: number;
  y: number;
}

export interface Junction {
  id: string;
  x: number;
  y: number;
  level: string;
  label: string;
}

export type TourEdge = [string, string];

export interface Tour {
  stops: TourStop[];
  junctions: Junction[];
  edges: TourEdge[];
  startPoints: Record<string, string>;
  published: boolean;
  publishedAt: string | null;
}

/* ---------- Integrations ---------- */

export interface LockConnection {
  id: string;
  name: string;
  note?: string;
  on: boolean;
  status: string;
  statusV: Variant;
  cred: string;
  locks: number;
  mapped: number;
  lastTest: string;
  instructions: boolean;
}

export interface VendorConnection {
  status: string;
  statusV: Variant;
  connected: boolean;
  vendor: string;
  key: string;
  metaLabel: string;
  metaValue: string;
  lastTest: string;
}

export interface PropertyIntegrations {
  locks: LockConnection[];
  idv: VendorConnection;
  crm: VendorConnection;
  feed: VendorConnection;
  ils: Record<string, boolean>;
}
