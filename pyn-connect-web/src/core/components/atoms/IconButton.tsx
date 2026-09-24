import type { ReactNode } from 'react';

interface Props {
  /** Accessible name; also the tooltip unless `title` says otherwise. */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  /** `sm` is the 28px button of a toolbar row, `md` the 32–34px one beside a card. */
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
}

/** The design's square icon button (edit, delete, preview, replace…). */
export const IconButton = ({ label, icon, onClick, tone = 'default', size = 'md', disabled, title }: Props) => (
  <button
    type="button"
    className={`bo-iconbtn bo-iconbtn--${size}${tone === 'danger' ? ' bo-iconbtn--danger' : ''}`}
    aria-label={label}
    title={title ?? label}
    onClick={onClick}
    disabled={disabled}
  >
    {icon}
  </button>
);
