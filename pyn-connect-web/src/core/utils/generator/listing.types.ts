/** Pill variants supported by the design system's StatusPill. */
export type PillVariant = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

/** Icons a `links` cell can show (the Properties listing's Go To buttons). */
export type LinkIcon = 'inventory' | 'map' | 'integrations' | 'branding';

export interface LinkDescriptor {
  id: string;
  /** The short caption under the icon. */
  label: string;
  /** Tooltip. */
  title: string;
  /** Screen-reader name; says which row the link belongs to. */
  ariaLabel: string;
  href: string;
  icon: LinkIcon;
}

export type CellDescriptor =
  | { type: 'identity'; initials: string; label: string }
  | { type: 'title'; title: string; subtitle: string }
  | { type: 'text'; value: string; tone?: 'ink' | 'muted' }
  | { type: 'number'; value: number }
  | { type: 'pill'; label: string; variant: PillVariant }
  | { type: 'tags'; tags: string[]; emptyLabel: string }
  | { type: 'links'; links: LinkDescriptor[] };

export interface ColumnDescriptor {
  id: string;
  title: string;
  align: 'left' | 'center';
  /** `actions` cells hold buttons: tighter padding, and the header never wraps. */
  kind?: 'actions';
}

export interface RowDescriptor {
  id: number;
  cells: Record<string, CellDescriptor>;
}

export interface FilterOption {
  id: string;
  label: string;
}

/** The line above a listing's toolbar: "802 Properties · Across 191 companies". */
export interface ListingSummary {
  title: string;
  subtitle: string;
}
