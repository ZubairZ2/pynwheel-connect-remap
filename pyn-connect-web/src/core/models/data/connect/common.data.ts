/**
 * Shared vocabulary for the Pynwheel Connect demo domain.
 *
 * These types describe the *shape the UI expects*. The demo screens are fed by
 * `src/data/mock`; when the Rails API catches up, only the repository layer
 * changes — every type below stays as it is.
 */

/** StatusPill buckets. `live` / `submitted` are design aliases resolved by the pill. */
export type Variant = 'ok' | 'warn' | 'crit' | 'info' | 'neutral' | 'live' | 'submitted';

/** Integration health, as rendered by the coloured dots on listings. */
export type DotState = 'ok' | 'warn' | 'crit' | 'neutral';

/** Deployment lifecycle of a property. */
export type StageKey = 'installed' | 'activated' | 'production' | 'released' | 'approval';

/** The three Pynwheel products a property can be billed for. */
export type ProductKey = 'touch' | 'tour' | 'maps';

export interface Stage {
  key: StageKey;
  label: string;
  short: string;
  desc: string;
}

export interface PillDef {
  label: string;
  v: Variant;
}
