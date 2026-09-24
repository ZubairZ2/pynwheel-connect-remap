import type { PillVariant } from '~/core/utils/generator/listing.types';

interface Props {
  label: string;
  variant: PillVariant;
}

/** The design system's StatusPill (StatusPill.dc.html), 1:1. */
export const StatusPill = ({ label, variant }: Props) => (
  <span className={`bo-pill bo-pill--${variant}`}>
    <span className="bo-pill__dot" />
    {label}
  </span>
);
