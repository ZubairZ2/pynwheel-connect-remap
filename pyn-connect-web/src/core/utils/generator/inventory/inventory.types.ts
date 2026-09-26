import type { PillVariant } from '../listing.types';

/** A label-over-value cell on a record card, with its Feed/Manual source when the CMS tracks one. */
export interface MetaDescriptor {
  label: string;
  value: string;
  source?: { kind: 'feed' | 'manual'; label: string; title: string };
  /** The design shows this cell as a select (read-only in Connect). */
  control?: 'select';
  /** The value opens this URL in a new tab (an amenity's video link). */
  href?: string;
  /** Accessible name of the link, when `href` is set. */
  hrefLabel?: string;
}

/** One real image a viewer can show. */
export interface ImageDescriptor {
  name: string;
  src: string;
}

export interface PillDescriptor {
  label: string;
  variant: PillVariant;
}

/** A card's "3 buttons configured" style chip; `on` when the thing exists. */
export interface ChipDescriptor {
  label: string;
  on: boolean;
}

export interface ThumbDescriptor {
  src: string | null;
  badge?: string;
  alt: string;
}

/** Text for the shared confirm dialog. Confirming only closes it: Connect is read-only. */
export interface ConfirmDescriptor {
  title: string;
  message: string;
  label: string;
}
