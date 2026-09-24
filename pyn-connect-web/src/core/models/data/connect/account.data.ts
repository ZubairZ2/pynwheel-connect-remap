import type { DotState, StageKey, Variant } from './common.data';

/* ---------- Company (the design calls it an "org") ---------- */

export interface Region {
  id: string;
  name: string;
  contact: string;
  email: string;
  props: number;
}

export interface PortfolioGroup {
  id: string;
  name: string;
  master: string;
  props: number;
  video: boolean;
  design?: string;
  propIds?: string[];
}

export interface HistoryEntry {
  actor: string;
  action: string;
  when: string;
  v: Variant;
}

export interface CompanyPms {
  provider: string;
  cred: string;
  pushDown: boolean;
}

export interface Org {
  id: string;
  name: string;
  users: number;
  contact: string;
  email: string;
  pms: CompanyPms;
  regions: Region[];
  groups: PortfolioGroup[];
  history: HistoryEntry[];
}

/* ---------- Property ---------- */

export interface Building {
  name: string;
  units: number;
}

export interface PropertyInventoryCounts {
  units: number;
  floorplans: number;
  floorplates: number;
  amenities: number;
}

export interface Billing {
  touch: string;
  tour: string;
  maps: string;
  combined: string;
  month: string;
  cadence: string;
}

export interface Prop {
  id: string;
  name: string;
  orgId: string;
  region: string;
  city: string;
  stage: StageKey;
  lock: DotState;
  idv: DotState;
  pms: DotState;
  units: number;
  inv: PropertyInventoryCounts;
  buildings: Building[];
  has3D: boolean;
  billing: Billing;
}

/* ---------- Levels (a building floor with a site plan) ---------- */

export type PlanKind = 'SVG' | 'Raster' | 'None';

export interface Level {
  id: string;
  building: string;
  floor: string;
  plan: PlanKind;
  file: string;
}

/* ---------- Users ---------- */

export interface AppUser {
  id: string;
  name: string;
  email: string;
  org: string;
  role: string;
  status: string;
  statusV: Variant;
  self?: boolean;
}
