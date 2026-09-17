'use client';

import { SearchIcon } from '~/core/components/atoms/Icons';

interface Props {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SearchField = ({ value, placeholder, ariaLabel, onChange, className }: Props) => (
  <div className={`bo-search ${className ?? ''}`}>
    <span className="bo-search__icon">
      <SearchIcon />
    </span>
    <input
      className="bo-search__input"
      type="search"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);
