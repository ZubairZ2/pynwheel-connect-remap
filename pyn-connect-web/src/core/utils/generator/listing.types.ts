import type { IntegrationState } from '~/core/models/data/property.data';

/** Pill variants supported by the design system's StatusPill. */
export type PillVariant = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

export type CellDescriptor =
  | { type: 'identity'; initials: string; label: string }
  | { type: 'title'; title: string; subtitle: string }
  | { type: 'text'; value: string; tone?: 'ink' | 'muted' }
  | { type: 'number'; value: number }
  | { type: 'pill'; label: string; variant: PillVariant }
  | {
      type: 'integrations';
      products: string[];
      dots: Array<{ id: string; title: string; state: IntegrationState }>;
    };

export interface ColumnDescriptor {
  id: string;
  title: string;
  align: 'left' | 'center';
}

export interface RowDescriptor {
  id: number;
  cells: Record<string, CellDescriptor>;
}

export interface FilterOption {
  id: string;
  label: string;
}
