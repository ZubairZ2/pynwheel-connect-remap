import type { Variant } from './common.data';

export type TourTypeKey = 'self' | 'guided' | 'virtual';
export type SyncKey = 'created' | 'updated' | 'cancelled' | 'pending';
export type HoldKey = 'held' | 'released' | 'refunded' | 'n/a';
export type GdprKey = 'none' | 'requested' | 'removed';

export interface DayHours {
  on: boolean;
  open: string;
  close: string;
}

export interface TourBehavior {
  chat: boolean;
  idVerify: boolean;
  autoZoom: boolean;
  camera: boolean;
  restricted: boolean;
}

export interface TourType {
  id: TourTypeKey;
  label: string;
  icon: string;
  note: string;
  dailyCap: number;
  slotCap: number;
  on: boolean;
  expanded: boolean;
  behavior: TourBehavior;
  hours: Record<string, DayHours>;
}

export interface Booking {
  id: string;
  day: number;
  time: string;
  visitor: string;
  email: string;
  phone: string;
  type: TourTypeKey;
  propId: string;
  crm: string;
  sync: SyncKey;
  hold: HoldKey;
  r1: string;
  r2: string;
}

export interface Visitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  propId: string;
  lastTour: string;
  gdpr: GdprKey;
}

export interface HelpArticle {
  id: string;
  title: string;
  kind: 'article' | 'video';
  len: string;
}

export interface HelpSection {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  items: HelpArticle[];
}

export interface AbandonedTour {
  visitor: string;
  propId: string;
  stop: string;
  idle: string;
  started: string;
}

export interface HoldStyle {
  label: string;
  v: Variant;
  note: string;
}
