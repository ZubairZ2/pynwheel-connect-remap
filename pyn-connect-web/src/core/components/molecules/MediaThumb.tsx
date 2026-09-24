'use client';

import { useState, type ReactNode } from 'react';

export interface ThumbAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'danger';
}

interface Props {
  /** The real file to show; null when the record has none. */
  src: string | null;
  alt: string;
  /** Corner caption: what is shown ("SVG", "Primary", "3 photos"). */
  badge?: string;
  /** `contain` for plans and drawings, `cover` for photos. */
  fit?: 'cover' | 'contain';
  /** Buttons over the image, shown on hover or keyboard focus. */
  actions?: ThumbAction[];
  /** Shown instead of the image when there is none (the design's dashed "Upload" tile). */
  placeholder?: { label: string; icon: ReactNode; onClick: () => void };
  /** Shown when the file exists but cannot be loaded. */
  unavailableLabel: string;
  size?: 'md' | 'sm';
}

/** The thumbnail column of an inventory card. */
export const MediaThumb = ({
  src,
  alt,
  badge,
  fit = 'cover',
  actions = [],
  placeholder,
  unavailableLabel,
  size = 'md'
}: Props) => {
  const [broken, setBroken] = useState<string | null>(null);

  if (!src) {
    if (!placeholder) return null;

    return (
      <button type="button" className={`bo-thumb bo-thumb--${size} bo-thumb--empty`} onClick={placeholder.onClick}>
        {placeholder.icon}
        <span className="bo-thumb__cta">{placeholder.label}</span>
      </button>
    );
  }

  return (
    <div className={`bo-thumb bo-thumb--${size} bo-thumb--${fit}`}>
      {broken === src ? (
        <span className="bo-thumb__missing">{unavailableLabel}</span>
      ) : (
        // A plain <img>: these are the CMS's own S3 files, on hosts next/image is not configured for.
        <img className="bo-thumb__image" src={src} alt={alt} loading="lazy" onError={() => setBroken(src)} />
      )}
      {badge && <span className="bo-thumb__badge">{badge}</span>}
      {actions.length > 0 && (
        <div className="bo-thumb__overlay">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`bo-thumb__action${action.tone === 'danger' ? ' bo-thumb__action--danger' : ''}`}
              aria-label={action.label}
              title={action.label}
              onClick={action.onClick}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
