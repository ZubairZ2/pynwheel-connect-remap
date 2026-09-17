import type { Variant } from './common.data';

export interface AccessLogEntry {
  what: string;
  when: string;
  result: string;
  v: Variant;
}

export interface Resident {
  id: string;
  name: string;
  unit: string;
  phone: string;
  since: string;
  grants: Record<string, boolean>;
  log: AccessLogEntry[];
}
