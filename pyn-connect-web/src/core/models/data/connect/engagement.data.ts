export interface BrochureConfig {
  logo: string;
  headline: string;
  body: string;
  bcc: string[];
  sends: number;
  opens: string;
}

export interface FavoriteSample {
  unit: string;
  plan: string;
  rent: string;
  sqft: string;
}

export interface ChatStaff {
  id: string;
  name: string;
  role: string;
  propId: string;
  online: boolean;
  inRotation: boolean;
  unread: number;
  active: number;
}

export type ConvoState = 'active' | 'closed' | 'unassigned';

export interface Convo {
  id: string;
  visitor: string;
  propId: string;
  staff: string;
  last: string;
  when: string;
  unread: number;
  state: ConvoState;
}

export interface Surface {
  id: string;
  label: string;
  note: string;
  sessions: number;
  pct: number;
  delta: string;
}

export interface DeviceSlice {
  label: string;
  pct: number;
  color: string;
}

export interface ReportDef {
  id: string;
  name: string;
  note: string;
  fmt: string;
  cadence: string;
}

export interface ReportRun {
  when: string;
  by: string;
}
