'use client';

interface Props {
  /** "Price", "Sq Ft". */
  label: string;
  /** Shown before the minimum, e.g. the currency symbol. */
  prefix?: string;
  min: string;
  max: string;
  minLabel: string;
  maxLabel: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onChange: (min: string, max: string) => void;
}

/** Keeps what can be typed to a plain number. */
const numeric = (value: string): string => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

/** The design's min–max box in a filter toolbar ("PRICE $ min – max"). */
export const RangeFilter = ({
  label,
  prefix,
  min,
  max,
  minLabel,
  maxLabel,
  minPlaceholder,
  maxPlaceholder,
  onChange
}: Props) => (
  <div className={`bo-range${min || max ? ' bo-range--active' : ''}`} role="group" aria-label={label}>
    <span className="bo-range__label">{label}</span>
    {prefix && <span className="bo-range__prefix">{prefix}</span>}
    <input
      className="bo-range__input"
      inputMode="decimal"
      value={min}
      placeholder={minPlaceholder}
      aria-label={minLabel}
      onChange={(event) => onChange(numeric(event.target.value), max)}
    />
    <span className="bo-range__dash" aria-hidden="true">
      –
    </span>
    <input
      className="bo-range__input"
      inputMode="decimal"
      value={max}
      placeholder={maxPlaceholder}
      aria-label={maxLabel}
      onChange={(event) => onChange(min, numeric(event.target.value))}
    />
  </div>
);
